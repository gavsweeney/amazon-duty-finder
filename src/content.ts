function text(sel: string) {
  return document.querySelector(sel)?.textContent?.trim() || "";
}

function scrape() {
  const asin = (document.getElementById("ASIN") as HTMLInputElement)?.value
    || (location.pathname.match(/\/dp\/([A-Z0-9]{10})/) ?? [,""])[1];

  const title = text("#productTitle");
  const brand = text("#bylineInfo");
  const breadcrumbs = [...document.querySelectorAll("#wayfinding-breadcrumbs_feature_div a")]
    .map(a => a.textContent?.trim()).filter(Boolean);
  const bullets = [...document.querySelectorAll("#feature-bullets li")]
    .map(li => li.textContent?.trim()).filter(Boolean);

  // Extract EAN/UPC information
  let ean = "";
  let upc = "";
  
  // Look for EAN/UPC in product details, bullets, or technical specifications
  const allText = `${title} ${brand} ${bullets.join(' ')} ${breadcrumbs.join(' ')}`;
  
  // EAN-13 pattern (13 digits)
  const eanMatch = allText.match(/\b(\d{13})\b/);
  if (eanMatch) {
    ean = eanMatch[1];
    console.log("Content: Found EAN:", ean);
  }
  
  // UPC-A pattern (12 digits)
  const upcMatch = allText.match(/\b(\d{12})\b/);
  if (upcMatch) {
    upc = upcMatch[1];
    console.log("Content: Found UPC:", upc);
  }
  
  // Also check for "UPC:" or "EAN:" prefixes
  const upcPrefixMatch = allText.match(/UPC[:\s]*(\d{12})/i);
  if (upcPrefixMatch && !upc) {
    upc = upcPrefixMatch[1];
    console.log("Content: Found UPC with prefix:", upc);
  }
  
  const eanPrefixMatch = allText.match(/EAN[:\s]*(\d{13})/i);
  if (eanPrefixMatch && !ean) {
    ean = eanPrefixMatch[1];
    console.log("Content: Found EAN with prefix:", ean);
  }

  // Only extract image URL if description is limited (3 words or less)
  let imageUrl = "";
  const hasLimitedDescription = (title?.split(' ').length || 0) <= 3 || (bullets?.length || 0) <= 1;
  
  if (hasLimitedDescription) {
    const imageElement = document.querySelector("#landingImage") as HTMLImageElement;
    imageUrl = imageElement?.src || imageElement?.getAttribute("data-old-hires") || "";
    console.log("Content: Limited description detected, extracted image URL:", imageUrl ? "Yes" : "No");
  }

  return { asin, title, brand, breadcrumbs, bullets, imageUrl, ean, upc, url: location.href };
}

function mount() {
  // Try multiple possible targets for better reliability
  const targets = [
    document.querySelector("#centerCol"),
    document.querySelector("#main-content"),
    document.querySelector("#dp-container"),
    document.querySelector("#productDescription"),
    document.body
  ];
  
  const target = targets.find(t => t) || document.body;
  
  // Check if duty finder already exists
  if (document.getElementById("duty-finder-root")) {
    return document.getElementById("duty-finder-root")!;
  }
  
  const el = document.createElement("div");
  el.id = "duty-finder-root";
  el.style.margin = "8px 0";
  target?.prepend(el);
  return el;
}

async function fetchDuty(product: any) {
  console.log("Content: Sending message to background script:", { type: "CLASSIFY_AND_RATE", product });
  try {
    const response = await chrome.runtime.sendMessage({ type: "CLASSIFY_AND_RATE", product });
    console.log("Content: Received response from background:", response);
    return response;
  } catch (error) {
    console.error("Content: Error sending message:", error);
    throw error;
  }
}

async function fetchOrigin(product: any) {
  console.log("Content: Sending message to background script:", { type: "GET_ORIGIN_ONLY", product });
  try {
    const response = await chrome.runtime.sendMessage({ type: "GET_ORIGIN_ONLY", product });
    console.log("Content: Received origin response from background:", response);
    return response;
  } catch (error) {
    console.error("Content: Error sending origin message:", error);
    throw error;
  }
}

