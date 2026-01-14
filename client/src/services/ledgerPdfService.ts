
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Invoice, Payment, Customer, CompanyProfile } from '../types';

export const LedgerPdfService = {
    generateLedgerPDF: async (
        customer: Customer,
        company: CompanyProfile,
        invoices: Invoice[],
        payments: Payment[],
        fromDate: string,
        toDate: string
    ) => {
        const doc = new jsPDF({
            orientation: 'landscape',
            unit: 'mm',
            format: 'a4'
        });

        const pageWidth = doc.internal.pageSize.getWidth();
        let yPos = 15;

        // --- Header ---
        doc.setFontSize(20);
        doc.setFont('helvetica', 'bold');
        doc.text(company.name, pageWidth / 2, yPos, { align: 'center' });
        yPos += 8;

        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        const companyAddress = company.address || '';
        const addressLines = doc.splitTextToSize(companyAddress, pageWidth - 40);
        doc.text(addressLines, pageWidth / 2, yPos, { align: 'center' });
        yPos += (addressLines.length * 5) + 2;

        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text(customer.name, pageWidth / 2, yPos, { align: 'center' });
        yPos += 8;

        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.text(`Period: ${new Date(fromDate).toLocaleDateString()} to ${new Date(toDate).toLocaleDateString()}`, pageWidth / 2, yPos, { align: 'center' });
        yPos += 10;

        // Filter transactions by date
        const filteredInvoices = invoices.filter(i => i.date >= fromDate && i.date <= toDate);
        const filteredPayments = payments.filter(p => p.date >= fromDate && p.date <= toDate);

        // --- Calculate Opening Balance ---
        const prevInvoices = invoices.filter(i => i.date < fromDate);
        const prevPayments = payments.filter(p => p.date < fromDate);
        const prevDebit = prevInvoices.reduce((sum, i) => sum + i.total, 0) +
            prevPayments.filter(p => p.type === 'PAID').reduce((sum, p) => sum + p.amount, 0);
        const prevCredit = prevPayments.filter(p => p.type === 'RECEIVED').reduce((sum, p) => sum + p.amount, 0);
        const openingBalance = prevDebit - prevCredit;

        // Prepare T-Shape Data
        // Left (Debit): Sales / Bills + Payments we PAID to them
        // Right (Credit): Payments we RECEIVED from them

        const debitTransactions = [
            ...filteredInvoices.map(i => ({
                date: i.date,
                particulars: `Inv #${i.invoiceNumber}`,
                amount: i.total
            })),
            ...filteredPayments.filter(p => p.type === 'PAID').map(p => ({
                date: p.date,
                particulars: 'Payment Out (Paid)',
                amount: p.amount
            }))
        ].sort((a, b) => a.date.localeCompare(b.date));

        const creditTransactions = [
            ...filteredPayments.filter(p => p.type === 'RECEIVED').map(p => ({
                date: p.date,
                particulars: 'Payment Received',
                amount: p.amount
            }))
        ].sort((a, b) => a.date.localeCompare(b.date));

        const debitData = debitTransactions.map(t => [
            new Date(t.date).toLocaleDateString(),
            t.particulars,
            t.amount.toFixed(2)
        ]);

        const creditData = creditTransactions.map(t => [
            new Date(t.date).toLocaleDateString(),
            t.particulars,
            t.amount.toFixed(2)
        ]);

        // Add Opening Balance to the correct side
        if (openingBalance > 0) {
            debitData.unshift([
                new Date(fromDate).toLocaleDateString(),
                'OPENING BALANCE (Dr)',
                openingBalance.toFixed(2)
            ]);
        } else if (openingBalance < 0) {
            creditData.unshift([
                new Date(fromDate).toLocaleDateString(),
                'OPENING BALANCE (Cr)',
                Math.abs(openingBalance).toFixed(2)
            ]);
        }

        // Calculate totals (including opening balance)
        const totalDebit = (openingBalance > 0 ? openingBalance : 0) + debitTransactions.reduce((sum, t) => sum + t.amount, 0);
        const totalCredit = (openingBalance < 0 ? Math.abs(openingBalance) : 0) + creditTransactions.reduce((sum, t) => sum + t.amount, 0);

        // Add opening balance if possible? 
        // For now, let's just show transactions and net balance.

        const maxLength = Math.max(debitData.length, creditData.length);
        const combinedData = [];

        for (let i = 0; i < maxLength; i++) {
            const row = [
                ...(debitData[i] || ['', '', '']),
                '', // Gap
                ...(creditData[i] || ['', '', ''])
            ];
            combinedData.push(row);
        }

        // Add Total Row
        combinedData.push([
            '', 'TOTAL DEBIT', totalDebit.toFixed(2),
            '',
            '', 'TOTAL CREDIT', totalCredit.toFixed(2)
        ]);

        // Add Net Balance Row
        const netBalance = totalDebit - totalCredit;
        combinedData.push([
            '', '', '',
            '',
            '', 'NET BALANCE', `${Math.abs(netBalance).toFixed(2)} ${netBalance >= 0 ? 'DR' : 'CR'}`
        ]);

        autoTable(doc, {
            startY: yPos,
            head: [['Date', 'Particulars (DEBIT)', 'Amount', '', 'Date', 'Particulars (CREDIT)', 'Amount']],
            body: combinedData,
            theme: 'grid',
            headStyles: { fillColor: [66, 133, 244], textColor: 255, halign: 'center' },
            columnStyles: {
                0: { cellWidth: 30 },
                1: { cellWidth: 60 },
                2: { cellWidth: 30, halign: 'right' },
                3: { cellWidth: 10, fillColor: [255, 255, 255] }, // Invisible gap
                4: { cellWidth: 30 },
                5: { cellWidth: 60 },
                6: { cellWidth: 30, halign: 'right' },
            },
            styles: { fontSize: 9, cellPadding: 2 },
            didDrawCell: (data) => {
                if (data.column.index === 3) {
                    // Remove border for the gap column
                    doc.setDrawColor(255, 255, 255);
                }
            }
        });

        // Add Summary Message
        const finalY = (doc as any).lastAutoTable.finalY || 150;
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        const formattedToDate = new Date(toDate).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: '2-digit' });
        const summaryMsg = `Dear ${customer.name} apka ${formattedToDate} tak Rs ${Math.abs(netBalance).toFixed(2)} baaki hai`;
        doc.text(summaryMsg, 15, finalY + 20);

        const fileName = `${customer.name}_Ledger_${fromDate}_to_${toDate}.pdf`;
        doc.save(fileName);
    }
};
