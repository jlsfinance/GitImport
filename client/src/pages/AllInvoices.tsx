
import React, { useState, useMemo } from 'react';
import { Invoice } from '../types';
import { StorageService } from '../services/storageService';
import { Search, Filter, MoreVertical, FileText, Calendar, ArrowUpRight, Share2, Edit, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface AllInvoicesProps {
  invoices?: Invoice[];
  onView?: (invoice: Invoice) => void;
  onEdit?: (invoice: Invoice) => void;
  onDelete?: (invoice: Invoice) => void;
  onViewLedger?: (customerId: string) => void;
}

const AllInvoices: React.FC<AllInvoicesProps> = ({
  invoices: propInvoices,
  onView,
  onEdit,
  onDelete,
  onViewLedger
}) => {
  // If props aren't passed (legacy), fetch from storage
  const invoices = propInvoices || StorageService.getInvoices();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PAID' | 'PENDING'>('ALL');

  const filteredInvoices = useMemo(() => {
    return invoices.filter(inv => {
      const matchesSearch =
        inv.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        inv.invoiceNumber.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter === 'ALL' || inv.status === statusFilter;
      return matchesSearch && matchesStatus;
    }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [invoices, searchTerm, statusFilter]);

  // Handle local delete if prop not provided (not ideal but safe)
  const handleDelete = (inv: Invoice) => {
    if (confirm('Are you sure you want to delete this invoice?')) {
      if (onDelete) onDelete(inv);
      else {
        StorageService.deleteInvoice(inv.id);
        window.location.reload(); // Fallback quick refresh
      }
    }
  };

  return (
    <div className="bg-slate-50 dark:bg-slate-900 min-h-screen pb-24">
      {/* Top Bar */}
      <div className="bg-slate-50 dark:bg-slate-900 sticky top-0 z-10 p-4 border-b border-transparent">
        <div className="max-w-5xl mx-auto">
          <div className="flex justify-between items-end mb-6">
            <div>
              <h1 className="text-3xl font-normal text-slate-900 dark:text-slate-100">Invoices</h1>
              <p className="text-slate-500 text-sm mt-1">{filteredInvoices.length} total invoices</p>
            </div>
          </div>

          {/* Search & Filter */}
          <div className="flex gap-3">
            <div className="flex-1 bg-white dark:bg-slate-800 rounded-xl p-3 flex items-center gap-3 shadow-sm border border-slate-200 dark:border-slate-700">
              <Search className="w-5 h-5 text-slate-400" />
              <input
                type="text"
                placeholder="Search by name or number..."
                className="bg-transparent flex-1 outline-none text-slate-700 dark:text-slate-200"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <select
              className="bg-white dark:bg-slate-800 rounded-xl px-4 py-3 outline-none border border-slate-200 dark:border-slate-700 font-medium text-slate-600 dark:text-slate-300 appearance-none"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
            >
              <option value="ALL">All Status</option>
              <option value="PAID">Paid</option>
              <option value="PENDING">Pending</option>
            </select>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 mt-2 space-y-3">
        <AnimatePresence>
          {filteredInvoices.map((invoice, index) => (
            <motion.div
              key={invoice.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              exit={{ opacity: 0, scale: 0.95 }}
              layoutId={invoice.id}
              className="bg-white dark:bg-slate-800 p-4 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 relative group"
            >
              <div className="flex justify-between items-start mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400 font-bold text-sm">
                    {invoice.customerName.charAt(0)}
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-800 dark:text-slate-100">{invoice.customerName}</h3>
                    <p className="text-xs text-slate-500 font-medium">#{invoice.invoiceNumber}</p>
                  </div>
                </div>
                <div className={`px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider ${invoice.status === 'PAID'
                  ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                  : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                  }`}>
                  {invoice.status}
                </div>
              </div>

              <div className="flex items-center justify-between pl-[52px]">
                <div className="flex flex-col">
                  <span className="text-[10px] uppercase font-bold text-slate-400">Date</span>
                  <span className="text-sm font-medium text-slate-600 dark:text-slate-300">
                    {new Date(invoice.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                  </span>
                </div>
                <div className="flex flex-col text-right">
                  <span className="text-[10px] uppercase font-bold text-slate-400">Amount</span>
                  <span className="text-lg font-bold text-slate-900 dark:text-slate-100">₹{invoice.total.toLocaleString('en-IN')}</span>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-700 flex justify-end gap-2 items-center">
                {onViewLedger && (
                  <button
                    onClick={() => onViewLedger(invoice.customerId)}
                    className="text-xs font-bold text-slate-500 hover:text-blue-600 px-3 py-2"
                  >
                    Ledger
                  </button>
                )}
                <button
                  onClick={() => onView && onView(invoice)}
                  className="text-sm font-bold text-blue-600 bg-blue-50 dark:bg-blue-900/20 px-5 py-2.5 rounded-xl hover:bg-blue-100 transition-colors flex items-center gap-2"
                >
                  View
                </button>
                {(onEdit || onDelete) && (
                  <>
                    {onEdit && (
                      <button onClick={() => onEdit(invoice)} className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                        <Edit className="w-4 h-4" />
                      </button>
                    )}
                    {onDelete && (
                      <button onClick={() => handleDelete(invoice)} className="p-2 text-slate-400 hover:text-red-500">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </>
                )}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {filteredInvoices.length === 0 && (
          <div className="text-center py-20">
            <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4">
              <FileText className="w-8 h-8 text-slate-400" />
            </div>
            <h3 className="text-slate-500 font-medium">No invoices found</h3>
            <p className="text-slate-400 text-sm">Try adjusting your search or create a new one.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default AllInvoices;
