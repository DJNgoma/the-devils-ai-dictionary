import { CategoryGrid } from "@/components/category-grid";
import { getCategoryStats } from "@/lib/content";
import { buildMetadata } from "@/lib/metadata";

export const metadata = buildMetadata({
  title: "Browse categories",
  description:
    "Explore the dictionary by editorial category, from core concepts to red-flag jargon.",
  path: "/categories",
});

export default async function CategoriesPage() {
  const categories = await getCategoryStats();

  return (
    <div className="page-shell space-y-10">
      <section className="space-y-5">
        <p className="page-kicker">Categories</p>
        <h1 className="page-title">The taxonomy of the AI argument</h1>
        <p className="page-intro">
          Categories are editorial, not academic. They are designed to help readers
          move between technical meaning, vendor packaging, operational reality, and
          the jargon that tends to blur them together.
        </p>
      </section>

      <CategoryGrid categories={categories} />
    </div>
  );
}
