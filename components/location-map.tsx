"use client";

import { useEffect, useState, useRef } from "react";
import { Loader } from "@googlemaps/js-api-loader";
import { toast } from "sonner";

// Define stop locations
const stops = [
  { position: { lat: 51.4864781, lng: -3.1815842 }, title: "Start" },
  { position: { lat: 51.6172894, lng: -3.8115266 }, title: "Stop 1 34 Miles" },
  { position: { lat: 51.6793523, lng: -4.2484649 }, title: "Stop 2 62 Miles " },
  { position: { lat: 51.8479614, lng: -4.328969 }, title: "Stop 3 77 Miles" },
  { position: { lat: 51.7823521, lng: -4.6384197 }, title: "Stop 4 97 Miles" },
  { position: { lat: 51.6717685, lng: -4.6991583 }, title: "Finish " },
];

export function LocationMap() {
  const mapRef = useRef<HTMLDivElement>(null);
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [mainMarker, setMainMarker] =
    useState<google.maps.marker.AdvancedMarkerElement | null>(null);
  const [location, setLocation] = useState<{ lat: number; lng: number }>({
    lat: 51.5074,
    lng: -0.1278,
  });
  const [currentTime, setCurrentTime] = useState<string>("");
  const [isLoaded, setIsLoaded] = useState(false);

  // Initialize Google Maps
  useEffect(() => {
    if (!mapRef.current) return;

    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "";
    if (!apiKey) {
      toast.error("Google Maps API key is missing");
      return;
    }

    const loader = new Loader({
      apiKey,
      version: "weekly",
      libraries: ["places", "marker"],
    });

    async function initMap() {
      try {
        // Load the Maps JavaScript API
        const { Map } = (await loader.importLibrary(
          "maps"
        )) as google.maps.MapsLibrary;
        const { AdvancedMarkerElement } = (await loader.importLibrary(
          "marker"
        )) as google.maps.MarkerLibrary;

        // Create the map instance
        const mapInstance = new Map(mapRef.current!, {
          center: location,
          zoom: 5,
          mapId: "LOCATION_TRACKER_MAP",
          disableDefaultUI: false,
          clickableIcons: true,
          styles: [
            {
              featureType: "poi",
              elementType: "labels",
              stylers: [{ visibility: "on" }],
            },
          ],
        });

        setMap(mapInstance);

        // Create the main marker
        const marker = new AdvancedMarkerElement({
          map: mapInstance,
          position: location,
          title: "Current Location",
          content: LiveLocation(),
        });

        // Add click handler to zoom
        (marker as any).addListener("click", () => {
          const currentPos = marker.position;
          mapInstance.setZoom(15);
          mapInstance.panTo(currentPos);
        });

        setMainMarker(marker);

        // Add stop markers
        stops.forEach((stop) => {
          new AdvancedMarkerElement({
            map: mapInstance,
            position: stop.position,
            title: stop.title,
            content: createMarkerElement(stop.title, "red"),
          });
        });

        setIsLoaded(true);
      } catch (error) {
        console.error("Error initializing map:", error);
        toast.error("Failed to load Google Maps");
      }
    }

    initMap();
  }, []);

  // Create custom marker element
  function createMarkerElement(title: string, color: string) {
    const element = document.createElement("div");
    element.className = "marker-container";
    element.innerHTML = `
      <div style="
        background-color: ${color === "blue" ? "#3b82f6" : "#ef4444"};
        color: white;
        border-radius: 8px;
        padding: 6px 10px;
        font-size: 14px;
        font-weight: 500;
        box-shadow: 0 2px 4px rgba(0,0,0,0.2);
        display: flex;
        align-items: center;
        justify-content: center;
        min-width: 32px;
        min-height: 32px;
        transform: translate(-50%, -100%);
        position: relative;
      ">
        ${title}
        <div style="
          position: absolute;
          bottom: -8px;
          left: 50%;
          transform: translateX(-50%);
          width: 0;
          height: 0;
          border-left: 8px solid transparent;
          border-right: 8px solid transparent;
          border-top: 8px solid ${color === "blue" ? "#3b82f6" : "#ef4444"};
        "></div>
      </div>
    `;
    return element;
  }

  function LiveLocation() {
    const element = document.createElement("div");
    element.className = "marker-container";
    element.innerHTML = `
      <div style="
        background-color: #fff;
        color: white;
        border-radius: 50%;
        width: 40px;
        height: 40px;
        font-size: 24px;
        box-shadow: 0 2px 4px rgba(0,0,0,0.3);
        display: flex;
        align-items: center;
        justify-content: center;
        transform: translate(-50%, -50%);
        position: relative;
      ">
        🚲
      </div>
    `;
    return element;
  }

  // Connect to WebSocket for location updates
  useEffect(() => {
    const ws = new WebSocket("ws://localhost:8000");

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log(data);
        setCurrentTime(data.time);
        setLocation({ lat: parseFloat(data.lat), lng: parseFloat(data.lng) });
      } catch (err) {
        console.error("Failed to parse location data:", err);
      }
    };

    ws.onerror = (error) => {
      console.error("WebSocket error:", error);
      toast.error("Failed to connect to location server");
    };

    return () => {
      ws.close();
    };
  }, []);

  // Update map and marker when location changes
  useEffect(() => {
    if (map && mainMarker && isLoaded) {
      const newPosition = { lat: location.lat, lng: location.lng };
      map.panTo(newPosition);
      mainMarker.position = newPosition;
    }
  }, [map, mainMarker, location, isLoaded]);

  return (
    <div className="w-full h-full">
      <div ref={mapRef} className="w-full h-full" />
      <div className="absolute top-16 md:top-12 right-0 p-4">
        <p className="text-sm text-gray-500">
          {new Date(currentTime).toLocaleTimeString("en-US", {
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
          })}
        </p>
      </div>
    </div>
  );
}
