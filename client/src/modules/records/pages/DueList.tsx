import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { APP_NAME } from '../constants';
import { recordsDb as db } from '../../../lib/firebase';
import { collection, query, where, getDocs, doc, runTransaction } from "firebase/firestore";
import { format, parseISO, isPast, subMonths, addMonths } from 'date-fns';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { useCompany } from '../context/CompanyContext';
import { motion } from 'framer-motion';
import { showErrorAlert } from '../../../utils/errorCodes';

// WhatsApp Icon Component
const WhatsAppIcon = ({ className }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" className={`bi bi-whatsapp ${className}`} viewBox="0 0 16 16">
        <path d="M13.601 2.326A7.854 7.854 0 0 0 7.994 0C3.627 0 .068 3.558.064 7.926c0 1.399.366 2.76 1.057 3.965L0 16l4.204-1.102a7.933 7.933 0 0 0 3.79.965h.004c4.368 0 7.926-3.558 7.93-7.93A7.898 7.898 0 0 0 13.6 2.326zM7.994 14.521a6.573 6.573 0 0 1-3.356-.92l-.24-.144-2.494.654.666-2.433-.156-.251a6.56 6.56 0 0 1-1.007-3.505c0-3.626 2.957-6.584 6.591-6.584a6.56 6.56 0 0 1 4.66 1.931 6.557 6.557 0 0 1 1.928 4.66c-.004 3.639-2.961 6.592-6.592 6.592zm3.615-4.934c-.197-.099-1.17-.578-1.353-.646-.182-.065-.315-.099-.445.099-.133.197-.513.646-.627.775-.114.133-.232.148-.43.05-.197-.1-.836-.308-1.592-.985-.59-.525-.985-1.175-1.103-1.372-.114-.198-.011-.304.088-.403.087-.088.197-.232.296-.346.1-.114.133-.198.198-.33.065-.134.034-.248-.015-.347-.05-.099-.445-1.076-.612-1.47-.16-.389-.323-.335-.445-.34-.114-.007-.247-.007-.38-.007a.729.729 0 0 0-.529.247c-.182.198-.691.677-.691 1.654 0 .977.71 1.916.81 2.049.098.133 1.394 2.132 3.383 2.992.47.205.84.326 1.129.418.475.152.904.129 1.246.08.38-.058 1.171-.48 1.338-.943.164-.464.164-.86.114-.943-.049-.084-.182-.133-.38-.232z" />
    </svg>
);

interface PendingInstallment {
    recordId: string;
    customerId: string;
    customerName: string;
    installmentNumber: number;
    dueDate: string;
    amount: number;
    tenure: number;
    phoneNumber?: string;
    customerPhoto?: string;
    emiNumber?: number;
}

