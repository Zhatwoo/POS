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

const contractCodes = ['BDKS-KDS8', 'F8FD-FDSO'];

async function seedContractCodes() {
  console.log('Seeding contract codes...');
  for (const code of contractCodes) {
    await setDoc(
      doc(db, 'contracts', code),
      {
        createdAt: serverTimestamp(),
        note: 'Seeded via scripts/add-contract-codes.js',
      },
      { merge: true },
    );
    console.log(`  ✅ ${code} added`);
  }
  console.log('Done.');
}

seedContractCodes()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Failed to seed contract codes:', error);
    process.exit(1);
  });

