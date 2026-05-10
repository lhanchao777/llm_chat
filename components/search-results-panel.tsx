"use client";

import { X, Globe, ExternalLink } from "lucide-react";
import { useState } from "react";

interface SearchResult {
  name: string;
  result: string;
  query?: Record<string, unknown>;
}

interface SearchResultsPanelProps {
  results: SearchResult[];
  open: boolean;
  onClose: () => void;
}

interface ParsedSearchResult {
  title?: string;
  url?: string;
  snippet?: string;
  text?: string;
}

function parseSearchResult(resultText: string): ParsedSearchResult[] {
  // Try to parse as JSON
  try {
    const parsed = JSON.parse(resultText);
    if (Array.isArray(parsed)) {
      return parsed.map((item) => ({
        title: item.title || item.name || undefined,
        url: item.url || item.link || item.href || undefined,
        snippet: item.snippet || item.description || item.text || item.content || undefined,
      }));
    }
    if (parsed.results && Array.isArray(parsed.results)) {
      return parsed.results.map((item: Record<string, unknown>) => ({
        title: (item.title || item.name) as string | undefined,
        url: (item.url || item.link || item.href) as string | undefined,
        snippet: (item.snippet || item.description || item.text || item.content) as string | undefined,
      }));
    }
  } catch {
    // Not JSON, treat as plain text
  }

  // Return as single plain text result
  return [{ text: resultText }];
}

export function SearchResultsPanel({
  results,
  open,
  onClose,
}: SearchResultsPanelProps) {
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null);

  if (!open) return null;

  return (
    <div className="w-80 border-l border-gray-200 bg-white flex flex-col overflow-hidden flex-shrink-0">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-gray-50">
        <div className="flex items-center gap-2">
          <Globe className="w-4 h-4 text-blue-500" />
          <h2 className="text-sm font-semibold text-gray-800">搜索结果</h2>
          {results.length > 0 && (
            <span className="text-xs text-gray-400 bg-gray-200 px-1.5 py-0.5 rounded-full">
              {results.length}
            </span>
          )}
        </div>
        <button
          onClick={onClose}
          className="p-1 rounded-lg hover:bg-gray-200 transition-colors"
        >
          <X className="w-4 h-4 text-gray-500" />
        </button>
      </div>

      {/* Results */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {results.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-400">
            <Globe className="w-8 h-8 mb-2" />
            <p className="text-sm">暂无搜索结果</p>
            <p className="text-xs mt-1">LLM 会在需要时自动搜索</p>
          </div>
        ) : (
          results.map((item, idx) => {
            const parsed = parseSearchResult(item.result);
            return (
              <div
                key={idx}
                className="border border-gray-200 rounded-lg overflow-hidden"
              >
                <button
                  onClick={() =>
                    setExpandedIdx(expandedIdx === idx ? null : idx)
                  }
                  className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-gray-50 transition-colors"
                >
                  <Globe className="w-3.5 h-3.5 text-blue-500 flex-shrink-0" />
                  <span className="text-xs font-medium text-gray-700 truncate flex-1">
                    {item.query
                      ? JSON.stringify(item.query).slice(0, 60)
                      : item.name}
                  </span>
                  <span className="text-[10px] text-gray-400">
                    {parsed.length} 条结果
                  </span>
                </button>

                {expandedIdx === idx && (
                  <div className="border-t border-gray-100 p-3 space-y-2">
                    {parsed.map((r, rIdx) => (
                      <div
                        key={rIdx}
                        className="text-xs"
                      >
                        {r.title && (
                          <div className="font-medium text-gray-800 mb-0.5">
                            {r.url ? (
                              <a
                                href={r.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="hover:text-blue-600 inline-flex items-center gap-1"
                              >
                                {r.title}
                                <ExternalLink className="w-3 h-3" />
                              </a>
                            ) : (
                              r.title
                            )}
                          </div>
                        )}
                        {r.url && !r.title && (
                          <a
                            href={r.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:underline break-all inline-flex items-center gap-1"
                          >
                            {r.url}
                            <ExternalLink className="w-3 h-3 flex-shrink-0" />
                          </a>
                        )}
                        {(r.snippet || r.text) && (
                          <p className="text-gray-500 leading-relaxed whitespace-pre-wrap break-words">
                            {r.snippet || r.text}
                          </p>
                        )}
                        {rIdx < parsed.length - 1 && (
                          <hr className="my-1.5 border-gray-100" />
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