const DueList: React.FC = () => {
    const { currentCompany } = useCompany();
    const [allPendingInstallments, setAllPendingInstallments] = useState<PendingInstallment[]>([]);
    const [filteredInstallments, setFilteredInstallments] = useState<PendingInstallment[]>([]);
    const [viewDate, setViewDate] = useState(new Date());
    const [loading, setLoading] = useState(true);

    // Date-Wise View State
    const [selectedDateFilter, setSelectedDateFilter] = useState<string | null>(null);

    // Summary Stats
    const [totalDue, setTotalDue] = useState(0);

    // Modal State
    const [selectedInstallment, setSelectedInstallment] = useState<PendingInstallment | null>(null);
    const [paymentMethod, setPaymentMethod] = useState('cash');
    const [customAmount, setCustomAmount] = useState<number>(0);
    const [manualPaymentDate, setManualPaymentDate] = useState<string>('');
    const [paymentRemark, setPaymentRemark] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const [lastCollectedInstallment, setLastCollectedInstallment] = useState<PendingInstallment | null>(null);
    const [isNotificationModalOpen, setIsNotificationModalOpen] = useState(false);

    // Grouping Logic
    const groupedInstallments = useMemo(() => {
        const groups: Record<string, PendingInstallment[]> = {};
        filteredInstallments.forEach(inst => {
            const dateKey = format(parseISO(inst.dueDate), 'yyyy-MM-dd');
            if (!groups[dateKey]) groups[dateKey] = [];
            groups[dateKey].push(inst);
        });
        return groups;
    }, [filteredInstallments]);

    const sortedDates = useMemo(() => Object.keys(groupedInstallments).sort(), [groupedInstallments]);

    useEffect(() => {
        setSelectedDateFilter(null);
    }, [viewDate]);

    useEffect(() => {
        if (selectedInstallment) {
            setManualPaymentDate(format(parseISO(selectedInstallment.dueDate), 'yyyy-MM-dd'));
        }
    }, [selectedInstallment]);

    const companyDetails = useMemo(() => ({
        name: currentCompany?.name || APP_NAME,
        address: currentCompany?.address || "",
        phone: currentCompany?.phone || ""
    }), [currentCompany]);

    const formatCurrency = (value: number) => `Rs. ${new Intl.NumberFormat("en-IN").format(value)}`;

    const fetchPendingInstallments = useCallback(async () => {
        if (!currentCompany) {
            setLoading(false);
            return;
        }

        setLoading(true);
        try {
            // Valid statuses for records with pending installments
            // LEGACY: "Disbursed" kept in query for backward compat with old data
            const validStatuses = ["Active", "Overdue", "Given", "Pending"];

            /**
             * LEGACY DATA MIGRATION:
             * Query both current 'records' and legacy collection for backward compatibility.
             * All new records go to 'records' collection only.
             */
            const [recordsSnapshot, legacySnapshot, customersSnapshot] = await Promise.all([
                getDocs(query(collection(db, "records"), where("status", "in", [...validStatuses, "Disbursed"]), where("companyId", "==", currentCompany.id))),
                // LEGACY: Old collection for migration (read-only)
                getDocs(query(collection(db, "loans"), where("status", "in", [...validStatuses, "Disbursed"]), where("companyId", "==", currentCompany.id))),
                getDocs(query(collection(db, "customers"), where("companyId", "==", currentCompany.id)))
            ]);

            const customerMap = new Map<string, any>();
            customersSnapshot.docs.forEach(doc => {
                customerMap.set(doc.id, doc.data());
            });

            const pendingInstallmentsList: PendingInstallment[] = [];

            // Process BOTH New and Legacy Records
            const allDocs = [...recordsSnapshot.docs, ...legacySnapshot.docs];

            allDocs.forEach(recordDoc => {
                const record = recordDoc.data();
                const customerData = customerMap.get(record.customerId);

                if (record.repaymentSchedule) {
                    record.repaymentSchedule.forEach((inst: any) => {
                        if (inst.status === 'Pending') {
                            pendingInstallmentsList.push({
                                recordId: recordDoc.id,
                                customerId: record.customerId,
                                customerName: record.customerName,
                                installmentNumber: inst.installmentNumber || inst.emiNumber,
                                dueDate: inst.dueDate,
                                amount: inst.amount,
                                tenure: record.tenure,
                                phoneNumber: customerData?.phone || 'N/A',
                                customerPhoto: customerData?.photo_url
                            });
                        }
                    });
                }
            });

            pendingInstallmentsList.sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
            setAllPendingInstallments(pendingInstallmentsList);

        } catch (error) {
            showErrorAlert('DATA_LOAD_FAILED', error);
        } finally {
            setLoading(false);
        }
    }, [currentCompany]);

    useEffect(() => {
        fetchPendingInstallments();
    }, [fetchPendingInstallments]);

    useEffect(() => {
        const monthKey = format(viewDate, 'yyyy-MM');
        const filtered = allPendingInstallments.filter(inst => format(parseISO(inst.dueDate), 'yyyy-MM') === monthKey);
        setFilteredInstallments(filtered);
        setTotalDue(filtered.reduce((sum, item) => sum + item.amount, 0));
    }, [viewDate, allPendingInstallments]);

    // WhatsApp Message Preview State
    const [whatsappPreviewOpen, setWhatsappPreviewOpen] = useState(false);
    const [whatsappMessage, setWhatsappMessage] = useState('');
    const [whatsappPhone, setWhatsappPhone] = useState('');
    const [whatsappRecipient, setWhatsappRecipient] = useState('');

    const handleSendReminder = (inst: PendingInstallment) => {
        const customerPhone = inst.phoneNumber;
        if (!customerPhone || customerPhone === 'N/A' || customerPhone.length < 10) {
            alert("Customer phone number not found or invalid.");
            return;
        }

        const formattedPhone = `91${customerPhone.replace(/\D/g, '').slice(-10)}`;
        const dueDateFormatted = format(parseISO(inst.dueDate), 'dd MMMM, yyyy');
        const amountFormatted = `Rs. ${inst.amount.toLocaleString('en-IN')}`;

        let message;
        const isOverdue = isPast(parseISO(inst.dueDate));

        if (isOverdue) {
            message = `चेतावनी: ${inst.customerName},\n\n${companyDetails.name} से आपकी किश्त (संख्या ${inst.installmentNumber}) जिसका भुगतान ${dueDateFormatted} को होना था, अभी तक नहीं चुकाई गई है। राशि: ${amountFormatted}.\n\nकानूनी कार्रवाई और अतिरिक्त शुल्क से बचने के लिए तुरंत भुगतान करें।\n\n${companyDetails.name}`;
        } else {
            message = `नमस्ते ${inst.customerName},\n\n${companyDetails.name} की ओर से यह आपकी आने वाली किश्त के लिए एक विनम्र अनुस्मारक है।\n\nराशि: ${amountFormatted}\nदेय तिथि: ${dueDateFormatted}\nकिश्त संख्या: ${inst.installmentNumber}\n\nअतिरिक्त शुल्क से बचने के लिए कृपया समय पर भुगतान सुनिश्चित करें। धन्यवाद।`;
        }

        // Show preview modal instead of directly opening
        setWhatsappPhone(formattedPhone);
        setWhatsappMessage(message);
        setWhatsappRecipient(inst.customerName);
        setWhatsappPreviewOpen(true);
    };

    const handleConfirmWhatsApp = () => {
        const whatsappUrl = `whatsapp://send?phone=${whatsappPhone}&text=${encodeURIComponent(whatsappMessage)}`;
        window.open(whatsappUrl, '_system');
        setWhatsappPreviewOpen(false);
        setWhatsappMessage('');
        setWhatsappPhone('');
        setWhatsappRecipient('');
    };

    const generatePaymentReceiptPDF = (receiptData: any) => {
        const pdfDoc = new jsPDF();
        let y = 15;

        pdfDoc.setFontSize(18);
        pdfDoc.setFont("helvetica", "bold");
        pdfDoc.text(companyDetails.name, pdfDoc.internal.pageSize.getWidth() / 2, y, { align: 'center' });
        y += 8;
        pdfDoc.setFontSize(10);
        pdfDoc.setFont("helvetica", "normal");
        pdfDoc.text(companyDetails.address, pdfDoc.internal.pageSize.getWidth() / 2, y, { align: 'center' });
        y += 5;
        pdfDoc.text(`Phone: ${companyDetails.phone}`, pdfDoc.internal.pageSize.getWidth() / 2, y, { align: 'center' });
        y += 10;

        pdfDoc.setFontSize(14);
        pdfDoc.setFont("helvetica", "bold");
        pdfDoc.text(receiptData.isExtraPayment ? "EXTRA PAYMENT RECEIPT" : "PAYMENT RECEIPT", pdfDoc.internal.pageSize.getWidth() / 2, y, { align: 'center' });
        y += 10;

        pdfDoc.line(14, y, 196, y);
        y += 8;

        pdfDoc.setFontSize(11);
        pdfDoc.setFont("helvetica", "normal");
        pdfDoc.text(`Receipt No: ${receiptData.receiptId}`, 14, y);
        pdfDoc.text(`Date: ${format(parseISO(receiptData.paymentDate), 'dd MMMM yyyy')}`, 140, y);
        y += 10;

        pdfDoc.setFont("helvetica", "bold");
        pdfDoc.text("CUSTOMER DETAILS", 14, y);
        y += 7;
        pdfDoc.setFont("helvetica", "normal");
        pdfDoc.text(`Name: ${receiptData.customerName}`, 14, y);
        y += 6;
        pdfDoc.text(`Customer ID: ${receiptData.customerId}`, 14, y);
        if (receiptData.phoneNumber) {
            y += 6;
            pdfDoc.text(`Phone: ${receiptData.phoneNumber}`, 14, y);
        }
        y += 10;

        pdfDoc.setFont("helvetica", "bold");
        pdfDoc.text("RECORD DETAILS", 14, y);
        y += 7;
        pdfDoc.setFont("helvetica", "normal");
        pdfDoc.text(`Record ID: ${receiptData.recordId}`, 14, y);
        y += 6;
        pdfDoc.text(`Installment Number: ${receiptData.installmentNumber} of ${receiptData.tenure}`, 14, y);
        y += 6;
        pdfDoc.text(`Regular Installment: ${formatCurrency(receiptData.installmentAmount)}`, 14, y);
        y += 10;

        pdfDoc.setFont("helvetica", "bold");
        pdfDoc.text("PAYMENT DETAILS", 14, y);
        y += 7;

        pdfDoc.setFont("helvetica", "normal");
        pdfDoc.text(`Payment Method: ${receiptData.paymentMethod.toUpperCase()}`, 14, y);
        y += 6;

        if (receiptData.isExtraPayment) {
            const extraAmount = receiptData.amountPaid - receiptData.installmentAmount;
            pdfDoc.text(`Regular Inst: ${formatCurrency(receiptData.installmentAmount)}`, 14, y);
            y += 6;
            pdfDoc.text(`Extra Payment: ${formatCurrency(extraAmount)}`, 14, y);
            y += 8;
        }

        pdfDoc.setFont("helvetica", "bold");
        pdfDoc.setFillColor(240, 240, 240);
        pdfDoc.rect(14, y - 5, 182, 12, 'F');
        pdfDoc.text(`TOTAL AMOUNT PAID: ${formatCurrency(receiptData.amountPaid)}`, 14, y + 2);
        y += 15;

        if (receiptData.remark) {
            pdfDoc.setFont("helvetica", "normal");
            pdfDoc.text(`Remark: ${receiptData.remark}`, 14, y);
            y += 10;
        }

        pdfDoc.line(14, y, 196, y);
        y += 10;

        pdfDoc.setFont("helvetica", "italic");
        pdfDoc.setFontSize(10);
        pdfDoc.text("Thank you for your payment. This is a computer generated receipt.", 14, y);
        y += 15;

        pdfDoc.setFont("helvetica", "normal");
        pdfDoc.text("Authorized Signature: ____________________", 14, y);

        return pdfDoc;
    };

    const handlePreviewPdf = () => {
        if (!selectedInstallment) return;

        const amountToPay = customAmount > 0 ? customAmount : selectedInstallment.amount;
        const isExtra = amountToPay > selectedInstallment.amount;

        const receiptData = {
            receiptId: `RCPT-PREVIEW`,
            customerName: selectedInstallment.customerName,
            customerId: selectedInstallment.customerId,
            recordId: selectedInstallment.recordId,
            installmentNumber: selectedInstallment.installmentNumber,
            tenure: selectedInstallment.tenure,
            installmentAmount: selectedInstallment.amount,
            amountPaid: amountToPay,
            paymentDate: format(new Date(), 'yyyy-MM-dd'),
            paymentMethod: paymentMethod,
            remark: paymentRemark,
            isExtraPayment: isExtra,
            phoneNumber: selectedInstallment.phoneNumber
        };

        const pdfDoc = generatePaymentReceiptPDF(receiptData);
        pdfDoc.save(`Receipt_Preview_${selectedInstallment.recordId}_Inst_${selectedInstallment.installmentNumber}.pdf`);
    };

    const handleCollectInstallment = async () => {
        if (!selectedInstallment || isSubmitting) return;

        const amountToPay = customAmount > 0 ? customAmount : selectedInstallment.amount;

        if (amountToPay < selectedInstallment.amount) {
            alert(`Amount cannot be less than installment amount (${formatCurrency(selectedInstallment.amount)})`);
            return;
        }

        const isExtraPayment = amountToPay > selectedInstallment.amount;

        setIsSubmitting(true);
        try {
            let receiptDocId = '';

            await runTransaction(db, async (transaction) => {
                const recordRef = doc(db, "records", selectedInstallment.recordId);
                const receiptCounterRef = doc(db, 'counters', 'receiptId_counter');

                const recordDoc = await transaction.get(recordRef);
                const counterDoc = await transaction.get(receiptCounterRef);

                if (!recordDoc.exists()) throw new Error("Record not found!");

                const recordData = recordDoc.data();
                const paymentDate = manualPaymentDate;

                const remarkText = isExtraPayment
                    ? `Extra Payment: ${formatCurrency(amountToPay - selectedInstallment.amount)}${paymentRemark ? ' - ' + paymentRemark : ''}`
                    : paymentRemark;

                const updatedSchedule = recordData.repaymentSchedule.map((inst: any) => {
                    if ((inst.installmentNumber || inst.emiNumber) === selectedInstallment.installmentNumber) {
                        return {
                            ...inst,
                            status: 'Paid',
                            paymentDate: paymentDate,
                            paymentMethod: paymentMethod,
                            amountPaid: amountToPay,
                            remark: remarkText,
                        };
                    }
                    return inst;
                });

                let nextReceiptId = 1;
                if (counterDoc.exists()) {
                    nextReceiptId = (counterDoc.data().lastId || 0) + 1;
                }

                receiptDocId = `RCPT-${nextReceiptId}`;
                const receiptRef = doc(db, "receipts", receiptDocId);

                transaction.update(recordRef, { repaymentSchedule: updatedSchedule });
                transaction.set(receiptRef, {
                    receiptId: receiptDocId,
                    recordId: selectedInstallment.recordId,
                    customerId: selectedInstallment.customerId,
                    customerName: selectedInstallment.customerName,
                    amount: amountToPay,
                    installmentAmount: selectedInstallment.amount,
                    isExtraPayment: isExtraPayment,
                    extraAmount: isExtraPayment ? amountToPay - selectedInstallment.amount : 0,
                    paymentDate: paymentDate,
                    paymentMethod: paymentMethod,
                    installmentNumber: selectedInstallment.installmentNumber,
                    remark: remarkText,
                    createdAt: new Date().toISOString(),
                });
                transaction.set(receiptCounterRef, { lastId: nextReceiptId }, { merge: true });
            });

            const finalRemark = isExtraPayment
                ? `Extra Payment: ${formatCurrency(amountToPay - selectedInstallment.amount)}${paymentRemark ? ' - ' + paymentRemark : ''}`
                : paymentRemark;

            const receiptData = {
                receiptId: receiptDocId,
                customerName: selectedInstallment.customerName,
                customerId: selectedInstallment.customerId,
                recordId: selectedInstallment.recordId,
                installmentNumber: selectedInstallment.installmentNumber,
                tenure: selectedInstallment.tenure,
                installmentAmount: selectedInstallment.amount,
                amountPaid: amountToPay,
                paymentDate: manualPaymentDate,
                paymentMethod: paymentMethod,
                remark: finalRemark,
                isExtraPayment: isExtraPayment,
                phoneNumber: selectedInstallment.phoneNumber
            };

            const pdfDoc = generatePaymentReceiptPDF(receiptData);
            pdfDoc.save(`Receipt_${receiptDocId}.pdf`);

            setLastCollectedInstallment({ ...selectedInstallment, amount: amountToPay });
            setAllPendingInstallments(prev => prev.filter(e => !((e.installmentNumber || e.emiNumber) === selectedInstallment.installmentNumber && e.recordId === selectedInstallment.recordId)));
            setSelectedInstallment(null);
            setCustomAmount(0);
            setPaymentRemark('');
            setIsNotificationModalOpen(true);
            alert("Collection Successful! Receipt downloaded.");

        } catch (error: any) {
            showErrorAlert('DATA_SAVE_FAILED', error);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDownloadReport = async () => {
        try {
            const doc = new jsPDF();
            const monthName = format(viewDate, 'MMMM yyyy');
            const totalDueValue = filteredInstallments.reduce((sum, inst) => sum + inst.amount, 0);

            doc.setFontSize(18);
            doc.setFont("helvetica", "bold");
            doc.text(`${companyDetails.name}`, doc.internal.pageSize.getWidth() / 2, 15, { align: 'center' });
            doc.setFontSize(14);
            doc.text(`Monthly Installment Outstanding Report - ${monthName}`, doc.internal.pageSize.getWidth() / 2, 25, { align: 'center' });

            doc.setFontSize(10);
            doc.setFont("helvetica", "normal");
            doc.text(`Generated: ${format(new Date(), 'dd-MMM-yyyy HH:mm')}`, 14, 35);
            doc.text(`Total Outstanding: ${formatCurrency(totalDueValue)}`, 14, 40);

            const tableColumns = ["Customer", "Record ID", "Amount", "Outstanding Date", "Phone"];
            const tableRows = filteredInstallments.map(inst => [
                inst.customerName,
                inst.recordId,
                formatCurrency(inst.amount),
                format(parseISO(inst.dueDate), 'dd-MMM-yyyy'),
                inst.phoneNumber || 'N/A'
            ]);

            autoTable(doc, {
                head: [tableColumns],
                body: tableRows,
                startY: 45,
                theme: 'grid',
                headStyles: { fillColor: [41, 128, 185] },
            });

            const filename = `Outstanding_List_${format(viewDate, 'yyyy_MM')}.pdf`;
            doc.save(filename);
        } catch (error) {
            showErrorAlert('PDF_GENERATION_FAILED', error);
        }
    };

    const handleSendConfirmation = async () => {
        if (!lastCollectedInstallment?.phoneNumber) {
            alert("No phone number available for confirmation.");
            setIsNotificationModalOpen(false);
            return;
        }

        const formattedPhone = `91${lastCollectedInstallment.phoneNumber.replace(/\D/g, '').slice(-10)}`;
        const message = `Payment Received!\n\nDear ${lastCollectedInstallment.customerName},\nWe have received your payment of ${formatCurrency(lastCollectedInstallment.amount)} for installment #${lastCollectedInstallment.installmentNumber}.\n\nThank you,\n${companyDetails.name}`;

        const confirmSend = window.confirm(`Open WhatsApp to send receipt to ${lastCollectedInstallment.customerName}?`);
        if (confirmSend) {
            window.open(`whatsapp://send?phone=${formattedPhone}&text=${encodeURIComponent(message)}`, '_system');
        }

        setIsNotificationModalOpen(false);
        setLastCollectedInstallment(null);
    };

    const handleBack = () => {
        window.history.back();
    };

    return (
        <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
            className="min-h-screen bg-background-light dark:bg-background-dark pb-safe text-slate-900 dark:text-white"
        >
            {/* Header */}
            <div className="sticky top-0 z-10 bg-background-light/95 dark:bg-background-dark/95 backdrop-blur-sm px-4 pb-4 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center" style={{ paddingTop: 'calc(env(safe-area-inset-top) + 16px)' }}>
                <div className="flex items-center gap-3">
                    <button onClick={handleBack} className="flex h-10 w-10 items-center justify-center rounded-full hover:bg-black/5 dark:hover:bg-white/10 active:scale-95 transition-all">
                        <span className="material-symbols-outlined">arrow_back</span>
                    </button>
                    <h1 className="text-xl font-bold tracking-tight">Outstanding List</h1>
                </div>
                <div className="flex gap-2">
                    <button onClick={handleDownloadReport} className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 shadow-sm border border-slate-200 dark:border-slate-700 active:scale-95 transition-all">
                        <span className="material-symbols-outlined font-variation-FILL">download</span>
                    </button>
                </div>
            </div>

            <div className="max-w-4xl mx-auto p-4 space-y-6">

                {/* Month Selector & Summary */}
                <div className="bg-white dark:bg-[#1e2736] rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 p-4">
                    <div className="flex justify-between items-center mb-4">
                        <button onClick={() => setViewDate(subMonths(viewDate, 1))} className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800"><span className="material-symbols-outlined">chevron_left</span></button>
                        <h2 className="font-bold text-lg">{format(viewDate, 'MMMM yyyy')}</h2>
                        <button onClick={() => setViewDate(addMonths(viewDate, 1))} className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800"><span className="material-symbols-outlined">chevron_right</span></button>
                    </div>

                    <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800 rounded-xl">
                        <div className="text-center w-full">
                            <span className="block text-xs font-bold text-slate-500 uppercase">Total Outstanding</span>
                            <span className="block text-xl font-extrabold text-primary">{formatCurrency(totalDue)}</span>
                        </div>
                        <div className="h-8 w-px bg-slate-200 dark:bg-slate-700"></div>
                        <div className="text-center w-full">
                            <span className="block text-xs font-bold text-slate-500 uppercase">Pending Count</span>
                            <span className="block text-xl font-extrabold text-slate-700 dark:text-white">{filteredInstallments.length}</span>
                        </div>
                    </div>
                </div>

                <div className="space-y-3">
                    {loading ? (
                        <div className="flex justify-center py-10"><div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent"></div></div>
                    ) : sortedDates.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-12 text-slate-400">
                            <span className="material-symbols-outlined text-4xl mb-2">check_circle</span>
                            <p>No pending installments for this month.</p>
                        </div>
                    ) : !selectedDateFilter ? (
                        <div className="grid grid-cols-1 gap-3">
                            {sortedDates.map(date => {
                                const installments = groupedInstallments[date];
                                const count = installments.length;
                                const totalAmount = installments.reduce((sum, e) => sum + e.amount, 0);
                                const isDateOverdue = isPast(parseISO(date)) && date !== format(new Date(), 'yyyy-MM-dd');

                                return (
                                    <div key={date} onClick={() => setSelectedDateFilter(date)} className="bg-white dark:bg-[#1e2736] rounded-xl p-4 shadow-sm border border-slate-100 dark:border-slate-800 flex justify-between items-center cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800 transition-all">
                                        <div className="flex items-center gap-4">
                                            <div className={`h-12 w-12 rounded-2xl flex items-center justify-center font-bold text-lg ${isDateOverdue ? 'bg-red-100 text-red-600' : 'bg-primary/10 text-primary'}`}>
                                                {format(parseISO(date), 'dd')}
                                            </div>
                                            <div>
                                                <h3 className="font-bold text-slate-900 dark:text-white">{format(parseISO(date), 'MMMM yyyy')}</h3>
                                                <p className={`text-xs font-bold ${isDateOverdue ? 'text-red-500' : 'text-slate-500'}`}>
                                                    {isDateOverdue ? 'Overdue' : 'Outstanding Date'}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <span className="block text-lg font-black text-slate-900 dark:text-white">{count} Entries</span>
                                            <span className="text-xs font-bold text-slate-500">{formatCurrency(totalAmount)}</span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        <div className="animate-in slide-in-from-right duration-300">
                            <div className="flex items-center gap-3 mb-4">
                                <button onClick={() => setSelectedDateFilter(null)} className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800">
                                    <span className="material-symbols-outlined">arrow_back</span>
                                </button>
                                <h2 className="font-bold text-lg">Outstanding on {format(parseISO(selectedDateFilter), 'dd MMMM yyyy')}</h2>
                            </div>

                            <div className="space-y-3">
                                {groupedInstallments[selectedDateFilter]?.map(inst => (
                                    <div key={`${inst.recordId}-${inst.installmentNumber}`} className="bg-white dark:bg-[#1e2736] rounded-xl p-4 shadow-sm border border-slate-100 dark:border-slate-800 flex justify-between items-center group hover:shadow-md transition-all">
                                        <div className="flex items-center gap-4">
                                            <div className="relative h-12 w-12 rounded-2xl shadow-sm overflow-hidden bg-slate-100 dark:bg-slate-800 flex-shrink-0 border border-slate-200 dark:border-slate-700">
                                                {inst.customerPhoto ? (
                                                    <img src={inst.customerPhoto} alt={inst.customerName} className="h-full w-full object-cover" />
                                                ) : (
                                                    <div className="h-full w-full flex items-center justify-center bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500">
                                                        <span className="material-symbols-outlined text-[24px]">person</span>
                                                    </div>
                                                )}
                                            </div>
                                            <div className="flex flex-col gap-1">
                                                <h3 className="font-bold text-base text-slate-900 dark:text-white capitalize">{inst.customerName.toLowerCase()}</h3>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-xs font-mono bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded text-slate-500">Inst {inst.installmentNumber}/{inst.tenure}</span>
                                                    {isPast(parseISO(inst.dueDate)) ? (
                                                        <span className="text-[10px] font-bold text-red-500 bg-red-50 dark:bg-red-900/20 px-1.5 py-0.5 rounded">Overdue</span>
                                                    ) : (
                                                        <span className="text-[10px] font-bold text-slate-500">{format(parseISO(inst.dueDate), 'dd MMM')}</span>
                                                    )}
                                                </div>
                                                <p className="text-sm font-extrabold text-slate-700 dark:text-slate-300 mt-1">{formatCurrency(inst.amount)}</p>
                                            </div>
                                        </div>
                                        <div className="flex flex-col gap-2">
                                            <button
                                                onClick={() => setSelectedInstallment(inst)}
                                                className="px-4 py-2 bg-primary text-white text-xs font-bold rounded-lg shadow-lg shadow-primary/30 active:scale-95 transition-all hover:brightness-110"
                                            >
                                                Collect
                                            </button>
                                            <button
                                                onClick={() => handleSendReminder(inst)}
                                                className="p-2 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-lg flex items-center justify-center hover:bg-green-100 hover:text-green-600 transition-colors"
                                            >
                                                <span className="material-symbols-outlined text-[18px]">chat</span>
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Collection Modal */}
            {selectedInstallment && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
                    <div className="bg-white dark:bg-[#1e2736] rounded-2xl w-full max-sm shadow-2xl p-6 max-h-[90vh] overflow-y-auto">
                        <h3 className="text-lg font-bold mb-1">Collect Payment</h3>
                        <p className="text-sm text-slate-500 mb-4">
                            Installment #{selectedInstallment.installmentNumber} from {selectedInstallment.customerName}
                        </p>

                        <div className="space-y-4 mb-6">
                            <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg flex justify-between items-center">
                                <span className="text-sm font-bold text-blue-800 dark:text-blue-300">Installment Amount</span>
                                <span className="text-lg font-extrabold text-blue-600 dark:text-blue-400">{formatCurrency(selectedInstallment.amount)}</span>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-500 mb-2">Amount Received</label>
                                <input
                                    type="number"
                                    value={customAmount || selectedInstallment.amount}
                                    onChange={(e) => setCustomAmount(Number(e.target.value))}
                                    placeholder={`Min: ${selectedInstallment.amount}`}
                                    className="w-full px-3 py-2 bg-white dark:bg-[#1a2230] border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-primary outline-none text-lg font-bold"
                                />
                                {customAmount > selectedInstallment.amount && (
                                    <p className="text-xs text-green-600 mt-1">Extra Payment: {formatCurrency(customAmount - selectedInstallment.amount)}</p>
                                )}
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-500 mb-2">Payment Date</label>
                                <input
                                    type="date"
                                    value={manualPaymentDate}
                                    onChange={(e) => setManualPaymentDate(e.target.value)}
                                    className="w-full px-3 py-2 bg-white dark:bg-[#1a2230] border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-primary outline-none text-base font-bold"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-500 mb-2">Payment Method</label>
                                <div className="grid grid-cols-3 gap-2">
                                    {['cash', 'upi', 'bank'].map((method) => (
                                        <button
                                            key={method}
                                            onClick={() => setPaymentMethod(method)}
                                            className={`py-2 rounded-lg text-sm font-bold capitalize border ${paymentMethod === method
                                                ? 'bg-primary text-white border-primary'
                                                : 'bg-white dark:bg-[#1a2230] text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                                                }`}
                                        >
                                            {method}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-500 mb-2">Remark (Optional)</label>
                                <input
                                    type="text"
                                    value={paymentRemark}
                                    onChange={(e) => setPaymentRemark(e.target.value)}
                                    placeholder="Any notes..."
                                    className="w-full px-3 py-2 bg-white dark:bg-[#1a2230] border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-primary outline-none"
                                />
                            </div>
                        </div>

                        <div className="flex flex-col gap-3">
                            <button
                                onClick={handlePreviewPdf}
                                className="w-full px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg text-sm font-bold hover:bg-slate-200 dark:hover:bg-slate-700 flex items-center justify-center gap-2"
                            >
                                <span className="material-symbols-outlined text-[18px]">picture_as_pdf</span>
                                Preview PDF
                            </button>
                            <div className="flex gap-3 justify-end">
                                <button
                                    onClick={() => { setSelectedInstallment(null); setCustomAmount(0); setPaymentRemark(''); }}
                                    className="px-4 py-2 text-sm font-bold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleCollectInstallment}
                                    disabled={isSubmitting}
                                    className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-bold hover:bg-green-700 disabled:opacity-50 flex items-center gap-2"
                                >
                                    {isSubmitting && <div className="h-3 w-3 animate-spin rounded-full border-2 border-white border-t-transparent"></div>}
                                    Save & Download PDF
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Notification Modal */}
            {isNotificationModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
                    <div className="bg-white dark:bg-[#1e2736] rounded-2xl w-full max-w-sm shadow-2xl p-6 text-center">
                        <div className="mx-auto h-12 w-12 rounded-full bg-green-100 text-green-600 flex items-center justify-center mb-4">
                            <span className="material-symbols-outlined text-3xl">check</span>
                        </div>
                        <h3 className="text-lg font-bold mb-2">Payment Collected!</h3>
                        <p className="text-sm text-slate-500 mb-6">
                            Would you like to send a confirmation WhatsApp message to {lastCollectedInstallment?.customerName}?
                        </p>
                        <div className="flex flex-col gap-3">
                            <button
                                onClick={handleSendConfirmation}
                                className="w-full py-3 rounded-xl bg-green-600 text-white font-bold flex items-center justify-center gap-2"
                            >
                                <WhatsAppIcon className="w-5 h-5" /> Send WhatsApp
                            </button>
                            <button
                                onClick={() => setIsNotificationModalOpen(false)}
                                className="w-full py-3 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold"
                            >
                                Skip
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* WhatsApp Message Preview Modal */}
            {whatsappPreviewOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
                    <div className="bg-white dark:bg-[#1e2736] rounded-2xl w-full max-w-sm shadow-2xl p-6">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="h-10 w-10 rounded-full bg-green-100 text-green-600 flex items-center justify-center">
                                <WhatsAppIcon className="w-5 h-5" />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold">Review Message</h3>
                                <p className="text-xs text-slate-500">To: {whatsappRecipient}</p>
                            </div>
                        </div>
                        <div className="mb-4">
                            <label className="block text-xs font-bold text-slate-500 mb-2">Message (You can edit)</label>
                            <textarea
                                value={whatsappMessage}
                                onChange={(e) => setWhatsappMessage(e.target.value)}
                                rows={8}
                                className="w-full px-3 py-2 bg-slate-50 dark:bg-[#1a2230] border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-green-500 outline-none text-sm resize-none"
                            />
                        </div>
                        <p className="text-[10px] text-slate-400 mb-4">
                            ⚠️ This will open WhatsApp. Message will NOT be auto-sent - you must tap send in WhatsApp.
                        </p>
                        <div className="flex gap-3">
                            <button
                                onClick={() => { setWhatsappPreviewOpen(false); setWhatsappMessage(''); }}
                                className="flex-1 py-3 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold text-sm"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleConfirmWhatsApp}
                                className="flex-1 py-3 rounded-xl bg-green-600 text-white font-bold flex items-center justify-center gap-2 text-sm"
                            >
                                <WhatsAppIcon className="w-4 h-4" /> Open WhatsApp
                            </button>
                        </div>
                    </div>
                </div>
            )}

        </motion.div>
    );
};

export default DueList;