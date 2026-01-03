
import { jsPDF } from 'jspdf';
import { Invoice, CompanyProfile, Customer } from '../types';
import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import QRCode from 'qrcode';

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

    const safeCompany = {
        name: company.name || 'Company Name',
        address: company.address || '',
        phone: company.phone || '',
        email: company.email || ''
    };

    // Header
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

    if (invoice.gstEnabled && (company.gstin || (company as any).gst)) {
        doc.setFont("helvetica", "bold");
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
    yPos += 5;

    if (invoice.discountAmount && invoice.discountAmount > 0) {
        doc.setFont("helvetica", "normal");
        doc.text("Discount:", totalXLabel, yPos + 5, { align: "right" });
        doc.text(`- Rs. ${(invoice.discountAmount).toFixed(2)}`, totalXValue, yPos + 5, { align: "right" });
        yPos += 5;
    }

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
    }

    doc.setDrawColor(0);
    doc.line(rightMargin - 70, yPos + 2, rightMargin, yPos + 2);
    yPos += 8;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text("Total:", totalXLabel, yPos + 5, { align: "right" });
    doc.text(`Rs. ${invoice.total.toFixed(2)}`, totalXValue, yPos + 5, { align: "right" });
    yPos += 8;

    const amountWords = numberToWords(invoice.total);
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.text("Amount in Words:", leftMargin, yPos);
    doc.setFont("helvetica", "normal");
    doc.text(amountWords, leftMargin + 35, yPos);

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
            doc.setFont("helvetica", "bold");
            doc.text("Scan to Pay:", rightMargin, footerY - 2, { align: "right" });
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

    // Header Background
    doc.setFillColor(37, 99, 235); // Blue-600
    doc.rect(0, 0, a4Width, 40, 'F');

    // Company Name in White
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(22);
    doc.text(company.name || 'Company Name', leftMargin, 15);

    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(company.address || '', leftMargin, 22);
    doc.text(`Ph: ${company.phone}`, leftMargin, 27);

    // Invoice Title on Right
    doc.setFontSize(30);
    doc.setFont("helvetica", "bold");
    doc.text("INVOICE", rightMargin, 25, { align: "right" });

    let yPos = 50;
    doc.setTextColor(0);

    // Info Columns
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.text("BILL TO", leftMargin, yPos);
    doc.text("INVOICE DETAILS", a4Width / 2 + 10, yPos);
    yPos += 5;

    doc.setFont("helvetica", "normal");
    doc.text(invoice.customerName || 'Customer', leftMargin, yPos);
    doc.text(`Invoice #: ${invoice.invoiceNumber}`, a4Width / 2 + 10, yPos);
    yPos += 5;

    const addressLines = doc.splitTextToSize(invoice.customerAddress || '', 80);
    doc.text(addressLines, leftMargin, yPos);
    doc.text(`Date: ${new Date(invoice.date).toLocaleDateString()}`, a4Width / 2 + 10, yPos);
    yPos += 5;

    if (invoice.customerGstin) {
        doc.text(`GSTIN: ${invoice.customerGstin}`, leftMargin, yPos + 5);
    }

    yPos = Math.max(yPos + (addressLines.length * 4), 70) + 10;

    // Table Header
    doc.setFillColor(243, 244, 246);
    doc.rect(leftMargin, yPos, rightMargin - leftMargin, 10, 'F');
    doc.setFont("helvetica", "bold");
    doc.setTextColor(55);

    const colX = {
        desc: leftMargin + 5,
        qty: rightMargin - 80,
        rate: rightMargin - 50,
        amount: rightMargin - 5
    };

    doc.text("DESCRIPTION", colX.desc, yPos + 6);
    doc.text("QTY", colX.qty, yPos + 6, { align: 'right' });
    doc.text("RATE", colX.rate, yPos + 6, { align: 'right' });
    doc.text("AMOUNT", colX.amount, yPos + 6, { align: 'right' });

    yPos += 12;
    doc.setTextColor(0);
    doc.setFont("helvetica", "normal");

    invoice.items.forEach((item) => {
        if (yPos > pageHeight - 30) { doc.addPage(); yPos = 20; }
        doc.text(item.description, colX.desc, yPos);
        doc.text(String(item.quantity), colX.qty, yPos, { align: 'right' });
        doc.text(String(item.rate), colX.rate, yPos, { align: 'right' });
        doc.text(String((item.totalAmount || 0).toFixed(2)), colX.amount, yPos, { align: 'right' });
        yPos += 8;
    });

    // Totals
    doc.setDrawColor(220);
    doc.line(leftMargin, yPos, rightMargin, yPos);
    yPos += 5;

    doc.setFont("helvetica", "bold");
    doc.text("TOTAL:", rightMargin - 50, yPos, { align: 'right' });
    doc.text(String(invoice.total.toFixed(2)), colX.amount, yPos, { align: 'right' });

    // Simplified for Modern - add more details if needed
};

