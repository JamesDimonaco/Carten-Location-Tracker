import { MapContainer } from "@/components/map-container";
import { WelcomeModal } from "@/components/welcome-modal";
import { CommentsSection } from "@/components/comments-section";

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col">
      <WelcomeModal />
      <MapContainer />
      <CommentsSection />
    </main>
  );
}
