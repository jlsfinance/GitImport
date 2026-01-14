import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import { signInAnonymously } from 'firebase/auth';
import { recordsDb as db, recordsAuth as auth } from '../../../lib/firebase';
import { format } from 'date-fns';
import { PdfGenerator } from '../services/PdfGenerator';
import { NotificationService } from '../services/NotificationService';
import { Capacitor } from '@capacitor/core';
import { APP_VERSION, SUPPORT_EMAIL, SUPPORT_PHONE, APP_NAME } from '../constants';
import { GreetingService } from '../../../services/greetingService';
import { Customer, FinancialRecord, Company, Installment } from '../types';
import NotificationListener from '../components/NotificationListener';
import { CustomerAuthService } from '../services/customerAuthService';

/**
 * IMPORTANT: Google Play Billing Compliance Note
 * ===============================================
 * This UPI ID is NOT for app monetization or subscriptions.
 * 
 * The UPI feature enables P2P (person-to-person) payment recording between:
 * - The app USER (business owner) and their CUSTOMERS
 * 
 * Each business configures their own UPI ID in company settings.
 * This fallback ID is only for demo/testing purposes.
 * 
 * The app does NOT collect any payments - it only helps users
 * RECORD transactions they have with their personal contacts.
 */
const DEMO_UPI_ID = "9413821007@superyes";

