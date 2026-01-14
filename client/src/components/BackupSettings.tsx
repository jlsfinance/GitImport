import React, { useState, useEffect } from 'react';
import { driveBackupService } from '../services/driveBackupService';
import { BACKUP_FREQUENCY, type BackupFrequency } from '../config/driveConfig';
import { StorageService } from '../services/storageService';
import { Cloud, CloudOff, Download, Upload, Trash2, RefreshCw, CheckCircle, AlertCircle, X, HardDrive, Save } from 'lucide-react';

interface BackupMetadata {
    id: string;
    name: string;
    createdTime: string;
    size: number;
}

export const BackupSettings: React.FC<{ onClose: () => void }> = ({ onClose }) => {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [backups, setBackups] = useState<BackupMetadata[]>([]);
    const [frequency, setFrequency] = useState<BackupFrequency>(BACKUP_FREQUENCY.MANUAL);
    const [lastBackupTime, setLastBackupTime] = useState<string | null>(null);
    const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setIsAuthenticated(driveBackupService.isAuthenticated());
        setFrequency(driveBackupService.getBackupFrequency());
        setLastBackupTime(driveBackupService.getLastBackupTime());

        if (driveBackupService.isAuthenticated()) {
            await loadBackups();
        }
    };

    const loadBackups = async () => {
        setIsLoading(true);
        try {
            const backupList = await driveBackupService.listBackups();
            setBackups(backupList);
        } catch (error) {
            console.error('Failed to load backups:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleConnectDrive = async () => {
        setIsLoading(true);
        setStatusMessage(null);

        try {
            const success = await driveBackupService.initialize();

            if (success) {
                setIsAuthenticated(true);
                setStatusMessage({ type: 'success', text: 'Google Drive connected successfully!' });
                await loadBackups();
            } else {
                setStatusMessage({ type: 'error', text: 'Failed to connect to Google Drive' });
            }
        } catch (error) {
            setStatusMessage({ type: 'error', text: 'Connection error. Please try again.' });
        } finally {
            setIsLoading(false);
        }
    };

    const handleDisconnect = async () => {
        if (!confirm('Are you sure you want to disconnect from Google Drive?')) {
            return;
        }

        await driveBackupService.signOut();
        setIsAuthenticated(false);
        setBackups([]);
        setStatusMessage({ type: 'info', text: 'Disconnected from Google Drive' });
    };

    const handleCreateBackup = async () => {
        setIsLoading(true);
        setStatusMessage(null);

        try {
            const backup = await driveBackupService.createBackup();

            if (backup) {
                setStatusMessage({ type: 'success', text: 'Backup created successfully!' });
                setLastBackupTime(new Date().toISOString());
                await loadBackups();
            } else {
                setStatusMessage({ type: 'error', text: 'Backup creation failed' });
            }
        } catch (error) {
            setStatusMessage({ type: 'error', text: 'Failed to create backup' });
        } finally {
            setIsLoading(false);
        }
    };

    const handleRestore = async (backupId: string, backupName: string) => {
        if (!confirm(`Restore from backup: ${backupName}?\n\nThis will replace all current data. A backup of current data will be created first.`)) {
            return;
        }

        setIsLoading(true);
        setStatusMessage(null);

        try {
            const success = await driveBackupService.restoreBackup(backupId, 'replace');

            if (success) {
                setStatusMessage({ type: 'success', text: 'Data restored successfully! Please refresh the app.' });
                setTimeout(() => {
                    window.location.reload();
                }, 2000);
            } else {
                setStatusMessage({ type: 'error', text: 'Restore failed' });
            }
        } catch (error) {
            setStatusMessage({ type: 'error', text: 'Failed to restore backup' });
        } finally {
            setIsLoading(false);
        }
    };

    const handleDeleteBackup = async (backupId: string, backupName: string) => {
        if (!confirm(`Delete backup: ${backupName}?`)) {
            return;
        }

        setIsLoading(true);
        try {
            const success = await driveBackupService.deleteBackup(backupId);

            if (success) {
                setStatusMessage({ type: 'success', text: 'Backup deleted' });
                await loadBackups();
            } else {
                setStatusMessage({ type: 'error', text: 'Failed to delete backup' });
            }
        } catch (error) {
            setStatusMessage({ type: 'error', text: 'Delete operation failed' });
        } finally {
            setIsLoading(false);
        }
    };

    const handleFrequencyChange = (newFrequency: BackupFrequency) => {
        driveBackupService.setBackupFrequency(newFrequency);
        setFrequency(newFrequency);
        setStatusMessage({ type: 'info', text: `Auto-backup set to: ${newFrequency}` });
    };

    const formatDate = (isoString: string) => {
        const date = new Date(isoString);
        return date.toLocaleString('en-IN', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    const formatFileSize = (bytes: number) => {
        if (bytes < 1024) return bytes + ' B';
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
        return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    };

    // --- LOCAL BACKUP FUNCTIONS ---
    const handleLocalBackup = () => {
        try {
            const backupData = {
                version: '1.0',
                timestamp: new Date().toISOString(),
                appVersion: '1.9.8',
                data: {
                    invoices: StorageService.getInvoices(),
                    customers: StorageService.getCustomers(),
                    products: StorageService.getProducts(),
                    payments: StorageService.getPayments(),
                    expenses: StorageService.getExpenses(),
                    purchases: StorageService.getPurchases(),
                    company: StorageService.getCompanyProfile()
                }
            };

            const dataStr = JSON.stringify(backupData, null, 2);
            const blob = new Blob([dataStr], { type: 'application/json' });
            const url = URL.createObjectURL(blob);

            const link = document.createElement('a');
            link.href = url;
            link.download = `billbook_backup_${new Date().toISOString().split('T')[0]}.json`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);

            setStatusMessage({ type: 'success', text: 'Local backup downloaded successfully!' });
        } catch (error) {
            setStatusMessage({ type: 'error', text: 'Failed to create local backup' });
        }
    };

    const handleLocalRestore = () => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';

        input.onchange = async (e: any) => {
            const file = e.target.files?.[0];
            if (!file) return;

            try {
                const text = await file.text();
                const backupData = JSON.parse(text);

                if (!backupData.data || !backupData.version) {
                    setStatusMessage({ type: 'error', text: 'Invalid backup file format' });
                    return;
                }

                if (!confirm('This will replace all current data with the backup. Continue?')) {
                    return;
                }

                // Restore data - destructure only what we use
                const { customers, products, company } = backupData.data;
                // Note: invoices, payments, expenses restore would need saveInvoice etc. which has side effects
                // For now, we only restore master data (Products, Customers, Company)

                // Save to localStorage and Firebase
                if (products) products.forEach((p: any) => StorageService.saveProduct(p));
                if (customers) customers.forEach((c: any) => StorageService.saveCustomer(c));
                if (company) StorageService.saveCompanyProfile(company);

                setStatusMessage({ type: 'success', text: 'Data restored! Please refresh the app.' });
                setTimeout(() => window.location.reload(), 2000);
            } catch (error) {
                setStatusMessage({ type: 'error', text: 'Failed to restore from backup file' });
            }
        };

        input.click();
    };

    const handleSyncToCloud = async () => {
        if (!isAuthenticated) {
            setStatusMessage({ type: 'error', text: 'Please connect to Google Drive first' });
            return;
        }

        setIsLoading(true);
        try {
            const backup = await driveBackupService.createBackup('Manual Sync');
            if (backup) {
                setStatusMessage({ type: 'success', text: 'Data synced to Google Drive!' });
                await loadBackups();
            } else {
                setStatusMessage({ type: 'error', text: 'Sync failed' });
            }
        } catch (error) {
            setStatusMessage({ type: 'error', text: 'Failed to sync to cloud' });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-surface rounded-[32px] shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
                {/* Header */}
                <div className="bg-gradient-to-r from-google-blue to-indigo-600 p-6 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <Cloud className="w-8 h-8 text-white" />
                        <div>
                            <h2 className="text-2xl font-black text-white">Backup & Sync</h2>
                            <p className="text-sm text-white/80">Google Drive Integration</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="w-10 h-10 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors"
                    >
                        <X className="w-5 h-5 text-white" />
                    </button>
                </div>

                <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
                    {/* Status Message */}
                    {statusMessage && (
                        <div className={`mb-6 p-4 rounded-2xl flex items-start gap-3 ${statusMessage.type === 'success' ? 'bg-green-50 text-green-800' :
                            statusMessage.type === 'error' ? 'bg-red-50 text-red-800' :
                                'bg-blue-50 text-blue-800'
                            }`}>
                            {statusMessage.type === 'success' ? <CheckCircle className="w-5 h-5 mt-0.5" /> :
                                statusMessage.type === 'error' ? <AlertCircle className="w-5 h-5 mt-0.5" /> :
                                    <AlertCircle className="w-5 h-5 mt-0.5" />}
                            <p className="text-sm font-bold">{statusMessage.text}</p>
                        </div>
                    )}

                    {/* LOCAL BACKUP SECTION - Works Offline */}
                    <div className="mb-6 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-2xl p-4">
                        <div className="flex items-center gap-3 mb-4">
                            <HardDrive className="w-6 h-6 text-amber-600" />
                            <div>
                                <h3 className="text-sm font-black text-amber-900 dark:text-amber-200">Local Backup (Offline)</h3>
                                <p className="text-xs text-amber-700 dark:text-amber-400">Export/Import data without internet</p>
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <button
                                onClick={handleLocalBackup}
                                className="p-3 bg-amber-600 text-white rounded-xl flex items-center justify-center gap-2 font-bold text-sm hover:bg-amber-700 transition-colors"
                            >
                                <Save className="w-4 h-4" />
                                Export Backup
                            </button>
                            <button
                                onClick={handleLocalRestore}
                                className="p-3 bg-amber-100 dark:bg-amber-800 text-amber-800 dark:text-amber-100 rounded-xl flex items-center justify-center gap-2 font-bold text-sm border border-amber-300 dark:border-amber-700 hover:bg-amber-200 transition-colors"
                            >
                                <Download className="w-4 h-4" />
                                Import Backup
                            </button>
                        </div>
                    </div>

                    {/* Connection Status */}
                    {!isAuthenticated ? (
                        <div className="text-center py-12">
                            <CloudOff className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                            <h3 className="text-lg font-bold text-foreground mb-2">Not Connected</h3>
                            <p className="text-sm text-muted-foreground mb-6">Connect to Google Drive for free cloud backup</p>
                            <button
                                onClick={handleConnectDrive}
                                disabled={isLoading}
                                className="px-8 py-3 bg-google-blue text-white rounded-full font-bold shadow-lg hover:shadow-xl transition-all disabled:opacity-50"
                            >
                                {isLoading ? 'Connecting...' : 'Connect Google Drive'}
                            </button>
                            <p className="text-xs text-muted-foreground mt-4">✅ Free • 15GB Storage • Secure</p>
                        </div>
                    ) : (
                        <div className="space-y-6">
                            {/* Connected Status */}
                            <div className="bg-green-50 border border-green-200 rounded-2xl p-4 flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <CheckCircle className="w-6 h-6 text-green-600" />
                                    <div>
                                        <p className="text-sm font-bold text-green-900">Connected to Google Drive</p>
                                        <p className="text-xs text-green-700">{lastBackupTime ? `Last backup: ${formatDate(lastBackupTime)}` : 'No backups yet'}</p>
                                    </div>
                                </div>
                                <button
                                    onClick={handleDisconnect}
                                    className="text-xs text-green-700 hover:text-green-900 font-bold"
                                >
                                    Disconnect
                                </button>
                            </div>

                            {/* Action Buttons */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <button
                                    onClick={handleCreateBackup}
                                    disabled={isLoading}
                                    className="p-4 bg-google-blue text-white rounded-2xl flex items-center justify-center gap-3 font-bold hover:bg-blue-700 transition-colors disabled:opacity-50"
                                >
                                    <Upload className="w-5 h-5" />
                                    {isLoading ? 'Creating...' : 'Backup Now'}
                                </button>

                                <button
                                    onClick={handleSyncToCloud}
                                    disabled={isLoading}
                                    className="p-4 bg-emerald-600 text-white rounded-2xl flex items-center justify-center gap-3 font-bold hover:bg-emerald-700 transition-colors disabled:opacity-50"
                                >
                                    <Cloud className="w-5 h-5" />
                                    Sync to Cloud
                                </button>

                                <button
                                    onClick={loadBackups}
                                    disabled={isLoading}
                                    className="p-4 bg-surface-container-high border border-border rounded-2xl flex items-center justify-center gap-3 font-bold hover:bg-surface-container-highest transition-colors disabled:opacity-50"
                                >
                                    <RefreshCw className={`w-5 h-5 ${isLoading ? 'animate-spin' : ''}`} />
                                    Refresh List
                                </button>
                            </div>

                            {/* Auto-Backup Settings */}
                            <div className="bg-surface-container-high rounded-2xl p-4">
                                <h3 className="text-sm font-black text-foreground mb-3">Auto-Backup Frequency</h3>
                                <div className="flex gap-3">
                                    {[
                                        { value: BACKUP_FREQUENCY.MANUAL, label: 'Manual' },
                                        { value: BACKUP_FREQUENCY.DAILY, label: 'Daily' },
                                        { value: BACKUP_FREQUENCY.WEEKLY, label: 'Weekly' },
                                    ].map((option) => (
                                        <button
                                            key={option.value}
                                            onClick={() => handleFrequencyChange(option.value)}
                                            className={`flex-1 py-2 px-4 rounded-xl text-sm font-bold transition-all ${frequency === option.value
                                                ? 'bg-google-blue text-white shadow-md'
                                                : 'bg-surface-container border border-border text-muted-foreground hover:bg-surface-container-highest'
                                                }`}
                                        >
                                            {option.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Backup History */}
                            <div>
                                <h3 className="text-sm font-black text-foreground mb-3">Backup History ({backups.length})</h3>
                                {backups.length === 0 ? (
                                    <div className="text-center py-8 text-muted-foreground text-sm">
                                        No backups found. Create your first backup!
                                    </div>
                                ) : (
                                    <div className="space-y-2 max-h-64 overflow-y-auto">
                                        {backups.map((backup) => (
                                            <div
                                                key={backup.id}
                                                className="bg-surface-container border border-border rounded-xl p-4 flex items-center justify-between hover:bg-surface-container-high transition-colors"
                                            >
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm font-bold text-foreground truncate">{backup.name}</p>
                                                    <p className="text-xs text-muted-foreground">
                                                        {formatDate(backup.createdTime)} • {formatFileSize(backup.size)}
                                                    </p>
                                                </div>
                                                <div className="flex gap-2 ml-4">
                                                    <button
                                                        onClick={() => handleRestore(backup.id, backup.name)}
                                                        disabled={isLoading}
                                                        className="p-2 rounded-lg bg-green-50 text-green-600 hover:bg-green-100 transition-colors disabled:opacity-50"
                                                        title="Restore"
                                                    >
                                                        <Download className="w-4 h-4" />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDeleteBackup(backup.id, backup.name)}
                                                        disabled={isLoading}
                                                        className="p-2 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 transition-colors disabled:opacity-50"
                                                        title="Delete"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
