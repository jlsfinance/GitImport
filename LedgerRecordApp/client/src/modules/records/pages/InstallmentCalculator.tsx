import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';

const InstallmentCalculator: React.FC = () => {
  const [amount, setAmount] = useState(10000);
  const [rate, setRate] = useState(18); // Default 18%
  const [tenure, setTenure] = useState(12); // in months

  // Flat Rate Calculation Logic
  // Total Fee = Principal * (Rate/100) * (Tenure/12)
  const annualFee = amount * (rate / 100);
  const totalFee = annualFee * (tenure / 12);
  const totalPayment = amount + totalFee;
  const installmentAmount = totalPayment / tenure;

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.3 }}
      className="bg-background-light dark:bg-background-dark font-display min-h-screen flex flex-col text-slate-900 dark:text-white pb-24"
    >
      {/* Header */}
      <div className="sticky top-0 z-50 bg-background-light/95 dark:bg-background-dark/95 backdrop-blur-sm px-4 py-3 flex items-center justify-between">
        <Link to="/records/tools" className="flex items-center justify-center p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-800 transition-colors">
          <span className="material-symbols-outlined">arrow_back</span>
        </Link>
        <h1 className="text-lg font-bold flex-1 text-center pr-10">Planner</h1>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {/* Result Visualization */}
        <div className="bg-white dark:bg-[#1a2233] rounded-2xl p-6 shadow-sm flex flex-col items-center justify-center relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-primary"></div>
          <h2 className="text-sm font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-6">Monthly Plan</h2>
          <div className="relative size-56 rounded-full flex items-center justify-center mb-6 shadow-inner bg-gradient-to-tr from-primary to-blue-300 p-1">
            <div className="bg-white dark:bg-[#1a2233] w-full h-full rounded-full flex flex-col items-center justify-center shadow-lg">
              <span className="text-3xl font-extrabold text-primary">₹{installmentAmount.toFixed(0)}</span>
              <span className="text-xs text-slate-500 mt-1 font-medium">per month</span>
            </div>
          </div>
          <div className="flex items-center justify-between w-full gap-4 px-2">
            <div className="flex flex-col items-center flex-1 p-3 rounded-xl bg-background-light dark:bg-background-dark">
              <span className="text-xs text-slate-500">Service Fee</span>
              <span className="text-sm font-bold text-primary">₹{totalFee.toFixed(0)}</span>
            </div>
            <div className="flex flex-col items-center flex-1 p-3 rounded-xl bg-background-light dark:bg-background-dark">
              <span className="text-xs text-slate-500">Total Payable</span>
              <span className="text-sm font-bold">₹{totalPayment.toFixed(0)}</span>
            </div>
          </div>
          <div className="p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl mt-4">
            <p className="text-[10px] text-amber-700 dark:text-amber-300 font-bold text-center leading-relaxed">
              📊 <strong>ESTIMATES ONLY</strong> – These calculations are for reference purposes only and do not constitute financial advice or any offer. This is a planning tool. All values are user-defined.
            </p>
          </div>
        </div>

        {/* Inputs */}
        <div className="bg-white dark:bg-[#1a2233] rounded-2xl p-5 shadow-sm space-y-8">

          {/* Amount */}
          <div className="space-y-4">
            <div className="flex justify-between items-end">
              <label className="font-semibold text-base">Total Amount</label>
              <div className="flex items-center bg-background-light dark:bg-background-dark rounded-lg px-3 py-2 w-32 border border-transparent focus-within:border-primary transition-all">
                <span className="text-slate-500 font-medium mr-1">₹</span>
                <input className="bg-transparent border-none p-0 w-full text-right font-bold focus:ring-0" type="number" value={amount} onChange={(e) => setAmount(Number(e.target.value))} />
              </div>
            </div>
            <input type="range" min="1000" max="500000" value={amount} onChange={(e) => setAmount(Number(e.target.value))} className="w-full accent-primary h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700" />
          </div>

          {/* Tenure */}
          <div className="space-y-4">
            <div className="flex justify-between items-end">
              <label className="font-semibold text-base">Duration (Months)</label>
              <div className="flex items-center bg-background-light dark:bg-background-dark rounded-lg px-3 py-2 w-24">
                <input className="bg-transparent border-none p-0 w-full text-right font-bold focus:ring-0" type="number" value={tenure} onChange={(e) => setTenure(Number(e.target.value))} />
                <span className="text-slate-500 font-medium ml-1">M</span>
              </div>
            </div>
            <input type="range" min="1" max="60" value={tenure} onChange={(e) => setTenure(Number(e.target.value))} className="w-full accent-primary h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700" />
          </div>

          {/* Rate */}
          <div className="space-y-4">
            <div className="flex justify-between items-end">
              <label className="font-semibold text-base">Service Fee %</label>
              <div className="flex items-center bg-background-light dark:bg-background-dark rounded-lg px-3 py-2 w-24">
                <input className="bg-transparent border-none p-0 w-full text-right font-bold focus:ring-0" type="number" value={rate} onChange={(e) => setRate(Number(e.target.value))} />
                <span className="text-slate-500 font-medium ml-1">%</span>
              </div>
            </div>
            <input type="range" min="1" max="50" step="0.1" value={rate} onChange={(e) => setRate(Number(e.target.value))} className="w-full accent-primary h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700" />
          </div>

        </div>
      </div>
    </motion.div>
  );
};

export default InstallmentCalculator;
