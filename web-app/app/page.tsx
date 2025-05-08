import { MapContainer } from "@/components/map-container";
import { WelcomeModal } from "@/components/welcome-modal";

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col">
      <WelcomeModal />
      <MapContainer />
    </main>
  );
}
