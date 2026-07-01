import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

// Increase request size limits for handling large files/text
app.use(express.json({ limit: "15mb" }));
app.use(express.urlencoded({ limit: "15mb", extended: true }));

// Initialize GoogleGenAI client lazily to fail gracefully if API key is missing
let aiClient: GoogleGenAI | null = null;

function getAiClient(): GoogleGenAI {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY is not defined in the environment secrets. Please configure it in Settings > Secrets.");
    }
    aiClient = new GoogleGenAI({
      apiKey: apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }
  return aiClient;
}

// Robust helper to execute Gemini API calls with retries, exponential backoff, and fallback models
async function generateContentWithRetry(
  ai: GoogleGenAI,
  options: any,
  maxRetries = 3,
  delayMs = 1500
): Promise<any> {
  const modelsToTry = [
    options.model || "gemini-3.5-flash",
    "gemini-2.5-flash",
    "gemini-1.5-flash"
  ];
  
  // Remove duplicates while preserving order
  const uniqueModels = Array.from(new Set(modelsToTry));
  
  let lastError: any = null;
  
  for (const modelName of uniqueModels) {
    let attempt = 0;
    let currentDelay = delayMs;
    console.log(`[Gemini API] Attempting generation with model: ${modelName}`);
    
    while (attempt < maxRetries) {
      try {
        const currentOptions = { ...options, model: modelName };
        return await ai.models.generateContent(currentOptions);
      } catch (error: any) {
        attempt++;
        lastError = error;
        const errorMessage = error?.message || "";
        const errorStatus = error?.status || error?.code || (error?.error ? error.error.code : undefined);
        const isTransient =
          errorStatus === 503 ||
          errorStatus === 429 ||
          errorMessage.includes("503") ||
          errorMessage.includes("UNAVAILABLE") ||
          errorMessage.includes("429") ||
          errorMessage.includes("ResourceExhausted") ||
          errorMessage.includes("high demand") ||
          errorMessage.includes("rate limit") ||
          errorMessage.includes("temporary");

        if (isTransient && attempt < maxRetries) {
          console.warn(`[Gemini API] Model ${modelName} call failed with transient error (attempt ${attempt}/${maxRetries}). Retrying in ${currentDelay}ms... Error:`, errorMessage);
          await new Promise((resolve) => setTimeout(resolve, currentDelay));
          currentDelay *= 2; // exponential backoff
          continue;
        }
        
        // Non-transient error or exhausted retries for this model
        break;
      }
    }
    
    console.warn(`[Gemini API] Model ${modelName} failed or exhausted retries. Moving to next fallback model if available.`);
  }
  
  throw lastError || new Error("Failed to generate content with any available Gemini models.");
}

// API Health Check
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", message: "Bank Statement Analyzer API is active" });
});

