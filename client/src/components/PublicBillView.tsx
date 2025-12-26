
import React, { useState, useEffect } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Invoice, CompanyProfile, DEFAULT_COMPANY } from '../types';
import { Loader2, Download, Printer, CheckCircle2, ShieldCheck, ExternalLink } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { jsPDF } from 'jspdf';

interface PublicBillViewProps {
    billId: string;
}

export const PublicBillView: React.FC<PublicBillViewProps> = ({ billId }) => {
    const [invoice, setInvoice] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchBill = async () => {
            try {
                setLoading(true);
                const docRef = doc(db, 'publicBills', billId);
                const snap = await getDoc(docRef);

                if (snap.exists()) {
                    setInvoice(snap.data());
                } else {
                    setError("Bill not found. This link might be expired or incorrect.");
                }
            } catch (err: any) {
                console.error("Error fetching public bill:", err);
                setError("Failed to load bill. Please try again later.");
            } finally {
                setLoading(false);
            }
        };

        fetchBill();
    }, [billId]);

    const handlePrint = () => {
        window.print();
    };

    if (loading) {
        return (
            <div className="min-h-screen w-full flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-950 p-6">
                <div className="relative">
                    <Loader2 className="w-12 h-12 text-blue-600 animate-spin" />
                </div>
                <p className="mt-4 text-slate-500 font-medium animate-pulse uppercase tracking-widest text-xs">Authenticating Bill...</p>
            </div>
        );
    }

    if (error || !invoice) {
        return (
            <div className="min-h-screen w-full flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-950 p-6 text-center">
                <div className="w-20 h-20 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mb-6">
                    <ShieldCheck className="w-10 h-10 text-red-600" />
                </div>
                <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Invalid Link</h2>
                <p className="text-slate-500 max-w-xs">{error || "The bill you are looking for does not exist."}</p>
                <button
                    onClick={() => window.location.href = '/'}
                    className="mt-8 px-6 py-3 bg-blue-600 text-white rounded-2xl font-bold shadow-lg shadow-blue-500/30 active:scale-95 transition-transform"
                >
                    Go to App
                </button>
            </div>
        );
    }

    const company: CompanyProfile = invoice._company || DEFAULT_COMPANY;

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 font-sans selection:bg-blue-100 dark:selection:bg-blue-900">
            {/* Top Banner - Security & Trust */}
            <div className="bg-emerald-600 text-white py-2 px-4 flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] sticky top-0 z-50 shadow-sm print:hidden">
                <ShieldCheck className="w-3 h-3" />
                Verified Digital Invoice • Secured by BillBook
            </div>

            <main className="max-w-4xl mx-auto p-4 md:p-8 pb-32">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white dark:bg-slate-900 rounded-[40px] shadow-2xl shadow-slate-200 dark:shadow-none border border-slate-200 dark:border-slate-800 overflow-hidden"
                >
                    {/* Header */}
                    <div className="p-8 md:p-12 border-b border-slate-100 dark:border-slate-800 flex flex-col md:flex-row justify-between items-start gap-8 bg-slate-50/50 dark:bg-slate-800/30">
                        <div>
                            <h1 className="text-3xl md:text-4xl font-black text-slate-900 dark:text-white uppercase tracking-tighter leading-none mb-4 italic">
                                {company.name}
                            </h1>
                            <div className="space-y-1 text-sm text-slate-500 dark:text-slate-400 font-medium max-w-sm">
                                <p className="whitespace-pre-wrap">{company.address}</p>
                                <p>Phone: {company.phone}</p>
                                {invoice.gstEnabled && (company.gstin || company.gst) && (
                                    <p className="text-emerald-600 dark:text-emerald-400 font-bold mt-2">GSTIN: {company.gstin || company.gst}</p>
                                )}
                            </div>
                        </div>

                        <div className="text-right flex flex-col items-start md:items-end w-full md:w-auto">
                            <div className="inline-flex items-center gap-2 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest mb-4">
                                <CheckCircle2 className="w-3 h-3" />
                                Valid Invoice
                            </div>
                            <div className="text-slate-400 text-[10px] font-black uppercase tracking-[0.2em] mb-1">Invoice Number</div>
                            <div className="text-2xl font-black text-slate-900 dark:text-white tracking-tighter mb-4">#{invoice.invoiceNumber}</div>
                            <div className="text-slate-400 text-[10px] font-black uppercase tracking-[0.2em] mb-1">Date</div>
                            <div className="text-sm font-bold text-slate-700 dark:text-slate-200">{new Date(invoice.date).toLocaleDateString(undefined, { dateStyle: 'long' })}</div>
                        </div>
                    </div>

                    {/* Bill To */}
                    <div className="p-8 md:p-12 grid grid-cols-1 md:grid-cols-2 gap-12">
                        <div>
                            <div className="text-slate-400 text-[10px] font-black uppercase tracking-[0.2em] mb-4">Bill To</div>
                            <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight mb-2">{invoice.customerName}</h3>
                            <p className="text-sm text-slate-500 dark:text-slate-400 whitespace-pre-wrap leading-relaxed">
                                {invoice.customerAddress || 'No address provided'}
                            </p>
                            {invoice.customerGstin && (
                                <p className="text-xs font-bold text-slate-400 mt-2 uppercase">GSTIN: {invoice.customerGstin}</p>
                            )}
                        </div>

                        <div className="flex flex-col items-start md:items-end justify-center">
                            <div className="bg-slate-50 dark:bg-slate-800/50 p-6 rounded-[32px] border border-slate-100 dark:border-slate-800 w-full md:w-auto min-w-[240px]">
                                <div className="text-slate-400 text-[10px] font-black uppercase tracking-[0.2em] mb-2">Total Amount Payable</div>
                                <div className="text-4xl font-black text-blue-600 dark:text-blue-400 tracking-tighter">₹{invoice.total.toLocaleString()}</div>
                                <div className="mt-4 flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                    <div className={`w-2 h-2 rounded-full ${invoice.status === 'PAID' ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                                    Payment Status: {invoice.status}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Table */}
                    <div className="px-8 md:px-12 pb-12 overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b-2 border-slate-100 dark:border-slate-800">
                                    <th className="py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Description</th>
                                    <th className="py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Qty</th>
                                    <th className="py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Rate</th>
                                    <th className="py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Amount</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                                {invoice.items.map((item: any, idx: number) => (
                                    <tr key={idx} className="group">
                                        <td className="py-6">
                                            <div className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-tight">{item.description}</div>
                                            {item.hsn && <div className="text-[10px] text-slate-400 font-bold mt-1">HSN: {item.hsn}</div>}
                                        </td>
                                        <td className="py-6 text-sm font-medium text-slate-900 dark:text-white text-right">{item.quantity}</td>
                                        <td className="py-6 text-sm font-medium text-slate-900 dark:text-white text-right">₹{item.rate.toLocaleString()}</td>
                                        <td className="py-6 text-sm font-black text-slate-900 dark:text-white text-right">₹{(item.totalAmount || (item.quantity * item.rate)).toLocaleString()}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Summary */}
                    <div className="p-8 md:p-12 bg-slate-50/50 dark:bg-slate-800/20 border-t border-slate-100 dark:border-slate-800 flex flex-col md:flex-row justify-between items-end gap-12">
                        <div className="w-full md:w-1/2">
                            {invoice.notes && (
                                <div className="mb-8">
                                    <div className="text-slate-400 text-[10px] font-black uppercase tracking-[0.2em] mb-2">Notes</div>
                                    <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">{invoice.notes}</p>
                                </div>
                            )}
                        </div>

                        <div className="w-full md:w-80 space-y-4">
                            <div className="flex justify-between items-center text-sm">
                                <span className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">Subtotal</span>
                                <span className="text-slate-900 dark:text-white font-bold">₹{invoice.subtotal.toLocaleString()}</span>
                            </div>

                            {invoice.gstEnabled && (
                                <>
                                    {invoice.totalCgst > 0 && (
                                        <div className="flex justify-between items-center text-sm">
                                            <span className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">CGST</span>
                                            <span className="text-emerald-600 dark:text-emerald-400 font-bold">+ ₹{invoice.totalCgst.toLocaleString()}</span>
                                        </div>
                                    )}
                                    {invoice.totalSgst > 0 && (
                                        <div className="flex justify-between items-center text-sm">
                                            <span className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">SGST</span>
                                            <span className="text-emerald-600 dark:text-emerald-400 font-bold">+ ₹{invoice.totalSgst.toLocaleString()}</span>
                                        </div>
                                    )}
                                    {invoice.totalIgst > 0 && (
                                        <div className="flex justify-between items-center text-sm">
                                            <span className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">IGST</span>
                                            <span className="text-emerald-600 dark:text-emerald-400 font-bold">+ ₹{invoice.totalIgst.toLocaleString()}</span>
                                        </div>
                                    )}
                                </>
                            )}

                            <div className="h-px bg-slate-200 dark:bg-slate-700 my-2" />

                            <div className="flex justify-between items-center">
                                <span className="text-slate-900 dark:text-white font-black uppercase tracking-tighter text-xl">Total</span>
                                <span className="text-blue-600 dark:text-blue-400 font-black text-2xl tracking-tighter">₹{invoice.total.toLocaleString()}</span>
                            </div>
                        </div>
                    </div>
                </motion.div>

                {/* Powered By Footer */}
                <div className="mt-12 text-center opacity-50 space-y-4 print:hidden">
                    <div className="flex items-center justify-center gap-2 mb-2">
                        <div className="w-8 h-8 rounded-xl bg-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
                            <ShieldCheck className="w-4 h-4 text-white" />
                        </div>
                        <span className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-tighter">BillBook</span>
                    </div>
                    <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Powering Smart Businesses Worldwide</p>
                </div>
            </main>

            {/* Floating Action Buttons */}
            <div className="fixed bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-4 z-[100] print:hidden">
                <button
                    onClick={handlePrint}
                    className="px-8 py-4 bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-[24px] font-black uppercase tracking-widest text-[10px] flex items-center gap-3 shadow-2xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                >
                    <Printer className="w-4 h-4" />
                    Print / PDF
                </button>

                <button
                    onClick={() => window.location.href = '/'}
                    className="px-8 py-4 bg-blue-600 text-white rounded-[24px] font-black uppercase tracking-widest text-[10px] flex items-center gap-3 shadow-2xl shadow-blue-500/40 active:scale-95 transition-transform"
                >
                    <ExternalLink className="w-4 h-4" />
                    Create Your Own Bill
                </button>
            </div>

            <style>{`
        @media print {
          .print\\:hidden { display: none !important; }
          body { background: white !important; }
          main { padding: 0 !important; max-width: none !important; }
          .rounded-\\[40px\\] { border-radius: 0 !important; border: none !important; box-shadow: none !important; }
          .bg-slate-50\\/50 { background-color: transparent !important; }
        }
      `}</style>
        </div>
    );
};
