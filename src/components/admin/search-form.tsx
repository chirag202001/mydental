"use client";

import { Search } from "lucide-react";

export function SearchForm({
  placeholder = "Search...",
  defaultValue = "",
}: {
  placeholder?: string;
  defaultValue?: string;
}) {
  return (
    <form className="relative max-w-md">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
      <input
        name="q"
        type="text"
        defaultValue={defaultValue}
        placeholder={placeholder}
        className="w-full pl-10 pr-4 py-2 border rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
    </form>
  );
}
