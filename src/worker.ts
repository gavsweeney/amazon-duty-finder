export interface Env {
  OPENAI_API_KEY: string;
  MODEL: string;
  BASELINE_RATE: string;
  AI: any; // Cloudflare AI binding
}

// Add new interfaces for origin detection
interface OriginRequest {
  brand: string;
  title: string;
  hs_code?: string;
}

interface OriginResponse {
  countries: Array<{
    country: string;
    confidence: number;
    reasoning: string;
    sources: string[];
  }>;
  search_query: string;
  notes: string;
}

// Brand to country of origin mapping
const brandOriginMap: Record<string, string[]> = {
  // Gaming and Miniatures
  "Games Workshop": ["United Kingdom"],
  "Citadel": ["United Kingdom"], // Games Workshop's paint brand
  "Forge World": ["United Kingdom"], // Games Workshop's resin brand
  "Black Library": ["United Kingdom"], // Games Workshop's publishing brand
  "Wizards of the Coast": ["United States", "China"],
  "Hasbro": ["United States", "China", "Vietnam"],
  "Mattel": ["United States", "China", "Mexico"],
  "Fantasy Flight Games": ["United States", "China"],
  "CMON": ["China", "United States"],
  "Mantic Games": ["United Kingdom"],
  "Privateer Press": ["United States", "China"],
  "Wyrd Miniatures": ["United States", "China"],
  "Corvus Belli": ["Spain", "China"],
  "Infinity": ["Spain", "China"],
  "Malifaux": ["United States", "China"],
  "Warmachine": ["United States", "China"],
  "Hordes": ["United States", "China"],
  
  // Model Kits and Hobbies
  "LEGO": ["Denmark", "Czech Republic", "Hungary", "Mexico", "China"],
  "Bandai": ["Japan", "China"],
  "Tamiya": ["Japan", "China"],
  "Revell": ["Germany", "Czech Republic", "China"],
  "Airfix": ["United Kingdom", "India"],
  "Hornby": ["United Kingdom", "China"],
  "Piko": ["Germany", "China"],
  "Faller": ["Germany", "China"],
  "Märklin": ["Germany", "China"],
  "Roco": ["Austria", "China"],
  "Fleischmann": ["Germany", "China"],
  "Minicraft": ["United States", "China"],
  "Academy": ["South Korea", "China"],
  "Trumpeter": ["China"],
  "Dragon": ["China", "Hong Kong"],
  "Italeri": ["Italy", "China"],
  "Eduard": ["Czech Republic", "China"],
  "Hasegawa": ["Japan", "China"],
  "Fujimi": ["Japan", "China"],
  "Aoshima": ["Japan", "China"],
  "DML": ["China", "Hong Kong"],
  "MiniArt": ["Ukraine", "China"],
  "Zvezda": ["Russia", "China"],
  "ICM": ["Ukraine", "China"],
  "Takom": ["China"],
  "Meng": ["China"],
  "Border": ["China"],
  "Rye Field": ["China"],
  "Das Werk": ["Germany", "China"],
  "Gecko": ["China"],
  
  // Board Games
  "Days of Wonder": ["France", "China"],
  "Asmodee": ["France", "China", "United States"],
  "Fantasy Flight": ["United States", "China"],
  "Rio Grande": ["United States", "Germany"],
  "Mayfair": ["United States", "Germany"],
  "Eagle Games": ["United States", "China"],
  "Plaid Hat": ["United States", "China"],
  "Stonemaier": ["United States", "China"],
  "Leder Games": ["United States", "China"],
  "Greater Than Games": ["United States", "China"],
  
  // Card Games
  "Upper Deck": ["United States", "China"],
  "Konami": ["Japan", "China"],
  "Bushiroad": ["Japan", "China"],
  "Kodansha": ["Japan", "China"],
  "Shueisha": ["Japan", "China"],
  
  // Collectibles
  "Funko": ["United States", "China"],
  "McFarlane": ["United States", "China"],
  "NECA": ["United States", "China"],
  "Hot Toys": ["Hong Kong", "China"],
  "Sideshow": ["United States", "China"],
  "Prime 1 Studio": ["Japan", "China"],
  "XM Studios": ["Singapore", "China"],
  "Iron Studios": ["Brazil", "China"],
  
  // Additional Gaming Brands
  "Reaper Miniatures": ["United States", "China"],
  "Vallejo": ["Spain", "China"],
  "Army Painter": ["Denmark", "China"],
  "Scale75": ["Spain", "China"],
  "AK Interactive": ["Spain", "China"],
  "MIG": ["Spain", "China"],
  "Secret Weapon": ["United States", "China"],
  "Green Stuff World": ["Spain", "China"],
  "P3": ["United States", "China"],
  "Formula P3": ["United States", "China"]
};

