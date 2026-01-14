import React from 'react';
import { useNavigate } from 'react-router-dom';
import { APP_NAME, SUPPORT_EMAIL, DEVELOPER_NAME } from '../constants';

const ComplianceStatement: React.FC = () => {
    const navigate = useNavigate();

    const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
        <section className="space-y-3">
            <h2 className="text-lg font-black uppercase tracking-widest text-gray-900 dark:text-white">
                {title}
            </h2>
            <div className="text-gray-500 dark:text-gray-300 font-bold text-sm leading-relaxed space-y-3">
                {children}
            </div>
        </section>
    );

    return (
        <div className="flex h-screen w-full flex-col bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white pb-24 overflow-y-auto font-sans">

            {/* HEADER */}
            <div className="sticky top-0 z-10 bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl px-4 py-4 flex items-center gap-4 border-b border-gray-100 dark:border-gray-800">
                <button onClick={() => navigate(-1)} className="p-2 -ml-2 rounded-2xl hover:bg-gray-100 dark:hover:bg-gray-800">
                    <span className="material-symbols-outlined">arrow_back</span>
                </button>
                <h1 className="text-lg font-black uppercase tracking-widest">
                    Compliance Statement
                </h1>
            </div>

            <div className="p-6 max-w-xl mx-auto w-full space-y-10">

                {/* LAST UPDATED */}
                <p className="text-xs text-gray-400 font-bold">
                    Last Updated: January 01, 2026 · Our commitment to regulatory compliance, data protection laws, and industry standards.
                </p>

                {/* KEY STATEMENT */}
                <div className="bg-indigo-600/10 border border-indigo-600/20 rounded-3xl p-6">
                    <h3 className="font-black text-indigo-700 dark:text-indigo-300 text-sm uppercase tracking-widest mb-3">📋 Regulatory Status</h3>
                    <p className="text-indigo-700 dark:text-indigo-300 font-bold text-sm">
                        {APP_NAME} is a <strong>record-keeping utility</strong> and is NOT a financial services provider. We are NOT regulated by RBI, SEBI, or any financial regulatory authority because we do NOT:
                    </p>
                    <ul className="text-indigo-700 dark:text-indigo-300 font-bold text-xs mt-3 space-y-1">
                        <li>• Provide loans or credit</li>
                        <li>• Process payments</li>
                        <li>• Accept deposits</li>
                        <li>• Offer investment advice</li>
                    </ul>
                </div>

                {/* SECTION 1 */}
                <Section title="1. What We Are">
                    <p>
                        {APP_NAME} is a <strong>personal/business record-keeping application</strong> that allows users to:
                    </p>
                    <ul className="list-disc pl-5 space-y-1">
                        <li>Maintain digital records of transactions</li>
                        <li>Track customer information</li>
                        <li>Generate PDF reports for personal use</li>
                        <li>Set reminders for follow-ups</li>
                    </ul>
                </Section>

                {/* SECTION 2 */}
                <Section title="2. What We Are NOT">
                    <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4">
                        <ul className="text-red-700 dark:text-red-300 font-bold text-xs space-y-1">
                            <li>❌ NOT a bank or NBFC</li>
                            <li>❌ NOT a lender or credit provider</li>
                            <li>❌ NOT a payment processor or gateway</li>
                            <li>❌ NOT a debt collection agency</li>
                            <li>❌ NOT a financial advisor</li>
                            <li>❌ NOT regulated by RBI, SEBI, or any financial authority</li>
                        </ul>
                    </div>
                </Section>

                {/* SECTION 3 */}
                <Section title="3. Data Protection Compliance">
                    <p>We are committed to data protection principles:</p>
                    <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-100 dark:border-gray-700 mt-2">
                        <ul className="text-xs space-y-2">
                            <li>✅ <strong>IT Act 2000 (India):</strong> Compliance with reasonable security practices</li>
                            <li>✅ <strong>SPDI Rules 2011:</strong> Protection of sensitive personal data</li>
                            <li>✅ <strong>GDPR Principles:</strong> Data minimization, purpose limitation, user rights</li>
                        </ul>
                    </div>
                </Section>

                {/* SECTION 4 */}
                <Section title="4. Google Play Policy Compliance">
                    <p>We comply with Google Play Developer Program Policies:</p>
                    <ul className="list-disc pl-5 space-y-1">
                        <li>Accurate app description and metadata</li>
                        <li>Proper permission usage and disclosure</li>
                        <li>User data protection and privacy</li>
                        <li>Clear billing practices (Google Play Billing only)</li>
                        <li>No deceptive behavior or misleading claims</li>
                    </ul>
                </Section>

                {/* SECTION 5 */}
                <Section title="5. User Data Rights">
                    <p>You have the following rights regarding your data:</p>
                    <div className="space-y-2 mt-2">
                        <div className="flex items-center gap-2 p-3 bg-white dark:bg-gray-800 rounded-lg border border-gray-100 dark:border-gray-700">
                            <span className="material-symbols-outlined text-green-600">visibility</span>
                            <span className="text-xs font-bold">Access: View all your stored data</span>
                        </div>
                        <div className="flex items-center gap-2 p-3 bg-white dark:bg-gray-800 rounded-lg border border-gray-100 dark:border-gray-700">
                            <span className="material-symbols-outlined text-blue-600">edit</span>
                            <span className="text-xs font-bold">Rectify: Correct any inaccurate data</span>
                        </div>
                        <div className="flex items-center gap-2 p-3 bg-white dark:bg-gray-800 rounded-lg border border-gray-100 dark:border-gray-700">
                            <span className="material-symbols-outlined text-red-600">delete</span>
                            <span className="text-xs font-bold">Delete: Request complete data deletion</span>
                        </div>
                        <div className="flex items-center gap-2 p-3 bg-white dark:bg-gray-800 rounded-lg border border-gray-100 dark:border-gray-700">
                            <span className="material-symbols-outlined text-purple-600">download</span>
                            <span className="text-xs font-bold">Portability: Export your data as PDF/reports</span>
                        </div>
                    </div>
                </Section>

                {/* SECTION 6 */}
                <Section title="6. Third-Party Compliance">
                    <p>Our third-party providers maintain their own compliance standards:</p>
                    <ul className="list-disc pl-5 space-y-1">
                        <li><strong>Firebase (Google):</strong> SOC 1/2/3, ISO 27001, GDPR compliant</li>
                        <li><strong>Cloudinary:</strong> ISO 27001, SOC 2 Type II certified</li>
                        <li><strong>Google Play Billing:</strong> PCI DSS compliant</li>
                    </ul>
                </Section>

                {/* SECTION 7 */}
                <Section title="7. Grievance Redressal">
                    <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 border border-gray-100 dark:border-gray-700 space-y-2">
                        <p><strong>Grievance Officer:</strong> {DEVELOPER_NAME}</p>
                        <p><strong>Email:</strong> {SUPPORT_EMAIL}</p>
                        <p><strong>Response Time:</strong> Within 48 hours</p>
                        <p><strong>Resolution Time:</strong> Within 30 days</p>
                    </div>
                </Section>

            </div>
        </div>
    );
};

export default ComplianceStatement;
