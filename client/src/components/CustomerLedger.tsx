
import React, { useState, useMemo } from 'react';
import { Invoice, Payment, Customer } from '../types';
import { StorageService } from '../services/storageService';
import { Calendar, Search, Download, ArrowLeft, Filter, FileText, IndianRupee } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import jsPDF from 'jspdf';

interface CustomerLedgerProps {
  customerId: string;
  onBack: () => void;
}

const CustomerLedger: React.FC<CustomerLedgerProps> = ({ customerId, onBack }) => {
  const customer = StorageService.getCustomers().find(c => c.id === customerId);
  const invoices = StorageService.getInvoices().filter(i => i.customerId === customerId);
  const payments = StorageService.getPayments().filter(p => p.customerId === customerId);

  const [dateRange, setDateRange] = useState({
    from: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
    to: new Date().toISOString().split('T')[0]
  });

  const transactions = useMemo(() => {
    const combined = [
      ...invoices.map(inv => ({
        id: inv.id,
        date: inv.date,
        type: 'INVOICE',
        reference: inv.invoiceNumber,
        debit: inv.total,
        credit: 0,
        description: 'Sales Invoice'
      })),
      ...payments.map(pay => ({
        id: pay.id,
        date: pay.date,
        type: 'PAYMENT',
        reference: pay.mode,
        debit: 0,
        credit: pay.amount,
        description: `Payment Received (${pay.mode})`
      }))
    ];

    return combined
      .filter(t => t.date >= dateRange.from && t.date <= dateRange.to)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [invoices, payments, dateRange]);

  const stats = useMemo(() => {
    const totalSales = transactions.reduce((sum, t) => sum + t.debit, 0);
    const totalPaid = transactions.reduce((sum, t) => sum + t.credit, 0);
    return { totalSales, totalPaid, balance: totalSales - totalPaid };
  }, [transactions]);

  const handleExportPDF = () => {
    if (!customer) return;
    const doc = new jsPDF();
    const margin = 15;
    let y = 20;

    doc.setFontSize(18);
    doc.text("Customer Ledger Report", 105, y, { align: 'center' });
    y += 10;
    doc.setFontSize(12);
    doc.text(`${customer.company || customer.name}`, 105, y, { align: 'center' });
    y += 10;
    doc.setFontSize(10);
    doc.text(`Period: ${dateRange.from} to ${dateRange.to}`, 105, y, { align: 'center' });
    y += 15;

    // Table Header
    doc.setFont("helvetica", "bold");
    doc.text("Date", margin, y);
    doc.text("Particulars", margin + 30, y);
    doc.text("Ref", margin + 90, y);
    doc.text("Debit", margin + 130, y, { align: 'right' });
    doc.text("Credit", margin + 155, y, { align: 'right' });
    doc.text("Balance", margin + 180, y, { align: 'right' });
    y += 5;
    doc.line(margin, y, 210 - margin, y);
    y += 7;

    let runningBalance = 0;
    doc.setFont("helvetica", "normal");
    transactions.forEach(t => {
      runningBalance += (t.debit - t.credit);
      doc.text(t.date, margin, y);
      doc.text(t.description, margin + 30, y);
      doc.text(t.reference, margin + 90, y);
      doc.text(t.debit > 0 ? t.debit.toFixed(2) : "-", margin + 130, y, { align: 'right' });
      doc.text(t.credit > 0 ? t.credit.toFixed(2) : "-", margin + 155, y, { align: 'right' });
      doc.text(runningBalance.toFixed(2), margin + 180, y, { align: 'right' });
      y += 7;

      if (y > 270) {
        doc.addPage();
        y = 20;
      }
    });

    try {
      doc.save(`${customer.name}-ledger.pdf`);
    } catch (e) {
      console.warn("Standard save failed, trying fallback:", e);
      try {
        const pdfData = doc.output('datauristring');
        const win = window.open();
        if (win) {
          win.document.write(`<iframe src="${pdfData}" frameborder="0" style="border:0; top:0px; left:0px; bottom:0px; right:0px; width:100%; height:100%;" allowfullscreen></iframe>`);
        } else {
          alert("Please allow popups to view/save the PDF.");
        }
      } catch (fallbackError) {
        alert("Failed to save PDF. Error: FAILED TO SAVE.");
      }
    }
  };

  if (!customer) return null;

  return (
    <div className="bg-slate-50 dark:bg-slate-900 min-h-screen pb-24">
      <div className="sticky top-0 z-20 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 p-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={onBack} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors">
              <ArrowLeft className="w-6 h-6" />
            </button>
            <div>
              <h1 className="text-xl font-bold">Ledger Report</h1>
              <p className="text-sm text-slate-500">{customer.company || customer.name}</p>
            </div>
          </div>
          <button
            onClick={handleExportPDF}
            className="bg-blue-600 text-white px-4 py-2 rounded-xl flex items-center gap-2 font-bold shadow-lg shadow-blue-200 active:scale-95 transition-transform"
          >
            <Download className="w-5 h-5" /> Export
          </button>
        </div>
      </div>

      <div className="max-w-4xl mx-auto p-4 space-y-6">
        {/* Filters */}
        <div className="bg-white dark:bg-slate-800 p-4 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-700 grid grid-cols-2 gap-4">
          <div>
            <label className="text-[10px] font-black text-slate-400 uppercase ml-2 mb-1 block">From Date</label>
            <input
              type="date"
              className="w-full bg-slate-50 dark:bg-slate-900 border-none rounded-xl p-3 text-sm font-bold"
              value={dateRange.from}
              onChange={e => setDateRange({ ...dateRange, from: e.target.value })}
            />
          </div>
          <div>
            <label className="text-[10px] font-black text-slate-400 uppercase ml-2 mb-1 block">To Date</label>
            <input
              type="date"
              className="w-full bg-slate-50 dark:bg-slate-900 border-none rounded-xl p-3 text-sm font-bold"
              value={dateRange.to}
              onChange={e => setDateRange({ ...dateRange, to: e.target.value })}
            />
          </div>
        </div>

        {/* Totals Summary */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-white dark:bg-slate-800 p-4 rounded-[24px] border border-slate-100 shadow-sm">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Sales</p>
            <p className="text-lg font-black text-slate-800 dark:text-slate-100">₹{stats.totalSales.toLocaleString()}</p>
          </div>
          <div className="bg-white dark:bg-slate-800 p-4 rounded-[24px] border border-slate-100 shadow-sm text-emerald-600">
            <p className="text-[10px] font-bold opacity-60 uppercase tracking-wider">Payments</p>
            <p className="text-lg font-black">₹{stats.totalPaid.toLocaleString()}</p>
          </div>
          <div className="bg-white dark:bg-slate-800 p-4 rounded-[24px] border border-slate-100 shadow-sm text-red-600">
            <p className="text-[10px] font-bold opacity-60 uppercase tracking-wider">Balance</p>
            <p className="text-lg font-black">₹{stats.balance.toLocaleString()}</p>
          </div>
        </div>

        {/* Ledger Table */}
        <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-700 overflow-hidden">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 dark:bg-slate-900/50">
              <tr>
                <th className="px-4 py-4 font-bold text-slate-500 uppercase text-[10px]">Date</th>
                <th className="px-4 py-4 font-bold text-slate-500 uppercase text-[10px]">Description</th>
                <th className="px-4 py-4 font-bold text-slate-500 uppercase text-[10px] text-right">Debit</th>
                <th className="px-4 py-4 font-bold text-slate-500 uppercase text-[10px] text-right">Credit</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
              {transactions.map(t => (
                <tr key={t.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                  <td className="px-4 py-4 font-medium">{t.date}</td>
                  <td className="px-4 py-4">
                    <div className="font-bold">{t.description}</div>
                    <div className="text-[10px] text-slate-400">Ref: {t.reference}</div>
                  </td>
                  <td className="px-4 py-4 text-right font-bold text-slate-800 dark:text-slate-200">
                    {t.debit > 0 ? `₹${t.debit.toLocaleString()}` : '-'}
                  </td>
                  <td className="px-4 py-4 text-right font-bold text-emerald-600">
                    {t.credit > 0 ? `₹${t.credit.toLocaleString()}` : '-'}
                  </td>
                </tr>
              ))}
              {transactions.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-12 text-center text-slate-400 font-medium">
                    No transactions found for these dates.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default CustomerLedger;
