/**
 * AI Service - Gemini API Integration for Smart Data Extraction
 * Extracts product/customer data from Excel files using Google Gemini
 */

import { Product, Customer } from '../types';

const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent';

// Storage key for API key
const GEMINI_API_KEY_STORAGE = 'gemini_api_key';

export const AIService = {
    // Get stored API key
    getApiKey: (): string | null => {
        return localStorage.getItem(GEMINI_API_KEY_STORAGE);
    },

    // Save API key
    setApiKey: (key: string): void => {
        localStorage.setItem(GEMINI_API_KEY_STORAGE, key);
    },

    // Remove API key
    removeApiKey: (): void => {
        localStorage.removeItem(GEMINI_API_KEY_STORAGE);
    },

    // Check if API key is configured
    isConfigured: (): boolean => {
        const key = AIService.getApiKey();
        return !!(key && key.length > 10);
    },

    /**
     * Extract products and customers from Excel file content
     * @param fileContent - Base64 encoded file content or text content
     * @param fileName - Name of the file for context
     */
    extractFromExcel: async (
        fileContent: string,
        fileName: string
    ): Promise<{ products: Product[]; customers: Customer[]; rawResponse?: string }> => {
        const apiKey = AIService.getApiKey();

        if (!apiKey) {
            throw new Error('Gemini API key not configured. Please add it in Settings.');
        }

        const prompt = `You are a data extraction expert. Analyze this Excel/CSV data and extract:

1. **Products**: Items with name, price, quantity/stock, category, HSN code, GST rate
2. **Customers**: People/companies with name, company, email, phone, address, state, GSTIN

Return ONLY valid JSON in this exact format (no markdown, no explanation):
{
  "products": [
    {"name": "Product Name", "price": 100, "stock": 10, "category": "General", "hsn": "", "gstRate": 0}
  ],
  "customers": [
    {"name": "Customer Name", "company": "Company", "email": "", "phone": "", "address": "", "state": "", "gstin": ""}
  ]
}

Rules:
- If a field is missing, use empty string "" for text or 0 for numbers
- Price and stock must be numbers
- If no products found, return empty array []
- If no customers found, return empty array []
- Be flexible with column names (e.g., "Item Name" = "Product Name", "Rate" = "Price", "Qty" = "Stock")

Excel Data:
${fileContent}`;

        try {
            const response = await fetch(`${GEMINI_API_URL}?key=${apiKey}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    contents: [{
                        parts: [{ text: prompt }]
                    }],
                    generationConfig: {
                        temperature: 0.1,
                        maxOutputTokens: 8192,
                    }
                })
            });

            if (!response.ok) {
                const errorData = await response.json();
                if (response.status === 400 && errorData.error?.message?.includes('API key')) {
                    throw new Error('Invalid API key. Please check your Gemini API key in Settings.');
                }
                throw new Error(errorData.error?.message || 'API request failed');
            }

            const data = await response.json();
            const textContent = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

            console.log('Gemini raw response:', textContent);

            // Extract JSON from response (handle markdown code blocks)
            let jsonStr = textContent;
            const jsonMatch = textContent.match(/```json\s*([\s\S]*?)\s*```/) ||
                textContent.match(/```\s*([\s\S]*?)\s*```/) ||
                textContent.match(/\{[\s\S]*\}/);

            if (jsonMatch) {
                jsonStr = jsonMatch[1] || jsonMatch[0];
            }

            // Parse JSON
            const parsed = JSON.parse(jsonStr.trim());

            // Transform to proper types
            const products: Product[] = (parsed.products || []).map((p: any) => ({
                id: Math.random().toString(36).substr(2, 9),
                name: String(p.name || ''),
                price: Number(p.price) || 0,
                stock: Number(p.stock) || 1,
                category: String(p.category || 'General'),
                hsn: String(p.hsn || ''),
                gstRate: Number(p.gstRate) || 0
            })).filter((p: Product) => p.name);

            const customers: Customer[] = (parsed.customers || []).map((c: any) => ({
                id: Math.random().toString(36).substr(2, 9),
                name: String(c.name || ''),
                company: String(c.company || ''),
                email: String(c.email || ''),
                phone: String(c.phone || ''),
                address: String(c.address || ''),
                state: String(c.state || ''),
                gstin: String(c.gstin || ''),
                balance: 0,
                notifications: []
            })).filter((c: Customer) => c.name);

            return { products, customers, rawResponse: textContent };

        } catch (error: any) {
            console.error('Gemini extraction error:', error);

            if (error.message?.includes('API key')) {
                throw error;
            }

            if (error instanceof SyntaxError) {
                throw new Error('AI response was not valid JSON. Please try again.');
            }

            throw new Error(error.message || 'Failed to extract data. Please try again.');
        }
    },

    /**
     * Convert Excel file to text format for Gemini
     */
    excelToText: async (file: File): Promise<string> => {
        const XLSX = await import('xlsx');

        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const data = new Uint8Array(e.target?.result as ArrayBuffer);
                    const workbook = XLSX.read(data, { type: 'array' });

                    let textContent = '';

                    // Convert all sheets to text
                    workbook.SheetNames.forEach(sheetName => {
                        const sheet = workbook.Sheets[sheetName];
                        const csv = XLSX.utils.sheet_to_csv(sheet);
                        textContent += `\n=== Sheet: ${sheetName} ===\n${csv}\n`;
                    });

                    resolve(textContent);
                } catch (error) {
                    reject(new Error('Failed to read Excel file'));
                }
            };
            reader.onerror = () => reject(new Error('Failed to read file'));
            reader.readAsArrayBuffer(file);
        });
    }
};
