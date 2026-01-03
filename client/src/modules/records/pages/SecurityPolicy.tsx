import React from 'react';
import { useNavigate } from 'react-router-dom';
import { APP_NAME, SUPPORT_EMAIL } from '../constants';

const SecurityPolicy: React.FC = () => {
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

    const SecurityItem = ({ icon, title, desc }: { icon: string; title: string; desc: string }) => (
        <div className="flex gap-3 p-4 bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700">
            <span className="material-symbols-outlined text-green-600 text-2xl">{icon}</span>
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
                    Security Policy
                </h1>
            </div>

            <div className="p-6 max-w-xl mx-auto w-full space-y-10">

                {/* LAST UPDATED */}
                <p className="text-xs text-gray-400 font-bold">
                    Last Updated: January 01, 2026 · How we protect your financial data, implement security measures, and handle security incidents.
                </p>

                {/* SECURITY BADGE */}
                <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-3xl p-6 text-center">
                    <span className="material-symbols-outlined text-green-600 text-4xl mb-2">verified_user</span>
                    <h3 className="font-black text-green-700 dark:text-green-300 text-sm uppercase tracking-widest">Your Data is Protected</h3>
                    <p className="text-green-700 dark:text-green-300 font-bold text-xs mt-2">
                        We use industry-standard security measures to keep your data safe.
                    </p>
                </div>

                {/* SECTION 1 */}
                <Section title="1. Data Encryption">
                    <div className="space-y-3">
                        <SecurityItem
                            icon="lock"
                            title="Encryption in Transit"
                            desc="All data transmitted between your device and our servers uses HTTPS/TLS encryption."
                        />
                        <SecurityItem
                            icon="security"
                            title="Encryption at Rest"
                            desc="Data stored in our database is encrypted using industry-standard algorithms."
                        />
                    </div>
                </Section>

                {/* SECTION 2 */}
                <Section title="2. Authentication Security">
                    <div className="space-y-3">
                        <SecurityItem
                            icon="passkey"
                            title="Secure Authentication"
                            desc="Powered by Firebase Authentication with email/password or Google Sign-In."
                        />
                        <SecurityItem
                            icon="admin_panel_settings"
                            title="Session Management"
                            desc="Automatic session expiry and secure token refresh for continued protection."
                        />
                    </div>
                </Section>

                {/* SECTION 3 */}
                <Section title="3. Access Controls">
                    <p>We implement strict access controls:</p>
                    <ul className="list-disc pl-5 space-y-1">
                        <li><strong>Role-based access:</strong> Users can only access their own company data</li>
                        <li><strong>Least privilege:</strong> Minimal permissions required for each operation</li>
                        <li><strong>Audit logs:</strong> Key actions are logged for security monitoring</li>
                    </ul>
                </Section>

                {/* SECTION 4 */}
                <Section title="4. Infrastructure Security">
                    <p>{APP_NAME} is hosted on secure cloud infrastructure:</p>
                    <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-100 dark:border-gray-700 mt-2">
                        <ul className="text-xs space-y-2">
                            <li>✅ <strong>Firebase/Google Cloud:</strong> SOC 2 compliant infrastructure</li>
                            <li>✅ <strong>Cloudinary:</strong> ISO 27001 certified image hosting</li>
                            <li>✅ <strong>Vercel:</strong> Enterprise-grade deployment platform</li>
                        </ul>
                    </div>
                </Section>

                {/* SECTION 5 */}
                <Section title="5. Security Practices">
                    <ul className="list-disc pl-5 space-y-1">
                        <li>Regular security reviews and updates</li>
                        <li>Dependency vulnerability scanning</li>
                        <li>No storage of sensitive credentials client-side</li>
                        <li>Input validation and sanitization</li>
                    </ul>
                </Section>

                {/* SECTION 6 */}
                <Section title="6. What We Don't Do">
                    <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4">
                        <ul className="text-red-700 dark:text-red-300 font-bold text-xs space-y-1">
                            <li>❌ We never store passwords in plain text</li>
                            <li>❌ We never access your data without authorization</li>
                            <li>❌ We never sell your data to third parties</li>
                            <li>❌ We never request sensitive info via email</li>
                        </ul>
                    </div>
                </Section>

                {/* SECTION 7 */}
                <Section title="7. Reporting Security Issues">
                    <p>
                        If you discover a security vulnerability, please report it responsibly:
                    </p>
                    <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 border border-gray-100 dark:border-gray-700 space-y-2 mt-2">
                        <p><strong>Security Email:</strong> {SUPPORT_EMAIL}</p>
                        <p><strong>Subject:</strong> "Security Report - {APP_NAME}"</p>
                        <p><strong>Response Time:</strong> Within 24 hours</p>
                    </div>
                </Section>

                {/* SECTION 8 */}
                <Section title="8. Incident Response">
                    <p>In case of a security incident, we will:</p>
                    <ol className="list-decimal pl-5 space-y-1">
                        <li>Investigate and contain the issue immediately</li>
                        <li>Notify affected users within 72 hours</li>
                        <li>Implement fixes and preventive measures</li>
                        <li>Provide detailed incident report if requested</li>
                    </ol>
                </Section>

            </div>
        </div>
    );
};

export default SecurityPolicy;
