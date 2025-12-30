import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { APP_NAME } from '../constants';
import { Link, useNavigate } from 'react-router-dom';
import { db } from '../firebaseConfig';
import { collection, getDocs, query, doc, deleteDoc, where, getDoc } from 'firebase/firestore';
import { format, parseISO } from 'date-fns';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

import { useCompany } from '../context/CompanyContext';
import { DownloadService } from '../services/DownloadService';
import { motion } from 'framer-motion';

// --- Types ---
interface RecordItem {
    id: string;
    customerId: string;
    customerName: string;
    amount: number;
    status: string;
    date: string;
    installmentAmount: number; // Keeping for read compatibility
    tenure: number;
    serviceCharge: number;
    activationDate?: string;
    approvalDate?: string;
    rate: number;
    repaymentSchedule?: any[];
    topUpHistory?: { date: string; amount: number; topUpAmount?: number; previousAmount: number; tenure?: number; }[];
}

// --- Helpers ---
const formatCurrency = (value: number) => `Rs.${new Intl.NumberFormat("en-IN").format(value)} `;
const safeFormatDate = (dateString: string | undefined | null, formatStr: string = 'dd-MMM-yyyy') => {
    if (!dateString) return '---';
    try {
        const date = parseISO(dateString);
        return format(date, formatStr);
    } catch (e) {
        return '---';
    }
}

const toWords = (num: number): string => {
    if (num === 0) return 'Zero';
    const a = ['', 'one ', 'two ', 'three ', 'four ', 'five ', 'six ', 'seven ', 'eight ', 'nine ', 'ten ', 'eleven ', 'twelve ', 'thirteen ', 'fourteen ', 'fifteen ', 'sixteen ', 'seventeen ', 'eighteen ', 'nineteen '];
    const b = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];
    const inWords = (n: number): string => {
        let str = '';
        if (n > 99) {
            str += a[Math.floor(n / 100)] + 'hundred ';
            n %= 100;
        }
        if (n > 19) {
            str += b[Math.floor(n / 10)] + (a[n % 10] ? '' + a[n % 10] : '');
        } else {
            str += a[n];
        }
        return str;
    };
    let words = '';
    if (num >= 10000000) {
        words += inWords(Math.floor(num / 10000000)) + 'crore ';
        num %= 10000000;
    }
    if (num >= 100000) {
        words += inWords(Math.floor(num / 100000)) + 'lakh ';
        num %= 100000;
    }
    if (num >= 1000) {
        words += inWords(Math.floor(num / 1000)) + 'thousand ';
        num %= 1000;
    }
    if (num > 0) {
        words += inWords(num);
    }
    return words.replace(/\s+/g, ' ').trim().split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
};

async function toBase64(url: string, maxWidth: number = 200, quality: number = 0.6): Promise<string> {
    try {
        const response = await fetch(url);
        const blob = await response.blob();

        return new Promise<string>((resolve, reject) => {
            const img = new Image();
            img.crossOrigin = 'anonymous';

            img.onload = () => {
                const canvas = document.createElement('canvas');
                let width = img.width;
                let height = img.height;

                if (width > maxWidth) {
                    height = (height * maxWidth) / width;
                    width = maxWidth;
                }

                canvas.width = width;
                canvas.height = height;

                const ctx = canvas.getContext('2d');
                if (ctx) {
                    ctx.drawImage(img, 0, 0, width, height);
                    const compressedBase64 = canvas.toDataURL('image/jpeg', quality);
                    resolve(compressedBase64);
                } else {
                    reject(new Error('Canvas context not available'));
                }
            };

            img.onerror = () => reject(new Error('Image load failed'));
            img.src = URL.createObjectURL(blob);
        });
    } catch (e) {
        console.error("Image conversion failed", e);
        throw e;
    }
}

