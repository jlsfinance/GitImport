
import React, { useState, useMemo } from 'react';
import { Invoice } from '../types';
import { StorageService } from '../services/storageService';
import { Search, MoreVertical, FileText, Trash2, Users, Edit, MessageCircle, Eye, ChevronRight, Plus } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { HapticService } from '../services/hapticService';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "../components/ui/dropdown-menu";

interface AllInvoicesProps {
  invoices?: Invoice[];
  onView?: (invoice: Invoice) => void;
  onEdit?: (invoice: Invoice) => void;
  onDelete?: (invoice: Invoice) => void;
  onViewLedger?: (customerId: string) => void;
  onCreate?: () => void;
}

const AllInvoices: React.FC<AllInvoicesProps> = ({
  invoices: propInvoices,
  onView,
  onEdit,
  onDelete,
  onViewLedger,
  onCreate
}) => {
  // If props aren't passed (legacy), fetch from storage
  const invoices = propInvoices || StorageService.getInvoices();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PAID' | 'PENDING'>('ALL');
  const [selectedForAction, setSelectedForAction] = useState<Invoice | null>(null);

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
    <div className="bg-background min-h-screen flex flex-col pb-32">
      {/* Google Search Style Header */}
      <div className="sticky top-0 z-30 px-4 pt-14 pb-4 bg-background/95 backdrop-blur-md">
        <div className="max-w-5xl mx-auto">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-3xl font-bold font-heading text-foreground tracking-tight">Invoices</h1>
            <span className="px-3 py-1 bg-surface-container-highest text-muted-foreground text-[10px] font-bold rounded-full border border-border uppercase tracking-widest">
              {filteredInvoices.length} Bills
            </span>
          </div>

          <div className="relative group">
            <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
              <Search className="w-5 h-5 text-muted-foreground group-focus-within:text-google-blue transition-colors" />
            </div>
            <input
              type="text"
              placeholder="Search by client name or bill #"
              className="w-full bg-surface-container-low border border-border rounded-[28px] pl-12 pr-4 py-4 outline-none text-sm font-semibold text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-google-blue/20 focus:border-google-blue transition-all shadow-sm"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="flex gap-2 mt-4 overflow-x-auto no-scrollbar py-1">
            {['ALL', 'PAID', 'PENDING'].map((status) => (
              <button
                key={status}
                onClick={() => setStatusFilter(status as any)}
                className={`px-6 py-2 rounded-2xl text-[11px] font-bold uppercase tracking-wider transition-all border shadow-sm whitespace-nowrap ${statusFilter === status
                  ? 'bg-google-blue text-white border-google-blue'
                  : 'bg-surface-container-low text-muted-foreground border-border hover:bg-surface-container-highest'
                  }`}
              >
                {status}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto w-full px-4 mt-4 space-y-3">
        <AnimatePresence mode='popLayout'>
          {filteredInvoices.map((invoice) => (
            <div key={invoice.id} className="relative overflow-hidden rounded-[28px] group bg-surface-container-low border border-border shadow-sm hover:shadow-google transition-all">
              {/* Delete Action Background */}
              <div className="absolute inset-0 bg-google-red flex justify-end items-center px-8">
                <Trash2 className="w-6 h-6 text-white" />
              </div>

              {/* Swipeable Card Content */}
              <motion.div
                layout
                drag="x"
                dragConstraints={{ left: -100, right: 0 }}
                dragElastic={0.6}
                dragMomentum={false}
                onDragEnd={(_, info) => {
                  if (info.offset.x < -80) {
                    HapticService.medium();
                    handleDelete(invoice);
                  }
                }}
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                whileTap={{ scale: 0.99 }}
                className="bg-surface-container-low p-5 flex justify-between items-center relative z-10 cursor-pointer"
                onClick={() => onView && onView(invoice)}
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-google-blue/10 flex items-center justify-center text-google-blue font-bold text-lg border border-google-blue/5">
                    {invoice.customerName.charAt(0)}
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-bold text-foreground text-sm tracking-tight truncate max-w-[180px]">{invoice.customerName}</h3>
                    <p className="text-[11px] text-muted-foreground font-semibold flex items-center gap-1.5 mt-0.5">
                      #{invoice.invoiceNumber}
                      <span className="w-1 h-1 rounded-full bg-muted-foreground/30" />
                      {new Date(invoice.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <p className="text-base font-bold text-foreground">₹{invoice.total.toLocaleString('en-IN')}</p>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${invoice.status === 'PAID' ? 'bg-google-green/10 text-google-green' : 'bg-google-yellow/10 text-google-yellow'
                      }`}>
                      {invoice.status}
                    </span>
                  </div>

                  <button
                    className="p-2 rounded-full hover:bg-surface-container-highest transition-colors text-muted-foreground"
                    onClick={(e) => {
                      e.stopPropagation();
                      HapticService.light();
                      setSelectedForAction(invoice);
                    }}
                  >
                    <MoreVertical className="w-5 h-5" />
                  </button>
                </div>
              </motion.div>
            </div>
          ))}
        </AnimatePresence>

        {/* PREMIUM BOTTOM ACTION SHEET */}
        <AnimatePresence>
          {selectedForAction && (
            <>
              {/* Backdrop */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setSelectedForAction(null)}
                className="fixed inset-0 bg-black/60 backdrop-blur-[2px] z-[100]"
              />

              {/* Sheet */}
              <motion.div
                initial={{ y: "100%" }}
                animate={{ y: 0 }}
                exit={{ y: "100%" }}
                transition={{ type: "spring", damping: 25, stiffness: 200 }}
                className="fixed bottom-0 left-0 right-0 bg-white dark:bg-slate-900 z-[101] rounded-t-[32px] shadow-2xl overflow-hidden pb-8"
              >
                {/* Drag Handle */}
                <div className="flex justify-center py-3">
                  <div className="w-12 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full" />
                </div>

                {/* Header Info */}
                <div className="px-6 py-4 flex items-center gap-4 border-b border-slate-50 dark:border-slate-800/50">
                  <div className="w-14 h-14 rounded-2xl bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center text-blue-600 dark:text-blue-400">
                    <FileText className="w-7 h-7" />
                  </div>
                  <div>
                    <h2 className="text-lg font-black font-heading text-slate-900 dark:text-slate-100 tracking-tight leading-tight">
                      {selectedForAction.customerName}
                    </h2>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-0.5 opacity-60">
                      Invoice: #{selectedForAction.invoiceNumber}
                    </p>
                  </div>
                </div>

                {/* Action Items */}
                <div className="px-4 py-4 space-y-2">
                  {/* View Details */}
                  <button
                    onClick={() => {
                      onView && onView(selectedForAction);
                      setSelectedForAction(null);
                    }}
                    className="w-full flex items-center gap-4 p-4 rounded-[24px] hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-all group active:scale-[0.98]"
                  >
                    <div className="w-12 h-12 rounded-full bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400 shrink-0">
                      <Eye className="w-6 h-6" />
                    </div>
                    <div className="flex-1 text-left min-w-0">
                      <p className="font-bold text-slate-900 dark:text-slate-100 text-base">View Details</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">View or print breakdown</p>
                    </div>
                    <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-slate-500 transition-colors" />
                  </button>

                  {/* Ledger */}
                  <button
                    onClick={() => {
                      onViewLedger && onViewLedger(selectedForAction.customerId);
                      setSelectedForAction(null);
                    }}
                    className="w-full flex items-center gap-4 p-4 rounded-[24px] hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-all group active:scale-[0.98]"
                  >
                    <div className="w-12 h-12 rounded-full bg-indigo-50 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shrink-0">
                      <Users className="w-6 h-6" />
                    </div>
                    <div className="flex-1 text-left min-w-0">
                      <p className="font-bold text-slate-900 dark:text-slate-100 text-base">Customer Ledger</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">Statement & history</p>
                    </div>
                    <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-slate-500 transition-colors" />
                  </button>

                  {/* Edit */}
                  <button
                    onClick={() => {
                      onEdit && onEdit(selectedForAction);
                      setSelectedForAction(null);
                    }}
                    className="w-full flex items-center gap-4 p-4 rounded-[24px] hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-all group active:scale-[0.98]"
                  >
                    <div className="w-12 h-12 rounded-full bg-orange-50 dark:bg-orange-900/30 flex items-center justify-center text-orange-600 dark:text-orange-400 shrink-0">
                      <Edit className="w-6 h-6" />
                    </div>
                    <div className="flex-1 text-left min-w-0">
                      <p className="font-bold text-slate-900 dark:text-slate-100 text-base">Edit Invoice</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">Modify balance or items</p>
                    </div>
                    <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-slate-500 transition-colors" />
                  </button>

                  {/* Delete */}
                  <div className="pt-2">
                    <button
                      onClick={() => {
                        handleDelete(selectedForAction);
                        setSelectedForAction(null);
                      }}
                      className="w-full flex items-center gap-4 p-4 rounded-[24px] hover:bg-red-50 dark:hover:bg-red-900/10 transition-all group active:scale-[0.98]"
                    >
                      <div className="w-12 h-12 rounded-full bg-red-50 dark:bg-red-900/30 flex items-center justify-center text-red-600 dark:text-red-400 shrink-0">
                        <Trash2 className="w-6 h-6" />
                      </div>
                      <div className="flex-1 text-left min-w-0">
                        <p className="font-bold text-red-600 text-base">Delete Permanently</p>
                        <p className="text-xs text-red-400/80">Remove record forever</p>
                      </div>
                      <ChevronRight className="w-5 h-5 text-red-200 group-hover:text-red-400 transition-colors" />
                    </button>
                  </div>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>

        {filteredInvoices.length === 0 && (
          <div className="text-center py-20">
            <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4 border-none">
              <FileText className="w-8 h-8 text-slate-300" />
            </div>
            <h3 className="text-slate-500 font-bold">No results</h3>
            <p className="text-slate-400 text-xs mt-1">Adjust filters or search term</p>
          </div>
        )}
      </div>

      {onCreate && (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="fixed bottom-24 right-4 z-40 md:bottom-8 md:right-8"
        >
          <button
            onClick={() => {
              HapticService.medium();
              onCreate();
            }}
            className="w-14 h-14 bg-google-blue text-white rounded-[20px] shadow-lg shadow-google-blue/40 flex items-center justify-center hover:scale-110 active:scale-95 transition-all"
          >
            <Plus className="w-7 h-7" />
          </button>
        </motion.div>
      )}
    </div>
  );
};

export default AllInvoices;
