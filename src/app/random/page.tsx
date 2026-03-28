import { getAllEntries } from "@/lib/content";
import { RandomEntryRedirect } from "@/components/random-entry-redirect";

export default async function RandomPage() {
  const entries = await getAllEntries();

  return <RandomEntryRedirect slugs={entries.map((entry) => entry.slug)} />;
}
