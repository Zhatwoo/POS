'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '@/app/Components/Navbar';
import { getNestedCollection, addNestedDocument, updateNestedDocument } from '@/lib/firebase-helpers';
import { buildSettingsPath } from '@/lib/firebase-config';
import { useUser } from '@/lib/user-context';
import { signOut } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { 
  Save, 
  Store, 
  Receipt,
  Printer,
  CreditCard,
  Barcode,
  Globe,
  Cloud,
  Settings as SettingsIcon,
  CheckCircle,
  X,
  DollarSign,
  LogOut,
  User
} from 'lucide-react';

const SETTINGS_SECTIONS = [
  { id: 'profile', label: 'Account Profile', icon: User },
  { id: 'store', label: 'Store Info', icon: Store },
  { id: 'tax', label: 'Tax Settings', icon: Receipt },
  { id: 'currency', label: 'Currency', icon: DollarSign },
  { id: 'receipt', label: 'Receipt & Invoice', icon: Receipt },
  { id: 'printer', label: 'Printer', icon: Printer },
  { id: 'payment', label: 'Payment Methods', icon: CreditCard },
  { id: 'barcode', label: 'Barcode', icon: Barcode },
  { id: 'system', label: 'System', icon: Globe },
  { id: 'backup', label: 'Backup & Sync', icon: Cloud },
  { id: 'fiscal', label: 'Fiscal Integration', icon: SettingsIcon },
];

