import React, { useState, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { WhatsAppNumberModal } from '@/components/WhatsAppNumberModal';
import { InputModal } from '@/components/InputModal';
import { ConfirmationModal } from '@/components/ConfirmationModal';
import { AlertModal } from '@/components/AlertModal';
import { Customer, Invoice, Payment } from '../types';
import { StorageService } from '../services/storageService';
import { WhatsAppService } from '../services/whatsappService';
import { Search, Phone, Mail, MapPin, ArrowLeft, FileText, Download, TrendingUp, Eye, X, Banknote, MessageCircle, Edit, Trash2, Plus, ChevronRight } from 'lucide-react';
import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { jsPDF } from 'jspdf';
import InvoiceView from './InvoiceView';
import { HapticService } from '@/services/hapticService';
import { ContactsService } from '@/services/contactsService';
import { formatDate } from '../utils/dateUtils';

interface CustomersProps {
  onEditInvoice?: (invoice: Invoice) => void;
  onBack?: () => void;
  initialCustomerId?: string;
}

interface Transaction {
  id: string;
  date: string;
  type: 'INVOICE' | 'PAYMENT' | 'CREDIT_NOTE';
  reference: string; // Invoice # or Payment Ref
  amount: number;
  status?: string; // For invoices
  mode?: string; // For payments or invoice mode
  data: Invoice | Payment;
}

const Customers: React.FC<CustomersProps> = ({ onEditInvoice, onBack, initialCustomerId }) => {
  const [customers, setCustomers] = useState<Customer[]>([]);

  // Use a function to initialize state so it runs only once
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(() => {
    if (initialCustomerId) {
      const all = StorageService.getCustomers();
      return all.find(c => c.id === initialCustomerId) || null;
    }
    return null;
  });
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [activeTab, setActiveTab] = useState<'HISTORY' | 'STATEMENT' | 'NOTIFICATIONS'>('HISTORY');

  // Invoice Viewing State
  const [viewingInvoice, setViewingInvoice] = useState<Invoice | null>(null);

  // Payment Modal State
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showWhatsAppModal, setShowWhatsAppModal] = useState(false);
  const [showNoteModal, setShowNoteModal] = useState(false);
  const [pendingShareTx, setPendingShareTx] = useState<Transaction | null>(null);

  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
  const [paymentMode, setPaymentMode] = useState<'CASH' | 'UPI' | 'BANK_TRANSFER' | 'CHEQUE'>('CASH');
  const [paymentNote, setPaymentNote] = useState('');

  // Statement State
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // History Date Filter State
  const [historyFromDate, setHistoryFromDate] = useState('');
  const [historyToDate, setHistoryToDate] = useState('');

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

  const [showEditCustomer, setShowEditCustomer] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  // Modal States
  const [customerToDelete, setCustomerToDelete] = useState<string | null>(null);
  const [alertConfig, setAlertConfig] = useState<{ isOpen: boolean; title: string; message: string; variant?: 'success' | 'danger' | 'info' | 'warning' } | null>(null);

  const showAlert = (title: string, message: string, variant: 'success' | 'danger' | 'info' | 'warning' = 'info') => {
    setAlertConfig({ isOpen: true, title, message, variant });
  };

  const getCurrentGstEnabled = () => {
    const company = StorageService.getCompanyProfile();
    return company.gst_enabled;
  };

  const gstEnabledVal = getCurrentGstEnabled();

  useEffect(() => {
    setCustomers(StorageService.getCustomers());
    // Set default date range for statement (current month)
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];
    setStartDate(firstDay);
    setEndDate(lastDay);

    // Set history date filter to show all by default (last 1 year)
    const oneYearAgo = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate()).toISOString().split('T')[0];
    setHistoryFromDate(oneYearAgo);
    setHistoryToDate(lastDay);
  }, []);

  // Load history whenever selected customer changes
  useEffect(() => {
    if (selectedCustomer) {
      const allInvoices = StorageService.getInvoices();
      const allPayments = StorageService.getPayments();

      // Filter for this customer
      const custInvoices = allInvoices.filter(inv => inv.customerId === selectedCustomer.id);
      const custPayments = allPayments.filter(pay => pay.customerId === selectedCustomer.id);

      // Combine into Transactions
      const txs: Transaction[] = [
        ...custInvoices.map(inv => ({
          id: inv.id,
          date: inv.date,
          type: (inv.type === 'CREDIT_NOTE' ? 'CREDIT_NOTE' : 'INVOICE') as 'INVOICE' | 'CREDIT_NOTE',
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
      setActiveTab('HISTORY');
    }
  }, [selectedCustomer]);

  const handleViewHistory = (customer: Customer) => {
    setSelectedCustomer(customer);
  };

  const handleSavePayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomer) return;

    const amount = Number(paymentAmount);
    if (!amount || amount <= 0) {
      showAlert('Invalid Amount', 'Please enter a valid amount.', 'warning');
      return;
    }

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

    // Show Success Modal via Alert? No, just close. Or Toast. 
    // User requested "Pop up redesign".
    showAlert('Payment Recorded', `Received ₹${amount} from ${selectedCustomer.company}`, 'success');

    setShowPaymentModal(false);
    setPaymentAmount('');
    setPaymentNote('');
    setPaymentMode('CASH');
  };

  const handleShare = (tx: Transaction) => {
    if (!selectedCustomer) return;
    const company = StorageService.getCompanyProfile();

    if (selectedCustomer.phone) {
      if (tx.type === 'INVOICE') {
        WhatsAppService.shareInvoice(tx.data as Invoice, selectedCustomer, company);
      } else {
        WhatsAppService.sharePayment(tx.data as Payment, selectedCustomer, company);
      }
    } else {
      setPendingShareTx(tx);
      setShowWhatsAppModal(true);
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

    showAlert('Reminder Sent', `Reminder sent to ${selectedCustomer.email}`, 'success');
    // Refresh
    const updatedCustomers = StorageService.getCustomers();
    const updatedSelected = updatedCustomers.find(c => c.id === selectedCustomer.id) || null;
    setCustomers(updatedCustomers);
    setSelectedCustomer(updatedSelected);
  };

  const handleDownloadStatement = async () => {
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
    doc.text(`Customer: ${selectedCustomer.company} `, 14, 50);
    doc.text(`Period: ${formatDate(startDate)} to ${formatDate(endDate)} `, 14, 56);

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
      doc.text(formatDate(tx.date), 16, y);
      doc.text(tx.type === 'INVOICE' ? `Inv: ${tx.reference}` : tx.type === 'CREDIT_NOTE' ? `Ret: ${tx.reference}` : `Pay: ${tx.reference}`, 45, y);

      if (tx.type === 'INVOICE') {
        doc.text(tx.amount.toFixed(2), 130, y, { align: "right" });
        totalDebit += tx.amount;
      } else {
        doc.text("-", 130, y, { align: "right" });
      }

      if (tx.type === 'PAYMENT' || tx.type === 'CREDIT_NOTE') {
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
    doc.text(`Rs.${selectedCustomer.balance.toFixed(2)} `, 160, y, { align: "right" });

    // Unified Save/Share Logic
    const fileName = `Statement_${selectedCustomer.name.replace(/[^a-zA-Z0-9]/g, '_')}_${startDate}.pdf`;
    if (Capacitor.isNativePlatform()) {
      try {
        const pdfBase64 = doc.output('datauristring').split(',')[1];
        const cacheResult = await Filesystem.writeFile({
          path: fileName,
          data: pdfBase64,
          directory: Directory.Cache
        });

        await Share.share({
          title: fileName,
          url: cacheResult.uri,
          dialogTitle: 'Save or Share Statement...'
        });
      } catch (err) {
        console.error('Mobile PDF share failed:', err);
        alert('Could not share PDF. Please check permissions.');
      }
    } else {
      doc.save(fileName);
    }
  };

  const handleDownloadHistoryStatement = async () => {
    if (!selectedCustomer) return;

    const company = StorageService.getCompanyProfile();
    const todayDate = formatDate(new Date());

    // Filter by history date range and Sort Ascending
    const filteredTxs = transactions.filter(t =>
      t.date >= historyFromDate && t.date <= historyToDate
    ).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    const doc = new jsPDF('p', 'mm', 'a4');
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 15;
    let y = 20;

    // ═══════════════════════════════════════════════════════════
    // HEADER - Company Name
    // ═══════════════════════════════════════════════════════════
    doc.setFontSize(18);
    doc.setFont("helvetica", "bold");
    doc.text(company.name.toUpperCase(), pageWidth / 2, y, { align: 'center' });

    y += 10;
    doc.setFontSize(11);
    doc.setFont("helvetica", "normal");
    doc.text(`Ledger Report of ${(selectedCustomer.name || selectedCustomer.company || 'Customer').toUpperCase()}`, pageWidth / 2, y, { align: 'center' });

    y += 6;
    doc.setFontSize(9);
    doc.text(`Period: ${historyFromDate} to ${historyToDate}`, pageWidth / 2, y, { align: 'center' });

    y += 8;
    // Horizontal line
    doc.setLineWidth(0.5);
    doc.line(margin, y, pageWidth - margin, y);
    y += 2;
    doc.line(margin, y, pageWidth - margin, y);

    y += 10;

    // ═══════════════════════════════════════════════════════════
    // T-FORMAT LEDGER: DEBIT | CREDIT
    // ═══════════════════════════════════════════════════════════

    const centerX = pageWidth / 2;
    const colWidth = (pageWidth - (margin * 2)) / 2;

    // Column Headers
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.text("DEBIT SIDE", margin + colWidth / 2, y, { align: 'center' });
    doc.text("CREDIT SIDE", centerX + colWidth / 2, y, { align: 'center' });

    y += 6;

    // Sub-headers
    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");

    // Debit side headers
    // Debit side headers
    doc.text("Date", margin + 2, y);
    doc.text("Particulars", margin + 18, y);
    doc.text("St.", margin + colWidth - 18, y); // Status Column
    doc.text("Amount", margin + colWidth - 2, y, { align: 'right' });

    // Credit side headers
    doc.text("Date", centerX + 2, y);
    doc.text("Particulars", centerX + 18, y);
    doc.text("Amount", pageWidth - margin - 2, y, { align: 'right' });

    y += 5;

    // Separator line
    doc.setLineWidth(0.3);
    doc.line(margin, y, pageWidth - margin, y);

    y += 5;

    // Separate Debits and Credits
    const debits = filteredTxs.filter(tx => tx.type === 'INVOICE');
    const credits = filteredTxs.filter(tx => tx.type === 'PAYMENT' || tx.type === 'CREDIT_NOTE');

    let debitTotal = 0;
    let creditTotal = 0;

    const maxRows = Math.max(debits.length, credits.length);
    const startY = y;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);

    for (let i = 0; i < maxRows; i++) {
      if (y > pageHeight - 50) {
        doc.addPage();
        y = 20;
      }

      // DEBIT SIDE
      if (i < debits.length) {
        const deb = debits[i];
        const isPaid = deb.status === 'PAID';

        doc.setTextColor(0, 0, 0); // Always black for B&W compatibility

        doc.text(deb.date, margin + 2, y);

        // Truncate reference if too long
        const ref = deb.reference.length > 12 ? deb.reference.slice(0, 10) + '..' : deb.reference;
        doc.text(`Sale - #${ref}`, margin + 18, y);

        // Status Column
        doc.setFont("helvetica", isPaid ? "normal" : "bold");
        doc.text(isPaid ? "PAID" : "DUE", margin + colWidth - 18, y);
        doc.setFont("helvetica", "normal");

        // Amount
        const amountStr = deb.amount.toFixed(2);
        const amountX = margin + colWidth - 2;
        doc.text(amountStr, amountX, y, { align: 'right' });

        // Strikethrough if PAID
        if (isPaid) {
          const textWidth = doc.getTextWidth(amountStr);
          doc.setLineWidth(0.4);
          doc.setDrawColor(50, 50, 50); // Dark grey line
          // Adjust coordinates to strike through center of text
          // amountX is right aligned, so start x is (amountX - textWidth)
          doc.line(amountX - textWidth, y - 1, amountX, y - 1);
          doc.setDrawColor(0, 0, 0); // Reset
        }

        // Only add to debitTotal if invoice is PENDING (not paid)
        // WAIT: In double entry, we sum ALL debits usually. 
        // But this specific logic seems to exclude paid invoices from total?
        // Checking original logic: "Only add to debitTotal if invoice is PENDING"
        // Yes, existing logic excludes paid invoices from total calculation?
        // Let's verify line 456 of original file.
        // Yes: "if (!isPaid) { debitTotal += deb.amount; }"
        // Keeping logic identical to preserve balance calculation.
        if (!isPaid) {
          debitTotal += deb.amount;
        }
      }

      // CREDIT SIDE
      if (i < credits.length) {
        const cred = credits[i];
        const credLabel = cred.type === 'CREDIT_NOTE' ? `Ret - ${cred.reference}` : `Pay - ${cred.mode}`;
        doc.text(cred.date, centerX + 2, y);
        doc.text(credLabel, centerX + 18, y);
        doc.text(cred.amount.toFixed(2), pageWidth - margin - 2, y, { align: 'right' });
        creditTotal += cred.amount;
      }

      y += 5;
    }

    // Add vertical separator line between columns
    doc.setLineWidth(0.3);
    doc.line(centerX, startY - 5, centerX, y);

    // ═══════════════════════════════════════════════════════════
    // TOTALS and CLOSING BALANCE
    // ═══════════════════════════════════════════════════════════

    y += 3;
    doc.setLineWidth(0.5);
    doc.line(margin, y, pageWidth - margin, y);
    y += 6;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);

    // Calculate actual closing balance from transactions
    const closingBalance = debitTotal - creditTotal;

    // Debit Total
    doc.text(debitTotal.toFixed(2), margin + colWidth - 2, y, { align: 'right' });

    // Credit Total
    doc.text("Total Cr.", centerX + 2, y);
    doc.text(creditTotal.toFixed(2), pageWidth - margin - 2, y, { align: 'right' });

    y += 8;

    // Closing Balance Row
    if (closingBalance >= 0) {
      // Dr. Balance - show on credit side to balance the ledger
      doc.text("Closing Balance (Dr.)", centerX + 2, y);
      doc.text(closingBalance.toFixed(2), pageWidth - margin - 5, y, { align: 'right' });
    } else {
      // Cr. Balance - show on debit side to balance the ledger
      doc.text("Closing Balance (Cr.)", margin + 2, y);
      doc.text(Math.abs(closingBalance).toFixed(2), margin + colWidth - 5, y, { align: 'right' });
    }

    y += 10;

    // ═══════════════════════════════════════════════════════════
    // OUTSTANDING BALANCE MESSAGE
    // ═══════════════════════════════════════════════════════════

    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    const balanceMsg = closingBalance >= 0
      ? `Aapka Balance baaki hai Rs ${closingBalance.toFixed(2)} (Dr.)`
      : `Aap humein dene hain Rs ${Math.abs(closingBalance).toFixed(2)} (Cr.)`;
    doc.text(balanceMsg, pageWidth / 2, y, { align: 'center' });

    y += 15;

    // ═══════════════════════════════════════════════════════════
    // UPI QR CODE
    // ═══════════════════════════════════════════════════════════

    if (company.upiId && closingBalance > 0 && y < pageHeight - 70) {
      try {
        const QRCode = (await import('qrcode')).default;
        const upiUrl = `upi://pay?pa=${company.upiId}&pn=${encodeURIComponent(company.name)}&am=${closingBalance.toFixed(2)}&cu=INR&tn=Payment`;
        const qrDataUrl = await QRCode.toDataURL(upiUrl);

        doc.setFontSize(10);
        doc.setFont("helvetica", "bold");
        doc.text("Scan to Pay", pageWidth / 2, y, { align: 'center' });

        y += 5;
        const qrSize = 45;
        doc.addImage(qrDataUrl, 'PNG', pageWidth / 2 - qrSize / 2, y, qrSize, qrSize);

        y += qrSize + 3;
        doc.setFontSize(8);
        doc.setFont("helvetica", "normal");
        doc.text(`UPI: ${company.upiId}`, pageWidth / 2, y, { align: 'center' });
      } catch (error) {
        console.error('QR generation failed:', error);
      }
    }

    // Footer - Company Name
    const footerY = pageHeight - 15;
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.text(company.name.toUpperCase(), pageWidth - margin - 5, footerY, { align: 'right' });

    // Unified Save/Share Logic
    const fileName = `Ledger_${selectedCustomer.company.replace(/[^a-zA-Z0-9]/g, '_')}_${todayDate}.pdf`;
    if (Capacitor.isNativePlatform()) {
      try {
        const pdfBase64 = doc.output('datauristring').split(',')[1];
        const cacheResult = await Filesystem.writeFile({
          path: fileName,
          data: pdfBase64,
          directory: Directory.Cache
        });

        await Share.share({
          title: fileName,
          url: cacheResult.uri,
          dialogTitle: 'Save or Share Ledger...'
        });
      } catch (err) {
        console.error('Mobile PDF share failed:', err);
        alert('Could not share PDF. Please check permissions.');
      }
    } else {
      doc.save(fileName);
    }
  };

  if (selectedCustomer) {
    // Filter transactions by history date range
    const filteredHistoryTransactions = transactions.filter(tx =>
      tx.date >= historyFromDate && tx.date <= historyToDate
    );

    return (
      <div className="bg-surface-container-low min-h-screen font-sans">
        {/* Overlay for viewing invoice */}
        <AnimatePresence>
          {viewingInvoice && (
            <motion.div
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 50 }}
              className="fixed inset-0 z-[60] bg-surface overflow-y-auto"
            >
              <InvoiceView
                invoice={viewingInvoice}
                onBack={() => setViewingInvoice(null)}
                onEdit={(inv) => {
                  setViewingInvoice(null);
                  if (onEditInvoice) onEditInvoice(inv);
                }}
              />
            </motion.div>
          )}
        </AnimatePresence>

        <div className="max-w-7xl mx-auto p-4 md:p-8 space-y-8">
          {/* Top Navigation */}
          <div className="flex items-center gap-4 pt-safe">
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={() => {
                if (initialCustomerId && onBack) {
                  onBack();
                } else {
                  setSelectedCustomer(null);
                }
              }}
              className="w-12 h-12 rounded-full bg-surface-container-high flex items-center justify-center text-foreground hover:bg-surface-container-highest transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </motion.button>
            <h2 className="text-xl font-bold text-foreground">Client Profile</h2>
          </div>

          {/* Expressive Profile Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-surface rounded-[40px] shadow-sm border border-border p-8 relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-64 h-64 bg-surface-container-high/50 rounded-full -mr-20 -mt-20 blur-3xl pointer-events-none" />

            <div className="flex flex-col lg:flex-row justify-between items-start gap-8 relative">
              <div className="flex-1 space-y-6">
                <div>
                  <div className="flex items-center gap-4 mb-2">
                    <div className="w-16 h-16 rounded-[24px] bg-google-blue/10 flex items-center justify-center text-google-blue font-black text-3xl shadow-inner">
                      {selectedCustomer.company.charAt(0)}
                    </div>
                    <div>
                      <h1 className="text-3xl md:text-4xl font-black font-heading text-foreground tracking-tight leading-none">{selectedCustomer.company}</h1>
                      <div className="flex items-center gap-3 mt-2">
                        <span className="text-sm font-bold text-muted-foreground">{selectedCustomer.name}</span>
                        <span className="w-1 h-1 rounded-full bg-border" />
                        <div
                          className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest flex items-center gap-2 ${(StorageService.getCustomerBehaviorScore(selectedCustomer.id)) > 80 ? 'bg-google-green/10 text-google-green' :
                            (StorageService.getCustomerBehaviorScore(selectedCustomer.id)) > 50 ? 'bg-orange-100 text-orange-700' : 'bg-google-red/10 text-google-red'
                            } `}
                        >
                          Trust Score: {StorageService.getCustomerBehaviorScore(selectedCustomer.id)}%
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap gap-4">
                  <div className="flex items-center gap-3 px-4 py-2 bg-surface-container-high rounded-full border border-border">
                    <Mail className="w-4 h-4 text-muted-foreground" />
                    <span className="text-xs font-bold text-foreground">{selectedCustomer.email}</span>
                  </div>
                  <div className="flex items-center gap-3 px-4 py-2 bg-surface-container-high rounded-full border border-border">
                    <Phone className="w-4 h-4 text-muted-foreground" />
                    <span className="text-xs font-bold text-foreground">{selectedCustomer.phone}</span>
                  </div>
                  <div className="flex items-center gap-3 px-4 py-2 bg-surface-container-high rounded-full border border-border">
                    <MapPin className="w-4 h-4 text-muted-foreground" />
                    <span className="text-xs font-bold text-foreground line-clamp-1 max-w-[200px]">{selectedCustomer.address}</span>
                  </div>
                </div>
              </div>

              <div className="flex flex-col items-end gap-6 w-full lg:w-auto">
                <div className="bg-surface-container-high/50 p-6 rounded-[32px] text-right min-w-[220px] border border-border">
                  <p className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] mb-1">Outstanding Balance</p>
                  <p className={`text-4xl font-black tracking-tighter ${selectedCustomer.balance > 0 ? 'text-google-red' : 'text-google-green'} `}>
                    ₹{selectedCustomer.balance.toLocaleString()}
                  </p>
                </div>

                <div className="flex gap-3 w-full justify-end">
                  <motion.button
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setShowNoteModal(true)}
                    className="px-6 py-3 bg-surface-container-highest rounded-full text-foreground text-sm font-bold flex items-center gap-2 hover:bg-surface-container-high transition-colors"
                  >
                    <MessageCircle className="w-4 h-4" /> Log Call
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setShowPaymentModal(true)}
                    className="px-8 py-3 bg-google-blue text-white rounded-full text-sm font-black uppercase tracking-wide shadow-lg shadow-google-blue/20 flex items-center gap-2"
                  >
                    <Banknote className="w-4 h-4" /> Receive Payment
                  </motion.button>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Expressive Tabs */}
          <div className="flex gap-2 mb-6 bg-surface-container-high/50 p-1.5 rounded-full w-fit border border-border">
            {['HISTORY', 'STATEMENT', 'NOTIFICATIONS'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab as any)}
                className={`px-6 py-3 rounded-full text-xs font-black uppercase tracking-widest transition-all ${activeTab === tab
                  ? 'bg-google-blue text-white shadow-md'
                  : 'text-muted-foreground hover:bg-surface-container-highest hover:text-foreground'
                  } `}
              >
                {tab === 'HISTORY' ? 'History' : tab === 'STATEMENT' ? 'Statement' : 'Activity'}
              </button>
            ))}
          </div>

          {/* Tab Content Area */}
          <div className="bg-surface rounded-[40px] shadow-sm border border-border overflow-hidden min-h-[400px]">
            <AnimatePresence mode="wait">
              {activeTab === 'HISTORY' && (
                <motion.div
                  key="history"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 10 }}
                  className="overflow-x-auto"
                >
                  {/* Date Filter for History */}
                  <div className="px-8 py-6 border-b border-border bg-surface-container-high/30 flex flex-wrap items-center justify-between gap-4">
                    <h3 className="text-xs font-black text-muted-foreground uppercase tracking-[0.2em]">Transaction History</h3>
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-bold text-muted-foreground">Filter:</span>
                      <input
                        type="date"
                        value={historyFromDate}
                        onChange={(e) => setHistoryFromDate(e.target.value)}
                        className="px-3 py-2 bg-surface-container-high border border-border rounded-xl text-xs font-bold text-foreground outline-none focus:ring-2 focus:ring-google-blue/20"
                      />
                      <span className="text-xs font-bold text-muted-foreground">to</span>
                      <input
                        type="date"
                        value={historyToDate}
                        onChange={(e) => setHistoryToDate(e.target.value)}
                        className="px-3 py-2 bg-surface-container-high border border-border rounded-xl text-xs font-bold text-foreground outline-none focus:ring-2 focus:ring-google-blue/20"
                      />
                      <motion.button
                        whileTap={{ scale: 0.95 }}
                        onClick={handleDownloadHistoryStatement}
                        className="ml-2 px-4 py-2 bg-google-blue text-white rounded-xl text-xs font-black uppercase tracking-wide shadow-md hover:shadow-lg transition-all flex items-center gap-2"
                      >
                        <Download className="w-4 h-4" /> PDF
                      </motion.button>
                    </div>
                  </div>

                  <table className="w-full min-w-[800px]">
                    <thead className="bg-surface-container-high/50 border-b border-border">
                      <tr>
                        <th className="px-8 py-6 text-left text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em]">Date</th>
                        <th className="px-8 py-6 text-left text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em]">Reference</th>
                        <th className="px-8 py-6 text-right text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em]">Debit</th>
                        <th className="px-8 py-6 text-right text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em]">Credit</th>
                        <th className="px-8 py-6 text-center text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em]">Status</th>
                        <th className="px-8 py-6 text-center text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em]">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {filteredHistoryTransactions.map((tx) => (
                        <tr key={tx.id} className="hover:bg-surface-container-high/30 transition-colors group">
                          <td className="px-8 py-6 text-sm font-bold text-muted-foreground">{formatDate(tx.date)}</td>
                          <td className="px-8 py-6">
                            <div className="flex flex-col">
                              <span className={`text-sm font-black tracking-tight ${tx.type === 'INVOICE' ? 'text-foreground' : tx.type === 'CREDIT_NOTE' ? 'text-orange-600' : 'text-google-green'}`}>
                                {tx.type === 'INVOICE' ? `Invoice #${tx.reference}` : tx.type === 'CREDIT_NOTE' ? `Return #${tx.reference}` : `Payment: ${tx.mode}`}
                              </span>
                              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mt-0.5">ID: {tx.data.id.slice(0, 6)}</span>
                            </div>
                          </td>
                          <td className="px-8 py-6 text-right">
                            {tx.type === 'INVOICE' ? (
                              <span className="text-sm font-black text-foreground">₹{tx.amount.toFixed(2)}</span>
                            ) : (
                              <span className="text-sm font-bold text-muted-foreground/30">-</span>
                            )}
                          </td>
                          <td className="px-8 py-6 text-right">
                            {tx.type === 'PAYMENT' || tx.type === 'CREDIT_NOTE' ? (
                              <span className={`text-sm font-black ${tx.type === 'CREDIT_NOTE' ? 'text-orange-600' : 'text-google-green'}`}>
                                ₹{tx.amount.toFixed(2)}
                              </span>
                            ) : (
                              <span className="text-sm font-bold text-muted-foreground/30">-</span>
                            )}
                          </td>
                          <td className="px-8 py-6 text-center">
                            <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${tx.type === 'INVOICE'
                              ? tx.status === 'PAID' ? 'bg-green-100 border-green-200 text-green-700' : 'bg-amber-50 border-amber-200 text-amber-700'
                              : tx.type === 'CREDIT_NOTE'
                                ? 'bg-orange-100 border-orange-200 text-orange-700'
                                : 'bg-green-50 border-green-200 text-green-700'
                              }`}>
                              {tx.type === 'INVOICE' ? tx.status : tx.type === 'CREDIT_NOTE' ? 'RETURN' : 'RECEIVED'}
                            </span>
                          </td>
                          <td className="px-8 py-6">
                            <div className="flex items-center justify-center gap-2 opacity-60 group-hover:opacity-100 transition-opacity">
                              <button
                                onClick={() => handleShare(tx)}
                                className="w-8 h-8 flex items-center justify-center rounded-full bg-green-50 text-green-600 hover:bg-green-100 transition-colors"
                                title="Share"
                              >
                                <MessageCircle className="w-4 h-4" />
                              </button>
                              {(tx.type === 'INVOICE' || tx.type === 'CREDIT_NOTE') && (
                                <button
                                  onClick={() => setViewingInvoice(tx.data as Invoice)}
                                  className="w-8 h-8 flex items-center justify-center rounded-full bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors"
                                  title="View"
                                >
                                  <Eye className="w-4 h-4" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                      {transactions.length === 0 && (
                        <tr>
                          <td colSpan={6} className="py-20 text-center">
                            <div className="flex flex-col items-center gap-4 opacity-50">
                              <FileText className="w-12 h-12 text-muted-foreground" />
                              <p className="text-sm font-bold text-muted-foreground uppercase tracking-widest">No transaction records found</p>
                            </div>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </motion.div>
              )}

              {activeTab === 'STATEMENT' && (
                <motion.div
                  key="statement"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 10 }}
                  className="p-12 flex flex-col items-center justify-center text-center max-w-2xl mx-auto"
                >
                  <div className="w-20 h-20 bg-google-blue/10 rounded-3xl flex items-center justify-center text-google-blue mb-6">
                    <TrendingUp className="w-10 h-10" />
                  </div>
                  <h3 className="text-2xl font-black font-heading text-foreground mb-2">Statement Generator</h3>
                  <p className="text-muted-foreground font-medium mb-10">Select a date range to generate a professional PDF account statement.</p>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full mb-8">
                    <div className="space-y-2 text-left">
                      <label className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] px-2">From Date</label>
                      <input
                        type="date"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        className="w-full p-4 bg-surface-container-high border-2 border-transparent focus:border-google-blue/30 rounded-[24px] text-sm font-bold text-foreground focus:ring-4 focus:ring-google-blue/5 outline-none transition-all"
                      />
                    </div>
                    <div className="space-y-2 text-left">
                      <label className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] px-2">To Date</label>
                      <input
                        type="date"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        className="w-full p-4 bg-surface-container-high border-2 border-transparent focus:border-google-blue/30 rounded-[24px] text-sm font-bold text-foreground focus:ring-4 focus:ring-google-blue/5 outline-none transition-all"
                      />
                    </div>
                  </div>

                  <motion.button
                    whileTap={{ scale: 0.95 }}
                    onClick={handleDownloadStatement}
                    className="w-full bg-foreground text-surface py-5 rounded-full font-black uppercase tracking-widest text-sm flex items-center justify-center gap-3 shadow-lg hover:bg-foreground/90 transition-all"
                  >
                    <Download className="w-5 h-5" /> Download Statement
                  </motion.button>
                </motion.div>
              )}

              {activeTab === 'NOTIFICATIONS' && (
                <motion.div
                  key="notifications"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 10 }}
                  className="p-8 grid grid-cols-1 lg:grid-cols-2 gap-12"
                >
                  <div>
                    <h3 className="text-xs font-black text-muted-foreground uppercase tracking-[0.2em] mb-6 flex items-center gap-2">
                      Follow-up Notes <span className="bg-surface-container-highest px-2 py-0.5 rounded-full text-[9px] text-foreground">Internal</span>
                    </h3>
                    <div className="space-y-4">
                      {(selectedCustomer.followUpHistory || []).map((follow, idx) => (
                        <div key={idx} className="p-4 bg-surface-container-high/30 border border-border rounded-[24px]">
                          <p className="text-sm font-bold text-foreground mb-2">"{follow.note}"</p>
                          <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">{follow.date}</p>
                        </div>
                      ))}
                      {(!selectedCustomer.followUpHistory || selectedCustomer.followUpHistory.length === 0) && (
                        <p className="text-sm text-muted-foreground italic pl-2">No internal notes added yet.</p>
                      )}
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between items-center mb-6">
                      <h3 className="text-xs font-black text-muted-foreground uppercase tracking-[0.2em]">Activity Log</h3>
                      <button
                        onClick={handleSendReminder}
                        className="text-[10px] font-black uppercase tracking-widest text-google-blue hover:underline decoration-2 underline-offset-4"
                      >
                        Send Reminder Now
                      </button>
                    </div>

                    <div className="relative border-l-2 border-surface-container-highest ml-3 space-y-8 pl-8 py-2">
                      {(selectedCustomer.notifications || []).map((notif) => (
                        <div key={notif.id} className="relative">
                          <div className={`absolute - left - [41px] top - 0 w - 6 h - 6 rounded - full border - 4 border - surface flex items - center justify - center ${notif.type === 'INVOICE' ? 'bg-google-blue' :
                            notif.type === 'PAYMENT' ? 'bg-google-green' : 'bg-orange-400'
                            } `} />
                          <h4 className="text-sm font-bold text-foreground">{notif.title}</h4>
                          <p className="text-xs text-muted-foreground mt-1 mb-1">{notif.message}</p>
                          <span className="text-[10px] font-black text-muted-foreground/50 uppercase tracking-widest">{notif.date}</span>
                        </div>
                      ))}
                      {(!selectedCustomer.notifications || selectedCustomer.notifications.length === 0) && (
                        <p className="text-sm text-muted-foreground italic">No activity recorded yet.</p>
                      )}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* M3 Payment Modal */}
        <AnimatePresence>
          {showPaymentModal && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setShowPaymentModal(false)}
                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              />
              <motion.div
                initial={{ scale: 0.9, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.9, opacity: 0, y: 20 }}
                className="relative bg-surface w-full max-w-md rounded-[40px] shadow-google-lg overflow-hidden border border-border"
              >
                <div className="p-8 border-b border-border bg-surface-container-high/30 flex justify-between items-center">
                  <div>
                    <h3 className="text-2xl font-black font-heading text-foreground">Receive Payment</h3>
                    <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mt-1">Record transaction</p>
                  </div>
                  <button onClick={() => setShowPaymentModal(false)} className="w-10 h-10 rounded-full bg-surface-container-high flex items-center justify-center hover:bg-surface-container-highest transition-colors">
                    <X className="w-5 h-5 text-muted-foreground" />
                  </button>
                </div>

                <form onSubmit={handleSavePayment} className="p-8 space-y-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] px-2">Amount Received</label>
                    <div className="relative">
                      <span className="absolute left-6 top-1/2 -translate-y-1/2 text-xl font-black text-foreground">₹</span>
                      <input
                        type="number"
                        required
                        value={paymentAmount}
                        onChange={(e) => setPaymentAmount(e.target.value)}
                        className="w-full p-6 pl-12 bg-surface-container-high border-2 border-transparent focus:border-google-green/30 rounded-[24px] text-3xl font-black text-foreground focus:ring-4 focus:ring-google-green/5 outline-none transition-all placeholder:text-muted-foreground/20"
                        placeholder="0.00"
                        autoFocus
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] px-2">Date</label>
                      <input
                        type="date"
                        required
                        value={paymentDate}
                        onChange={(e) => setPaymentDate(e.target.value)}
                        className="w-full p-4 bg-surface-container-high border-2 border-transparent focus:border-google-blue/30 rounded-[24px] text-sm font-bold text-foreground focus:ring-4 focus:ring-google-blue/5 outline-none transition-all"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] px-2">Mode</label>
                      <select
                        value={paymentMode}
                        onChange={(e) => setPaymentMode(e.target.value as any)}
                        className="w-full p-4 bg-surface-container-high border-2 border-transparent focus:border-google-blue/30 rounded-[24px] text-sm font-bold text-foreground focus:ring-4 focus:ring-google-blue/5 outline-none transition-all appearance-none"
                      >
                        <option value="CASH">Cash</option>
                        <option value="UPI">UPI / Online</option>
                        <option value="BANK_TRANSFER">Bank Transfer</option>
                        <option value="CHEQUE">Cheque</option>
                      </select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] px-2">Reference Note</label>
                    <input
                      type="text"
                      value={paymentNote}
                      onChange={(e) => setPaymentNote(e.target.value)}
                      className="w-full p-4 bg-surface-container-high border-2 border-transparent focus:border-google-blue/30 rounded-[24px] text-sm font-bold text-foreground focus:ring-4 focus:ring-google-blue/5 outline-none transition-all"
                      placeholder="Optional details..."
                    />
                  </div>

                  <motion.button
                    whileTap={{ scale: 0.95 }}
                    type="submit"
                    className="w-full bg-google-green text-white py-5 rounded-full font-black uppercase tracking-widest text-sm shadow-xl shadow-google-green/20 hover:shadow-google-lg mt-2"
                  >
                    Process Payment
                  </motion.button>
                </form>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
    );
  }


  const handleAddCustomer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCustomer.name || !newCustomer.company || !newCustomer.email) {
      showAlert('Missing Information', 'Please fill name, company, and email', 'warning');
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
    showAlert('Customer Added', 'Customer has been added successfully!', 'success');
  };

  const handleEditCustomer = (customer: Customer) => {
    setEditingCustomer({ ...customer });
    setShowEditCustomer(true);
  };

  const handleSaveEditCustomer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCustomer) return;
    if (!editingCustomer.name || !editingCustomer.company || !editingCustomer.email) {
      showAlert('Missing Information', 'Please fill name, company, and email', 'warning');
      return;
    }

    StorageService.updateCustomer(editingCustomer);
    setCustomers(StorageService.getCustomers());
    setShowEditCustomer(false);
    setEditingCustomer(null);
    showAlert('Updated', 'Customer details updated successfully!', 'success');
  };

  const handleDeleteCustomer = (customerId: string) => {
    setCustomerToDelete(customerId);
  };

  const confirmDeleteCustomer = () => {
    if (customerToDelete) {
      StorageService.deleteCustomer(customerToDelete);
      setCustomers(StorageService.getCustomers());
      setShowEditCustomer(false);
      setEditingCustomer(null);
      setCustomerToDelete(null);
      showAlert('Deleted', 'Customer has been permanently deleted.', 'success');
    }
  };



  const filteredCustomers = customers.filter(c =>
    c.company.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (c.phone && c.phone.includes(searchTerm))
  );

  return (
    <div className="bg-surface-container-low min-h-screen font-sans">
      {/* Modals */}
      <AlertModal
        isOpen={!!alertConfig}
        title={alertConfig?.title || ''}
        message={alertConfig?.message || ''}
        variant={alertConfig?.variant}
        onClose={() => setAlertConfig(null)}
      />

      <ConfirmationModal
        isOpen={!!customerToDelete}
        title="Delete Customer?"
        message="Are you sure you want to delete this customer? This will also delete all their invoices and payments history. This action cannot be undone."
        confirmText="Delete Customer"
        variant="danger"
        onClose={() => setCustomerToDelete(null)}
        onConfirm={confirmDeleteCustomer}
      />
      {/* Edit Customer Modal */}
      <AnimatePresence>
        {showEditCustomer && editingCustomer && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => { setShowEditCustomer(false); setEditingCustomer(null); }}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative bg-surface w-full max-w-xl rounded-[40px] shadow-google-lg overflow-hidden border border-border max-h-[90vh] overflow-y-auto"
            >
              <div className="p-8 border-b border-border bg-surface-container-high/30 flex justify-between items-center sticky top-0 backdrop-blur-md z-10">
                <div>
                  <h3 className="text-2xl font-black font-heading text-foreground">Edit Customer</h3>
                  <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mt-1">Update client profile</p>
                </div>
                <button onClick={() => { setShowEditCustomer(false); setEditingCustomer(null); }} className="w-10 h-10 rounded-full bg-surface-container-high flex items-center justify-center hover:bg-surface-container-highest transition-colors">
                  <X className="w-5 h-5 text-muted-foreground" />
                </button>
              </div>

              <div className="p-8">
                <form onSubmit={handleSaveEditCustomer} className="space-y-6">
                  <div className="group space-y-2 relative">
                    <label className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] px-2">Customer Name</label>
                    <input
                      type="text"
                      required
                      value={editingCustomer.name}
                      onChange={(e) => setEditingCustomer({ ...editingCustomer, name: e.target.value })}
                      className="w-full p-4 bg-surface-container-high border-2 border-transparent focus:border-google-blue/30 rounded-[24px] text-base font-bold text-foreground focus:ring-4 focus:ring-google-blue/5 outline-none transition-all"
                      placeholder="Full name"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] px-2">Company Name</label>
                    <input
                      type="text"
                      required
                      value={editingCustomer.company}
                      onChange={(e) => setEditingCustomer({ ...editingCustomer, company: e.target.value })}
                      className="w-full p-4 bg-surface-container-high border-2 border-transparent focus:border-google-blue/30 rounded-[24px] text-base font-bold text-foreground focus:ring-4 focus:ring-google-blue/5 outline-none transition-all"
                      placeholder="Company Name"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] px-2">Email</label>
                      <input
                        type="email"
                        required
                        value={editingCustomer.email}
                        onChange={(e) => setEditingCustomer({ ...editingCustomer, email: e.target.value })}
                        className="w-full p-4 bg-surface-container-high border-2 border-transparent focus:border-google-blue/30 rounded-[24px] text-sm font-bold text-foreground focus:ring-4 focus:ring-google-blue/5 outline-none transition-all"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] px-2">Phone</label>
                      <input
                        type="tel"
                        value={editingCustomer.phone}
                        onChange={(e) => setEditingCustomer({ ...editingCustomer, phone: e.target.value })}
                        className="w-full p-4 bg-surface-container-high border-2 border-transparent focus:border-google-blue/30 rounded-[24px] text-sm font-bold text-foreground focus:ring-4 focus:ring-google-blue/5 outline-none transition-all"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] px-2">Address</label>
                    <textarea
                      value={editingCustomer.address}
                      onChange={(e) => setEditingCustomer({ ...editingCustomer, address: e.target.value })}
                      rows={2}
                      className="w-full p-4 bg-surface-container-high border-2 border-transparent focus:border-google-blue/30 rounded-[24px] text-sm font-bold text-foreground focus:ring-4 focus:ring-google-blue/5 outline-none transition-all resize-none"
                    />
                  </div>

                  {gstEnabledVal && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] px-2">State</label>
                        <input
                          type="text"
                          value={editingCustomer.state || ''}
                          onChange={(e) => setEditingCustomer({ ...editingCustomer, state: e.target.value })}
                          className="w-full p-4 bg-surface-container-high border-2 border-transparent focus:border-google-blue/30 rounded-[24px] text-sm font-bold text-foreground focus:ring-4 focus:ring-google-blue/5 outline-none transition-all"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] px-2">GSTIN</label>
                        <input
                          type="text"
                          value={editingCustomer.gstin || ''}
                          onChange={(e) => setEditingCustomer({ ...editingCustomer, gstin: e.target.value })}
                          className="w-full p-4 bg-surface-container-high border-2 border-transparent focus:border-google-blue/30 rounded-[24px] text-sm font-bold text-foreground focus:ring-4 focus:ring-google-blue/5 outline-none transition-all"
                        />
                      </div>
                    </div>
                  )}

                  <div className="flex gap-4 pt-4">
                    <motion.button
                      whileTap={{ scale: 0.95 }}
                      type="submit"
                      className="flex-1 bg-google-blue text-white py-4 rounded-full font-black uppercase tracking-widest text-xs shadow-lg shadow-google-blue/20"
                    >
                      Save Changes
                    </motion.button>
                    <motion.button
                      whileTap={{ scale: 0.95 }}
                      type="button"
                      onClick={() => handleDeleteCustomer(editingCustomer.id)}
                      className="px-6 bg-google-red/10 text-google-red py-4 rounded-full font-black hover:bg-google-red/20 flex items-center gap-2 transition-colors"
                    >
                      <Trash2 className="w-5 h-5" />
                    </motion.button>
                  </div>
                </form>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <div className="p-4 md:p-8 pb-32 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10 pt-safe">
          <div className="flex items-center gap-4">
            {onBack && (
              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={onBack}
                className="w-12 h-12 rounded-full bg-surface-container-high flex items-center justify-center text-foreground hover:bg-surface-container-highest transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
              </motion.button>
            )}
            <div>
              <h2 className="text-4xl font-black font-heading text-foreground tracking-tight">Customers</h2>
              <p className="text-sm font-bold text-muted-foreground mt-1">Manage client relationships</p>
            </div>
          </div>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setShowAddCustomer(true)}
            className="bg-primary text-white px-8 py-4 rounded-full flex items-center justify-center gap-3 font-black text-sm uppercase tracking-widest shadow-google hover:shadow-google-lg transition-all"
          >
            <Plus className="w-5 h-5" />
            <span className="hidden sm:inline">Add Customer</span>
          </motion.button>
        </div>

        {/* Search Bar */}
        <div className="relative mb-8">
          <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search customers by name, company, or phone..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-14 pr-6 py-4 bg-surface rounded-[24px] shadow-sm border border-transparent focus:border-google-blue/30 focus:shadow-google transition-all outline-none font-medium text-foreground"
          />
        </div>

        {/* Customer Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          <AnimatePresence mode="popLayout">
            {filteredCustomers.map(customer => (
              <motion.div
                layout
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                key={customer.id}
                onClick={() => handleViewHistory(customer)}
                className="bg-surface border border-border p-6 rounded-[32px] shadow-sm hover:shadow-google-lg transition-all cursor-pointer group relative overflow-hidden"
              >
                <div className="absolute top-0 right-0 w-32 h-32 bg-surface-container-high rounded-full -mr-16 -mt-16 group-hover:bg-google-blue/10 transition-colors" />

                <div className="flex justify-between items-start mb-6 relative">
                  <div className="w-14 h-14 bg-surface-container-high text-google-blue rounded-[20px] flex items-center justify-center font-black text-xl shadow-inner group-hover:scale-110 transition-transform">
                    {customer.company.charAt(0)}
                  </div>
                  <motion.button
                    whileTap={{ scale: 0.9 }}
                    onClick={(e) => { e.stopPropagation(); handleEditCustomer(customer); }}
                    className="w-10 h-10 flex items-center justify-center text-muted-foreground hover:text-google-blue hover:bg-google-blue/10 rounded-full transition-colors"
                  >
                    <Edit className="w-5 h-5" />
                  </motion.button>
                </div>

                <div className="relative mb-6">
                  <h3 className="font-black text-foreground text-xl leading-tight mb-1 truncate font-heading">{customer.company}</h3>
                  <p className="text-sm font-medium text-muted-foreground truncate">{customer.name}</p>
                </div>

                <div className="flex items-end justify-between border-t border-border pt-4 relative">
                  <div>
                    <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest block mb-1">Status</span>
                    <span className={`inline - flex items - center px - 2 py - 0.5 rounded text - [10px] font - black uppercase tracking - wide ${customer.balance > 0 ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'} `}>
                      {customer.balance > 0 ? 'Pending' : 'Ok'}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest block mb-1">Balance</span>
                    <span className={`text - 2xl font - black tracking - tight ${customer.balance > 0 ? 'text-google-red' : 'text-google-green'} `}>
                      ₹{customer.balance.toLocaleString()}
                    </span>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {filteredCustomers.length === 0 && (
          <div className="text-center py-24 bg-surface-container-high/30 rounded-[40px] border-2 border-dashed border-border mt-8">
            <div className="w-24 h-24 bg-surface-container-highest rounded-[32px] flex items-center justify-center mx-auto mb-6">
              <Plus className="w-10 h-10 text-muted-foreground/40" />
            </div>
            <h3 className="text-2xl font-black text-foreground mb-2 font-heading">{searchTerm ? 'No Matching Customers' : 'No Customers Yet'}</h3>
            <p className="text-sm font-bold text-muted-foreground uppercase tracking-widest">{searchTerm ? 'Try adjusting your search terms' : 'Add your first client to get started'}</p>
          </div>
        )}
      </div>

      {/* Add Customer Modal - M3 Expressive */}
      <AnimatePresence>
        {showAddCustomer && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowAddCustomer(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative bg-surface w-full max-w-xl rounded-[40px] shadow-google-lg overflow-hidden border border-border max-h-[90vh] overflow-y-auto"
            >
              <div className="p-8 border-b border-border bg-surface-container-high/30 flex justify-between items-center sticky top-0 backdrop-blur-md z-10">
                <div>
                  <h3 className="text-2xl font-black font-heading text-foreground">New Customer</h3>
                  <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mt-1">Add client details</p>
                </div>
                <button onClick={() => setShowAddCustomer(false)} className="w-10 h-10 rounded-full bg-surface-container-high flex items-center justify-center hover:bg-surface-container-highest transition-colors">
                  <X className="w-5 h-5 text-muted-foreground" />
                </button>
              </div>

              <div className="p-8">
                <form onSubmit={handleAddCustomer} className="space-y-6">
                  <div className="group space-y-2 relative">
                    <label className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] px-2 flex items-center gap-2">
                      Customer Name <span className="w-1 h-1 rounded-full bg-google-red" />
                    </label>
                    <input
                      type="text"
                      required
                      value={newCustomer.name}
                      onChange={async (e) => {
                        const val = e.target.value;
                        setNewCustomer({ ...newCustomer, name: val });
                        if (val.length >= 2) {
                          const results = await ContactsService.searchContacts(val);
                          setSuggestions(results);
                          setShowSuggestions(results.length > 0);
                        } else {
                          setShowSuggestions(false);
                        }
                      }}
                      onFocus={async () => {
                        await ContactsService.requestWithDisclosure();
                      }}
                      className="w-full p-4 bg-surface-container-high border-2 border-transparent focus:border-google-blue/30 rounded-[24px] text-lg font-bold text-foreground focus:ring-4 focus:ring-google-blue/5 outline-none transition-all placeholder:text-muted-foreground/30"
                      placeholder="Search or type name..."
                    />

                    {/* Contact Suggestions Dropdown */}
                    <AnimatePresence>
                      {showSuggestions && suggestions.length > 0 && (
                        <motion.div
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: 10 }}
                          className="absolute z-[120] left-0 right-0 top-full mt-2 bg-surface-container-highest border border-border rounded-[28px] shadow-google-lg max-h-60 overflow-y-auto p-2"
                        >
                          {suggestions.map((s, i) => (
                            <button
                              key={i}
                              type="button"
                              onClick={() => {
                                setNewCustomer(prev => ({
                                  ...prev,
                                  name: s.name,
                                  phone: s.phone.replace(/\D/g, '').slice(-10),
                                  company: prev.company || s.name
                                }));
                                setShowSuggestions(false);
                                HapticService.light();
                              }}
                              className="w-full p-4 flex items-center justify-between hover:bg-surface-container-high rounded-[20px] transition-all text-left"
                            >
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-google-blue/10 text-google-blue flex items-center justify-center font-black text-xs shrink-0">
                                  {s.name.charAt(0)}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="text-sm font-black text-foreground truncate">{s.name}</div>
                                  <div className="text-[10px] font-bold text-muted-foreground">{s.phone}</div>
                                </div>
                              </div>
                              <ChevronRight className="w-4 h-4 text-muted-foreground/30" />
                            </button>
                          ))}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] px-2 flex items-center gap-2">
                      Company Name <span className="w-1 h-1 rounded-full bg-google-red" />
                    </label>
                    <input
                      type="text"
                      required
                      value={newCustomer.company}
                      onChange={(e) => setNewCustomer({ ...newCustomer, company: e.target.value })}
                      className="w-full p-4 bg-surface-container-high border-2 border-transparent focus:border-google-blue/30 rounded-[24px] text-lg font-bold text-foreground focus:ring-4 focus:ring-google-blue/5 outline-none transition-all placeholder:text-muted-foreground/30"
                      placeholder="Business Name"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] px-2 flex items-center gap-2">
                      Email <span className="w-1 h-1 rounded-full bg-google-red" />
                    </label>
                    <input
                      type="email"
                      required
                      value={newCustomer.email}
                      onChange={(e) => setNewCustomer({ ...newCustomer, email: e.target.value })}
                      className="w-full p-4 bg-surface-container-high border-2 border-transparent focus:border-google-blue/30 rounded-[24px] text-base font-bold text-foreground focus:ring-4 focus:ring-google-blue/5 outline-none transition-all placeholder:text-muted-foreground/30"
                      placeholder="email@example.com"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] px-2">Phone Number</label>
                    <div className="relative">
                      <span className="absolute left-6 top-1/2 -translate-y-1/2 text-google-blue font-black">+91</span>
                      <input
                        type="tel"
                        value={newCustomer.phone}
                        onChange={(e) => setNewCustomer({ ...newCustomer, phone: e.target.value.replace(/\D/g, '').slice(0, 10) })}
                        className="w-full p-4 pl-16 bg-surface-container-high border-2 border-transparent focus:border-google-blue/30 rounded-[24px] text-base font-black text-foreground focus:ring-4 focus:ring-google-blue/5 outline-none transition-all tracking-widest placeholder:text-muted-foreground/30"
                        placeholder="00000 00000"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] px-2">Billing Address</label>
                    <textarea
                      value={newCustomer.address}
                      onChange={(e) => setNewCustomer({ ...newCustomer, address: e.target.value })}
                      rows={2}
                      className="w-full p-4 bg-surface-container-high border-2 border-transparent focus:border-google-blue/30 rounded-[24px] text-base font-bold text-foreground focus:ring-4 focus:ring-google-blue/5 outline-none transition-all placeholder:text-muted-foreground/30 resize-none"
                      placeholder="Full Address"
                    />
                  </div>

                  {gstEnabledVal && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] px-2">State</label>
                        <input
                          type="text"
                          value={newCustomer.state}
                          onChange={(e) => setNewCustomer({ ...newCustomer, state: e.target.value })}
                          className="w-full p-4 bg-surface-container-high border-2 border-transparent focus:border-google-blue/30 rounded-[24px] text-base font-bold text-foreground focus:ring-4 focus:ring-google-blue/5 outline-none transition-all"
                          placeholder="State Name"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] px-2">GSTIN (Optional)</label>
                        <input
                          type="text"
                          value={newCustomer.gstin}
                          onChange={(e) => setNewCustomer({ ...newCustomer, gstin: e.target.value })}
                          className="w-full p-4 bg-surface-container-high border-2 border-transparent focus:border-google-blue/30 rounded-[24px] text-base font-bold text-foreground focus:ring-4 focus:ring-google-blue/5 outline-none transition-all"
                          placeholder="GST Number"
                          maxLength={15}
                        />
                      </div>
                    </div>
                  )}

                  <motion.button
                    whileTap={{ scale: 0.95 }}
                    type="submit"
                    className="w-full bg-google-blue text-white py-5 rounded-full font-black uppercase tracking-widest text-sm shadow-xl shadow-google-blue/20 hover:shadow-google-lg mt-4"
                  >
                    Add Customer to Database
                  </motion.button>
                </form>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      <WhatsAppNumberModal
        isOpen={showWhatsAppModal}
        onClose={() => setShowWhatsAppModal(false)}
        onSubmit={(phone) => {
          if (pendingShareTx && selectedCustomer) {
            const company = StorageService.getCompanyProfile();
            if (pendingShareTx.type === 'INVOICE') {
              WhatsAppService.shareInvoice(pendingShareTx.data as Invoice, selectedCustomer, company, phone);
            } else {
              WhatsAppService.sharePayment(pendingShareTx.data as Payment, selectedCustomer, company, phone);
            }
            setPendingShareTx(null);
          }
        }}
      />
      <InputModal
        isOpen={showNoteModal}
        onClose={() => setShowNoteModal(false)}
        title="Log Call / Follow-up"
        placeholder="e.g. Called for payment, Agreed to pay Monday"
        submitLabel="Save Note"
        onSubmit={(note) => {
          if (selectedCustomer && typeof selectedCustomer === 'object') {
            const updated: Customer = Object.assign({}, selectedCustomer);
            if (!updated.followUpHistory) updated.followUpHistory = [];
            updated.followUpHistory.unshift({ date: new Date().toISOString().split('T')[0], note });
            StorageService.updateCustomer(updated);
            setSelectedCustomer(updated);
            HapticService.light();
          }
        }}
      />
    </div>
  );
};

export default Customers;
