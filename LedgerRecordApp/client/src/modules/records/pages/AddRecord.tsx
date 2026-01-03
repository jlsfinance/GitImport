import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, getDocs, query, where, doc, runTransaction, serverTimestamp } from 'firebase/firestore';
import { recordsDb as db, recordsAuth as auth } from '../../../lib/firebase';
import { Customer } from '../types';
import { useCompany } from '../context/CompanyContext';
import { motion } from 'framer-motion';
import { APP_NAME } from '../constants';

interface RecordFormState {
  amount: number;
  tenure: number;
  installmentAmount: number; // Direct input
  serviceChargePercentage: number; // Will be auto-calculated for display, but we keep it for DB compatibility
  notes: string;
  consent: boolean;
}

const AddRecord: React.FC = () => {
  const navigate = useNavigate();
  const { currentCompany } = useCompany();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [customersWithActiveRecords, setCustomersWithActiveRecords] = useState<Set<string>>(new Set());
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Form State
  const [form, setForm] = useState<RecordFormState>({
    amount: 0,
    tenure: 12,
    installmentAmount: 0, // Direct Installment
    serviceChargePercentage: 0,
    notes: 'Personal Record',
    consent: false
  });

  // Load Initial Data
  useEffect(() => {
    const fetchData = async () => {
      if (!currentCompany) {
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        // Fetch customers filtered by company
        const customersQuery = query(
          collection(db, "customers"),
          where("companyId", "==", currentCompany.id)
        );
        const customersSnap = await getDocs(customersQuery);
        const customersData = customersSnap.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          avatar: doc.data().photo_url || doc.data().avatar
        } as Customer));
        setCustomers(customersData);

        // Fetch active records to prevent duplicates (also filter by company)
        const activeRecordsQuery = query(
          collection(db, "records"),
          where("status", "in", ["Given", "Approved", "Active"]),
          where("companyId", "==", currentCompany.id)
        );
        const activeRecordsSnap = await getDocs(activeRecordsQuery);
        const activeRecordCustomerIds = new Set(activeRecordsSnap.docs.map(doc => doc.data().customerId));
        setCustomersWithActiveRecords(activeRecordCustomerIds);

      } catch (err) {
        console.error("Error loading data:", err);
        alert("Failed to load customer data.");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [currentCompany]);

  const filteredCustomers = useMemo(() => {
    const lowerSearch = searchTerm.toLowerCase();
    return customers.filter(c =>
      (c.name || '').toLowerCase().includes(lowerSearch) ||
      (c.phone || '').includes(lowerSearch)
    );
  }, [customers, searchTerm]);

  const selectedCustomer = useMemo(() => {
    return customers.find(c => c.id === selectedCustomerId) || null;
  }, [selectedCustomerId, customers]);

  // Handle Form Changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setForm(prev => ({
      ...prev,
      [name]: name === 'notes' ? value : (name === 'consent' ? (e.target as HTMLInputElement).checked : Number(value))
    }));
  };

  const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm(prev => ({
      ...prev,
      consent: e.target.checked
    }));
  }

  const handleCustomerSelect = (customerId: string) => {
    if (customersWithActiveRecords.has(customerId)) {
      alert("This customer already has an active record.");
      return;
    }
    setSelectedCustomerId(customerId);
  };

  // Calculations (Direct EMI Model)
  // User inputs: Amount (Principal), Tenure, EMI (Installment)
  // Auto-calculate: Total Payable = EMI × Tenure
  //                 Service Fee / Markup = Total Payable - Principal
  const calculateRecordDetails = () => {
    const principal = form.amount || 0;
    const tenure = form.tenure || 1;
    const instAmt = form.installmentAmount || 0;
    // For manual installment, let's recalculate totalPayable
    const totalPayable = instAmt * tenure;

    // Service Fee (Markup) is the difference
    const markupAmount = Math.max(0, totalPayable - principal);

    // Upfront Fee
    const serviceCharge = Number(form.serviceChargePercentage) || 0;

    // Effective Rate Calculation (For internal reference only - NOT a lending rate)
    // This shows the total fee as a percentage for user convenience
    // Rate approx = ( (TotalMarkup + TotalFees) / Principal ) * (12 / TenureMonths) * 100
    let effectiveRate = 0;
    if (principal > 0 && tenure > 0) {
      const totalCost = markupAmount + serviceCharge;
      effectiveRate = (totalCost / principal) * (12 / tenure) * 100;
    }

    return {
      serviceCharge,
      installmentAmount: instAmt,
      markupAmount,
      totalPayable,
      effectiveRate
    };
  };

  const { serviceCharge, installmentAmount, markupAmount, totalPayable, effectiveRate } = calculateRecordDetails();

  // Submit Handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomer || !auth.currentUser) return;

    // Validation
    if (form.amount < 1000) return alert("Minimum amount is 1000");
    if (form.tenure < 2) return alert("Minimum duration is 2 months (60 days) per compliance policy.");
    if (!form.installmentAmount || form.installmentAmount < 1) return alert("Please enter a valid monthly installment amount.");

    // Ensure installment covers at least the principal over tenure
    const minInstallment = Math.ceil(form.amount / form.tenure);
    if (form.installmentAmount < minInstallment) {
      return alert(`Installment must be at least ₹${minInstallment.toLocaleString('en-IN')} to cover the principal of ₹${form.amount.toLocaleString('en-IN')} over ${form.tenure} months.`);
    }

    if (!form.consent) return alert("You must confirm customer consent before creating a record.");

    setIsSubmitting(true);

    try {
      const applicationDate = new Date().toISOString();

      // Transaction: Get new ID -> Save Record -> Update Counter
      const newRecordId = await runTransaction(db, async (transaction) => {
        const counterRef = doc(db, 'counters', 'recordId_counter');
        const counterDoc = await transaction.get(counterRef);

        let nextId = 10110;
        if (counterDoc.exists()) {
          const lastId = counterDoc.data().lastId;
          nextId = typeof lastId === 'number' ? lastId + 1 : 10110;
        }

        // We use 'records' collection
        const newRecordRef = doc(db, 'records', nextId.toString());

        // Generate a very basic schedule (will be refined in Activation step)
        const schedule: any[] = [];
        for (let i = 1; i <= form.tenure; i++) {
          schedule.push({
            installmentNumber: i,
            amount: installmentAmount,
            status: 'Pending'
          });
        }

        // Construct Record Object
        const recordData = {
          id: nextId.toString(),
          recordNumber: nextId.toString(),
          customerId: selectedCustomer.id,
          customerName: selectedCustomer.name,
          companyId: currentCompany!.id,
          amount: form.amount,

          // Standard Fields (Ledger Model)
          markupRate: markupAmount,
          tenure: form.tenure,
          serviceChargePercentage: form.serviceChargePercentage,
          serviceCharge,
          installmentAmount,

          // Store effective rate for record
          effectiveRate: parseFloat(effectiveRate.toFixed(2)),

          // Legacy Fields Mapping (Sanitized)
          feeRate: markupAmount,
          processingFeePercentage: form.serviceChargePercentage,
          processingFee: serviceCharge,
          installment: installmentAmount,
          emi: installmentAmount, // Store legacy EMI for backwards compatibility

          notes: form.notes || null,
          status: "Draft",
          createdAt: serverTimestamp(),
          activationDate: applicationDate,
          paymentSchedule: schedule,
          repaymentSchedule: schedule,
          history: [{
            date: applicationDate,
            action: "Record Created",
            user: auth.currentUser?.email || "System"
          }]
        };

        transaction.set(newRecordRef, recordData);
        transaction.set(counterRef, { lastId: nextId });
        return nextId;
      });

      alert(`New Entry Created & Approved! Record ID: ${newRecordId}. Requesting activation...`);
      navigate('/records/new-entry');

    } catch (error) {
      console.error("Submission failed:", error);
      alert("Failed to submit entry. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Helper for Initials
  const getInitials = (name: string) => {
    return name?.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() || '??';
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.3 }}
      className="min-h-screen bg-background-light dark:bg-background-dark pb-24 text-slate-900 dark:text-white"
    >
      {/* Disclaimer - AUDIT COMPLIANCE: REQUIRED STRICT VERBIAGE */}
      <div className="bg-slate-900 border-b border-white/10 p-4 sticky top-0 z-30 shadow-lg">
        <div className="flex items-start gap-3 max-w-4xl mx-auto">
          <span className="material-symbols-outlined text-yellow-400 text-xl mt-0.5 shrink-0">warning</span>
          <div>
            <p className="text-xs font-bold text-white mb-1 uppercase tracking-wider">
              Non-Banking Record Keeper
            </p>
            <p className="text-xs text-slate-300 leading-relaxed">
              Note: <strong>JLS Suite</strong> is a financial record-keeping tool only. We do not provide loans, credit, or funds. We are not a Bank or NBFC.
            </p>
          </div>
        </div>
      </div>

      {/* Header */}
      <div className="bg-background-light/95 dark:bg-background-dark/95 backdrop-blur-md px-4 py-4 flex items-center justify-between border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="flex h-10 w-10 items-center justify-center rounded-full hover:bg-black/5 dark:hover:bg-white/10 active:scale-95 transition-all">
            <span className="material-symbols-outlined">arrow_back</span>
          </button>
          <h1 className="text-2xl font-bold tracking-tight">New Entry</h1>
        </div>
      </div>

      <div className="max-w-4xl mx-auto p-4 space-y-6">

        {/* Step 1: Customer Selection */}
        <div className="bg-white dark:bg-[#1e2736] rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
          <div className="p-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
            <h2 className="font-bold text-base flex items-center gap-2">
              <span className="material-symbols-outlined text-primary">person_search</span>
              Select Customer
            </h2>
          </div>

          {!selectedCustomer && (
            <div className="p-4">
              <div className="relative mb-4">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">search</span>
                <input
                  type="text"
                  placeholder="Search by Name or Phone..."
                  className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#1a2230] focus:ring-2 focus:ring-primary outline-none"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>

              {loading ? (
                <div className="flex justify-center py-8"><div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent"></div></div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-h-96 overflow-y-auto p-1">
                  {filteredCustomers.length > 0 ? filteredCustomers.map(customer => {
                    const hasActiveRecord = customersWithActiveRecords.has(customer.id);
                    return (
                      <button
                        key={customer.id}
                        onClick={() => handleCustomerSelect(customer.id)}
                        disabled={hasActiveRecord}
                        className={`relative flex flex-col items-center p-4 rounded-xl border transition-all ${hasActiveRecord
                          ? 'opacity-60 bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 cursor-not-allowed'
                          : 'bg-white dark:bg-[#1a2230] border-slate-200 dark:border-slate-700 hover:border-primary hover:shadow-md'
                          }`}
                      >
                        {hasActiveRecord && <span className="absolute top-2 right-2 text-[10px] bg-red-100 text-red-600 px-1.5 py-0.5 rounded font-bold">Active</span>}

                        {customer.avatar ? (
                          <img src={customer.avatar} alt={customer.name} className="h-14 w-14 rounded-full object-cover mb-2 bg-slate-200" />
                        ) : (
                          <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-lg mb-2">
                            {getInitials(customer.name)}
                          </div>
                        )}
                        <span className="text-sm font-bold text-center leading-tight">{customer.name}</span>
                        <span className="text-xs text-slate-500 mt-1">{customer.phone || 'No Phone'}</span>
                      </button>
                    );
                  }) : (
                    <div className="col-span-full text-center py-8 text-slate-400">No customers found.</div>
                  )}
                </div>
              )}
            </div>
          )}

          {selectedCustomer && (
            <div className="p-4 flex items-start justify-between bg-blue-50/50 dark:bg-blue-900/10">
              <div className="flex items-center gap-4">
                {selectedCustomer.avatar ? (
                  <img src={selectedCustomer.avatar} alt={selectedCustomer.name} className="h-16 w-16 rounded-full object-cover border-2 border-white shadow-sm" />
                ) : (
                  <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xl border-2 border-white shadow-sm">
                    {getInitials(selectedCustomer.name)}
                  </div>
                )}
                <div>
                  <h3 className="font-bold text-lg">{selectedCustomer.name}</h3>
                  <p className="text-sm text-slate-500">{selectedCustomer.phone}</p>
                  <div className="flex gap-2 mt-1 text-xs">
                    {selectedCustomer.aadhaar && <span className="px-2 py-0.5 bg-white dark:bg-slate-800 rounded border border-slate-200 dark:border-slate-700">Aadhaar: {selectedCustomer.aadhaar}</span>}
                  </div>
                </div>
              </div>
              <button
                onClick={() => setSelectedCustomerId(null)}
                className="text-sm text-primary font-bold hover:underline px-3 py-1"
              >
                Change
              </button>
            </div>
          )}
        </div>

        {/* Step 2: Record Details Form */}
        {selectedCustomer && (
          <div className="bg-white dark:bg-[#1e2736] rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden animate-in fade-in slide-in-from-bottom-4">
            <div className="p-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
              <h2 className="font-bold text-base flex items-center gap-2">
                <span className="material-symbols-outlined text-primary">edit_document</span>
                Ledger Configuration
              </h2>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                {/* Amount */}
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700 dark:text-slate-300">Transaction Value (₹)</label>
                  <input
                    type="number"
                    name="amount"
                    value={form.amount}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#1a2230] focus:ring-2 focus:ring-primary outline-none font-bold text-lg"
                    min="1000"
                  />
                </div>

                {/* Tenure - CHANGED to Manual Input, Min 3 Months */}
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700 dark:text-slate-300">Duration (Months) *</label>
                  <div className="relative">
                    <input
                      type="number"
                      name="tenure"
                      min="3"
                      max="120"
                      value={form.tenure}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#1a2230] focus:ring-2 focus:ring-primary outline-none font-bold text-lg"
                    />
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 font-bold">
                      MONTHS
                    </div>
                  </div>
                  <p className="text-[10px] text-slate-500">Minimum duration: 3 Months (Policy Compliant)</p>
                </div>

                {/* Direct Installment Input - User enters the monthly payment directly */}
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700 dark:text-slate-300">Monthly Installment (₹) *</label>
                  <input
                    type="number"
                    name="installmentAmount"
                    value={form.installmentAmount || ''}
                    onChange={handleInputChange}
                    placeholder="e.g. 10000"
                    min="1"
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#1a2230] focus:ring-2 focus:ring-primary outline-none font-bold text-lg"
                  />
                  <p className="text-[10px] text-slate-400">Enter the fixed monthly payment amount.</p>
                </div>
              </div>

              {/* Advanced Section: Processing Fee & Extras */}
              <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
                <button
                  type="button"
                  onClick={() => setShowAdvanced(!showAdvanced)}
                  className="w-full flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Advanced Configuration</span>
                  <span className="material-symbols-outlined text-slate-400 transform transition-transform duration-200" style={{ transform: showAdvanced ? 'rotate(180deg)' : 'rotate(0deg)' }}>expand_more</span>
                </button>

                {showAdvanced && (
                  <div className="p-4 bg-white dark:bg-[#1e2736] border-t border-slate-200 dark:border-slate-800 animate-in slide-in-from-top-2">
                    {/* Processing Fee (Optional) - Hidden by default for compliance */}
                    <div className="space-y-2">
                      <label className="text-sm font-bold text-slate-700 dark:text-slate-300">Setup / Processing Cost (₹)</label>
                      <input
                        type="number"
                        name="serviceChargePercentage"
                        value={form.serviceChargePercentage || ''}
                        onChange={handleInputChange}
                        placeholder="0"
                        className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#1a2230] focus:ring-2 focus:ring-primary outline-none"
                      />
                      <p className="text-[10px] text-slate-400">Optional one-time setup cost (deducted initially).</p>
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700 dark:text-slate-300">Internal Billing Notes</label>
                <textarea
                  name="notes"
                  value={form.notes}
                  onChange={handleInputChange}
                  placeholder="Invoice details, reason for record, etc."
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#1a2230] focus:ring-2 focus:ring-primary outline-none resize-none h-24"
                ></textarea>
              </div>

              {/* Summary Box - Shows auto-calculated values */}
              <div className="bg-gradient-to-r from-primary/5 to-blue-500/5 border border-primary/10 rounded-xl p-5">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
                  <div>
                    <p className="text-xs text-slate-500 uppercase font-bold">Principal</p>
                    <p className="text-lg font-extrabold text-slate-700 dark:text-slate-300">₹{form.amount.toLocaleString('en-IN')}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 uppercase font-bold">Monthly Installment</p>
                    <p className="text-xl font-extrabold text-primary">₹{installmentAmount.toLocaleString('en-IN')}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 uppercase font-bold">Total Receivable</p>
                    <p className="text-lg font-extrabold text-slate-700 dark:text-slate-300">₹{totalPayable.toLocaleString('en-IN')}</p>
                  </div>
                  <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-2">
                    <p className="text-xs text-green-600 dark:text-green-400 uppercase font-bold">Service Markup</p>
                    <p className="text-lg font-extrabold text-green-600 dark:text-green-400">₹{markupAmount.toLocaleString('en-IN')}</p>
                    <p className="text-[10px] text-green-500">(Not an Interest Rate)</p>
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-3 p-4 bg-amber-50 dark:bg-amber-900/10 rounded-xl border-2 border-amber-200 dark:border-amber-900/30">
                <input
                  type="checkbox"
                  id="consent"
                  name="consent"
                  checked={form.consent}
                  onChange={handleCheckboxChange}
                  className="mt-1 w-5 h-5 accent-primary cursor-pointer"
                />
                <label htmlFor="consent" className="text-xs text-slate-700 dark:text-slate-300 cursor-pointer select-none leading-relaxed">
                  <strong>I confirm that:</strong>
                  <ul className="mt-1 ml-2 space-y-0.5 text-[11px] text-slate-600 dark:text-slate-400">
                    <li>• This is a <b>personal record</b> for my own bookkeeping</li>
                    <li>• This is <b>NOT</b> a commercial lending transaction</li>
                    <li>• I understand {APP_NAME} does NOT provide loans or financial services</li>
                    <li>• The other party is aware this is a record-keeping entry only</li>
                  </ul>
                </label>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-4 rounded-xl bg-primary text-white font-bold text-lg shadow-lg hover:brightness-110 active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {isSubmitting ? (
                  <><div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent"></div> Creating Record...</>
                ) : (
                  <>Create Ledger Entry <span className="material-symbols-outlined material-symbols-fill">description</span></>
                )}
              </button>
            </form>
          </div>
        )}

      </div>
    </motion.div>
  );
};

export default AddRecord;