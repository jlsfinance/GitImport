
import { Customer, Invoice, Product, DEFAULT_COMPANY, CompanyProfile, CustomerNotification, FirebaseConfig, Payment } from '../types';
import { FirebaseService } from './firebaseService';

const KEYS = {
  PRODUCTS: 'app_products',
  CUSTOMERS: 'app_customers',
  INVOICES: 'app_invoices',
  PAYMENTS: 'app_payments',
  COMPANY: 'app_company',
  FIREBASE_CONFIG: 'app_firebase_config'
};

// YOUR FIREBASE CONFIGURATION (Hardcoded as requested)
const DEFAULT_FIREBASE_CONFIG: FirebaseConfig = {
  apiKey: "AIzaSyBDto4M27_AmBJ-eGNZyQI-Jtmhfnv1X5g",
  authDomain: "studio-5843390050-90c53.firebaseapp.com",
  projectId: "studio-5843390050-90c53",
  storageBucket: "studio-5843390050-90c53.firebasestorage.app",
  messagingSenderId: "796126072517",
  appId: "1:796126072517:web:be2ff390a075fad7bcaaac"
};

// Initial Data Seeding
const SEED_PRODUCTS: Product[] = [
  { id: '1', name: 'Product A', price: 500, stock: 100, category: 'Electronics' },
  { id: '2', name: 'Product B', price: 800, stock: 45, category: 'Electronics' },
];

const SEED_CUSTOMERS: Customer[] = [
  { 
    id: 'c1', 
    name: 'John Doe', 
    company: 'XYZ Enterprises', 
    email: 'john@xyz.com', 
    phone: '9123456789', 
    address: '456, Business Park, Mumbai', 
    balance: 0,
    notifications: []
  },
];

// In-Memory Cache
let cache = {
    products: [] as Product[],
    customers: [] as Customer[],
    invoices: [] as Invoice[],
    payments: [] as Payment[],
    company: DEFAULT_COMPANY,
    isLoaded: false,
    currentUserId: null as string | null
};

