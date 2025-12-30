import React from 'react';
import { useNavigate } from 'react-router-dom';
import { APP_NAME, SUPPORT_EMAIL, SUPPORT_PHONE, DEVELOPER_NAME } from '../constants';

const Privacy: React.FC = () => {
    const navigate = useNavigate();

    return (
        <div className="flex h-screen w-full flex-col bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white pb-20 overflow-y-auto font-sans">
            <div className="sticky top-0 z-10 bg-white/80 dark:bg-slate-950/80 backdrop-blur-md px-4 py-3 flex items-center gap-4 border-b border-slate-200 dark:border-slate-800 shadow-sm" style={{ paddingTop: 'calc(0.75rem + env(safe-area-inset-top))' }}>
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
                        {APP_NAME} ("we," "our," or "us") respects your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our mobile application.
                    </p>
                    <p className="text-slate-600 dark:text-slate-400 leading-relaxed text-sm">
                        This app does not provide loans, financial products, or financial advice. It is designed only to help users record, manage, and view their own financial and loan-related data.
                    </p>
                </section>

                <section className="space-y-4">
                    <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">2. Data We Collect</h2>
                    <p className="text-slate-600 dark:text-slate-400 leading-relaxed text-sm">
                        The app collects only the data that users voluntarily enter:
                    </p>
                    <ul className="list-disc pl-5 mt-2 space-y-1 text-slate-600 dark:text-slate-400 text-sm">
                        <li>Name & Email Address</li>
                        <li>Phone Number</li>
                        <li>Customer details</li>
                        <li>Loan records (amount, EMI dates, payment status)</li>
                        <li>Accounting entries</li>
                        <li>Profile photos (optional)</li>
                    </ul>
                    <div className="bg-red-50 dark:bg-red-900/10 p-3 rounded-lg border border-red-100 dark:border-red-900/30">
                        <p className="text-red-600 dark:text-red-400 text-xs font-semibold">
                            ⚠️ We do NOT collect: Bank credentials, OTPs, Aadhaar, PAN, card details, location, SMS, or call logs.
                        </p>
                    </div>
                </section>

                {/* Permissions Section - NEW */}
                <section className="space-y-4">
                    <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">3. Permissions We Request</h2>

                    <div className="space-y-4">
                        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-100 dark:border-slate-800">
                            <div className="flex items-center gap-2 mb-2">
                                <span className="material-symbols-outlined text-indigo-500 text-lg">photo_camera</span>
                                <h4 className="font-bold text-slate-800 dark:text-white text-sm">Camera Access</h4>
                            </div>
                            <p className="text-slate-500 dark:text-slate-400 text-xs">
                                Used ONLY to take photos for customer profiles or documents. Photos are stored securely and never shared.
                            </p>
                        </div>



                        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-100 dark:border-slate-800">
                            <div className="flex items-center gap-2 mb-2">
                                <span className="material-symbols-outlined text-amber-500 text-lg">notifications</span>
                                <h4 className="font-bold text-slate-800 dark:text-white text-sm">Notifications</h4>
                            </div>
                            <p className="text-slate-500 dark:text-slate-400 text-xs">
                                Used to send EMI reminders and important updates. You can disable notifications in device settings anytime.
                            </p>
                        </div>

                        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-100 dark:border-slate-800">
                            <div className="flex items-center gap-2 mb-2">
                                <span className="material-symbols-outlined text-blue-500 text-lg">folder</span>
                                <h4 className="font-bold text-slate-800 dark:text-white text-sm">Storage Access</h4>
                            </div>
                            <p className="text-slate-500 dark:text-slate-400 text-xs">
                                Used to save and download PDF documents like receipts and loan agreements.
                            </p>
                        </div>
                    </div>
                </section>

                <section className="space-y-3">
                    <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">4. Purpose of Data Collection</h2>
                    <ul className="list-disc pl-5 mt-2 space-y-1 text-slate-600 dark:text-slate-400 text-sm">
                        <li>Accounting management</li>
                        <li>Loan record tracking</li>
                        <li>EMI schedules & reminders</li>
                        <li>Payment history</li>
                        <li>Receipt & agreement generation</li>
                    </ul>
                </section>

                <section className="space-y-3">
                    <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">5. Data Storage & Security</h2>
                    <ul className="list-none space-y-2 text-slate-600 dark:text-slate-400 text-sm">
                        <li className="flex items-start gap-2">
                            <span className="text-green-500">✓</span>
                            Data stored using Firebase (Google Cloud)
                        </li>
                        <li className="flex items-start gap-2">
                            <span className="text-green-500">✓</span>
                            Encrypted during transmission (TLS/SSL)
                        </li>
                        <li className="flex items-start gap-2">
                            <span className="text-green-500">✓</span>
                            Industry-standard security practices
                        </li>
                        <li className="flex items-start gap-2">
                            <span className="text-red-500">✗</span>
                            We do NOT sell or share data with third parties
                        </li>
                    </ul>
                </section>

                <section className="space-y-3">
                    <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">6. Third-Party Services</h2>
                    <p className="text-slate-600 dark:text-slate-400 leading-relaxed text-sm">
                        We use Firebase (Google) for authentication, secure data storage, and push notifications. These services comply with industry security standards.
                    </p>
                </section>

                <section className="space-y-3">
                    <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">7. Data Retention</h2>
                    <p className="text-slate-600 dark:text-slate-400 leading-relaxed text-sm">
                        We retain your data for as long as your account is active. Upon deletion request, all data is permanently removed within 7 working days.
                    </p>
                </section>

                <section className="space-y-3 bg-red-50 dark:bg-red-900/10 p-4 rounded-xl border border-red-100 dark:border-red-900/30">
                    <h2 className="text-xl font-bold text-red-700 dark:text-red-400">8. Account Deletion</h2>
                    <p className="text-slate-600 dark:text-slate-400 leading-relaxed text-sm">
                        You have the right to access, correct, and delete your data.
                    </p>
                    <div className="mt-3 p-3 bg-white dark:bg-black/20 rounded-lg">
                        <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">Email: {SUPPORT_EMAIL}</p>
                        <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">Subject: "Delete My Account"</p>
                        <p className="text-xs text-slate-500 mt-2">Deletion completed within 7 working days.</p>
                    </div>
                </section>

                <section className="space-y-3">
                    <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">9. Children's Privacy</h2>
                    <p className="text-slate-600 dark:text-slate-400 leading-relaxed text-sm">
                        This app is intended for users 18 years and above. We do not knowingly collect data from children under 18.
                    </p>
                </section>

                <section className="space-y-3">
                    <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">10. Your Rights</h2>
                    <ul className="list-disc pl-5 space-y-1 text-slate-600 dark:text-slate-400 text-sm">
                        <li>Access your data within the app</li>
                        <li>Correct any inaccurate data</li>
                        <li>Request complete account deletion</li>
                        <li>Opt-out of notifications anytime</li>
                    </ul>
                </section>

                <div className="pt-10 border-t border-slate-100 dark:border-slate-800 text-center text-xs text-slate-400">
                    <p className="font-bold text-sm text-slate-600 dark:text-slate-300 mb-2">Grievance Officer</p>
                    <p>{DEVELOPER_NAME}</p>
                    <p>Email: {SUPPORT_EMAIL}</p>
                    <p>Phone: {SUPPORT_PHONE}</p>
                    <p className="mt-4">Last updated: December 28, 2025</p>
                </div>
            </div>
        </div>
    );
};

export default Privacy;