function render(el: HTMLElement, data: any) {
  const conf = Math.round((data?.chosen?.confidence ?? 0) * 100);
  const hs = data?.chosen?.hs_code ?? "—";
  const ratePct = ((data?.duty_rate ?? 0) * 100).toFixed(1);
  
  // Render origin information
  let originHtml = "";
  if (data?.origin?.countries && data.origin.countries.length > 0) {
    // Build detailed country breakdown with individual confidence and reasoning
    const countriesBreakdown = data.origin.countries.map((c: any, index: number) => {
      const confidence = Math.round((c.confidence ?? 0) * 100);
      const position = index === 0 ? "Primary" : index === 1 ? "Secondary" : "Additional";
      const reasoning = c.reasoning || `${position} manufacturing location`;
      
      return `
        <div style="margin-bottom:8px; padding:8px; background:${index === 0 ? '#e8f5e8' : '#f0f8ff'}; border-radius:6px; border-left:4px solid ${index === 0 ? '#28a745' : index === 1 ? '#007bff' : '#6c757d'};">
          <div style="font-weight:600; color:${index === 0 ? '#155724' : index === 1 ? '#004085' : '#495057'};">
            ${c.country} (${confidence}% confidence)
          </div>
          <div style="font-size:0.85em; color:${index === 0 ? '#155724' : index === 1 ? '#004085' : '#495057'}; margin-top:2px;">
            ${reasoning}
          </div>
        </div>
      `;
    }).join("");
    
    const confidence = Math.round((data.origin.countries[0]?.confidence ?? 0) * 100);
    const source = data.origin.countries[0]?.sources?.[0] || "analysis";
    
    // Add EAN/UPC info if available
    let eanUpcInfo = "";
    if (data?.origin?.ean_upc_info) {
      const ean = data.origin.ean_upc_info.ean;
      const upc = data.origin.ean_upc_info.upc;
      if (ean || upc) {
        eanUpcInfo = `<div style="margin-top:4px; font-size:0.9em; color:#666;">
          ${ean ? `EAN: ${ean}` : ''} ${ean && upc ? '| ' : ''} ${upc ? `UPC: ${upc}` : ''}
        </div>`;
      }
    }
    
    // Add analysis explanation if available
    let analysisExplanation = "";
    console.log("Content: Origin data received:", data?.origin);
    console.log("Content: Analysis explanation:", data?.origin?.analysis_explanation);
    
    if (data?.origin?.analysis_explanation) {
      analysisExplanation = `<div style="margin-top:8px; padding:8px; background:#f8f9fa; border-radius:6px; font-size:0.85em; line-height:1.4; color:#555;">
        <strong>Analysis:</strong> ${data.origin.analysis_explanation}
      </div>`;
      console.log("Content: Analysis explanation HTML generated");
    } else {
      console.log("Content: No analysis explanation found");
    }
    
    originHtml = `
    <div style="margin-top:12px; padding-top:12px; border-top:1px solid #eee;">
      <div style="font-weight:600; margin-bottom:4px;">Country of Origin</div>
      ${countriesBreakdown}
      <small>Source: ${source}</small>
      ${eanUpcInfo}
      ${analysisExplanation}
    </div>`;
  }
  
  el.innerHTML = `
  <div style="font-family: system-ui; border:1px solid #ddd; border-radius:10px; padding:12px;">
    <div style="font-weight:600; margin-bottom:4px;">Estimated UK Duty</div>
    <div>HS: ${hs} (${conf}% conf.)</div>
    <div>Rate: ${ratePct}%</div>
    <small>Source: ${data?.source ?? "local table"}</small>
    ${originHtml}
  </div>`;
}

// Improved mounting with retry logic
function mountWithRetry(maxAttempts = 10, delay = 500) {
  return new Promise<HTMLElement>((resolve, reject) => {
    let attempts = 0;
    
    const tryMount = () => {
      attempts++;
      
      // Check if we're on a product page
      const product = scrape();
      if (!product.title) {
        if (attempts < maxAttempts) {
          setTimeout(tryMount, delay);
        } else {
          reject(new Error("Not a product page"));
        }
        return;
      }
      
      // Try to mount
      try {
        const root = mount();
        resolve(root);
      } catch (e) {
        if (attempts < maxAttempts) {
          setTimeout(tryMount, delay);
        } else {
          reject(e);
        }
      }
    };
    
    tryMount();
  });
}

// Main execution function with better error handling
(async () => {
  try {
    const root = await mountWithRetry();
    const product = scrape();
    
    try {
      const data = await fetchDuty(product);
      render(root, data);
    } catch (e) {
      console.error("Duty fetch error:", e);
      render(root, { duty_rate: 0, chosen: { hs_code: "—", confidence: 0 }, source: "error" });
    }
  } catch (e) {
    console.log("Duty finder: Not a product page or mounting failed");
  }
})();

// Listen for navigation changes (for SPA behavior)
let currentUrl = location.href;
const observer = new MutationObserver(() => {
  if (location.href !== currentUrl) {
    currentUrl = location.href;
    // Small delay to let the page settle
    setTimeout(() => {
      if (location.pathname.includes('/dp/')) {
        location.reload(); // Force reload for product pages
      }
    }, 1000);
  }
});

observer.observe(document, { subtree: true, childList: true });
