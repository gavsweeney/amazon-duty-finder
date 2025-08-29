# OpenAI Integration Setup

## 🚀 **Getting Started with AI-Powered Brand Research**

### **Step 1: Get OpenAI API Key**
1. Go to [OpenAI Platform](https://platform.openai.com/api-keys)
2. Sign in or create an account
3. Click "Create new secret key"
4. Copy the API key (starts with `sk-...`)

### **Step 2: Create Environment File**
Create a `.env` file in the root directory:
```bash
# .env
OPENAI_API_KEY=sk-your_actual_api_key_here
```

### **Step 3: Test the Integration**
Run the test script:
```bash
node simple-test.js
```

## 🧪 **What the Test Does**

The test script will:
1. **Research STIHL** manufacturing locations using GPT-4o-mini
2. **Enable web search** for current information
3. **Compare results** to expected manufacturing locations
4. **Show quality score** and cost analysis
5. **Validate JSON parsing** and response structure

## 🎯 **Expected Results**

**STIHL Manufacturing Locations (from research):**
- **Germany**: Primary manufacturing (Waiblingen, etc.)
- **China**: Major production site (Qingdao)
- **Philippines**: Production facility
- **USA**: Virginia Beach facility
- **Brazil**: Production sites
- **Austria**: Production sites

## 💰 **Cost Analysis**

**GPT-4o-mini Pricing:**
- **Input tokens**: $0.15 per 1M tokens
- **Output tokens**: $0.60 per 1M tokens
- **Typical brand research**: ~$0.001 per research
- **Initial database (100 brands)**: ~$0.10
- **Annual maintenance**: ~$0.50-1.00

## 🔧 **Integration with Main System**

Once testing is successful:
1. **Replace manual brand mapping** with AI research
2. **Integrate brand research service** into worker
3. **Update origin analysis** to use AI results
4. **Implement caching** for performance

## 🚨 **Troubleshooting**

### **API Key Issues:**
```bash
❌ OPENAI_API_KEY not found in environment variables
```
**Solution**: Check `.env` file exists and API key is correct

### **Rate Limiting:**
```bash
❌ Rate limit exceeded
```
**Solution**: Wait a few minutes or check API usage limits

### **Web Search Issues:**
```bash
❌ Web search not available
```
**Solution**: Ensure using GPT-4o or GPT-4o-mini with web search enabled

## 🎉 **Next Steps**

After successful testing:
1. **Implement in main worker**
2. **Add more brands** to research
3. **Set up periodic updates**
4. **Monitor quality and costs**

## 📚 **Resources**

- [OpenAI API Documentation](https://platform.openai.com/docs)
- [GPT-4o-mini Model Details](https://platform.openai.com/docs/models/gpt-4o-mini)
- [Web Search Tool](https://platform.openai.com/docs/assistants/tools/web_search)
