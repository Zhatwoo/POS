'use client';

import { useState, useEffect, useRef } from 'react';
import Navbar from '@/app/Components/Navbar';
import { getCollection, addDocument, updateDocument } from '@/lib/firebase-helpers';
import { Search, Plus, Minus, Trash2, ShoppingCart, Barcode, X } from 'lucide-react';

export default function SalesPage() {
  const [products, setProducts] = useState([]);
  const [cart, setCart] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [barcodeInput, setBarcodeInput] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [showProductModal, setShowProductModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [manualQuantity, setManualQuantity] = useState(1);
  const [loading, setLoading] = useState(true);
  const barcodeInputRef = useRef(null);

  const categories = ['All', 'Beverages', 'Food Items', 'Personal Care', 'Household Items', 'Electronics', 'Others'];

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const data = await getCollection('products');
        
        // Add dummy products if no products from Firebase
        if (data.length === 0) {
          const dummyProducts = [
            // Beverages
            { id: '1', name: 'Coca Cola', price: 25, stock: 50, sku: 'COKE001', barcode: '1234567890', category: 'Beverages' },
            { id: '2', name: 'Pepsi', price: 25, stock: 45, sku: 'PEPSI001', barcode: '1234567891', category: 'Beverages' },
            { id: '3', name: 'Sprite', price: 25, stock: 40, sku: 'SPRITE001', barcode: '1234567892', category: 'Beverages' },
            { id: '4', name: 'Royal', price: 25, stock: 35, sku: 'ROYAL001', barcode: '1234567893', category: 'Beverages' },
            { id: '5', name: 'Mountain Dew', price: 25, stock: 30, sku: 'MTDEW001', barcode: '1234567894', category: 'Beverages' },
            { id: '6', name: 'Coke Zero', price: 28, stock: 25, sku: 'COKEZ001', barcode: '1234567895', category: 'Beverages' },
            { id: '7', name: 'Pepsi Max', price: 28, stock: 20, sku: 'PEPMAX001', barcode: '1234567896', category: 'Beverages' },
            { id: '8', name: '7-Up', price: 25, stock: 15, sku: '7UP001', barcode: '1234567897', category: 'Beverages' },
            { id: '9', name: 'Mirinda', price: 25, stock: 10, sku: 'MIR001', barcode: '1234567898', category: 'Beverages' },
            { id: '10', name: 'Fanta', price: 25, stock: 8, sku: 'FANTA001', barcode: '1234567899', category: 'Beverages' },
            { id: '11', name: 'Red Bull', price: 75, stock: 50, sku: 'RB001', barcode: '1234567900', category: 'Beverages' },
            { id: '12', name: 'Monster', price: 85, stock: 45, sku: 'MON001', barcode: '1234567901', category: 'Beverages' },
            { id: '13', name: 'Gatorade', price: 45, stock: 40, sku: 'GAT001', barcode: '1234567902', category: 'Beverages' },
            { id: '14', name: 'Powerade', price: 45, stock: 35, sku: 'POW001', barcode: '1234567903', category: 'Beverages' },
            { id: '19', name: 'C2 Green Tea', price: 30, stock: 10, sku: 'C2001', barcode: '1234567908', category: 'Beverages' },
            { id: '20', name: 'Nestea', price: 30, stock: 8, sku: 'NESTEA001', barcode: '1234567909', category: 'Beverages' },
            { id: '21', name: 'Lipton', price: 32, stock: 50, sku: 'LIP001', barcode: '1234567910', category: 'Beverages' },
            { id: '22', name: 'Sting', price: 30, stock: 45, sku: 'STING001', barcode: '1234567911', category: 'Beverages' },
            { id: '23', name: 'Cobra', price: 30, stock: 40, sku: 'COB001', barcode: '1234567912', category: 'Beverages' },
            { id: '24', name: 'Cobra Energy', price: 35, stock: 35, sku: 'COBE001', barcode: '1234567913', category: 'Beverages' },
            { id: '25', name: 'Cobra Gold', price: 40, stock: 30, sku: 'COBG001', barcode: '1234567914', category: 'Beverages' },
            { id: '26', name: 'Cobra Silver', price: 38, stock: 25, sku: 'COBS001', barcode: '1234567915', category: 'Beverages' },
            { id: '27', name: 'Cobra Platinum', price: 45, stock: 20, sku: 'COBP001', barcode: '1234567916', category: 'Beverages' },
            { id: '28', name: 'Cobra Diamond', price: 50, stock: 15, sku: 'COBD001', barcode: '1234567917', category: 'Beverages' },
            { id: '29', name: 'Cobra Titanium', price: 55, stock: 10, sku: 'COBT001', barcode: '1234567918', category: 'Beverages' },
            { id: '30', name: 'Cobra Ultimate', price: 60, stock: 8, sku: 'COBU001', barcode: '1234567919', category: 'Beverages' },
            // Food Items
            { id: '31', name: 'Lucky Me Pancit Canton', price: 15, stock: 100, sku: 'LMPC001', barcode: '1234567920', category: 'Food Items' },
            { id: '32', name: 'Lucky Me Beef Noodles', price: 15, stock: 95, sku: 'LMBN001', barcode: '1234567921', category: 'Food Items' },
            { id: '33', name: 'Lucky Me Chicken Noodles', price: 15, stock: 90, sku: 'LMCN001', barcode: '1234567922', category: 'Food Items' },
            { id: '34', name: 'Nissin Cup Noodles', price: 35, stock: 80, sku: 'NCN001', barcode: '1234567923', category: 'Food Items' },
            { id: '35', name: 'Sky Flakes', price: 25, stock: 75, sku: 'SF001', barcode: '1234567924', category: 'Food Items' },
            { id: '36', name: 'Fita Biscuits', price: 30, stock: 70, sku: 'FB001', barcode: '1234567925', category: 'Food Items' },
            { id: '37', name: 'Rebisco Crackers', price: 28, stock: 65, sku: 'RC001', barcode: '1234567926', category: 'Food Items' },
            { id: '38', name: 'Oreo Cookies', price: 45, stock: 60, sku: 'OC001', barcode: '1234567927', category: 'Food Items' },
            // Personal Care
            { id: '39', name: 'Safeguard Soap', price: 35, stock: 50, sku: 'SGS001', barcode: '1234567928', category: 'Personal Care' },
            { id: '40', name: 'Dove Soap', price: 45, stock: 45, sku: 'DS001', barcode: '1234567929', category: 'Personal Care' },
            { id: '41', name: 'Colgate Toothpaste', price: 55, stock: 40, sku: 'CT001', barcode: '1234567930', category: 'Personal Care' },
            { id: '42', name: 'Crest Toothpaste', price: 60, stock: 35, sku: 'CRT001', barcode: '1234567931', category: 'Personal Care' },
            { id: '43', name: 'Head & Shoulders Shampoo', price: 120, stock: 30, sku: 'HSS001', barcode: '1234567932', category: 'Personal Care' },
            { id: '44', name: 'Pantene Shampoo', price: 110, stock: 25, sku: 'PS001', barcode: '1234567933', category: 'Personal Care' },
            { id: '45', name: 'Sunsilk Shampoo', price: 100, stock: 20, sku: 'SS001', barcode: '1234567934', category: 'Personal Care' },
            // Household Items
            { id: '46', name: 'Tide Detergent', price: 85, stock: 40, sku: 'TD001', barcode: '1234567935', category: 'Household Items' },
            { id: '47', name: 'Ariel Detergent', price: 90, stock: 35, sku: 'AD001', barcode: '1234567936', category: 'Household Items' },
            { id: '48', name: 'Downy Fabric Softener', price: 75, stock: 30, sku: 'DFS001', barcode: '1234567937', category: 'Household Items' },
            { id: '49', name: 'Zonrox Bleach', price: 40, stock: 25, sku: 'ZB001', barcode: '1234567938', category: 'Household Items' },
            { id: '50', name: 'Mr. Muscle Cleaner', price: 95, stock: 20, sku: 'MMC001', barcode: '1234567939', category: 'Household Items' },
            { id: '51', name: 'Glade Air Freshener', price: 65, stock: 15, sku: 'GAF001', barcode: '1234567940', category: 'Household Items' },
            // Electronics
            { id: '52', name: 'AA Batteries', price: 50, stock: 60, sku: 'AAB001', barcode: '1234567941', category: 'Electronics' },
            { id: '53', name: 'AAA Batteries', price: 45, stock: 55, sku: 'AAAB001', barcode: '1234567942', category: 'Electronics' },
            { id: '54', name: 'USB Cable', price: 120, stock: 40, sku: 'USBC001', barcode: '1234567943', category: 'Electronics' },
            { id: '55', name: 'Phone Charger', price: 150, stock: 35, sku: 'PC001', barcode: '1234567944', category: 'Electronics' },
            { id: '56', name: 'LED Bulb', price: 80, stock: 30, sku: 'LED001', barcode: '1234567945', category: 'Electronics' },
            // Others
            { id: '15', name: 'Vitamilk', price: 35, stock: 30, sku: 'VITA001', barcode: '1234567904', category: 'Others' },
            { id: '16', name: 'Bear Brand', price: 40, stock: 25, sku: 'BEAR001', barcode: '1234567905', category: 'Others' },
            { id: '17', name: 'Nestle Milk', price: 38, stock: 20, sku: 'NEST001', barcode: '1234567906', category: 'Others' },
            { id: '18', name: 'Alaska Milk', price: 36, stock: 15, sku: 'ALAS001', barcode: '1234567907', category: 'Others' },
          ];
          setProducts(dummyProducts);
        } else {
          setProducts(data);
        }
      } catch (error) {
        console.error('Error fetching products:', error);
        // Add dummy products on error (same as above with categories)
        const dummyProducts = [
          // Beverages
          { id: '1', name: 'Coca Cola', price: 25, stock: 50, sku: 'COKE001', barcode: '1234567890', category: 'Beverages' },
          { id: '2', name: 'Pepsi', price: 25, stock: 45, sku: 'PEPSI001', barcode: '1234567891', category: 'Beverages' },
          { id: '3', name: 'Sprite', price: 25, stock: 40, sku: 'SPRITE001', barcode: '1234567892', category: 'Beverages' },
          { id: '4', name: 'Royal', price: 25, stock: 35, sku: 'ROYAL001', barcode: '1234567893', category: 'Beverages' },
          { id: '5', name: 'Mountain Dew', price: 25, stock: 30, sku: 'MTDEW001', barcode: '1234567894', category: 'Beverages' },
          { id: '6', name: 'Coke Zero', price: 28, stock: 25, sku: 'COKEZ001', barcode: '1234567895', category: 'Beverages' },
          { id: '7', name: 'Pepsi Max', price: 28, stock: 20, sku: 'PEPMAX001', barcode: '1234567896', category: 'Beverages' },
          { id: '8', name: '7-Up', price: 25, stock: 15, sku: '7UP001', barcode: '1234567897', category: 'Beverages' },
          { id: '9', name: 'Mirinda', price: 25, stock: 10, sku: 'MIR001', barcode: '1234567898', category: 'Beverages' },
          { id: '10', name: 'Fanta', price: 25, stock: 8, sku: 'FANTA001', barcode: '1234567899', category: 'Beverages' },
          { id: '11', name: 'Red Bull', price: 75, stock: 50, sku: 'RB001', barcode: '1234567900', category: 'Beverages' },
          { id: '12', name: 'Monster', price: 85, stock: 45, sku: 'MON001', barcode: '1234567901', category: 'Beverages' },
          { id: '13', name: 'Gatorade', price: 45, stock: 40, sku: 'GAT001', barcode: '1234567902', category: 'Beverages' },
          { id: '14', name: 'Powerade', price: 45, stock: 35, sku: 'POW001', barcode: '1234567903', category: 'Beverages' },
          { id: '19', name: 'C2 Green Tea', price: 30, stock: 10, sku: 'C2001', barcode: '1234567908', category: 'Beverages' },
          { id: '20', name: 'Nestea', price: 30, stock: 8, sku: 'NESTEA001', barcode: '1234567909', category: 'Beverages' },
          { id: '21', name: 'Lipton', price: 32, stock: 50, sku: 'LIP001', barcode: '1234567910', category: 'Beverages' },
          { id: '22', name: 'Sting', price: 30, stock: 45, sku: 'STING001', barcode: '1234567911', category: 'Beverages' },
          { id: '23', name: 'Cobra', price: 30, stock: 40, sku: 'COB001', barcode: '1234567912', category: 'Beverages' },
          { id: '24', name: 'Cobra Energy', price: 35, stock: 35, sku: 'COBE001', barcode: '1234567913', category: 'Beverages' },
          { id: '25', name: 'Cobra Gold', price: 40, stock: 30, sku: 'COBG001', barcode: '1234567914', category: 'Beverages' },
          { id: '26', name: 'Cobra Silver', price: 38, stock: 25, sku: 'COBS001', barcode: '1234567915', category: 'Beverages' },
          { id: '27', name: 'Cobra Platinum', price: 45, stock: 20, sku: 'COBP001', barcode: '1234567916', category: 'Beverages' },
          { id: '28', name: 'Cobra Diamond', price: 50, stock: 15, sku: 'COBD001', barcode: '1234567917', category: 'Beverages' },
          { id: '29', name: 'Cobra Titanium', price: 55, stock: 10, sku: 'COBT001', barcode: '1234567918', category: 'Beverages' },
          { id: '30', name: 'Cobra Ultimate', price: 60, stock: 8, sku: 'COBU001', barcode: '1234567919', category: 'Beverages' },
          // Food Items
          { id: '31', name: 'Lucky Me Pancit Canton', price: 15, stock: 100, sku: 'LMPC001', barcode: '1234567920', category: 'Food Items' },
          { id: '32', name: 'Lucky Me Beef Noodles', price: 15, stock: 95, sku: 'LMBN001', barcode: '1234567921', category: 'Food Items' },
          { id: '33', name: 'Lucky Me Chicken Noodles', price: 15, stock: 90, sku: 'LMCN001', barcode: '1234567922', category: 'Food Items' },
          { id: '34', name: 'Nissin Cup Noodles', price: 35, stock: 80, sku: 'NCN001', barcode: '1234567923', category: 'Food Items' },
          { id: '35', name: 'Sky Flakes', price: 25, stock: 75, sku: 'SF001', barcode: '1234567924', category: 'Food Items' },
          { id: '36', name: 'Fita Biscuits', price: 30, stock: 70, sku: 'FB001', barcode: '1234567925', category: 'Food Items' },
          { id: '37', name: 'Rebisco Crackers', price: 28, stock: 65, sku: 'RC001', barcode: '1234567926', category: 'Food Items' },
          { id: '38', name: 'Oreo Cookies', price: 45, stock: 60, sku: 'OC001', barcode: '1234567927', category: 'Food Items' },
          // Personal Care
          { id: '39', name: 'Safeguard Soap', price: 35, stock: 50, sku: 'SGS001', barcode: '1234567928', category: 'Personal Care' },
          { id: '40', name: 'Dove Soap', price: 45, stock: 45, sku: 'DS001', barcode: '1234567929', category: 'Personal Care' },
          { id: '41', name: 'Colgate Toothpaste', price: 55, stock: 40, sku: 'CT001', barcode: '1234567930', category: 'Personal Care' },
          { id: '42', name: 'Crest Toothpaste', price: 60, stock: 35, sku: 'CRT001', barcode: '1234567931', category: 'Personal Care' },
          { id: '43', name: 'Head & Shoulders Shampoo', price: 120, stock: 30, sku: 'HSS001', barcode: '1234567932', category: 'Personal Care' },
          { id: '44', name: 'Pantene Shampoo', price: 110, stock: 25, sku: 'PS001', barcode: '1234567933', category: 'Personal Care' },
          { id: '45', name: 'Sunsilk Shampoo', price: 100, stock: 20, sku: 'SS001', barcode: '1234567934', category: 'Personal Care' },
          // Household Items
          { id: '46', name: 'Tide Detergent', price: 85, stock: 40, sku: 'TD001', barcode: '1234567935', category: 'Household Items' },
          { id: '47', name: 'Ariel Detergent', price: 90, stock: 35, sku: 'AD001', barcode: '1234567936', category: 'Household Items' },
          { id: '48', name: 'Downy Fabric Softener', price: 75, stock: 30, sku: 'DFS001', barcode: '1234567937', category: 'Household Items' },
          { id: '49', name: 'Zonrox Bleach', price: 40, stock: 25, sku: 'ZB001', barcode: '1234567938', category: 'Household Items' },
          { id: '50', name: 'Mr. Muscle Cleaner', price: 95, stock: 20, sku: 'MMC001', barcode: '1234567939', category: 'Household Items' },
          { id: '51', name: 'Glade Air Freshener', price: 65, stock: 15, sku: 'GAF001', barcode: '1234567940', category: 'Household Items' },
          // Electronics
          { id: '52', name: 'AA Batteries', price: 50, stock: 60, sku: 'AAB001', barcode: '1234567941', category: 'Electronics' },
          { id: '53', name: 'AAA Batteries', price: 45, stock: 55, sku: 'AAAB001', barcode: '1234567942', category: 'Electronics' },
          { id: '54', name: 'USB Cable', price: 120, stock: 40, sku: 'USBC001', barcode: '1234567943', category: 'Electronics' },
          { id: '55', name: 'Phone Charger', price: 150, stock: 35, sku: 'PC001', barcode: '1234567944', category: 'Electronics' },
          { id: '56', name: 'LED Bulb', price: 80, stock: 30, sku: 'LED001', barcode: '1234567945', category: 'Electronics' },
          // Others
          { id: '15', name: 'Vitamilk', price: 35, stock: 30, sku: 'VITA001', barcode: '1234567904', category: 'Others' },
          { id: '16', name: 'Bear Brand', price: 40, stock: 25, sku: 'BEAR001', barcode: '1234567905', category: 'Others' },
          { id: '17', name: 'Nestle Milk', price: 38, stock: 20, sku: 'NEST001', barcode: '1234567906', category: 'Others' },
          { id: '18', name: 'Alaska Milk', price: 36, stock: 15, sku: 'ALAS001', barcode: '1234567907', category: 'Others' },
        ];
        setProducts(dummyProducts);
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, []);

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

  // Handle manual product selection
  const handleManualAdd = () => {
    if (selectedProduct) {
      addToCart(selectedProduct, manualQuantity);
      setShowProductModal(false);
      setSelectedProduct(null);
      setManualQuantity(1);
    }
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
      const orderData = {
        items: cart.map((item) => ({
          productId: item.id,
          name: item.name,
          price: item.price,
          quantity: item.quantity,
          subtotal: item.subtotal,
        })),
        total: total,
        status: 'completed',
        createdAt: new Date().toISOString(),
      };

      // Create order
      const orderId = await addDocument('orders', orderData);

      // Create transaction
      await addDocument('transactions', {
        orderId: orderId,
        amount: total,
        paymentMethod: 'Cash',
        status: 'completed',
        createdAt: new Date().toISOString(),
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
          // Check if product has a Firebase ID (dummy products have simple IDs like '1', '2', etc.)
          // Firebase IDs are typically longer alphanumeric strings
          // For now, we'll try to update all products - if it fails for dummy products, that's okay
          try {
            await updateDocument('products', item.id, {
              stock: newStock,
            });
          } catch (updateError) {
            // If update fails (e.g., dummy product not in Firebase), just log and continue
            console.log(`Product ${item.id} not in Firebase, updating local state only`);
          }
        }
      }

      // Update products state with new stock
      setProducts(updatedProducts);

      // Clear cart
      setCart([]);
      alert('Sale completed successfully!');
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
            <h1 className="text-3xl font-bold text-gray-900">POS / Sales</h1>
            <p className="text-gray-600 mt-2">Scan or search products to add to cart</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Side - Product Search & Selection */}
            <div className="lg:col-span-2 space-y-4">
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
              <div className="bg-white rounded-lg shadow-md p-4">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Available Products</h2>
                {loading ? (
                  <p className="text-center py-8 text-gray-500">Loading products...</p>
                ) : filteredProducts.length > 0 ? (
                  <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-12 gap-2 max-h-96 overflow-y-auto">
                    {filteredProducts.map((product) => (
                      <button
                        key={product.id}
                        onClick={() => {
                          setSelectedProduct(product);
                          setShowProductModal(true);
                        }}
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
            <div className="lg:col-span-1">
              <div className="bg-white rounded-lg shadow-md p-6 sticky top-6">
                <div className="flex items-center gap-2 mb-4">
                  <ShoppingCart className="w-5 h-5 text-blue-500" />
                  <h2 className="text-xl font-bold text-gray-900">Shopping Cart</h2>
                </div>

                {cart.length === 0 ? (
                  <div className="text-center py-12">
                    <ShoppingCart className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-500">Cart is empty</p>
                    <p className="text-sm text-gray-400 mt-2">
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
                              <p className="font-semibold text-sm text-gray-900">{item.name}</p>
                              <p className="text-xs text-gray-500">
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
                                className="w-8 h-8 flex items-center justify-center border border-gray-300 rounded hover:bg-gray-200"
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
                                className="w-8 h-8 flex items-center justify-center border border-gray-300 rounded hover:bg-gray-200"
                              >
                                <Plus className="w-4 h-4" />
                              </button>
                            </div>
                            <p className="font-semibold text-gray-900">
                              ₱{item.subtotal.toLocaleString()}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="border-t border-gray-200 pt-4 mt-4">
                      <div className="flex justify-between items-center mb-4">
                        <span className="text-lg font-semibold text-gray-900">Total:</span>
                        <span className="text-2xl font-bold text-blue-600">
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
                        className="w-full mt-2 bg-gray-200 text-gray-700 py-2 rounded-lg font-medium hover:bg-gray-300 transition-colors"
                      >
                        Clear Cart
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Manual Product Entry Modal */}
      {showProductModal && selectedProduct && (
        <div className="fixed inset-0 bg-white/30 backdrop-blur-md flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-black">Add Product</h3>
              <button
                onClick={() => {
                  setShowProductModal(false);
                  setSelectedProduct(null);
                }}
                className="text-black hover:text-gray-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mb-4">
              <p className="font-semibold text-black">{selectedProduct.name}</p>
              <p className="text-sm text-black mt-1">
                Price: ₱{selectedProduct.price?.toLocaleString() || '0.00'}
              </p>
              {selectedProduct.stock !== undefined && (
                <p className="text-sm text-black">
                  Available Stock: {selectedProduct.stock || 0}
                </p>
              )}
            </div>

            <div className="mb-4">
              <label className="block text-sm font-semibold text-black mb-2">
                Quantity
              </label>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setManualQuantity(Math.max(1, manualQuantity - 1))}
                  className="w-10 h-10 flex items-center justify-center border border-gray-300 rounded hover:bg-gray-200 text-black"
                >
                  <Minus className="w-4 h-4" />
                </button>
                <input
                  type="number"
                  value={manualQuantity}
                  onChange={(e) =>
                    setManualQuantity(Math.max(1, parseInt(e.target.value) || 1))
                  }
                  min="1"
                  max={selectedProduct.stock || 999}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded text-center text-black"
                />
                <button
                  onClick={() =>
                    setManualQuantity(
                      Math.min(
                        selectedProduct.stock || 999,
                        manualQuantity + 1
                      )
                    )
                  }
                  className="w-10 h-10 flex items-center justify-center border border-gray-300 rounded hover:bg-gray-200 text-black"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleManualAdd}
                className="flex-1 bg-blue-600 text-white py-2 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
              >
                Add to Cart
              </button>
              <button
                onClick={() => {
                  setShowProductModal(false);
                  setSelectedProduct(null);
                }}
                className="flex-1 bg-gray-200 text-black py-2 rounded-lg font-medium hover:bg-gray-300 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
