import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { recordsDb as db } from '../../../lib/firebase';
import { motion } from 'framer-motion';

interface Customer {
  id: string;
  name: string;
  phone?: string;
  address?: string;
  photo_url?: string;
  avatar?: string;
}

interface RecordData {
  amount: number;
  rate: number;
  tenure: number;
  serviceChargePercentage: number;
  serviceCharge: number;
  installmentAmount: number;
  // Legacy Fields mapping (kept for backward compat with old data)
  interestRate?: number; // LEGACY: renamed to 'rate' or 'markupRate'
  processingFeePercentage?: number;
  processingFee?: number;
  emi?: number;

  date: string;
  activationDate?: string;
  notes?: string;
  customerId: string;
  customerName: string;
  status: 'Pending' | 'Approved' | 'Settled' | 'Completed' | 'Rejected' | 'Active' | 'Overdue';
  companyId?: string;
}

interface FormState {
  amount: number;
  installmentAmount: number; // Direct Installment input
  tenure: number;
  serviceChargePercentage: number;
  date: string;
  activationDate: string;
  notes: string;
}

const EditRecord: React.FC = () => {
  const navigate = useNavigate();
  const { id: recordId } = useParams<{ id: string }>();

  const [customer, setCustomer] = useState<Customer | null>(null);
  const [record, setRecord] = useState<RecordData | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [form, setForm] = useState<FormState>({
    amount: 0,
    installmentAmount: 0, // Direct Installment
    tenure: 0,
    serviceChargePercentage: 0,
    date: '',
    activationDate: '',
    notes: ''
  });

  const fetchRecordAndCustomer = useCallback(async (id: string) => {
    setLoading(true);
    try {
      const recordRef = doc(db, "records", id); // Use 'records' collection
      const recordSnap = await getDoc(recordRef);

      if (!recordSnap.exists()) {
        alert("Record not found");
        navigate('/records/all');
        return;
      }

      const data = recordSnap.data();
      const recordData = {
        ...data,
        rate: data.rate || data.interestRate || 0,
        installmentAmount: data.installmentAmount || data.emi || 0,
        serviceChargePercentage: data.serviceChargePercentage || data.processingFeePercentage || 2,
        serviceCharge: data.serviceCharge || data.processingFee || 0,
      } as RecordData;

      setRecord(recordData);

      setForm({
        amount: recordData.amount,
        installmentAmount: recordData.installmentAmount, // Load existing installment
        tenure: recordData.tenure,
        serviceChargePercentage: recordData.serviceChargePercentage,
        date: recordData.date || '',
        activationDate: recordData.activationDate || (recordData as any).disbursalDate || '',
        notes: recordData.notes || ''
      });

      if (recordData.customerId) {
        const customerRef = doc(db, "customers", recordData.customerId);
        const customerSnap = await getDoc(customerRef);
        if (customerSnap.exists()) {
          setCustomer({ id: customerSnap.id, ...customerSnap.data() } as Customer);
        }
      }
    } catch (err) {
      console.error("Error loading record:", err);
      alert("Failed to load record data");
      navigate('/records/all');
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  useEffect(() => {
    if (recordId) {
      fetchRecordAndCustomer(recordId);
    }
  }, [recordId, fetchRecordAndCustomer]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setForm(prev => ({
      ...prev,
      [name]: name === 'notes' || name === 'date' || name === 'activationDate' ? value : Number(value)
    }));
  };

  // Direct Installment Model - user enters installment, service fee auto-calculates
  const calculateRecordDetails = () => {
    const principal = form.amount || 0;
    const tenure = form.tenure || 1;
    const emi = form.installmentAmount || 0;

    const totalPayable = emi * tenure;
    const markupAmount = Math.max(0, totalPayable - principal); // Service fee
    const serviceCharge = Number(form.serviceChargePercentage) || 0; // One-time processing fee

    return { serviceCharge, installmentAmount: emi, markupAmount, totalPayable };
  };

  const { serviceCharge, installmentAmount, markupAmount, totalPayable } = calculateRecordDetails();

  // --- Helper for Schedule Generation (Mirrors RecordDetails/AddRecord logic) ---
  const generateSchedule = (
    principal: number,
    installment: number,
    rate: number,
    tenure: number,
    firstDateStr: string
  ) => {
    let balance = principal;
    const schedule = [];
    const monthlyRateAmt = Math.round((principal * (rate / 100)) / 12);

    // Parse Date
    const d = new Date(firstDateStr);
    // If invalid date, default into today?
    const startDate = isNaN(d.getTime()) ? new Date() : d;

    for (let i = 1; i <= tenure; i++) {
      const principalPaid = Math.round(installment - monthlyRateAmt);
      const closing = Math.max(balance - principalPaid, 0);

      // Due Date: +1 Month from Start Date for 1st Inst? 
      // Or Start Date is 1st inst date?
      // AddRecord logic usually sets 'repaymentSchedule' empty and it's generated dynamically or on activation.
      // If we are Editing an Active Record, we must have a concrete schedule.
      // Let's assume 'firstDateStr' is the Activation/Disbursal Date. First EMI is +1 month.
      const dueDate = new Date(
        startDate.getFullYear(),
        startDate.getMonth() + i,
        startDate.getDate()
      );

      schedule.push({
        installmentNumber: i,
        emiNumber: i, // Legacy support
        dueDate: dueDate.toISOString().split("T")[0],
        paymentDate: null,
        status: 'Pending',
        amount: installment,
        principalPart: principalPaid,
        feePart: monthlyRateAmt, // Markup fee portion
        balance: closing,
        remark: ''
      });
      balance = closing;
    }
    return schedule;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!recordId || !record) {
      alert("Record information is missing");
      return;
    }

    if (form.amount < 1000) {
      alert("Minimum record amount is ₹1,000");
      return;
    }

    if (window.confirm("Are you sure you want to update this record? This will REGENERATE the repayment schedule based on new values. Previous payment history may be lost if you fully reset.") === false) {
      return;
    }

    setIsSubmitting(true);
    try {
      // Regenerate Schedule - use markupAmount for rate field
      const startDate = form.activationDate || form.date;
      const newSchedule = generateSchedule(form.amount, installmentAmount, markupAmount, form.tenure, startDate);

      const recordRef = doc(db, "records", recordId);
      await updateDoc(recordRef, {
        amount: form.amount,

        // Standard fields (Direct EMI Model)
        rate: markupAmount, // Store markup as 'rate' for backward compatibility
        tenure: form.tenure,
        serviceChargePercentage: form.serviceChargePercentage,
        serviceCharge: serviceCharge,
        installmentAmount: installmentAmount,

        // LEGACY Fields (kept for backward compat with old readers)
        interestRate: markupAmount, // LEGACY: same as 'rate'
        processingFeePercentage: form.serviceChargePercentage,
        processingFee: serviceCharge,
        emi: installmentAmount, // LEGACY: same as installmentAmount

        date: form.date,
        activationDate: form.activationDate || null,
        notes: form.notes || null,

        // overwrite schedule
        repaymentSchedule: newSchedule,
        // Legacy schedule field
        schedule: newSchedule
      });

      alert("Record updated successfully! Schedule regenerated.");
      navigate(`/records/view/${recordId}`);
    } catch (err) {
      console.error("Update failed:", err);
      alert("Failed to update record. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background-light dark:bg-background-dark">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-primary border-t-transparent"></div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.3 }}
      className="min-h-screen bg-background-light dark:bg-background-dark pb-24 text-slate-900 dark:text-white"
    >
      <div className="sticky top-0 z-20 bg-background-light/95 dark:bg-background-dark/95 backdrop-blur-md px-4 py-3 flex items-center justify-between border-b border-slate-200 dark:border-slate-800">
        <button onClick={() => navigate(-1)} className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors">
          <span className="material-symbols-outlined">arrow_back</span>
          <span className="font-bold text-sm hidden sm:inline">Back</span>
        </button>
        <h1 className="text-lg font-bold">Edit Record</h1>
        <div className="w-10"></div>
      </div>

      <div className="max-w-4xl mx-auto p-4 space-y-6">
        <form onSubmit={handleSubmit} className="space-y-6">

          {customer && (
            <div className="bg-white dark:bg-[#1e2736] rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
              <div className="p-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
                <h2 className="font-bold text-base flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary">person</span>
                  Customer Details
                </h2>
              </div>
              <div className="p-6 flex items-start gap-6">
                <div className="h-24 w-24 rounded-xl overflow-hidden bg-slate-200 dark:bg-slate-700 flex-shrink-0">
                  {(customer.photo_url || customer.avatar) ? (
                    <img
                      src={customer.photo_url || customer.avatar}
                      alt={customer.name}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="h-full w-full flex items-center justify-center text-3xl font-bold text-slate-400">
                      {customer.name?.charAt(0)?.toUpperCase() || '?'}
                    </div>
                  )}
                </div>
                <div className="space-y-2 flex-1">
                  <h3 className="text-xl font-bold flex items-center gap-2">
                    <span className="material-symbols-outlined text-green-500">verified_user</span>
                    {customer.name}
                  </h3>
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    <strong>Mobile:</strong> {customer.phone || 'N/A'}
                  </p>
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    <strong>Address:</strong> {customer.address || 'N/A'}
                  </p>
                </div>
              </div>
            </div>
          )}

          {record && record.status !== 'Pending' && (
            <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-2xl p-4">
              <div className="flex items-start gap-3">
                <span className="material-symbols-outlined text-amber-600 dark:text-amber-400">warning</span>
                <div>
                  <h4 className="font-bold text-amber-800 dark:text-amber-300">Warning: Editing an Active Record</h4>
                  <p className="text-sm text-amber-700 dark:text-amber-400 mt-1">
                    This record has already been {record.status.toLowerCase()}. Any changes made here may impact the existing Installment schedule and financial records. Please proceed with caution. This action will not automatically regenerate the payment schedule unless explicitly triggered.
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="bg-white dark:bg-[#1e2736] rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
            <div className="p-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
              <h2 className="font-bold text-base flex items-center gap-2">
                <span className="material-symbols-outlined text-primary">account_balance</span>
                Ledger Details
              </h2>
              <p className="text-xs text-slate-500 mt-1">Record ID: {recordId}</p>
            </div>
            <div className="p-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700 dark:text-slate-300">Principal Amount (₹) *</label>
                <input
                  type="number"
                  name="amount"
                  required
                  min="1000"
                  value={form.amount}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#1a2230] focus:ring-2 focus:ring-primary outline-none"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700 dark:text-slate-300">Tenure (Months) *</label>
                <input
                  type="number"
                  name="tenure"
                  required
                  min="1"
                  value={form.tenure}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#1a2230] focus:ring-2 focus:ring-primary outline-none"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700 dark:text-slate-300">Monthly Installment (₹) *</label>
                <input
                  type="number"
                  name="installmentAmount"
                  required
                  min="1"
                  value={form.installmentAmount || ''}
                  onChange={handleInputChange}
                  placeholder="e.g. 10000"
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#1a2230] focus:ring-2 focus:ring-primary outline-none font-bold text-lg"
                />
                <p className="text-[10px] text-slate-400">Enter fixed monthly payment amount.</p>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700 dark:text-slate-300">One-time Processing Fee (₹)</label>
                <input
                  type="number"
                  name="serviceChargePercentage"
                  min="0"
                  value={form.serviceChargePercentage || ''}
                  onChange={handleInputChange}
                  placeholder="0"
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#1a2230] focus:ring-2 focus:ring-primary outline-none"
                />
                <p className="text-[10px] text-slate-400">Optional upfront charge.</p>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700 dark:text-slate-300">Creation Date</label>
                <input
                  type="date"
                  name="date"
                  value={form.date}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#1a2230] focus:ring-2 focus:ring-primary outline-none"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700 dark:text-slate-300">Entry Date</label>
                <input
                  type="date"
                  name="activationDate"
                  value={form.activationDate}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#1a2230] focus:ring-2 focus:ring-primary outline-none"
                />
              </div>
              <div className="space-y-2 sm:col-span-2 lg:col-span-3">
                <label className="text-sm font-bold text-slate-700 dark:text-slate-300">Internal Notes / Remarks</label>
                <textarea
                  name="notes"
                  value={form.notes}
                  onChange={handleInputChange}
                  placeholder="Add any internal notes about this record..."
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#1a2230] focus:ring-2 focus:ring-primary outline-none resize-none h-24"
                />
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-primary/10 to-blue-500/10 dark:from-primary/20 dark:to-blue-500/20 rounded-2xl p-6 border border-primary/20">
            <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
              <span className="material-symbols-outlined text-primary">calculate</span>
              Updated Calculations
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="bg-white dark:bg-[#1e2736] rounded-xl p-4 text-center shadow-sm">
                <p className="text-xs text-slate-500 uppercase tracking-wider">Principal</p>
                <p className="text-lg font-bold text-slate-800 dark:text-white mt-1">₹{form.amount.toLocaleString('en-IN')}</p>
              </div>
              <div className="bg-white dark:bg-[#1e2736] rounded-xl p-4 text-center shadow-sm">
                <p className="text-xs text-slate-500 uppercase tracking-wider">Monthly Installment</p>
                <p className="text-xl font-bold text-primary mt-1">₹{installmentAmount.toLocaleString('en-IN')}</p>
              </div>
              <div className="bg-white dark:bg-[#1e2736] rounded-xl p-4 text-center shadow-sm">
                <p className="text-xs text-slate-500 uppercase tracking-wider">Total Payable</p>
                <p className="text-lg font-bold text-slate-800 dark:text-white mt-1">₹{totalPayable.toLocaleString('en-IN')}</p>
              </div>
              <div className="bg-green-50 dark:bg-green-900/20 rounded-xl p-4 text-center shadow-sm">
                <p className="text-xs text-green-600 dark:text-green-400 uppercase tracking-wider">Service Fee</p>
                <p className="text-lg font-bold text-green-600 dark:text-green-400 mt-1">₹{markupAmount.toLocaleString('en-IN')}</p>
                <p className="text-[9px] text-green-500">(Auto)</p>
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting || loading}
            className="w-full py-4 rounded-xl bg-primary text-white font-bold text-lg shadow-lg hover:brightness-110 active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {isSubmitting ? (
              <><div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent"></div> Updating...</>
            ) : (
              <>Update Record <span className="material-symbols-outlined material-symbols-fill">check_circle</span></>
            )}
          </button>
        </form>
      </div>
    </motion.div>
  );
};

export default EditRecord;