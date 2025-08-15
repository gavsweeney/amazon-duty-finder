import { defineManifest } from "@crxjs/vite-plugin";

export default defineManifest({
  manifest_version: 3,
  name: "Amazon Duty Finder",
  version: "0.1.0",
  permissions: ["storage"],
  host_permissions: ["https://www.amazon.com/*", "https://smile.amazon.com/*", "https://www.amazon.co.uk/*", "https://smile.amazon.co.uk/*"],
  background: { service_worker: "src/background.ts", type: "module" },
  content_scripts: [
    {
      matches: ["https://www.amazon.com/*", "https://smile.amazon.com/*", "https://www.amazon.co.uk/*", "https://smile.amazon.co.uk/*"],
      js: ["src/content.ts"],
      run_at: "document_idle"
    }
  ],
  action: { default_title: "Duty Finder" },
  web_accessible_resources: [{ resources: ["styles/inject.css"], matches: ["<all_urls>"] }]
});
