# 🔒 Paano i-Setup ang Firestore Security Rules

## ⚠️ IMPORTANT: Kailangan mo i-publish ang rules sa Firebase Console!

Ang `firestore.rules` file ay nasa project mo lang. Kailangan mo itong i-copy at i-paste sa Firebase Console para ma-apply.

---

## 📋 Step-by-Step Instructions:

### Step 1: Buksan ang Firebase Console
1. Pumunta sa: https://console.firebase.google.com/
2. I-login kung kailangan
3. Piliin ang project mo: **posystem-84365**

### Step 2: Pumunta sa Firestore Rules
1. Sa left sidebar, click **Firestore Database**
2. Click ang **Rules** tab (sa taas, katabi ng "Data" at "Indexes")

### Step 3: I-copy ang Rules mula sa `firestore.rules`
1. Buksan ang `firestore.rules` file sa project mo
2. Select all (Ctrl+A)
3. Copy (Ctrl+C)

### Step 4: I-paste sa Firebase Console
1. Sa Rules editor sa Firebase Console, i-delete ang existing rules (kung may test mode)
2. I-paste ang rules na na-copy mo (Ctrl+V)

### Step 5: I-publish ang Rules
1. I-click ang **Publish** button (sa taas ng editor)
2. Maghintay ng confirmation message
3. ✅ Done! Ang database mo ay secure na!

---

## 📝 Rules na i-copy mo:

Ito ang exact rules na i-copy mo:

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

## ✅ Paano i-verify na na-publish na:

1. Pagkatapos mo i-click ang "Publish", dapat may confirmation
2. I-refresh ang page - dapat makikita mo na ang rules doon
3. I-test sa app mo - dapat hindi na lumalabas ang "need to set up security rules" message

---

## 🎯 Ano ang ginagawa ng rules na ito:

- **Users**: Users can only access their own data
- **Products**: Anyone can read (for catalog), but only authenticated users can write
- **Orders**: Users can create orders, but can only read/update their own orders
- **Transactions**: Same as orders - user-specific
- **Categories**: Public read, authenticated write
- **Everything else**: Blocked by default (secure!)

---

## ⚠️ Kung may error sa Rules:

1. I-check kung may syntax error (red underline)
2. I-verify na may `rules_version = '2';` sa taas
3. I-check kung naka-close lahat ng braces `{}`
4. I-click ang "Validate" button bago i-publish

---

## 🚀 After Publishing:

Pagkatapos mo i-publish:
- ✅ Database mo ay secure na
- ✅ Pwede mo nang gamitin ang Firebase sa app
- ✅ Hindi na lalabas ang "need to set up security rules" message

---

**⚠️ REMEMBER:** I-publish mo lang ang rules sa Firebase Console para ma-apply!

