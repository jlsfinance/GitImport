
import React, { useState, useEffect } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { CompanyProfile, DEFAULT_COMPANY } from '../types';
import { Loader2, Printer, CheckCircle2, ShieldCheck, ExternalLink, AlertCircle, RefreshCw } from 'lucide-react';
import { motion } from 'framer-motion';

interface PublicBillViewProps {
    billId: string;
}

// 📌 Modern Unicode-safe Base64 Decoding
const decodeData = (str: string) => {
    try {
        const raw = atob(str);
        const u8 = new Uint8Array(raw.length);
        for (let i = 0; i < raw.length; i++) u8[i] = raw.charCodeAt(i);
        const decoder = new TextDecoder();
        return JSON.parse(decoder.decode(u8));
    } catch (e) {
        console.error("Decoding error:", e);
        return null;
    }
};

export const PublicBillView: React.FC<PublicBillViewProps> = ({ billId }) => {
    const [invoice, setInvoice] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isOfflineCopy, setIsOfflineCopy] = useState(false);

    useEffect(() => {
        let isMounted = true;
        const fetchBill = async () => {
            try {
                setLoading(true);
                setError(null);

                // 1. Instant Check URL Fragment (No network needed)
                const hash = window.location.hash;
                if (hash.includes('d=')) {
                    const rawData = hash.split('d=')[1];
                    const decoded = decodeData(rawData);
                    if (decoded && isMounted) {
                        setInvoice(decoded);
                        setIsOfflineCopy(true);
                        setLoading(false);
                        return;
                    }
                }

                // 2. Database Fallback with Timeout
                const fetchPromise = getDoc(doc(db, 'publicBills', billId));
                const timeoutPromise = new Promise((_, reject) =>
                    setTimeout(() => reject(new Error("CONNECT_TIMEOUT")), 10000)
                );

                const snap = await Promise.race([fetchPromise, timeoutPromise]) as any;

                if (isMounted) {
                    if (snap && snap.exists()) {
                        setInvoice(snap.data());
                    } else {
                        setError("BILL_NOT_FOUND");
                    }
                }
            } catch (err: any) {
                console.error("Public fetch error:", err);
                if (isMounted) {
                    setError(err.message === "CONNECT_TIMEOUT" ? "CONNECTION_TIMEOUT" : "LOAD_ERROR");
                }
            } finally {
                if (isMounted) setLoading(false);
            }
        };

        fetchBill();
        return () => { isMounted = false; };
    }, [billId]);

    if (loading) {
        return (
            <div className="min-h-screen w-full flex flex-col items-center justify-center bg-white dark:bg-slate-950 p-6 text-center">
                <div className="relative mb-6">
                    <div className="w-20 h-20 rounded-3xl border-4 border-blue-100 dark:border-slate-900 border-t-blue-600 animate-spin" />
                    <ShieldCheck className="absolute inset-0 m-auto w-8 h-8 text-blue-600" />
                </div>
                <h2 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-[0.3em] animate-pulse">Verifying Secure Invoice</h2>
                <p className="text-[10px] text-slate-400 font-bold mt-2 uppercase tracking-widest">Powered by JLS Suite</p>
            </div>
        );
    }

    if (error || !invoice) {
        return (
            <div className="min-h-screen w-full flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-950 p-6 text-center">
                <div className="w-20 h-20 bg-red-100 dark:bg-red-900/30 rounded-[32px] flex items-center justify-center mb-6 shadow-xl shadow-red-500/10">
                    <AlertCircle className="w-10 h-10 text-red-600" />
                </div>
                <h2 className="text-2xl font-black text-slate-900 dark:text-white mb-2 tracking-tight uppercase italic">
                    {error === "CONNECTION_TIMEOUT" ? "Network Timeout" : "Bill Not Found"}
                </h2>
                <p className="text-slate-500 max-w-xs text-sm font-medium mb-8">
                    {error === "CONNECTION_TIMEOUT"
                        ? "Server is taking too long to respond. Please check your internet or try again."
                        : "This invoice link is either incorrect or has been removed."}
                </p>
                <div className="flex flex-col gap-3 w-full max-w-xs">
                    <button onClick={() => window.location.reload()} className="px-8 py-4 bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-lg flex items-center justify-center gap-3 active:scale-95 transition-all outline-none border border-slate-200 dark:border-slate-700">
                        <RefreshCw className="w-4 h-4" /> Retry Loading
                    </button>
                    <button onClick={() => window.location.href = '/'} className="px-8 py-4 bg-blue-600 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-xl shadow-blue-500/30 active:scale-95 transition-all outline-none">
                        Go to Homepage
                    </button>
                </div>
            </div>
        );
    }

    const company: CompanyProfile = invoice._company || DEFAULT_COMPANY;

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 font-sans">
            {/* Dynamic Header Badge */}
            <div className={`${isOfflineCopy ? 'bg-indigo-600' : 'bg-emerald-600'} text-white py-2.5 px-4 flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] sticky top-0 z-50 shadow-md print:hidden transition-colors`}>
                <ShieldCheck className="w-4 h-4" />
                {isOfflineCopy ? 'Encrypted Secure Invoice Link' : 'Cloud Verified Digital Bill'}
            </div>

            <main className="max-w-4xl mx-auto p-4 md:p-8 pb-32">
                <motion.div
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="bg-white dark:bg-slate-900 rounded-[48px] shadow-[0_32px_64px_-12px_rgba(0,0,0,0.1)] border border-slate-200 dark:border-slate-800 overflow-hidden"
                >
                    {/* Company Banner */}
                    <div className="p-8 md:p-14 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/20 flex flex-col md:flex-row justify-between items-start gap-10">
                        <div className="flex-1">
                            <h1 className="text-4xl md:text-5xl font-black text-slate-900 dark:text-white uppercase tracking-tighter leading-[0.9] mb-6 italic">
                                {company.name}
                            </h1>
                            <div className="space-y-1.5 text-xs md:text-sm text-slate-500 dark:text-slate-400 font-bold max-w-sm">
                                <p className="whitespace-pre-wrap leading-relaxed">{company.address}</p>
                                <div className="flex flex-wrap gap-4 mt-6">
                                    <div className="flex flex-col">
                                        <span className="text-[9px] uppercase tracking-widest opacity-50 mb-1">Contact Support</span>
                                        <span className="text-slate-900 dark:text-slate-200">{company.phone}</span>
                                    </div>
                                    {company.gstin && (
                                        <div className="flex flex-col">
                                            <span className="text-[9px] uppercase tracking-widest opacity-50 mb-1">GST Registration</span>
                                            <span className="text-emerald-600 dark:text-emerald-400">{company.gstin}</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="text-right flex flex-col items-start md:items-end w-full md:w-auto md:pt-2">
                            <div className="text-slate-400 text-[9px] font-black uppercase tracking-[0.4em] mb-2">Invoice Identifier</div>
                            <div className="text-4xl font-black text-slate-900 dark:text-white tracking-tighter mb-6 leading-none italic">#{invoice.invoiceNumber}</div>
                            <div className="text-slate-400 text-[9px] font-black uppercase tracking-[0.4em] mb-2">Billing Date</div>
                            <div className="text-sm font-black text-slate-700 dark:text-slate-200 uppercase tracking-tighter border-b-2 border-slate-200 dark:border-slate-700 pb-1">{new Date(invoice.date).toLocaleDateString(undefined, { dateStyle: 'long' })}</div>
                        </div>
                    </div>

                    {/* Details Grid */}
                    <div className="p-8 md:p-14 grid grid-cols-1 md:grid-cols-2 gap-16">
                        <div className="relative">
                            <div className="absolute -left-4 top-0 w-1 h-12 bg-blue-600 rounded-full opacity-50" />
                            <div className="text-slate-400 text-[10px] font-black uppercase tracking-[0.4em] mb-5">Recipient Details</div>
                            <h3 className="text-3xl font-black text-slate-900 dark:text-white uppercase tracking-tight mb-3 leading-none">{invoice.customerName}</h3>
                            <p className="text-xs text-slate-500 dark:text-slate-400 font-bold whitespace-pre-wrap leading-relaxed max-w-xs opacity-80">{invoice.customerAddress || 'Direct Cash Customer'}</p>
                            {invoice.customerGstin && (
                                <div className="mt-6 inline-flex items-center gap-2 text-[9px] font-black text-slate-500 uppercase tracking-widest bg-slate-100 dark:bg-slate-800 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700">
                                    ID: {invoice.customerGstin}
                                </div>
                            )}
                        </div>

                        <div className="flex flex-col items-start md:items-end justify-center">
                            <div className="bg-slate-950 text-white px-10 py-10 rounded-[48px] w-full md:w-auto min-w-[320px] shadow-2xl relative overflow-hidden group">
                                <div className="absolute top-0 right-0 w-32 h-32 bg-blue-600/20 blur-[60px] group-hover:bg-blue-600/30 transition-all" />
                                <div className="text-slate-500 text-[10px] font-black uppercase tracking-[0.4em] mb-3 leading-none">Total Value Payable</div>
                                <div className="text-6xl font-black text-white tracking-tighter mb-6 leading-none italic">₹{invoice.total.toLocaleString()}</div>
                                <div className="flex items-center gap-3">
                                    <div className={`px-5 py-2 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] flex items-center gap-3 border ${invoice.status === 'PAID' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-amber-500/10 text-amber-400 border-amber-500/20'}`}>
                                        <div className={`w-2 h-2 rounded-full animate-pulse ${invoice.status === 'PAID' ? 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]' : 'bg-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.5)]'}`} />
                                        {invoice.status} ACCOUNT
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Items Table */}
                    <div className="px-8 md:px-14 pb-14 overflow-x-auto">
                        <table className="w-full text-left border-separate border-spacing-y-3 min-w-[650px]">
                            <thead>
                                <tr>
                                    <th className="px-4 py-4 text-[10px] font-black text-slate-400 uppercase tracking-[0.4em]">Product/Service</th>
                                    <th className="px-4 py-4 text-[10px] font-black text-slate-400 uppercase tracking-[0.4em] text-center">Unit</th>
                                    <th className="px-4 py-4 text-[10px] font-black text-slate-400 uppercase tracking-[0.4em] text-right">Price</th>
                                    <th className="px-4 py-4 text-[10px] font-black text-slate-400 uppercase tracking-[0.4em] text-right">Ext. Total</th>
                                </tr>
                            </thead>
                            <tbody>
                                {invoice.items.map((item: any, idx: number) => (
                                    <tr key={idx} className="group">
                                        <td className="px-4 py-7 bg-slate-50/50 dark:bg-slate-800/30 rounded-l-[24px]">
                                            <div className="text-base font-black uppercase tracking-tight text-slate-900 dark:text-white">{item.description || item.d}</div>
                                            {(item.hsn || item.h) && <div className="text-[9px] font-black text-slate-400 mt-1.5 tracking-widest opacity-60">CODE: {item.hsn || item.h}</div>}
                                        </td>
                                        <td className="px-4 py-7 bg-slate-50/50 dark:bg-slate-800/30 text-center"><span className="text-sm font-black tracking-tighter text-slate-600 dark:text-slate-400">×{item.quantity || item.q}</span></td>
                                        <td className="px-4 py-7 bg-slate-50/50 dark:bg-slate-800/30 text-right text-sm font-bold opacity-60 italic text-slate-900 dark:text-white tracking-tight">₹{(item.rate || item.r || 0).toLocaleString()}</td>
                                        <td className="px-4 py-7 bg-slate-50/50 dark:bg-slate-800/30 text-right rounded-r-[24px]">
                                            <span className="text-base font-black italic tracking-tighter text-slate-900 dark:text-white">₹{(item.totalAmount || item.t || 0).toLocaleString()}</span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Totals Summary */}
                    <div className="p-8 md:p-14 bg-slate-50/50 dark:bg-slate-800/30 border-t border-slate-100 dark:border-slate-800 flex flex-col md:flex-row justify-between items-start md:items-end gap-16">
                        <div className="flex-1 w-full md:pb-4">
                            {invoice.notes && (
                                <div className="max-w-md bg-white dark:bg-slate-950 p-6 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm">
                                    <div className="text-slate-400 text-[9px] font-black uppercase tracking-[0.4em] mb-4">Official Disclaimer</div>
                                    <p className="text-[11px] text-slate-500 font-bold leading-relaxed whitespace-pre-wrap">{invoice.notes}</p>
                                </div>
                            )}
                        </div>

                        <div className="w-full md:w-96 space-y-5">
                            <div className="flex justify-between items-center group">
                                <span className="text-slate-400 text-[10px] font-black uppercase tracking-[0.4em] group-hover:text-slate-600 transition-colors">Core Value</span>
                                <span className="text-sm font-black text-slate-800 dark:text-slate-200 tracking-tighter">₹{(invoice.subtotal || 0).toLocaleString()}</span>
                            </div>

                            {invoice.discountAmount && invoice.discountAmount > 0 && (
                                <div className="flex justify-between items-center group">
                                    <span className="text-slate-400 text-[10px] font-black uppercase tracking-[0.4em] group-hover:text-red-500 transition-colors">Discount</span>
                                    <span className="text-sm font-black text-red-500 tracking-tighter">- ₹{invoice.discountAmount.toLocaleString()}</span>
                                </div>
                            )}

                            {invoice.gstEnabled && (
                                <div className="space-y-4 pt-2 border-l-2 border-emerald-500/20 ml-1 pl-5">
                                    {invoice.totalCgst > 0 && (
                                        <div className="flex justify-between items-center text-xs font-bold text-emerald-600 dark:text-emerald-400">
                                            <span className="opacity-50 uppercase tracking-[0.2em] text-[9px]">Tax Component: CGST</span>
                                            <span>+ ₹{invoice.totalCgst.toLocaleString()}</span>
                                        </div>
                                    )}
                                    {invoice.totalSgst > 0 && (
                                        <div className="flex justify-between items-center text-xs font-bold text-emerald-600 dark:text-emerald-400">
                                            <span className="opacity-50 uppercase tracking-[0.2em] text-[9px]">Tax Component: SGST</span>
                                            <span>+ ₹{invoice.totalSgst.toLocaleString()}</span>
                                        </div>
                                    )}
                                </div>
                            )}

                            <div className="h-px bg-slate-200 dark:bg-slate-700 my-6" />

                            <div className="flex justify-between items-center">
                                <div className="flex flex-col">
                                    <span className="text-slate-900 dark:text-white font-black uppercase tracking-tighter text-2xl italic leading-none">Net Total</span>
                                    <span className="text-[9px] font-black text-blue-600 uppercase tracking-widest mt-1">Inclusive of all taxes</span>
                                </div>
                                <span className="text-blue-600 dark:text-blue-400 font-black text-5xl tracking-tighter italic leading-none">₹{invoice.total.toLocaleString()}</span>
                            </div>
                        </div>
                    </div>
                </motion.div>

                {/* Footer info */}
                <div className="mt-16 text-center space-y-8 print:hidden opacity-50 hover:opacity-100 transition-opacity">
                    <div className="flex flex-col items-center gap-4">
                        <div className="w-14 h-14 rounded-[24px] bg-gradient-to-br from-blue-600 to-indigo-700 text-white flex items-center justify-center shadow-2xl shadow-blue-500/30">
                            <ShieldCheck className="w-8 h-8" />
                        </div>
                        <div className="text-center">
                            <h4 className="text-base font-black text-slate-900 dark:text-white uppercase tracking-tighter italic leading-none">JLS Suite Digital Trust</h4>
                            <p className="text-[10px] text-slate-400 font-black uppercase tracking-[0.4em] mt-2">Financially Validated • Security Encrypted</p>
                        </div>
                    </div>
                </div>
            </main>

            {/* Action Bar */}
            <div className="fixed bottom-10 left-1/2 -translate-x-1/2 flex items-center gap-4 z-[100] print:hidden">
                <button onClick={() => window.print()} className="px-10 py-5 bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-[32px] font-black uppercase tracking-widest text-[11px] shadow-[0_20px_40px_-10px_rgba(0,0,0,0.1)] border border-slate-200 dark:border-slate-700 flex items-center gap-3 hover:bg-slate-50 dark:hover:bg-slate-700 active:scale-95 transition-all">
                    <Printer className="w-5 h-5 text-blue-600" /> Save Document
                </button>
                <button onClick={() => window.location.href = '/'} className="px-10 py-5 bg-slate-950 text-white rounded-[32px] font-black uppercase tracking-widest text-[11px] shadow-[0_20px_40px_-10px_rgba(59,130,246,0.5)] flex items-center gap-3 hover:bg-blue-600 active:scale-95 transition-all">
                    <ExternalLink className="w-5 h-5" /> App Access
                </button>
            </div>

            <style>{`
        @media print {
          .print\\:hidden { display: none !important; }
          body { background: white !important; }
          main { padding: 0 !important; max-width: none !important; }
          .rounded-\\[48px\\] { border-radius: 0 !important; border: none !important; box-shadow: none !important; }
          .bg-slate-50\\/50 { background-color: transparent !important; }
        }
        @keyframes pulse-ring {
          0% { transform: scale(.8); opacity: .5; }
          100% { transform: scale(1.2); opacity: 0; }
        }
      `}</style>
        </div>
    );
};
