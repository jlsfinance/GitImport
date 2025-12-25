
import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Invoice, CompanyProfile, DEFAULT_COMPANY, Customer } from '../types';
import { StorageService } from '../services/storageService';
import { GeminiService } from '../services/geminiService';
import { WhatsAppService } from '../services/whatsappService';
import { Printer, ArrowLeft, Play, Loader2, Download, Edit, Trash2, MoreVertical, MessageCircle, Check, FilePlus, History, UserPlus, Users } from 'lucide-react';
import { jsPDF } from 'jspdf';
import { useCompany } from '@/contexts/CompanyContext';
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import { Capacitor } from '@capacitor/core';
import QRCode from 'qrcode';
import { Contacts, PhoneType } from '@capacitor-community/contacts';
import { motion, AnimatePresence } from 'framer-motion';

import { ContactService } from '../services/contactService';

interface InvoiceViewProps {
  invoice: Invoice;
  onBack: () => void;
  onEdit: (invoice: Invoice) => void;
  onViewLedger?: (customerId: string) => void;
  showPostSaveActions?: boolean;
  onClosePostSaveActions?: () => void;
}

// Helper to group items by HSN and calculate totals
const getHSNSummary = (invoice: Invoice, company: CompanyProfile) => {
  const hsnGroups: Record<string, any> = {};

  invoice.items.forEach(item => {
    const hsn = item.hsn || 'N/A';
    if (!hsnGroups[hsn]) {
      hsnGroups[hsn] = {
        hsn,
        description: item.description,
        quantity: 0,
        baseAmount: 0,
        cgstAmount: 0,
        sgstAmount: 0,
        igstAmount: 0,
        gstRate: item.gstRate || 0
      };
    }
    hsnGroups[hsn].quantity += item.quantity;
    hsnGroups[hsn].baseAmount += item.baseAmount || 0;
    hsnGroups[hsn].cgstAmount += item.cgstAmount || 0;
    hsnGroups[hsn].sgstAmount += item.sgstAmount || 0;
    hsnGroups[hsn].igstAmount += item.igstAmount || 0;
  });

  return Object.values(hsnGroups);
};

// Helper for Amount in Words (Indian Format)
const numberToWords = (num: number): string => {
  const ones = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"];
  const tens = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

  const convert = (n: number): string => {
    if (n === 0) return "";
    if (n < 20) return ones[n];
    if (n < 100) return tens[Math.floor(n / 10)] + (n % 10 !== 0 ? " " + ones[n % 10] : "");
    if (n < 1000) return ones[Math.floor(n / 100)] + " Hundred" + (n % 100 !== 0 ? " and " + convert(n % 100) : "");
    if (n < 100000) return convert(Math.floor(n / 1000)) + " Thousand" + (n % 1000 !== 0 ? " " + convert(n % 1000) : "");
    if (n < 10000000) return convert(Math.floor(n / 100000)) + " Lakh" + (n % 100000 !== 0 ? " " + convert(n % 100000) : "");
    return convert(Math.floor(n / 10000000)) + " Crore" + (n % 10000000 !== 0 ? " " + convert(n % 10000000) : "");
  };

  const integerPart = Math.floor(Math.abs(num));
  const decimalPart = Math.round((Math.abs(num) - integerPart) * 100);

  let result = integerPart === 0 ? "Zero" : convert(integerPart);

  if (decimalPart > 0) {
    result += " and " + convert(decimalPart) + " Paise";
  }

  return result + " Only";
};

