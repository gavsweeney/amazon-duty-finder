export interface Env {
  OPENAI_API_KEY: string;
  MODEL: string;
  BASELINE_RATE: string;
  AI: any; // Cloudflare AI binding
}

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

    return new Response("Not found", { status: 404, headers: corsHeaders() });
  }
} satisfies ExportedHandler<Env>;

function json(data: any | string, status = 200) {
  const body = typeof data === "string" ? data : JSON.stringify(data);
  return new Response(body, { status, headers: corsHeaders({ "Content-Type": "application/json" }) });
}

function corsHeaders(extra: Record<string, string> = {}) {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    ...extra
  };
}
