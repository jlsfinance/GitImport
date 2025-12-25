
import React, { useState, useEffect } from 'react';
import { Customer, Invoice, Payment } from '../types';
import { StorageService } from '../services/storageService';
import { WhatsAppService } from '../services/whatsappService';
import { UserPlus, Phone, Mail, MapPin, ArrowLeft, FileText, Calendar, Bell, Send, Download, TrendingUp, AlertCircle, Eye, Plus, X, Banknote, CreditCard, MessageCircle, Edit, Trash2 } from 'lucide-react';
import { jsPDF } from 'jspdf';
import InvoiceView from './InvoiceView';
import { HapticService } from '@/services/hapticService';
import { ContactService } from '../services/contactService';

interface CustomersProps {
  onEditInvoice?: (invoice: Invoice) => void;
  onBack?: () => void;
}

interface Transaction {
  id: string;
  date: string;
  type: 'INVOICE' | 'PAYMENT';
  reference: string; // Invoice # or Payment Ref
  amount: number;
  status?: string; // For invoices
  mode?: string; // For payments or invoice mode
  data: Invoice | Payment;
}

const Customers: React.FC<CustomersProps> = ({ onEditInvoice, onBack }) => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [activeTab, setActiveTab] = useState<'HISTORY' | 'STATEMENT' | 'NOTIFICATIONS'>('HISTORY');

  // Invoice Viewing State
  const [viewingInvoice, setViewingInvoice] = useState<Invoice | null>(null);

  // Payment Modal State
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
  const [paymentMode, setPaymentMode] = useState<'CASH' | 'UPI' | 'BANK_TRANSFER' | 'CHEQUE'>('CASH');
  const [paymentNote, setPaymentNote] = useState('');

  // Statement State
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Add Customer Modal State
  const [showAddCustomer, setShowAddCustomer] = useState(false);
  const [newCustomer, setNewCustomer] = useState({
    name: '',
    company: '',
    email: '',
    phone: '',
    address: '',
    state: '',
    gstin: ''
  });
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  // Edit Customer Modal State
  const [showEditCustomer, setShowEditCustomer] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);

  useEffect(() => {
    setCustomers(StorageService.getCustomers());
    // Set default date range for statement (current month)
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];
    setStartDate(firstDay);
    setEndDate(lastDay);
  }, []);

  const handleViewHistory = (customer: Customer) => {
    const allInvoices = StorageService.getInvoices();
    const allPayments = StorageService.getPayments();

    // Filter for this customer
    const custInvoices = allInvoices.filter(inv => inv.customerId === customer.id);
    const custPayments = allPayments.filter(pay => pay.customerId === customer.id);

    // Combine into Transactions
    const txs: Transaction[] = [
      ...custInvoices.map(inv => ({
        id: inv.id,
        date: inv.date,
        type: 'INVOICE' as const,
        reference: inv.invoiceNumber,
        amount: inv.total,
        status: inv.status,
        mode: inv.status === 'PAID' ? 'CASH' : 'CREDIT',
        data: inv
      })),
      ...custPayments.map(pay => ({
        id: pay.id,
        date: pay.date,
        type: 'PAYMENT' as const,
        reference: pay.reference || 'Payment',
        amount: pay.amount,
        mode: pay.mode,
        data: pay
      }))
    ];

    // Sort descending
    txs.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    setTransactions(txs);
    setSelectedCustomer(customer);
    setActiveTab('HISTORY');
  };

  const handleSavePayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomer) return;

    const amount = Number(paymentAmount);
    if (!amount || amount <= 0) return alert("Enter valid amount");

    const payment: Payment = {
      id: crypto.randomUUID(),
      customerId: selectedCustomer.id,
      date: paymentDate,
      amount: amount,
      mode: paymentMode,
      note: paymentNote,
      reference: 'PAY-' + Date.now().toString().slice(-6)
    };

    StorageService.savePayment(payment);

    // Refresh Data
    const updatedCustomers = StorageService.getCustomers();
    setCustomers(updatedCustomers);
    const updatedSel = updatedCustomers.find(c => c.id === selectedCustomer.id) || null;
    setSelectedCustomer(updatedSel);
    if (updatedSel) handleViewHistory(updatedSel); // Refresh list

    setShowPaymentModal(false);
    setPaymentAmount('');
    setPaymentNote('');
    setPaymentMode('CASH');
  };

  const handleShare = (tx: Transaction) => {
    if (!selectedCustomer) return;
    const company = StorageService.getCompanyProfile();

    if (tx.type === 'INVOICE') {
      WhatsAppService.shareInvoice(tx.data as Invoice, selectedCustomer, company);
    } else {
      WhatsAppService.sharePayment(tx.data as Payment, selectedCustomer, company);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PAID': return 'bg-green-100 text-green-800';
      case 'PENDING': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const handleSendReminder = () => {
    if (!selectedCustomer) return;
    StorageService.addNotification(selectedCustomer.id, {
      type: 'REMINDER',
      title: 'Payment Reminder Sent',
      message: `A payment reminder was sent to ${selectedCustomer.email}.`,
      date: new Date().toISOString().split('T')[0]
    });
    alert(`Reminder sent to ${selectedCustomer.email}`);
    // Refresh
    const updatedCustomers = StorageService.getCustomers();
    const updatedSelected = updatedCustomers.find(c => c.id === selectedCustomer.id) || null;
    setCustomers(updatedCustomers);
    setSelectedCustomer(updatedSelected);
  };

  const handleDownloadStatement = () => {
    if (!selectedCustomer) return;

    const company = StorageService.getCompanyProfile();

    // Filter by date and Sort Ascending for Statement
    const filteredTxs = transactions.filter(t =>
      t.date >= startDate && t.date <= endDate
    ).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    const doc = new jsPDF();

    // Header
    doc.setFontSize(18);
    doc.text("STATEMENT OF ACCOUNT", 105, 20, { align: "center" });
    doc.setFontSize(12);
    doc.text(company.name, 105, 30, { align: "center" });

    // Details
    doc.setFontSize(10);
    doc.text(`Customer: ${selectedCustomer.company}`, 14, 50);
    doc.text(`Period: ${startDate} to ${endDate}`, 14, 56);

    // Table Header
    let y = 70;
    doc.setFillColor(240, 240, 240);
    doc.rect(14, y - 6, 182, 8, 'F');
    doc.setFont("helvetica", "bold");
    doc.text("Date", 16, y);
    doc.text("Details / Ref", 45, y);
    doc.text("Debit", 130, y, { align: "right" });
    doc.text("Credit", 160, y, { align: "right" });
    doc.text("Mode", 190, y, { align: "right" });
    doc.setFont("helvetica", "normal");
    y += 10;

    let totalDebit = 0;
    let totalCredit = 0;

    filteredTxs.forEach(tx => {
      doc.text(tx.date, 16, y);
      doc.text(tx.type === 'INVOICE' ? `Inv: ${tx.reference}` : `Pay: ${tx.reference}`, 45, y);

      if (tx.type === 'INVOICE') {
        doc.text(tx.amount.toFixed(2), 130, y, { align: "right" });
        totalDebit += tx.amount;
      } else {
        doc.text("-", 130, y, { align: "right" });
      }

      if (tx.type === 'PAYMENT') {
        doc.text(tx.amount.toFixed(2), 160, y, { align: "right" });
        totalCredit += tx.amount;
      } else {
        doc.text("-", 160, y, { align: "right" });
      }

      doc.text(tx.mode || '-', 190, y, { align: "right" });

      y += 8;
      if (y > 280) {
        doc.addPage();
        y = 20;
      }
    });

    y += 5;
    doc.line(14, y, 196, y);
    y += 8;
    doc.setFont("helvetica", "bold");
    doc.text("Totals:", 100, y);
    doc.text(totalDebit.toFixed(2), 130, y, { align: "right" });
    doc.text(totalCredit.toFixed(2), 160, y, { align: "right" });

    y += 10;
    doc.text("Current Outstanding Balance:", 130, y, { align: "right" });
    doc.text(`Rs. ${selectedCustomer.balance.toFixed(2)}`, 160, y, { align: "right" });

    doc.save(`Statement_${selectedCustomer.name}_${startDate}.pdf`);
  };

  if (selectedCustomer) {
    return (
      <div className="p-4 md:p-6 bg-slate-50 min-h-full relative">
        {/* Overlay for viewing invoice */}
        {viewingInvoice && (
          <div className="fixed inset-0 z-50 bg-slate-100 overflow-y-auto">
            <InvoiceView
              invoice={viewingInvoice}
              onBack={() => setViewingInvoice(null)}
              onEdit={(inv) => {
                setViewingInvoice(null);
                if (onEditInvoice) onEditInvoice(inv);
              }}
            />
          </div>
        )}

        {/* Top Bar */}
        <div className="flex justify-between items-center mb-6">
          <button
            onClick={() => setSelectedCustomer(null)}
            className="flex items-center gap-2 text-slate-600 hover:text-slate-900 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Customers
          </button>
        </div>

        {/* Profile Card */}
        <div className="bg-white dark:bg-slate-800 rounded-[28px] shadow-sm border border-slate-200 dark:border-slate-700 p-6 mb-6">
          <div className="flex flex-col md:flex-row justify-between items-start gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-1">
                <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100">{selectedCustomer.company}</h2>
                <div
                  title="Payment Behavior Score"
                  className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest ${(StorageService.getCustomerBehaviorScore(selectedCustomer.id)) > 80 ? 'bg-green-100 text-green-700' :
                    (StorageService.getCustomerBehaviorScore(selectedCustomer.id)) > 50 ? 'bg-orange-100 text-orange-700' :
                      'bg-red-100 text-red-700'
                    }`}
                >
                  Score: {StorageService.getCustomerBehaviorScore(selectedCustomer.id)}%
                </div>
              </div>
              <div className="flex flex-wrap gap-4 text-slate-600 dark:text-slate-400 mt-2">
                <div className="flex items-center gap-2 text-sm"><Mail className="w-4 h-4" /> {selectedCustomer.email}</div>
                <div className="flex items-center gap-2 text-sm"><Phone className="w-4 h-4" /> {selectedCustomer.phone}</div>
                <div className="flex items-center gap-2 text-sm"><MapPin className="w-4 h-4" /> {selectedCustomer.address}</div>
              </div>
            </div>
            <div className="flex flex-col items-end gap-3 w-full md:w-auto">
              <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-[20px] text-center min-w-[150px] border border-red-100 dark:border-red-900/30 w-full md:w-auto">
                <div className="text-xs text-red-600 dark:text-red-400 uppercase font-bold tracking-wider mb-1">Total Outstanding</div>
                <div className="text-3xl font-black text-red-600 dark:text-red-400">₹{selectedCustomer.balance.toLocaleString()}</div>
              </div>
              <div className="flex gap-2 w-full md:w-auto">
                <button
                  onClick={() => {
                    const note = prompt("Enter follow-up note (e.g., 'Called for payment', 'Agreed to pay by Monday')");
                    if (note) {
                      const updated = { ...selectedCustomer };
                      if (!updated.followUpHistory) updated.followUpHistory = [];
                      updated.followUpHistory.unshift({ date: new Date().toISOString().split('T')[0], note });
                      StorageService.updateCustomer(updated);
                      setSelectedCustomer(updated);
                      HapticService.light();
                    }
                  }}
                  className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 px-4 py-2 rounded-xl font-bold hover:bg-slate-200 transition-colors"
                >
                  <MessageCircle className="w-4 h-4" /> Follow-up
                </button>
                <button
                  onClick={() => setShowPaymentModal(true)}
                  className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-blue-600 text-white px-6 py-2 rounded-xl shadow-lg shadow-blue-500/30 hover:bg-blue-700 transition-colors font-bold"
                >
                  <Banknote className="w-4 h-4" /> Receive Payment
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-4 border-b border-gray-200 mb-6 overflow-x-auto">
          <button
            onClick={() => setActiveTab('HISTORY')}
            className={`pb-2 px-2 text-sm font-medium transition-colors whitespace-nowrap ${activeTab === 'HISTORY' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
          >
            Transaction History
          </button>
          <button
            onClick={() => setActiveTab('STATEMENT')}
            className={`pb-2 px-2 text-sm font-medium transition-colors whitespace-nowrap ${activeTab === 'STATEMENT' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
          >
            Account Statement
          </button>
          <button
            onClick={() => setActiveTab('NOTIFICATIONS')}
            className={`pb-2 px-2 text-sm font-medium transition-colors whitespace-nowrap flex items-center gap-2 ${activeTab === 'NOTIFICATIONS' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
          >
            Notifications & Logs
            {selectedCustomer.notifications && selectedCustomer.notifications.length > 0 && (
              <span className="bg-red-500 text-white text-[10px] px-1.5 rounded-full">
                {selectedCustomer.notifications.length}
              </span>
            )}
          </button>
        </div>

        {/* Tab Content */}
        <div className="bg-white rounded-lg shadow border border-gray-200">

          {/* HISTORY TAB */}
          {activeTab === 'HISTORY' && (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[700px]">
                <thead className="bg-slate-50 border-b">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Date</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Type / Ref</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">Debit (Out)</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">Credit (In)</th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-slate-500 uppercase tracking-wider">Mode</th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-slate-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {transactions.map((tx) => (
                    <tr key={tx.id} className={`hover:bg-slate-50 transition-colors ${tx.type === 'PAYMENT' ? 'bg-green-50/30' : ''}`}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                        <div className="flex items-center gap-2">
                          <Calendar className="w-3 h-3" /> {tx.date}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-700">
                        <div className="flex flex-col">
                          <span className={tx.type === 'INVOICE' ? 'text-blue-600' : 'text-green-600'}>
                            {tx.type === 'INVOICE' ? `Inv #${tx.reference}` : `Pay: ${tx.mode}`}
                          </span>
                          <span className="text-xs text-gray-400">{tx.data.id.slice(0, 8)}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-medium text-slate-900">
                        {tx.type === 'INVOICE' ? `₹${tx.amount.toFixed(2)}` : '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-medium text-green-600">
                        {tx.type === 'PAYMENT' ? `₹${tx.amount.toFixed(2)}` : '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center text-xs">
                        <span className={`px-2 py-1 rounded-full ${tx.type === 'INVOICE' ? getStatusColor(tx.status!) : 'bg-green-100 text-green-800'}`}>
                          {tx.mode}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center flex justify-center gap-2">
                        <button
                          onClick={() => handleShare(tx)}
                          className="text-green-500 hover:text-green-700"
                          title="Share on WhatsApp"
                        >
                          <MessageCircle className="w-4 h-4" />
                        </button>
                        {tx.type === 'INVOICE' && (
                          <button
                            onClick={() => setViewingInvoice(tx.data as Invoice)}
                            className="text-slate-400 hover:text-blue-600"
                            title="View Details"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                  {transactions.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-6 py-12 text-center text-slate-500">
                        <div className="flex flex-col items-center justify-center">
                          <FileText className="w-12 h-12 text-gray-300 mb-2" />
                          <p>No transactions found.</p>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* STATEMENT TAB */}
          {activeTab === 'STATEMENT' && (
            <div className="p-8">
              <div className="max-w-2xl mx-auto">
                <div className="text-center mb-8">
                  <TrendingUp className="w-12 h-12 text-blue-500 mx-auto mb-3" />
                  <h3 className="text-lg font-bold text-slate-800">Generate Account Statement</h3>
                  <p className="text-slate-500">Select a date range to download a PDF statement of all transactions.</p>
                </div>

                <div className="bg-slate-50 p-6 rounded-lg border border-slate-200 grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Start Date</label>
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="w-full border border-slate-300 rounded-md p-2"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">End Date</label>
                    <input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="w-full border border-slate-300 rounded-md p-2"
                    />
                  </div>
                </div>

                <button
                  onClick={handleDownloadStatement}
                  className="w-full flex items-center justify-center gap-2 bg-slate-800 text-white py-3 rounded-lg hover:bg-slate-900 transition-all"
                >
                  <Download className="w-5 h-5" /> Download PDF Statement
                </button>
              </div>
            </div>
          )}

          {/* NOTIFICATIONS TAB */}
          {activeTab === 'NOTIFICATIONS' && (
            <div className="p-4 md:p-6">
              <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-4">Follow-up History</h3>
              <div className="space-y-3 mb-8">
                {(selectedCustomer.followUpHistory || []).map((follow, idx) => (
                  <div key={idx} className="p-3 bg-blue-50/50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-900/30 rounded-xl">
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-sm font-bold text-blue-700 dark:text-blue-400">{follow.note}</span>
                      <span className="text-[10px] text-slate-400 font-bold uppercase">{follow.date}</span>
                    </div>
                  </div>
                ))}
                {(!selectedCustomer.followUpHistory || selectedCustomer.followUpHistory.length === 0) && (
                  <p className="text-xs text-slate-400 italic">No follow-up notes logged yet.</p>
                )}
              </div>

              <div className="flex justify-between items-center mb-6">
                <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider">Activity Log & Notifications</h3>
                <button
                  onClick={handleSendReminder}
                  className="flex items-center gap-2 text-sm bg-indigo-50 text-indigo-600 px-3 py-2 rounded hover:bg-indigo-100"
                >
                  <Send className="w-4 h-4" /> Send Payment Reminder
                </button>
              </div>

              <div className="space-y-4">
                {(selectedCustomer.notifications || []).map((notif) => (
                  <div key={notif.id} className="flex gap-4 p-4 bg-slate-50 rounded-lg border border-slate-100">
                    <div className={`p-2 rounded-full h-fit ${notif.type === 'INVOICE' ? 'bg-blue-100 text-blue-600' :
                      notif.type === 'REMINDER' ? 'bg-orange-100 text-orange-600' :
                        notif.type === 'PAYMENT' ? 'bg-green-100 text-green-600' :
                          'bg-gray-200 text-gray-600'
                      }`}>
                      {notif.type === 'INVOICE' ? <FileText className="w-5 h-5" /> :
                        notif.type === 'REMINDER' ? <AlertCircle className="w-5 h-5" /> :
                          notif.type === 'PAYMENT' ? <Banknote className="w-5 h-5" /> :
                            <Bell className="w-5 h-5" />}
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-800 text-sm">{notif.title}</h4>
                      <p className="text-sm text-slate-600 mb-1">{notif.message}</p>
                      <span className="text-xs text-slate-400">{notif.date}</span>
                    </div>
                  </div>
                ))}
                {(!selectedCustomer.notifications || selectedCustomer.notifications.length === 0) && (
                  <div className="text-center py-10 text-gray-400">No notifications yet.</div>
                )}
              </div>
            </div>
          )}

        </div>

        {/* Payment Modal */}
        {showPaymentModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6 animate-in fade-in zoom-in duration-200">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-bold text-slate-900">Receive Payment</h3>
                <button onClick={() => setShowPaymentModal(false)}><X className="w-5 h-5 text-gray-400 hover:text-gray-600" /></button>
              </div>
              <form onSubmit={handleSavePayment} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Amount (₹)</label>
                  <input
                    type="number"
                    required
                    value={paymentAmount}
                    onChange={(e) => setPaymentAmount(e.target.value)}
                    className="w-full border border-slate-300 rounded-md p-2 text-lg font-bold"
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                  <input
                    type="date"
                    required
                    value={paymentDate}
                    onChange={(e) => setPaymentDate(e.target.value)}
                    className="w-full border border-slate-300 rounded-md p-2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Payment Mode</label>
                  <select
                    value={paymentMode}
                    onChange={(e) => setPaymentMode(e.target.value as any)}
                    className="w-full border border-slate-300 rounded-md p-2"
                  >
                    <option value="CASH">Cash</option>
                    <option value="UPI">UPI / Online</option>
                    <option value="BANK_TRANSFER">Bank Transfer</option>
                    <option value="CHEQUE">Cheque</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Note / Reference</label>
                  <input
                    type="text"
                    value={paymentNote}
                    onChange={(e) => setPaymentNote(e.target.value)}
                    className="w-full border border-slate-300 rounded-md p-2"
                    placeholder="Optional"
                  />
                </div>
                <button
                  type="submit"
                  className="w-full bg-green-600 text-white py-3 rounded-lg font-bold hover:bg-green-700 mt-2"
                >
                  Save Payment
                </button>
              </form>
            </div>
          </div>
        )}
      </div>
    );
  }

  const handleAddCustomer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCustomer.name || !newCustomer.company || !newCustomer.email) {
      alert("Please fill name, company, and email");
      return;
    }

    const customer: Customer = {
      id: crypto.randomUUID(),
      name: newCustomer.name,
      company: newCustomer.company,
      email: newCustomer.email,
      phone: newCustomer.phone,
      address: newCustomer.address,
      state: newCustomer.state,
      gstin: newCustomer.gstin,
      balance: 0,
      notifications: []
    };

    StorageService.saveCustomer(customer);
    setCustomers(StorageService.getCustomers());
    setShowAddCustomer(false);
    setNewCustomer({ name: '', company: '', email: '', phone: '', address: '', state: '', gstin: '' });
    alert("Customer added successfully!");
  };

  const handleEditCustomer = (customer: Customer) => {
    setEditingCustomer({ ...customer });
    setShowEditCustomer(true);
  };

  const handleSaveEditCustomer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCustomer) return;
    if (!editingCustomer.name || !editingCustomer.company || !editingCustomer.email) {
      alert("Please fill name, company, and email");
      return;
    }

    StorageService.updateCustomer(editingCustomer);
    setCustomers(StorageService.getCustomers());
    setShowEditCustomer(false);
    setEditingCustomer(null);
    alert("Customer updated successfully!");
  };

  const handleDeleteCustomer = (customerId: string) => {
    if (!confirm("Are you sure you want to delete this customer? This will also affect all their invoices and payments.")) {
      return;
    }
    StorageService.deleteCustomer(customerId);
    setCustomers(StorageService.getCustomers());
    setShowEditCustomer(false);
    setEditingCustomer(null);
  };

  // Get GST status from company - fetch fresh when modal is about to open
  const getCurrentGstEnabled = () => {
    const company = StorageService.getCompanyProfile();
    return !!(company?.gst_enabled || company?.gst);
  };

  return (
    <div className="p-4 md:p-6">
      {/* Edit Customer Modal */}
      {showEditCustomer && editingCustomer && (() => {
        const gstEnabled = getCurrentGstEnabled();
        return (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6 animate-in fade-in zoom-in duration-200 max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-4 sticky top-0 bg-white">
                <h3 className="text-lg font-bold text-slate-900">Edit Customer</h3>
                <button onClick={() => { setShowEditCustomer(false); setEditingCustomer(null); }} className="p-1"><X className="w-5 h-5 text-gray-400 hover:text-gray-600" /></button>
              </div>
              <form onSubmit={handleSaveEditCustomer} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Customer Name *</label>
                  <input
                    type="text"
                    required
                    value={editingCustomer.name}
                    onChange={(e) => setEditingCustomer({ ...editingCustomer, name: e.target.value })}
                    className="w-full border border-slate-300 rounded-md p-2 text-sm"
                    placeholder="Full name"
                    data-testid="input-edit-customer-name"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Company Name *</label>
                  <input
                    type="text"
                    required
                    value={editingCustomer.company}
                    onChange={(e) => setEditingCustomer({ ...editingCustomer, company: e.target.value })}
                    className="w-full border border-slate-300 rounded-md p-2 text-sm"
                    placeholder="Company name"
                    data-testid="input-edit-company-name"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
                  <input
                    type="email"
                    required
                    value={editingCustomer.email}
                    onChange={(e) => setEditingCustomer({ ...editingCustomer, email: e.target.value })}
                    className="w-full border border-slate-300 rounded-md p-2 text-sm"
                    placeholder="email@example.com"
                    data-testid="input-edit-email"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                  <input
                    type="tel"
                    value={editingCustomer.phone}
                    onChange={(e) => setEditingCustomer({ ...editingCustomer, phone: e.target.value })}
                    className="w-full border border-slate-300 rounded-md p-2 text-sm"
                    placeholder="10-digit number"
                    data-testid="input-edit-phone"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                  <textarea
                    value={editingCustomer.address}
                    onChange={(e) => setEditingCustomer({ ...editingCustomer, address: e.target.value })}
                    rows={2}
                    className="w-full border border-slate-300 rounded-md p-2 text-sm resize-none"
                    placeholder="Billing address"
                    data-testid="textarea-edit-address"
                  />
                </div>
                {gstEnabled && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">State</label>
                      <input
                        type="text"
                        value={editingCustomer.state || ''}
                        onChange={(e) => setEditingCustomer({ ...editingCustomer, state: e.target.value })}
                        className="w-full border border-slate-300 rounded-md p-2 text-sm"
                        placeholder="State name"
                        data-testid="input-edit-state"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">GST Number (Optional)</label>
                      <input
                        type="text"
                        value={editingCustomer.gstin || ''}
                        onChange={(e) => setEditingCustomer({ ...editingCustomer, gstin: e.target.value })}
                        className="w-full border border-slate-300 rounded-md p-2 text-sm"
                        placeholder="15-digit GSTIN"
                        maxLength={15}
                        data-testid="input-edit-gstin"
                      />
                    </div>
                  </>
                )}
                <div className="flex gap-3">
                  <button
                    type="submit"
                    className="flex-1 bg-blue-600 text-white py-2 rounded-lg font-bold hover:bg-blue-700"
                    data-testid="button-save-customer"
                  >
                    Save Changes
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteCustomer(editingCustomer.id)}
                    className="px-4 bg-red-50 text-red-600 py-2 rounded-lg font-bold hover:bg-red-100 flex items-center gap-2"
                    data-testid="button-delete-customer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </form>
            </div>
          </div>
        );
      })()}

      {/* Add Customer Modal */}
      {showAddCustomer && (() => {
        const gstEnabled = getCurrentGstEnabled();
        return (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6 animate-in fade-in zoom-in duration-200 max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-4 sticky top-0 bg-white">
                <h3 className="text-lg font-bold text-slate-900">Add New Customer</h3>
                <button onClick={() => setShowAddCustomer(false)} className="p-1"><X className="w-5 h-5 text-gray-400 hover:text-gray-600" /></button>
              </div>
              <form onSubmit={handleAddCustomer} className="space-y-4">
                <div className="relative">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Customer Name *</label>
                  <input
                    type="text"
                    required
                    value={newCustomer.name}
                    onChange={async (e) => {
                      const val = e.target.value;
                      setNewCustomer({ ...newCustomer, name: val });
                      if (val.length >= 2) {
                        const results = await ContactService.getCombinedContacts(val);
                        setSuggestions(results);
                        setShowSuggestions(true);
                      } else {
                        setShowSuggestions(false);
                      }
                    }}
                    onFocus={() => { if (newCustomer.name.length >= 2) setShowSuggestions(true); }}
                    className="w-full border border-slate-300 rounded-md p-2 text-sm"
                    placeholder="Full name"
                    data-testid="input-customer-name"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Company Name *</label>
                  <input
                    type="text"
                    required
                    value={newCustomer.company}
                    onChange={(e) => setNewCustomer({ ...newCustomer, company: e.target.value })}
                    className="w-full border border-slate-300 rounded-md p-2 text-sm"
                    placeholder="Company name"
                    data-testid="input-company-name"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
                  <input
                    type="email"
                    required
                    value={newCustomer.email}
                    onChange={(e) => setNewCustomer({ ...newCustomer, email: e.target.value })}
                    className="w-full border border-slate-300 rounded-md p-2 text-sm"
                    placeholder="email@example.com"
                    data-testid="input-email"
                  />
                </div>
                <div className="relative">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                  <input
                    type="tel"
                    value={newCustomer.phone}
                    onChange={async (e) => {
                      const val = e.target.value;
                      setNewCustomer({ ...newCustomer, phone: val });

                      const res = await ContactService.resolveName(val);
                      if (res.name && !newCustomer.name) {
                        setNewCustomer(prev => ({ ...prev, name: res.name, phone: val }));
                      }

                      if (val.length >= 2) {
                        const results = await ContactService.getCombinedContacts(val);
                        setSuggestions(results);
                        setShowSuggestions(true);
                      } else {
                        setShowSuggestions(false);
                      }
                    }}
                    onFocus={() => { if (newCustomer.phone.length >= 2) setShowSuggestions(true); }}
                    onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                    className="w-full border border-slate-300 rounded-md p-2 text-sm"
                    placeholder="10-digit number"
                    data-testid="input-phone"
                  />

                  {showSuggestions && suggestions.length > 0 && (
                    <div className="absolute z-[120] left-0 right-0 top-full mt-1 bg-white border border-slate-200 rounded-lg shadow-xl max-h-48 overflow-y-auto p-1">
                      {suggestions.map((s, i) => (
                        <button
                          key={i}
                          type="button"
                          onClick={() => {
                            setNewCustomer(prev => ({ ...prev, name: s.name, phone: s.phone }));
                            setShowSuggestions(false);
                          }}
                          className="w-full p-2 flex items-center gap-3 hover:bg-slate-50 transition-colors text-left border-b border-slate-50 last:border-0"
                        >
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${s.source === 'db' ? 'bg-blue-100 text-blue-600' : 'bg-green-100 text-green-600'}`}>
                            {s.source === 'db' ? 'DB' : 'PH'}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-xs font-bold text-slate-800 truncate">{s.name}</div>
                            <div className="text-[10px] text-slate-400">{s.phone}</div>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                  <textarea
                    value={newCustomer.address}
                    onChange={(e) => setNewCustomer({ ...newCustomer, address: e.target.value })}
                    rows={2}
                    className="w-full border border-slate-300 rounded-md p-2 text-sm resize-none"
                    placeholder="Billing address"
                    data-testid="textarea-address"
                  />
                </div>
                {gstEnabled && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">State</label>
                      <input
                        type="text"
                        value={newCustomer.state}
                        onChange={(e) => setNewCustomer({ ...newCustomer, state: e.target.value })}
                        className="w-full border border-slate-300 rounded-md p-2 text-sm"
                        placeholder="State name"
                        data-testid="input-state"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">GST Number (Optional)</label>
                      <input
                        type="text"
                        value={newCustomer.gstin}
                        onChange={(e) => setNewCustomer({ ...newCustomer, gstin: e.target.value })}
                        className="w-full border border-slate-300 rounded-md p-2 text-sm"
                        placeholder="15-digit GSTIN"
                        maxLength={15}
                        data-testid="input-gstin"
                      />
                      <p className="text-xs text-gray-500 mt-1">Only visible when GST is enabled in Settings</p>
                    </div>
                  </>
                )}
                <button
                  type="submit"
                  className="w-full bg-blue-600 text-white py-2 rounded-lg font-bold hover:bg-blue-700"
                  data-testid="button-add-customer"
                >
                  Add Customer
                </button>
              </form>
            </div>
          </div>
        );
      })()}

      <div className="p-4 md:p-6 bg-slate-50 min-h-full">
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-2">
            {onBack && (
              <button onClick={onBack} className="p-2 -ml-2 rounded-full hover:bg-slate-200">
                <ArrowLeft className="w-6 h-6 text-slate-700" />
              </button>
            )}
            <h2 className="text-2xl font-bold text-slate-800">Customers</h2>
          </div>
          <button
            onClick={() => setShowAddCustomer(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-700 font-medium shadow-sm transition-all"
          >
            <UserPlus className="w-5 h-5" />
            <span className="hidden sm:inline">Add Customer</span>
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {customers.map(customer => (
            <div
              key={customer.id}
              onClick={() => handleViewHistory(customer)}
              className="bg-white p-5 rounded-xl shadow-sm border border-slate-100 hover:shadow-md transition-all cursor-pointer group"
            >
              <div className="flex justify-between items-start mb-3">
                <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center font-bold text-lg group-hover:bg-blue-100 transition-colors">
                  {customer.company.charAt(0)}
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); handleEditCustomer(customer); }}
                  className="p-2 text-slate-400 hover:text-blue-600 hover:bg-slate-50 rounded-full transition-colors"
                >
                  <Edit className="w-4 h-4" />
                </button>
              </div>

              <h3 className="font-bold text-slate-800 text-lg mb-1 truncate">{customer.company}</h3>
              <p className="text-slate-500 text-sm mb-4 truncate">{customer.name}</p>

              <div className="flex flex-col gap-2 border-t border-slate-50 pt-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-500">Balance</span>
                  <span className={`font-bold ${customer.balance > 0 ? 'text-red-600' : 'text-green-600'}`}>
                    ₹{customer.balance.toLocaleString()}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Customers;
