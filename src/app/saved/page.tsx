import { SavedPagePanel } from "@/components/saved-page-panel";
import { buildMetadata } from "@/lib/metadata";

export const metadata = buildMetadata({
  title: "Saved reading place",
  description:
    "Resume the dictionary entry you saved on this device, or jump back into the index.",
  path: "/saved",
});

export default function SavedPage() {
  return (
    <div className="reading-shell space-y-8">
      <section className="space-y-4">
        <p className="page-kicker">Saved</p>
        <h1 className="page-title">Resume where you left the argument.</h1>
        <p className="page-intro">
          Saved places live on this device. Less cloud romance. Better continuity
          when you are moving between meetings.
        </p>
      </section>

      <SavedPagePanel />
    </div>
  );
}
