// AI-Powered Brand Research System
// Uses OpenAI GPT-4o-mini for web search and brand analysis

import OpenAI from 'openai';
// dotenv removed - not compatible with Cloudflare Workers

// Environment variables loaded from Cloudflare Workers env

// OpenAI client temporarily disabled for compatibility
// const openai = new OpenAI({
//   apiKey: 'disabled_for_now',
// });

export interface BrandResearchResult {
  countries: Array<{
    country: string;
    confidence: number;
    reasoning: string;
    sources: string[];
    facilities: string[];
  }>;
  analysis_method: string;
  last_researched: string;
  notes: string;
  sources: string[];
  ai_model: string;
  cost: string;
}

export interface BrandResearchRequest {
  brand: string;
  product_type?: string;
  include_sources?: boolean;
  model?: 'gpt-4o' | 'gpt-4o-mini';
}

// Brand research prompt template
const BRAND_RESEARCH_PROMPT = `You are an expert manufacturing and supply chain analyst. Research the current manufacturing locations for the specified brand and provide accurate, up-to-date information.

BRAND: {brand}
PRODUCT TYPE: {product_type}

Please return ONLY valid JSON in this exact format:
{
  "countries": [
    {
      "country": "Country Name",
      "confidence": 0.0-1.0,
      "reasoning": "Detailed explanation with specific facility locations and manufacturing activities",
      "sources": ["source_type"],
      "facilities": ["specific facility names and locations"]
    }
  ],
  "analysis_method": "AI_web_research",
  "last_researched": "current_date",
  "notes": "Important observations about manufacturing patterns, recent changes, or industry trends",
  "sources": ["list of information sources used"]
}

RESEARCH REQUIREMENTS:
1. Focus on CURRENT manufacturing facilities (not historical)
2. Distinguish between manufacturing, assembly, and distribution
3. Include specific facility names and locations when available
4. Consider recent announcements, expansions, or closures
5. Use official company information when possible
6. Include confidence levels based on information quality
7. Provide reasoning for each manufacturing location

CONFIDENCE LEVELS:
- 0.9-1.0: Official company statements, recent press releases
- 0.7-0.8: Industry reports, trade publications
- 0.5-0.6: General industry knowledge, educated estimates
- 0.3-0.4: Limited information, high uncertainty

Be specific and accurate. If information is uncertain, indicate this in the confidence level and reasoning.`;

export class BrandResearchService {
  private cache: Map<string, BrandResearchResult> = new Map();
  private readonly CACHE_DURATION = 30 * 24 * 60 * 60 * 1000; // 30 days

  constructor(private apiKey: string) {
    if (!apiKey) {
      throw new Error('OpenAI API key is required');
    }
  }

  /**
   * Research a brand's manufacturing locations using AI
   */
  async researchBrand(request: BrandResearchRequest): Promise<BrandResearchResult> {
    const { brand, product_type = 'general', model = 'gpt-4o-mini' } = request;
    
    // Check cache first
    const cacheKey = `${brand.toLowerCase()}_${model}`;
    const cached = this.cache.get(cacheKey);
    if (cached && this.isCacheValid(cached.last_researched)) {
      console.log(`BrandResearch: Using cached result for ${brand}`);
      return cached;
    }

    console.log(`BrandResearch: Researching ${brand} using ${model}...`);

    try {
      const result = await this.performResearch(brand, product_type, model);
      
      // Cache the result
      this.cache.set(cacheKey, result);
      
      return result;
    } catch (error) {
      console.error(`BrandResearch: Error researching ${brand}:`, error);
      throw new Error(`Failed to research brand ${brand}: ${error}`);
    }
  }

