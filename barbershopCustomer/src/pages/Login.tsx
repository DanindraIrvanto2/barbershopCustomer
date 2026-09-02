import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { loginbyemail, loginbyphone } from '../api/authApi';

export default function Login() {
  const navigate = useNavigate();

  const [loginMethod, setLoginMethod] = useState<'email' | 'phone'>('email');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      if (loginMethod === 'email') {
        if (!email || !password) {
          setError('Email dan password wajib diisi.');
          setIsLoading(false);
          return;
        }

        const response = await loginbyemail({
          email,
          password,
        });

        console.log('Login by email successful:', response);

        localStorage.setItem('token', response.token);
        if (response.customer) {
          localStorage.setItem('customer', JSON.stringify(response.customer));
        }
        navigate('/booking');
      } else {
        if (!phone) {
          setError('Nomor handphone wajib diisi.');
          setIsLoading(false);
          return;
        }

        const response = await loginbyphone({
          phone,
        });

        console.log('Login by phone successful:', response);

        localStorage.setItem('token', response.token);
        if (response.customer) {
          localStorage.setItem('customer', JSON.stringify(response.customer));
        }
        navigate('/booking');
      }
    } catch (error: any) {
      console.error('Login failed:', error);

      const errorMessage =
        error?.response?.data?.message ||
        (loginMethod === 'email'
          ? 'Email atau password tidak sesuai.'
          : 'Nomor handphone tidak terdaftar.');

      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleLoginMethod = () => {
    setError('');
    setLoginMethod((prev) => (prev === 'email' ? 'phone' : 'email'));
  };

  return (
    <div className="min-h-screen bg-[#fafafa] text-[#111111] font-sans flex flex-col justify-between px-6 md:px-12 lg:px-16 py-6 md:py-8">

      {/* Header */}
      <header className="flex items-center justify-between w-full max-w-6xl mx-auto">
        <Link to="/" className="inline-block">
          <img
            src="/logo.jpg"
            alt="Hair Dept. Barbershop"
            className="h-16 sm:h-20 w-auto object-contain mix-blend-multiply"
          />
        </Link>

        <Link
          to="/"
          className="text-[11px] sm:text-[12px] font-light tracking-widest uppercase hover:opacity-50 transition"
        >
          ( HOME )
        </Link>
      </header>

      {/* Login Form */}
      <main className="my-auto py-12 w-full max-w-md mx-auto">

        <div className="text-center mb-10">
          <h1 className="text-4xl sm:text-5xl font-light tracking-[-0.02em]">
            SIGN <span className="font-editorial-serif italic">in.</span>
          </h1>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mb-6 p-3 border border-red-500/30 bg-red-50/50 text-red-700 text-xs text-center">
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-6">

          {/* Email / Phone Field */}
          {loginMethod === 'email' ? (
            <div className="space-y-2">
              <label
                htmlFor="email"
                className="block text-[11px] font-light tracking-widest uppercase text-gray-600"
              >
                Email
              </label>

              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email"
                className="w-full bg-transparent border-b border-black/30 focus:border-black py-2.5 text-sm outline-none"
              />
            </div>
          ) : (
            <div className="space-y-2">
              <label
                htmlFor="phone"
                className="block text-[11px] font-light tracking-widest uppercase text-gray-600"
              >
                Phone Number
              </label>

              <input
                id="phone"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="Phone Number"
                className="w-full bg-transparent border-b border-black/30 focus:border-black py-2.5 text-sm outline-none"
              />
            </div>
          )}

          {/* Password (Hanya muncul jika login via Email) */}
          {loginMethod === 'email' && (
            <div className="space-y-2">
              <label
                htmlFor="password"
                className="block text-[11px] font-light tracking-widest uppercase text-gray-600"
              >
                Password
              </label>

              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full bg-transparent border-b border-black/30 focus:border-black py-2.5 text-sm outline-none"
              />
            </div>
          )}

          {/* Buttons */}
          <div className="pt-4 space-y-3">

            <button
              type="submit"
              disabled={isLoading}
              className="w-full border border-black bg-black text-white hover:bg-white hover:text-black py-3 text-[11px] sm:text-[12px] font-light tracking-[0.2em] uppercase transition-all disabled:opacity-50 cursor-pointer"
            >
              {isLoading
                ? '( PROCESSING... )'
                : '( SIGN IN NOW )'}
            </button>

            <button
              type="button"
              onClick={toggleLoginMethod}
              className="w-full border border-black/30 bg-transparent text-black hover:border-black hover:bg-black/5 py-3 text-[11px] sm:text-[12px] font-light tracking-[0.15em] uppercase transition-all cursor-pointer"
            >
              {loginMethod === 'email'
                ? '( SIGN IN WITH PHONE NUMBER )'
                : '( SIGN IN WITH EMAIL )'}
            </button>

          </div>

          {/* Register Link */}
          <div className="pt-6 text-center text-[11px] font-light text-gray-500">
            Belum punya akun?{' '}

            <Link
              to="/register"
              className="text-black font-normal underline underline-offset-4"
            >
              ( DAFTAR MEMBER )
            </Link>
          </div>

        </form>
      </main>

      {/* Footer */}
      <footer className="w-full max-w-6xl mx-auto text-center text-[11px] text-gray-400 font-light py-4">
        © 2026 Hair Dept. All rights reserved.
      </footer>

    </div>
  );
}