// ... Placeholder for Tally and Desi - will implement logic later or map to default for now to prevent errors
const generateTallyPDF = async (doc: jsPDF, invoice: Invoice, company: CompanyProfile, _customer: Customer | null, _qrCodeUrl?: string, _showPreviousBalance?: boolean) => {
    // Basic Tally Structure - Grid based
    const a4Width = 210;
    const pageHeight = doc.internal.pageSize.getHeight();
    const leftMargin = 10;
    const rightMargin = a4Width - 10;

    doc.rect(leftMargin, 10, rightMargin - leftMargin, pageHeight - 20); // Main Border

    let yPos = 10;
    // Header
    doc.setFont("times", "bold"); // Tally uses Serif often
    doc.setFontSize(12);
    doc.text("TAX INVOICE", a4Width / 2, yPos + 5, { align: 'center' });

    doc.line(leftMargin, yPos + 8, rightMargin, yPos + 8);
    yPos += 8;

    // Company Left, Invoice Details Right
    const midX = a4Width / 2;
    doc.line(midX, yPos, midX, yPos + 35);
    doc.line(leftMargin, yPos + 35, rightMargin, yPos + 35);

    // Company
    doc.setFontSize(12);
    doc.text(company.name, leftMargin + 2, yPos + 5);
    doc.setFont("times", "normal");
    doc.setFontSize(9);
    doc.text(company.address, leftMargin + 2, yPos + 10);

    // Invoice Data
    doc.text(`Invoice No: ${invoice.invoiceNumber}`, midX + 2, yPos + 5);
    doc.text(`Date: ${new Date(invoice.date).toLocaleDateString()}`, midX + 2, yPos + 10);

    // ... Simplified Tally logic for speed. 
    // Just drawing the basics to verify structure switch works

    doc.text(`Total Amount: Rs. ${invoice.total}`, rightMargin - 5, yPos + 40, { align: 'right' });
};


// ... (previous code)

