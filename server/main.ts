import { load } from "https://deno.land/std@0.220.1/dotenv/mod.ts";
import { Pool } from "https://deno.land/x/postgres@v0.17.0/mod.ts";

// Load environment variables from .env file
await load({ export: true });

interface Location {
  time: Date;
  lat: number;
  lng: number;
}

interface Comment {
  id: number;
  content: string;
  name?: string;
  image_url?: string;
  created_at: Date;
}

// Function to wait for database connection
async function waitForDatabase() {
  const pool = new Pool(
    {
      hostname: Deno.env.get("PGHOST"),
      database: Deno.env.get("PGDATABASE"),
      user: Deno.env.get("PGUSER"),
      password: Deno.env.get("PGPASSWORD"),
      port: Deno.env.get("PGPORT"),
    },
    10
  );

  let attempts = 0;
  const maxAttempts = 30; // 30 seconds max wait

  while (attempts < maxAttempts) {
    try {
      const client = await pool.connect();
      await client.queryObject`SELECT 1`; // Test query
      client.release();
      console.log("Database connection successful!");
      return pool;
    } catch (error) {
      attempts++;
      console.log(
        `Waiting for database... (attempt ${attempts}/${maxAttempts})`
      );
      if (attempts === maxAttempts) {
        throw new Error("Failed to connect to database after maximum attempts");
      }
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }
}

// Initialize database connection
const pool = await waitForDatabase();

// Track connected WebSocket clients and their last received timestamp
const clients = new Map<WebSocket, string>();

// Track connected WebSocket clients for comments
const commentClients = new Set<WebSocket>();

// Function to broadcast location to all connected clients
function broadcastLocation(location: {
  time: string;
  lat: number;
  lng: number;
}) {
  const message = JSON.stringify(location);
  for (const [client, lastTime] of clients.entries()) {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message);
      clients.set(client, location.time);
    }
  }
}

// Function to broadcast comment to all connected clients
function broadcastComment(comment: Comment) {
  const message = JSON.stringify(comment);
  for (const client of commentClients) {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message);
    }
  }
}

// Function to check for new data
async function checkForNewData() {
  if (!pool) {
    return;
  }

  try {
    const client = await pool.connect();
    const result = await client.queryObject<Location>`
      SELECT time, lat, lng 
      FROM locations 
      ORDER BY time DESC 
      LIMIT 1
    `;
    client.release();

    if (result.rows.length > 0) {
      const latest = result.rows[0];
      broadcastLocation({
        time: latest.time.toISOString(),
        lat: latest.lat,
        lng: latest.lng,
      });
    }
  } catch (error) {
    console.error("Error checking for new data:", error);
  }
}

// Poll for new data every second
setInterval(checkForNewData, 1000);

Deno.serve(async (req) => {
  const url = new URL(req.url);

  if (req.method === "POST" && url.pathname === "/mobile") {
    const body = await req.json();
    console.log("Body:", body);
    if (!pool) {
      return new Response("Database not connected", { status: 500 });
    }
    try {
      const client = await pool.connect();
      await client.queryObject`
        INSERT INTO locations (time, lat, lng)
        VALUES (to_timestamp(${body.timestamp / 1000}), ${body.lat}, ${
        body.lng
      })
      `;
      client.release();
      return new Response("Location saved", { status: 200 });
    } catch (error) {
      console.error("Database error:", error);
      return new Response("Error saving location", { status: 500 });
    }
  }

  if (url.pathname === "/comment") {
    console.log("in comment");
    const body = await req.json();
    console.log("Comment body:", body);

    if (!pool) {
      return new Response("Database not connected", { status: 500 });
    }

    try {
      const client = await pool.connect();
      const result = await client.queryObject<Comment>`
        INSERT INTO comments (content, name, image_url, created_at)
        VALUES (${body.content}, ${body.name}, ${body.image_url}, NOW())
        RETURNING id, content, name, image_url, created_at
      `;
      client.release();

      if (result.rows.length > 0) {
        const comment = result.rows[0];
        broadcastComment(comment);
        return new Response(JSON.stringify(comment), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }
      return new Response("Error saving comment", { status: 500 });
    } catch (error) {
      console.error("Database error:", error);
      return new Response("Error saving comment", { status: 500 });
    }
  }

  if (req.headers.get("upgrade") === "websocket") {
    const { socket, response } = Deno.upgradeWebSocket(req);

    if (url.pathname === "/comments") {
      socket.onopen = () => {
        console.log("Comment client connected");
        commentClients.add(socket);

        // Send recent comments to new client
        (async () => {
          if (!pool) {
            return new Response("Database not connected", { status: 500 });
          }

          try {
            const client = await pool.connect();
            const result = await client.queryObject<Comment>`
              SELECT id, content, name, image_url, created_at
              FROM comments 
              ORDER BY created_at DESC 
              LIMIT 50
            `;
            client.release();

            for (const comment of result.rows) {
              socket.send(JSON.stringify(comment));
            }
          } catch (error) {
            console.error("Error fetching comments:", error);
          }
        })();
      };

      socket.onclose = () => {
        console.log("Comment client disconnected");
        commentClients.delete(socket);
      };

      return response;
    }

    socket.onopen = () => {
      console.log("Client connected");
      clients.set(socket, new Date(0).toISOString()); // Start from beginning

      // Send latest location to new client
      (async () => {
        if (!pool) {
          return new Response("Database not connected", { status: 500 });
        }

        try {
          const client = await pool.connect();
          const result = await client.queryObject<Location>`
            SELECT time, lat, lng 
            FROM locations 
            ORDER BY time DESC 
            LIMIT 1
          `;
          client.release();

          if (result.rows.length > 0) {
            const latest = result.rows[0];
            socket.send(
              JSON.stringify({
                time: latest.time.toISOString(),
                lat: latest.lat,
                lng: latest.lng,
              })
            );
            clients.set(socket, latest.time.toISOString());
          }
        } catch (error) {
          console.error("Error fetching latest location:", error);
        }
      })();
    };

    socket.onmessage = (event) => {
      console.log("Message from client:", event.data);
    };

    socket.onclose = () => {
      console.log("Client disconnected");
      clients.delete(socket);
    };

    return response;
  }

  return new Response("Not found", { status: 404 });
});