const CustomerPortal: React.FC = () => {
  const navigate = useNavigate();
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [records, setRecords] = useState<FinancialRecord[]>([]);
  const [company, setCompany] = useState<Company | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentTab, setCurrentTab] = useState<'home' | 'records' | 'history' | 'profile'>('home');
  const [showSupportModal, setShowSupportModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<FinancialRecord | null>(null);
  const [selectedInstallment, setSelectedInstallment] = useState<Installment | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);

  const [isAuthReady, setIsAuthReady] = useState(false);

  // Account Control State
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [newPass, setNewPass] = useState('');
  const [confirmPass, setConfirmPass] = useState('');
  const [processing, setProcessing] = useState(false);

  // Greeting System State
  const [greeting, setGreeting] = useState<{ message: string; type: 'ADMIN' | 'FESTIVAL' | null; title?: string } | null>(null);

  const formatCurrency = (val: number) => `₹${new Intl.NumberFormat("en-IN").format(val)}`;
  const formatDate = (d: string) => { try { return format(new Date(d), 'dd MMM yyyy'); } catch { return d; } };

  useEffect(() => {
    // Ensure we have an anonymous auth session for Firestore Rules
    const ensureAuth = async () => {
      if (!auth.currentUser) {
        try {
          await signInAnonymously(auth);
        } catch (e) {
          console.error("Anonymous Auth Failed", e);
        }
      }
      setIsAuthReady(true);
    };
    ensureAuth();
  }, []);

  const fetchData = useCallback(async () => {
    const cid = localStorage.getItem('customerPortalId');
    if (!cid) return navigate('/records/customer-login');
    setLoading(true);
    try {
      const cSnap = await getDoc(doc(db, "customers", cid));
      if (!cSnap.exists()) return navigate('/records/customer-login');
      const cData = { id: cSnap.id, ...cSnap.data() } as Customer;
      setCustomer(cData);

      if (cData.companyId) {
        const compSnap = await getDoc(doc(db, "companies", cData.companyId));
        if (compSnap.exists()) {
          const compData = { id: compSnap.id, ...compSnap.data() } as Company;
          setCompany(compData);

          // Check for Greeting Immediately
          const activeGreeting = GreetingService.getTodayGreeting(compData as any);
          setGreeting(activeGreeting);
        }
      }

      const lSnap = await getDocs(query(collection(db, "records"), where("customerId", "==", cid)));
      const fetchedRecords = lSnap.docs.map(d => {
        const data = d.data();
        const rawSchedule = data.paymentSchedule || data.repaymentSchedule || [];

        const schedule = rawSchedule.map((inst: any) => ({
          ...inst,
          installmentNumber: inst.installmentNumber || inst.emiNumber,
          date: inst.date || inst.dueDate,
          dueDate: inst.dueDate || inst.date,
          status: inst.status || 'Pending'
        }));

        return {
          id: d.id,
          ...data,
          // Ensure all required FinancialRecord fields exist
          amount: data.amount || 0,
          // LEGACY: interestRate renamed to markupRate for neutrality
          markupRate: data.markupRate || data.serviceFeePercent || data.interestRate || data.rate || 0,
          status: data.status || 'Active',
          date: data.date || data.createdAt || new Date().toISOString(),
          // LEGACY field mappings (kept for backward compat)
          installmentAmount: data.installmentAmount || data.emi || 0,
          serviceFeePercent: data.serviceFeePercent || data.interestRate || data.rate || 0,
          durationMonths: data.durationMonths || data.tenure || 0,
          tenure: data.tenure || data.durationMonths || 0,
          rate: data.rate || data.serviceFeePercent || data.interestRate || 0,
          // Both property names for compatibility with PdfGenerator
          paymentSchedule: schedule,
          repaymentSchedule: schedule
        } as FinancialRecord;
      });
      setRecords(fetchedRecords.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  useEffect(() => {
    if (records.length > 0) {
      NotificationService.scheduleRecordNotifications(records as any);
    }
  }, [records]);

  useEffect(() => {
    if (isAuthReady) fetchData();
  }, [fetchData, isAuthReady]);

  // Old festival effect removed

  const activeRecords = useMemo(() => records.filter(l => l.status === 'Active' || l.status === 'Approved'), [records]);
  const getNextInstallment = (record: FinancialRecord) => record.paymentSchedule?.find(e => e.status === 'Pending' || e.status === 'Overdue');

  const primaryRecord = activeRecords[0];
  const nextInstallment = primaryRecord ? getNextInstallment(primaryRecord) : null;
  const isOverdue = nextInstallment ? new Date() > new Date(nextInstallment.dueDate) : false;

  const historyLogs = useMemo(() => {
    try {
      const logs: any[] = [];
      records?.forEach(l => {
        const recordDate = l.date ? new Date(l.date) : null;
        if (recordDate && !isNaN(recordDate.getTime())) {
          logs.push({ type: 'record', date: recordDate, amount: l.amount, id: l.id });
        }
        if (!l || !l.paymentSchedule) return;
        l.paymentSchedule.filter(e => e && e.status?.toLowerCase() === 'paid').forEach(e => {
          const pDateS = e.paymentDate || (e as any).paidDate || (e as any).date;
          const instDate = pDateS ? new Date(pDateS) : null;
          if (instDate && !isNaN(instDate.getTime())) {
            logs.push({
              type: 'installment',
              date: instDate,
              amount: e.amountPaid || e.amount || 0,
              instNo: e.installmentNumber,
              recordId: l.id,
              instData: e
            });
          }
        });
      });
      return logs.sort((a, b) => (b.date.getTime() - a.date.getTime()));
    } catch (e) {
      console.error("History Log generation error:", e);
      return [];
    }
  }, [records]);

  const handleLogout = () => {
    const confirmed = window.confirm("Are you sure you want to logout?");
    if (confirmed) {
      localStorage.removeItem('customerPortalId');
      localStorage.removeItem('customerPortalPhone');
      window.location.href = '/records/customer-login';
    }
  };

  if (loading || !isAuthReady) {
    return (
      <div className="h-screen flex items-center justify-center bg-white dark:bg-gray-900">
        <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent animate-spin rounded-full"></div>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto min-h-screen bg-gray-50 dark:bg-gray-900 font-sans selection:bg-blue-100 scroll-smooth overflow-x-hidden" style={{ paddingBottom: 'calc(16rem + env(safe-area-inset-bottom))' }}>
      <NotificationListener />

      {/* Header */}
      <header className="bg-[#6366f1] pb-16 px-6 rounded-b-[2.5rem] shadow-xl relative overflow-hidden" style={{ paddingTop: 'calc(3rem + env(safe-area-inset-top))' }}>
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/3 blur-3xl"></div>
        <div className="flex justify-between items-center relative z-10 text-white">
          <div className="flex items-center gap-3">
            <div className="w-14 h-14 rounded-full border-2 border-white/40 overflow-hidden bg-indigo-500 shadow-lg">
              {customer?.photo_url ? <img src={customer.photo_url} className="w-full h-full object-cover" alt="Profile" /> : <div className="w-full h-full flex items-center justify-center font-bold text-2xl">{customer?.name?.charAt(0)}</div>}
            </div>
            <div>
              <p className="text-blue-100 text-[10px] uppercase font-black tracking-[0.2em] opacity-80">Dashboard</p>
              <h1 className="font-extrabold text-xl leading-none">{customer?.name}</h1>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button className="p-2.5 bg-white/20 rounded-full backdrop-blur-lg active:scale-90 transition-all border border-white/10 shadow-sm"><span className="material-symbols-outlined text-2xl">notifications</span></button>
            <button onClick={handleLogout} className="p-2.5 bg-red-500 rounded-full border border-red-400 active:scale-95 transition-all shadow-md"><span className="material-symbols-outlined text-2xl">logout</span></button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="relative z-20">

        {/* Quick Actions Panel */}
        <div className="mx-6 -mt-10 bg-white dark:bg-gray-800 p-5 rounded-[2.5rem] shadow-[0_20px_40px_rgba(0,0,0,0.1)] border border-gray-100 dark:border-gray-700 grid grid-cols-4 gap-3 relative z-30">
          {[
            { label: 'Pay Installment', icon: 'payments', bg: 'btn-kadak', color: 'text-white', isSpecial: true, action: () => { if (nextInstallment && primaryRecord) { setSelectedRecord(primaryRecord); setSelectedInstallment(nextInstallment); setShowPaymentModal(true); } else alert("No pending installment found!"); } },
            { label: 'History', icon: 'history', bg: 'bg-purple-50 dark:bg-purple-900/20', color: 'text-purple-600 dark:text-purple-400', action: () => setCurrentTab('history') },
            { label: 'Support', icon: 'support_agent', bg: 'bg-green-50 dark:bg-green-900/20', color: 'text-green-600 dark:text-green-400', action: () => setShowSupportModal(true) },
            { label: 'More', icon: 'dashboard_customize', bg: 'bg-orange-50 dark:bg-orange-900/20', color: 'text-orange-600 dark:text-orange-400', action: () => setCurrentTab('profile') },
          ].map((item, i) => (
            <div key={i} onClick={item.action} className="flex flex-col items-center gap-2 cursor-pointer transition-all">
              <div className={`w-14 h-14 rounded-2xl ${item.bg} flex items-center justify-center shadow-sm border border-black/5 active:scale-90 transition-transform ${item.isSpecial ? 'shadow-indigo-500/40' : ''}`}>
                <div className={`${item.isSpecial ? 'w-8 h-8 rounded-full bg-white/20 flex items-center justify-center' : ''}`}>
                  <span className={`material-symbols-outlined ${item.color} ${item.isSpecial ? 'text-xl' : 'text-2xl'}`}>{item.icon}</span>
                </div>
              </div>
              <span className="text-[9px] font-black text-gray-500 dark:text-gray-400 uppercase tracking-tighter">{item.label}</span>
            </div>
          ))}
        </div>

        {/* Home Tab */}
        {currentTab === 'home' && (
          <div className="px-6 py-6 animate-in fade-in slide-in-from-bottom-5 duration-500">

            {/* NEW GREETING CARD */}
            {greeting && (
              <div className={`mb-6 p-6 rounded-[2.5rem] shadow-xl text-white relative overflow-hidden ${greeting.type === 'ADMIN' ? 'bg-gradient-to-br from-indigo-600 to-violet-600' : 'bg-gradient-to-br from-pink-500 to-rose-500'}`}>
                <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl -translate-y-1/2 translate-x-1/3"></div>
                <div className="relative z-10">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center backdrop-blur-sm border border-white/10">
                      <span className="material-symbols-outlined text-xl">{greeting.type === 'ADMIN' ? 'campaign' : 'celebration'}</span>
                    </div>
                    <span className="text-[10px] font-black uppercase tracking-[0.2em] opacity-80">{greeting.title || 'Message'}</span>
                  </div>
                  <p className="text-lg font-bold leading-relaxed whitespace-pre-line font-serif text-white/95 text-shadow-sm">
                    {greeting.message}
                  </p>
                  {greeting.type === 'FESTIVAL' && <p className="mt-4 text-[10px] font-black uppercase tracking-widest opacity-60">Greetings from {company?.name}</p>}
                </div>
              </div>
            )}

            {/* Dynamic Message Card (Hindi) */}
            {nextInstallment && (
              <div className={`mb-8 p-6 rounded-[2rem] shadow-xl border-l-8 ${isOverdue ? 'bg-red-50 border-red-600 text-red-900 shadow-red-100' : 'bg-blue-50 border-blue-600 text-blue-900 shadow-blue-100'} flex items-start gap-5 transition-all`}>
                <div className={`w-14 h-14 rounded-full flex items-center justify-center shrink-0 shadow-lg ${isOverdue ? 'bg-red-600 text-white animate-pulse' : 'bg-blue-600 text-white'}`}>
                  <span className="material-symbols-outlined text-3xl">{isOverdue ? 'warning' : 'notifications_active'}</span>
                </div>
                <div className="flex-1">
                  <h3 className="font-extrabold text-xl mb-1.5">{isOverdue ? '⚠️ तत्काल भुगतान करें!' : `नमस्ते ${customer?.name?.split(' ')[0]} 🙏`}</h3>
                  <p className="text-sm font-semibold leading-snug">
                    {isOverdue
                      ? `Alert! आपकी ₹${nextInstallment.amount} की पेमेंट दिनांक ${formatDate(nextInstallment.dueDate)} को देय थी। कृपया विलम्ब शुल्क (Low CIBIL) से बचने के लिए अभी भुगतान करें।`
                      : `प्रिय ग्राहक, आपकी अगली क़िस्त ₹${nextInstallment.amount} दिनांक ${formatDate(nextInstallment.dueDate)} को देय है। कृपया अच्छा क्रेडिट स्कोर बनाए रखने के लिए समय पर भुगतान करें।`
                    }
                  </p>
                </div>
              </div>
            )}

            <div className="flex justify-between items-center mb-5">
              <h2 className="font-black text-xl text-gray-800 dark:text-white flex items-center gap-3"><span className="w-2 h-7 bg-[#6366f1] rounded-full"></span> Active Records</h2>
              <button onClick={() => setCurrentTab('records')} className="text-[#6366f1] font-bold text-xs uppercase tracking-widest bg-[#6366f1]/10 px-3 py-1.5 rounded-full hover:bg-[#6366f1]/20 transition">View All</button>
            </div>

            <div className="space-y-5">
              {activeRecords.length === 0 ? (
                <div className="p-12 text-center text-gray-400 font-bold bg-white dark:bg-gray-800 rounded-3xl border-4 border-dashed border-gray-100 dark:border-gray-700">
                  <span className="material-symbols-outlined text-6xl mb-3 opacity-20">contract_edit</span>
                  <p>No active records found at the moment.</p>
                </div>
              ) : activeRecords.map(record => (
                <div key={record.id} className="bg-white dark:bg-gray-800 p-6 rounded-[2.5rem] shadow-[0_5px_20px_rgba(0,0,0,0.03)] border border-gray-100 dark:border-gray-700 relative overflow-hidden group active:scale-[0.98] transition-all">
                  <div className="absolute top-0 right-0 p-4"><span className="text-[10px] font-black px-3 py-1 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-100 uppercase tracking-wider">{record.status}</span></div>
                  <h3 className="font-bold text-gray-500 uppercase text-[10px] tracking-widest mb-1">Account Identity</h3>
                  <p className="font-black text-lg text-gray-900 dark:text-white mb-5 flex items-center gap-2">#{record.id}</p>

                  <div className="flex items-center justify-between mt-4 bg-gray-50 dark:bg-gray-900/40 p-4 rounded-2xl border border-black/5">
                    <div><p className="text-[9px] text-gray-400 font-black uppercase tracking-widest mb-1.5">Total Amount</p><p className="font-black text-2xl text-indigo-600 leading-none">{formatCurrency(record.amount)}</p></div>
                    <div className="text-right"><p className="text-[9px] text-gray-400 font-black uppercase tracking-widest mb-1.5">Next Due</p><p className="font-black text-sm text-gray-700 dark:text-gray-200 leading-none">{formatDate(getNextInstallment(record)?.dueDate || '-')}</p></div>
                  </div>
                  <button onClick={() => { setSelectedRecord(record); setShowDetailsModal(true); }} className="w-full mt-6 py-4 btn-kadak text-sm rounded-2xl hover:brightness-110 transition-all uppercase tracking-widest flex items-center justify-center gap-2">
                    <span className="material-symbols-outlined text-xl material-symbols-fill">list_alt</span>
                    View Schedule & Pay
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Records Tab */}
        {currentTab === 'records' && (
          <div className="px-6 py-6 animate-in slide-in-from-bottom-5 duration-500">
            <h2 className="font-black text-2xl mb-8 text-gray-900 dark:text-white">Account Ledger</h2>
            <div className="space-y-5">
              {records.map(record => (
                <div key={record.id} className="bg-white dark:bg-gray-800 p-6 rounded-[2rem] shadow-sm border border-gray-100 dark:border-gray-700 active:scale-[0.97] transition-all">
                  <div className="flex justify-between items-start mb-4">
                    <div><p className="text-[10px] text-gray-400 font-black uppercase tracking-widest">ID: #{record.id}</p><p className="font-black text-2xl text-gray-900 dark:text-white">{formatCurrency(record.amount)}</p></div>
                    <span className={`text-[10px] font-black px-3 py-1 rounded-full ${record.status === 'Active' ? 'bg-indigo-50 text-indigo-600 border-indigo-100' : 'bg-gray-100 text-gray-500 border-gray-200'} border uppercase`}>{record.status}</span>
                  </div>
                  <div className="flex justify-between items-center bg-gray-50 dark:bg-gray-900/50 p-4 rounded-xl">
                    <div><p className="text-[9px] text-gray-400 font-black tracking-widest uppercase">Start Date</p><p className="font-bold text-sm">{formatDate(record.date)}</p></div>
                    <button onClick={() => { setSelectedRecord(record); setShowDetailsModal(true); }} className="px-5 py-2.5 bg-white dark:bg-gray-700 text-blue-600 font-black text-[10px] rounded-lg border border-blue-100 shadow-sm uppercase">Manage</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* History Tab */}
        {currentTab === 'history' && (
          <div className="px-6 py-6 animate-in slide-in-from-right-5 duration-500">
            <h2 className="font-black text-2xl mb-8 text-gray-900 dark:text-white">Transaction Logs</h2>
            <div className="space-y-4">
              {historyLogs.map((log, i) => (
                <div key={i}
                  onClick={async () => {
                    try {
                      if (!customer || !company) return alert("Please wait for data to load.");
                      if (log.type === 'record') {
                        const lData = records.find(l => l.id === log.id);
                        if (lData) await PdfGenerator.generateServiceAgreement(lData as any, customer as any, company as any);
                      } else {
                        const tRecord = records.find(l => l.id === log.recordId);
                        const tInst = tRecord?.paymentSchedule?.find(e => e.installmentNumber === log.instNo);
                        if (tRecord && tInst) await PdfGenerator.generateReceipt(tRecord as any, tInst as any, customer as any, company as any);
                      }
                    } catch (err) { alert("Generation failed."); }
                  }}
                  className="bg-white dark:bg-gray-800 p-5 rounded-[2rem] shadow-sm border border-gray-100 dark:border-gray-700 flex justify-between items-center group active:bg-gray-50 dark:active:bg-gray-700 transition-all cursor-pointer"
                >
                  <div className="flex items-center gap-5">
                    <div className={`w-14 h-14 rounded-full flex items-center justify-center border shadow-sm group-hover:scale-105 transition-all ${log.type === 'record' ? 'bg-indigo-50 border-indigo-100 text-indigo-600' : 'bg-emerald-50 border-emerald-100 text-emerald-600'}`}>
                      <span className="material-symbols-outlined text-3xl font-variation-FILL">{log.type === 'record' ? 'account_balance' : 'verified_user'}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-black text-sm text-gray-900 dark:text-white leading-tight truncate">{log.type === 'record' ? 'Record Created' : `Inst #${log.instNo} Payment`}</p>
                      <p className="text-[10px] text-gray-400 font-bold uppercase mt-0.5">Ref: #{log.id || log.recordId}</p>
                      <div className="flex items-center gap-3 mt-1.5 text-blue-600">
                        <div className="flex items-center gap-1.5 opacity-60"><span className="material-symbols-outlined text-[14px]">calendar_month</span><span className="text-[10px] font-bold">{log.date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}</span></div>
                        <span className="text-[10px] font-black uppercase tracking-widest">{log.type === 'record' ? 'Agreement' : 'Receipt'}</span>
                        <span className="material-symbols-outlined text-[12px] opacity-70">arrow_right_alt</span>
                      </div>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className={`font-black text-xl leading-none ${log.type === 'record' ? 'text-indigo-600' : 'text-emerald-600'}`}>{log.type === 'record' ? '+' : '-'}{formatCurrency(log.amount)}</p>
                    <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest leading-none">Entry</span>
                  </div>
                </div>
              ))}
              {historyLogs.length === 0 && <div className="py-24 text-center opacity-30"><span className="material-symbols-outlined text-8xl mb-4">history_edu</span><p className="font-black text-lg">No records yet.</p></div>}
            </div>
          </div>
        )}

        {/* Profile/More Tab */}
        {currentTab === 'profile' && (
          <div className="px-6 py-6 animate-in slide-in-from-left-5 duration-500">
            <h2 className="font-black text-2xl mb-8 text-gray-900 dark:text-white">Account Portfolio</h2>
            <div className="space-y-6">
              <div className="p-8 bg-white dark:bg-gray-800 rounded-[2.5rem] shadow-sm border border-gray-100 dark:border-gray-700 text-center relative overflow-hidden">
                <div className="absolute top-0 inset-x-0 h-32 bg-blue-600/10 blur-3xl"></div>
                <div className="w-28 h-28 rounded-full bg-blue-600 border-4 border-white dark:border-gray-700 mx-auto mb-6 relative z-10 overflow-hidden shadow-2xl flex items-center justify-center text-white">
                  {customer?.photo_url ? <img src={customer.photo_url} className="w-full h-full object-cover" alt="Profile" /> : <span className="text-5xl font-black">{customer?.name?.charAt(0)}</span>}
                </div>
                <h3 className="font-black text-2xl text-gray-900 dark:text-white mb-1">{customer?.name}</h3>
                <p className="text-gray-500 text-sm font-bold tracking-tight">{customer?.phone}</p>
                <div className="mt-4 inline-block px-4 py-1.5 bg-[#6366f1]/10 text-[#6366f1] rounded-full font-black text-[10px] uppercase tracking-widest border border-[#6366f1]/20">Customer</div>
              </div>

              <div className="bg-white dark:bg-gray-800 rounded-[2rem] shadow-md border border-gray-100 dark:border-gray-700 overflow-hidden">
                {[
                  {
                    label: 'Download Account Statement',
                    icon: 'description',
                    action: async () => {
                      if (!customer || !company) return alert("Please wait, data is still loading...");
                      try {
                        await PdfGenerator.generateAccountStatement(records as any, customer as any, company as any);
                      } catch (err) { alert("Download failed. Try again."); }
                    }
                  },
                  {
                    label: 'Account Clearance Certificate',
                    icon: 'workspace_premium',
                    action: async () => {
                      if (!customer || !company) return alert("Please wait, data is still loading...");
                      try {
                        const closedRecord = records.find(l => ['Settled'].includes(l.status));
                        if (closedRecord) {
                          await PdfGenerator.generateNoDuesCertificate(closedRecord as any, customer as any, company as any);
                        } else {
                          alert("No settled records found to generate a certificate.");
                        }
                      } catch (err) { alert("Generation failed."); }
                    }
                  },
                  { label: 'Payment Receipts', icon: 'receipt_long', action: () => setCurrentTab('history') },
                  { label: 'Live Support Chat', icon: 'smart_toy', action: () => setShowSupportModal(true) },
                  { label: 'Change Password', icon: 'lock_reset', action: () => setShowChangePassword(true) },
                  { label: 'Business Login', icon: 'storefront', action: () => navigate('/records/login') },
                  { label: 'Module Selector', icon: 'apps', action: () => { localStorage.removeItem('active_module'); window.location.href = '/'; } },
                  { label: 'Delete My Account', icon: 'delete_forever', color: 'text-red-500', action: () => setShowDeleteConfirm(true) },
                  { label: 'Log Out Session', icon: 'logout', color: 'text-red-500', action: handleLogout },
                ].map((m, i, arr) => (
                  <div key={i} onClick={m.action} className={`p-5 flex items-center justify-between cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-all ${i !== arr.length - 1 ? 'border-b border-gray-50 dark:border-gray-700' : ''}`}>
                    <div className="flex items-center gap-4">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${m.color ? 'bg-red-50' : 'bg-gray-50 dark:bg-gray-900'}`}><span className={`material-symbols-outlined text-2xl ${m.color || 'text-gray-400 opacity-70'}`}>{m.icon}</span></div>
                      <span className={`font-black text-sm uppercase tracking-tight ${m.color || 'text-gray-700 dark:text-gray-200'}`}>{m.label}</span>
                    </div>
                    <span className="material-symbols-outlined text-gray-300 text-lg">chevron_right</span>
                  </div>
                ))}
              </div>

              {/* Build Version Info */}
              <div className="pt-10 pb-4 flex flex-col items-center gap-2 opacity-30">
                <div className="flex items-center gap-3">
                  <span className="w-10 h-[1px] bg-gray-400"></span>
                  <span className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-500">{APP_NAME}</span>
                  <span className="w-10 h-[1px] bg-gray-400"></span>
                </div>
                <p className="text-[9px] font-bold text-gray-400">Environment: Production (Android)</p>
                <div className="px-3 py-1 bg-gray-100 dark:bg-gray-700 rounded-full border border-gray-200 dark:border-gray-600">
                  <span className="text-[10px] font-black text-gray-600 dark:text-gray-300">Build {APP_VERSION}</span>
                </div>
              </div>
            </div>
          </div>
        )}

      </main>

      {/* Spacer to ensure scrolling past the fixed nav */}
      <div className="h-40" />

      {/* Modern Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 w-full max-w-md mx-auto bg-white/95 dark:bg-gray-900/95 backdrop-blur-2xl border-t border-gray-100 dark:border-gray-800 pt-4 px-2 flex justify-between items-center z-50 shadow-[0_-10px_40px_rgba(0,0,0,0.1)] rounded-t-[3rem]" style={{ paddingBottom: 'calc(1.5rem + env(safe-area-inset-bottom))' }}>
        {[
          { id: 'home', icon: 'home', label: 'Home' },
          { id: 'records', icon: 'account_balance_wallet', label: 'Ledger' },
          { id: 'qr', icon: 'qr_code_scanner', label: 'Pay Now' },
          { id: 'history', icon: 'history', label: 'History' },
          { id: 'profile', icon: 'person', label: 'Account' },
        ].map(tab => (
          <div key={tab.id}
            onClick={() => {
              if (tab.id === 'qr') {
                if (nextInstallment && primaryRecord) {
                  setSelectedRecord(primaryRecord);
                  setSelectedInstallment(nextInstallment);
                  setShowPaymentModal(true);
                } else alert("No due installment at this moment!");
              } else {
                setCurrentTab(tab.id as any);
              }
            }}
            className={`flex-1 flex flex-col items-center gap-1.5 cursor-pointer transition-all duration-300 ${tab.id === 'qr' ? '-mt-16 bg-[#6366f1] min-w-[64px] h-16 rounded-full flex items-center justify-center text-white shadow-2xl shadow-[#6366f1]/40 active:scale-90 border-[6px] border-white dark:border-gray-900 z-50' : currentTab === tab.id ? 'text-[#6366f1] scale-110' : 'text-gray-400 hover:text-gray-600'}`}>
            <span className={`material-symbols-outlined text-[28px] ${currentTab === tab.id ? 'font-variation-FILL' : ''}`}>{tab.icon}</span>
            {tab.id !== 'qr' && <span className="text-[9px] font-black uppercase tracking-widest leading-none">{tab.label}</span>}
          </div>
        ))}
      </nav>

      {/* Improved Support Modal */}
      {showSupportModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/70 backdrop-blur-lg animate-in fade-in">
          <div className="bg-white dark:bg-gray-800 rounded-[3rem] w-full max-w-sm overflow-hidden shadow-2xl border border-white/20">
            <div className="p-10 text-center">
              <div className="w-16 h-16 rounded-full bg-blue-600 flex items-center justify-center text-white mb-4 shadow-lg shadow-blue-200">
                <span className="text-2xl font-black">{APP_NAME.charAt(0)}</span>
              </div>
              <h3 className="font-black text-xl text-gray-900 dark:text-white mb-2">Contact {APP_NAME} Team</h3>
              <p className="text-sm text-gray-500 mb-8 max-w-[200px]">How can we help you today? Our support team is ready.</p>

              <div className="w-full space-y-3">
                <a href={`tel:${SUPPORT_PHONE}`} className="w-full py-4 bg-gray-50 dark:bg-gray-900 rounded-2xl flex items-center justify-between px-6 border border-gray-100 dark:border-gray-700 active:scale-95 transition-all">
                  <div className="flex items-center gap-4">
                    <span className="material-symbols-outlined text-blue-600">call</span>
                    <span className="font-black text-xs text-gray-900 dark:text-white uppercase tracking-widest">{SUPPORT_PHONE}</span>
                  </div>
                  <span className="material-symbols-outlined text-gray-300 text-sm">open_in_new</span>
                </a>
                <a href={`mailto:${SUPPORT_EMAIL}`} className="w-full py-4 bg-gray-50 dark:bg-gray-900 rounded-2xl flex items-center justify-between px-6 border border-gray-100 dark:border-gray-700 active:scale-95 transition-all">
                  <div className="flex items-center gap-4">
                    <span className="material-symbols-outlined text-blue-600">mail</span>
                    <span className="font-black text-xs text-gray-900 dark:text-white uppercase tracking-widest">{SUPPORT_EMAIL}</span>
                  </div>
                  <span className="material-symbols-outlined text-gray-300 text-sm">open_in_new</span>
                </a>
              </div>

              <button onClick={() => setShowSupportModal(false)} className="w-full mt-6 py-5 bg-gray-900 dark:bg-white dark:text-gray-900 text-white font-black text-sm rounded-2xl active:scale-95 transition-all uppercase tracking-widest shadow-xl">Back to App</button>
            </div>
          </div>
        </div>
      )}

      {/* Enhanced Payment Modal */}
      {showPaymentModal && selectedInstallment && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/80 backdrop-blur-xl animate-in zoom-in duration-300">
          <div className="bg-white dark:bg-gray-800 rounded-[3rem] w-full max-w-sm overflow-hidden shadow-2xl">
            <div className="bg-gradient-to-br from-blue-600 to-indigo-700 p-10 text-center text-white relative">
              <button onClick={() => setShowPaymentModal(false)} className="absolute top-6 right-6 p-2.5 bg-white/20 rounded-full hover:bg-white/30 active:scale-90 transition-all"><span className="material-symbols-outlined text-sm">close</span></button>
              <h3 className="font-black text-2xl mb-1">Record Payment</h3>
              <p className="text-blue-100 text-[10px] font-black uppercase tracking-widest opacity-70">Personal Transaction Reference</p>
              <div className="mt-8 bg-white p-4 rounded-3xl inline-block shadow-2xl border-4 border-white">
                <img
                  src={`https://quickchart.io/qr?text=${encodeURIComponent(`upi://pay?pa=${company?.upiId || DEMO_UPI_ID}&pn=${encodeURIComponent(company?.name || 'Company')}&am=${selectedInstallment.amount}&cu=INR&tn=INST${selectedInstallment.installmentNumber}`)}&size=300`}
                  className="w-48 h-48 rounded-xl"
                  alt="Payment QR Reference"
                />
              </div>
            </div>
            <div className="p-10">
              {/* GOOGLE PLAY BILLING COMPLIANCE DISCLAIMER */}
              <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border-2 border-red-300 dark:border-red-800 rounded-2xl">
                <p className="text-[10px] text-red-700 dark:text-red-300 font-bold leading-relaxed">
                  ⚠️ <strong>OFFLINE TRANSACTION NOTICE:</strong>
                  <br /><br />
                  This payment is for <strong>goods or services delivered OUTSIDE this app</strong>.
                  This app does NOT process payments, subscriptions, or in-app purchases.
                  <br /><br />
                  The app developer is NOT responsible for any transaction between you and {company?.name || 'the business'}.
                  This is purely a personal record-keeping reference.
                </p>
              </div>
              <div className="flex justify-between items-center mb-6">
                <div><p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Net Payable</p><p className="font-black text-3xl text-gray-900 dark:text-white">{formatCurrency(selectedInstallment.amount)}</p></div>
                <div className="text-right"><p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">INST REF</p><p className="font-black text-lg text-blue-600 bg-blue-50 px-3 py-1 rounded-lg">#{selectedInstallment.installmentNumber}</p></div>
              </div>
              <button
                onClick={async () => {
                  try {
                    const upiId = company?.upiId || DEMO_UPI_ID;
                    const payeeName = encodeURIComponent(company?.name || 'Company');
                    const amount = selectedInstallment.amount;
                    const transactionNote = encodeURIComponent(`INST_PAYMENT_RECORD_${selectedRecord?.id}_INST_${selectedInstallment.installmentNumber}`);
                    const upiUrl = `upi://pay?pa=${upiId}&pn=${payeeName}&am=${amount}&cu=INR&tn=${transactionNote}`;

                    if (Capacitor.isNativePlatform()) {
                      window.open(upiUrl, '_system');
                    } else {
                      window.location.href = upiUrl;
                    }
                  } catch (e) {
                    console.error("Payment trigger failed:", e);
                    alert("Could not open payment app.");
                  }
                }}
                className="w-full py-5 btn-kadak text-sm rounded-2xl flex items-center justify-center gap-3 active:scale-95 transition-all mb-6 uppercase tracking-widest"
              >
                <span className="material-symbols-outlined text-2xl material-symbols-fill">rocket_launch</span>
                Open UPI App
              </button>
              <button onClick={() => setShowPaymentModal(false)} className="w-full py-2 text-gray-400 font-bold text-[10px] uppercase tracking-[0.3em] opacity-50">Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Detailed Record Schedule Modal */}
      {showDetailsModal && selectedRecord && (
        <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/70 backdrop-blur-md animate-in slide-in-from-bottom-full duration-500">
          <div className="bg-white dark:bg-gray-800 w-full max-w-md rounded-t-[3.5rem] p-10 max-h-[88vh] overflow-y-auto shadow-[0_-20px_50px_rgba(0,0,0,0.2)]">
            <div className="flex justify-between items-center mb-8">
              <div><p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Schedule for</p><h3 className="font-black text-2xl text-gray-900 dark:text-white">Record #{selectedRecord.id}</h3></div>
              <button onClick={() => setShowDetailsModal(false)} className="w-12 h-12 flex items-center justify-center bg-gray-100 dark:bg-gray-900 rounded-full active:scale-90 transition-all border border-black/5"><span className="material-symbols-outlined text-xl">close</span></button>
            </div>

            <div className="grid grid-cols-3 gap-3 mb-10">
              <button onClick={async () => {
                if (!customer || !company || !selectedRecord) return;
                try {
                  await PdfGenerator.generateServiceAgreement(selectedRecord as any, customer as any, company as any);
                } catch (e) { alert("Failed to download."); }
              }} className="p-4 bg-indigo-50 dark:bg-indigo-900/30 rounded-2xl flex flex-col items-center gap-2 text-indigo-700 dark:text-indigo-300 font-black text-[9px] uppercase tracking-widest shadow-sm border border-indigo-100 group active:scale-95 transition-all"><span className="material-symbols-outlined text-2xl group-hover:scale-110 transition-transform">article</span> Agreement</button>

              <button onClick={async () => {
                if (!customer || !company || !selectedRecord) return;
                try {
                  await PdfGenerator.generateRecordCard(selectedRecord as any, customer as any, company as any);
                } catch (e) { alert("Failed to download."); }
              }} className="p-4 bg-amber-50 dark:bg-amber-900/30 rounded-2xl flex flex-col items-center gap-2 text-amber-700 dark:text-amber-300 font-black text-[9px] uppercase tracking-widest shadow-sm border border-amber-100 group active:scale-95 transition-all"><span className="material-symbols-outlined text-2xl group-hover:scale-110 transition-transform">contact_emergency</span> Card</button>

              <button onClick={async () => {
                if (!customer || !company || !selectedRecord) return;
                const latestPaid = selectedRecord.paymentSchedule?.filter(e => e.status?.toLowerCase() === 'paid').sort((a, b) => b.installmentNumber - a.installmentNumber)[0];
                if (!latestPaid) return alert("No paid installments found.");
                try {
                  await PdfGenerator.generateReceipt(selectedRecord as any, latestPaid as any, customer as any, company as any);
                } catch (e) { alert("Failed to download."); }
              }} className="p-4 bg-emerald-50 dark:bg-emerald-900/30 rounded-2xl flex flex-col items-center gap-2 text-emerald-700 dark:text-emerald-300 font-black text-[9px] uppercase tracking-widest shadow-sm border border-emerald-100 group active:scale-95 transition-all"><span className="material-symbols-outlined text-2xl group-hover:scale-110 transition-transform">receipt_long</span> Receipt</button>
            </div>

            <h4 className="font-black text-xs mb-6 uppercase tracking-[0.4em] text-gray-400 border-b border-gray-100 dark:border-gray-700 pb-3">Repayment Timeline</h4>
            <div className="space-y-4">
              {selectedRecord.paymentSchedule?.map((e, i) => {
                const isNext = e.status === 'Pending' || e.status === 'Overdue';
                return (
                  <div key={i} className={`p-5 rounded-[1.5rem] flex justify-between items-center transition-all ${e.status === 'Paid' ? 'bg-emerald-50/40 border border-emerald-100 grayscale-[0.5]' : e.status === 'Overdue' ? 'bg-red-50 border-red-100 animate-pulse' : 'bg-gray-50 dark:bg-gray-900/40 border border-gray-100 dark:border-gray-700'}`}>
                    <div className="flex items-center gap-4">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-xs shadow-sm ${e.status === 'Paid' ? 'bg-emerald-600 text-white' : e.status === 'Overdue' ? 'bg-red-600 text-white' : 'bg-white dark:bg-gray-700 text-gray-400'}`}>{e.installmentNumber}</div>
                      <div><p className="font-black text-sm text-gray-800 dark:text-white">Inst #{e.installmentNumber}</p><p className="text-[10px] text-gray-500 font-bold uppercase tracking-tight">{formatDate(e.dueDate)} • {e.status}</p></div>
                    </div>
                    <div className="text-right">
                      <p className="font-black text-base mb-1">{formatCurrency(e.amount)}</p>
                      {isNext ? (
                        <button onClick={() => { setShowDetailsModal(false); setSelectedInstallment(e); setShowPaymentModal(true); }} className="px-4 py-1.5 bg-blue-600 text-white font-black text-[9px] rounded-lg uppercase tracking-widest shadow-lg shadow-blue-200 active:scale-95 transition-all">Pay Now</button>
                      ) : e.status === 'Paid' ? (
                        <button
                          onClick={async (ev) => {
                            ev.stopPropagation();
                            if (!customer || !company || !selectedRecord) return;
                            try {
                              await PdfGenerator.generateReceipt(selectedRecord as any, e as any, customer as any, company as any);
                            } catch (err) { alert("Download failed."); }
                          }}
                          className="px-4 py-1.5 bg-emerald-100 text-emerald-700 border border-emerald-200 font-black text-[9px] rounded-lg uppercase tracking-widest active:scale-95 transition-all flex items-center gap-1.5"
                        >
                          <span className="material-symbols-outlined text-[14px]">receipt_long</span>
                          Receipt
                        </button>
                      ) : null}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* Change Password Modal */}
      {showChangePassword && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/70 backdrop-blur-lg animate-in fade-in">
          <div className="bg-white dark:bg-gray-800 rounded-[2rem] w-full max-w-sm p-8 shadow-2xl">
            <h3 className="font-black text-xl mb-6 text-gray-900 dark:text-white">Change Password</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">New Password</label>
                <input type="password" value={newPass} onChange={e => setNewPass(e.target.value)} className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 font-bold" />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Confirm Password</label>
                <input type="password" value={confirmPass} onChange={e => setConfirmPass(e.target.value)} className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 font-bold" />
              </div>
            </div>
            <div className="mt-8 flex gap-3">
              <button onClick={() => setShowChangePassword(false)} className="flex-1 py-3 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 font-black text-xs rounded-xl uppercase tracking-widest">Cancel</button>
              <button
                onClick={async () => {
                  if (!newPass || newPass.length < 6) return alert("Password must be at least 6 chars");
                  if (newPass !== confirmPass) return alert("Passwords do not match");
                  setProcessing(true);
                  try {
                    if (auth.currentUser) {
                      await CustomerAuthService.setPassword(auth.currentUser, newPass);
                      alert("Password updated!");
                      setShowChangePassword(false);
                    }
                  } catch (e: any) { alert(e.message); }
                  finally { setProcessing(false); }
                }}
                disabled={processing}
                className="flex-1 py-3 bg-blue-600 text-white font-black text-xs rounded-xl uppercase tracking-widest shadow-lg shadow-blue-200 disabled:opacity-50"
              >
                {processing ? '...' : 'Update'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Account Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/80 backdrop-blur-xl animate-in zoom-in duration-300">
          <div className="bg-white dark:bg-gray-800 rounded-[2rem] w-full max-w-sm p-8 shadow-2xl border-4 border-red-100 dark:border-red-900/30">
            <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4 text-red-600">
              <span className="material-symbols-outlined text-3xl">warning</span>
            </div>
            <h3 className="font-black text-xl text-center mb-2 text-gray-900 dark:text-white">Delete Account?</h3>
            <p className="text-center text-gray-500 text-sm mb-6 leading-relaxed">
              Are you sure? Your login access will be <strong className="text-red-500">permanently removed</strong>.
              However, business transaction records will be retained for legal and accounting purposes.
            </p>

            <div className="space-y-3">
              <button
                onClick={async () => {
                  const confirmText = window.prompt("Type 'DELETE' to confirm:");
                  if (confirmText !== 'DELETE') return;

                  setProcessing(true);
                  try {
                    if (customer) {
                      await CustomerAuthService.deleteSelf(customer.id);
                      alert("Account deleted. You will now be logged out.");
                      window.location.href = '/records/customer-login';
                    }
                  } catch (e: any) { alert("Deletion failed: " + e.message + " (You may need to re-login first)"); }
                  finally { setProcessing(false); }
                }}
                disabled={processing}
                className="w-full py-4 bg-red-600 hover:bg-red-700 text-white font-black text-xs rounded-xl uppercase tracking-widest shadow-lg shadow-red-200 flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {processing ? 'Processing...' : 'Yes, Delete My Account'}
              </button>
              <button onClick={() => setShowDeleteConfirm(false)} className="w-full py-4 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 font-black text-xs rounded-xl uppercase tracking-widest">Cancel</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default CustomerPortal;