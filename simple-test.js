// Simple test script for OpenAI brand research
// This will test the API directly without complex imports

import OpenAI from 'openai';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

async function testStihlResearch() {
  console.log("🧪 Testing OpenAI GPT-4o-mini for STIHL Research\n");
  
  if (!process.env.OPENAI_API_KEY) {
    console.error("❌ OPENAI_API_KEY not found in environment variables");
    console.log("Please create a .env file with your OpenAI API key:");
    console.log("OPENAI_API_KEY=your_actual_api_key_here");
    return;
  }
  
  try {
    console.log("📋 Researching STIHL manufacturing locations...");
    console.log("Model: GPT-4o-mini (with web search)");
    console.log("Expected: Current, accurate manufacturing information\n");
    
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "You are an expert manufacturing analyst. Research current STIHL manufacturing locations and provide accurate information."
        },
        {
          role: "user",
          content: `Research STIHL's current manufacturing locations and provide accurate information.

Please return ONLY valid JSON in this exact format:
{
  "countries": [
    {
      "country": "Country Name",
      "confidence": 0.0-1.0,
      "reasoning": "Detailed explanation with specific facility locations",
      "sources": ["source_type"],
      "facilities": ["specific facility names and locations"]
    }
  ],
  "analysis_method": "AI_web_research",
  "notes": "Important observations about manufacturing patterns"
}

Focus on:
- Current manufacturing facilities (not historical)
- Specific facility names and locations
- Manufacturing vs assembly vs distribution
- Recent changes or expansions
- Official company information

Be specific and accurate. If information is uncertain, indicate this in the confidence level.`
        }
      ],
      temperature: 0.1,
      max_tokens: 2000,
      tools: [
        {
          type: "web_search"
        }
      ]
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error('No response content from AI');
    }

    console.log("✅ Research Complete!\n");
    console.log("📊 Raw AI Response:");
    console.log(content);
    
    // Try to parse the response
    try {
      let jsonContent = content;
      
      // Handle markdown wrapping
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
      
      console.log("\n🎯 Parsed Results:");
      console.log("Analysis Method:", parsed.analysis_method);
      console.log("Notes:", parsed.notes);
      
      console.log("\n🌍 Manufacturing Locations:");
      parsed.countries.forEach((country, index) => {
        console.log(`\n${index + 1}. ${country.country} (${Math.round(country.confidence * 100)}% confidence)`);
        console.log(`   Reasoning: ${country.reasoning}`);
        console.log(`   Facilities: ${country.facilities.join(", ")}`);
        console.log(`   Sources: ${country.sources.join(", ")}`);
      });
      
      // Quality assessment
      const hasGermany = parsed.countries.some(c => c.country.toLowerCase().includes('germany'));
      const hasChina = parsed.countries.some(c => c.country.toLowerCase().includes('china'));
      const hasMultipleCountries = parsed.countries.length >= 3;
      
      console.log("\n🔍 Quality Assessment:");
      console.log("✅ Germany included:", hasGermany);
      console.log("✅ China included:", hasChina);
      console.log("✅ Multiple countries:", hasMultipleCountries);
      
      const qualityScore = [hasGermany, hasChina, hasMultipleCountries].filter(Boolean).length;
      console.log(`\n🏆 Quality Score: ${qualityScore}/3`);
      
    } catch (parseError) {
      console.error("❌ Failed to parse AI response as JSON:", parseError.message);
      console.log("Raw content that failed to parse:");
      console.log(content);
    }
    
    // Show usage and cost
    if (response.usage) {
      console.log("\n💰 API Usage:");
      console.log("Input tokens:", response.usage.prompt_tokens);
      console.log("Output tokens:", response.usage.completion_tokens);
      console.log("Total tokens:", response.usage.total_tokens);
      
      // Estimate cost (GPT-4o-mini pricing)
      const inputCost = (response.usage.prompt_tokens / 1000000) * 0.15;
      const outputCost = (response.usage.completion_tokens / 1000000) * 0.60;
      const totalCost = inputCost + outputCost;
      
      console.log(`Estimated cost: $${totalCost.toFixed(6)}`);
    }
    
  } catch (error) {
    console.error("❌ Test failed:", error.message);
    if (error.response) {
      console.error("API Error details:", error.response.data);
    }
  }
}

// Run the test
console.log("🚀 Starting OpenAI STIHL Research Test...\n");
testStihlResearch().catch(console.error);
