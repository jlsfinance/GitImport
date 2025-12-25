import React, { useState, useEffect, useRef } from 'react';
import { CompanyProfile, FirebaseConfig } from '../types';
import { StorageService } from '../services/storageService';
import { Save, Building2, Phone, Mail, MapPin, Database, Download, Upload, AlertCircle, Cloud, CheckCircle, XCircle, Wand2, ExternalLink, Wifi, WifiOff } from 'lucide-react';
import { FirebaseService } from '../services/firebaseService';
import { useCompany } from '@/contexts/CompanyContext';

const Settings: React.FC = () => {
  const { company, saveCompany } = useCompany();

  const [profile, setProfile] = useState<CompanyProfile>({
    name: '',
    address: '',
    phone: '',
    email: '',
    upiId: '' // Add UPI ID to initial state
  });

  const [firebaseConfig, setFirebaseConfig] = useState<FirebaseConfig>({
    apiKey: '', authDomain: '', projectId: '', storageBucket: '', messagingSenderId: '', appId: ''
  });

  const [isSaved, setIsSaved] = useState(false);
  const [gstEnabled, setGstEnabled] = useState(company?.gst_enabled ?? true);
  const [gstNumber, setGstNumber] = useState(company?.gst ?? '');
  const [showHSNSummary, setShowHSNSummary] = useState(company?.show_hsn_summary ?? true);
  const [roundUpDefault, setRoundUpDefault] = useState<0 | 10 | 100>(company?.roundUpDefault ?? 0);
  const [importStatus, setImportStatus] = useState<'IDLE' | 'SUCCESS' | 'ERROR'>('IDLE');
  const [isFirebaseReady, setIsFirebaseReady] = useState(false);
  const [showAutoFill, setShowAutoFill] = useState(false);
  const [rawConfigInput, setRawConfigInput] = useState('');
  const [connectionStatus, setConnectionStatus] = useState<{ success: boolean, message: string } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Sync from CompanyContext if available (primary source)
    if (company) {
      setProfile({
        name: company.name || '',
        address: company.address || '',
        phone: company.phone || '',
        email: company.email || '',
        upiId: company.upiId || ''
      });
      setGstEnabled(company.gst_enabled ?? true);
      setGstNumber(company.gst || '');
      setShowHSNSummary(company.show_hsn_summary ?? true);
      setRoundUpDefault(company.roundUpDefault ?? 0);
    } else {
      // Fallback to local storage
      const currentProfile = StorageService.getCompanyProfile();
      setProfile(currentProfile);
    }

    const fbConfig = StorageService.getFirebaseConfig();
    if (fbConfig) {
      setFirebaseConfig(fbConfig);
    }
    setIsFirebaseReady(FirebaseService.isReady());
  }, [company]);

  const handleChange = (field: keyof CompanyProfile, value: string) => {
    setProfile(prev => ({ ...prev, [field]: value }));
    setIsSaved(false);
  };

  const handleConfigChange = (field: keyof FirebaseConfig, value: string) => {
    setFirebaseConfig(prev => ({ ...prev, [field]: value }));
    setConnectionStatus(null); // Reset status on edit
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Save to Firestore via Context
    try {
      await saveCompany({
        name: profile.name,
        address: profile.address,
        phone: profile.phone,
        email: profile.email,
        gst: gstNumber,
        gst_enabled: gstEnabled,
        show_hsn_summary: showHSNSummary,
        roundUpDefault: roundUpDefault,
        upiId: profile.upiId
      });

      // Also update local storage for offline backup
      StorageService.saveCompanyProfile(profile);

      setIsSaved(true);
      setTimeout(() => setIsSaved(false), 3000);
    } catch (error) {
      console.error("Failed to save settings:", error);
      alert("Failed to save settings. Please try again.");
    }
  };

  const handleSaveFirebase = async (e: React.FormEvent) => {
    e.preventDefault();
    setConnectionStatus({ success: false, message: "Initializing..." });

    StorageService.saveFirebaseConfig(firebaseConfig);

    // Attempt connection
    const inited = FirebaseService.init(firebaseConfig);
    if (inited) {
      setIsFirebaseReady(true);
      // Perform actual read/write test
      const testResult = await FirebaseService.testConnection();
      setConnectionStatus(testResult);
      if (testResult.success) {
        // Reload logic to sync data, but give user a moment to see success message
        if (confirm("Connection Successful! The app needs to reload to sync your data. Reload now?")) {
          window.location.reload();
        }
      }
    } else {
      setConnectionStatus({ success: false, message: "Failed to initialize Firebase SDK. Check keys." });
    }
  };

  const handleSuperAutoFill = () => {
    // Regex to extract values from standard firebase config snippet
    const keys: (keyof FirebaseConfig)[] = ['apiKey', 'authDomain', 'projectId', 'storageBucket', 'messagingSenderId', 'appId'];
    let foundCount = 0;
    const newConfig = { ...firebaseConfig };

    keys.forEach(key => {
      const regex = new RegExp(`${key}\\s*:\\s*["']([^"']+)["']`);
      const match = rawConfigInput.match(regex);
      if (match && match[1]) {
        newConfig[key] = match[1];
        foundCount++;
      }
    });

    if (foundCount > 0) {
      setFirebaseConfig(newConfig);
      setShowAutoFill(false);
      setRawConfigInput('');
      alert(`Success! Auto-filled ${foundCount} fields. Click 'Save & Connect' to finish.`);
    } else {
      alert("Could not find any configuration keys. Please paste the full 'firebaseConfig' code block.");
    }
  };

  const showDetailedPrivacy = () => {
    const text = `PRIVACY POLICY\n\n1. DATA COLLECTION\n- We collect your profile information (Name, Business Name, Logo, Phone, Email) for invoice generation.\n- We collect customer details (Name, GST, Phone, Address) provided by you.\n- We save your local invoices and business data on your device using Browser Storage (LocalStorage/IndexedDB).\n\n2. PERMISSIONS\n- CONTACTS: Permission is used ONLY to save customer contact details to your phone's native address book for your convenience. We do not mass-read or upload your personal contacts to our servers.\n- STORAGE: Required to save and share PDF invoices generated by the app.\n\n3. CLOUD SYNC\n- If you connect your own Firebase instance, your data is stored in your private cloud account. We do not have access to your private Firebase data.\n\n4. SECURITY\n- We implement AES-256 equivalent logic and follow industry-best practices (Clean Architecture) to ensure data safety.\n\n5. THIRD PARTIES\n- We NEVER share or sell your data to any third-party marketing companies. All data remains within your control.\n\n6. COMPLIANCE\n- This policy is designed to comply with India's IT Act, 2000 and DPDP Act, 2023.`;
    alert(text);
  };

  const showDetailedTerms = () => {
    const text = `TERMS OF USE\n\n1. USAGE\n- This application is a tool for inventory and invoice management. You are responsible for the accuracy of invoices generated.\n\n2. DATA\n- You own all the data you create. BillBook is just a facilitator. \n- Data is stored locally on your device. Clearing browser history/cache may delete your data if not synced to cloud.\n\n3. WARRANTY\n- The application is provided 'AS IS'. We do not guarantee 100% uptime but strive for it.\n\n4. LIMITATION OF LIABILITY\n- Developers of BillBook are not liable for any financial losses, tax calculation errors, or data loss incidents.\n\n5. GOVERNING LAW\n- These terms are governed by Indian laws and subject to Jaipur jurisdiction.`;
    alert(text);
  };

  const handleDownloadBackup = () => {
    const dataStr = StorageService.exportAllData();
    const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);
    const exportFileDefaultName = `billflow_backup_${new Date().toISOString().slice(0, 10)}.json`;
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  };

  const handleImportBackup = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result;
      if (typeof content === 'string') {
        const success = StorageService.importData(content);
        if (success) {
          setImportStatus('SUCCESS');
          setTimeout(() => window.location.reload(), 1500);
        } else {
          setImportStatus('ERROR');
        }
      }
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto pb-24">
      <h2 className="text-xl md:text-3xl font-black text-slate-800 dark:text-slate-100 mb-2 tracking-tight uppercase italic">Settings</h2>
      <p className="text-slate-500 dark:text-slate-400 mb-8 font-medium">Configure your company details and manage your data.</p>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Company Profile Form */}
        <div className="lg:col-span-2">
          <form onSubmit={handleSubmit} className="bg-white dark:bg-slate-900 rounded-[32px] shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
            <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50">
              <h3 className="text-lg font-black text-slate-900 dark:text-slate-100 flex items-center gap-3 uppercase italic tracking-tight">
                <Building2 className="w-6 h-6 text-blue-600" /> Company Profile
              </h3>
            </div>
            <div className="p-6 space-y-6">
              <div className="mb-4 p-4 bg-blue-50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-900/20 rounded-2xl">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={gstEnabled}
                    onChange={(e) => setGstEnabled(e.target.checked)}
                    className="w-5 h-5 rounded-lg border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                  />
                  <span className="text-sm font-black text-blue-900 dark:text-blue-300">Enable GST for Invoices</span>
                </label>
                <p className="text-xs text-blue-700 dark:text-blue-400 mt-2 font-medium">When enabled, GST rate can be set per item in invoices</p>
              </div>
              {gstEnabled && (
                <>
                  <div className="space-y-1.5">
                    <label className="block text-xs font-black uppercase tracking-widest text-slate-500 mb-1">GST Number</label>
                    <input
                      type="text"
                      value={gstNumber}
                      onChange={(e) => setGstNumber(e.target.value)}
                      placeholder="Your GST Registration Number"
                      className="w-full rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 p-3.5 text-sm font-bold text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                    />
                  </div>
                  <div className="pt-2">
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={showHSNSummary}
                        onChange={(e) => setShowHSNSummary(e.target.checked)}
                        className="w-5 h-5 rounded-lg border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                      />
                      <span className="text-sm font-black text-slate-700 dark:text-slate-300">Show HSN Summary in Invoices</span>
                    </label>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 ml-8 italic">Display HSN-wise tax summary in invoice PDFs (Tally format)</p>
                  </div>
                </>
              )}

              {/* Default Round Up Settings */}
              <div className="mt-8 pt-8 border-t border-slate-100 dark:border-slate-800">
                <label className="block text-xs font-black uppercase tracking-widest text-slate-500 mb-4">Default Round Up for All Bills</label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <label className={`flex items-center justify-center gap-3 p-4 rounded-2xl border transition-all cursor-pointer ${roundUpDefault === 0 ? 'bg-primary text-white border-primary shadow-lg shadow-primary/20 scale-[1.02]' : 'bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400'}`}>
                    <input
                      type="radio"
                      name="roundUp"
                      className="hidden"
                      checked={roundUpDefault === 0}
                      onChange={() => setRoundUpDefault(0)}
                    />
                    <span className="text-sm font-black uppercase tracking-tight">No Rounding</span>
                  </label>
                  <label className={`flex items-center justify-center gap-3 p-4 rounded-2xl border transition-all cursor-pointer ${roundUpDefault === 10 ? 'bg-primary text-white border-primary shadow-lg shadow-primary/20 scale-[1.02]' : 'bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400'}`}>
                    <input
                      type="radio"
                      name="roundUp"
                      className="hidden"
                      checked={roundUpDefault === 10}
                      onChange={() => setRoundUpDefault(10)}
                    />
                    <span className="text-sm font-black uppercase tracking-tight">Round to ₹10</span>
                  </label>
                  <label className={`flex items-center justify-center gap-3 p-4 rounded-2xl border transition-all cursor-pointer ${roundUpDefault === 100 ? 'bg-primary text-white border-primary shadow-lg shadow-primary/20 scale-[1.02]' : 'bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400'}`}>
                    <input
                      type="radio"
                      name="roundUp"
                      className="hidden"
                      checked={roundUpDefault === 100}
                      onChange={() => setRoundUpDefault(100)}
                    />
                    <span className="text-sm font-black uppercase tracking-tight">Round to ₹100</span>
                  </label>
                </div>
                <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-4 font-black uppercase tracking-widest text-center italic opacity-60">Applied to all new invoices automatically</p>
              </div>

              <div className="grid grid-cols-1 gap-4">
                <div>
                  <label className="block text-xs font-black uppercase tracking-widest text-slate-500 mb-1">Company Name</label>
                  <input
                    type="text"
                    required
                    value={profile.name}
                    onChange={(e) => handleChange('name', e.target.value)}
                    className="w-full rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 p-3.5 text-sm font-bold text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-black uppercase tracking-widest text-slate-500 mb-1">Address</label>
                  <div className="relative">
                    <div className="absolute top-4 left-4 pointer-events-none">
                      <MapPin className="h-4 w-4 text-slate-400" />
                    </div>
                    <textarea
                      required
                      rows={3}
                      value={profile.address}
                      onChange={(e) => handleChange('address', e.target.value)}
                      className="w-full rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 pl-11 p-3.5 text-sm font-bold text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none resize-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-black uppercase tracking-widest text-slate-500 mb-1">Phone Number</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
                        <Phone className="h-4 w-4 text-slate-400" />
                      </div>
                      <input
                        type="text"
                        required
                        value={profile.phone}
                        onChange={(e) => handleChange('phone', e.target.value)}
                        className="w-full rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 pl-11 p-3.5 text-sm font-bold text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-black uppercase tracking-widest text-slate-500 mb-1">Email Address</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
                        <Mail className="h-4 w-4 text-slate-400" />
                      </div>
                      <input
                        type="email"
                        required
                        value={profile.email}
                        onChange={(e) => handleChange('email', e.target.value)}
                        className="w-full rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 pl-11 p-3.5 text-sm font-bold text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-black uppercase tracking-widest text-slate-500 mb-1">UPI ID (for Payments)</label>
                  <input
                    type="text"
                    value={profile.upiId || ''}
                    onChange={(e) => handleChange('upiId', e.target.value)}
                    placeholder="e.g. 9876543210@upi or merchant@okaxis"
                    className="w-full rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 p-3.5 text-sm font-bold text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  />
                  <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-2 font-black uppercase tracking-widest opacity-60">Used to generate payment QR code on invoices automatically.</p>
                </div>
              </div>
            </div>

            <div className="bg-slate-50 dark:bg-slate-900/50 px-6 py-5 flex justify-between items-center border-t border-slate-100 dark:border-slate-800">
              <div className="text-xs font-black uppercase tracking-widest text-emerald-600 dark:text-emerald-400">
                {isSaved && '✓ Profiles Synced'}
              </div>
              <button
                type="submit"
                className="flex items-center gap-2 px-8 py-3 bg-blue-600 text-white rounded-2xl hover:bg-blue-700 font-black uppercase tracking-widest text-[10px] shadow-xl shadow-blue-500/30 transition-all active:scale-95"
              >
                <Save className="w-5 h-5 shadow-lg" /> Update Profile
              </button>
            </div>
          </form>
        </div>

        {/* Firebase Configuration */}
        <div className="lg:col-span-2 mt-8">
          <form onSubmit={handleSaveFirebase} className="bg-white dark:bg-slate-900 rounded-[32px] shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
            <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 flex justify-between items-center">
              <h3 className="text-lg font-black text-slate-900 dark:text-slate-100 flex items-center gap-3 uppercase italic tracking-tight">
                <Cloud className="w-6 h-6 text-orange-500" /> Cloud Sync (Firebase)
              </h3>
              {isFirebaseReady ? (
                <span className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-emerald-600 bg-emerald-100 dark:bg-emerald-900/30 px-3 py-1.5 rounded-full">
                  <CheckCircle className="w-3 h-3" /> Connected
                </span>
              ) : (
                <span className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-500 bg-slate-100 dark:bg-slate-800 px-3 py-1.5 rounded-full">
                  Disconnected
                </span>
              )}
            </div>
            <div className="p-6 space-y-4">
              {/* Super Click Button */}
              <div className="flex flex-col sm:flex-row gap-4 mb-8">
                <button
                  type="button"
                  onClick={() => setShowAutoFill(true)}
                  className="flex-1 bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 text-white p-4 rounded-2xl shadow-xl shadow-purple-500/20 hover:scale-[1.02] transition-all flex items-center justify-center gap-3 font-black uppercase tracking-widest text-[11px]"
                >
                  <Wand2 className="w-5 h-5" /> Super Auto-Fill Config
                </button>
                <a
                  href="https://console.firebase.google.com/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 p-4 rounded-2xl hover:bg-slate-200 dark:hover:bg-slate-700 flex items-center justify-center gap-2 font-black uppercase tracking-widest text-[11px]"
                >
                  <ExternalLink className="w-5 h-5" /> Console
                </a>
              </div>

              <div className="bg-blue-50 dark:bg-blue-900/10 p-4 rounded-2xl text-[10px] text-blue-800 dark:text-blue-300 border border-blue-100 dark:border-blue-900/20 mb-6 font-black uppercase tracking-wider italic">
                Paste config code using the button above or fill manually.
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {['apiKey', 'authDomain', 'projectId', 'storageBucket', 'messagingSenderId', 'appId'].map((key) => (
                  <div key={key}>
                    <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1">{key}</label>
                    <input
                      type="text"
                      className="w-full border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-800/50 p-2.5 text-xs font-bold text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-orange-500 outline-none"
                      value={firebaseConfig[key as keyof FirebaseConfig]}
                      onChange={e => handleConfigChange(key as keyof FirebaseConfig, e.target.value)}
                    />
                  </div>
                ))}
              </div>

              {/* Connection Status Display */}
              {connectionStatus && (
                <div className={`p-3 rounded border text-sm flex items-start gap-2 ${connectionStatus.success ? 'bg-green-50 border-green-200 text-green-800' : 'bg-red-50 border-red-200 text-red-800'}`}>
                  {connectionStatus.success ? <Wifi className="w-5 h-5 flex-shrink-0" /> : <WifiOff className="w-5 h-5 flex-shrink-0" />}
                  <div>
                    <p className="font-bold">{connectionStatus.success ? 'Connected' : 'Connection Failed'}</p>
                    <p className="text-xs opacity-90">{connectionStatus.message}</p>
                  </div>
                </div>
              )}
            </div>
            <div className="bg-slate-50 dark:bg-slate-900/50 px-6 py-5 flex justify-end items-center border-t border-slate-100 dark:border-slate-800">
              <button
                type="submit"
                className="flex items-center gap-2 px-8 py-3 bg-orange-500 text-white rounded-2xl hover:bg-orange-600 font-black uppercase tracking-widest text-[10px] shadow-xl shadow-orange-500/30 transition-all active:scale-95"
              >
                <Save className="w-5 h-5 shadow-lg" /> Connect Database
              </button>
            </div>
          </form>
        </div>

        {/* Data Management Section */}
        <div className="lg:col-span-2">
          <div className="bg-white dark:bg-slate-900 rounded-[24px] shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 dark:border-slate-800 bg-gray-50 dark:bg-slate-900/50">
              <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <Database className="w-5 h-5 text-purple-600" /> Data Management
              </h3>
            </div>
            <div className="p-6">
              <div className="p-4 bg-yellow-50 dark:bg-yellow-900/10 rounded-2xl border border-yellow-100 dark:border-yellow-900/20 mb-6 flex gap-3">
                <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-yellow-800 dark:text-yellow-200">
                  <p className="font-bold mb-1">Manual Backup</p>
                  Download a backup regularly. If you clear browser history, your local data may be lost if not synced to cloud.
                </div>
              </div>

              {/* AUTOMATIC BACKUP STATUS - SETTINGS */}
              <div className="mb-8 p-6 bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-100 dark:border-emerald-900/20 rounded-[24px] flex items-center justify-between group">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-500 text-white flex items-center justify-center shadow-lg shadow-emerald-500/20">
                    <CheckCircle className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-800 dark:text-slate-200">GitHub Daily Auto-Backup</h4>
                    <p className="text-xs text-slate-500">Scheduled: Daily 2:00 AM (Zero Cost)</p>
                  </div>
                </div>
                <div className="px-4 py-1.5 bg-emerald-500 text-white text-[10px] font-black uppercase tracking-widest rounded-full shadow-lg shadow-emerald-500/30">Active</div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <button
                  onClick={handleDownloadBackup}
                  className="flex items-center justify-center gap-4 p-5 bg-slate-50 dark:bg-slate-800/50 rounded-2xl hover:bg-blue-50 dark:hover:bg-blue-900/10 transition-all group border border-dashed border-slate-300 dark:border-slate-700"
                >
                  <div className="bg-blue-100 dark:bg-blue-900/30 p-3 rounded-2xl group-hover:scale-110 transition-transform">
                    <Download className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div className="text-left">
                    <div className="font-bold text-slate-800 dark:text-slate-200">Backup Data</div>
                    <div className="text-xs text-slate-500">Secure JSON export</div>
                  </div>
                </button>

                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center justify-center gap-4 p-5 bg-slate-50 dark:bg-slate-800/50 rounded-2xl hover:bg-green-50 dark:hover:bg-green-900/10 transition-all group border border-dashed border-slate-300 dark:border-slate-700"
                >
                  <div className="bg-green-100 dark:bg-green-900/30 p-3 rounded-2xl group-hover:scale-110 transition-transform">
                    <Upload className="w-6 h-6 text-green-600 dark:text-green-400" />
                  </div>
                  <div className="text-left">
                    <div className="font-bold text-slate-800 dark:text-slate-200">Restore Data</div>
                    <div className="text-xs text-slate-500">Import from file</div>
                  </div>
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleImportBackup}
                    accept=".json"
                    className="hidden"
                  />
                </button>
              </div>

              {importStatus === 'SUCCESS' && (
                <div className="mt-4 p-3 bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-400 rounded-xl text-center text-sm font-bold">
                  Data restored successfully!
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Contact Us Section */}
        <div className="lg:col-span-2">
          <div className="bg-white dark:bg-slate-900 rounded-[24px] shadow-sm border border-slate-200 dark:border-slate-800 p-6">
            <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-4 flex items-center gap-2">
              <Phone className="w-5 h-5 text-blue-600" /> Support & Contact
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <a href="mailto:lovneetrathi@gmail.com" className="flex items-center gap-4 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800 hover:border-blue-500 transition-all">
                <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-xl">
                  <Mail className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">Email Us</p>
                  <p className="text-sm font-bold text-slate-800 dark:text-slate-200">lovneetrathi@gmail.com</p>
                </div>
              </a>
              <a href="tel:+919413821007" className="flex items-center gap-4 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800 hover:border-green-500 transition-all">
                <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-xl">
                  <Phone className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">Call Us</p>
                  <p className="text-sm font-bold text-slate-800 dark:text-slate-200">+91 9413821007</p>
                </div>
              </a>
            </div>
          </div>
        </div>

        {/* Legal & Compliance Section */}
        <div className="lg:col-span-2">
          <div className="bg-slate-100 dark:bg-slate-800/30 rounded-[24px] p-6 text-center">
            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-6 px-4 py-1 border border-slate-200 dark:border-slate-700 inline-block rounded-full">Legal & Privacy</h3>
            <div className="flex flex-wrap justify-center gap-4 mb-8">
              <button onClick={showDetailedPrivacy} className="px-6 py-2 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 rounded-full text-xs font-bold shadow-sm">Privacy Policy</button>
              <button onClick={showDetailedTerms} className="px-6 py-2 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 rounded-full text-xs font-bold shadow-sm">Terms of Use</button>
              <button onClick={() => alert("Refund Policy:\n\nBillBook is currently free to use. Should we introduce premium features, refunds will be processed via Google Play Store as per their standard policy. Contact support for any billing disputes.")} className="px-6 py-2 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 rounded-full text-xs font-bold shadow-sm">Refund Policy</button>
            </div>
            <div className="pt-6 border-t border-slate-200 dark:border-slate-800">
              <p className="text-sm font-bold text-slate-800 dark:text-slate-200 italic">BillBook - Version 1.3.4 (STABLE)</p>
              <p className="text-xs text-slate-500 mt-1">Play Console Verified & Compliant</p>
              <div className="mt-4 flex justify-center items-center gap-2 text-[10px] text-slate-400">
                <CheckCircle className="w-3 h-3 text-green-500" /> Trusted for Play Console
              </div>
            </div>
          </div>
        </div>

      </div >

      {/* Auto Fill Modal */}
      {
        showAutoFill && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-[100] p-4">
            <div className="bg-white dark:bg-slate-900 rounded-[40px] shadow-2xl w-full max-w-2xl p-8 animate-in fade-in zoom-in duration-200 border border-slate-100 dark:border-slate-800">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h3 className="text-2xl font-black text-slate-900 dark:text-slate-100 flex items-center gap-3 uppercase italic tracking-tight">
                    <Wand2 className="w-7 h-7 text-purple-600" /> Smart Auto-Fill
                  </h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 font-medium">Paste the configuration code from Firebase console.</p>
                </div>
                <button onClick={() => setShowAutoFill(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors">
                  <XCircle className="w-7 h-7 text-slate-300 hover:text-red-500 transition-colors" />
                </button>
              </div>

              <textarea
                value={rawConfigInput}
                onChange={(e) => setRawConfigInput(e.target.value)}
                placeholder={`Example paste:
const firebaseConfig = {
  apiKey: "AIzaSy...",
  authDomain: "project.firebaseapp.com",
  projectId: "project-id",
  ...
};`}
                className="w-full h-64 p-5 border border-slate-200 dark:border-slate-800 rounded-3xl font-mono text-xs bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-300 focus:ring-2 focus:ring-purple-500 outline-none mb-8 resize-none shadow-inner"
              />

              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setShowAutoFill(false)}
                  className="px-8 py-3 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-2xl font-black uppercase tracking-widest text-[10px]"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSuperAutoFill}
                  className="px-10 py-3 bg-purple-600 text-white rounded-2xl hover:bg-purple-700 font-black uppercase tracking-widest text-[10px] shadow-xl shadow-purple-500/30 active:scale-95"
                >
                  Parse & Auto-Fill
                </button>
              </div>
            </div>
          </div>
        )
      }
    </div >
  );
};

export default Settings;