const InvoiceView: React.FC<InvoiceViewProps> = ({ invoice, onBack, onEdit, onViewLedger, showPostSaveActions, onClosePostSaveActions }) => {
  const { company: firebaseCompany } = useCompany();
  const [isLoadingAudio, setIsLoadingAudio] = useState(false);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [company, setCompany] = useState<CompanyProfile>(DEFAULT_COMPANY);
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Toggles
  const [showPreviousBalance, setShowPreviousBalance] = useState(false);
  const [showLedger, setShowLedger] = useState(false);
  const [showOptions, setShowOptions] = useState(false);
  const [isPosView, setIsPosView] = useState(invoice.customerName?.toUpperCase() === 'CASH' || invoice.customerName?.toUpperCase() === 'CASH SALES');
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('');

  // WhatsApp & Actions State
  const [showWhatsAppPhoneModal, setShowWhatsAppPhoneModal] = useState(false);
  const [waPhone, setWaPhone] = useState('');
  const [waName, setWaName] = useState('');
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

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
    const foundCustomer = StorageService.getCustomers().find(c => c.id === invoice.customerId);
    setCustomer(foundCustomer || null);

    // Generate QR Code
    if (companyData.upiId && invoice.total > 0) {
      const upiLink = `upi://pay?pa=${companyData.upiId}&pn=${encodeURIComponent(companyData.name)}&am=${invoice.total}&cu=INR`;
      QRCode.toDataURL(upiLink, { margin: 1, width: 128 }, (err, url) => {
        if (!err) setQrCodeUrl(url);
      });
    }

  }, [invoice, firebaseCompany, company?.upiId]);

  useEffect(() => {
    // Determine if we should show POS view by default
    // If user just saved from Smart Calc, they might prefer POS view
    // But logic says: "If customer is CASH, show POS".
    if (invoice.customerName.toUpperCase() === 'CASH') {
      setIsPosView(true);
    }
    // Load Customer Phone for WhatsApp
    const c = StorageService.getCustomers().find(cust => cust.id === invoice.customerId);
    if (c && c.phone) setWaPhone(c.phone);
  }, [invoice.customerId, invoice.customerName]);

  const handlePrint = () => {
    // If Actions Modal is open, close it first
    if (onClosePostSaveActions) onClosePostSaveActions();

    // Small timeout to ensure menu closes and UI updates before print dialog
    setTimeout(() => {
      window.print();
    }, 100);
  };

  const handleSaveToPhoneDirect = async (phone: string, name: string) => {
    const cleanedPhone = phone.replace(/\D/g, '').slice(-10);
    if (cleanedPhone.length < 10) return alert("Please enter a valid phone number first.");
    if (!name || name.trim() === '') return alert("Please enter a name first.");

    try {
      // 1. Check Permissions
      const perm = await Contacts.checkPermissions();
      if (perm.contacts !== 'granted') {
        const req = await Contacts.requestPermissions();
        if (req.contacts !== 'granted') {
          return alert("Contact Permission Denied. Please enable it in Settings.");
        }
      }

      // 2. Create Contact Directly
      const nameParts = name.trim().split(/\s+/);
      const firstName = nameParts[0];
      const lastName = nameParts.slice(1).join(' ');

      await Contacts.createContact({
        contact: {
          name: {
            given: firstName,
            family: lastName
          },
          phones: [{ type: PhoneType.Mobile, label: 'mobile', number: `+91${cleanedPhone}` }]
        }
      });

      alert(`Contact "${name}" saved directly to your phone!`);
    } catch (err) {
      console.error("Save Contact Error:", err);
      alert("Failed to save contact. Please check app permissions.");
    }
  };

  const sendWhatsApp = (phone: string, nameInput: string) => {
    // Clean phone
    const cleanedPhone = phone.replace(/\D/g, '').slice(-10);
    const finalName = nameInput.trim() || invoice.customerName || "Customer";

    // --- AUTO-SAVE CUSTOMER LOGIC ---
    if (cleanedPhone.length === 10) {
      const allCustomers = StorageService.getCustomers();
      let linkedCustomer = allCustomers.find(c => c.phone === cleanedPhone);

      if (!linkedCustomer) {
        // Create New Customer if not exists
        linkedCustomer = {
          id: crypto.randomUUID(),
          name: finalName,
          company: (finalName === invoice.customerName) ? (invoice.customerName || '') : '',
          phone: cleanedPhone,
          email: '',
          address: invoice.customerAddress || '',
          gstin: invoice.customerGstin || '',
          balance: 0,
          notifications: []
        };
        StorageService.saveCustomer(linkedCustomer);
        setCustomer(linkedCustomer); // Update local state
      } else if (linkedCustomer.name.toUpperCase().includes('CASH')) {
        // Update existing CASH customer with a real name
        linkedCustomer.name = finalName;
        StorageService.updateCustomer(linkedCustomer);
        setCustomer(linkedCustomer);
      }

      // Update Invoice to link to this customer (if it was anonymous/Cash previously)
      if (linkedCustomer) {
        const updatedInvoice = { ...invoice };
        updatedInvoice.customerId = linkedCustomer.id;
        updatedInvoice.customerName = linkedCustomer.name;
        StorageService.updateInvoice(updatedInvoice);
      }
    }
    // --------------------------------

    // Construct Link
    const link = `https://billbook-app.web.app/view/${invoice.id}`;

    // Format Message
    const companyName = company.name || "My Business";
    const custName = finalName;

    const itemsList = invoice.items.map((item, idx) =>
      `${idx + 1}. ${item.description} x ${item.quantity} = ₹${Math.round((item.totalAmount || item.baseAmount) || 0)}`
    ).join('\n');

    const message = `*${companyName}*\n` +
      `Invoice No: ${invoice.invoiceNumber}\n` +
      `Date: ${new Date(invoice.date).toLocaleDateString()}\n` +
      `Customer: ${custName}\n\n` +
      `*Items:*\n${itemsList}\n\n` +
      `*Total Amount: ₹${invoice.total.toFixed(2)}*\n\n` +
      `Thank you for your business!\n` +
      `View your bill here:\n${link}`;

    const encodedMsg = encodeURIComponent(message);

    window.open(`https://wa.me/91${cleanedPhone}?text=${encodedMsg}`, '_blank');
    setShowWhatsAppPhoneModal(false);
  };

  const handleWhatsAppClick = () => {
    if (onClosePostSaveActions) onClosePostSaveActions();

    const isDefaultName = !invoice.customerName || invoice.customerName.toUpperCase().includes('CASH');
    setWaName(isDefaultName ? '' : invoice.customerName);

    if (waPhone && waPhone.length >= 10) {
      sendWhatsApp(waPhone, isDefaultName ? '' : invoice.customerName);
    } else {
      setShowWhatsAppPhoneModal(true);
    }
  };

  const handleDelete = () => {
    StorageService.deleteInvoice(invoice.id);
    onBack();
  };

  const handleReadAloud = async () => {
    setIsLoadingAudio(true);
    const amountInWords = numberToWords(invoice.total);
    const textToRead = `
      Invoice number ${invoice.invoiceNumber}.
      Dated ${invoice.date}.
      Billed to ${invoice.customerName}.
      Total amount is ${invoice.total} Rupees.
      ${amountInWords}.
      Thank you for your business.
    `;
    await GeminiService.generateSpeech(textToRead);
    setIsLoadingAudio(false);
  };

  const handleWhatsAppShare = () => {
    if (customer && customer.phone && customer.phone.length >= 10) {
      WhatsAppService.shareInvoice(invoice, customer, company);
    } else {
      // If customer has no phone (e.g. CASH), show the phone prompt
      setWaPhone('');
      const isDefaultName = !invoice.customerName || invoice.customerName.toUpperCase().includes('CASH');
      setWaName(isDefaultName ? '' : invoice.customerName);
      setShowWhatsAppPhoneModal(true);
    }
  };

  const handleDownloadPDF = async () => {
    setIsGeneratingPDF(true);
    try {
      // Create new PDF document (A4 size, units in mm)
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      // Standard A4 dimensions in mm
      const a4Width = 210;
      const leftMargin = 15;
      const rightMargin = a4Width - 15;
      let yPos = 15;

      // Safe Strings
      const safeCompany = {
        name: company.name || 'Company Name',
        address: company.address || '',
        phone: company.phone || '',
        email: company.email || ''
      };

      // --- Header ---
      doc.setFont("helvetica", "bold");
      doc.setFontSize(18);
      doc.text(safeCompany.name, a4Width / 2, yPos, { align: "center" });
      yPos += 6;

      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(80);
      doc.text(safeCompany.address, a4Width / 2, yPos, { align: "center" });
      yPos += 4;
      doc.text(`Ph: ${safeCompany.phone} | ${safeCompany.email}`, a4Width / 2, yPos, { align: "center" });
      yPos += 4;

      if (invoice.gstEnabled && company && (company.gstin || company.gst)) {
        doc.setFont("helvetica", "bold");
        doc.setFontSize(9);
        doc.setTextColor(34, 197, 94);
        const gstin = company.gstin || company.gst || '';
        doc.text(`GSTIN: ${gstin}`, a4Width / 2, yPos, { align: "center" });
        yPos += 4;
        doc.setTextColor(0);
      }
      yPos += 2;

      doc.setDrawColor(0);
      doc.setLineWidth(0.5);
      doc.line(leftMargin, yPos, rightMargin, yPos);
      yPos += 7;

      doc.setFont("helvetica", "bold");
      doc.setFontSize(14);
      doc.setTextColor(0);
      doc.text("TAX INVOICE", a4Width / 2, yPos, { align: "center" });
      yPos += 10;

      const infoStartY = yPos;

      doc.setFontSize(9);
      doc.setFont("helvetica", "bold");
      doc.text("Bill To:", leftMargin, yPos);
      yPos += 4;

      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.text(invoice.customerName || 'Customer', leftMargin, yPos);
      yPos += 4;

      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      const addressLines = doc.splitTextToSize(invoice.customerAddress || '', 80);
      doc.text(addressLines, leftMargin, yPos);

      let rightColY = infoStartY;
      const rightColX = 120;
      const lineSpacing = 5;

      doc.setFont("helvetica", "bold");
      doc.text("Invoice #:", rightColX, rightColY);
      doc.setFont("helvetica", "normal");
      doc.text(invoice.invoiceNumber || '-', rightColX + 25, rightColY);
      rightColY += lineSpacing;

      doc.setFont("helvetica", "bold");
      doc.text("Date:", rightColX, rightColY);
      doc.setFont("helvetica", "normal");
      doc.text(new Date(invoice.date).toLocaleDateString(), rightColX + 25, rightColY);
      rightColY += lineSpacing;

      doc.setFont("helvetica", "bold");
      doc.text("Mode:", rightColX, rightColY);
      doc.setFont("helvetica", "normal");
      const modeText = invoice.status === 'PAID' ? 'Cash' : 'Credit';
      doc.text(modeText, rightColX + 25, rightColY);

      yPos = Math.max(yPos + (addressLines.length * 4), rightColY) + 8;

      doc.setFillColor(245, 247, 250);
      doc.rect(leftMargin, yPos, rightMargin - leftMargin, 8, 'F');
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      doc.setTextColor(60);

      const hasHSN = invoice.items.some(i => i.hsn);
      const colX = {
        idx: leftMargin + 5,
        desc: leftMargin + 15,
        hsn: leftMargin + 60,
        qty: rightMargin - (invoice.gstEnabled ? 75 : 65),
        rate: rightMargin - (invoice.gstEnabled ? 45 : 35),
        gst: rightMargin - 20,
        amount: rightMargin - 5
      };

      doc.text("#", colX.idx, yPos + 5);
      doc.text("DESCRIPTION", colX.desc, yPos + 5);
      if (hasHSN) doc.text("HSN", colX.hsn, yPos + 5);
      doc.text("QTY", colX.qty, yPos + 5, { align: "right" });
      doc.text("RATE", colX.rate, yPos + 5, { align: "right" });
      if (invoice.gstEnabled) doc.text("GST%", colX.gst, yPos + 5, { align: "right" });
      doc.text("AMOUNT", colX.amount, yPos + 5, { align: "right" });

      yPos += 8;

      doc.setFont("helvetica", "normal");
      doc.setTextColor(0);
      doc.setFontSize(9);

      const rowHeight = 7;
      const pageHeight = doc.internal.pageSize.getHeight();

      invoice.items.forEach((item, i) => {
        if (yPos > pageHeight - 30) {
          doc.addPage();
          yPos = 20;
        }

        doc.text(`${i + 1}`, colX.idx, yPos + 5);
        doc.text(item.description || '-', colX.desc, yPos + 5);
        if (hasHSN) doc.text(item.hsn || '-', colX.hsn, yPos + 5);
        doc.text((item.quantity || 0).toString(), colX.qty, yPos + 5, { align: "right" });
        doc.text(`Rs. ${(item.rate || 0).toFixed(2)}`, colX.rate, yPos + 5, { align: "right" });
        if (invoice.gstEnabled) doc.text(`${((item.gstRate || 0)).toFixed(1)}%`, colX.gst, yPos + 5, { align: "right" });
        doc.setFont("helvetica", "bold");
        const amountWithGST = (item.totalAmount || item.baseAmount) || 0;
        doc.text(`Rs. ${amountWithGST.toFixed(2)}`, colX.amount, yPos + 5, { align: "right" });
        doc.setFont("helvetica", "normal");

        doc.setDrawColor(230);
        doc.line(leftMargin, yPos + rowHeight, rightMargin, yPos + rowHeight);
        yPos += rowHeight;
      });

      yPos += 4;

      const totalXLabel = rightMargin - 45;
      const totalXValue = rightMargin - 5;

      doc.setFont("helvetica", "bold");
      doc.text("Subtotal:", totalXLabel, yPos + 5, { align: "right" });
      doc.setFont("helvetica", "normal");
      doc.text(`Rs. ${(invoice.subtotal || 0).toFixed(2)}`, totalXValue, yPos + 5, { align: "right" });
      yPos += 7;

      const totalGSTAmount = (invoice.totalCgst || 0) + (invoice.totalSgst || 0) + (invoice.totalIgst || 0);
      if (invoice.gstEnabled && totalGSTAmount > 0) {
        if ((invoice.totalCgst || 0) > 0) {
          doc.setFont("helvetica", "bold");
          doc.setTextColor(34, 197, 94);
          doc.text("CGST:", totalXLabel, yPos + 5, { align: "right" });
          doc.setFont("helvetica", "normal");
          doc.text(`Rs. ${(invoice.totalCgst || 0).toFixed(2)}`, totalXValue, yPos + 5, { align: "right" });
          yPos += 5;
        }
        if ((invoice.totalSgst || 0) > 0) {
          doc.setFont("helvetica", "bold");
          doc.text("SGST:", totalXLabel, yPos + 5, { align: "right" });
          doc.setFont("helvetica", "normal");
          doc.text(`Rs. ${(invoice.totalSgst || 0).toFixed(2)}`, totalXValue, yPos + 5, { align: "right" });
          yPos += 5;
        }
        if ((invoice.totalIgst || 0) > 0) {
          doc.setFont("helvetica", "bold");
          doc.text("IGST:", totalXLabel, yPos + 5, { align: "right" });
          doc.setFont("helvetica", "normal");
          doc.text(`Rs. ${(invoice.totalIgst || 0).toFixed(2)}`, totalXValue, yPos + 5, { align: "right" });
          yPos += 5;
        }
        doc.setTextColor(0);
        yPos += 2;
      }

      doc.setDrawColor(0);
      doc.line(rightMargin - 70, yPos, rightMargin, yPos);
      yPos += 2;

      if (invoice.roundUpTo && invoice.roundUpTo > 0) {
        doc.setFont("helvetica", "normal");
        doc.setFontSize(9);
        doc.text("Original:", totalXLabel, yPos + 5, { align: "right" });
        doc.text(`${(invoice.total - (invoice.roundUpAmount || 0)).toFixed(2)}`, totalXValue, yPos + 5, { align: "right" });
        yPos += 5;
        doc.text("Round Off:", totalXLabel, yPos + 5, { align: "right" });
        doc.text(`${(invoice.roundUpAmount || 0).toFixed(2)}`, totalXValue, yPos + 5, { align: "right" });
        yPos += 5;
      }

      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.text("Total:", totalXLabel, yPos + 5, { align: "right" });
      doc.text(`Rs. ${invoice.total.toFixed(2)}`, totalXValue, yPos + 5, { align: "right" });
      yPos += 8;

      if (showPreviousBalance && customer) {
        let previousBalance = customer.balance || 0;
        if (invoice.status === 'PENDING') {
          previousBalance = (customer.balance || 0) - invoice.total;
        }
        doc.setFont("helvetica", "normal");
        doc.setFontSize(9);
        doc.setTextColor(80);
        doc.text("Prev Balance:", totalXLabel, yPos + 5, { align: "right" });
        doc.text(`Rs. ${previousBalance.toFixed(2)}`, totalXValue, yPos + 5, { align: "right" });
        yPos += 8;
      }

      // HSN Summary logic... (simplified for brevity)
      if (invoice.gstEnabled && company.show_hsn_summary !== false) {
        yPos += 8;
        doc.setFontSize(8);
        doc.setFont("helvetica", "bold");
        doc.text("HSN SUMMARY", leftMargin, yPos);
        yPos += 5;

        const hsnSummary = getHSNSummary(invoice, company);
        hsnSummary.forEach(group => {
          doc.setFont("helvetica", "normal");
          doc.text(`${group.hsn || 'N/A'} - Taxable: ${(group.baseAmount || 0).toFixed(2)} - Tax: ${(group.cgstAmount + group.sgstAmount + group.igstAmount).toFixed(2)}`, leftMargin, yPos);
          yPos += 5;
        });
      }

      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.setTextColor(60);
      doc.text("Amount in Words:", leftMargin, yPos);
      doc.setTextColor(0);
      doc.setFont("helvetica", "normal");

      const amountToConvert = (showPreviousBalance && customer) ? (customer.balance || 0) : invoice.total;
      const amountWords = numberToWords(amountToConvert);
      const startX = leftMargin + 35;
      const availableWidth = a4Width - startX - rightMargin + 50;
      const splitWords = doc.splitTextToSize(amountWords, availableWidth);
      doc.text(splitWords, startX, yPos);

      let footerY = Math.max(yPos + 20, pageHeight - 25);
      if (footerY > pageHeight - 20) {
        doc.addPage();
        footerY = pageHeight - 25;
      }

      // --- QR Code for Payments ---
      if (qrCodeUrl) {
        doc.setFontSize(8);
        doc.setFont("helvetica", "bold");
        doc.text("Scan to Pay:", rightMargin - 25, footerY - 4, { align: "right" });
        doc.addImage(qrCodeUrl, 'PNG', rightMargin - 30, footerY, 25, 25);
      }

      doc.setFontSize(8);
      doc.setTextColor(0);
      doc.setFont("helvetica", "bold");
      doc.text("Terms:", leftMargin, footerY);
      doc.setFont("helvetica", "normal");
      doc.text("Payment due within 30 days", leftMargin, footerY + 4);
      doc.text(`For ${safeCompany.name}`, rightMargin - 5, footerY + 30, { align: "right" });
      doc.text("Authorized Signatory", rightMargin - 5, footerY + 35, { align: "right" });

      try {
        if (Capacitor.isNativePlatform()) {
          // Request permissions before saving
          try {
            const status = await Filesystem.checkPermissions();
            if (status.publicStorage !== 'granted') {
              await Filesystem.requestPermissions();
            }
          } catch (pErr) {
            console.warn("Permission check failed:", pErr);
          }

          const pdfBase64 = doc.output('datauristring').split(',')[1];
          const fileName = `Invoice-${invoice.invoiceNumber}.pdf`;

          await Filesystem.writeFile({
            path: fileName,
            data: pdfBase64,
            directory: Directory.Documents,
            recursive: true
          });

          alert(`Saved successfully to Documents folder as ${fileName}`);
        } else {
          // Web Browser Logic (Keep explicit web logic or fallback)
          const pdfBlob = doc.output('blob');
          const pdfUrl = URL.createObjectURL(pdfBlob);

          // Try Web Share API first
          if (navigator.share && navigator.canShare && navigator.canShare({ files: [new File([pdfBlob], `Invoice-${invoice.invoiceNumber}.pdf`, { type: 'application/pdf' })] })) {
            const file = new File([pdfBlob], `Invoice-${invoice.invoiceNumber}.pdf`, { type: 'application/pdf' });
            await navigator.share({
              files: [file],
              title: `Invoice ${invoice.invoiceNumber}`,
              text: `Invoice from ${safeCompany.name}`
            });
          } else {
            doc.save(`Invoice-${invoice.invoiceNumber}.pdf`);
          }
          setTimeout(() => URL.revokeObjectURL(pdfUrl), 100);
        }
      } catch (saveError) {
        console.warn("PDF Save/Share failed:", saveError);
        alert(`Error: FAILED TO SAVE. ${saveError}`);
      }
    } catch (error) {
      console.error("PDF Generation Error:", error);
      alert("Error: FAILED TO SAVE. Please check app permissions.");
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-900 absolute inset-0 z-40">
      {/* App-like Top Navigation Bar */}
      <div className="sticky top-0 z-50 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-4 h-16 flex items-center justify-between shadow-sm flex-shrink-0 print:hidden">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-2 -ml-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            aria-label="Back"
          >
            <ArrowLeft className="w-6 h-6 text-slate-700 dark:text-slate-200" />
          </button>
          <div className="flex flex-col">
            <h1 className="text-lg font-semibold text-slate-900 dark:text-slate-100 leading-tight">Invoice #{invoice.invoiceNumber}</h1>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full w-fit ${invoice.status === 'PAID' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'}`}>
              {invoice.status}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <button onClick={() => onEdit(invoice)} className="p-2 rounded-full text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800" aria-label="Edit">
            <Edit className="w-5 h-5" />
          </button>
          <div className="relative">
            <button
              onClick={() => setShowOptions(!showOptions)}
              className="p-2 rounded-full text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
              aria-label="Options"
            >
              <MoreVertical className="w-5 h-5" />
            </button>
            {/* Dropdown Menu */}
            {showOptions && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowOptions(false)}></div>
                <div className="absolute right-0 mt-2 w-64 bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-slate-100 dark:border-slate-700 z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-100 origin-top-right">
                  <div className="p-1">
                    <button onClick={() => { setShowOptions(false); handleWhatsAppShare(); }} className="w-full flex items-center gap-3 px-3 py-3 text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-lg">
                      <MessageCircle className="w-4 h-4 text-green-500" /> Share on WhatsApp
                    </button>
                    <button onClick={() => { setShowOptions(false); handleDownloadPDF(); }} className="w-full flex items-center gap-3 px-3 py-3 text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-lg">
                      <Download className="w-4 h-4 text-blue-500" /> Download PDF
                    </button>
                    <button onClick={() => { setShowOptions(false); onViewLedger && onViewLedger(invoice.customerId); }} className="w-full flex items-center gap-3 px-3 py-3 text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-lg">
                      <Users className="w-4 h-4 text-blue-500" /> View Customer Ledger
                    </button>
                    <button onClick={() => { setShowOptions(false); handlePrint(); }} className="w-full flex items-center gap-3 px-3 py-3 text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-lg">
                      <Printer className="w-4 h-4 text-slate-500" /> Print
                    </button>
                    <button onClick={() => { setShowOptions(false); handleReadAloud(); }} className="w-full flex items-center gap-3 px-3 py-3 text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-lg">
                      <Play className="w-4 h-4 text-purple-500" /> Read Aloud
                    </button>
                    <div className="h-px bg-slate-100 dark:bg-slate-700 my-1"></div>
                    <div className="px-3 py-1.5 text-xs font-bold text-slate-400 uppercase tracking-wider">Settings</div>
                    <button onClick={() => setShowPreviousBalance(!showPreviousBalance)} className="w-full flex items-center justify-between px-3 py-3 text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-lg">
                      <span>Show Prev. Balance</span>
                      {showPreviousBalance && <Check className="w-4 h-4 text-blue-600" />}
                    </button>
                    <button onClick={() => setShowLedger(!showLedger)} className="w-full flex items-center justify-between px-3 py-3 text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-lg">
                      <span>Attach Ledger</span>
                      {showLedger && <Check className="w-4 h-4 text-blue-600" />}
                    </button>
                    <div className="h-px bg-slate-100 dark:bg-slate-700 my-1"></div>
                    <button onClick={() => { setShowOptions(false); setIsPosView(!isPosView); }} className="w-full flex items-center justify-between px-3 py-3 text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-lg">
                      <span>POS Mode (Thermal)</span>
                      {isPosView && <Check className="w-4 h-4 text-blue-600" />}
                    </button>
                    <button onClick={() => { setShowOptions(false); setShowDeleteConfirm(true); }} className="w-full flex items-center gap-3 px-3 py-3 text-sm font-medium text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg">
                      <Trash2 className="w-4 h-4" /> Delete Invoice
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Main Content - Scrollable Invoice Preview */}
      <div className={`flex-1 overflow-y-auto overflow-x-hidden bg-slate-100 dark:bg-slate-950 p-4 pb-24 print:p-0 print:bg-white ${isPosView ? 'print:hidden' : ''}`}>

        {/* Standard A4 Print Style Removed - Handled by Portal */}

        {/* Invoice Paper Shadow Container */}
        <div className="max-w-3xl mx-auto bg-white dark:bg-slate-900 shadow-xl rounded-sm print:shadow-none print:w-full overflow-hidden scale-100 md:scale-100 origin-top border dark:border-slate-800 print:border-none">
          <div id="invoice-print" className="p-6 md:p-10 text-slate-900 dark:text-slate-100 print:text-black">

            {/* Header */}
            <div className="text-center mb-6">
              <h1 className="text-2xl md:text-3xl font-bold mb-1 uppercase text-slate-900 dark:text-slate-100">{company.name}</h1>
              <p className="text-sm text-slate-600 dark:text-slate-400">{company.address}</p>
              <p className="text-sm text-slate-600 dark:text-slate-400">Ph: {company.phone}</p>
              {invoice.gstEnabled && (company.gstin || company.gst) && (
                <p className="text-sm text-green-700 dark:text-green-500 font-bold mt-1">GSTIN: {company.gstin || company.gst}</p>
              )}
            </div>

            <div className="border-b-2 border-slate-800 dark:border-slate-700 mb-6"></div>

            <div className="flex justify-between items-start mb-8">
              <div className="text-left">
                <h3 className="font-bold text-xs uppercase text-slate-400 mb-1">Billed To</h3>
                <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100">{invoice.customerName}</h2>
                <p className="text-sm text-slate-600 dark:text-slate-400 whitespace-pre-wrap max-w-[200px]">{invoice.customerAddress}</p>
              </div>
              <div className="text-right">
                <div className="mb-2">
                  <span className="block text-xs font-bold text-slate-400 uppercase">Invoice No</span>
                  <span className="text-lg font-bold text-slate-800 dark:text-slate-100">#{invoice.invoiceNumber}</span>
                </div>
                <div>
                  <span className="block text-xs font-bold text-slate-400 uppercase">Date</span>
                  <span className="text-base font-medium text-slate-800 dark:text-slate-100">{new Date(invoice.date).toLocaleDateString()}</span>
                </div>
              </div>
            </div>

            {/* Table */}
            <div className="mb-8 overflow-hidden rounded-lg border border-slate-200 dark:border-slate-700">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-bold uppercase text-xs">
                  <tr>
                    <th className="py-3 px-4 text-left">Item</th>
                    <th className="py-3 px-4 text-center">Qty</th>
                    <th className="py-3 px-4 text-right">Price</th>
                    <th className="py-3 px-4 text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {invoice.items.map((item, idx) => (
                    <tr key={idx}>
                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-800 dark:text-slate-200">{item.description}</div>
                        {item.hsn && <div className="text-xs text-slate-400">HSN: {item.hsn}</div>}
                      </td>
                      <td className="py-3 px-4 text-center font-medium dark:text-slate-300">{item.quantity}</td>
                      <td className="py-3 px-4 text-right dark:text-slate-300">₹{item.rate}</td>
                      <td className="py-3 px-4 text-right font-bold dark:text-slate-100">₹{((item.totalAmount || item.baseAmount) || 0).toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Totals */}
            <div className="flex justify-end mb-8">
              <div className="w-full md:w-1/2 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500 dark:text-slate-400 font-medium">Subtotal</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">₹{invoice.subtotal.toFixed(2)}</span>
                </div>

                {invoice.gstEnabled && ((invoice.totalCgst || 0) + (invoice.totalSgst || 0) + (invoice.totalIgst || 0)) > 0 && (
                  <>
                    {(invoice.totalCgst || 0) > 0 && (
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-500 dark:text-slate-400">CGST</span>
                        <span className="font-medium dark:text-slate-300">₹{(invoice.totalCgst || 0).toFixed(2)}</span>
                      </div>
                    )}
                    {(invoice.totalSgst || 0) > 0 && (
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-500 dark:text-slate-400">SGST</span>
                        <span className="font-medium dark:text-slate-300">₹{(invoice.totalSgst || 0).toFixed(2)}</span>
                      </div>
                    )}
                    {(invoice.totalIgst || 0) > 0 && (
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-500 dark:text-slate-400">IGST</span>
                        <span className="font-medium dark:text-slate-300">₹{(invoice.totalIgst || 0).toFixed(2)}</span>
                      </div>
                    )}
                  </>
                )}

                <div className="border-t border-slate-200 dark:border-slate-700 pt-2 flex justify-between items-end">
                  <span className="text-base font-bold text-slate-900 dark:text-slate-100">Total</span>
                  <span className="text-2xl font-black text-blue-600 dark:text-blue-400">₹{invoice.total.toFixed(2)}</span>
                </div>
                {/* Amount in Words */}
                <div className="text-[10px] text-right text-slate-400 mt-1 italic">
                  ({numberToWords(Math.round(invoice.total))})
                </div>
              </div>
            </div>

            {/* Footer and QR Code */}
            <div className="mt-12 flex flex-col md:flex-row justify-between items-start gap-8">
              <div className="flex-1">
                <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-100 dark:border-slate-800">
                  <p className="font-bold uppercase text-xs mb-1 text-slate-400">Terms & Conditions</p>
                  <p className="text-xs text-slate-600 dark:text-slate-400 font-medium">1. Goods once sold will not be taken back.</p>
                  <p className="text-xs text-slate-600 dark:text-slate-400 font-medium">2. Interest @18% will be charged if not paid within 30 days.</p>
                  <p className="mt-4 font-bold uppercase text-slate-900 dark:text-slate-100">Thank you for your business!</p>
                </div>
              </div>

              {qrCodeUrl && (
                <div className="flex flex-col items-center p-4 bg-slate-50 dark:bg-slate-800/30 rounded-2xl border border-slate-100 dark:border-slate-800">
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Scan to Pay</p>
                  <img src={qrCodeUrl} className="w-24 h-24 mix-blend-multiply dark:mix-blend-normal" alt="Payment QR" />
                  <p className="text-[10px] font-bold text-slate-600 dark:text-slate-300 mt-2">{company.upiId}</p>
                </div>
              )}

              <div className="text-right flex flex-col items-end min-w-[150px]">
                <div className="h-16 w-32 border-b border-slate-200 dark:border-slate-800 mb-2"></div>
                <p className="font-bold text-sm">For {company.name}</p>
                <p className="text-[10px] font-medium text-slate-400 uppercase">Authorized Signatory</p>
              </div>
            </div>

          </div>
        </div>

        {/* POS VIEW RENDERER (Absolute Overlay or Conditional) */}
        {/* POS VIEW RENDERER (Absolute Overlay or Conditional) */}
        {isPosView && (
          <div className="fixed inset-0 z-[60] bg-slate-800/90 backdrop-blur-sm flex justify-center overflow-y-auto print:hidden">
            {/* Close Button for POS View */}
            <button
              onClick={() => setIsPosView(false)}
              className="fixed top-4 right-4 bg-white/10 text-white p-2 rounded-full hover:bg-white/20 z-[70]"
            >
              <span className="sr-only">Close</span>
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
            </button>

            <div
              className="bg-white text-black w-[80mm] min-h-0 h-fit shadow-2xl my-8 mx-auto p-2 py-4 font-mono text-[10px] leading-tight"
              onClick={(e) => e.stopPropagation()}
            >
              {/* POS content (Screen Version) */}
              <div className="text-center mb-4">
                <h1 className="text-xl font-bold uppercase">{company.name}</h1>
                <p className="text-[10px]">{company.address}</p>
                <p className="text-[10px]">Ph: {company.phone}</p>
                {invoice.gstEnabled && (company.gstin || company.gst) && (
                  <p className="text-[10px] font-bold mt-1">GSTIN: {company.gstin || company.gst}</p>
                )}
              </div>
              <div className="border-b border-dashed border-black my-2"></div>
              <div className="flex justify-between text-[10px] mb-1">
                <span>Invoice No:</span>
                <span className="font-bold">#{invoice.invoiceNumber}</span>
              </div>
              <div className="flex justify-between text-[10px] mb-1">
                <span>Date:</span>
                <span>{new Date(invoice.date).toLocaleDateString()}</span>
              </div>
              <div className="flex justify-between text-[10px] mb-4">
                <span>Customer:</span>
                <span className="font-bold">{invoice.customerName}</span>
              </div>

              <div className="border-b border-dashed border-black my-2"></div>
              <table className="w-full text-[10px] mb-4">
                <thead>
                  <tr>
                    <th className="text-left py-1">Item</th>
                    <th className="text-center py-1">Qty</th>
                    <th className="text-right py-1">Rate</th>
                    <th className="text-right py-1">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {invoice.items.map((item, idx) => (
                    <tr key={idx}>
                      <td className="text-left py-1">{item.description}</td>
                      <td className="text-center py-1">{item.quantity}</td>
                      <td className="text-right py-1">₹{item.rate}</td>
                      <td className="text-right py-1">₹{((item.totalAmount || item.baseAmount) || 0).toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="border-b border-dashed border-black my-2"></div>

              <div className="text-[10px] text-right space-y-1 mb-4">
                <div className="flex justify-between">
                  <span>Subtotal:</span>
                  <span>{invoice.subtotal.toFixed(2)}</span>
                </div>
                {invoice.gstEnabled && ((invoice.totalCgst || 0) + (invoice.totalSgst || 0) + (invoice.totalIgst || 0)) > 0 && (
                  <>
                    {(invoice.totalCgst || 0) > 0 && (
                      <div className="flex justify-between">
                        <span>CGST:</span>
                        <span>{(invoice.totalCgst || 0).toFixed(2)}</span>
                      </div>
                    )}
                    {(invoice.totalSgst || 0) > 0 && (
                      <div className="flex justify-between">
                        <span>SGST:</span>
                        <span>{(invoice.totalSgst || 0).toFixed(2)}</span>
                      </div>
                    )}
                    {(invoice.totalIgst || 0) > 0 && (
                      <div className="flex justify-between">
                        <span>IGST:</span>
                        <span>{(invoice.totalIgst || 0).toFixed(2)}</span>
                      </div>
                    )}
                  </>
                )}
                <div className="flex justify-between font-bold text-sm mt-2 pt-2 border-t border-dashed border-black">
                  <span>TOTAL:</span>
                  <span>₹{Math.round(invoice.total).toFixed(2)}</span>
                </div>
                <div className="text-xs text-center mt-2 italic">
                  ({numberToWords(Math.round(invoice.total))})
                </div>
              </div>
              <div className="border-b border-dashed border-black my-2"></div>

              {qrCodeUrl && (
                <div className="flex flex-col items-center py-4">
                  <p className="text-[9px] font-black uppercase mb-1">Scan to Pay</p>
                  <img src={qrCodeUrl} className="w-32 h-32" alt="POS Payment QR" />
                  <p className="text-[8px] font-bold mt-1">{company.upiId}</p>
                </div>
              )}

              <div className="text-center text-[9px] mt-4">
                <p className="font-bold uppercase mb-1">Thank you for your business!</p>
                <p>Terms & Conditions Apply</p>
              </div>

              {/* Print Button for POS View */}
              <button
                onClick={handlePrint}
                className="w-full mt-4 py-4 bg-blue-600 text-white font-bold rounded-lg flex items-center justify-center gap-2 shadow-lg shadow-blue-500/20 active:scale-95 transition-transform print:hidden"
              >
                <Printer className="w-5 h-5" />
                Print Receipt
              </button>

              {/* Mobile Only: Close Button at bottom for easier access */}
              <button
                onClick={() => setIsPosView(false)}
                className="w-full mt-2 py-3 bg-slate-100 text-slate-900 rounded-lg md:hidden print:hidden border border-slate-200"
              >
                Close View
              </button>
            </div>
          </div>
        )}

        {/* PRINT PORTAL (Using User's Robust Method) */}
        {createPortal(
          <div id="print-mount" style={{ display: 'none' }}>
            <style>{`
                    @media print {
                        body > * { display: none !important; }
                        body > #print-mount { display: block !important; }
                        #print-mount {
                            position: absolute;
                            top: 0;
                            left: 0;
                            width: 100%;
                            height: auto;
                            background: white;
                            z-index: 9999;
                            -webkit-print-color-adjust: exact;
                            print-color-adjust: exact;
                        }
                        @page { margin: 0; size: auto; }
                    }
                `}</style>

            {isPosView ? (
              /* POS PRINT LAYOUT (80mm) */
              <div className="bg-white text-black w-[80mm] font-mono text-[12px] leading-tight p-0 mx-auto">
                <div className="text-center mb-4">
                  <h1 className="text-xl font-bold uppercase">{company.name}</h1>
                  <p className="text-[10px]">{company.address}</p>
                  <p className="text-[10px]">Ph: {company.phone}</p>
                  {invoice.gstEnabled && (company.gstin || company.gst) && (
                    <p className="text-[10px] font-bold mt-1">GSTIN: {company.gstin || company.gst}</p>
                  )}
                </div>
                <div className="border-b border-dashed border-black my-2"></div>
                <div className="flex justify-between mb-1">
                  <span>Invoice No:</span>
                  <span className="font-bold">#{invoice.invoiceNumber}</span>
                </div>
                <div className="flex justify-between mb-1">
                  <span>Date:</span>
                  <span>{new Date(invoice.date).toLocaleDateString()}</span>
                </div>
                <div className="flex justify-between mb-4">
                  <span>Customer:</span>
                  <span className="font-bold">{invoice.customerName}</span>
                </div>

                <div className="border-b border-dashed border-black my-2"></div>
                <table className="w-full mb-4 text-left">
                  <thead>
                    <tr>
                      <th className="py-1 w-[40%]">Item</th>
                      <th className="py-1 text-center">Qty</th>
                      <th className="py-1 text-right">Price</th>
                      <th className="py-1 text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {invoice.items.map((item, idx) => (
                      <tr key={idx}>
                        <td className="py-1">{item.description}</td>
                        <td className="py-1 text-center">{item.quantity}</td>
                        <td className="py-1 text-right">{item.rate}</td>
                        <td className="py-1 text-right">{((item.totalAmount || item.baseAmount) || 0).toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="border-b border-dashed border-black my-2"></div>

                <div className="text-right space-y-1 mb-4">
                  <div className="flex justify-between">
                    <span>Subtotal:</span>
                    <span>{invoice.subtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between font-bold text-sm mt-2 pt-2 border-t border-dashed border-black">
                    <span>TOTAL:</span>
                    <span>₹{Math.round(invoice.total).toFixed(2)}</span>
                  </div>
                  <div className="text-[10px] text-center mt-2 italic">
                    ({numberToWords(Math.round(invoice.total))})
                  </div>
                </div>
                <div className="border-b border-dashed border-black my-2"></div>

                {qrCodeUrl && (
                  <div className="flex flex-col items-center py-4">
                    <p className="text-[9px] font-black uppercase mb-1">Scan to Pay</p>
                    <img src={qrCodeUrl} className="w-32 h-32" alt="Print QR" />
                    <p className="text-[8px] font-bold mt-1">{company.upiId}</p>
                  </div>
                )}

                <div className="text-center text-[10px] mt-4">
                  <p className="font-bold uppercase mb-1">Thank you!</p>
                </div>
              </div>
            ) : (
              /* A4 PRINT LAYOUT */
              <div className="p-10 text-black max-w-[210mm] mx-auto bg-white">
                <div className="text-center mb-6">
                  <h1 className="text-3xl font-bold mb-1 uppercase">{company.name}</h1>
                  <p className="text-sm text-gray-600">{company.address}</p>
                  <p className="text-sm text-gray-600">Ph: {company.phone}</p>
                  {invoice.gstEnabled && (company.gstin || company.gst) && (
                    <p className="text-sm font-bold mt-1">GSTIN: {company.gstin || company.gst}</p>
                  )}
                </div>

                <div className="border-b-2 border-black mb-6"></div>

                <div className="flex justify-between items-start mb-8">
                  <div className="text-left">
                    <h3 className="font-bold text-xs uppercase text-gray-500 mb-1">Billed To</h3>
                    <h2 className="text-lg font-bold">{invoice.customerName}</h2>
                    <p className="text-sm text-gray-600 whitespace-pre-wrap max-w-[250px]">{invoice.customerAddress}</p>
                  </div>
                  <div className="text-right">
                    <div className="mb-2">
                      <span className="block text-xs font-bold text-gray-500 uppercase">Invoice No</span>
                      <span className="text-lg font-bold">#{invoice.invoiceNumber}</span>
                    </div>
                    <div>
                      <span className="block text-xs font-bold text-gray-500 uppercase">Date</span>
                      <span className="text-base font-medium">{new Date(invoice.date).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>

                <table className="w-full text-sm mb-8 border-collapse">
                  <thead>
                    <tr className="border-b border-black">
                      <th className="py-2 text-left">Item</th>
                      <th className="py-2 text-center">Qty</th>
                      <th className="py-2 text-right">Price</th>
                      <th className="py-2 text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {invoice.items.map((item, idx) => (
                      <tr key={idx} className="border-b border-gray-200">
                        <td className="py-3">{item.description}</td>
                        <td className="py-3 text-center">{item.quantity}</td>
                        <td className="py-3 text-right">₹{item.rate}</td>
                        <td className="py-3 text-right font-bold">₹{((item.totalAmount || item.baseAmount) || 0).toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                <div className="flex justify-end mb-8">
                  <div className="w-1/2 space-y-2 text-right">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600 font-medium">Subtotal</span>
                      <span className="font-bold">₹{invoice.subtotal.toFixed(2)}</span>
                    </div>
                    <div className="border-t border-black pt-2 flex justify-between items-end">
                      <span className="text-base font-bold">Total</span>
                      <span className="text-2xl font-black">₹{invoice.total.toFixed(2)}</span>
                    </div>
                  </div>
                </div>
                {/* Amount in Words for Portal A4 */}
                <div className="text-right text-[10px] italic mb-8 -mt-6">
                  ({numberToWords(Math.round(invoice.total))})
                </div>

                <div className="flex justify-between items-end mt-12 border-t pt-6">
                  <div className="space-y-4">
                    {qrCodeUrl && (
                      <div className="flex flex-col items-center p-2 border border-gray-100 rounded">
                        <p className="text-[8px] font-bold uppercase mb-1 text-gray-400">Scan to Pay</p>
                        <img src={qrCodeUrl} className="w-20 h-20" alt="Print QR A4" />
                        <p className="text-[8px] font-bold mt-1">{company.upiId}</p>
                      </div>
                    )}
                    <div className="text-xs text-gray-500">
                      <p className="font-bold uppercase text-[10px] mb-1">Terms:</p>
                      <p>1. Payment due within 30 days.</p>
                      <p>2. Goods once sold will not be taken back.</p>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="h-16 w-40 border-b border-gray-300 mb-2"></div>
                    <p className="font-bold text-sm">For {company.name}</p>
                    <p className="text-xs text-gray-400 uppercase">Authorized Signatory</p>
                  </div>
                </div>

                <div className="text-center text-gray-400 text-[10px] mt-8">
                  <p className="font-bold uppercase mb-1 tracking-widest">Thank you for your business!</p>
                </div>
              </div>
            )}
          </div>,
          document.body
        )}

        {/* Delete Confirmation Modal */}
        {showDeleteConfirm && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-[60] p-4 print:hidden">
            <div className="bg-white dark:bg-slate-900 rounded-[40px] p-8 shadow-2xl max-w-sm w-full animate-in zoom-in-95 duration-200 border border-slate-100 dark:border-slate-800">
              <h3 className="text-2xl font-black text-slate-900 dark:text-slate-100 mb-2 uppercase italic tracking-tight">Delete Invoice?</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 mb-8 font-medium">Are you sure you want to delete this invoice? This action cannot be undone.</p>
              <div className="flex gap-4">
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="flex-1 px-6 py-4 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-2xl hover:bg-slate-200 dark:hover:bg-slate-700 font-black uppercase tracking-widest text-[10px] transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDelete}
                  className="flex-1 px-6 py-4 bg-red-600 text-white rounded-2xl hover:bg-red-700 font-black uppercase tracking-widest text-[10px] shadow-xl shadow-red-500/30 transition-all active:scale-95"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Post Save Success Actions Modal */}
        {showPostSaveActions && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-[100] p-4 animate-in fade-in duration-200">
            <div className="bg-white dark:bg-slate-900 rounded-[32px] p-6 w-full max-w-sm text-center shadow-2xl scale-100 animate-in zoom-in-95 duration-200">
              <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-green-200 shadow-lg">
                <Check className="w-10 h-10" />
              </div>

              <h2 className="text-2xl font-black text-slate-800 dark:text-slate-100 mb-2">Invoice Saved!</h2>
              <p className="text-slate-500 font-medium mb-8">₹{invoice.total} • #{invoice.invoiceNumber}</p>

              <div className="space-y-4">
                <button
                  onClick={handlePrint}
                  className="w-full py-5 rounded-2xl bg-blue-600 text-white font-black text-lg shadow-xl shadow-blue-500/30 active:scale-95 transition-transform flex items-center justify-center gap-3"
                >
                  <Printer className="w-6 h-6" />
                  Print Invoice
                </button>

                <button
                  onClick={handleWhatsAppClick}
                  className="w-full py-5 rounded-2xl bg-green-600 text-white font-black text-lg shadow-xl shadow-green-500/30 active:scale-95 transition-transform flex items-center justify-center gap-3"
                >
                  <MessageCircle className="w-6 h-6" />
                  Send on WhatsApp
                </button>

                <button
                  onClick={onClosePostSaveActions}
                  className="w-full py-4 font-bold text-slate-400 mt-2"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        {/* WhatsApp Phone Input Modal */}
        {showWhatsAppPhoneModal && (
          <div className="fixed inset-0 z-[100] flex items-end justify-center p-0 md:p-6 sm:items-center">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowWhatsAppPhoneModal(false)}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ y: 100, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              className="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-t-[32px] md:rounded-[32px] p-8 shadow-2xl z-[110] overflow-hidden"
            >
              <div className="w-12 h-1.5 bg-slate-200 dark:bg-slate-800 rounded-full mx-auto mb-8 md:hidden" />

              <div className="flex items-center gap-4 mb-8">
                <div className="w-14 h-14 rounded-2xl bg-green-50 dark:bg-green-900/30 flex items-center justify-center text-green-600 dark:text-green-400">
                  <MessageCircle className="w-8 h-8" />
                </div>
                <div>
                  <h3 className="text-2xl font-semibold text-slate-900 dark:text-slate-100 tracking-tight">Send via WhatsApp</h3>
                  <p className="text-sm text-slate-500 font-medium">Link this bill to a phone number</p>
                </div>
              </div>

              <div className="space-y-6 mb-10">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">Customer Name</label>
                  <input
                    type="text"
                    value={waName}
                    onChange={(e) => setWaName(e.target.value)}
                    className="w-full p-4 bg-slate-50 dark:bg-slate-950/50 border border-slate-100 dark:border-slate-800 rounded-2xl text-lg font-medium text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-primary outline-none transition-all placeholder:text-slate-300 dark:placeholder:text-slate-700"
                    placeholder="Enter Name"
                  />
                </div>

                <div className="space-y-2 relative">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">WhatsApp Number</label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-lg">+91</span>
                    <input
                      type="tel"
                      value={waPhone}
                      onChange={async (e) => {
                        const val = e.target.value;
                        setWaPhone(val);

                        const res = await ContactService.resolveName(val);
                        if (res.name) {
                          setWaName(res.name);
                        }

                        if (val.length >= 2) {
                          const results = await ContactService.getCombinedContacts(val);
                          setSuggestions(results);
                          setShowSuggestions(true);
                        } else {
                          setShowSuggestions(false);
                        }
                      }}
                      onFocus={() => { if (waPhone.length >= 2) setShowSuggestions(true); }}
                      onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                      className="w-full p-4 pl-14 bg-slate-50 dark:bg-slate-950/50 border border-slate-100 dark:border-slate-800 rounded-2xl text-xl font-bold tracking-widest text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-primary outline-none transition-all placeholder:text-slate-300 dark:placeholder:text-slate-700"
                      placeholder="9999999999"
                      autoFocus
                    />
                  </div>

                  {showSuggestions && suggestions.length > 0 && (
                    <div className="absolute z-[120] left-0 right-0 top-full mt-2 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl shadow-2xl max-h-48 overflow-y-auto p-2">
                      {suggestions.map((s, i) => (
                        <button
                          key={i}
                          type="button"
                          onClick={() => {
                            setWaPhone(s.phone);
                            setWaName(s.name);
                            setShowSuggestions(false);
                          }}
                          className="w-full p-3 flex items-center gap-3 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl transition-colors text-left"
                        >
                          <div className={`w-9 h-9 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${s.source === 'db' ? 'bg-blue-100 text-blue-600' : 'bg-green-100 text-green-600'}`}>
                            {s.source === 'db' ? 'DB' : 'PH'}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">{s.name}</div>
                            <div className="text-[10px] font-medium text-slate-400 tracking-widest">{s.phone}</div>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="flex flex-col gap-3">
                <button
                  onClick={() => sendWhatsApp(waPhone, waName)}
                  className="w-full py-4 bg-primary text-white rounded-2xl font-semibold tracking-wide shadow-xl shadow-primary/20 flex items-center justify-center gap-2 active:scale-95 transition-all"
                >
                  <MessageCircle className="w-5 h-5" />
                  Send Link
                </button>

                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => handleSaveToPhoneDirect(waPhone, waName)}
                    className="py-4 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 rounded-2xl font-semibold text-sm flex items-center justify-center gap-2 active:scale-95 transition-all"
                  >
                    <UserPlus className="w-5 h-5" />
                    Save Contact
                  </button>
                  <button
                    onClick={() => setShowWhatsAppPhoneModal(false)}
                    className="py-4 text-slate-400 font-semibold text-sm hover:text-slate-600 transition-colors"
                  >
                    Not Now
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}

      </div>
    </div>
  );
};

export default InvoiceView;
