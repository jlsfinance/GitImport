import React from 'react';
import { useNavigate } from 'react-router-dom';
import { APP_NAME, SUPPORT_EMAIL } from '../constants';

const Privacy: React.FC = () => {
    const navigate = useNavigate();

    return (
        <div className="flex h-screen w-full flex-col bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white pb-20 overflow-y-auto font-sans">
            <div className="sticky top-0 z-10 bg-white/80 dark:bg-slate-950/80 backdrop-blur-md px-4 py-3 flex items-center gap-4 border-b border-slate-200 dark:border-slate-800 shadow-sm">
                <button onClick={() => navigate(-1)} className="p-2 -ml-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                    <span className="material-symbols-outlined">arrow_back</span>
                </button>
                <h1 className="text-lg font-bold">Privacy Policy</h1>
            </div>

            <div className="p-6 max-w-2xl mx-auto w-full space-y-8">
                {/* Non-Lending Disclaimer */}
                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4">
                    <div className="flex items-start gap-3">
                        <span className="material-symbols-outlined text-blue-600 dark:text-blue-400 mt-0.5">verified_user</span>
                        <div>
                            <h3 className="font-bold text-blue-800 dark:text-blue-300 text-sm">Non-Lending Entity Declaration</h3>
                            <p className="text-blue-700 dark:text-blue-400 text-xs mt-1 leading-relaxed">
                                {APP_NAME} is purely a management tool for personal record-keeping. We are <strong>NOT</strong> a lender, bank, or NBFC. We do not provide loans, process payments, or connect users with lenders. Your data remains yours.
                            </p>
                        </div>
                    </div>
                </div>

                <section className="space-y-3">
                    <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">1. Introduction</h2>
                    <p className="text-slate-600 dark:text-slate-400 leading-relaxed text-sm">
                        JLS Finance Suite ("we," "our," or "us") respects your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our mobile application.
                    </p>
                    <p className="text-slate-600 dark:text-slate-400 leading-relaxed text-sm">
                        This app **does not provide loans, financial products, or financial advice**. It is designed only to help users **record, manage, and view their own financial and loan-related data**.
                    </p>
                </section>

                <section className="space-y-4">
                    <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">2. Data We Collect</h2>
                    <p className="text-slate-600 dark:text-slate-400 leading-relaxed text-sm">
                        The app collects only the data that **users voluntarily enter**, such as:
                    </p>
                    <ul className="list-disc pl-5 mt-2 space-y-1 text-slate-600 dark:text-slate-400 text-sm">
                        <li>Name</li>
                        <li>Phone Number</li>
                        <li>Customer details</li>
                        <li>Loan records (amount, EMI dates, payment status)</li>
                        <li>Accounting entries</li>
                    </ul>
                    <p className="text-slate-600 dark:text-slate-400 leading-relaxed text-sm mt-3 font-semibold text-red-500">
                        ⚠️ Important: We do NOT collect bank credentials, OTPs, Aadhaar, PAN, or card details.
                    </p>
                </section>

                <section className="space-y-3">
                    <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">3. Purpose of Data Collection</h2>
                    <p className="text-slate-600 dark:text-slate-400 leading-relaxed text-sm">
                        Data is collected **only to provide core app functionality**, including:
                    </p>
                    <ul className="list-disc pl-5 mt-2 space-y-1 text-slate-600 dark:text-slate-400 text-sm">
                        <li>Accounting management</li>
                        <li>Loan record tracking</li>
                        <li>EMI schedules</li>
                        <li>Payment history</li>
                        <li>Optional reminders initiated by the user</li>
                    </ul>
                </section>

                <section className="space-y-3">
                    <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">4. Loan Disclaimer</h2>
                    <ul className="list-disc pl-5 mt-2 space-y-1 text-slate-600 dark:text-slate-400 text-sm">
                        <li>❌ Does NOT provide loans</li>
                        <li>❌ Does NOT approve or reject loans</li>
                        <li>❌ Does NOT act as a lender, NBFC, or financial institution</li>
                    </ul>
                    <p className="text-slate-600 dark:text-slate-400 leading-relaxed text-sm mt-2">
                        All loan-related data is **user-maintained for record-keeping purposes only**.
                    </p>
                </section>

                <section className="space-y-3">
                    <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">5. Data Storage & Security</h2>
                    <p className="text-slate-600 dark:text-slate-400 leading-relaxed text-sm">
                        Data is stored securely using industry-standard practices. Data is encrypted during transmission. We do not sell or share user data with third parties.
                        We adhere to a strict <strong>Zero Data Sharing</strong> policy. We do not sell, trade, or transfer your Personally Identifiable Information to outside parties, credit bureaus, or recovery agents.
                    </p>
                </section>

                <section className="space-y-3 bg-red-50 dark:bg-red-900/10 p-4 rounded-xl border border-red-100 dark:border-red-900/30">
                    <h2 className="text-xl font-bold text-red-700 dark:text-red-400">6. Account Deletion (Correction & Removal)</h2>
                    <p className="text-slate-600 dark:text-slate-400 leading-relaxed text-sm">
                        Users may request deletion of their account and associated data by emailing us from their registered email address.
                    </p>
                    <div className="mt-3 p-3 bg-white dark:bg-black/20 rounded-lg">
                        <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">Email: lovneetrathi@gmail.com</p>
                        <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">Subject: "Delete My Account"</p>
                        <p className="text-xs text-slate-500 mt-2">Account and data deletion will be completed within 7 working days.</p>
                    </div>
                </section>

                <section className="space-y-3">
                    <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">7. Policy for Children</h2>
                    <p className="text-slate-600 dark:text-slate-400 leading-relaxed text-sm">
                        We do not knowingly solicit information from or market to children under the age of 13.
                    </p>
                </section>

                <div className="pt-10 border-t border-slate-100 dark:border-slate-800 text-center text-xs text-slate-400">
                    <p className="font-bold text-sm text-slate-600 dark:text-slate-300 mb-2">Contact Us</p>
                    <p>Email: lovneetrathi@gmail.com</p>
                    <p>Phone: +91 94138 21007</p>
                    <p className="mt-4">Last updated: December 27, 2025</p>
                </div>
            </div>
        </div>
    );
};

export default Privacy;
