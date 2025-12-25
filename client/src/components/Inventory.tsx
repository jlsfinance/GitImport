
import React, { useState, useEffect } from 'react';
import { Product } from '../types';
import { StorageService } from '../services/storageService';
import { Plus, Search, Package, MoreVertical, Trash2, Edit2, TrendingUp, AlertTriangle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const Inventory: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [newProduct, setNewProduct] = useState<Partial<Product>>({
    name: '', price: 0, stock: 0, category: 'General'
  });
  const [originalId, setOriginalId] = useState<string | null>(null);

  useEffect(() => {
    setProducts(StorageService.getProducts());
  }, []);

  const handleEdit = (product: Product) => {
    setNewProduct(product);
    setOriginalId(product.id);
    setIsAdding(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProduct.name || newProduct.price === undefined) return;

    // Use entered ID or preserve existing ID or generate new
    const finalId = newProduct.id?.trim() || crypto.randomUUID();

    const product: Product = {
      id: finalId,
      name: newProduct.name!,
      price: Number(newProduct.price),
      stock: Number(newProduct.stock) || 0,
      category: newProduct.category || 'General',
      gstRate: newProduct.gstRate,
      hsn: newProduct.hsn
    };

    // Handle ID Renaming
    if (originalId && originalId !== finalId) {
      // ID changed, delete old one to prevent duplicates (effectively a rename)
      // Warning: This breaks history links if not handled carefully, but user requested edit capability.
      StorageService.deleteProduct(originalId);
    }

    StorageService.saveProduct(product);

    setProducts(StorageService.getProducts());
    setIsAdding(false);
    setNewProduct({ name: '', price: 0, stock: 0, category: 'General' });
    setOriginalId(null);
  };

  const handleDelete = (id: string) => {
    if (window.confirm('Delete this product?')) {
      const updated = products.filter(p => p.id !== id);
      setProducts(updated);
      // StorageService.deleteProduct(id); // If method exists, else need to implement
    }
  };

  const filteredProducts = products.filter(product =>
    product.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalStockValue = products.reduce((acc, p) => acc + (p.price * p.stock), 0);
  const lowStockCount = products.filter(p => p.stock <= 10).length;

  return (
    <div className="bg-slate-50 dark:bg-slate-900 min-h-screen pb-20">
      {/* Header Area */}
      <div className="bg-white dark:bg-slate-900 pt-8 pb-6 px-4 md:px-8 border-b border-slate-100 dark:border-slate-800">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">Inventory</h1>
            <p className="text-slate-500 text-sm font-medium mt-1">Manage your stock and pricing</p>
          </div>

          <button
            onClick={() => { setIsAdding(true); setOriginalId(null); setNewProduct({ name: '', price: 0, stock: 0, category: 'General' }); }}
            className="bg-blue-600 text-white px-6 py-3 rounded-2xl flex items-center justify-center gap-2 font-bold shadow-lg shadow-blue-200 active:scale-95 transition-transform"
          >
            <Plus className="w-5 h-5" /> Add Product
          </button>
        </div>
      </div>

      <div className="max-w-6xl mx-auto p-4 md:p-8 space-y-8">
        {/* Stats Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-slate-800 p-5 rounded-[28px] border border-slate-100 dark:border-slate-700 shadow-sm">
            <Package className="w-6 h-6 text-blue-500 mb-3" />
            <p className="text-2xl font-black text-slate-800 dark:text-slate-100">{products.length}</p>
            <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Total Items</p>
          </div>
          <div className="bg-white dark:bg-slate-800 p-5 rounded-[28px] border border-slate-100 dark:border-slate-700 shadow-sm text-emerald-600">
            <TrendingUp className="w-6 h-6 mb-3" />
            <p className="text-2xl font-black">₹{totalStockValue.toLocaleString('en-IN')}</p>
            <p className="text-[10px] uppercase font-bold opacity-60 tracking-wider">Stock Value</p>
          </div>
          <div className={`p-5 rounded-[28px] border shadow-sm ${lowStockCount > 0 ? 'bg-orange-50 border-orange-100 text-orange-600' : 'bg-white border-slate-100 text-slate-400'}`}>
            <AlertTriangle className="w-6 h-6 mb-3" />
            <p className="text-2xl font-black">{lowStockCount}</p>
            <p className="text-[10px] uppercase font-bold opacity-60 tracking-wider">Low Stock</p>
          </div>
        </div>

        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Search products by name or category..."
            className="w-full pl-12 pr-6 py-4 bg-white dark:bg-slate-800 border-none rounded-2xl shadow-sm focus:ring-2 focus:ring-blue-500 outline-none font-medium"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {/* Products Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <AnimatePresence>
            {filteredProducts.map((product) => (
              <motion.div
                key={product.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="bg-white dark:bg-slate-800 p-5 rounded-[28px] border border-slate-100 dark:border-slate-700 shadow-sm relative group hover:border-blue-200 transition-colors"
              >
                <div className="flex justify-between items-start mb-4">
                  <div className="w-12 h-12 rounded-2xl bg-slate-50 dark:bg-slate-700 flex items-center justify-center text-slate-400">
                    <Package className="w-6 h-6" />
                  </div>
                  <div className="flex gap-1">
                    <button onClick={() => handleEdit(product)} className="p-2 text-slate-400 hover:text-blue-500 rounded-full hover:bg-blue-50"><Edit2 className="w-4 h-4" /></button>
                    <button onClick={() => handleDelete(product.id)} className="p-2 text-slate-400 hover:text-red-500 rounded-full hover:bg-red-50"><Trash2 className="w-4 h-4" /></button>
                  </div>
                </div>

                <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 line-clamp-1">{product.name}</h3>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">{product.category}</p>

                <div className="flex items-end justify-between pt-4 border-t border-slate-50 dark:border-slate-700">
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase">Unit Price</p>
                    <p className="text-xl font-black text-blue-600">₹{product.price.toFixed(2)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-bold text-slate-400 uppercase">Stock</p>
                    <span className={`text-sm font-black px-3 py-1 rounded-full ${product.stock > 10 ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'}`}>
                      {product.stock} Units
                    </span>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {filteredProducts.length === 0 && (
          <div className="text-center py-20">
            <div className="w-20 h-20 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4">
              <Package className="w-10 h-10 text-slate-300" />
            </div>
            <h3 className="text-lg font-bold text-slate-600">No products found</h3>
            <p className="text-slate-400">Add a product or try a different search</p>
          </div>
        )}
      </div>

      {/* Add Product Modal */}
      <AnimatePresence>
        {isAdding && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ y: 100, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 100, opacity: 0 }}
              className="bg-white dark:bg-slate-800 w-full max-w-lg rounded-[32px] overflow-hidden shadow-2xl"
            >
              <div className="p-8 pb-0 flex justify-between items-center">
                <h2 className="text-2xl font-bold">{newProduct.id ? 'Edit Product' : 'New Product'}</h2>
                <button onClick={() => setIsAdding(false)} className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center">✕</button>
              </div>

              <form onSubmit={handleSave} className="p-8 space-y-6">

                <div className="space-y-2">
                  <label className="text-xs font-black text-slate-400 uppercase ml-2">Item ID (For Smart Calc)</label>
                  <input
                    className="w-full p-4 bg-slate-50 dark:bg-slate-900 border-none rounded-2xl text-base font-bold text-slate-600 focus:ring-2 focus:ring-blue-500 outline-none font-mono"
                    placeholder="Auto-generated if empty"
                    value={newProduct.id || ''}
                    onChange={e => setNewProduct({ ...newProduct, id: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-black text-slate-400 uppercase ml-2">Product Name</label>
                  <input
                    required
                    autoFocus
                    className="w-full p-4 bg-slate-50 dark:bg-slate-900 border-none rounded-2xl text-lg font-bold focus:ring-2 focus:ring-blue-500 outline-none"
                    placeholder="Enter Name..."
                    value={newProduct.name}
                    onChange={e => setNewProduct({ ...newProduct, name: e.target.value })}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs font-black text-slate-400 uppercase ml-2">Sale Price</label>
                    <input
                      required
                      type="number"
                      className="w-full p-4 bg-slate-50 dark:bg-slate-900 border-none rounded-2xl font-bold focus:ring-2 focus:ring-blue-500 outline-none"
                      placeholder="₹"
                      value={newProduct.price || ''}
                      onChange={e => setNewProduct({ ...newProduct, price: Number(e.target.value) })}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-black text-slate-400 uppercase ml-2">Opening Stock</label>
                    <input
                      required
                      type="number"
                      className="w-full p-4 bg-slate-50 dark:bg-slate-900 border-none rounded-2xl font-bold focus:ring-2 focus:ring-blue-500 outline-none"
                      value={newProduct.stock || ''}
                      onChange={e => setNewProduct({ ...newProduct, stock: Number(e.target.value) })}
                    />
                  </div>
                </div>

                <button type="submit" className="w-full bg-blue-600 text-white py-5 rounded-2xl font-black text-lg shadow-xl shadow-blue-200 active:scale-95 transition-transform">
                  Save Product
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div >
  );
};

export default Inventory;

