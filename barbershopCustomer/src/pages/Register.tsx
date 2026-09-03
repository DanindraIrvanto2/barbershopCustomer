import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { registerCustomer } from '../api/authApi';

export default function Register() {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
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
    if (error) setError('');
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!formData.name.trim() || !formData.phone.trim() || !formData.password) {
      setError('Nama lengkap, nomor handphone, dan password wajib diisi.');
      return;
    }

    setIsLoading(true);

    try {
      // 1. Kirim request registrasi customer ke backend
      await registerCustomer({
        name: formData.name.trim(),
        phone: formData.phone.trim(),
        email: formData.email.trim() || undefined,
        password: formData.password,
      });

      // 2. Redirect ke halaman login tanpa auto-login langsung ke booking
      navigate('/login', {
        state: {
          successMessage: 'Pendaftaran akun berhasil! Silakan masuk dengan email atau nomor handphone Anda.',
          email: formData.email.trim(),
          phone: formData.phone.trim(),
        },
      });
    } catch (err: any) {
      console.error('Registration error:', err);

      // Handle jika nomor HP sudah terdaftar (409 Conflict atau pesan dari backend)
      if (
        err?.response?.status === 409 ||
        err?.response?.data?.error === 'Nomor HP sudah terdaftar' ||
        err?.response?.data?.message?.toLowerCase().includes('sudah terdaftar')
      ) {
        setError('Nomor handphone sudah terdaftar. Silakan gunakan nomor lain atau langsung login.');
      } else {
        setError(
          err?.response?.data?.error ||
          err?.response?.data?.message ||
          'Terjadi kesalahan saat pendaftaran. Silakan coba lagi.'
        );
      }
    } finally {
      setIsLoading(false);
    }
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

      {/* Main Register Form */}
      <main className="my-auto py-12 w-full max-w-md mx-auto">
        <div className="text-center mb-10">
          <h1 className="text-4xl sm:text-5xl font-light tracking-[-0.02em]">
            REGISTER <span className="font-editorial-serif italic">now.</span>
          </h1>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mb-6 p-3.5 border border-red-500/30 bg-red-50/50 text-red-700 text-xs text-center font-light leading-relaxed">
            {error}
          </div>
        )}

        <form onSubmit={handleRegister} className="space-y-6">
          {/* Full Name */}
          <div className="space-y-2">
            <label
              htmlFor="name"
              className="block text-[11px] font-light tracking-widest uppercase text-gray-600"
            >
              Full Name *
            </label>
            <input
              id="name"
              name="name"
              type="text"
              required
              value={formData.name}
              onChange={handleChange}
              placeholder="Nama Lengkap"
              className="w-full bg-transparent border-b border-black/30 focus:border-black py-2.5 text-sm outline-none"
            />
          </div>

          {/* Phone Number */}
          <div className="space-y-2">
            <label
              htmlFor="phone"
              className="block text-[11px] font-light tracking-widest uppercase text-gray-600"
            >
              Phone Number *
            </label>
            <input
              id="phone"
              name="phone"
              type="tel"
              required
              value={formData.phone}
              onChange={handleChange}
              placeholder="081234567890"
              className="w-full bg-transparent border-b border-black/30 focus:border-black py-2.5 text-sm outline-none"
            />
          </div>

          {/* Email (Optional) */}
          <div className="space-y-2">
            <label
              htmlFor="email"
              className="block text-[11px] font-light tracking-widest uppercase text-gray-600"
            >
              Email Address <span className="text-gray-400 font-normal lowercase">(optional)</span>
            </label>
            <input
              id="email"
              name="email"
              type="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="nama@email.com"
              className="w-full bg-transparent border-b border-black/30 focus:border-black py-2.5 text-sm outline-none"
            />
          </div>

          {/* Password */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label
                htmlFor="password"
                className="block text-[11px] font-light tracking-widest uppercase text-gray-600"
              >
                Password *
              </label>
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="text-[10px] font-light tracking-wider uppercase text-gray-400 hover:text-black transition cursor-pointer"
              >
                {showPassword ? '( HIDE )' : '( SHOW )'}
              </button>
            </div>
            <input
              id="password"
              name="password"
              type={showPassword ? 'text' : 'password'}
              required
              value={formData.password}
              onChange={handleChange}
              placeholder="••••••••••••"
              className="w-full bg-transparent border-b border-black/30 focus:border-black py-2.5 text-sm outline-none"
            />
          </div>

          {/* Submit Button */}
          <div className="pt-4">
            <button
              type="submit"
              disabled={isLoading}
              className="w-full border border-black bg-black text-white hover:bg-white hover:text-black py-3 text-[11px] sm:text-[12px] font-light tracking-[0.2em] uppercase transition-all disabled:opacity-50 cursor-pointer"
            >
              {isLoading ? '( REGISTERING... )' : '( CREATE ACCOUNT )'}
            </button>
          </div>

          {/* Back to Login Link */}
          <div className="pt-6 text-center text-[11px] font-light text-gray-500">
            Sudah memiliki akun?{' '}
            <Link
              to="/login"
              className="text-black font-normal underline underline-offset-4"
            >
              ( LOGIN DI SINI )
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