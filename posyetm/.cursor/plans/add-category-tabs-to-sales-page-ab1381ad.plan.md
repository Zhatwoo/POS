<!-- ab1381ad-b4ad-4ecd-8ff3-4c060f7060a9 c3d64563-726f-4ef2-9801-14dd7c569ba5 -->
# Create Transactions and Receipts Page

## Overview

Create a page at `src/app/transactions/page.js` (or update Navbar to use `/history`) that displays all past transactions and receipts from the POS system.

## Features to Implement

### 1. Transaction List View

- Display all transactions in a table format
- Columns: Date/Time, Invoice #, Customer, Items Count, Total Amount, Payment Method, Status, Actions
- Sortable by date (newest first)
- Search/filter functionality

### 2. Transaction Details Modal

- Show full transaction details when clicked
- Display all items with quantities and prices
- Show receipt information
- Reprint receipt button

### 3. Receipt Reprint

- Generate and download receipt as text file (same format as sales page)
- Include all transaction details

### 4. Data Fetching

- Fetch from Firebase path: `Company/Company1/Account1/Transactions/transactions`
- Use `getNestedCollection` helper function
- Handle loading and error states

### 5. UI Components

- Import and integrate Navbar
- Responsive table design
- Modern UI matching inventory page style
- Empty state when no transactions
- Loading spinner

## Implementation Details

### Firebase Path

- Use `buildTransactionsPath()` from `firebase-config.js`
- Path: `Company/Company1/Account1/Transactions/transactions`

### Transaction Data Structure

Based on sales page, transactions have:

- `orderId`: Order reference
- `items`: Array of products with name, price, quantity, subtotal
- `amount`: Total amount
- `paymentMethod`: Payment type (Cash, etc.)
- `status`: Transaction status
- `customerName`: Customer name
- `cashier`: Cashier name
- `createdAt`: ISO timestamp
- `timestamp`: Date object

### Receipt Format

- Use same format as `printReceipt` function in sales page
- Include invoice number, date, items, total, payment method

## Files to Create/Modify

1. Create `src/app/transactions/page.js` (or use history page if preferred)
2. Update Navbar if needed to point to correct path

### To-dos

- [x] 
- [x] 
- [x] 
- [x] 
- [x] 
- [x] 