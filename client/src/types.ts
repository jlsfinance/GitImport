
export enum ViewState {
  DASHBOARD = 'DASHBOARD',
  INVOICES = 'INVOICES',
  ALL_INVOICES = 'ALL_INVOICES',
  CREATE_INVOICE = 'CREATE_INVOICE',
  EDIT_INVOICE = 'EDIT_INVOICE',
  CREATE_PURCHASE = 'CREATE_PURCHASE',
  EDIT_PURCHASE = 'EDIT_PURCHASE',
  PURCHASES = 'PURCHASES',
  INVENTORY = 'INVENTORY',
  CUSTOMERS = 'CUSTOMERS',
  VIEW_INVOICE = 'VIEW_INVOICE',
  CUSTOMER_LEDGER = 'CUSTOMER_LEDGER',
  REPORTS = 'REPORTS',
  SETTINGS = 'SETTINGS',
  DAYBOOK = 'DAYBOOK',
  IMPORT = 'IMPORT',
  EXPENSES = 'EXPENSES',
  PAYMENTS = 'PAYMENTS',
  PUBLIC_VIEW_INVOICE = 'PUBLIC_VIEW_INVOICE',
  SMART_CALCULATOR = 'SMART_CALCULATOR',
  CREDIT_NOTE = 'CREDIT_NOTE',
  CREATE_CREDIT_NOTE = 'CREATE_CREDIT_NOTE',
}

export interface Expense {
  id: string;
  category: string; // e.g., 'Rent', 'Electricity', 'Salary', 'Tea/Snacks'
  description?: string;
  amount: number;
  date: string;
  paymentMode: 'CASH' | 'UPI' | 'BANK_TRANSFER';
}


export interface FirebaseConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
}

export interface Product {
  id: string;
  name: string;
  price: number;
  purchasePrice?: number; // Added for Purchase
  stock: number;
  category: string;
  hsn?: string;
  gstRate?: number;
  description?: string;
}

export interface CustomerNotification {
  id: string;
  type: 'INVOICE' | 'PAYMENT' | 'REMINDER' | 'SYSTEM';
  title: string;
  message: string;
  date: string;
  read: boolean;
}

export interface Customer {
  id: string;
  name: string;
  company: string;
  email: string;
  phone: string;
  address: string;
  state?: string;
  gstin?: string;
  balance: number;
  type?: 'CUSTOMER' | 'VENDOR' | 'BOTH'; // Added to distinguish
  notifications: CustomerNotification[];
  behaviorScore?: number; // 0-100
  followUpHistory?: { date: string, note: string }[];
}

export interface Payment {
  id: string;
  customerId: string;
  date: string;
  amount: number;
  mode: 'CASH' | 'UPI' | 'BANK_TRANSFER' | 'CHEQUE';
  type?: 'RECEIVED' | 'PAID' | 'RECEIPT'; // RECEIVED = In from Customer, PAID = Out to Vendor, RECEIPT = Against Invoice
  reference?: string; // Cheque number or UPI Ref
  note?: string;
  notes?: string; // Alias for note
  invoiceId?: string; // Link to Invoice for receipts
  invoiceNumber?: string; // Invoice number for reference
}

export interface InvoiceItem {
  productId: string;
  description: string;
  quantity: number;
  rate: number;
  baseAmount: number;
  discountType?: 'PERCENTAGE' | 'AMOUNT';
  discountValue?: number;
  discountAmount?: number; // The actual subtracted amount
  hsn?: string;
  gstRate?: number;
  cgstAmount?: number;
  sgstAmount?: number;
  igstAmount?: number;
  totalAmount?: number;
}

export interface Invoice {
  id: string;
  type?: 'SALE' | 'PURCHASE' | 'CREDIT_NOTE'; // Added to distinguish
  invoiceNumber: string;
  customerId: string;
  customerName: string;
  customerAddress: string;
  customerState?: string;
  customerGstin?: string;
  supplierGstin?: string;
  taxType?: 'INTRA_STATE' | 'INTER_STATE';
  date: string;
  dueDate: string;
  items: InvoiceItem[];
  subtotal: number;
  totalCgst?: number;
  totalSgst?: number;
  totalIgst?: number;
  gstEnabled?: boolean;
  roundUpTo?: 0 | 10 | 100; // 0 = no rounding, 10 = round to nearest 10, 100 = round to nearest 100
  roundUpAmount?: number; // Amount added by rounding (calculated, not user set)
  total: number;
  status: 'PAID' | 'PENDING' | 'PARTIAL' | 'OVERDUE';
  paymentMode?: 'CASH' | 'CREDIT' | 'ONLINE';
  amountReceived?: number; // Amount received at the time of sale
  balanceDue?: number; // Remaining balance
  discountType?: 'PERCENTAGE' | 'AMOUNT';
  discountValue?: number;
  discountAmount?: number;
  paidAmount?: number; // Amount paid/received
  expiresAt?: any; // For public secure links
  previousBalance?: number; // Outstanding balance from previous invoices
  notes?: string;
  terms?: string;
  templateFormat?: InvoiceFormat;
}

// ... existing code
export enum InvoiceFormat {
  DEFAULT = 'DEFAULT',
  MODERN = 'MODERN',
  MINIMAL = 'MINIMAL',
  DESI_BILL_BOOK = 'DESI_BILL_BOOK', // Traditional Indian Bahi Khata style
  KACCHI_BILL_BOOK = 'KACCHI_BILL_BOOK', // Simple handwritten style look
  TALLY_PRIME_STYLE = 'TALLY_PRIME_STYLE', // Tally accounting software style
  PROFESSIONAL = 'PROFESSIONAL',
  ELEGANT = 'ELEGANT',
  COMPACT = 'COMPACT',
  BOLD = 'BOLD',
  RETRO = 'RETRO'
}

export interface InvoiceSettings {
  format: InvoiceFormat;
  showWatermark?: boolean;
  watermarkText?: string;
  primaryColor?: string;
}

export interface CompanyProfile {
  id?: string;
  name: string;
  address: string;
  phone: string;
  email: string;
  state?: string;
  gstin?: string;
  gst?: string;
  gst_enabled?: boolean;
  show_hsn_summary?: boolean;
  roundUpDefault?: 0 | 10 | 100; // Default round-up for all invoices (0 = no rounding)
  upiId?: string; // e.g., merchant@upi
  greetingSettings?: GreetingSettings;
  adminGreeting?: AdminGreeting;
  invoiceSettings?: InvoiceSettings;
}

export interface GreetingSettings {
  enableFestivalGreetings: boolean;
  useAiEnhancement: boolean;
  autoShareWhatsapp: boolean;
}

export interface AdminGreeting {
  message: string;
  enabled: boolean;
  expiresAt: string; // ISO date string
}

export interface Festival {
  name: string;
  date: string; // YYYY-MM-DD
  defaultMessage: string;
}

// Mock Data Defaults
export const DEFAULT_COMPANY: CompanyProfile = {
  name: "ABC Trading Company",
  address: "123, Market Road, Delhi - 110001",
  phone: "9876543210",
  email: "info@abctrading.com",
  state: "Delhi",
  gst_enabled: true
};
export interface AdminAd {
  id: string;
  title: string;
  content: string;
  buttonText?: string;
  actionUrl?: string;
  type: 'INFO' | 'PROMO' | 'ALERT' | 'UPDATE';
  gradient: string;
  isActive: boolean;
  imageUrl?: string;
}

export interface ContactSuggestion {
  name: string;
  phone: string;
}
