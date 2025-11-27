import { Router, Request, Response } from 'express';
import { db } from '@/lib/db';
import { GoogleGenerativeAI } from '@google/genai';

const router = Router();

// Initialize Gemini API
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY || '');

// Parse bill using Gemini AI
router.post('/parse-bill', async (req: Request, res: Response) => {
  try {
    const { billText } = req.body;
    
    if (!billText) {
      return res.status(400).json({ error: 'Bill text is required' });
    }

    if (!process.env.GOOGLE_AI_API_KEY) {
      console.warn('GOOGLE_AI_API_KEY not set, using basic parsing');
      return res.json({ items: [], customerName: 'Unknown', error: 'API key not configured' });
    }

    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

    const prompt = `You are an invoice/bill parser AI. Extract all information from this bill text and return ONLY valid JSON (no markdown, no code blocks, just raw JSON).

Bill text:
${billText}

Extract and return JSON with this structure (return ONLY the JSON object, nothing else):
{
  "customerName": "string - customer or vendor name",
  "company": "string - company name if different from customer",
  "email": "string - email if present",
  "phone": "string - phone number if present",
  "address": "string - address if present",
  "state": "string - state if present",
  "gstin": "string - GSTIN/GST number if present",
  "items": [
    {
      "name": "string - product/item name",
      "description": "string - any additional description",
      "quantity": "number - quantity",
      "rate": "number - unit rate",
      "price": "number - alternative field for rate",
      "baseAmount": "number - quantity * rate",
      "gstRate": "number - GST rate percentage",
      "gst": "number - alternative field for gstRate",
      "totalAmount": "number - final amount after GST",
      "hsn": "string - HSN code if present"
    }
  ]
}

Rules:
- Extract ALL items from the bill, no matter the format
- Be flexible with column names (might be "Name", "Item", "Product", etc.)
- Handle different quantity formats (Qty, Quantity, Nos, etc.)
- Handle different price formats (Rate, Price, Cost, Amount, etc.)
- If line items aren't clearly separated, group similar items
- Convert all numbers to proper numeric format
- Return empty arrays/strings if information isn't found
- ONLY return JSON, nothing else`;

    const result = await model.generateContent(prompt);
    const responseText = result.response.text();
    
    // Clean up the response - remove markdown code blocks if present
    let jsonText = responseText.trim();
    if (jsonText.startsWith('```json')) {
      jsonText = jsonText.replace(/^```json\n/, '').replace(/\n```$/, '');
    } else if (jsonText.startsWith('```')) {
      jsonText = jsonText.replace(/^```\n/, '').replace(/\n```$/, '');
    }

    const parsedData = JSON.parse(jsonText);
    return res.json(parsedData);
  } catch (error: any) {
    console.error('Error parsing bill:', error);
    return res.status(500).json({ 
      error: error.message || 'Failed to parse bill',
      items: [],
      customerName: 'Unknown'
    });
  }
});

export default router;
