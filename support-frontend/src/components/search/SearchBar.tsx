"use client";

import { useEffect, useState } from "react";
import { Search, X } from "lucide-react";
import { useDebounce } from "@/hooks/useDebounce";

interface SearchBarProps {
  /** The current committed (debounced) query value. */
  value: string;
  /** Called with the debounced query whenever it settles. */
  onDebouncedChange: (query: string) => void;
  /** Placeholder text for the input. */
  placeholder?: string;
}

/**
 * Debounced search input for the tickets page. Keeps its own immediate input
 * state for a responsive field, and only reports the value upward after the
 * user pauses typing (300ms).
 */
export function SearchBar({
  value,
  onDebouncedChange,
  placeholder = "Search tickets...",
}: SearchBarProps) {
  const [input, setInput] = useState(value);
  const debounced = useDebounce(input, 300);

  // Propagate the settled value to the parent.
  useEffect(() => {
    onDebouncedChange(debounced.trim());
  }, [debounced, onDebouncedChange]);

  // Keep local input in sync if the parent resets the value externally.
  useEffect(() => {
    setInput(value);
  }, [value]);

  return (
    <div className="relative min-w-[16rem] flex-1">
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <input
        type="search"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        placeholder={placeholder}
        aria-label="Search tickets"
        className="h-10 w-full rounded-lg border border-input bg-surface py-2 pl-9 pr-9 text-sm text-foreground shadow-soft placeholder:text-muted-foreground/70 focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring/40"
      />
      {input && (
        <button
          type="button"
          onClick={() => setInput("")}
          aria-label="Clear search"
          className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-muted-foreground hover:bg-surface-muted hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}
