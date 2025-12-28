import React, { useState, useMemo } from 'react';
import { Invoice, Payment, Customer } from '../types';
import { StorageService } from '../services/storageService';
import { Calendar, Search, Download, ArrowLeft, Filter, FileText, IndianRupee, Phone, MoreVertical, FileText as PdfIcon, MessageCircle } from 'lucide-react';
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
  onRecordPayment?: (customerId: string) => void;
  onRecordSale?: (customerId: string) => void;
}

const CustomerLedger: React.FC<CustomerLedgerProps> = ({ customerId, onBack, onViewInvoice, onEditPayment, onRecordPayment, onRecordSale }) => {
  const customer = StorageService.getCustomers().find((c: Customer) => c.id === customerId);
  const invoices = StorageService.getInvoices().filter((i: Invoice) => i.customerId === customerId);
  const payments = StorageService.getPayments().filter((p: Payment) => p.customerId === customerId);

  const [dateRange, setDateRange] = useState({
    from: new Date(new Date().getFullYear(), new Date().getMonth() - 1, 1).toISOString().split('T')[0], // Last month default
    to: new Date().toISOString().split('T')[0]
  });

  const transactions = useMemo(() => {
    const allItems = [
      ...invoices.map(i => ({
        id: i.id,
        date: i.date,
        time: i.date, // If time available use it
        description: 'Sale', // 'You gave' context
        amount: i.total,
        type: 'INVOICE',
        original: i,
        isDebit: true // You Gave / Sale
      })),
      ...payments.map(p => ({
        id: p.id,
        date: p.date,
        time: p.date,
        description: p.type === 'PAID' ? 'Payment Out' : 'Payment Received',
        amount: p.amount,
        type: 'PAYMENT',
        original: p,
        isDebit: p.type === 'PAID' // If PAID (we paid them), it's Debit. If RECEIVED (they paid us), it's Credit.
        // Wait: In Khatabook context:
        // You Gave = Sale (Debit)
        // You Got = Payment Received (Credit)
      }))
    ];

    return allItems.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [invoices, payments]);

  const stats = useMemo(() => {
    // Net Calculation
    // Total You Gave (Debit)
    const totalDebit = transactions.filter(t => t.isDebit).reduce((s, t) => s + t.amount, 0);
    // Total You Got (Credit)
    const totalCredit = transactions.filter(t => !t.isDebit).reduce((s, t) => s + t.amount, 0);
    const balance = totalDebit - totalCredit;
    // Positive = You will get (Receivable)
    // Negative = You will give (Payable)
    return { totalDebit, totalCredit, balance };
  }, [transactions]);

  const handleExportPDF = () => {
    if (!customer) return;
    const doc = new jsPDF('p', 'mm', 'a4');
    let y = 20;
    doc.setFontSize(18);
    doc.text(customer.name, 15, y);
    y += 10;
    doc.setFontSize(12);
    doc.text(`Statement: ${dateRange.from} to ${dateRange.to}`, 15, y);
    y += 10;
    doc.text(`Net Balance: Rs. ${Math.abs(stats.balance)} ${stats.balance >= 0 ? 'Dr' : 'Cr'}`, 15, y);
    doc.save(`${customer.name}_Statement.pdf`);
  };

  const openWhatsApp = () => {
    if (customer?.phone) {
      // Clean phone number
      const phone = customer.phone.replace(/\D/g, '');
      const url = `https://wa.me/${phone}`;
      window.open(url, '_blank');
    } else {
      alert('Phone number not available');
    }
  };

  if (!customer) return null;

  return (
    <div className="bg-slate-50 dark:bg-black min-h-screen font-sans flex flex-col">
      {/* Header */}
      <div className="bg-white dark:bg-slate-900 sticky top-0 z-20 px-4 py-3 flex items-center justify-between border-b border-slate-100 dark:border-slate-800 shadow-sm">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="p-2 -ml-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full">
            <ArrowLeft className="w-6 h-6 text-slate-700 dark:text-slate-200" />
          </button>
          <span className="text-lg font-bold text-slate-800 dark:text-white">User Detail</span>
        </div>
        <div className="flex gap-4">
          <button onClick={handleExportPDF} className="text-slate-600 dark:text-slate-300">
            <PdfIcon className="w-6 h-6" />
          </button>
          <button onClick={openWhatsApp} className="text-green-500 hover:text-green-600">
            <MessageCircle className="w-6 h-6 fill-current" />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto pb-32">
        {/* User Profile Card */}
        <div className="p-4 bg-white dark:bg-slate-900 m-4 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 flex items-center gap-4">
          <div className="w-12 h-12 bg-blue-100/50 text-blue-600 rounded-full flex items-center justify-center font-bold text-xl uppercase">
            {customer.name.charAt(0)}
          </div>
          <div>
            <h2 className="text-lg font-black text-slate-900 dark:text-white">
              {customer.name} <span className="text-slate-400 font-normal text-sm">• ID: {customer.id.substring(0, 4)}</span>
            </h2>
            <p className="text-slate-500 font-bold text-sm tracking-widest">{customer.phone}</p>
          </div>
        </div>

        {/* Balance Summary Card */}
        <div className="mx-4 mb-6 bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 overflow-hidden">
          <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
            <span className="font-bold text-slate-700 dark:text-slate-300">
              {stats.balance >= 0 ? 'You will get' : 'You will give'}
            </span>
            <span className={`text-xl font-black ${stats.balance >= 0 ? 'text-red-500' : 'text-green-600'}`}>
              ₹{Math.abs(stats.balance).toFixed(2)}
            </span>
          </div>
          <div className="p-4 flex justify-between text-xs font-bold text-slate-500 uppercase tracking-wider">
            <div>
              Payment in <br />
              <span className="text-green-600 text-sm">₹{stats.totalCredit.toFixed(2)}</span>
            </div>
            <div className="text-right">
              Payment out <br />
              <span className="text-red-500 text-sm">₹{stats.totalDebit.toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* Date Separator (Simple "Transactions" label for now) */}
        <div className="text-center mb-4">
          <span className="bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400 px-3 py-1 rounded-full text-xs font-bold">Transactions</span>
        </div>

        {/* Transactions List */}
        <div className="px-4 space-y-4">
          {transactions.map((t, idx) => (
            <div
              key={`${t.id}-${idx}`}
              onClick={() => t.type === 'INVOICE' ? onViewInvoice(t.original as Invoice) : onEditPayment(t.original as Payment)}
              className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-100 dark:border-slate-800 shadow-sm flex justify-between items-center active:scale-[0.98] transition-all"
            >
              <div className="flex flex-col">
                <span className="text-sm font-bold text-slate-800 dark:text-slate-200 mb-1">
                  {/* Note: 'Payment to you' typically means You Sold functionality? 
                                Wait, 'You gave' button adds to this. 
                                The screenshot says 'Payment to you' with Amount ₹100.
                                If I sold something, I gave goods, so 'You gave'.
                                If I received money, 'You got'.
                                
                                Screenshot Logic:
                                "You will get ₹0.00"
                                "Payment in ₹100.00" (Recieved)
                                List Item: "Payment to you ₹100.0" -> "Paid"
                                
                                If "Payment to you" is listed under a transaction... it means the user (merchant) received payment.
                                So that transaction is 'Customer Paid'.
                                
                                Let's stick to simple:
                                If Debit (Sale) -> "Sale / Goods Given" -> Red Color Amount usually (You gave)
                                If Credit (Receipt) -> "Payment Received" -> Green Color Amount (You got)
                             */}
                  {t.type === 'INVOICE' ? 'Sale / Bill' : (t.isDebit ? 'Payment Given' : 'Payment Received')}
                </span>
                <div className="flex items-center gap-2">
                  {/* Status Indicator */}
                  {t.type === 'INVOICE' && (
                    <span className={`text-[10px] px-1.5 py-0.5 rounded ${(t.original as Invoice).status === 'PAID' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}`}>
                      {(t.original as Invoice).status}
                    </span>
                  )}
                  <span className="text-xs text-slate-400 font-medium">
                    {t.date} • {t.type === 'INVOICE' ? (t.original as Invoice).invoiceNumber : 'Payment'}
                  </span>
                </div>
              </div>
              <div>
                <span className={`text-lg font-black ${t.isDebit ? 'text-red-500' : 'text-green-600'}`}>
                  ₹{t.amount.toLocaleString()}
                </span>
                {/* Arrow icon maybe? */}
              </div>
            </div>
          ))}
          {transactions.length === 0 && (
            <div className="text-center py-10 text-slate-400 italic">No transactions found</div>
          )}
        </div>
      </div>

      {/* Bottom Actions */}
      <div className="fixed bottom-0 left-0 right-0 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 p-4 flex gap-4 z-30">
        <button
          onClick={() => onRecordSale && onRecordSale(customerId)}
          className="flex-1 py-4 rounded-xl bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-900 text-red-600 font-black text-lg shadow-sm active:scale-95 transition-all text-center"
        >
          You gave ₹
        </button>
        <button
          onClick={() => onRecordPayment && onRecordPayment(customerId)}
          className="flex-1 py-4 rounded-xl bg-green-50 dark:bg-green-900/10 border border-green-100 dark:border-green-900 text-green-600 font-black text-lg shadow-sm active:scale-95 transition-all text-center"
        >
          You got ₹
        </button>
      </div>
    </div>
  );
};

export default CustomerLedger;
