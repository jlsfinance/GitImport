import React, { useState } from 'react';
import { Upload, AlertCircle, CheckCircle, Loader2, Eye, EyeOff } from 'lucide-react';
import { StorageService } from '../services/storageService';
import { Customer, InvoiceItem } from '../types';
import Tesseract from 'tesseract.js';
import * as pdfjsLib from 'pdfjs-dist';

interface RecognizeBillProps {
  onClose: () => void;
  onExtract: (data: {items: InvoiceItem[], customers: Customer[]}) => void;
}

const RecognizeBill: React.FC<RecognizeBillProps> = ({ onClose, onExtract }) => {
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<{type: 'idle' | 'success' | 'error', message: string}>({type: 'idle', message: ''});
  const [extractedText, setExtractedText] = useState('');
  const [showRawText, setShowRawText] = useState(false);
  const [recognizedData, setRecognizedData] = useState<{items: InvoiceItem[], customers: Customer[]} | null>(null);

  pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

  const extractTextFromPDF = async (file: File) => {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({data: arrayBuffer}).promise;
    let fullText = '';
    
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const pageText = textContent.items.map((item: any) => item.str).join(' ');
      fullText += pageText + '\n';
    }
    
    return fullText;
  };

  const extractTextFromImage = async (file: File) => {
    return new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const { data: { text } } = await Tesseract.recognize(e.target?.result as string, 'eng');
          resolve(text);
        } catch (error) {
          reject(error);
        }
      };
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsDataURL(file);
    });
  };

  const parseInvoiceWithAI = async (text: string) => {
    try {
      setStatus({type: 'idle', message: 'Using AI to understand bill format...'});
      
      // Call backend API to use Gemini for parsing
      const response = await fetch('/api/parse-bill', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ billText: text })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to parse bill with AI');
      }

      const parsedData = await response.json();
      
      // Validate and transform the response
      const items = (parsedData.items || []).map((item: any) => ({
        productId: '',
        description: item.name || item.description || 'Item',
        quantity: parseFloat(item.quantity) || 1,
        rate: parseFloat(item.rate) || parseFloat(item.price) || 0,
        baseAmount: parseFloat(item.baseAmount) || (parseFloat(item.quantity) * parseFloat(item.rate)) || 0,
        hsn: item.hsn || '',
        gstRate: parseFloat(item.gstRate) || parseFloat(item.gst) || 0,
        cgstAmount: 0,
        sgstAmount: 0,
        igstAmount: 0,
        totalAmount: parseFloat(item.totalAmount) || (parseFloat(item.quantity) * parseFloat(item.rate)) || 0
      }));

      const customers = [{
        id: Math.random().toString(36).substr(2, 9),
        name: parsedData.customerName || parsedData.vendorName || 'Recognized Customer',
        company: parsedData.company || '',
        email: parsedData.email || '',
        phone: parsedData.phone || '',
        address: parsedData.address || '',
        state: parsedData.state || '',
        gstin: parsedData.gstin || parsedData.gstNumber || '',
        balance: 0,
        notifications: []
      }];

      return { items, customers };
    } catch (error) {
      // Fallback to basic parsing if AI fails
      console.log('AI parsing failed, using fallback regex...');
      return parseInvoiceTextBasic(text);
    }
  };

  const parseInvoiceTextBasic = (text: string) => {
    const items: InvoiceItem[] = [];
    const customers: Customer[] = [];

    // Extract customer name
    const billToMatch = text.match(/(?:Bill\s+To|Customer|Billed\s+To|Vendor|TO:?|From:?)\s*([^\n]+)/i);
    const customerName = billToMatch?.[1]?.trim() || 'Recognized Customer';
    
    // Extract GSTIN
    const gstinMatch = text.match(/(?:GSTIN|GST\s+(?:IN|No)|GSTNO)?[\s:]*([0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[A-Z0-9]{1}[Z]{1}[0-9]{1})/i);
    const gstin = gstinMatch?.[1]?.trim() || '';

    // Try multiple patterns for items
    const patterns = [
      /([A-Za-z\s]+?)\s+(\d+(?:\.\d+)?)\s*(?:x|@|\*)\s*(?:₹?)?\s*(\d+(?:\.\d+)?)\s*(?:=)?[\s₹]*(\d+(?:\.\d+)?)?/gi,
      /([A-Za-z\s]+?)\s+Qty:?\s*(\d+)\s+(?:@|Rs|₹)?\s*(\d+(?:\.\d+)?)\s*(?:=|Total)?[\s₹]*(\d+(?:\.\d+)?)?/gi,
      /([A-Za-z\s]+)\s+(\d+)\s+(\d+(?:\.\d+)?)\s+(\d+(?:\.\d+)?)/g
    ];

    for (const pattern of patterns) {
      let match;
      while ((match = pattern.exec(text)) !== null) {
        if (match[1].length > 2 && match[1].length < 60 && !match[1].match(/total|amount|gst|tax/i)) {
          const gstMatch = text.match(/(\d+(?:\.\d+)?)[\s%]*(?:GST|CGST|SGST|IGST)/i);
          items.push({
            productId: '',
            description: match[1].trim(),
            quantity: parseFloat(match[2]),
            rate: parseFloat(match[3]),
            baseAmount: parseFloat(match[3]) * parseFloat(match[2]),
            gstRate: gstMatch ? parseFloat(gstMatch[1]) : 0,
            cgstAmount: 0,
            sgstAmount: 0,
            igstAmount: 0,
            totalAmount: parseFloat(match[4]) || (parseFloat(match[3]) * parseFloat(match[2]))
          });
        }
      }
      if (items.length > 0) break;
    }

    customers.push({
      id: Math.random().toString(36).substr(2, 9),
      name: customerName,
      company: '',
      email: '',
      phone: '',
      address: '',
      state: '',
      gstin: gstin,
      balance: 0,
      notifications: []
    });

    return { items, customers };
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    setStatus({type: 'idle', message: ''});

    try {
      let text = '';

      if (file.type === 'application/pdf') {
        setStatus({type: 'idle', message: 'Extracting text from PDF...'});
        text = await extractTextFromPDF(file);
      } else if (file.type.startsWith('image/')) {
        setStatus({type: 'idle', message: 'Running OCR on image (this may take a moment)...'});
        text = await extractTextFromImage(file);
      } else if (file.name.endsWith('.xml')) {
        text = await file.text();
      } else {
        throw new Error('Unsupported file type. Use PDF, image, or XML.');
      }

      setExtractedText(text);
      const parsed = await parseInvoiceWithAI(text);
      setRecognizedData(parsed);

      setStatus({
        type: 'success',
        message: `Successfully recognized! Found ${parsed.items.length} items and ${parsed.customers.length} customer(s).`
      });
    } catch (error) {
      setStatus({
        type: 'error',
        message: (error as Error).message || 'Failed to recognize bill. Please try again.'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = () => {
    if (recognizedData) {
      onExtract(recognizedData);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6">
        <h2 className="text-xl font-bold text-slate-900 mb-4">Recognize Bill from Photo/PDF</h2>
        
        <div className="space-y-4">
          {/* File Upload Area */}
          {!extractedText && (
            <div className="border-2 border-dashed border-blue-200 rounded-lg p-6 text-center hover:bg-blue-50 transition-colors">
              <label className="cursor-pointer flex flex-col items-center gap-2">
                <Upload className="w-8 h-8 text-blue-500" />
                <span className="text-sm font-medium text-slate-700">
                  Drop or click to upload bill
                </span>
                <span className="text-xs text-slate-500">
                  Photo (.jpg, .png), PDF, or XML
                </span>
                <input
                  type="file"
                  accept="image/*,.pdf,.xml"
                  onChange={handleFileUpload}
                  disabled={loading}
                  className="hidden"
                  data-testid="file-input-recognize"
                />
              </label>
            </div>
          )}

          {/* Status Messages */}
          {status.type === 'success' && recognizedData && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex gap-3">
              <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-green-900">{status.message}</p>
                <p className="text-xs text-green-700 mt-1">Review the extracted data below</p>
              </div>
            </div>
          )}

          {status.type === 'error' && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
              <p className="text-sm font-medium text-red-900">{status.message}</p>
            </div>
          )}

          {loading && (
            <div className="flex items-center justify-center gap-2 py-4">
              <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />
              <span className="text-sm text-slate-600">{status.message || 'Processing...'}</span>
            </div>
          )}

          {/* Extracted Data Preview */}
          {recognizedData && (
            <div className="space-y-4">
              {/* Customer Info */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h3 className="font-semibold text-slate-900 mb-2">Customer Details</h3>
                {recognizedData.customers.map((customer, idx) => (
                  <div key={idx} className="space-y-1">
                    <p className="text-sm"><span className="font-medium">Name:</span> {customer.name}</p>
                    {customer.gstin && <p className="text-sm"><span className="font-medium">GSTIN:</span> {customer.gstin}</p>}
                  </div>
                ))}
              </div>

              {/* Items Preview */}
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                <h3 className="font-semibold text-slate-900 mb-2">Recognized Items ({recognizedData.items.length})</h3>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {recognizedData.items.map((item, idx) => (
                    <div key={idx} className="text-sm bg-white p-2 rounded border border-amber-100">
                      <p><span className="font-medium">{item.description}</span></p>
                      <p className="text-slate-600">Qty: {item.quantity} × ₹{item.rate.toFixed(2)} = ₹{item.totalAmount.toFixed(2)}</p>
                      {item.gstRate > 0 && <p className="text-slate-500 text-xs">GST: {item.gstRate}%</p>}
                    </div>
                  ))}
                </div>
              </div>

              {/* Raw Text Viewer */}
              <button
                onClick={() => setShowRawText(!showRawText)}
                className="flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900"
              >
                {showRawText ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                {showRawText ? 'Hide' : 'View'} Raw Extracted Text
              </button>

              {showRawText && (
                <div className="bg-slate-100 rounded-lg p-3 text-xs font-mono max-h-40 overflow-y-auto whitespace-pre-wrap break-words">
                  {extractedText.substring(0, 1000)}...
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex gap-3 mt-6">
          <button
            onClick={onClose}
            disabled={loading}
            className="flex-1 px-4 py-2 border border-slate-300 rounded-md text-slate-700 hover:bg-slate-50 font-medium transition-colors disabled:opacity-50"
            data-testid="button-cancel-recognize"
          >
            Cancel
          </button>
          {recognizedData && (
            <button
              onClick={handleConfirm}
              disabled={loading}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 font-medium transition-colors disabled:opacity-50"
              data-testid="button-confirm-recognize"
            >
              Add to Invoice
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default RecognizeBill;
