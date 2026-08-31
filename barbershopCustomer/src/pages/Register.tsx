import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

export default function Register() {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    setTimeout(() => {
      if (!formData.name || !formData.email || !formData.phone || !formData.password) {
        setError('Harap lengkapi semua kolom pendaftaran.');
        setIsLoading(false);
        return;
      }

      // Simpan dummy login
      localStorage.setItem('token', 'dummy-token');
      navigate('/');
      setIsLoading(false);
    }, 400);
  };

  return (
    <div className="min-h-screen bg-[#fafafa] text-[#111111] font-sans selection:bg-black selection:text-white flex flex-col justify-between px-6 md:px-12 lg:px-16 py-6 md:py-8">
      {/* Top Header */}
      <header className="flex items-center justify-between w-full max-w-6xl mx-auto">
        <Link to="/" className="inline-block group">
          <img
            src="/logo.jpg"
            alt="Hair Dept. Barbershop"
            className="h-16 sm:h-20 w-auto object-contain mix-blend-multiply transition-transform group-hover:scale-105"
          />
        </Link>

        <Link
          to="/"
          className="text-[11px] sm:text-[12px] font-semibold tracking-wider uppercase hover:opacity-60 transition-opacity"
        >
          ( BACK TO HOME )
        </Link>
      </header>

      {/* Main Form Section */}
      <main className="my-auto py-8 w-full max-w-md mx-auto">
        <div className="border border-black bg-white p-8 sm:p-10 shadow-sm relative">
          {/* Header Title */}
          <div className="text-center mb-8">
            <div className="text-[10px] font-bold tracking-[0.25em] uppercase text-gray-500 mb-2">
              ( NEW MEMBERSHIP )
            </div>
            <h1 className="text-3xl sm:text-4xl font-light tracking-tight">
              CREATE <span className="font-editorial-serif italic font-normal">account</span>
            </h1>
            <p className="mt-2 text-xs text-gray-600">
              Daftar sebagai member Hair Dept untuk booking mudah &amp; penawaran khusus.
            </p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-6 p-3 bg-red-50 border border-red-200 text-red-700 text-xs font-medium flex items-center gap-2">
              <span>⚠️</span>
              <span>{error}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleRegister} className="space-y-4">
            {/* Full Name */}
            <div>
              <label
                htmlFor="name"
                className="block text-[11px] font-bold tracking-wider uppercase mb-1.5"
              >
                Nama Lengkap
              </label>
              <input
                id="name"
                name="name"
                type="text"
                required
                value={formData.name}
                onChange={handleChange}
                placeholder="Nama Anda"
                className="w-full border border-black px-3.5 py-2.5 text-sm bg-transparent placeholder:text-gray-400 focus:outline-none focus:ring-1 focus:ring-black transition"
              />
            </div>

            {/* Email */}
            <div>
              <label
                htmlFor="email"
                className="block text-[11px] font-bold tracking-wider uppercase mb-1.5"
              >
                Email Address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                value={formData.email}
                onChange={handleChange}
                placeholder="nama@email.com"
                className="w-full border border-black px-3.5 py-2.5 text-sm bg-transparent placeholder:text-gray-400 focus:outline-none focus:ring-1 focus:ring-black transition"
              />
            </div>

            {/* Phone */}
            <div>
              <label
                htmlFor="phone"
                className="block text-[11px] font-bold tracking-wider uppercase mb-1.5"
              >
                Nomor HP / WhatsApp
              </label>
              <input
                id="phone"
                name="phone"
                type="tel"
                required
                value={formData.phone}
                onChange={handleChange}
                placeholder="081234567890"
                className="w-full border border-black px-3.5 py-2.5 text-sm bg-transparent placeholder:text-gray-400 focus:outline-none focus:ring-1 focus:ring-black transition"
              />
            </div>

            {/* Password */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label
                  htmlFor="password"
                  className="text-[11px] font-bold tracking-wider uppercase"
                >
                  Password
                </label>
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="text-[10px] uppercase tracking-wider text-gray-500 hover:text-black transition"
                >
                  {showPassword ? 'Hide' : 'Show'}
                </button>
              </div>
              <input
                id="password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                required
                value={formData.password}
                onChange={handleChange}
                placeholder="••••••••"
                className="w-full border border-black px-3.5 py-2.5 text-sm bg-transparent placeholder:text-gray-400 focus:outline-none focus:ring-1 focus:ring-black transition"
              />
            </div>

            {/* Submit Button */}
            <div className="pt-3">
              <button
                type="submit"
                disabled={isLoading}
                className="w-full border border-black bg-black text-white py-3 text-xs font-bold tracking-widest uppercase hover:bg-white hover:text-black transition-all shadow-sm active:scale-[0.99] disabled:opacity-50 cursor-pointer"
              >
                {isLoading ? '( CREATING ACCOUNT... )' : '( REGISTER NOW )'}
              </button>
            </div>
          </form>

          {/* Login Link */}
          <div className="mt-6 pt-6 border-t border-gray-100 text-center text-xs text-gray-600">
            Sudah memiliki akun?{' '}
            <Link
              to="/login"
              className="font-bold text-black hover:underline underline-offset-2 tracking-wide"
            >
              ( LOGIN DI SINI )
            </Link>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full max-w-6xl mx-auto text-center text-xs text-gray-400 py-4">
        © 2026 Hair Dept. Barbershop. All rights reserved.
      </footer>
    </div>
  );
}