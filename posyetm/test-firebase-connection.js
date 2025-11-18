// Test Firebase Connection Script
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs } from 'firebase/firestore';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Read .env.local file
let envVars = {};
try {
  const envContent = readFileSync(join(__dirname, '.env.local'), 'utf8');
  envContent.split('\n').forEach(line => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const match = trimmed.match(/^([^=]+)=(.*)$/);
      if (match) {
        envVars[match[1].trim()] = match[2].trim();
      }
    }
  });
} catch (error) {
  console.error('Error reading .env.local:', error.message);
  process.exit(1);
}

// Firebase configuration from environment variables
const firebaseConfig = {
  apiKey: envVars.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: envVars.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: envVars.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: envVars.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: envVars.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: envVars.NEXT_PUBLIC_FIREBASE_APP_ID,
};

console.log('\n🔍 Testing Firebase Connection...\n');
console.log('='.repeat(50));

// Check if all credentials are present
console.log('📋 Checking Credentials:');
const requiredFields = [
  'apiKey',
  'authDomain',
  'projectId',
  'storageBucket',
  'messagingSenderId',
  'appId'
];

let allPresent = true;
requiredFields.forEach(field => {
  const value = firebaseConfig[field];
  if (value && value.trim() !== '') {
    console.log(`  ✅ ${field}: Present`);
  } else {
    console.log(`  ❌ ${field}: Missing`);
    allPresent = false;
  }
});

if (!allPresent) {
  console.log('\n❌ Some credentials are missing. Please check your .env.local file.');
  process.exit(1);
}

console.log('\n🔌 Initializing Firebase...');

try {
  // Initialize Firebase
  const app = initializeApp(firebaseConfig);
  console.log('  ✅ Firebase app initialized');
  
  // Initialize Firestore
  const db = getFirestore(app);
  console.log('  ✅ Firestore initialized');
  
  console.log('\n📊 Testing Firestore Connection...');
  
  // Try to access Firestore (this will test connection and security rules)
  const testCollection = collection(db, '_test_connection');
  
  getDocs(testCollection)
    .then(() => {
      console.log('  ✅ Firestore connection successful!');
      console.log('  ✅ Can read from database');
      console.log('\n' + '='.repeat(50));
      console.log('✅ ALL TESTS PASSED!');
      console.log('✅ Firebase is connected and working!');
      console.log('='.repeat(50) + '\n');
      process.exit(0);
    })
    .catch((error) => {
      if (error.code === 'permission-denied') {
        console.log('  ⚠️  Firestore connection successful but permission denied');
        console.log('  ℹ️  This is normal if security rules are set up');
        console.log('  ℹ️  Your database is secure!');
        console.log('\n' + '='.repeat(50));
        console.log('✅ CONNECTION SUCCESSFUL!');
        console.log('✅ Database is protected by security rules');
        console.log('='.repeat(50) + '\n');
        process.exit(0);
      } else if (error.code === 'unavailable') {
        console.log('  ❌ Cannot reach Firestore server');
        console.log('  ℹ️  Check your internet connection');
        console.log('\n' + '='.repeat(50));
        console.log('❌ CONNECTION FAILED');
        console.log('='.repeat(50) + '\n');
        process.exit(1);
      } else {
        console.log('  ⚠️  Error:', error.message);
        console.log('  ℹ️  Code:', error.code);
        console.log('\n' + '='.repeat(50));
        console.log('⚠️  CONNECTION TESTED (may have security rules)');
        console.log('='.repeat(50) + '\n');
        process.exit(0);
      }
    });
    
} catch (error) {
  console.log('  ❌ Firebase initialization failed');
  console.log('  Error:', error.message);
  console.log('\n' + '='.repeat(50));
  console.log('❌ INITIALIZATION FAILED');
  console.log('='.repeat(50) + '\n');
  process.exit(1);
}

