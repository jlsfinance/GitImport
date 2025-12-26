
import React, { useState, useEffect } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { CompanyProfile, DEFAULT_COMPANY } from '../types';
import { Loader2, Printer, CheckCircle2, ShieldCheck, ExternalLink, AlertCircle } from 'lucide-react';
import { motion } from 'framer-motion';

interface PublicBillViewProps {
    billId: string;
}

// Utility to decode unicode-safe Base64
const decodeData = (str: string) => {
    try {
        return JSON.parse(decodeURIComponent(escape(atob(str))));
    } catch (e) {
        return null;
    }
};

export const PublicBillView: React.FC<PublicBillViewProps> = ({ billId }) => {
    const [invoice, setInvoice] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isOfflineCopy, setIsOfflineCopy] = useState(false);

    useEffect(() => {
        const fetchBill = async () => {
            try {
                setLoading(true);

                // 1. Try to get data from URL Fragment (Self-Contained Mode)
                const hash = window.location.hash;
                if (hash.startsWith('#d=')) {
                    const rawData = hash.substring(3);
                    const decoded = decodeData(rawData);
                    if (decoded) {
                        setInvoice(decoded);
                        setIsOfflineCopy(true);
                        setLoading(false);
                        return;
                    }
                }

                // 2. Fallback to Firestore (Database Mode)
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

    if (loading) {
        return (
            <div className="min-h-screen w-full flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-950 p-6 text-center">
                <Loader2 className="w-12 h-12 text-blue-600 animate-spin mb-4" />
                <p className="text-slate-500 font-black uppercase tracking-widest text-[10px]">Verifying Digital Invoice...</p>
            </div>
        );
    }

    if (error || !invoice) {
        return (
            <div className="min-h-screen w-full flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-950 p-6 text-center">
                <div className="w-20 h-20 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mb-6">
                    <AlertCircle className="w-10 h-10 text-red-600" />
                </div>
                <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2 tracking-tight uppercase italic">Invalid Link</h2>
                <p className="text-slate-500 max-w-xs text-sm font-medium">{error || "The bill you are looking for does not exist."}</p>
                <button onClick={() => window.location.href = '/'} className="mt-8 px-8 py-3 bg-blue-600 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-xl shadow-blue-500/30 active:scale-95 transition-all">Go to App</button>
            </div>
        );
    }

    const company: CompanyProfile = invoice._company || DEFAULT_COMPANY;

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 font-sans">
            {/* Dynamic Header Badge */}
            <div className={`${isOfflineCopy ? 'bg-blue-600' : 'bg-emerald-600'} text-white py-2 px-4 flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] sticky top-0 z-50 shadow-md print:hidden`}>
                <ShieldCheck className="w-4 h-4" />
                {isOfflineCopy ? 'Self-Contained Secure Invoice' : 'Verified Digital Bill • Secured'}
            </div>

            <main className="max-w-4xl mx-auto p-4 md:p-8 pb-32">
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white dark:bg-slate-900 rounded-[40px] shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden"
                >
                    {/* Company Banner */}
                    <div className="p-8 md:p-12 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 flex flex-col md:flex-row justify-between items-start gap-8">
                        <div className="flex-1">
                            <h1 className="text-3xl md:text-5xl font-black text-slate-900 dark:text-white uppercase tracking-tighter leading-none mb-4 italic italic-none">
                                {company.name}
                            </h1>
                            <div className="space-y-1 text-sm text-slate-500 dark:text-slate-400 font-bold max-w-sm">
                                <p className="whitespace-pre-wrap">{company.address}</p>
                                <p className="flex items-center gap-2 mt-2 opacity-80">Ph: {company.phone}</p>
                                {company.gstin && (
                                    <div className="inline-flex items-center gap-2 bg-emerald-100 dark:bg-emerald-900/30 px-3 py-1 rounded-lg text-emerald-700 dark:text-emerald-400 text-xs font-black mt-2">
                                        GSTIN: {company.gstin}
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="text-right flex flex-col items-start md:items-end w-full md:w-auto">
                            <div className="text-slate-400 text-[9px] font-black uppercase tracking-[0.3em] ml-1">Invoice Number</div>
                            <div className="text-3xl font-black text-slate-900 dark:text-white tracking-tighter mb-4 leading-none">#{invoice.invoiceNumber}</div>
                            <div className="text-slate-400 text-[9px] font-black uppercase tracking-[0.3em] ml-1">Invoice Date</div>
                            <div className="text-sm font-black text-slate-700 dark:text-slate-200 uppercase tracking-tight">{new Date(invoice.date).toLocaleDateString(undefined, { dateStyle: 'long' })}</div>
                        </div>
                    </div>

                    {/* Details Grid */}
                    <div className="p-8 md:p-12 grid grid-cols-1 md:grid-cols-2 gap-12">
                        <div>
                            <div className="text-slate-400 text-[10px] font-black uppercase tracking-[0.3em] mb-4">Billed To</div>
                            <h3 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight mb-2 leading-none">{invoice.customerName}</h3>
                            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium whitespace-pre-wrap leading-relaxed max-w-xs">{invoice.customerAddress || 'Local Customer'}</p>
                            {invoice.customerGstin && (
                                <div className="text-[10px] font-black text-slate-400 mt-4 border border-slate-200 dark:border-slate-800 px-3 py-1.5 rounded-xl inline-block">GSTIN: {invoice.customerGstin}</div>
                            )}
                        </div>

                        <div className="flex flex-col items-start md:items-end justify-center">
                            <div className="bg-slate-50 dark:bg-slate-800 px-8 py-8 rounded-[40px] border border-slate-100 dark:border-slate-800 w-full md:w-auto min-w-[280px] shadow-sm">
                                <div className="text-slate-400 text-[10px] font-black uppercase tracking-[0.3em] mb-2 leading-none">Grand Total Amount</div>
                                <div className="text-5xl font-black text-blue-600 dark:text-blue-400 tracking-tighter mb-4 leading-none italic">₹{invoice.total.toLocaleString()}</div>
                                <div className="flex items-center gap-3">
                                    <div className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-[0.2em] flex items-center gap-2 ${invoice.status === 'PAID' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'}`}>
                                        <div className={`w-2 h-2 rounded-full ${invoice.status === 'PAID' ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                                        Status: {invoice.status}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Items Table */}
                    <div className="px-8 md:px-12 pb-12 overflow-x-auto text-slate-900 dark:text-white">
                        <table className="w-full text-left border-collapse min-w-[600px]">
                            <thead>
                                <tr className="border-b-2 border-slate-100 dark:border-slate-800">
                                    <th className="py-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Item Description</th>
                                    <th className="py-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] text-center">Qty</th>
                                    <th className="py-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] text-right">Price</th>
                                    <th className="py-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] text-right">Total</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                                {invoice.items.map((item: any, idx: number) => (
                                    <tr key={idx} className="group">
                                        <td className="py-8">
                                            <div className="text-base font-black uppercase tracking-tight">{item.description || item.d}</div>
                                            {(item.hsn || item.h) && <div className="text-[10px] font-bold text-slate-400 mt-1 uppercase">HSN: {item.hsn || item.h}</div>}
                                        </td>
                                        <td className="py-8 text-center"><span className="px-5 py-2 rounded-2xl bg-slate-50 dark:bg-slate-800 text-sm font-black tracking-tighter">{item.quantity || item.q}</span></td>
                                        <td className="py-8 text-right text-sm font-bold opacity-70 tracking-tight italic">₹{(item.rate || item.r || 0).toLocaleString()}</td>
                                        <td className="py-8 text-right text-base font-black italic tracking-tighter">₹{(item.totalAmount || item.t || 0).toLocaleString()}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Totals Summary */}
                    <div className="p-8 md:p-12 bg-slate-50/50 dark:bg-slate-800/30 border-t border-slate-100 dark:border-slate-800 flex flex-col md:flex-row justify-between items-start md:items-end gap-12">
                        <div className="flex-1 w-full">
                            {invoice.notes && (
                                <div className="max-w-md">
                                    <div className="text-slate-400 text-[9px] font-black uppercase tracking-[0.3em] mb-4">Notes & Terms</div>
                                    <p className="text-xs text-slate-500 font-bold leading-relaxed">{invoice.notes}</p>
                                </div>
                            )}
                        </div>

                        <div className="w-full md:w-80 space-y-4">
                            <div className="flex justify-between items-center">
                                <span className="text-slate-400 text-[10px] font-black uppercase tracking-[0.3em]">Net Subtotal</span>
                                <span className="text-sm font-black text-slate-800 dark:text-slate-200 tracking-tighter">₹{(invoice.subtotal || 0).toLocaleString()}</span>
                            </div>

                            {invoice.gstEnabled && (
                                <div className="space-y-3 pt-2">
                                    {invoice.totalCgst > 0 && (
                                        <div className="flex justify-between items-center text-xs font-bold text-emerald-600 dark:text-emerald-400">
                                            <span className="opacity-70 uppercase tracking-widest text-[9px]">CGST Output</span>
                                            <span>+ ₹{invoice.totalCgst.toLocaleString()}</span>
                                        </div>
                                    )}
                                    {invoice.totalSgst > 0 && (
                                        <div className="flex justify-between items-center text-xs font-bold text-emerald-600 dark:text-emerald-400">
                                            <span className="opacity-70 uppercase tracking-widest text-[9px]">SGST Output</span>
                                            <span>+ ₹{invoice.totalSgst.toLocaleString()}</span>
                                        </div>
                                    )}
                                </div>
                            )}

                            <div className="h-px bg-slate-200 dark:bg-slate-700 my-4" />

                            <div className="flex justify-between items-center">
                                <span className="text-slate-900 dark:text-white font-black uppercase tracking-tighter text-xl italic">Total Payable</span>
                                <span className="text-blue-600 dark:text-blue-400 font-black text-4xl tracking-tighter italic">₹{invoice.total.toLocaleString()}</span>
                            </div>
                        </div>
                    </div>
                </motion.div>

                {/* Footer info */}
                <div className="mt-12 text-center space-y-6 print:hidden">
                    <div className="flex items-center justify-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-xl shadow-blue-500/20">
                            <ShieldCheck className="w-6 h-6" />
                        </div>
                        <div>
                            <h4 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-tighter italic leading-none">BillBook Premium</h4>
                            <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mt-1 opacity-60">Professional Enterprise Billing</p>
                        </div>
                    </div>
                </div>
            </main>

            {/* FABs */}
            <div className="fixed bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-4 z-[100] print:hidden">
                <button onClick={() => window.print()} className="px-8 py-4 bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-[24px] font-black uppercase tracking-widest text-[10px] shadow-2xl border border-slate-200 dark:border-slate-700 flex items-center gap-3 active:scale-95 transition-all">
                    <Printer className="w-4 h-4" /> Save PDF
                </button>
                <button onClick={() => window.location.href = '/'} className="px-8 py-4 bg-blue-600 text-white rounded-[24px] font-black uppercase tracking-widest text-[10px] shadow-2xl shadow-blue-500/30 flex items-center gap-3 active:scale-95 transition-all">
                    <ExternalLink className="w-4 h-4" /> Create Bill
                </button>
            </div>

            <style>{`
        @media print {
          .print\\:hidden { display: none !important; }
          body { background: white !important; }
          main { padding: 0 !important; max-width: none !important; }
          .rounded-\\[40px\\] { border-radius: 0 !important; border: none !important; box-shadow: none !important; }
        }
      `}</style>
        </div>
    );
};