const AllRecords: React.FC = () => {
    const navigate = useNavigate();
    const { currentCompany } = useCompany();
    const [searchTerm, setSearchTerm] = useState('');
    const [records, setRecords] = useState<RecordItem[]>([]);
    const [loading, setLoading] = useState(true);

    // UI State
    const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [recordToDelete, setRecordToDelete] = useState<RecordItem | null>(null);

    // PDF Generation State
    const [pdfStatus, setPdfStatus] = useState<'idle' | 'generating' | 'ready' | 'error'>('idle');
    const [currentPdfBlob, setCurrentPdfBlob] = useState<Blob | null>(null);
    const [currentPdfName, setCurrentPdfName] = useState('');
    const [showPdfModal, setShowPdfModal] = useState(false);

    const companyDetails = useMemo(() => ({
        name: currentCompany?.name || APP_NAME,
        address: currentCompany?.address || "",
        phone: currentCompany?.phone || ""
    }), [currentCompany]);

    // Fetch Data
    const fetchRecords = useCallback(async () => {
        if (!currentCompany) return;

        setLoading(true);
        try {
            // MERGE 'records' AND 'legacy_entries'
            const [recordsSnap, loansSnap] = await Promise.all([
                getDocs(query(collection(db, "records"), where("companyId", "==", currentCompany.id))),
                getDocs(query(collection(db, "loans"), where("companyId", "==", currentCompany.id)))
            ]);

            const mergedDocs = [...recordsSnap.docs, ...loansSnap.docs];

            // De-duplicate
            const uniqueRecordsMap = new Map();
            mergedDocs.forEach(doc => {
                uniqueRecordsMap.set(doc.id, { id: doc.id, ...doc.data() });
            });
            const recordsData = Array.from(uniqueRecordsMap.values()) as RecordItem[];

            recordsData.sort((a: any, b: any) => {
                const dateA = a.date?.toDate?.() || new Date(a.date) || new Date(0);
                const dateB = b.date?.toDate?.() || new Date(b.date) || new Date(0);
                return dateB.getTime() - dateA.getTime();
            });
            setRecords(recordsData);
        } catch (error) {
            console.error("Error fetching records:", error);
        } finally {
            setLoading(false);
        }
    }, [currentCompany]);



    useEffect(() => {
        fetchRecords();
    }, [fetchRecords]);

    // Filtering
    const filteredRecords = useMemo(() => {
        if (!searchTerm) return records;
        const lowercasedFilter = searchTerm.toLowerCase();
        return records.filter(record =>
            (record.customerName && record.customerName.toLowerCase().includes(lowercasedFilter)) ||
            (record.id && record.id.toLowerCase().includes(lowercasedFilter))
        );
    }, [searchTerm, records]);

    // Handlers
    const confirmDelete = (record: RecordItem) => {
        setRecordToDelete(record);
        setShowDeleteConfirm(true);
        setActiveMenuId(null);
    };

    const handleDeleteRecord = async () => {
        if (!recordToDelete) return;

        setDeletingId(recordToDelete.id);
        try {
            // 1. Delete associated Ledger entries
            // NOTE: Using 'recordId' as per updated schema, but falling back check might be needed if migration wasn't done.
            // For now, assuming standard usage moving forward.
            const ledgerQuery = query(collection(db, "ledger"), where("recordId", "==", recordToDelete.id));
            const ledgerSnapshot = await getDocs(ledgerQuery);

            const deletePromises = ledgerSnapshot.docs.map(doc => deleteDoc(doc.ref));
            await Promise.all(deletePromises);

            // 2. Delete the Record document
            await deleteDoc(doc(db, "records", recordToDelete.id));

            fetchRecords();
            setShowDeleteConfirm(false);
            alert("Record and associated data deleted permanently.");
        } catch (error) {
            console.error("Failed to delete record:", error);
            alert("Failed to delete record. Please try again.");
        } finally {
            setDeletingId(null);
            setRecordToDelete(null);
        }
    };

    // --- PDF GENERATORS ---

    const generateRecordAgreement = async (record: RecordItem) => {
        setShowPdfModal(true);
        setPdfStatus('generating');
        setCurrentPdfName(`Service_Agreement_${record.id}.pdf`);

        try {
            const customerRef = doc(db, "customers", record.customerId);
            const customerSnap = await getDoc(customerRef);
            if (!customerSnap.exists()) throw new Error("Customer details not found.");

            const customer = customerSnap.data();
            let customerPhotoBase64 = null;
            if (customer.photo_url) {
                try { customerPhotoBase64 = await toBase64(customer.photo_url); } catch (e) { }
            }

            const pdfDoc = new jsPDF();

            // Header
            pdfDoc.setFont("helvetica", "bold");
            pdfDoc.setFontSize(18);
            pdfDoc.text(companyDetails.name, pdfDoc.internal.pageSize.getWidth() / 2, 20, { align: 'center' });
            pdfDoc.setFontSize(14);
            pdfDoc.text("SERVICE AGREEMENT", pdfDoc.internal.pageSize.getWidth() / 2, 28, { align: 'center' });

            const agreementDate = record.activationDate || record.date ? format(new Date(record.activationDate || record.date), 'do MMMM yyyy') : format(new Date(), 'do MMMM yyyy');
            pdfDoc.setFontSize(10);
            pdfDoc.setFont("helvetica", "normal");
            pdfDoc.text(`Date: ${agreementDate} `, pdfDoc.internal.pageSize.getWidth() - 15, 20, { align: 'right' });
            pdfDoc.text(`Record ID: ${record.id} `, pdfDoc.internal.pageSize.getWidth() - 15, 26, { align: 'right' });

            let startY = 40;
            const partiesBody = [[`This agreement is made between: \n\nTHE COMPANY: \n${companyDetails.name} \n${companyDetails.address || '[Company Address]'} \n\nAND\n\nTHE CUSTOMER: \n${customer.name} \n${customer.address || 'Address not provided'} \nMobile: ${customer.phone} `]];

            // Using autoTable for parties layout
            autoTable(pdfDoc, {
                startY: startY,
                head: [['PARTIES INVOLVED']],
                body: partiesBody,
                theme: 'plain',
                headStyles: { fontStyle: 'bold', textColor: '#000', halign: 'center', fillColor: undefined },
                styles: { fontSize: 9, cellPadding: 3, font: 'helvetica' },
                didDrawCell: (data: any) => {
                    if (data.section === 'body' && customerPhotoBase64) {
                        pdfDoc.addImage(customerPhotoBase64, 'JPEG', pdfDoc.internal.pageSize.getWidth() - 45, startY + 20, 30, 30);
                    }
                }
            });

            startY = (pdfDoc as any).lastAutoTable.finalY + 8;

            pdfDoc.setFontSize(12);
            pdfDoc.setFont("helvetica", "bold");
            const agreementTitle = record.topUpHistory && record.topUpHistory.length > 0 ? "RECORD SUMMARY (ADJUSTED)" : "RECORD SUMMARY";
            pdfDoc.text(agreementTitle, 14, startY);
            startY += 4;

            const totalRepayment = (record.installmentAmount || (record as any).emi) * record.tenure;
            const totalServiceCharge = totalRepayment - record.amount;

            const summaryBody = [
                [{ content: 'Record Amount', styles: { fontStyle: 'bold' } }, `${formatCurrency(record.amount)} (${toWords(record.amount)} Only)`],
                [{ content: 'Tenure', styles: { fontStyle: 'bold' } }, `${record.tenure} Months`],
                [{ content: 'Installment', styles: { fontStyle: 'bold' } }, formatCurrency(record.installmentAmount || (record as any).emi)],
                [{ content: 'Service Charge', styles: { fontStyle: 'bold' } }, formatCurrency(record.serviceCharge || (record as any).processingFee || 0)],
                [{ content: 'Total Service Charge', styles: { fontStyle: 'bold' } }, formatCurrency(totalServiceCharge)],
                [{ content: 'Total Amount Payable', styles: { fontStyle: 'bold' } }, formatCurrency(totalRepayment)],
                [{ content: 'Start Date', styles: { fontStyle: 'bold' } }, (record.activationDate || (record as any).disbursalDate) ? format(new Date(record.activationDate || (record as any).disbursalDate!), 'do MMMM yyyy') : 'N/A'],
            ];

            if (record.topUpHistory && record.topUpHistory.length > 0) {
                const lastTopUp = record.topUpHistory[record.topUpHistory.length - 1];
                summaryBody.push(
                    [{ content: 'Last Adjustment Amount', styles: { fontStyle: 'bold' as 'bold' } }, formatCurrency(lastTopUp.topUpAmount || lastTopUp.amount)],
                    [{ content: 'Last Adjustment Date', styles: { fontStyle: 'bold' as 'bold' } }, safeFormatDate(lastTopUp.date)]
                );
            }

            autoTable(pdfDoc, {
                startY: startY,
                body: summaryBody as any,
                theme: 'striped',
                styles: { fontSize: 9, cellPadding: 2, font: 'helvetica' },
            });

            startY = (pdfDoc as any).lastAutoTable.finalY + 8;

            if (customer.guarantor && customer.guarantor.name) {
                pdfDoc.setFontSize(12);
                pdfDoc.setFont("helvetica", "bold");
                pdfDoc.text("GUARANTOR DETAILS", 14, startY);
                startY += 4;
                autoTable(pdfDoc, {
                    startY: startY,
                    body: [
                        [{ content: 'Name', styles: { fontStyle: 'bold' } }, customer.guarantor.name],
                        [{ content: 'Relation', styles: { fontStyle: 'bold' } }, customer.guarantor.relation],
                        [{ content: 'Mobile', styles: { fontStyle: 'bold' } }, customer.guarantor.mobile],
                        [{ content: 'Address', styles: { fontStyle: 'bold' } }, customer.guarantor.address],
                    ],
                    theme: 'grid',
                    styles: { fontSize: 9, cellPadding: 2, font: 'helvetica' },
                });
                startY = (pdfDoc as any).lastAutoTable.finalY + 8;
            }

            pdfDoc.addPage();
            startY = 20;
            pdfDoc.setFontSize(12);
            pdfDoc.setFont("helvetica", "bold");
            pdfDoc.text("TERMS & CONDITIONS", 14, startY);
            startY += 8;

            pdfDoc.setFontSize(10);
            pdfDoc.setFont("helvetica", "normal");

            const clauses = [
                "The Customer agrees to settle the record amount along with service charges in the form of Installments as specified in the summary.",
                "All payments shall be made on or before the due date of each month.",
                "In case of a delay in payment of Installment, a service charge as per the company's prevailing policy will be charged.",
                "Default in payment of three or more consecutive Installments shall entitle the Company to close the record and demand full settlement.",
                "The Customer confirms that all information provided in the record entry is true and correct.",
                "This record is unsecured. No collateral has been provided by the Customer.",
                "Any disputes arising out of this agreement shall be subject to the jurisdiction of the courts.",
            ];

            clauses.forEach((clause, index) => {
                const splitText = pdfDoc.splitTextToSize(`${index + 1}. ${clause} `, 180);
                pdfDoc.text(splitText, 14, startY);
                startY += (splitText.length * 6) + 4;
            });

            // Add photo on page 2
            if (customerPhotoBase64) {
                const photoSize = 60;
                const pageWidth = pdfDoc.internal.pageSize.getWidth();
                const photoX = (pageWidth / 2) - (photoSize / 2);
                const photoY = startY + 10;
                if (photoY + photoSize < pdfDoc.internal.pageSize.getHeight() - 70) {
                    pdfDoc.addImage(customerPhotoBase64, 'JPEG', photoX, photoY, photoSize, photoSize);
                    pdfDoc.setFontSize(9);
                    pdfDoc.text(record.customerName, pageWidth / 2, photoY + photoSize + 7, { align: 'center' });
                }
            }

            startY = pdfDoc.internal.pageSize.getHeight() - 50;
            pdfDoc.text("The parties have acknowledged these record details.", 14, startY);
            startY += 20;
            pdfDoc.line(20, startY, 80, startY);
            pdfDoc.line(130, startY, 190, startY);
            startY += 5;
            pdfDoc.setFontSize(10);
            pdfDoc.setFont("helvetica", "bold");
            pdfDoc.text(`For ${companyDetails.name} `, 50, startY, { align: 'center' });
            pdfDoc.text("Customer's Acknowledgement", 160, startY, { align: 'center' });

            const pdfBlob = pdfDoc.output('blob');
            setCurrentPdfBlob(pdfBlob);
            setPdfStatus('ready');

        } catch (error: any) {
            console.error(error);
            setPdfStatus('error');
        }
    };

    const generateRecordCard = async (record: RecordItem) => {
        setShowPdfModal(true);
        setPdfStatus('generating');
        setCurrentPdfName(`Record_Card_${record.id}.pdf`);

        try {
            if (!record.amount || !(record.rate || (record as any).interestRate) || !record.tenure) {
                throw new Error("Incomplete record details.");
            }

            const customerRef = doc(db, "customers", record.customerId);
            const customerSnap = await getDoc(customerRef);
            if (!customerSnap.exists()) throw new Error("Customer details not found.");
            const customer = customerSnap.data();

            let customerPhotoBase64 = null;
            if (customer.photo_url) {
                try { customerPhotoBase64 = await toBase64(customer.photo_url); } catch (e) { }
            }

            const pdfDoc = new jsPDF();
            const pageWidth = pdfDoc.internal.pageSize.width;
            let y = 15;

            pdfDoc.setFontSize(18);
            pdfDoc.setFont("helvetica", "bold");
            pdfDoc.text(companyDetails.name, pageWidth / 2, y, { align: 'center' });
            y += 8;
            pdfDoc.setFontSize(12);
            pdfDoc.text('Ledger Summary Card', pageWidth / 2, y, { align: 'center' });

            // Show Top-Up Status
            if (record.topUpHistory && record.topUpHistory.length > 0) {
                pdfDoc.setFillColor(220, 38, 38); // Red
                pdfDoc.rect(pageWidth - 70, y - 5, 25, 6, 'F');
                pdfDoc.setTextColor(255, 255, 255);
                pdfDoc.setFontSize(8);
                pdfDoc.text("ADJUSTED", pageWidth - 57.5, y - 1, { align: 'center' });
                pdfDoc.setTextColor(0, 0, 0);
            }

            if (customerPhotoBase64) {
                pdfDoc.addImage(customerPhotoBase64, 'JPEG', pageWidth - 35, y - 8, 20, 20);
            }
            y += 17;

            pdfDoc.setFont("helvetica", "normal");
            pdfDoc.setFontSize(10);

            const details = [
                [{ label: "Customer Name", value: record.customerName }, { label: "Record ID", value: record.id }],
                [{ label: "Amount", value: formatCurrency(record.amount) }, { label: "Tenure", value: `${record.tenure} Months` }],
                [{ label: "Installment", value: formatCurrency(record.installmentAmount || (record as any).emi) }, { label: "Start Date", value: (record.activationDate || (record as any).disbursalDate) ? format(parseISO(record.activationDate || (record as any).disbursalDate!), 'dd-MMM-yyyy') : 'N/A' }],
            ];

            details.forEach(row => {
                pdfDoc.setFont("helvetica", "bold"); pdfDoc.text(`${row[0].label}: `, 15, y);
                pdfDoc.setFont("helvetica", "normal"); pdfDoc.text(String(row[0].value), 50, y);
                if (row[1]) {
                    pdfDoc.setFont("helvetica", "bold"); pdfDoc.text(`${row[1].label}: `, 110, y);
                    pdfDoc.setFont("helvetica", "normal"); pdfDoc.text(String(row[1].value), 145, y);
                }
                y += 7;
            });
            y += 3;

            // Schedule
            const head = [["No", "Due Date", "Amount", "Principal", "Interest", "Balance"]];
            const body: any[] = [];

            if (record.repaymentSchedule && record.repaymentSchedule.length > 0) {
                record.repaymentSchedule.forEach((emi: any, index: number) => {
                    body.push([
                        emi.emiNumber || (index + 1),
                        emi.dueDate ? format(new Date(emi.dueDate), 'dd-MMM-yy') : 'N/A',
                        formatCurrency(emi.amount),
                        '-',
                        '-',
                        '-'
                    ]);
                });
            } else {
                // Legacy Fallback
                let balance = record.amount;
                const monthlyInterestRate = (record.rate || (record as any).interestRate) / 12 / 100;

                for (let i = 1; i <= record.tenure; i++) {
                    const instAmount = record.installmentAmount || (record as any).emi;
                    const interestPayment = balance * monthlyInterestRate;
                    const principalPayment = instAmount - interestPayment;
                    balance -= principalPayment;
                    if (balance < 0) balance = 0;

                    let dateStr = '';
                    const startDate = record.activationDate || (record as any).disbursalDate;
                    if (startDate) {
                        const d = new Date(startDate);
                        d.setMonth(d.getMonth() + i);
                        dateStr = format(d, 'dd-MMM-yy');
                    }

                    body.push([
                        i,
                        dateStr,
                        formatCurrency(instAmount),
                        formatCurrency(principalPayment),
                        formatCurrency(interestPayment),
                        formatCurrency(balance)
                    ]);
                }
            }

            autoTable(pdfDoc, { head, body, startY: y, theme: 'grid', headStyles: { fillColor: [41, 128, 185] } });

            const pdfBlob = pdfDoc.output('blob');
            setCurrentPdfBlob(pdfBlob);
            setPdfStatus('ready');

        } catch (error: any) {
            console.error(error);
            setPdfStatus('error');
        }
    };

    const handleDownloadPdf = async () => {
        if (currentPdfBlob && currentPdfName) {
            const reader = new FileReader();
            reader.readAsDataURL(currentPdfBlob);
            reader.onloadend = async () => {
                const base64data = (reader.result as string).split(',')[1];
                await DownloadService.downloadPDF(currentPdfName, base64data);
                setShowPdfModal(false);
            };
        }
    };

    const isActionable = (status: string) => ['Approved', 'Active', 'Settled'].includes(status);

    const StatusBadge = ({ status }: { status: string }) => {
        let classes = "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ring-1 ring-inset ";
        if (status === 'Approved') classes += "bg-green-50 text-green-700 ring-green-600/20 dark:bg-green-900/30 dark:text-green-400";
        else if (status === 'Disbursed' || status === 'Active' || status === 'Settled' || status === 'Given') classes += "bg-blue-50 text-blue-700 ring-blue-600/20 dark:bg-blue-900/30 dark:text-blue-400";
        else if (status === 'Rejected') classes += "bg-red-50 text-red-700 ring-red-600/20 dark:bg-red-900/30 dark:text-red-400";
        else classes += "bg-gray-50 text-gray-600 ring-gray-500/10 dark:bg-gray-800 dark:text-gray-400";

        const label = (status === 'Approved') ? 'Approved' : (status === 'Active' ? 'Active' : status);

        return <span className={classes}>{label}</span>;
    };

    return (
        <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
            className="relative flex w-full flex-col overflow-x-hidden pb-32 pb-safe font-sans"
        >
            {/* Disclaimer */}
            <div className="bg-yellow-100 dark:bg-yellow-900/30 p-1 text-center text-[10px] font-bold text-yellow-800 dark:text-yellow-400 sticky top-0 z-30">
                RECORD KEEPING ONLY - NOT A LENDING APP
            </div>

            <div className="sticky top-6 z-20 px-4 pt-4 pb-2 bg-slate-50/95 dark:bg-slate-900/95 backdrop-blur-md">
                <div className="flex gap-3">
                    <div className="relative flex-grow group">
                        <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors">search</span>
                        <input
                            type="text"
                            placeholder="Search name or ID..."
                            className="w-full h-11 pl-10 pr-4 rounded-xl border-none bg-white/80 dark:bg-slate-900/80 shadow-sm ring-1 ring-slate-200 dark:ring-slate-800 focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <Link to="/records/new" className="h-11 px-5 rounded-xl bg-primary text-white shadow-md shadow-primary/30 font-bold uppercase tracking-wider flex items-center gap-2 hover:brightness-110 active:scale-95 transition-all">
                        <span className="material-symbols-outlined text-[20px] material-symbols-fill">add_circle</span>
                        <span className="hidden sm:inline">New Record</span>
                    </Link>
                </div>
            </div>

            {/* List */}
            <main className="flex flex-col gap-3 px-4 pt-4">
                {loading ? (
                    <div className="flex justify-center p-10">
                        <div className="h-8 w-8 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent"></div>
                    </div>
                ) : filteredRecords.length > 0 ? (
                    filteredRecords.map((record) => (
                        <div key={record.id}>
                            <div
                                onClick={() => navigate(`/records/view/${record.id}`)}
                                className="glass-card relative rounded-2xl p-5 hover:bg-white/90 dark:hover:bg-slate-800/90 hover:shadow-xl hover:shadow-indigo-500/10 cursor-pointer transition-all duration-300 group border border-white/40 dark:border-slate-700/40"
                            >
                                <div className="absolute left-0 top-6 bottom-6 w-1 bg-gradient-to-b from-indigo-500 to-blue-500 rounded-r-full opacity-0 group-hover:opacity-100 transition-opacity"></div>
                                <div className="flex justify-between items-start">
                                    <div className="flex items-center gap-4 pl-2 flex-1 min-w-0">
                                        <div className="space-y-1 min-w-0 flex-1">
                                            <h3 className="font-bold text-lg truncate text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors capitalize">{record.customerName.toLowerCase()}</h3>
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <span className="text-[11px] font-mono bg-slate-100 dark:bg-slate-800/80 px-2 py-0.5 rounded-md text-slate-500 border border-slate-200 dark:border-slate-700">#{record.id?.slice(0, 8)}</span>
                                                <StatusBadge status={record.status} />
                                            </div>
                                            <p className="text-sm font-semibold text-slate-500 dark:text-slate-400 mt-0.5">{formatCurrency(record.amount)}</p>
                                        </div>
                                    </div>
                                    <div className="text-right flex flex-col items-end gap-1 flex-shrink-0">
                                        <span className="text-xs font-medium text-slate-400 bg-white/50 dark:bg-slate-800/50 px-2 py-1 rounded-lg whitespace-nowrap">
                                            {record.date ? format(parseISO(record.date), 'dd MMM, yy') : 'N/A'}
                                        </span>
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setActiveMenuId(activeMenuId === record.id ? null : record.id);
                                            }}
                                            className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700/50 text-slate-400 hover:text-indigo-600 transition-colors flex-shrink-0"
                                        >
                                            <span className="material-symbols-outlined">more_vert</span>
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))
                ) : (
                    <div className="flex flex-col items-center justify-center py-20 text-slate-400">
                        <p className="font-medium">No records found</p>
                    </div>
                )}
            </main>

            {/* Bottom Sheet / Modal Action Menu */}
            {
                activeMenuId && (() => {
                    const selectedRecord = records.find(l => l.id === activeMenuId);
                    if (!selectedRecord) return null;

                    return (
                        <>
                            <div
                                className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm transition-opacity"
                                onClick={() => setActiveMenuId(null)}
                            ></div>
                            <div className="fixed inset-x-0 bottom-0 z-50 transform transition-transform duration-300 ease-out md:static md:inset-auto md:transform-none">
                                <div className="bg-white dark:bg-[#1e2736] rounded-t-[2rem] md:rounded-2xl md:fixed md:top-1/2 md:left-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:w-full md:max-w-md shadow-[0_-8px_30px_rgba(0,0,0,0.12)] md:shadow-2xl overflow-hidden pb-6 md:pb-0">
                                    <div className="p-6">
                                        <div className="flex items-center gap-4 mb-6 pb-4 border-b border-slate-100 dark:border-slate-800">
                                            <div className="h-12 w-12 rounded-2xl bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-600 shrink-0">
                                                <span className="material-symbols-outlined text-2xl">description</span>
                                            </div>
                                            <div className="min-w-0 flex-1">
                                                <h3 className="font-bold text-lg text-slate-900 dark:text-white truncate">{selectedRecord.customerName}</h3>
                                                <p className="text-sm text-slate-500 truncate">Record ID: #{selectedRecord.id.slice(0, 8)}</p>
                                            </div>
                                            <button
                                                onClick={() => setActiveMenuId(null)}
                                                className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400"
                                            >
                                                <span className="material-symbols-outlined">close</span>
                                            </button>
                                        </div>

                                        <div className="space-y-2">
                                            <Link
                                                to={`/records/view/${selectedRecord.id}`}
                                                className="w-full flex items-center gap-4 p-4 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                                            >
                                                <div className="flex-1 text-left min-w-0">
                                                    <p className="font-semibold text-slate-900 dark:text-white truncate">View Details</p>
                                                    <p className="text-xs text-slate-500 truncate">Repayment schedule & history</p>
                                                </div>
                                            </Link>

                                            <button
                                                disabled={!isActionable(selectedRecord.status)}
                                                onClick={() => { generateRecordCard(selectedRecord); setActiveMenuId(null); }}
                                                className="w-full flex items-center gap-4 p-4 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors disabled:opacity-50"
                                            >
                                                <div className="flex-1 text-left min-w-0">
                                                    <p className="font-semibold text-slate-900 dark:text-white truncate">Ledger Card</p>
                                                    <p className="text-xs text-slate-500 truncate">Download customer ID card</p>
                                                </div>
                                            </button>

                                            <button
                                                disabled={!isActionable(selectedRecord.status)}
                                                onClick={() => { generateRecordAgreement(selectedRecord); setActiveMenuId(null); }}
                                                className="w-full flex items-center gap-4 p-4 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors disabled:opacity-50"
                                            >
                                                <div className="flex-1 text-left min-w-0">
                                                    <p className="font-semibold text-slate-900 dark:text-white truncate">Agreement</p>
                                                    <p className="text-xs text-slate-500 truncate">Download ledger agreement</p>
                                                </div>
                                            </button>

                                            <button
                                                onClick={() => confirmDelete(selectedRecord)}
                                                className="w-full flex items-center gap-4 p-4 rounded-xl hover:bg-red-50 dark:hover:bg-red-900/10 transition-colors group"
                                            >
                                                <div className="flex-1 text-left min-w-0">
                                                    <p className="font-semibold text-red-600 dark:text-red-400 truncate">Delete Record</p>
                                                    <p className="text-xs text-red-400/70 truncate">Permanently remove record</p>
                                                </div>
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </>
                    );
                })()
            }

            {/* Delete Confirmation Modal */}
            {
                showDeleteConfirm && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                        <div className="bg-white dark:bg-[#1e2736] rounded-2xl p-6 w-full max-w-sm shadow-2xl animate-in zoom-in-95">
                            <h3 className="text-lg font-bold mb-2">Delete Record?</h3>
                            <p className="text-slate-500 dark:text-slate-400 text-sm mb-6">
                                Are you sure you want to delete the ledger for <strong>{recordToDelete?.customerName}</strong>? This action cannot be undone.
                            </p>
                            <div className="flex gap-3 justify-end">
                                <button
                                    onClick={() => setShowDeleteConfirm(false)}
                                    className="px-4 py-2 rounded-lg font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleDeleteRecord}
                                    disabled={!!deletingId}
                                    className="px-4 py-2 rounded-lg font-semibold bg-red-600 text-white hover:bg-red-700 flex items-center gap-2"
                                >
                                    {deletingId ? 'Deleting...' : 'Delete'}
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }
            {/* PDF Modal (Download) */}
            {showPdfModal && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
                    <div className="bg-white dark:bg-slate-800 rounded-2xl p-8 max-w-xs w-full text-center shadow-2xl">
                        {pdfStatus === 'generating' && (
                            <>
                                <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent mb-4"></div>
                                <h3 className="text-lg font-bold mb-2">Generating PDF...</h3>
                                <p className="text-sm text-slate-500">Please wait while we prepare your document.</p>
                            </>
                        )}
                        {pdfStatus === 'ready' && (
                            <>
                                <div className="mx-auto h-12 w-12 rounded-full bg-green-100 text-green-600 flex items-center justify-center mb-4">
                                    <span className="material-symbols-outlined text-3xl">check</span>
                                </div>
                                <h3 className="text-lg font-bold mb-2">PDF Ready!</h3>
                                <p className="text-sm text-slate-500 mb-6">{currentPdfName}</p>
                                <button onClick={handleDownloadPdf} className="w-full py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition">
                                    Download Now
                                </button>
                                <button onClick={() => setShowPdfModal(false)} className="mt-3 text-sm text-slate-500 hover:text-slate-800">Close</button>
                            </>
                        )}
                        {pdfStatus === 'error' && (
                            <>
                                <div className="mx-auto h-12 w-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center mb-4">
                                    <span className="material-symbols-outlined text-3xl">error</span>
                                </div>
                                <h3 className="text-lg font-bold mb-2">Generation Failed</h3>
                                <p className="text-sm text-slate-500 mb-6">There was an error generating the PDF.</p>
                                <button onClick={() => setShowPdfModal(false)} className="w-full py-3 bg-slate-200 text-slate-800 rounded-xl font-bold hover:bg-slate-300 transition">
                                    Close
                                </button>
                            </>
                        )}
                    </div>
                </div>
            )}

        </motion.div>
    );
};

export default AllRecords;