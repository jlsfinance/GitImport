import React, { useState, useMemo, useRef } from 'react';
import { Invoice, Customer } from '../types';
import { StorageService } from '../services/storageService';
import { useCompany } from '@/contexts/CompanyContext';
import { ArrowLeft, Download } from 'lucide-react';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

interface CustomerLedgerProps {
  customerId: string;
  onBack: () => void;
}

const CustomerLedger: React.FC<CustomerLedgerProps> = ({ customerId, onBack }) => {
  const { company } = useCompany();
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const ledgerRef = useRef<HTMLDivElement>(null);
  
  const customer = StorageService.getCustomers().find(c => c.id === customerId);
  const allInvoices = StorageService.getInvoices();
  
  const filteredInvoices = useMemo(() => {
    let invoices = allInvoices.filter(i => i.customerId === customerId);
    
    if (startDate) {
      invoices = invoices.filter(i => i.date >= startDate);
    }
    if (endDate) {
      invoices = invoices.filter(i => i.date <= endDate);
    }
    
    return invoices.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [customerId, startDate, endDate, allInvoices]);

  const totalBalance = filteredInvoices.reduce((sum, inv) => sum + inv.total, 0);

  const downloadPDF = async () => {
    if (!ledgerRef.current) return;
    
    try {
      const canvas = await html2canvas(ledgerRef.current, {
        scale: 2,
        useCORS: true,
        logging: false
      });
      
      const imgData = canvas.toDataURL('image/png');
      const doc = new jsPDF('p', 'mm', 'a4');
      const imgWidth = 210;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      
      let heightLeft = imgHeight;
      let position = 0;
      
      doc.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= 297;
      
      while (heightLeft > 0) {
        position = heightLeft - imgHeight;
        doc.addPage();
        doc.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= 297;
      }
      
      doc.save(`${customer?.name || 'Ledger'}-statement.pdf`);
    } catch (error) {
      console.error('PDF generation failed:', error);
    }
  };

  if (!customer) {
    return <div className="p-6 text-center text-slate-500">Customer not found</div>;
  }

  return (
    <div className="p-4 md:p-6">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <button onClick={onBack} className="flex items-center gap-2 px-3 py-2 text-slate-600 hover:bg-slate-100 rounded-lg">
          <ArrowLeft className="w-5 h-5" />
          Back
        </button>
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Customer Ledger</h2>
          <p className="text-sm text-slate-500">{customer.name}</p>
        </div>
      </div>

      {/* Filters & Actions */}
      <div className="bg-white rounded-lg shadow p-4 md:p-6 mb-6">
        <div className="flex flex-col md:flex-row gap-4 md:items-end md:justify-between">
          <div className="flex flex-col md:flex-row gap-4 flex-1">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">From Date</label>
              <input 
                type="date" 
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">To Date</label>
              <input 
                type="date" 
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
          <button 
            onClick={downloadPDF}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-700"
            data-testid="button-download-ledger-pdf"
          >
            <Download className="w-4 h-4" />
            Download PDF
          </button>
        </div>
      </div>

      {/* Ledger Content */}
      <div className="bg-white rounded-lg shadow p-6" ref={ledgerRef}>
        {/* Header Section - Tally Style */}
        <div className="flex justify-between mb-8 pb-4 border-b-2 border-slate-300">
          <div>
            <h3 className="text-lg font-bold">{company?.name || 'Company'}</h3>
            <p className="text-xs text-slate-600">{company?.address}</p>
            <p className="text-xs text-slate-600">Phone: {company?.phone}</p>
          </div>
          <div className="text-right">
            <p className="text-sm font-semibold">To: {customer.name}</p>
            <p className="text-xs text-slate-600">{customer.address}</p>
            <p className="text-xs text-slate-600">GSTIN: {customer.gstin || 'N/A'}</p>
          </div>
        </div>

        {/* Subject */}
        <div className="text-center mb-6">
          <h4 className="text-sm font-bold">CONFIRMATION OF ACCOUNTS</h4>
          <p className="text-xs text-slate-600">
            {startDate && endDate ? `Period: ${startDate} to ${endDate}` : 'Complete Account History'}
          </p>
        </div>

        {/* Table */}
        <table className="w-full mb-6 text-sm">
          <thead>
            <tr className="border-b-2 border-slate-400">
              <th className="text-left py-2 px-2 font-bold text-xs">Date</th>
              <th className="text-left py-2 px-2 font-bold text-xs">Invoice #</th>
              <th className="text-left py-2 px-2 font-bold text-xs">Description</th>
              <th className="text-right py-2 px-2 font-bold text-xs">Debit (₹)</th>
              <th className="text-right py-2 px-2 font-bold text-xs">Credit (₹)</th>
              <th className="text-right py-2 px-2 font-bold text-xs">Balance (₹)</th>
            </tr>
          </thead>
          <tbody>
            {filteredInvoices.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-4 text-center text-slate-500">No transactions found</td>
              </tr>
            ) : (
              filteredInvoices.map((invoice, idx) => {
                const balance = filteredInvoices
                  .slice(0, idx + 1)
                  .reduce((sum, inv) => sum + inv.total, 0);
                
                return (
                  <tr key={invoice.id} className="border-b border-slate-200 hover:bg-slate-50">
                    <td className="py-2 px-2 text-xs">{invoice.date}</td>
                    <td className="py-2 px-2 text-xs font-medium">{invoice.invoiceNumber}</td>
                    <td className="py-2 px-2 text-xs">Sale</td>
                    <td className="py-2 px-2 text-right text-xs">{invoice.total.toFixed(2)}</td>
                    <td className="py-2 px-2 text-right text-xs">-</td>
                    <td className="py-2 px-2 text-right text-xs font-semibold">{balance.toFixed(2)}</td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>

        {/* Footer */}
        <div className="flex justify-between pt-4 border-t-2 border-slate-400">
          <div className="text-xs">
            <p>We hereby confirm the above account statement as correct.</p>
          </div>
          <div className="text-right">
            <p className="font-bold">Closing Balance</p>
            <p className="text-sm font-bold">₹{totalBalance.toFixed(2)}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CustomerLedger;
