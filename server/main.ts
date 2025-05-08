import { Pool } from "https://deno.land/x/postgres@v0.17.0/mod.ts";

interface Location {
  time: Date;
  lat: number;
  lng: number;
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

  while (true) {
    try {
      const client = await pool.connect();
      client.release();
      console.log("Database connection successful!");
      return pool;
    } catch (error) {
      console.log("Waiting for database...");
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }
}

// Initialize database connection
const pool = await waitForDatabase();

// Track connected WebSocket clients and their last received timestamp
const clients = new Map<WebSocket, string>();

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

// Function to check for new data
async function checkForNewData() {
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
  console.log("Method:", req.method);
  const url = new URL(req.url);

  if (req.method === "POST" && url.pathname === "/mobile") {
    const body = await req.json();
    console.log("Body:", body);

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

  if (req.headers.get("upgrade") === "websocket") {
    const { socket, response } = Deno.upgradeWebSocket(req);

    socket.onopen = () => {
      console.log("Client connected");
      clients.set(socket, new Date(0).toISOString()); // Start from beginning

      // Send latest location to new client
      (async () => {
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
