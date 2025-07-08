'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { createClient } from '@/utils/supabase/client';

export default function ResetPassword() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const supabase = createClient();

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/update-password`,
    });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    setMessage('Check your email for the password reset link');
    setLoading(false);
  };

  return (
    <div className="flex min-h-screen">
      {/* Left: Image / Info */}
      <div
        className="flex min-h-screen w-1/2 items-center justify-center bg-cover bg-center bg-no-repeat px-6 text-white sm:px-8"
        style={{ backgroundImage: "url('/assets/banner.png')" }}
      >
        <div className="max-w-md space-y-4 px-8 text-center">
          <Link href="/" className="flex items-center gap-2">
            <Image
              src="/next.svg"
              className="mx-auto"
              priority
              alt="Logo"
              width={120}
              height={32}
            />
          </Link>
          <h2 className="text-2xl font-bold">Reset your password</h2>
          <p>We'll send you a link to reset your password.</p>
        </div>
      </div>
      {/* Right: Reset Form */}
      <div className="flex w-1/2 flex-col items-center justify-center bg-white px-10">
        <div className="w-full max-w-md space-y-6">
          <h1 className="text-center text-2xl font-bold text-gray-900">Forgot Your Password?</h1>
          <p className="text-center text-sm text-gray-500">
            Enter your email and we'll send you a link to reset your password.
          </p>

          <div className="rounded-xl border px-6 py-4 shadow-lg">
            {error && (
              <div className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-600">{error}</div>
            )}

            {message && (
              <div className="mb-4 rounded-md bg-green-50 p-3 text-sm text-green-600">
                {message}
              </div>
            )}

            <form onSubmit={handleResetPassword} className="space-y-4">
              <div>
                <label htmlFor="email" className="mb-1 block text-sm font-medium">
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-md border px-3 py-2"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-md bg-black py-2 text-white hover:bg-gray-800"
              >
                {loading ? 'Sending link...' : 'Send Reset Link'}
              </button>
            </form>

            <div className="mt-4 text-center">
              <span className="text-sm text-gray-500">Remember your password? </span>
              <Link href="/sign-in" className="text-sm text-blue-600 hover:underline">
                Sign in
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
