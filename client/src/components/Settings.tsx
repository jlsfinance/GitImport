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
    email: ''
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
  const [connectionStatus, setConnectionStatus] = useState<{success: boolean, message: string} | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Sync from CompanyContext if available (primary source)
    if (company) {
        setProfile({
            name: company.name || '',
            address: company.address || '',
            phone: company.phone || '',
            email: company.email || ''
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
            roundUpDefault: roundUpDefault
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
             if(confirm("Connection Successful! The app needs to reload to sync your data. Reload now?")) {
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

  const handleDownloadBackup = () => {
    const dataStr = StorageService.exportAllData();
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    const exportFileDefaultName = `billflow_backup_${new Date().toISOString().slice(0,10)}.json`;
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
      <h2 className="text-xl md:text-2xl font-bold text-slate-800 mb-2">Settings</h2>
      <p className="text-slate-500 mb-8">Configure your company details and manage your data.</p>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Company Profile Form */}
        <div className="lg:col-span-2">
           <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 bg-gray-50">
               <h3 className="text-lg font-medium text-slate-900 flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-blue-600" /> Company Profile
                </h3>
            </div>
            <div className="p-6 space-y-6">
                <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={gstEnabled}
                      onChange={(e) => setGstEnabled(e.target.checked)}
                      className="w-4 h-4 rounded border-gray-300"
                    />
                    <span className="text-sm font-medium text-blue-900">Enable GST for Invoices</span>
                  </label>
                  <p className="text-xs text-blue-700 mt-2">When enabled, GST rate can be set per item in invoices</p>
                </div>
                {gstEnabled && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">GST Number</label>
                      <input
                        type="text"
                        value={gstNumber}
                        onChange={(e) => setGstNumber(e.target.value)}
                        placeholder="Your GST Registration Number"
                        className="w-full rounded-md border border-slate-300 p-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                      />
                    </div>
                    <div>
                      <label className="flex items-center gap-3 cursor-pointer">
                        <input 
                          type="checkbox" 
                          checked={showHSNSummary}
                          onChange={(e) => setShowHSNSummary(e.target.checked)}
                          className="w-4 h-4 rounded border-gray-300"
                        />
                        <span className="text-sm font-medium text-slate-700">Show HSN Summary in Invoices</span>
                      </label>
                      <p className="text-xs text-slate-500 mt-1 ml-7">Display HSN-wise tax summary in invoice PDFs (Tally format)</p>
                    </div>
                  </>
                )}

                {/* Default Round Up Settings */}
                <div className="mt-6 pt-6 border-t">
                  <label className="block text-sm font-medium text-slate-700 mb-3">Default Round Up for All Bills</label>
                  <div className="space-y-2">
                    <label className="flex items-center gap-2 p-3 rounded-lg border border-slate-200 hover:bg-slate-50 cursor-pointer">
                      <input 
                        type="radio" 
                        name="roundUp" 
                        checked={roundUpDefault === 0}
                        onChange={() => setRoundUpDefault(0)}
                      />
                      <span className="text-sm font-medium text-slate-700">No Rounding</span>
                    </label>
                    <label className="flex items-center gap-2 p-3 rounded-lg border border-slate-200 hover:bg-slate-50 cursor-pointer">
                      <input 
                        type="radio" 
                        name="roundUp" 
                        checked={roundUpDefault === 10}
                        onChange={() => setRoundUpDefault(10)}
                      />
                      <span className="text-sm font-medium text-slate-700">Round to ₹10</span>
                    </label>
                    <label className="flex items-center gap-2 p-3 rounded-lg border border-slate-200 hover:bg-slate-50 cursor-pointer">
                      <input 
                        type="radio" 
                        name="roundUp" 
                        checked={roundUpDefault === 100}
                        onChange={() => setRoundUpDefault(100)}
                      />
                      <span className="text-sm font-medium text-slate-700">Round to ₹100</span>
                    </label>
                  </div>
                  <p className="text-xs text-slate-500 mt-2">This setting applies to all new invoices automatically</p>
                </div>

                <div className="grid grid-cols-1 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Company Name</label>
                    <input
                      type="text"
                      required
                      value={profile.name}
                      onChange={(e) => handleChange('name', e.target.value)}
                      className="w-full rounded-md border border-slate-300 p-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Address</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <MapPin className="h-4 w-4 text-gray-400" />
                      </div>
                      <textarea
                        required
                        rows={3}
                        value={profile.address}
                        onChange={(e) => handleChange('address', e.target.value)}
                        className="w-full rounded-md border border-slate-300 pl-10 p-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Phone Number</label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <Phone className="h-4 w-4 text-gray-400" />
                        </div>
                        <input
                          type="text"
                          required
                          value={profile.phone}
                          onChange={(e) => handleChange('phone', e.target.value)}
                          className="w-full rounded-md border border-slate-300 pl-10 p-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Email Address</label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <Mail className="h-4 w-4 text-gray-400" />
                        </div>
                        <input
                          type="email"
                          required
                          value={profile.email}
                          onChange={(e) => handleChange('email', e.target.value)}
                          className="w-full rounded-md border border-slate-300 pl-10 p-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                        />
                      </div>
                    </div>
                  </div>
                </div>
            </div>

            <div className="bg-gray-50 px-6 py-4 flex justify-between items-center">
              <div className="text-sm text-green-600 font-medium">
                {isSaved && 'Settings saved successfully!'}
              </div>
              <button
                type="submit"
                className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 font-medium shadow-sm transition-colors"
              >
                <Save className="w-4 h-4" /> Save Changes
              </button>
            </div>
          </form>
        </div>

        {/* Firebase Configuration */}
        <div className="lg:col-span-2">
            <form onSubmit={handleSaveFirebase} className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
                    <h3 className="text-lg font-medium text-slate-900 flex items-center gap-2">
                        <Cloud className="w-5 h-5 text-orange-500" /> Cloud Sync (Firebase)
                    </h3>
                    {isFirebaseReady ? (
                        <span className="flex items-center gap-1 text-xs font-bold text-green-600 bg-green-100 px-2 py-1 rounded-full">
                            <CheckCircle className="w-3 h-3"/> Connected
                        </span>
                    ) : (
                        <span className="flex items-center gap-1 text-xs font-bold text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
                             Not Configured
                        </span>
                    )}
                </div>
                <div className="p-6 space-y-4">
                    {/* Super Click Button */}
                    <div className="flex gap-3 mb-6">
                        <button
                            type="button"
                            onClick={() => setShowAutoFill(true)}
                            className="flex-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 text-white p-3 rounded-lg shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 font-bold text-sm"
                        >
                            <Wand2 className="w-5 h-5" /> Super Auto-Fill Config
                        </button>
                         <a 
                            href="https://console.firebase.google.com/" 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="bg-slate-100 text-slate-700 p-3 rounded-lg hover:bg-slate-200 flex items-center gap-2 font-medium text-sm"
                        >
                            <ExternalLink className="w-4 h-4" /> Open Console
                        </a>
                    </div>

                    <div className="bg-blue-50 p-3 rounded text-xs text-blue-800 border border-blue-100 mb-4">
                        Manually enter keys below OR use the <strong>Super Auto-Fill</strong> button to paste your config code.
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-medium text-slate-700 mb-1">API Key</label>
                            <input type="text" className="w-full border rounded p-2 text-xs" value={firebaseConfig.apiKey} onChange={e => handleConfigChange('apiKey', e.target.value)} />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-slate-700 mb-1">Auth Domain</label>
                            <input type="text" className="w-full border rounded p-2 text-xs" value={firebaseConfig.authDomain} onChange={e => handleConfigChange('authDomain', e.target.value)} />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-slate-700 mb-1">Project ID</label>
                            <input type="text" className="w-full border rounded p-2 text-xs" value={firebaseConfig.projectId} onChange={e => handleConfigChange('projectId', e.target.value)} />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-slate-700 mb-1">Storage Bucket</label>
                            <input type="text" className="w-full border rounded p-2 text-xs" value={firebaseConfig.storageBucket} onChange={e => handleConfigChange('storageBucket', e.target.value)} />
                        </div>
                         <div>
                            <label className="block text-xs font-medium text-slate-700 mb-1">Messaging Sender ID</label>
                            <input type="text" className="w-full border rounded p-2 text-xs" value={firebaseConfig.messagingSenderId} onChange={e => handleConfigChange('messagingSenderId', e.target.value)} />
                        </div>
                         <div>
                            <label className="block text-xs font-medium text-slate-700 mb-1">App ID</label>
                            <input type="text" className="w-full border rounded p-2 text-xs" value={firebaseConfig.appId} onChange={e => handleConfigChange('appId', e.target.value)} />
                        </div>
                    </div>

                     {/* Connection Status Display */}
                    {connectionStatus && (
                        <div className={`p-3 rounded border text-sm flex items-start gap-2 ${connectionStatus.success ? 'bg-green-50 border-green-200 text-green-800' : 'bg-red-50 border-red-200 text-red-800'}`}>
                            {connectionStatus.success ? <Wifi className="w-5 h-5 flex-shrink-0"/> : <WifiOff className="w-5 h-5 flex-shrink-0"/>}
                            <div>
                                <p className="font-bold">{connectionStatus.success ? 'Connected' : 'Connection Failed'}</p>
                                <p className="text-xs opacity-90">{connectionStatus.message}</p>
                            </div>
                        </div>
                    )}
                </div>
                 <div className="bg-gray-50 px-6 py-4 flex justify-end items-center">
                    <button
                        type="submit"
                        className="flex items-center gap-2 px-6 py-2 bg-orange-500 text-white rounded-md hover:bg-orange-600 font-medium shadow-sm transition-colors"
                    >
                        <Save className="w-4 h-4" /> Save & Connect
                    </button>
                </div>
            </form>
        </div>

        {/* Data Management Section */}
        <div className="lg:col-span-2">
           <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
             <div className="px-6 py-4 border-b border-gray-100 bg-gray-50">
               <h3 className="text-lg font-medium text-slate-900 flex items-center gap-2">
                  <Database className="w-5 h-5 text-purple-600" /> Data Management
                </h3>
             </div>
             <div className="p-6">
                <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-100 mb-6 flex gap-3">
                    <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                    <div className="text-sm text-yellow-800">
                        <p className="font-bold mb-1">Important Note</p>
                        This application stores data in your browser. To prevent data loss, please download a backup regularly or before clearing your browser history.
                    </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-4">
                    <button 
                      onClick={handleDownloadBackup}
                      className="flex-1 flex items-center justify-center gap-2 p-4 border-2 border-slate-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-all group text-slate-700"
                    >
                        <div className="bg-blue-100 p-2 rounded-full group-hover:bg-blue-200 transition-colors">
                            <Download className="w-6 h-6 text-blue-600" />
                        </div>
                        <div className="text-left">
                            <div className="font-bold">Download Backup</div>
                            <div className="text-xs text-slate-500">Save data as JSON file</div>
                        </div>
                    </button>

                    <button 
                      onClick={() => fileInputRef.current?.click()}
                      className="flex-1 flex items-center justify-center gap-2 p-4 border-2 border-slate-200 rounded-lg hover:border-green-500 hover:bg-green-50 transition-all group text-slate-700"
                    >
                        <div className="bg-green-100 p-2 rounded-full group-hover:bg-green-200 transition-colors">
                            <Upload className="w-6 h-6 text-green-600" />
                        </div>
                        <div className="text-left">
                            <div className="font-bold">Restore Backup</div>
                            <div className="text-xs text-slate-500">Import JSON file</div>
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
                    <div className="mt-4 p-3 bg-green-100 text-green-800 rounded text-center text-sm">
                        Data restored successfully! Reloading app...
                    </div>
                )}
                 {importStatus === 'ERROR' && (
                    <div className="mt-4 p-3 bg-red-100 text-red-800 rounded text-center text-sm">
                        Failed to restore data. Invalid file format.
                    </div>
                )}
             </div>
           </div>
        </div>

      </div>

      {/* Auto Fill Modal */}
      {showAutoFill && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl p-6 animate-in fade-in zoom-in duration-200">
                  <div className="flex justify-between items-start mb-4">
                      <div>
                          <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                              <Wand2 className="w-5 h-5 text-purple-600" /> Smart Auto-Fill
                          </h3>
                          <p className="text-sm text-slate-500">Paste the full code block from Firebase Console Project Settings.</p>
                      </div>
                      <button onClick={() => setShowAutoFill(false)}><XCircle className="w-6 h-6 text-gray-400 hover:text-gray-600" /></button>
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
                      className="w-full h-48 p-4 border border-slate-300 rounded-md font-mono text-xs bg-slate-50 focus:ring-2 focus:ring-purple-500 outline-none mb-4"
                  />
                  
                  <div className="flex justify-end gap-3">
                      <button 
                          onClick={() => setShowAutoFill(false)}
                          className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded font-medium"
                      >
                          Cancel
                      </button>
                      <button 
                          onClick={handleSuperAutoFill}
                          className="px-6 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 font-bold shadow-md flex items-center gap-2"
                      >
                          <Wand2 className="w-4 h-4" /> Parse & Fill
                      </button>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};

export default Settings;