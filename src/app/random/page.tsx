import { redirect } from "next/navigation";
import { getAllEntries } from "@/lib/content";

export const dynamic = "force-dynamic";

export default async function RandomPage() {
  const entries = await getAllEntries();
  const randomEntry = entries[Math.floor(Math.random() * entries.length)];

  redirect(`/dictionary/${randomEntry.slug}`);
}
