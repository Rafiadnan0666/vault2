'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { createClient } from '@/utils/supabase/client';

export default function SignUp() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const supabase = createClient();

 const handleSignUp = async (e: React.FormEvent) => {
  e.preventDefault();

  setLoading(true);
  setError(null);

  try {
   const { data, error } = await supabase.auth.signUp({
  email,
  password,
  options: {
    emailRedirectTo: `${window.location.origin}/auth/callback`,
  },
});

if (error) {
  console.log('Supabase signUp error:', error); 
  setError(error.message);
  return;
}


    if (data.user) {
      await supabase.from('users').insert([
        {
          id: data.user.id,
          email: data.user.email,
          name: data.user.user_metadata?.name || null,
        },
      ]);
    }
    

    router.push('/sign-in?message=Check your email to confirm your account');
  } catch (err) {
    setError('An unexpected error occurred');
  } finally {
    setLoading(false);
  }
};
  const handleGoogleSignUp = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/api/auth/callback`,
      },
    });
  };

  const handleAppleSignUp = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'apple',
      options: {
        redirectTo: `${window.location.origin}/api/auth/callback`,
      },
    });
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
          <h2 className="text-2xl font-bold">Join our community.</h2>
          <p>Create an account and start your journey with us.</p>
        </div>
      </div>
      {/* Right: Auth Form */}
      <div className="flex w-1/2 flex-col items-center justify-center bg-white px-10">
        <div className="w-full max-w-md space-y-6">
          <h1 className="text-center text-2xl font-bold text-gray-900">Create your Account</h1>
          <p className="text-center text-sm text-gray-500">
            Join us today! Choose your sign-up method:
          </p>

          <div className="rounded-xl border px-6 py-4 shadow-lg">
            {error && (
              <div className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-600">{error}</div>
            )}

            <form onSubmit={handleSignUp} className="space-y-4">
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

              <div>
                <label htmlFor="password" className="mb-1 block text-sm font-medium">
                  Password
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

              

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-md bg-black py-2 text-white hover:bg-gray-800 disabled:opacity-50"
              >
                {loading ? 'Creating account...' : 'Sign up with Email'}
              </button>
            </form>

            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="bg-white px-2 text-gray-500">Or continue with</span>
              </div>
            </div>

            <div className="space-y-3">
              <button
                onClick={handleGoogleSignUp}
                className="flex w-full items-center justify-center gap-2 rounded-md border py-2 text-sm font-medium"
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" width="18" height="18">
                  <path
                    fill="#FFC107"
                    d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12s5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24s8.955,20,20,20s20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z"
                  />
                  <path
                    fill="#FF3D00"
                    d="M6.306,14.691l6.571,4.819C14.655,15.108,18.961,12,24,12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C16.318,4,9.656,8.337,6.306,14.691z"
                  />
                  <path
                    fill="#4CAF50"
                    d="M24,44c5.166,0,9.86-1.977,13.409-5.192l-6.19-5.238C29.211,35.091,26.715,36,24,36c-5.202,0-9.619-3.317-11.283-7.946l-6.522,5.025C9.505,39.556,16.227,44,24,44z"
                  />
                  <path
                    fill="#1976D2"
                    d="M43.611,20.083H42V20H24v8h11.303c-0.792,2.237-2.231,4.166-4.087,5.571c0.001-0.001,0.002-0.001,0.003-0.002l6.19,5.238C36.971,39.205,44,34,44,24C44,22.659,43.862,21.35,43.611,20.083z"
                  />
                </svg>
                Sign up with Google
              </button>

              <button
                onClick={handleAppleSignUp}
                className="flex w-full items-center justify-center gap-2 rounded-md border py-2 text-sm font-medium"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  width="18"
                  height="18"
                  fill="currentColor"
                >
                  <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.8 1.51.15 2.65.77 3.4 1.91-3.12 1.94-2.52 5.84.17 7.13-.67 1.56-1.55 3.03-2.22 3.93M9.2 7.04c-.09-2.83 2.2-5.11 4.95-5.04 0 2.53-2.29 4.67-4.95 5.04" />
                </svg>
                Sign up with Apple
              </button>
            </div>

            <div className="mt-4 text-center">
              <span className="text-sm text-gray-500">Already have an account? </span>
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
