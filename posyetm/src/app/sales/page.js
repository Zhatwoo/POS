'use client';

import { useState, useEffect, useRef } from 'react';
import Navbar from '@/app/Components/Navbar';
import { updateNestedDocument, fetchAllProductsFromFirestore, addNestedDocument, discoverCategories } from '@/lib/firebase-helpers';
import { buildProductsPath, buildTransactionsPath } from '@/lib/firebase-config';
import { useUser } from '@/lib/user-context';
import { Search, Plus, Minus, Trash2, ShoppingCart, Barcode, X, CheckCircle } from 'lucide-react';

export default function SalesPage() {
  const [products, setProducts] = useState([]);
  const [cart, setCart] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [barcodeInput, setBarcodeInput] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [loading, setLoading] = useState(true);
  const [showCheckoutSuccess, setShowCheckoutSuccess] = useState(false);
  const [checkoutTotal, setCheckoutTotal] = useState(0);
  const barcodeInputRef = useRef(null);
  const [categories, setCategories] = useState(['All']); // Start with 'All', will be populated dynamically
  const { companyName, account, loading: userLoading } = useUser();

  useEffect(() => {
    // Wait for user context to load before fetching data
    if (userLoading || !companyName || !account) {
      setLoading(false);
      setProducts([]);
      setCategories(['All']);
      return;
    }

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

        // Use dynamic nested path: Company/{companyCode}/Account/{userId}/Products/categories/{category}/products
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
        
        // Fetch products using dynamic path only
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
        
        // Set products from Firestore
        setProducts(data);
      } catch (error) {
        console.error('Error fetching products:', error);
        setProducts([]);
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, [companyName, account, userLoading]);

  // Focus on barcode input when page loads
  useEffect(() => {
    if (barcodeInputRef.current) {
      barcodeInputRef.current.focus();
    }
  }, []);

  // Handle barcode scanning
  const handleBarcodeScan = (e) => {
    if (e.key === 'Enter' && barcodeInput.trim()) {
      const product = products.find(
        (p) =>
          p.barcode === barcodeInput.trim() ||
          p.sku === barcodeInput.trim() ||
          p.id === barcodeInput.trim()
      );

      if (product) {
        addToCart(product, 1);
        setBarcodeInput('');
      } else {
        alert('Product not found! Please search manually.');
        setBarcodeInput('');
      }
    }
  };

  // Add product to cart
  const addToCart = (product, quantity = 1) => {
    // Get current stock from products state (always up-to-date)
    const productInState = products.find((p) => p.id === product.id);
    const currentStock = productInState?.stock || product.stock || 0;
    const existingItem = cart.find((item) => item.id === product.id);

    if (existingItem) {
      // Update quantity if product already in cart
      const newQuantity = existingItem.quantity + quantity;
      if (newQuantity > currentStock) {
        alert(`Insufficient stock for ${product.name}. Available: ${currentStock}, Requested: ${newQuantity}`);
        return;
      }
      setCart(
        cart.map((item) =>
          item.id === product.id
            ? { 
                ...item, 
                quantity: newQuantity,
                subtotal: item.price * newQuantity,
              }
            : item
        )
      );
    } else {
      // Check stock before adding new product to cart
      if (quantity > currentStock) {
        alert(`Insufficient stock for ${product.name}. Available: ${currentStock}, Requested: ${quantity}`);
        return;
      }
      // Add new product to cart
      setCart([
        ...cart,
        {
          id: product.id,
          name: product.name,
          price: product.price || 0,
          stock: currentStock,
          quantity: quantity,
          subtotal: (product.price || 0) * quantity,
        },
      ]);
    }
  };

  // Update quantity in cart
  const updateQuantity = (productId, newQuantity) => {
    if (newQuantity <= 0) {
      removeFromCart(productId);
      return;
    }

    // Get current stock from products state (always up-to-date)
    const productInState = products.find((p) => p.id === productId);
    const currentStock = productInState?.stock || 999;

    setCart(
      cart.map((item) => {
        if (item.id === productId) {
          const updatedQuantity = Math.min(newQuantity, currentStock);
          if (updatedQuantity < newQuantity) {
            alert(`Insufficient stock. Maximum available: ${currentStock}`);
          }
          return {
            ...item,
            quantity: updatedQuantity,
            subtotal: item.price * updatedQuantity,
          };
        }
        return item;
      })
    );
  };

  // Remove product from cart
  const removeFromCart = (productId) => {
    setCart(cart.filter((item) => item.id !== productId));
  };

  // Calculate total
  const calculateTotal = () => {
    return cart.reduce((sum, item) => sum + item.subtotal, 0);
  };

  // Download receipt
  const printReceipt = (cartItems, total, orderId) => {
    const now = new Date();
    const dateTime = now.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
    const invoiceNumber = orderId || `INV-${Date.now().toString().slice(-8)}`;

    // Create receipt content (plain text format for download)
    const receiptContent = `
========================================
          POSYSTEM
     Point of Sale System
          RECEIPT
========================================

Invoice #: ${invoiceNumber}
Date: ${dateTime}
Cashier: System
Customer: Walk-in Customer

----------------------------------------
ITEMS
----------------------------------------
${cartItems.map(item => 
  `${item.name}
  ${item.quantity} x ₱${item.price.toLocaleString()} = ₱${item.subtotal.toLocaleString()}`
).join('\n\n')}

----------------------------------------
TOTAL: ₱${total.toLocaleString()}
Payment: Cash
Change: ₱0.00
----------------------------------------

Thank you for your purchase!
Please come again

========================================
    `.trim();

    // Create blob and download
    const blob = new Blob([receiptContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Receipt_${invoiceNumber}_${now.toISOString().split('T')[0]}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Filter products for search and category
  const filteredProducts = products.filter((product) => {
    // Category filter
    const matchesCategory = selectedCategory === 'All' || product.category === selectedCategory;
    
    // Search filter
    const matchesSearch = 
      product.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.sku?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.barcode?.toLowerCase().includes(searchTerm.toLowerCase());
    
    return matchesCategory && matchesSearch;
  });

  // Handle checkout
  const handleCheckout = async () => {
    // Verify companyName and account before any write operation
    if (!companyName || !account) {
      alert('Company name or account not available. Cannot complete checkout.');
      return;
    }

    if (cart.length === 0) {
      alert('Cart is empty!');
      return;
    }

    // Validate stock before checkout
    for (const item of cart) {
      const product = products.find((p) => p.id === item.id);
      if (!product) {
        alert(`Product ${item.name} not found!`);
        return;
      }
      const currentStock = product.stock || 0;
      if (item.quantity > currentStock) {
        alert(`Insufficient stock for ${item.name}. Available: ${currentStock}, Requested: ${item.quantity}`);
        return;
      }
    }

    try {
      const total = calculateTotal();
      
      // Generate orderId locally (using timestamp and random string)
      const orderId = `ORD-${Date.now()}-${Math.random().toString(36).substring(2, 9).toUpperCase()}`;

      // Create transaction in nested path: Company/{companyCode}/Account/{userId}/Transactions/transactions
      const transactionsPath = buildTransactionsPath(companyName, account);
      await addNestedDocument(transactionsPath, {
        orderId: orderId,
        items: cart.map((item) => ({
          productId: item.id,
          name: item.name,
          price: item.price,
          quantity: item.quantity,
          subtotal: item.subtotal,
        })),
        amount: total,
        paymentMethod: 'Cash',
        status: 'completed',
        customerName: 'Walk-in Customer',
        cashier: 'System',
        createdAt: new Date().toISOString(),
        timestamp: new Date(),
      });

      // Update stock for each product in cart
      const updatedProducts = [...products];
      for (const item of cart) {
        const productIndex = updatedProducts.findIndex((p) => p.id === item.id);
        if (productIndex !== -1) {
          const currentStock = updatedProducts[productIndex].stock || 0;
          const newStock = Math.max(0, currentStock - item.quantity);
          
          // Update local state
          updatedProducts[productIndex] = {
            ...updatedProducts[productIndex],
            stock: newStock,
          };

          // Update in Firebase if product exists in Firebase (not dummy)
          // Check if product has fromFirebase flag or if it has a category
          const product = updatedProducts[productIndex];
          if (product.category) {
            try {
              const categoryPath = buildProductsPath(product.category, companyName, account);
              await updateNestedDocument(categoryPath, item.id, {
                stock: newStock,
              });
            } catch (updateError) {
              // If update fails, just log and continue
              console.log(`Failed to update product ${item.id} in Firebase:`, updateError.message);
            }
          }
        }
      }

      // Update products state with new stock
      setProducts(updatedProducts);

      // Store total for success notification
      setCheckoutTotal(total);

      // Store cart items for receipt (before clearing)
      const receiptCart = [...cart];

      // Clear cart
      setCart([]);
      
      // Show success notification (sliding modal)
      setShowCheckoutSuccess(true);
      
      // Print receipt automatically
      printReceipt(receiptCart, total, orderId);
      
      // Auto-hide after 1 second
      setTimeout(() => {
        setShowCheckoutSuccess(false);
      }, 1000);
    } catch (error) {
      console.error('Error during checkout:', error);
      alert('Error processing sale. Please try again.');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="p-6 w-full">
        <div className="w-full">
          <div className="mb-6">
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[calc(100vh-12rem)]">
            {/* Left Side - Product Search & Selection */}
            <div className="lg:col-span-2 flex flex-col space-y-4">
              {/* Green Box Area - Search & SKU Scanner */}
              <div className="bg-white rounded-lg shadow-md p-4 space-y-4">
                {/* Category Tabs */}
                <div className="border-b border-gray-200">
                  <div className="flex flex-wrap gap-2">
                    {categories.map((category) => (
                      <button
                        key={category}
                        onClick={() => setSelectedCategory(category)}
                        className={`px-4 py-2 text-sm font-medium transition-colors ${
                          selectedCategory === category
                            ? 'border-b-2 border-blue-600 text-blue-600 font-semibold'
                            : 'text-gray-600 hover:text-gray-900 hover:border-b-2 hover:border-gray-300'
                        }`}
                      >
                        {category}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Search Inputs */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Barcode Scanner Input */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      <Barcode className="w-4 h-4 inline mr-2" />
                      Scan Barcode / Enter SKU
                    </label>
                    <input
                      ref={barcodeInputRef}
                      type="text"
                      value={barcodeInput}
                      onChange={(e) => setBarcodeInput(e.target.value)}
                      onKeyPress={handleBarcodeScan}
                      placeholder="Scan barcode or enter SKU and press Enter"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-lg text-black"
                    />
                  </div>

                  {/* Product Search */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      <Search className="w-4 h-4 inline mr-2" />
                      Search Products
                    </label>
                    <input
                      type="text"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      placeholder="Search by name, SKU, or barcode..."
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-black"
                    />
                  </div>
                </div>
              </div>

              {/* Red Box Area - Available Products */}
              <div className="bg-white rounded-lg shadow-md p-4 flex-1 flex flex-col min-h-0">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Available Products</h2>
                {loading ? (
                  <p className="text-center py-8 text-gray-500">Loading products...</p>
                ) : filteredProducts.length > 0 ? (
                  <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-12 gap-2 flex-1 overflow-y-auto">
                    {filteredProducts.map((product) => (
                      <button
                        key={product.id}
                        onClick={() => addToCart(product, 1)}
                        className="p-2 border border-gray-200 rounded-lg hover:bg-blue-50 hover:border-blue-300 text-center transition aspect-square flex flex-col items-center justify-center"
                      >
                        <p className="font-semibold text-xs text-gray-900 truncate w-full">
                          {product.name || 'Unnamed Product'}
                        </p>
                        <p className="text-xs font-bold text-blue-600 mt-1">
                          ₱{product.price?.toLocaleString() || '0.00'}
                        </p>
                        {product.stock !== undefined && (
                          <p className="text-xs text-gray-500 mt-1">
                            Stock: {product.stock || 0}
                          </p>
                        )}
                      </button>
                    ))}
                  </div>
                ) : (
                  <p className="text-center py-8 text-gray-500">
                    {searchTerm ? 'No products found' : 'No products available'}
                  </p>
                )}
              </div>
            </div>

            {/* Right Side - Shopping Cart */}
            <div className="lg:col-span-1 relative">
              <div className="bg-white rounded-lg shadow-md p-6 sticky top-6">
                <div className="flex items-center gap-2 mb-4">
                  <ShoppingCart className="w-5 h-5 text-black" />
                  <h2 className="text-xl font-bold text-black">Shopping Cart</h2>
                </div>

                {cart.length === 0 ? (
                  <div className="text-center py-12">
                    <ShoppingCart className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <p className="text-black">Cart is empty</p>
                    <p className="text-sm text-black mt-2">
                      Scan or search products to add items
                    </p>
                  </div>
                ) : (
                  <>
                    <div className="space-y-3 mb-4 max-h-96 overflow-y-auto">
                      {cart.map((item) => (
                        <div
                          key={item.id}
                          className="border border-gray-200 rounded-lg p-3 bg-gray-50"
                        >
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex-1">
                              <p className="font-semibold text-sm text-black">{item.name}</p>
                              <p className="text-xs text-black">
                                ₱{item.price.toLocaleString()} each
                              </p>
                            </div>
                            <button
                              onClick={() => removeFromCart(item.id)}
                              className="text-red-500 hover:text-red-700"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>

                          <div className="flex items-center justify-between mt-2">
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => updateQuantity(item.id, item.quantity - 1)}
                                className="w-8 h-8 flex items-center justify-center border border-gray-300 rounded hover:bg-gray-200 text-black"
                              >
                                <Minus className="w-4 h-4" />
                              </button>
                              <input
                                type="number"
                                value={item.quantity}
                                onChange={(e) =>
                                  updateQuantity(item.id, parseInt(e.target.value) || 0)
                                }
                                min="1"
                                max={item.stock || 999}
                                className="w-16 px-2 py-1 text-center border border-gray-300 rounded text-sm text-black"
                              />
                              <button
                                onClick={() => updateQuantity(item.id, item.quantity + 1)}
                                className="w-8 h-8 flex items-center justify-center border border-gray-300 rounded hover:bg-gray-200 text-black"
                              >
                                <Plus className="w-4 h-4" />
                              </button>
                            </div>
                            <p className="font-semibold text-black">
                              ₱{item.subtotal.toLocaleString()}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="border-t border-gray-200 pt-4 mt-4">
                      <div className="flex justify-between items-center mb-4">
                        <span className="text-lg font-semibold text-black">Total:</span>
                        <span className="text-2xl font-bold text-black">
                          ₱{calculateTotal().toLocaleString()}
                        </span>
                      </div>

                      <button
                        onClick={handleCheckout}
                        className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
                      >
                        Checkout
                      </button>

                      <button
                        onClick={() => setCart([])}
                        className="w-full mt-2 bg-gray-200 text-black py-2 rounded-lg font-medium hover:bg-gray-300 transition-colors"
                      >
                        Clear Cart
                      </button>
                    </div>
                  </>
                )}
              </div>

              {/* Checkout Success Notification - Sliding Modal (Red Box Area) */}
              {showCheckoutSuccess && (
                <div
                  className="absolute inset-0 bg-green-50 border-2 border-green-500 rounded-lg shadow-2xl p-6 z-50 flex flex-col items-center justify-center"
                  style={{
                    animation: 'slideInFromRight 0.5s ease-out',
                  }}
                >
                  <button
                    onClick={() => setShowCheckoutSuccess(false)}
                    className="absolute top-4 right-4 text-gray-500 hover:text-gray-700"
                  >
                    <X className="w-5 h-5" />
                  </button>
                  
                  <div className="flex flex-col items-center justify-center text-center">
                    <div className="bg-green-500 rounded-full p-4 mb-4">
                      <CheckCircle className="w-16 h-16 text-white" />
                    </div>
                    
                    <h3 className="text-2xl font-bold text-gray-900 mb-2">
                      Checkout Successful!
                    </h3>
                    
                    <p className="text-lg text-gray-700 mb-4">
                      Sale completed successfully
                    </p>
                    
                    <div className="bg-white rounded-lg p-4 w-full max-w-xs">
                      <p className="text-sm text-gray-600 mb-1">Total Amount</p>
                      <p className="text-3xl font-bold text-green-600">
                        ₱{checkoutTotal.toLocaleString()}
                      </p>
                    </div>
                    
                    <p className="text-sm text-gray-500 mt-4">
                      This notification will close automatically
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
