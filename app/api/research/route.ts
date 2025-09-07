import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const { query, todoId } = await request.json();
    
    if (!query || !todoId) {
      return NextResponse.json({ error: "Query and todoId are required" }, { status: 400 });
    }

    const tavilyApiKey = process.env.TAVILY_API_KEY;
    if (!tavilyApiKey) {
      console.error("TAVILY_API_KEY not set, using mock data");
      // Fallback to mock data if no API key
      const mockResults = {
        query,
        results: [
          {
            title: `${query} - Research Results`,
            url: `https://example.com/search?q=${encodeURIComponent(query)}`,
            content: `Mock research results for "${query}". Set TAVILY_API_KEY environment variable to enable real web search.`,
            score: 0.85,
          }
        ],
        summary: `Mock research completed for "${query}". Set TAVILY_API_KEY to enable real web search.`,
        researchedAt: Date.now(),
        todoId,
        metadata: {
          searchTerms: query.split(' '),
          resultCount: 1,
          averageRelevance: 0.85,
          mockData: true
        }
      };
      return NextResponse.json(mockResults);
    }

    console.log(`Starting research for: "${query}"`);
    
    // Call Tavily API
    const tavilyResponse = await fetch("https://api.tavily.com/search", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${tavilyApiKey}`,
      },
      body: JSON.stringify({
        query: query,
        search_depth: "advanced",
        include_answer: true,
        include_raw_content: false,
        max_results: 5,
        include_domains: [],
        exclude_domains: []
      }),
    });

    if (!tavilyResponse.ok) {
      console.error(`Tavily API error: ${tavilyResponse.status} ${tavilyResponse.statusText}`);
      const errorText = await tavilyResponse.text();
      console.error("Tavily error response:", errorText);
      return NextResponse.json({ 
        error: `Tavily API error: ${tavilyResponse.status}` 
      }, { status: 500 });
    }

    const tavilyData = await tavilyResponse.json();
    console.log("Tavily response received, processing results...");

    // Transform Tavily results to our format
    type ResearchResult = { title: string; url: string; content: string; score: number };
    const rawResults: unknown[] = Array.isArray(tavilyData.results) ? tavilyData.results : [];
    const results: ResearchResult[] = rawResults.map((r: unknown) => {
      const obj = (r ?? {}) as Record<string, unknown>;
      return {
        title: typeof obj.title === "string" ? obj.title : "No title",
        url: typeof obj.url === "string" ? obj.url : "",
        content: typeof obj.content === "string" ? obj.content : "",
        score: typeof obj.score === "number" ? obj.score : 0,
      };
    });

    const researchResults = {
      query,
      results,
      summary: tavilyData.answer || `Research completed for "${query}". Found ${results.length} relevant results.`,
      researchedAt: Date.now(),
      todoId,
      metadata: {
        searchTerms: query.split(' '),
        resultCount: results.length,
        averageRelevance: results.length ? results.reduce((sum, r) => sum + r.score, 0) / results.length : 0,
        tavilyUsed: true
      }
    };

    console.log(`Research completed for "${query}" - found ${results.length} results`);
    return NextResponse.json(researchResults);
  } catch (error) {
    console.error("Research API error:", error);
    return NextResponse.json({ 
      error: "Failed to perform research", 
      details: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 });
  }
}