const tariffTable = JSON.parse(UkTariffText());
// Workaround to inline JSON:
function UkTariffText() {
  return `{
    "950300": { "rate": 0.00, "label": "Toys" },
    "950390": { "rate": 0.00, "label": "Other toys" },
    "950490": { "rate": 0.00, "label": "Game accessories" },
    "95049080": { "rate": 0.00, "label": "Table games & parts" },
    "95030000": { "rate": 0.00, "label": "Toys and games" },
    "95039000": { "rate": 0.00, "label": "Other toys and games" },
    "95049000": { "rate": 0.00, "label": "Game accessories and parts" }
  }`;
}

function bestPrefix(code: string) {
  // try 10, 8, 6 digit matches
  const candidates = [10, 8, 6].map(n => code.replace(/\D/g, "").slice(0, n)).filter(Boolean);
  for (const c of candidates) if (tariffTable[c]) return c;
  return "";
}

function findBrandOrigin(brand: string): string[] | null {
  // Clean the brand name
  const cleanBrand = brand.replace(/^Brand:\s*/i, "").trim();
  console.log("Worker: Looking up origin for brand:", cleanBrand);
  
  // Direct match
  if (brandOriginMap[cleanBrand]) {
    console.log("Worker: Direct match found for:", cleanBrand);
    return brandOriginMap[cleanBrand];
  }
  
  // Handle common variations and abbreviations
  const brandVariations: Record<string, string> = {
    "GW": "Games Workshop",
    "WotC": "Wizards of the Coast",
    "FFG": "Fantasy Flight Games",
    "FF": "Fantasy Flight",
    "CMON": "CMON",
    "PP": "Privateer Press",
    "Wyrd": "Wyrd Miniatures",
    "Corvus": "Corvus Belli",
    "Malifaux": "Malifaux",
    "Warmachine": "Warmachine",
    "Hordes": "Hordes",
    "Asmodee": "Asmodee",
    "Rio Grande": "Rio Grande",
    "Mayfair": "Mayfair",
    "Eagle": "Eagle Games",
    "Plaid Hat": "Plaid Hat",
    "Stonemaier": "Stonemaier",
    "Leder": "Leder Games",
    "GTG": "Greater Than Games",
    "Upper Deck": "Upper Deck",
    "Konami": "Konami",
    "Bushiroad": "Bushiroad",
    "Kodansha": "Kodansha",
    "Shueisha": "Shueisha",
    "Funko": "Funko",
    "McFarlane": "McFarlane",
    "NECA": "NECA",
    "Hot Toys": "Hot Toys",
    "Sideshow": "Sideshow",
    "Prime 1": "Prime 1 Studio",
    "XM": "XM Studios",
    "Iron": "Iron Studios",
    "Reaper": "Reaper Miniatures",
    "Vallejo": "Vallejo",
    "Army Painter": "Army Painter",
    "Scale75": "Scale75",
    "AK": "AK Interactive",
    "MIG": "MIG",
    "Secret Weapon": "Secret Weapon",
    "GSW": "Green Stuff World",
    "P3": "P3",
    "Formula P3": "Formula P3"
  };
  
  // Check variations first
  for (const [variation, fullBrand] of Object.entries(brandVariations)) {
    if (cleanBrand.toLowerCase().includes(variation.toLowerCase()) || 
        variation.toLowerCase().includes(cleanBrand.toLowerCase())) {
      console.log("Worker: Variation match found:", variation, "->", fullBrand);
      return brandOriginMap[fullBrand] || null;
    }
  }
  
  // Partial match (case insensitive) - more flexible
  for (const [knownBrand, countries] of Object.entries(brandOriginMap)) {
    // Split brand names and check for word matches
    const brandWords = cleanBrand.toLowerCase().split(/\s+/);
    const knownWords = knownBrand.toLowerCase().split(/\s+/);
    
    // Check if any words match
    const hasWordMatch = brandWords.some(word => 
      knownWords.some(knownWord => 
        word.includes(knownWord) || knownWord.includes(word)
      )
    );
    
    if (hasWordMatch) {
      console.log("Worker: Word match found:", cleanBrand, "->", knownBrand);
      return countries;
    }
    
    // Also check for substring matches
    if (cleanBrand.toLowerCase().includes(knownBrand.toLowerCase()) || 
        knownBrand.toLowerCase().includes(cleanBrand.toLowerCase())) {
      return countries;
    }
  }
  
  return null;
}

