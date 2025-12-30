import React from 'react';
import { useNavigate } from 'react-router-dom';
import { APP_NAME, SUPPORT_EMAIL } from '../constants';

const Terms: React.FC = () => {
    const navigate = useNavigate();

    return (
        <div className="flex h-screen w-full flex-col bg-white dark:bg-slate-950 text-slate-900 dark:text-white pb-20 overflow-y-auto font-sans">
            <div className="sticky top-0 z-10 bg-white/80 dark:bg-slate-950/80 backdrop-blur-md px-4 py-3 flex items-center gap-4 border-b border-slate-200 dark:border-slate-800 shadow-sm">
                <button onClick={() => navigate(-1)} className="p-2 -ml-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                    <span className="material-symbols-outlined font-black">arrow_back</span>
                </button>
                <h1 className="text-lg font-black uppercase tracking-widest">Service Terms</h1>
            </div>

            <div className="p-6 max-w-2xl mx-auto w-full space-y-8">
                <div className="bg-indigo-600 p-8 rounded-[2rem] shadow-xl text-center">
                    <p className="text-white font-black text-lg leading-relaxed uppercase tracking-widest">
                        “This application is exclusively for personal transaction record management. We do not provide financial services, credits, or lending.”
                    </p>
                </div>

                <div className="bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-700 rounded-[2.5rem] p-8 shadow-sm">
                    <div className="flex items-center gap-4 mb-6">
                        <div className="w-10 h-10 rounded-2xl bg-indigo-600 flex items-center justify-center text-white shadow-lg">
                            <span className="material-symbols-outlined text-xl">info</span>
                        </div>
                        <h2 className="text-xl font-black text-indigo-600 uppercase tracking-widest leading-none">Record Disclosures</h2>
                    </div>

                    <div className="space-y-6">
                        <div>
                            <p className="text-gray-900 dark:text-white font-black uppercase tracking-widest text-[10px] mb-1">Tenure / Period:</p>
                            <p className="text-gray-500 font-bold text-sm">Defined by the user. Standard records may range from 3 months to 24 months.</p>
                        </div>
                        <div>
                            <p className="text-gray-900 dark:text-white font-black uppercase tracking-widest text-[10px] mb-1">Fee Cap:</p>
                            <p className="text-gray-500 font-bold text-sm">Maximum 36% including service fees. This is purely for demonstration and record-keeping purposes.</p>
                        </div>

                        <div className="bg-white dark:bg-gray-900 rounded-3xl p-6 border border-gray-100 dark:border-gray-800 shadow-inner">
                            <p className="text-gray-900 dark:text-white font-black uppercase tracking-widest text-[10px] mb-4">Sample Record Entry:</p>
                            <p className="text-gray-400 text-[10px] font-black uppercase mb-4 tracking-widest">Example for ₹10,000 at 24% for 12 months:</p>
                            <ul className="space-y-2">
                                <li className="flex justify-between text-sm">
                                    <span className="text-gray-400 font-bold">• Principal:</span>
                                    <span className="font-black">₹10,000</span>
                                </li>
                                <li className="flex justify-between text-sm">
                                    <span className="text-gray-400 font-bold">• Service Calc:</span>
                                    <span className="font-black">₹2,400</span>
                                </li>
                                <li className="flex justify-between text-sm pt-2 border-t border-gray-50 dark:border-gray-800 mt-2">
                                    <span className="text-gray-900 dark:text-white font-black">• Total Payable:</span>
                                    <span className="font-black text-indigo-600">₹12,400</span>
                                </li>
                                <li className="flex justify-between text-sm">
                                    <span className="text-gray-900 dark:text-white font-black">• Monthly Entry:</span>
                                    <span className="font-black text-indigo-600">₹1,033.33</span>
                                </li>
                            </ul>
                        </div>
                    </div>
                </div>

                <div className="space-y-10">
                    <section className="space-y-3">
                        <h2 className="text-xl font-black text-indigo-600 uppercase tracking-widest leading-tight">1. Usage</h2>
                        <p className="text-gray-500 font-bold leading-relaxed text-sm">
                            The {APP_NAME} platform is a digital interface for record maintenance. Any assessments or terms are solely between the managing entity and the customer.
                        </p>
                    </section>

                    <section className="space-y-3">
                        <h2 className="text-xl font-black text-indigo-600 uppercase tracking-widest leading-tight">2. Documentation</h2>
                        <p className="text-gray-500 font-bold leading-relaxed text-sm">
                            PDF generation of receipts and records is provided as a utility. {APP_NAME} does not verify the legal validity of uploaded or entered data.
                        </p>
                    </section>

                    <section className="space-y-3">
                        <h2 className="text-xl font-black text-indigo-600 uppercase tracking-widest leading-tight">3. Responsibility</h2>
                        <p className="text-gray-500 font-bold leading-relaxed text-sm">
                            Users are responsible for the accuracy of data entered. Defaults or disputes should be settled outside the application as per mutual agreements.
                        </p>
                    </section>
                </div>

                <div className="pt-10 border-t border-gray-100 dark:border-gray-800 text-center text-[10px] text-gray-400 font-black uppercase tracking-widest">
                    <p>Support: {SUPPORT_EMAIL}</p>
                    <p className="mt-1">Policy Updated: Dec 2025</p>
                </div>
            </div>
        </div>
    );
};

export default Terms;
