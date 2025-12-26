import React from 'react';
import { ArrowLeft, Shield, Lock, FileText, Server, Share2, Scale } from 'lucide-react';

const PrivacyPolicy: React.FC = () => {
    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-900 py-12 px-4 sm:px-6 lg:px-8 font-sans">
            <div className="max-w-3xl mx-auto space-y-8">
                {/* Header */}
                <div className="text-center space-y-4">
                    <div className="mx-auto w-16 h-16 bg-blue-100 dark:bg-blue-900/30 rounded-2xl flex items-center justify-center">
                        <Shield className="w-8 h-8 text-blue-600 dark:text-blue-400" />
                    </div>
                    <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight uppercase">Privacy Policy</h1>
                    <p className="text-slate-500 dark:text-slate-400">Last Updated: {new Date().toLocaleDateString()}</p>
                </div>

                <div className="bg-white dark:bg-slate-800 rounded-[32px] shadow-xl shadow-slate-200/50 dark:shadow-none overflow-hidden border border-slate-100 dark:border-slate-700">
                    <div className="p-8 space-y-10">

                        {/* Section 1 */}
                        <section className="space-y-4">
                            <div className="flex items-center gap-3 text-blue-600 dark:text-blue-400">
                                <FileText className="w-6 h-6" />
                                <h2 className="text-lg font-black uppercase tracking-widest">1. Data Collection</h2>
                            </div>
                            <div className="pl-9 space-y-2 text-slate-600 dark:text-slate-300 leading-relaxed">
                                <p>We collect specific information to facilitate the core functionality of invoice generation and management:</p>
                                <ul className="list-disc pl-5 space-y-1">
                                    <li><strong>Profile Information:</strong> Name, Business Name, Logo, Phone, and Email.</li>
                                    <li><strong>Customer Details:</strong> Name, GST Number, Phone, and Address as provided by you.</li>
                                    <li><strong>Local Storage:</strong> Your invoices and business data are stored locally on your device using Browser Storage technologies (LocalStorage/IndexedDB) for offline access and performance.</li>
                                </ul>
                            </div>
                        </section>

                        {/* Section 2 */}
                        <section className="space-y-4">
                            <div className="flex items-center gap-3 text-purple-600 dark:text-purple-400">
                                <Lock className="w-6 h-6" />
                                <h2 className="text-lg font-black uppercase tracking-widest">2. Account & Permissions</h2>
                            </div>
                            <div className="pl-9 space-y-4 text-slate-600 dark:text-slate-300 leading-relaxed">
                                <div>
                                    <h3 className="font-bold text-slate-800 dark:text-slate-200 mb-1">Contacts Permission</h3>
                                    <p>This permission is used <span className="font-bold text-red-500">ONLY</span> to save customer contact details to your phone's native address book for your convenience. We do not mass-read, scan, or upload your personal contacts to our servers.</p>
                                </div>
                                <div>
                                    <h3 className="font-bold text-slate-800 dark:text-slate-200 mb-1">Storage Permission</h3>
                                    <p>Required to generate, save, and share PDF invoices created within the application.</p>
                                </div>
                            </div>
                        </section>

                        {/* Section 3 */}
                        <section className="space-y-4">
                            <div className="flex items-center gap-3 text-emerald-600 dark:text-emerald-400">
                                <Server className="w-6 h-6" />
                                <h2 className="text-lg font-black uppercase tracking-widest">3. Cloud Sync & Security</h2>
                            </div>
                            <div className="pl-9 space-y-2 text-slate-600 dark:text-slate-300 leading-relaxed">
                                <p><strong>Private Cloud:</strong> If you choose to connect your own Firebase instance, your data is synced directly to your private cloud account. We (the developers) do not have access to your private Firebase data.</p>
                                <p><strong>Encryption:</strong> We implement AES-256 equivalent encryption logic and follow industry-best clean architecture practices to ensure your data remains safe on your device.</p>
                            </div>
                        </section>

                        {/* Section 4 */}
                        <section className="space-y-4">
                            <div className="flex items-center gap-3 text-orange-600 dark:text-orange-400">
                                <Share2 className="w-6 h-6" />
                                <h2 className="text-lg font-black uppercase tracking-widest">4. Third Parties</h2>
                            </div>
                            <div className="pl-9 text-slate-600 dark:text-slate-300 leading-relaxed">
                                <p>We <span className="font-bold">NEVER</span> share, sell, or trade your data with any third-party marketing agencies. All data remains strictly within your control and ownership.</p>
                            </div>
                        </section>

                        {/* Section 5 */}
                        <section className="space-y-4">
                            <div className="flex items-center gap-3 text-slate-600 dark:text-slate-400">
                                <Scale className="w-6 h-6" />
                                <h2 className="text-lg font-black uppercase tracking-widest">5. Compliance</h2>
                            </div>
                            <div className="pl-9 text-slate-600 dark:text-slate-300 leading-relaxed">
                                <p>This policy is designed to comply with applicable data protection laws, including India's IT Act, 2000 and the Digital Personal Data Protection (DPDP) Act, 2023.</p>
                            </div>
                        </section>

                    </div>

                    <div className="bg-slate-50 dark:bg-slate-900/50 p-6 text-center border-t border-slate-100 dark:border-slate-800">
                        <p className="text-xs text-slate-400 uppercase tracking-widest">
                            For any privacy concerns, please contact our support team.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PrivacyPolicy;
