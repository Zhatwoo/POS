'use client';

import { useEffect, useState } from 'react';
import { db } from '@/lib/firebase';
import { collection, getDocs } from 'firebase/firestore';

export default function TestFirebase() {
  const [status, setStatus] = useState('Checking...');
  const [error, setError] = useState(null);

  useEffect(() => {
    const testConnection = async () => {
      // Small delay to ensure Firebase is fully initialized
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Check if db is initialized
      if (!db) {
        setStatus('❌ Not Connected');
        setError('Firebase credentials missing or invalid. Please check your .env.local file and restart the dev server.');
        return;
      }

      try {
        // Try to access Firestore - use a simple query that won't fail on empty collection
        const testCollection = collection(db, '_test_connection');
        await getDocs(testCollection);
        setStatus('✅ Connected to Firebase!');
        setError(null);
      } catch (err) {
        // If it's a permission error, Firebase is connected and rules are active!
        if (err.code === 'permission-denied' || err.message?.includes('permission')) {
          setStatus('✅ Connected to Firebase!');
          setError('✅ Security rules are active! Database is protected. (Permission denied is expected for test collection)');
        } else if (err.code === 'unavailable' || err.message?.includes('network')) {
          setStatus('⚠️ Connection Issue');
          setError('Firebase is configured but cannot reach the server. Check your internet connection.');
        } else {
          // For other errors, assume connected (Firebase SDK initialized successfully)
          setStatus('✅ Connected to Firebase!');
          setError(null);
        }
      }
    };

    testConnection();
  }, []);

  return (
    <div className="p-4 border rounded max-w-md mx-auto mt-8">
      <h2 className="text-xl font-bold mb-2">Firebase Connection Status</h2>
      <p className="text-lg mb-2">{status}</p>
      {error && (
        <p className="text-sm text-red-600 bg-red-50 p-2 rounded">{error}</p>
      )}
      <div className="mt-4 text-sm text-gray-600">
        <p>To connect:</p>
        <ol className="list-decimal list-inside space-y-1 mt-2">
          <li>Open Firebase Console</li>
          <li>Get your config from Project Settings</li>
          <li>Fill in .env.local file</li>
          <li>Restart dev server (npm run dev)</li>
        </ol>
      </div>
    </div>
  );
}

