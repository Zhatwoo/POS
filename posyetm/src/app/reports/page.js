'use client';

import { useState, useEffect } from 'react';
import Navbar from '@/app/Components/Navbar';
import { getNestedCollection, fetchAllProductsFromFirestore, discoverCategories } from '@/lib/firebase-helpers';
import { buildTransactionsPath, buildProductsPath } from '@/lib/firebase-config';
import { useUser } from '@/lib/user-context';
import { formatDate, formatDateTime, toDate, isWithinDateRange } from '@/lib/timestamp-utils';
import { 
  Download, 
  Calendar,
  DollarSign,
  ShoppingCart,
  Package,
  TrendingUp,
  BarChart3,
  FileText,
  AlertTriangle,
  Users,
  Receipt,
  X,
  Eye
} from 'lucide-react';

const REPORT_TABS = [
  { id: 'daily', label: 'Daily Sales', icon: Calendar },
  { id: 'items', label: 'Sales by Item', icon: Package },
  { id: 'category', label: 'Sales by Category', icon: BarChart3 },
  { id: 'cashier', label: 'Sales by Cashier', icon: Users },
  { id: 'vat', label: 'VAT Report', icon: Receipt },
  { id: 'zreport', label: 'Z-Report', icon: FileText },
  { id: 'inventory', label: 'Inventory Valuation', icon: Package },
  { id: 'lowstock', label: 'Low Stock', icon: AlertTriangle },
  { id: 'profit', label: 'Profit Margin', icon: TrendingUp },
];

