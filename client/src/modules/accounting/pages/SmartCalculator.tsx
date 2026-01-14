import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Check, Download, Share2, User, Calculator, X, Package } from 'lucide-react';
import { StorageService } from '../../../services/storageService';
import { Invoice, InvoiceItem, Customer, Product } from '@/types';
import { InvoicePdfService } from '../../../services/invoicePdfService';
import { HapticService } from '@/services/hapticService';
import { useCompany } from '@/contexts/CompanyContext';

// --- Types ---
interface SmartCalculatorProps {
    onBack: () => void;
    onSaveSuccess: (invoice: Invoice) => void;
}

// --- Component ---
const SmartCalculator: React.FC<SmartCalculatorProps> = ({ onBack, onSaveSuccess }) => {
    const { company } = useCompany();
    const gstEnabled = company?.gst_enabled ?? true;

    // Data State
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [products, setProducts] = useState<Product[]>([]);
    const [items, setItems] = useState<InvoiceItem[]>([]);

    // Calculator State
    const [smartCalcInput, setSmartCalcInput] = useState('');
    const [calcError, setCalcError] = useState('');

    // Global Discount State
    const [discountType, setDiscountType] = useState<'PERCENTAGE' | 'AMOUNT'>('PERCENTAGE');
    const [discountValue, setDiscountValue] = useState<number>(0);

    // Round Up State
    const [roundUpTo, setRoundUpTo] = useState<0 | 10 | 100>(company?.roundUpDefault ?? 0);

    // Modal State
    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [showPartyModal, setShowPartyModal] = useState(false);
    const [showSuccessModal, setShowSuccessModal] = useState(false);

    // Invoice Creation State
    const [isPaid, setIsPaid] = useState(true);
    const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
    const [createdInvoice, setCreatedInvoice] = useState<Invoice | null>(null);
    const [customersSearch, setCustomersSearch] = useState('');

    useEffect(() => {
        setCustomers(StorageService.getCustomers());
        setProducts(StorageService.getProducts());
    }, []);

    // --- Tax Calculation ---
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

    // --- Smart Calculator Input Handler ---
    const handleSmartCalcInput = (char: string) => {
        HapticService.light();
        setCalcError('');
        if (char === 'C') {
            setSmartCalcInput('');
        } else if (char === '+') {
            if (smartCalcInput) handleSmartAction('ADD');
        } else if (char === '*') {
            if (!smartCalcInput.includes('*')) setSmartCalcInput(prev => prev + char);
        } else if (char === 'BILL_DISC') {
            const val = parseFloat(smartCalcInput);
            if (!isNaN(val) && val > 0) {
                setDiscountValue(val);
                setDiscountType('PERCENTAGE');
                setSmartCalcInput('');
                HapticService.success();
            } else {
                if (discountValue > 0) {
                    if (discountType === 'PERCENTAGE') {
                        setDiscountType('AMOUNT');
                        HapticService.light();
                    } else {
                        setDiscountValue(0);
                        HapticService.medium();
                    }
                }
            }
        } else if (char === '-') {
            if (smartCalcInput && smartCalcInput !== '-') {
                handleSmartAction('REMOVE');
            } else {
                setSmartCalcInput(prev => prev + char);
            }
        } else {
            setSmartCalcInput(prev => prev + char);
        }
    };

    // --- Smart Action (ADD/REMOVE) ---
    const handleSmartAction = (action: 'ADD' | 'REMOVE') => {
        let finalAction = action;
        let inputToParse = smartCalcInput;
        let itemDiscountValue = 0;

        if (smartCalcInput.startsWith('-')) {
            finalAction = 'REMOVE';
            inputToParse = smartCalcInput.substring(1);
        } else if (smartCalcInput.includes('-')) {
            const discParts = smartCalcInput.split('-');
            if (discParts.length === 2) {
                inputToParse = discParts[0];
                itemDiscountValue = Number(discParts[1]) || 0;
            }
        }

        const parts = inputToParse.split('*');
        let product: Product | undefined;
        let quantityOp = 1;

        if (parts.length === 1) {
            product = products.find(p => p.id === parts[0]);
        } else if (parts.length === 2) {
            let p = products.find(prod => prod.id === parts[0]);
            if (p) {
                product = p;
                quantityOp = Number(parts[1]) || 1;
            } else {
                p = products.find(prod => prod.id === parts[1]);
                if (p) {
                    product = p;
                    quantityOp = Number(parts[0]) || 1;
                }
            }
        }

        if (!product) {
            setCalcError('Item ID not found');
            HapticService.heavy();
            return;
        }

        const existingItemIndex = items.findIndex(i => i.productId === product!.id);

        if (finalAction === 'ADD') {
            if (existingItemIndex > -1) {
                const newItems = [...items];
                newItems[existingItemIndex].quantity += quantityOp;
                newItems[existingItemIndex].baseAmount = newItems[existingItemIndex].quantity * newItems[existingItemIndex].rate;
                if (itemDiscountValue > 0) {
                    newItems[existingItemIndex].discountType = 'AMOUNT';
                    newItems[existingItemIndex].discountValue = itemDiscountValue;
                }
                if (gstEnabled) calculateTaxes(newItems[existingItemIndex], company, null);
                else newItems[existingItemIndex].totalAmount = newItems[existingItemIndex].baseAmount;
                setItems(newItems);
            } else {
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
                    discountValue: itemDiscountValue,
                    discountAmount: itemDiscountValue
                };
                newItem.baseAmount = (newItem.quantity * newItem.rate) - itemDiscountValue;
                if (gstEnabled) calculateTaxes(newItem, company, null);
                else newItem.totalAmount = newItem.baseAmount;

                setItems(prev => [...prev, newItem]);
            }
        } else {
            if (existingItemIndex > -1) {
                const currentQty = items[existingItemIndex].quantity;
                const newQty = currentQty - quantityOp;

                if (newQty <= 0) {
                    setItems(items.filter((_, i) => i !== existingItemIndex));
                } else {
                    const newItems = [...items];
                    newItems[existingItemIndex].quantity = newQty;
                    newItems[existingItemIndex].baseAmount = newItems[existingItemIndex].quantity * newItems[existingItemIndex].rate;
                    if (gstEnabled) calculateTaxes(newItems[existingItemIndex], company, null);
                    else newItems[existingItemIndex].totalAmount = newItems[existingItemIndex].baseAmount;
                    setItems(newItems);
                }
            } else {
                setCalcError('Item not in list');
                HapticService.heavy();
                return;
            }
        }

        setSmartCalcInput('');
        HapticService.medium();
    };

    // --- Calculations ---
    const calculateSubtotal = () => items.reduce((sum, item) => sum + (item.baseAmount || 0), 0);
    const calculateTotalCGST = () => items.reduce((sum, item) => sum + (item.cgstAmount || 0), 0);
    const calculateTotalSGST = () => items.reduce((sum, item) => sum + (item.sgstAmount || 0), 0);
    const calculateTotalIGST = () => items.reduce((sum, item) => sum + (item.igstAmount || 0), 0);

    const calculateTotal = () => {
        const subtotal = calculateSubtotal();
        let globalDiscountAmount = 0;
        if (discountType === 'PERCENTAGE') {
            globalDiscountAmount = (subtotal * discountValue) / 100;
        } else {
            globalDiscountAmount = discountValue;
        }
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

    // --- Save Handler ---
    const handleSave = () => {
        if (items.length === 0) {
            setCalcError('Add at least one item');
            HapticService.heavy();
            return;
        }
        HapticService.success();
        setShowPaymentModal(true);
    };

    // --- Invoice Creation ---
    const createInvoice = async (paid: boolean, customer: Customer | null) => {
        const cleanedItems: InvoiceItem[] = items.map(item => ({
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

        const subtotal = calculateSubtotal();
        const totalCgst = calculateTotalCGST();
        const totalSgst = calculateTotalSGST();
        const totalIgst = calculateTotalIGST();

        const supplier = company as any;
        const taxType = (supplier?.state || 'Delhi') === (customer?.state || '') ? 'INTRA_STATE' : 'INTER_STATE';

        let globalDiscountAmount = 0;
        if (discountType === 'PERCENTAGE') {
            globalDiscountAmount = (subtotal * discountValue) / 100;
        } else {
            globalDiscountAmount = discountValue;
        }

        const roundedTotal = calculateRoundedTotal();
        const roundUpAmount = getRoundUpAmount();

        const invNumber = StorageService.generateInvoiceNumber(
            customer?.id || 'cash',
            new Date().toISOString()
        );

        const newInvoice: Invoice = {
            id: crypto.randomUUID(),
            invoiceNumber: invNumber,
            customerId: customer?.id || 'CASH_SALE',
            customerName: customer?.name || (paid ? 'CASH SALES' : 'Unknown'),
            customerAddress: customer?.address || '',
            customerState: customer?.state || '',
            customerGstin: customer?.gstin || '',
            supplierGstin: supplier?.gstin || '',
            taxType: taxType,
            date: new Date().toISOString().split('T')[0],
            dueDate: new Date().toISOString().split('T')[0],
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
            status: paid ? 'PAID' : 'PENDING',
            paymentMode: paid ? 'CASH' : 'CREDIT',
            notes: ''
        };

        StorageService.saveInvoice(newInvoice);
        setCreatedInvoice(newInvoice);
        setIsPaid(paid);
        setSelectedCustomer(customer);

        onSaveSuccess(newInvoice);
        setShowSuccessModal(true);
        HapticService.success();
    };

    const handlePaymentChoice = (received: boolean) => {
        setShowPaymentModal(false);
        if (received) {
            createInvoice(true, null);
        } else {
            setShowPartyModal(true);
        }
    };

    const handlePartySelect = (customer: Customer) => {
        setShowPartyModal(false);
        createInvoice(false, customer);
    };

    const handleDownload = async () => {
        if (createdInvoice) {
            const companyProfile = StorageService.getCompanyProfile();
            await InvoicePdfService.generatePDF(createdInvoice, companyProfile, selectedCustomer);
        }
    };

    const filteredCustomers = customers.filter(c =>
        c.name.toLowerCase().includes(customersSearch.toLowerCase()) ||
        c.phone.includes(customersSearch)
    );

    const handleClear = () => {
        HapticService.medium();
        setSmartCalcInput('');
        setCalcError('');
    };

    const handleClearAll = () => {
        HapticService.heavy();
        setItems([]);
        setDiscountValue(0);
        setSmartCalcInput('');
        setCalcError('');
    };

    return (
        <div className="fixed inset-0 bg-white dark:bg-slate-900 z-[60] flex flex-col">
            {/* Header */}
            <div className="p-4 flex items-center justify-between border-b border-slate-100 dark:border-slate-800">
                <h2 className="text-lg font-black flex items-center gap-2">
                    <Calculator className="w-5 h-5 text-emerald-500" />
                    Smart Billing
                </h2>
                <button onClick={onBack} className="bg-slate-100 dark:bg-slate-800 p-2 rounded-full hover:bg-slate-200">
                    <X className="w-5 h-5" />
                </button>
            </div>

            {/* List of Added Items (Preview) */}
            <div className="flex-1 overflow-y-auto p-4 space-y-2 bg-slate-50 dark:bg-slate-950">
                {items.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-slate-400 opacity-50">
                        <Calculator className="w-16 h-16 mb-2" />
                        <p className="font-bold">Enter Item ID & Press '+'</p>
                    </div>
                ) : (
                    items.slice().reverse().map((item, idx) => (
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            key={idx}
                            className="bg-white dark:bg-slate-900 p-4 rounded-2xl shadow-sm flex justify-between items-center border border-slate-100 dark:border-slate-800"
                            onContextMenu={(e) => {
                                e.preventDefault();
                                if (window.confirm(`Remove ${item.description}?`)) {
                                    setItems(items.filter(i => i.productId !== item.productId));
                                }
                            }}
                        >
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center text-blue-600">
                                    <Package className="w-5 h-5" />
                                </div>
                                <div>
                                    <p className="font-bold text-sm text-slate-800 dark:text-slate-200 truncate max-w-[150px]">{item.description}</p>
                                    <p className="text-xs text-slate-400">ID: {item.productId} | ₹{item.rate}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-4">
                                <div className="text-right">
                                    <p className="font-black text-blue-600 text-lg">x{item.quantity}</p>
                                </div>
                                <div className="text-right">
                                    <p className="font-bold text-slate-900 dark:text-white">₹{(item.totalAmount || 0).toLocaleString('en-IN')}</p>
                                </div>
                            </div>
                        </motion.div>
                    ))
                )}
            </div>

            {/* Calculator Interface */}
            <div className="bg-white dark:bg-slate-900 p-4 pb-2 shadow-[0_-5px_30px_rgba(0,0,0,0.1)] rounded-t-[32px] shrink-0">
                {/* Display */}
                <div className="bg-slate-100 dark:bg-slate-800 rounded-2xl p-3 mb-3 flex flex-col items-end justify-center min-h-[60px]">
                    <span className={`text-xs font-bold uppercase tracking-widest ${calcError ? 'text-red-500' : 'text-slate-400'}`}>
                        {calcError || 'ITEM ID'}
                    </span>
                    <span className={`text-3xl font-mono font-black tracking-widest ${calcError ? 'text-red-500' : 'text-slate-800 dark:text-slate-100'}`}>
                        {smartCalcInput || '0'}
                    </span>
                </div>

                {/* Keypad */}
                <div className="grid grid-cols-4 gap-2">
                    {/* Row 1: 7, 8, 9, CLR */}
                    {[7, 8, 9].map(n => (
                        <button key={n} onClick={() => handleSmartCalcInput(n.toString())} className="h-14 rounded-2xl bg-slate-50 dark:bg-slate-800 text-xl font-bold hover:bg-slate-100 active:scale-95 transition-all shadow-sm border border-slate-200 dark:border-slate-700">{n}</button>
                    ))}
                    <button onClick={handleClear} className="h-14 rounded-2xl bg-red-50 text-red-600 text-lg font-black hover:bg-red-100 active:scale-95 transition-all">CLR</button>

                    {/* Row 2: 4, 5, 6, QTY(*) */}
                    {[4, 5, 6].map(n => (
                        <button key={n} onClick={() => handleSmartCalcInput(n.toString())} className="h-14 rounded-2xl bg-slate-50 dark:bg-slate-800 text-xl font-bold hover:bg-slate-100 active:scale-95 transition-all shadow-sm border border-slate-200 dark:border-slate-700">{n}</button>
                    ))}
                    <button onClick={() => handleSmartCalcInput('*')} className="h-14 rounded-2xl bg-indigo-50 text-indigo-600 text-lg font-black hover:bg-indigo-100 active:scale-95 transition-all flex flex-col items-center justify-center leading-none">
                        <span>×</span>
                        <span className="text-[8px] uppercase tracking-widest">QTY</span>
                    </button>

                    {/* Row 3: 1, 2, 3, ADD(+) */}
                    {[1, 2, 3].map(n => (
                        <button key={n} onClick={() => handleSmartCalcInput(n.toString())} className="h-14 rounded-2xl bg-slate-50 dark:bg-slate-800 text-xl font-bold hover:bg-slate-100 active:scale-95 transition-all shadow-sm border border-slate-200 dark:border-slate-700">{n}</button>
                    ))}
                    <button onClick={() => handleSmartCalcInput('+')} className="row-span-2 h-full rounded-2xl bg-blue-600 text-white text-2xl font-black hover:bg-blue-700 active:scale-95 transition-all shadow-lg shadow-blue-500/30">+</button>

                    {/* Row 4: 0, %, REMOVE(-) */}
                    <button onClick={() => handleSmartCalcInput('0')} className="h-14 rounded-2xl bg-slate-50 dark:bg-slate-800 text-xl font-bold hover:bg-slate-100 active:scale-95 transition-all shadow-sm border border-slate-200 dark:border-slate-700">0</button>
                    <button onClick={() => handleSmartCalcInput('BILL_DISC')} className={`h-14 rounded-2xl font-bold active:scale-95 transition-all flex flex-col items-center justify-center leading-none shadow-sm border ${discountValue > 0 ? 'bg-purple-600 text-white border-purple-600 shadow-purple-500/30' : 'bg-purple-50 text-purple-600 border-purple-100 hover:bg-purple-100'}`}>
                        <span className="text-lg">{discountValue > 0 ? (discountType === 'PERCENTAGE' ? '%' : '₹') : '%'}</span>
                        <span className="text-[8px] uppercase tracking-widest">{discountValue > 0 ? `${discountValue} OFF` : 'DISC'}</span>
                    </button>
                    <button onClick={() => handleSmartCalcInput('-')} className="h-14 rounded-2xl bg-orange-50 text-orange-600 font-bold active:scale-95 transition-all flex flex-col items-center justify-center hover:bg-orange-100 leading-none shadow-sm border border-orange-100">
                        <span className="text-lg">−</span>
                        <span className="text-[8px] uppercase tracking-widest">REM</span>
                    </button>
                </div>
            </div>

            {/* Fixed Bottom Bar with Total and Save */}
            <div className="bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 p-4 pb-6 shrink-0">
                <div className="flex items-center justify-between gap-3">
                    <div className="flex-1">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">TOTAL ({items.length} ITEMS)</p>
                        <p className="text-2xl font-black text-slate-900 dark:text-white">₹{calculateRoundedTotal().toLocaleString('en-IN')}</p>
                    </div>
                    {items.length > 0 && (
                        <button onClick={handleClearAll} className="text-xs font-bold text-red-500 bg-red-50 dark:bg-red-900/20 px-3 py-2 rounded-xl shrink-0">Clear All</button>
                    )}
                    <button onClick={handleSave} className="py-3 px-6 rounded-2xl bg-emerald-500 text-white font-black uppercase tracking-widest active:scale-95 transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 shrink-0">
                        <Check className="w-5 h-5" />
                        <span>Save</span>
                    </button>
                </div>
            </div>

            {/* Payment Modal */}
            <AnimatePresence>
                {showPaymentModal && (
                    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/80 backdrop-blur-sm p-4">
                        <motion.div
                            initial={{ y: "100%" }}
                            animate={{ y: 0 }}
                            exit={{ y: "100%" }}
                            className="bg-white dark:bg-slate-800 w-full max-w-md rounded-[32px] p-8 border border-slate-200 dark:border-white/10"
                        >
                            <h2 className="text-2xl font-bold text-center mb-2 text-slate-900 dark:text-white">Payment Received?</h2>
                            <p className="text-center text-slate-500 mb-8">Total: ₹{calculateRoundedTotal().toLocaleString('en-IN')}</p>
                            <div className="flex flex-col gap-4">
                                <button
                                    onClick={() => handlePaymentChoice(true)}
                                    className="w-full py-6 bg-emerald-500 rounded-2xl font-bold text-xl text-white flex items-center justify-center gap-3 shadow-lg shadow-emerald-500/20"
                                >
                                    YES <span className="text-sm opacity-80 font-normal">(Cash Sale)</span>
                                </button>
                                <button
                                    onClick={() => handlePaymentChoice(false)}
                                    className="w-full py-6 bg-rose-500 rounded-2xl font-bold text-xl text-white flex items-center justify-center gap-3 shadow-lg shadow-rose-500/20"
                                >
                                    NO <span className="text-sm opacity-80 font-normal">(Party Due)</span>
                                </button>
                                <button
                                    onClick={() => setShowPaymentModal(false)}
                                    className="w-full py-4 text-slate-400 font-bold tracking-widest uppercase text-sm"
                                >
                                    Cancel
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Party Select Modal */}
            <AnimatePresence>
                {showPartyModal && (
                    <div className="fixed inset-0 z-50 flex flex-col bg-white dark:bg-slate-900">
                        <div className="p-6 border-b border-slate-200 dark:border-white/10 flex items-center gap-4">
                            <button onClick={() => setShowPartyModal(false)} className="p-2 -ml-2"><ArrowLeft className="w-6 h-6" /></button>
                            <h2 className="text-xl font-bold text-slate-900 dark:text-white">Select Party</h2>
                        </div>
                        <div className="p-4">
                            <input
                                type="text"
                                placeholder="Search Name or Phone..."
                                className="w-full p-4 bg-slate-100 dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white outline-none focus:border-emerald-500"
                                value={customersSearch}
                                onChange={e => setCustomersSearch(e.target.value)}
                                autoFocus
                            />
                        </div>
                        <div className="flex-1 overflow-y-auto p-4 space-y-2">
                            <button
                                onClick={() => {
                                    alert("Quick Add Party coming soon!");
                                }}
                                className="w-full p-4 bg-slate-50 dark:bg-slate-800/50 border border-dashed border-slate-300 dark:border-white/20 rounded-2xl text-left flex items-center gap-4 mb-4"
                            >
                                <div className="w-10 h-10 rounded-full bg-emerald-500/20 text-emerald-500 flex items-center justify-center"><User className="w-5 h-5" /></div>
                                <span className="font-bold text-emerald-500">+ Add New Party</span>
                            </button>

                            {filteredCustomers.map(c => (
                                <button
                                    key={c.id}
                                    onClick={() => handlePartySelect(c)}
                                    className="w-full p-4 bg-white dark:bg-slate-800 rounded-2xl text-left flex items-center gap-4 border border-slate-100 dark:border-white/5 active:bg-slate-50 dark:active:bg-slate-700"
                                >
                                    <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center font-bold text-lg text-white">
                                        {c.name.charAt(0)}
                                    </div>
                                    <div>
                                        <div className="font-bold text-lg text-slate-900 dark:text-white">{c.name}</div>
                                        <div className="text-sm text-slate-400">{c.phone}</div>
                                    </div>
                                    <div className="ml-auto text-rose-400 font-bold text-sm">
                                        Bal: ₹{c.balance}
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>
                )}
            </AnimatePresence>

            {/* Success Modal */}
            <AnimatePresence>
                {showSuccessModal && (
                    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-emerald-500 text-white">
                        <motion.div
                            initial={{ scale: 0.8, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            className="text-center p-8 max-w-sm w-full"
                        >
                            <div className="w-24 h-24 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-6">
                                <Check className="w-12 h-12" />
                            </div>
                            <h2 className="text-3xl font-black mb-2">Saved!</h2>
                            <p className="text-xl opacity-90 mb-8">₹{calculateRoundedTotal().toLocaleString('en-IN')} - {isPaid ? 'PAID' : 'DUE'}</p>

                            <div className="flex flex-col gap-4">
                                <button
                                    onClick={handleDownload}
                                    className="w-full py-5 bg-white text-emerald-600 rounded-2xl font-black text-lg shadow-xl flex items-center justify-center gap-3"
                                >
                                    <Download className="w-6 h-6" /> Download PDF
                                </button>

                                <button
                                    onClick={() => {
                                        if (navigator.share && createdInvoice) {
                                            navigator.share({
                                                title: `Invoice`,
                                                text: `Invoice for ₹${calculateRoundedTotal().toLocaleString('en-IN')}`,
                                                url: window.location.href
                                            });
                                        }
                                    }}
                                    className="w-full py-5 bg-emerald-600 border border-white/20 rounded-2xl font-black text-lg flex items-center justify-center gap-3"
                                >
                                    <Share2 className="w-6 h-6" /> Share
                                </button>

                                <button
                                    onClick={() => {
                                        setShowSuccessModal(false);
                                        handleClearAll();
                                        onBack();
                                    }}
                                    className="mt-4 text-emerald-100 font-black tracking-widest uppercase text-sm"
                                >
                                    Done / New Calc
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default SmartCalculator;
