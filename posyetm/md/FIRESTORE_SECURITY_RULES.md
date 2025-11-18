# Firestore Security Rules Guide

## ⚠️ IMPORTANT: I-secure ang Database mo!

Kung hindi mo pa na-setup ang security rules, ang database mo ay **OPEN** at pwede ma-access ng kahit sino!

## Paano i-setup ang Security Rules:

### Step 1: Pumunta sa Firebase Console

1. Buksan ang [Firebase Console](https://console.firebase.google.com/)
2. Piliin ang project mo: **posystem-84365**
3. Sa left sidebar, click **Firestore Database**
4. Click sa **Rules** tab (sa taas)

### Step 2: I-setup ang Security Rules

May dalawang option:

#### Option A: Test Mode (Para sa Development)
⚠️ **WARNING:** Open sa lahat ng users. Gamitin lang sa development/testing.

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if request.time < timestamp.date(2025, 12, 31);
    }
  }
}
```

#### Option B: Production Rules (RECOMMENDED)
✅ **SECURE:** Naka-lock ang database, kailangan authenticated user.

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Example: Users can only read/write their own data
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    
    // Example: Products - anyone can read, only admins can write
    match /products/{productId} {
      allow read: if true;
      allow write: if request.auth != null && 
                     get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';
    }
    
    // Example: Orders - users can create, read their own
    match /orders/{orderId} {
      allow create: if request.auth != null;
      allow read: if request.auth != null && 
                    resource.data.userId == request.auth.uid;
      allow update, delete: if false; // No updates/deletes for now
    }
    
    // Default: Deny all access
    match /{document=**} {
      allow read, write: if false;
    }
  }
}
```

### Step 3: I-click ang "Publish" Button

Pagkatapos mo i-edit ang rules, click **Publish** para ma-apply.

## Common Security Patterns:

### 1. Authenticated Users Only
```javascript
match /{document=**} {
  allow read, write: if request.auth != null;
}
```

### 2. Owner Only Access
```javascript
match /users/{userId} {
  allow read, write: if request.auth != null && request.auth.uid == userId;
}
```

### 3. Public Read, Authenticated Write
```javascript
match /products/{productId} {
  allow read: if true;
  allow write: if request.auth != null;
}
```

### 4. Role-Based Access
```javascript
match /admin/{document=**} {
  allow read, write: if request.auth != null && 
                       get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';
}
```

## Para sa POS System mo, recommended rules:

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
    
    // Default: Deny all
    match /{document=**} {
      allow read, write: if false;
    }
  }
}
```

## Testing Security Rules:

1. Sa Firebase Console, may **Rules Playground** sa baba
2. Pwede mo i-test ang rules doon bago i-publish

## Important Notes:

⚠️ **API Key Exposure:**
- Ang `NEXT_PUBLIC_FIREBASE_API_KEY` ay visible sa client-side
- Normal lang ito - ang API key ay hindi sensitive
- Ang security ay nasa **Security Rules**, hindi sa API key
- Kahit may API key, kung may security rules, hindi pa rin ma-access ang data

✅ **Best Practices:**
1. Always use security rules (hindi lang test mode)
2. Use authentication para sa user-specific data
3. Validate data sa rules (check fields, types, etc.)
4. Test ang rules bago i-deploy sa production

## Storage Security Rules:

Kung gumagamit ka ng Firebase Storage, i-setup din ang rules:

1. Pumunta sa **Storage** → **Rules** tab
2. I-setup ang similar rules

Example:
```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /{allPaths=**} {
      allow read: if true;
      allow write: if request.auth != null;
    }
  }
}
```

---

**⚠️ ACTION REQUIRED:** I-setup mo na ang security rules sa Firebase Console para ma-secure ang database mo!