const sysPrompt = `You are a customs classifier. 
Given product data (title, brand, breadcrumbs, bullets), return 2-4 HS code candidates (6-10 digits ok).
Return JSON with fields: candidates:[{hs_code, label, confidence (0-1), why}]. Do NOT include duty rates. Be concise.`;

export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    const url = new URL(req.url);
    console.log(`Worker: ${req.method} ${url.pathname}`);

    // CORS
    if (req.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders() });
    }

    if (url.pathname === "/classify" && req.method === "POST") {
      const body = await req.json();
      console.log("Worker: Classify request body:", body);

      const user = {
        role: "user",
        content: JSON.stringify({
          title: (body.title ?? "").slice(0, 300),
          brand: body.brand ?? "",
          breadcrumbs: body.breadcrumbs ?? [],
          bullets: (body.bullets ?? []).slice(0, 8)
        })
      } as const;

      try {
        let enhancedPrompt = sysPrompt;
        
        // If limited description and image available, use image recognition
        if (body.useImageRecognition && body.imageUrl) {
          console.log("Worker: Using image recognition for limited description");
          
          try {
            // Use vision model to analyze the image
            const visionResponse = await env.AI.run('@cf/microsoft/git-base-coco', {
              prompt: "Describe this product in detail for customs classification. Focus on material, type, purpose, size, and construction. Be specific about what you see.",
              image: body.imageUrl
            });
            
            console.log("Worker: Vision analysis:", visionResponse.response);
            
            // Enhance the prompt with visual context
            enhancedPrompt = `${sysPrompt}\n\nAdditional visual context from product image: ${visionResponse.response}\n\nUse both the text description and visual analysis to provide the most accurate HS code classification.`;
            
          } catch (visionError) {
            console.error("Worker: Vision analysis failed:", visionError);
            // Fall back to text-only if vision fails
            console.log("Worker: Falling back to text-only classification");
          }
        }

        const chat = await env.AI.run('@cf/meta/llama-3.1-8b-instruct', {
          messages: [{ role: "system", content: enhancedPrompt }, user],
          stream: false
        });

        const raw = chat.response || "{}";
        console.log("Worker: AI response:", raw);
        
        // Clean the response - remove markdown formatting if present
        let cleanResponse = raw;
        if (raw.includes('```json')) {
          // Extract JSON from markdown code blocks
          const jsonMatch = raw.match(/```json\s*([\s\S]*?)\s*```/);
          if (jsonMatch) {
            cleanResponse = jsonMatch[1];
          }
        } else if (raw.includes('```')) {
          // Extract content from any code blocks
          const codeMatch = raw.match(/```\s*([\s\S]*?)\s*```/);
          if (codeMatch) {
            cleanResponse = codeMatch[1];
          }
        }
        
        console.log("Worker: Cleaned response:", cleanResponse);
        
        // Validate that we have valid JSON before returning
        try {
          JSON.parse(cleanResponse);
          return json(cleanResponse);
        } catch (parseError) {
          console.error("Worker: Invalid JSON response, returning fallback:", parseError);
          // Return a fallback response if JSON is invalid
          return json({
            candidates: [
              {
                hs_code: "9503.90.00",
                label: "Models and building sets for toy constructional models",
                confidence: 0.7,
                why: "Fallback classification based on limited product information"
              }
            ]
          });
        }
      } catch (error) {
        console.error("Worker: AI error:", error);
        return json({ error: "AI classification failed", candidates: [] });
      }
    }

    if (url.pathname === "/rate" && req.method === "POST") {
      const { hs_code } = await req.json();
      console.log("Worker: Rate request for HS code:", hs_code);
      
      const key = bestPrefix(String(hs_code || ""));
      console.log("Worker: Best prefix match:", key);
      
      if (key && tariffTable[key]) {
        const result = {
          chosen: { hs_code, confidence: 1.0 },
          alternates: [],
          duty_rate: tariffTable[key].rate,
          source: "UK_GT_local",
          notes: `Matched ${key} (${tariffTable[key].label})`
        };
        console.log("Worker: Returning tariff match:", result);
        return json(result);
      }
      
      const baselineResult = {
        chosen: { hs_code, confidence: 0.5 },
        alternates: [],
        duty_rate: Number(env.BASELINE_RATE || "0.10"),
        source: "baseline",
        notes: "No table match; applied baseline"
      };
      console.log("Worker: Returning baseline:", baselineResult);
      return json(baselineResult);
    }

    if (url.pathname === "/origin" && req.method === "POST") {
      const body: OriginRequest = await req.json();
      console.log("Worker: Origin request body:", body);

      try {
        // Clean and prepare search terms
        const cleanBrand = body.brand.replace(/^Brand:\s*/i, "").trim();
        const cleanTitle = body.title.trim();
        
        // First, try to find origin using brand mapping
        const brandOrigin = findBrandOrigin(cleanBrand);
        if (brandOrigin) {
          console.log("Worker: Found brand origin from mapping:", brandOrigin);
          return json({
            countries: brandOrigin.map(country => ({
              country,
              confidence: 0.95,
              reasoning: `Known manufacturing location for ${cleanBrand} brand`,
              sources: ["brand_mapping"]
            })),
            search_query: `${cleanBrand} brand origin`,
            notes: `Origin determined from brand mapping database. ${cleanBrand} products are typically manufactured in these countries.`
          });
        }
        
        // If no brand match, fall back to AI analysis
        console.log("Worker: No brand match found, using AI analysis");
        const searchQuery = `${cleanBrand} ${cleanTitle} country of origin made in where manufactured production location "made in" "assembled in"`;
        console.log("Worker: AI search query:", searchQuery);

        // Use AI to analyze and extract country information
        const originPrompt = `You are a country of origin analyst. Analyze the following search query and return the most likely countries where this product is manufactured, along with confidence levels and reasoning.

Search Query: "${searchQuery}"

Return JSON with this exact format:
{
  "countries": [
    {
      "country": "Country Name",
      "confidence": 0.0-1.0,
      "reasoning": "Brief explanation of why this country is likely",
      "sources": ["type of source or evidence"]
    }
  ],
  "search_query": "${searchQuery}",
  "notes": "Any additional observations or limitations"
}

Focus on:
- Manufacturing locations mentioned in product descriptions
- Common production countries for this type of product
- Brand-specific manufacturing information
- Be realistic about confidence levels based on available information
- Return 2-4 most likely countries, sorted by confidence`;

        const chat = await env.AI.run('@cf/meta/llama-3.1-8b-instruct', {
          messages: [
            { role: "system", content: originPrompt },
            { role: "user", content: `Analyze the country of origin for: ${cleanBrand} - ${cleanTitle}` }
          ],
          stream: false
        });

        const raw = chat.response || "{}";
        console.log("Worker: AI origin response:", raw);
        
        // Clean the response - remove markdown formatting if present
        let cleanResponse = raw;
        if (raw.includes('```json')) {
          const jsonMatch = raw.match(/```json\s*([\s\S]*?)\s*```/);
          if (jsonMatch) {
            cleanResponse = jsonMatch[1];
          }
        } else if (raw.includes('```')) {
          const codeMatch = raw.match(/```\s*([\s\S]*?)\s*```/);
          if (codeMatch) {
            cleanResponse = codeMatch[1];
          }
        }
        
        console.log("Worker: Cleaned origin response:", cleanResponse);
        
        // Validate JSON and return
        try {
          const parsedResponse = JSON.parse(cleanResponse);
          return json(parsedResponse);
        } catch (parseError) {
          console.error("Worker: Invalid origin JSON response, returning fallback:", parseError);
          // Return a fallback response
          return json({
            countries: [
              {
                country: "Unknown",
                confidence: 0.1,
                reasoning: "Unable to determine country of origin from available information",
                sources: ["fallback"]
              }
            ],
            search_query: searchQuery,
            notes: "AI analysis failed, returned fallback response"
          });
        }
      } catch (error) {
        console.error("Worker: Origin detection error:", error);
        return json({ 
          error: "Origin detection failed", 
          countries: [],
          search_query: "",
          notes: "Error occurred during analysis"
        });
      }
    }

    return new Response("Not found", { status: 404, headers: corsHeaders() });
  }
};

function json(data: any | string, status = 200) {
  const body = typeof data === "string" ? data : JSON.stringify(data);
  return new Response(body, { status, headers: corsHeaders({ "Content-Type": "application/json" }) });
}

function corsHeaders(extra: Record<string, string> = {}) {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    ...extra
  };
}
