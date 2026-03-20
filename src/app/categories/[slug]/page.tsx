import Link from "next/link";
import { notFound } from "next/navigation";
import { EntryCard } from "@/components/entry-card";
import { getCategoryStats, getEntriesByCategorySlug } from "@/lib/content";
import { buildMetadata } from "@/lib/metadata";
import { getCategoryBySlug } from "@/lib/site";

type CategoryPageProps = {
  params: Promise<{
    slug: string;
  }>;
};

export async function generateStaticParams() {
  const categories = await getCategoryStats();
  return categories.map(({ slug }) => ({ slug }));
}

export async function generateMetadata({ params }: CategoryPageProps) {
  const { slug } = await params;
  const category = getCategoryBySlug(slug);

  if (!category) {
    return {};
  }

  return buildMetadata({
    title: category.title,
    description: category.description,
    path: `/categories/${slug}`,
  });
}

export default async function CategoryPage({ params }: CategoryPageProps) {
  const { slug } = await params;
  const category = getCategoryBySlug(slug);

  if (!category) {
    notFound();
  }

  const entries = await getEntriesByCategorySlug(slug);

  return (
    <div className="page-shell space-y-10">
      <section className="space-y-5">
        <Link href="/categories" className="page-kicker hover:text-foreground">
          Categories
        </Link>
        <h1 className="page-title">{category.title}</h1>
        <p className="page-intro">{category.description}</p>
      </section>

      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {entries.map((entry) => (
          <EntryCard key={entry.slug} entry={entry} />
        ))}
      </div>
    </div>
  );
}
