
import React, { useState, useMemo } from 'react';
import { Invoice, Payment, Customer } from '../types';
import { StorageService } from '../services/storageService';
import { Calendar, Search, Download, ArrowLeft, Filter, FileText, IndianRupee } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import jsPDF from 'jspdf';
import { HapticService } from '../services/hapticService';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Capacitor } from '@capacitor/core';

interface CustomerLedgerProps {
  customerId: string;
  onBack: () => void;
  onViewInvoice: (invoice: Invoice) => void;
  onEditPayment: (payment: Payment) => void;
}

const CustomerLedger: React.FC<CustomerLedgerProps> = ({ customerId, onBack, onViewInvoice, onEditPayment }) => {
  const customer = StorageService.getCustomers().find((c: Customer) => c.id === customerId);
  const invoices = StorageService.getInvoices().filter((i: Invoice) => i.customerId === customerId);
  const payments = StorageService.getPayments().filter((p: Payment) => p.customerId === customerId);

  const [dateRange, setDateRange] = useState({
    from: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
    to: new Date().toISOString().split('T')[0]
  });

  const { debitItems, creditItems, openingBalance } = useMemo(() => {
    // 1. Calculate Opening Balance
    // Debit side: Sales + Paid Out
    const openDrInv = invoices
      .filter((i: Invoice) => i.date < dateRange.from && i.type !== 'PURCHASE')
      .reduce((sum, i) => sum + i.total, 0);
    const openDrPay = payments
      .filter((p: Payment) => p.date < dateRange.from && p.type === 'PAID')
      .reduce((sum, p) => sum + p.amount, 0);

    const openingDebit = openDrInv + openDrPay;

    // Credit side: Purchases + Received In
    const openCrInv = invoices
      .filter((i: Invoice) => i.date < dateRange.from && i.type === 'PURCHASE')
      .reduce((sum, i) => sum + i.total, 0);
    const openCrPay = payments
      .filter((p: Payment) => p.date < dateRange.from && p.type !== 'PAID')
      .reduce((sum, p) => sum + p.amount, 0);

    const openingCredit = openCrInv + openCrPay;
    const openingBalance = openingDebit - openingCredit;

    // 2. Prepare Detailed Lists for Range
    // Debit Items: Sales & Payments Made (Paid)
    const dSales = invoices
      .filter((i: Invoice) => i.date >= dateRange.from && i.date <= dateRange.to && i.type !== 'PURCHASE')
      .map((inv: Invoice) => ({
        id: inv.id,
        date: inv.date,
        description: 'To Sales',
        reference: inv.invoiceNumber,
        amount: inv.total,
        original: inv,
        type: 'INVOICE'
      }));

    const dPayments = payments
      .filter((p: Payment) => p.date >= dateRange.from && p.date <= dateRange.to && p.type === 'PAID')
      .map((pay: Payment) => ({
        id: pay.id,
        date: pay.date,
        description: 'To Payment (Out)',
        reference: pay.mode || 'CASH',
        amount: pay.amount,
        original: pay,
        type: 'PAYMENT'
      }));

    const d = [...dSales, ...dPayments].sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime());

    // Credit Items: Purchases & Payments Received (In)
    const cPurchases = invoices
      .filter((i: Invoice) => i.date >= dateRange.from && i.date <= dateRange.to && i.type === 'PURCHASE')
      .map((inv: Invoice) => ({
        id: inv.id,
        date: inv.date,
        description: 'By Purchase',
        reference: inv.invoiceNumber,
        amount: inv.total,
        original: inv,
        type: 'INVOICE'
      }));

    const cReceipts = payments
      .filter((p: Payment) => p.date >= dateRange.from && p.date <= dateRange.to && p.type !== 'PAID')
      .map((pay: Payment) => ({
        id: pay.id,
        date: pay.date,
        description: 'By Receipt',
        reference: pay.mode,
        amount: pay.amount,
        original: pay,
        type: 'PAYMENT'
      }));

    const c = [...cPurchases, ...cReceipts].sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime());

    return { debitItems: d, creditItems: c, openingBalance };
  }, [invoices, payments, dateRange]);

  const stats = useMemo(() => {
    const periodDebit = debitItems.reduce((sum: number, t: any) => sum + t.amount, 0);
    const periodCredit = creditItems.reduce((sum: number, t: any) => sum + t.amount, 0);
    const totalDebit = openingBalance > 0 ? openingBalance + periodDebit : periodDebit;
    const totalCredit = openingBalance < 0 ? Math.abs(openingBalance) + periodCredit : periodCredit;
    return { totalDebit, totalCredit, balance: openingBalance + periodDebit - periodCredit };
  }, [debitItems, creditItems, openingBalance]);

  const handleRowClick = (item: any) => {
    HapticService.light();
    if (item.type === 'INVOICE') {
      onViewInvoice(item.original);
    } else {
      onEditPayment(item.original);
    }
  };

  const handleExportPDF = () => {
    if (!customer) return;
    const doc = new jsPDF('l', 'mm', 'a4'); // Landscape for T-shape
    const margin = 12;
    const pageWidth = doc.internal.pageSize.getWidth();
    const tableWidth = pageWidth - (margin * 2);
    const halfWidth = tableWidth / 2;
    let y = 20;

    // Header
    doc.setFontSize(22);
    doc.setTextColor(40, 40, 40);
    doc.text(`${customer.company || customer.name}`.toUpperCase(), pageWidth / 2, y, { align: 'center' });
    y += 10;
    doc.setFontSize(14);
    doc.setTextColor(100, 100, 100);
    doc.text("LEDGER ACCOUNT", pageWidth / 2, y, { align: 'center' });
    y += 8;
    doc.setFontSize(10);
    doc.text(`Period: ${dateRange.from} to ${dateRange.to}`, pageWidth / 2, y, { align: 'center' });
    y += 12;

    // T-Shape Table Header
    doc.setDrawColor(0);
    doc.setLineWidth(0.5);
    doc.line(margin, y, pageWidth - margin, y); // Top horizontal
    y += 7;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    // Dr. Header
    doc.text("Dr.", margin, y - 9);
    doc.text("Date", margin + 2, y);
    doc.text("Particulars", margin + 25, y);
    doc.text("Ref", margin + 85, y);
    doc.text("Amount (Rs.)", margin + halfWidth - 5, y, { align: 'right' });

    // Cr. Header
    doc.text("Cr.", pageWidth - margin - 5, y - 9);
    doc.text("Date", margin + halfWidth + 5, y);
    doc.text("Particulars", margin + halfWidth + 28, y);
    doc.text("Ref", margin + halfWidth + 88, y);
    doc.text("Amount (Rs.)", pageWidth - margin - 2, y, { align: 'right' });

    y += 3;
    doc.line(margin, y, pageWidth - margin, y); // Header separator
    doc.line(pageWidth / 2, y - 10, pageWidth / 2, 200); // Center vertical line
    y += 8;

    // Opening Balance
    doc.setFontSize(10);
    if (openingBalance !== 0) {
      if (openingBalance > 0) {
        doc.text(dateRange.from, margin + 2, y);
        doc.text("To Opening Balance (b/d)", margin + 25, y);
        doc.text(openingBalance.toLocaleString(), margin + halfWidth - 5, y, { align: 'right' });
      } else {
        doc.text(dateRange.from, margin + halfWidth + 5, y);
        doc.text("By Opening Balance (b/d)", margin + halfWidth + 28, y);
        doc.text(Math.abs(openingBalance).toLocaleString(), pageWidth - margin - 2, y, { align: 'right' });
      }
      y += 8;
    }

    doc.setFont("helvetica", "normal");
    const maxRows = Math.max(debitItems.length, creditItems.length);

    for (let i = 0; i < maxRows; i++) {
      if (y > 180) {
        doc.addPage();
        y = 20;
        doc.line(pageWidth / 2, y, pageWidth / 2, 200);
      }

      // Debit side
      if (debitItems[i]) {
        doc.text(debitItems[i].date, margin + 2, y);
        doc.text(debitItems[i].description, margin + 25, y);
        const ref = debitItems[i].reference.toString();
        doc.text(ref.length > 20 ? ref.substring(0, 18) + ".." : ref, margin + 85, y);
        doc.text(debitItems[i].amount.toLocaleString(), margin + halfWidth - 5, y, { align: 'right' });
      }

      // Credit side
      if (creditItems[i]) {
        doc.text(creditItems[i].date, margin + halfWidth + 5, y);
        doc.text(creditItems[i].description, margin + halfWidth + 28, y);
        const ref = creditItems[i].reference.toString();
        doc.text(ref.length > 20 ? ref.substring(0, 18) + ".." : ref, margin + halfWidth + 88, y);
        doc.text(creditItems[i].amount.toLocaleString(), pageWidth - margin - 2, y, { align: 'right' });
      }
      y += 8;
    }

    // Totals Section
    y = Math.max(y, 180);
    doc.setLineWidth(0.3);
    doc.line(margin, y, pageWidth - margin, y);
    y += 8;
    doc.setFont("helvetica", "bold");
    doc.text("Total Dr.", margin + 25, y);
    doc.text("Rs. " + stats.totalDebit.toLocaleString(), margin + halfWidth - 5, y, { align: 'right' });

    doc.text("Total Cr.", margin + halfWidth + 28, y);
    doc.text("Rs. " + stats.totalCredit.toLocaleString(), pageWidth - margin - 2, y, { align: 'right' });

    y += 12;
    doc.setFontSize(12);
    const balanceText = `Net Closing Balance: Rs. ${Math.abs(stats.balance).toLocaleString()} (${stats.balance >= 0 ? 'Dr.' : 'Cr.'})`;
    doc.text(balanceText, pageWidth - margin, y, { align: 'right' });

    if (Capacitor.isNativePlatform()) {
      try {
        const pdfBase64 = doc.output('datauristring').split(',')[1];
        const fileName = `${customer.name}-Ledger-${dateRange.from}.pdf`;

        Filesystem.writeFile({
          path: fileName,
          data: pdfBase64,
          directory: Directory.Documents,
        }).then(() => {
          alert(`Saved to Documents: ${fileName}`);
        }).catch((e) => alert(`Save Failed: ${e}`));
      } catch (e) {
        alert("Native Save Error: " + e);
      }
    } else {
      doc.save(`${customer.name}-Ledger-${dateRange.from}.pdf`);
    }
  };

  if (!customer) return null;

  return (
    <div className="bg-slate-50 dark:bg-black min-h-screen pb-24 font-['Outfit']">
      <div className="sticky top-0 z-20 bg-white/80 dark:bg-black/80 backdrop-blur-md border-b border-slate-200 dark:border-gray-800 p-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={onBack} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors">
              <ArrowLeft className="w-6 h-6" />
            </button>
            <div>
              <h1 className="text-xl font-bold">Ledger Account (T-Shape)</h1>
              <p className="text-sm text-slate-500 font-medium">{customer.company || customer.name}</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="hidden md:flex bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-1">
              <input
                type="date"
                className="bg-transparent border-none text-xs font-bold p-2"
                value={dateRange.from}
                onChange={e => setDateRange({ ...dateRange, from: e.target.value })}
              />
              <div className="self-center px-1 text-slate-400">→</div>
              <input
                type="date"
                className="bg-transparent border-none text-xs font-bold p-2"
                value={dateRange.to}
                onChange={e => setDateRange({ ...dateRange, to: e.target.value })}
              />
            </div>
            <button
              onClick={handleExportPDF}
              className="bg-slate-900 dark:bg-white dark:text-black text-white px-5 py-2.5 rounded-2xl flex items-center gap-2 font-black shadow-xl active:scale-95 transition-all"
            >
              <Download className="w-5 h-5" /> Export PDF
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto p-4 space-y-6">
        {/* Mobile Date Filters */}
        <div className="md:hidden grid grid-cols-2 gap-4">
          <div className="bg-white dark:bg-slate-800 p-3 rounded-2xl border border-slate-100">
            <p className="text-[10px] font-black text-slate-400 uppercase mb-1">From</p>
            <input type="date" className="w-full bg-transparent font-bold text-sm" value={dateRange.from} onChange={e => setDateRange({ ...dateRange, from: e.target.value })} />
          </div>
          <div className="bg-white dark:bg-slate-800 p-3 rounded-2xl border border-slate-100">
            <p className="text-[10px] font-black text-slate-400 uppercase mb-1">To</p>
            <input type="date" className="w-full bg-transparent font-bold text-sm" value={dateRange.to} onChange={e => setDateRange({ ...dateRange, to: e.target.value })} />
          </div>
        </div>

        {/* Totals Summary */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white dark:bg-gray-900 p-5 rounded-[32px] border border-slate-100 dark:border-gray-800 shadow-sm relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform">
              <IndianRupee className="w-12 h-12" />
            </div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Total Debits (Dr.)</p>
            <p className="text-3xl font-black text-slate-900 dark:text-slate-100">₹{stats.totalDebit.toLocaleString()}</p>
          </div>
          <div className="bg-white dark:bg-gray-900 p-5 rounded-[32px] border border-slate-100 dark:border-gray-800 shadow-sm text-emerald-600 relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform">
              <IndianRupee className="w-12 h-12" />
            </div>
            <p className="text-xs font-bold opacity-60 uppercase tracking-widest mb-1">Total Credits (Cr.)</p>
            <p className="text-3xl font-black">₹{stats.totalCredit.toLocaleString()}</p>
          </div>
          <div className={`${stats.balance >= 0 ? 'bg-red-600' : 'bg-emerald-600'} p-5 rounded-[32px] shadow-lg shadow-blue-500/20 text-white relative overflow-hidden group`}>
            <div className="absolute top-0 right-0 p-4 opacity-20 group-hover:scale-110 transition-transform">
              <FileText className="w-12 h-12" />
            </div>
            <p className="text-xs font-bold opacity-80 uppercase tracking-widest mb-1">Closing Balance</p>
            <p className="text-3xl font-black">₹{Math.abs(stats.balance).toLocaleString()}</p>
            <p className="text-[10px] font-bold mt-1 uppercase opacity-70">{stats.balance >= 0 ? 'Debit Balance' : 'Credit Balance'}</p>
          </div>
        </div>

        {/* T-Shape Ledger */}
        <div className="bg-white dark:bg-gray-900 rounded-[40px] shadow-xl border border-slate-100 dark:border-gray-800 overflow-hidden">
          <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-slate-200 dark:divide-gray-800">
            {/* DEBIT SIDE */}
            <div>
              <div className="bg-slate-50 dark:bg-black/40 px-6 py-4 border-b border-slate-200 dark:border-gray-800 flex justify-between items-center">
                <span className="text-xs font-black text-slate-400 uppercase tracking-tighter">Debit (Dr.)</span>
                <span className="text-[10px] font-bold text-slate-400 px-2 py-1 bg-slate-100 dark:bg-slate-800 rounded-lg">To Sales Account</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="text-[10px] font-black text-slate-400 uppercase border-b border-slate-100 dark:border-slate-800">
                    <tr>
                      <th className="px-6 py-3">Date</th>
                      <th className="px-6 py-3">Reference</th>
                      <th className="px-6 py-3 text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                    {openingBalance > 0 && (
                      <tr className="bg-blue-50/30 dark:bg-blue-900/10 italic">
                        <td className="px-6 py-4 text-xs font-bold text-slate-400">{dateRange.from}</td>
                        <td className="px-6 py-4 text-[10px] font-bold text-blue-600 uppercase">To Opening Balance (b/d)</td>
                        <td className="px-6 py-4 text-right font-black text-blue-700">₹{openingBalance.toLocaleString()}</td>
                      </tr>
                    )}
                    {debitItems.map(item => (
                      <tr
                        key={item.id}
                        onClick={() => handleRowClick(item)}
                        className="hover:bg-slate-50 dark:hover:bg-slate-900/30 cursor-pointer active:bg-slate-100 transition-colors"
                      >
                        <td className="px-6 py-4 text-xs font-bold text-slate-500">{item.date}</td>
                        <td className="px-6 py-4">
                          <div className="text-[10px] font-bold text-slate-400 uppercase group-hover:text-blue-500">{item.reference}</div>
                        </td>
                        <td className="px-6 py-4 text-right font-black text-slate-800 dark:text-slate-100">
                          ₹{item.amount.toLocaleString()}
                        </td>
                      </tr>
                    ))}
                    {debitItems.length === 0 && openingBalance <= 0 && (
                      <tr><td colSpan={3} className="px-6 py-12 text-center text-xs text-slate-400 italic">No debit entries</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* CREDIT SIDE */}
            <div>
              <div className="bg-slate-50 dark:bg-black/40 px-6 py-4 border-b border-slate-200 dark:border-gray-800 flex justify-between items-center text-emerald-600">
                <span className="text-xs font-black uppercase tracking-tighter opacity-70">Credit (Cr.)</span>
                <span className="text-[10px] font-bold opacity-70 px-2 py-1 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg">By Receipt Account</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="text-[10px] font-black text-slate-400 uppercase border-b border-slate-100 dark:border-slate-800">
                    <tr>
                      <th className="px-6 py-3">Date</th>
                      <th className="px-6 py-3">Reference</th>
                      <th className="px-6 py-3 text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                    {openingBalance < 0 && (
                      <tr className="bg-emerald-50/30 dark:bg-emerald-900/10 italic">
                        <td className="px-6 py-4 text-xs font-bold text-slate-400">{dateRange.from}</td>
                        <td className="px-6 py-4 text-[10px] font-bold text-emerald-600 uppercase">By Opening Balance (b/d)</td>
                        <td className="px-6 py-4 text-right font-black text-emerald-700">₹{Math.abs(openingBalance).toLocaleString()}</td>
                      </tr>
                    )}
                    {creditItems.map(item => (
                      <tr
                        key={item.id}
                        onClick={() => handleRowClick(item)}
                        className="hover:bg-slate-50 dark:hover:bg-slate-900/30 cursor-pointer active:bg-slate-100 transition-colors"
                      >
                        <td className="px-6 py-4 text-xs font-bold text-slate-500">{item.date}</td>
                        <td className="px-6 py-4">
                          <div className="text-[10px] font-bold text-slate-400 uppercase group-hover:text-emerald-500">{item.reference}</div>
                        </td>
                        <td className="px-6 py-4 text-right font-black text-emerald-600">
                          ₹{item.amount.toLocaleString()}
                        </td>
                      </tr>
                    ))}
                    {creditItems.length === 0 && openingBalance >= 0 && (
                      <tr><td colSpan={3} className="px-6 py-12 text-center text-xs text-slate-400 italic">No credit entries</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Final Totals Footer */}
          <div className="grid grid-cols-1 md:grid-cols-2 border-t border-slate-200 dark:border-gray-800 bg-slate-50 dark:bg-black/40">
            <div className="px-6 py-4 flex justify-between items-center border-b md:border-b-0 md:border-r border-slate-200 dark:border-slate-700">
              <span className="text-xs font-black text-slate-800 dark:text-slate-100">TOTAL DEBIT</span>
              <span className="text-lg font-black text-slate-900 dark:text-slate-100">₹{stats.totalDebit.toLocaleString()}</span>
            </div>
            <div className="px-6 py-4 flex justify-between items-center text-emerald-600">
              <span className="text-xs font-black">TOTAL CREDIT</span>
              <span className="text-lg font-black">₹{stats.totalCredit.toLocaleString()}</span>
            </div>
          </div>
        </div>
      </div>
    </div >
  );
};

export default CustomerLedger;
