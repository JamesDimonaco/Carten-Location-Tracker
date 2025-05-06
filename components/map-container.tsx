"use client"

import { Card, CardContent } from "@/components/ui/card"
import { LocationMap } from "@/components/location-map"
import { ViewerCounter } from "@/components/viewer-counter"

export function MapContainer() {
  return (
    <div className="flex flex-col w-full h-screen p-4 gap-4">
      <Card className="w-full">
        <CardContent className="p-4">
          <ViewerCounter />
        </CardContent>
      </Card>

      <Card className="flex-1 overflow-hidden">
        <CardContent className="p-0 h-full">
          <LocationMap />
        </CardContent>
      </Card>
    </div>
  )
}
