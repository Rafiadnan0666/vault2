'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { createClient } from '@/utils/supabase/client';

export default function UpdatePassword() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const supabase = createClient();

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      setLoading(false);
      return;
    }

    const { error } = await supabase.auth.updateUser({ password });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    router.push('/sign-in?message=Password+updated+successfully');
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
          <h2 className="text-2xl font-bold">Set your new password</h2>
          <p>Choose a strong password to secure your account.</p>
        </div>
      </div>
      {/* Right: Update Password Form */}
      <div className="flex w-1/2 flex-col items-center justify-center bg-white px-10">
        <div className="w-full max-w-md space-y-6">
          <h1 className="text-center text-2xl font-bold text-gray-900">Update Your Password</h1>
          <p className="text-center text-sm text-gray-500">
            Enter a new password for your account.
          </p>

          <div className="rounded-xl border px-6 py-4 shadow-lg">
            {error && (
              <div className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-600">{error}</div>
            )}

            <form onSubmit={handleUpdatePassword} className="space-y-4">
              <div>
                <label htmlFor="password" className="mb-1 block text-sm font-medium">
                  New Password
                </label>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-md border px-3 py-2"
                  required
                />
              </div>

              <div>
                <label htmlFor="confirmPassword" className="mb-1 block text-sm font-medium">
                  Confirm New Password
                </label>
                <input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full rounded-md border px-3 py-2"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-md bg-black py-2 text-white hover:bg-gray-800"
              >
                {loading ? 'Updating password...' : 'Update Password'}
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
