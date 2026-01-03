import React, { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { APP_NAME } from '../constants';

const TermsPolicy: React.FC = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const type = location.pathname.includes('privacy') ? 'privacy' : 'terms';

    useEffect(() => {
        window.scrollTo(0, 0);
    }, [type]);

    const Header = ({ title }: { title: string }) => (
        <>
            <button
                onClick={() => navigate(-1)}
                className="mb-6 flex items-center gap-2 text-blue-600 font-bold text-sm hover:underline"
            >
                ← Back
            </button>
            <h1 className="text-3xl font-black mb-6">{title}</h1>
            <p className="text-xs text-slate-500 mb-8">
                Last Updated: {new Date().toLocaleDateString()}
            </p>
        </>
    );

    if (type === 'privacy') {
        return (
            <div className="min-h-screen bg-slate-50 dark:bg-slate-900 p-6">
                <div className="max-w-3xl mx-auto bg-white dark:bg-slate-800 p-8 rounded-3xl shadow-sm text-sm leading-relaxed text-slate-700 dark:text-slate-300">

                    <Header title="Privacy Policy" />

                    {/* GLOBAL DISCLAIMER */}
                    <div className="mb-8 p-4 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
                        <p className="font-bold text-red-700 dark:text-red-300">
                            This application is a record‑keeping utility only. It does not
                            facilitate, provide, or mediate financial or lending services.
                        </p>
                    </div>

                    <h3 className="text-lg font-bold">1. Application Scope</h3>
                    <p>
                        {APP_NAME} is designed exclusively for maintaining transaction,
                        instalment, and payment records. All records are entered manually by
                        users for their own reference and documentation purposes.
                    </p>

                    <h3 className="text-lg font-bold mt-6">2. Information We Collect</h3>
                    <ul className="list-disc pl-5 space-y-2">
                        <li><b>Account Information:</b> Name, phone number or email for authentication.</li>
                        <li><b>User‑Entered Records:</b> Transaction values, dates, notes.</li>
                        <li><b>Basic App Data:</b> App version and operating system for stability.</li>
                    </ul>

                    <p className="mt-3 font-semibold">
                        We do NOT collect Aadhaar, PAN, location, SMS, call logs, contacts, or media files.
                    </p>

                    <h3 className="text-lg font-bold mt-6">3. Purpose of Data Usage</h3>
                    <p>
                        Data is used strictly to enable features explicitly requested by the user,
                        such as viewing records, generating summaries, and exporting documents.
                    </p>

                    <h3 className="text-lg font-bold mt-6">4. Data Retention & Deletion</h3>
                    <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl border">
                        <ul className="list-disc pl-5 space-y-2">
                            <li>
                                Records may be retained for up to <b>7 years</b> for long‑term reference.
                            </li>
                            <li>
                                Users may delete their account at any time via
                                <b> Settings → Delete Account</b>.
                            </li>
                            <li>
                                Upon deletion, data is permanently removed within <b>30 days</b>.
                            </li>
                        </ul>
                    </div>

                    <h3 className="text-lg font-bold mt-6">5. Financial & Regulatory Disclaimer</h3>
                    <p>
                        {APP_NAME} is not regulated by the Reserve Bank of India or any other authority,
                        as it does not provide regulated financial services.
                    </p>

                    <h3 className="text-lg font-bold mt-6">6. User Responsibility</h3>
                    <p>
                        Users are solely responsible for the accuracy, legality, and validity of
                        any data entered. The application does not verify or audit records.
                    </p>

                    <h3 className="text-lg font-bold mt-6">7. Third‑Party Data Sharing</h3>
                    <p>
                        For core functionality, we use cloud infrastructure providers (like Firebase).
                        <b> Profile Images:</b> Any profile images or logos uploaded are hosted securely
                        on <b>Cloudinary</b>. No other data is shared with external parties for
                        marketing or independent use.
                    </p>

                    <h3 className="text-lg font-bold mt-6">8. Grievance & Contact</h3>
                    <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-xl border">
                        <p><b>Grievance Officer (Data Protection Contact)</b></p>
                        <p>Name: Lavneet Rathi</p>
                        <p>
                            Email:{' '}
                            <a href="mailto:lovneetrathi@gmail.com" className="underline">
                                lovneetrathi@gmail.com
                            </a>
                        </p>
                        <p>Response Time: Within 48 hours</p>
                    </div>

                </div>
            </div>
        );
    }

    /* ================= TERMS ================= */

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-900 p-6">
            <div className="max-w-3xl mx-auto bg-white dark:bg-slate-800 p-8 rounded-3xl shadow-sm text-sm leading-relaxed text-slate-700 dark:text-slate-300">

                <Header title="Terms and Conditions" />

                <h3 className="text-lg font-bold">1. Nature of Service</h3>
                <p>
                    {APP_NAME} is a digital ledger system that allows users to maintain
                    transaction and instalment records. It does not participate in any
                    financial agreement.
                </p>

                <div className="mt-4 p-4 bg-red-50 dark:bg-red-900/20 rounded-xl border">
                    <p className="font-bold">
                        IMPORTANT: {APP_NAME} is NOT a bank, NBFC, lender, or credit provider.
                    </p>
                </div>

                <h3 className="text-lg font-bold mt-6">2. Record Examples & Calculations</h3>
                <p>
                    Any calculations shown (such as monthly values or totals) are generated
                    purely for record representation and convenience.
                </p>

                <h3 className="text-lg font-bold mt-6">3. Documentation & PDFs</h3>
                <p>
                    PDF exports are generated for reference only. {APP_NAME} does not guarantee
                    legal enforceability of generated documents.
                </p>

                <h3 className="text-lg font-bold mt-6">4. Prohibited Use</h3>
                <ul className="list-disc pl-5 space-y-2">
                    <li>Using the app to falsely claim credit or financial approvals</li>
                    <li>Misrepresenting records as official financial advice</li>
                    <li>Using the app for unlawful purposes</li>
                </ul>

                <h3 className="text-lg font-bold mt-6">5. Limitation of Liability</h3>
                <p>
                    {APP_NAME} shall not be liable for disputes, losses, or damages arising
                    from reliance on user‑entered data.
                </p>

                <h3 className="text-lg font-bold mt-6">6. Termination</h3>
                <p>
                    Accounts may be suspended or terminated if misuse or policy violation
                    is detected.
                </p>

                <h3 className="text-lg font-bold mt-6">7. Contact</h3>
                <p>
                    For support:{' '}
                    <a href="mailto:lovneetrathi@gmail.com" className="underline">
                        lovneetrathi@gmail.com
                    </a>
                </p>

            </div>
        </div>
    );
};

export default TermsPolicy;
