<!-- 407ef437-a551-4916-ae7d-5d012f0d124c 2b396d68-deae-43b7-b1e6-c360f4de1feb -->
# Dynamic Data Fetching Implementation

## Current Issues - Hardcoded Data

### 1. Categories (Hardcoded in Multiple Pages)

- **Dashboard**: Uses hardcoded categories array
- **Inventory**: Line 48 - `categories = ['All', 'Beverages', 'Food Items', ...]`
- **Reports**: Line 48 - `categories = ['Beverages', 'Food Items', ...]`
- **Sales**: Line 20 - `categories = ['All', 'Beverages', 'Food Items', ...]`

**Solution**: Fetch dynamically from `Company/Company1/Account1/Products/categories`

### 2. Settings (Not Loaded Dynamically)

- **Sales Page**: Payment method hardcoded to 'Cash'
- **Sales Page**: Receipt template, invoice format, header/footer not from settings
- **Reports Page**: VAT calculations don't use settings
- **All Pages**: Store information not loaded from settings

**Solution**: Create settings context/hook, load on app init, use throughout app

### 3. Payment Methods (Hardcoded)

- **Sales Page**: Only 'Cash' available, no selection UI
- **Settings Page**: Payment methods saved but not used

**Solution**: Fetch from settings, create selection UI in Sales page

### 4. Activity Logs (Missing)

- **Dashboard**: Tries to fetch but collection may not exist
- **All Pages**: No activity logging implemented

**Solution**: Create activity logs collection structure, implement logging

### 5. Store Information (Hardcoded)

- **Receipts**: Store name, address hardcoded as "POSYSTEM"
- **Invoices**: Not using settings store info

**Solution**: Fetch from settings, use in all receipts/invoices

## Implementation Plan

### Phase 1: Dynamic Categories

1. Create helper function to fetch all categories from Firestore
2. Update `firebase-helpers.js` with `getAllCategories()` function
3. Remove hardcoded categories from:

   - `src/app/dashboard/page.js`
   - `src/app/inventory/page.js`
   - `src/app/reports/page.js`
   - `src/app/sales/page.js`

4. Add "All" option dynamically in UI
5. Add category management in Settings or Inventory page

### Phase 2: Settings Context/Hook

1. Create `src/hooks/useSettings.js` or `src/contexts/SettingsContext.js`
2. Load settings on app initialization
3. Provide settings to all pages via context or hook
4. Include default settings if none exist

### Phase 3: Dynamic Payment Methods

1. Fetch payment methods from settings
2. Create payment method selection UI in Sales page
3. Update checkout to use selected payment method
4. Store payment method in transactions

### Phase 4: Dynamic Receipt Generation

1. Load settings in Sales page
2. Use settings.receipt.receiptHeaderText for header
3. Use settings.receipt.invoiceNumberFormat for invoice numbers
4. Use settings.receipt.invoiceFooterText for footer
5. Use settings.storeInfo for store details
6. Apply VAT from settings if enabled

### Phase 5: Activity Logs System

1. Create activity logs collection path: `Company/Company1/Account1/ActivityLogs`
2. Add helper function `logActivity()` in firebase-helpers.js
3. Log activities:

   - Sales/Checkouts
   - Stock adjustments
   - Product add/edit/delete
   - Refunds
   - Settings changes

4. Fetch and display in Dashboard

### Phase 6: Dynamic Store Information

1. Load store info from settings
2. Use in receipts, invoices, reports
3. Replace all hardcoded "POSYSTEM" references
4. Use store name, address, TIN, phone, email from settings

### Phase 7: Firestore Rules Updates

1. Add settings collection rules:
   ```
   match /Company/{companyName}/{account}/Settings/settings/{settingId} {
     allow read: if isAuthenticated();
     allow write: if isAuthenticated() && isAdmin();
   }
   ```

2. Add activity logs collection rules:
   ```
   match /Company/{companyName}/{account}/ActivityLogs/{logId} {
     allow read: if isAuthenticated();
     allow create: if isAuthenticated();
     allow update, delete: if isAuthenticated() && isAdmin();
   }
   ```

3. Add categories collection rules (for category management)
4. Update products/transactions to require authentication

## Files to Create/Modify

### New Files:

1. `src/hooks/useSettings.js` - Settings hook for global access
2. `src/lib/activity-logger.js` - Activity logging helper

### Files to Modify:

1. `firestore.rules` - Add settings, activity logs, categories rules
2. `src/lib/firebase-helpers.js` - Add getAllCategories(), logActivity()
3. `src/lib/firebase-config.js` - Add buildActivityLogsPath(), buildCategoriesPath()
4. `src/app/dashboard/page.js` - Use dynamic categories, load settings, implement activity logs
5. `src/app/inventory/page.js` - Use dynamic categories, load settings
6. `src/app/reports/page.js` - Use dynamic categories, load settings for VAT
7. `src/app/sales/page.js` - Use dynamic categories, load settings, payment selection, dynamic receipts
8. `src/app/settings/page.js` - Add category management section
9. `src/app/transactions/page.js` - Use settings for receipt generation

## Dynamic Data Sources

1. **Categories**: `Company/Company1/Account1/Products/categories/{categoryName}`
2. **Settings**: `Company/Company1/Account1/Settings/settings/{settingId}`
3. **Activity Logs**: `Company/Company1/Account1/ActivityLogs/{logId}`
4. **Store Info**: From settings.storeInfo
5. **Payment Methods**: From settings.payment (enableCash, enableCard, enableMobilePayment, customMethods)