# Firebase Setup Guide

## Paano i-setup ang Firebase sa Next.js project

### Step 1: Gumawa ng Firebase Project

1. Pumunta sa [Firebase Console](https://console.firebase.google.com/)
2. Click "Add project" o piliin ang existing project
3. Sundin ang setup wizard

### Step 2: Kunin ang Firebase Configuration

1. Sa Firebase Console, pumunta sa **Project Settings** (gear icon)
2. Scroll down sa **Your apps** section
3. Click **Web** icon (</>) para mag-add ng web app
4. I-register ang app name
5. Kopyahin ang configuration object

### Step 3: I-setup ang Environment Variables

1. Gumawa ng `.env.local` file sa root ng project
2. I-copy ang content mula sa `.env.local.example`
3. I-fill in ang mga values mula sa Firebase Console:

```env
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key_here
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project_id.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project_id.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
```

### Step 4: Enable Firebase Services

#### Firestore Database
1. Sa Firebase Console, pumunta sa **Firestore Database**
2. Click **Create database**
3. Piliin ang mode (Production o Test mode)
4. Piliin ang location

#### Authentication (kung kailangan)
1. Pumunta sa **Authentication**
2. Click **Get started**
3. Enable ang authentication methods na gusto mo (Email/Password, Google, etc.)

#### Storage (kung kailangan)
1. Pumunta sa **Storage**
2. Click **Get started**
3. Sundin ang setup wizard

### Step 5: Gamitin ang Firebase sa Code

#### Import sa component:
```javascript
import { auth, db, storage } from '@/lib/firebase';
import { getCollection, addDocument } from '@/lib/firebase-helpers';
```

#### Example: Mag-read ng data
```javascript
'use client';
import { useEffect, useState } from 'react';
import { getCollection } from '@/lib/firebase-helpers';

export default function MyComponent() {
  const [data, setData] = useState([]);

  useEffect(() => {
    const fetchData = async () => {
      const result = await getCollection('your_collection_name');
      setData(result);
    };
    fetchData();
  }, []);

  return (
    <div>
      {data.map(item => (
        <div key={item.id}>{item.name}</div>
      ))}
    </div>
  );
}
```

#### Example: Mag-add ng data
```javascript
import { addDocument } from '@/lib/firebase-helpers';

const handleSubmit = async () => {
  try {
    const docId = await addDocument('your_collection_name', {
      name: 'John Doe',
      email: 'john@example.com'
    });
    console.log('Document added with ID:', docId);
  } catch (error) {
    console.error('Error:', error);
  }
};
```

### Security Rules

Huwag kalimutan i-setup ang security rules sa Firestore at Storage para sa production!

## Files Created:
- `src/lib/firebase.js` - Main Firebase configuration
- `src/lib/firebase-helpers.js` - Helper functions para sa common operations
- `.env.local.example` - Template para sa environment variables

