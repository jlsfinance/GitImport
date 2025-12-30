export interface Customer {
  id: string;
  name: string;
  role?: string;
  avatar?: string;
  photo_url?: string;
  phone?: string;
  email?: string;
  address?: string;
  city?: string;
  state?: string;
  pincode?: string;
  status: 'Active' | 'Overdue' | 'Pending' | 'Settled';
  nextPayment?: string;
  arrears?: string;
  createdAt?: any;
  // KYC Details
  aadhaar?: string;
  pan?: string;
  voterId?: string;
  // Guarantor Details
  guarantor?: {
    name?: string;
    mobile?: string;
    address?: string;
    relation?: string;
  };
}

export interface Installment {
  installmentNumber: number;
  dueDate: string;
  amount: number;
  status: 'Paid' | 'Pending' | 'Cancelled';
  paymentDate?: string;
  paymentMethod?: string;
  amountPaid?: number;
  remark?: string;
  emiNumber?: number; // Legacy support
}

export interface ScheduleRow {
  instNo: number;
  dueDate: string;
  openingBalance: number;
  installment: number;
  ratePart: number;
  principalPart: number;
  closingBalance: number;
}

export interface FinancialRecord {
  id: string;
  customerId?: string;
  amount: number;
  installmentAmount: number; // Formerly emi
  rate: number; // Formerly interestRate
  tenure: number; // in months
  status: 'Pending' | 'Approved' | 'Active' | 'Rejected' | 'Settled' | 'Overdue';
  date: string; // ISO date string creation
  entryDate?: string; // Disbursal/Entry date
  type?: string;
  progress?: number;
  paid?: number;
  total?: number;
  customerName?: string;
  repaymentSchedule: Installment[];
  schedule?: ScheduleRow[]; // Formerly amortizationSchedule
  amortizationSchedule?: any[]; // Legacy
  adjustmentInstallment?: number;
  originalInstallment?: number;
  revisedInstallment?: number;
  installmentDueDay?: number;
  serviceCharge?: number;
  adjustmentHistory?: {
    date: string;
    adjustmentAmount: number;
    amount?: number; // legacy
    outstandingBefore?: number;
    newInstallment?: number;
    revisedInstallment?: number;
    tenure?: number;
    serviceCharge?: number;
  }[];
}

export interface Transaction {
  id: string;
  title: string;
  subtitle: string;
  amount: number;
  type: 'credit' | 'debit';
  status: 'success' | 'pending' | 'failed';
  date: string;
  icon: string;
}

export interface Company {
  id: string;
  name: string;
  ownerEmail: string;
  createdAt: string;
  address?: string;
  phone?: string;
  gstin?: string;
  upiId?: string;
}

export interface AppUser {
  id: string;
  uid?: string;
  name?: string;
  email: string;
  role: 'admin' | 'agent' | 'customer';
  companyId?: string;
  permissions?: {
    canViewRecords?: boolean;
    canCollectPayments?: boolean;
    canViewCustomers?: boolean;
  };
  createdAt?: string;
}

export interface PartnerTransaction {
  id: string;
  date: string;
  partnerName: string;
  type: 'investment' | 'withdrawal';
  amount: number;
  companyId: string;
}

export interface Expense {
  id: string;
  date: string;
  narration: string;
  amount: number;
  companyId: string;
}

export interface LedgerEntry {
  date: Date;
  particulars: string;
  type: 'credit' | 'debit';
  category: 'record' | 'installment' | 'partner' | 'expense' | 'fee' | 'settlement';
  amount: number;
  customerId?: string;
}

export interface MonthlyLedger {
  month: Date;
  openingBalance: number;
  entries: LedgerEntry[];
  closingBalance: number;
}
