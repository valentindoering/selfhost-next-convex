"use client";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useState } from "react";

interface ResearchResult {
  title: string;
  url: string;
  content: string;
  score: number;
}

interface ResearchData {
  query: string;
  results: ResearchResult[];
  summary: string;
  researchedAt: number;
  todoId: string;
  metadata?: {
    searchTerms: string[];
    resultCount: number;
    averageRelevance: number;
    tavilyUsed?: boolean;
    mockData?: boolean;
  };
}

export function ResearchPanel() {
  const todos = useQuery(api.todos.get);
  const [expandedResults, setExpandedResults] = useState<Set<string>>(new Set());

  const toggleExpanded = (resultId: string) => {
    const newExpanded = new Set(expandedResults);
    if (newExpanded.has(resultId)) {
      newExpanded.delete(resultId);
    } else {
      newExpanded.add(resultId);
    }
    setExpandedResults(newExpanded);
  };

  // Get todos that have research results
  const todosWithResearch = todos?.filter(todo => 
    (todo.researchResults && todo.researchResults.length > 0) ||
    (todo.researchData && Object.keys(todo.researchData).length > 0)
  ) || [];

  if (todosWithResearch.length === 0) {
    return (
      <div className="w-96 bg-gray-50 border-l border-gray-200 p-4">
        <h2 className="text-xl font-bold text-gray-800 mb-4">Research Results</h2>
        <p className="text-gray-500 text-center py-8">
          No research results yet. Add a todo that needs research to see results here.
        </p>
      </div>
    );
  }

  return (
    <div className="w-96 bg-gray-50 border-l border-gray-200 p-4 overflow-y-auto max-h-screen">
      <h2 className="text-xl font-bold text-gray-800 mb-4">Research Results</h2>
      
      <div className="space-y-6">
        {todosWithResearch.map((todo) => {
          let researchData: ResearchData | null = null;
          try {
            // Try researchData field first (newer format), then fall back to researchResults
            if (todo.researchData) {
              researchData = todo.researchData as ResearchData;
            } else if (todo.researchResults) {
              researchData = JSON.parse(todo.researchResults);
            }
          } catch {
            return null;
          }

          if (!researchData) return null;

          return (
            <div key={todo._id} className="bg-white rounded-lg shadow-sm border p-4">
              <div className="mb-3">
                <h3 className="font-semibold text-gray-800 text-sm mb-1">
                  TODO: {todo.text}
                </h3>
                <p className="text-xs text-gray-500">
                  Researched: {new Date(researchData.researchedAt).toLocaleString()}
                </p>
              </div>

              <div className="mb-4">
                <h4 className="font-medium text-gray-700 text-sm mb-2 flex items-center gap-1">
                  <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Research Summary
                </h4>
                <div className="bg-blue-50 border border-blue-200 p-3 rounded-lg">
                  <p className="text-sm text-gray-700 leading-relaxed">
                    {researchData.summary}
                  </p>
                  {researchData.metadata && (
                    <div className="mt-2 pt-2 border-t border-blue-200">
                      <div className="flex items-center gap-4 text-xs text-gray-600">
                        <span>📊 {researchData.results.length} sources</span>
                        <span>⏱️ {new Date(researchData.researchedAt).toLocaleString()}</span>
                        {researchData.metadata.averageRelevance && (
                          <span>🎯 {Math.round(researchData.metadata.averageRelevance * 100)}% avg relevance</span>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <h4 className="font-medium text-gray-700 text-sm">
                  Research Results ({researchData.results.length})
                </h4>
                
                {researchData.results.map((result, index) => {
                  const resultId = `${todo._id}-${index}`;
                  const isExpanded = expandedResults.has(resultId);
                  
                  return (
                    <div key={index} className="border border-gray-200 rounded p-3 hover:border-blue-300 transition-colors">
                      <div className="flex items-start justify-between mb-2">
                        <h5 className="font-medium text-sm text-gray-800 flex-1 leading-tight">
                          {result.title}
                        </h5>
                        <span className="text-xs text-gray-500 ml-2 px-2 py-1 bg-gray-100 rounded">
                          {Math.round(result.score * 100)}%
                        </span>
                      </div>
                      
                      <div className="flex items-center gap-2 mb-3">
                        <a 
                          href={result.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-blue-600 hover:text-blue-800 hover:underline flex-1 truncate"
                          title={result.url}
                        >
                          🔗 {result.url}
                        </a>
                        <button
                          onClick={() => window.open(result.url, '_blank')}
                          className="text-xs bg-blue-100 hover:bg-blue-200 text-blue-700 px-2 py-1 rounded transition-colors"
                          title="Open in new tab"
                        >
                          Open
                        </button>
                      </div>
                      
                      <button
                        onClick={() => toggleExpanded(resultId)}
                        className="w-full text-xs text-gray-600 hover:text-gray-800 bg-gray-50 hover:bg-gray-100 px-3 py-2 rounded transition-colors flex items-center justify-center gap-1 mb-2"
                      >
                        {isExpanded ? (
                          <>
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                            </svg>
                            Hide content
                          </>
                        ) : (
                          <>
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                            Show content
                          </>
                        )}
                      </button>
                      
                      {isExpanded && (
                        <div className="bg-gray-50 p-3 rounded border-l-4 border-blue-200">
                          <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
                            {result.content}
                          </p>
                          {result.content && result.content.length > 500 && (
                            <div className="mt-2 pt-2 border-t border-gray-200">
                              <p className="text-xs text-gray-500">
                                Content length: {result.content.length} characters
                              </p>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}