// API Endpoint to analyze bank statement using Gemini
app.post("/api/analyze", async (req, res) => {
  try {
    const { fileType, fileContent, originalFileName } = req.body;

    if (!fileType || !fileContent) {
      return res.status(400).json({ error: "Missing fileType or fileContent in request body." });
    }

    let ai;
    try {
      ai = getAiClient();
    } catch (keyError: any) {
      return res.status(500).json({ error: keyError.message });
    }

    const categoriesString = [
      "Groceries",
      "Dining & Cafes",
      "Housing & Rent",
      "Utilities",
      "Shopping & Retail",
      "Transport & Fuel",
      "Salary & Income",
      "Health & Medical",
      "Entertainment & Leisure",
      "Subscriptions & Bills",
      "Transfer & Savings",
      "Education",
      "Others"
    ].join(", ");

    const systemInstruction = `You are an expert financial statement parsing and categorization engine.
Your goal is to parse raw bank statement data (MT940, CSV rows, or JSON tables from Excel) and output a highly accurate JSON list of transactions and general financial insights.

Currency Guideline: All parsed financial transactions and visual insights are formatted in Omani Rial (abbreviated as OMR or ر.ع.). Ensure insights mention Rial Omani or ر.ع. with 3 decimal precision.

Rules for Transaction parsing & normalization:
1. Transaction ID: Generate a unique ID for each transaction (e.g., tx_1, tx_2) if not present.
2. Date: Parse the transaction date and return in YYYY-MM-DD format.
3. Amount: Standardize to a decimal number.
   - For MT940, Debit (D) MUST be represented as a negative number (e.g., -45.20) and Credit (C) as a positive number (e.g., 1200.00). Note that MT940 uses commas as decimal separators (e.g., 50,00 is 50.00).
   - For CSV/Excel, identify debit/expense columns (which should be negative) and credit/income columns (which should be positive). Ensure expenses are negative and income is positive.
4. Description: Extract the original description.
5. Clean Description: Generate a clean, human-readable vendor name or counterparty, stripped of transaction codes, dates, card numbers, and raw bank codes. E.g., "REWE INHABER S. SCHMID" -> "Rewe Supermarket", "AMZN MKTPLACE PMTS WWW.AMAZON.DE" -> "Amazon", "UBER *TRIP HELP.UBER.COM" -> "Uber".
6. Category: You MUST categorize each transaction into EXACTLY ONE of the following:
   - "Groceries" (Supermarkets, food stores, Lidl, Aldi, Tesco, Walmart, Rewe, Albert Heijn)
   - "Dining & Cafes" (Restaurants, bars, coffee shops, Starbucks, fast food, food delivery)
   - "Housing & Rent" (Rent payments, mortgage, landlord transfers, property management fees)
   - "Utilities" (Electricity, water, gas, heating, broadband, mobile bills, Comcast, PG&E)
   - "Shopping & Retail" (Clothing, electronics, home improvement, general shopping, Amazon, IKEA, Zara)
   - "Transport & Fuel" (Gas stations, fuel, public transit, train tickets, Uber/Lyft, parking, car maintenance)
   - "Salary & Income" (Salary, wages, payroll, freelancer payouts, interest received, dividends)
   - "Health & Medical" (Pharmacies, doctors, dentists, health insurance premiums, hospitals)
   - "Entertainment & Leisure" (Movies, concerts, gaming, steam, parks, gyms, hobbies)
   - "Subscriptions & Bills" (Netflix, Spotify, Apple, Adobe, SaaS memberships, regular monthly charges)
   - "Transfer & Savings" (Transfers between accounts, investment deposits, savings goals)
   - "Education" (Tuition, courses, books, university fees)
   - "Others" (Cash withdrawals, insurance, bank fees, unidentified transfers)
7. Counterparty: Cleanly identify the counterparty/recipient/sender name if possible.
8. Confidence: Assign a categorization confidence score between 0.0 and 1.0.
9. Recurring: Set \`isRecurring\` to true if the transaction is likely a recurring subscription, rent, or bill.

Rules for Financial Insights:
Generate 3 to 5 actionable, deeply analytical financial insights based on the transactions. Use OMR (ر.ع.) as the currency symbol with 3 decimal places in the descriptions.
Categories:
- "warning": for areas of high spending, leakage, or potential budgeting issues.
- "success": for good savings rates, low spending on discretionary categories, or consistent income.
- "info": generic observations about transaction counts, frequency, or large outlier transactions.
- "opportunity": suggestions for savings or optimization (e.g., canceling a dormant subscription).

Adhere strictly to the JSON output format matching the responseSchema. Do not return any text before or after the JSON.`;

    let fileSnippet = fileContent;
    if (fileType === "csv" || fileType === "mt940") {
      // Limit size of content to process safely in a single prompt if it's exceptionally huge,
      // but let's send up to 300KB which covers most personal statements easily
      if (fileContent.length > 300000) {
        fileSnippet = fileContent.substring(0, 300000) + "\n... [TRUNCATED DUE TO SIZE] ...";
      }
    } else if (fileType === "excel") {
      // For Excel, fileContent is already parsed JSON rows. We can stringify and limit if needed
      const stringified = JSON.stringify(fileContent);
      if (stringified.length > 300000) {
        fileSnippet = JSON.stringify(fileContent.slice(0, 1000)); // limit to first 1000 rows
      }
    }

    const prompt = `Analyze this ${fileType} bank statement file.
Original File Name: ${originalFileName || "unknown"}
Content:
${typeof fileSnippet === "string" ? fileSnippet : JSON.stringify(fileSnippet)}

Please return the parsed transactions and comprehensive visual financial insights based on this data.`;

    const response = await generateContentWithRetry(ai, {
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        systemInstruction: systemInstruction,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            transactions: {
              type: Type.ARRAY,
              description: "The list of parsed and categorized transactions.",
              items: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.STRING },
                  date: { type: Type.STRING, description: "YYYY-MM-DD format" },
                  amount: { type: Type.NUMBER, description: "Decimal value. Negative for debit (expense), positive for credit (income)" },
                  description: { type: Type.STRING, description: "Original unmodified text" },
                  cleanDescription: { type: Type.STRING, description: "Aesthetic, shortened vendor/payee name" },
                  category: { type: Type.STRING, description: "Strictly one of the allowed categories list" },
                  type: { type: Type.STRING, description: "Must be 'credit' or 'debit'" },
                  counterparty: { type: Type.STRING },
                  reference: { type: Type.STRING },
                  confidence: { type: Type.NUMBER },
                  isRecurring: { type: Type.BOOLEAN, description: "True if the transaction appears to be a recurring subscription, bill, or scheduled payment" }
                },
                required: ["id", "date", "amount", "description", "cleanDescription", "category", "type"]
              }
            },
            insights: {
              type: Type.ARRAY,
              description: "Actionable financial observations and budgeting warnings/successes.",
              items: {
                type: Type.OBJECT,
                properties: {
                  title: { type: Type.STRING },
                  description: { type: Type.STRING },
                  type: { type: Type.STRING, description: "warning, success, info, or opportunity" }
                },
                required: ["title", "description", "type"]
              }
            }
          },
          required: ["transactions", "insights"]
        }
      }
    });

    const resultText = response.text;
    if (!resultText) {
      throw new Error("Received empty response from Gemini API.");
    }

    const resultJson = JSON.parse(resultText.trim());
    res.json(resultJson);

  } catch (error: any) {
    console.error("Error analyzing statement:", error);
    res.status(500).json({
      error: "An error occurred during statement analysis.",
      details: error.message || error
    });
  }
});

