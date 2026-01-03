import React from 'react';
import { useNavigate } from 'react-router-dom';
import { APP_NAME, SUPPORT_EMAIL } from '../constants';

const RefundPolicy: React.FC = () => {
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
                    Refund Policy
                </h1>
            </div>

            <div className="p-6 max-w-xl mx-auto w-full space-y-10">

                {/* LAST UPDATED */}
                <p className="text-xs text-gray-400 font-bold">
                    Last Updated: January 01, 2026 · Clear terms for subscription refunds, cancellations, and billing disputes for our paid plans.
                </p>

                {/* CURRENT STATUS */}
                <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-3xl p-6">
                    <h3 className="font-black text-green-700 dark:text-green-300 text-sm uppercase tracking-widest mb-2">✅ Currently Free</h3>
                    <p className="text-green-700 dark:text-green-300 font-bold text-sm">
                        {APP_NAME} is currently <strong>FREE</strong> to use. No payment is required and there are no subscription charges at this time.
                    </p>
                </div>

                {/* SECTION 1 */}
                <Section title="1. Free App Policy">
                    <p>
                        {APP_NAME} is a free record-keeping application. All core features are available at no cost.
                    </p>
                    <p>
                        Since no payment is collected, no refund is applicable for free usage.
                    </p>
                </Section>

                {/* SECTION 2 */}
                <Section title="2. Future Paid Plans">
                    <p>
                        If we introduce paid subscription plans in the future:
                    </p>
                    <ul className="list-disc pl-5 space-y-1">
                        <li>All payments will be processed through <strong>Google Play Billing</strong></li>
                        <li>Subscription pricing will be clearly displayed before purchase</li>
                        <li>You can cancel anytime from Google Play Store</li>
                    </ul>
                </Section>

                {/* SECTION 3 */}
                <Section title="3. Google Play Refunds">
                    <p>
                        All subscription refunds (if applicable) are governed by Google Play policies:
                    </p>
                    <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-100 dark:border-gray-700 mt-2">
                        <ul className="text-xs space-y-2">
                            <li><strong>Within 48 hours:</strong> Request refund directly from Google Play</li>
                            <li><strong>After 48 hours:</strong> Contact our support for case-by-case review</li>
                            <li><strong>Annual plans:</strong> Prorated refunds may be available per Google's policy</li>
                        </ul>
                    </div>
                </Section>

                {/* SECTION 4 */}
                <Section title="4. How to Request Refund">
                    <p><strong>Method 1: Google Play Store</strong></p>
                    <ol className="list-decimal pl-5 space-y-1 text-xs">
                        <li>Open Google Play Store</li>
                        <li>Tap Menu → Subscriptions</li>
                        <li>Select {APP_NAME}</li>
                        <li>Tap "Cancel subscription" or "Request refund"</li>
                    </ol>
                    <p className="mt-3"><strong>Method 2: Contact Us</strong></p>
                    <p className="text-xs">
                        Email {SUPPORT_EMAIL} with your order ID and reason for refund request.
                    </p>
                </Section>

                {/* SECTION 5 */}
                <Section title="5. Cancellation">
                    <p>
                        You can cancel your subscription at any time:
                    </p>
                    <ul className="list-disc pl-5 space-y-1">
                        <li>Access continues until the end of the current billing period</li>
                        <li>No automatic renewal after cancellation</li>
                        <li>Your data remains accessible until account deletion</li>
                    </ul>
                </Section>

                {/* SECTION 6 */}
                <Section title="6. Non-Refundable">
                    <p>The following are NOT eligible for refunds:</p>
                    <ul className="list-disc pl-5 space-y-1">
                        <li>Partial month usage after the refund window</li>
                        <li>Account suspension due to Terms violation</li>
                        <li>Failure to cancel before renewal date</li>
                    </ul>
                </Section>

                {/* SECTION 7 */}
                <Section title="7. Contact">
                    <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 border border-gray-100 dark:border-gray-700 space-y-2">
                        <p><strong>Billing Support:</strong> {SUPPORT_EMAIL}</p>
                        <p><strong>Response Time:</strong> Within 48 hours</p>
                    </div>
                </Section>

            </div>
        </div>
    );
};

export default RefundPolicy;