const generateMinimalPDF = async (doc: jsPDF, invoice: Invoice, company: CompanyProfile, _customer: Customer | null, _qrCodeUrl?: string, _showPreviousBalance?: boolean) => {
    // Minimal - Clean, whitespace, no boxes
    const a4Width = 210;
    const leftMargin = 20;
    const rightMargin = a4Width - 20;
    let yPos = 20;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(24);
    doc.text(company.name, leftMargin, yPos);
    yPos += 8;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.text(company.address, leftMargin, yPos);
    yPos += 5;
    doc.text(`Ph: ${company.phone}`, leftMargin, yPos);

    yPos = 50;

    // Grid-less layout
    doc.setFont("helvetica", "bold");
    doc.text("INVOICE", leftMargin, yPos);
    doc.setFont("helvetica", "normal");
    doc.text(`#${invoice.invoiceNumber}`, leftMargin + 30, yPos);

    doc.text(new Date(invoice.date).toLocaleDateString(), rightMargin, yPos, { align: 'right' });
    yPos += 15;

    doc.setFont("helvetica", "bold");
    doc.text("Bill To:", leftMargin, yPos);
    yPos += 5;
    doc.setFont("helvetica", "normal");
    doc.text(invoice.customerName, leftMargin, yPos);

    yPos += 15;

    // Simple List
    doc.setFont("helvetica", "bold");
    doc.text("Item", leftMargin, yPos);
    doc.text("Total", rightMargin, yPos, { align: 'right' });
    yPos += 2;
    doc.setDrawColor(200);
    doc.line(leftMargin, yPos, rightMargin, yPos);
    yPos += 8;

    doc.setFont("helvetica", "normal");
    invoice.items.forEach(item => {
        doc.text(item.description, leftMargin, yPos);
        doc.text(String((item.totalAmount || 0).toFixed(2)), rightMargin, yPos, { align: 'right' });
        yPos += 8;
    });

    yPos += 5;
    doc.line(leftMargin, yPos, rightMargin, yPos);
    yPos += 10;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.text(`Total: Rs. ${invoice.total.toFixed(2)}`, rightMargin, yPos, { align: 'right' });
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

    doc.setTextColor(220, 38, 38);
    doc.setFont("times", "bold"); // Times for traditional look
    doc.setFontSize(10);
    doc.text("|| SHREE GANESHAYA NAMAH ||", a4Width / 2, yPos, { align: 'center' });
    yPos += 10;

    doc.setFontSize(24);
    doc.setTextColor(0);
    doc.text(company.name, a4Width / 2, yPos, { align: 'center' });
    yPos += 8;

    doc.setFont("times", "normal");
    doc.setFontSize(11);
    doc.text(company.address, a4Width / 2, yPos, { align: 'center' });
    yPos += 5;
    doc.text(`Mob: ${company.phone}`, a4Width / 2, yPos, { align: 'center' });
    yPos += 10;

    doc.setDrawColor(220, 38, 38);
    doc.line(10, yPos, a4Width - 10, yPos);
    yPos += 8;

    doc.setFont("times", "bold");
    doc.text("INVOICE / CASH MEMO", a4Width / 2, yPos, { align: 'center' });
    yPos += 10;

    // Details
    doc.text(`No: ${invoice.invoiceNumber}`, leftMargin + 5, yPos);
    doc.text(`Date: ${new Date(invoice.date).toLocaleDateString()}`, rightMargin - 5, yPos, { align: 'right' });
    yPos += 10;

    doc.text(`Customer: ${invoice.customerName}`, leftMargin + 5, yPos);
    yPos += 15;

    // Table
    const colX = { desc: leftMargin + 5, qty: a4Width / 2 + 20, rate: a4Width / 2 + 50, amt: rightMargin - 5 };

    doc.setFillColor(254, 242, 242); // Light red bg
    doc.rect(10, yPos - 5, a4Width - 20, 10, 'F');
    doc.setTextColor(220, 38, 38);
    doc.text("PARTICULARS", colX.desc, yPos);
    doc.text("QTY", colX.qty, yPos, { align: 'right' });
    doc.text("RATE", colX.rate, yPos, { align: 'right' });
    doc.text("AMOUNT", colX.amt, yPos, { align: 'right' });
    yPos += 10;

    doc.setTextColor(0);
    doc.setFont("times", "normal");

    invoice.items.forEach(item => {
        doc.text(item.description, colX.desc, yPos);
        doc.text(String(item.quantity), colX.qty, yPos, { align: 'right' });
        doc.text(String(item.rate), colX.rate, yPos, { align: 'right' });
        doc.text(String((item.totalAmount || 0).toFixed(2)), colX.amt, yPos, { align: 'right' });
        yPos += 8;
    });

    // Footer Total
    yPos = pageHeight - 40;
    doc.setDrawColor(220, 38, 38);
    doc.line(10, yPos, a4Width - 10, yPos);
    yPos += 10;

    doc.setFont("times", "bold");
    doc.setFontSize(14);
    doc.text(`Grand Total: Rs. ${invoice.total}`, rightMargin - 5, yPos, { align: 'right' });
};

const generateKacchiPDF = async (doc: jsPDF, invoice: Invoice, company: CompanyProfile, _customer: Customer | null, _qrCodeUrl?: string, _showPreviousBalance?: boolean) => {
    // Kacchi - Handwritten style (using Courier/Times), very simple, like a rough note
    const a4Width = 210;
    const leftMargin = 10;
    let yPos = 20;

    doc.setFont("courier", "bold");
    doc.setFontSize(16);
    doc.text("ESTIMATE / KACCHI PARCHI", a4Width / 2, yPos, { align: 'center' });
    yPos += 15;

    doc.setFontSize(12);
    doc.text(`From: ${company.name}`, leftMargin, yPos);
    yPos += 10;
    doc.text(`To:   ${invoice.customerName}`, leftMargin, yPos);
    yPos += 10;
    doc.text(`Date: ${new Date(invoice.date).toLocaleDateString()}`, leftMargin, yPos);
    yPos += 15;

    doc.text("------------------------------------------", leftMargin, yPos);
    yPos += 5;

    invoice.items.forEach(item => {
        doc.text(`${item.description}`, leftMargin, yPos);
        yPos += 5;
        doc.text(`   ${item.quantity} x ${item.rate} = ${item.totalAmount}`, leftMargin, yPos);
        yPos += 10;
    });

    doc.text("------------------------------------------", leftMargin, yPos);
    yPos += 8;
    doc.setFontSize(14);
    doc.text(`Total: ${invoice.total}`, leftMargin, yPos);
};

