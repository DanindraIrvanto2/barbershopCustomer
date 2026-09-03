import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

const Home: React.FC = () => {
  const [customer, setCustomer] = useState<{ id?: number; name?: string; phone?: string } | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const storedCustomer = localStorage.getItem('customer');
    if (token) {
      setIsLoggedIn(true);
      if (storedCustomer) {
        try {
          setCustomer(JSON.parse(storedCustomer));
        } catch (e) {
          console.error(e);
        }
      }
    } else {
      setIsLoggedIn(false);
      setCustomer(null);
    }
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('customer');
    setIsLoggedIn(false);
    setCustomer(null);
  };

  const scrollToServices = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    const element = document.getElementById('locations-services');
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const bookingTargetUrl = isLoggedIn ? '/booking' : '/login';

  return (
    <div className="min-h-screen bg-[#fafafa] text-[#111111] font-sans selection:bg-black selection:text-white flex flex-col justify-between">

      {/* ===================== HERO SECTION ===================== */}
      <div className="min-h-screen flex flex-col justify-between px-6 md:px-12 lg:px-16 py-6 md:py-8">
        {/* Top Navigation */}
        <header className="flex items-center justify-between w-full">
          {/* Brand Logo */}
          <Link to="/" className="inline-block group">
            <img
              src="/logo.jpg"
              alt="Hair Dept. Barbershop"
              className="h-18 sm:h-22 md:h-24 lg:h-28 w-auto object-contain mix-blend-multiply transition-transform group-hover:scale-105"
            />
          </Link>

          {/* Navigation Links */}
          <nav className="hidden md:flex items-center space-x-6 lg:space-x-8 text-[11px] lg:text-[12px] font-semibold tracking-wider uppercase font-mono-spaced">
            <Link
              to="/"
              className="hover:opacity-60 transition-opacity"
            >
              ( HOME / ABOUT )
            </Link>
            <a
              href="#locations-services"
              onClick={scrollToServices}
              className="hover:opacity-60 transition-opacity cursor-pointer"
            >
              ( LOCATIONS &amp; SERVICES )
            </a>

            {isLoggedIn ? (
              <div className="flex items-center space-x-4">
                {customer?.name && (
                  <span className="text-gray-500 font-normal">
                    ( {customer.name} )
                  </span>
                )}
                <Link
                  to="/history"
                  className="hover:opacity-60 transition-opacity text-neutral-700 font-mono-spaced"
                >
                  ( RIWAYAT )
                </Link>
                <Link
                  to="/booking"
                  className="border border-black bg-black text-white px-3 py-1 text-[11px] hover:bg-transparent hover:text-black transition-colors"
                >
                  BOOKING
                </Link>
                <button
                  onClick={handleLogout}
                  className="border border-black/30 px-2.5 py-1 text-[11px] hover:border-black hover:bg-black hover:text-white transition-colors cursor-pointer"
                >
                  LOGOUT
                </button>
              </div>
            ) : (
              <Link
                to="/login"
                className="border border-black px-3 py-1 text-[11px] hover:bg-black hover:text-white transition-colors"
              >
                LOGIN
              </Link>
            )}
          </nav>

          {/* Mobile menu link */}
          <div className="flex md:hidden items-center space-x-3 text-[11px] font-mono-spaced uppercase">
            {isLoggedIn ? (
              <>
                <Link
                  to="/booking"
                  className="border border-black bg-black text-white px-2.5 py-1 text-[10px] font-semibold"
                >
                  BOOKING
                </Link>
                <button
                  onClick={handleLogout}
                  className="border border-black px-2 py-1 text-[10px] font-semibold hover:bg-black hover:text-white transition"
                >
                  LOGOUT
                </button>
              </>
            ) : (
              <Link
                to="/login"
                className="border border-black px-3 py-1 text-[11px] font-semibold hover:bg-black hover:text-white transition-colors"
              >
                LOGIN
              </Link>
            )}
          </div>
        </header>

        {/* Main Hero & Content Section */}
        <main className="my-auto py-10 lg:py-12 w-full max-w-[1400px] mx-auto">
          {/* Giant Editorial Typography Grid */}
          <div className="relative">
            {/* Top Line: HAIR DEPT in YOUR HOME */}
            <div className="flex items-baseline flex-wrap text-[40px] sm:text-[60px] md:text-[80px] lg:text-[100px] xl:text-[116px] font-light tracking-[-0.02em] leading-[0.9]">
              <span className="font-normal">HAIR</span>
              <span className="font-normal ml-2.5 sm:ml-4">DEPT.</span>
              <span className="font-editorial-serif font-light italic lowercase mx-2 sm:mx-4 lg:mx-6 text-[0.62em] font-serif">
                in
              </span>
              <span className="font-light tracking-[-0.01em]">YOUR</span>
              <span className="font-normal ml-2.5 sm:ml-4">H</span>
              <span className="font-editorial-serif font-light italic lowercase px-0.5 sm:px-1 text-[1.12em] transform -translate-y-1">
                O
              </span>
              <span className="font-normal">ME</span>
            </div>

            {/* Main Content Grid: CERTIFIED BARBERS. [HD LOGO] Description */}
            <div className="mt-6 sm:mt-10 grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-center">
              {/* Left Column: CERTIFIED BARBERS. */}
              <div className="lg:col-span-4 flex flex-col justify-center">
                <div className="text-[40px] sm:text-[60px] md:text-[76px] lg:text-[84px] xl:text-[96px] font-normal tracking-[-0.03em] leading-[0.9]">
                  CERTIFIED BARBERS.
                </div>
              </div>

              {/* Center Column: Exact HD Logo Image from User */}
              <div className="lg:col-span-4 flex justify-center items-center py-2">
                <img
                  src="/hd-logo.png"
                  alt="Hair Dept HD Logo"
                  className="w-48 sm:w-56 md:w-64 lg:w-72 h-auto object-contain"
                />
              </div>

              {/* Right Column: Editorial Description Copy */}
              <div className="lg:col-span-4 flex flex-col justify-start">
                {/* Narrative description */}
                <div className="flex items-start gap-4">
                  {/* Dot bullet indicator */}
                  <div className="w-3.5 h-3.5 rounded-full bg-black shrink-0 mt-1.5 hidden sm:block"></div>

                  <div className="space-y-4 text-[12px] sm:text-[13px] leading-[1.65] text-[#222222] max-w-lg font-medium">
                    <p>
                      Hair Dept. is the grooming specialist for men of good taste. With our passion
                      in the barbering world, we form the foundations of the quality haircut and
                      ultimate grooming experience.
                    </p>

                    <p className="text-[#444444]">
                      Backed by a track record of achievement, we were confident we could offer
                      something new. In 2026, we established our first outlet in a modest area of
                      Tangerang.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </main>

        {/* Bottom Footer Action Bar */}
        <footer className="w-full flex flex-col sm:flex-row items-center justify-between gap-4 pt-8 pb-2 border-t border-transparent">
          {/* Left / Center: Book CTA */}
          <div>
            <Link
              to={bookingTargetUrl}
              className="inline-block border border-black px-6 py-2 text-[11px] sm:text-[12px] font-bold tracking-widest uppercase hover:bg-black hover:text-white transition-all shadow-sm active:scale-95 cursor-pointer font-mono-spaced"
            >
              ( BOOK OUR SERVICES NOW )
            </Link>
          </div>

          {/* Right: Social Media Icon Links (Only Instagram) */}
          <div className="flex items-center space-x-3">
            {/* Instagram */}
            <a
              href="https://instagram.com"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Instagram"
              className="w-8 h-8 rounded-full bg-black text-white flex items-center justify-center hover:opacity-80 transition-opacity"
            >
              <svg
                className="w-4 h-4 fill-current"
                viewBox="0 0 24 24"
              >
                <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
              </svg>
            </a>
          </div>
        </footer>
      </div>

      {/* ===================== LOCATIONS & SERVICES SECTION ===================== */}
      <section id="locations-services" className="w-full pt-10 sm:pt-14 pb-12 sm:pb-16 border-t border-black/10">
        {/* Section Title */}
        <div className="px-6 md:px-12 lg:px-16 max-w-[1400px] mx-auto mb-6 sm:mb-8">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-light tracking-tight">
              BROWSE <span className="font-editorial-serif italic font-normal">All</span> HAIR DEPT.
            </h2>
            <div className="w-3 h-3 rounded-full bg-black shrink-0 hidden sm:block"></div>
          </div>
        </div>

        {/* Branch Card: Dark Editorial Box */}
        <div className="w-full bg-[#0a0a0a] text-white py-14 sm:py-16 lg:py-20 px-6 md:px-12 lg:px-20">
          <div className="max-w-[1500px] mx-auto grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14 items-center">

            {/* Column 1: Branch Info & Hours (col-span-3) */}
            <div className="lg:col-span-3 flex flex-col justify-between space-y-8">
              <div>
                <div className="text-xs font-mono-spaced text-gray-500 mb-2">01.</div>
                <h3 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight uppercase">
                  GRAND DUTA
                </h3>

                <div className="mt-5 space-y-1.5 text-xs sm:text-[13px] text-gray-300 font-light leading-relaxed">
                  <p>Jl. Grand Sutra Raya</p>
                  <p>Gelam Jaya, Kec. Ps. Kemis</p>
                  <p>Kabupaten Tangerang, Banten 15560</p>
                </div>

                <div className="mt-8 space-y-1.5 text-xs sm:text-[13px] text-gray-300 font-light">
                  <p className="text-white font-medium mb-1 text-sm">Shop Hours</p>
                  <p>Mon — Thu 10.00 — 22.00</p>
                  <p>Fri 13.00 — 22.00</p>
                  <p>Sat &amp; Sun 10.00 — 20.00</p>
                </div>

                {/* Actions */}
                <div className="mt-8 flex flex-wrap gap-4 text-xs font-mono-spaced uppercase">
                  <a
                    href="https://maps.app.goo.gl/5VpxadST7rfpk4K36"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-red-400 transition underline underline-offset-4"
                  >
                    ( GOOGLE MAPS )
                  </a>
                </div>
              </div>

              {/* Book Points Badge Link */}
              <div className="pt-8 border-t border-white/10">
                <Link
                  to={bookingTargetUrl}
                  className="border border-white/30 hover:border-white px-5 py-3 inline-block text-xs tracking-wider uppercase font-mono-spaced hover:bg-white hover:text-black transition-all cursor-pointer"
                >
                  ( BOOK <span className="italic font-editorial-serif lowercase font-normal">our</span> Service <span className="italic font-editorial-serif lowercase font-normal">now</span> )
                </Link>
              </div>
            </div>

            {/* Column 2: Action Video (col-span-4) */}
            <div className="lg:col-span-4 flex justify-center items-center">
              <div className="relative w-full max-w-md lg:max-w-none h-[440px] sm:h-[490px] lg:h-[530px] overflow-hidden bg-neutral-900 shadow-2xl border border-white/10">
                <video
                  src="/barber.mov"
                  autoPlay
                  loop
                  muted
                  playsInline
                  className="w-full h-full object-cover object-center filter contrast-105"
                />
              </div>
            </div>

            {/* Column 3: Services & Pricing Menu (col-span-5 with 2 sub-columns) */}
            <div className="lg:col-span-5 flex flex-col justify-between space-y-8">
              <div className="flex justify-between items-center border-b border-white/10 pb-3">
                <span className="text-xs font-mono-spaced uppercase tracking-widest text-gray-400">
                  ( KAB. TANGERANG )
                </span>
              </div>

              {/* 4 Separate Categories in a 2x2 Grid (Horizontally and Vertically Aligned) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 lg:gap-x-12 gap-y-6 text-xs font-light">

                {/* 1. Top-Left: Normal Service */}
                <div className="flex flex-col justify-start">
                  <h4 className="font-editorial-serif italic text-lg sm:text-xl text-white mb-3 border-b border-white/10 pb-1.5">
                    Normal Service
                  </h4>
                  <ul className="space-y-2 font-mono-spaced text-[11px] sm:text-xs">
                    <li className="flex justify-between items-center text-gray-300">
                      <span>HAIR CUT</span>
                      <span className="text-white font-bold">35K</span>
                    </li>
                    <li className="flex justify-between items-center text-gray-300">
                      <span>WASH</span>
                      <span className="text-white font-bold">5K</span>
                    </li>
                    <li className="flex justify-between items-center text-gray-300">
                      <span>BEARDTRIM</span>
                      <span className="text-white font-bold">10K</span>
                    </li>
                  </ul>
                </div>

                {/* 2. Top-Right: Chemical Service Perm */}
                <div className="flex flex-col justify-start">
                  <h4 className="font-editorial-serif italic text-lg sm:text-xl text-white mb-3 border-b border-white/10 pb-1.5">
                    Chemical Service Perm
                  </h4>
                  <ul className="space-y-2 font-mono-spaced text-[11px] sm:text-xs">
                    <li className="flex justify-between items-center text-gray-300">
                      <span>CURLY PERM</span>
                      <span className="text-white font-bold">250K</span>
                    </li>
                  </ul>
                </div>

                {/* 3. Bottom-Left: Styling From Hair Pro */}
                <div className="flex flex-col justify-start">
                  <h4 className="font-editorial-serif italic text-lg sm:text-xl text-white mb-3 border-b border-white/10 pb-1.5">
                    Styling From Hair Pro
                  </h4>
                  <ul className="space-y-2 font-mono-spaced text-[11px] sm:text-xs">
                    <li className="flex justify-between items-center text-gray-300">
                      <span>POWDER</span>
                      <span className="text-white font-bold">90K</span>
                    </li>
                    <li className="flex justify-between items-center text-gray-300">
                      <span>DOT CLAY</span>
                      <span className="text-white font-bold">80K</span>
                    </li>
                    <li className="flex justify-between items-center text-gray-300">
                      <span>HAIR PASTE</span>
                      <span className="text-white font-bold">80K</span>
                    </li>
                    <li className="flex justify-between items-center text-gray-300">
                      <span>POMADE WATER</span>
                      <span className="text-white font-bold">70K</span>
                    </li>
                  </ul>
                </div>

                {/* 4. Bottom-Right: Chemical Coloring Service */}
                <div className="flex flex-col justify-start">
                  <h4 className="font-editorial-serif italic text-lg sm:text-xl text-white mb-3 border-b border-white/10 pb-1.5">
                    Chemical Coloring Service
                  </h4>
                  <ul className="space-y-2 font-mono-spaced text-[11px] sm:text-xs">
                    <li className="flex justify-between items-center text-gray-300">
                      <span>HIGHLIGHT</span>
                      <span className="text-white font-bold">200K</span>
                    </li>
                    <li className="flex justify-between items-center text-gray-300">
                      <span>FULL COLORING</span>
                      <span className="text-white font-bold">250K</span>
                    </li>
                    <li className="flex justify-between items-center text-gray-300">
                      <span>FASHION COLOR</span>
                      <span className="text-white font-bold">200K</span>
                    </li>
                    <li className="flex justify-between items-center text-gray-300">
                      <span>BLACK COLOR</span>
                      <span className="text-white font-bold">80K</span>
                    </li>
                  </ul>
                </div>

              </div>

              {/* Tagline Footer */}
              <div className="pt-6 border-t border-white/10 text-[10px] text-gray-400 uppercase tracking-widest leading-relaxed font-mono-spaced text-center">
                YOUR NEXT LEVEL GROOMING EXPERIENCE STARTS HERE.
              </div>
            </div>

          </div>
        </div>
      </section>

    </div>
  );
};

export default Home;