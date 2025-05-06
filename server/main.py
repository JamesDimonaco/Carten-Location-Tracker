import asyncio
import json
import os
import sys
import websockets
from locationsharinglib import Service
from locationsharinglib.locationsharinglibexceptions import InvalidCookies
import asyncpg
from datetime import datetime, timezone

COOKIES_FILE = os.environ.get("COOKIES_FILE", "cookies.txt")
GOOGLE_EMAIL = os.environ.get("GOOGLE_EMAIL", "carten100james@gmail.com")
PORT = int(os.environ.get("PORT", 8765))
DATABASE_URL = os.environ.get("DATABASE_URL", "postgresql://postgres:password@localhost:5432/location_tracker")

async def init_db():
    conn = await asyncpg.connect(DATABASE_URL)
    # Create the locations table as a hypertable
    await conn.execute('''
        CREATE TABLE IF NOT EXISTS locations (
            time TIMESTAMPTZ NOT NULL,
            lat DOUBLE PRECISION NOT NULL,
            lng DOUBLE PRECISION NOT NULL
        );
    ''')
    
    # Convert to hypertable if not already
    await conn.execute('''
        SELECT create_hypertable('locations', 'time', if_not_exists => TRUE);
    ''')
    
    await conn.close()

async def store_location(lat: float, lng: float):
    conn = await asyncpg.connect(DATABASE_URL)
    await conn.execute(
        'INSERT INTO locations (time, lat, lng) VALUES ($1, $2, $3)',
        datetime.now(timezone.utc), lat, lng
    )
    await conn.close()

async def location_sender(websocket):
    try:
        # Initialize database
        await init_db()
        
        # Print debug info
        print(f"Using cookies file: {COOKIES_FILE}")
        print(f"File exists: {os.path.exists(COOKIES_FILE)}")
        
        if os.path.exists(COOKIES_FILE):
            with open(COOKIES_FILE, 'r') as f:
                print(f"First 100 chars of file: {f.read(100)}")
        
        # Try to initialize service
        service = Service(cookies_file=COOKIES_FILE, authenticating_account=GOOGLE_EMAIL)
        print("Successfully authenticated with Google Location Sharing!")
        
        while True:
            try:
                people = service.get_all_people()
                found = False
                for person in people:
                    if person.nickname == GOOGLE_EMAIL or person.full_name == "You":
                        found = True
                        location_data = {
                            "lat": person.latitude,
                            "lng": person.longitude
                        }
                        # Store location in TimescaleDB
                        await store_location(person.latitude, person.longitude)
                        await websocket.send(json.dumps(location_data))
                        print(f"Sent and stored location: {person.latitude}, {person.longitude}")
                
                if not found:
                    print(f"Warning: Could not find person with nickname {GOOGLE_EMAIL}")
                    print("People found:")
                    for p in people:
                        print(f"  - Nickname: {p.nickname}, Full name: {p.full_name}, Location: {p.latitude}, {p.longitude}")
                    await websocket.send(json.dumps({
                        "error": f"Could not find location for {GOOGLE_EMAIL}"
                    }))
                    
                await asyncio.sleep(5)
            except Exception as e:
                error_msg = f"Error getting location: {str(e)}"
                print(error_msg)
                await websocket.send(json.dumps({"error": error_msg}))
                await asyncio.sleep(10)  # Longer delay after error
                
    except InvalidCookies as e:
        error_msg = f"Invalid cookies: {str(e)}"
        print(error_msg, file=sys.stderr)
        await websocket.send(json.dumps({"error": error_msg}))
    except Exception as e:
        error_msg = f"Authentication error: {str(e)}"
        print(error_msg, file=sys.stderr)
        await websocket.send(json.dumps({"error": error_msg}))

async def main():
    async with websockets.serve(location_sender, "0.0.0.0", PORT):
        print(f"WebSocket server started on ws://0.0.0.0:{PORT}")
        await asyncio.Future()  # run forever

if __name__ == "__main__":
    asyncio.run(main())