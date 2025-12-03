
import { Customer, Invoice, Product, DEFAULT_COMPANY, CompanyProfile, CustomerNotification, FirebaseConfig, Payment, CompanyMembership, UserRole } from '../types';
import { FirebaseService } from './firebaseService';

const KEYS = {
  PRODUCTS: 'app_products',
  CUSTOMERS: 'app_customers',
  INVOICES: 'app_invoices',
  PAYMENTS: 'app_payments',
  COMPANY: 'app_company',
  FIREBASE_CONFIG: 'app_firebase_config',
  ACTIVE_COMPANY: 'app_active_company',
  MEMBERSHIPS: 'app_memberships'
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
    currentUserId: null as string | null,
    currentCompanyId: null as string | null,
    memberships: [] as CompanyMembership[]
};

export const StorageService = {
  
  // --- Initialization ---
  init: async (userId: string | null = null, companyId: string | null = null): Promise<void> => {
    
    // Reset cache if user or company changes
    if (cache.currentUserId !== userId || cache.currentCompanyId !== companyId) {
        cache = {
            products: [], customers: [], invoices: [], payments: [],
            company: DEFAULT_COMPANY, isLoaded: false, 
            currentUserId: userId,
            currentCompanyId: companyId,
            memberships: []
        };
    }

    if (cache.isLoaded) return;

    // 1. Always use the Hardcoded Config
    const config = DEFAULT_FIREBASE_CONFIG;
    localStorage.setItem(KEYS.FIREBASE_CONFIG, JSON.stringify(config));

    // 2. Init Firebase
    const connected = FirebaseService.init(config);
    
    if (connected && userId) {
        // 3. First fetch user's memberships
        let memberships = await FirebaseService.fetchCollection<CompanyMembership>(`users/${userId}/memberships`);
        
        // 3.1 MIGRATION: Check for old data structure (users/{userId}) and migrate if needed
        if (memberships.length === 0) {
            console.log('No memberships found, checking for old data to migrate...');
            try {
                // Try to fetch old company data from users/{userId}/company path
                const oldCompanyArr = await FirebaseService.fetchCollection<CompanyProfile>(`users/${userId}/company`);
                const oldProducts = await FirebaseService.fetchCollection<Product>(`users/${userId}/products`);
                const oldCustomers = await FirebaseService.fetchCollection<Customer>(`users/${userId}/customers`);
                const oldInvoices = await FirebaseService.fetchCollection<Invoice>(`users/${userId}/invoices`);
                const oldPayments = await FirebaseService.fetchCollection<Payment>(`users/${userId}/payments`);
                
                if (oldCompanyArr.length > 0 || oldProducts.length > 0 || oldCustomers.length > 0 || oldInvoices.length > 0) {
                    console.log('Found old data, migrating to new multi-company structure...');
                    
                    // Create a new company ID for migration
                    const newCompanyId = `migrated_${userId}_${Date.now()}`;
                    const oldCompany = oldCompanyArr.length > 0 ? oldCompanyArr[0] : DEFAULT_COMPANY;
                    
                    // Create company profile in new structure
                    const companyProfile: CompanyProfile = {
                        ...oldCompany,
                        id: 'main'
                    };
                    await FirebaseService.saveDocument(`companies/${newCompanyId}/profile`, 'main', companyProfile);
                    
                    // Migrate products
                    for (const product of oldProducts) {
                        await FirebaseService.saveDocument(`companies/${newCompanyId}/products`, product.id, product);
                    }
                    
                    // Migrate customers
                    for (const customer of oldCustomers) {
                        await FirebaseService.saveDocument(`companies/${newCompanyId}/customers`, customer.id, customer);
                    }
                    
                    // Migrate invoices
                    for (const invoice of oldInvoices) {
                        await FirebaseService.saveDocument(`companies/${newCompanyId}/invoices`, invoice.id, invoice);
                    }
                    
                    // Migrate payments
                    for (const payment of oldPayments) {
                        await FirebaseService.saveDocument(`companies/${newCompanyId}/payments`, payment.id, payment);
                    }
                    
                    // Create owner membership
                    const ownerMembership: CompanyMembership = {
                        id: `owner_${newCompanyId}`,
                        companyId: newCompanyId,
                        companyName: oldCompany.name || 'My Company',
                        userId: userId,
                        userEmail: '',
                        role: 'OWNER',
                        status: 'ACTIVE',
                        joinedAt: new Date().toISOString()
                    };
                    
                    await FirebaseService.saveDocument(`users/${userId}/memberships`, ownerMembership.id, ownerMembership);
                    await FirebaseService.saveDocument(`companyMembers/${newCompanyId}/members`, ownerMembership.id, ownerMembership);
                    
                    memberships = [ownerMembership];
                    console.log('Migration complete! Old data moved to company:', newCompanyId);
                }
            } catch (migrationError) {
                console.warn('Migration check failed (may not have old data):', migrationError);
            }
        }
        
        cache.memberships = memberships.filter(m => m.status === 'ACTIVE');
        
        // 4. Determine which company to load
        let activeCompanyId = companyId;
        if (!activeCompanyId && cache.memberships.length > 0) {
            // Try to get from localStorage first
            const savedActiveCompany = localStorage.getItem(KEYS.ACTIVE_COMPANY);
            if (savedActiveCompany && cache.memberships.some(m => m.companyId === savedActiveCompany)) {
                activeCompanyId = savedActiveCompany;
            } else {
                activeCompanyId = cache.memberships[0].companyId;
            }
        }
        
        cache.currentCompanyId = activeCompanyId;
        if (activeCompanyId) {
            localStorage.setItem(KEYS.ACTIVE_COMPANY, activeCompanyId);
        }

        // 5. Fetch company data if we have an active company
        if (activeCompanyId) {
            const companyPath = `companies/${activeCompanyId}`;
            
            const [fbProducts, fbCustomers, fbInvoices, fbPayments, fbCompanyArr] = await Promise.all([
                FirebaseService.fetchCollection<Product>(`${companyPath}/products`),
                FirebaseService.fetchCollection<Customer>(`${companyPath}/customers`),
                FirebaseService.fetchCollection<Invoice>(`${companyPath}/invoices`),
                FirebaseService.fetchCollection<Payment>(`${companyPath}/payments`),
                FirebaseService.fetchCollection<CompanyProfile>(`${companyPath}/profile`)
            ]);

            cache.products = fbProducts;
            cache.customers = fbCustomers;
            cache.invoices = fbInvoices;
            cache.payments = fbPayments;
            cache.company = fbCompanyArr.length > 0 ? fbCompanyArr[0] : DEFAULT_COMPANY;
        } else {
            // No company yet - might need to create one
            cache.products = [];
            cache.customers = [];
            cache.invoices = [];
            cache.payments = [];
            cache.company = DEFAULT_COMPANY;
        }
        
        cache.isLoaded = true;
        return;
    }

    // 6. Fallback to LocalStorage (Guest Mode)
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
        cache.products = [];
        cache.customers = [];
        cache.invoices = [];
        cache.payments = [];
        cache.company = DEFAULT_COMPANY;
        cache.isLoaded = true;
    }
  },

  // Get current company ID
  getCurrentCompanyId: (): string | null => cache.currentCompanyId,
  
  // Get all memberships for current user
  getMemberships: (): CompanyMembership[] => cache.memberships,
  
  // Get current user's role in active company
  getCurrentRole: (): UserRole | null => {
    if (!cache.currentCompanyId) return null;
    const membership = cache.memberships.find(m => m.companyId === cache.currentCompanyId);
    return membership?.role || null;
  },

  // Switch to a different company
  switchCompany: async (companyId: string): Promise<boolean> => {
    const membership = cache.memberships.find(m => m.companyId === companyId && m.status === 'ACTIVE');
    if (!membership) return false;
    
    cache.isLoaded = false;
    localStorage.setItem(KEYS.ACTIVE_COMPANY, companyId);
    await StorageService.init(cache.currentUserId, companyId);
    return true;
  },

  // Create a new company and set user as owner
  createCompany: async (profile: CompanyProfile, userId: string, userEmail: string, userName?: string): Promise<string | null> => {
    if (!FirebaseService.isReady()) return null;
    
    const companyId = crypto.randomUUID();
    const companyData: CompanyProfile = {
      ...profile,
      id: companyId,
      ownerId: userId,
      ownerEmail: userEmail,
      createdAt: new Date().toISOString()
    };

    // Save company profile
    await FirebaseService.saveDocument(`companies/${companyId}/profile`, 'main', companyData);
    
    // Create membership for owner
    const membership: CompanyMembership = {
      id: crypto.randomUUID(),
      companyId: companyId,
      companyName: profile.name,
      userId: userId,
      userEmail: userEmail,
      userName: userName || userEmail.split('@')[0],
      role: 'OWNER',
      status: 'ACTIVE',
      acceptedAt: new Date().toISOString()
    };
    
    // Save to user's memberships
    await FirebaseService.saveDocument(`users/${userId}/memberships`, membership.id, membership);
    
    // Also save to company members (so it shows up in the member list)
    await FirebaseService.saveDocument(`companyMembers/${companyId}/members`, membership.id, membership);
    
    // Add to cache
    cache.memberships.push(membership);
    
    return companyId;
  },

  // Invite a user to company
  inviteUserToCompany: async (email: string, role: UserRole, inviterEmail: string): Promise<boolean> => {
    if (!FirebaseService.isReady() || !cache.currentCompanyId || !cache.currentUserId) return false;
    
    // Check if current user has permission to invite
    const currentRole = StorageService.getCurrentRole();
    if (currentRole !== 'OWNER' && currentRole !== 'ADMIN') return false;
    
    // Create pending membership
    const membership: CompanyMembership = {
      id: crypto.randomUUID(),
      companyId: cache.currentCompanyId,
      companyName: cache.company.name,
      userId: '', // Will be filled when user accepts
      userEmail: email.toLowerCase(),
      userName: '',
      role: role,
      status: 'PENDING',
      invitedBy: inviterEmail,
      invitedAt: new Date().toISOString()
    };
    
    // Save to both:
    // 1. Company members collection (so inviter can see pending members)
    await FirebaseService.saveDocument(`companyMembers/${cache.currentCompanyId}/members`, membership.id, membership);
    
    // 2. Pending invites collection (so invitee can find their invites)
    await FirebaseService.saveDocument(`pendingInvites`, membership.id, membership);
    
    return true;
  },

  // Get all members of current company
  getCompanyMembers: async (): Promise<CompanyMembership[]> => {
    if (!FirebaseService.isReady() || !cache.currentCompanyId) return [];
    
    try {
      // Fetch all memberships for this company
      const allMemberships = await FirebaseService.fetchCollection<CompanyMembership>(`companyMembers/${cache.currentCompanyId}/members`);
      return allMemberships;
    } catch (error: any) {
      console.warn('Could not fetch company members (may need Firestore rules update):', error.code);
      return [];
    }
  },

  // Accept a pending invite
  acceptInvite: async (inviteId: string, userId: string, userEmail: string): Promise<boolean> => {
    if (!FirebaseService.isReady()) return false;
    
    // Fetch the invite
    const invites = await FirebaseService.fetchCollection<CompanyMembership>('pendingInvites');
    const invite = invites.find(i => i.id === inviteId && i.userEmail === userEmail && i.status === 'PENDING');
    
    if (!invite) return false;
    
    // Update invite with user info and activate
    const updatedMembership: CompanyMembership = {
      ...invite,
      userId: userId,
      status: 'ACTIVE',
      acceptedAt: new Date().toISOString()
    };
    
    // Save to user's memberships
    await FirebaseService.saveDocument(`users/${userId}/memberships`, updatedMembership.id, updatedMembership);
    
    // Save to company members
    await FirebaseService.saveDocument(`companyMembers/${invite.companyId}/members`, updatedMembership.id, updatedMembership);
    
    // Remove from pending
    await FirebaseService.deleteDocument('pendingInvites', inviteId);
    
    // Add to cache
    cache.memberships.push(updatedMembership);
    
    return true;
  },

  // Check for pending invites for a user
  getPendingInvites: async (userEmail: string): Promise<CompanyMembership[]> => {
    if (!FirebaseService.isReady()) return [];
    
    try {
      const allInvites = await FirebaseService.fetchCollection<CompanyMembership>('pendingInvites');
      return allInvites.filter(i => i.userEmail.toLowerCase() === userEmail.toLowerCase() && i.status === 'PENDING');
    } catch (error: any) {
      // Permission errors are expected if Firestore rules aren't configured for pendingInvites
      console.warn('Could not fetch pending invites (may need Firestore rules update):', error.code);
      return [];
    }
  },

  // Remove user from company
  removeUserFromCompany: async (membershipId: string): Promise<boolean> => {
    if (!FirebaseService.isReady() || !cache.currentCompanyId) return false;
    
    const currentRole = StorageService.getCurrentRole();
    if (currentRole !== 'OWNER' && currentRole !== 'ADMIN') return false;
    
    // Get the membership to find the user
    const members = await StorageService.getCompanyMembers();
    const member = members.find(m => m.id === membershipId);
    
    if (!member || member.role === 'OWNER') return false; // Can't remove owner
    
    // Delete from company members
    await FirebaseService.deleteDocument(`companyMembers/${cache.currentCompanyId}/members`, membershipId);
    
    // Delete from user's memberships
    if (member.userId) {
      await FirebaseService.deleteDocument(`users/${member.userId}/memberships`, membershipId);
    }
    
    return true;
  },

  // Update user role in company
  updateUserRole: async (membershipId: string, newRole: UserRole): Promise<boolean> => {
    if (!FirebaseService.isReady() || !cache.currentCompanyId) return false;
    
    const currentRole = StorageService.getCurrentRole();
    if (currentRole !== 'OWNER') return false; // Only owner can change roles
    
    const members = await StorageService.getCompanyMembers();
    const member = members.find(m => m.id === membershipId);
    
    if (!member || member.role === 'OWNER') return false;
    
    const updatedMember = { ...member, role: newRole };
    
    await FirebaseService.saveDocument(`companyMembers/${cache.currentCompanyId}/members`, membershipId, updatedMember);
    
    if (member.userId) {
      await FirebaseService.saveDocument(`users/${member.userId}/memberships`, membershipId, updatedMember);
    }
    
    return true;
  },

  getCollectionPath: (col: string) => {
      // Use company-scoped path if we have an active company
      if (cache.currentCompanyId) return `companies/${cache.currentCompanyId}/${col}`;
      // Fallback to user path for backwards compatibility
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

  updateCustomer: (customer: Customer) => {
    const index = cache.customers.findIndex(c => c.id === customer.id);
    if (index >= 0) {
      cache.customers[index] = customer;
      StorageService.persistToLocalStorage();
      if (FirebaseService.isReady()) FirebaseService.saveDocument(StorageService.getCollectionPath('customers'), customer.id, customer);
    }
  },

  deleteCustomer: (customerId: string) => {
    const index = cache.customers.findIndex(c => c.id === customerId);
    if (index >= 0) {
      cache.customers.splice(index, 1);
      StorageService.persistToLocalStorage();
      if (FirebaseService.isReady()) FirebaseService.deleteDocument(StorageService.getCollectionPath('customers'), customerId);
    }
  },

  generateInvoiceNumber: (customerId: string, invoiceDate: string): string => {
    const customer = cache.customers.find(c => c.id === customerId);
    if (!customer) return `inv-${Date.now()}`;

    // Get first 3 letters of customer name (lowercase)
    const customerPrefix = customer.name.replace(/[^a-zA-Z]/g, '').substring(0, 3).toLowerCase();

    // Get 3 letter month from invoice date (lowercase)
    const date = new Date(invoiceDate);
    const months = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
    const monthPrefix = months[date.getMonth()];

    // Determine financial year (April to March)
    const fyStartMonth = 3; // April is month 3 (0-indexed)
    let fyStartYear = date.getFullYear();
    if (date.getMonth() < fyStartMonth) {
      fyStartYear -= 1;
    }
    const fyStart = new Date(fyStartYear, fyStartMonth, 1);
    const fyEnd = new Date(fyStartYear + 1, fyStartMonth, 0);

    // Count existing invoices for this customer in current FY
    const customerInvoicesInFY = cache.invoices.filter(inv => {
      if (inv.customerId !== customerId) return false;
      const invDate = new Date(inv.date);
      return invDate >= fyStart && invDate <= fyEnd;
    });

    const sequenceNumber = (customerInvoicesInFY.length + 1).toString().padStart(3, '0');

    return `${customerPrefix}${monthPrefix}${sequenceNumber}`;
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
