import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { APP_NAME, APP_VERSION } from '../constants';
import { Link, useNavigate } from 'react-router-dom';
import { signOut, updateProfile, updateEmail, updatePassword, EmailAuthProvider, reauthenticateWithCredential } from 'firebase/auth';
import { auth } from '../firebaseConfig';
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

    </motion.div>
  );
};

export default Settings;
