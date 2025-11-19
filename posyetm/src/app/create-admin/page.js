'use client';

import { useState } from 'react';
import { db } from '@/lib/firebase';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { useUser } from '@/lib/user-context';
import Link from 'next/link';

export default function CreateAdminPage() {
  const { user } = useUser();
  const [userId, setUserId] = useState('');
  const [status, setStatus] = useState({ type: '', text: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!userId.trim()) {
      setStatus({
        type: 'error',
        text: 'Please enter a User ID.',
      });
      return;
    }

    if (!db) {
      setStatus({
        type: 'error',
        text: 'Firebase is not configured. Check environment variables.',
      });
      return;
    }

    setIsSubmitting(true);
    try {
      await setDoc(
        doc(db, 'users', userId.trim()),
        {
          role: 'admin',
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
          createdBy: user?.uid || 'manual',
        },
        { merge: true },
      );

      setStatus({
        type: 'success',
        text: `Admin role assigned to user ${userId.trim()}. They can now access the superadmin page.`,
      });
      setUserId('');
    } catch (error) {
      console.error('Failed to create admin user:', error);
      setStatus({
        type: 'error',
        text: error.message || 'Unable to assign admin role. Please try again.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#0F172A] flex items-center justify-center p-4">
      <section className="w-full max-w-2xl rounded-2xl border border-white/10 bg-white/95 p-8 shadow-[0_30px_80px_rgba(15,23,42,0.45)] backdrop-blur">
        <header className="mb-8 text-center space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.4em] text-[#F59E0B]">
            Admin Setup
          </p>
          <h1 className="text-3xl font-bold text-[#0F172A]">
            Create Admin Account
          </h1>
          <p className="text-sm text-[#374151]">
            Assign admin role to a user. This is a one-time setup page.
          </p>
        </header>

        <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-xl">
          <p className="text-sm font-semibold text-blue-900 mb-2">How to get User ID:</p>
          <ol className="text-sm text-blue-800 space-y-1 list-decimal list-inside">
            <li>First, create a regular account using the <Link href="/auth/register" className="underline font-semibold">registration page</Link> (you'll need a company code - see note below)</li>
            <li>After logging in, open browser console (F12)</li>
            <li>Run this command: <code className="bg-blue-100 px-2 py-1 rounded">firebase.auth().currentUser.uid</code></li>
            <li>Copy the User ID and paste it below</li>
          </ol>
          <p className="text-xs text-blue-700 mt-3">
            <strong>Note:</strong> If you don't have a company code yet, you can temporarily create one manually in Firestore, or use this page after setting up the first admin through Firebase Console.
          </p>
        </div>

        <form className="space-y-5" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <label className="block text-sm font-semibold text-[#111827]" htmlFor="userId">
              User ID (Firebase Auth UID)
            </label>
            <input
              id="userId"
              name="userId"
              type="text"
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              className="w-full rounded-xl border border-[#E5E7EB] bg-white px-4 py-3 text-sm font-medium text-[#0F172A] placeholder:text-[#9CA3AF] shadow-sm focus:border-[#2563EB] focus:outline-none focus:ring-2 focus:ring-[#BFDBFE]"
              placeholder="Enter Firebase Auth User ID"
            />
            <p className="text-xs text-[#6B7280]">
              This is the UID from Firebase Authentication, not the username.
            </p>
          </div>

          <button
            type="submit"
            className="w-full rounded-xl bg-gradient-to-r from-[#F97316] to-[#EF4444] px-4 py-3 text-sm font-semibold tracking-wide text-white shadow-lg shadow-[#F97316]/40 transition hover:from-[#FB923C] hover:to-[#F87171] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#FED7AA] disabled:cursor-not-allowed disabled:opacity-60"
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Assigning admin role...' : 'Assign Admin Role'}
          </button>

          {status.text && (
            <p
              className={`text-sm font-medium text-center ${
                status.type === 'error' ? 'text-[#DC2626]' : 'text-[#15803D]'
              }`}
            >
              {status.text}
            </p>
          )}

          <div className="pt-4 border-t">
            <Link
              href="/superadmin"
              className="block text-center text-sm text-[#6B7280] hover:text-[#111827] underline"
            >
              Go to Super Admin Panel →
            </Link>
          </div>
        </form>
      </section>
    </main>
  );
}

