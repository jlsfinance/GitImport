
import { jsPDF } from 'jspdf';
import { Invoice, CompanyProfile, Customer } from '../types';
import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import QRCode from 'qrcode';
import { formatDate } from '../utils/dateUtils';
import { addBrandedFooter } from './pdfFooterUtils';
import { AIService } from './aiService';

// Font Configuration
const HINDI_FONT_URL = 'https://raw.githubusercontent.com/itfoundry/hind/master/hind-regular.ttf';

const loadHindiFont = async (doc: jsPDF) => {
    try {
        const response = await fetch(HINDI_FONT_URL);
        const blob = await response.blob();
        const base64 = await new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
            reader.readAsDataURL(blob);
        });
        doc.addFileToVFS('Hindi.ttf', base64);
        doc.addFont('Hindi.ttf', 'Devanagari', 'normal');
        doc.addFont('Hindi.ttf', 'Devanagari', 'bold');
        return true;
    } catch (e) {
        console.error("Font loading failed", e);
        return false;
    }
};

const getFont = (language: string | undefined, originalFont: string) => {
    if (language === 'Hindi' || language === 'Hinglish') {
        return 'Devanagari';
    }
    return originalFont;
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

// ... (imports)
import { InvoiceFormat } from '../types';

// ... (helpers like numberToWords, getHSNSummary - keep them globally in file)

// --- FORMAT GENERATORS ---

const generateDefaultPDF = async (doc: jsPDF, invoice: Invoice, company: CompanyProfile, _customer: Customer | null, _qrCodeUrl?: string, _showPreviousBalance: boolean = false) => {
    const a4Width = 210;
    const leftMargin = 15;
    const rightMargin = a4Width - 15;
    let yPos = 15;

    const lang = company.invoiceSettings?.language;
    const labels = (invoice as any).translatedLabels || {
        billedTo: "Bill To:",
        invoice: "TAX INVOICE",
        date: "Date:",
        invoiceNo: "Invoice #:",
        mode: "Mode:",
        desc: "DESCRIPTION",
        qty: "QTY",
        rate: "RATE",
        amount: "AMOUNT",
        subtotal: "Subtotal:",
        total: "Total:",
        amtWords: "Amount in Words:",
        scanToPay: "Scan to Pay:"
    };

    const setDocFont = (bold = false) => {
        doc.setFont(getFont(lang, "helvetica"), bold ? "bold" : "normal");
    };

    const safeCompany = {
        name: company.name || 'Company Name',
        address: company.address || '',
        phone: company.phone || '',
        email: company.email || ''
    };

    // Header
    setDocFont(true);
    doc.setFontSize(18);
    doc.text(safeCompany.name, a4Width / 2, yPos, { align: "center" });
    yPos += 6;

    setDocFont(false);
    doc.setFontSize(9);
    doc.setTextColor(80);
    doc.text(safeCompany.address, a4Width / 2, yPos, { align: "center" });
    yPos += 4;
    doc.text(`Ph: ${safeCompany.phone} | ${safeCompany.email}`, a4Width / 2, yPos, { align: "center" });
    yPos += 4;

    if (invoice.gstEnabled && (company.gstin || (company as any).gst)) {
        setDocFont(true);
        doc.setFontSize(9);
        doc.setTextColor(34, 197, 94);
        const gstin = company.gstin || (company as any).gst || '';
        doc.text(`GSTIN: ${gstin}`, a4Width / 2, yPos, { align: "center" });
        yPos += 4;
        doc.setTextColor(0);
    }
    yPos += 2;

    doc.setDrawColor(0);
    doc.setLineWidth(0.5);
    doc.line(leftMargin, yPos, rightMargin, yPos);
    yPos += 7;

    setDocFont(true);
    doc.setFontSize(14);
    doc.setTextColor(0);
    doc.text(labels.invoice, a4Width / 2, yPos, { align: "center" });
    yPos += 10;

    const infoStartY = yPos;
    doc.setFontSize(9);
    setDocFont(true);
    doc.text(labels.billedTo, leftMargin, yPos);
    yPos += 4;

    setDocFont(true);
    doc.setFontSize(10);
    doc.text(invoice.customerName || 'Customer', leftMargin, yPos);
    yPos += 4;

    setDocFont(false);
    doc.setFontSize(9);
    const addressLines = doc.splitTextToSize(invoice.customerAddress || '', 80);
    doc.text(addressLines, leftMargin, yPos);

    let rightColY = infoStartY;
    const rightColX = 120;
    const lineSpacing = 5;

    setDocFont(true);
    doc.text(labels.invoiceNo, rightColX, rightColY);
    setDocFont(false);
    doc.text(invoice.invoiceNumber || '-', rightColX + 25, rightColY);
    rightColY += lineSpacing;

    setDocFont(true);
    doc.text(labels.date, rightColX, rightColY);
    setDocFont(false);
    doc.text(formatDate(invoice.date), rightColX + 25, rightColY);
    rightColY += lineSpacing;

    setDocFont(true);
    doc.text(labels.mode, rightColX, rightColY);
    setDocFont(false);
    const modeText = invoice.status === 'PAID' ? 'Cash' : 'Credit';
    doc.text(modeText, rightColX + 25, rightColY);

    yPos = Math.max(yPos + (addressLines.length * 4), rightColY) + 8;

    doc.setFillColor(245, 247, 250);
    doc.rect(leftMargin, yPos, rightMargin - leftMargin, 8, 'F');
    setDocFont(true);
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
    doc.text(labels.desc || "DESCRIPTION", colX.desc, yPos + 5);
    if (hasHSN) doc.text("HSN", colX.hsn, yPos + 5);
    doc.text(labels.qty || "QTY", colX.qty, yPos + 5, { align: "right" });
    doc.text(labels.rate || "RATE", colX.rate, yPos + 5, { align: "right" });
    if (invoice.gstEnabled) doc.text("GST%", colX.gst, yPos + 5, { align: "right" });
    doc.text(labels.amount || "AMOUNT", colX.amount, yPos + 5, { align: "right" });

    yPos += 8;

    setDocFont(false);
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
        doc.text(`Rs. ${(item.rate || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, colX.rate, yPos + 5, { align: "right" });
        if (invoice.gstEnabled) doc.text(`${((item.gstRate || 0)).toFixed(1)}%`, colX.gst, yPos + 5, { align: "right" });
        setDocFont(true);
        const amountWithGST = (item.totalAmount || item.baseAmount) || 0;
        doc.text(`Rs. ${amountWithGST.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, colX.amount, yPos + 5, { align: "right" });
        setDocFont(false);

        doc.setDrawColor(230);
        doc.line(leftMargin, yPos + rowHeight, rightMargin, yPos + rowHeight);
        yPos += rowHeight;
    });

    yPos += 4;
    const totalQty = invoice.items.reduce((sum, item) => sum + (item.quantity || 0), 0);
    doc.setFontSize(8);
    setDocFont(true);
    doc.text(`Total Qty: ${totalQty}`, colX.qty, yPos + 4, { align: "right" });
    doc.setFontSize(9);
    yPos += 5;

    const totalXLabel = rightMargin - 45;
    const totalXValue = rightMargin - 5;

    setDocFont(true);
    doc.text(labels.subtotal || "Subtotal:", totalXLabel, yPos + 5, { align: "right" });
    setDocFont(false);
    doc.text(`Rs. ${(invoice.subtotal || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, totalXValue, yPos + 5, { align: "right" });
    yPos += 5;

    if (invoice.discountAmount && invoice.discountAmount > 0) {
        doc.setFont("helvetica", "normal");
        let label = "Discount:";
        // Check for percentage logic
        if (invoice.discountType === 'PERCENTAGE' && invoice.discountValue) {
            label = `Discount (${invoice.discountValue}%):`;
        }
        doc.text(label, totalXLabel, yPos + 5, { align: "right" });
        doc.text(`- Rs. ${(invoice.discountAmount).toFixed(2)}`, totalXValue, yPos + 5, { align: "right" });
        yPos += 5;
    }

    const totalGSTAmount = (invoice.totalCgst || 0) + (invoice.totalSgst || 0) + (invoice.totalIgst || 0);
    if (invoice.gstEnabled && totalGSTAmount > 0) {
        if ((invoice.totalCgst || 0) > 0) {
            setDocFont(true);
            doc.setTextColor(34, 197, 94);
            doc.text("CGST:", totalXLabel, yPos + 5, { align: "right" });
            setDocFont(false);
            doc.text(`Rs. ${(invoice.totalCgst || 0).toFixed(2)}`, totalXValue, yPos + 5, { align: "right" });
            yPos += 5;
        }
        if ((invoice.totalSgst || 0) > 0) {
            setDocFont(true);
            doc.text("SGST:", totalXLabel, yPos + 5, { align: "right" });
            setDocFont(false);
            doc.text(`Rs. ${(invoice.totalSgst || 0).toFixed(2)}`, totalXValue, yPos + 5, { align: "right" });
            yPos += 5;
        }
        if ((invoice.totalIgst || 0) > 0) {
            setDocFont(true);
            doc.text("IGST:", totalXLabel, yPos + 5, { align: "right" });
            setDocFont(false);
            doc.text(`Rs. ${(invoice.totalIgst || 0).toFixed(2)}`, totalXValue, yPos + 5, { align: "right" });
            yPos += 5;
        }
        doc.setTextColor(0);
    }

    doc.setDrawColor(0);
    doc.line(rightMargin - 70, yPos + 2, rightMargin, yPos + 2);
    yPos += 8;

    setDocFont(true);
    doc.setFontSize(10);
    doc.text(labels.total || "Total:", totalXLabel, yPos + 5, { align: "right" });
    doc.text(`Rs. ${invoice.total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, totalXValue, yPos + 5, { align: "right" });
    yPos += 8;

    if (_showPreviousBalance && invoice.previousBalance && invoice.previousBalance > 0) {
        setDocFont(false);
        doc.text("Previous Balance:", totalXLabel, yPos + 5, { align: "right" });
        doc.text(`Rs. ${invoice.previousBalance.toFixed(2)}`, totalXValue, yPos + 5, { align: "right" });
        yPos += 6;

        setDocFont(true);
        doc.setFontSize(11);
        doc.setTextColor(239, 68, 68); // Red
        doc.text("Grand Total Due:", totalXLabel, yPos + 5, { align: "right" });
        doc.text(`Rs. ${(invoice.total + invoice.previousBalance).toFixed(2)}`, totalXValue, yPos + 5, { align: "right" });
        doc.setTextColor(0);
        yPos += 8;
    }

    const amountInWords = invoice.totalInWords || numberToWords(_showPreviousBalance && invoice.previousBalance ? (invoice.total + invoice.previousBalance) : invoice.total);
    doc.setFontSize(9);
    setDocFont(true);
    doc.text(labels.amtWords || "Amount in Words:", leftMargin, yPos);
    setDocFont(false);
    doc.text(amountInWords, leftMargin + 40, yPos);

    // --- QR Code for Payments ---
    if (company.upiId && invoice.total > 0) {
        const upiLink = `upi://pay?pa=${company.upiId}&pn=${encodeURIComponent(company.name)}&am=${invoice.total}&cu=INR`;
        try {
            const qrUrl = await QRCode.toDataURL(upiLink, { margin: 1, width: 128 });
            let footerY = Math.max(yPos + 20, pageHeight - 35);
            if (footerY > pageHeight - 30) {
                doc.addPage();
                footerY = 20;
            }
            doc.setFontSize(8);
            setDocFont(true);
            doc.text(labels.scanToPay, rightMargin, footerY - 2, { align: "right" });
            doc.addImage(qrUrl, 'PNG', rightMargin - 25, footerY, 25, 25);
        } catch (qrErr) {
            console.error("QR Generation failed", qrErr);
        }
    }
};

const generateModernPDF = async (doc: jsPDF, invoice: Invoice, company: CompanyProfile, _customer: Customer | null, _qrCodeUrl?: string, _showPreviousBalance?: boolean) => {
    // Implement Modern Style (Blue header, cleaner look)
    const a4Width = 210;
    const pageHeight = doc.internal.pageSize.getHeight();
    const leftMargin = 15;
    const rightMargin = a4Width - 15;

    const lang = company.invoiceSettings?.language;
    const labels = (invoice as any).translatedLabels || {
        billedTo: "BILL TO",
        invoice: "INVOICE",
        date: "Date",
        invoiceNo: "Invoice #",
        desc: "DESCRIPTION",
        qty: "QTY",
        rate: "RATE",
        amount: "AMOUNT",
        total: "TOTAL:"
    };

    const setDocFont = (bold = false) => {
        doc.setFont(getFont(lang, "helvetica"), bold ? "bold" : "normal");
    };

    // Header Background
    doc.setFillColor(37, 99, 235); // Blue-600
    doc.rect(0, 0, a4Width, 40, 'F');

    // Company Name in White
    doc.setTextColor(255, 255, 255);
    setDocFont(true);
    doc.setFontSize(22);
    doc.text(company.name || 'Company Name', leftMargin, 15);

    doc.setFontSize(10);
    setDocFont(false);
    doc.text(company.address || '', leftMargin, 22);
    doc.text(`Ph: ${company.phone}`, leftMargin, 27);

    // Invoice Title on Right
    doc.setFontSize(30);
    setDocFont(true);
    doc.text(labels.invoice, rightMargin, 25, { align: "right" });

    let yPos = 50;
    doc.setTextColor(0);

    // Info Columns
    doc.setFontSize(10);
    setDocFont(true);
    doc.text(labels.billedTo, leftMargin, yPos);
    doc.text(labels.invoiceDetails || "INVOICE DETAILS", a4Width / 2 + 10, yPos);
    yPos += 5;

    setDocFont(false);
    doc.text(invoice.customerName || 'Customer', leftMargin, yPos);
    doc.text(`${labels.invoiceNo} ${invoice.invoiceNumber}`, a4Width / 2 + 10, yPos);
    yPos += 5;

    const addressLines = doc.splitTextToSize(invoice.customerAddress || '', 80);
    doc.text(addressLines, leftMargin, yPos);
    doc.text(`${labels.date} ${formatDate(invoice.date)}`, a4Width / 2 + 10, yPos);
    yPos += 5;

    if (invoice.customerGstin) {
        doc.text(`GSTIN: ${invoice.customerGstin}`, leftMargin, yPos + 5);
    }

    yPos = Math.max(yPos + (addressLines.length * 4), 70) + 10;

    // Table Header
    doc.setFillColor(243, 244, 246);
    doc.rect(leftMargin, yPos, rightMargin - leftMargin, 10, 'F');
    setDocFont(true);
    doc.setTextColor(55);

    const colX = {
        desc: leftMargin + 5,
        qty: rightMargin - 80,
        rate: rightMargin - 50,
        amount: rightMargin - 5
    };

    doc.text(labels.desc || "DESCRIPTION", colX.desc, yPos + 6);
    doc.text(labels.qty || "QTY", colX.qty, yPos + 6, { align: 'right' });
    doc.text(labels.rate || "RATE", colX.rate, yPos + 6, { align: 'right' });
    doc.text(labels.amount || "AMOUNT", colX.amount, yPos + 6, { align: 'right' });

    yPos += 12;
    doc.setTextColor(0);
    setDocFont(false);

    invoice.items.forEach((item) => {
        if (yPos > pageHeight - 30) { doc.addPage(); yPos = 20; }
        setDocFont(false);
        doc.text(item.description, colX.desc, yPos);
        doc.text(String(item.quantity), colX.qty, yPos, { align: 'right' });
        doc.text(item.rate.toLocaleString('en-IN', { minimumFractionDigits: 2 }), colX.rate, yPos, { align: 'right' });
        setDocFont(true);
        doc.text((item.totalAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 }), colX.amount, yPos, { align: 'right' });
        yPos += 8;
    });

    // Totals
    doc.setDrawColor(220);
    doc.line(leftMargin, yPos, rightMargin, yPos);
    yPos += 10;

    const totalXLabel = rightMargin - 45;
    const totalXValue = rightMargin - 5;

    const totalQty = invoice.items.reduce((sum, item) => sum + (item.quantity || 0), 0);
    setDocFont(true);
    doc.setFontSize(9);
    doc.text(`Total Units: ${totalQty}`, colX.qty, yPos, { align: 'right' });
    yPos += 8;

    setDocFont(true);
    doc.setFontSize(10);
    doc.text(labels.total || "TOTAL:", totalXLabel, yPos, { align: 'right' });
    doc.text(`Rs. ${invoice.total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, totalXValue, yPos, { align: 'right' });

    yPos += 10;
    doc.setFontSize(9);
    setDocFont(true);
    doc.text(labels.amtWords || "Amount in Words:", leftMargin, yPos);
    setDocFont(false);
    doc.text(invoice.totalInWords || numberToWords(invoice.total), leftMargin + 40, yPos);
};

// ... Placeholder for Tally and Desi - will implement logic later or map to default for now to prevent errors
const generateTallyPDF = async (doc: jsPDF, invoice: Invoice, company: CompanyProfile, _customer: Customer | null, _qrCodeUrl?: string, _showPreviousBalance?: boolean) => {
    // Basic Tally Structure - Grid based
    const a4Width = 210;
    const pageHeight = doc.internal.pageSize.getHeight();
    const leftMargin = 10;
    const rightMargin = a4Width - 10;
    const lang = company.invoiceSettings?.language;
    const labels = (invoice as any).translatedLabels || {
        invoice: "TAX INVOICE",
        no: "Invoice No:",
        date: "Date:",
        totalAmt: "Total Amount:"
    };

    const setDocFont = (bold = false) => {
        doc.setFont(getFont(lang, "times"), bold ? "bold" : "normal");
    };

    doc.rect(leftMargin, 10, rightMargin - leftMargin, pageHeight - 20); // Main Border

    let yPos = 10;
    // Header
    setDocFont(true);
    doc.setFontSize(12);
    doc.text(labels.invoice, a4Width / 2, yPos + 5, { align: 'center' });

    doc.line(leftMargin, yPos + 8, rightMargin, yPos + 8);
    yPos += 8;

    // Company Left, Invoice Details Right
    const midX = a4Width / 2;
    doc.line(midX, yPos, midX, yPos + 35);
    doc.line(leftMargin, yPos + 35, rightMargin, yPos + 35);

    // Company
    doc.setFontSize(12);
    doc.text(company.name, leftMargin + 2, yPos + 5);
    setDocFont(false);
    doc.setFontSize(9);
    doc.text(company.address, leftMargin + 2, yPos + 10);

    // Invoice Data
    doc.text(`${labels.no} ${invoice.invoiceNumber}`, midX + 2, yPos + 5);
    doc.text(`${labels.date} ${formatDate(invoice.date)}`, midX + 2, yPos + 10);

    // ... Simplified Tally logic for speed. 
    // Just drawing the basics to verify structure switch works

    setDocFont(true);
    const totalQty = invoice.items.reduce((sum, item) => sum + (item.quantity || 0), 0);
    doc.text(`Total Qty: ${totalQty}`, midX + 2, yPos + 30);
    doc.text(`${labels.totalAmt || 'Total'}: Rs. ${invoice.total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, rightMargin - 5, yPos + 40, { align: 'right' });
};


// ... (previous code)

const generateMinimalPDF = async (doc: jsPDF, invoice: Invoice, company: CompanyProfile, _customer: Customer | null, _qrCodeUrl?: string, _showPreviousBalance?: boolean) => {
    // Minimal - Clean, whitespace, no boxes
    const a4Width = 210;
    const leftMargin = 20;
    const rightMargin = a4Width - 20;
    let yPos = 20;

    const lang = company.invoiceSettings?.language;
    const labels = (invoice as any).translatedLabels || {
        billedTo: "Bill To:",
        invoice: "INVOICE",
        date: "Date:",
        item: "Item",
        total: "Total:"
    };

    const setDocFont = (bold = false) => {
        doc.setFont(getFont(lang, "helvetica"), bold ? "bold" : "normal");
    };

    setDocFont(true);
    doc.setFontSize(24);
    doc.text(company.name, leftMargin, yPos);
    yPos += 8;

    setDocFont(false);
    doc.setFontSize(10);
    doc.text(company.address, leftMargin, yPos);
    yPos += 5;
    doc.text(`Ph: ${company.phone}`, leftMargin, yPos);

    yPos = 50;

    // Grid-less layout
    setDocFont(true);
    doc.text(labels.invoice, leftMargin, yPos);
    setDocFont(false);
    doc.text(`#${invoice.invoiceNumber}`, leftMargin + 35, yPos);

    doc.text(formatDate(invoice.date), rightMargin, yPos, { align: 'right' });
    yPos += 15;

    setDocFont(true);
    doc.text(labels.billedTo, leftMargin, yPos);
    yPos += 5;
    setDocFont(false);
    doc.text(invoice.customerName, leftMargin, yPos);

    yPos += 15;

    // Simple List
    setDocFont(true);
    doc.text(labels.item || "Item", leftMargin, yPos);
    doc.text(labels.total || "Total", rightMargin, yPos, { align: 'right' });
    yPos += 2;
    doc.setDrawColor(200);
    doc.line(leftMargin, yPos, rightMargin, yPos);
    yPos += 8;

    setDocFont(false);
    invoice.items.forEach(item => {
        doc.text(item.description, leftMargin, yPos);
        setDocFont(true);
        doc.text((item.totalAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 }), rightMargin, yPos, { align: 'right' });
        setDocFont(false);
        yPos += 8;
    });

    yPos += 5;
    doc.line(leftMargin, yPos, rightMargin, yPos);
    yPos += 10;

    setDocFont(true);
    doc.setFontSize(14);
    doc.text(`${labels.total || 'Total'}: Rs. ${invoice.total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, rightMargin, yPos, { align: 'right' });
};

const generateDesiPDF = async (doc: jsPDF, invoice: Invoice, company: CompanyProfile, _customer: Customer | null, _qrCodeUrl?: string, _showPreviousBalance?: boolean) => {
    // Desi - Traditional - Center Aligned - Red Theme
    const a4Width = 210;
    const pageHeight = doc.internal.pageSize.getHeight();
    const leftMargin = 15;
    const rightMargin = a4Width - 15;
    let yPos = 15;

    // Border
    doc.setDrawColor(220, 38, 38); // Red
    doc.setLineWidth(1);
    doc.rect(10, 10, a4Width - 20, pageHeight - 20);

    const lang = company.invoiceSettings?.language;
    const labels = (invoice as any).translatedLabels || {
        invoice: "INVOICE / CASH MEMO",
        date: "Date:",
        no: "No:",
        customer: "Customer:",
        particulars: "PARTICULARS",
        qty: "QTY",
        rate: "RATE",
        amount: "AMOUNT",
        grandTotal: "Grand Total:"
    };

    const setDocFont = (bold = false) => {
        doc.setFont(getFont(lang, "times"), bold ? "bold" : "normal");
    };

    // Border
    doc.setDrawColor(220, 38, 38); // Red
    doc.setLineWidth(1);
    doc.rect(10, 10, a4Width - 20, pageHeight - 20);

    doc.setTextColor(220, 38, 38);
    setDocFont(true);
    doc.setFontSize(10);
    doc.text("|| SHREE GANESHAYA NAMAH ||", a4Width / 2, yPos, { align: 'center' });
    yPos += 10;

    doc.setFontSize(24);
    doc.setTextColor(0);
    doc.text(company.name, a4Width / 2, yPos, { align: 'center' });
    yPos += 8;

    setDocFont(false);
    doc.setFontSize(11);
    doc.text(company.address, a4Width / 2, yPos, { align: 'center' });
    yPos += 5;
    doc.text(`Mob: ${company.phone}`, a4Width / 2, yPos, { align: 'center' });
    yPos += 10;

    doc.setDrawColor(220, 38, 38);
    doc.line(10, yPos, a4Width - 10, yPos);
    yPos += 8;

    setDocFont(true);
    doc.text(labels.invoice, a4Width / 2, yPos, { align: 'center' });
    yPos += 10;

    // Details
    doc.text(`${labels.no} ${invoice.invoiceNumber}`, leftMargin + 5, yPos);
    doc.text(`${labels.date} ${formatDate(invoice.date)}`, rightMargin - 5, yPos, { align: 'right' });
    yPos += 10;

    doc.text(labels.customer, leftMargin + 5, yPos);
    setDocFont(false);
    doc.text(invoice.customerName, leftMargin + 35, yPos);
    yPos += 15;

    // Table
    const colX = { desc: leftMargin + 5, qty: a4Width / 2 + 20, rate: a4Width / 2 + 50, amt: rightMargin - 5 };

    doc.setFillColor(254, 242, 242); // Light red bg
    doc.rect(10, yPos - 5, a4Width - 20, 10, 'F');
    doc.setTextColor(220, 38, 38);
    setDocFont(true);
    doc.text(labels.particulars, colX.desc, yPos);
    doc.text(labels.qty, colX.qty, yPos, { align: 'right' });
    doc.text(labels.rate, colX.rate, yPos, { align: 'right' });
    doc.text(labels.amount, colX.amt, yPos, { align: 'right' });
    yPos += 10;

    doc.setTextColor(0);
    setDocFont(false);

    invoice.items.forEach(item => {
        doc.text(item.description, colX.desc, yPos);
        doc.text(String(item.quantity), colX.qty, yPos, { align: 'right' });
        doc.text(item.rate.toLocaleString('en-IN', { minimumFractionDigits: 2 }), colX.rate, yPos, { align: 'right' });
        setDocFont(true);
        doc.text((item.totalAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 }), colX.amt, yPos, { align: 'right' });
        setDocFont(false);
        yPos += 8;
    });

    // Footer Total
    yPos = Math.max(yPos + 5, pageHeight - 40);
    const totalQty = invoice.items.reduce((sum, item) => sum + (item.quantity || 0), 0);
    doc.setDrawColor(220, 38, 38);
    doc.line(10, yPos, a4Width - 10, yPos);
    yPos += 10;

    setDocFont(true);
    doc.setFontSize(12);
    doc.text(`Total Qty: ${totalQty}`, colX.qty, yPos, { align: 'right' });
    doc.setFontSize(14);
    doc.text(`${labels.grandTotal || 'Grand Total'}: Rs. ${invoice.total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, rightMargin - 5, yPos, { align: 'right' });
};

const generateKacchiPDF = async (doc: jsPDF, invoice: Invoice, company: CompanyProfile, _customer: Customer | null, _qrCodeUrl?: string, _showPreviousBalance?: boolean) => {
    // Kacchi - Handwritten style (using Courier/Times), very simple, like a rough note
    const a4Width = 210;
    const leftMargin = 10;
    let yPos = 20;
    const lang = company.invoiceSettings?.language;
    const labels = (invoice as any).translatedLabels || {
        estimate: "ESTIMATE / KACCHI PARCHI",
        from: "From:",
        to: "To:",
        date: "Date:",
        total: "Total:"
    };

    const setDocFont = (bold = false) => {
        doc.setFont(getFont(lang, "courier"), bold ? "bold" : "normal");
    };

    setDocFont(true);
    doc.setFontSize(16);
    doc.text(labels.estimate, a4Width / 2, yPos, { align: 'center' });
    yPos += 15;

    doc.setFontSize(12);
    doc.text(`${labels.from} ${company.name}`, leftMargin, yPos);
    yPos += 10;
    doc.text(`${labels.to}   ${invoice.customerName}`, leftMargin, yPos);
    yPos += 10;
    doc.text(`${labels.date} ${formatDate(invoice.date)}`, leftMargin, yPos);
    yPos += 15;

    doc.text("------------------------------------------", leftMargin, yPos);
    yPos += 5;

    setDocFont(false);
    invoice.items.forEach(item => {
        doc.text(`${item.description}`, leftMargin, yPos);
        yPos += 5;
        doc.text(`   ${item.quantity} x ${item.rate.toLocaleString('en-IN')} = ${(item.totalAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, leftMargin, yPos);
        yPos += 10;
    });

    setDocFont(true);
    const totalQty = invoice.items.reduce((sum, item) => sum + (item.quantity || 0), 0);
    doc.text(`Total Qty: ${totalQty}`, leftMargin, yPos);
    yPos += 8;
    doc.text("------------------------------------------", leftMargin, yPos);
    yPos += 8;
    doc.setFontSize(14);
    doc.text(`${labels.total} Rs. ${invoice.total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, leftMargin, yPos);
};

const generateRetroPDF = async (doc: jsPDF, invoice: Invoice, company: CompanyProfile, _customer: Customer | null, _qrCodeUrl?: string, _showPreviousBalance?: boolean) => {
    // Retro - Computer Terminal Green/Black style? tough to print. Just use Courier bold, ALL CAPS
    let yPos = 20;
    const leftMargin = 15;

    const lang = company.invoiceSettings?.language;
    const labels = (invoice as any).translatedLabels || {
        invoiceRec: "INVOICE RECEIPT",
        id: "ID:",
        date: "DATE:",
        cust: "CUST:",
        item: "ITEM",
        qty: "QTY",
        rate: "RATE",
        amt: "AMT",
        totalDue: "TOTAL DUE:"
    };

    const setDocFont = (bold = false) => {
        doc.setFont(getFont(lang, "courier"), bold ? "bold" : "normal");
    };

    setDocFont(true);
    doc.setFontSize(22);
    doc.text(company.name.toUpperCase(), 15, yPos);
    yPos += 10;

    doc.setFontSize(10);
    setDocFont(false);
    doc.text("**************************************************", 15, yPos);
    yPos += 5;
    doc.text(`                ${labels.invoiceRec}                   `, 15, yPos);
    yPos += 5;
    doc.text("**************************************************", 15, yPos);
    yPos += 10;

    doc.text(`${labels.id}   ${invoice.invoiceNumber}`, leftMargin, yPos);
    yPos += 5;
    doc.text(`${labels.date} ${formatDate(invoice.date)}`, leftMargin, yPos);
    yPos += 5;
    doc.text(`${labels.cust} ${invoice.customerName.substring(0, 25).toUpperCase()}`, leftMargin, yPos);
    yPos += 10;

    doc.text(`${labels.item}                     ${labels.qty}    ${labels.rate}    ${labels.amt}`, leftMargin, yPos);
    yPos += 2;
    doc.text("--------------------------------------------------", leftMargin, yPos);
    yPos += 5;

    invoice.items.forEach(item => {
        const desc = item.description.substring(0, 20).toUpperCase().padEnd(20, ' ');
        const qty = String(item.quantity).padStart(3, ' ');
        const rate = item.rate.toLocaleString('en-IN').padStart(7, ' ');
        const amt = (item.totalAmount || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 }).padStart(7, ' ');

        doc.text(`${desc} ${qty} ${rate} ${amt}`, leftMargin, yPos);
        yPos += 5;
    });

    yPos += 5;
    doc.text("--------------------------------------------------", leftMargin, yPos);
    yPos += 5;
    doc.setFontSize(14);
    setDocFont(true);
    yPos += 5;
    const totalQty = invoice.items.reduce((sum, item) => sum + (item.quantity || 0), 0);
    doc.text(`Total Qty: ${totalQty}`, leftMargin, yPos + 5);
    yPos += 5;
    doc.text(`${labels.totalDue}   ${invoice.total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, leftMargin, yPos);
};

const generateSavePaperPDF = async (doc: jsPDF, invoice: Invoice, company: CompanyProfile, _customer: Customer | null, _qrCodeUrl?: string, _showPreviousBalance: boolean = false) => {
    // SavePaper - Optimized for vertical space
    const a4Width = 210;
    const leftMargin = 15;
    const rightMargin = a4Width - 15;
    let yPos = 15;

    const lang = company.invoiceSettings?.language;
    const labels = (invoice as any).translatedLabels || {
        billedTo: "Bill To:",
        // invoice: "TAX INVOICE", // Removed to save space
        date: "Date:",
        invoiceNo: "Inv #:",
        mode: "Mode:",
        desc: "Item",
        qty: "Qty",
        rate: "Rate",
        amount: "Amt",
        subtotal: "Subtotal:",
        total: "Total:",
        amtWords: "In Words:",
        scanToPay: "Scan to Pay:"
    };

    const setDocFont = (bold = false) => {
        doc.setFont(getFont(lang, "helvetica"), bold ? "bold" : "normal");
    };

    const safeCompany = {
        name: company.name || 'Company Name',
        address: company.address || '',
        phone: company.phone || '',
        email: company.email || ''
    };

    // --- Compact Header ---
    // Left: Invoice No
    // Center: Company
    // Right: Date & Mode

    const midX = a4Width / 2;

    // Company (Center)
    setDocFont(true);
    doc.setFontSize(16);
    doc.text(safeCompany.name, midX, yPos, { align: "center" });

    // QR Code (Left)
    if (_qrCodeUrl && company.upiId && invoice.total > 0) {
        const qrSize = 19;
        doc.addImage(_qrCodeUrl, 'PNG', leftMargin, yPos - 8, qrSize, qrSize);
    } else {
        // Fallback text if no QR
        doc.setFontSize(10);
        doc.text(labels.invoiceNo, leftMargin, yPos);
    }

    // Date (Right)
    doc.setFontSize(10);
    doc.text(`${labels.date} ${formatDate(invoice.date)}`, rightMargin, yPos, { align: 'right' });

    yPos += 5;

    // Company Details (Center)
    setDocFont(false);
    doc.setFontSize(8);
    doc.setTextColor(80);
    doc.text(safeCompany.address, midX, yPos, { align: "center" });

    // Mode (Right)
    doc.setTextColor(0);
    doc.setFontSize(10);
    const modeText = invoice.status === 'PAID' ? 'Cash' : 'Credit';
    doc.text(`${labels.mode} ${modeText}`, rightMargin, yPos, { align: 'right' });

    // Invoice # (Right - moved from left)
    const invLabel = labels.invoiceNo || "Inv #:";
    doc.text(`${invLabel} ${invoice.invoiceNumber || '-'}`, rightMargin, yPos + 5, { align: 'right' });

    yPos += 4;
    doc.setTextColor(80);
    doc.text(`Ph: ${safeCompany.phone}`, midX, yPos, { align: "center" });

    // GSTIN (if exists)
    if (invoice.gstEnabled && (company.gstin || (company as any).gst)) {
        yPos += 4;
        setDocFont(true);
        doc.setTextColor(34, 197, 94);
        const gstin = company.gstin || (company as any).gst || '';
        doc.text(`GSTIN: ${gstin}`, midX, yPos, { align: "center" });
        doc.setTextColor(0);
    }

    yPos += 4;
    doc.setDrawColor(0);
    doc.setLineWidth(0.5);
    doc.line(leftMargin, yPos, rightMargin, yPos);
    yPos += 6;

    // Customer Name (Center Prominent) - replacing Tax Invoice label
    setDocFont(true);
    doc.setFontSize(12);
    doc.setTextColor(0);
    doc.text(invoice.customerName || 'Customer', midX, yPos, { align: "center" });

    if (invoice.customerAddress) {
        yPos += 4;
        setDocFont(false);
        doc.setFontSize(9);
        doc.text(invoice.customerAddress, midX, yPos, { align: "center" });
    }

    yPos += 8;

    // --- Compact Table ---
    doc.setFillColor(245, 247, 250);
    doc.rect(leftMargin, yPos, rightMargin - leftMargin, 6, 'F'); // Smaller header
    setDocFont(true);
    doc.setFontSize(8);
    doc.setTextColor(60);

    const colX = {
        idx: leftMargin + 2,
        desc: leftMargin + 10,
        qty: rightMargin - 60,
        rate: rightMargin - 40,
        amount: rightMargin - 2
    };

    doc.text("#", colX.idx, yPos + 4);
    doc.text(labels.desc, colX.desc, yPos + 4);
    doc.text(labels.qty, colX.qty, yPos + 4, { align: "right" });
    doc.text(labels.rate, colX.rate, yPos + 4, { align: "right" });
    doc.text(labels.amount, colX.amount, yPos + 4, { align: "right" });

    yPos += 8;

    setDocFont(false);
    doc.setTextColor(0);
    doc.setFontSize(9);

    const rowHeight = 6; // Reduced row height
    const pageHeight = doc.internal.pageSize.getHeight();

    invoice.items.forEach((item, i) => {
        if (yPos > pageHeight - 25) { // Smaller margin
            doc.addPage();
            yPos = 15;
        }

        doc.text(`${i + 1}`, colX.idx, yPos + 4);
        doc.text(item.description.substring(0, 35) || '-', colX.desc, yPos + 4); // Limit desc length
        doc.text((item.quantity || 0).toString(), colX.qty, yPos + 4, { align: "right" });
        doc.text(item.rate.toLocaleString('en-IN'), colX.rate, yPos + 4, { align: "right" });

        setDocFont(true);
        const amountWithGST = (item.totalAmount || item.baseAmount) || 0;
        doc.text(amountWithGST.toLocaleString('en-IN', { minimumFractionDigits: 2 }), colX.amount, yPos + 4, { align: "right" });
        setDocFont(false);

        doc.setDrawColor(240); // Lighter line
        doc.line(leftMargin, yPos + rowHeight, rightMargin, yPos + rowHeight);
        yPos += rowHeight;
    });

    yPos += 4;

    // Totals (Inline to save space)
    const midPage = a4Width / 2;

    // Amount Word (Left)
    const amountWords = invoice.totalInWords || numberToWords(_showPreviousBalance && invoice.previousBalance ? (invoice.total + invoice.previousBalance) : invoice.total);
    doc.setFontSize(8);
    setDocFont(true);
    doc.text(`${labels.amtWords} ${amountWords}`, leftMargin, yPos + 4, { maxWidth: midPage - leftMargin });

    // Total Stats (Right)
    const totalQty = invoice.items.reduce((sum, item) => sum + (item.quantity || 0), 0);
    setDocFont(true);
    doc.setFontSize(8);
    doc.text(`Total Qty: ${totalQty}`, colX.qty, yPos + 4, { align: 'right' });
    doc.setFontSize(10);
    doc.text(`${labels.total} Rs. ${invoice.total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, rightMargin, yPos + 4, { align: 'right' });

    if (_showPreviousBalance && invoice.previousBalance && invoice.previousBalance > 0) {
        yPos += 5;
        doc.setFontSize(9);
        doc.setTextColor(239, 68, 68);
        doc.text(`Grand Total: Rs. ${(invoice.total + invoice.previousBalance).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, rightMargin, yPos + 4, { align: 'right' });
        doc.setTextColor(0);
    }

    // QR Code Removed from Footer (Moved to Header)
};


export const InvoicePdfService = {
    generatePDF: async (invoice: Invoice, company: CompanyProfile, customer: Customer | null, qrCodeUrl?: string, showPreviousBalance: boolean = false, shouldShare: boolean = true): Promise<string> => {
        try {
            const doc = new jsPDF({
                orientation: 'portrait',
                unit: 'mm',
                format: 'a4'
            });

            // Handle Translation if needed
            // Handle Translation if needed
            let language = company.invoiceSettings?.language || 'English';
            let processedInvoice = invoice;

            if (language !== 'English') {
                if (AIService.isConfigured()) {
                    try {
                        processedInvoice = await AIService.translateInvoiceData(invoice, language as any);
                    } catch (e) {
                        console.warn("Translation failed", e);
                    }
                }

                // Always load font for Hindi/Hinglish
                if (language === 'Hindi' || language === 'Hinglish') {
                    const fontLoaded = await loadHindiFont(doc);
                    if (!fontLoaded) {
                        console.warn("Hindi font failed to load. Falling back to English.");
                        language = 'English';
                    }
                }
            }

            // Create a temporary company profile with the resolved language
            // This ensures getFont uses the correct logic (Devanagari if loaded, otherwise standard)
            const safeCompany = {
                ...company,
                invoiceSettings: {
                    ...company.invoiceSettings,
                    language: language as any
                }
            } as CompanyProfile;

            const format = company.invoiceSettings?.format ||
                ((company as any).invoiceTemplate?.toUpperCase() as InvoiceFormat) ||
                InvoiceFormat.DEFAULT;

            switch (format) {
                case InvoiceFormat.MODERN:
                case InvoiceFormat.PROFESSIONAL: // Map similar
                    await generateModernPDF(doc, processedInvoice, safeCompany, customer, qrCodeUrl, showPreviousBalance);
                    break;

                case InvoiceFormat.MINIMAL:
                case InvoiceFormat.ELEGANT:
                    await generateMinimalPDF(doc, processedInvoice, safeCompany, customer, qrCodeUrl, showPreviousBalance);
                    break;

                case InvoiceFormat.DESI_BILL_BOOK:
                    await generateDesiPDF(doc, processedInvoice, safeCompany, customer, qrCodeUrl, showPreviousBalance);
                    break;

                case InvoiceFormat.KACCHI_BILL_BOOK:
                    await generateKacchiPDF(doc, processedInvoice, safeCompany, customer, qrCodeUrl, showPreviousBalance);
                    break;

                case InvoiceFormat.TALLY_PRIME_STYLE:
                case InvoiceFormat.COMPACT:
                    await generateTallyPDF(doc, processedInvoice, safeCompany, customer, qrCodeUrl, showPreviousBalance);
                    break;

                case InvoiceFormat.RETRO:
                case InvoiceFormat.BOLD: // Map Bold to Retro for now or Default
                    await generateRetroPDF(doc, processedInvoice, safeCompany, customer, qrCodeUrl, showPreviousBalance);
                    break;

                case InvoiceFormat.SAVE_PAPER:
                    await generateSavePaperPDF(doc, processedInvoice, safeCompany, customer, qrCodeUrl, showPreviousBalance);
                    break;

                case InvoiceFormat.DEFAULT:
                default:
                    await generateDefaultPDF(doc, processedInvoice, safeCompany, customer, qrCodeUrl, showPreviousBalance);
                    break;
            }

            // --- BRANDED FOOTER WATERMARK ---
            addBrandedFooter(doc, { showDisclaimer: true });

            // Save/Share Logic (Unified)
            const fileName = `Invoice-${invoice.invoiceNumber}.pdf`;
            if (Capacitor.isNativePlatform()) {
                const pdfBase64 = doc.output('datauristring').split(',')[1];
                const cacheResult = await Filesystem.writeFile({
                    path: fileName,
                    data: pdfBase64,
                    directory: Directory.Cache
                });

                if (shouldShare) {
                    await Share.share({
                        title: fileName,
                        files: [cacheResult.uri],
                        dialogTitle: 'Save or Share PDF...'
                    });
                }
                return cacheResult.uri;
            } else {
                if (shouldShare) {
                    doc.save(fileName);
                }
                return ''; // No path on web
            }
        } catch (error) {
            console.error("PDF Generation Error:", error);
            throw error;
        }
    }
};
