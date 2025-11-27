
import React, { useState, useEffect } from 'react';
import { Invoice, CompanyProfile, DEFAULT_COMPANY, Customer } from '../types';
import { StorageService } from '../services/storageService';
import { GeminiService } from '../services/geminiService';
import { WhatsAppService } from '../services/whatsappService';
import { Printer, ArrowLeft, Play, Loader2, Download, Edit, Trash2, AlertTriangle, Settings, FilePlus, History, Check, MessageCircle } from 'lucide-react';
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
        if (n < 100000) return convert(Math.floor(n / 1000)) + " Thousand" + (n % 1000 !== 0 ? " " + convert(n % 1000) : "");
        if (n < 10000000) return convert(Math.floor(n / 100000)) + " Lakh" + (n % 100000 !== 0 ? " " + convert(n % 100000) : "");
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
        state: firebaseCompany.state || '',
        gst: firebaseCompany.gst || '',
        gstin: firebaseCompany.gstin || firebaseCompany.gst || '',
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

  const handleDownloadPDF = () => {
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
      
      // Paper Saving: Reduced margins
      const leftMargin = 15;
      const rightMargin = a4Width - 15; // 195
      
      let yPos = 15; // Paper Saving: Start higher up

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
      
      // Company GSTIN (if GST enabled) - Debug check
      if (invoice.gstEnabled && company && (company.gstin || company.gst)) {
        doc.setFont("helvetica", "bold");
        doc.setFontSize(9);
        doc.setTextColor(34, 197, 94); // Green color
        const gstin = company.gstin || company.gst || '';
        doc.text(`GSTIN: ${gstin}`, a4Width / 2, yPos, { align: "center" });
        yPos += 4;
        doc.setTextColor(0); // Reset to black
      }
      yPos += 2;

      // Separator Line
      doc.setDrawColor(0);
      doc.setLineWidth(0.5);
      doc.line(leftMargin, yPos, rightMargin, yPos);
      yPos += 7;

      // --- Title ---
      doc.setFont("helvetica", "bold");
      doc.setFontSize(14);
      doc.setTextColor(0);
      doc.text("TAX INVOICE", a4Width / 2, yPos, { align: "center" });
      yPos += 10;

      // --- Customer & Invoice Info ---
      const infoStartY = yPos;
      
      // Left Column: Bill To
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
      // Wrap address text if too long
      const addressLines = doc.splitTextToSize(invoice.customerAddress, 80);
      doc.text(addressLines, leftMargin, yPos);
      
      // Right Column: Invoice Details
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

      // Show Payment Mode
      doc.setFont("helvetica", "bold");
      doc.text("Mode:", rightColX, rightColY);
      doc.setFont("helvetica", "normal");
      const modeText = invoice.status === 'PAID' ? 'Cash' : 'Credit';
      doc.text(modeText, rightColX + 25, rightColY);


      // Align Y position
      yPos = Math.max(yPos + (addressLines.length * 4), rightColY) + 8;

      // --- Item Table Header ---
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

      // --- Item Rows ---
      doc.setFont("helvetica", "normal");
      doc.setTextColor(0);
      doc.setFontSize(9);

      const rowHeight = 7; 
      const pageHeight = doc.internal.pageSize.getHeight();

      invoice.items.forEach((item, i) => {
        // Check for page break
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
        const totalTax = (item.cgstAmount || 0) + (item.sgstAmount || 0) + (item.igstAmount || 0);
        const amountWithGST = (item.totalAmount || item.baseAmount) || 0;
        doc.text(`Rs. ${amountWithGST.toFixed(2)}`, colX.amount, yPos + 5, { align: "right" });
        doc.setFont("helvetica", "normal");

        // Light border line
        doc.setDrawColor(230);
        doc.line(leftMargin, yPos + rowHeight, rightMargin, yPos + rowHeight);
        
        yPos += rowHeight;
      });

      yPos += 4;

      // --- Totals & Balance Section ---
      const totalXLabel = rightMargin - 45;
      const totalXValue = rightMargin - 5;

      // Subtotal
      doc.setFont("helvetica", "bold");
      doc.text("Subtotal:", totalXLabel, yPos + 5, { align: "right" });
      doc.setFont("helvetica", "normal");
      doc.text(`Rs. ${invoice.subtotal.toFixed(2)}`, totalXValue, yPos + 5, { align: "right" });
      yPos += 7;

      // GST
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

      // Current Invoice Total
      doc.setDrawColor(0);
      doc.line(rightMargin - 70, yPos, rightMargin, yPos);
      yPos += 2;

      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.text("Invoice Total:", totalXLabel, yPos + 5, { align: "right" });
      doc.text(`Rs. ${invoice.total.toFixed(2)}`, totalXValue, yPos + 5, { align: "right" });
      yPos += 8;

      // Optional: Previous Balance
      if (showPreviousBalance && customer) {
          const currentBalance = customer.balance;
          // If this invoice was credit, it's included in the balance.
          // If it was cash, it's NOT included in the balance (as per new logic).
          
          let previousBalance = currentBalance;
          // If the invoice is PENDING (credit), then currentBalance includes it, so subtract to find previous.
          if (invoice.status === 'PENDING') {
              previousBalance = currentBalance - invoice.total;
          } 
          // If the invoice is PAID (cash), currentBalance does NOT include it, so previous is just current.

          doc.setFont("helvetica", "normal");
          doc.setFontSize(9);
          doc.setTextColor(80);
          doc.text("Previous Balance:", totalXLabel, yPos + 5, { align: "right" });
          doc.text(`Rs. ${previousBalance.toFixed(2)}`, totalXValue, yPos + 5, { align: "right" });
          yPos += 8;
      }

      // --- HSN SUMMARY (Tally-Style Format) - Only if toggle enabled ---
      if (invoice.gstEnabled && company.show_hsn_summary !== false) {
        yPos += 8;
        doc.setFontSize(10);
        doc.setFont("helvetica", "bold");
        doc.text("HSN-WISE TAX SUMMARY (TALLY FORMAT)", leftMargin, yPos);
        yPos += 6;

        const hsnSummary = getHSNSummary(invoice, company);
        // Determine if inter-state: True only if explicitly INTER_STATE or if customer state is DIFFERENT from company state
        // If states are not set or are the same, treat as intra-state (CGST/SGST)
        const isInterState = invoice.taxType === 'INTER_STATE' || 
          (invoice.customerState && company.state && invoice.customerState !== company.state);
        
        // Tally-style column positions
        const col = {
          hsn: leftMargin + 5,
          desc: leftMargin + 22,
          uom: leftMargin + 52,
          qty: leftMargin + 62,
          taxVal: leftMargin + 80,
          cgst: isInterState ? 0 : leftMargin + 110,
          sgst: isInterState ? 0 : leftMargin + 135,
          igst: isInterState ? leftMargin + 110 : 0,
          totalTax: rightMargin - 20
        };

        // Header Background
        doc.setFillColor(220, 220, 220);
        doc.rect(leftMargin, yPos - 5, rightMargin - leftMargin, 7, 'F');
        doc.setFontSize(7);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(0);
        
        doc.text("HSN/SAC", col.hsn, yPos);
        doc.text("Description", col.desc, yPos);
        doc.text("UOM", col.uom, yPos);
        doc.text("Qty", col.qty, yPos, { align: "right" });
        doc.text("Taxable Value", col.taxVal, yPos, { align: "right" });
        if (!isInterState) {
          doc.text("CGST%", col.cgst, yPos, { align: "right" });
          doc.text("CGST Amt", col.cgst + 15, yPos, { align: "right" });
          doc.text("SGST%", col.sgst, yPos, { align: "right" });
          doc.text("SGST Amt", col.sgst + 15, yPos, { align: "right" });
        } else {
          doc.text("IGST%", col.igst, yPos, { align: "right" });
          doc.text("IGST Amt", col.igst + 15, yPos, { align: "right" });
        }
        doc.text("Total Tax", col.totalTax, yPos, { align: "right" });
        
        yPos += 8;
        doc.setFontSize(7);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(0);

        // Data rows
        hsnSummary.forEach(group => {
          const gstRate = group.gstRate || 0;
          const totalTax = group.cgstAmount + group.sgstAmount + group.igstAmount;
          
          doc.text((group.hsn || 'N/A'), col.hsn, yPos);
          doc.text(group.description.substring(0, 20), col.desc, yPos);
          doc.text('PCS', col.uom, yPos);
          doc.text(group.quantity.toString(), col.qty, yPos, { align: "right" });
          doc.text(`${group.baseAmount.toFixed(2)}`, col.taxVal, yPos, { align: "right" });
          
          if (!isInterState) {
            doc.text(`${(gstRate/2).toFixed(1)}%`, col.cgst, yPos, { align: "right" });
            doc.text(`${group.cgstAmount.toFixed(2)}`, col.cgst + 15, yPos, { align: "right" });
            doc.text(`${(gstRate/2).toFixed(1)}%`, col.sgst, yPos, { align: "right" });
            doc.text(`${group.sgstAmount.toFixed(2)}`, col.sgst + 15, yPos, { align: "right" });
          } else {
            doc.text(`${gstRate.toFixed(1)}%`, col.igst, yPos, { align: "right" });
            doc.text(`${group.igstAmount.toFixed(2)}`, col.igst + 15, yPos, { align: "right" });
          }
          doc.text(`${totalTax.toFixed(2)}`, col.totalTax, yPos, { align: "right" });
          yPos += 6;
        });

        // Total row - bold separator
        doc.setFont("helvetica", "bold");
        doc.line(leftMargin, yPos, rightMargin, yPos);
        yPos += 5;
        
        doc.text("TOTAL", col.hsn, yPos);
        doc.text(`${invoice.subtotal.toFixed(2)}`, col.taxVal, yPos, { align: "right" });
        
        if (!isInterState) {
          doc.text(`${(invoice.totalCgst || 0).toFixed(2)}`, col.cgst + 15, yPos, { align: "right" });
          doc.text(`${(invoice.totalSgst || 0).toFixed(2)}`, col.sgst + 15, yPos, { align: "right" });
        } else {
          doc.text(`${(invoice.totalIgst || 0).toFixed(2)}`, col.igst + 15, yPos, { align: "right" });
        }
        doc.text(`${((invoice.totalCgst || 0) + (invoice.totalSgst || 0) + (invoice.totalIgst || 0)).toFixed(2)}`, col.totalTax, yPos, { align: "right" });
        yPos += 8;
      }

      // Amount in Words
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.setTextColor(60);
      doc.text("Amount in Words:", leftMargin, yPos);
      doc.setTextColor(0);
      doc.setFont("helvetica", "normal");
      
      const amountToConvert = (showPreviousBalance && customer) ? customer.balance : invoice.total;
      const amountWords = numberToWords(amountToConvert);
      
      // FIX: Hardcode text width available. 
      // Left margin 15, Label approx 35. Start X = 50. Right Margin 15. Total Width 210.
      // Available width ~ 145mm
      const startX = leftMargin + 35;
      const availableWidth = a4Width - startX - rightMargin + 50; // Giving more space
      
      const splitWords = doc.splitTextToSize(amountWords, availableWidth);
      doc.text(splitWords, startX, yPos);
      
      // --- Footer ---
      let footerY = Math.max(yPos + 20, pageHeight - 25);
      if (footerY > pageHeight - 20) {
          doc.addPage();
          footerY = pageHeight - 25;
      }
      
      doc.setFontSize(8);
      doc.setTextColor(0);
      
      // Terms
      doc.setFont("helvetica", "bold");
      doc.text("Terms & Conditions:", leftMargin, footerY);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(80);
      doc.text("Payment due within 30 days", leftMargin, footerY + 4);

      // Sign
      doc.setTextColor(0);
      doc.text(`For ${company.name}`, rightMargin - 5, footerY, { align: "right" });
      doc.line(rightMargin - 40, footerY + 10, rightMargin, footerY + 10);
      doc.setFontSize(7);
      doc.text("Authorized Sign", rightMargin - 20, footerY + 14, { align: "center" });

      // --- OPTIONAL: Ledger Report Page ---
      if (showLedger && customer) {
        doc.addPage();
        
        let ly = 20;
        doc.setFontSize(16);
        doc.setFont("helvetica", "bold");
        doc.text("ACCOUNT STATEMENT / LEDGER", a4Width / 2, ly, { align: "center" });
        ly += 10;

        doc.setFontSize(10);
        doc.text(`Customer: ${customer.company || customer.name}`, leftMargin, ly);
        doc.text(`Date: ${new Date().toISOString().split('T')[0]}`, rightMargin - 30, ly);
        ly += 10;

        // Ledger Table Header
        doc.setFillColor(240, 240, 240);
        doc.rect(leftMargin, ly - 6, rightMargin - leftMargin, 8, 'F');
        doc.setFont("helvetica", "bold");
        doc.text("Date", leftMargin + 2, ly);
        doc.text("Details / Ref", leftMargin + 30, ly);
        doc.text("Credit", rightMargin - 60, ly, { align: "right" }); // Payment
        doc.text("Debit", rightMargin - 30, ly, { align: "right" }); // Invoice
        
        ly += 8;
        doc.setFont("helvetica", "normal");

        const customerInvoices = StorageService.getInvoices()
            .filter(inv => inv.customerId === customer.id)
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
            .slice(0, 20); // Last 20 transactions

        customerInvoices.forEach(inv => {
            doc.text(inv.date, leftMargin + 2, ly);
            doc.text(`Inv #${inv.invoiceNumber}`, leftMargin + 30, ly);
            // Logic: If invoice is PAID, it doesn't appear as Debit in ledger in strict sense if it didn't touch balance.
            // But for a statement, it might be nice to show it. 
            // Current request implies CASH invoices are just "sold", not ledger items. 
            // We will only show CREDIT (PENDING) items as Debits.
            
            if (inv.status === 'PENDING') {
                doc.text("-", rightMargin - 60, ly, { align: "right" });
                doc.text(inv.total.toFixed(2), rightMargin - 30, ly, { align: "right" });
                doc.setDrawColor(230);
                doc.line(leftMargin, ly + 2, rightMargin, ly + 2);
                ly += 7;
            }
        });

        ly += 5;
        doc.setFont("helvetica", "bold");
        doc.text("Current Net Balance:", rightMargin - 60, ly, { align: "right" });
        doc.text(`Rs. ${customer.balance.toFixed(2)}`, rightMargin - 30, ly, { align: "right" });
      }

      // Save
      doc.save(`Invoice-${invoice.invoiceNumber}.pdf`);

    } catch (error) {
      console.error("Error generating PDF:", error);
      alert("Failed to generate PDF.");
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  return (
    <div className="h-full overflow-y-auto bg-gray-100 p-4 md:p-6">
      {/* Action Bar */}
      <div className="max-w-[210mm] mx-auto mb-4 flex flex-col gap-4 print:hidden">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <button onClick={onBack} className="flex items-center gap-2 text-gray-600 hover:text-gray-900 self-start md:self-center">
            <ArrowLeft className="w-4 h-4" /> Back
            </button>
            
            <div className="flex flex-wrap gap-2 md:gap-3 justify-center items-center">
                {/* Settings Toggle (Dropdown) */}
                <div className="relative">
                    <button 
                        onClick={() => setShowOptions(!showOptions)}
                        className={`flex items-center gap-2 px-3 py-2 rounded-md border text-sm transition-colors ${showOptions ? 'bg-blue-50 border-blue-200 text-blue-600' : 'bg-white border-gray-200 text-gray-600'}`}
                    >
                        <Settings className="w-4 h-4" /> Options
                    </button>

                    {showOptions && (
                        <div className="absolute top-full mt-2 right-0 md:right-auto md:left-0 w-64 bg-white rounded-lg shadow-xl border border-gray-200 z-50 p-2 animate-in fade-in zoom-in-95 duration-100">
                            <div className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 px-2 pt-2">PDF Settings</div>
                            <div className="space-y-1">
                                <button 
                                    onClick={() => setShowPreviousBalance(!showPreviousBalance)}
                                    className="w-full flex items-center justify-between px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded transition-colors"
                                >
                                    <span className="flex items-center gap-2"><FilePlus className="w-4 h-4 text-blue-500" /> Prev. Balance</span>
                                    {showPreviousBalance && <Check className="w-4 h-4 text-green-500" />}
                                </button>
                                <button 
                                    onClick={() => setShowLedger(!showLedger)}
                                    className="w-full flex items-center justify-between px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded transition-colors"
                                >
                                    <span className="flex items-center gap-2"><History className="w-4 h-4 text-purple-500" /> Attach Ledger</span>
                                    {showLedger && <Check className="w-4 h-4 text-green-500" />}
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                <button
                    onClick={handleWhatsAppShare}
                    className="flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 shadow-sm transition-all text-sm md:text-base"
                >
                    <MessageCircle className="w-4 h-4" />
                    <span className="hidden sm:inline">Share</span>
                </button>
                <button
                    onClick={() => setShowDeleteConfirm(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-red-50 text-red-600 border border-red-200 rounded-md hover:bg-red-100 shadow-sm transition-all text-sm md:text-base"
                >
                    <Trash2 className="w-4 h-4" />
                    <span className="hidden sm:inline">Delete</span>
                </button>
                <button
                    onClick={() => onEdit(invoice)}
                    className="flex items-center gap-2 px-4 py-2 bg-orange-500 text-white rounded-md hover:bg-orange-600 shadow-sm transition-all text-sm md:text-base"
                >
                    <Edit className="w-4 h-4" />
                    <span className="hidden sm:inline">Edit</span>
                </button>
                <button
                    onClick={handleReadAloud}
                    disabled={isLoadingAudio}
                    className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 shadow-sm disabled:opacity-50 transition-all text-sm md:text-base"
                >
                    {isLoadingAudio ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4 fill-current" />}
                    <span className="hidden sm:inline">Read</span>
                </button>
                <button
                    onClick={handleDownloadPDF}
                    disabled={isGeneratingPDF}
                    className="flex items-center gap-2 px-4 py-2 bg-slate-700 text-white rounded-md hover:bg-slate-800 shadow-sm disabled:opacity-50 transition-all text-sm md:text-base"
                >
                    {isGeneratingPDF ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                    PDF
                </button>
                <button
                    onClick={handlePrint}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 shadow-sm transition-all text-sm md:text-base"
                >
                    <Printer className="w-4 h-4" /> <span className="hidden sm:inline">Print</span>
                </button>
            </div>
        </div>
      </div>

      {/* Invoice Paper - Responsive Wrapper */}
      <div className="overflow-x-auto pb-6">
        <div id="invoice-content" className="min-w-[210mm] max-w-[210mm] mx-auto bg-white shadow-lg rounded-sm p-8 print:shadow-none print:m-0 print:max-w-none text-slate-900 print:p-4">
          
          {/* Header */}
          <div className="text-center mb-4">
            <h1 className="text-2xl font-bold mb-1 uppercase">{company.name}</h1>
            <p className="text-xs text-gray-600">{company.address}</p>
            <p className="text-xs text-gray-600">Ph: {company.phone} | {company.email}</p>
            {invoice.gstEnabled && (company.gstin || company.gst) && (
              <p className="text-xs text-green-600 font-bold mt-1">GSTIN: {company.gstin || company.gst}</p>
            )}
          </div>

          <div className="border-b border-black mb-4"></div>

          <h2 className="text-xl font-bold text-center mb-4 uppercase tracking-wide">Tax Invoice</h2>

          {/* Info Grid */}
          <div className="flex justify-between mb-4 text-sm">
            <div className="w-1/2 pr-4">
              <h3 className="font-bold mb-0.5 text-xs uppercase text-gray-500">Bill To:</h3>
              <p className="font-bold text-base">{invoice.customerName}</p>
              <p className="whitespace-pre-line text-gray-700 text-xs">{invoice.customerAddress}</p>
            </div>
            <div className="w-1/2 pl-4 text-right">
              <div className="mb-1">
                  <span className="font-bold inline-block w-24 text-left text-xs uppercase text-gray-500">Invoice #:</span>
                  <span className="font-medium">{invoice.invoiceNumber}</span>
              </div>
              <div className="mb-1">
                  <span className="font-bold inline-block w-24 text-left text-xs uppercase text-gray-500">Date:</span>
                  <span>{invoice.date}</span>
              </div>
               <div className="mb-1">
                  <span className="font-bold inline-block w-24 text-left text-xs uppercase text-gray-500">Mode:</span>
                  <span className="uppercase">{invoice.status === 'PAID' ? 'CASH' : 'CREDIT'}</span>
              </div>
            </div>
          </div>

          {/* Table */}
          <table className="w-full mb-6 text-sm">
            <thead>
              <tr className="border-t border-b border-black bg-gray-50">
                <th className="py-1.5 text-left w-10 pl-2">#</th>
                <th className="py-1.5 text-left">Description</th>
                {(invoice.items.some(i => i.hsn)) && <th className="py-1.5 text-center w-20">HSN</th>}
                <th className="py-1.5 text-right w-16">Qty</th>
                <th className="py-1.5 text-right w-20">Rate</th>
                {invoice.gstEnabled && <th className="py-1.5 text-right w-16">GST %</th>}
                <th className="py-1.5 text-right w-24 pr-2">Amount</th>
              </tr>
            </thead>
            <tbody>
              {invoice.items.map((item, idx) => (
                <tr key={idx} className="border-b border-gray-100">
                  <td className="py-1.5 pl-2 align-top text-xs text-gray-500">{idx + 1}</td>
                  <td className="py-1.5 align-top text-gray-900 font-medium">
                    {item.description}
                    {invoice.gstEnabled && ((item.cgstAmount || 0) + (item.sgstAmount || 0) + (item.igstAmount || 0)) > 0 && (
                      <div className="text-xs text-green-600 font-normal">+₹{((item.cgstAmount || 0) + (item.sgstAmount || 0) + (item.igstAmount || 0)).toFixed(2)} Tax</div>
                    )}
                  </td>
                  {(invoice.items.some(i => i.hsn)) && <td className="py-1.5 align-top text-center text-xs text-gray-600">{item.hsn || '-'}</td>}
                  <td className="py-1.5 align-top text-right">{item.quantity}</td>
                  <td className="py-1.5 align-top text-right">Rs. {item.rate.toFixed(2)}</td>
                  {invoice.gstEnabled && <td className="py-1.5 align-top text-right">{((item.gstRate || 0)).toFixed(1)}%</td>}
                  <td className="py-1.5 pr-2 align-top text-right font-bold">Rs. {((item.totalAmount || item.baseAmount) || 0).toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Totals */}
          <div className="flex justify-end mb-2">
            <div className="w-72">
              <div className="flex justify-between py-1 border-b border-gray-200 text-sm">
                <span className="font-medium text-gray-600">Subtotal:</span>
                <span className="font-medium">Rs. {invoice.subtotal.toFixed(2)}</span>
              </div>
              {invoice.gstEnabled && ((invoice.totalCgst || 0) + (invoice.totalSgst || 0) + (invoice.totalIgst || 0)) > 0 && (
                <div>
                  {(invoice.totalCgst || 0) > 0 && (
                    <div className="flex justify-between py-1 border-b border-gray-200 text-sm">
                      <span className="font-medium text-gray-600">CGST:</span>
                      <span className="font-medium">Rs. {(invoice.totalCgst || 0).toFixed(2)}</span>
                    </div>
                  )}
                  {(invoice.totalSgst || 0) > 0 && (
                    <div className="flex justify-between py-1 border-b border-gray-200 text-sm">
                      <span className="font-medium text-gray-600">SGST:</span>
                      <span className="font-medium">Rs. {(invoice.totalSgst || 0).toFixed(2)}</span>
                    </div>
                  )}
                  {(invoice.totalIgst || 0) > 0 && (
                    <div className="flex justify-between py-1 border-b border-gray-200 text-sm">
                      <span className="font-medium text-gray-600">IGST:</span>
                      <span className="font-medium">Rs. {(invoice.totalIgst || 0).toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between py-1 border-b border-gray-200 text-sm">
                    <span className="font-medium text-green-600 font-bold">Total Tax:</span>
                    <span className="font-medium text-green-600 font-bold">Rs. {((invoice.totalCgst || 0) + (invoice.totalSgst || 0) + (invoice.totalIgst || 0)).toFixed(2)}</span>
                  </div>
                </div>
              )}
              <div className={`flex justify-between py-2 ${showPreviousBalance ? 'border-b border-gray-200' : 'border-b border-black'} text-lg`}>
                <span className="font-bold">Invoice Total:</span>
                <span className="font-bold">Rs. {invoice.total.toFixed(2)}</span>
              </div>
              
              {/* Optional Balance Section (Visible in Print view if enabled) */}
              {showPreviousBalance && customer && (
                  <div className="animate-in fade-in slide-in-from-top-1">
                      <div className="flex justify-between py-1 border-b border-gray-200 text-sm text-gray-600">
                        <span className="font-medium">Previous Balance:</span>
                        <span className="font-medium">Rs. {(customer.balance - (invoice.status === 'PENDING' ? invoice.total : 0)).toFixed(2)}</span>
                      </div>
                      {/* Removed Net Payable */}
                  </div>
              )}
            </div>
          </div>

          {/* HSN Summary Table for GST Invoices - Only if toggle enabled */}
          {invoice.gstEnabled && company.show_hsn_summary !== false && (
            <div className="mb-8 overflow-x-auto">
              <h3 className="text-sm font-bold text-gray-800 mb-3 uppercase">HSN-Wise Tax Summary</h3>
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr className="bg-gray-100 border border-gray-300">
                    <th className="border border-gray-300 px-2 py-1 text-left">HSN</th>
                    <th className="border border-gray-300 px-2 py-1 text-left">Description</th>
                    <th className="border border-gray-300 px-2 py-1 text-right">Qty</th>
                    <th className="border border-gray-300 px-2 py-1 text-right">Taxable Value</th>
                    {(invoice.totalCgst || 0) > 0 && <th className="border border-gray-300 px-2 py-1 text-right">CGST</th>}
                    {(invoice.totalSgst || 0) > 0 && <th className="border border-gray-300 px-2 py-1 text-right">SGST</th>}
                    {(invoice.totalIgst || 0) > 0 && <th className="border border-gray-300 px-2 py-1 text-right">IGST</th>}
                    <th className="border border-gray-300 px-2 py-1 text-right">Total Tax</th>
                  </tr>
                </thead>
                <tbody>
                  {getHSNSummary(invoice, company).map((group, idx) => (
                    <tr key={idx} className="border border-gray-300">
                      <td className="border border-gray-300 px-2 py-1">{group.hsn}</td>
                      <td className="border border-gray-300 px-2 py-1">{group.description}</td>
                      <td className="border border-gray-300 px-2 py-1 text-right">{group.quantity}</td>
                      <td className="border border-gray-300 px-2 py-1 text-right">Rs. {group.baseAmount.toFixed(2)}</td>
                      {(invoice.totalCgst || 0) > 0 && <td className="border border-gray-300 px-2 py-1 text-right">Rs. {group.cgstAmount.toFixed(2)}</td>}
                      {(invoice.totalSgst || 0) > 0 && <td className="border border-gray-300 px-2 py-1 text-right">Rs. {group.sgstAmount.toFixed(2)}</td>}
                      {(invoice.totalIgst || 0) > 0 && <td className="border border-gray-300 px-2 py-1 text-right">Rs. {group.igstAmount.toFixed(2)}</td>}
                      <td className="border border-gray-300 px-2 py-1 text-right font-bold">Rs. {(group.cgstAmount + group.sgstAmount + group.igstAmount).toFixed(2)}</td>
                    </tr>
                  ))}
                  <tr className="bg-gray-100 font-bold border border-gray-300">
                    <td colSpan={3} className="border border-gray-300 px-2 py-1 text-right">TOTAL:</td>
                    <td className="border border-gray-300 px-2 py-1 text-right">Rs. {invoice.subtotal.toFixed(2)}</td>
                    {(invoice.totalCgst || 0) > 0 && <td className="border border-gray-300 px-2 py-1 text-right">Rs. {(invoice.totalCgst || 0).toFixed(2)}</td>}
                    {(invoice.totalSgst || 0) > 0 && <td className="border border-gray-300 px-2 py-1 text-right">Rs. {(invoice.totalSgst || 0).toFixed(2)}</td>}
                    {(invoice.totalIgst || 0) > 0 && <td className="border border-gray-300 px-2 py-1 text-right">Rs. {(invoice.totalIgst || 0).toFixed(2)}</td>}
                    <td className="border border-gray-300 px-2 py-1 text-right">Rs. {((invoice.totalCgst || 0) + (invoice.totalSgst || 0) + (invoice.totalIgst || 0)).toFixed(2)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}
          
          {/* Amount in Words */}
          <div className="flex justify-end mb-8 text-right">
              <div className="text-sm">
                  <span className="text-gray-500 text-xs uppercase font-bold mr-2">Amount in Words:</span>
                  <span className="font-medium text-gray-800 italic">
                      {numberToWords(showPreviousBalance && customer ? customer.balance : invoice.total)}
                  </span>
              </div>
          </div>

          {/* Footer */}
          <div className="mt-auto pt-4 border-t border-gray-100">
            <div className="flex justify-between items-end">
              <div className="text-xs text-gray-600 max-w-md">
                  <p className="font-bold text-gray-900 mb-0.5">Terms & Conditions:</p>
                  <p>Payment due within 30 days.</p>
              </div>
              <div className="text-center">
                  <p className="mb-6 text-xs">For {company.name}</p>
                  <div className="border-t border-black w-40 mx-auto pt-1 text-[10px] uppercase tracking-wider">Authorized Sign</div>
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 print:hidden">
            <div className="bg-white rounded-lg shadow-xl max-w-sm w-full p-6 animate-in fade-in zoom-in duration-200">
                <div className="flex flex-col items-center text-center mb-6">
                    <div className="bg-red-100 p-3 rounded-full mb-4">
                        <AlertTriangle className="w-8 h-8 text-red-600" />
                    </div>
                    <h3 className="text-lg font-bold text-slate-900 mb-2">Delete Invoice?</h3>
                    <p className="text-sm text-slate-500">
                        This will permanently delete Invoice <strong>#{invoice.invoiceNumber}</strong>. 
                        Stock quantities will be restored and customer balance will be updated.
                    </p>
                </div>
                <div className="flex gap-3">
                    <button 
                        onClick={() => setShowDeleteConfirm(false)}
                        className="flex-1 px-4 py-2 bg-white text-slate-700 border border-slate-300 rounded-md hover:bg-slate-50 font-medium"
                    >
                        Cancel
                    </button>
                    <button 
                        onClick={handleDelete}
                        className="flex-1 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 font-medium"
                    >
                        Delete
                    </button>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};

export default InvoiceView;
