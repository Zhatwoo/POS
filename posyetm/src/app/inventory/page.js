'use client';

import { useState, useEffect } from 'react';
import Navbar from '@/app/Components/Navbar';
import { 
  fetchAllProductsFromFirestore, 
  updateNestedDocument, 
  addNestedDocument,
  deleteNestedDocument,
  getNestedCollection,
  discoverCategories
} from '@/lib/firebase-helpers';
import { buildProductsPath } from '@/lib/firebase-config';
import { useUser } from '@/lib/user-context';
import { 
  Search, 
  Plus, 
  Edit, 
  Trash2, 
  Package, 
  TrendingUp, 
  TrendingDown, 
  Download, 
  Upload, 
  FileText,
  X,
  Save,
  AlertTriangle,
  History,
  CheckCircle
} from 'lucide-react';

export default function InventoryPage() {
  const [products, setProducts] = useState([]);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [showProductModal, setShowProductModal] = useState(false);
  const [showStockModal, setShowStockModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [isAddMode, setIsAddMode] = useState(false);
  const [stockAdjustment, setStockAdjustment] = useState({ type: 'in', quantity: 0, reason: '' });
  const [productHistory, setProductHistory] = useState([]);
  const [viewMode, setViewMode] = useState('list'); // 'list' or 'stocktake'
  const [stockTakeData, setStockTakeData] = useState({});
  const [categories, setCategories] = useState(['All']); // Start with 'All', will be populated dynamically
  const { companyName, account, loading: userLoading, userData } = useUser();

  // Product form state
  const [productForm, setProductForm] = useState({
    name: '',
    sku: '',
    barcode: '',
    category: 'Beverages',
    supplier: '',
    purchasePrice: 0,
    sellingPrice: 0,
    vatIncluded: false,
    vatRate: 12,
    unit: 'pcs',
    reorderPoint: 10,
    stock: 0,
    description: '',
    imageUrl: '',
  });

  useEffect(() => {
    // Wait for user context to load before fetching data
    if (userLoading || !companyName || !account) {
      setLoading(false);
      setProducts([]);
      setCategories(['All']);
      return;
    }

    fetchProducts();
  }, [companyName, account, userLoading]);

  useEffect(() => {
    filterProducts();
  }, [products, searchTerm, selectedCategory]);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      
      // Only fetch if companyName and account are available
      if (!companyName || !account) {
        console.warn('Company name or account not available, skipping data fetch');
        setProducts([]);
        setCategories(['All']);
        setLoading(false);
        return;
      }

      const basePath = buildProductsPath(null, companyName, account);
      
      // First, discover categories dynamically
      const commonCategories = ['Beverages', 'Food Items', 'Personal Care', 'Household Items', 'Electronics', 'Others'];
      let discoveredCategories = [];
      try {
        discoveredCategories = await discoverCategories(basePath, commonCategories);
      } catch (error) {
        console.error('Failed to discover categories:', error);
        discoveredCategories = [];
      }
      
      const allCategories = ['All', ...discoveredCategories];
      setCategories(allCategories);
      
      const productCategories = discoveredCategories;
      
      let data = [];
      try {
        const firestoreData = await fetchAllProductsFromFirestore(basePath, productCategories);
        data = firestoreData.products || [];
        console.log(`✅ Fetched ${data.length} products from ${firestoreData.categories.length} categories`);
      } catch (error) {
        console.error('Failed to fetch products from nested path:', error);
        // Don't fallback - return empty array for new accounts
        data = [];
      }
      
      setProducts(data);
    } catch (error) {
      console.error('Error fetching products:', error);
      setProducts([]);
    } finally {
      setLoading(false);
    }
  };

  const filterProducts = () => {
    let filtered = products;

    // Category filter
    if (selectedCategory !== 'All') {
      filtered = filtered.filter(p => p.category === selectedCategory);
    }

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(p =>
        p.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.sku?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.barcode?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    setFilteredProducts(filtered);
  };

  const handleAddProduct = () => {
    setIsAddMode(true);
    setSelectedProduct(null);
    setProductForm({
      name: '',
      sku: '',
      barcode: '',
      category: 'Beverages',
      supplier: '',
      purchasePrice: 0,
      sellingPrice: 0,
      vatIncluded: false,
      vatRate: 12,
      unit: 'pcs',
      reorderPoint: 10,
      stock: 0,
      description: '',
      imageUrl: '',
    });
    setShowProductModal(true);
  };

  const handleEditProduct = (product) => {
    setIsAddMode(false);
    setSelectedProduct(product);
    setProductForm({
      name: product.name || '',
      sku: product.sku || '',
      barcode: product.barcode || '',
      category: product.category || 'Beverages',
      supplier: product.supplier || '',
      purchasePrice: product.purchasePrice || product.price || 0,
      sellingPrice: product.price || 0,
      vatIncluded: product.vatIncluded || false,
      vatRate: product.vatRate || 12,
      unit: product.unit || 'pcs',
      reorderPoint: product.reorderPoint || 10,
      stock: product.stock || 0,
      description: product.description || '',
      imageUrl: product.imageUrl || '',
    });
    setShowProductModal(true);
  };

  // Helper function to check and handle missing account information
  const checkAccountInfo = (operation = 'perform this operation') => {
    if (userLoading) {
      alert('Please wait while your account information is being loaded...');
      return false;
    }
    
    if (!companyName || !account) {
      const errorMessage = 'Your account information is not available. This may happen if:\n\n' +
        '1. Your account was not properly set up during registration\n' +
        '2. Your account document is missing in the database\n' +
        '3. There was an error loading your account data\n\n' +
        'Please try logging out and logging back in. If the problem persists, contact support.';
      alert(errorMessage);
      console.error(`Cannot ${operation} - missing account information:`, {
        companyName,
        account,
        userLoading,
        userData
      });
      return false;
    }
    
    return true;
  };

  const handleSaveNewProduct = async () => {
    // Verify companyName and account before any write operation
    if (!checkAccountInfo('add product')) {
      return;
    }

    try {
      // Validation
      if (!productForm.name || !productForm.sku || !productForm.sellingPrice) {
        alert('Please fill in all required fields (Name, SKU, and Selling Price)');
        return;
      }

      if (productForm.sellingPrice <= 0) {
        alert('Selling price must be greater than 0');
        return;
      }

      // Validate stock is not negative
      if (productForm.stock < 0) {
        alert('Stock cannot be negative');
        return;
      }

      // Validate reorder point is not negative
      if (productForm.reorderPoint < 0) {
        alert('Reorder point cannot be negative');
        return;
      }

      const categoryPath = buildProductsPath(productForm.category, companyName, account);
      const newProductData = {
        ...productForm,
        price: productForm.sellingPrice,
        category: productForm.category,
        stock: Math.max(0, productForm.stock || 0),
        reorderPoint: Math.max(0, productForm.reorderPoint || 0),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await addNestedDocument(categoryPath, newProductData);
      
      // Refresh products
      await fetchProducts();
      setShowProductModal(false);
      setIsAddMode(false);
      setSelectedProduct(null);
      alert('Product added successfully!');
    } catch (error) {
      console.error('Error adding product:', error);
      alert('Error adding product. Please try again.');
    }
  };

  const handleSaveProduct = async () => {
    // Verify companyName and account before any write operation
    if (!checkAccountInfo('update product')) {
      return;
    }

    try {
      if (!selectedProduct) {
        alert('Please select a product to edit');
        return;
      }

      // Validation
      if (!productForm.name || !productForm.sku || !productForm.sellingPrice) {
        alert('Please fill in all required fields (Name, SKU, and Selling Price)');
        return;
      }

      if (productForm.sellingPrice <= 0) {
        alert('Selling price must be greater than 0');
        return;
      }

      // Validate stock is not negative
      if (productForm.stock < 0) {
        alert('Stock cannot be negative');
        return;
      }

      // Validate reorder point is not negative
      if (productForm.reorderPoint < 0) {
        alert('Reorder point cannot be negative');
        return;
      }

      const categoryPath = buildProductsPath(selectedProduct.category, companyName, account);
      const updateData = {
        ...productForm,
        price: productForm.sellingPrice,
        stock: Math.max(0, productForm.stock || 0),
        reorderPoint: Math.max(0, productForm.reorderPoint || 0),
        updatedAt: new Date().toISOString(),
      };

      await updateNestedDocument(categoryPath, selectedProduct.id, updateData);
      
      // Refresh products
      await fetchProducts();
      setShowProductModal(false);
      setSelectedProduct(null);
      setIsAddMode(false);
      alert('Product updated successfully!');
    } catch (error) {
      console.error('Error updating product:', error);
      alert('Error updating product. Please try again.');
    }
  };

  const handleStockAdjustment = async () => {
    // Verify companyName and account before any write operation
    if (!checkAccountInfo('adjust stock')) {
      return;
    }

    try {
      if (!selectedProduct || !stockAdjustment.quantity || !stockAdjustment.reason) {
        alert('Please fill in all fields');
        return;
      }

      // Validate customReason when reason is "Other"
      if (stockAdjustment.reason === 'Other' && !stockAdjustment.customReason?.trim()) {
        alert('Please provide a custom reason');
        return;
      }

      const categoryPath = buildProductsPath(selectedProduct.category, companyName, account);
      const currentStock = selectedProduct.stock || 0;
      const adjustment = stockAdjustment.type === 'in' 
        ? stockAdjustment.quantity 
        : -stockAdjustment.quantity;
      const newStock = Math.max(0, currentStock + adjustment);

      // Additional validation: prevent negative stock
      if (newStock < 0) {
        alert('Stock cannot be negative. Please adjust the quantity.');
        return;
      }

      await updateNestedDocument(categoryPath, selectedProduct.id, {
        stock: newStock,
        updatedAt: new Date().toISOString(),
      });

      // Log stock history
      const finalReason = stockAdjustment.reason === 'Other' 
        ? stockAdjustment.customReason 
        : stockAdjustment.reason;
      
      await logStockHistory(selectedProduct, {
        type: stockAdjustment.type,
        quantity: stockAdjustment.quantity,
        reason: finalReason,
        previousStock: currentStock,
        newStock: newStock,
      });

      // Refresh products
      await fetchProducts();
      setShowStockModal(false);
      setStockAdjustment({ type: 'in', quantity: 0, reason: '', customReason: '' });
      setSelectedProduct(null);
      alert('Stock updated successfully!');
    } catch (error) {
      console.error('Error updating stock:', error);
      alert('Error updating stock. Please try again.');
    }
  };

  const logStockHistory = async (product, adjustment) => {
    // Verify companyName and account before any write operation
    if (!companyName || !account) {
      console.warn('Company name or account not available, skipping history log');
      return;
    }

    try {
      if (!product || !product.id || !product.category) {
        console.error('Invalid product data for history logging:', product);
        return;
      }

      const historyPath = `${buildProductsPath(product.category, companyName, account)}/${product.id}/history`;
      await addNestedDocument(historyPath, {
        ...adjustment,
        timestamp: new Date().toISOString(),
        userId: 'system',
      });
    } catch (error) {
      console.error('Error logging stock history:', error);
      // Don't throw error to prevent blocking the main operation
      // But log it for debugging
      console.warn('Stock history logging failed, but operation continues:', {
        product: product?.name,
        error: error.message
      });
    }
  };

  const handleViewHistory = async (product) => {
    try {
      if (!product || !product.id || !product.category) {
        alert('Invalid product data');
        return;
      }

      setSelectedProduct(product);
      const historyPath = `${buildProductsPath(product.category, companyName, account)}/${product.id}/history`;
      
      try {
        const history = await getNestedCollection(historyPath);
        setProductHistory(history.sort((a, b) => {
          const dateA = a.timestamp ? new Date(a.timestamp) : new Date(0);
          const dateB = b.timestamp ? new Date(b.timestamp) : new Date(0);
          return dateB - dateA;
        }));
      } catch (fetchError) {
        console.error('Error fetching history:', fetchError);
        setProductHistory([]);
        // Still show modal with empty history
      }
      
      setShowHistoryModal(true);
    } catch (error) {
      console.error('Error in handleViewHistory:', error);
      alert('Error loading history. Please try again.');
      setProductHistory([]);
      setSelectedProduct(null);
    }
  };

  const handleDeleteProduct = async (product) => {
    // Verify companyName and account before any write operation
    if (!checkAccountInfo('delete product')) {
      return;
    }

    if (!product || !product.id || !product.category) {
      alert('Invalid product data');
      return;
    }

    if (!confirm(`Are you sure you want to delete ${product.name}? This action cannot be undone.`)) {
      return;
    }

    try {
      const categoryPath = buildProductsPath(product.category, companyName, account);
      await deleteNestedDocument(categoryPath, product.id);
      await fetchProducts();
      alert('Product deleted successfully!');
    } catch (error) {
      console.error('Error deleting product:', error);
      alert(`Error deleting product: ${error.message || 'Please try again.'}`);
    }
  };

  const exportToCSV = () => {
    const headers = ['SKU', 'Barcode', 'Name', 'Category', 'Price', 'Stock', 'Reorder Point', 'Supplier'];
    const rows = filteredProducts.map(p => [
      p.sku || '',
      p.barcode || '',
      p.name || '',
      p.category || '',
      p.price || 0,
      p.stock || 0,
      p.reorderPoint || 0,
      p.supplier || '',
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `inventory_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleBulkPriceUpdate = async () => {
    // Verify companyName and account before any write operation
    if (!checkAccountInfo('update prices')) {
      return;
    }

    const percentage = prompt('Enter percentage change (e.g., 10 for +10%, -5 for -5%):');
    if (!percentage || isNaN(parseFloat(percentage))) {
      alert('Please enter a valid number');
      return;
    }

    const change = parseFloat(percentage) / 100;
    const updated = filteredProducts.map(p => ({
      ...p,
      newPrice: Math.max(0, (p.price || 0) * (1 + change)),
    }));

    if (updated.length === 0) {
      alert('No products to update');
      return;
    }

    if (confirm(`Update prices for ${updated.length} products by ${percentage > 0 ? '+' : ''}${percentage}%?`)) {
      try {
        let successCount = 0;
        let errorCount = 0;

        for (const product of updated) {
          try {
            const categoryPath = buildProductsPath(product.category, companyName, account);
            await updateNestedDocument(categoryPath, product.id, {
              price: product.newPrice,
              sellingPrice: product.newPrice,
              updatedAt: new Date().toISOString(),
            });
            successCount++;
          } catch (error) {
            console.error(`Error updating price for ${product.name}:`, error);
            errorCount++;
          }
        }

        // Refresh products
        await fetchProducts();
        
        if (errorCount > 0) {
          alert(`Bulk price update completed with ${successCount} successes and ${errorCount} errors`);
        } else {
          alert(`Successfully updated prices for ${successCount} products!`);
        }
      } catch (error) {
        console.error('Error in bulk price update:', error);
        alert('Error updating prices. Please try again.');
      }
    }
  };

  const handleStockTake = (productId, counted) => {
    setStockTakeData({
      ...stockTakeData,
      [productId]: counted,
    });
  };

  const saveStockTake = async () => {
    // Verify companyName and account before any write operation
    if (!checkAccountInfo('save stock take')) {
      return;
    }

    try {
      const adjustments = Object.entries(stockTakeData)
        .map(([productId, counted]) => {
          const product = products.find(p => p.id === productId);
          if (!product) {
            console.warn(`Product with ID ${productId} not found`);
            return null;
          }
          return {
            product,
            counted: parseInt(counted) || 0,
            difference: (parseInt(counted) || 0) - (product.stock || 0),
          };
        })
        .filter(adj => adj !== null); // Filter out null entries

      if (adjustments.length === 0) {
        alert('No stock adjustments to save');
        return;
      }

      for (const adj of adjustments) {
        if (adj.difference !== 0 && adj.product) {
          // Validate stock is not negative
          if (adj.counted < 0) {
            alert(`Stock for ${adj.product.name} cannot be negative. Skipping...`);
            continue;
          }

          const categoryPath = buildProductsPath(adj.product.category, companyName, account);
          await updateNestedDocument(categoryPath, adj.product.id, {
            stock: adj.counted,
            updatedAt: new Date().toISOString(),
          });

          await logStockHistory(adj.product, {
            type: adj.difference > 0 ? 'in' : 'out',
            quantity: Math.abs(adj.difference),
            reason: 'Stock Take Adjustment',
            previousStock: adj.product.stock || 0,
            newStock: adj.counted,
          });
        }
      }

      await fetchProducts();
      setStockTakeData({});
      setViewMode('list');
      alert('Stock take completed!');
    } catch (error) {
      console.error('Error saving stock take:', error);
      alert('Error saving stock take. Please try again.');
    }
  };

  const isLowStock = (product) => {
    const stock = product.stock || 0;
    const reorderPoint = product.reorderPoint || 10;
    return stock <= reorderPoint;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="p-6 w-full">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Inventory Management</h1>
              <p className="text-gray-600 mt-2">Manage products, stock, and inventory</p>
            </div>
            <div className="flex flex-wrap gap-3">
              <button
                onClick={handleAddProduct}
                className="px-5 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-all duration-200 flex items-center gap-2 font-semibold shadow-md hover:shadow-lg"
              >
                <Plus className="w-5 h-5" />
                Add Product
              </button>
              <button
                onClick={() => setViewMode(viewMode === 'list' ? 'stocktake' : 'list')}
                className="px-5 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all duration-200 flex items-center gap-2 font-semibold shadow-md hover:shadow-lg"
              >
                {viewMode === 'list' ? (
                  <>
                    <FileText className="w-5 h-5" />
                    Stock Take Mode
                  </>
                ) : (
                  <>
                    <Package className="w-5 h-5" />
                    List View
                  </>
                )}
              </button>
              <button
                onClick={exportToCSV}
                className="px-5 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-all duration-200 flex items-center gap-2 font-semibold shadow-md hover:shadow-lg"
              >
                <Download className="w-5 h-5" />
                Export CSV
              </button>
              <button
                onClick={handleBulkPriceUpdate}
                className="px-5 py-2.5 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-all duration-200 flex items-center gap-2 font-semibold shadow-md hover:shadow-lg"
              >
                <TrendingUp className="w-5 h-5" />
                Bulk Price Update
              </button>
            </div>
          </div>

          {/* Filters */}
          <div className="bg-white rounded-lg shadow-md p-5 mb-6 border border-gray-100">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                  <Search className="w-4 h-4 text-gray-500" />
                  Search Products
                </label>
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search by name, SKU, or barcode..."
                  className="w-full px-4 py-2.5 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-black transition-all"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Category Filter
                </label>
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="w-full px-4 py-2.5 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-black transition-all"
                >
                  {categories.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>
              <div className="flex items-end">
                <div className="bg-blue-50 px-4 py-2.5 rounded-lg w-full border border-blue-200">
                  <p className="text-sm font-semibold text-blue-900">
                    Showing <span className="text-blue-600">{filteredProducts.length}</span> of <span className="text-blue-600">{products.length}</span> products
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Products Table */}
          {loading ? (
            <div className="bg-white rounded-lg shadow-md p-12 text-center">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
              <p className="text-gray-600 font-medium">Loading products...</p>
            </div>
          ) : viewMode === 'stocktake' ? (
            <div className="bg-white rounded-lg shadow-md p-6 border border-gray-100">
              <div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-200">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">Stock Take Mode</h2>
                  <p className="text-sm text-gray-600 mt-1">Count physical inventory and compare with system stock</p>
                </div>
                <button
                  onClick={saveStockTake}
                  className="px-5 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-all duration-200 flex items-center gap-2 font-semibold shadow-md hover:shadow-lg"
                >
                  <Save className="w-5 h-5" />
                  Save Stock Take
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gradient-to-r from-gray-50 to-gray-100">
                    <tr>
                      <th className="text-left py-4 px-6 text-gray-700 font-bold text-sm uppercase tracking-wider">SKU</th>
                      <th className="text-left py-4 px-6 text-gray-700 font-bold text-sm uppercase tracking-wider">Product</th>
                      <th className="text-left py-4 px-6 text-gray-700 font-bold text-sm uppercase tracking-wider">System Stock</th>
                      <th className="text-left py-4 px-6 text-gray-700 font-bold text-sm uppercase tracking-wider">Counted</th>
                      <th className="text-left py-4 px-6 text-gray-700 font-bold text-sm uppercase tracking-wider">Difference</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {filteredProducts.map((product) => {
                      const counted = stockTakeData[product.id] || product.stock || 0;
                      const difference = counted - (product.stock || 0);
                      return (
                        <tr key={product.id} className="hover:bg-blue-50 transition-colors">
                          <td className="py-4 px-6 text-gray-900 font-medium">{product.sku || product.id.substring(0, 8)}</td>
                          <td className="py-4 px-6 text-gray-900 font-semibold">{product.name}</td>
                          <td className="py-4 px-6">
                            <span className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm font-semibold">
                              {product.stock || 0}
                            </span>
                          </td>
                          <td className="py-4 px-6">
                            <input
                              type="number"
                              value={counted}
                              onChange={(e) => handleStockTake(product.id, e.target.value)}
                              className="w-28 px-3 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-black transition-all font-medium"
                            />
                          </td>
                          <td className={`py-4 px-6 font-bold text-lg ${
                            difference > 0 ? 'text-green-600' : difference < 0 ? 'text-red-600' : 'text-gray-600'
                          }`}>
                            {difference > 0 ? '+' : ''}{difference}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow-md overflow-hidden border border-gray-100">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gradient-to-r from-gray-50 to-gray-100">
                    <tr>
                      <th className="text-left py-4 px-6 text-gray-700 font-bold text-sm uppercase tracking-wider">SKU/Barcode</th>
                      <th className="text-left py-4 px-6 text-gray-700 font-bold text-sm uppercase tracking-wider">Name</th>
                      <th className="text-left py-4 px-6 text-gray-700 font-bold text-sm uppercase tracking-wider">Category</th>
                      <th className="text-left py-4 px-6 text-gray-700 font-bold text-sm uppercase tracking-wider">Price</th>
                      <th className="text-left py-4 px-6 text-gray-700 font-bold text-sm uppercase tracking-wider">Stock</th>
                      <th className="text-left py-4 px-6 text-gray-700 font-bold text-sm uppercase tracking-wider">Status</th>
                      <th className="text-left py-4 px-6 text-gray-700 font-bold text-sm uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {filteredProducts.length === 0 ? (
                      <tr>
                        <td colSpan="7" className="text-center py-16">
                          <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                          <p className="text-gray-500 font-medium text-lg">No products found</p>
                          <p className="text-gray-400 text-sm mt-2">Try adjusting your search or filters</p>
                          <button
                            onClick={handleAddProduct}
                            className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors flex items-center gap-2 mx-auto"
                          >
                            <Plus className="w-4 h-4" />
                            Add Your First Product
                          </button>
                        </td>
                      </tr>
                    ) : (
                      filteredProducts.map((product) => (
                        <tr key={product.id} className="hover:bg-blue-50 transition-colors duration-150">
                          <td className="py-4 px-6 text-gray-900 text-sm">
                            <div className="font-medium">{product.sku || 'N/A'}</div>
                            <div className="text-xs text-gray-500 mt-1">{product.barcode || 'No barcode'}</div>
                          </td>
                          <td className="py-4 px-6 text-gray-900 font-semibold">{product.name || 'Unnamed Product'}</td>
                          <td className="py-4 px-6">
                            <span className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-xs font-medium">
                              {product.category || 'Uncategorized'}
                            </span>
                          </td>
                          <td className="py-4 px-6 text-gray-900 font-semibold">₱{product.price?.toLocaleString() || '0.00'}</td>
                          <td className="py-4 px-6">
                            <span className={`px-3 py-1.5 rounded-full text-xs font-bold ${
                              isLowStock(product)
                                ? 'bg-red-100 text-red-800 border border-red-200'
                                : 'bg-green-100 text-green-800 border border-green-200'
                            }`}>
                              {product.stock || 0}
                            </span>
                          </td>
                          <td className="py-4 px-6">
                            {isLowStock(product) ? (
                              <span className="flex items-center gap-1.5 text-red-600 text-sm font-medium">
                                <AlertTriangle className="w-4 h-4" />
                                Low Stock
                              </span>
                            ) : (
                              <span className="flex items-center gap-1.5 text-green-600 text-sm font-medium">
                                <CheckCircle className="w-4 h-4" />
                                In Stock
                              </span>
                            )}
                          </td>
                          <td className="py-4 px-6">
                            <div className="flex gap-2">
                              <button
                                onClick={() => handleEditProduct(product)}
                                className="p-2 text-blue-600 hover:bg-blue-100 rounded-lg transition-colors"
                                title="Edit Product"
                              >
                                <Edit className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => {
                                  setSelectedProduct(product);
                                  setShowStockModal(true);
                                }}
                                className="p-2 text-green-600 hover:bg-green-100 rounded-lg transition-colors"
                                title="Stock Adjustment"
                              >
                                <Package className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleViewHistory(product)}
                                className="p-2 text-purple-600 hover:bg-purple-100 rounded-lg transition-colors"
                                title="View History"
                              >
                                <History className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleDeleteProduct(product)}
                                className="p-2 text-red-600 hover:bg-red-100 rounded-lg transition-colors"
                                title="Delete Product"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Product Add/Edit Modal */}
      {showProductModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto border border-gray-200">
            <div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-200">
              <h3 className="text-2xl font-bold text-gray-900">
                {isAddMode ? 'Add New Product' : 'Edit Product'}
              </h3>
              <button
                onClick={() => {
                  setShowProductModal(false);
                  setSelectedProduct(null);
                  setIsAddMode(false);
                }}
                className="text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-full p-1 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Product Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={productForm.name}
                  onChange={(e) => setProductForm({ ...productForm, name: e.target.value })}
                  placeholder="Enter product name"
                  className="w-full px-4 py-2.5 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-black transition-all"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  SKU <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={productForm.sku}
                  onChange={(e) => setProductForm({ ...productForm, sku: e.target.value })}
                  placeholder="Enter SKU"
                  className="w-full px-4 py-2.5 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-black transition-all"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Barcode</label>
                <input
                  type="text"
                  value={productForm.barcode}
                  onChange={(e) => setProductForm({ ...productForm, barcode: e.target.value })}
                  placeholder="Enter barcode (optional)"
                  className="w-full px-4 py-2.5 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-black transition-all"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Category <span className="text-red-500">*</span>
                </label>
                <select
                  value={productForm.category}
                  onChange={(e) => setProductForm({ ...productForm, category: e.target.value })}
                  className="w-full px-4 py-2.5 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-black transition-all"
                >
                  {(() => {
                    // Common categories that should always be available
                    const commonCategories = ['Beverages', 'Food Items', 'Personal Care', 'Household Items', 'Electronics', 'Others'];
                    // Get discovered categories (excluding 'All')
                    const discoveredCategories = categories.filter(c => c !== 'All');
                    // Combine and remove duplicates, keeping order: discovered first, then common
                    const allAvailableCategories = [...new Set([...discoveredCategories, ...commonCategories])];
                    return allAvailableCategories.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ));
                  })()}
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Supplier</label>
                <input
                  type="text"
                  value={productForm.supplier}
                  onChange={(e) => setProductForm({ ...productForm, supplier: e.target.value })}
                  placeholder="Enter supplier name"
                  className="w-full px-4 py-2.5 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-black transition-all"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Purchase Price</label>
                <input
                  type="number"
                  step="0.01"
                  value={productForm.purchasePrice}
                  onChange={(e) => setProductForm({ ...productForm, purchasePrice: parseFloat(e.target.value) || 0 })}
                  placeholder="0.00"
                  className="w-full px-4 py-2.5 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-black transition-all"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Selling Price <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={productForm.sellingPrice}
                  onChange={(e) => setProductForm({ ...productForm, sellingPrice: parseFloat(e.target.value) || 0 })}
                  placeholder="0.00"
                  className="w-full px-4 py-2.5 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-black transition-all"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Unit</label>
                <select
                  value={productForm.unit}
                  onChange={(e) => setProductForm({ ...productForm, unit: e.target.value })}
                  className="w-full px-4 py-2.5 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-black transition-all"
                >
                  <option value="pcs">Pieces</option>
                  <option value="box">Box</option>
                  <option value="pack">Pack</option>
                  <option value="kg">Kilogram</option>
                  <option value="g">Gram</option>
                  <option value="L">Liter</option>
                  <option value="mL">Milliliter</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Reorder Point</label>
                <input
                  type="number"
                  value={productForm.reorderPoint}
                  onChange={(e) => setProductForm({ ...productForm, reorderPoint: parseInt(e.target.value) || 0 })}
                  placeholder="10"
                  className="w-full px-4 py-2.5 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-black transition-all"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Initial Stock</label>
                <input
                  type="number"
                  value={productForm.stock}
                  onChange={(e) => setProductForm({ ...productForm, stock: parseInt(e.target.value) || 0 })}
                  placeholder="0"
                  className="w-full px-4 py-2.5 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-black transition-all"
                />
              </div>
              <div className="md:col-span-2">
                <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
                  <input
                    type="checkbox"
                    checked={productForm.vatIncluded}
                    onChange={(e) => setProductForm({ ...productForm, vatIncluded: e.target.checked })}
                    className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                  />
                  VAT Included
                </label>
                {productForm.vatIncluded && (
                  <input
                    type="number"
                    step="0.01"
                    value={productForm.vatRate}
                    onChange={(e) => setProductForm({ ...productForm, vatRate: parseFloat(e.target.value) || 12 })}
                    placeholder="VAT Rate (%)"
                    className="w-full px-4 py-2.5 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-black transition-all mt-2"
                  />
                )}
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-semibold text-gray-700 mb-2">Description</label>
                <textarea
                  value={productForm.description}
                  onChange={(e) => setProductForm({ ...productForm, description: e.target.value })}
                  rows="3"
                  placeholder="Enter product description (optional)"
                  className="w-full px-4 py-2.5 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-black transition-all resize-none"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-semibold text-gray-700 mb-2">Image URL</label>
                <input
                  type="url"
                  value={productForm.imageUrl}
                  onChange={(e) => setProductForm({ ...productForm, imageUrl: e.target.value })}
                  placeholder="https://example.com/image.jpg"
                  className="w-full px-4 py-2.5 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-black transition-all"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-8 pt-6 border-t border-gray-200">
              <button
                onClick={isAddMode ? handleSaveNewProduct : handleSaveProduct}
                className="flex-1 bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition-all duration-200 shadow-md hover:shadow-lg flex items-center justify-center gap-2"
              >
                <Save className="w-5 h-5" />
                {isAddMode ? 'Add Product' : 'Save Changes'}
              </button>
              <button
                onClick={() => {
                  setShowProductModal(false);
                  setSelectedProduct(null);
                  setIsAddMode(false);
                  setProductForm({
                    name: '',
                    sku: '',
                    barcode: '',
                    category: 'Beverages',
                    supplier: '',
                    purchasePrice: 0,
                    sellingPrice: 0,
                    vatIncluded: false,
                    vatRate: 12,
                    unit: 'pcs',
                    reorderPoint: 10,
                    stock: 0,
                    description: '',
                    imageUrl: '',
                  });
                }}
                className="flex-1 bg-gray-200 text-gray-700 py-3 rounded-lg font-medium hover:bg-gray-300 transition-all duration-200"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Stock Adjustment Modal */}
      {showStockModal && selectedProduct && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl p-6 max-w-md w-full mx-4 border border-gray-200">
            <div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-200">
              <h3 className="text-2xl font-bold text-gray-900">Stock Adjustment</h3>
              <button
                onClick={() => {
                  setShowStockModal(false);
                  setSelectedProduct(null);
                  setStockAdjustment({ type: 'in', quantity: 0, reason: '', customReason: '' });
                }}
                className="text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-full p-1 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
              <p className="font-semibold text-gray-900 text-lg">{selectedProduct.name}</p>
              <p className="text-sm text-gray-700 mt-2">
                Current Stock: <span className="font-bold text-blue-600 text-lg">{selectedProduct.stock || 0}</span>
              </p>
            </div>

            <div className="space-y-5">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-3">Adjustment Type</label>
                <div className="flex gap-4">
                  <label className="flex-1 flex items-center gap-3 p-4 border-2 rounded-lg cursor-pointer transition-all hover:bg-green-50 border-gray-300 hover:border-green-500" style={{ borderColor: stockAdjustment.type === 'in' ? '#10b981' : '#d1d5db' }}>
                    <input
                      type="radio"
                      value="in"
                      checked={stockAdjustment.type === 'in'}
                      onChange={(e) => setStockAdjustment({ ...stockAdjustment, type: e.target.value })}
                      className="w-5 h-5 text-green-600 focus:ring-green-500"
                    />
                    <span className="text-gray-900 flex items-center gap-2 font-medium">
                      <TrendingUp className="w-5 h-5 text-green-600" />
                      Stock In
                    </span>
                  </label>
                  <label className="flex-1 flex items-center gap-3 p-4 border-2 rounded-lg cursor-pointer transition-all hover:bg-red-50 border-gray-300 hover:border-red-500" style={{ borderColor: stockAdjustment.type === 'out' ? '#ef4444' : '#d1d5db' }}>
                    <input
                      type="radio"
                      value="out"
                      checked={stockAdjustment.type === 'out'}
                      onChange={(e) => setStockAdjustment({ ...stockAdjustment, type: e.target.value })}
                      className="w-5 h-5 text-red-600 focus:ring-red-500"
                    />
                    <span className="text-gray-900 flex items-center gap-2 font-medium">
                      <TrendingDown className="w-5 h-5 text-red-600" />
                      Stock Out
                    </span>
                  </label>
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Quantity <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  value={stockAdjustment.quantity}
                  onChange={(e) => setStockAdjustment({ ...stockAdjustment, quantity: parseInt(e.target.value) || 0 })}
                  min="1"
                  placeholder="Enter quantity"
                  className="w-full px-4 py-2.5 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-black transition-all"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Reason <span className="text-red-500">*</span>
                </label>
                <select
                  value={stockAdjustment.reason}
                  onChange={(e) => setStockAdjustment({ ...stockAdjustment, reason: e.target.value })}
                  className="w-full px-4 py-2.5 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-black transition-all"
                >
                  <option value="">Select reason...</option>
                  <option value="Received Shipment">Received Shipment</option>
                  <option value="Manual Adjustment">Manual Adjustment</option>
                  <option value="Damaged Goods">Damaged Goods</option>
                  <option value="Returned Items">Returned Items</option>
                  <option value="Stock Take">Stock Take</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              {stockAdjustment.reason === 'Other' && (
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Custom Reason</label>
                  <input
                    type="text"
                    value={stockAdjustment.customReason || ''}
                    onChange={(e) => setStockAdjustment({ ...stockAdjustment, customReason: e.target.value })}
                    placeholder="Enter custom reason"
                    className="w-full px-4 py-2.5 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-black transition-all"
                  />
                </div>
              )}
              <div className="bg-gradient-to-r from-blue-50 to-green-50 p-4 rounded-lg border-2 border-blue-200">
                <p className="text-sm text-gray-700 font-medium">
                  New Stock: <span className="font-bold text-lg text-blue-600">
                    {stockAdjustment.type === 'in'
                      ? (selectedProduct.stock || 0) + (stockAdjustment.quantity || 0)
                      : Math.max(0, (selectedProduct.stock || 0) - (stockAdjustment.quantity || 0))}
                  </span>
                </p>
              </div>
            </div>

            <div className="flex gap-3 mt-8 pt-6 border-t border-gray-200">
              <button
                onClick={handleStockAdjustment}
                className="flex-1 bg-green-600 text-white py-3 rounded-lg font-semibold hover:bg-green-700 transition-all duration-200 shadow-md hover:shadow-lg flex items-center justify-center gap-2"
              >
                <Save className="w-5 h-5" />
                Apply Adjustment
              </button>
              <button
                onClick={() => {
                  setShowStockModal(false);
                  setSelectedProduct(null);
                  setStockAdjustment({ type: 'in', quantity: 0, reason: '', customReason: '' });
                }}
                className="flex-1 bg-gray-200 text-gray-700 py-3 rounded-lg font-medium hover:bg-gray-300 transition-all duration-200"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* History Modal */}
      {showHistoryModal && selectedProduct && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl p-6 max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto border border-gray-200">
            <div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-200">
              <div>
                <h3 className="text-2xl font-bold text-gray-900">Stock History</h3>
                <p className="text-sm text-gray-600 mt-1">{selectedProduct.name}</p>
              </div>
              <button
                onClick={() => {
                  setShowHistoryModal(false);
                  setSelectedProduct(null);
                  setProductHistory([]);
                }}
                className="text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-full p-1 transition-colors"
                aria-label="Close history modal"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {productHistory.length === 0 ? (
              <div className="text-center py-12">
                <History className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500 font-medium text-lg">No history available</p>
                <p className="text-gray-400 text-sm mt-2">Stock adjustments will appear here</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gradient-to-r from-gray-50 to-gray-100">
                    <tr>
                      <th className="text-left py-3 px-4 text-gray-700 font-bold text-sm uppercase tracking-wider">Date</th>
                      <th className="text-left py-3 px-4 text-gray-700 font-bold text-sm uppercase tracking-wider">Type</th>
                      <th className="text-left py-3 px-4 text-gray-700 font-bold text-sm uppercase tracking-wider">Quantity</th>
                      <th className="text-left py-3 px-4 text-gray-700 font-bold text-sm uppercase tracking-wider">Previous</th>
                      <th className="text-left py-3 px-4 text-gray-700 font-bold text-sm uppercase tracking-wider">New</th>
                      <th className="text-left py-3 px-4 text-gray-700 font-bold text-sm uppercase tracking-wider">Reason</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {productHistory.map((entry, index) => {
                      const date = entry.timestamp ? new Date(entry.timestamp) : new Date();
                      return (
                        <tr key={index} className="hover:bg-blue-50 transition-colors">
                          <td className="py-3 px-4 text-gray-900 text-sm">
                            {date.toLocaleString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </td>
                          <td className="py-3 px-4">
                            <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                              entry.type === 'in'
                                ? 'bg-green-100 text-green-800 border border-green-200'
                                : 'bg-red-100 text-red-800 border border-red-200'
                            }`}>
                              {entry.type === 'in' ? 'Stock In' : 'Stock Out'}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-gray-900 text-sm font-semibold">{entry.quantity || 0}</td>
                          <td className="py-3 px-4 text-gray-600 text-sm">{entry.previousStock || 0}</td>
                          <td className="py-3 px-4 text-gray-900 text-sm font-bold">{entry.newStock || 0}</td>
                          <td className="py-3 px-4 text-gray-600 text-sm">{entry.reason || 'N/A'}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

