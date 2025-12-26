import React from 'react';
import { ShieldCheck, FileText, AlertTriangle, Scale, Gavel } from 'lucide-react';

const TermsOfService: React.FC = () => {
    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-900 py-12 px-4 sm:px-6 lg:px-8 font-sans">
            <div className="max-w-3xl mx-auto space-y-8">
                {/* Header */}
                <div className="text-center space-y-4">
                    <div className="mx-auto w-16 h-16 bg-purple-100 dark:bg-purple-900/30 rounded-2xl flex items-center justify-center">
                        <ShieldCheck className="w-8 h-8 text-purple-600 dark:text-purple-400" />
                    </div>
                    <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight uppercase">Terms of Use</h1>
                    <p className="text-slate-500 dark:text-slate-400">Last Updated: {new Date().toLocaleDateString()}</p>
                </div>

                <div className="bg-white dark:bg-slate-800 rounded-[32px] shadow-xl shadow-slate-200/50 dark:shadow-none overflow-hidden border border-slate-100 dark:border-slate-700">
                    <div className="p-8 space-y-10">

                        {/* Section 1 */}
                        <section className="space-y-4">
                            <div className="flex items-center gap-3 text-purple-600 dark:text-purple-400">
                                <FileText className="w-6 h-6" />
                                <h2 className="text-lg font-black uppercase tracking-widest">1. Usage Agreement</h2>
                            </div>
                            <div className="pl-9 text-slate-600 dark:text-slate-300 leading-relaxed">
                                <p>This application is provided as a professional tool for inventory and invoice management. By using this app, you acknowledge that you are solely responsible for the accuracy, legality, and completeness of any invoices, financial documents, or data entries generated.</p>
                            </div>
                        </section>

                        {/* Section 2 */}
                        <section className="space-y-4">
                            <div className="flex items-center gap-3 text-blue-600 dark:text-blue-400">
                                <Scale className="w-6 h-6" />
                                <h2 className="text-lg font-black uppercase tracking-widest">2. Data Ownership</h2>
                            </div>
                            <div className="pl-9 space-y-2 text-slate-600 dark:text-slate-300 leading-relaxed">
                                <p><strong>You Own Your Data:</strong> BillBook acts solely as a facilitator/tool. We claim no ownership over the data you enter.</p>
                                <p><strong>Local Storage Warning:</strong> Data is primarily stored locally on your device. Clearing your browser's cache or history/storage may result in permanent data loss unless you have actively enabled and verified Cloud Sync or performed a manual backup.</p>
                            </div>
                        </section>

                        {/* Section 3 */}
                        <section className="space-y-4">
                            <div className="flex items-center gap-3 text-orange-600 dark:text-orange-400">
                                <AlertTriangle className="w-6 h-6" />
                                <h2 className="text-lg font-black uppercase tracking-widest">3. Warranty Disclaimer</h2>
                            </div>
                            <div className="pl-9 text-slate-600 dark:text-slate-300 leading-relaxed">
                                <p>The application is provided on an <strong>"AS IS"</strong> and <strong>"AS AVAILABLE"</strong> basis. While we strive for 100% uptime and bug-free performance, we do not guarantee that the service will be uninterrupted or error-free at all times.</p>
                            </div>
                        </section>

                        {/* Section 4 */}
                        <section className="space-y-4">
                            <div className="flex items-center gap-3 text-red-600 dark:text-red-400">
                                <ShieldCheck className="w-6 h-6" />
                                <h2 className="text-lg font-black uppercase tracking-widest">4. Limitation of Liability</h2>
                            </div>
                            <div className="pl-9 text-slate-600 dark:text-slate-300 leading-relaxed">
                                <p>To the fullest extent permitted by law, the developers of BillBook shall not be liable for any direct, indirect, incidental, special, or consequential damages resulting from the use or inability to use the service, including but not limited to financial losses, tax calculation errors, or data loss incidents.</p>
                            </div>
                        </section>

                        {/* Section 5 */}
                        <section className="space-y-4">
                            <div className="flex items-center gap-3 text-slate-600 dark:text-slate-400">
                                <Gavel className="w-6 h-6" />
                                <h2 className="text-lg font-black uppercase tracking-widest">5. Governing Law</h2>
                            </div>
                            <div className="pl-9 text-slate-600 dark:text-slate-300 leading-relaxed">
                                <p>These terms shall be governed by and construed in accordance with the laws of India. Any disputes arising under these terms shall be subject to the exclusive jurisdiction of the courts located in Jaipur, Rajasthan.</p>
                            </div>
                        </section>

                    </div>

                    <div className="bg-slate-50 dark:bg-slate-900/50 p-6 text-center border-t border-slate-100 dark:border-slate-800">
                        <p className="text-xs text-slate-400 uppercase tracking-widest">
                            By using this app, you agree to these terms.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default TermsOfService;
