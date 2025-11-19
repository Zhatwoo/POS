 'use client';

import Link from 'next/link';
import { useState } from 'react';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { auth, db } from '@/lib/firebase';
import {
  doc,
  getDoc,
  collection,
  query,
  where,
  getDocs,
  serverTimestamp,
  setDoc,
} from 'firebase/firestore';

const sanitizeKey = (value) => value.trim().replace(/\s+/g, '').toLowerCase();

export default function RegisterPage() {
  const [accountForm, setAccountForm] = useState({
    companyCode: '',
    fullName: '',
    username: '',
    password: '',
    confirmPassword: '',
  });
  const [accountStatus, setAccountStatus] = useState({ type: '', text: '' });
  const [accountLoading, setAccountLoading] = useState(false);

  const handleAccountChange = (event) => {
    const { name, value } = event.target;
    setAccountForm((prev) => ({ ...prev, [name]: value }));
    setAccountStatus({ type: '', text: '' });
  };

  const handleAccountSubmit = async (event) => {
    event.preventDefault();

    if (!accountForm.companyCode || !accountForm.fullName || !accountForm.username || !accountForm.password || !accountForm.confirmPassword) {
      setAccountStatus({
        type: 'error',
        text: 'Please complete every field.',
      });
      return;
    }

    if (accountForm.password.length < 6) {
      setAccountStatus({
        type: 'error',
        text: 'Password must be at least 6 characters.',
      });
      return;
    }

    if (accountForm.password !== accountForm.confirmPassword) {
      setAccountStatus({
        type: 'error',
        text: 'Passwords do not match.',
      });
      return;
    }

    if (!auth || !db) {
      setAccountStatus({
        type: 'error',
        text: 'Firebase is not configured. Please check your environment variables.',
      });
      return;
    }

    setAccountLoading(true);
    const trimmedCode = accountForm.companyCode.trim().toUpperCase();

    try {
      const companyRef = doc(db, 'Company', trimmedCode);
      const companySnap = await getDoc(companyRef);

      if (!companySnap.exists()) {
        setAccountStatus({
          type: 'error',
          text: 'Company code not found. Please double-check and try again.',
        });
        return;
      }

      // Pre-check: Verify if username already exists for this company
      const accountsRef = collection(db, 'Company', trimmedCode, 'Account');
      const usernameQuery = query(accountsRef, where('username', '==', accountForm.username.trim()));
      const usernameSnapshot = await getDocs(usernameQuery);

      if (!usernameSnapshot.empty) {
        setAccountStatus({
          type: 'error',
          text: `Username "${accountForm.username.trim()}" is already taken for company ${trimmedCode}. Please choose a different username.`,
        });
        return;
      }

      const emailIdentifier = `${sanitizeKey(accountForm.username)}@${sanitizeKey(trimmedCode)}.com`;
      
      // Check if Firebase Auth account already exists by attempting to create
      let credential;
      try {
        credential = await createUserWithEmailAndPassword(auth, emailIdentifier, accountForm.password);
      } catch (authError) {
        // Handle Firebase Auth errors with better messages
        if (authError.code === 'auth/email-already-in-use') {
          setAccountStatus({
            type: 'error',
            text: `An account with username "${accountForm.username.trim()}" already exists for company ${trimmedCode}. Please try logging in instead or use a different username.`,
          });
          return;
        } else if (authError.code === 'auth/weak-password') {
          setAccountStatus({
            type: 'error',
            text: 'Password is too weak. Please choose a stronger password with at least 6 characters.',
          });
          return;
        } else if (authError.code === 'auth/invalid-email') {
          setAccountStatus({
            type: 'error',
            text: 'Invalid username format. Username can only contain letters, numbers, and spaces.',
          });
          return;
        }
        // Re-throw if it's not a handled error
        throw authError;
      }

      // Create Firestore account document
      try {
        await setDoc(doc(db, 'Company', trimmedCode, 'Account', credential.user.uid), {
          uid: credential.user.uid,
          companyCode: trimmedCode,
          username: accountForm.username.trim(),
          fullName: accountForm.fullName.trim(),
          authEmail: emailIdentifier,
          createdAt: serverTimestamp(),
        });

        // Note: Products is now a collection, not a document
        // Collections are created automatically when the first document is added
        // No initialization needed - the Products collection will be created when first category/product is added
      } catch (firestoreError) {
        // Edge case: Firebase Auth account was created but Firestore doc creation failed
        console.error('Firestore document creation failed after auth account creation', firestoreError);
        setAccountStatus({
          type: 'error',
          text: 'Account was partially created. Please contact support or try logging in. If login fails, the account may need to be recreated.',
        });
        // Note: The Firebase Auth account exists but Firestore doc doesn't
        // In production, you might want to delete the auth account here or have a cleanup job
        return;
      }

      setAccountStatus({
        type: 'success',
        text: `Account created successfully for ${accountForm.fullName}. You can now log in with company code "${trimmedCode}" and username "${accountForm.username.trim()}".`,
      });
      setAccountForm({
        companyCode: '',
        fullName: '',
        username: '',
        password: '',
        confirmPassword: '',
      });
    } catch (error) {
      console.error('Account registration failed', error);
      let friendlyMessage = 'Unable to create the account right now. Please try again.';
      
      // Handle Firestore permission errors
      if (error.code === 'permission-denied') {
        friendlyMessage = 'Permission denied. Please ensure you have the correct permissions to create accounts.';
      } else if (error.code === 'unavailable') {
        friendlyMessage = 'Service is temporarily unavailable. Please check your internet connection and try again.';
      } else if (error.message) {
        friendlyMessage = error.message;
      }

      setAccountStatus({
        type: 'error',
        text: friendlyMessage,
      });
    } finally {
      setAccountLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#EEF2FF] flex items-center justify-center p-4">
      <section className="w-full max-w-xl rounded-2xl border border-white/60 bg-white/95 p-8 shadow-[0_25px_60px_rgba(79,70,229,0.18)] backdrop-blur-lg">
        <header className="mb-8 text-center space-y-2">
          <p className="text-sm font-semibold uppercase tracking-[0.4em] text-[#4C1D95]">
            POSystem
          </p>
          <h1 className="text-3xl font-bold text-[#1E1B4B]">
            Register Account
          </h1>
          <p className="text-sm text-[#312E81]">
            Provide your assigned company code to add a new account for that company.
          </p>
          <p className="text-xs text-[#6B7280]">
            Need a company code? Ask the super admin to create it from the{' '}
            <Link href="/superadmin" className="text-[#4C1D95] underline font-semibold">
              company registration portal
            </Link>.
          </p>
        </header>
        <form className="space-y-5" onSubmit={handleAccountSubmit}>
            <div className="space-y-2">
              <label className="block text-sm font-medium text-[#1E1B4B]" htmlFor="companyCode">
                Company code
              </label>
              <input
                id="companyCode"
                name="companyCode"
                type="text"
                value={accountForm.companyCode}
                onChange={handleAccountChange}
                className="w-full rounded-xl border border-[#DDD6FE] bg-white/70 px-4 py-3 text-sm font-medium text-[#1E1B4B] placeholder:text-[#A5A1C2] shadow-sm focus:border-[#6366F1] focus:outline-none focus:ring-2 focus:ring-[#C7D2FE]"
                placeholder="COMP-XXXXXX"
              />
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-[#1E1B4B]" htmlFor="fullName">
                Full name
              </label>
              <input
                id="fullName"
                name="fullName"
                type="text"
                value={accountForm.fullName}
                onChange={handleAccountChange}
                className="w-full rounded-xl border border-[#DDD6FE] bg-white/70 px-4 py-3 text-sm font-medium text-[#1E1B4B] placeholder:text-[#A5A1C2] shadow-sm focus:border-[#6366F1] focus:outline-none focus:ring-2 focus:ring-[#C7D2FE]"
                placeholder="Juan Dela Cruz"
              />
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-[#1E1B4B]" htmlFor="username">
                Username
              </label>
              <input
                id="username"
                name="username"
                type="text"
                value={accountForm.username}
                onChange={handleAccountChange}
                className="w-full rounded-xl border border-[#DDD6FE] bg-white/70 px-4 py-3 text-sm font-medium text-[#1E1B4B] placeholder:text-[#A5A1C2] shadow-sm focus:border-[#6366F1] focus:outline-none focus:ring-2 focus:ring-[#C7D2FE]"
                placeholder="salesrep01"
              />
              <p className="text-xs text-[#6B7280]">
                We create a hidden email identifier using the username + company code.
              </p>
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-[#1E1B4B]" htmlFor="password">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                value={accountForm.password}
                onChange={handleAccountChange}
                className="w-full rounded-xl border border-[#DDD6FE] bg-white/70 px-4 py-3 text-sm font-medium text-[#1E1B4B] placeholder:text-[#A5A1C2] shadow-sm focus:border-[#6366F1] focus:outline-none focus:ring-2 focus:ring-[#C7D2FE]"
                placeholder="••••••••"
              />
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-[#1E1B4B]" htmlFor="confirmPassword">
                Confirm password
              </label>
              <input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                value={accountForm.confirmPassword}
                onChange={handleAccountChange}
                className="w-full rounded-xl border border-[#DDD6FE] bg-white/70 px-4 py-3 text-sm font-medium text-[#1E1B4B] placeholder:text-[#A5A1C2] shadow-sm focus:border-[#6366F1] focus:outline-none focus:ring-2 focus:ring-[#C7D2FE]"
                placeholder="••••••••"
              />
            </div>

            <button
              type="submit"
              className="w-full rounded-xl bg-gradient-to-r from-[#6366F1] to-[#3B82F6] px-4 py-3 text-sm font-semibold tracking-wide text-white shadow-lg shadow-[#6366F1]/30 transition hover:from-[#5B5FEF] hover:to-[#2563EB] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#C7D2FE] disabled:cursor-not-allowed disabled:opacity-60"
              disabled={accountLoading}
            >
              {accountLoading ? 'Creating account...' : 'Register account'}
            </button>

            {accountStatus.text && (
              <p
                className={`text-sm font-medium text-center ${
                  accountStatus.type === 'error' ? 'text-[#B91C1C]' : 'text-[#0F766E]'
                }`}
              >
                {accountStatus.text}
              </p>
            )}
          </form>
      </section>
    </main>
  );
}
