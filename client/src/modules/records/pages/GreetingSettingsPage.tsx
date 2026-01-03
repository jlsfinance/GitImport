import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useCompany } from '../context/CompanyContext';
import { AdminGreeting, GreetingSettings } from '../types';
import { GreetingService } from '../../../services/greetingService';

const GreetingSettingsPage: React.FC = () => {
    const navigate = useNavigate();
    const { currentCompany, updateCompany } = useCompany();

    // Default States
    const [settings, setSettings] = useState<GreetingSettings>({
        enableFestivalGreetings: true,
        useAiEnhancement: true,
        autoShareWhatsapp: false
    });

    const [adminGreeting, setAdminGreeting] = useState<AdminGreeting>({
        message: '',
        enabled: false,
        expiresAt: new Date().toISOString().split('T')[0]
    });

    const [isSaving, setIsSaving] = useState(false);
    const [upcomingFestivals, setUpcomingFestivals] = useState<any[]>([]);

    useEffect(() => {
        if (currentCompany) {
            if (currentCompany.greetingSettings) setSettings(currentCompany.greetingSettings);
            if (currentCompany.adminGreeting) setAdminGreeting(currentCompany.adminGreeting);

            setUpcomingFestivals(GreetingService.getUpcomingFestivals());
        }
    }, [currentCompany]);

    const handleSave = async () => {
        if (!currentCompany) return;
        setIsSaving(true);
        try {
            await updateCompany(currentCompany.id, {
                greetingSettings: settings,
                adminGreeting: adminGreeting
            });
            navigate(-1);
        } catch (e) {
            console.error("Failed to save settings", e);
            alert("Failed to save changes.");
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="min-h-screen bg-gray-50 dark:bg-gray-900 pb-20 font-sans text-gray-900 dark:text-white"
        >
            {/* Header */}
            <div className="sticky top-0 z-10 bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl px-4 py-4 flex items-center justify-between border-b border-gray-100 dark:border-gray-800">
                <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-indigo-600">
                    <span className="material-symbols-outlined font-black">arrow_back</span>
                </button>
                <h1 className="text-lg font-black uppercase tracking-widest text-center">Greeting System</h1>
                <div className="w-6"></div>
            </div>

            <div className="max-w-md mx-auto p-4 space-y-8">

                {/* MODE 1: Admin Greeting */}
                <section>
                    <div className="flex items-center gap-2 mb-4 px-2">
                        <span className="material-symbols-outlined text-indigo-600">campaign</span>
                        <h2 className="text-xs font-black uppercase tracking-[0.2em] text-gray-500">Mode 1: Priority Admin Message</h2>
                    </div>

                    <div className={`p-6 bg-white dark:bg-gray-800 rounded-[2rem] border-2 transition-all shadow-sm ${adminGreeting.enabled ? 'border-indigo-600 shadow-indigo-100' : 'border-gray-100 dark:border-gray-700'}`}>
                        <div className="flex justify-between items-center mb-6">
                            <span className="font-black text-sm uppercase tracking-widest">Enable Manual Mode</span>
                            <div
                                onClick={() => setAdminGreeting(prev => ({ ...prev, enabled: !prev.enabled }))}
                                className={`w-14 h-8 rounded-full p-1 cursor-pointer transition-colors ${adminGreeting.enabled ? 'bg-indigo-600' : 'bg-gray-200 dark:bg-gray-700'}`}
                            >
                                <div className={`w-6 h-6 rounded-full bg-white shadow-sm transition-transform ${adminGreeting.enabled ? 'translate-x-6' : ''}`} />
                            </div>
                        </div>

                        {adminGreeting.enabled && (
                            <div className="space-y-4 animate-in slide-in-from-top-2">
                                <div>
                                    <label className="block text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1.5">Your Message</label>
                                    <textarea
                                        value={adminGreeting.message}
                                        onChange={(e) => setAdminGreeting(prev => ({ ...prev, message: e.target.value }))}
                                        className="w-full p-4 bg-gray-50 dark:bg-gray-900 rounded-2xl border-none outline-none font-bold text-sm min-h-[100px]"
                                        placeholder="Type your greeting or announcement here..."
                                    />
                                </div>

                                <div>
                                    <label className="block text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1.5">Show Until (Auto-Expire)</label>
                                    <input
                                        type="date"
                                        value={adminGreeting.expiresAt}
                                        onChange={(e) => setAdminGreeting(prev => ({ ...prev, expiresAt: e.target.value }))}
                                        className="w-full p-4 bg-gray-50 dark:bg-gray-900 rounded-2xl border-none outline-none font-bold text-sm"
                                        min={new Date().toISOString().split('T')[0]}
                                    />
                                </div>
                                <p className="text-[10px] text-indigo-500 font-bold bg-indigo-50 dark:bg-indigo-900/20 p-3 rounded-xl">
                                    <span className="material-symbols-outlined text-sm align-middle mr-1">info</span>
                                    This message will OVERRIDE any festival greetings until the selected date.
                                </p>
                            </div>
                        )}
                    </div>
                </section>

                {/* MODE 2: Festival System */}
                <section>
                    <div className="flex items-center gap-2 mb-4 px-2">
                        <span className="material-symbols-outlined text-pink-600">celebration</span>
                        <h2 className="text-xs font-black uppercase tracking-[0.2em] text-gray-500">Mode 2: Auto Festival System</h2>
                    </div>

                    <div className="bg-white dark:bg-gray-800 rounded-[2rem] border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden">
                        <div className="p-6 border-b border-gray-50 dark:border-gray-700">
                            <div className="flex justify-between items-center">
                                <div>
                                    <span className="block font-black text-sm uppercase tracking-widest">Enable Festivals</span>
                                    <span className="text-[10px] font-bold text-gray-400">Auto-greet on major Indian festivals</span>
                                </div>
                                <div
                                    onClick={() => setSettings(prev => ({ ...prev, enableFestivalGreetings: !prev.enableFestivalGreetings }))}
                                    className={`w-12 h-7 rounded-full p-1 cursor-pointer transition-colors ${settings.enableFestivalGreetings ? 'bg-pink-600' : 'bg-gray-200 dark:bg-gray-700'}`}
                                >
                                    <div className={`w-5 h-5 rounded-full bg-white shadow-sm transition-transform ${settings.enableFestivalGreetings ? 'translate-x-5' : ''}`} />
                                </div>
                            </div>
                        </div>

                        {settings.enableFestivalGreetings && (
                            <div className="divide-y divide-gray-50 dark:divide-gray-700 bg-gray-50/50 dark:bg-gray-800/50">
                                {/* AI Toggle */}
                                <div className="p-5 flex justify-between items-center">
                                    <div className="flex gap-3 items-center">
                                        <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-blue-500 to-purple-600 flex items-center justify-center text-white">
                                            <span className="material-symbols-outlined text-lg">auto_awesome</span>
                                        </div>
                                        <div>
                                            <span className="block font-black text-xs uppercase tracking-widest">AI Enhancement</span>
                                            <span className="text-[10px] font-bold text-gray-400">Generate professional greetings</span>
                                        </div>
                                    </div>
                                    <div
                                        onClick={() => setSettings(prev => ({ ...prev, useAiEnhancement: !prev.useAiEnhancement }))}
                                        className={`w-10 h-6 rounded-full p-1 cursor-pointer transition-colors ${settings.useAiEnhancement ? 'bg-purple-600' : 'bg-gray-300 dark:bg-gray-600'}`}
                                    >
                                        <div className={`w-4 h-4 rounded-full bg-white shadow-sm transition-transform ${settings.useAiEnhancement ? 'translate-x-4' : ''}`} />
                                    </div>
                                </div>


                                <div className="p-5">
                                    <h4 className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-3">Upcoming Festivals (Auto-Scheduled)</h4>
                                    <div className="flex gap-3 overflow-x-auto pb-2">
                                        {upcomingFestivals.slice(0, 5).map((f, i) => (
                                            <div key={i} className="flex-shrink-0 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-700 p-3 rounded-xl min-w-[120px]">
                                                <p className="text-[10px] font-black text-pink-600 uppercase mb-1">{f.date}</p>
                                                <p className="text-xs font-bold leading-tight">{f.name}</p>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </section>

                <button
                    onClick={handleSave}
                    disabled={isSaving}
                    className="w-full py-5 bg-indigo-600 text-white rounded-3xl font-black uppercase tracking-[0.2em] shadow-xl shadow-indigo-500/30 active:scale-95 transition-all disabled:opacity-70 disabled:scale-100"
                >
                    {isSaving ? 'Saving Changes...' : 'Save Configuration'}
                </button>

            </div>
        </motion.div>
    );
};

export default GreetingSettingsPage;
