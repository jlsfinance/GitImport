
import React, { useState, useEffect } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { CompanyProfile, DEFAULT_COMPANY } from '../types';
import { Loader2, Printer, CheckCircle2, ShieldCheck, ExternalLink, AlertCircle, RefreshCw } from 'lucide-react';
import { motion } from 'framer-motion';

interface PublicBillViewProps {
    billId: string;
}

export const PublicBillView: React.FC<PublicBillViewProps> = ({ billId }) => {
    const [invoice, setInvoice] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let isMounted = true;
        const fetchBill = async () => {
            try {
                setLoading(true);
                setError(null);

                // Fetch from Firestore
                const docRef = doc(db, 'publicBills', billId);
                const snap = await getDoc(docRef);

                if (isMounted) {
                    if (snap.exists()) {
                        setInvoice(snap.data());
                    } else {
                        setError("BILL_NOT_FOUND");
                    }
                }
            } catch (err: any) {
                console.error("Public fetch error:", err);
                if (isMounted) {
                    setError("LOAD_ERROR");
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
            </div>
        );
    }

    if (error || !invoice) {
        return (
            <div className="min-h-screen w-full flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-950 p-6 text-center">
                <div className="w-20 h-20 bg-red-100 dark:bg-red-900/30 rounded-[32px] flex items-center justify-center mb-6">
                    <AlertCircle className="w-10 h-10 text-red-600" />
                </div>
                <h2 className="text-2xl font-black text-slate-900 dark:text-white mb-2 tracking-tight uppercase italic">Invalid Link</h2>
                <p className="text-slate-500 max-w-xs text-sm font-medium mb-8">This invoice link is either incorrect or has been removed.</p>
                <button onClick={() => window.location.href = '/'} className="px-8 py-4 bg-blue-600 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-xl shadow-blue-500/30 active:scale-95 transition-all">Go to App</button>
            </div>
        );
    }

    const company: CompanyProfile = invoice._company || DEFAULT_COMPANY;

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 font-sans">
            <div className="bg-emerald-600 text-white py-2.5 px-4 flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] sticky top-0 z-50 shadow-md print:hidden">
                <ShieldCheck className="w-4 h-4" />
                Cloud Verified Digital Bill
            </div>

            <main className="max-w-4xl mx-auto p-4 md:p-8 pb-32">
                <motion.div
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="bg-white dark:bg-slate-900 rounded-[48px] shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden"
                >
                    <div className="p-8 md:p-14 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/20 flex flex-col md:flex-row justify-between items-start gap-10">
                        <div className="flex-1">
                            <h1 className="text-4xl md:text-5xl font-black text-slate-900 dark:text-white uppercase tracking-tighter leading-[0.9] mb-6 italic">
                                {company.name}
                            </h1>
                            <div className="space-y-1.5 text-xs md:text-sm text-slate-500 dark:text-slate-400 font-bold max-w-sm">
                                <p className="whitespace-pre-wrap">{company.address}</p>
                                <div className="flex flex-wrap gap-4 mt-6">
                                    <div className="flex flex-col">
                                        <span className="text-[9px] uppercase tracking-widest opacity-50 mb-1">Contact</span>
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

                        <div className="text-right flex flex-col items-start md:items-end w-full md:w-auto">
                            <div className="text-slate-400 text-[9px] font-black uppercase tracking-[0.4em] mb-2">Invoice No</div>
                            <div className="text-4xl font-black text-slate-900 dark:text-white tracking-tighter mb-6 leading-none">#{invoice.invoiceNumber}</div>
                            <div className="text-slate-400 text-[9px] font-black uppercase tracking-[0.4em] mb-2">Date</div>
                            <div className="text-sm font-black text-slate-700 dark:text-slate-200 uppercase tracking-tighter border-b-2 border-slate-200 dark:border-slate-700 pb-1">{new Date(invoice.date).toLocaleDateString()}</div>
                        </div>
                    </div>

                    <div className="p-8 md:p-14 grid grid-cols-1 md:grid-cols-2 gap-16">
                        <div>
                            <div className="text-slate-400 text-[10px] font-black uppercase tracking-[0.4em] mb-5">Billed To</div>
                            <h3 className="text-3xl font-black text-slate-900 dark:text-white uppercase tracking-tight mb-3">{invoice.customerName}</h3>
                            <p className="text-xs text-slate-500 dark:text-slate-400 font-bold whitespace-pre-wrap">{invoice.customerAddress || 'Direct Cash Customer'}</p>
                        </div>

                        <div className="flex flex-col items-start md:items-end justify-center">
                            <div className="bg-slate-950 text-white px-10 py-10 rounded-[48px] w-full md:w-auto min-w-[300px] shadow-2xl">
                                <div className="text-slate-500 text-[10px] font-black uppercase tracking-[0.4em] mb-3">Grand Total</div>
                                <div className="text-6xl font-black text-white tracking-tighter mb-6 italic">₹{invoice.total.toLocaleString()}</div>
                                <div className={`px-5 py-2 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] inline-block ${invoice.status === 'PAID' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-500/10 text-amber-400'}`}>
                                    Status: {invoice.status}
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="px-8 md:px-14 pb-14 overflow-x-auto">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="border-b border-slate-100 dark:border-slate-800">
                                    <th className="py-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.4em]">Description</th>
                                    <th className="py-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.4em] text-center">Qty</th>
                                    <th className="py-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.4em] text-right">Price</th>
                                    <th className="py-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.4em] text-right">Total</th>
                                </tr>
                            </thead>
                            <tbody>
                                {invoice.items.map((item: any, idx: number) => (
                                    <tr key={idx} className="border-b border-slate-50 dark:border-slate-800/50">
                                        <td className="py-8">
                                            <div className="text-base font-black uppercase text-slate-900 dark:text-white">{item.description}</div>
                                        </td>
                                        <td className="py-8 text-center text-sm font-black text-slate-600 dark:text-slate-400">×{item.quantity}</td>
                                        <td className="py-8 text-right text-sm font-bold opacity-60 text-slate-900 dark:text-white uppercase tracking-tight">₹{item.rate.toLocaleString()}</td>
                                        <td className="py-8 text-right text-base font-black italic text-slate-900 dark:text-white">₹{item.totalAmount.toLocaleString()}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    <div className="p-8 md:p-14 bg-slate-50/50 dark:bg-slate-800/30 border-t border-slate-100 dark:border-slate-800 flex flex-col md:flex-row justify-between items-end gap-16">
                        <div className="flex-1 w-full">
                            {invoice.notes && (
                                <div className="max-w-md">
                                    <div className="text-slate-400 text-[9px] font-black uppercase tracking-[0.4em] mb-4">Notes</div>
                                    <p className="text-[11px] text-slate-500 font-bold leading-relaxed">{invoice.notes}</p>
                                </div>
                            )}
                        </div>

                        <div className="w-full md:w-80 space-y-4">
                            <div className="flex justify-between items-center text-blue-600 dark:text-blue-400">
                                <span className="font-black uppercase tracking-tighter text-2xl italic">Net Total</span>
                                <span className="font-black text-5xl tracking-tighter italic">₹{invoice.total.toLocaleString()}</span>
                            </div>
                        </div>
                    </div>
                </motion.div>
            </main>

            <div className="fixed bottom-10 left-1/2 -translate-x-1/2 flex items-center gap-4 z-[100] print:hidden">
                <button onClick={() => window.print()} className="px-10 py-5 bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-full font-black uppercase tracking-widest text-[11px] shadow-2xl border border-slate-200 dark:border-slate-700 flex items-center gap-3">
                    <Printer className="w-5 h-5" /> Print
                </button>
                <button onClick={() => window.location.href = '/'} className="px-10 py-5 bg-blue-600 text-white rounded-full font-black uppercase tracking-widest text-[11px] shadow-2xl shadow-blue-500/30">
                    Go to App
                </button>
            </div>

            <style>{`
        @media print {
          .print\\:hidden { display: none !important; }
          body { background: white !important; }
          main { padding: 0 !important; max-width: none !important; }
        }
      `}</style>
        </div>
    );
};
