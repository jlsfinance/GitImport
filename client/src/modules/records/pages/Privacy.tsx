import React from 'react';
import { useNavigate } from 'react-router-dom';
import { APP_NAME, SUPPORT_EMAIL, DEVELOPER_NAME } from '../constants';

const Privacy: React.FC = () => {
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

    const PermissionItem = ({ icon, title, desc }: { icon: string; title: string; desc: string }) => (
        <div className="flex gap-3 p-3 bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700">
            <span className="material-symbols-outlined text-indigo-600">{icon}</span>
            <div>
                <p className="font-black text-sm text-gray-900 dark:text-white">{title}</p>
                <p className="text-xs text-gray-500">{desc}</p>
            </div>
        </div>
    );

    return (
        <div className="flex h-screen w-full flex-col bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white pb-24 overflow-y-auto font-sans">

            {/* HEADER */}
            <div className="sticky top-0 z-10 bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl px-4 py-4 flex items-center gap-4 border-b border-gray-100 dark:border-gray-800">
                <button onClick={() => navigate(-1)} className="p-2 -ml-2 rounded-2xl hover:bg-gray-100 dark:hover:bg-gray-800">
                    <span className="material-symbols-outlined">arrow_back</span>
                </button>
                <h1 className="text-lg font-black uppercase tracking-widest">
                    Privacy Policy
                </h1>
            </div>

            <div className="p-6 max-w-xl mx-auto w-full space-y-10">

                {/* LAST UPDATED */}
                <p className="text-xs text-gray-400 font-bold">
                    Last Updated: January 01, 2026 · {APP_NAME} is a product by {DEVELOPER_NAME}. Built in India for personal and business record-keeping.
                </p>

                {/* QUICK SUMMARY */}
                <div className="bg-indigo-600/10 border border-indigo-600/20 rounded-3xl p-6 shadow-inner">
                    <h3 className="font-black text-indigo-700 dark:text-indigo-300 text-sm uppercase tracking-widest mb-3">⚡ Quick Summary</h3>
                    <ul className="text-indigo-700 dark:text-indigo-300 font-bold text-xs space-y-2">
                        <li>• We collect Name, Email, Phone for account login (OTP) and app operation.</li>
                        <li>• Customer, record, payment, and expense data is business data YOU add. {APP_NAME} processes this data for your organization.</li>
                        <li>• We use Firebase (auth/hosting/analytics) and Cloudinary (image hosting). We do NOT sell personal data.</li>
                        <li>• We do NOT access contacts, SMS, call logs, or location.</li>
                        <li>• This is a RECORD-KEEPING app only. We are NOT a bank, lender, or NBFC.</li>
                    </ul>
                </div>

                {/* CONTENTS */}
                <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 border border-gray-100 dark:border-gray-700">
                    <h3 className="font-black text-sm uppercase tracking-widest text-gray-400 mb-3">Contents</h3>
                    <ol className="text-xs font-bold text-gray-600 dark:text-gray-300 space-y-1 list-decimal list-inside">
                        <li>Information We Collect</li>
                        <li>How We Use Information</li>
                        <li>App Permissions (Android)</li>
                        <li>Third-Party Services</li>
                        <li>Sharing & Transfers</li>
                        <li>Retention & Deletion</li>
                        <li>Security</li>
                        <li>Children's Privacy</li>
                        <li>Changes</li>
                        <li>Contact</li>
                    </ol>
                </div>

                {/* SECTION 1 */}
                <Section title="1. Information We Collect">
                    <p><strong>Account & Profile:</strong> Name, Email, Phone (for OTP login).</p>
                    <p><strong>Business Records you provide:</strong> Customers, records, payments, installments, expenses.</p>
                    <p><strong>Device & Usage:</strong> Crash logs, performance diagnostics for app stability.</p>
                    <p><strong>Media you upload:</strong> Images (e.g., receipts, customer photos, company logos).</p>
                    <p className="text-amber-600 dark:text-amber-400">
                        <strong>⚠️ We do NOT collect:</strong> Aadhaar, PAN, bank details, SMS, call logs, contacts, or location.
                    </p>
                </Section>

                {/* SECTION 2 */}
                <Section title="2. How We Use Information">
                    <ul className="list-disc pl-5 space-y-1">
                        <li><strong>App functionality:</strong> OTP login, showing records/profiles, reminders, dashboards.</li>
                        <li><strong>Account management:</strong> Creating and managing user accounts.</li>
                        <li><strong>Analytics & diagnostics:</strong> App stability, performance, UX improvements.</li>
                        <li><strong>Security:</strong> Protecting accounts and detecting abuse.</li>
                    </ul>
                </Section>

                {/* SECTION 3 */}
                <Section title="3. App Permissions (Android)">
                    <p className="text-xs text-gray-400 mb-3">
                        All permissions are optional except INTERNET. We request only what's needed.
                    </p>
                    <div className="space-y-2">
                        <PermissionItem icon="wifi" title="INTERNET" desc="Connect to cloud services and sync data" />
                        <PermissionItem icon="notifications" title="POST_NOTIFICATIONS" desc="Record reminders and system updates" />
                        <PermissionItem icon="photo_camera" title="CAMERA" desc="Capture receipts and profile photos" />
                        <PermissionItem icon="image" title="READ_MEDIA_IMAGES" desc="Attach images to records" />
                        <PermissionItem icon="download" title="WRITE_EXTERNAL_STORAGE" desc="Save PDFs and reports locally" />
                        <PermissionItem icon="alarm" title="SCHEDULE_EXACT_ALARM" desc="Precise reminder scheduling" />
                        <PermissionItem icon="vibration" title="VIBRATE" desc="Haptic feedback for notifications" />
                    </div>
                    <div className="mt-4 p-3 bg-green-50 dark:bg-green-900/20 rounded-xl border border-green-200 dark:border-green-800">
                        <p className="text-xs font-bold text-green-700 dark:text-green-300">
                            🔒 <strong>Privacy Note:</strong> We do NOT request Contacts, Location, SMS, Call Logs, or Phone State permissions.
                        </p>
                    </div>
                </Section>

                {/* SECTION 4 */}
                <Section title="4. Third-Party Services">
                    <ul className="list-disc pl-5 space-y-2">
                        <li><strong>Firebase (Google):</strong> Authentication, cloud storage, analytics, crash monitoring, push notifications (FCM).</li>
                        <li><strong>Cloudinary:</strong> Secure image hosting for profile photos and logos.</li>
                        <li><strong>jsPDF:</strong> Local PDF generation (no data sent externally).</li>
                    </ul>
                    <p className="mt-3">
                        <strong>FCM Tokens:</strong> When you enable notifications, a token is generated and stored to deliver reminders. Tokens are deleted on logout/uninstall.
                    </p>
                </Section>

                {/* SECTION 5 */}
                <Section title="5. Sharing & Transfers">
                    <p>
                        <strong>We do NOT sell personal information.</strong> Data is shared only with our service providers (Firebase, Cloudinary) under contracts limiting use to providing services.
                    </p>
                    <p>
                        Your organization controls business data; {APP_NAME} processes it on your behalf. Data may be processed in other regions via our cloud providers.
                    </p>
                </Section>

                {/* SECTION 6 */}
                <Section title="6. Retention & Deletion">
                    <p>We retain account and business records while your account is active or as required by law.</p>
                    <ul className="list-disc pl-5 space-y-1 mt-2">
                        <li><strong>Financial Records:</strong> Up to 7 years for legal compliance.</li>
                        <li><strong>User Profile:</strong> Deleted within 30 days of deletion request.</li>
                        <li><strong>FCM Tokens:</strong> Deleted immediately on logout.</li>
                    </ul>
                    <p className="mt-3">
                        <strong>Delete your data:</strong> Go to Settings → Delete My Account, or email {SUPPORT_EMAIL}.
                    </p>
                </Section>

                {/* SECTION 7 */}
                <Section title="7. Security">
                    <p>
                        Data in transit is protected with HTTPS/TLS. We apply role-based access, least-privilege controls, and industry practices.
                    </p>
                    <p>
                        No method is 100% secure, but we continually improve safeguards.
                    </p>
                </Section>

                {/* SECTION 8 */}
                <Section title="8. Children's Privacy">
                    <p>
                        {APP_NAME} is intended for business use and is not directed to individuals under 18 years of age.
                    </p>
                </Section>

                {/* SECTION 9 */}
                <Section title="9. Changes">
                    <p>
                        We may update this Policy periodically. We will post changes in the app with a new "Last Updated" date. Continued use implies acceptance.
                    </p>
                </Section>

                {/* SECTION 10 */}
                <Section title="10. Contact & Grievance">
                    <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 border border-gray-100 dark:border-gray-700 space-y-2">
                        <p><strong>Grievance Officer:</strong> {DEVELOPER_NAME}</p>
                        <p><strong>Email:</strong> {SUPPORT_EMAIL}</p>
                        <p><strong>Response Time:</strong> Within 48 hours</p>
                    </div>
                </Section>

                {/* DISCLAIMERS */}
                <div className="bg-red-50 dark:bg-red-900/20 border-2 border-red-200 dark:border-red-800 rounded-3xl p-6">
                    <h3 className="font-black text-red-700 dark:text-red-300 text-sm uppercase tracking-widest mb-3">⚠️ Important Disclaimers</h3>
                    <ul className="text-red-700 dark:text-red-300 font-bold text-xs space-y-2">
                        <li>• {APP_NAME} is a RECORD-KEEPING application only.</li>
                        <li>• We are NOT a bank, NBFC, lender, or payment processor.</li>
                        <li>• We do NOT provide loans, credit, or financial services.</li>
                        <li>• We are NOT regulated by RBI or any financial authority.</li>
                        <li>• All data is user-entered for reference purposes only.</li>
                    </ul>
                </div>

            </div>
        </div>
    );
};

export default Privacy;