export default function ReportsPage() {
  const [activeTab, setActiveTab] = useState('daily');
  const [transactions, setTransactions] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState({
    startDate: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
    endDate: new Date(),
  });
  const [selectedTransaction, setSelectedTransaction] = useState(null);
  const [showTransactionModal, setShowTransactionModal] = useState(false);
  const [categories, setCategories] = useState([]);
  const { companyName, account, loading: userLoading } = useUser();

  useEffect(() => {
    // Wait for user context to load before fetching data
    if (userLoading || !companyName || !account) {
      setLoading(false);
      setTransactions([]);
      setProducts([]);
      setCategories([]);
      return;
    }

    fetchData();
  }, [companyName, account, userLoading]);

  useEffect(() => {
    // Recalculate when date range changes
  }, [dateRange]);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Only fetch if companyName and account are available
      if (!companyName || !account) {
        console.warn('Company name or account not available, skipping data fetch');
        setTransactions([]);
        setProducts([]);
        setCategories([]);
        setLoading(false);
        return;
      }
      
      // Fetch transactions using dynamic path
      const transactionsPath = buildTransactionsPath(companyName, account);
      const transactionsData = await getNestedCollection(transactionsPath);
      setTransactions(transactionsData);

      // Fetch products using dynamic path
      const basePath = buildProductsPath(null, companyName, account);
      
      // Discover categories dynamically
      const commonCategories = ['Beverages', 'Food Items', 'Personal Care', 'Household Items', 'Electronics', 'Others'];
      const discoveredCategories = await discoverCategories(basePath, commonCategories);
      setCategories(discoveredCategories);
      
      try {
        const productsData = await fetchAllProductsFromFirestore(basePath, discoveredCategories);
        setProducts(productsData.products || []);
      } catch (error) {
        console.error('Error fetching products:', error);
        setProducts([]);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      setTransactions([]);
      setProducts([]);
    } finally {
      setLoading(false);
    }
  };

  const setQuickDateRange = (range) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    let startDate, endDate;

    switch (range) {
      case 'today':
        startDate = new Date(today);
        endDate = new Date(today);
        endDate.setHours(23, 59, 59);
        break;
      case 'week':
        startDate = new Date(today);
        startDate.setDate(today.getDate() - 7);
        endDate = new Date(today);
        endDate.setHours(23, 59, 59);
        break;
      case 'month':
        startDate = new Date(today.getFullYear(), today.getMonth(), 1);
        endDate = new Date(today);
        endDate.setHours(23, 59, 59);
        break;
      case 'year':
        startDate = new Date(today.getFullYear(), 0, 1);
        endDate = new Date(today);
        endDate.setHours(23, 59, 59);
        break;
      default:
        return;
    }

    setDateRange({ startDate, endDate });
  };

  const filterTransactionsByDate = (transactions) => {
    return transactions.filter(t => {
      return isWithinDateRange(t.timestamp || t.createdAt, dateRange.startDate, dateRange.endDate);
    });
  };

  const formatDateLocal = (date) => {
    return formatDate(date, { year: 'numeric', month: 'short', day: 'numeric' });
  };

  // Calculate Daily Sales Report
  const calculateDailySales = () => {
    const filtered = filterTransactionsByDate(transactions);
    const totalSales = filtered.reduce((sum, t) => sum + (t.amount || 0), 0);
    const transactionCount = filtered.length;
    const averageTransaction = transactionCount > 0 ? totalSales / transactionCount : 0;

    // Group by day for chart
    const dailyData = {};
    filtered.forEach(t => {
      const date = toDate(t.timestamp || t.createdAt);
      if (!date) return;
      const dateKey = date.toISOString().split('T')[0];
      if (!dailyData[dateKey]) {
        dailyData[dateKey] = { date: dateKey, sales: 0, count: 0 };
      }
      dailyData[dateKey].sales += t.amount || 0;
      dailyData[dateKey].count += 1;
    });

    return {
      totalSales,
      transactionCount,
      averageTransaction,
      dailyData: Object.values(dailyData).sort((a, b) => a.date.localeCompare(b.date)),
    };
  };

  // Calculate Sales by Item
  const calculateSalesByItem = () => {
    const filtered = filterTransactionsByDate(transactions);
    const itemSales = {};

    filtered.forEach(t => {
      (t.items || []).forEach(item => {
        const itemId = item.productId || item.id || item.name;
        const itemName = item.name || 'Unknown Item';
        const quantity = item.quantity || 0;
        const revenue = item.subtotal || (item.price || 0) * quantity;

        if (!itemSales[itemId]) {
          itemSales[itemId] = {
            id: itemId,
            name: itemName,
            quantitySold: 0,
            revenue: 0,
            transactions: [],
          };
        }
        itemSales[itemId].quantitySold += quantity;
        itemSales[itemId].revenue += revenue;
        itemSales[itemId].transactions.push(t);
      });
    });

    return Object.values(itemSales).sort((a, b) => b.revenue - a.revenue);
  };

  // Calculate Sales by Category
  const calculateSalesByCategory = () => {
    const filtered = filterTransactionsByDate(transactions);
    const categorySales = {};

    filtered.forEach(t => {
      (t.items || []).forEach(item => {
        const category = item.category || products.find(p => p.id === (item.productId || item.id))?.category || 'Uncategorized';
        const revenue = item.subtotal || (item.price || 0) * (item.quantity || 0);

        if (!categorySales[category]) {
          categorySales[category] = { name: category, revenue: 0, count: 0 };
        }
        categorySales[category].revenue += revenue;
        categorySales[category].count += 1;
      });
    });

    const total = Object.values(categorySales).reduce((sum, cat) => sum + cat.revenue, 0);
    return Object.values(categorySales).map(cat => ({
      ...cat,
      percentage: total > 0 ? ((cat.revenue / total) * 100).toFixed(1) : 0,
    })).sort((a, b) => b.revenue - a.revenue);
  };

  // Calculate Sales by Cashier
  const calculateSalesByCashier = () => {
    const filtered = filterTransactionsByDate(transactions);
    const cashierSales = {};

    filtered.forEach(t => {
      const cashier = t.cashier || 'System';
      if (!cashierSales[cashier]) {
        cashierSales[cashier] = { name: cashier, revenue: 0, count: 0 };
      }
      cashierSales[cashier].revenue += t.amount || 0;
      cashierSales[cashier].count += 1;
    });

    return Object.values(cashierSales).sort((a, b) => b.revenue - a.revenue);
  };

  // Calculate VAT Report
  const calculateVATReport = () => {
    const filtered = filterTransactionsByDate(transactions);
    let totalVAT = 0;
    let totalNonVAT = 0;
    const vatBreakdown = [];

    filtered.forEach(t => {
      (t.items || []).forEach(item => {
        const hasVAT = item.vatIncluded || false;
        const vatRate = item.vatRate || 12;
        const subtotal = item.subtotal || (item.price || 0) * (item.quantity || 0);
        
        if (hasVAT) {
          const vatAmount = subtotal * (vatRate / (100 + vatRate));
          totalVAT += vatAmount;
          vatBreakdown.push({
            transactionId: t.id,
            item: item.name,
            amount: subtotal,
            vatAmount,
            vatRate,
          });
        } else {
          totalNonVAT += subtotal;
        }
      });
    });

    return { totalVAT, totalNonVAT, vatBreakdown };
  };

  // Calculate Z-Report (End of Day)
  const calculateZReport = () => {
    const filtered = filterTransactionsByDate(transactions);
    const totalSales = filtered.reduce((sum, t) => sum + (t.amount || 0), 0);
    const transactionCount = filtered.length;
    const cashSales = filtered.filter(t => (t.paymentMethod || 'Cash') === 'Cash').reduce((sum, t) => sum + (t.amount || 0), 0);
    const cardSales = filtered.filter(t => (t.paymentMethod || 'Cash') === 'Card').reduce((sum, t) => sum + (t.amount || 0), 0);

    return {
      date: formatDateLocal(dateRange.endDate),
      totalSales,
      transactionCount,
      cashSales,
      cardSales,
      averageTransaction: transactionCount > 0 ? totalSales / transactionCount : 0,
    };
  };

  // Calculate Inventory Valuation
  const calculateInventoryValuation = () => {
    const totalValue = products.reduce((sum, p) => {
      const stock = p.stock || 0;
      const purchasePrice = p.purchasePrice || 0;
      return sum + (stock * purchasePrice);
    }, 0);

    const categoryValues = {};
    products.forEach(p => {
      const category = p.category || 'Uncategorized';
      const stock = p.stock || 0;
      const purchasePrice = p.purchasePrice || 0;
      const value = stock * purchasePrice;

      if (!categoryValues[category]) {
        categoryValues[category] = { name: category, value: 0, itemCount: 0 };
      }
      categoryValues[category].value += value;
      categoryValues[category].itemCount += 1;
    });

    return {
      totalValue,
      categoryValues: Object.values(categoryValues).sort((a, b) => b.value - a.value),
    };
  };

  // Calculate Low Stock Report
  const calculateLowStock = () => {
    return products
      .filter(p => {
        const stock = p.stock || 0;
        const reorderPoint = p.reorderPoint || 10;
        return stock <= reorderPoint;
      })
      .map(p => ({
        ...p,
        reorderPoint: p.reorderPoint || 10,
        difference: (p.reorderPoint || 10) - (p.stock || 0),
      }))
      .sort((a, b) => a.stock - b.stock);
  };

  // Calculate Profit Margin
  const calculateProfitMargin = () => {
    return products
      .map(p => {
        const sellingPrice = p.price || p.sellingPrice || 0;
        const purchasePrice = p.purchasePrice || 0;
        const margin = sellingPrice - purchasePrice;
        const marginPercent = sellingPrice > 0 ? ((margin / sellingPrice) * 100).toFixed(2) : 0;
        return {
          ...p,
          sellingPrice,
          purchasePrice,
          margin,
          marginPercent: parseFloat(marginPercent),
        };
      })
      .filter(p => p.sellingPrice > 0)
      .sort((a, b) => b.margin - a.margin);
  };

  // Export to CSV
  const exportToCSV = (data, filename, headers) => {
    if (!data || data.length === 0) {
      alert('No data to export');
      return;
    }

    const headerRow = headers.map(h => {
      if (typeof h === 'string') return h;
      if (typeof h === 'object' && h.label) return h.label;
      return '';
    }).join(',');

    const rows = data.map(row => {
      return headers.map(header => {
        let value = '';
        if (typeof header === 'string') {
          value = row[header] || '';
        } else if (typeof header === 'object' && header.accessor) {
          value = header.accessor(row);
        } else if (typeof header === 'function') {
          value = header(row);
        }
        // Escape quotes and wrap in quotes
        return `"${String(value).replace(/"/g, '""')}"`;
      }).join(',');
    });

    const csvContent = [headerRow, ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${filename}_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleViewTransactions = (item) => {
    setSelectedTransaction(item);
    setShowTransactionModal(true);
  };

  const renderReport = () => {
    if (loading) {
      return (
        <div className="bg-white rounded-lg shadow-md p-12 text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
          <p className="text-gray-600 font-medium">Loading report data...</p>
        </div>
      );
    }

    switch (activeTab) {
      case 'daily':
        return <DailySalesReport data={calculateDailySales()} onExport={() => {
          const { dailyData } = calculateDailySales();
          exportToCSV(dailyData, 'daily_sales', [
            'Date',
            { label: 'Sales', accessor: row => row.sales },
            { label: 'Transactions', accessor: row => row.count },
          ]);
        }} />;
      case 'items':
        return <SalesByItemReport data={calculateSalesByItem()} onViewTransactions={handleViewTransactions} onExport={() => {
          exportToCSV(calculateSalesByItem(), 'sales_by_item', ['name', 'quantitySold', 'revenue']);
        }} />;
      case 'category':
        return <SalesByCategoryReport data={calculateSalesByCategory()} onExport={() => {
          exportToCSV(calculateSalesByCategory(), 'sales_by_category', ['name', 'revenue', 'percentage']);
        }} />;
      case 'cashier':
        return <SalesByCashierReport data={calculateSalesByCashier()} onExport={() => {
          exportToCSV(calculateSalesByCashier(), 'sales_by_cashier', ['name', 'revenue', 'count']);
        }} />;
      case 'vat':
        return <VATReport data={calculateVATReport()} onExport={() => {
          const vatData = calculateVATReport();
          exportToCSV(vatData.vatBreakdown, 'vat_report', ['item', 'amount', 'vatAmount', 'vatRate']);
        }} />;
      case 'zreport':
        return <ZReport data={calculateZReport()} onExport={() => {
          const zData = calculateZReport();
          exportToCSV([zData], 'z_report', ['date', 'totalSales', 'transactionCount', 'cashSales', 'cardSales']);
        }} />;
      case 'inventory':
        return <InventoryValuationReport data={calculateInventoryValuation()} onExport={() => {
          const invData = calculateInventoryValuation();
          exportToCSV(invData.categoryValues, 'inventory_valuation', ['name', 'value', 'itemCount']);
        }} />;
      case 'lowstock':
        return <LowStockReport data={calculateLowStock()} onExport={() => {
          exportToCSV(calculateLowStock(), 'low_stock', ['name', 'stock', 'reorderPoint', 'difference']);
        }} />;
      case 'profit':
        return <ProfitMarginReport data={calculateProfitMargin()} onExport={() => {
          exportToCSV(calculateProfitMargin(), 'profit_margin', ['name', 'sellingPrice', 'purchasePrice', 'margin', 'marginPercent']);
        }} />;
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="p-6 w-full">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-gray-900">Reports</h1>
            <p className="text-gray-600 mt-2">View and export comprehensive business reports</p>
          </div>

          {/* Date Filters */}
          <div className="bg-white rounded-lg shadow-md p-5 mb-6 border border-gray-100">
            <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
              <div className="flex-1">
                <label className="block text-sm font-semibold text-gray-700 mb-2">Date Range</label>
                <div className="flex gap-2 flex-wrap">
                  <button
                    onClick={() => setQuickDateRange('today')}
                    className="px-4 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors text-sm font-medium"
                  >
                    Today
                  </button>
                  <button
                    onClick={() => setQuickDateRange('week')}
                    className="px-4 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors text-sm font-medium"
                  >
                    This Week
                  </button>
                  <button
                    onClick={() => setQuickDateRange('month')}
                    className="px-4 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors text-sm font-medium"
                  >
                    This Month
                  </button>
                  <button
                    onClick={() => setQuickDateRange('year')}
                    className="px-4 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors text-sm font-medium"
                  >
                    This Year
                  </button>
                </div>
              </div>
              <div className="flex gap-3">
                <div>
                  <label className="block text-xs text-gray-600 mb-1">From</label>
                  <input
                    type="date"
                    value={dateRange.startDate.toISOString().split('T')[0]}
                    onChange={(e) => setDateRange({ ...dateRange, startDate: new Date(e.target.value) })}
                    className="px-3 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-black"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-600 mb-1">To</label>
                  <input
                    type="date"
                    value={dateRange.endDate.toISOString().split('T')[0]}
                    onChange={(e) => setDateRange({ ...dateRange, endDate: new Date(e.target.value) })}
                    className="px-3 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-black"
                  />
                </div>
              </div>
            </div>
            <div className="mt-3 text-sm text-gray-600">
              Showing data from <span className="font-semibold">{formatDateLocal(dateRange.startDate)}</span> to <span className="font-semibold">{formatDateLocal(dateRange.endDate)}</span>
            </div>
          </div>

          {/* Report Tabs */}
          <div className="bg-white rounded-lg shadow-md p-2 mb-6 border border-gray-100">
            <div className="flex flex-wrap gap-2">
              {REPORT_TABS.map(tab => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center gap-2 px-5 py-3 rounded-lg font-medium transition-all ${
                      activeTab === tab.id
                        ? 'bg-blue-600 text-white shadow-md'
                        : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    {tab.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Report Content */}
          {renderReport()}
        </div>
      </div>

      {/* Transaction Details Modal */}
      {showTransactionModal && selectedTransaction && (
        <TransactionModal
          item={selectedTransaction}
          onClose={() => {
            setShowTransactionModal(false);
            setSelectedTransaction(null);
          }}
        />
      )}
    </div>
  );
}

// Daily Sales Report Component
function DailySalesReport({ data, onExport }) {
  const maxSales = Math.max(...data.dailyData.map(d => d.sales), 1);

  return (
    <div className="bg-white rounded-lg shadow-md p-6 border border-gray-100">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Daily Sales Report</h2>
        <button
          onClick={onExport}
          className="px-5 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-all flex items-center gap-2 font-semibold shadow-md hover:shadow-lg"
        >
          <Download className="w-5 h-5" />
          Export CSV
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-blue-50 p-6 rounded-lg border border-blue-200">
          <p className="text-sm text-gray-600 mb-2">Total Sales</p>
          <p className="text-3xl font-bold text-blue-600">₱{data.totalSales.toLocaleString()}</p>
        </div>
        <div className="bg-green-50 p-6 rounded-lg border border-green-200">
          <p className="text-sm text-gray-600 mb-2">Transactions</p>
          <p className="text-3xl font-bold text-green-600">{data.transactionCount}</p>
        </div>
        <div className="bg-purple-50 p-6 rounded-lg border border-purple-200">
          <p className="text-sm text-gray-600 mb-2">Average Transaction</p>
          <p className="text-3xl font-bold text-purple-600">₱{data.averageTransaction.toLocaleString()}</p>
        </div>
      </div>

      {/* Simple Bar Chart */}
      <div className="mt-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Daily Sales Trend</h3>
        <div className="space-y-3">
          {data.dailyData.map((day, index) => (
            <div key={index} className="flex items-center gap-4">
              <div className="w-24 text-sm text-gray-600">{new Date(day.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</div>
              <div className="flex-1 bg-gray-200 rounded-full h-8 relative overflow-hidden">
                <div
                  className="bg-blue-600 h-full rounded-full flex items-center justify-end pr-2"
                  style={{ width: `${(day.sales / maxSales) * 100}%` }}
                >
                  <span className="text-white text-xs font-semibold">₱{day.sales.toLocaleString()}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// Sales by Item Report Component
function SalesByItemReport({ data, onViewTransactions, onExport }) {
  return (
    <div className="bg-white rounded-lg shadow-md p-6 border border-gray-100">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Sales by Item</h2>
        <button
          onClick={onExport}
          className="px-5 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-all flex items-center gap-2 font-semibold shadow-md hover:shadow-lg"
        >
          <Download className="w-5 h-5" />
          Export CSV
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gradient-to-r from-gray-50 to-gray-100">
            <tr>
              <th className="text-left py-4 px-6 text-gray-700 font-bold text-sm uppercase">Item Name</th>
              <th className="text-center py-4 px-6 text-gray-700 font-bold text-sm uppercase">Quantity Sold</th>
              <th className="text-right py-4 px-6 text-gray-700 font-bold text-sm uppercase">Revenue</th>
              <th className="text-center py-4 px-6 text-gray-700 font-bold text-sm uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {data.length === 0 ? (
              <tr>
                <td colSpan="4" className="text-center py-12 text-gray-500">No sales data available</td>
              </tr>
            ) : (
              data.map((item, index) => (
                <tr key={index} className="hover:bg-blue-50 transition-colors">
                  <td className="py-4 px-6 text-gray-900 font-semibold">{item.name}</td>
                  <td className="py-4 px-6 text-center text-gray-600">{item.quantitySold}</td>
                  <td className="py-4 px-6 text-right text-gray-900 font-bold">₱{item.revenue.toLocaleString()}</td>
                  <td className="py-4 px-6 text-center">
                    <button
                      onClick={() => onViewTransactions(item)}
                      className="px-3 py-1 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors text-sm font-medium flex items-center gap-1"
                    >
                      <Eye className="w-4 h-4" />
                      View
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// Sales by Category Report Component
function SalesByCategoryReport({ data, onExport }) {
  const maxRevenue = Math.max(...data.map(c => c.revenue), 1);

  return (
    <div className="bg-white rounded-lg shadow-md p-6 border border-gray-100">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Sales by Category</h2>
        <button
          onClick={onExport}
          className="px-5 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-all flex items-center gap-2 font-semibold shadow-md hover:shadow-lg"
        >
          <Download className="w-5 h-5" />
          Export CSV
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Chart */}
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Revenue by Category</h3>
          <div className="space-y-4">
            {data.map((cat, index) => (
              <div key={index}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-900">{cat.name}</span>
                  <span className="text-sm font-bold text-gray-900">₱{cat.revenue.toLocaleString()} ({cat.percentage}%)</span>
                </div>
                <div className="bg-gray-200 rounded-full h-6 overflow-hidden">
                  <div
                    className="bg-blue-600 h-full rounded-full flex items-center justify-end pr-2"
                    style={{ width: `${(cat.revenue / maxRevenue) * 100}%` }}
                  >
                    <span className="text-white text-xs font-semibold">{cat.percentage}%</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Table */}
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Category Breakdown</h3>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left py-3 px-4 text-gray-700 font-bold text-sm">Category</th>
                  <th className="text-right py-3 px-4 text-gray-700 font-bold text-sm">Revenue</th>
                  <th className="text-right py-3 px-4 text-gray-700 font-bold text-sm">%</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {data.map((cat, index) => (
                  <tr key={index} className="hover:bg-blue-50">
                    <td className="py-3 px-4 text-gray-900 font-medium">{cat.name}</td>
                    <td className="py-3 px-4 text-right text-gray-900 font-semibold">₱{cat.revenue.toLocaleString()}</td>
                    <td className="py-3 px-4 text-right text-gray-600">{cat.percentage}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

// Sales by Cashier Report Component
function SalesByCashierReport({ data, onExport }) {
  return (
    <div className="bg-white rounded-lg shadow-md p-6 border border-gray-100">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Sales by Cashier</h2>
        <button
          onClick={onExport}
          className="px-5 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-all flex items-center gap-2 font-semibold shadow-md hover:shadow-lg"
        >
          <Download className="w-5 h-5" />
          Export CSV
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {data.length === 0 ? (
          <div className="col-span-full text-center py-12 text-gray-500">No cashier data available</div>
        ) : (
          data.map((cashier, index) => (
            <div key={index} className="bg-gradient-to-br from-blue-50 to-indigo-50 p-6 rounded-lg border border-blue-200">
              <h3 className="text-lg font-bold text-gray-900 mb-4">{cashier.name}</h3>
              <div className="space-y-3">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Total Revenue</p>
                  <p className="text-2xl font-bold text-blue-600">₱{cashier.revenue.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 mb-1">Transactions</p>
                  <p className="text-xl font-semibold text-gray-900">{cashier.count}</p>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

// VAT Report Component
function VATReport({ data, onExport }) {
  return (
    <div className="bg-white rounded-lg shadow-md p-6 border border-gray-100">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-900">VAT Report</h2>
        <button
          onClick={onExport}
          className="px-5 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-all flex items-center gap-2 font-semibold shadow-md hover:shadow-lg"
        >
          <Download className="w-5 h-5" />
          Export CSV
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div className="bg-green-50 p-6 rounded-lg border border-green-200">
          <p className="text-sm text-gray-600 mb-2">Total VAT Collected</p>
          <p className="text-3xl font-bold text-green-600">₱{data.totalVAT.toLocaleString()}</p>
        </div>
        <div className="bg-gray-50 p-6 rounded-lg border border-gray-200">
          <p className="text-sm text-gray-600 mb-2">Non-VAT Sales</p>
          <p className="text-3xl font-bold text-gray-600">₱{data.totalNonVAT.toLocaleString()}</p>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gradient-to-r from-gray-50 to-gray-100">
            <tr>
              <th className="text-left py-3 px-4 text-gray-700 font-bold text-sm uppercase">Item</th>
              <th className="text-right py-3 px-4 text-gray-700 font-bold text-sm uppercase">Amount</th>
              <th className="text-right py-3 px-4 text-gray-700 font-bold text-sm uppercase">VAT Amount</th>
              <th className="text-right py-3 px-4 text-gray-700 font-bold text-sm uppercase">VAT Rate</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {data.vatBreakdown.length === 0 ? (
              <tr>
                <td colSpan="4" className="text-center py-12 text-gray-500">No VAT transactions in selected period</td>
              </tr>
            ) : (
              data.vatBreakdown.map((item, index) => (
                <tr key={index} className="hover:bg-blue-50">
                  <td className="py-3 px-4 text-gray-900">{item.item}</td>
                  <td className="py-3 px-4 text-right text-gray-600">₱{item.amount.toLocaleString()}</td>
                  <td className="py-3 px-4 text-right text-gray-900 font-semibold">₱{item.vatAmount.toLocaleString()}</td>
                  <td className="py-3 px-4 text-right text-gray-600">{item.vatRate}%</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// Z-Report Component
function ZReport({ data, onExport }) {
  return (
    <div className="bg-white rounded-lg shadow-md p-6 border border-gray-100">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Z-Report (End of Day)</h2>
        <button
          onClick={onExport}
          className="px-5 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-all flex items-center gap-2 font-semibold shadow-md hover:shadow-lg"
        >
          <Download className="w-5 h-5" />
          Export CSV
        </button>
      </div>

      <div className="bg-blue-50 p-4 rounded-lg border border-blue-200 mb-6">
        <p className="text-sm text-gray-600 mb-1">Report Date</p>
        <p className="text-xl font-bold text-blue-600">{data.date}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="bg-green-50 p-6 rounded-lg border border-green-200">
          <p className="text-sm text-gray-600 mb-2">Total Sales</p>
          <p className="text-3xl font-bold text-green-600">₱{data.totalSales.toLocaleString()}</p>
        </div>
        <div className="bg-blue-50 p-6 rounded-lg border border-blue-200">
          <p className="text-sm text-gray-600 mb-2">Transactions</p>
          <p className="text-3xl font-bold text-blue-600">{data.transactionCount}</p>
        </div>
        <div className="bg-purple-50 p-6 rounded-lg border border-purple-200">
          <p className="text-sm text-gray-600 mb-2">Average Transaction</p>
          <p className="text-3xl font-bold text-purple-600">₱{data.averageTransaction.toLocaleString()}</p>
        </div>
        <div className="bg-yellow-50 p-6 rounded-lg border border-yellow-200">
          <p className="text-sm text-gray-600 mb-2">Cash Sales</p>
          <p className="text-3xl font-bold text-yellow-600">₱{data.cashSales.toLocaleString()}</p>
        </div>
        <div className="bg-indigo-50 p-6 rounded-lg border border-indigo-200">
          <p className="text-sm text-gray-600 mb-2">Card Sales</p>
          <p className="text-3xl font-bold text-indigo-600">₱{data.cardSales.toLocaleString()}</p>
        </div>
      </div>
    </div>
  );
}

// Inventory Valuation Component
function InventoryValuationReport({ data, onExport }) {
  return (
    <div className="bg-white rounded-lg shadow-md p-6 border border-gray-100">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Inventory Valuation</h2>
        <button
          onClick={onExport}
          className="px-5 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-all flex items-center gap-2 font-semibold shadow-md hover:shadow-lg"
        >
          <Download className="w-5 h-5" />
          Export CSV
        </button>
      </div>

      <div className="bg-blue-50 p-6 rounded-lg border border-blue-200 mb-6">
        <p className="text-sm text-gray-600 mb-2">Total Inventory Value</p>
        <p className="text-4xl font-bold text-blue-600">₱{data.totalValue.toLocaleString()}</p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gradient-to-r from-gray-50 to-gray-100">
            <tr>
              <th className="text-left py-3 px-4 text-gray-700 font-bold text-sm uppercase">Category</th>
              <th className="text-right py-3 px-4 text-gray-700 font-bold text-sm uppercase">Value</th>
              <th className="text-right py-3 px-4 text-gray-700 font-bold text-sm uppercase">Items</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {data.categoryValues.length === 0 ? (
              <tr>
                <td colSpan="3" className="text-center py-12 text-gray-500">No inventory data available</td>
              </tr>
            ) : (
              data.categoryValues.map((cat, index) => (
                <tr key={index} className="hover:bg-blue-50">
                  <td className="py-3 px-4 text-gray-900 font-medium">{cat.name}</td>
                  <td className="py-3 px-4 text-right text-gray-900 font-bold">₱{cat.value.toLocaleString()}</td>
                  <td className="py-3 px-4 text-right text-gray-600">{cat.itemCount}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// Low Stock Report Component
function LowStockReport({ data, onExport }) {
  return (
    <div className="bg-white rounded-lg shadow-md p-6 border border-gray-100">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Low Stock Report</h2>
        <button
          onClick={onExport}
          className="px-5 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-all flex items-center gap-2 font-semibold shadow-md hover:shadow-lg"
        >
          <Download className="w-5 h-5" />
          Export CSV
        </button>
      </div>

      <div className="bg-red-50 p-4 rounded-lg border border-red-200 mb-6">
        <p className="text-sm text-gray-600 mb-1">Items Below Reorder Point</p>
        <p className="text-2xl font-bold text-red-600">{data.length} items</p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gradient-to-r from-gray-50 to-gray-100">
            <tr>
              <th className="text-left py-3 px-4 text-gray-700 font-bold text-sm uppercase">Product</th>
              <th className="text-center py-3 px-4 text-gray-700 font-bold text-sm uppercase">Current Stock</th>
              <th className="text-center py-3 px-4 text-gray-700 font-bold text-sm uppercase">Reorder Point</th>
              <th className="text-center py-3 px-4 text-gray-700 font-bold text-sm uppercase">Difference</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {data.length === 0 ? (
              <tr>
                <td colSpan="4" className="text-center py-12 text-gray-500">No low stock items</td>
              </tr>
            ) : (
              data.map((item, index) => (
                <tr key={index} className="hover:bg-red-50">
                  <td className="py-3 px-4 text-gray-900 font-semibold">{item.name}</td>
                  <td className="py-3 px-4 text-center">
                    <span className="px-3 py-1 bg-red-100 text-red-800 rounded-full text-sm font-bold">
                      {item.stock || 0}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-center text-gray-600">{item.reorderPoint}</td>
                  <td className="py-3 px-4 text-center">
                    <span className="px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-sm font-bold">
                      -{item.difference}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// Profit Margin Report Component
function ProfitMarginReport({ data, onExport }) {
  return (
    <div className="bg-white rounded-lg shadow-md p-6 border border-gray-100">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Profit Margin by Product</h2>
        <button
          onClick={onExport}
          className="px-5 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-all flex items-center gap-2 font-semibold shadow-md hover:shadow-lg"
        >
          <Download className="w-5 h-5" />
          Export CSV
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gradient-to-r from-gray-50 to-gray-100">
            <tr>
              <th className="text-left py-3 px-4 text-gray-700 font-bold text-sm uppercase">Product</th>
              <th className="text-right py-3 px-4 text-gray-700 font-bold text-sm uppercase">Selling Price</th>
              <th className="text-right py-3 px-4 text-gray-700 font-bold text-sm uppercase">Purchase Price</th>
              <th className="text-right py-3 px-4 text-gray-700 font-bold text-sm uppercase">Margin</th>
              <th className="text-right py-3 px-4 text-gray-700 font-bold text-sm uppercase">Margin %</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {data.length === 0 ? (
              <tr>
                <td colSpan="5" className="text-center py-12 text-gray-500">No product data available</td>
              </tr>
            ) : (
              data.map((item, index) => (
                <tr key={index} className={`hover:bg-blue-50 ${item.marginPercent < 10 ? 'bg-red-50' : item.marginPercent < 20 ? 'bg-yellow-50' : ''}`}>
                  <td className="py-3 px-4 text-gray-900 font-semibold">{item.name}</td>
                  <td className="py-3 px-4 text-right text-gray-600">₱{item.sellingPrice.toLocaleString()}</td>
                  <td className="py-3 px-4 text-right text-gray-600">₱{item.purchasePrice.toLocaleString()}</td>
                  <td className="py-3 px-4 text-right text-gray-900 font-bold">₱{item.margin.toLocaleString()}</td>
                  <td className="py-3 px-4 text-right">
                    <span className={`px-3 py-1 rounded-full text-sm font-bold ${
                      item.marginPercent >= 30 ? 'bg-green-100 text-green-800' :
                      item.marginPercent >= 20 ? 'bg-blue-100 text-blue-800' :
                      item.marginPercent >= 10 ? 'bg-yellow-100 text-yellow-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {item.marginPercent}%
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// Transaction Modal Component
function TransactionModal({ item, onClose }) {
  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl p-6 max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto border border-gray-200">
        <div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-200">
          <h3 className="text-2xl font-bold text-gray-900">Related Transactions</h3>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-full p-1 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="space-y-4">
          {item.transactions && item.transactions.length > 0 ? (
            item.transactions.map((t, index) => (
              <div key={index} className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-semibold text-gray-900">Transaction #{t.orderId || t.id}</span>
                  <span className="text-sm text-gray-600">
                    {formatDateTime(t.timestamp || t.createdAt)}
                  </span>
                </div>
                <p className="text-lg font-bold text-blue-600">₱{(t.amount || 0).toLocaleString()}</p>
              </div>
            ))
          ) : (
            <p className="text-center py-8 text-gray-500">No transactions found</p>
          )}
        </div>

        <button
          onClick={onClose}
          className="mt-6 w-full bg-gray-200 text-gray-700 py-3 rounded-lg font-medium hover:bg-gray-300 transition-all"
        >
          Close
        </button>
      </div>
    </div>
  );
}

