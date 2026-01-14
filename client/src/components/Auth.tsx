import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Receipt, Lock, Mail, UserPlus, LogIn, AlertTriangle, ArrowRight, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export const Auth = () => {
  const { signIn, signUp } = useAuth();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isLogin) {
        await signIn(email, password);
      } else {
        await signUp(email, password);
      }
    } catch (err: any) {
      console.error("Auth Error:", err);
      let msg = "Authentication failed.";
      if (err.code?.includes("auth/invalid-email") || err.message?.includes("auth/invalid-email")) msg = "Invalid email address.";
      if (err.code?.includes("auth/user-not-found") || err.code?.includes("auth/invalid-credential")) msg = "Invalid email or password.";
      if (err.code?.includes("auth/wrong-password")) msg = "Incorrect password.";
      if (err.code?.includes("auth/email-already-in-use")) msg = "Email already registered.";
      if (err.code?.includes("auth/weak-password")) msg = "Password should be at least 6 characters.";
      if (err.code?.includes("auth/network-request-failed")) msg = "Network error. Check your connection.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 relative flex items-center justify-center p-4 overflow-hidden">
      {/* Dynamic Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900" />

      {/* Animated Orbs */}
      <motion.div
        animate={{
          scale: [1, 1.2, 1],
          rotate: [0, 90, 0],
          opacity: [0.3, 0.5, 0.3]
        }}
        transition={{ duration: 10, repeat: Infinity }}
        className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] rounded-full bg-blue-600/20 blur-[100px]"
      />
      <motion.div
        animate={{
          scale: [1, 1.1, 1],
          x: [0, 50, 0],
          opacity: [0.2, 0.4, 0.2]
        }}
        transition={{ duration: 15, repeat: Infinity }}
        className="absolute bottom-[-10%] right-[-10%] w-[600px] h-[600px] rounded-full bg-indigo-600/20 blur-[120px]"
      />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md relative z-10"
      >
        <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-3xl shadow-2xl overflow-hidden">
          {/* Header Section */}
          <div className="p-8 pb-6 text-center border-b border-white/10">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 200, damping: 15 }}
              className="inline-flex p-4 bg-gradient-to-tr from-blue-500 to-indigo-600 rounded-2xl shadow-lg mb-4 group"
            >
              <Receipt className="w-8 h-8 text-white group-hover:rotate-12 transition-transform duration-300" />
            </motion.div>
            <h2 className="text-3xl font-bold text-white mb-2 tracking-tight">BillFlow</h2>
            <p className="text-blue-200 text-sm font-medium">Smart Invoicing & Business Management</p>
            <p className="text-slate-400 text-xs mt-1">by Lavneet Rathi</p>
          </div>

          {/* Form Section */}
          <div className="p-8 pt-6 bg-white/95 backdrop-blur-sm">
            <div className="mb-6 flex p-1 bg-slate-100 rounded-xl relative">
              <motion.div
                className="absolute top-1 bottom-1 bg-white rounded-lg shadow-sm"
                initial={false}
                animate={{
                  left: isLogin ? '4px' : '50%',
                  width: 'calc(50% - 4px)'
                }}
              />
              <button
                onClick={() => { setIsLogin(true); setError(''); }}
                className={`flex-1 relative z-10 text-sm font-bold py-2 rounded-lg transition-colors ${isLogin ? 'text-blue-700' : 'text-slate-500 hover:text-slate-700'}`}
              >
                Sign In
              </button>
              <button
                onClick={() => { setIsLogin(false); setError(''); }}
                className={`flex-1 relative z-10 text-sm font-bold py-2 rounded-lg transition-colors ${!isLogin ? 'text-blue-700' : 'text-slate-500 hover:text-slate-700'}`}
              >
                Sign Up
              </button>
            </div>

            <AnimatePresence mode="wait">
              <motion.form
                key={isLogin ? 'login' : 'signup'}
                initial={{ opacity: 0, x: isLogin ? -20 : 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: isLogin ? 20 : -20 }}
                transition={{ duration: 0.2 }}
                className="space-y-5"
                onSubmit={handleSubmit}
              >
                {error && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-xl flex items-start gap-3 text-sm"
                  >
                    <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                    <span>{error}</span>
                  </motion.div>
                )}

                <div className="space-y-1">
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Email</label>
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Mail className="h-5 w-5 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
                    </div>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="your@email.com"
                      className="block w-full pl-10 pr-3 py-3 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all bg-slate-50 focus:bg-white"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Password</label>
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Lock className="h-5 w-5 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
                    </div>
                    <input
                      type="password"
                      required
                      minLength={6}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="block w-full pl-10 pr-3 py-3 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all bg-slate-50 focus:bg-white"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className={`w-full flex justify-center items-center gap-2 py-3.5 px-4 rounded-xl text-sm font-bold text-white transition-all shadow-lg hover:shadow-blue-500/30 active:scale-[0.98] ${loading
                    ? 'bg-slate-400 cursor-not-allowed'
                    : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700'
                    }`}
                >
                  {loading ? (
                    'Processing...'
                  ) : (
                    <>
                      {isLogin ? 'Sign In' : 'Create Account'}
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </motion.form>
            </AnimatePresence>

            <div className="mt-8 pt-6 border-t border-slate-100 text-center">
              <p className="text-xs text-slate-400">
                {isLogin ? "Don't have an account yet?" : "Already have an account?"}
              </p>
              <button
                onClick={() => { setIsLogin(!isLogin); setError(''); }}
                className="text-sm font-bold text-blue-600 hover:text-blue-700 mt-1 hover:underline"
              >
                {isLogin ? "Sign up for free" : "Log in to existing account"}
              </button>

              <div className="mt-4 pt-4 border-t border-slate-100">
                <button
                  onClick={() => {
                    localStorage.removeItem('active_module');
                    window.location.href = '/';
                  }}
                  className="text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors flex items-center justify-center gap-2 w-full"
                >
                  <ArrowRight className="w-3 h-3 rotate-180" />
                  Switch Module
                </button>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default Auth;
