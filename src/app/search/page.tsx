"use client";

import { useEffect } from "react";

export default function SearchPage() {
  useEffect(() => {
    window.location.replace(`/dictionary${window.location.search}`);
  }, []);

  return (
    <div className="page-shell py-16">
      <p className="page-kicker">Search</p>
      <h1 className="page-title">Opening the dictionary.</h1>
    </div>
  );
}
