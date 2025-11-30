import React, { useState, useMemo } from 'react';
import { Invoice, Customer } from '../types';
import { StorageService } from '../services/storageService';
import { ArrowLeft, Calendar, Download, Filter } from 'lucide-react';
import { jsPDF } from 'jspdf';

interface CustomerLedgerProps {
  customerId: string;
  onBack: () => void;
}

const CustomerLedger: React.FC<CustomerLedgerProps> = ({ customerId, onBack }) => {
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  
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
    
    return invoices.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [customerId, startDate, endDate, allInvoices]);

  const calculateBalance = () => {
    let balance = 0;
    filteredInvoices.forEach(invoice => {
      balance += invoice.total;
      const payments = StorageService.getPayments().filter(p => p.customerId === customerId && p.date <= invoice.date);
      const paid = payments.reduce((sum, p) => sum + p.amount, 0);
      balance -= paid;
    });
    return balance;
  };

  const downloadPDF = () => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    let y = 20;

    // Header
    doc.setFontSize(16);
    doc.text('Customer Ledger', pageWidth / 2, y, { align: 'center' });
    y += 10;

    doc.setFontSize(11);
    doc.text(`Customer: ${customer?.name || 'N/A'}`, 20, y);
    y += 6;
    doc.text(`GSTIN: ${customer?.gstin || 'N/A'}`, 20, y);
    y += 6;
    doc.text(`Address: ${customer?.address || 'N/A'}`, 20, y);
    y += 10;

    if (startDate || endDate) {
      doc.setFontSize(10);
      doc.text(`Period: ${startDate || 'Start'} to ${endDate || 'End'}`, 20, y);
      y += 8;
    }

    // Table headers
    doc.setFontSize(10);
    doc.setFont(undefined, 'bold');
    const headers = ['Date', 'Invoice #', 'Description', 'Debit (₹)', 'Credit (₹)', 'Balance (₹)'];
    const columnWidths = [25, 30, 50, 25, 25, 30];
    let x = 20;
    
    headers.forEach((header, i) => {
      doc.text(header, x, y, { maxWidth: columnWidths[i] });
      x += columnWidths[i];
    });
    y += 8;

    // Table data
    doc.setFont(undefined, 'normal');
    doc.setFontSize(9);
    let balance = 0;

    filteredInvoices.forEach((invoice) => {
      const debit = invoice.total;
      balance += debit;

      x = 20;
      doc.text(invoice.date, x, y);
      x += columnWidths[0];
      doc.text(invoice.invoiceNumber, x, y);
      x += columnWidths[1];
      doc.text('Invoice', x, y);
      x += columnWidths[2];
      doc.text(debit.toFixed(2), x, y, { align: 'right' });
      x += columnWidths[3];
      doc.text('', x, y);
      x += columnWidths[4];
      doc.text(balance.toFixed(2), x, y, { align: 'right' });

      y += 6;
      if (y > pageHeight - 20) {
        doc.addPage();
        y = 20;
      }
    });

    // Total
    y += 4;
    doc.setFont(undefined, 'bold');
    doc.text('Total Balance:', 20, y);
    doc.text(balance.toFixed(2), pageWidth - 30, y, { align: 'right' });

    doc.save(`${customer?.name}-ledger.pdf`);
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

      {/* Customer Info */}
      <div className="bg-white rounded-lg shadow p-4 md:p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <p className="text-sm text-slate-500">Company</p>
            <p className="font-semibold text-slate-800">{customer.company || 'N/A'}</p>
          </div>
          <div>
            <p className="text-sm text-slate-500">GSTIN</p>
            <p className="font-semibold text-slate-800">{customer.gstin || 'N/A'}</p>
          </div>
          <div>
            <p className="text-sm text-slate-500">State</p>
            <p className="font-semibold text-slate-800">{customer.state || 'N/A'}</p>
          </div>
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
          >
            <Download className="w-4 h-4" />
            Download PDF
          </button>
        </div>
      </div>

      {/* Ledger Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[800px]">
            <thead className="bg-slate-50 border-b">
              <tr className="text-left text-xs font-semibold text-slate-600 uppercase">
                <th className="px-6 py-4">Date</th>
                <th className="px-6 py-4">Invoice #</th>
                <th className="px-6 py-4">Description</th>
                <th className="px-6 py-4 text-right">Amount (₹)</th>
                <th className="px-6 py-4 text-right">Balance (₹)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredInvoices.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-slate-500">No invoices found</td>
                </tr>
              ) : (
                filteredInvoices.map((invoice) => {
                  const balance = filteredInvoices.slice(0, filteredInvoices.indexOf(invoice) + 1).reduce((sum, inv) => sum + inv.total, 0);
                  return (
                    <tr key={invoice.id} className="hover:bg-slate-50">
                      <td className="px-6 py-4 text-sm text-slate-600">{invoice.date}</td>
                      <td className="px-6 py-4 text-sm font-medium text-blue-600">{invoice.invoiceNumber}</td>
                      <td className="px-6 py-4 text-sm text-slate-600">Sale</td>
                      <td className="px-6 py-4 text-sm text-right font-medium">₹{invoice.total.toFixed(2)}</td>
                      <td className="px-6 py-4 text-sm text-right font-bold text-slate-800">₹{balance.toFixed(2)}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default CustomerLedger;
