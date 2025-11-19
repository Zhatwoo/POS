'use client';

import { useMemo, useState } from 'react';
import { db } from '@/lib/firebase';
import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import { useUser } from '@/lib/user-context';
import Link from 'next/link';

const generateCompanyCode = () =>
  `COMP-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

const CONTRACT_CODE_REGEX = /^[A-Z0-9]{4}-[A-Z0-9]{4}$/;

const formatContractCode = (value) => {
  const sanitized = value.toUpperCase().replace(/[^A-Z0-9]/g, '');
  const first = sanitized.slice(0, 4);
  const second = sanitized.slice(4, 8);
  return second ? `${first}-${second}` : first;
};

const isContractCodeValid = (value) => CONTRACT_CODE_REGEX.test(value);

async function getUniqueCompanyCode() {
  if (!db) {
    throw new Error('Firebase is not configured.');
  }

  for (let attempt = 0; attempt < 7; attempt += 1) {
    const candidate = generateCompanyCode();
    const docSnap = await getDoc(doc(db, 'Company', candidate));
    if (!docSnap.exists()) {
      return candidate;
    }
  }

  throw new Error('Unable to generate a unique company code. Please try again.');
}

const initialForm = {
    name: '',
    address: '',
    contact: '',
    contractCode: '',
    notes: '',
};

export default function SuperAdminPage() {
  const { user, isAdmin, loading } = useUser();
  const [form, setForm] = useState(initialForm);
  const [status, setStatus] = useState({ type: '', text: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [generatedCode, setGeneratedCode] = useState('');
  const [copyStatus, setCopyStatus] = useState('');

  const isReady = useMemo(
    () =>
      form.name.trim() &&
      form.address.trim() &&
      form.contact.trim() &&
      form.contractCode.trim(),
    [form],
  );

  const handleChange = (event) => {
    const { name, value } = event.target;
    if (name === 'contractCode') {
      setForm((prev) => ({ ...prev, contractCode: formatContractCode(value) }));
    } else {
      setForm((prev) => ({ ...prev, [name]: value }));
    }
    setStatus({ type: '', text: '' });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!user) {
      setStatus({
        type: 'error',
        text: 'You must be logged in to register a company. Please log in first.',
      });
      return;
    }

    if (!isAdmin) {
      setStatus({
        type: 'error',
        text: 'Access denied. Only administrators can register companies.',
      });
      return;
    }

    if (!isReady) {
      setStatus({
        type: 'error',
        text: 'Please complete all required fields.',
      });
      return;
    }

    if (!isContractCodeValid(form.contractCode)) {
      setStatus({
        type: 'error',
        text: 'Contract code must match AAAA-BBBB format.',
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
      const companyCode = await getUniqueCompanyCode();
      await setDoc(doc(db, 'Company', companyCode), {
        companyCode,
        name: form.name.trim(),
        address: form.address.trim(),
        contact: form.contact.trim(),
        contractCode: form.contractCode.trim(),
        notes: form.notes.trim(),
        createdBy: 'superadmin',
        createdAt: serverTimestamp(),
      });

      setGeneratedCode(companyCode);
      setStatus({
        type: 'success',
        text: `Company registered. Share company code ${companyCode} with the client.`,
      });
      setForm(initialForm);
      setCopyStatus('');
    } catch (error) {
      console.error('Super admin company registration failed', error);
      let errorMessage = 'Unable to register company right now.';
      
      if (error.code === 'permission-denied') {
        errorMessage = 'Permission denied. Please ensure you are logged in as an administrator.';
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      setStatus({
        type: 'error',
        text: errorMessage,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCopyCode = async () => {
    if (
      !generatedCode ||
      typeof navigator === 'undefined' ||
      !navigator.clipboard
    ) {
      return;
    }
    try {
      await navigator.clipboard.writeText(generatedCode);
      setCopyStatus('Copied!');
      setTimeout(() => setCopyStatus(''), 2000);
    } catch (error) {
      console.error('Copy failed', error);
      setCopyStatus('Copy failed');
      setTimeout(() => setCopyStatus(''), 2000);
    }
  };

  const handleReset = () => {
    setForm(initialForm);
    setGeneratedCode('');
    setStatus({ type: '', text: '' });
    setCopyStatus('');
  };

  // Show loading state while checking authentication
  if (loading) {
    return (
      <main className="min-h-screen bg-[#0F172A] flex items-center justify-center p-4">
        <section className="w-full max-w-3xl rounded-2xl border border-white/10 bg-white/95 p-8 shadow-[0_30px_80px_rgba(15,23,42,0.45)] backdrop-blur">
          <div className="text-center">
            <p className="text-sm text-[#374151]">Checking authentication...</p>
          </div>
        </section>
      </main>
    );
  }

  // Show access denied for unauthenticated users
  if (!user) {
    return (
      <main className="min-h-screen bg-[#0F172A] flex items-center justify-center p-4">
        <section className="w-full max-w-3xl rounded-2xl border border-white/10 bg-white/95 p-8 shadow-[0_30px_80px_rgba(15,23,42,0.45)] backdrop-blur">
          <header className="mb-8 text-center space-y-4">
            <p className="text-xs font-semibold uppercase tracking-[0.4em] text-[#F59E0B]">
              Super Admin Panel
            </p>
            <h1 className="text-3xl font-bold text-[#0F172A]">
              Access Restricted
            </h1>
            <p className="text-sm text-[#374151]">
              You must be logged in to access the Super Admin Panel.
            </p>
            <div className="pt-4">
              <Link
                href="/auth/login"
                className="inline-block rounded-xl bg-gradient-to-r from-[#F97316] to-[#EF4444] px-6 py-3 text-sm font-semibold tracking-wide text-white shadow-lg shadow-[#F97316]/40 transition hover:from-[#FB923C] hover:to-[#F87171] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#FED7AA]"
              >
                Go to Login
              </Link>
            </div>
          </header>
        </section>
      </main>
    );
  }

  // Show access denied for non-admin users
  if (!isAdmin) {
    return (
      <main className="min-h-screen bg-[#0F172A] flex items-center justify-center p-4">
        <section className="w-full max-w-3xl rounded-2xl border border-white/10 bg-white/95 p-8 shadow-[0_30px_80px_rgba(15,23,42,0.45)] backdrop-blur">
          <header className="mb-8 text-center space-y-4">
            <p className="text-xs font-semibold uppercase tracking-[0.4em] text-[#F59E0B]">
              Super Admin Panel
            </p>
            <h1 className="text-3xl font-bold text-[#0F172A]">
              Access Denied
            </h1>
            <p className="text-sm text-[#374151]">
              Only administrators can access the Super Admin Panel. Your account does not have the required permissions.
            </p>
            <div className="pt-4">
              <Link
                href="/dashboard"
                className="inline-block rounded-xl border border-[#F97316] px-6 py-3 text-sm font-semibold text-[#9A3412] transition hover:bg-[#FFF7ED]"
              >
                Go to Dashboard
              </Link>
            </div>
          </header>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#0F172A] flex items-center justify-center p-4">
      <section className="w-full max-w-3xl rounded-2xl border border-white/10 bg-white/95 p-8 shadow-[0_30px_80px_rgba(15,23,42,0.45)] backdrop-blur">
        <header className="mb-8 text-center space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.4em] text-[#F59E0B]">
            Super Admin Panel
          </p>
          <h1 className="text-3xl font-bold text-[#0F172A]">
            Register a Company
          </h1>
          <p className="text-sm text-[#374151]">
            Generate a company code and link it with a contract code before handing it to clients.
          </p>
        </header>

        <form className="space-y-5" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <label className="block text-sm font-semibold text-[#111827]" htmlFor="name">
              Company name
            </label>
            <input
              id="name"
              name="name"
              type="text"
              value={form.name}
              onChange={handleChange}
              className="w-full rounded-xl border border-[#E5E7EB] bg-white px-4 py-3 text-sm font-medium text-[#0F172A] placeholder:text-[#9CA3AF] shadow-sm focus:border-[#2563EB] focus:outline-none focus:ring-2 focus:ring-[#BFDBFE]"
              placeholder="POSystem Trading Corp."
            />
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-semibold text-[#111827]" htmlFor="address">
              Company address
            </label>
            <input
              id="address"
              name="address"
              type="text"
              value={form.address}
              onChange={handleChange}
              className="w-full rounded-xl border border-[#E5E7EB] bg-white px-4 py-3 text-sm font-medium text-[#0F172A] placeholder:text-[#9CA3AF] shadow-sm focus:border-[#2563EB] focus:outline-none focus:ring-2 focus:ring-[#BFDBFE]"
              placeholder="Street, City, Country"
            />
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-semibold text-[#111827]" htmlFor="contact">
              Company contact
            </label>
            <input
              id="contact"
              name="contact"
              type="text"
              value={form.contact}
              onChange={handleChange}
              className="w-full rounded-xl border border-[#E5E7EB] bg-white px-4 py-3 text-sm font-medium text-[#0F172A] placeholder:text-[#9CA3AF] shadow-sm focus:border-[#2563EB] focus:outline-none focus:ring-2 focus:ring-[#BFDBFE]"
              placeholder="+63 900 000 0000"
            />
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-semibold text-[#111827]" htmlFor="contractCode">
              Contract code
            </label>
            <input
              id="contractCode"
              name="contractCode"
              type="text"
              value={form.contractCode}
              onChange={handleChange}
              className="w-full rounded-xl border border-[#E5E7EB] bg-white px-4 py-3 text-sm font-medium text-[#0F172A] placeholder:text-[#9CA3AF] shadow-sm focus:border-[#2563EB] focus:outline-none focus:ring-2 focus:ring-[#BFDBFE]"
              placeholder="ABCD-1234"
            />
            <p className="text-xs text-[#6B7280]">
              Must follow the format AAAA-BBBB using letters and numbers.
            </p>
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-semibold text-[#111827]" htmlFor="notes">
              Notes (optional)
            </label>
            <textarea
              id="notes"
              name="notes"
              rows={3}
              value={form.notes}
              onChange={handleChange}
              className="w-full rounded-xl border border-[#E5E7EB] bg-white px-4 py-3 text-sm font-medium text-[#0F172A] placeholder:text-[#9CA3AF] shadow-sm focus:border-[#2563EB] focus:outline-none focus:ring-2 focus:ring-[#BFDBFE]"
              placeholder="Any remarks for this registration"
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <button
              type="submit"
              className="rounded-xl bg-gradient-to-r from-[#F97316] to-[#EF4444] px-4 py-3 text-sm font-semibold tracking-wide text-white shadow-lg shadow-[#F97316]/40 transition hover:from-[#FB923C] hover:to-[#F87171] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#FED7AA] disabled:cursor-not-allowed disabled:opacity-60"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Registering company...' : 'Register company'}
            </button>
            <button
              type="button"
              onClick={handleReset}
              className="rounded-xl border border-[#F97316] px-4 py-3 text-sm font-semibold text-[#9A3412] transition hover:bg-[#FFF7ED]"
            >
              Reset form
            </button>
          </div>

          {status.text && (
            <p
              className={`text-sm font-medium text-center ${
                status.type === 'error' ? 'text-[#DC2626]' : 'text-[#15803D]'
              }`}
            >
              {status.text}
            </p>
          )}

          {generatedCode && (
            <div className="rounded-xl border border-dashed border-[#F97316] bg-[#FFF7ED] p-4 text-center">
              <p className="text-sm font-medium text-[#9A3412]">Company code</p>
              <p className="text-2xl font-bold text-[#7C2D12] tracking-widest">
                {generatedCode}
              </p>
              <p className="text-xs text-[#9A3412]">
                Share this code with the company along with the contract code.
              </p>
              <div className="mt-3 flex flex-col items-center gap-2 sm:flex-row sm:justify-center">
                <button
                  type="button"
                  onClick={handleCopyCode}
                  className="rounded-full bg-[#F97316] px-4 py-2 text-xs font-semibold uppercase tracking-wide text-white shadow hover:bg-[#ea580c]"
                >
                  Copy code
                </button>
                {copyStatus && (
                  <span className="text-xs font-medium text-[#9A3412]">{copyStatus}</span>
                )}
              </div>
            </div>
          )}
        </form>
      </section>
    </main>
  );
}
