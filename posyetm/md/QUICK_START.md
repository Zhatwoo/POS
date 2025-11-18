# 🚀 Quick Start Guide - POS System Development

## ✅ Setup Complete!

Lahat naka-setup na:
- ✅ Firebase Connected
- ✅ Database Secure
- ✅ Helper Functions Ready
- ✅ Ready to Develop!

---

## 📦 Available Firebase Services:

### 1. Firestore Database (`db`)
Para sa data storage (products, orders, transactions, etc.)

### 2. Authentication (`auth`)
Para sa user login/registration

### 3. Storage (`storage`)
Para sa file uploads (product images, etc.)

---

## 🛠️ How to Use:

### Import sa component:
```javascript
'use client';
import { db, auth } from '@/lib/firebase';
import { getCollection, addDocument, updateDocument, deleteDocument } from '@/lib/firebase-helpers';
```

### Example: Get Products
```javascript
const [products, setProducts] = useState([]);

useEffect(() => {
  const fetchProducts = async () => {
    const data = await getCollection('products');
    setProducts(data);
  };
  fetchProducts();
}, []);
```

### Example: Add Product
```javascript
const handleAddProduct = async () => {
  try {
    const docId = await addDocument('products', {
      name: 'Product Name',
      price: 100,
      category: 'Electronics',
      stock: 50,
      createdAt: new Date().toISOString()
    });
    console.log('Product added:', docId);
  } catch (error) {
    console.error('Error:', error);
  }
};
```

### Example: Update Product
```javascript
const handleUpdateProduct = async (productId) => {
  try {
    await updateDocument('products', productId, {
      price: 150,
      stock: 45
    });
    console.log('Product updated');
  } catch (error) {
    console.error('Error:', error);
  }
};
```

### Example: Delete Product
```javascript
const handleDeleteProduct = async (productId) => {
  try {
    await deleteDocument('products', productId);
    console.log('Product deleted');
  } catch (error) {
    console.error('Error:', error);
  }
};
```

---

## 📋 Recommended Collections for POS:

### 1. Products
```javascript
{
  name: string,
  price: number,
  category: string,
  stock: number,
  description: string,
  imageUrl: string,
  createdAt: timestamp
}
```

### 2. Orders
```javascript
{
  userId: string,
  items: array,
  total: number,
  status: string, // 'pending', 'completed', 'cancelled'
  createdAt: timestamp
}
```

### 3. Transactions
```javascript
{
  userId: string,
  orderId: string,
  amount: number,
  paymentMethod: string,
  createdAt: timestamp
}
```

### 4. Categories
```javascript
{
  name: string,
  description: string,
  createdAt: timestamp
}
```

### 5. Users
```javascript
{
  email: string,
  name: string,
  role: string, // 'admin', 'cashier', 'staff'
  createdAt: timestamp
}
```

---

## 🔐 Security Rules (Already Set Up):

- **Users**: Own data only
- **Products**: Public read, authenticated write
- **Orders**: User-specific
- **Transactions**: User-specific
- **Categories**: Public read, authenticated write
- **Default**: Deny all

---

## 📁 Project Structure:

```
src/
  app/
    components/     # React components
    page.js        # Home page
  lib/
    firebase.js           # Firebase config
    firebase-helpers.js   # Helper functions
```

---

## 🎯 Next Steps:

1. **Create Components:**
   - Product list/management
   - Order creation
   - Transaction history
   - Dashboard

2. **Set up Authentication:**
   - Login page
   - Register page
   - Protected routes

3. **Build POS Features:**
   - Product catalog
   - Shopping cart
   - Checkout
   - Receipt generation

---

## 💡 Tips:

- Use `getCollection()` para sa lists
- Use `addDocument()` para sa create
- Use `updateDocument()` para sa update
- Use `deleteDocument()` para sa delete
- Always handle errors with try/catch
- Use loading states para sa better UX

---

**Happy Coding! 🎉**

