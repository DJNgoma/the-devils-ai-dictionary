import { redirect } from "next/navigation";
import { getRandomEntrySlug } from "@/lib/content";

export const dynamic = "force-dynamic";

export default async function RandomPage() {
  const slug = await getRandomEntrySlug();

  redirect(slug ? `/dictionary/${slug}` : "/dictionary");
}
