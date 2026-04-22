import { BookmarkProvider } from "@/components/bookmark-provider";

export default function SavedWordsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <BookmarkProvider>{children}</BookmarkProvider>;
}
