import React, { useState } from 'react';
import { Upload, AlertCircle, CheckCircle, Loader2, Download } from 'lucide-react';
import { StorageService } from '../services/storageService';
import { Product, Customer } from '../types';
import { useCompany } from '@/contexts/CompanyContext';
import * as XLSX from 'xlsx';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Capacitor } from '@capacitor/core';

interface ImportProps {
  onClose: () => void;
  onImportComplete: () => void;
}

const Import: React.FC<ImportProps> = ({ onClose, onImportComplete }) => {
  const { company } = useCompany();
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<{ type: 'idle' | 'success' | 'error', message: string }>({ type: 'idle', message: '' });
  const [importStats, setImportStats] = useState({ products: 0, customers: 0 });

  const parseExcelFile = async (file: File): Promise<{ products: Product[], customers: Customer[] }> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: 'array' });
          const result = { products: [] as Product[], customers: [] as Customer[] };

          // Helper to get value from row by multiple possible keys (case insensitive)
          const getValue = (row: any, ...keys: string[]): string => {
            for (const key of keys) {
              // Try exact match first
              if (row[key] !== undefined) return String(row[key]);
              // Try case-insensitive match
              const lowerKey = key.toLowerCase();
              const foundKey = Object.keys(row).find(k => k.toLowerCase() === lowerKey);
              if (foundKey && row[foundKey] !== undefined) return String(row[foundKey]);
            }
            return '';
          };

          const getNumber = (row: any, ...keys: string[]): number => {
            const val = getValue(row, ...keys);
            return parseFloat(val) || 0;
          };

          // Parse Products sheet (try multiple sheet name variations)
          const productSheetName = workbook.SheetNames.find(name =>
            name.toLowerCase().includes('product') || name.toLowerCase() === 'items' || name.toLowerCase() === 'inventory'
          );

          if (productSheetName) {
            const productSheet = XLSX.utils.sheet_to_json(workbook.Sheets[productSheetName]);
            console.log('Parsing products from sheet:', productSheetName, 'Rows:', productSheet.length);

            result.products = productSheet
              .filter((row: any) => getValue(row, 'Product Name', 'Name', 'Item Name', 'ProductName', 'Item'))
              .map((row: any) => ({
                id: Math.random().toString(36).substr(2, 9),
                name: getValue(row, 'Product Name', 'Name', 'Item Name', 'ProductName', 'Item'),
                price: getNumber(row, 'Price', 'Rate', 'MRP', 'Sale Price', 'Selling Price'),
                stock: getNumber(row, 'Stock', 'Quantity', 'Qty', 'Opening Stock') || 1,
                category: getValue(row, 'Category', 'Group', 'Type') || 'General',
                hsn: company?.gst_enabled ? getValue(row, 'HSN', 'HSN Code', 'HSNCode') : '',
                gstRate: company?.gst_enabled ? getNumber(row, 'GST Rate', 'GST', 'GSTRATE', 'Tax Rate', 'GST%') : 0
              }));
          }

          // Parse Customers sheet (try multiple sheet name variations)
          const customerSheetName = workbook.SheetNames.find(name =>
            name.toLowerCase().includes('customer') || name.toLowerCase() === 'parties' || name.toLowerCase() === 'ledger'
          );

          if (customerSheetName) {
            const customerSheet = XLSX.utils.sheet_to_json(workbook.Sheets[customerSheetName]);
            console.log('Parsing customers from sheet:', customerSheetName, 'Rows:', customerSheet.length);

            result.customers = customerSheet
              .filter((row: any) => getValue(row, 'Customer Name', 'Name', 'Party Name', 'CustomerName'))
              .map((row: any) => ({
                id: Math.random().toString(36).substr(2, 9),
                name: getValue(row, 'Customer Name', 'Name', 'Party Name', 'CustomerName'),
                company: getValue(row, 'Company', 'Company Name', 'Firm', 'Business Name'),
                email: getValue(row, 'Email', 'E-mail', 'EmailID'),
                phone: getValue(row, 'Phone', 'Mobile', 'Contact', 'Phone Number', 'Mobile Number'),
                address: getValue(row, 'Address', 'Billing Address', 'Full Address'),
                state: company?.gst_enabled ? getValue(row, 'State', 'State Name') : '',
                gstin: company?.gst_enabled ? getValue(row, 'GSTIN', 'GST Number', 'GST No', 'GSTNo') : '',
                balance: 0,
                notifications: []
              }));
          }

          console.log('Import result:', result.products.length, 'products,', result.customers.length, 'customers');
          resolve(result);
        } catch (error) {
          console.error('Parse error:', error);
          reject(error);
        }
      };
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsArrayBuffer(file);
    });
  };

  const parseTallyXML = (content: string) => {
    const result = { products: [] as Product[], customers: [] as Customer[] };

    try {
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(content, 'text/xml');

      if (xmlDoc.getElementsByTagName('parsererror').length > 0) {
        throw new Error('Invalid XML format');
      }

      // Parse Tally Masters (Items/Products)
      const items = xmlDoc.getElementsByTagName('ITEM');
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        const name = item.getElementsByTagName('NAME')[0]?.textContent || '';
        const hsn = company?.gst_enabled ? (item.getElementsByTagName('HSNCODE')[0]?.textContent || '') : '';
        const gstRate = company?.gst_enabled ? parseFloat(item.getElementsByTagName('GSTRATE')[0]?.textContent || '0') : 0;

        if (name) {
          result.products.push({
            id: Math.random().toString(36).substr(2, 9),
            name,
            price: 0,
            stock: 0,
            category: 'Imported',
            hsn,
            gstRate
          });
        }
      }

      // Parse Ledgers (Customers)
      const ledgers = xmlDoc.getElementsByTagName('LEDGER');
      for (let i = 0; i < ledgers.length; i++) {
        const ledger = ledgers[i];
        const name = ledger.getElementsByTagName('NAME')[0]?.textContent || '';
        const address = ledger.getElementsByTagName('ADDRESS')[0]?.textContent || '';
        const state = company?.gst_enabled ? (ledger.getElementsByTagName('STATE')[0]?.textContent || '') : '';
        const gstin = company?.gst_enabled ? (ledger.getElementsByTagName('GSTIN')[0]?.textContent || '') : '';
        const phone = ledger.getElementsByTagName('PHONE')[0]?.textContent || '';
        const email = ledger.getElementsByTagName('EMAIL')[0]?.textContent || '';

        if (name && !['Sales', 'Purchase', 'Duty', 'Tax'].includes(name)) {
          result.customers.push({
            id: Math.random().toString(36).substr(2, 9),
            name,
            company: '',
            email: email || '',
            phone: phone || '',
            address: address || '',
            state: state || '',
            gstin: gstin || '',
            balance: 0,
            notifications: []
          });
        }
      }
    } catch (error) {
      throw new Error('Failed to parse Tally XML: ' + (error as Error).message);
    }

    return result;
  };

  const handleDownloadSample = async () => {
    try {
      // Sample data structure matching the parsing logic
      const sampleData = [
        {
          'Product Name': 'Sample Product',
          'Price': 100,
          'Quantity': 10,
          'Category': 'General',
          'HSN': '1234',
          'GST Rate': 18
        },
        {
          'Product Name': 'Service Item',
          'Price': 500,
          'Quantity': 1,
          'Category': 'Services',
          'HSN': '9988',
          'GST Rate': 5
        }
      ];

      const ws = XLSX.utils.json_to_sheet(sampleData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Products");

      // Add a Customers sheet sample too
      const customerData = [
        {
          'Customer Name': 'John Doe',
          'Company': 'ABC Corp',
          'Email': 'john@example.com',
          'Phone': '9876543210',
          'Address': '123 Main St',
          'State': 'Delhi',
          'GSTIN': '07AAAAA0000A1Z5'
        }
      ];
      const wsCust = XLSX.utils.json_to_sheet(customerData);
      XLSX.utils.book_append_sheet(wb, wsCust, "Customers");

      const fileName = "JLS_Suite_Import_Sample.xlsx";

      if (Capacitor.isNativePlatform()) {
        // Native: Use Capacitor Filesystem
        const xlsxData = XLSX.write(wb, { bookType: 'xlsx', type: 'base64' });

        await Filesystem.writeFile({
          path: fileName,
          data: xlsxData,
          directory: Directory.Documents,
        });

        alert(`✅ Sample file saved!\n\nLocation: Documents/${fileName}\n\nOpen your file manager to find it, then edit and re-upload.`);
      } else {
        // Web: Use standard download
        XLSX.writeFile(wb, fileName);
      }
    } catch (error) {
      console.error('Download sample error:', error);
      alert('Failed to download sample file. Please try again.');
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    setStatus({ type: 'idle', message: '' });

    try {
      let importData: { products: Product[], customers: Customer[] };

      if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
        importData = await parseExcelFile(file);
      } else if (file.name.endsWith('.xml')) {
        const content = await file.text();
        importData = parseTallyXML(content);
      } else {
        throw new Error('Unsupported file format. Use .xlsx, .xls, or .xml');
      }

      // Import products
      if (importData.products.length > 0) {
        importData.products.forEach(product => {
          StorageService.saveProduct(product);
        });
      }

      // Import customers
      if (importData.customers.length > 0) {
        importData.customers.forEach(customer => {
          StorageService.saveCustomer(customer);
        });
      }

      setImportStats({
        products: importData.products.length,
        customers: importData.customers.length
      });

      setStatus({
        type: 'success',
        message: `Successfully imported ${importData.products.length} products and ${importData.customers.length} customers!`
      });

      setTimeout(() => {
        onImportComplete();
        onClose();
      }, 2000);
    } catch (error) {
      setStatus({
        type: 'error',
        message: (error as Error).message || 'Import failed. Please check the file format.'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-lg max-w-md w-full p-6">
        <h2 className="text-xl font-bold text-slate-900 mb-4">Import Data</h2>

        <div className="space-y-4">
          <button
            onClick={handleDownloadSample}
            className="w-full flex items-center justify-center gap-2 mb-4 py-2 bg-blue-50 text-blue-600 rounded-lg font-bold border border-blue-100 hover:bg-blue-100 transition-colors"
          >
            <Download className="w-4 h-4" />
            Download Sample Excel
          </button>

          {/* File Upload Area */}
          <div className="border-2 border-dashed border-blue-200 rounded-lg p-6 text-center hover:bg-blue-50 transition-colors">
            <label className="cursor-pointer flex flex-col items-center gap-2">
              <Upload className="w-8 h-8 text-blue-500" />
              <span className="text-sm font-medium text-slate-700">
                Drop or click to upload
              </span>
              <span className="text-xs text-slate-500">
                .xlsx, .xls, or Tally .xml
              </span>
              <input
                type="file"
                accept=".xlsx,.xls,.xml"
                onChange={handleFileUpload}
                disabled={loading}
                className="hidden"
                data-testid="file-input-import"
              />
            </label>
          </div>

          {/* Status Messages */}
          {status.type === 'success' && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex gap-3">
              <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-green-900">{status.message}</p>
                <p className="text-xs text-green-700 mt-1">
                  {importStats.products} products, {importStats.customers} customers
                </p>
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
              <span className="text-sm text-slate-600">Processing...</span>
            </div>
          )}

          {/* Info Box */}
          <div className={`rounded-lg p-3 ${company?.gst_enabled ? 'bg-blue-50 border border-blue-200' : 'bg-amber-50 border border-amber-200'}`}>
            <p className={`text-xs ${company?.gst_enabled ? 'text-blue-900' : 'text-amber-900'}`}>
              <span className="font-medium">Supported formats:</span><br />
              • Excel: Products sheet with Name, Price, Stock{company?.gst_enabled ? ', HSN, GST Rate' : ''}<br />
              • Excel: Customers sheet with Name, Email, Phone, Address{company?.gst_enabled ? ', State, GSTIN' : ''}<br />
              • Tally XML: Extract ITEM and LEDGER masters
              {!company?.gst_enabled && <><br /><br /><span className="font-medium">⚠️ GST is currently disabled</span> - GST fields will be ignored</>}
            </p>
          </div>
        </div>

        <button
          onClick={onClose}
          disabled={loading}
          className="w-full mt-6 px-4 py-2 border border-slate-300 rounded-md text-slate-700 hover:bg-slate-50 font-medium transition-colors disabled:opacity-50"
          data-testid="button-close-import"
        >
          Close
        </button>
      </div>
    </div>
  );
};

export default Import;
