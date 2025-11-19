import { config } from 'dotenv';
import { initializeApp, getApps } from 'firebase/app';
import {
  getFirestore,
  doc,
  setDoc,
  serverTimestamp,
} from 'firebase/firestore';

config({ path: '.env.local' });

const requiredEnv = [
  'NEXT_PUBLIC_FIREBASE_API_KEY',
  'NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN',
  'NEXT_PUBLIC_FIREBASE_PROJECT_ID',
  'NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET',
  'NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID',
  'NEXT_PUBLIC_FIREBASE_APP_ID',
];

const missing = requiredEnv.filter((key) => !process.env[key]);
if (missing.length > 0) {
  console.error('Missing Firebase env vars:', missing.join(', '));
  process.exit(1);
}

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
const db = getFirestore(app);

// Get user UID from command line argument
const userId = process.argv[2];

if (!userId) {
  console.error('❌ Error: User ID is required');
  console.log('\nUsage: node scripts/create-admin-user.js <USER_ID>');
  console.log('\nTo get the User ID:');
  console.log('1. Log in to your app');
  console.log('2. Open browser console (F12)');
  console.log('3. Run: firebase.auth().currentUser.uid');
  console.log('4. Copy the UID and run this script with it');
  process.exit(1);
}

async function createAdminUser() {
  console.log(`\n🔐 Creating admin user document for UID: ${userId}\n`);

  try {
    await setDoc(
      doc(db, 'users', userId),
      {
        role: 'admin',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        note: 'Created via scripts/create-admin-user.js',
      },
      { merge: true },
    );
    console.log('✅ Admin user document created successfully!');
    console.log(`\n📝 User ${userId} now has admin role.`);
    console.log('\nYou can now:');
    console.log('1. Log in with this account');
    console.log('2. Access /superadmin page');
    console.log('3. Generate company codes');
  } catch (error) {
    console.error('❌ Failed to create admin user:', error);
    process.exit(1);
  }
}

createAdminUser()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Failed to create admin user:', error);
    process.exit(1);
  });

