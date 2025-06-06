import { Card, CardContent } from "@/components/ui/card";
import { LocationMap } from "@/components/location-map";

import Link from "next/link";
import { Button } from "./ui/button";
import { JustGivingCampaign } from "./justgiving-campaign";

export function MapContainer() {
  return (
    <div className="flex flex-col w-full h-full p-2 gap-4">
      <div className="flex flex-row gap-4">
        <Card className="w-full">
          <CardContent className="p-4">
            <JustGivingCampaign />
          </CardContent>
        </Card>
        <Link
          target="_blank"
          href="https://carten100.us4.list-manage.com/track/click?u=140644940fe21c891ab7112dc&id=d0431fc1e6&e=3b669d1c11"
        >
          <Button>See the route</Button>
        </Link>
      </div>

      <Card className="flex-1 overflow-hidden">
        <CardContent className="p-0 h-full">
          <LocationMap />
        </CardContent>
      </Card>
    </div>
  );
}