const generateRetroPDF = async (doc: jsPDF, invoice: Invoice, company: CompanyProfile, _customer: Customer | null, _qrCodeUrl?: string, _showPreviousBalance?: boolean) => {
    // Retro - Computer Terminal Green/Black style? tough to print. Just use Courier bold, ALL CAPS
    let yPos = 20;
    const leftMargin = 15;

    doc.setFont("courier", "bold");
    doc.setFontSize(22);
    doc.text(company.name.toUpperCase(), 15, yPos);
    yPos += 10;

    doc.setFontSize(10);
    doc.setFont("courier", "normal");
    doc.text("**************************************************", 15, yPos);
    yPos += 5;
    doc.text("                INVOICE RECEIPT                   ", 15, yPos);
    yPos += 5;
    doc.text("**************************************************", 15, yPos);
    yPos += 10;

    doc.text(`ID:   ${invoice.invoiceNumber}`, leftMargin, yPos);
    yPos += 5;
    doc.text(`DATE: ${new Date(invoice.date).toLocaleDateString()}`, leftMargin, yPos);
    yPos += 5;
    doc.text(`CUST: ${invoice.customerName.substring(0, 25).toUpperCase()}`, leftMargin, yPos);
    yPos += 10;

    doc.text("ITEM                     QTY    RATE    AMT", leftMargin, yPos);
    yPos += 2;
    doc.text("--------------------------------------------------", leftMargin, yPos);
    yPos += 5;

    invoice.items.forEach(item => {
        const desc = item.description.substring(0, 20).toUpperCase().padEnd(20, ' ');
        const qty = String(item.quantity).padStart(3, ' ');
        const rate = String(item.rate).padStart(7, ' ');
        const amt = String((item.totalAmount || 0).toFixed(0)).padStart(7, ' ');

        doc.text(`${desc} ${qty} ${rate} ${amt}`, leftMargin, yPos);
        yPos += 5;
    });

    yPos += 5;
    doc.text("--------------------------------------------------", leftMargin, yPos);
    yPos += 5;
    doc.setFontSize(14);
    doc.setFont("courier", "bold");
    doc.text(`TOTAL DUE:   ${invoice.total.toFixed(2)}`, leftMargin, yPos);
};


export const InvoicePdfService = {
    generatePDF: async (invoice: Invoice, company: CompanyProfile, customer: Customer | null, qrCodeUrl?: string, showPreviousBalance: boolean = false) => {
        try {
            const doc = new jsPDF({
                orientation: 'portrait',
                unit: 'mm',
                format: 'a4'
            });

            const format = company.invoiceSettings?.format ||
                ((company as any).invoiceTemplate?.toUpperCase() as InvoiceFormat) ||
                InvoiceFormat.DEFAULT;

            switch (format) {
                case InvoiceFormat.MODERN:
                case InvoiceFormat.PROFESSIONAL: // Map similar
                    await generateModernPDF(doc, invoice, company, customer, qrCodeUrl, showPreviousBalance);
                    break;

                case InvoiceFormat.MINIMAL:
                case InvoiceFormat.ELEGANT:
                    await generateMinimalPDF(doc, invoice, company, customer, qrCodeUrl, showPreviousBalance);
                    break;

                case InvoiceFormat.DESI_BILL_BOOK:
                    await generateDesiPDF(doc, invoice, company, customer, qrCodeUrl, showPreviousBalance);
                    break;

                case InvoiceFormat.KACCHI_BILL_BOOK:
                    await generateKacchiPDF(doc, invoice, company, customer, qrCodeUrl, showPreviousBalance);
                    break;

                case InvoiceFormat.TALLY_PRIME_STYLE:
                case InvoiceFormat.COMPACT:
                    await generateTallyPDF(doc, invoice, company, customer, qrCodeUrl, showPreviousBalance);
                    break;

                case InvoiceFormat.RETRO:
                case InvoiceFormat.BOLD: // Map Bold to Retro for now or Default
                    await generateRetroPDF(doc, invoice, company, customer, qrCodeUrl, showPreviousBalance);
                    break;

                case InvoiceFormat.DEFAULT:
                default:
                    await generateDefaultPDF(doc, invoice, company, customer, qrCodeUrl, showPreviousBalance);
                    break;
            }

            // Save/Share Logic (Unified)
            const fileName = `Invoice-${invoice.invoiceNumber}.pdf`;
            if (Capacitor.isNativePlatform()) {
                const pdfBase64 = doc.output('datauristring').split(',')[1];
                const cacheResult = await Filesystem.writeFile({
                    path: fileName,
                    data: pdfBase64,
                    directory: Directory.Cache
                });

                await Share.share({
                    title: fileName,
                    url: cacheResult.uri,
                    dialogTitle: 'Save or Share PDF...'
                });
            } else {
                doc.save(fileName);
            }
        } catch (error) {
            console.error("PDF Generation Error:", error);
            throw error;
        }
    }
};
