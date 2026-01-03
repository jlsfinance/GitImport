import React from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { SUPPORT_EMAIL } from '../constants';

const LegalDocuments: React.FC = () => {
    const navigate = useNavigate();

    const PolicyCard = ({ to, icon, title, desc, color }: { to: string; icon: string; title: string; desc: string; color: string }) => (
        <Link
            to={to}
            className={`block p-5 bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 hover:shadow-lg hover:scale-[1.02] transition-all`}
        >
            <div className="flex items-start gap-3">
                <span className={`material-symbols-outlined text-2xl ${color}`}>{icon}</span>
                <div>
                    <h3 className={`font-black text-sm ${color}`}>{title}</h3>
                    <p className="text-xs text-gray-500 mt-1">{desc}</p>
                </div>
            </div>
        </Link>
    );

    return (
        <div className="flex h-screen w-full flex-col bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white pb-24 overflow-y-auto font-sans">

            {/* HEADER */}
            <div className="sticky top-0 z-10 bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl px-4 py-4 flex items-center gap-4 border-b border-gray-100 dark:border-gray-800">
                <button onClick={() => navigate(-1)} className="p-2 -ml-2 rounded-2xl hover:bg-gray-100 dark:hover:bg-gray-800">
                    <span className="material-symbols-outlined">arrow_back</span>
                </button>
                <h1 className="text-lg font-black uppercase tracking-widest">
                    Legal Documents
                </h1>
            </div>

            <div className="p-6 max-w-xl mx-auto w-full space-y-8">

                {/* INTRO */}
                <div className="text-center">
                    <h2 className="text-2xl font-black text-gray-900 dark:text-white mb-2">Legal Documents</h2>
                    <p className="text-sm text-gray-500 font-bold">
                        Transparent policies and terms for our record management platform. Built with trust and compliance in mind.
                    </p>
                </div>

                {/* POLICY CARDS - Row 1 */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <PolicyCard
                        to="/records/privacy"
                        icon="shield"
                        title="Privacy Policy"
                        desc="How we collect, use, and protect your data. Learn about our commitment to your privacy and data security."
                        color="text-blue-600"
                    />
                    <PolicyCard
                        to="/records/terms"
                        icon="description"
                        title="Terms of Use"
                        desc="Terms and conditions for using our platform. Understand your rights and responsibilities as a user."
                        color="text-indigo-600"
                    />
                </div>

                {/* POLICY CARDS - Row 2 */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <PolicyCard
                        to="/records/cookie-policy"
                        icon="cookie"
                        title="Cookie Policy"
                        desc="Information about cookies and tracking technologies we use on our website and mobile application."
                        color="text-amber-600"
                    />
                    <PolicyCard
                        to="/records/refund-policy"
                        icon="paid"
                        title="Refund Policy"
                        desc="Clear terms for subscription refunds, cancellations, and billing disputes for our paid plans."
                        color="text-green-600"
                    />
                </div>

                {/* POLICY CARDS - Row 3 */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <PolicyCard
                        to="/records/security-policy"
                        icon="security"
                        title="Security Policy"
                        desc="How we protect your financial data, implement security measures, and handle security incidents."
                        color="text-teal-600"
                    />
                    <PolicyCard
                        to="/records/compliance"
                        icon="verified"
                        title="Compliance Statement"
                        desc="Our commitment to regulatory compliance, data protection laws, and financial industry standards."
                        color="text-purple-600"
                    />
                </div>

                {/* DELETE ACCOUNT CARD */}
                <div className="pt-4">
                    <PolicyCard
                        to="/records/delete-account"
                        icon="delete_forever"
                        title="Delete Account"
                        desc="Learn how to permanently delete your account and associated data. Available for all platforms."
                        color="text-red-600"
                    />
                </div>

                {/* FOOTER */}
                <div className="text-center pt-6 border-t border-gray-100 dark:border-gray-800">
                    <p className="text-xs text-gray-400 font-bold">
                        Last Updated: January 01, 2026 · Version 2.1.0
                    </p>
                    <p className="text-xs text-gray-400 mt-2">
                        Questions? Contact us at <a href={`mailto:${SUPPORT_EMAIL}`} className="text-indigo-600 hover:underline">{SUPPORT_EMAIL}</a>
                    </p>
                </div>

            </div>
        </div>
    );
};

export default LegalDocuments;
