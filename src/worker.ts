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
  ean?: string;
  upc?: string;
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
  "Formula P3": ["United States", "China"],
  
  // Tools & Hardware
  "Milwaukee": ["United States", "China", "Mexico"],
  "DeWalt": ["United States", "China", "Mexico"],
  "Makita": ["Japan", "China", "United Kingdom"],
  "Bosch": ["Germany", "China", "United States"],
  "Ryobi": ["Japan", "China", "United States"],
  "Black & Decker": ["United States", "China", "Mexico"],
  "Stanley": ["United States", "China", "United Kingdom"],
  "Craftsman": ["United States", "China", "Mexico"],
  "Husky": ["United States", "China"],
  "Kobalt": ["United States", "China"]
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

// EAN-13 country code prefixes
const eanCountryPrefixes: Record<string, string[]> = {
  "00": ["United States", "Canada"],
  "01": ["United States", "Canada"],
  "02": ["United States", "Canada"],
  "03": ["United States", "Canada"],
  "04": ["United States", "Canada"],
  "05": ["United States", "Canada"],
  "06": ["United States", "Canada"],
  "07": ["United States", "Canada"],
  "08": ["United States", "Canada"],
  "09": ["United States", "Canada"],
  "10": ["United States", "Canada"],
  "11": ["United States", "Canada"],
  "12": ["United States", "Canada"],
  "13": ["United States", "Canada"],
  "20": ["United States"], // Reserved for local use
  "21": ["United States"], // Reserved for local use
  "22": ["United States"], // Reserved for local use
  "23": ["United States"], // Reserved for local use
  "24": ["United States"], // Reserved for local use
  "25": ["United States"], // Reserved for local use
  "26": ["United States"], // Reserved for local use
  "27": ["United States"], // Reserved for local use
  "28": ["United States"], // Reserved for local use
  "29": ["United States"], // Reserved for local use
  "30": ["France"],
  "31": ["France"],
  "32": ["France"],
  "33": ["France"],
  "34": ["France"],
  "35": ["France"],
  "36": ["France"],
  "37": ["France"],
  "40": ["Germany"],
  "41": ["Germany"],
  "42": ["Germany"],
  "43": ["Germany"],
  "44": ["Germany"],
  "45": ["Japan"],
  "46": ["Japan"],
  "47": ["Japan"],
  "48": ["Japan"],
  "49": ["Japan"],
  "50": ["United Kingdom"],
  "54": ["Belgium", "Luxembourg"],
  "57": ["Denmark"],
  "64": ["Finland"],
  "70": ["Norway"],
  "73": ["Sweden"],
  "76": ["Switzerland"],
  "80": ["Italy"],
  "81": ["Italy"],
  "82": ["Italy"],
  "83": ["Italy"],
  "84": ["Spain"],
  "87": ["Netherlands"],
  "90": ["Austria"],
  "91": ["Austria"],
  "93": ["Australia"],
  "94": ["New Zealand"]
};

function analyzeEANCountry(ean: string): { countries: string[], confidence: number, reasoning: string } | null {
  if (!ean || ean.length < 2) return null;
  
  const prefix = ean.substring(0, 2);
  const countries = eanCountryPrefixes[prefix];
  
  if (countries) {
    return {
      countries,
      confidence: 0.85, // High confidence for EAN country codes
      reasoning: `EAN-13 country code prefix '${prefix}' indicates registration in ${countries.join(', ')}`
    };
  }
  
  return null;
}

function analyzeUPCCountry(upc: string): { countries: string[], confidence: number, reasoning: string } | null {
  if (!upc || upc.length < 1) return null;
  
  // UPC-A codes typically start with 0-9 for US/Canada
  const firstDigit = upc.charAt(0);
  
  if (firstDigit >= '0' && firstDigit <= '9') {
    return {
      countries: ["United States", "Canada"],
      confidence: 0.80, // Good confidence for UPC codes
      reasoning: `UPC-A code starting with '${firstDigit}' typically indicates US/Canada registration`
    };
  }
  
  return null;
}

