"use client";

import { useEffect } from "react";

export default function SearchPage() {
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const nextUrl = params.toString()
      ? `/dictionary#${params.toString()}`
      : "/dictionary";

    window.location.replace(nextUrl);
  }, []);

  return (
    <div className="page-shell py-16">
      <p className="page-kicker">Search</p>
      <h1 className="page-title">Opening the dictionary.</h1>
    </div>
  );
}
