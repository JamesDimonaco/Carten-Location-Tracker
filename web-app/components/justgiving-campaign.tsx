import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "./ui/button";
import Link from "next/link";

interface FundraisingPage {
  fundraisingTarget: string;
  totalRaisedOnline: string;
  totalRaisedOffline: string;
  totalRaisedSms: string;
  totalRaisedPercentageOfFundraisingTarget: string;
  title: string;
  story: string;
  status: string;
  pageId: string;
  pageShortName: string;
}

async function getFundraisingData() {
  const appId = "c60175ab";
  const pageId = "page/james-dimonaco";

  try {
    const res = await fetch(
      `https://api.justgiving.com/${appId}/v1/fundraising/pages/${pageId}`,
      {
        headers: {
          "Content-Type": "application/json",
          "x-api-key": appId,
          Accept: "application/json",
        },
        next: { revalidate: 60 }, // Revalidate every minute
      }
    );

    if (!res.ok) {
      throw new Error(`HTTP error! status: ${res.status}`);
    }

    const data = (await res.json()) as FundraisingPage;
    return data;
  } catch (error) {
    console.error("Failed to fetch fundraising data:", error);
    return null;
  }
}

export async function JustGivingCampaign() {
  const page = await getFundraisingData();
  if (!page) {
    return (
      <div className="w-full max-w-xs mx-auto p-4 bg-card rounded-lg shadow space-y-4">
        <p className="text-center text-muted-foreground text-sm">
          Unable to load fundraising data.
        </p>
        <Link
          href="https://www.justgiving.com/page/james-dimonaco"
          target="_blank"
        >
          <Button className="w-full">Visit JustGiving</Button>
        </Link>
      </div>
    );
  }

  const totalRaised =
    parseFloat(page.totalRaisedOnline) +
    parseFloat(page.totalRaisedOffline) +
    parseFloat(page.totalRaisedSms);
  const target = parseFloat(page.fundraisingTarget);
  const percentage = Math.min(
    parseFloat(page.totalRaisedPercentageOfFundraisingTarget),
    100
  );

  return (
    <div
      className="w-full max-w-xs mx-auto  bg-card rounded-lg shadow space-y-4
    "
    >
      <div className="flex justify-between items-center text-sm">
        <span className="text-muted-foreground">Raised</span>
        <span className="font-bold">£{totalRaised.toLocaleString()}</span>
      </div>
      <div className="flex justify-between items-center text-sm">
        <span className="text-muted-foreground">Target</span>
        <span className="font-bold">£{target.toLocaleString()}</span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-2.5">
        <div
          className="bg-blue-600 h-2.5 rounded-full"
          style={{ width: `${percentage}%` }}
        />
      </div>
      <div className="flex justify-between items-center text-xs text-muted-foreground pb-4">
        <span>{percentage}% of target</span>
      </div>
      <Link
        href={`https://www.justgiving.com/${page.pageShortName}`}
        target="_blank"
      >
        <Button className="w-full">Donate Now</Button>
      </Link>
    </div>
  );
}
