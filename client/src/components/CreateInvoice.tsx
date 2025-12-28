
import React, { useState, useEffect } from 'react';
import { Customer, Product, Invoice, InvoiceItem } from '../types';
import { StorageService } from '../services/storageService';
import { Plus, Trash2, Save, X, CreditCard, Banknote, ArrowLeft, AlertCircle, Calculator, Package, UserPlus } from 'lucide-react';
import Autocomplete from './Autocomplete';
import { useCompany } from '@/contexts/CompanyContext';
import { motion, AnimatePresence, useScroll, useMotionValueEvent } from 'framer-motion';
import { HapticService } from '@/services/hapticService';

interface CreateInvoiceProps {
  onSave: (invoice: Invoice, showActions?: boolean) => void;
  onCancel: () => void;
  initialInvoice?: Invoice | null;
  startSmartCalc?: boolean;
  initialCustomerId?: string;
}

const CreateInvoice: React.FC<CreateInvoiceProps> = ({ onSave, onCancel, initialInvoice, startSmartCalc, initialCustomerId }) => {
  const { company } = useCompany();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);

  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [dueDate, setDueDate] = useState('');
  const [items, setItems] = useState<InvoiceItem[]>([]);

  const gstEnabled = company?.gst_enabled ?? true;
  const [paymentMode, setPaymentMode] = useState<'CREDIT' | 'CASH'>('CREDIT');
  const [roundUpTo, setRoundUpTo] = useState<0 | 10 | 100>(company?.roundUpDefault ?? 0);
  const [notes, setNotes] = useState('');

  // Global Discount State
  const [discountType, setDiscountType] = useState<'PERCENTAGE' | 'AMOUNT'>('PERCENTAGE');
  const [discountValue, setDiscountValue] = useState<number>(0);

  // Smart Calculator States
  const [showSmartCalculator, setShowSmartCalculator] = useState(false);
  const [smartCalcInput, setSmartCalcInput] = useState('');
  const [calcError, setCalcError] = useState('');

  // Initialize with Smart Calc if requested
  useEffect(() => {
    if (startSmartCalc && !initialInvoice) {
      setShowSmartCalculator(true);
    }
  }, [startSmartCalc, initialInvoice]);

  // States for Modals
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [showProductModal, setShowProductModal] = useState(false);
  const [newCustomerName, setNewCustomerName] = useState('');
  const [newCustomerPhone, setNewCustomerPhone] = useState('');
  // Product Creation
  const [newProductName, setNewProductName] = useState('');
  const [newProductPrice, setNewProductPrice] = useState('');
  const [newProductHSN, setNewProductHSN] = useState('');
  const [newProductGST, setNewProductGST] = useState('0');
  const [newProductId, setNewProductId] = useState(''); // New State for Manual ID
  const [pendingProductIndex, setPendingProductIndex] = useState<number | null>(null);

  // Preview
  const getInvoiceNumberPreview = () => {
    if (initialInvoice) return initialInvoice.invoiceNumber;
    if (!selectedCustomerId) return '---';
    return StorageService.generateInvoiceNumber(selectedCustomerId, date);
  };

  const [hasChanges, setHasChanges] = useState(false);
  const [showEditWarning, setShowEditWarning] = useState(false);

  // Focus navigation
  const inputRefs = React.useRef<Record<string, HTMLInputElement | null>>({});

  const handleKeyDown = (e: React.KeyboardEvent, index: number, field: string) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const nextMap: Record<string, string> = {
        'productId': `rate-${index}`,
        'rate': `quantity-${index}`,
        'quantity': `next-${index}`
      };

      const nextId = nextMap[field];
      if (nextId === `next-${index}`) {
        if (index === items.length - 1) {
          handleAddItem();
          setTimeout(() => {
            const nextRowProduct = inputRefs.current[`productId-${index + 1}`];
            if (nextRowProduct) nextRowProduct.focus();
          }, 100);
        } else {
          const nextRowProduct = inputRefs.current[`productId-${index + 1}`];
          if (nextRowProduct) nextRowProduct.focus();
        }
      } else {
        const nextInput = inputRefs.current[`${nextId}`];
        if (nextInput) nextInput.focus();
      }
    }
  };

  useEffect(() => {
    setCustomers(StorageService.getCustomers());
    setProducts(StorageService.getProducts());

    if (initialInvoice) {
      setSelectedCustomerId(initialInvoice.customerId);
      setDate(initialInvoice.date);
      setDueDate(initialInvoice.dueDate);
      setItems(initialInvoice.items.map(i => ({ ...i })));
      setPaymentMode(initialInvoice.status === 'PAID' ? 'CASH' : 'CREDIT');
      setNotes(initialInvoice.notes || '');
    } else {
      const d = new Date();
      d.setDate(d.getDate() + 30);
      setDueDate(d.toISOString().split('T')[0]);
      if (items.length === 0) handleAddItem();

      // Pre-select Customer if provided
      if (initialCustomerId) {
        setSelectedCustomerId(initialCustomerId);
      }
    }
  }, [initialInvoice, initialCustomerId]);

  const handleAddItem = () => {
    setItems([...items, { productId: '', description: '', quantity: 1, rate: 0, baseAmount: 0, hsn: '', gstRate: 0, cgstAmount: 0, sgstAmount: 0, igstAmount: 0, totalAmount: 0 }]);
  };

  const calculateTaxes = (item: InvoiceItem, supplier: any, customer: any) => {
    let baseAmount = item.quantity * item.rate;
    // Apply Item Discount if present
    if (item.discountValue && item.discountValue > 0) {
      if (item.discountType === 'AMOUNT') {
        item.discountAmount = item.discountValue;
        baseAmount -= item.discountValue;
      } else {
        const discAmt = (baseAmount * item.discountValue / 100);
        item.discountAmount = discAmt;
        baseAmount -= discAmt;
      }
    } else {
      item.discountAmount = 0;
    }

    // Ensure baseAmount is not negative
    if (baseAmount < 0) baseAmount = 0;

    const gstRate = item.gstRate || 0;
    const taxType = supplier?.state === customer?.state ? 'INTRA_STATE' : 'INTER_STATE';

    if (taxType === 'INTRA_STATE') {
      item.cgstAmount = baseAmount * (gstRate / 2) / 100;
      item.sgstAmount = baseAmount * (gstRate / 2) / 100;
      item.igstAmount = 0;
    } else {
      item.cgstAmount = 0;
      item.sgstAmount = 0;
      item.igstAmount = baseAmount * gstRate / 100;
    }

    item.baseAmount = baseAmount;
    item.totalAmount = baseAmount + (item.cgstAmount || 0) + (item.sgstAmount || 0) + (item.igstAmount || 0);
  };

  // Function to finalize Smart Calc session - AUTO SAVE
  const handleSmartFinish = () => {
    // 1. If items are empty, just close
    if (items.filter(i => i.productId).length === 0) {
      setShowSmartCalculator(false);
      return;
    }

    // 2. Identify Customer (Default to CASH if none)
    let finalCustomerId = selectedCustomerId;
    let finalCustomer = customers.find(c => c.id === finalCustomerId);

    if (!finalCustomerId) {
      let cashCust = customers.find(c => c.name.toUpperCase() === 'CASH');
      if (!cashCust) {
        cashCust = {
          id: crypto.randomUUID(),
          name: 'CASH',
          company: 'CASH SALES',
          phone: '',
          email: '',
          address: '',
          gstin: '',
          balance: 0,
          notifications: []
        };
        StorageService.saveCustomer(cashCust);
        setCustomers(StorageService.getCustomers()); // Update local state immediately
      }
      finalCustomer = cashCust;
      finalCustomerId = cashCust!.id;
    }

    if (!finalCustomer) return; // Should not happen

    // 3. Prepare Invoice Data
    const cleanedItems: InvoiceItem[] = items.filter(i => i.productId).map(item => ({
      ...item,
      quantity: Number(item.quantity) || 1,
      rate: Number(item.rate) || 0,
      baseAmount: Number(item.baseAmount) || 0,
      gstRate: Number(item.gstRate) || 0,
      cgstAmount: Number(item.cgstAmount) || 0,
      sgstAmount: Number(item.sgstAmount) || 0,
      igstAmount: Number(item.igstAmount) || 0,
      totalAmount: Number(item.totalAmount) || 0
    }));

    const status = 'PAID'; // Smart Calc assumes Cash/Paid usually? Or 'CASH' payment mode.
    // User requested "Auto-save invoice". Defaulting to PAID makes sense for fast counter billing.

    // Calculate totals
    const subtotal = cleanedItems.reduce((sum, item) => sum + (item.baseAmount || 0), 0);
    const totalCgst = cleanedItems.reduce((sum, item) => sum + (item.cgstAmount || 0), 0);
    const totalSgst = cleanedItems.reduce((sum, item) => sum + (item.sgstAmount || 0), 0);
    const totalIgst = cleanedItems.reduce((sum, item) => sum + (item.igstAmount || 0), 0);

    const supplier = company as any;
    const taxType = (supplier?.state || 'Delhi') === (finalCustomer.state || '') ? 'INTRA_STATE' : 'INTER_STATE';

    // Calculate Discount
    let globalDiscountAmount = 0;
    if (discountType === 'PERCENTAGE') {
      globalDiscountAmount = (subtotal * discountValue) / 100;
    } else {
      globalDiscountAmount = discountValue;
    }

    const totalBeforeDiscount = subtotal + totalCgst + totalSgst + totalIgst;
    const finalTotal = totalBeforeDiscount - globalDiscountAmount;

    // Rounding
    let roundedTotal = finalTotal;
    let roundUpAmount = 0;
    if (roundUpTo > 0) {
      roundedTotal = Math.ceil(finalTotal / roundUpTo) * roundUpTo;
      roundUpAmount = roundedTotal - finalTotal;
    }

    const invoiceData: Invoice = {
      id: crypto.randomUUID(),
      invoiceNumber: StorageService.generateInvoiceNumber(finalCustomerId!, date),
      customerId: finalCustomerId!,
      customerName: finalCustomer.company || finalCustomer.name,
      customerAddress: finalCustomer.address || '',
      customerState: finalCustomer.state || '',
      customerGstin: finalCustomer.gstin || '',
      supplierGstin: supplier?.gstin || '',
      taxType: taxType,
      date,
      dueDate,
      items: cleanedItems,
      discountType,
      discountValue,
      discountAmount: Math.round(globalDiscountAmount * 100) / 100,
      subtotal: Math.round(subtotal * 100) / 100,
      totalCgst: Math.round(totalCgst * 100) / 100,
      totalSgst: Math.round(totalSgst * 100) / 100,
      totalIgst: Math.round(totalIgst * 100) / 100,
      gstEnabled: gstEnabled && cleanedItems.some(i => (i.gstRate || 0) > 0),
      roundUpTo: roundUpTo,
      roundUpAmount: Math.round(roundUpAmount * 100) / 100,
      total: Math.round(roundedTotal * 100) / 100,
      status: status,
      paymentMode: 'CASH', // Explicitly set payment mode for Smart Calc
      notes: notes
    };

    // 4. Save & Trigger Success Actions
    onSave(invoiceData, true); // true = show post-save actions
    setShowSmartCalculator(false);
  };

  const [activeItemIndex, setActiveItemIndex] = useState<number | null>(null);
  const [showItemModal, setShowItemModal] = useState(false);

  const handleOpenItemModal = (index: number) => {
    setActiveItemIndex(index);
    setShowItemModal(true);
    HapticService.light();
  };

  // State to track if we are editing an existing product (to allow saving same ID)
  const [editingProductId, setEditingProductId] = useState<string | null>(null);

  const handleEditProduct = (productId: string) => {
    const product = products.find(p => p.id === productId);
    if (!product) return;

    setNewProductName(product.name);
    setNewProductPrice(product.price.toString());
    setNewProductHSN(product.hsn || '');
    setNewProductGST(product.gstRate?.toString() || '0');
    setNewProductId(product.id);
    setEditingProductId(product.id);

    // We need to know we are editing, not creating. 
    // Reuse saveNewProduct but we need to handle ID collision if it's an edit vs create.
    // For simplicity, we just open the modal. User can change values and "Save" which overwrites if ID matches.
    // But saveNewProduct currently generates ID if not provided, or uses random UUID.

    setShowProductModal(true);
  };

  const handleAddItemAndOpen = () => {
    const newIndex = items.length;
    handleAddItem();
    setTimeout(() => handleOpenItemModal(newIndex), 0);
  };

  const handleUpdateItem = (index: number, field: keyof InvoiceItem, value: any) => {
    setHasChanges(true);
    const newItems = [...items];
    const item = newItems[index];
    const supplier = company;
    const customer = customers.find(c => c.id === selectedCustomerId);

    if (field === 'productId') {
      const product = products.find(p => p.id === value);
      if (product) {
        item.productId = product.id;
        item.description = product.name;
        item.hsn = product.hsn || '';
        item.gstRate = product.gstRate || 0;

        let rateToUse = product.price;
        if (selectedCustomerId) {
          const lastRate = StorageService.getLastSalePrice(selectedCustomerId, product.id);
          if (lastRate !== null) rateToUse = lastRate;
        }
        item.rate = rateToUse;
        item.baseAmount = item.quantity * item.rate;
        if (gstEnabled) calculateTaxes(item, supplier, customer);
        else item.totalAmount = item.baseAmount;
      }
    } else if (field === 'quantity' || field === 'rate') {
      if (field === 'quantity') item.quantity = Number(value);
      if (field === 'rate') item.rate = Number(value);
      item.baseAmount = item.quantity * item.rate;
      if (gstEnabled) calculateTaxes(item, supplier, customer);
      else item.totalAmount = item.baseAmount;
    } else if (field === 'gstRate') {
      item.gstRate = Number(value);
      if (gstEnabled) calculateTaxes(item, supplier, customer);
    } else if (field === 'hsn') {
      item.hsn = value;
    } else if (field === 'description') {
      item.description = value;
    } else if (field === 'discountType' || field === 'discountValue') {
      if (field === 'discountType') item.discountType = value;
      if (field === 'discountValue') item.discountValue = Number(value);
      if (gstEnabled) calculateTaxes(item, supplier, customer);
      else {
        // Manual recalc for non-GST
        let base = item.quantity * item.rate;
        if (item.discountValue && item.discountValue > 0) {
          if (item.discountType === 'AMOUNT') base -= item.discountValue;
          else base -= (base * item.discountValue / 100);
        }
        item.baseAmount = base > 0 ? base : 0;
        item.totalAmount = item.baseAmount;
      }
    }

    setItems(newItems);
  };

  const handleRemoveItem = (index: number) => {
    setHasChanges(true);
    setItems(items.filter((_, i) => i !== index));
  };


  // Smart Calculator Logic
  const handleSmartCalcInput = (char: string) => {
    HapticService.light();
    setCalcError('');
    if (char === 'C') {
      setSmartCalcInput('');
    } else if (char === '+') {
      if (smartCalcInput) handleSmartAction('ADD');
    } else if (char === '*') {
      // Prevent multiple *
      if (!smartCalcInput.includes('*')) setSmartCalcInput(prev => prev + char);
    } else if (char === 'BILL_DISC') {
      const val = parseFloat(smartCalcInput);
      if (!isNaN(val) && val > 0) {
        // Apply new discount from input
        setDiscountValue(val);
        setDiscountType('PERCENTAGE'); // Default to %
        setSmartCalcInput('');
        HapticService.success();
      } else {
        // No input, toggle existing discount
        if (discountValue > 0) {
          if (discountType === 'PERCENTAGE') {
            setDiscountType('AMOUNT'); // Switch to Flat Amount
            HapticService.light();
          } else {
            setDiscountValue(0); // Turn Off
            HapticService.medium();
          }
        }
      }
    } else if (char === '-') {
      // Primary Action: REMOVE item (if input present)
      if (smartCalcInput && smartCalcInput !== '-') {
        handleSmartAction('REMOVE');
      } else {
        // Start negative number (for removal by ID like -1001 or just valid negative entry)
        setSmartCalcInput(prev => prev + char);
      }
    } else {
      setSmartCalcInput(prev => prev + char);
    }
  };

  const handleSmartAction = (action: 'ADD' | 'REMOVE') => {
    // 1. Analyze Input for Mode (Remove vs Add vs Discount)
    let finalAction = action;
    let inputToParse = smartCalcInput;
    let discountValue = 0;

    // Check for Negative Entry (Remove Mode) - e.g. "-1001"
    if (smartCalcInput.startsWith('-')) {
      finalAction = 'REMOVE';
      inputToParse = smartCalcInput.substring(1); // Remove leading '-'
    } else if (smartCalcInput.includes('-')) {
      // Check for Discount (Add Mode with Discount) - e.g. "1001-50"
      const discParts = smartCalcInput.split('-');
      // Last part is discount?
      if (discParts.length === 2) {
        inputToParse = discParts[0];
        discountValue = Number(discParts[1]) || 0;
      }
    }

    // 2. Parse ID and Quantity
    const parts = inputToParse.split('*');
    let product: Product | undefined;
    let quantityOp = 1;

    if (parts.length === 1) {
      // Just ID
      product = products.find(p => p.id === parts[0]);
    } else if (parts.length === 2) {
      // Try Part 0 as ID
      let p = products.find(prod => prod.id === parts[0]);
      if (p) {
        product = p;
        quantityOp = Number(parts[1]) || 1;
      } else {
        // Try Part 1 as ID
        p = products.find(prod => prod.id === parts[1]);
        if (p) {
          product = p;
          quantityOp = Number(parts[0]) || 1;
        }
      }
    }

    if (!product) {
      setCalcError('Item ID not found');
      HapticService.heavy(); // Error haptic
      return;
    }

    setHasChanges(true);
    const existingItemIndex = items.findIndex(i => i.productId === product!.id); // bang operator safe due to check above

    if (finalAction === 'ADD') {
      if (existingItemIndex > -1) {
        // Increment quantity
        handleUpdateItem(existingItemIndex, 'quantity', items[existingItemIndex].quantity + quantityOp);

        // Update discount if provided (generic overwrite or add? let's overwrite for now or just set if provided)
        if (discountValue > 0) {
          handleUpdateItem(existingItemIndex, 'discountType', 'AMOUNT');
          handleUpdateItem(existingItemIndex, 'discountValue', discountValue);
        }

      } else {
        // Add new item
        const newItem: InvoiceItem = {
          productId: product.id,
          description: product.name,
          quantity: quantityOp,
          rate: product.price,
          baseAmount: 0,
          hsn: product.hsn || '',
          gstRate: product.gstRate || 0,
          cgstAmount: 0,
          sgstAmount: 0,
          igstAmount: 0,
          totalAmount: 0,
          discountType: 'AMOUNT',
          discountValue: discountValue,
          discountAmount: discountValue // Initial calc will fix this but good to set
        };
        // Calculate taxes... reuse logic
        const supplier = company;
        const customer = customers.find(c => c.id === selectedCustomerId);
        let rateToUse = product.price;
        if (selectedCustomerId) {
          const lastRate = StorageService.getLastSalePrice(selectedCustomerId, product.id);
          if (lastRate !== null) rateToUse = lastRate;
        }
        newItem.rate = rateToUse;

        // Manual Discount Calc for Initial
        if (discountValue > 0) {
          newItem.discountAmount = discountValue;
          newItem.baseAmount = (newItem.quantity * newItem.rate) - discountValue;
        } else {
          newItem.baseAmount = newItem.quantity * newItem.rate;
        }

        if (gstEnabled) calculateTaxes(newItem, supplier, customer);
        else newItem.totalAmount = newItem.baseAmount;

        setItems(prev => [...prev.filter(i => i.productId), newItem]);
      }
    } else {
      // REMOVE / DECREASE
      if (existingItemIndex > -1) {
        const currentQty = items[existingItemIndex].quantity;
        const newQty = currentQty - quantityOp;

        if (newQty <= 0) {
          // Remove functionality
          handleRemoveItem(existingItemIndex);
        } else {
          // Decrease functionality
          handleUpdateItem(existingItemIndex, 'quantity', newQty);
        }
      } else {
        setCalcError('Item not in list');
        HapticService.heavy();
        return;
      }
    }

    setSmartCalcInput(''); // Reset for next item
    HapticService.medium(); // Success haptic
  };

  const modalRefs = React.useRef<Record<string, HTMLInputElement | null>>({});

  const handleModalKeyDown = (e: React.KeyboardEvent, field: string) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (field === 'productId') {
        modalRefs.current['quantity']?.focus();
      } else if (field === 'quantity') {
        modalRefs.current['rate']?.focus();
      } else if (field === 'rate') {
        // Save & Add Next
        setShowItemModal(false);
        setTimeout(handleAddItemAndOpen, 300);
      }
    }
  };

  // Calculations
  const calculateSubtotal = () => items.reduce((sum, item) => sum + (item.baseAmount || 0), 0);
  const calculateTotalCGST = () => items.reduce((sum, item) => sum + (item.cgstAmount || 0), 0);
  const calculateTotalSGST = () => items.reduce((sum, item) => sum + (item.sgstAmount || 0), 0);
  const calculateTotalIGST = () => items.reduce((sum, item) => sum + (item.igstAmount || 0), 0);

  const calculateTotal = () => {
    const subtotal = calculateSubtotal();

    // Calculate Discount Amount
    let globalDiscountAmount = 0;
    if (discountType === 'PERCENTAGE') {
      globalDiscountAmount = (subtotal * discountValue) / 100;
    } else {
      globalDiscountAmount = discountValue;
    }

    // Tax is usually calculated on discounted base if discount is pre-tax, OR on subtotal if discount is post-tax.
    // Standard practice: Discount reduces taxable value? OR Discount on final bill?
    // Request says "full bill me dena ho toh", implies Total Bill Discount.

    // Approach A: Discount reduces Taxable Value (Subtotal) -> Re-calculate Tax?
    // Approach B: Discount on Final Total (Post-Tax).

    // Let's implement Discount on Subtotal (Pre-Tax) so taxes are reduced, or Discount on Total (Post-Tax).
    // Usually "Bill Discount" is on the final payable amount or subtotal. 
    // To keep it simple and safe for GST, lets apply it as a reduction to the Total Payable for now, 
    // BUT strictly speaking, for GST invoices, discounts should be line-item or pre-tax. 
    // However, for typical "Bill Book" usage, a flat deduction from total is often expected.

    // Let's assume Post-Tax Discount for "Bill Discount" simplicity unless purely accounting.
    // ACTUALLY: Let's apply it to the Subtotal effectively for calculation?
    // No, let's keep it clean: Subtotal + Tax = Total - Discount.

    const cgst = calculateTotalCGST();
    const sgst = calculateTotalSGST();
    const igst = calculateTotalIGST();

    const totalBeforeDiscount = subtotal + cgst + sgst + igst;
    const finalTotal = totalBeforeDiscount - globalDiscountAmount;

    return finalTotal > 0 ? finalTotal : 0;
  };

  const calculateRoundedTotal = () => {
    const total = calculateTotal();
    if (roundUpTo === 0) return total;
    return Math.ceil(total / roundUpTo) * roundUpTo;
  };

  const getRoundUpAmount = () => {
    if (roundUpTo === 0) return 0;
    return calculateRoundedTotal() - calculateTotal();
  };

  // Creation Handlers
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
    setNewProductId('');
    setEditingProductId(null);
    setPendingProductIndex(index);
    setShowProductModal(true);
  };

  const saveNewProduct = () => {
    const idToCheck = newProductId.trim();
    if (idToCheck) {
      const existingProduct = products.find(p => p.id === idToCheck);
      // If a product with this ID exists, AND we are not currently editing that specific product...
      if (existingProduct && existingProduct.id !== editingProductId) {
        alert("Warning: This Item ID already exists! Please use a unique ID.");
        return;
      }
    }

    const newProduct: Product = {
      id: newProductId.trim() || crypto.randomUUID(),
      name: newProductName,
      price: Number(newProductPrice) || 0,
      stock: 100,
      category: 'General',
      hsn: newProductHSN,
      gstRate: Number(newProductGST) || 0
    };
    StorageService.saveProduct(newProduct);
    setProducts(StorageService.getProducts());

    if (pendingProductIndex !== null) {
      const newItems = [...items];
      const item = newItems[pendingProductIndex];
      item.productId = newProduct.id;
      item.description = newProduct.name;
      item.rate = newProduct.price;
      item.quantity = 1;
      item.gstRate = newProduct.gstRate || 0;
      item.hsn = newProduct.hsn || '';
      calculateTaxes(item, company, customers.find(c => c.id === selectedCustomerId));
      setItems(newItems);
    }
    setShowProductModal(false);
    setNewProductName('');
    setNewProductPrice('');
    setNewProductHSN('');
    setNewProductGST('0');
    setNewProductId('');
    setEditingProductId(null);
    setPendingProductIndex(null);
  };

  const handleSubmit = () => {
    if (initialInvoice && hasChanges && !showEditWarning) {
      setShowEditWarning(true);
      return;
    }

    const customer = customers.find(c => c.id === selectedCustomerId);
    if (!customer) return alert('Select a customer');
    // Filter out items with no product selected (ghost rows)
    const validItems = items.filter(i => i.productId && i.productId.trim() !== '');

    if (validItems.length === 0) return alert('Add at least one item');

    const cleanedItems: InvoiceItem[] = validItems.map(item => ({
      ...item,
      quantity: Number(item.quantity) || 1,
      rate: Number(item.rate) || 0,
      baseAmount: Number(item.baseAmount) || 0,
      gstRate: Number(item.gstRate) || 0,
      cgstAmount: Number(item.cgstAmount) || 0,
      sgstAmount: Number(item.sgstAmount) || 0,
      igstAmount: Number(item.igstAmount) || 0,
      totalAmount: Number(item.totalAmount) || 0
    }));

    const status = paymentMode === 'CASH' ? 'PAID' : 'PENDING';
    const subtotal = calculateSubtotal();
    const totalCgst = calculateTotalCGST();
    const totalSgst = calculateTotalSGST();
    const totalIgst = calculateTotalIGST();
    const supplier = company as any;
    const taxType = (supplier?.state || 'Delhi') === (customer.state || '') ? 'INTRA_STATE' : 'INTER_STATE';

    // Calculate final total with discount
    let globalDiscountAmount = 0;
    if (discountType === 'PERCENTAGE') {
      globalDiscountAmount = (subtotal * discountValue) / 100;
    } else {
      globalDiscountAmount = discountValue;
    }
    const totalBeforeDiscount = subtotal + totalCgst + totalSgst + totalIgst;
    const finalTotal = totalBeforeDiscount - globalDiscountAmount;

    const roundedTotal = calculateRoundedTotal();
    const roundUpAmount = getRoundUpAmount();

    const invoiceData: Invoice = {
      id: initialInvoice ? initialInvoice.id : crypto.randomUUID(),
      invoiceNumber: initialInvoice ? initialInvoice.invoiceNumber : StorageService.generateInvoiceNumber(customer.id, date),
      customerId: customer.id,
      customerName: customer.company || customer.name,
      customerAddress: customer.address || '',
      customerState: customer.state || '',
      customerGstin: customer.gstin || '',
      supplierGstin: supplier?.gstin || '',
      taxType: taxType,
      date,
      dueDate,
      items: cleanedItems,
      discountType,
      discountValue,
      discountAmount: Math.round(globalDiscountAmount * 100) / 100,
      subtotal: Math.round(subtotal * 100) / 100,
      totalCgst: Math.round(totalCgst * 100) / 100,
      totalSgst: Math.round(totalSgst * 100) / 100,
      totalIgst: Math.round(totalIgst * 100) / 100,
      gstEnabled: gstEnabled && cleanedItems.some(i => (i.gstRate || 0) > 0),
      roundUpTo: roundUpTo,
      roundUpAmount: Math.round(roundUpAmount * 100) / 100,
      total: Math.round(finalTotal * 100) / 100,
      status: status,
      notes: notes,
      paymentMode: paymentMode
    };

    onSave(invoiceData);
  };

  const { scrollY } = useScroll();
  const [isScrolled, setIsScrolled] = useState(false);

  useMotionValueEvent(scrollY, "change", (latest: number) => {
    setIsScrolled(latest > 50);
  });

  return (
    <div className="bg-background min-h-screen pb-48 font-sans">
      {/* Edit Warning Modal */}
      {showEditWarning && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
          <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-white dark:bg-slate-800 rounded-[24px] shadow-2xl w-full max-w-sm p-6 text-center">
            <div className="w-16 h-16 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-bold mb-2">Save Changes?</h3>
            <p className="text-slate-500 mb-6">You are editing an existing invoice. This will update the customer balance and records.</p>
            <div className="flex gap-3">
              <button onClick={() => setShowEditWarning(false)} className="flex-1 py-3 font-bold text-slate-500 hover:bg-slate-100 rounded-xl">Cancel</button>
              <button onClick={handleSubmit} className="flex-1 py-3 font-bold bg-blue-600 text-white rounded-xl shadow-lg shadow-blue-200">Yes, Save</button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Top App Bar/Header - Google Activity Style */}
      <motion.div
        className={`sticky top-0 pt-safe z-30 transition-all duration-300 ${isScrolled
          ? 'bg-background/95 backdrop-blur-xl border-b border-border shadow-sm'
          : 'bg-background border-b border-transparent'
          }`}
      >
        <div className="flex items-center justify-between px-4 h-16 max-w-5xl mx-auto">
          <button onClick={onCancel} className="p-2 -ml-2 rounded-full hover:bg-surface-container-highest transition-colors">
            <ArrowLeft className="w-6 h-6 text-foreground" />
          </button>
          <div className="flex-1 ml-4 overflow-hidden">
            <h1 className="text-xl font-bold text-foreground tracking-tight truncate">
              {initialInvoice ? 'Edit Inovice' : 'New Invoice'}
            </h1>
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest leading-none">
              {getInvoiceNumberPreview()}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleSubmit}
              className="bg-google-blue text-white px-6 py-2.5 rounded-full font-bold shadow-lg shadow-google-blue/20 flex items-center gap-2 hover:shadow-google transition-all"
            >
              <Save className="w-5 h-5" />
              <span>Save</span>
            </motion.button>
          </div>
        </div>
      </motion.div>

      <div className="max-w-5xl mx-auto space-y-4 pt-6 px-4">
        {/* Customer Section */}
        <div className="bg-surface-container p-6 md:p-8 rounded-[32px] border border-border shadow-sm">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 rounded-2xl bg-google-blue/10 flex items-center justify-center text-google-blue border border-google-blue/10">
              <UserPlus className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-foreground">Bill To</h2>
              <p className="text-xs text-muted-foreground font-medium">Select or create client</p>
            </div>
          </div>
          <div className="relative group">
            <Autocomplete
              options={customers.map(c => ({ id: c.id, label: c.company, subLabel: c.name }))}
              value={selectedCustomerId}
              onChange={(val) => {
                setSelectedCustomerId(val);
                setHasChanges(true);
              }}
              onCreate={handleCreateCustomer}
              placeholder="Search Customer..."
              type="customer"
            />
          </div>
          {selectedCustomerId && StorageService.predictNextItem(selectedCustomerId) && (
            <div className="mt-3 flex items-center gap-2">
              <span className="text-[10px] font-bold text-slate-400 uppercase">Suggested Product:</span>
              <button
                onClick={() => {
                  const pred = StorageService.predictNextItem(selectedCustomerId);
                  if (pred) handleAddItem(); // Add a new row and update it
                  // Or just update the last empty row
                  const lastIndex = items.findIndex(i => i.productId === '');
                  if (lastIndex !== -1 && pred) handleUpdateItem(lastIndex, 'productId', pred.id);
                  else if (pred) {
                    const newIdx = items.length;
                    handleAddItem();
                    setTimeout(() => handleUpdateItem(newIdx, 'productId', pred.id), 0);
                  }
                  HapticService.light();
                }}
                className="text-xs font-bold text-blue-600 bg-blue-50 dark:bg-blue-900/30 px-2 py-1 rounded-lg border border-blue-100 dark:border-blue-800"
              >
                + {StorageService.predictNextItem(selectedCustomerId)?.name}
              </button>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4 mt-6">
            <div>
              <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest px-2 mb-1 block">Date</label>
              <div className="relative bg-surface-container-high rounded-[20px] overflow-hidden border border-border">
                <input type="date" value={date} onChange={(e) => { setDate(e.target.value); setHasChanges(true); }} className="w-full bg-transparent p-3 text-sm font-bold text-foreground outline-none" />
              </div>
            </div>
            <div>
              <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest px-2 mb-1 block">Due Date</label>
              <div className="relative bg-surface-container-high rounded-[20px] overflow-hidden border border-border">
                <input type="date" value={dueDate} onChange={(e) => { setDueDate(e.target.value); setHasChanges(true); }} className="w-full bg-transparent p-3 text-sm font-bold text-foreground outline-none" />
              </div>
            </div>
          </div>
        </div>

        {/* payment Mode */}
        <div className="bg-surface-container p-1 rounded-full border border-border flex items-center shadow-sm">
          <button
            onClick={() => { setPaymentMode('CREDIT'); setHasChanges(true); }}
            className={`flex-1 py-3 px-6 rounded-full flex items-center justify-center gap-2 transition-all ${paymentMode === 'CREDIT'
              ? 'bg-google-red text-white font-bold shadow-google'
              : 'text-muted-foreground font-bold hover:bg-surface-container-high'
              }`}
          >
            <CreditCard className="w-5 h-5" /> <span>Credit Bill</span>
          </button>
          <button
            onClick={() => { setPaymentMode('CASH'); setHasChanges(true); }}
            className={`flex-1 py-3 px-6 rounded-full flex items-center justify-center gap-2 transition-all ${paymentMode === 'CASH'
              ? 'bg-google-green text-white font-bold shadow-google'
              : 'text-muted-foreground font-bold hover:bg-surface-container-high'
              }`}
          >
            <Banknote className="w-5 h-5" /> <span>Cash Bill</span>
          </button>
        </div>

        <div className="space-y-4 pt-4">
          <div className="flex items-center justify-between px-2">
            <h2 className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest">Added Items</h2>
            <button onClick={handleAddItem} className="text-[11px] font-bold text-google-blue uppercase tracking-widest bg-google-blue/10 px-4 py-2 rounded-full border border-google-blue/10">Add Row</button>
          </div>

          <div className="space-y-3">
            <AnimatePresence mode="popLayout">
              {items.filter(i => i.productId).map((item, idx) => (
                <motion.div
                  key={idx}
                  layout
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  onClick={() => handleOpenItemModal(items.indexOf(item))}
                  className="bg-surface-container p-5 rounded-[32px] border border-border flex gap-4 items-center active:scale-[0.98] transition-all cursor-pointer group hover:bg-surface-container-high hover:shadow-google"
                >
                  <div className="w-14 h-14 rounded-full bg-google-blue/10 flex items-center justify-center text-google-blue shrink-0 group-hover:bg-google-blue group-hover:text-white transition-all transform group-hover:rotate-6 border border-google-blue/10">
                    <Package className="w-7 h-7" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-base font-bold text-foreground truncate tracking-tight">{item.description}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="px-2.5 py-0.5 rounded-full bg-surface-container-highest text-[10px] font-bold text-muted-foreground uppercase tracking-widest border border-border">{item.quantity} Unit</span>
                      <span className="text-[10px] font-bold text-muted-foreground">@</span>
                      <span className="text-[11px] font-bold text-foreground">₹{item.rate}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xl font-bold font-heading text-foreground">₹{(item.totalAmount || 0).toLocaleString('en-IN')}</p>
                    <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest opacity-60">Subtotal</p>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>

          <button
            onClick={handleAddItemAndOpen}
            className="w-full py-6 rounded-[28px] border-2 border-dashed border-blue-200 dark:border-slate-800 bg-blue-50/30 dark:bg-slate-900/40 text-blue-600 dark:text-blue-400 font-black flex items-center justify-center gap-3 hover:bg-blue-50 dark:hover:bg-slate-800 transition-all active:scale-[0.98] group"
          >
            <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center group-hover:scale-110 transition-transform shadow-lg shadow-blue-500/40">
              <Plus className="w-5 h-5" />
            </div>
            <span>Add Item</span>
          </button>
        </div>

      </div>

      {/* Item Zoom Modal */}
      <AnimatePresence>
        {showItemModal && activeItemIndex !== null && (
          <div className="fixed inset-0 z-[100] flex flex-col justify-end">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowItemModal(false)}
              className="absolute inset-0 bg-slate-900/80 backdrop-blur-sm"
            />
            <motion.div
              initial={{ y: "100%", borderRadius: "40px 40px 0 0" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="relative bg-white dark:bg-slate-900 w-full max-h-[90vh] overflow-y-auto p-6 shadow-2xl pb-12"
            >
              <div className="w-12 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full mx-auto mb-8" />

              <div className="space-y-6">
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Item</label>
                  <Autocomplete
                    options={products.map(p => ({ id: p.id, label: p.name }))}
                    value={items[activeItemIndex].productId}
                    onChange={(val) => handleUpdateItem(activeItemIndex, 'productId', val)}
                    onCreate={(query) => handleCreateProduct(query, activeItemIndex)}
                    placeholder="Search or Create Product..."
                    type="product"
                    autoFocus
                    onKeyDown={(e) => handleModalKeyDown(e, 'productId')}
                    inputRef={(el) => { modalRefs.current['productId'] = el; }}
                  />
                  {items[activeItemIndex].productId && (
                    <div className="flex justify-end mt-1">
                      <button
                        onClick={() => handleEditProduct(items[activeItemIndex].productId)}
                        className="text-[10px] font-bold text-blue-600 bg-blue-50 dark:bg-blue-900/30 px-2 py-1 rounded-lg flex items-center gap-1"
                      >
                        Edit Product Details
                      </button>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-slate-50 dark:bg-slate-950 p-4 rounded-2xl border-2 border-slate-100 dark:border-slate-800">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Qty</label>
                    <input
                      type="number"
                      className="w-full bg-transparent text-2xl font-black text-blue-600 outline-none"
                      value={items[activeItemIndex].quantity || ''}
                      onChange={(e) => handleUpdateItem(activeItemIndex, 'quantity', e.target.value)}
                      placeholder="1"
                      onKeyDown={(e) => handleModalKeyDown(e, 'quantity')}
                      ref={(el) => { modalRefs.current['quantity'] = el; }}
                    />
                  </div>
                  <div className="bg-slate-50 dark:bg-slate-950 p-4 rounded-2xl border-2 border-slate-100 dark:border-slate-800">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Rate</label>
                    <input
                      type="number"
                      className="w-full bg-transparent text-2xl font-black text-slate-900 dark:text-slate-100 outline-none"
                      value={items[activeItemIndex].rate || ''}
                      onChange={(e) => handleUpdateItem(activeItemIndex, 'rate', e.target.value)}
                      placeholder="0.00"
                      onKeyDown={(e) => handleModalKeyDown(e, 'rate')}
                      ref={(el) => { modalRefs.current['rate'] = el; }}
                    />
                  </div>
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    onClick={() => {
                      setShowItemModal(false);
                      setTimeout(handleAddItemAndOpen, 300);
                    }}
                    className="flex-1 bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 py-5 rounded-[24px] font-black text-xs uppercase tracking-wider active:scale-95 transition-all border border-slate-200 dark:border-slate-700"
                  >
                    Save & Add Next
                  </button>
                  <button
                    onClick={() => setShowItemModal(false)}
                    className="flex-1 bg-blue-600 text-white py-5 rounded-[24px] font-black text-xs uppercase tracking-wider shadow-lg shadow-blue-500/20 active:scale-95 transition-all"
                  >
                    Save & Done
                  </button>
                  <button
                    onClick={() => {
                      handleRemoveItem(activeItemIndex);
                      setShowItemModal(false);
                    }}
                    className="w-16 bg-red-50 dark:bg-red-900/20 text-red-600 flex items-center justify-center rounded-[24px] active:scale-95 transition-all"
                  >
                    <Trash2 className="w-6 h-6" />
                  </button>
                </div>

                <div className="bg-gradient-to-br from-blue-600 to-blue-700 p-8 rounded-[40px] text-white flex justify-between items-center shadow-2xl shadow-blue-500/40 relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 blur-2xl" />
                  <div className="relative z-10">
                    <p className="text-[11px] font-black uppercase opacity-70 tracking-widest mb-1">Item Total Amount</p>
                    <p className="text-5xl font-black tracking-tighter drop-shadow-lg">₹{(items[activeItemIndex].totalAmount || 0).toFixed(2).toLocaleString()}</p>
                  </div>
                  <div className="text-right relative z-10">
                    <div className="bg-white/20 backdrop-blur-md px-3 py-1.5 rounded-xl border border-white/20">
                      <p className="text-[10px] font-black uppercase tracking-tight">Tax Included</p>
                      <p className="text-sm font-black">GST {items[activeItemIndex].gstRate}%</p>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Notes Section */}
      <div className="max-w-5xl mx-auto px-4 pb-4 mt-6">
        <div className="bg-white dark:bg-slate-800 p-6 rounded-[24px] shadow-sm border border-slate-100 dark:border-slate-700">
          <h2 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-2">Additional Notes</h2>
          <textarea
            className="w-full bg-slate-50 dark:bg-slate-900 border-none rounded-xl p-4 text-sm font-medium focus:ring-2 focus:ring-blue-500 outline-none resize-none"
            rows={3}
            value={notes}
            onChange={(e) => { setNotes(e.target.value); setHasChanges(true); }}
            placeholder="Terms & Conditions, Payment Instructions, etc."
          />
        </div>
      </div>

      {/* Floating Save Bar - Animated on Scroll */}
      <motion.div
        initial={{ y: 0 }}
        animate={{
          y: isScrolled ? 0 : 0,
          scale: isScrolled ? 0.98 : 1,
          opacity: 1
        }}
        className="fixed bottom-0 left-0 right-0 bg-white/80 dark:bg-slate-900/90 backdrop-blur-md border-t border-slate-200 dark:border-slate-700 p-4 pb-6 md:pb-4 z-30 shadow-[0_-5px_30px_rgba(0,0,0,0.1)]"
      >
        <div className="max-w-5xl mx-auto flex justify-between items-center px-4">
          <div className="flex flex-col">
            <span className="text-[10px] text-slate-400 font-black uppercase tracking-widest">Total Payable</span>
            <span className="text-3xl font-black text-blue-600 tracking-tighter">
              ₹{calculateRoundedTotal().toLocaleString('en-IN')}
            </span>
          </div>
          <div className="text-xs font-bold text-slate-400">
            {items.length} Items Added
          </div>
        </div>
      </motion.div>



      {/* Smart Calculator Modal */}
      {showSmartCalculator && (
        <div className="fixed inset-0 bg-white dark:bg-slate-900 z-[60] flex flex-col pt-safe">
          {/* Header */}
          <div className="p-4 flex items-center justify-between border-b border-slate-100 dark:border-slate-800">
            <h2 className="text-lg font-black flex items-center gap-2">
              <Calculator className="w-5 h-5 text-emerald-500" />
              Smart Billing
            </h2>
            <button onClick={() => setShowSmartCalculator(false)} className="bg-slate-100 dark:bg-slate-800 p-2 rounded-full hover:bg-slate-200">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* List of Added Items (Preview) */}
          <div className="flex-1 overflow-y-auto p-4 space-y-2 bg-slate-50 dark:bg-slate-950">
            {items.filter(i => i.productId).length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-slate-400 opacity-50">
                <Calculator className="w-16 h-16 mb-2" />
                <p className="font-bold">Enter Item ID & Press '+'</p>
              </div>
            ) : (
              items.filter(i => i.productId).slice().reverse().map((item, idx) => (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  key={idx}
                  className="bg-white dark:bg-slate-900 p-3 rounded-xl shadow-sm flex justify-between items-center border border-slate-100 dark:border-slate-800"
                  onContextMenu={(e) => {
                    e.preventDefault();
                    // Long press logic simulation
                    if (window.confirm(`Remove ${item.description}?`)) {
                      handleRemoveItem(items.indexOf(item));
                    }
                  }}
                >
                  <div>
                    <p className="font-bold text-sm text-slate-800 dark:text-slate-200 truncate max-w-[150px]">{item.description}</p>
                    <p className="text-xs text-slate-400">ID: {item.productId} | ₹{item.rate}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <p className="font-black text-blue-600">x{item.quantity}</p>
                    </div>
                  </div>
                </motion.div>
              ))
            )}
          </div>

          {/* Calculator Interface */}
          <div className="bg-white dark:bg-slate-900 p-4 pb-8 shadow-[0_-5px_30px_rgba(0,0,0,0.1)] rounded-t-[32px]">
            {/* Display */}
            <div className="bg-slate-100 dark:bg-slate-800 rounded-2xl p-4 mb-4 flex flex-col items-end justify-center min-h-[80px]">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">{calcError || 'ITEM ID'}</span>
              <span className={`text-4xl font-mono font-black tracking-widest ${calcError ? 'text-red-500' : 'text-slate-800 dark:text-slate-100'}`}>
                {smartCalcInput || '0'}
              </span>
            </div>

            {/* Keypad */}
            <div className="grid grid-cols-4 gap-3">
              {/* Row 1: 7, 8, 9, CLR */}
              {[7, 8, 9].map(n => (
                <button key={n} onClick={() => handleSmartCalcInput(n.toString())} className="h-16 rounded-2xl bg-slate-50 dark:bg-slate-800 text-2xl font-bold hover:bg-slate-100 active:scale-95 transition-all shadow-sm border border-slate-200 dark:border-slate-700">{n}</button>
              ))}
              <button onClick={() => handleSmartCalcInput('C')} className="h-16 rounded-2xl bg-red-50 text-red-600 text-xl font-black hover:bg-red-100 active:scale-95 transition-all">CLR</button>

              {/* Row 2: 4, 5, 6, QTY(*) */}
              {[4, 5, 6].map(n => (
                <button key={n} onClick={() => handleSmartCalcInput(n.toString())} className="h-16 rounded-2xl bg-slate-50 dark:bg-slate-800 text-2xl font-bold hover:bg-slate-100 active:scale-95 transition-all shadow-sm border border-slate-200 dark:border-slate-700">{n}</button>
              ))}
              <button onClick={() => handleSmartCalcInput('*')} className="h-16 rounded-2xl bg-indigo-50 text-indigo-600 text-xl font-black hover:bg-indigo-100 active:scale-95 transition-all flex flex-col items-center justify-center leading-none">
                <span>×</span>
                <span className="text-[9px] uppercase tracking-widest">QTY</span>
              </button>

              {/* Row 3: 1, 2, 3, ADD(+) */}
              {[1, 2, 3].map(n => (
                <button key={n} onClick={() => handleSmartCalcInput(n.toString())} className="h-16 rounded-2xl bg-slate-50 dark:bg-slate-800 text-2xl font-bold hover:bg-slate-100 active:scale-95 transition-all shadow-sm border border-slate-200 dark:border-slate-700">{n}</button>
              ))}
              <button onClick={() => handleSmartCalcInput('+')} className="row-span-2 h-full rounded-2xl bg-blue-600 text-white text-3xl font-black hover:bg-blue-700 active:scale-95 transition-all shadow-lg shadow-blue-500/30">+</button>

              {/* Row 4: 0, ., REMOVE(-) */}
              <button onClick={() => handleSmartCalcInput('0')} className="h-16 rounded-2xl bg-slate-50 dark:bg-slate-800 text-2xl font-bold hover:bg-slate-100 active:scale-95 transition-all shadow-sm border border-slate-200 dark:border-slate-700">0</button>
              <button onClick={() => handleSmartCalcInput('BILL_DISC')} className={`h-16 rounded-2xl font-bold active:scale-95 transition-all flex flex-col items-center justify-center leading-none shadow-sm border ${discountValue > 0 ? 'bg-purple-600 text-white border-purple-600 shadow-purple-500/30' : 'bg-purple-50 text-purple-600 border-purple-100 hover:bg-purple-100'}`}>
                <span className="text-xl">{discountValue > 0 ? (discountType === 'PERCENTAGE' ? '%' : '₹') : '%'}</span>
                <span className="text-[9px] uppercase tracking-widest">{discountValue > 0 ? `${discountValue} ${discountType === 'PERCENTAGE' ? 'OFF' : ''}` : 'DISC'}</span>
              </button>
              <button onClick={() => handleSmartCalcInput('-')} className="h-16 rounded-2xl bg-orange-50 text-orange-600 font-bold active:scale-95 transition-all flex flex-col items-center justify-center hover:bg-orange-100 leading-none shadow-sm border border-orange-100">
                <span className="text-xl material-symbols-outlined">delete</span>
                <span className="text-[9px] uppercase tracking-widest">REM</span>
              </button>
            </div>

            <button onClick={handleSmartFinish} className="w-full mt-3 py-4 rounded-2xl bg-slate-100 text-slate-500 font-bold active:scale-95 transition-all flex items-center justify-center hover:bg-slate-200">
              <span className="text-xs font-black uppercase text-blue-600">Save & Close</span>
            </button>
          </div>


        </div>
      )}

      {/* Customer Modal */}
      {showCustomerModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-white dark:bg-slate-800 rounded-[24px] shadow-2xl w-full max-w-md overflow-hidden">
            <div className="p-6 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center">
              <h3 className="text-lg font-bold">New Customer</h3>
              <button onClick={() => setShowCustomerModal(false)} className="bg-slate-100 p-2 rounded-full"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-6 space-y-4">
              <input type="text" autoFocus placeholder="Customer Name" className="w-full p-4 bg-slate-50 rounded-xl font-bold outline-none focus:ring-2 focus:ring-blue-500" value={newCustomerName} onChange={(e) => setNewCustomerName(e.target.value)} />
              <input type="text" placeholder="Phone Number" className="w-full p-4 bg-slate-50 rounded-xl font-medium outline-none focus:ring-2 focus:ring-blue-500" value={newCustomerPhone} onChange={(e) => setNewCustomerPhone(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && saveNewCustomer()} />
              <button onClick={saveNewCustomer} className="w-full bg-blue-600 text-white py-4 rounded-xl font-bold mt-4">Save Customer</button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Product Modal */}
      {showProductModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[110] p-4">
          <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-white dark:bg-slate-800 rounded-[24px] shadow-2xl w-full max-w-md overflow-hidden">
            <div className="p-6 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">New Product</h3>
              <button onClick={() => setShowProductModal(false)} className="bg-slate-100 dark:bg-slate-700 p-2 rounded-full dark:text-white"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-6 space-y-4">
              <input type="text" autoFocus placeholder="Product Name" className="w-full p-4 bg-slate-50 dark:bg-slate-900 dark:text-white rounded-xl font-bold outline-none focus:ring-2 focus:ring-blue-500" value={newProductName} onChange={(e) => setNewProductName(e.target.value)} />
              <input type="text" placeholder="Item ID (Optional, for Calculator)" className="w-full p-4 bg-slate-50 dark:bg-slate-900 dark:text-white rounded-xl font-medium outline-none focus:ring-2 focus:ring-blue-500 uppercase tracking-widest" value={newProductId} onChange={(e) => setNewProductId(e.target.value)} />
              <input type="number" placeholder="Price / Rate" className="w-full p-4 bg-slate-50 dark:bg-slate-900 dark:text-white rounded-xl font-medium outline-none focus:ring-2 focus:ring-blue-500" value={newProductPrice} onChange={(e) => setNewProductPrice(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && (!gstEnabled && saveNewProduct())} />
              {gstEnabled && (
                <div className="flex gap-4">
                  <input type="text" placeholder="HSN" className="flex-1 p-4 bg-slate-50 dark:bg-slate-900 dark:text-white rounded-xl outline-none" value={newProductHSN} onChange={(e) => setNewProductHSN(e.target.value)} />
                  <input type="number" placeholder="GST %" className="w-24 p-4 bg-slate-50 dark:bg-slate-900 dark:text-white rounded-xl outline-none" value={newProductGST} onChange={(e) => setNewProductGST(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && saveNewProduct()} />
                </div>
              )}
              <button onClick={saveNewProduct} className="w-full bg-blue-600 text-white py-4 rounded-xl font-bold mt-4">Save Product</button>
            </div>
          </motion.div>
        </div>
      )}
      {/* Sticky Bottom Summary Bar - Google Premium Style */}
      <div className="fixed bottom-0 left-0 right-0 bg-surface-container/80 backdrop-blur-xl border-t border-border z-40 pb-safe">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest leading-none mb-1">Total Payable</p>
            <p className="text-3xl font-bold font-heading text-foreground">
              ₹{calculateRoundedTotal().toLocaleString('en-IN')}
            </p>
            {/* Discount Input for Full Bill */}
            <div className="flex items-center gap-2 mt-2">
              <select
                value={discountType}
                onChange={(e) => setDiscountType(e.target.value as 'PERCENTAGE' | 'AMOUNT')}
                className="bg-slate-100 dark:bg-slate-800 text-[10px] font-bold p-1 rounded"
              >
                <option value="PERCENTAGE">%</option>
                <option value="AMOUNT">₹</option>
              </select>
              <input
                type="number"
                value={discountValue}
                onChange={(e) => setDiscountValue(Number(e.target.value))}
                placeholder="Disc."
                className="w-16 bg-slate-100 dark:bg-slate-800 text-xs font-bold p-1 rounded border border-transparent focus:border-google-blue outline-none"
              />
            </div>
          </div>
          <div className="text-right">
            <div className="flex items-center gap-2 mb-1 justify-end">
              <span className="w-2 h-2 rounded-full bg-google-green" />
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{items.filter(i => i.productId).length} Items Added</span>
            </div>
            <p className="text-[11px] font-bold text-google-blue">
              {roundUpTo > 0 ? 'Rounded Off' : 'Exact Amount'}
            </p>
          </div>
        </div>
      </div>
    </div >
  );
};


export default CreateInvoice;
