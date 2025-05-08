"use client"

import { useEffect, useState } from "react"
import { Users } from "lucide-react"

export function ViewerCounter() {
  const [viewers, setViewers] = useState(0)

  useEffect(() => {
    // Connect to WebSocket to get viewer count
    const ws = new WebSocket("ws://localhost:8765")

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data)
        if (typeof data.viewers === "number") {
          setViewers(data.viewers)
        }
      } catch (err) {
        console.error("Failed to parse viewer data:", err)
      }
    }

    return () => {
      ws.close()
    }
  }, [])

  return (
    <div className="flex items-center gap-2">
      <Users className="h-5 w-5 text-muted-foreground" />
      <span className="font-medium">{viewers} people currently viewing</span>
    </div>
  )
}
