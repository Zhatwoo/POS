'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '@/lib/firebase';

export default function LoginPage() {
  const router = useRouter();
  const [formValues, setFormValues] = useState({
    company: '',
    username: '',
    password: '',
  });
  const [statusMessage, setStatusMessage] = useState({ type: '', text: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormValues((prev) => ({
      ...prev,
      [name]: value,
    }));
    setStatusMessage({ type: '', text: '' });
  };

  const formatIdentifier = () => {
    const trimmedUsername = formValues.username.trim();
    if (!trimmedUsername.includes('@') && formValues.company.trim()) {
      return `${trimmedUsername}@${formValues.company.trim().replace(/\s+/g, '').toLowerCase()}.com`;
    }
    return trimmedUsername;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!formValues.company || !formValues.username || !formValues.password) {
      setStatusMessage({
        type: 'error',
        text: 'Please complete every field before continuing.',
      });
      return;
    }

    if (!auth) {
      setStatusMessage({
        type: 'error',
        text: 'Firebase is not configured. Double‑check your .env.local file.',
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const identifier = formatIdentifier();
      await signInWithEmailAndPassword(auth, identifier, formValues.password);
      // Redirect to dashboard after successful login
      router.push('/dashboard');
    } catch (error) {
      let friendlyMessage = 'Unable to log in right now. Please try again.';
      if (error.code === 'auth/invalid-email') {
        friendlyMessage = 'The username or email looks invalid.';
      } else if (error.code === 'auth/user-not-found') {
        friendlyMessage = 'No account matches that username or email.';
      } else if (error.code === 'auth/wrong-password') {
        friendlyMessage = 'Incorrect password. Please try again.';
      } else if (error.code === 'auth/too-many-requests') {
        friendlyMessage = 'Too many attempts. This account is temporarily locked.';
      }

      setStatusMessage({
        type: 'error',
        text: friendlyMessage,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#F5F3FF] flex items-center justify-center p-4">
      <section className="w-full max-w-md rounded-2xl border border-white/60 bg-white/95 p-8 shadow-[0_20px_45px_rgba(79,70,229,0.15)] backdrop-blur-lg">
        <header className="mb-8 text-center space-y-2">
          <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-gradient-to-r from-[#6366F1] to-[#3B82F6] text-white text-xl font-semibold">
            P
          </div>
          <p className="text-sm font-semibold uppercase tracking-[0.4em] text-[#4C1D95]">
            POSystem
          </p>
          <h1 className="text-3xl font-bold text-[#1E1B4B]">
            Company Login
          </h1>
          <p className="mt-1 text-sm text-[#312E81]">
            Provide your company name, username, and password to continue.
          </p>
        </header>

        <form className="space-y-5" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <label className="block text-sm font-medium text-[#1E1B4B]" htmlFor="company">
              Company
            </label>
            <input
              id="company"
              name="company"
              type="text"
              value={formValues.company}
              onChange={handleChange}
              className="w-full rounded-xl border border-[#DDD6FE] bg-white/60 px-4 py-3 text-sm font-medium text-[#1E1B4B] placeholder:text-[#A5A1C2] shadow-sm focus:border-[#6366F1] focus:outline-none focus:ring-2 focus:ring-[#C7D2FE]"
              placeholder="e.g. POSystem Trading"
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
              value={formValues.username}
              onChange={handleChange}
              className="w-full rounded-xl border border-[#DDD6FE] bg-white/60 px-4 py-3 text-sm font-medium text-[#1E1B4B] placeholder:text-[#A5A1C2] shadow-sm focus:border-[#6366F1] focus:outline-none focus:ring-2 focus:ring-[#C7D2FE]"
              placeholder="Enter your username"
            />
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium text-[#1E1B4B]" htmlFor="password">
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              value={formValues.password}
              onChange={handleChange}
              className="w-full rounded-xl border border-[#DDD6FE] bg-white/60 px-4 py-3 text-sm font-medium text-[#1E1B4B] placeholder:text-[#A5A1C2] shadow-sm focus:border-[#6366F1] focus:outline-none focus:ring-2 focus:ring-[#C7D2FE]"
              placeholder="••••••••"
            />
            <div className="flex justify-end">
              <button
                type="button"
                className="text-xs font-semibold text-[#4C1D95] hover:text-[#312E81]"
              >
                Forgot password?
              </button>
            </div>
          </div>

          <button
            type="submit"
            className="w-full rounded-xl bg-gradient-to-r from-[#6366F1] to-[#3B82F6] px-4 py-3 text-sm font-semibold tracking-wide text-white shadow-lg shadow-[#6366F1]/30 transition hover:from-[#5B5FEF] hover:to-[#2563EB] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#C7D2FE] disabled:cursor-not-allowed disabled:opacity-60"
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Signing in...' : 'Sign in'}
          </button>
        </form>

        {statusMessage.text && (
          <p
            className={`mt-4 text-center text-sm font-medium ${
              statusMessage.type === 'error' ? 'text-[#B91C1C]' : 'text-[#0F766E]'
            }`}
          >
            {statusMessage.text}
          </p>
        )}
      </section>
    </main>
  );
}
