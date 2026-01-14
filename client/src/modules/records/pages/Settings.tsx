import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { APP_NAME, APP_VERSION } from '../constants';
import { Link, useNavigate } from 'react-router-dom';
import { signOut, updateProfile, updateEmail, updatePassword, EmailAuthProvider, reauthenticateWithCredential, deleteUser } from 'firebase/auth';
import { recordsAuth as auth, recordsDb as db } from '../../../lib/firebase';
import { doc, collection, getDocs, query, where, writeBatch } from 'firebase/firestore';
import { useCompany } from '../context/CompanyContext';
import { NotificationService } from '../services/NotificationService';
import AboutModal from '../components/AboutModal';

const Settings: React.FC = () => {
  const navigate = useNavigate();
  const { currentCompany } = useCompany();

  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showAbout, setShowAbout] = useState(false);
  const [profileName, setProfileName] = useState(auth.currentUser?.displayName || '');
  const [profileEmail, setProfileEmail] = useState(auth.currentUser?.email || '');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);
  const [updateMessage, setUpdateMessage] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [showNotificationDisclosure, setShowNotificationDisclosure] = useState(false);

  // Pre-notification disclosure compliant permission request
  const handleEnableNotifications = async () => {
    // If user hasn't seen disclosure, show it first
    const hasSeenDisclosure = localStorage.getItem('notification_disclosure_shown');
    if (!hasSeenDisclosure) {
      setShowNotificationDisclosure(true);
      return;
    }
    await requestNotificationPermission();
  };

  const requestNotificationPermission = async () => {
    try {
      await NotificationService.requestPermissions();
      localStorage.setItem('notifications_enabled', 'true');
      alert('Notifications enabled successfully!');
    } catch (e) {
      console.error('Permission request failed:', e);
      alert('Could not enable notifications. Please check your device settings.');
    }
  };

  const handleDisclosureAccept = async () => {
    localStorage.setItem('notification_disclosure_shown', 'true');
    setShowNotificationDisclosure(false);
    await requestNotificationPermission();
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigate('/records/login');
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth.currentUser) return;

    setIsUpdating(true);
    setUpdateMessage('');

    try {
      if (profileName !== auth.currentUser.displayName) {
        await updateProfile(auth.currentUser, { displayName: profileName });
      }

      if (newPassword && newPassword !== confirmPassword) {
        throw new Error("Passwords do not match");
      }

      if ((profileEmail !== auth.currentUser.email || newPassword) && currentPassword) {
        const credential = EmailAuthProvider.credential(auth.currentUser.email!, currentPassword);
        await reauthenticateWithCredential(auth.currentUser, credential);

        if (profileEmail !== auth.currentUser.email) {
          await updateEmail(auth.currentUser, profileEmail);
        }

        if (newPassword) {
          await updatePassword(auth.currentUser, newPassword);
        }
      }

      setUpdateMessage('Profile updated successfully!');
      setTimeout(() => {
        setShowProfileModal(false);
        setUpdateMessage('');
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      }, 1500);
    } catch (error: any) {
      setUpdateMessage(error.message || 'Failed to update profile');
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="relative flex min-h-screen w-full flex-col max-w-md mx-auto bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white pb-24 font-sans"
    >
      <div className="sticky top-0 z-10 bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl px-4 py-4 flex items-center justify-between border-b border-gray-100 dark:border-gray-800">
        <Link to="/records" className="flex items-center gap-2 text-indigo-600">
          <span className="material-symbols-outlined font-black">arrow_back</span>
        </Link>
        <h1 className="text-lg font-black uppercase tracking-widest">Settings</h1>
        <div className="w-6"></div>
      </div>

      <div className="px-4 mt-6">
        <div className="bg-indigo-600/10 border border-indigo-600/20 rounded-3xl p-5 shadow-inner">
          <div className="flex items-start gap-4">
            <span className="material-symbols-outlined text-indigo-600 mt-1">info</span>
            <div>
              <h3 className="text-sm font-black text-indigo-600 uppercase tracking-widest leading-none mb-2">Notice</h3>
              <p className="text-xs text-indigo-600/80 font-bold leading-relaxed">
                This application is for <strong>record management only</strong>.
                It does not provide financial services or credit products.
                All data is managed exclusively by the user.
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="px-4 mt-6">
        <div
          onClick={() => setShowProfileModal(true)}
          className="bg-white dark:bg-gray-800 rounded-3xl p-6 shadow-sm flex items-center gap-4 cursor-pointer border border-gray-100 dark:border-gray-700"
        >
          <div className="bg-indigo-600 rounded-2xl h-16 w-16 shrink-0 flex items-center justify-center text-white text-2xl font-black shadow-xl uppercase">
            {(auth.currentUser?.displayName || auth.currentUser?.email || 'U').charAt(0)}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-lg font-black truncate leading-none mb-1">{auth.currentUser?.displayName || auth.currentUser?.email?.split('@')[0] || 'User'}</p>
            <p className="text-gray-400 text-xs font-bold truncate leading-none mb-1">{auth.currentUser?.email}</p>
            <p className="text-indigo-600 text-[10px] font-black uppercase tracking-widest flex items-center gap-1 mt-2">
              <span className="material-symbols-outlined text-[14px]">edit</span> Edit
            </p>
          </div>
          <span className="material-symbols-outlined text-gray-300">chevron_right</span>
        </div>
      </div>

      <div className="mt-8">
        <h3 className="text-gray-400 text-[10px] font-black uppercase tracking-[0.2em] px-8 mb-3">Organization</h3>
        <div className="mx-4 bg-white dark:bg-gray-800 rounded-3xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden divide-y divide-gray-50 dark:divide-gray-700">
          <Link to="/records/company-selector" className="flex items-center gap-4 p-5 hover:bg-gray-50 transition-colors">
            <div className="size-10 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center"><span className="material-symbols-outlined">business</span></div>
            <div className="flex-1">
              <p className="text-sm font-black uppercase tracking-widest leading-none mb-1">{currentCompany?.name || 'Select Entity'}</p>
              <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Switch or add profiles</p>
            </div>
          </Link>
        </div>
      </div>

      <div className="mt-8">
        <h3 className="text-gray-400 text-[10px] font-black uppercase tracking-[0.2em] px-8 mb-3">Account Security</h3>
        <div className="mx-4 bg-white dark:bg-gray-800 rounded-3xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden divide-y divide-gray-50 dark:divide-gray-700">
          <div onClick={() => setShowProfileModal(true)} className="flex items-center gap-4 p-5 cursor-pointer hover:bg-gray-50 transition-colors">
            <div className="size-10 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center"><span className="material-symbols-outlined">person</span></div>
            <div className="flex-1">
              <p className="text-sm font-black uppercase tracking-widest leading-none mb-1">Update Profile</p>
              <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Email & Password</p>
            </div>
          </div>
          <Link to="/records/user-management" className="flex items-center gap-4 p-5 hover:bg-gray-50 transition-colors">
            <div className="size-10 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center"><span className="material-symbols-outlined">shield_person</span></div>
            <div className="flex-1">
              <p className="text-sm font-black uppercase tracking-widest leading-none mb-1">Access Control</p>
              <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Manage Staff Roles</p>
            </div>
          </Link>
        </div>
      </div>

      <div className="mt-8">
        <h3 className="text-gray-400 text-[10px] font-black uppercase tracking-[0.2em] px-8 mb-3">Customer Greetings</h3>
        <div className="mx-4 bg-white dark:bg-gray-800 rounded-3xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden p-5">
          <Link to="/records/settings/greetings" className="flex items-center gap-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 p-2 -m-2 rounded-2xl transition-colors">
            <div className="size-10 rounded-2xl bg-pink-50 text-pink-600 flex items-center justify-center"><span className="material-symbols-outlined">celebration</span></div>
            <div className="flex-1">
              <p className="text-sm font-black uppercase tracking-widest leading-none mb-1">Occasion System</p>
              <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Manage Festival & Admin Greetings</p>
            </div>
            <span className="material-symbols-outlined text-gray-300">chevron_right</span>
          </Link>
        </div>
      </div>

      {/* NOTIFICATION PREFERENCES - Opt-Out Mechanism with Pre-Permission Disclosure */}
      <div className="mt-8">
        <h3 className="text-gray-400 text-[10px] font-black uppercase tracking-[0.2em] px-8 mb-3">Notification Preferences</h3>
        <div className="mx-4 bg-white dark:bg-gray-800 rounded-3xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden divide-y divide-gray-50 dark:divide-gray-700">
          <div className="flex items-center gap-4 p-5">
            <div className="size-10 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center"><span className="material-symbols-outlined">notifications</span></div>
            <div className="flex-1">
              <p className="text-sm font-black uppercase tracking-widest leading-none mb-1">Record Reminders</p>
              <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Local push notifications</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                defaultChecked={localStorage.getItem('notifications_enabled') !== 'false'}
                onChange={(e) => {
                  if (e.target.checked) {
                    handleEnableNotifications();
                  } else {
                    localStorage.setItem('notifications_enabled', 'false');
                    alert('Reminders disabled. You will no longer receive push notifications.');
                  }
                }}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 dark:peer-focus:ring-indigo-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-indigo-600"></div>
            </label>
          </div>
          <div className="p-4 bg-gray-50 dark:bg-gray-900/30">
            <p className="text-[10px] text-gray-500 dark:text-gray-400 leading-relaxed">
              ℹ️ <strong>Why we need this:</strong> Notifications remind you about your own scheduled records.
              We do not send marketing, promotional, or third-party messages. You can disable anytime in Settings.
            </p>
          </div>
        </div>
      </div>

      <div className="mt-8">
        <h3 className="text-gray-400 text-[10px] font-black uppercase tracking-[0.2em] px-8 mb-3">Legal & Documents</h3>
        <div className="mx-4 bg-white dark:bg-gray-800 rounded-3xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden divide-y divide-gray-50 dark:divide-gray-700">
          <div onClick={() => setShowAbout(true)} className="flex items-center gap-4 p-5 cursor-pointer hover:bg-gray-50 transition-colors">
            <div className="size-10 rounded-2xl bg-orange-50 text-orange-600 flex items-center justify-center"><span className="material-symbols-outlined">info</span></div>
            <div className="flex-1">
              <p className="text-sm font-black uppercase tracking-widest leading-none mb-1">Application Info</p>
              <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Build v{APP_VERSION}</p>
            </div>
          </div>
          <Link to="/records/terms" className="flex items-center gap-4 p-5 hover:bg-gray-50 transition-colors">
            <div className="size-10 rounded-2xl bg-gray-50 text-gray-600 flex items-center justify-center"><span className="material-symbols-outlined">description</span></div>
            <div className="flex-1">
              <p className="text-sm font-black uppercase tracking-widest leading-none mb-1">Terms of Service</p>
              <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">User Agreement</p>
            </div>
          </Link>
          <Link to="/records/privacy" className="flex items-center gap-4 p-5 hover:bg-gray-50 transition-colors">
            <div className="size-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center"><span className="material-symbols-outlined">security</span></div>
            <div className="flex-1">
              <p className="text-sm font-black uppercase tracking-widest leading-none mb-1">Privacy Policy</p>
              <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Data & Safety</p>
            </div>
          </Link>
        </div>
      </div>

      {/* DATA & GRIEVANCE SECTION */}
      <div className="mt-8">
        <h3 className="text-gray-400 text-[10px] font-black uppercase tracking-[0.2em] px-8 mb-3">Data & Support</h3>
        <div className="mx-4 bg-white dark:bg-gray-800 rounded-3xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden divide-y divide-gray-50 dark:divide-gray-700">

          {/* Data Export (GDPR/DPDP Compliance) */}
          <div
            onClick={async () => {
              if (!currentCompany || !auth.currentUser) {
                alert('Please ensure you are logged in.');
                return;
              }

              const confirmed = window.confirm('Export all your data?\n\nThis will download a JSON file containing all your records, customers, and account information for data portability.');
              if (!confirmed) return;

              try {
                // Fetch all user data
                const [recordsSnap, customersSnap] = await Promise.all([
                  getDocs(query(collection(db, 'records'), where('companyId', '==', currentCompany.id))),
                  getDocs(query(collection(db, 'customers'), where('companyId', '==', currentCompany.id)))
                ]);

                const exportData = {
                  exportDate: new Date().toISOString(),
                  user: {
                    email: auth.currentUser.email,
                    displayName: auth.currentUser.displayName,
                    uid: auth.currentUser.uid
                  },
                  company: currentCompany,
                  records: recordsSnap.docs.map(d => ({ id: d.id, ...d.data() })),
                  customers: customersSnap.docs.map(d => ({ id: d.id, ...d.data() }))
                };

                // Download as JSON
                const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `${APP_NAME}_Data_Export_${new Date().toISOString().split('T')[0]}.json`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);

                alert('Data exported successfully! Check your downloads folder.');
              } catch (error) {
                console.error('Export failed:', error);
                alert('Failed to export data. Please try again.');
              }
            }}
            className="flex items-center gap-4 p-5 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            <div className="size-10 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <span className="material-symbols-outlined">download</span>
            </div>
            <div className="flex-1">
              <p className="text-sm font-black uppercase tracking-widest leading-none mb-1">Export My Data</p>
              <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">GDPR/DPDP Data Portability</p>
            </div>
            <span className="material-symbols-outlined text-gray-300">chevron_right</span>
          </div>

          {/* Grievance Redressal Info */}
          <div className="p-5">
            <div className="flex items-start gap-4">
              <div className="size-10 rounded-2xl bg-green-50 text-green-600 flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined">support_agent</span>
              </div>
              <div className="flex-1">
                <p className="text-sm font-black uppercase tracking-widest leading-none mb-2">Grievance Redressal</p>
                <div className="text-xs text-gray-500 space-y-1">
                  <p><strong>Officer:</strong> Lavneet Rathi</p>
                  <p><strong>Email:</strong> <a href="mailto:LOVNEETRATHI@GMAIL.com" className="text-blue-600 underline">LOVNEETRATHI@GMAIL.com</a></p>
                  <p><strong>Response:</strong> Within 24 hours</p>
                </div>
              </div>
            </div>
          </div>

          {/* RBI Disclaimer */}
          <div className="p-5 bg-red-50 dark:bg-red-900/10">
            <div className="flex items-start gap-3">
              <span className="material-symbols-outlined text-red-500 text-lg mt-0.5">warning</span>
              <p className="text-[10px] text-red-600 dark:text-red-400 leading-relaxed font-bold">
                This app is NOT registered with RBI or any financial regulator. We do NOT provide loans, credit, or financial services. Record-keeping only.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* DANGER ZONE */}
      <div className="mt-8">
        <h3 className="text-red-400 text-[10px] font-black uppercase tracking-[0.2em] px-8 mb-3">Danger Zone</h3>
        <div className="mx-4 bg-white dark:bg-gray-800 rounded-3xl border border-red-100 dark:border-red-900/50 shadow-sm overflow-hidden">
          <div
            onClick={async () => {
              if (isDeleting) return;

              const confirmed = window.confirm(
                "⚠️ DELETE ALL MY DATA?\n\nThis will:\n• Delete your account\n• Remove all your personal profile data\n• Anonymize business records (for accounting compliance)\n\nThis action cannot be undone.\n\nType 'DELETE' in the next prompt to confirm."
              );
              if (!confirmed) return;

              const finalConfirm = window.prompt("Type 'DELETE' to confirm permanent deletion:");
              if (finalConfirm !== 'DELETE') {
                alert("Deletion cancelled. 'DELETE' was not typed correctly.");
                return;
              }

              // ACTUAL DELETION IMPLEMENTATION
              const user = auth.currentUser;
              if (!user) {
                alert("No user logged in.");
                return;
              }

              setIsDeleting(true);
              try {
                const batch = writeBatch(db);

                // 1. Delete user document from 'users' collection
                const userDocRef = doc(db, 'users', user.uid);
                batch.delete(userDocRef);

                // 2. Anonymize records created by this user (set createdBy to 'deleted_user')
                // We don't delete records for business accounting compliance
                if (currentCompany?.id) {
                  const recordsQuery = query(
                    collection(db, 'records'),
                    where('companyId', '==', currentCompany.id)
                  );
                  const recordsSnap = await getDocs(recordsQuery);
                  recordsSnap.docs.forEach(docSnap => {
                    const data = docSnap.data();
                    if (data.createdBy === user.email || data.createdBy === user.uid) {
                      batch.update(docSnap.ref, { createdBy: 'deleted_user', modifiedBy: 'deletion_request' });
                    }
                  });
                }

                await batch.commit();

                // 3. Delete Firebase Auth account
                await deleteUser(user);

                alert("Your account and personal data have been permanently deleted.");
                navigate('/records/login');

              } catch (error: any) {
                console.error("Deletion error:", error);
                if (error.code === 'auth/requires-recent-login') {
                  alert("Security check required. Please logout, login again, and retry deletion immediately.");
                } else {
                  alert("Deletion failed: " + (error.message || "Unknown error"));
                }
              } finally {
                setIsDeleting(false);
              }
            }}
            className="flex items-center gap-4 p-5 cursor-pointer hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
          >
            <div className="size-10 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center">
              <span className="material-symbols-outlined">{isDeleting ? 'hourglass_empty' : 'delete_forever'}</span>
            </div>
            <div className="flex-1">
              <p className="text-sm font-black uppercase tracking-widest leading-none mb-1 text-red-600">{isDeleting ? 'Deleting...' : 'Delete My Account & Data'}</p>
              <p className="text-[10px] text-red-400 font-bold uppercase tracking-widest">Permanent deletion (immediate)</p>
            </div>
            <span className="material-symbols-outlined text-red-300">chevron_right</span>
          </div>
        </div>
      </div>

      <div className="px-4 mt-8 space-y-3">
        <button onClick={() => NotificationService.testNotification()} className="w-full h-14 bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm text-sm font-black uppercase tracking-widest text-gray-600 dark:text-gray-300">Test Push</button>
        <button onClick={handleLogout} className="w-full h-16 bg-rose-600 text-white rounded-3xl font-black uppercase tracking-[0.2em] shadow-xl shadow-rose-500/30">End Session</button>
      </div>

      <div className="mt-8 mb-10 text-center">
        <p className="text-[8px] font-black text-gray-300 uppercase tracking-[0.5em]">{APP_NAME} SECURED</p>
      </div>

      {showProfileModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-gray-800 rounded-[2rem] w-full max-w-sm p-8 shadow-2xl animate-in zoom-in-95">
            <h3 className="text-xl font-black uppercase tracking-widest mb-6">Profile Settings</h3>
            <form onSubmit={handleUpdateProfile} className="space-y-4">
              <input type="text" value={profileName} onChange={e => setProfileName(e.target.value)} className="w-full p-4 bg-gray-100 dark:bg-gray-700 rounded-2xl outline-none font-bold" placeholder="Name" />
              <input type="email" value={profileEmail} onChange={e => setProfileEmail(e.target.value)} className="w-full p-4 bg-gray-100 dark:bg-gray-700 rounded-2xl outline-none font-bold" placeholder="Email" />
              <div className="pt-2">
                <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">Change Password</p>
                <input type="password" value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} className="w-full p-4 bg-gray-100 dark:bg-gray-700 rounded-2xl outline-none font-bold mb-2" placeholder="Old Password" />
                <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} className="w-full p-4 bg-gray-100 dark:bg-gray-700 rounded-2xl outline-none font-bold mb-2" placeholder="New Password" />
              </div>
              {updateMessage && <p className="text-xs font-black text-indigo-600 text-center">{updateMessage}</p>}
              <div className="flex gap-2 pt-4">
                <button type="button" onClick={() => setShowProfileModal(false)} className="flex-1 py-4 text-gray-400 font-black uppercase text-xs">Close</button>
                <button type="submit" className="flex-1 bg-indigo-600 text-white py-4 rounded-2xl font-black uppercase text-xs shadow-lg">
                  {isUpdating ? 'Wait...' : 'Save'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <AboutModal isOpen={showAbout} onClose={() => setShowAbout(false)} />

      {/* Pre-Notification Permission Disclosure Modal */}
      {showNotificationDisclosure && (
        <div className="fixed inset-0 z-[100] bg-black/70 backdrop-blur-sm flex items-center justify-center p-6">
          <div className="bg-white dark:bg-gray-800 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl">
            <div className="bg-gradient-to-br from-indigo-600 to-purple-600 p-8 text-center text-white">
              <span className="material-symbols-outlined text-5xl mb-4">notifications_active</span>
              <h3 className="font-black text-xl mb-2">Enable Notifications?</h3>
              <p className="text-indigo-100 text-sm">We need your permission to send reminders</p>
            </div>
            <div className="p-6 space-y-4">
              <div className="bg-indigo-50 dark:bg-indigo-900/20 rounded-2xl p-4 border border-indigo-100 dark:border-indigo-800">
                <h4 className="font-black text-sm text-indigo-700 dark:text-indigo-300 mb-2">📋 What we will notify you about:</h4>
                <ul className="text-xs text-indigo-600 dark:text-indigo-400 space-y-1 font-medium">
                  <li>• Upcoming scheduled record dates</li>
                  <li>• Due installment reminders you set</li>
                  <li>• Important system announcements only</li>
                </ul>
              </div>
              <div className="bg-green-50 dark:bg-green-900/20 rounded-2xl p-4 border border-green-100 dark:border-green-800">
                <h4 className="font-black text-sm text-green-700 dark:text-green-300 mb-2">✅ What we will NEVER do:</h4>
                <ul className="text-xs text-green-600 dark:text-green-400 space-y-1 font-medium">
                  <li>• Send marketing or promotional messages</li>
                  <li>• Share notification data with third parties</li>
                  <li>• Send notifications without your consent</li>
                </ul>
              </div>
              <p className="text-[10px] text-gray-500 dark:text-gray-400 text-center leading-relaxed">
                You can disable notifications anytime in Settings → Notification Preferences.
              </p>
              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setShowNotificationDisclosure(false)}
                  className="flex-1 py-3 rounded-2xl border border-gray-200 dark:border-gray-700 font-bold text-sm hover:bg-gray-50 dark:hover:bg-gray-700 transition-all"
                >
                  Not Now
                </button>
                <button
                  onClick={handleDisclosureAccept}
                  className="flex-1 py-3 rounded-2xl bg-indigo-600 text-white font-bold text-sm hover:bg-indigo-700 transition-all flex items-center justify-center gap-2"
                >
                  <span className="material-symbols-outlined text-lg">check</span>
                  Allow
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </motion.div>
  );
};

export default Settings;
