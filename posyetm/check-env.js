// Quick script to check if .env.local has Firebase credentials
const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '.env.local');

if (!fs.existsSync(envPath)) {
  console.log('❌ .env.local file does not exist');
  process.exit(1);
}

const envContent = fs.readFileSync(envPath, 'utf8');
const lines = envContent.split('\n');

let allFilled = true;
const requiredVars = [
  'NEXT_PUBLIC_FIREBASE_API_KEY',
  'NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN',
  'NEXT_PUBLIC_FIREBASE_PROJECT_ID',
  'NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET',
  'NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID',
  'NEXT_PUBLIC_FIREBASE_APP_ID'
];

console.log('\n📋 Checking Firebase Environment Variables:\n');

requiredVars.forEach(varName => {
  const line = lines.find(l => l.startsWith(varName));
  if (line) {
    const value = line.split('=')[1]?.trim() || '';
    if (value && value.length > 0) {
      console.log(`✅ ${varName}: Filled (${value.substring(0, 20)}...)`);
    } else {
      console.log(`❌ ${varName}: EMPTY`);
      allFilled = false;
    }
  } else {
    console.log(`❌ ${varName}: Missing`);
    allFilled = false;
  }
});

console.log('\n' + '='.repeat(50));
if (allFilled) {
  console.log('✅ All Firebase credentials are filled!');
  console.log('⚠️  Don\'t forget to restart your dev server: npm run dev');
} else {
  console.log('❌ Some credentials are missing or empty.');
  console.log('📝 Please fill in your .env.local file with Firebase credentials.');
  console.log('🔗 Get them from: https://console.firebase.google.com/');
}
console.log('='.repeat(50) + '\n');