// API Endpoint for Conversational Financial Chatbot
app.post("/api/chat", async (req, res) => {
  try {
    const { message, transactions, chatHistory } = req.body;

    if (!message || !transactions) {
      return res.status(400).json({ error: "Missing message or transactions in request body." });
    }

    let ai;
    try {
      ai = getAiClient();
    } catch (keyError: any) {
      return res.status(500).json({ error: keyError.message });
    }

    // Format transactions cleanly to save tokens, only keep key properties
    const truncatedTransactions = transactions.map((t: any) => ({
      date: t.date,
      payee: t.cleanDescription || t.description,
      amount: t.amount,
      category: t.category,
      isSplit: t.isSplit,
      splits: t.isSplit ? t.splits : undefined
    }));

    const systemInstruction = `You are a supportive, friendly financial co-pilot and personal budgeting advisor.
You have access to the user's parsed bank statement transactions.
Answer questions about their spending, income, cash flow, recurring bills, or tips to save money.

Here is the current transaction ledger:
${JSON.stringify(truncatedTransactions)}

Rules for conversation:
1. Always be objective, accurate, and speak with a professional, encouraging tone.
2. If the user asks about calculations (e.g. total spend on Groceries, average expense), calculate them precisely based on the transactions provided.
3. Keep answers relatively concise and highly structured (use bold text and bullet points for readability).
4. Do not speculate on missing details; ask clarifying questions if needed.
5. Provide actionable budgeting suggestions based on the trends you see.
6. Currency Guideline: Always express financial values and recommendations in Omani Rial (using abbreviated OMR or ر.ع.). Ensure you format values with 3 decimal places (e.g., 5.450 ر.ع. or 12.300 OMR).`;

    // Reconstruct the history
    const contents = [];
    if (chatHistory && Array.isArray(chatHistory)) {
      for (const turn of chatHistory) {
        contents.push({
          role: turn.role === "user" ? "user" : "model",
          parts: [{ text: turn.text }]
        });
      }
    }
    
    // Add current user message
    contents.push({
      role: "user",
      parts: [{ text: message }]
    });

    const response = await generateContentWithRetry(ai, {
      model: "gemini-3.5-flash",
      contents: contents,
      config: {
        systemInstruction: systemInstruction,
      }
    });

    const reply = response.text || "I was unable to formulate a response. Please try again.";
    res.json({ reply });

  } catch (error: any) {
    console.error("Error in financial chatbot:", error);
    res.status(500).json({
      error: "An error occurred during conversational chat.",
      details: error.message || error
    });
  }
});

// Start server
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
  });
}

startServer();