export default function SettingsPage() {
  const router = useRouter();
  const [activeSection, setActiveSection] = useState('profile');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [settingsId, setSettingsId] = useState(null);
  const { companyName, account, loading: userLoading, user, userData } = useUser();

  // Settings state
  const [settings, setSettings] = useState({
    // Store Information
    storeInfo: {
      name: '',
      address: '',
      tin: '',
      phone: '',
      email: '',
    },
    // Tax Settings
    taxSettings: {
      vatEnabled: false,
      vatPercentage: 12,
      taxRule: 'inclusive', // 'inclusive' or 'exclusive'
      vatReportFormat: 'standard', // 'standard' or 'government'
    },
    // Currency & Formatting
    currency: {
      symbol: '₱',
      code: 'PHP',
      decimalPlaces: 2,
      roundingRule: 'nearest', // 'up', 'down', 'nearest'
    },
    // Receipt & Invoice
    receipt: {
      template: '',
      invoiceNumberFormat: 'INV-{YYYYMMDD}-{####}',
      invoiceFooterText: 'Thank you for your purchase!',
      receiptHeaderText: 'POSYSTEM\nPoint of Sale System',
    },
    // Printer Settings
    printer: {
      printerName: '',
      paperSize: '80mm',
      autoPrint: false,
      printLogo: false,
    },
    // Payment Methods
    payment: {
      enableCash: true,
      enableCard: false,
      enableMobilePayment: false,
      customMethods: '',
    },
    // Barcode Settings
    barcode: {
      format: 'EAN-13',
      autoGenerate: false,
      prefix: '',
    },
    // System Settings
    system: {
      language: 'en',
      timezone: 'Asia/Manila',
      dateFormat: 'MM/DD/YYYY',
      timeFormat: '12-hour',
    },
    // Backup & Sync
    backup: {
      autoBackup: false,
      backupFrequency: 'daily',
      cloudSync: false,
      lastBackupDate: null,
    },
    // Fiscal Integration
    fiscal: {
      enabled: false,
      printerType: 'none',
    },
  });

  useEffect(() => {
    // Wait for user context to load before fetching data
    if (userLoading || !companyName || !account) {
      setLoading(false);
      return;
    }

    loadSettings();
  }, [companyName, account, userLoading]);

  useEffect(() => {
    if (saveSuccess) {
      const timer = setTimeout(() => setSaveSuccess(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [saveSuccess]);

  const loadSettings = async () => {
    try {
      setLoading(true);
      
      // Only fetch if companyName and account are available
      if (!companyName || !account) {
        console.warn('Company name or account not available, skipping settings load');
        setLoading(false);
        return;
      }

      const settingsPath = buildSettingsPath(companyName, account);
      const settingsData = await getNestedCollection(settingsPath);
      
      if (settingsData && settingsData.length > 0) {
        // Get the first settings document (assuming single settings doc)
        const savedSettings = settingsData[0];
        setSettingsId(savedSettings.id);
        setSettings({
          storeInfo: { ...settings.storeInfo, ...savedSettings.storeInfo },
          taxSettings: { ...settings.taxSettings, ...savedSettings.taxSettings },
          currency: { ...settings.currency, ...savedSettings.currency },
          receipt: { ...settings.receipt, ...savedSettings.receipt },
          printer: { ...settings.printer, ...savedSettings.printer },
          payment: { ...settings.payment, ...savedSettings.payment },
          barcode: { ...settings.barcode, ...savedSettings.barcode },
          system: { ...settings.system, ...savedSettings.system },
          backup: { ...settings.backup, ...savedSettings.backup },
          fiscal: { ...settings.fiscal, ...savedSettings.fiscal },
        });
      } else {
        // No settings found - use defaults (already set in initial state)
        setSettingsId(null);
      }
    } catch (error) {
      console.error('Error loading settings:', error);
      // On error, use default settings
      setSettingsId(null);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      // Verify companyName and account before saving
      if (!companyName || !account) {
        alert('Company name or account not available. Cannot save settings.');
        return;
      }

      setSaving(true);
      const settingsPath = buildSettingsPath(companyName, account);
      const settingsData = {
        ...settings,
        updatedAt: new Date().toISOString(),
      };

      if (settingsId) {
        // Update existing settings
        await updateNestedDocument(settingsPath, settingsId, settingsData);
      } else {
        // Create new settings with default ID 'main' for single settings document
        const id = await addNestedDocument(settingsPath, {
          ...settingsData,
          id: 'main',
          createdAt: new Date().toISOString(),
        });
        setSettingsId(id);
      }

      setSaveSuccess(true);
    } catch (error) {
      console.error('Error saving settings:', error);
      alert('Error saving settings. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const updateSetting = (section, field, value) => {
    setSettings(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [field]: value,
      },
    }));
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      // Redirect to login page after successful logout
      router.push('/auth/login');
    } catch (error) {
      console.error('Error signing out:', error);
      alert('Error signing out. Please try again.');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="p-6 w-full">
          <div className="max-w-7xl mx-auto">
            <div className="bg-white rounded-lg shadow-md p-12 text-center">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
              <p className="text-gray-600 font-medium">Loading settings...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="p-6 w-full">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
              <p className="text-gray-600 mt-2">Configure your POS system settings</p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all duration-200 flex items-center gap-2 font-semibold shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Save className="w-5 h-5" />
                {saving ? 'Saving...' : 'Save All Settings'}
              </button>
              <button
                onClick={handleLogout}
                className="px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-all duration-200 flex items-center gap-2 font-semibold shadow-md hover:shadow-lg"
              >
                <LogOut className="w-5 h-5" />
                Logout
              </button>
            </div>
          </div>

          {/* Success Message */}
          {saveSuccess && (
            <div className="mb-6 bg-green-50 border-2 border-green-500 rounded-lg p-4 flex items-center gap-3">
              <CheckCircle className="w-6 h-6 text-green-600" />
              <p className="text-green-800 font-semibold">Settings saved successfully!</p>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Sidebar Navigation */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-lg shadow-md p-4 border border-gray-100 sticky top-24">
                <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wider mb-4">Settings</h3>
                <nav className="space-y-2">
                  {SETTINGS_SECTIONS.map(section => {
                    const Icon = section.icon;
                    return (
                      <button
                        key={section.id}
                        onClick={() => setActiveSection(section.id)}
                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-all ${
                          activeSection === section.id
                            ? 'bg-blue-600 text-white shadow-md'
                            : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
                        }`}
                      >
                        <Icon className="w-5 h-5" />
                        <span className="font-medium">{section.label}</span>
                      </button>
                    );
                  })}
                </nav>
              </div>
            </div>

            {/* Settings Content */}
            <div className="lg:col-span-3">
              <div className="bg-white rounded-lg shadow-md p-6 border border-gray-100">
                {activeSection === 'profile' && <AccountProfileSection user={user} userData={userData} companyName={companyName} account={account} />}
                {activeSection === 'store' && <StoreInfoSection settings={settings.storeInfo} onUpdate={updateSetting} />}
                {activeSection === 'tax' && <TaxSettingsSection settings={settings.taxSettings} onUpdate={updateSetting} />}
                {activeSection === 'currency' && <CurrencySection settings={settings.currency} onUpdate={updateSetting} />}
                {activeSection === 'receipt' && <ReceiptSection settings={settings.receipt} onUpdate={updateSetting} />}
                {activeSection === 'printer' && <PrinterSection settings={settings.printer} onUpdate={updateSetting} />}
                {activeSection === 'payment' && <PaymentSection settings={settings.payment} onUpdate={updateSetting} />}
                {activeSection === 'barcode' && <BarcodeSection settings={settings.barcode} onUpdate={updateSetting} />}
                {activeSection === 'system' && <SystemSection settings={settings.system} onUpdate={updateSetting} />}
                {activeSection === 'backup' && <BackupSection settings={settings.backup} onUpdate={updateSetting} />}
                {activeSection === 'fiscal' && <FiscalSection settings={settings.fiscal} onUpdate={updateSetting} />}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Account Profile Section
function AccountProfileSection({ user, userData, companyName, account }) {
  const formatDate = (timestamp) => {
    if (!timestamp) return 'N/A';
    try {
      if (timestamp.toDate) {
        return timestamp.toDate().toLocaleString();
      }
      return new Date(timestamp).toLocaleString();
    } catch (error) {
      return 'N/A';
    }
  };

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Account Profile</h2>
      <div className="space-y-6">
        {/* Profile Header */}
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-6 border-2 border-blue-200">
          <div className="flex items-center gap-4">
            <div className="w-20 h-20 bg-blue-600 rounded-full flex items-center justify-center text-white text-3xl font-bold">
              {userData?.fullName?.charAt(0)?.toUpperCase() || user?.email?.charAt(0)?.toUpperCase() || 'U'}
            </div>
            <div>
              <h3 className="text-2xl font-bold text-gray-900">
                {userData?.fullName || 'User'}
              </h3>
              <p className="text-gray-600 mt-1">{userData?.username || 'N/A'}</p>
            </div>
          </div>
        </div>

        {/* Account Information */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Full Name</label>
            <div className="w-full px-4 py-2.5 border-2 border-gray-300 rounded-lg bg-gray-50 text-gray-700">
              {userData?.fullName || 'N/A'}
            </div>
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Username</label>
            <div className="w-full px-4 py-2.5 border-2 border-gray-300 rounded-lg bg-gray-50 text-gray-700">
              {userData?.username || 'N/A'}
            </div>
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Email</label>
            <div className="w-full px-4 py-2.5 border-2 border-gray-300 rounded-lg bg-gray-50 text-gray-700">
              {user?.email || userData?.authEmail || 'N/A'}
            </div>
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">User ID</label>
            <div className="w-full px-4 py-2.5 border-2 border-gray-300 rounded-lg bg-gray-50 text-gray-700 font-mono text-sm">
              {user?.uid || account || 'N/A'}
            </div>
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Company Code</label>
            <div className="w-full px-4 py-2.5 border-2 border-gray-300 rounded-lg bg-gray-50 text-gray-700">
              {companyName || userData?.companyCode || 'N/A'}
            </div>
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Account Created</label>
            <div className="w-full px-4 py-2.5 border-2 border-gray-300 rounded-lg bg-gray-50 text-gray-700">
              {formatDate(userData?.createdAt)}
            </div>
          </div>
        </div>

        {/* Additional Info */}
        <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4">
          <h4 className="text-sm font-semibold text-blue-900 mb-2">Account Information</h4>
          <p className="text-sm text-blue-800">
            This is your account profile information. Contact your administrator if you need to update any details.
          </p>
        </div>
      </div>
    </div>
  );
}

// Store Information Section
function StoreInfoSection({ settings, onUpdate }) {
  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Store Information</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">Store Name *</label>
          <input
            type="text"
            value={settings.name}
            onChange={(e) => onUpdate('storeInfo', 'name', e.target.value)}
            placeholder="Enter store name"
            className="w-full px-4 py-2.5 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-black transition-all"
          />
        </div>
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">TIN (Tax Identification Number)</label>
          <input
            type="text"
            value={settings.tin}
            onChange={(e) => onUpdate('storeInfo', 'tin', e.target.value)}
            placeholder="Enter TIN"
            className="w-full px-4 py-2.5 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-black transition-all"
          />
        </div>
        <div className="md:col-span-2">
          <label className="block text-sm font-semibold text-gray-700 mb-2">Address</label>
          <textarea
            value={settings.address}
            onChange={(e) => onUpdate('storeInfo', 'address', e.target.value)}
            placeholder="Enter store address"
            rows="3"
            className="w-full px-4 py-2.5 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-black transition-all resize-none"
          />
        </div>
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">Phone Number</label>
          <input
            type="tel"
            value={settings.phone}
            onChange={(e) => onUpdate('storeInfo', 'phone', e.target.value)}
            placeholder="Enter phone number"
            className="w-full px-4 py-2.5 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-black transition-all"
          />
        </div>
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">Email</label>
          <input
            type="email"
            value={settings.email}
            onChange={(e) => onUpdate('storeInfo', 'email', e.target.value)}
            placeholder="Enter email address"
            className="w-full px-4 py-2.5 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-black transition-all"
          />
        </div>
      </div>
    </div>
  );
}

// Tax Settings Section
function TaxSettingsSection({ settings, onUpdate }) {
  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Tax Settings</h2>
      <div className="space-y-5">
        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Enable VAT</label>
            <p className="text-xs text-gray-500">Enable VAT calculation for transactions</p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={settings.vatEnabled}
              onChange={(e) => onUpdate('taxSettings', 'vatEnabled', e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-14 h-7 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[4px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-blue-600"></div>
          </label>
        </div>

        {settings.vatEnabled && (
          <>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">VAT Percentage (%)</label>
              <input
                type="number"
                value={settings.vatPercentage}
                onChange={(e) => onUpdate('taxSettings', 'vatPercentage', parseFloat(e.target.value) || 0)}
                min="0"
                max="100"
                step="0.01"
                className="w-full px-4 py-2.5 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-black transition-all"
              />
              <p className="text-xs text-gray-500 mt-1">Default: 12%</p>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-3">Tax Rule</label>
              <div className="flex gap-4">
                <label className="flex-1 flex items-center gap-3 p-4 border-2 rounded-lg cursor-pointer transition-all hover:bg-blue-50 border-gray-300 hover:border-blue-500" style={{ borderColor: settings.taxRule === 'inclusive' ? '#3b82f6' : '#d1d5db' }}>
                  <input
                    type="radio"
                    value="inclusive"
                    checked={settings.taxRule === 'inclusive'}
                    onChange={(e) => onUpdate('taxSettings', 'taxRule', e.target.value)}
                    className="w-5 h-5 text-blue-600 focus:ring-blue-500"
                  />
                  <div>
                    <span className="text-gray-900 font-medium">Inclusive</span>
                    <p className="text-xs text-gray-500">VAT included in price</p>
                  </div>
                </label>
                <label className="flex-1 flex items-center gap-3 p-4 border-2 rounded-lg cursor-pointer transition-all hover:bg-blue-50 border-gray-300 hover:border-blue-500" style={{ borderColor: settings.taxRule === 'exclusive' ? '#3b82f6' : '#d1d5db' }}>
                  <input
                    type="radio"
                    value="exclusive"
                    checked={settings.taxRule === 'exclusive'}
                    onChange={(e) => onUpdate('taxSettings', 'taxRule', e.target.value)}
                    className="w-5 h-5 text-blue-600 focus:ring-blue-500"
                  />
                  <div>
                    <span className="text-gray-900 font-medium">Exclusive</span>
                    <p className="text-xs text-gray-500">VAT added to price</p>
                  </div>
                </label>
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">VAT Report Format</label>
              <select
                value={settings.vatReportFormat}
                onChange={(e) => onUpdate('taxSettings', 'vatReportFormat', e.target.value)}
                className="w-full px-4 py-2.5 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-black transition-all"
              >
                <option value="standard">Standard Format</option>
                <option value="government">Government Compliance Format</option>
              </select>
              <p className="text-xs text-gray-500 mt-1">Select format for VAT reports</p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// Currency Section
function CurrencySection({ settings, onUpdate }) {
  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Currency & Formatting</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">Currency Symbol</label>
          <input
            type="text"
            value={settings.symbol}
            onChange={(e) => onUpdate('currency', 'symbol', e.target.value)}
            placeholder="₱"
            maxLength="5"
            className="w-full px-4 py-2.5 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-black transition-all text-lg"
          />
        </div>
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">Currency Code</label>
          <input
            type="text"
            value={settings.code}
            onChange={(e) => onUpdate('currency', 'code', e.target.value.toUpperCase())}
            placeholder="PHP"
            maxLength="3"
            className="w-full px-4 py-2.5 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-black transition-all"
          />
        </div>
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">Decimal Places</label>
          <input
            type="number"
            value={settings.decimalPlaces}
            onChange={(e) => onUpdate('currency', 'decimalPlaces', parseInt(e.target.value) || 0)}
            min="0"
            max="4"
            className="w-full px-4 py-2.5 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-black transition-all"
          />
          <p className="text-xs text-gray-500 mt-1">Number of decimal places for currency display</p>
        </div>
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">Rounding Rule</label>
          <select
            value={settings.roundingRule}
            onChange={(e) => onUpdate('currency', 'roundingRule', e.target.value)}
            className="w-full px-4 py-2.5 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-black transition-all"
          >
            <option value="nearest">Round to Nearest</option>
            <option value="up">Round Up</option>
            <option value="down">Round Down</option>
          </select>
        </div>
      </div>
    </div>
  );
}

// Receipt & Invoice Section
function ReceiptSection({ settings, onUpdate }) {
  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Receipt & Invoice Settings</h2>
      <div className="space-y-5">
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">Receipt Header Text</label>
          <textarea
            value={settings.receiptHeaderText}
            onChange={(e) => onUpdate('receipt', 'receiptHeaderText', e.target.value)}
            placeholder="POSYSTEM&#10;Point of Sale System"
            rows="3"
            className="w-full px-4 py-2.5 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-black transition-all resize-none"
          />
          <p className="text-xs text-gray-500 mt-1">Text displayed at the top of receipts</p>
        </div>
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">Invoice Number Format</label>
          <input
            type="text"
            value={settings.invoiceNumberFormat}
            onChange={(e) => onUpdate('receipt', 'invoiceNumberFormat', e.target.value)}
            placeholder="INV-{YYYYMMDD}-{####}"
            className="w-full px-4 py-2.5 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-black transition-all"
          />
          <p className="text-xs text-gray-500 mt-1">Use {`{YYYYMMDD}`} for date, {`{####}`} for sequential number</p>
        </div>
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">Invoice Footer Text</label>
          <textarea
            value={settings.invoiceFooterText}
            onChange={(e) => onUpdate('receipt', 'invoiceFooterText', e.target.value)}
            placeholder="Thank you for your purchase!"
            rows="3"
            className="w-full px-4 py-2.5 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-black transition-all resize-none"
          />
          <p className="text-xs text-gray-500 mt-1">Text displayed at the bottom of receipts</p>
        </div>
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">Receipt Template (Advanced)</label>
          <textarea
            value={settings.template}
            onChange={(e) => onUpdate('receipt', 'template', e.target.value)}
            placeholder="Custom receipt template (optional)"
            rows="5"
            className="w-full px-4 py-2.5 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-black transition-all resize-none font-mono text-sm"
          />
          <p className="text-xs text-gray-500 mt-1">Leave empty to use default template</p>
        </div>
      </div>
    </div>
  );
}

// Printer Section
function PrinterSection({ settings, onUpdate }) {
  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Printer Settings</h2>
      <div className="space-y-5">
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">Printer Name</label>
          <input
            type="text"
            value={settings.printerName}
            onChange={(e) => onUpdate('printer', 'printerName', e.target.value)}
            placeholder="Enter printer name"
            className="w-full px-4 py-2.5 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-black transition-all"
          />
        </div>
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">Paper Size</label>
          <select
            value={settings.paperSize}
            onChange={(e) => onUpdate('printer', 'paperSize', e.target.value)}
            className="w-full px-4 py-2.5 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-black transition-all"
          >
            <option value="80mm">80mm (Receipt)</option>
            <option value="A4">A4</option>
            <option value="Letter">Letter</option>
          </select>
        </div>
        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Auto Print</label>
            <p className="text-xs text-gray-500">Automatically print receipt after checkout</p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={settings.autoPrint}
              onChange={(e) => onUpdate('printer', 'autoPrint', e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-14 h-7 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[4px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-blue-600"></div>
          </label>
        </div>
        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Print Logo</label>
            <p className="text-xs text-gray-500">Include logo on printed receipts</p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={settings.printLogo}
              onChange={(e) => onUpdate('printer', 'printLogo', e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-14 h-7 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[4px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-blue-600"></div>
          </label>
        </div>
      </div>
    </div>
  );
}

// Payment Methods Section
function PaymentSection({ settings, onUpdate }) {
  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Payment Methods</h2>
      <div className="space-y-4">
        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Enable Cash</label>
            <p className="text-xs text-gray-500">Accept cash payments</p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={settings.enableCash}
              onChange={(e) => onUpdate('payment', 'enableCash', e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-14 h-7 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[4px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-blue-600"></div>
          </label>
        </div>
        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Enable Card</label>
            <p className="text-xs text-gray-500">Accept card payments</p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={settings.enableCard}
              onChange={(e) => onUpdate('payment', 'enableCard', e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-14 h-7 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[4px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-blue-600"></div>
          </label>
        </div>
        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Enable Mobile Payment</label>
            <p className="text-xs text-gray-500">Accept mobile payment methods (GCash, PayMaya, etc.)</p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={settings.enableMobilePayment}
              onChange={(e) => onUpdate('payment', 'enableMobilePayment', e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-14 h-7 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[4px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-blue-600"></div>
          </label>
        </div>
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">Custom Payment Methods</label>
          <input
            type="text"
            value={settings.customMethods}
            onChange={(e) => onUpdate('payment', 'customMethods', e.target.value)}
            placeholder="GCash, PayMaya, Bank Transfer (comma-separated)"
            className="w-full px-4 py-2.5 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-black transition-all"
          />
          <p className="text-xs text-gray-500 mt-1">Enter custom payment methods separated by commas</p>
        </div>
      </div>
    </div>
  );
}

// Barcode Settings Section
function BarcodeSection({ settings, onUpdate }) {
  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Barcode Settings</h2>
      <div className="space-y-5">
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">Barcode Format</label>
          <select
            value={settings.format}
            onChange={(e) => onUpdate('barcode', 'format', e.target.value)}
            className="w-full px-4 py-2.5 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-black transition-all"
          >
            <option value="EAN-13">EAN-13</option>
            <option value="Code-128">Code 128</option>
            <option value="UPC-A">UPC-A</option>
            <option value="Code-39">Code 39</option>
          </select>
        </div>
        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Auto-generate Barcode</label>
            <p className="text-xs text-gray-500">Automatically generate barcode for new products</p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={settings.autoGenerate}
              onChange={(e) => onUpdate('barcode', 'autoGenerate', e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-14 h-7 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[4px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-blue-600"></div>
          </label>
        </div>
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">Barcode Prefix</label>
          <input
            type="text"
            value={settings.prefix}
            onChange={(e) => onUpdate('barcode', 'prefix', e.target.value)}
            placeholder="Enter prefix (optional)"
            className="w-full px-4 py-2.5 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-black transition-all"
          />
          <p className="text-xs text-gray-500 mt-1">Prefix added to auto-generated barcodes</p>
        </div>
      </div>
    </div>
  );
}

// System Settings Section
function SystemSection({ settings, onUpdate }) {
  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-900 mb-6">System Settings</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">Language</label>
          <select
            value={settings.language}
            onChange={(e) => onUpdate('system', 'language', e.target.value)}
            className="w-full px-4 py-2.5 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-black transition-all"
          >
            <option value="en">English</option>
            <option value="fil">Filipino</option>
            <option value="es">Spanish</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">Timezone</label>
          <select
            value={settings.timezone}
            onChange={(e) => onUpdate('system', 'timezone', e.target.value)}
            className="w-full px-4 py-2.5 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-black transition-all"
          >
            <option value="Asia/Manila">Asia/Manila (Philippines)</option>
            <option value="UTC">UTC</option>
            <option value="America/New_York">America/New_York (EST)</option>
            <option value="Europe/London">Europe/London (GMT)</option>
            <option value="Asia/Tokyo">Asia/Tokyo (JST)</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">Date Format</label>
          <select
            value={settings.dateFormat}
            onChange={(e) => onUpdate('system', 'dateFormat', e.target.value)}
            className="w-full px-4 py-2.5 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-black transition-all"
          >
            <option value="MM/DD/YYYY">MM/DD/YYYY</option>
            <option value="DD/MM/YYYY">DD/MM/YYYY</option>
            <option value="YYYY-MM-DD">YYYY-MM-DD</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">Time Format</label>
          <select
            value={settings.timeFormat}
            onChange={(e) => onUpdate('system', 'timeFormat', e.target.value)}
            className="w-full px-4 py-2.5 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-black transition-all"
          >
            <option value="12-hour">12-hour (AM/PM)</option>
            <option value="24-hour">24-hour</option>
          </select>
        </div>
      </div>
    </div>
  );
}

// Backup & Sync Section
function BackupSection({ settings, onUpdate }) {
  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Backup & Sync</h2>
      <div className="space-y-5">
        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Auto Backup</label>
            <p className="text-xs text-gray-500">Automatically backup data</p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={settings.autoBackup}
              onChange={(e) => onUpdate('backup', 'autoBackup', e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-14 h-7 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[4px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-blue-600"></div>
          </label>
        </div>
        {settings.autoBackup && (
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Backup Frequency</label>
            <select
              value={settings.backupFrequency}
              onChange={(e) => onUpdate('backup', 'backupFrequency', e.target.value)}
              className="w-full px-4 py-2.5 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-black transition-all"
            >
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
            </select>
          </div>
        )}
        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Cloud Sync</label>
            <p className="text-xs text-gray-500">Sync data to cloud storage</p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={settings.cloudSync}
              onChange={(e) => onUpdate('backup', 'cloudSync', e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-14 h-7 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[4px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-blue-600"></div>
          </label>
        </div>
        {settings.lastBackupDate && (
          <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
            <p className="text-sm text-gray-600 mb-1">Last Backup</p>
            <p className="text-lg font-semibold text-blue-600">
              {new Date(settings.lastBackupDate).toLocaleString()}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

// Fiscal Integration Section
function FiscalSection({ settings, onUpdate }) {
  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Fiscal Integration</h2>
      <div className="bg-yellow-50 border-2 border-yellow-200 rounded-lg p-4 mb-6">
        <p className="text-sm text-yellow-800">
          <strong>Note:</strong> Fiscal printer integration requires hardware setup and driver installation.
        </p>
      </div>
      <div className="space-y-5">
        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Fiscal Printer Enabled</label>
            <p className="text-xs text-gray-500">Enable fiscal printer integration</p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={settings.enabled}
              onChange={(e) => onUpdate('fiscal', 'enabled', e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-14 h-7 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[4px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-blue-600"></div>
          </label>
        </div>
        {settings.enabled && (
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Fiscal Printer Type</label>
            <select
              value={settings.printerType}
              onChange={(e) => onUpdate('fiscal', 'printerType', e.target.value)}
              className="w-full px-4 py-2.5 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-black transition-all"
            >
              <option value="none">None</option>
              <option value="bixolon">Bixolon</option>
              <option value="epson">Epson</option>
              <option value="star">Star Micronics</option>
              <option value="custom">Custom</option>
            </select>
            <p className="text-xs text-gray-500 mt-1">Select your fiscal printer model</p>
          </div>
        )}
      </div>
    </div>
  );
}

