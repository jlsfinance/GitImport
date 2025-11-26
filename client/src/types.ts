
export enum ViewState {
  DASHBOARD = 'DASHBOARD',
  INVOICES = 'INVOICES',
  CREATE_INVOICE = 'CREATE_INVOICE',
  EDIT_INVOICE = 'EDIT_INVOICE',
  INVENTORY = 'INVENTORY',
  CUSTOMERS = 'CUSTOMERS',
  VIEW_INVOICE = 'VIEW_INVOICE',
  SETTINGS = 'SETTINGS',
  DAYBOOK = 'DAYBOOK',
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
  amount: number;
}

export interface Invoice {
  id: string;
  invoiceNumber: string;
  customerId: string;
  customerName: string;
  customerAddress: string;
  date: string;
  dueDate: string;
  items: InvoiceItem[];
  subtotal: number;
  tax: number; // Simple tax implementation
  total: number;
  status: 'PAID' | 'PENDING' | 'OVERDUE';
}

export interface CompanyProfile {
  name: string;
  address: string;
  phone: string;
  email: string;
}

// Mock Data Defaults
export const DEFAULT_COMPANY: CompanyProfile = {
  name: "ABC Trading Company",
  address: "123, Market Road, Delhi - 110001",
  phone: "9876543210",
  email: "info@abctrading.com"
};