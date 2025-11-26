
import React, { useState, useEffect } from 'react';
import { Product } from '../types';
import { StorageService } from '../services/storageService';
import { Plus, Search } from 'lucide-react';

const Inventory: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [newProduct, setNewProduct] = useState<Partial<Product>>({
      name: '', price: 0, stock: 0, category: ''
  });

  useEffect(() => {
    setProducts(StorageService.getProducts());
  }, []);

  const handleSave = (e: React.FormEvent) => {
      e.preventDefault();
      if(!newProduct.name || !newProduct.price) return;

      const product: Product = {
          id: crypto.randomUUID(),
          name: newProduct.name!,
          price: Number(newProduct.price),
          stock: Number(newProduct.stock) || 0,
          category: newProduct.category || 'General'
      };

      StorageService.saveProduct(product);
      setProducts(StorageService.getProducts());
      setIsAdding(false);
      setNewProduct({ name: '', price: 0, stock: 0, category: '' });
  };

  const filteredProducts = products.filter(product => 
    product.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-4 md:p-6">
      <div className="flex justify-between items-center mb-4 md:mb-6">
        <h2 className="text-xl md:text-2xl font-bold text-slate-800">Inventory Management</h2>
        <button 
            onClick={() => setIsAdding(!isAdding)}
            className="bg-blue-600 text-white px-3 py-2 md:px-4 rounded-md flex items-center gap-2 hover:bg-blue-700 shadow-sm text-sm md:text-base"
        >
            <Plus className="w-4 h-4" /> <span className="hidden sm:inline">Add Product</span>
        </button>
      </div>

      {isAdding && (
          <div className="bg-white p-4 rounded-lg shadow mb-6 border border-blue-100">
              <h3 className="font-semibold mb-4">Add New Product</h3>
              <form onSubmit={handleSave} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                  <div>
                      <label className="block text-xs text-gray-500 mb-1">Name</label>
                      <input required type="text" className="w-full border p-2 rounded" value={newProduct.name} onChange={e => setNewProduct({...newProduct, name: e.target.value})} />
                  </div>
                  <div>
                      <label className="block text-xs text-gray-500 mb-1">Price</label>
                      <input required type="number" className="w-full border p-2 rounded" value={newProduct.price} onChange={e => setNewProduct({...newProduct, price: Number(e.target.value)})} />
                  </div>
                  <div>
                      <label className="block text-xs text-gray-500 mb-1">Stock</label>
                      <input required type="number" className="w-full border p-2 rounded" value={newProduct.stock} onChange={e => setNewProduct({...newProduct, stock: Number(e.target.value)})} />
                  </div>
                  <button type="submit" className="bg-green-600 text-white p-2 rounded hover:bg-green-700 w-full md:w-auto">Save</button>
              </form>
          </div>
      )}

      <div className="mb-6 relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Search className="h-5 w-5 text-gray-400" />
        </div>
        <input
          type="text"
          className="block w-full pl-10 pr-3 py-2 border border-slate-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
          placeholder="Search products by name..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
            <table className="w-full min-w-[600px]">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Category</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">Stock</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">Price</th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-slate-500 uppercase tracking-wider">Status</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-200">
                {filteredProducts.map((product) => (
                  <tr key={product.id} className="hover:bg-slate-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900">{product.name}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{product.category}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-slate-900">{product.stock}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-slate-900">₹{product.price.toFixed(2)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${product.stock > 10 ? 'bg-green-100 text-green-800' : product.stock > 0 ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'}`}>
                            {product.stock > 10 ? 'In Stock' : product.stock > 0 ? 'Low Stock' : 'Out of Stock'}
                        </span>
                    </td>
                  </tr>
                ))}
                {filteredProducts.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-6 py-8 text-center text-slate-500">
                      No products found matching "{searchTerm}"
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
        </div>
      </div>
    </div>
  );
};

export default Inventory;
