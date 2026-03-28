import { cn } from "@/lib/utils";

type SearchBoxProps = {
  action?: string;
  className?: string;
  defaultValue?: string;
  placeholder?: string;
};

export function SearchBox({
  action = "/search",
  className,
  defaultValue,
  placeholder = "Search for a term, alias, category, or body text",
}: SearchBoxProps) {
  return (
    <form action={action} className={cn("w-full", className)}>
      <div className="input-shell">
        <input
          name="q"
          type="search"
          defaultValue={defaultValue}
          placeholder={placeholder}
          autoComplete="off"
          inputMode="search"
          className="min-w-0 flex-1 bg-transparent text-base text-foreground placeholder:text-foreground-soft/80 focus:outline-none"
          aria-label="Search dictionary"
        />
        <button type="submit" className="button button-primary shrink-0">
          Search
        </button>
      </div>
    </form>
  );
}
