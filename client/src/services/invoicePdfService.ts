
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

const getHSNSummary = (invoice: Invoice) => {
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

export const InvoicePdfService = {
    generatePDF: async (invoice: Invoice, company: CompanyProfile, customer: Customer | null, qrCodeUrl?: string, showPreviousBalance: boolean = false) => {
        try {
            const doc = new jsPDF({
                orientation: 'portrait',
                unit: 'mm',
                format: 'a4'
            });

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

            // Save/Share Logic
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
