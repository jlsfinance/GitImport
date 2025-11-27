
import React, { useState, useEffect, useRef } from 'react';
import { CompanyProfile, FirebaseConfig, InvoiceNumberSettings } from '../types';
import { StorageService } from '../services/storageService';
import { Save, Building2, Phone, Mail, MapPin, Database, Download, Upload, AlertCircle, Cloud, CheckCircle, XCircle, Wand2, ExternalLink, Wifi, WifiOff, FileCog } from 'lucide-react';
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

  const [invoiceNumberSettings, setInvoiceNumberSettings] = useState<InvoiceNumberSettings>({
    prefix: '',
    suffix: '',
    startNumber: 1
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
        setInvoiceNumberSettings(company.invoiceNumberSettings || { prefix: '', suffix: '', startNumber: 1 });
    } else {
        const currentProfile = StorageService.getCompanyProfile();
        setProfile(currentProfile);
        setInvoiceNumberSettings(currentProfile.invoiceNumberSettings || { prefix: '', suffix: '', startNumber: 1 });
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

  const handleInvoiceNumberSettingsChange = (field: keyof InvoiceNumberSettings, value: string | number) => {
    setInvoiceNumberSettings(prev => ({ ...prev, [field]: value }));
    setIsSaved(false);
  };

  const handleConfigChange = (field: keyof FirebaseConfig, value: string) => {
      setFirebaseConfig(prev => ({ ...prev, [field]: value }));
      setConnectionStatus(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
        const updatedProfile = {
            ...profile,
            gst: gstNumber,
            gst_enabled: gstEnabled,
            show_hsn_summary: showHSNSummary,
            roundUpDefault: roundUpDefault,
            invoiceNumberSettings: invoiceNumberSettings
        };
        await saveCompany(updatedProfile);
        
        StorageService.saveCompanyProfile(updatedProfile);
        
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
      
      const inited = FirebaseService.init(firebaseConfig);
      if (inited) {
          setIsFirebaseReady(true);
          const testResult = await FirebaseService.testConnection();
          setConnectionStatus(testResult);
          if (testResult.success) {
             if(confirm("Connection Successful! The app needs to reload to sync your data. Reload now?")) {
                 window.location.reload();
             }
          }
      } else {
          setConnectionStatus({ success: false, message: "Failed to initialize Firebase SDK. Check keys." });
      }
  };

  const handleSuperAutoFill = () => {
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
        
        <div className="lg:col-span-2">
           <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 bg-gray-50">
               <h3 className="text-lg font-medium text-slate-900 flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-blue-600" /> Company Profile
                </h3>
            </div>
            <div className="p-6 space-y-6">
                {/* GST and Round up settings... */}

                {/* Invoice Numbering Section */}
                <div className="mt-6 pt-6 border-t">
                  <h3 className="text-lg font-medium text-slate-900 flex items-center gap-2 mb-4">
                      <FileCog className="w-5 h-5 text-indigo-600" /> Invoice Numbering
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                          <label className="block text-sm font-medium text-slate-700 mb-1">Prefix</label>
                          <input
                              type="text"
                              value={invoiceNumberSettings.prefix}
                              onChange={(e) => handleInvoiceNumberSettingsChange('prefix', e.target.value)}
                              placeholder="e.g. INV-"
                              className="w-full rounded-md border border-slate-300 p-2.5 text-sm"
                          />
                      </div>
                      <div>
                          <label className="block text-sm font-medium text-slate-700 mb-1">Start Number</label>
                          <input
                              type="number"
                              value={invoiceNumberSettings.startNumber}
                              onChange={(e) => handleInvoiceNumberSettingsChange('startNumber', parseInt(e.target.value, 10))}
                              className="w-full rounded-md border border-slate-300 p-2.5 text-sm"
                          />
                      </div>
                      <div>
                          <label className="block text-sm font-medium text-slate-700 mb-1">Suffix</label>
                          <input
                              type="text"
                              value={invoiceNumberSettings.suffix}
                              onChange={(e) => handleInvoiceNumberSettingsChange('suffix', e.target.value)}
                              placeholder="e.g. /24-25"
                              className="w-full rounded-md border border-slate-300 p-2.5 text-sm"
                          />
                      </div>
                  </div>
                   <p className="text-xs text-slate-500 mt-2">Example: {invoiceNumberSettings.prefix}{invoiceNumberSettings.startNumber}{invoiceNumberSettings.suffix}</p>
                </div>

                <div className="grid grid-cols-1 gap-4">
                  {/* Company details form fields... */}
                </div>
            </div>

            <div className="bg-gray-50 px-6 py-4 flex justify-between items-center">
              <div className="text-sm text-green-600 font-medium">
                {isSaved && 'Settings saved successfully!'}
              </div>
              <button
                type="submit"
                className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 font-medium shadow-sm"
              >
                <Save className="w-4 h-4" /> Save Changes
              </button>
            </div>
          </form>
        </div>

        {/* Other sections... */}

      </div>
    </div>
  );
};

export default Settings;
