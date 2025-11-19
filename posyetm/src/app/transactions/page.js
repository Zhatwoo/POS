'use client';

import { useState, useEffect } from 'react';
import Navbar from '@/app/Components/Navbar';
import { getNestedCollection } from '@/lib/firebase-helpers';
import { buildTransactionsPath } from '@/lib/firebase-config';
import { useUser } from '@/lib/user-context';
import { formatDate, formatDateTime, toDate } from '@/lib/timestamp-utils';
import { 
  Search, 
  Download, 
  Eye, 
  X, 
  Receipt,
  Calendar,
  DollarSign,
  Package
} from 'lucide-react';

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState([]);
  const [filteredTransactions, setFilteredTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTransaction, setSelectedTransaction] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const { companyName, account, loading: userLoading } = useUser();

  useEffect(() => {
    // Wait for user context to load before fetching data
    if (userLoading || !companyName || !account) {
      setLoading(false);
      setTransactions([]);
      return;
    }

    fetchTransactions();
  }, [companyName, account, userLoading]);

  useEffect(() => {
    filterTransactions();
  }, [transactions, searchTerm]);

  const fetchTransactions = async () => {
    try {
      setLoading(true);
      
      // Only fetch if companyName and account are available
      if (!companyName || !account) {
        console.warn('Company name or account not available, skipping data fetch');
        setTransactions([]);
        setLoading(false);
        return;
      }

      // Use dynamic path from firebase-config.js
      const transactionsPath = buildTransactionsPath(companyName, account);
      const data = await getNestedCollection(transactionsPath);
      
      // Sort by date (newest first)
      const sorted = data.sort((a, b) => {
        const dateA = toDate(a.timestamp || a.createdAt) || new Date(0);
        const dateB = toDate(b.timestamp || b.createdAt) || new Date(0);
        return dateB - dateA;
      });
      
      setTransactions(sorted);
    } catch (error) {
      console.error('Error fetching transactions:', error);
      setTransactions([]);
    } finally {
      setLoading(false);
    }
  };

  const filterTransactions = () => {
    let filtered = transactions;

    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(t => {
        const invoiceNum = t.orderId || t.id || '';
        const dateStr = formatDate(t.timestamp || t.createdAt);
        return invoiceNum.toLowerCase().includes(searchLower) || 
               dateStr.toLowerCase().includes(searchLower);
      });
    }

    setFilteredTransactions(filtered);
  };

  const formatDateShort = (timestamp) => {
    return formatDate(timestamp, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const handleViewDetails = (transaction) => {
    setSelectedTransaction(transaction);
    setShowDetailsModal(true);
  };

  const handleDownloadReceipt = (transaction) => {
    const items = transaction.items || [];
    const total = transaction.amount || 0;
    const orderId = transaction.orderId || transaction.id || `INV-${Date.now().toString().slice(-8)}`;
    
    const date = toDate(transaction.timestamp || transaction.createdAt) || new Date();
    const dateTime = formatDateTime(date);
    
    const invoiceNumber = orderId;

    const receiptContent = `
========================================
          POSYSTEM
     Point of Sale System
          RECEIPT
========================================

Invoice #: ${invoiceNumber}
Date: ${dateTime}
Cashier: ${transaction.cashier || 'System'}
Customer: ${transaction.customerName || 'Walk-in Customer'}

----------------------------------------
ITEMS
----------------------------------------
${items.map(item => 
  `${item.name || 'Unknown Item'}
  ${item.quantity || 0} x ₱${(item.price || 0).toLocaleString()} = ₱${(item.subtotal || item.quantity * item.price || 0).toLocaleString()}`
).join('\n\n')}

----------------------------------------
TOTAL: ₱${total.toLocaleString()}
Payment: ${transaction.paymentMethod || 'Cash'}
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
    link.download = `Receipt_${invoiceNumber}_${date.toISOString().split('T')[0]}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="p-6 w-full">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-gray-900">Transactions & Receipts</h1>
            <p className="text-gray-600 mt-2">View all past transactions and download receipts</p>
          </div>

          {/* Search Bar */}
          <div className="bg-white rounded-lg shadow-md p-5 mb-6 border border-gray-100">
            <div className="flex items-center gap-3">
              <Search className="w-5 h-5 text-gray-500" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by invoice number or date..."
                className="flex-1 px-4 py-2.5 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-black transition-all"
              />
              <div className="text-sm text-gray-600 bg-blue-50 px-4 py-2.5 rounded-lg border border-blue-200">
                <span className="font-semibold text-blue-900">
                  {filteredTransactions.length} transaction{filteredTransactions.length !== 1 ? 's' : ''}
                </span>
              </div>
            </div>
          </div>

          {/* Transactions List */}
          {loading ? (
            <div className="bg-white rounded-lg shadow-md p-12 text-center">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
              <p className="text-gray-600 font-medium">Loading transactions...</p>
            </div>
          ) : filteredTransactions.length === 0 ? (
            <div className="bg-white rounded-lg shadow-md p-16 text-center border border-gray-100">
              <Receipt className="w-20 h-20 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 font-medium text-lg">No transactions found</p>
              <p className="text-gray-400 text-sm mt-2">
                {searchTerm ? 'Try adjusting your search' : 'Transactions will appear here after sales'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredTransactions.map((transaction) => {
                const itemsCount = transaction.items?.length || 0;
                const total = transaction.amount || 0;
                const invoiceNum = transaction.orderId || transaction.id || 'N/A';
                const date = formatDateShort(transaction.timestamp || transaction.createdAt);
                
                return (
                  <div
                    key={transaction.id}
                    className="bg-white rounded-lg shadow-md p-6 border border-gray-100 hover:shadow-lg transition-shadow cursor-pointer"
                    onClick={() => handleViewDetails(transaction)}
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <Receipt className="w-5 h-5 text-blue-600" />
                          <span className="text-xs font-semibold text-blue-600 uppercase">Invoice #{invoiceNum.substring(0, 12)}</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-gray-600 mb-3">
                          <Calendar className="w-4 h-4" />
                          <span>{date}</span>
                        </div>
                      </div>
                      <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                        transaction.status === 'completed' 
                          ? 'bg-green-100 text-green-800 border border-green-200'
                          : 'bg-yellow-100 text-yellow-800 border border-yellow-200'
                      }`}>
                        {transaction.status || 'Completed'}
                      </span>
                    </div>

                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <Package className="w-4 h-4" />
                          <span>{itemsCount} item{itemsCount !== 1 ? 's' : ''}</span>
                        </div>
                        <div className="text-right">
                          <p className="text-xs text-gray-500">Total</p>
                          <p className="text-2xl font-bold text-gray-900">₱{total.toLocaleString()}</p>
                        </div>
                      </div>

                      <div className="flex gap-2 pt-3 border-t border-gray-200">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleViewDetails(transaction);
                          }}
                          className="flex-1 px-3 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors flex items-center justify-center gap-2 text-sm font-medium"
                        >
                          <Eye className="w-4 h-4" />
                          View
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDownloadReceipt(transaction);
                          }}
                          className="flex-1 px-3 py-2 bg-green-50 text-green-600 rounded-lg hover:bg-green-100 transition-colors flex items-center justify-center gap-2 text-sm font-medium"
                        >
                          <Download className="w-4 h-4" />
                          Receipt
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Transaction Details Modal */}
      {showDetailsModal && selectedTransaction && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto border border-gray-200">
            <div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-200">
              <div>
                <h3 className="text-2xl font-bold text-gray-900">Transaction Details</h3>
                <p className="text-sm text-gray-600 mt-1">
                  Invoice #{selectedTransaction.orderId || selectedTransaction.id}
                </p>
              </div>
              <button
                onClick={() => {
                  setShowDetailsModal(false);
                  setSelectedTransaction(null);
                }}
                className="text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-full p-1 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="space-y-6">
              {/* Transaction Info */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                  <p className="text-xs text-gray-600 mb-1">Date & Time</p>
                  <p className="font-semibold text-gray-900">
                    {formatDateTime(selectedTransaction.timestamp || selectedTransaction.createdAt)}
                  </p>
                </div>
                <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                  <p className="text-xs text-gray-600 mb-1">Total Amount</p>
                  <p className="font-bold text-2xl text-green-600">
                    ₱{(selectedTransaction.amount || 0).toLocaleString()}
                  </p>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                  <p className="text-xs text-gray-600 mb-1">Customer</p>
                  <p className="font-semibold text-gray-900">
                    {selectedTransaction.customerName || 'Walk-in Customer'}
                  </p>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                  <p className="text-xs text-gray-600 mb-1">Payment Method</p>
                  <p className="font-semibold text-gray-900">
                    {selectedTransaction.paymentMethod || 'Cash'}
                  </p>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                  <p className="text-xs text-gray-600 mb-1">Cashier</p>
                  <p className="font-semibold text-gray-900">
                    {selectedTransaction.cashier || 'System'}
                  </p>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                  <p className="text-xs text-gray-600 mb-1">Status</p>
                  <span className={`px-3 py-1 rounded-full text-xs font-bold inline-block ${
                    selectedTransaction.status === 'completed' 
                      ? 'bg-green-100 text-green-800 border border-green-200'
                      : 'bg-yellow-100 text-yellow-800 border border-yellow-200'
                  }`}>
                    {selectedTransaction.status || 'Completed'}
                  </span>
                </div>
              </div>

              {/* Items List */}
              <div>
                <h4 className="text-lg font-bold text-gray-900 mb-4">Items</h4>
                <div className="bg-gray-50 rounded-lg border border-gray-200 overflow-hidden">
                  <table className="w-full">
                    <thead className="bg-gray-100">
                      <tr>
                        <th className="text-left py-3 px-4 text-xs font-bold text-gray-700 uppercase">Item</th>
                        <th className="text-center py-3 px-4 text-xs font-bold text-gray-700 uppercase">Qty</th>
                        <th className="text-right py-3 px-4 text-xs font-bold text-gray-700 uppercase">Price</th>
                        <th className="text-right py-3 px-4 text-xs font-bold text-gray-700 uppercase">Subtotal</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {(selectedTransaction.items || []).map((item, index) => (
                        <tr key={index} className="hover:bg-white">
                          <td className="py-3 px-4 text-sm font-medium text-gray-900">{item.name || 'Unknown Item'}</td>
                          <td className="py-3 px-4 text-sm text-gray-600 text-center">{item.quantity || 0}</td>
                          <td className="py-3 px-4 text-sm text-gray-600 text-right">₱{(item.price || 0).toLocaleString()}</td>
                          <td className="py-3 px-4 text-sm font-semibold text-gray-900 text-right">
                            ₱{(item.subtotal || item.quantity * item.price || 0).toLocaleString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-gray-100">
                      <tr>
                        <td colSpan="3" className="py-3 px-4 text-sm font-bold text-gray-900 text-right">Total:</td>
                        <td className="py-3 px-4 text-lg font-bold text-gray-900 text-right">
                          ₱{(selectedTransaction.amount || 0).toLocaleString()}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-4 border-t border-gray-200">
                <button
                  onClick={() => handleDownloadReceipt(selectedTransaction)}
                  className="flex-1 bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition-all duration-200 shadow-md hover:shadow-lg flex items-center justify-center gap-2"
                >
                  <Download className="w-5 h-5" />
                  Download Receipt
                </button>
                <button
                  onClick={() => {
                    setShowDetailsModal(false);
                    setSelectedTransaction(null);
                  }}
                  className="flex-1 bg-gray-200 text-gray-700 py-3 rounded-lg font-medium hover:bg-gray-300 transition-all duration-200"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

