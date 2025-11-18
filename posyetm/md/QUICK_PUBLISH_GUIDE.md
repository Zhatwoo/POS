# 🚀 Quick Guide: I-Publish ang Security Rules

## ⚠️ IMPORTANT: Ang rules file ay nasa project mo lang. Kailangan mo itong i-publish sa Firebase Console!

---

## 📋 3 Simple Steps:

### Step 1: Buksan ang Firebase Console
👉 https://console.firebase.google.com/
- Piliin ang project: **posystem-84365**
- Click **Firestore Database** → **Rules** tab

### Step 2: I-copy at i-paste
- Buksan ang `firestore.rules` file
- **Select All** (Ctrl+A)
- **Copy** (Ctrl+C)
- I-paste sa Rules editor sa Firebase Console (Ctrl+V)

### Step 3: I-publish
- Click ang **Publish** button
- ✅ Done!

---

## 📝 Exact Rules na i-copy mo:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // Users collection - users can only access their own data
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    
    // Products - public read, authenticated write
    match /products/{productId} {
      allow read: if true;
      allow write: if request.auth != null;
    }
    
    // Orders - users can create, read their own orders
    match /orders/{orderId} {
      allow create: if request.auth != null;
      allow read: if request.auth != null && 
                    resource.data.userId == request.auth.uid;
      allow update, delete: if request.auth != null && 
                              resource.data.userId == request.auth.uid;
    }
    
    // Transactions - similar to orders
    match /transactions/{transactionId} {
      allow create: if request.auth != null;
      allow read: if request.auth != null && 
                    resource.data.userId == request.auth.uid;
      allow update, delete: if request.auth != null && 
                              resource.data.userId == request.auth.uid;
    }
    
    // Categories - public read, authenticated write
    match /categories/{categoryId} {
      allow read: if true;
      allow write: if request.auth != null;
    }
    
    // Default: Deny all access
    match /{document=**} {
      allow read, write: if false;
    }
  }
}
```

---

## ✅ After Publishing:

1. I-refresh ang app mo
2. Dapat mawala na ang warning message
3. Database mo ay secure na! 🎉

---

**⚠️ REMEMBER:** Local file ≠ Active rules. Kailangan i-publish sa Firebase Console!

