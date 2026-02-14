/**
 * Tavily Search API integration for real-time web search
 * https://tavily.com/
 */

import { logger } from '@/lib/logger';

const TAVILY_API_URL = 'https://api.tavily.com/search';

export interface TavilySearchResult {
  title: string;
  url: string;
  content: string;
  score: number;
}

export interface TavilySearchResponse {
  query: string;
  results: TavilySearchResult[];
  answer?: string;
}

function getApiKey(): string {
  const apiKey = process.env.TAVILY_API_KEY;
  if (!apiKey) {
    throw new Error('TAVILY_API_KEY is not set');
  }
  return apiKey;
}

/**
 * Check if a query likely needs real-time search
 */
export function needsSearch(query: string): boolean {
  const searchIndicators = [
    // News and current events
    /\b(news|latest|recent|today|yesterday|this week|this month|current|now|2024|2025|2026)\b/i,
    // Factual queries
    /\b(who is|what is|where is|when did|how many|how much|price of|cost of|weather)\b/i,
    // Research queries
    /\b(find|search|look up|google|research|information about|tell me about)\b/i,
    // Comparisons and reviews
    /\b(best|top|compare|vs|versus|review|rating)\b/i,
    // Specific entities that might need current info
    /\b(stock|crypto|bitcoin|election|score|result|release|launch)\b/i,
  ];
  
  return searchIndicators.some(pattern => pattern.test(query));
}

/**
 * Search the web using Tavily API
 */
export async function searchWeb(
  query: string,
  options?: {
    maxResults?: number;
    includeAnswer?: boolean;
    searchDepth?: 'basic' | 'advanced';
  }
): Promise<TavilySearchResponse> {
  const { 
    maxResults = 5, 
    includeAnswer = true,
    searchDepth = 'basic'
  } = options ?? {};

  try {
    const response = await fetch(TAVILY_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        api_key: getApiKey(),
        query,
        max_results: maxResults,
        include_answer: includeAnswer,
        search_depth: searchDepth,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      logger.error('Tavily API error:', error);
      throw new Error(`Tavily API error: ${response.status}`);
    }

    const data = await response.json();
    
    return {
      query: data.query,
      results: data.results?.map((r: any) => ({
        title: r.title,
        url: r.url,
        content: r.content,
        score: r.score,
      })) ?? [],
      answer: data.answer,
    };
  } catch (error) {
    logger.error('Tavily search failed:', error);
    // Return empty results on error instead of throwing
    return {
      query,
      results: [],
    };
  }
}

/**
 * Format search results into context for the LLM
 */
export function formatSearchContext(searchResponse: TavilySearchResponse): string {
  if (searchResponse.results.length === 0) {
    return '';
  }

  let context = `\n\n[Web Search Results for "${searchResponse.query}"]\n\n`;
  
  if (searchResponse.answer) {
    context += `Summary: ${searchResponse.answer}\n\n`;
  }
  
  context += 'Sources:\n';
  searchResponse.results.slice(0, 5).forEach((result, index) => {
    context += `${index + 1}. ${result.title}\n`;
    context += `   ${result.content.slice(0, 200)}...\n`;
    context += `   Source: ${result.url}\n\n`;
  });

  return context;
}
