import * as Location from "expo-location";
import * as TaskManager from "expo-task-manager";
import React, { useEffect, useRef, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import MapView, { Marker } from "react-native-maps";

const LOCATION_TASK_NAME = "background-location-task";
const API_URL = "https://carten-api.dimonaco.co.uk/mobile";

interface LocationCoords {
  latitude: number;
  longitude: number;
}

interface TaskManagerData {
  locations: {
    coords: LocationCoords;
  }[];
}

async function sendLocation(location: LocationCoords) {
  try {
    await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        lat: location.latitude,
        lng: location.longitude,
        timestamp: Date.now(),
      }),
    });
    console.log("Location sent:", location);
  } catch (error) {
    console.error("Error sending location:", error);
  }
}

// Background task for location
TaskManager.defineTask(
  LOCATION_TASK_NAME,
  async ({ data, error }: { data?: TaskManagerData; error?: any }) => {
    if (error) {
      console.error("TaskManager error:", error);
      return;
    }
    if (data) {
      const { locations } = data;
      const loc = locations[0];
      if (loc) {
        await sendLocation(loc.coords);
      }
    }
  }
);

export default function HomeScreen() {
  const [location, setLocation] = useState<LocationCoords>({
    latitude: 0,
    longitude: 0,
  });
  const [status, setStatus] = useState("Initializing...");
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Foreground location polling
  useEffect(() => {
    let locationSubscription: Location.LocationSubscription | null = null;

    const startForegroundUpdates = async () => {
      let { status: permissionStatus } =
        await Location.requestBackgroundPermissionsAsync();
      console.log("🔑 Permission status:", permissionStatus);
      if (permissionStatus !== "granted") {
        setStatus("Location permission denied");
        return;
      }
      setStatus("Tracking location...");

      locationSubscription = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.Balanced,
          timeInterval: 1000,
          distanceInterval: 1,
        },
        (loc) => {
          setLocation({
            latitude: loc.coords.latitude,
            longitude: loc.coords.longitude,
          });
          sendLocation(loc.coords);
        }
      );
    };

    startForegroundUpdates();

    return () => {
      if (locationSubscription) locationSubscription.remove();
    };
  }, []);

  // Background location updates
  useEffect(() => {
    (async () => {
      console.log("🟢 Starting background location updates...");
      await Location.startLocationUpdatesAsync(LOCATION_TASK_NAME, {
        accuracy: Location.Accuracy.Highest,
        timeInterval: 1000,
        distanceInterval: 0,
        foregroundService: {
          notificationTitle: "Location Tracking",
          notificationBody: "Tracking your location in the background",
        },
        showsBackgroundLocationIndicator: true,
      });
    })();

    return () => {
      console.log("🔴 Stopping background location updates...");
      Location.stopLocationUpdatesAsync(LOCATION_TASK_NAME);
    };
  }, []);

  return (
    <View style={styles.container}>
      <Text style={styles.status}>{status}</Text>
      <MapView
        style={styles.map}
        initialRegion={{
          latitude: location.latitude || 37.78825,
          longitude: location.longitude || -122.4324,
          latitudeDelta: 0.0922,
          longitudeDelta: 0.0421,
        }}
        showsUserLocation
        followsUserLocation
      >
        <Marker coordinate={location} />
      </MapView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  map: {
    width: "100%",
    height: "100%",
  },
  status: {
    position: "absolute",
    top: 50,
    left: 10,
    right: 10,
    backgroundColor: "rgba(0,0,0,0.7)",
    color: "white",
    padding: 10,
    borderRadius: 5,
    zIndex: 1,
    textAlign: "center",
  },
});
