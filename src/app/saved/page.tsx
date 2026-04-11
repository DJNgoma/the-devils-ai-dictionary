import { SavedPagePanel } from "@/components/saved-page-panel";
import { buildMetadata } from "@/lib/metadata";

export const metadata = buildMetadata({
  title: "Saved words",
  description:
    "Review the words you saved on this device, or jump back into the dictionary.",
  path: "/saved",
});

export default function SavedPage() {
  return (
    <div className="reading-shell space-y-8">
      <section className="space-y-4">
        <p className="page-kicker">Saved</p>
        <h1 className="page-title">Pick up the words you decided were worth keeping.</h1>
        <p className="page-intro">
          Saved words live on this device until you sync them. Less cloud romance.
          More useful memory.
        </p>
      </section>

      <SavedPagePanel />
    </div>
  );
}
