# import asyncio
# import json
# import os
# import websockets
# from locationsharinglib import Service

# COOKIES_FILE = os.environ.get("COOKIES_FILE", "cookies.txt")
# GOOGLE_EMAIL = os.environ.get("GOOGLE_EMAIL", "dimonaco.james@gmail.com")
# PORT = int(os.environ.get("PORT", 8765))

# async def location_sender(websocket):
#     service = Service(cookies_file=COOKIES_FILE, authenticating_account=GOOGLE_EMAIL)
#     while True:
#         for person in service.get_all_people():
#             if person.nickname == "dimonaco.james@gmail.com":
#                 await websocket.send(json.dumps({
#                     "lat": person.latitude,
#                     "lng": person.longitude
#                 }))
#         await asyncio.sleep(5)

# async def main():
#     async with websockets.serve(location_sender, "0.0.0.0", PORT):
#         print(f"WebSocket server started on ws://0.0.0.0:{PORT}")
#         await asyncio.Future()  # run forever

# if __name__ == "__main__":
#     asyncio.run(main()) 


import asyncio
import json
import os
import sys
import websockets
from locationsharinglib import Service
from locationsharinglib.locationsharinglibexceptions import InvalidCookies

COOKIES_FILE = os.environ.get("COOKIES_FILE", "cookies.txt")
GOOGLE_EMAIL = os.environ.get("GOOGLE_EMAIL", "dimonaco.james@gmail.com")
PORT = int(os.environ.get("PORT", 8765))

async def location_sender(websocket):
    try:
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
                        await websocket.send(json.dumps({
                            "lat": person.latitude,
                            "lng": person.longitude
                        }))
                        print(f"Sent location: {person.latitude}, {person.longitude}")
                
                if not found:
                    print(f"Warning: Could not find person with nickname {GOOGLE_EMAIL}")
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