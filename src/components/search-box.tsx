"use client";

import type { FormEvent } from "react";
import { cn } from "@/lib/utils";

type SearchBoxProps = {
  action?: string;
  className?: string;
  defaultValue?: string;
  placeholder?: string;
};

export function SearchBox({
  action = "/dictionary",
  className,
  defaultValue,
  placeholder = "Search for a term, alias, category, or body text",
}: SearchBoxProps) {
  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    if (action !== "/dictionary") {
      return;
    }

    event.preventDefault();

    const formData = new FormData(event.currentTarget);
    const query = String(formData.get("q") ?? "").trim();
    const params = new URLSearchParams();

    if (query) {
      params.set("q", query);
    }

    const nextUrl = params.toString()
      ? `/dictionary#${params.toString()}`
      : "/dictionary";

    window.location.assign(nextUrl);
  };

  return (
    <form action={action} onSubmit={handleSubmit} className={cn("w-full", className)}>
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