function findBrandOrigin(brand: string): string[] | null {
  // Clean the brand name
  const cleanBrand = brand.replace(/^Brand:\s*/i, "").trim();
  console.log("Worker: Looking up origin for brand:", cleanBrand);
  console.log("Worker: Available brands in database:", Object.keys(brandOriginMap).length);
  
  // Direct match
  if (brandOriginMap[cleanBrand]) {
    console.log("Worker: Direct match found for:", cleanBrand);
    console.log("Worker: Manufacturing countries:", brandOriginMap[cleanBrand]);
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
    "Formula P3": "Formula P3",
    
    // Tool brand variations
    "Milwaukee": "Milwaukee",
    "DeWalt": "DeWalt", 
    "Makita": "Makita",
    "Bosch": "Bosch",
    "Ryobi": "Ryobi",
    "B&D": "Black & Decker",
    "Black and Decker": "Black & Decker",
    "Stanley": "Stanley",
    "Craftsman": "Craftsman",
    "Husky": "Husky",
    "Kobalt": "Kobalt"
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
  
  console.log("Worker: No brand match found for:", cleanBrand);
  console.log("Worker: Attempted matching methods: direct, variations, word-based, substring");
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

      // Clean and prepare search terms
      const cleanBrand = body.brand.replace(/^Brand:\s*/i, "").trim();
      const cleanTitle = body.title.trim();
      
      try {
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
        
        // If no brand match, try EAN/UPC analysis first
        let eanUPCResult = null;
        if (body.ean) {
          console.log("Worker: Analyzing EAN code:", body.ean);
          eanUPCResult = analyzeEANCountry(body.ean);
          if (eanUPCResult) {
            console.log("Worker: EAN analysis result:", eanUPCResult);
          }
        }
        
        if (body.upc && !eanUPCResult) {
          console.log("Worker: Analyzing UPC code:", body.upc);
          eanUPCResult = analyzeUPCCountry(body.upc);
          if (eanUPCResult) {
            console.log("Worker: UPC analysis result:", eanUPCResult);
          }
        }
        
        // If EAN/UPC analysis found countries, use that
        if (eanUPCResult) {
          console.log("Worker: Using EAN/UPC analysis result");
          return json({
            countries: eanUPCResult.countries.map(country => ({
              country,
              confidence: eanUPCResult.confidence,
              reasoning: eanUPCResult.reasoning,
              sources: ["ean_upc_analysis"]
            })),
            search_query: `${cleanBrand} ${cleanTitle} (EAN: ${body.ean || 'N/A'}, UPC: ${body.upc || 'N/A'})`,
            analysis_method: "ean_upc_analysis",
            confidence_factors: ["barcode_country_code", "product_registration"],
            notes: `Country of origin determined from EAN/UPC barcode analysis. This indicates where the product was registered, which often correlates with manufacturing location.`,
            ean_upc_info: {
              ean: body.ean || null,
              upc: body.upc || null,
              analysis_method: body.ean ? "EAN-13" : "UPC-A"
            }
          });
        }
        
        // If no EAN/UPC match, fall back to AI analysis
        console.log("Worker: No brand or EAN/UPC match found, using AI analysis");
        console.log("Worker: Brand:", cleanBrand);
        console.log("Worker: Title:", cleanTitle);
        console.log("Worker: EAN:", body.ean || "N/A");
        console.log("Worker: UPC:", body.upc || "N/A");
        
        const searchQuery = `${cleanBrand} ${cleanTitle} country of origin made in where manufactured production location "made in" "assembled in"`;
        console.log("Worker: AI search query:", searchQuery);

        // Enhanced AI prompt for better country of origin analysis
        const originPrompt = `You are an expert country of origin analyst specializing in manufacturing and supply chain analysis. Your task is to determine the most likely manufacturing countries for a product based on available information.

PRODUCT INFORMATION:
- Brand: "${cleanBrand}"
- Title: "${cleanTitle}"
- EAN: "${body.ean || 'Not provided'}"
- UPC: "${body.upc || 'Not provided'}"
- Search Query: "${searchQuery}"

ANALYSIS INSTRUCTIONS:
1. Analyze the brand name for any geographic or cultural indicators
2. Consider the product type and common manufacturing locations
3. Look for explicit mentions of "made in", "assembled in", or similar phrases
4. Consider industry patterns for this type of product
5. If EAN/UPC codes are provided, consider their country implications
6. Be realistic about confidence levels based on available information

REQUIRED OUTPUT FORMAT (JSON only):
{
  "countries": [
    {
      "country": "Country Name",
      "confidence": 0.0-1.0,
      "reasoning": "Detailed explanation of why this country is likely, including specific evidence or patterns",
      "sources": ["evidence_type", "industry_knowledge", "product_analysis"]
    }
  ],
  "search_query": "${searchQuery}",
  "analysis_method": "AI_analysis",
  "confidence_factors": ["brand_analysis", "product_type_patterns", "industry_knowledge"],
  "notes": "Detailed observations about the analysis process, limitations, and recommendations for better accuracy"
}

CONFIDENCE LEVEL GUIDELINES:
- 0.9-1.0: Explicit "made in" statements or strong brand-country associations
- 0.7-0.8: Strong industry patterns or brand characteristics
- 0.5-0.6: General industry knowledge or educated guesses
- 0.3-0.4: Weak indicators or limited information
- 0.1-0.2: Very limited information, high uncertainty

Return 2-4 most likely countries, sorted by confidence. Be specific and detailed in your reasoning.`;

        const chat = await env.AI.run('@cf/meta/llama-3.1-8b-instruct', {
          messages: [
            { role: "system", content: originPrompt },
            { role: "user", content: `Analyze the country of origin for: ${cleanBrand} - ${cleanTitle}` }
          ],
          stream: false
        });

        const raw = chat.response || "{}";
        console.log("Worker: AI origin response received:", raw.length, "characters");
        console.log("Worker: Raw AI response:", raw);
        
        // Enhanced response cleaning and validation
        let cleanResponse = raw;
        let cleaningMethod = "none";
        
        if (raw.includes('```json')) {
          const jsonMatch = raw.match(/```json\s*([\s\S]*?)\s*```/);
          if (jsonMatch) {
            cleanResponse = jsonMatch[1];
            cleaningMethod = "json_code_block";
            console.log("Worker: Extracted JSON from code block");
          }
        } else if (raw.includes('```')) {
          const codeMatch = raw.match(/```\s*([\s\S]*?)\s*```/);
          if (codeMatch) {
            cleanResponse = codeMatch[1];
            cleaningMethod = "generic_code_block";
            console.log("Worker: Extracted content from generic code block");
          }
        }
        
        console.log("Worker: Response cleaning method:", cleaningMethod);
        console.log("Worker: Cleaned response length:", cleanResponse.length);
        console.log("Worker: Cleaned response:", cleanResponse);
        
        // Enhanced JSON validation and error handling
        try {
          const parsedResponse = JSON.parse(cleanResponse);
          console.log("Worker: Successfully parsed AI response");
          console.log("Worker: Parsed countries count:", parsedResponse.countries?.length || 0);
          
          // Validate the response structure
          if (!parsedResponse.countries || !Array.isArray(parsedResponse.countries)) {
            console.warn("Worker: AI response missing countries array, adding fallback");
            parsedResponse.countries = [
              {
                country: "Unknown",
                confidence: 0.1,
                reasoning: "AI response structure invalid, fallback added",
                sources: ["ai_fallback"]
              }
            ];
          }
          
          // Add metadata about the analysis
          parsedResponse.analysis_timestamp = new Date().toISOString();
          parsedResponse.processing_method = "AI_analysis_with_validation";
          
          return json(parsedResponse);
        } catch (parseError) {
          console.error("Worker: JSON parsing failed:", parseError);
          console.error("Worker: Failed to parse response:", cleanResponse);
          
          // Enhanced fallback response with detailed error information
          return json({
            countries: [
              {
                country: "Unknown",
                confidence: 0.1,
                reasoning: "AI analysis completed but response could not be parsed as valid JSON",
                sources: ["ai_parsing_error"]
              }
            ],
            search_query: searchQuery,
            analysis_method: "AI_analysis_failed",
                      error_details: {
            parsing_error: parseError instanceof Error ? parseError.message : String(parseError),
            response_length: raw.length,
            cleaning_method: cleaningMethod,
            raw_response_preview: raw.substring(0, 200) + "..."
          },
            notes: "AI analysis was attempted but the response format was invalid. This may indicate an issue with the AI model's output or response processing.",
            recommendations: [
              "Check AI model response format",
              "Verify JSON structure compliance",
              "Consider retrying the analysis"
            ]
          });
        }
      } catch (error) {
        console.error("Worker: Origin detection error:", error);
        console.error("Worker: Error details:", {
          error_type: error instanceof Error ? error.constructor.name : typeof error,
          error_message: error instanceof Error ? error.message : String(error),
          error_stack: error instanceof Error ? error.stack : undefined,
          timestamp: new Date().toISOString()
        });
        
        return json({ 
          error: "Origin detection failed", 
          countries: [
            {
              country: "Unknown",
              confidence: 0.1,
              reasoning: "System error occurred during origin analysis",
              sources: ["system_error"]
            }
          ],
          search_query: cleanBrand + " " + cleanTitle,
          analysis_method: "error_fallback",
          error_details: {
            error_type: error instanceof Error ? error.constructor.name : typeof error,
            error_message: error instanceof Error ? error.message : String(error),
            timestamp: new Date().toISOString()
          },
          notes: "A system error occurred during the origin analysis process. This may be due to AI service issues, network problems, or system errors.",
          recommendations: [
            "Check system logs for detailed error information",
            "Verify AI service availability",
            "Consider retrying the request"
          ]
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
