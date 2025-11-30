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

const formatCurrency = (amount: number): string => {
  return amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

const formatDate = (dateStr: string): string => {
  const date = new Date(dateStr + 'T00:00:00');
  return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};

const CustomerLedger: React.FC<CustomerLedgerProps> = ({ customerId, onBack }) => {
  const { company } = useCompany();
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const ledgerRef = useRef<HTMLDivElement>(null);
  
  const customer = StorageService.getCustomers().find(c => c.id === customerId);
  const allInvoices = StorageService.getInvoices();
  const allPayments = StorageService.getPayments();
  
  const { debitEntries, creditEntries, totalDebit, totalCredit, balance } = useMemo(() => {
    let debits: any[] = [];
    let credits: any[] = [];
    
    // Add invoices (Debit)
    allInvoices.forEach(inv => {
      if (inv.customerId === customerId) {
        if (!startDate || inv.date >= startDate) {
          if (!endDate || inv.date <= endDate) {
            debits.push({
              date: inv.date,
              ref: inv.invoiceNumber,
              narration: `Sale - ${inv.invoiceNumber}`,
              amount: inv.total
            });
          }
        }
      }
    });
    
    // Add payments (Credit)
    allPayments.forEach(payment => {
      if (payment.customerId === customerId) {
        if (!startDate || payment.date >= startDate) {
          if (!endDate || payment.date <= endDate) {
            credits.push({
              date: payment.date,
              ref: payment.reference || 'Payment',
              narration: `${payment.mode} Payment Received`,
              amount: payment.amount
            });
          }
        }
      }
    });
    
    debits.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    credits.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    
    const td = debits.reduce((sum, d) => sum + d.amount, 0);
    const tc = credits.reduce((sum, c) => sum + c.amount, 0);
    
    return {
      debitEntries: debits,
      creditEntries: credits,
      totalDebit: td,
      totalCredit: tc,
      balance: td - tc
    };
  }, [customerId, startDate, endDate, allInvoices, allPayments]);

  const downloadPDF = async () => {
    if (!ledgerRef.current) return;
    
    try {
      const element = ledgerRef.current;
      const canvas = await html2canvas(element, {
        scale: 1.5,
        useCORS: true,
        allowTaint: true,
        logging: false,
        backgroundColor: '#ffffff'
      });
      
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });
      
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const imgWidth = pageWidth - 10;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      
      let heightLeft = imgHeight;
      let position = 5;
      
      pdf.addImage(imgData, 'PNG', 5, position, imgWidth, imgHeight);
      heightLeft -= (pageHeight - 10);
      
      while (heightLeft >= 0) {
        position = heightLeft - imgHeight + 5;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 5, position, imgWidth, imgHeight);
        heightLeft -= (pageHeight - 10);
      }
      
      const fileName = `${customer?.name || 'Customer'}-confirmation-accounts.pdf`;
      pdf.save(fileName);
    } catch (error) {
      console.error('PDF generation error:', error);
      alert('Failed to download PDF. Please try again.');
    }
  };

  if (!customer) {
    return <div className="p-6 text-center text-slate-500">Customer not found</div>;
  }

  const periodStart = startDate ? formatDate(startDate) : '1-Apr';
  const periodEnd = endDate ? formatDate(endDate) : 'Today';

  return (
    <div className="p-4 md:p-6">
      {/* Navigation */}
      <div className="flex items-center gap-4 mb-6">
        <button onClick={onBack} className="flex items-center gap-2 px-3 py-2 text-slate-600 hover:bg-slate-100 rounded-lg">
          <ArrowLeft className="w-5 h-5" />
          Back
        </button>
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Confirmation of Accounts</h2>
          <p className="text-sm text-slate-500">{customer.name}</p>
        </div>
      </div>

      {/* Filters */}
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

      {/* Ledger Report - Tally Style */}
      <div className="bg-white rounded-lg shadow p-8 font-mono text-xs leading-relaxed" ref={ledgerRef} style={{ fontFamily: 'Courier New, monospace' }}>
        
        {/* Header */}
        <div className="mb-8 pb-6 border-b-2 border-slate-400">
          <div className="flex justify-between mb-6">
            <div className="w-1/2">
              <div className="font-bold text-sm mb-2">{company?.name}</div>
              <div className="text-xs">{company?.address}</div>
              <div className="text-xs">Phone: {company?.phone}</div>
            </div>
            <div className="w-1/2 text-right">
              <div className="font-bold text-sm mb-2">To: {customer.name}</div>
              <div className="text-xs">{customer.address}</div>
              <div className="text-xs">GSTIN: {customer.gstin || 'N/A'}</div>
              <div className="text-xs">State: {customer.state || 'N/A'}</div>
            </div>
          </div>
          <div className="text-right text-xs font-semibold">
            Dated: {new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
          </div>
        </div>

        {/* Subject */}
        <div className="text-center mb-6 pb-6 border-b border-slate-300">
          <div className="font-bold text-sm mb-2">Sub: Confirmation of Accounts</div>
          <div className="text-xs text-slate-600">
            Period: {periodStart} to {periodEnd}
          </div>
        </div>

        {/* Introductory Text */}
        <div className="mb-6 text-xs text-justify leading-relaxed">
          <p>Dear Sir/Madam,</p>
          <p className="mt-2">
            Given below are the details of our Account as stated in our Books of Accounts for the above mentioned period. Kindly return 3 copies stating your comments duly signed and sealed. In confirmation of the same. Please note that if no reply is received from you within a fortnight, it will be assumed that you have accepted the balance shown below.
          </p>
        </div>

        {/* Two-Column Ledger Layout */}
        <div className="mb-8">
          <table className="w-full border-collapse mb-4">
            <tbody>
              <tr>
                {/* LEFT COLUMN - DEBIT */}
                <td className="w-1/2 pr-8 align-top border-r border-slate-300">
                  <div className="font-bold text-xs mb-4">
                    <div className="text-center underline">DEBIT SIDE</div>
                  </div>
                  <table className="w-full text-xs mb-4">
                    <thead>
                      <tr className="border-b border-slate-400">
                        <th className="text-left py-1 px-1 font-bold w-14">Date</th>
                        <th className="text-left py-1 px-1 font-bold flex-1">Particulars</th>
                        <th className="text-right py-1 px-1 font-bold w-24">Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {debitEntries.map((entry, idx) => (
                        <tr key={`debit-${idx}`} className="border-b border-slate-200">
                          <td className="py-2 px-1 text-left">{formatDate(entry.date)}</td>
                          <td className="py-2 px-1 text-left whitespace-pre-wrap break-words">{entry.narration}</td>
                          <td className="py-2 px-1 text-right font-semibold">{formatCurrency(entry.amount)}</td>
                        </tr>
                      ))}
                      {debitEntries.length === 0 && (
                        <tr>
                          <td colSpan={3} className="py-4 text-center text-slate-400">No debit entries</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                  <div className="text-xs border-t-2 border-slate-400 pt-2">
                    <div className="flex justify-between font-bold">
                      <span></span>
                      <span className="text-right">{formatCurrency(totalDebit)}</span>
                    </div>
                  </div>
                </td>

                {/* RIGHT COLUMN - CREDIT */}
                <td className="w-1/2 pl-8 align-top">
                  <div className="font-bold text-xs mb-4">
                    <div className="text-center underline">CREDIT SIDE</div>
                  </div>
                  <table className="w-full text-xs mb-4">
                    <thead>
                      <tr className="border-b border-slate-400">
                        <th className="text-left py-1 px-1 font-bold w-14">Date</th>
                        <th className="text-left py-1 px-1 font-bold flex-1">Particulars</th>
                        <th className="text-right py-1 px-1 font-bold w-24">Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {creditEntries.map((entry, idx) => (
                        <tr key={`credit-${idx}`} className="border-b border-slate-200">
                          <td className="py-2 px-1 text-left">{formatDate(entry.date)}</td>
                          <td className="py-2 px-1 text-left whitespace-pre-wrap break-words">{entry.narration}</td>
                          <td className="py-2 px-1 text-right font-semibold">{formatCurrency(entry.amount)}</td>
                        </tr>
                      ))}
                      {creditEntries.length === 0 && (
                        <tr>
                          <td colSpan={3} className="py-4 text-center text-slate-400">No credit entries</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                  <div className="text-xs border-t-2 border-slate-400 pt-2">
                    <div className="flex justify-between font-bold">
                      <span>Closing Balance</span>
                      <span className="text-right">{formatCurrency(balance)}</span>
                    </div>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div className="mt-12 pt-6 flex justify-between text-xs">
          <div>
            <p className="font-semibold">I/We hereby confirm the above</p>
          </div>
          <div className="text-right">
            <p className="font-semibold mb-8">Yours faithfully,</p>
            <p>_________________</p>
            <p>Manager</p>
            <p className="mt-2">PAN: {(company as any)?.gstin || (company as any)?.gst || 'N/A'}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CustomerLedger;
