import Link from "next/link";

type CategoryGridProps = {
  categories: {
    title: string;
    slug: string;
    description: string;
    count: number;
    sampleTerms: string[];
  }[];
};

export function CategoryGrid({ categories }: CategoryGridProps) {
  return (
    <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
      {categories.map((category) => (
        <Link
          key={category.slug}
          href={`/categories/${category.slug}`}
          className="surface group p-6"
        >
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="font-display text-2xl font-semibold tracking-tight text-foreground group-hover:text-accent">
                {category.title}
              </p>
              <p className="mt-3 text-sm leading-7 text-foreground-soft">
                {category.description}
              </p>
            </div>
            <span className="chip chip-accent">{category.count}</span>
          </div>
          {category.sampleTerms.length > 0 ? (
            <p className="mt-5 text-xs uppercase tracking-[0.2em] text-foreground-soft">
              Includes {category.sampleTerms.join(", ")}
            </p>
          ) : null}
        </Link>
      ))}
    </div>
  );
}
