import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { APP_NAME } from '../constants';
import { useNavigate } from 'react-router-dom';
import { CustomerAuthService } from '../services/customerAuthService';
import { collection, query, where, getDocs, updateDoc, doc, getDoc } from 'firebase/firestore';
import { recordsDb as db, recordsAuth as auth } from '../../../lib/firebase';
import { signInAnonymously } from 'firebase/auth';

const CustomerLogin: React.FC = () => {
  const navigate = useNavigate();
  // Modes: 'LOGIN' | 'SIGNUP' | 'SET_PASSWORD' | 'SELECT_ACCOUNT'
  const [mode, setMode] = useState<'LOGIN' | 'SIGNUP' | 'SET_PASSWORD' | 'SELECT_ACCOUNT'>('LOGIN');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [fullName, setFullName] = useState('');
  const [mobile, setMobile] = useState('');
  const [acceptedTerms, setAcceptedTerms] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Disclosure State (Play Store Compliance)
  const [showDisclosure, setShowDisclosure] = useState(false);

  // Multi-Company Selection State
  const [multipleAccounts, setMultipleAccounts] = useState<any[]>([]);

  useEffect(() => {
    // Check if this is a magic link re-entry
    if (CustomerAuthService.isActivationLink(window.location.href)) {
      setMode('SET_PASSWORD');
      const savedEmail = window.localStorage.getItem('emailForSignIn');
      if (savedEmail) setEmail(savedEmail);
    }

    // Check Disclosure Acceptance
    const accepted = localStorage.getItem('hasAcceptedDisclosure');
    if (!accepted) setShowDisclosure(true);
  }, []);

  const proceedToPortal = (custDocId: string, companyId: string) => {
    localStorage.setItem('customerPortalId', custDocId);
    localStorage.setItem('customerPortalCompanyId', companyId);
    navigate('/records/customer-portal');
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await CustomerAuthService.login(email, password);

      // Find Customer Record(s) for this email
      // Note: We only look for ACTIVE accounts for login.
      const q = query(collection(db, 'customers'), where('email', '==', email));
      const snap = await getDocs(q);

      if (snap.empty) {
        throw new Error("No customer record found for this email.");
      }

      // Filter for ACTIVE accounts
      const activeDocs = snap.docs.filter(d => d.data().authStatus === 'ACTIVE');

      if (activeDocs.length === 0) {
        // Diagnose why
        const pending = snap.docs.find(d => d.data().authStatus === 'PENDING_APPROVAL');
        if (pending) throw new Error("Your account is pending admin approval.");

        const rejected = snap.docs.find(d => d.data().authStatus === 'REJECTED');
        if (rejected) throw new Error("Your account application was rejected.");

        throw new Error("Account not active. Please complete signup.");
      }

      if (activeDocs.length === 1) {
        const d = activeDocs[0];
        proceedToPortal(d.id, d.data().companyId);
      } else {
        // Multiple Matches - Prepare Selection
        const accounts = await Promise.all(activeDocs.map(async d => {
          const data = d.data();
          let companyName = data.companyName;
          if (!companyName && data.companyId) {
            // Fetch Company Name if missing
            try {
              const cSnap = await getDoc(doc(db, 'companies', data.companyId));
              if (cSnap.exists()) companyName = cSnap.data().name;
            } catch (e) { console.error("Failed to fetch company", e); }
          }
          return {
            id: d.id,
            companyId: data.companyId,
            name: data.name,
            companyName: companyName || 'Unknown Company',
            phone: data.phone
          };
        }));

        setMultipleAccounts(accounts);
        setMode('SELECT_ACCOUNT');
      }

    } catch (err: any) {
      console.error("Login Error", err);
      setError(err.message || "Invalid email or password.");
    } finally {
      setLoading(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');

    if (!fullName.trim()) return setError("Full Name is required.");
    if (!email.trim() || !email.includes('@')) return setError("Valid Email is required.");
    if (!fullName.trim()) return setError("Full Name is required.");
    if (!email.trim() || !email.includes('@')) return setError("Valid Email is required.");
    if (mobile.length < 10) return setError("Valid Mobile Number is required.");
    if (!acceptedTerms) return setError("You must accept the Terms and Conditions.");

    setLoading(true);

    try {
      // Ensure we are authenticated (Anonymous) so Firestore Rules allow lookup
      if (!auth.currentUser) {
        await signInAnonymously(auth);
      }

      // Call Service
      await CustomerAuthService.claimAccount(fullName, email, mobile);

      setSuccessMsg(`Verification link sent to ${email}. Please check your inbox to activate your account.`);
    } catch (err: any) {
      console.error("Signup Error", err);
      // Helpful error messages
      if (err.message.includes("permission-denied")) {
        setError("Access denied. Please ensure your mobile number is correct and already registered by the merchant.");
      } else {
        setError(err.message || "Failed to sign up.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (password !== confirmPassword) return setError("Passwords do not match.");
    if (password.length < 6) return setError("Password must be at least 6 characters.");

    setLoading(true);
    try {
      let userEmail = email;
      if (!userEmail) {
        userEmail = window.prompt("Please confirm your email address for verification:") || '';
      }
      if (!userEmail) throw new Error("Email is required.");

      const user = await CustomerAuthService.completeActivation(userEmail, window.location.href);
      await CustomerAuthService.setPassword(user, password);

      // Link UID & Set Status
      const q = query(collection(db, 'customers'), where('email', '==', userEmail));
      const snap = await getDocs(q);

      if (!snap.empty) {
        // Note: If multiple 'EMAIL_PENDING' records exist for same email, we should update ALL of them?
        // Usually signup is one-by-one. But if a user has 2 records and claimed both with same email,
        // we should link both. 
        // For simplicity, we link all matching records found.
        const updatePromises = snap.docs.map(d => updateDoc(doc(db, 'customers', d.id), {
          uid: user.uid,
          authStatus: 'PENDING_APPROVAL',
          emailVerified: true
        }));
        await Promise.all(updatePromises);

        await CustomerAuthService.logout();
        setSuccessMsg("Password set successfully! Your account is now Pending Approval. You will be notified when active.");
        setMode('LOGIN');
        window.localStorage.removeItem('emailForSignIn');
      } else {
        throw new Error("Customer record not found.");
      }

    } catch (err: any) {
      console.error("Set Password Error", err);
      setError(err.message || "Activation failed. Link might be expired.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white dark:bg-[#1e2736] rounded-3xl shadow-xl overflow-hidden p-8">

        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-blue-200">
            <span className="material-symbols-outlined text-3xl text-white">storefront</span>
          </div>
          <h1 className="text-2xl font-black text-slate-800 dark:text-white">Customer Portal</h1>
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-2">{APP_NAME} Secure Access</p>
        </div>

        {/* MODE TABS (Hidden in SET_PASSWORD or SELECT_ACCOUNT) */}
        {mode !== 'SET_PASSWORD' && mode !== 'SELECT_ACCOUNT' && (
          <div className="flex p-1 bg-slate-100 dark:bg-slate-800 rounded-xl mb-6">
            <button
              onClick={() => { setMode('LOGIN'); setError(''); setSuccessMsg(''); }}
              className={`flex-1 py-3 text-xs font-black uppercase tracking-wider rounded-lg transition-all ${mode === 'LOGIN' ? 'bg-white dark:bg-slate-700 text-blue-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
            >
              Login
            </button>
            <button
              onClick={() => { setMode('SIGNUP'); setError(''); setSuccessMsg(''); }}
              className={`flex-1 py-3 text-xs font-black uppercase tracking-wider rounded-lg transition-all ${mode === 'SIGNUP' ? 'bg-white dark:bg-slate-700 text-blue-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
            >
              Sign Up
            </button>
          </div>
        )}

        <AnimatePresence mode="wait">

          {/* LOGIN FORM */}
          {mode === 'LOGIN' && (
            <motion.form
              key="login"
              initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}
              onSubmit={handleLogin}
              className="space-y-4"
            >
              {successMsg && <div className="p-3 bg-emerald-50 text-emerald-600 text-xs font-bold rounded-xl text-center mb-4">{successMsg}</div>}
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Email Address</label>
                <input type="email" value={email} onChange={e => setEmail(e.target.value)} required
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 font-bold" />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Password</label>
                <input type="password" value={password} onChange={e => setPassword(e.target.value)} required
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 font-bold" />
              </div>
              <button type="submit" disabled={loading} className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white font-black rounded-xl shadow-lg shadow-blue-200 transition-all flex items-center justify-center gap-2">
                {loading ? <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <>Login Securely <span className="material-symbols-outlined">login</span></>}
              </button>
            </motion.form>
          )}

          {/* SIGNUP FORM */}
          {mode === 'SIGNUP' && (
            <motion.form
              key="signup"
              initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
              onSubmit={handleSignup}
              className="space-y-4"
            >
              <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-2xl mb-4 border border-blue-100 dark:border-blue-800">
                <p className="text-[11px] text-blue-800 dark:text-blue-200 leading-relaxed font-medium">
                  To access your account, verify your details. We will send a secure link to your email.
                </p>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Full Name</label>
                <input type="text" value={fullName} onChange={e => setFullName(e.target.value)} required placeholder="Your Name"
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 font-bold" />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Mobile Number</label>
                <input type="tel" value={mobile} onChange={e => setMobile(e.target.value)} required placeholder="Linked with Business"
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 font-bold" />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Email Address</label>
                <input type="email" value={email} onChange={e => setEmail(e.target.value)} required placeholder="For Login Access"
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 font-bold" />
              </div>

              <div className="flex items-start gap-3 px-1">
                <input
                  type="checkbox"
                  checked={acceptedTerms}
                  onChange={e => setAcceptedTerms(e.target.checked)}
                  className="mt-1 w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <label className="text-[10px] text-slate-500 leading-tight">
                  I agree to the <a href="/terms" className="text-blue-600 font-bold hover:underline" target="_blank">Terms and Conditions</a> and <a href="/privacy-policy" className="text-blue-600 font-bold hover:underline" target="_blank">Privacy Policy</a>.
                </label>
              </div>
              <button type="submit" disabled={loading} className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-xl shadow-lg shadow-emerald-200 transition-all flex items-center justify-center gap-2">
                {loading ? <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <>Send Verification Link <span className="material-symbols-outlined">send</span></>}
              </button>
            </motion.form>
          )}

          {/* PASSWORD SET FORM */}
          {mode === 'SET_PASSWORD' && (
            <motion.form key="setpass" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} onSubmit={handleSetPassword} className="space-y-4">
              <div className="text-center mb-6"><h3 className="text-lg font-black text-slate-800 dark:text-white">Set Your Password</h3><p className="text-xs text-slate-500">Create a secure password to access your account.</p></div>
              <div><label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Email</label><input type="email" value={email} disabled className="w-full px-4 py-3 bg-slate-100 dark:bg-slate-800 border-none rounded-xl text-slate-500 font-bold cursor-not-allowed" /></div>
              <div><label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">New Password</label><input type="password" value={password} onChange={e => setPassword(e.target.value)} required minLength={6} className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 font-bold" /></div>
              <div><label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Confirm Password</label><input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} required minLength={6} className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 font-bold" /></div>
              <button type="submit" disabled={loading} className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white font-black rounded-xl shadow-lg shadow-indigo-200 transition-all flex items-center justify-center gap-2">
                {loading ? <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <>Set Password & Login <span className="material-symbols-outlined">check_circle</span></>}
              </button>
            </motion.form>
          )}

          {/* SELECT ACCOUNT SCREEN */}
          {mode === 'SELECT_ACCOUNT' && (
            <motion.div key="select" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-4">
              <div className="text-center mb-6"><h3 className="text-lg font-black text-slate-800 dark:text-white">Select Account</h3><p className="text-xs text-slate-500">Your email is linked to multiple companies.</p></div>
              <div className="space-y-3 max-h-60 overflow-y-auto">
                {multipleAccounts.map(curr => (
                  <div key={curr.id} onClick={() => proceedToPortal(curr.id, curr.companyId)} className="p-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl cursor-pointer hover:bg-blue-50 dark:hover:bg-blue-900/20 active:scale-95 transition-all">
                    <h4 className="font-bold text-sm text-slate-900 dark:text-white">{curr.companyName}</h4>
                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">{curr.name}</p>
                  </div>
                ))}
              </div>
              <button onClick={() => setMode('LOGIN')} className="w-full py-3 text-slate-400 font-bold text-xs uppercase tracking-widest hover:text-slate-600">Back to Login</button>
            </motion.div>
          )}

        </AnimatePresence>

        {error && <div className="mt-6 p-3 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800 text-red-600 dark:text-red-400 text-xs font-bold text-center rounded-xl animate-bounce-in">{error}</div>}

        <div className="mt-8 pt-6 border-t border-slate-100 dark:border-slate-800 text-center">
          <p className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">Disclaimer</p>
          <p className="text-[10px] text-slate-400 mt-1 max-w-xs mx-auto leading-relaxed">
            This app is a digital ledger for record-keeping only. We are not a lender and do not provide loans.
          </p>
          <a href="/privacy-policy" target="_blank" className="text-[10px] font-bold text-blue-500 mt-2 inline-block">Privacy Policy</a>

          {/* Business & Module Links */}
          <div className="flex gap-3 mt-6 justify-center">
            <button
              onClick={() => navigate('/records/login')}
              className="flex items-center gap-2 px-4 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 font-bold text-xs rounded-xl transition-all"
            >
              <span className="material-symbols-outlined text-lg">storefront</span>
              Business Login
            </button>
            <button
              onClick={() => {
                localStorage.removeItem('active_module');
                navigate('/');
                window.location.reload(); // Force reload to reset state
              }}
              className="flex items-center gap-2 px-4 py-2.5 bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/40 text-blue-600 dark:text-blue-400 font-bold text-xs rounded-xl transition-all border border-blue-100 dark:border-blue-800"
            >
              <span className="material-symbols-outlined text-lg">apps</span>
              Module Selector
            </button>
          </div>
        </div>
      </div>

      {/* MANDATORY DISCLOSURE MODAL */}
      {showDisclosure && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/80 backdrop-blur-md animate-in fade-in">
          <div className="bg-white dark:bg-[#1e2736] rounded-3xl w-full max-w-sm p-8 shadow-2xl border-4 border-blue-600">
            <div className="text-center mb-6">
              <span className="material-symbols-outlined text-4xl text-blue-600 mb-2">verified_user</span>
              <h2 className="text-xl font-black text-slate-900 dark:text-white">Important Disclosure</h2>
            </div>
            <div className="space-y-4 text-xs font-medium text-slate-600 dark:text-slate-300 leading-relaxed text-center">
              <p>
                <strong>{APP_NAME}</strong> is a business record-keeping tool.
              </p>
              <p className="bg-blue-50 dark:bg-blue-900/30 p-3 rounded-xl border border-blue-100 dark:border-blue-800 text-blue-800 dark:text-blue-200">
                🚫 <strong>WE DO NOT PROVIDE LOANS.</strong><br />
                We are not a bank, NBFC, or lending partner.
              </p>
              <p>
                By continuing, you acknowledge that this app is used solely for managing your own business transactions and ledgers.
              </p>
            </div>
            <button
              onClick={() => {
                localStorage.setItem('hasAcceptedDisclosure', 'true');
                setShowDisclosure(false);
              }}
              className="w-full mt-8 py-4 bg-blue-600 hover:bg-blue-700 text-white font-black text-xs rounded-xl uppercase tracking-widest shadow-lg shadow-blue-200"
            >
              I Understand & Agree
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default CustomerLogin;