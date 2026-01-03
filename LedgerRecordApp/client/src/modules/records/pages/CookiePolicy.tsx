import React from 'react';
import { useNavigate } from 'react-router-dom';
import { APP_NAME, SUPPORT_EMAIL, DEVELOPER_NAME } from '../constants';

const CookiePolicy: React.FC = () => {
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
                    Cookie Policy
                </h1>
            </div>

            <div className="p-6 max-w-xl mx-auto w-full space-y-10">

                {/* LAST UPDATED */}
                <p className="text-xs text-gray-400 font-bold">
                    Last Updated: January 01, 2026 · Information about cookies and tracking technologies we use on our website and mobile application.
                </p>

                {/* SECTION 1 */}
                <Section title="1. What Are Cookies?">
                    <p>
                        Cookies are small text files stored on your device when you visit a website or use an application. They help provide functionality and improve user experience.
                    </p>
                </Section>

                {/* SECTION 2 */}
                <Section title="2. Cookies We Use">
                    <div className="space-y-4">
                        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-100 dark:border-gray-700">
                            <p className="font-black text-sm text-green-600 mb-1">✅ Essential Cookies</p>
                            <p className="text-xs">Required for basic app functionality like authentication and session management. Cannot be disabled.</p>
                        </div>
                        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-100 dark:border-gray-700">
                            <p className="font-black text-sm text-blue-600 mb-1">📊 Analytics Cookies</p>
                            <p className="text-xs">Help us understand how users interact with the app. Used by Firebase Analytics for crash reporting and usage patterns.</p>
                        </div>
                        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-100 dark:border-gray-700">
                            <p className="font-black text-sm text-purple-600 mb-1">⚙️ Preference Cookies</p>
                            <p className="text-xs">Remember your settings like dark mode, language, and UI preferences.</p>
                        </div>
                    </div>
                </Section>

                {/* SECTION 3 */}
                <Section title="3. Cookies We Do NOT Use">
                    <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4">
                        <ul className="text-red-700 dark:text-red-300 font-bold text-xs space-y-1">
                            <li>❌ Advertising cookies</li>
                            <li>❌ Third-party marketing trackers</li>
                            <li>❌ Cross-site tracking cookies</li>
                            <li>❌ Social media tracking pixels</li>
                        </ul>
                    </div>
                </Section>

                {/* SECTION 4 */}
                <Section title="4. Local Storage">
                    <p>
                        We use browser local storage to save:
                    </p>
                    <ul className="list-disc pl-5 space-y-1">
                        <li>Your login session</li>
                        <li>Theme preferences (light/dark mode)</li>
                        <li>Company selection</li>
                        <li>Cached data for offline functionality</li>
                    </ul>
                </Section>

                {/* SECTION 5 */}
                <Section title="5. Third-Party Cookies">
                    <p>
                        The following third-party services may set their own cookies:
                    </p>
                    <ul className="list-disc pl-5 space-y-1">
                        <li><strong>Firebase (Google):</strong> Authentication and analytics</li>
                        <li><strong>Cloudinary:</strong> Image delivery optimization</li>
                    </ul>
                    <p className="mt-2 text-xs text-gray-400">
                        These services have their own privacy policies governing their data collection.
                    </p>
                </Section>

                {/* SECTION 6 */}
                <Section title="6. Managing Cookies">
                    <p>
                        You can manage cookies through your browser settings:
                    </p>
                    <ul className="list-disc pl-5 space-y-1">
                        <li>Clear all cookies and site data</li>
                        <li>Block third-party cookies</li>
                        <li>Delete specific cookies</li>
                    </ul>
                    <p className="mt-2 text-amber-600 dark:text-amber-400 text-xs">
                        ⚠️ Note: Blocking essential cookies may prevent the app from working properly.
                    </p>
                </Section>

                {/* SECTION 7 */}
                <Section title="7. Contact">
                    <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 border border-gray-100 dark:border-gray-700 space-y-2">
                        <p><strong>Questions?</strong> Contact us at {SUPPORT_EMAIL}</p>
                    </div>
                </Section>

            </div>
        </div>
    );
};

export default CookiePolicy;
