"use client";

import { useEffect, useState } from "react";
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
    <div className="relative flex-1">
      <svg
        className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400"
        fill="none"
        viewBox="0 0 24 24"
        strokeWidth={2}
        stroke="currentColor"
        aria-hidden="true"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="m21 21-4.3-4.3m1.8-5.2a7 7 0 1 1-14 0 7 7 0 0 1 14 0Z"
        />
      </svg>
      <input
        type="search"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        placeholder={placeholder}
        aria-label="Search tickets"
        className="w-full rounded-lg border border-gray-300 bg-white py-2 pl-9 pr-3 text-sm text-gray-800 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
      />
      {input && (
        <button
          type="button"
          onClick={() => setInput("")}
          aria-label="Clear search"
          className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
        >
          <svg
            className="h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={2}
            stroke="currentColor"
            aria-hidden="true"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
          </svg>
        </button>
      )}
    </div>
  );
}