export const StorageService = {
  
  // --- Initialization ---
  init: async (userId: string | null = null): Promise<void> => {
    
    if (cache.currentUserId !== userId) {
        cache = {
            products: [], customers: [], invoices: [], payments: [],
            company: DEFAULT_COMPANY, isLoaded: false, currentUserId: userId
        };
    }

    if (cache.isLoaded) return;

    // 1. Always use the Hardcoded Config
    const config = DEFAULT_FIREBASE_CONFIG;
    // We also save it to local storage just to keep the settings UI in sync if visited
    localStorage.setItem(KEYS.FIREBASE_CONFIG, JSON.stringify(config));

    // 2. Init Firebase
    const connected = FirebaseService.init(config);
    
    if (connected && userId) {
        // 3. Fetch Data from Firebase
        const userPath = `users/${userId}`;
        
        const [fbProducts, fbCustomers, fbInvoices, fbPayments, fbCompany] = await Promise.all([
            FirebaseService.fetchCollection<Product>(`${userPath}/products`),
            FirebaseService.fetchCollection<Customer>(`${userPath}/customers`),
            FirebaseService.fetchCollection<Invoice>(`${userPath}/invoices`),
            FirebaseService.fetchCollection<Payment>(`${userPath}/payments`),
            FirebaseService.fetchCollection<CompanyProfile>(`${userPath}/company`)
        ]);

        cache.products = fbProducts;
        cache.customers = fbCustomers;
        cache.invoices = fbInvoices;
        cache.payments = fbPayments;
        cache.company = fbCompany.length > 0 ? fbCompany[0] : DEFAULT_COMPANY;
        cache.isLoaded = true;
        return;
    }

    // 4. Fallback to LocalStorage (Guest Mode)
    if (!userId) {
        const lsProducts = localStorage.getItem(KEYS.PRODUCTS);
        cache.products = lsProducts ? JSON.parse(lsProducts) : SEED_PRODUCTS;

        const lsCustomers = localStorage.getItem(KEYS.CUSTOMERS);
        cache.customers = lsCustomers ? JSON.parse(lsCustomers) : SEED_CUSTOMERS;

        const lsInvoices = localStorage.getItem(KEYS.INVOICES);
        cache.invoices = lsInvoices ? JSON.parse(lsInvoices) : [];

        const lsPayments = localStorage.getItem(KEYS.PAYMENTS);
        cache.payments = lsPayments ? JSON.parse(lsPayments) : [];

        const lsCompany = localStorage.getItem(KEYS.COMPANY);
        cache.company = lsCompany ? JSON.parse(lsCompany) : DEFAULT_COMPANY;
        
        cache.isLoaded = true;
    } else {
        // User logged in but no data found -> Init empty
        cache.products = [];
        cache.customers = [];
        cache.invoices = [];
        cache.payments = [];
        cache.company = DEFAULT_COMPANY;
        cache.isLoaded = true;
    }
  },

  getCollectionPath: (col: string) => {
      if (cache.currentUserId) return `users/${cache.currentUserId}/${col}`;
      return col; 
  },

  persistToLocalStorage: () => {
    if (!cache.currentUserId) {
        localStorage.setItem(KEYS.PRODUCTS, JSON.stringify(cache.products));
        localStorage.setItem(KEYS.CUSTOMERS, JSON.stringify(cache.customers));
        localStorage.setItem(KEYS.INVOICES, JSON.stringify(cache.invoices));
        localStorage.setItem(KEYS.PAYMENTS, JSON.stringify(cache.payments));
        localStorage.setItem(KEYS.COMPANY, JSON.stringify(cache.company));
    }
  },

  // --- Getters ---
  getProducts: (): Product[] => cache.products,
  getCustomers: (): Customer[] => cache.customers,
  getInvoices: (): Invoice[] => cache.invoices,
  getPayments: (): Payment[] => cache.payments,
  getCompanyProfile: (): CompanyProfile => cache.company,
  
  getFirebaseConfig: (): FirebaseConfig | null => {
      return DEFAULT_FIREBASE_CONFIG;
  },

  // --- Setters ---
  saveFirebaseConfig: (config: FirebaseConfig) => {
      // No-op since we use hardcoded config, but keep for interface compatibility
      localStorage.setItem(KEYS.FIREBASE_CONFIG, JSON.stringify(config));
  },

  saveProduct: (product: Product) => {
    const index = cache.products.findIndex(p => p.id === product.id);
    if (index >= 0) cache.products[index] = product;
    else cache.products.push(product);

    StorageService.persistToLocalStorage();
    if (FirebaseService.isReady()) FirebaseService.saveDocument(StorageService.getCollectionPath('products'), product.id, product);
  },

  saveCustomer: (customer: Customer) => {
    const index = cache.customers.findIndex(c => c.id === customer.id);
    if (index >= 0) cache.customers[index] = customer;
    else cache.customers.push(customer);

    StorageService.persistToLocalStorage();
    if (FirebaseService.isReady()) FirebaseService.saveDocument(StorageService.getCollectionPath('customers'), customer.id, customer);
  },

  addNotification: (customerId: string, notification: Omit<CustomerNotification, 'id' | 'read'>) => {
    const index = cache.customers.findIndex(c => c.id === customerId);
    if (index >= 0) {
      const newNotification: CustomerNotification = {
        id: crypto.randomUUID(),
        read: false,
        ...notification
      };
      if (!cache.customers[index].notifications) cache.customers[index].notifications = [];
      cache.customers[index].notifications.unshift(newNotification);
      
      StorageService.persistToLocalStorage();
      if (FirebaseService.isReady()) FirebaseService.saveDocument(StorageService.getCollectionPath('customers'), customerId, cache.customers[index]);
    }
  },

  saveInvoice: (invoice: Invoice) => {
    invoice.items.forEach(item => {
      const pIndex = cache.products.findIndex(p => p.id === item.productId);
      if (pIndex >= 0 && cache.products[pIndex].category !== 'Services') {
        const product = cache.products[pIndex];
        product.stock -= item.quantity;
        if (FirebaseService.isReady()) FirebaseService.saveDocument(StorageService.getCollectionPath('products'), product.id, product);
      }
    });

    const cIndex = cache.customers.findIndex(c => c.id === invoice.customerId);
    if (cIndex >= 0 && invoice.status === 'PENDING') {
        const customer = cache.customers[cIndex];
        customer.balance += invoice.total;
        if (FirebaseService.isReady()) FirebaseService.saveDocument(StorageService.getCollectionPath('customers'), customer.id, customer);
    }

    cache.invoices.unshift(invoice);
    
    StorageService.persistToLocalStorage();
    if (FirebaseService.isReady()) FirebaseService.saveDocument(StorageService.getCollectionPath('invoices'), invoice.id, invoice);

    StorageService.addNotification(invoice.customerId, {
      type: 'INVOICE',
      title: 'New Invoice Generated',
      message: `Invoice #${invoice.invoiceNumber} for ₹${invoice.total} has been created.`,
      date: new Date().toISOString().split('T')[0]
    });
  },

  savePayment: (payment: Payment) => {
    cache.payments.unshift(payment);

    const cIndex = cache.customers.findIndex(c => c.id === payment.customerId);
    if (cIndex >= 0) {
        const customer = cache.customers[cIndex];
        customer.balance -= payment.amount;
        if (FirebaseService.isReady()) FirebaseService.saveDocument(StorageService.getCollectionPath('customers'), customer.id, customer);
    }

    StorageService.persistToLocalStorage();
    if (FirebaseService.isReady()) FirebaseService.saveDocument(StorageService.getCollectionPath('payments'), payment.id, payment);

    StorageService.addNotification(payment.customerId, {
        type: 'PAYMENT',
        title: 'Payment Received',
        message: `Payment of ₹${payment.amount} received via ${payment.mode}.`,
        date: payment.date
    });
  },

  deleteInvoice: (invoiceId: string) => {
    const index = cache.invoices.findIndex(i => i.id === invoiceId);
    if (index === -1) return;
    const invoice = cache.invoices[index];

    invoice.items.forEach(item => {
      const pIndex = cache.products.findIndex(p => p.id === item.productId);
      if (pIndex >= 0 && cache.products[pIndex].category !== 'Services') {
        cache.products[pIndex].stock += item.quantity;
        if (FirebaseService.isReady()) FirebaseService.saveDocument(StorageService.getCollectionPath('products'), cache.products[pIndex].id, cache.products[pIndex]);
      }
    });

    const cIndex = cache.customers.findIndex(c => c.id === invoice.customerId);
    if (cIndex >= 0 && invoice.status === 'PENDING') {
      cache.customers[cIndex].balance -= invoice.total;
      if (FirebaseService.isReady()) FirebaseService.saveDocument(StorageService.getCollectionPath('customers'), cache.customers[cIndex].id, cache.customers[cIndex]);
    }

    cache.invoices.splice(index, 1);
    StorageService.persistToLocalStorage();

    if (FirebaseService.isReady()) FirebaseService.deleteDocument(StorageService.getCollectionPath('invoices'), invoiceId);
  },

  updateInvoice: (updatedInvoice: Invoice) => {
    const oldInvoiceIndex = cache.invoices.findIndex(i => i.id === updatedInvoice.id);
    if (oldInvoiceIndex === -1) return;
    const oldInvoice = cache.invoices[oldInvoiceIndex];

    const modifiedProductIds = new Set<string>();

    oldInvoice.items.forEach(item => {
      const pIndex = cache.products.findIndex(p => p.id === item.productId);
      if (pIndex >= 0 && cache.products[pIndex].category !== 'Services') {
         cache.products[pIndex].stock += item.quantity;
         modifiedProductIds.add(cache.products[pIndex].id);
      }
    });

    const oldCIndex = cache.customers.findIndex(c => c.id === oldInvoice.customerId);
    if (oldCIndex >= 0 && oldInvoice.status === 'PENDING') {
        cache.customers[oldCIndex].balance -= oldInvoice.total;
    }

    updatedInvoice.items.forEach(item => {
      const pIndex = cache.products.findIndex(p => p.id === item.productId);
      if (pIndex >= 0 && cache.products[pIndex].category !== 'Services') {
        cache.products[pIndex].stock -= item.quantity;
        modifiedProductIds.add(cache.products[pIndex].id);
      }
    });

    const newCIndex = cache.customers.findIndex(c => c.id === updatedInvoice.customerId);
    if (newCIndex >= 0 && updatedInvoice.status === 'PENDING') {
        cache.customers[newCIndex].balance += updatedInvoice.total;
    }

    if (FirebaseService.isReady()) {
       modifiedProductIds.forEach(pid => {
           const product = cache.products.find(p => p.id === pid);
           if(product) FirebaseService.saveDocument(StorageService.getCollectionPath('products'), product.id, product);
       });
       
       const oldC = cache.customers[oldCIndex];
       if(oldC) FirebaseService.saveDocument(StorageService.getCollectionPath('customers'), oldC.id, oldC);
       
       if (oldCIndex !== newCIndex) {
           const newC = cache.customers[newCIndex];
           if(newC) FirebaseService.saveDocument(StorageService.getCollectionPath('customers'), newC.id, newC);
       }
    }

    cache.invoices[oldInvoiceIndex] = updatedInvoice;
    
    StorageService.persistToLocalStorage();
    if (FirebaseService.isReady()) FirebaseService.saveDocument(StorageService.getCollectionPath('invoices'), updatedInvoice.id, updatedInvoice);

    if (oldInvoice.total !== updatedInvoice.total) {
       StorageService.addNotification(updatedInvoice.customerId, {
        type: 'INVOICE',
        title: 'Invoice Updated',
        message: `Invoice #${updatedInvoice.invoiceNumber} has been updated to ₹${updatedInvoice.total}.`,
        date: new Date().toISOString().split('T')[0]
      });
    }
  },

  saveCompanyProfile: (profile: CompanyProfile) => {
    cache.company = profile;
    StorageService.persistToLocalStorage();
    if (FirebaseService.isReady()) FirebaseService.saveDocument(StorageService.getCollectionPath('company'), 'profile', profile);
  },

  getLastSalePrice: (customerId: string, productId: string): number | null => {
    const customerInvoices = cache.invoices.filter(inv => inv.customerId === customerId);
    for (const inv of customerInvoices) {
      const item = inv.items.find(i => i.productId === productId);
      if (item) return item.rate;
    }
    return null;
  },

  exportAllData: (): string => {
    const data = {
      products: JSON.stringify(cache.products),
      customers: JSON.stringify(cache.customers),
      invoices: JSON.stringify(cache.invoices),
      payments: JSON.stringify(cache.payments),
      company: JSON.stringify(cache.company),
      timestamp: new Date().toISOString()
    };
    return JSON.stringify(data);
  },

  importData: (jsonString: string): boolean => {
    try {
      const data = JSON.parse(jsonString);
      if (data.products) cache.products = JSON.parse(data.products);
      if (data.customers) cache.customers = JSON.parse(data.customers);
      if (data.invoices) cache.invoices = JSON.parse(data.invoices);
      if (data.payments) cache.payments = JSON.parse(data.payments);
      if (data.company) cache.company = JSON.parse(data.company);
      
      StorageService.persistToLocalStorage();
      if (FirebaseService.isReady()) {
         StorageService.init(cache.currentUserId);
      }
      return true;
    } catch (e) {
      console.error("Failed to import data", e);
      return false;
    }
  }
};
