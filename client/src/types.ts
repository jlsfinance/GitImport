
export enum ViewState {
  DASHBOARD = 'DASHBOARD',
  INVOICES = 'INVOICES',
  ALL_INVOICES = 'ALL_INVOICES',
  CREATE_INVOICE = 'CREATE_INVOICE',
  EDIT_INVOICE = 'EDIT_INVOICE',
  INVENTORY = 'INVENTORY',
  CUSTOMERS = 'CUSTOMERS',
  VIEW_INVOICE = 'VIEW_INVOICE',
  CUSTOMER_LEDGER = 'CUSTOMER_LEDGER',
  SETTINGS = 'SETTINGS',
  DAYBOOK = 'DAYBOOK',
  IMPORT = 'IMPORT',
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
  stock: number;
  category: string;
  hsn?: string;
  gstRate?: number;
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
  notifications: CustomerNotification[];
}

export interface Payment {
  id: string;
  customerId: string;
  date: string;
  amount: number;
  mode: 'CASH' | 'UPI' | 'BANK_TRANSFER' | 'CHEQUE';
  reference?: string; // Cheque number or UPI Ref
  note?: string;
}

export interface InvoiceItem {
  productId: string;
  description: string;
  quantity: number;
  rate: number;
  baseAmount: number;
  hsn?: string;
  gstRate?: number;
  cgstAmount?: number;
  sgstAmount?: number;
  igstAmount?: number;
  totalAmount?: number;
}

export interface Invoice {
  id: string;
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
  status: 'PAID' | 'PENDING' | 'OVERDUE';
}

export interface CompanyProfile {
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