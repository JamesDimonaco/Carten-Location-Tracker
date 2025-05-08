declare namespace google.maps {
  interface MapsLibrary {
    Map: typeof google.maps.Map
  }

  interface MarkerLibrary {
    AdvancedMarkerElement: typeof google.maps.marker.AdvancedMarkerElement
  }

  namespace marker {
    interface AdvancedMarkerElementOptions {
      map?: google.maps.Map
      position?: google.maps.LatLngLiteral
      title?: string
      content?: Node
    }

    class AdvancedMarkerElement {
      constructor(options: AdvancedMarkerElementOptions)
      position: google.maps.LatLngLiteral | null
      map: google.maps.Map | null
      title: string | null
      content: Node | null
    }
  }
}
