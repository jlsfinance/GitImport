import React from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { APP_NAME, SUPPORT_EMAIL, DEVELOPER_NAME } from '../constants';

const Terms: React.FC = () => {
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
                    Terms of Use
                </h1>
            </div>

            <div className="p-6 max-w-xl mx-auto w-full space-y-10">

                {/* LAST UPDATED */}
                <p className="text-xs text-gray-400 font-bold">
                    Last Updated: January 01, 2026 · These Terms govern your use of {APP_NAME} by {DEVELOPER_NAME}, built in India for personal and business record-keeping.
                </p>

                {/* CONTENTS */}
                <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 border border-gray-100 dark:border-gray-700">
                    <h3 className="font-black text-sm uppercase tracking-widest text-gray-400 mb-3">Contents</h3>
                    <ol className="text-xs font-bold text-gray-600 dark:text-gray-300 space-y-1 list-decimal list-inside">
                        <li>Acceptance & Eligibility</li>
                        <li>Accounts & Authentication</li>
                        <li>Organization Data</li>
                        <li>Plans, Billing & Refunds</li>
                        <li>Permitted Use & Restrictions</li>
                        <li>Privacy</li>
                        <li>Ownership & License</li>
                        <li>Disclaimer of Warranties</li>
                        <li>Limitation of Liability</li>
                        <li>Suspension & Termination</li>
                        <li>Governing Law</li>
                        <li>Contact</li>
                    </ol>
                </div>

                {/* DISCLAIMER BOX */}
                <div className="bg-indigo-600/10 border border-indigo-600/20 rounded-3xl p-6 shadow-inner">
                    <p className="text-indigo-700 dark:text-indigo-300 font-black text-xs uppercase tracking-widest leading-relaxed text-center">
                        ⚠️ {APP_NAME} is a RECORD-KEEPING application only.<br />
                        We do NOT provide financial services, credit, loans, or lending.
                    </p>
                </div>

                {/* SECTION 1 */}
                <Section title="1. Acceptance & Eligibility">
                    <p>
                        By installing or using {APP_NAME}, you agree to these Terms. The app is intended for personal and business use for record-keeping purposes.
                    </p>
                    <p>
                        <strong>You must be at least 18 years old</strong> to use this application.
                    </p>
                </Section>

                {/* SECTION 2 */}
                <Section title="2. Accounts & Authentication">
                    <p><strong>Creation & Login:</strong> Accounts are created and accessed with email/password or Google Sign-In. Each user must have their own account.</p>
                    <p><strong>Security:</strong> You are responsible for safeguarding your device and login credentials. Notify us immediately of any unauthorized use.</p>
                    <p><strong>Accuracy:</strong> You must ensure information entered is accurate and lawful.</p>
                </Section>

                {/* SECTION 3 */}
                <Section title="3. Organization Data">
                    <p>
                        Your organization controls the business records you input (customers, records, payments, installments, expenses). {APP_NAME} processes this data on your behalf to provide the service.
                    </p>
                    <p>
                        <strong>You are responsible</strong> for obtaining any required notices or consents from customers or team members under applicable laws.
                    </p>
                </Section>

                {/* SECTION 4 */}
                <Section title="4. Plans, Billing & Refunds">
                    <p>This app is currently <strong>FREE</strong> to use.</p>
                    <p>If paid plans are introduced in the future:</p>
                    <ul className="list-disc pl-5 space-y-1">
                        <li>Subscriptions will be handled through Google Play Billing only.</li>
                        <li>Pricing, renewal, and cancellation will be presented in-app via Google Play.</li>
                        <li>Refunds, if any, will be governed by Google Play policies and applicable law.</li>
                    </ul>
                </Section>

                {/* SECTION 5 */}
                <Section title="5. Permitted Use & Restrictions">
                    <p><strong>You agree NOT to:</strong></p>
                    <ul className="list-disc pl-5 space-y-1">
                        <li>Misuse, reverse engineer, interfere with, or attempt unauthorized access to the app.</li>
                        <li>Upload unlawful, infringing, or harmful content.</li>
                        <li>Represent this app as a lending, loan approval, or financial services platform.</li>
                        <li>Use reminders and messaging for harassment or spam.</li>
                        <li>Process data you are not authorized to handle.</li>
                    </ul>
                    <p className="mt-3">
                        <strong>Misuse may result in immediate account suspension.</strong>
                    </p>
                </Section>

                {/* SECTION 6 */}
                <Section title="6. Privacy">
                    <p>
                        Your use of the app is also governed by our <Link to="/records/privacy" className="text-indigo-600 font-bold hover:underline">Privacy Policy</Link>.
                    </p>
                </Section>

                {/* SECTION 7 */}
                <Section title="7. Ownership & License">
                    <p>
                        {APP_NAME}, including software and content, is owned or licensed by {DEVELOPER_NAME} and protected by intellectual property laws.
                    </p>
                    <p>
                        We grant you a <strong>limited, non-exclusive, non-transferable license</strong> to use the app for your personal or business record-keeping purposes, subject to these Terms.
                    </p>
                </Section>

                {/* SECTION 8 */}
                <Section title="8. Disclaimer of Warranties">
                    <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-4">
                        <p className="text-amber-800 dark:text-amber-300 text-xs font-bold">
                            The app is provided on an <strong>"AS IS"</strong> and <strong>"AS AVAILABLE"</strong> basis without warranties of any kind, express or implied.
                        </p>
                        <p className="text-amber-800 dark:text-amber-300 text-xs font-bold mt-2">
                            We do not warrant that the app will be uninterrupted, secure, or error-free.
                        </p>
                    </div>
                </Section>

                {/* SECTION 9 */}
                <Section title="9. Limitation of Liability">
                    <p>
                        To the maximum extent permitted by law, {DEVELOPER_NAME} will <strong>NOT</strong> be liable for any:
                    </p>
                    <ul className="list-disc pl-5 space-y-1">
                        <li>Indirect, incidental, special, or consequential damages</li>
                        <li>Loss of profits, revenue, data, or business opportunities</li>
                        <li>Disputes between users and their customers</li>
                        <li>Inaccuracies in user-entered data</li>
                    </ul>
                </Section>

                {/* SECTION 10 */}
                <Section title="10. Suspension & Termination">
                    <p>We may suspend or terminate your access if:</p>
                    <ul className="list-disc pl-5 space-y-1">
                        <li>You violate these Terms</li>
                        <li>You engage in fraud, abuse, or misrepresentation</li>
                        <li>Required by law</li>
                    </ul>
                    <p className="mt-3">
                        <strong>You may stop using the app at any time.</strong> You can delete your account via Settings → Delete My Account.
                    </p>
                </Section>

                {/* SECTION 11 */}
                <Section title="11. Governing Law">
                    <p>
                        These Terms are governed by applicable laws of India. Dispute resolution venue may vary based on your region and applicable law.
                    </p>
                </Section>

                {/* SECTION 12 */}
                <Section title="12. Contact">
                    <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 border border-gray-100 dark:border-gray-700 space-y-2">
                        <p><strong>Developer:</strong> {DEVELOPER_NAME}</p>
                        <p><strong>Email:</strong> {SUPPORT_EMAIL}</p>
                        <p><strong>Response Time:</strong> Within 48 hours</p>
                    </div>
                </Section>

                {/* FINAL DISCLAIMERS */}
                <div className="bg-red-50 dark:bg-red-900/20 border-2 border-red-200 dark:border-red-800 rounded-3xl p-6">
                    <h3 className="font-black text-red-700 dark:text-red-300 text-sm uppercase tracking-widest mb-3">⚠️ Important Disclaimers</h3>
                    <ul className="text-red-700 dark:text-red-300 font-bold text-xs space-y-2">
                        <li>• {APP_NAME} is a RECORD-KEEPING application only.</li>
                        <li>• We are NOT a bank, NBFC, lender, or payment processor.</li>
                        <li>• We do NOT provide loans, credit, or financial services.</li>
                        <li>• We are NOT regulated by RBI or any financial authority.</li>
                        <li>• All data is user-entered for reference purposes only.</li>
                        <li>• PDF exports are for reference only and have no legal enforceability.</li>
                        <li>• We do NOT participate in dispute resolution between users.</li>
                    </ul>
                </div>

            </div>
        </div>
    );
};

export default Terms;