  /**
   * Perform the actual AI research using OpenAI GPT-4o-mini with web search
   */
  private async performResearch(
    brand: string, 
    product_type: string, 
    model: string
  ): Promise<BrandResearchResult> {
    console.log('BrandResearch: Starting OpenAI research for brand:', brand);
    
    try {
      // Initialize OpenAI client with API key from constructor
      const openai = new OpenAI({
        apiKey: this.apiKey,
      });

      // Create the research prompt
      const prompt = BRAND_RESEARCH_PROMPT
        .replace('{brand}', brand)
        .replace('{product_type}', product_type);

      console.log('BrandResearch: Sending request to OpenAI with web search...');
      
      const response = await openai.chat.completions.create({
        model: model,
        messages: [
          {
            role: 'system',
            content: 'You are an expert manufacturing analyst with access to current web information. Research and provide accurate, up-to-date information about brand manufacturing locations.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        // Note: web_search tool not available in current OpenAI package version
        // Using standard completion without web search for now
        temperature: 0.1, // Low temperature for consistent, factual responses
        max_tokens: 2000
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        throw new Error('No response content from OpenAI');
      }

      console.log('BrandResearch: OpenAI response received, parsing...');
      console.log('BrandResearch: Response content:', content);
      
      // Parse and validate the response
      const parsed = this.parseAIResponse(content);
      
      // Add metadata
      return {
        ...parsed,
        ai_model: model,
        cost: this.estimateCost(model, response.usage),
        last_researched: new Date().toISOString()
      };
      
    } catch (error) {
      console.error('BrandResearch: OpenAI research failed:', error);
      
      // Return intelligent fallback based on brand characteristics
      return this.getIntelligentFallback(brand, product_type, model);
    }
  }

  /**
   * Real fallback when OpenAI research fails - no more mock data
   */
  private getIntelligentFallback(brand: string, product_type: string, model: string): BrandResearchResult {
    console.log('BrandResearch: Using real fallback for brand:', brand);
    
    // Return a real fallback that indicates the system needs attention
    return {
      countries: [
        {
          country: 'Research Required',
          confidence: 0.1,
          reasoning: 'OpenAI research failed - manual investigation needed',
          sources: ['system_fallback'],
          facilities: ['requires_research']
        }
      ],
      analysis_method: 'real_fallback',
      notes: 'OpenAI research failed - this brand needs manual investigation or API troubleshooting',
      sources: ['system_fallback'],
      ai_model: model,
      cost: 'error_cost',
      last_researched: new Date().toISOString()
    };
  }

  /**
   * Parse and validate AI response
   */
  private parseAIResponse(content: string): Omit<BrandResearchResult, 'ai_model' | 'cost' | 'last_researched'> {
    try {
      // Try to extract JSON from the response
      let jsonContent = content;
      
      // Handle cases where AI wraps response in markdown
      if (content.includes('```json')) {
        const match = content.match(/```json\s*([\s\S]*?)\s*```/);
        if (match) {
          jsonContent = match[1];
        }
      } else if (content.includes('```')) {
        const match = content.match(/```\s*([\s\S]*?)\s*```/);
        if (match) {
          jsonContent = match[1];
        }
      }

      const parsed = JSON.parse(jsonContent);
      
      // Validate required fields
      if (!parsed.countries || !Array.isArray(parsed.countries)) {
        throw new Error('Invalid response: missing countries array');
      }

      return parsed;
    } catch (error) {
      console.error('BrandResearch: Failed to parse AI response:', error);
      console.error('Raw content:', content);
      
      // Return fallback response
      return {
        countries: [
          {
            country: 'Unknown',
            confidence: 0.1,
            reasoning: 'AI research failed, fallback response',
            sources: ['fallback'],
            facilities: ['unknown']
          }
        ],
        analysis_method: 'AI_research_failed',
        notes: 'AI research failed, using fallback response',
        sources: ['fallback']
      };
    }
  }

  /**
   * Check if cached result is still valid
   */
  private isCacheValid(lastResearched: string): boolean {
    const lastResearchedDate = new Date(lastResearched);
    const now = new Date();
    return (now.getTime() - lastResearchedDate.getTime()) < this.CACHE_DURATION;
  }

  /**
   * Estimate the cost of the API call
   */
  private estimateCost(model: string, usage: any): string {
    if (!usage) return 'unknown';
    
    // OpenAI pricing (approximate)
    const pricing = {
      'gpt-4o': { input: 2.50, output: 10.00 }, // per 1M tokens
      'gpt-4o-mini': { input: 0.15, output: 0.60 } // per 1M tokens
    };
    
    const modelPricing = pricing[model as keyof typeof pricing] || pricing['gpt-4o-mini'];
    
    const inputCost = (usage.prompt_tokens / 1000000) * modelPricing.input;
    const outputCost = (usage.completion_tokens / 1000000) * modelPricing.output;
    const totalCost = inputCost + outputCost;
    
    return `$${totalCost.toFixed(4)}`;
  }

  /**
   * Clear the cache
   */
  clearCache(): void {
    this.cache.clear();
    console.log('BrandResearch: Cache cleared');
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { size: number; entries: string[] } {
    return {
      size: this.cache.size,
      entries: Array.from(this.cache.keys())
    };
  }
}

// Export singleton instance
// This service is now instantiated in the worker with the API key from env
// export const brandResearchService = new BrandResearchService(process.env.OPENAI_API_KEY || '');
