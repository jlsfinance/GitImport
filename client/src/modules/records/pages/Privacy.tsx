import React from 'react';
import { useNavigate } from 'react-router-dom';
import { APP_NAME, SUPPORT_EMAIL, DEVELOPER_NAME } from '../constants';

const Privacy: React.FC = () => {
    const navigate = useNavigate();

    return (
        <div className="flex h-screen w-full flex-col bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white pb-24 overflow-y-auto font-sans">
            <div className="sticky top-0 z-10 bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl px-4 py-4 flex items-center gap-4 border-b border-gray-100 dark:border-gray-800">
                <button onClick={() => navigate(-1)} className="p-2 -ml-2 rounded-2xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                    <span className="material-symbols-outlined font-black">arrow_back</span>
                </button>
                <h1 className="text-lg font-black uppercase tracking-widest">Privacy Policy</h1>
            </div>

            <div className="p-6 max-w-xl mx-auto w-full space-y-8">
                <div className="bg-indigo-600/10 border border-indigo-600/20 rounded-3xl p-6 shadow-inner">
                    <div className="flex items-start gap-4">
                        <span className="material-symbols-outlined text-indigo-600">verified_user</span>
                        <div>
                            <h3 className="font-black text-indigo-600 uppercase tracking-widest text-xs mb-1">Entity Declaration</h3>
                            <p className="text-indigo-600/70 font-bold text-[10px] leading-relaxed">
                                {APP_NAME} is a personal management tool for record-keeping. We are <strong>NOT</strong> a financial provider, bank, or NBFC. We do not provide credits, process payments, or facilitate lending.
                            </p>
                        </div>
                    </div>
                </div>

                <section className="space-y-3">
                    <h2 className="text-lg font-black uppercase tracking-widest text-gray-900 dark:text-white">1. Scope</h2>
                    <p className="text-gray-500 font-bold text-sm leading-relaxed">
                        This policy outlines how we handle data entered into {APP_NAME}. The app is designed for recording, managing, and viewing personal transaction histories.
                    </p>
                </section>

                <section className="space-y-4">
                    <h2 className="text-lg font-black uppercase tracking-widest text-gray-900 dark:text-white">2. Data Usage</h2>
                    <p className="text-gray-500 font-bold text-sm">We process data voluntarily provided by the user:</p>
                    <ul className="space-y-2">
                        <li className="flex items-center gap-2 text-xs font-bold text-gray-400 uppercase tracking-widest"><span className="text-indigo-600">•</span> Identification details</li>
                        <li className="flex items-center gap-2 text-xs font-bold text-gray-400 uppercase tracking-widest"><span className="text-indigo-600">•</span> Transaction records</li>
                        <li className="flex items-center gap-2 text-xs font-bold text-gray-400 uppercase tracking-widest"><span className="text-indigo-600">•</span> Contact information</li>
                    </ul>
                    <div className="bg-rose-50 dark:bg-rose-900/10 p-4 rounded-2xl border border-rose-100 dark:border-rose-900/30">
                        <p className="text-rose-600 font-black text-[10px] uppercase tracking-widest">
                            ⚠️ We DO NOT collect: Banking OTPs, Aadhaar, PAN, Location, SMS, or Call Logs.
                        </p>
                    </div>
                </section>

                <section className="space-y-4">
                    <h2 className="text-lg font-black uppercase tracking-widest text-gray-900 dark:text-white">3. Access Rights</h2>
                    <div className="grid grid-cols-1 gap-3">
                        <div className="bg-white dark:bg-gray-800 p-5 rounded-3xl border border-gray-100 dark:border-gray-700 shadow-sm">
                            <h4 className="font-black text-indigo-600 uppercase tracking-widest text-[10px] mb-2 flex items-center gap-2">
                                <span className="material-symbols-outlined text-sm">photo_camera</span> Media
                            </h4>
                            <p className="text-gray-400 font-bold text-[10px]">Used ONLY for profile images. Stored securely.</p>
                        </div>
                        <div className="bg-white dark:bg-gray-800 p-5 rounded-3xl border border-gray-100 dark:border-gray-700 shadow-sm">
                            <h4 className="font-black text-amber-600 uppercase tracking-widest text-[10px] mb-2 flex items-center gap-2">
                                <span className="material-symbols-outlined text-sm">notifications</span> Alerts
                            </h4>
                            <p className="text-gray-400 font-bold text-[10px]">Used for schedule reminders and status updates.</p>
                        </div>
                        <div className="bg-white dark:bg-gray-800 p-5 rounded-3xl border border-gray-100 dark:border-gray-700 shadow-sm">
                            <h4 className="font-black text-blue-600 uppercase tracking-widest text-[10px] mb-2 flex items-center gap-2">
                                <span className="material-symbols-outlined text-sm">folder</span> Download
                            </h4>
                            <p className="text-gray-400 font-bold text-[10px]">Used to save PDF records and receipts locally.</p>
                        </div>
                    </div>
                </section>

                <section className="space-y-3">
                    <h2 className="text-lg font-black uppercase tracking-widest text-gray-900 dark:text-white">4. Security</h2>
                    <p className="text-gray-500 font-bold text-sm leading-relaxed">
                        Data is stored via Firebase (Google Cloud) with enterprise-grade encryption. We never sell or exchange your data with third parties.
                    </p>
                </section>

                <section className="space-y-3 bg-rose-600 p-6 rounded-[2.5rem] shadow-xl text-white">
                    <h2 className="text-lg font-black uppercase tracking-widest mb-2">5. Data Deletion</h2>
                    <p className="font-bold text-xs opacity-90 leading-relaxed mb-4">
                        You have the total right to remove your data. Requests are processed within 7 working days.
                    </p>
                    <div className="bg-white/10 rounded-2xl p-4 font-black text-[10px] uppercase tracking-widest">
                        <p>Mail: {SUPPORT_EMAIL}</p>
                        <p className="mt-1">Subject: REMOVE ACCOUNT</p>
                    </div>
                </section>

                <div className="pt-10 border-t border-gray-100 dark:border-gray-800 text-center text-[10px] text-gray-400 font-black uppercase tracking-[0.2em]">
                    <p>{DEVELOPER_NAME} — Grievance Officer</p>
                    <p className="mt-2">Updated: DEC 2025</p>
                </div>
            </div>
        </div>
    );
};

export default Privacy;
