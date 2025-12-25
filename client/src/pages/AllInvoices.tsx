
import React, { useState, useMemo } from 'react';
import { Invoice } from '../types';
import { StorageService } from '../services/storageService';
import { Search, MoreVertical, FileText, Trash2, Users, Edit, MessageCircle, Eye } from 'lucide-react';
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
    <div className="bg-slate-50 dark:bg-slate-900 min-h-screen flex flex-col pb-32">
      {/* Apple-style Compact Header */}
      <div className="bg-slate-50/80 dark:bg-slate-900/80 backdrop-blur-xl sticky top-0 z-30 px-4 pt-6 pb-4">
        <div className="max-w-5xl mx-auto">
          <div className="flex justify-between items-baseline mb-4">
            <h1 className="text-3xl font-black text-slate-900 dark:text-slate-100 tracking-tight">Invoices</h1>
            <p className="text-slate-400 text-xs font-black uppercase tracking-widest">{filteredInvoices.length} Items</p>
          </div>

          <div className="flex gap-3">
            <div className="flex-1 bg-white dark:bg-slate-800 rounded-2xl px-4 py-3.5 flex items-center gap-3 border border-slate-200 dark:border-slate-800 shadow-sm focus-within:ring-2 focus-within:ring-blue-500/20 transition-all">
              <Search className="w-4 h-4 text-slate-400 group-focus-within:text-blue-500" />
              <input
                type="text"
                placeholder="Search invoices or clients..."
                className="bg-transparent flex-1 outline-none text-sm font-black uppercase tracking-tight text-slate-700 dark:text-slate-200 placeholder:text-slate-400 placeholder:normal-case"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="relative">
              <select
                className="bg-white dark:bg-slate-800 rounded-2xl px-6 py-3.5 outline-none border border-slate-200 dark:border-slate-800 font-black text-[10px] uppercase tracking-widest text-slate-600 dark:text-slate-300 appearance-none min-w-[120px] shadow-sm cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
              >
                <option value="ALL">All Status</option>
                <option value="PAID">Paid Only</option>
                <option value="PENDING">Pending</option>
              </select>
              <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none">
                <div className="w-1.5 h-1.5 border-r-2 border-b-2 border-slate-400 rotate-45" />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-2 mt-4 space-y-2">
        <AnimatePresence mode='popLayout'>
          {filteredInvoices.map((invoice, index) => (
            <div key={invoice.id} className="relative overflow-hidden rounded-2xl group">
              {/* Delete Action Background */}
              <div className="absolute inset-0 bg-red-500 flex justify-end items-center px-6">
                <Trash2 className="w-6 h-6 text-white" />
              </div>

              {/* Swipeable Card Content */}
              <motion.div
                drag="x"
                dragConstraints={{ left: -100, right: 0 }}
                dragElastic={0.05}
                onDragEnd={(_, info) => {
                  if (info.offset.x < -60) {
                    HapticService.medium();
                    handleDelete(invoice);
                  }
                }}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -100 }}
                transition={{ delay: index * 0.03 }}
                className="bg-white dark:bg-slate-800 p-4 flex justify-between items-center rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm hover:shadow-md hover:border-blue-100 dark:hover:border-blue-900/30 relative z-10 cursor-pointer transition-all active:scale-[0.99]"
                onClick={() => onView && onView(invoice)}
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-900/40 flex items-center justify-center text-blue-600 dark:text-blue-400 font-black text-lg shadow-inner">
                    {invoice.customerName.charAt(0)}
                  </div>
                  <div className="overflow-hidden">
                    <h3 className="font-black text-slate-900 dark:text-slate-100 text-sm tracking-tight truncate max-w-[180px]">{invoice.customerName}</h3>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[10px] text-slate-400 font-extrabold uppercase tracking-widest">#{invoice.invoiceNumber}</span>
                      <span className="w-1 h-1 bg-slate-300 dark:bg-slate-700 rounded-full"></span>
                      <span className="text-[10px] text-slate-500 dark:text-slate-400 font-black tracking-widest uppercase">
                        {new Date(invoice.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <p className="text-lg font-black text-slate-900 dark:text-slate-100 italic">₹{invoice.total.toLocaleString('en-IN')}</p>
                    <div className={`mt-1 flex items-center justify-end gap-1.5`}>
                      <div className={`w-1.5 h-1.5 rounded-full ${invoice.status === 'PAID' ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                      <span className={`text-[9px] font-black uppercase tracking-widest ${invoice.status === 'PAID'
                        ? 'text-emerald-600'
                        : 'text-amber-600'
                        }`}>
                        {invoice.status}
                      </span>
                    </div>
                  </div>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button
                        className="p-3 -mr-2 rounded-2xl hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors text-slate-300 hover:text-slate-600 dark:hover:text-slate-200"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <MoreVertical className="w-5 h-5" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" sideOffset={12}>
                      <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onView && onView(invoice); }}>
                        <Eye className="mr-3 h-4 w-4" /> View Invoice
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onViewLedger && onViewLedger(invoice.customerId); }}>
                        <Users className="mr-3 h-4 w-4 text-blue-500" /> View Ledger
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onEdit && onEdit(invoice); }}>
                        <Edit className="mr-3 h-4 w-4 text-orange-500" /> Edit Invoice
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem className="text-red-600" onClick={(e) => { e.stopPropagation(); handleDelete(invoice); }}>
                        <Trash2 className="mr-3 h-4 w-4" /> Delete Permanently
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </motion.div>
            </div>
          ))}
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
    </div>
  );
};

export default AllInvoices;
