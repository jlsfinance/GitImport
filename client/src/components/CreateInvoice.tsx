
import React, { useState, useEffect } from 'react';
import { Customer, Product, Invoice, InvoiceItem } from '../types';
import { StorageService } from '../services/storageService';
import { Plus, Trash2, Save, X, CreditCard, Banknote } from 'lucide-react';
import Autocomplete from './Autocomplete';

interface CreateInvoiceProps {
  onSave: (invoice: Invoice) => void;
  onCancel: () => void;
  initialInvoice?: Invoice | null;
}

const CreateInvoice: React.FC<CreateInvoiceProps> = ({ onSave, onCancel, initialInvoice }) => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [dueDate, setDueDate] = useState('');
  const [items, setItems] = useState<InvoiceItem[]>([]);
  
  // New State for Payment Mode
  const [paymentMode, setPaymentMode] = useState<'CREDIT' | 'CASH'>('CREDIT');

  // Inline Creation States
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [showProductModal, setShowProductModal] = useState(false);
  const [newCustomerName, setNewCustomerName] = useState('');
  const [newCustomerPhone, setNewCustomerPhone] = useState('');
  const [newProductName, setNewProductName] = useState('');
  const [newProductPrice, setNewProductPrice] = useState('');
  const [pendingProductIndex, setPendingProductIndex] = useState<number | null>(null); 

  useEffect(() => {
    setCustomers(StorageService.getCustomers());
    setProducts(StorageService.getProducts());
    
    if (initialInvoice) {
      setSelectedCustomerId(initialInvoice.customerId);
      setDate(initialInvoice.date);
      setDueDate(initialInvoice.dueDate);
      // Clone items to avoid mutating prop directly during edits
      setItems(initialInvoice.items.map(i => ({...i})));
      
      // Set payment mode based on status
      setPaymentMode(initialInvoice.status === 'PAID' ? 'CASH' : 'CREDIT');
    } else {
      // Set default due date to 30 days from now
      const d = new Date();
      d.setDate(d.getDate() + 30);
      setDueDate(d.toISOString().split('T')[0]);
    }
  }, [initialInvoice]);

  const handleAddItem = () => {
    setItems([...items, { productId: '', description: '', quantity: 1, rate: 0, amount: 0 }]);
  };

  const handleUpdateItem = (index: number, field: keyof InvoiceItem, value: any) => {
    const newItems = [...items];
    const item = newItems[index];

    if (field === 'productId') {
      const product = products.find(p => p.id === value);
      if (product) {
        item.productId = product.id;
        item.description = product.name;
        
        // SMART RATE LOGIC
        let rateToUse = product.price;
        if (selectedCustomerId) {
             const lastRate = StorageService.getLastSalePrice(selectedCustomerId, product.id);
             if (lastRate !== null) {
                 rateToUse = lastRate;
             }
        }

        item.rate = rateToUse;
        item.amount = item.quantity * rateToUse;
      }
    } else if (field === 'quantity' || field === 'rate') {
      // @ts-ignore
      item[field] = Number(value);
      item.amount = item.quantity * item.rate;
    } else {
      // @ts-ignore
      item[field] = value;
    }

    setItems(newItems);
  };

  const handleRemoveItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const calculateTotal = () => items.reduce((sum, item) => sum + item.amount, 0);

  // --- Inline Creation Handlers ---
  const handleCreateCustomer = (nameQuery: string) => {
      setNewCustomerName(nameQuery);
      setNewCustomerPhone('');
      setShowCustomerModal(true);
  };

  const saveNewCustomer = () => {
      const newCustomer: Customer = {
          id: crypto.randomUUID(),
          name: newCustomerName,
          company: newCustomerName,
          email: '',
          phone: newCustomerPhone,
          address: '',
          balance: 0,
          notifications: []
      };
      StorageService.saveCustomer(newCustomer);
      setCustomers(StorageService.getCustomers());
      setSelectedCustomerId(newCustomer.id);
      setShowCustomerModal(false);
  };

  const handleCreateProduct = (nameQuery: string, index: number) => {
      setNewProductName(nameQuery);
      setNewProductPrice('');
      setPendingProductIndex(index);
      setShowProductModal(true);
  };

  const saveNewProduct = () => {
      const newProduct: Product = {
          id: crypto.randomUUID(),
          name: newProductName,
          price: Number(newProductPrice) || 0,
          stock: 100,
          category: 'General'
      };
      StorageService.saveProduct(newProduct);
      const updatedProducts = StorageService.getProducts();
      setProducts(updatedProducts);
      
      if (pendingProductIndex !== null) {
          const newItems = [...items];
          const item = newItems[pendingProductIndex];
          item.productId = newProduct.id;
          item.description = newProduct.name;
          item.rate = newProduct.price;
          item.quantity = item.quantity || 1; 
          item.amount = item.quantity * item.rate;
          setItems(newItems);
      }
      setShowProductModal(false);
      setPendingProductIndex(null);
  };

  // --- Submission ---

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const customer = customers.find(c => c.id === selectedCustomerId);
    if (!customer) return alert('Select a customer');
    if (items.length === 0) return alert('Add at least one item');

    const total = calculateTotal();
    
    // Determine Status based on Payment Mode
    // Credit -> PENDING (Outstanding)
    // Cash -> PAID (Settled)
    const status = paymentMode === 'CASH' ? 'PAID' : 'PENDING';

    const invoiceData: Invoice = {
      id: initialInvoice ? initialInvoice.id : crypto.randomUUID(),
      invoiceNumber: initialInvoice ? initialInvoice.invoiceNumber : `INV-2025-${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`,
      customerId: customer.id,
      customerName: customer.company || customer.name,
      customerAddress: customer.address,
      date,
      dueDate,
      items,
      subtotal: total,
      tax: 0,
      total: total,
      status: status
    };

    onSave(invoiceData);
  };

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto relative">
      <h2 className="text-xl md:text-2xl font-bold mb-4 md:mb-6 text-slate-800">
        {initialInvoice ? 'Edit Invoice' : 'Create New Invoice'}
      </h2>
      
      <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-md p-4 md:p-6 min-h-[400px]">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            {/* Left Column: Customer */}
            <div className="relative z-20">
                <label className="block text-sm font-medium text-slate-700 mb-1">Customer</label>
                <Autocomplete
                    options={customers.map(c => ({ id: c.id, label: c.company, subLabel: c.name }))}
                    value={selectedCustomerId}
                    onChange={setSelectedCustomerId}
                    onCreate={handleCreateCustomer}
                    placeholder="Type to search or create..."
                />
            </div>

            {/* Right Column: Dates & Payment Mode */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                 <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Date</label>
                    <input
                        type="date"
                        required
                        className="w-full rounded-md border border-slate-300 p-2 focus:ring-2 focus:ring-blue-500 text-sm"
                        value={date}
                        onChange={(e) => setDate(e.target.value)}
                    />
                 </div>
                 <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Due Date</label>
                    <input
                        type="date"
                        required
                        className="w-full rounded-md border border-slate-300 p-2 focus:ring-2 focus:ring-blue-500 text-sm"
                        value={dueDate}
                        onChange={(e) => setDueDate(e.target.value)}
                    />
                 </div>
                 
                 {/* Payment Mode Toggle */}
                 <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-slate-700 mb-2">Payment Mode</label>
                    <div className="flex gap-4">
                        <label className={`flex-1 flex items-center justify-center gap-2 p-3 rounded-lg border cursor-pointer transition-all ${paymentMode === 'CREDIT' ? 'bg-red-50 border-red-200 text-red-700 ring-1 ring-red-200' : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'}`}>
                            <input 
                                type="radio" 
                                name="paymentMode" 
                                value="CREDIT"
                                checked={paymentMode === 'CREDIT'}
                                onChange={() => setPaymentMode('CREDIT')}
                                className="sr-only"
                            />
                            <CreditCard className="w-5 h-5" />
                            <span className="font-bold">Credit (Udhaar)</span>
                        </label>

                        <label className={`flex-1 flex items-center justify-center gap-2 p-3 rounded-lg border cursor-pointer transition-all ${paymentMode === 'CASH' ? 'bg-green-50 border-green-200 text-green-700 ring-1 ring-green-200' : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'}`}>
                            <input 
                                type="radio" 
                                name="paymentMode" 
                                value="CASH"
                                checked={paymentMode === 'CASH'}
                                onChange={() => setPaymentMode('CASH')}
                                className="sr-only"
                            />
                            <Banknote className="w-5 h-5" />
                            <span className="font-bold">Cash / Paid</span>
                        </label>
                    </div>
                    <p className="text-xs text-slate-500 mt-1">
                        {paymentMode === 'CREDIT' ? 'Invoice will be marked as Pending and added to customer ledger.' : 'Invoice will be marked as Paid and will NOT increase customer balance.'}
                    </p>
                 </div>
            </div>
        </div>

        {/* Items Table */}
        <div className="mb-6">
          <div className="overflow-x-visible">
            <table className="w-full min-w-[600px]">
              <thead>
                <tr className="bg-slate-50 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  <th className="px-4 py-3 w-1/3">Product</th>
                  <th className="px-4 py-3 w-24">Qty</th>
                  <th className="px-4 py-3 w-32">Rate</th>
                  <th className="px-4 py-3 w-32">Amount</th>
                  <th className="px-4 py-3 w-16"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {items.map((item, idx) => (
                  <tr key={idx} className="relative">
                    <td className="px-4 py-2 align-top relative z-10">
                      <Autocomplete
                        options={products.map(p => ({ id: p.id, label: p.name, subLabel: `₹${p.price}` }))}
                        value={item.productId}
                        onChange={(val) => handleUpdateItem(idx, 'productId', val)}
                        onCreate={(query) => handleCreateProduct(query, idx)}
                        placeholder="Search Item..."
                      />
                      {item.productId && (
                           <input 
                              type="text" 
                              value={item.description}
                              onChange={(e) => handleUpdateItem(idx, 'description', e.target.value)}
                              className="w-full mt-1 p-1 border-0 border-b border-gray-200 rounded-none text-xs text-gray-600 focus:ring-0 focus:border-blue-500 bg-transparent"
                              placeholder="Description"
                           />
                      )}
                    </td>
                    <td className="px-4 py-2 align-top">
                      <input
                        type="number"
                        min="1"
                        className="w-full p-2 border rounded text-right focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                        value={item.quantity}
                        onChange={(e) => handleUpdateItem(idx, 'quantity', e.target.value)}
                      />
                    </td>
                    <td className="px-4 py-2 align-top">
                      <input
                        type="number"
                        className="w-full p-2 border rounded text-right focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                        value={item.rate}
                        onChange={(e) => handleUpdateItem(idx, 'rate', e.target.value)}
                      />
                    </td>
                    <td className="px-4 py-2 text-right font-medium text-slate-700 align-top pt-3">
                      ₹{item.amount.toFixed(2)}
                    </td>
                    <td className="px-4 py-2 text-center align-top pt-3">
                      <button
                        type="button"
                        onClick={() => handleRemoveItem(idx)}
                        className="text-red-500 hover:text-red-700"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <button
          type="button"
          onClick={handleAddItem}
          className="flex items-center gap-2 text-sm text-blue-600 font-medium hover:text-blue-700 mb-8"
        >
          <Plus className="w-4 h-4" /> Add Item
        </button>

        <div className="flex justify-end border-t pt-4">
           <div className="text-right">
               <span className="text-gray-500 mr-4">Total Amount:</span>
               <span className="text-2xl font-bold text-slate-900">₹{calculateTotal().toFixed(2)}</span>
           </div>
        </div>

        <div className="flex justify-end gap-3 mt-8">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-md font-medium"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 font-medium shadow-sm"
          >
            <Save className="w-4 h-4" /> {initialInvoice ? 'Update Invoice' : 'Save Invoice'}
          </button>
        </div>
      </form>

      {/* New Customer Modal */}
      {showCustomerModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
                  <div className="flex justify-between items-center mb-4">
                      <h3 className="text-lg font-bold">Create New Customer</h3>
                      <button onClick={() => setShowCustomerModal(false)}><X className="w-5 h-5 text-gray-500" /></button>
                  </div>
                  <div className="space-y-4">
                      <div>
                          <label className="block text-sm font-medium text-gray-700">Customer / Company Name</label>
                          <input 
                             type="text" 
                             className="w-full border p-2 rounded" 
                             value={newCustomerName} 
                             onChange={(e) => setNewCustomerName(e.target.value)} 
                          />
                      </div>
                      <div>
                          <label className="block text-sm font-medium text-gray-700">Phone Number</label>
                          <input 
                             type="text" 
                             className="w-full border p-2 rounded" 
                             value={newCustomerPhone} 
                             onChange={(e) => setNewCustomerPhone(e.target.value)} 
                             placeholder="Optional"
                          />
                      </div>
                      <button onClick={saveNewCustomer} className="w-full bg-blue-600 text-white py-2 rounded font-medium">Save & Select</button>
                  </div>
              </div>
          </div>
      )}

      {/* New Product Modal */}
      {showProductModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
                  <div className="flex justify-between items-center mb-4">
                      <h3 className="text-lg font-bold">Create New Product</h3>
                      <button onClick={() => setShowProductModal(false)}><X className="w-5 h-5 text-gray-500" /></button>
                  </div>
                  <div className="space-y-4">
                      <div>
                          <label className="block text-sm font-medium text-gray-700">Product Name</label>
                          <input 
                             type="text" 
                             className="w-full border p-2 rounded" 
                             value={newProductName} 
                             onChange={(e) => setNewProductName(e.target.value)} 
                          />
                      </div>
                      <div>
                          <label className="block text-sm font-medium text-gray-700">Rate / Price</label>
                          <input 
                             type="number" 
                             className="w-full border p-2 rounded" 
                             value={newProductPrice} 
                             onChange={(e) => setNewProductPrice(e.target.value)} 
                          />
                      </div>
                      <button onClick={saveNewProduct} className="w-full bg-blue-600 text-white py-2 rounded font-medium">Save & Select</button>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};

export default CreateInvoice;
