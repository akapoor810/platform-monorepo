import React, { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../lib/api";

interface SearchResult {
  type: "page" | "user" | "org" | "api-key";
  title: string;
  description: string;
  url: string;
}

/**
 * Global search / command palette (Cmd+K).
 * See issue #40 for full requirements.
 */
export function CommandPalette() {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  // Open/close with Cmd+K / Ctrl+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setIsOpen((prev) => !prev);
      }
      if (e.key === "Escape") {
        setIsOpen(false);
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      inputRef.current?.focus();
      setQuery("");
      setResults([]);
      setSelectedIndex(0);
    }
  }, [isOpen]);

  // Debounced search
  useEffect(() => {
    if (!query.trim()) {
      setResults(getDefaultResults());
      return;
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const data = await api.get<{ results: SearchResult[] }>(
          `/search?q=${encodeURIComponent(query)}`
        );
        setResults(data.results);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 200);

    return () => clearTimeout(timer);
  }, [query]);

  const handleSelect = useCallback(
    (result: SearchResult) => {
      navigate(result.url);
      setIsOpen(false);
    },
    [navigate]
  );

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((i) => Math.min(i + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter" && results[selectedIndex]) {
      handleSelect(results[selectedIndex]);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-50" onClick={() => setIsOpen(false)} />
      <div className="fixed top-[20%] left-1/2 -translate-x-1/2 w-full max-w-lg bg-white rounded-xl shadow-2xl z-50 overflow-hidden">
        <div className="flex items-center px-4 border-b">
          <span className="text-gray-400 mr-2">🔍</span>
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search or jump to..."
            className="flex-1 py-3 outline-none text-lg"
          />
          <kbd className="text-xs text-gray-400 border rounded px-1.5 py-0.5">esc</kbd>
        </div>
        <div className="max-h-80 overflow-y-auto">
          {results.map((result, i) => (
            <button
              key={`${result.type}-${result.url}`}
              onClick={() => handleSelect(result)}
              className={`w-full px-4 py-3 text-left flex items-center gap-3 ${
                i === selectedIndex ? "bg-indigo-50" : "hover:bg-gray-50"
              }`}
            >
              <span className="text-sm text-gray-400 uppercase w-16">{result.type}</span>
              <div>
                <div className="font-medium">{result.title}</div>
                <div className="text-sm text-gray-500">{result.description}</div>
              </div>
            </button>
          ))}
          {loading && (
            <div className="px-4 py-3 text-gray-400 text-sm">Searching...</div>
          )}
        </div>
      </div>
    </>
  );
}

function getDefaultResults(): SearchResult[] {
  return [
    { type: "page", title: "Dashboard", description: "Overview and metrics", url: "/dashboard" },
    { type: "page", title: "Team Settings", description: "Manage team members", url: "/settings/team" },
    { type: "page", title: "Audit Log", description: "View admin actions", url: "/settings/audit-log" },
    { type: "page", title: "Usage & Billing", description: "API usage and billing", url: "/settings/usage" },
  ];
}
