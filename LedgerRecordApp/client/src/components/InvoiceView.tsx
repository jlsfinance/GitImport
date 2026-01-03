
import React, { useState, useEffect } from 'react';
import { Invoice, CompanyProfile, DEFAULT_COMPANY, Customer } from '../types';
import { StorageService } from '../services/storageService';
import { ArrowLeft, Download, Edit, Trash2, MoreVertical, MessageCircle, Users, ChevronRight, FileText, Share2 } from 'lucide-react';
import { useCompany } from '@/contexts/CompanyContext';
import { InvoicePdfService } from '../services/invoicePdfService';
import QRCode from 'qrcode';
import { Capacitor } from '@capacitor/core';
import { motion, AnimatePresence } from 'framer-motion';

import { ContactService } from '../services/contactService';
import ContactPermissionModal from './ContactPermissionModal';

interface InvoiceViewProps {
  invoice: Invoice;
  onBack: () => void;
  onEdit: (invoice: Invoice) => void;
  onViewLedger?: (customerId: string) => void;
  onDelete?: (invoice: Invoice) => void;
  showPostSaveActions?: boolean;
  onClosePostSaveActions?: () => void;
  isPublicView?: boolean; // Added for public read-only mode
}



const InvoiceView: React.FC<InvoiceViewProps> = ({ invoice, onBack, onEdit, onDelete, showPostSaveActions = false,
  onClosePostSaveActions,
  isPublicView = false
}) => {
  const { company: firebaseCompany } = useCompany();
  const [company, setCompany] = useState<CompanyProfile>(DEFAULT_COMPANY);
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Toggles
  const [showOptions, setShowOptions] = useState(false);
  const isPosView = invoice.customerName?.toUpperCase() === 'CASH' || invoice.customerName?.toUpperCase() === 'CASH SALES';
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('');

  // WhatsApp & Actions State
  const [showWhatsAppPhoneModal, setShowWhatsAppPhoneModal] = useState(false);
  const [waPhone, setWaPhone] = useState('');
  const [waName, setWaName] = useState('');
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  const [showContactChoice, setShowContactChoice] = useState(false);

  const [showPrevBalance, setShowPrevBalance] = useState(false);
  const [prevBalance, setPrevBalance] = useState(0);

  useEffect(() => {
    let companyData: CompanyProfile;

    if (firebaseCompany?.name) {
      companyData = {
        name: firebaseCompany.name || '',
        address: firebaseCompany.address || '',
        phone: firebaseCompany.phone || '',
        email: firebaseCompany.email || '',
        state: (firebaseCompany as any).state || '',
        gst: (firebaseCompany as any).gst || '',
        gstin: (firebaseCompany as any).gstin || (firebaseCompany as any).gst || '',
        gst_enabled: firebaseCompany.gst_enabled ?? true,
        show_hsn_summary: firebaseCompany.show_hsn_summary ?? true,
        upiId: (firebaseCompany as any).upiId || company?.upiId || ''
      };
    } else {
      const stored = StorageService.getCompanyProfile();
      companyData = {
        ...stored,
        gstin: stored.gstin || stored.gst || '',
        gst_enabled: stored.gst_enabled ?? true,
        show_hsn_summary: stored.show_hsn_summary ?? true
      };
    }
    setCompany(companyData);

    // Get Customer Details
    const cust = StorageService.getCustomers().find(c => c.id === invoice.customerId);
    if (cust) {
      setCustomer(cust);
      setWaPhone(cust.phone || '');
      setWaName(cust.company || cust.name || '');

      // Calculate Previous Balance
      const currentDue = cust.balance || 0;
      // If invoice is unpaid, subtract its amount to get 'previous' balance
      const invAmountInBalance = (invoice.status === 'PENDING' || invoice.status === 'PARTIAL') ? invoice.total : 0;
      setPrevBalance(currentDue - invAmountInBalance);
    }

    // Generate QR Code
    if (companyData.upiId) {
      const upiUrl = `upi://pay?pa=${companyData.upiId}&pn=${encodeURIComponent(companyData.name)}&am=${invoice.total}&cu=INR&tn=${encodeURIComponent(`Inv-${invoice.invoiceNumber}`)}`;
      QRCode.toDataURL(upiUrl)
        .then(url => setQrCodeUrl(url))
        .catch(err => console.error(err));
    }
  }, [invoice, firebaseCompany]);

  useEffect(() => {
    if (showPostSaveActions) {
      setShowWhatsAppPhoneModal(true);
    }
  }, [showPostSaveActions]);

  const handlePickContact = async () => {
    const pref = StorageService.getContactPreference();
    if (pref === 'NOT_SET' && Capacitor.isNativePlatform()) {
      setShowContactChoice(true);
      return;
    }

    const contact = await ContactService.pickContact();
    if (contact) {
      setWaPhone(ContactService.normalizePhone(contact.phone));
      setWaName(contact.name);
    }
  };

  const onContactChoice = async (choice: 'ALL' | 'SELECTED') => {
    StorageService.setContactPreference(choice);
    setShowContactChoice(false);
    if (choice === 'ALL') {
      // Use ContactService for permission handling
      await ContactService.requestPermissions();
    } else {
      handlePickContact();
    }
  };



  const sendWhatsApp = async (phone: string, name: string) => {
    let token = '';

    // 1. Try to fetch existing publicToken
    try {
      const { doc, getDoc, setDoc } = await import('firebase/firestore');
      const { db } = await import('../lib/firebase');
      const snap = await getDoc(doc(db, 'publicBills', invoice.id));

      if (snap.exists()) {
        token = snap.data().publicToken;
      }

      // 2. SELF-HEALING: If token is missing (old invoice), regenerate it by saving again
      if (!token) {
        console.log("Token missing, regenerating for old invoice...");
        // Trigger a save to generate token in publicBills (StorageService logic handles this)
        // We clone invoice to avoid referential issues
        StorageService.updateInvoice({ ...invoice });

        // Wait a moment for firestore write (optimistic handling)
        // Ideally we wait for promise but StorageService.updateInvoice is void/sync-like.
        // Let's retry fetch or just rely on the fact that next time it works.
        // But user clicked NOW. So we manual-patch for this instant share?
        // Actually, let's manual generate one for the link, and hope the background save catches up?
        // Safer: Generate one, save it manually to publicBills, then use it.

        const newToken = crypto.randomUUID();
        await setDoc(doc(db, 'publicBills', invoice.id), {
          // We need to save MINIMAL data here to make it valid for the Rule
          // But wait, StorageService.updateInvoice already does this.
          // Let's just use the one StorageService likely generated or will generate.
          // Actually, if we just updated, we can't get it back sync.

          // FORCE UPDATE SPECIFICALLY FOR TOKEN
          publicToken: newToken,
          expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          // We must include other fields if it's a new doc, but merge: true?
          // Let's rely on StorageService logic but force it to happen now-ish.
        }, { merge: true });
        token = newToken; // Use this new token immediately
      }

    } catch (e: any) {
      console.error("Could not fetch/generate public token", e);
      if (e.code === 'permission-denied') {
        alert("Error: Permission Denied. Please ensure your Firestore Rules in Firebase Console are updated to allow Owners to read publicBills.");
      } else {
        alert("Network error. Please try again.");
      }
      return;
    }

    // Use proper domain for production links if we are on localhost
    const origin = window.location.hostname === 'localhost' ? 'https://git-import.vercel.app' : window.location.origin;
    const digitalLink = `${origin}/view/${invoice.id}?token=${token}`;

    const message = `Namaste ${name || 'Customer'},\n\n*${company.name}* se judne ke liye dhanyavad.\n\nAapka Invoice *#${invoice.invoiceNumber}* amount *₹${invoice.total.toLocaleString()}* ka ready hai.\n\nLink par click karke bill dekhein aur download karein:\n${digitalLink}\n\nDhanyavad!`;

    const url = `https://wa.me/91${phone}?text=${encodeURIComponent(message)}`;

    if (Capacitor.isNativePlatform()) {
      window.open(url, '_system');
    } else {
      window.open(url, '_blank');
    }
  };





  const handleDownload = async () => {
    await InvoicePdfService.generatePDF(invoice, company, customer);
  };

  const handleDelete = () => {
    if (onDelete) {
      onDelete(invoice);
    } else {
      StorageService.deleteInvoice(invoice.id);
      onBack();
    }
  };

  return (
    <div className="min-h-screen bg-surface-container-low pb-32">
      {/* Custom Print Style */}
      {/* Custom Print Style - Safe Implementation */}
      <style>
        {`
            @media print {
                body * { visibility: hidden; }
                #printable-area, #printable-area * { visibility: visible; }
                #printable-area { position: absolute; left: 0; top: 0; width: 100%; }
                .no-print { display: none !important; }
            }
        `}
      </style>

      {/* Header */}
      <div className="sticky top-0 z-[100] bg-surface-container-low/80 backdrop-blur-md px-6 py-6 border-b border-border flex items-center justify-between no-print">
        <div className="flex items-center gap-4">
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={onBack}
            className="w-12 h-12 rounded-full bg-surface-container-high flex items-center justify-center text-foreground hover:bg-surface-container-highest transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </motion.button>
          <div>
            <h2 className="text-xl font-black font-heading text-foreground">Invoice #{invoice.invoiceNumber}</h2>
            <div className="flex items-center gap-2 mt-0.5">
              <span className={`w-2 h-2 rounded-full ${invoice.status === 'PAID' ? 'bg-google-green' : 'bg-orange-400'}`} />
              <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">{invoice.status}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={handleDownload}
            className="w-12 h-12 rounded-full bg-surface-container-high flex items-center justify-center text-foreground"
          >
            <Download className="w-5 h-5" />
          </motion.button>

          {!isPublicView && (
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={() => setShowOptions(!showOptions)}
              className="w-12 h-12 rounded-full bg-surface-container-high flex items-center justify-center text-foreground"
            >
              <MoreVertical className="w-5 h-5" />
            </motion.button>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div id="printable-area" className="max-w-4xl mx-auto p-4 md:p-10">
        <div className={`bg-surface ${isPosView ? 'rounded-[12px]' : 'rounded-[40px] shadow-google'} border border-border overflow-hidden`}>

          {/* M3 Bill Header */}
          <div className="bg-surface-container-high/30 p-8 md:p-12 border-b border-border">
            <div className="flex flex-col md:flex-row justify-between gap-10">
              <div className="max-w-md">
                <h1 className="text-3xl md:text-5xl font-black font-heading text-foreground tracking-tight mb-4">{company.name}</h1>
                <p className="text-sm font-bold text-muted-foreground leading-relaxed whitespace-pre-line">{company.address}</p>
                <div className="mt-6 flex flex-wrap gap-6">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-surface flex items-center justify-center text-google-blue border border-border">
                      <MessageCircle className="w-4 h-4" />
                    </div>
                    <span className="text-sm font-black text-foreground">{company.phone}</span>
                  </div>
                  {company.gstin && (
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-surface flex items-center justify-center text-google-green border border-border text-[10px] font-black">GST</div>
                      <span className="text-sm font-black text-foreground">{company.gstin}</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="md:text-right flex flex-col items-start md:items-end justify-between">
                <div>
                  <span className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] block mb-2">Invoice Amount</span>
                  <h2 className="text-4xl md:text-6xl font-black font-heading text-google-green tracking-tighter">₹{invoice.total.toLocaleString()}</h2>
                </div>
                <div className="mt-8 space-y-1">
                  <p className="text-sm font-black text-foreground">Date: {new Date(invoice.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</p>
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Due: {invoice.dueDate}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="p-8 md:p-12">
            {/* Customer Details */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-12 mb-16">
              <div>
                <h3 className="text-xs font-black text-muted-foreground uppercase tracking-[0.2em] mb-6 flex items-center gap-2">
                  Billed To <span className="bg-surface-container-highest px-3 py-0.5 rounded-full text-[9px] text-foreground">Customer</span>
                </h3>
                <div className="space-y-4">
                  <p className="text-xl md:text-2xl font-black text-foreground">{invoice.customerName}</p>
                  <p className="text-sm font-bold text-muted-foreground leading-relaxed italic">{invoice.customerAddress || 'No address provided'}</p>
                  {invoice.customerGstin && (
                    <div className="inline-flex items-end gap-2 px-4 py-2 bg-surface-container-high rounded-2xl border border-border">
                      <span className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">GSTIN</span>
                      <span className="text-xs font-black text-google-blue">{invoice.customerGstin}</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex flex-col items-start md:items-end md:text-right">
                <h3 className="text-xs font-black text-muted-foreground uppercase tracking-[0.2em] mb-6">Tax Summary</h3>
                <div className="space-y-3 w-full max-w-[240px]">
                  <div className="flex justify-between text-sm">
                    <span className="font-bold text-muted-foreground">Subtotal</span>
                    <span className="font-black text-foreground">₹{invoice.subtotal.toLocaleString()}</span>
                  </div>
                  {invoice.gstEnabled && (
                    <>
                      {(invoice.totalCgst ?? 0) > 0 && (
                        <div className="flex justify-between text-sm">
                          <span className="font-bold text-muted-foreground">CGST</span>
                          <span className="font-black text-foreground">₹{(invoice.totalCgst ?? 0).toLocaleString()}</span>
                        </div>
                      )}
                      {(invoice.totalSgst ?? 0) > 0 && (
                        <div className="flex justify-between text-sm">
                          <span className="font-bold text-muted-foreground">SGST</span>
                          <span className="font-black text-foreground">₹{(invoice.totalSgst ?? 0).toLocaleString()}</span>
                        </div>
                      )}
                      {(invoice.totalIgst ?? 0) > 0 && (
                        <div className="flex justify-between text-sm">
                          <span className="font-bold text-muted-foreground">IGST</span>
                          <span className="font-black text-foreground">₹{(invoice.totalIgst ?? 0).toLocaleString()}</span>
                        </div>
                      )}
                    </>
                  )}
                  {(invoice.discountAmount ?? 0) > 0 && (
                    <div className="flex justify-between text-sm text-google-red">
                      <span className="font-bold">Discount</span>
                      <span className="font-black">-₹{(invoice.discountAmount ?? 0).toLocaleString()}</span>
                    </div>
                  )}
                  <div className="h-px bg-border my-4" />
                  <div className="flex justify-between text-lg md:text-xl font-black text-foreground">
                    <span>TOTAL</span>
                    <span>₹{invoice.total.toLocaleString()}</span>
                  </div>

                  {showPrevBalance && (
                    <>
                      <div className="flex justify-between text-sm text-muted-foreground mt-2">
                        <span className="font-bold">Prev. Balance</span>
                        <span className="font-bold">₹{prevBalance.toLocaleString()}</span>
                      </div>
                      <div className="h-px bg-border my-2" />
                      <div className="flex justify-between text-xl md:text-2xl font-black text-google-blue">
                        <span>NET PAYABLE</span>
                        <span>₹{(invoice.total + prevBalance).toLocaleString()}</span>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Items Table */}
            <div className="overflow-x-auto -mx-8 md:mx-0 mb-16 px-8 md:px-0">
              <table className="w-full">
                <thead>
                  <tr className="border-b-2 border-border">
                    <th className="px-2 py-4 md:px-4 md:py-6 text-left text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em]">Item</th>
                    <th className="px-2 py-4 md:px-4 md:py-6 text-center text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em]">Qty</th>
                    <th className="px-2 py-4 md:px-4 md:py-6 text-right text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em]">Rate</th>
                    {invoice.gstEnabled && <th className="px-2 py-4 md:px-4 md:py-6 text-right text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em]">GST</th>}
                    <th className="px-2 py-4 md:px-4 md:py-6 text-right text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em]">Amt</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {invoice.items.map((item, idx) => (
                    <tr key={idx} className="group">
                      <td className="px-2 py-4 md:px-4 md:py-8">
                        <div className="flex flex-col">
                          <span className="text-sm md:text-base font-black text-foreground group-hover:text-google-blue transition-colors line-clamp-2">{item.description}</span>
                          {item.hsn && <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider mt-1">HSN: {item.hsn}</span>}
                        </div>
                      </td>
                      <td className="px-2 py-4 md:px-4 md:py-8 text-center text-sm font-bold text-muted-foreground">{item.quantity}</td>
                      <td className="px-2 py-4 md:px-4 md:py-8 text-right text-sm font-bold text-foreground">₹{item.rate.toLocaleString()}</td>
                      {invoice.gstEnabled && <td className="px-2 py-4 md:px-4 md:py-8 text-right text-sm font-bold text-muted-foreground">{item.gstRate}%</td>}
                      <td className="px-2 py-4 md:px-4 md:py-8 text-right text-sm md:text-base font-black text-foreground">₹{(item.totalAmount ?? 0).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Bottom Info */}
            <div className="flex flex-col md:flex-row gap-12 items-start justify-between border-t border-border pt-12">
              <div className="flex-1 max-w-sm">
                <h3 className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] mb-4">Terms & Conditions</h3>
                <p className="text-xs font-bold text-muted-foreground leading-relaxed opacity-60">1. Goods once sold will not be taken back.\n2. Payment is due within 30 days.\n3. This is a computer generated invoice.</p>
                {invoice.notes && (
                  <div className="mt-8 p-4 bg-surface-container-high/50 rounded-2xl border border-border italic text-sm text-foreground">
                    "{invoice.notes}"
                  </div>
                )}
              </div>

              <div className="flex flex-col items-start md:items-end gap-6 text-left md:text-right">
                {company.upiId && qrCodeUrl && (
                  <div className="p-4 bg-surface border-2 border-border rounded-3xl flex flex-col items-center gap-3">
                    <img src={qrCodeUrl} alt="UPI QR" className="w-24 h-24" />
                    <span className="text-[9px] font-black text-google-blue uppercase tracking-[0.2em]">Scan to Pay via UPI</span>
                  </div>
                )}
                <div className="pt-6">
                  <div className="w-48 h-px bg-border mb-4" />
                  <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Authorized Signatory</p>
                  <p className="text-lg font-black text-foreground mt-4 font-heading">{company.name}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Options Menu */}
      <AnimatePresence>
        {showOptions && (
          <div className="fixed inset-0 z-[150] flex items-end md:items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowOptions(false)}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ y: 100, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 100, opacity: 0 }}
              className="relative w-full max-w-sm bg-surface rounded-[40px] overflow-hidden"
            >
              <div className="p-8 space-y-2">
                <button onClick={() => { setShowPrevBalance(!showPrevBalance); setShowOptions(false); }} className="w-full p-6 text-left hover:bg-surface-container-high rounded-[32px] flex items-center gap-4 transition-colors">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${showPrevBalance ? 'bg-google-green text-white' : 'bg-surface-container-highest text-foreground'}`}>
                    <span className="text-lg font-black">₹</span>
                  </div>
                  <span className="font-black text-foreground">{showPrevBalance ? 'Hide' : 'Add'} Prev. Balance (Total Baaki)</span>
                </button>

                <button onClick={() => { alert("Attach Ledger feature coming soon!"); setShowOptions(false); }} className="w-full p-6 text-left hover:bg-surface-container-high rounded-[32px] flex items-center gap-4 transition-colors">
                  <div className="w-10 h-10 rounded-full bg-surface-container-highest text-foreground flex items-center justify-center">
                    <FileText className="w-5 h-5" />
                  </div>
                  <span className="font-black text-foreground">Attach Ledger (FY)</span>
                </button>

                <button onClick={() => {
                  setShowOptions(false);
                  if (navigator.share) {
                    navigator.share({
                      title: `Invoice ${invoice.invoiceNumber}`,
                      text: `Details for Invoice ${invoice.invoiceNumber}`,
                      url: window.location.href
                    }).catch(console.error);
                  } else {
                    setShowWhatsAppPhoneModal(true);
                  }
                }} className="w-full p-6 text-left hover:bg-surface-container-high rounded-[32px] flex items-center gap-4 transition-colors">
                  <div className="w-10 h-10 rounded-full bg-surface-container-highest text-foreground flex items-center justify-center">
                    <Share2 className="w-5 h-5" />
                  </div>
                  <span className="font-black text-foreground">Share</span>
                </button>

                <button onClick={() => { onEdit(invoice); setShowOptions(false); }} className="w-full p-6 text-left hover:bg-surface-container-high rounded-[32px] flex items-center gap-4 transition-colors">
                  <div className="w-10 h-10 rounded-full bg-google-blue/10 text-google-blue flex items-center justify-center">
                    <Edit className="w-5 h-5" />
                  </div>
                  <span className="font-black text-foreground">Edit Invoice</span>
                </button>

                <button onClick={() => setShowDeleteConfirm(true)} className="w-full p-6 text-left hover:bg-google-red/10 rounded-[32px] flex items-center gap-4 transition-colors group">
                  <div className="w-10 h-10 rounded-full bg-google-red/10 text-google-red flex items-center justify-center">
                    <Trash2 className="w-5 h-5" />
                  </div>
                  <span className="font-black text-google-red">Delete Invoice</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation */}
      <AnimatePresence>
        {showDeleteConfirm && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-6">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowDeleteConfirm(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-md"
            />
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative bg-surface p-12 rounded-[48px] shadow-2xl text-center max-w-sm"
            >
              <div className="w-20 h-20 bg-google-red/10 text-google-red rounded-full flex items-center justify-center mx-auto mb-8">
                <Trash2 className="w-10 h-10" />
              </div>
              <h3 className="text-2xl font-black text-foreground mb-4 font-heading tracking-tight">Are you sure?</h3>
              <p className="text-muted-foreground font-bold mb-10">This action will permanently delete this invoice and cannot be undone.</p>
              <div className="flex flex-col gap-3">
                <button onClick={handleDelete} className="w-full py-5 bg-google-red text-white rounded-full font-black uppercase tracking-widest text-xs shadow-lg shadow-google-red/20 transition-all hover:bg-red-600">Yes, Delete Invoice</button>
                <button onClick={() => setShowDeleteConfirm(false)} className="w-full py-5 bg-surface-container-high text-foreground rounded-full font-black uppercase tracking-widest text-xs transition-colors hover:bg-surface-container-highest">Cancel</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* WhatsApp Modal */}
      <AnimatePresence>
        {showWhatsAppPhoneModal && (
          <div className="fixed inset-0 z-[120] flex items-end md:items-center justify-center p-0 md:p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => {
                setShowWhatsAppPhoneModal(false);
                if (onClosePostSaveActions) onClosePostSaveActions();
              }}
              className="absolute inset-0 bg-black/60 backdrop-blur-md"
            />
            <motion.div
              initial={{ y: "100%", opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: "100%", opacity: 0 }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="relative w-full max-w-lg bg-surface rounded-t-[40px] md:rounded-[40px] p-8 md:p-10 shadow-google-lg z-[120] border border-border overflow-hidden"
            >
              <div className="w-12 h-1.5 bg-border rounded-full mx-auto mb-8 md:hidden" />

              <div className="flex items-center gap-5 mb-10">
                <div className="w-16 h-16 rounded-[24px] bg-google-green text-white flex items-center justify-center shadow-lg">
                  <MessageCircle className="w-8 h-8" />
                </div>
                <div>
                  <h3 className="text-3xl font-black font-heading text-foreground tracking-tight">Share Bill</h3>
                  <p className="text-sm font-bold text-muted-foreground uppercase tracking-widest mt-1">Send secure digital link</p>
                </div>
              </div>

              <div className="space-y-6 mb-12">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] px-2">Customer Name</label>
                  <input
                    type="text"
                    value={waName}
                    onChange={(e) => setWaName(e.target.value)}
                    className="w-full p-5 bg-surface-container-high border-2 border-transparent focus:border-google-blue/30 rounded-[24px] text-lg font-bold text-foreground focus:ring-4 focus:ring-google-blue/5 outline-none transition-all placeholder:text-muted-foreground/30"
                    placeholder="Enter full name"
                    onFocus={() => {
                      if (StorageService.getContactPreference() === 'NOT_SET' && Capacitor.isNativePlatform()) {
                        setShowContactChoice(true);
                      }
                    }}
                  />
                </div>

                <div className="space-y-2 relative">
                  <label className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] px-2">WhatsApp Number</label>
                  <div className="relative">
                    <span className="absolute left-6 top-1/2 -translate-y-1/2 text-google-blue font-black text-xl">+91</span>
                    <input
                      type="tel"
                      inputMode="numeric"
                      value={waPhone}
                      onChange={(e) => {
                        const val = e.target.value.replace(/\D/g, '').slice(0, 10);
                        setWaPhone(val);

                        // Only search contacts when we have enough digits (debounced effect)
                        if (val.length >= 3) {
                          // Simple debounce using setTimeout
                          const timeoutId = setTimeout(async () => {
                            try {
                              const res = await ContactService.resolveName(val);
                              if (res.name) setWaName(res.name);

                              const results = await ContactService.getCombinedContacts(val);
                              setSuggestions(results);
                              setShowSuggestions(results.length > 0);
                            } catch (err) {
                              console.warn('Contact lookup failed:', err);
                            }
                          }, 300);
                          return () => clearTimeout(timeoutId);
                        } else {
                          setShowSuggestions(false);
                        }
                      }}
                      onFocus={() => {
                        if (StorageService.getContactPreference() === 'NOT_SET' && Capacitor.isNativePlatform()) {
                          setShowContactChoice(true);
                        }
                      }}
                      onBlur={() => setTimeout(() => setShowSuggestions(false), 300)}
                      className="w-full p-5 pl-16 pr-14 bg-surface-container-high border-2 border-transparent focus:border-google-blue/30 rounded-[24px] text-2xl font-black tracking-[0.1em] text-foreground focus:ring-4 focus:ring-google-blue/5 outline-none transition-all placeholder:text-muted-foreground/30"
                      placeholder="00000 00000"
                    />
                    <button
                      type="button"
                      onClick={handlePickContact}
                      className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-google-blue/10 flex items-center justify-center text-google-blue hover:bg-google-blue/20 transition-colors"
                    >
                      <Users className="w-5 h-5" />
                    </button>
                  </div>

                  {showSuggestions && suggestions.length > 0 && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="absolute z-[130] left-0 right-0 top-full mt-3 bg-surface-container-highest border border-border rounded-[32px] shadow-google-lg max-h-56 overflow-y-auto p-2 backdrop-blur-2xl"
                    >
                      {suggestions.map((s, i) => (
                        <button
                          key={i}
                          type="button"
                          onClick={() => {
                            setWaPhone(s.phone);
                            setWaName(s.name);
                            setShowSuggestions(false);
                          }}
                          className="w-full p-4 flex items-center gap-4 hover:bg-surface-container-high rounded-[20px] transition-all text-left group"
                        >
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center text-[10px] font-black shrink-0 ${s.source === 'db' ? 'bg-google-blue text-white' : 'bg-google-green text-white'}`}>
                            {s.source === 'db' ? 'DB' : 'PH'}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-black text-foreground truncate group-hover:text-google-blue transition-colors">{s.name}</div>
                            <div className="text-[10px] font-bold text-muted-foreground tracking-widest">{s.phone}</div>
                          </div>
                          <ChevronRight className="w-4 h-4 text-muted-foreground/30" />
                        </button>
                      ))}
                    </motion.div>
                  )}
                </div>
              </div>

              <div className="flex flex-col gap-3">
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={() => sendWhatsApp(waPhone, waName)}
                  className="w-full py-5 bg-google-green text-white rounded-full font-black uppercase tracking-widest text-[11px] shadow-lg shadow-google-green/30 flex items-center justify-center gap-3"
                >
                  <MessageCircle className="w-5 h-5" />
                  Send Digital Link
                </motion.button>

                <div className="flex flex-col gap-3">
                  <motion.button
                    whileTap={{ scale: 0.95 }}
                    onClick={() => {
                      setShowWhatsAppPhoneModal(false);
                      if (onClosePostSaveActions) onClosePostSaveActions();
                    }}
                    className="py-5 text-muted-foreground font-black uppercase tracking-widest text-[10px] hover:bg-surface-container rounded-full transition-colors"
                  >
                    Maybe Later
                  </motion.button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <ContactPermissionModal
        isOpen={showContactChoice}
        onClose={() => setShowContactChoice(false)}
        onChoice={onContactChoice}
      />
    </div>

  );
};

export default InvoiceView;
