const API_BASE = "https://duty-finder.gavinsweeneydutyfinder.workers.dev";

console.log("Background script loaded!");

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  console.log("Background: Received message:", msg);
  
  if (msg.type === "CLASSIFY_AND_RATE") {
    console.log("Background: Processing CLASSIFY_AND_RATE message");
    
    // Handle the message asynchronously
    (async () => {
      try {
        console.log("Background: Starting CLASSIFY_AND_RATE process");
        const product = msg.product;
        
        // Check if we have limited description and should use image recognition
        const hasLimitedDescription = (product.title?.split(' ').length || 0) <= 3 || (product.bullets?.length || 0) <= 1;
        const hasImage = product.imageUrl && product.imageUrl.length > 0;
        
        console.log("Background: Limited description:", hasLimitedDescription, "Has image:", hasImage);
        
        console.log("Background: Calling /classify endpoint");
        const classify = await fetch(`${API_BASE}/classify`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...product,
            useImageRecognition: hasLimitedDescription && hasImage
          })
        }).then(r => r.json());

        console.log("Background: Received classify response:", classify);
        
        const top = classify?.candidates?.[0];
        console.log("Background: Top candidate:", top);
        
        if (!top?.hs_code) {
          console.error("Background: No HS code found in classify response");
          sendResponse({ 
            error: "No HS code found in classification",
            duty_rate: 0,
            chosen: { hs_code: "—", confidence: 0 },
            source: "error"
          });
          return;
        }

        console.log("Background: Calling /rate endpoint with HS code:", top.hs_code);
        const rate = await fetch(`${API_BASE}/rate`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ hs_code: top.hs_code })
        }).then(r => r.json());

        console.log("Background: Received rate response:", rate);
        
        // Also fetch origin information
        console.log("Background: Calling /origin endpoint for country of origin");
        const origin = await fetch(`${API_BASE}/origin`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ 
            brand: product.brand, 
            title: product.title,
            hs_code: top.hs_code 
          })
        }).then(r => r.json());

        console.log("Background: Received origin response:", origin);
        
        // Combine duty and origin information
        const combinedResponse = {
          ...rate,
          origin: origin
        };
        
        sendResponse(combinedResponse);
      } catch (error) {
        console.error("Background script error:", error);
        sendResponse({ 
          error: "Failed to fetch duty information",
          duty_rate: 0,
          chosen: { hs_code: "—", confidence: 0 },
          source: "error"
        });
      }
    })();
    
    // Return true to indicate we'll send a response asynchronously
    return true;
  }
  
  if (msg.type === "GET_ORIGIN_ONLY") {
    console.log("Background: Processing GET_ORIGIN_ONLY message");
    
    // Handle the message asynchronously
    (async () => {
      try {
        console.log("Background: Starting GET_ORIGIN_ONLY process");
        const product = msg.product;
        
        console.log("Background: Calling /origin endpoint for country of origin");
        const origin = await fetch(`${API_BASE}/origin`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ 
            brand: product.brand, 
            title: product.title
          })
        }).then(r => r.json());

        console.log("Background: Received origin response:", origin);
        sendResponse(origin);
      } catch (error) {
        console.error("Background script error:", error);
        sendResponse({ 
          error: "Failed to fetch origin information",
          countries: [],
          search_query: "",
          notes: "Error occurred during analysis"
        });
      }
    })();
    
    // Return true to indicate we'll send a response asynchronously
    return true;
  }
  
  // For other message types, send immediate response
  console.log("Background: Unknown message type:", msg.type);
  sendResponse({ error: "Unknown message type" });
  return false;
});

// Test if the background script is working
chrome.runtime.onInstalled.addListener(() => {
  console.log("Background: Extension installed!");
});
