
import React, { useState, useEffect } from 'react';
import { Invoice, CompanyProfile, DEFAULT_COMPANY, Customer } from '../types';
import { StorageService } from '../services/storageService';
import { GeminiService } from '../services/geminiService';
import { WhatsAppService } from '../services/whatsappService';
import { Printer, ArrowLeft, Play, Loader2, Download, Edit, Trash2, MoreVertical, MessageCircle, Check, FilePlus, History } from 'lucide-react';
import { jsPDF } from 'jspdf';
import { useCompany } from '@/contexts/CompanyContext';

interface InvoiceViewProps {
  invoice: Invoice;
  onBack: () => void;
  onEdit: (invoice: Invoice) => void;
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

// Helper for Amount in Words
const numberToWords = (n: number): string => {
  const ones = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"];
  const tens = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

  if (n === 0) return "Zero";

  const convert = (n: number): string => {
    if (n < 20) return ones[n];
    if (n < 100) return tens[Math.floor(n / 10)] + (n % 10 !== 0 ? " " + ones[n % 10] : "");
    if (n < 1000) return ones[Math.floor(n / 100)] + " Hundred" + (n % 100 !== 0 ? " " + convert(n % 100) : "");
    if (n < 100000) return convert(Math.floor(n / 100000)) + " Lakh" + (n % 100000 !== 0 ? " " + convert(n % 100000) : "");
    if (n < 10000000) return convert(Math.floor(n / 100000)) + " Crore" + (n % 10000000 !== 0 ? " " + convert(n % 10000000) : "");
    return convert(Math.floor(n / 10000000)) + " Crore" + (n % 10000000 !== 0 ? " " + convert(n % 10000000) : "");
  };

  const integerPart = Math.floor(n);
  const decimalPart = Math.round((n - integerPart) * 100);

  let result = convert(integerPart);

  if (decimalPart > 0) {
    result += " and " + convert(decimalPart) + " Paise";
  }

  return result + " Only";
};

const InvoiceView: React.FC<InvoiceViewProps> = ({ invoice, onBack, onEdit }) => {
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
        show_hsn_summary: firebaseCompany.show_hsn_summary ?? true
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
  }, [invoice, firebaseCompany]);

  const handlePrint = () => {
    window.print();
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
    if (customer) {
      WhatsAppService.shareInvoice(invoice, customer, company);
    }
  };

  const handleDownloadPDF = async () => {
    // ... (Keep existing PDF logic - it is good)
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

      // --- Header ---
      doc.setFont("helvetica", "bold");
      doc.setFontSize(18);
      doc.text(company.name, a4Width / 2, yPos, { align: "center" });
      yPos += 6;

      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(80);
      doc.text(company.address, a4Width / 2, yPos, { align: "center" });
      yPos += 4;
      doc.text(`Ph: ${company.phone} | ${company.email}`, a4Width / 2, yPos, { align: "center" });
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
      doc.text(invoice.customerName, leftMargin, yPos);
      yPos += 4;

      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      const addressLines = doc.splitTextToSize(invoice.customerAddress, 80);
      doc.text(addressLines, leftMargin, yPos);

      let rightColY = infoStartY;
      const rightColX = 120;
      const lineSpacing = 5;

      doc.setFont("helvetica", "bold");
      doc.text("Invoice #:", rightColX, rightColY);
      doc.setFont("helvetica", "normal");
      doc.text(invoice.invoiceNumber, rightColX + 25, rightColY);
      rightColY += lineSpacing;

      doc.setFont("helvetica", "bold");
      doc.text("Date:", rightColX, rightColY);
      doc.setFont("helvetica", "normal");
      doc.text(invoice.date, rightColX + 25, rightColY);
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
        doc.text(item.description, colX.desc, yPos + 5);
        if (hasHSN) doc.text(item.hsn || '-', colX.hsn, yPos + 5);
        doc.text(item.quantity.toString(), colX.qty, yPos + 5, { align: "right" });
        doc.text(`Rs. ${item.rate.toFixed(2)}`, colX.rate, yPos + 5, { align: "right" });
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
      doc.text(`Rs. ${invoice.subtotal.toFixed(2)}`, totalXValue, yPos + 5, { align: "right" });
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
        let previousBalance = customer.balance;
        if (invoice.status === 'PENDING') {
          previousBalance = customer.balance - invoice.total;
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
          doc.text(`${group.hsn || 'N/A'} - Taxable: ${group.baseAmount.toFixed(2)} - Tax: ${(group.cgstAmount + group.sgstAmount + group.igstAmount).toFixed(2)}`, leftMargin, yPos);
          yPos += 5;
        });
      }

      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.setTextColor(60);
      doc.text("Amount in Words:", leftMargin, yPos);
      doc.setTextColor(0);
      doc.setFont("helvetica", "normal");

      const amountToConvert = (showPreviousBalance && customer) ? customer.balance : invoice.total;
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

      doc.setFontSize(8);
      doc.setTextColor(0);
      doc.setFont("helvetica", "bold");
      doc.text("Terms:", leftMargin, footerY);
      doc.setFont("helvetica", "normal");
      doc.text("Payment due within 30 days", leftMargin, footerY + 4);
      doc.text(`For ${company.name}`, rightMargin - 5, footerY, { align: "right" });

      try {
        const pdfBlob = doc.output('blob');
        const pdfUrl = URL.createObjectURL(pdfBlob);

        // Try Web Share API first
        if (navigator.share && navigator.canShare && navigator.canShare({ files: [new File([pdfBlob], `Invoice-${invoice.invoiceNumber}.pdf`, { type: 'application/pdf' })] })) {
          const file = new File([pdfBlob], `Invoice-${invoice.invoiceNumber}.pdf`, { type: 'application/pdf' });
          await navigator.share({
            files: [file],
            title: `Invoice ${invoice.invoiceNumber}`,
            text: `Invoice from ${company.name}`
          });
        } else {
          // Fallback to standard save or blob download
          const link = document.createElement('a');
          link.href = pdfUrl;
          link.download = `Invoice-${invoice.invoiceNumber}.pdf`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
        }

        setTimeout(() => URL.revokeObjectURL(pdfUrl), 100);
      } catch (saveError) {
        console.warn("PDF Save/Share failed:", saveError);
        const pdfData = doc.output('datauristring');
        const win = window.open();
        if (win) {
          win.document.write(`<iframe src="${pdfData}" frameborder="0" style="border:0; top:0px; left:0px; bottom:0px; right:0px; width:100%; height:100%;" allowfullscreen></iframe>`);
        } else {
          alert("Error: FAILED TO SAVE. Please check app permissions.");
        }
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
      <div className="sticky top-0 z-50 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-4 h-16 flex items-center justify-between shadow-sm flex-shrink-0">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-2 -ml-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            aria-label="Back"
          >
            <ArrowLeft className="w-6 h-6 text-slate-700 dark:text-slate-200" />
          </button>
          <div className="flex flex-col">
            <h1 className="text-lg font-bold text-slate-800 dark:text-slate-100 leading-tight">Invoice #{invoice.invoiceNumber}</h1>
            <span className={`text-xs font-bold px-2 py-0.5 rounded-full w-fit ${invoice.status === 'PAID' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
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
      <div className="flex-1 overflow-y-auto overflow-x-hidden bg-slate-100 dark:bg-slate-950 p-4 pb-24">

        {/* Invoice Paper Shadow Container */}
        <div className="max-w-3xl mx-auto bg-white dark:bg-slate-900 shadow-xl rounded-sm print:shadow-none print:w-full overflow-hidden scale-100 md:scale-100 origin-top border dark:border-slate-800">
          <div id="invoice-content" className="p-6 md:p-10 text-slate-900 dark:text-slate-100">

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
              </div>
            </div>

            {/* Footer Note */}
            <div className="text-center text-xs text-slate-400 mt-12 bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-100 dark:border-slate-800">
              <p className="font-bold uppercase mb-1">Thank you for your business!</p>
              <p>Terms & Conditions Apply</p>
            </div>

          </div>
        </div>

        {/* Delete Confirmation Modal */}
        {showDeleteConfirm && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
            <div className="bg-white rounded-2xl p-6 shadow-2xl max-w-sm w-full animate-in zoom-in-95 duration-200">
              <h3 className="text-lg font-bold text-slate-900 mb-2">Delete Invoice?</h3>
              <p className="text-sm text-slate-500 mb-6">Are you sure you want to delete this invoice? This action cannot be undone.</p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="flex-1 px-4 py-3 bg-slate-100 text-slate-700 rounded-xl hover:bg-slate-200 font-bold"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDelete}
                  className="flex-1 px-4 py-3 bg-red-600 text-white rounded-xl hover:bg-red-700 font-bold"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default InvoiceView;
