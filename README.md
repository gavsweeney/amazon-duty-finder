# Amazon Duty Finder

A Chrome extension that automatically calculates UK import duties for Amazon products using AI-powered HS code classification.

## 🚀 Features

- **Automatic Product Detection**: Scrapes Amazon product pages for product information
- **AI-Powered Classification**: Uses Cloudflare AI to classify products with HS codes
- **Image Recognition**: Falls back to image analysis for products with limited descriptions
- **Real-time Duty Calculation**: Instantly displays estimated UK import duties
- **Country of Origin Detection**: Identifies manufacturing countries at the brand level
- **Smart Fallbacks**: Graceful degradation when AI classification fails

## 🏗️ Architecture

```
Amazon Page → Content Script → Background Script → Cloudflare Worker → AI Models → Response → UI Display
```

### Components

- **Chrome Extension** (`src/`): Content and background scripts for page interaction
- **Cloudflare Worker** (`backend/`): AI-powered backend for classification and duty calculation
- **UI Components** (`styles/`): Styled duty information display

## 🛠️ Setup

### Prerequisites

- Node.js 18+ and pnpm
- Cloudflare account with Workers enabled
- Chrome browser

### Installation

1. **Clone the repository**
   ```bash
   git clone <your-repo-url>
   cd amazon-duty-finder
   ```

2. **Install dependencies**
   ```bash
   pnpm install
   ```

3. **Configure Cloudflare Worker**
   ```bash
   cd backend
   pnpm add -g wrangler
   wrangler login
   wrangler deploy
   ```

4. **Build the extension**
   ```bash
   pnpm exec vite build
   ```

5. **Load in Chrome**
   - Go to `chrome://extensions/`
   - Enable "Developer mode"
   - Click "Load unpacked"
   - Select the `dist` folder

## 🔧 Configuration

### Environment Variables

Create a `.env` file in the backend directory:

```env
MODEL=gpt-4o-mini
BASELINE_RATE=0.10
```

### Wrangler Configuration

The `wrangler.toml` file configures:
- Worker name and compatibility
- AI model bindings
- Environment variables

## 📖 How It Works

### 1. Product Detection
The content script automatically detects Amazon product pages and extracts:
- Product title, brand, and description
- Breadcrumb navigation
- Product images (for limited descriptions)

### 2. AI Classification
The Cloudflare Worker uses AI models to:
- Classify products with HS codes
- Analyze images when text descriptions are insufficient
- Provide confidence scores for classifications

### 3. Duty Calculation
The system:
- Matches HS codes to UK tariff tables
- Calculates applicable duty rates
- Falls back to baseline rates when needed

### 4. Country of Origin Detection
The system identifies manufacturing countries by:
- **Brand Mapping**: Uses a comprehensive database of known brand manufacturing locations
- **AI Analysis**: Falls back to AI-powered analysis for unknown brands
- **Multiple Countries**: Handles brands with production in multiple locations

### 5. UI Display
Results are displayed in a clean, informative card showing:
- HS code and confidence
- Estimated duty rate
- Country of origin with confidence
- Data source information

## 🎯 Supported Product Types

- **Toys & Games**: 0% duty (HS codes 9503, 9504, 9505, 9506)
- **Electronics**: Various rates based on classification
- **Clothing & Textiles**: Category-specific rates
- **Other Products**: Baseline rate application

## 🏭 Supported Brands for Country of Origin

### Gaming & Miniatures
- **Games Workshop** (United Kingdom)
- **Wizards of the Coast** (United States, China)
- **Fantasy Flight Games** (United States, China)
- **CMON** (China, United States)
- **Privateer Press** (United States, China)

### Model Kits & Hobbies
- **LEGO** (Denmark, Czech Republic, Hungary, Mexico, China)
- **Bandai** (Japan, China)
- **Tamiya** (Japan, China)
- **Revell** (Germany, Czech Republic, China)
- **Airfix** (United Kingdom, India)

### Board Games
- **Asmodee** (France, China, United States)
- **Rio Grande** (United States, Germany)
- **Mayfair** (United States, Germany)
- **Stonemaier** (United States, China)

### Collectibles
- **Funko** (United States, China)
- **McFarlane** (United States, China)
- **Hot Toys** (Hong Kong, China)
- **Prime 1 Studio** (Japan, China)

*For brands not in our database, the system uses AI analysis to determine likely manufacturing countries.*

## 🔍 Debugging

### Extension Logs
Check browser console for content script and background script logs.

### Worker Logs
```bash
cd backend
wrangler tail
```

### Common Issues

1. **"Failed to fetch duty information"**: Check Worker deployment and API endpoints
2. **"Invalid host wildcard"**: Verify manifest permissions for Amazon domains
3. **"No such model"**: Ensure Cloudflare AI bindings are configured correctly

## 🚀 Development

### Adding New Features

1. **New Product Categories**: Add HS codes to the tariff table in `worker.ts`
2. **New Brands**: Add brand-to-country mappings in `worker.ts`
3. **UI Enhancements**: Modify `inject.css` and `content.ts`
4. **AI Improvements**: Update system prompts in `worker.ts`

### API Endpoints

The Cloudflare Worker provides these endpoints:
- **`/classify`**: AI-powered HS code classification
- **`/rate`**: Duty rate calculation using HS codes
- **`/origin`**: Country of origin detection (brand mapping + AI fallback)

### Testing

1. **Build and reload** the extension
2. **Test on various Amazon products**
3. **Monitor Worker logs** for errors
4. **Verify duty calculations** against official sources

## 📝 License

This project is for educational and personal use. Please ensure compliance with Amazon's terms of service and applicable regulations.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📞 Support

For issues and questions:
1. Check the debugging section above
2. Review Worker logs for errors
3. Verify configuration settings
4. Check browser console for extension errors

---

**Built with ❤️ using Chrome Extensions, Cloudflare Workers, and AI**
