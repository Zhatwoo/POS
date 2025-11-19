'use client';

import { useState, useEffect } from 'react';
import { TrendingUp, ShoppingCart, DollarSign, Package, AlertTriangle, Calendar, BarChart3, Printer, RefreshCw, Eye, X } from 'lucide-react';
import Navbar from '@/app/Components/Navbar';
import { getNestedCollection, discoverCategories, fetchAllProductsFromFirestore } from '@/lib/firebase-helpers';
import { buildTransactionsPath, buildProductsPath } from '@/lib/firebase-config';
import { useUser } from '@/lib/user-context';
import { formatDate, formatDateTime, toDate, isWithinDateRange, formatTime } from '@/lib/timestamp-utils';
import Link from 'next/link';

export default function DashboardPage() {
  const [stats, setStats] = useState({
    todaySales: 0,
    totalOrders: 0,
    totalRevenue: 0,
    totalProducts: 0,
  });

  const [recentTransactions, setRecentTransactions] = useState([]);
  const [lowStockItems, setLowStockItems] = useState([]);
  const [expiringProducts, setExpiringProducts] = useState([]);
  const [topSellingItems, setTopSellingItems] = useState([]);
  const [topCategories, setTopCategories] = useState([]);
  const [activityFeed, setActivityFeed] = useState([]);
  const [loading, setLoading] = useState(true);
  const { companyName, account, loading: userLoading } = useUser();

  useEffect(() => {
    // Wait for user context to load before fetching data
    if (userLoading) {
      setLoading(true);
      return;
    }

    // If companyName or account is not available, clear all data and return
    if (!companyName || !account) {
      console.warn('Dashboard: Company name or account not available, clearing all data');
      setStats({
        todaySales: 0,
        totalOrders: 0,
        totalRevenue: 0,
        totalProducts: 0,
      });
      setRecentTransactions([]);
      setLowStockItems([]);
      setExpiringProducts([]);
      setTopSellingItems([]);
      setTopCategories([]);
      setActivityFeed([]);
      setLoading(false);
      return;
    }

    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        
        console.log(`Dashboard: Fetching data for companyName="${companyName}", account="${account}"`);

        // Get today's date range
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        // Fetch transactions/orders
        // Use dynamic nested path: Company/Company1/Account1/transactions
        let transactions = [];
        try {
          const transactionsPath = buildTransactionsPath(companyName, account);
          transactions = await getNestedCollection(transactionsPath);
        } catch (error) {
          console.log('Failed to fetch transactions from nested path, trying legacy path...', error);
          // Fallback to legacy flat structure if nested path fails
          transactions = [];
        }
        const orders = transactions.filter(t => t.type === 'order' || t.orderId);
        
        // Fetch products using dynamic path
        let products = [];
        try {
          const basePath = buildProductsPath(null, companyName, account);
          const commonCategories = ['Beverages', 'Food Items', 'Personal Care', 'Household Items', 'Electronics', 'Others'];
          const discoveredCategories = await discoverCategories(basePath, commonCategories);
          const productsData = await fetchAllProductsFromFirestore(basePath, discoveredCategories);
          products = productsData.products || [];
        } catch (error) {
          console.log('Failed to fetch products from nested path, trying legacy path...', error);
          products = [];
        }
        
        // Fetch activity logs (if exists)
        const activities = [];

        // Calculate top selling items from orders
        const itemSales = {};
        orders.forEach((order) => {
          if (order.items && Array.isArray(order.items)) {
            order.items.forEach((item) => {
              const productId = item.productId || item.id;
              const productName = item.name || products.find(p => p.id === productId)?.name || 'Unknown Product';
              const quantity = item.quantity || item.qty || 1;
              const price = item.price || 0;
              const revenue = quantity * price;

              if (!itemSales[productId]) {
                itemSales[productId] = {
                  id: productId,
                  name: productName,
                  quantitySold: 0,
                  revenue: 0,
                };
              }
              itemSales[productId].quantitySold += quantity;
              itemSales[productId].revenue += revenue;
            });
          }
        });

        const topItems = Object.values(itemSales)
          .sort((a, b) => b.revenue - a.revenue)
          .slice(0, 5);

        // Calculate top categories
        const categorySales = {};
        orders.forEach((order) => {
          if (order.items && Array.isArray(order.items)) {
            order.items.forEach((item) => {
              const category = item.category || products.find(p => p.id === (item.productId || item.id))?.category || 'Uncategorized';
              const price = item.price || 0;
              const quantity = item.quantity || item.qty || 1;
              const revenue = quantity * price;

              if (!categorySales[category]) {
                categorySales[category] = {
                  name: category,
                  revenue: 0,
                };
              }
              categorySales[category].revenue += revenue;
            });
          }
        });

        const totalCategoryRevenue = Object.values(categorySales).reduce((sum, cat) => sum + cat.revenue, 0);
        const topCats = Object.values(categorySales)
          .map(cat => ({
            ...cat,
            percentage: totalCategoryRevenue > 0 ? (cat.revenue / totalCategoryRevenue * 100).toFixed(1) : 0,
          }))
          .sort((a, b) => b.revenue - a.revenue)
          .slice(0, 5);

        // Find low stock items with reorder threshold (excluding ignored alerts)
        const lowStock = products
          .filter((p) => {
            if (ignoredAlerts.has(p.id)) return false; // Skip ignored alerts
            const stock = p.stock || 0;
            const reorderLevel = p.reorderLevel || p.reorderThreshold || 10;
            return stock <= reorderLevel && stock >= 0;
          })
          .sort((a, b) => (a.stock || 0) - (b.stock || 0))
          .slice(0, 10)
          .map(p => ({
            ...p,
            reorderLevel: p.reorderLevel || p.reorderThreshold || 10,
          }));

        // Find expired/expiring products (within 30 days)
        const thirtyDaysFromNow = new Date(today);
        thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

        const expiring = products
          .filter((p) => {
            if (!p.expiryDate && !p.expirationDate) return false;
            const expiryDate = toDate(p.expiryDate || p.expirationDate);
            if (!expiryDate) return false;
            return expiryDate <= thirtyDaysFromNow;
          })
          .map((p) => {
            const expiryDate = toDate(p.expiryDate || p.expirationDate);
            if (!expiryDate) return null;
            const daysUntilExpiry = Math.ceil((expiryDate - today) / (1000 * 60 * 60 * 24));
            return { ...p, daysUntilExpiry, isExpired: daysUntilExpiry < 0 };
          })
          .filter(p => p !== null)
          .sort((a, b) => a.daysUntilExpiry - b.daysUntilExpiry)
          .slice(0, 10);

        // Calculate today's sales
        const todayTransactions = transactions.filter((t) => {
          const transactionDate = toDate(t.createdAt || t.timestamp);
          if (!transactionDate) return false;
          return transactionDate >= today && transactionDate < tomorrow;
        });

        const todaySales = todayTransactions.reduce((sum, t) => sum + (t.amount || t.total || 0), 0);

        // Calculate total revenue
        const totalRevenue = transactions.reduce((sum, t) => sum + (t.amount || t.total || 0), 0);

        // Get total orders
        const totalOrders = orders.length || transactions.length;

        // Get recent transactions with full details (last 20)
        const sortedTransactions = [...transactions].sort((a, b) => {
          const dateA = toDate(a.createdAt || a.timestamp) || new Date(0);
          const dateB = toDate(b.createdAt || b.timestamp) || new Date(0);
          return dateB - dateA;
        });

        const recent = sortedTransactions.slice(0, 20).map((t) => {
          const date = toDate(t.createdAt || t.timestamp) || new Date();
          const time = formatTime(date);
          const dateStr = formatDate(date);
          
          return {
            id: t.id,
            invoiceNumber: t.invoiceNumber || t.invoiceNo || t.id.substring(0, 8).toUpperCase(),
            customer: t.customerName || t.customer || 'Walk-in Customer',
            amount: t.amount || t.total || 0,
            paymentMethod: t.paymentMethod || t.payment || 'Cash',
            cashier: t.cashierName || t.cashier || t.userId || 'System',
            time: time,
            date: dateStr,
            fullDate: date,
          };
        });

        // Combine transactions and activities for activity feed
        const feed = [
          ...recent.map(t => ({
            type: 'transaction',
            id: t.id,
            title: `Sale: ${t.invoiceNumber}`,
            description: `${t.customer} - ₱${t.amount.toLocaleString()} (${t.paymentMethod})`,
            user: t.cashier,
            timestamp: t.fullDate,
            data: t,
          })),
          ...activities.map(a => ({
            type: a.actionType || 'activity',
            id: a.id,
            title: a.title || a.action || 'Activity',
            description: a.description || a.details || '',
            user: a.userName || a.userId || 'System',
            timestamp: toDate(a.createdAt) || new Date(),
            data: a,
          })),
        ].sort((a, b) => b.timestamp - a.timestamp).slice(0, 20);

        setStats({
          todaySales,
          totalOrders,
          totalRevenue,
          totalProducts: products.length,
        });

        setRecentTransactions(recent);
        setLowStockItems(lowStock);
        setExpiringProducts(expiring);
        setTopSellingItems(topItems);
        setTopCategories(topCats);
        setActivityFeed(feed);
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
        // Set default values on error
        setStats({
          todaySales: 0,
          totalOrders: 0,
          totalRevenue: 0,
          totalProducts: 0,
        });
        setRecentTransactions([]);
        setLowStockItems([]);
        setExpiringProducts([]);
        setTopSellingItems([]);
        setTopCategories([]);
        setActivityFeed([]);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [companyName, account, userLoading]);

  const [selectedActionItem, setSelectedActionItem] = useState(null);
  const [actionType, setActionType] = useState(null);
  const [showActionModal, setShowActionModal] = useState(false);
  const [ignoredAlerts, setIgnoredAlerts] = useState(new Set());

  const handleQuickAction = (action, item) => {
    setSelectedActionItem(item);
    setActionType(action);
    
    switch (action) {
      case 'createPO':
        // Show purchase order creation modal
        setShowActionModal(true);
        break;
      case 'orderMore':
        // Show reorder modal
        setShowActionModal(true);
        break;
      case 'ignore':
        // Mark alert as ignored (client-side only for now)
        if (item.id) {
          setIgnoredAlerts(prev => new Set([...prev, item.id]));
          // Remove from low stock items display
          setLowStockItems(prev => prev.filter(p => p.id !== item.id));
        }
        break;
      case 'reprint':
        // Download receipt for transaction
        handleDownloadReceipt(item);
        break;
      case 'refund':
        // Show refund modal
        setShowActionModal(true);
        break;
      case 'view':
        // Show details modal
        setShowActionModal(true);
        break;
      default:
        console.log(`Action ${action} not implemented for`, item);
    }
  };

  const handleDownloadReceipt = (transaction) => {
    const items = transaction.items || transaction.data?.items || [];
    const total = transaction.amount || transaction.data?.amount || 0;
    const orderId = transaction.orderId || transaction.id || transaction.data?.id || `INV-${Date.now().toString().slice(-8)}`;
    
    const date = toDate(transaction.timestamp || transaction.createdAt || transaction.data?.timestamp) || new Date();
    const dateTime = formatDateTime(date);
    
    const receiptContent = `
========================================
          POSYSTEM
     Point of Sale System
          RECEIPT
========================================

Invoice #: ${orderId}
Date: ${dateTime}
Cashier: ${transaction.cashier || transaction.data?.cashier || 'System'}
Customer: ${transaction.customer || transaction.customerName || transaction.data?.customerName || 'Walk-in Customer'}

----------------------------------------
ITEMS
----------------------------------------
${items.map(item => 
  `${item.name || 'Unknown Item'}
  ${item.quantity || 0} x ₱${(item.price || 0).toLocaleString()} = ₱${(item.subtotal || item.quantity * item.price || 0).toLocaleString()}`
).join('\n\n')}

----------------------------------------
TOTAL: ₱${total.toLocaleString()}
Payment: ${transaction.paymentMethod || transaction.data?.paymentMethod || 'Cash'}
Change: ₱0.00
----------------------------------------

Thank you for your purchase!
Please come again

========================================
    `.trim();

    const blob = new Blob([receiptContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Receipt_${orderId}_${date.toISOString().split('T')[0]}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const statCards = [
    {
      title: 'Today\'s Sales',
      value: `₱${stats.todaySales.toLocaleString()}`,
      icon: DollarSign,
      color: 'bg-green-500',
    },
    {
      title: 'Total Orders',
      value: stats.totalOrders,
      icon: ShoppingCart,
      color: 'bg-blue-500',
    },
    {
      title: 'Total Revenue',
      value: `₱${stats.totalRevenue.toLocaleString()}`,
      icon: TrendingUp,
      color: 'bg-purple-500',
    },
    {
      title: 'Total Products',
      value: stats.totalProducts,
      icon: Package,
      color: 'bg-orange-500',
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="p-6">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
            <p className="text-gray-600 mt-2">Overview of your POS System</p>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {loading ? (
              <div className="col-span-4 text-center py-8 text-gray-500">Loading...</div>
            ) : (
              statCards.map((card, index) => {
                const Icon = card.icon;
                return (
                  <div
                    key={index}
                    className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-gray-600 text-sm font-medium">{card.title}</p>
                        <p className="text-2xl font-bold text-gray-900 mt-2">{card.value}</p>
                      </div>
                      <div className={`${card.color} p-3 rounded-lg`}>
                        <Icon className="w-6 h-6 text-white" />
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Top Selling Items / Categories */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            {/* Top Selling Items */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-blue-500" />
                  <h2 className="text-xl font-bold text-gray-900">Top Selling Items</h2>
                </div>
                <Link href="/reports" className="text-sm text-blue-600 hover:text-blue-800">
                  View All
                </Link>
              </div>
              {loading ? (
                <p className="text-gray-500 text-center py-8">Loading...</p>
              ) : topSellingItems.length > 0 ? (
                <div className="space-y-3">
                  {topSellingItems.map((item, index) => (
                    <div
                      key={item.id || index}
                      className="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer"
                      onClick={() => handleQuickAction('view', item)}
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-gray-500">#{index + 1}</span>
                          <p className="font-semibold text-gray-900">{item.name}</p>
                        </div>
                        <div className="flex gap-4 mt-1 text-xs text-gray-600">
                          <span>Qty: {item.quantitySold}</span>
                          <span>Revenue: ₱{item.revenue.toLocaleString()}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 text-center py-8 text-sm">No sales data available</p>
              )}
            </div>

            {/* Top Categories */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-purple-500" />
                  <h2 className="text-xl font-bold text-gray-900">Top Categories</h2>
                </div>
                <Link href="/reports" className="text-sm text-purple-600 hover:text-purple-800">
                  View All
                </Link>
              </div>
              {loading ? (
                <p className="text-gray-500 text-center py-8">Loading...</p>
              ) : topCategories.length > 0 ? (
                <div className="space-y-3">
                  {topCategories.map((category, index) => (
                    <div
                      key={category.name}
                      className="p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer"
                      onClick={() => handleQuickAction('view', category)}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-semibold text-gray-900">{category.name}</span>
                        <span className="text-sm font-semibold text-gray-700">
                          ₱{category.revenue.toLocaleString()}
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-purple-500 h-2 rounded-full"
                          style={{ width: `${Math.min(category.percentage, 100)}%` }}
                        ></div>
                      </div>
                      <p className="text-xs text-gray-500 mt-1">{category.percentage}% of total revenue</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 text-center py-8 text-sm">No category data available</p>
              )}
            </div>
          </div>

          {/* Low Stock / Reorder Alerts & Expiring Products */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            {/* Low Stock / Reorder Alerts */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="flex items-center gap-2 mb-4">
                <AlertTriangle className="w-5 h-5 text-orange-500" />
                <h2 className="text-xl font-bold text-gray-900">Low Stock / Reorder Alerts</h2>
              </div>
              {loading ? (
                <p className="text-gray-500 text-center py-8">Loading...</p>
              ) : lowStockItems.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="text-left py-3 px-4 text-gray-600 font-semibold text-sm">SKU</th>
                        <th className="text-left py-3 px-4 text-gray-600 font-semibold text-sm">Product</th>
                        <th className="text-left py-3 px-4 text-gray-600 font-semibold text-sm">On-Hand</th>
                        <th className="text-left py-3 px-4 text-gray-600 font-semibold text-sm">Reorder Level</th>
                        <th className="text-left py-3 px-4 text-gray-600 font-semibold text-sm">Supplier</th>
                        <th className="text-left py-3 px-4 text-gray-600 font-semibold text-sm">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {lowStockItems.map((product) => (
                        <tr key={product.id} className="border-b border-gray-100 hover:bg-gray-50">
                          <td className="py-3 px-4 text-gray-900 text-sm">{product.sku || product.id.substring(0, 8)}</td>
                          <td className="py-3 px-4 text-gray-900 text-sm font-medium">{product.name || 'Unnamed Product'}</td>
                          <td className="py-3 px-4">
                            <span className={`px-2 py-1 rounded text-xs font-semibold ${
                              product.stock <= 5 
                                ? 'bg-red-100 text-red-800' 
                                : 'bg-orange-100 text-orange-800'
                            }`}>
                              {product.stock || 0}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-gray-600 text-sm">{product.reorderLevel}</td>
                          <td className="py-3 px-4 text-gray-600 text-sm">{product.supplier || 'N/A'}</td>
                          <td className="py-3 px-4">
                            <div className="flex gap-2">
                              <button
                                onClick={() => handleQuickAction('createPO', product)}
                                className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
                              >
                                Create PO
                              </button>
                              <button
                                onClick={() => handleQuickAction('orderMore', product)}
                                className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded hover:bg-green-200"
                              >
                                Order
                              </button>
                              <button
                                onClick={() => handleQuickAction('ignore', product)}
                                className="text-xs px-2 py-1 bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
                              >
                                Ignore
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-gray-500 text-center py-8 text-sm">All products are well stocked</p>
              )}
            </div>

            {/* Expiring Products */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="flex items-center gap-2 mb-4">
                <Calendar className="w-5 h-5 text-red-500" />
                <h2 className="text-xl font-bold text-gray-900">Expiring Products</h2>
              </div>
              {loading ? (
                <p className="text-gray-500 text-center py-8">Loading...</p>
              ) : expiringProducts.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="text-left py-2 px-3 text-gray-600 font-semibold text-sm">Product</th>
                        <th className="text-left py-2 px-3 text-gray-600 font-semibold text-sm">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {expiringProducts.map((product) => {
                        const expiryDate = toDate(product.expiryDate || product.expirationDate) || new Date();
                        const formattedDate = formatDate(expiryDate);
                        
                        return (
                          <tr key={product.id} className="border-b border-gray-100 hover:bg-gray-50">
                            <td className="py-2 px-3 text-gray-900 text-sm">{product.name || 'Unnamed Product'}</td>
                            <td className="py-2 px-3">
                              <span className={`px-2 py-1 rounded text-xs font-semibold ${
                                product.isExpired
                                  ? 'bg-red-100 text-red-800'
                                  : product.daysUntilExpiry <= 7
                                  ? 'bg-orange-100 text-orange-800'
                                  : 'bg-yellow-100 text-yellow-800'
                              }`}>
                                {product.isExpired 
                                  ? `Expired ${Math.abs(product.daysUntilExpiry)}d ago`
                                  : `${product.daysUntilExpiry}d left`
                                }
                              </span>
                              <p className="text-xs text-gray-500 mt-1">{formattedDate}</p>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-gray-500 text-center py-8 text-sm">No expiring products</p>
              )}
            </div>
          </div>

          {/* Recent Transactions / Activity Feed */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Recent Transactions & Activity</h2>
            {loading ? (
              <p className="text-gray-500 text-center py-8">Loading...</p>
            ) : activityFeed.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-3 px-4 text-gray-600 font-semibold">Time</th>
                      <th className="text-left py-3 px-4 text-gray-600 font-semibold">Invoice #</th>
                      <th className="text-left py-3 px-4 text-gray-600 font-semibold">Cashier</th>
                      <th className="text-left py-3 px-4 text-gray-600 font-semibold">Total</th>
                      <th className="text-left py-3 px-4 text-gray-600 font-semibold">Payment</th>
                      <th className="text-left py-3 px-4 text-gray-600 font-semibold">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {activityFeed.map((item) => {
                      if (item.type === 'transaction') {
                        const t = item.data;
                        return (
                          <tr key={item.id} className="border-b border-gray-100 hover:bg-gray-50">
                            <td className="py-3 px-4 text-gray-600 text-sm">
                              <div>{t.date}</div>
                              <div className="text-xs text-gray-500">{t.time}</div>
                            </td>
                            <td className="py-3 px-4 text-gray-900 font-medium">{t.invoiceNumber}</td>
                            <td className="py-3 px-4 text-gray-600 text-sm">{t.cashier}</td>
                        <td className="py-3 px-4 text-gray-900 font-semibold">
                              ₱{t.amount.toLocaleString()}
                            </td>
                            <td className="py-3 px-4 text-gray-600 text-sm">{t.paymentMethod}</td>
                            <td className="py-3 px-4">
                              <div className="flex gap-2">
                                <button
                                  onClick={() => handleQuickAction('reprint', t)}
                                  className="p-1 text-blue-600 hover:text-blue-800"
                                  title="Reprint"
                                >
                                  <Printer className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => handleQuickAction('refund', t)}
                                  className="p-1 text-orange-600 hover:text-orange-800"
                                  title="Refund"
                                >
                                  <RefreshCw className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => handleQuickAction('view', t)}
                                  className="p-1 text-gray-600 hover:text-gray-800"
                                  title="View Details"
                                >
                                  <Eye className="w-4 h-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      } else {
                        return (
                          <tr key={item.id} className="border-b border-gray-100 hover:bg-gray-50 bg-blue-50/30">
                            <td className="py-3 px-4 text-gray-600 text-sm">
                              {formatDate(item.timestamp)}
                            </td>
                            <td className="py-3 px-4 text-gray-900 font-medium" colSpan={2}>
                              <div className="text-sm">{item.title}</div>
                              <div className="text-xs text-gray-500">{item.description}</div>
                            </td>
                            <td className="py-3 px-4 text-gray-600 text-sm">{item.user}</td>
                            <td className="py-3 px-4 text-gray-600 text-sm">{item.type}</td>
                            <td className="py-3 px-4">
                              <button
                                onClick={() => handleQuickAction('view', item)}
                                className="p-1 text-gray-600 hover:text-gray-800"
                                title="View Details"
                              >
                                <Eye className="w-4 h-4" />
                              </button>
                        </td>
                      </tr>
                        );
                      }
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-gray-500 text-center py-8">No transactions yet</p>
            )}
          </div>
        </div>
      </div>

      {/* Action Modal */}
      {showActionModal && selectedActionItem && (
        <ActionModal
          actionType={actionType}
          item={selectedActionItem}
          onClose={() => {
            setShowActionModal(false);
            setSelectedActionItem(null);
            setActionType(null);
          }}
        />
      )}
    </div>
  );
}

// Action Modal Component
function ActionModal({ actionType, item, onClose }) {
  const getModalContent = () => {
    switch (actionType) {
      case 'createPO':
        return (
          <div>
            <h3 className="text-xl font-bold text-gray-900 mb-4">Create Purchase Order</h3>
            <p className="text-gray-600 mb-4">Product: <strong>{item.name}</strong></p>
            <p className="text-sm text-gray-500">Purchase order functionality will be implemented here.</p>
            <p className="text-sm text-gray-500 mt-2">Current Stock: {item.stock || 0}</p>
            <p className="text-sm text-gray-500">Reorder Level: {item.reorderLevel || item.reorderThreshold || 10}</p>
          </div>
        );
      case 'orderMore':
        return (
          <div>
            <h3 className="text-xl font-bold text-gray-900 mb-4">Reorder Product</h3>
            <p className="text-gray-600 mb-4">Product: <strong>{item.name}</strong></p>
            <p className="text-sm text-gray-500">Reorder functionality will be implemented here.</p>
            <p className="text-sm text-gray-500 mt-2">Current Stock: {item.stock || 0}</p>
            <p className="text-sm text-gray-500">Supplier: {item.supplier || 'N/A'}</p>
          </div>
        );
      case 'refund':
        return (
          <div>
            <h3 className="text-xl font-bold text-gray-900 mb-4">Process Refund</h3>
            <p className="text-gray-600 mb-4">Transaction: <strong>{item.invoiceNumber || item.id}</strong></p>
            <p className="text-sm text-gray-500">Amount: ₱{(item.amount || 0).toLocaleString()}</p>
            <p className="text-sm text-gray-500 mt-2">Refund functionality will be implemented here.</p>
          </div>
        );
      case 'view':
        return (
          <div>
            <h3 className="text-xl font-bold text-gray-900 mb-4">Details</h3>
            <div className="space-y-2">
              {item.name && <p className="text-gray-600"><strong>Name:</strong> {item.name}</p>}
              {item.invoiceNumber && <p className="text-gray-600"><strong>Invoice:</strong> {item.invoiceNumber}</p>}
              {item.amount !== undefined && <p className="text-gray-600"><strong>Amount:</strong> ₱{item.amount.toLocaleString()}</p>}
              {item.stock !== undefined && <p className="text-gray-600"><strong>Stock:</strong> {item.stock}</p>}
              {item.revenue !== undefined && <p className="text-gray-600"><strong>Revenue:</strong> ₱{item.revenue.toLocaleString()}</p>}
            </div>
          </div>
        );
      default:
        return <div><p>Action not implemented</p></div>;
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl p-6 max-w-md w-full mx-4 border border-gray-200">
        <div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-200">
          <h2 className="text-2xl font-bold text-gray-900">Quick Action</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-full p-1 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>
        {getModalContent()}
        <div className="flex gap-3 mt-6 pt-4 border-t border-gray-200">
          <button
            onClick={onClose}
            className="flex-1 bg-gray-200 text-gray-700 py-3 rounded-lg font-medium hover:bg-gray-300 transition-all duration-200"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
