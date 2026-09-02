import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getServices, getKapsters, createOrder, type Service, type Kapster } from '../api/bookingApi';

const TIME_SLOTS = [
  '10:00', '11:00', '12:00', '13:00', '14:00',
  '15:00', '16:00', '17:00', '18:00', '19:00', '20:00', '21:00'
];

type PaymentMethod = 'qris' | 'va_bca' | 'cash';

export default function Booking() {
  const navigate = useNavigate();

  // Customer info from localStorage
  const [customer, setCustomer] = useState<{ id?: number; name?: string; phone?: string } | null>(null);

  // Dynamic Data from Backend
  const [services, setServices] = useState<Service[]>([]);
  const [kapsters, setKapsters] = useState<Kapster[]>([]);
  const [isLoadingData, setIsLoadingData] = useState<boolean>(true);

  // Booking form state
  const [selectedServiceIds, setSelectedServiceIds] = useState<number[]>([]);
  const [selectedKapsterId, setSelectedKapsterId] = useState<number | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [selectedTime, setSelectedTime] = useState<string>('');
  const [homeAddress, setHomeAddress] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  
  // Payment step state
  const [paymentStep, setPaymentStep] = useState<'form' | 'payment'>('form');
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<PaymentMethod>('qris');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [bookingSuccess, setBookingSuccess] = useState<any | null>(null);

  // Generate next 7 days for date picker
  const [availableDates, setAvailableDates] = useState<{ full: string; day: string; dateNum: string; month: string }[]>([]);

  useEffect(() => {
    // 1. Check if user is logged in
    const token = localStorage.getItem('token');
    const storedCustomer = localStorage.getItem('customer');

    if (!token) {
      navigate('/login');
      return;
    }

    if (storedCustomer) {
      try {
        setCustomer(JSON.parse(storedCustomer));
      } catch (e) {
        console.error(e);
      }
    }

    // 2. Fetch backend services & kapsters (filtered for home_service role)
    const fetchBackendData = async () => {
      try {
        setIsLoadingData(true);
        const [servicesRes, kapstersRes] = await Promise.all([
          getServices(),
          getKapsters('home_service'),
        ]);
        setServices(servicesRes);
        setKapsters(kapstersRes);

        // Auto select first service by default
        if (servicesRes.length > 0) {
          setSelectedServiceIds([servicesRes[0].id]);
        }

        // Auto select first kapster by default
        if (kapstersRes.length > 0) {
          setSelectedKapsterId(kapstersRes[0].id);
        }
      } catch (err) {
        console.error('Error loading data from backend:', err);
      } finally {
        setIsLoadingData(false);
      }
    };

    fetchBackendData();

    // 3. Generate date list
    const dates = [];
    const days = ['MIN', 'SEN', 'SEL', 'RAB', 'KAM', 'JUM', 'SAB'];
    const months = ['JAN', 'FEB', 'MAR', 'APR', 'MEI', 'JUN', 'JUL', 'AGU', 'SEP', 'OKT', 'NOV', 'DES'];

    for (let i = 0; i < 7; i++) {
      const d = new Date();
      d.setDate(d.getDate() + i);
      const dayName = i === 0 ? 'HARI INI' : i === 1 ? 'BESOK' : days[d.getDay()];
      const fullDate = d.toISOString().split('T')[0];
      dates.push({
        full: fullDate,
        day: dayName,
        dateNum: d.getDate().toString().padStart(2, '0'),
        month: months[d.getMonth()],
      });
    }

    setAvailableDates(dates);
    if (dates.length > 0) {
      setSelectedDate(dates[0].full);
    }
  }, [navigate]);

  // Toggle service selection
  const toggleService = (id: number) => {
    setSelectedServiceIds(prev =>
      prev.includes(id) ? prev.filter(sId => sId !== id) : [...prev, id]
    );
  };

  // Calculate total price
  const totalPrice = selectedServiceIds.reduce((total, id) => {
    const item = services.find(s => s.id === id);
    return total + (item ? Number(item.price) : 0);
  }, 0);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('customer');
    navigate('/login');
  };

  // Validation before proceeding to payment
  const handleProceedToPayment = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (selectedServiceIds.length === 0) {
      setErrorMessage('Silakan pilih minimal 1 layanan atau produk.');
      return;
    }
    if (!selectedTime) {
      setErrorMessage('Silakan pilih jam kedatangan kapster.');
      return;
    }
    if (!homeAddress.trim()) {
      setErrorMessage('Alamat lengkap rumah wajib diisi untuk layanan Home Service.');
      return;
    }

    // Scroll smoothly to top & switch to payment view
    window.scrollTo({ top: 0, behavior: 'smooth' });
    setPaymentStep('payment');
  };

  // Final confirmation and backend creation
  const handleFinalPaymentSubmit = async () => {
    setIsSubmitting(true);
    setErrorMessage('');

    try {
      const paymentMethodLabel = 
        selectedPaymentMethod === 'qris' ? 'QRIS / E-Wallet' :
        selectedPaymentMethod === 'va_bca' ? 'BCA Virtual Account' : 'Tunai ke Kapster';

      const paymentStatus = selectedPaymentMethod === 'cash' ? 'unpaid' : 'paid';

      const combinedNotes = [
        `[HOME SERVICE]`,
        `Alamat: ${homeAddress.trim()}`,
        notes.trim() ? `Catatan: ${notes.trim()}` : '',
        `Tanggal: ${selectedDate}`,
        `Metode Pembayaran: ${paymentMethodLabel}`,
      ].filter(Boolean).join(' | ');

      const payload = {
        customerId: customer?.id || 1,
        kapsterId: selectedKapsterId || (kapsters.length > 0 ? kapsters[0].id : 1),
        serviceIds: selectedServiceIds,
        checkInTime: selectedTime,
        paymentStatus,
        notes: combinedNotes,
      };

      const orderRes = await createOrder(payload);
      console.log('Order created successfully in backend:', orderRes);

      const bookingCode = `HD-00${orderRes.id}`;
      const chosenKapsterObj = kapsters.find(k => k.id === selectedKapsterId);
      const chosenKapster = chosenKapsterObj?.name || 'Home Service Capster';
      const chosenKapsterPhone = chosenKapsterObj?.phone || '';
      const chosenServices = services.filter(s => selectedServiceIds.includes(s.id));

      setBookingSuccess({
        code: bookingCode,
        orderId: orderRes.id,
        date: selectedDate,
        time: selectedTime,
        address: homeAddress.trim(),
        barber: chosenKapster,
        kapsterPhone: chosenKapsterPhone,
        services: chosenServices,
        paymentMethod: paymentMethodLabel,
        paymentStatus: paymentStatus === 'paid' ? 'LUNAS (PAID)' : 'BAYAR DI TEMPAT (CASH)',
        totalPrice: Number(orderRes.totalPrice || totalPrice),
        customerName: customer?.name || 'Customer Hair Dept',
        customerPhone: customer?.phone || '-',
      });
    } catch (err: any) {
      console.error('Failed to submit booking to backend:', err);
      setErrorMessage(
        err?.response?.data?.error ||
        err?.response?.data?.message ||
        'Gagal menyelesaikan pembayaran. Silakan coba kembali.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#fafafa] text-[#111111] font-sans selection:bg-black selection:text-white flex flex-col justify-between px-6 md:px-12 lg:px-16 py-6 md:py-8">
      
      {/* Top Header */}
      <header className="flex items-center justify-between w-full max-w-6xl mx-auto border-b border-black/10 pb-5">
        <Link to="/" className="inline-block group">
          <img
            src="/logo.jpg"
            alt="Hair Dept."
            className="h-14 sm:h-18 w-auto object-contain mix-blend-multiply transition-transform group-hover:scale-105"
          />
        </Link>

        <div className="flex items-center space-x-6 text-[11px] sm:text-xs font-mono-spaced uppercase">
          {customer?.name && (
            <span className="hidden sm:inline-block text-gray-500">
              ( {customer.name} )
            </span>
          )}
          <Link to="/" className="hover:opacity-60 transition">
            ( HOME )
          </Link>
          <button
            onClick={handleLogout}
            className="border border-black px-3 py-1 hover:bg-black hover:text-white transition cursor-pointer"
          >
            LOGOUT
          </button>
        </div>
      </header>

      {/* Main Booking / Payment Container */}
      <main className="my-8 w-full max-w-6xl mx-auto">
        
        {/* Title Section */}
        <div className="mb-10 text-center sm:text-left flex flex-col sm:flex-row sm:items-baseline sm:justify-between gap-2 border-b border-black pb-4">
          <h1 className="text-3xl sm:text-5xl font-light tracking-tight">
            {paymentStep === 'payment' && !bookingSuccess ? (
              <>PAYMENT <span className="font-editorial-serif italic font-normal">checkout</span></>
            ) : (
              <>BOOK <span className="font-editorial-serif italic font-normal">home</span> SERVICE</>
            )}
          </h1>
          <span className="text-xs font-mono-spaced uppercase tracking-widest text-gray-500">
            [ HAIR DEPT. IN YOUR HOME ]
          </span>
        </div>

        {errorMessage && (
          <div className="mb-6 p-4 bg-red-50 border border-red-500 text-red-700 text-xs font-mono-spaced">
            {errorMessage}
          </div>
        )}

        {isLoadingData ? (
          <div className="py-20 text-center font-mono-spaced text-xs text-gray-500">
            ( MEMUAT DATA LAYANAN &amp; KAPSTER HOME SERVICE... )
          </div>
        ) : bookingSuccess ? (
          /* ================= STEP 3: SUCCESS INVOICE RECEIPT ================= */
          <div className="max-w-2xl mx-auto bg-black text-white p-8 sm:p-12 shadow-2xl border border-black animate-fade-in">
            <div className="text-center space-y-4">
              <div className="text-xs font-mono-spaced uppercase tracking-widest text-gray-400">
                ( TRANSAKSI BERHASIL DITERIMA )
              </div>
              <h2 className="text-3xl sm:text-4xl font-light">
                SEE YOU <span className="font-editorial-serif italic font-normal">at</span> YOUR HOME
              </h2>
              <div className="inline-block border border-white/20 bg-white/5 px-6 py-3 font-mono-spaced text-xl font-bold tracking-widest my-4">
                {bookingSuccess.code}
              </div>
            </div>

            <div className="mt-8 space-y-3 border-t border-white/10 pt-6 text-xs font-mono-spaced">
              <div className="flex justify-between py-1 border-b border-white/5">
                <span className="text-gray-400">CUSTOMER</span>
                <span className="text-right font-medium">{bookingSuccess.customerName} ({bookingSuccess.customerPhone})</span>
              </div>
              <div className="flex justify-between py-1 border-b border-white/5">
                <span className="text-gray-400">ALAMAT RUMAH</span>
                <span className="text-right max-w-xs">{bookingSuccess.address}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-white/5">
                <span className="text-gray-400">JADWAL KEDATANGAN</span>
                <span className="text-right font-bold text-white">
                  {bookingSuccess.date} @ {bookingSuccess.time} WIB
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-white/5">
                <span className="text-gray-400">KAPSTER BERTUGAS</span>
                <span className="text-right">{bookingSuccess.barber}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-white/5">
                <span className="text-gray-400">METODE PEMBAYARAN</span>
                <span className="text-right font-bold text-green-400">
                  {bookingSuccess.paymentMethod} • {bookingSuccess.paymentStatus}
                </span>
              </div>
              <div className="py-2 border-b border-white/5">
                <span className="text-gray-400 block mb-2">RINCIAN PESANAN:</span>
                {bookingSuccess.services.map((s: Service) => (
                  <div key={s.id} className="flex justify-between text-gray-300 pl-2 py-0.5">
                    <span>• {s.name}</span>
                    <span>Rp {Number(s.price).toLocaleString('id-ID')}</span>
                  </div>
                ))}
              </div>
              <div className="flex justify-between py-2 text-sm font-bold text-white pt-3">
                <span>TOTAL PEMBAYARAN</span>
                <span>Rp {bookingSuccess.totalPrice.toLocaleString('id-ID')}</span>
              </div>
            </div>

            {/* WhatsApp Link to assigned kapster */}
            {(() => {
              const rawPhone = bookingSuccess.kapsterPhone?.replace(/\D/g, '') || '';
              const waNumber = rawPhone.startsWith('0')
                ? '62' + rawPhone.slice(1)
                : rawPhone.startsWith('62')
                ? rawPhone
                : rawPhone ? '62' + rawPhone : '6281345678910';

              const waMessage = encodeURIComponent(
                `Halo ${bookingSuccess.barber} (Kapster Hair Dept),\n\nSaya ${bookingSuccess.customerName} sudah melakukan pemesanan Home Service:\n` +
                `• Kode Booking: ${bookingSuccess.code}\n` +
                `• Alamat: ${bookingSuccess.address}\n` +
                `• Jadwal: ${bookingSuccess.date} @ ${bookingSuccess.time} WIB\n` +
                `• Pembayaran: ${bookingSuccess.paymentMethod} (${bookingSuccess.paymentStatus})\n` +
                `• Total: Rp ${bookingSuccess.totalPrice.toLocaleString('id-ID')}\n\n` +
                `Mohon konfirmasi kedatangannya ya. Terima kasih!`
              );

              return (
                <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center">
                  <a
                    href={`https://wa.me/${waNumber}?text=${waMessage}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="border border-white bg-white text-black px-6 py-3 text-xs font-bold font-mono-spaced text-center uppercase hover:bg-transparent hover:text-white transition"
                  >
                    ( HUBUNGI {bookingSuccess.barber.toUpperCase()} VIA WHATSAPP )
                  </a>
                  <button
                    onClick={() => {
                      setBookingSuccess(null);
                      setPaymentStep('form');
                    }}
                    className="border border-white/40 text-white px-6 py-3 text-xs font-mono-spaced text-center uppercase hover:border-white transition cursor-pointer"
                  >
                    ( BUAT PESANAN BARU )
                  </button>
                </div>
              );
            })()}
          </div>
        ) : paymentStep === 'payment' ? (
          /* ================= STEP 2: PAYMENT SELECTION SCREEN ================= */
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
            
            {/* Left 7 Columns: Payment Methods */}
            <div className="lg:col-span-7 space-y-8">
              <div>
                <div className="flex items-center justify-between border-b border-black/10 pb-2 mb-6">
                  <h3 className="text-sm font-bold font-mono-spaced uppercase tracking-wider">
                    PILIH METODE PEMBAYARAN
                  </h3>
                  <button
                    type="button"
                    onClick={() => setPaymentStep('form')}
                    className="text-xs font-mono-spaced uppercase text-gray-500 hover:text-black underline underline-offset-4 cursor-pointer"
                  >
                    ← KEMBALI KE FORM
                  </button>
                </div>

                <div className="space-y-4">
                  {/* Option 1: QRIS Instant */}
                  <div
                    onClick={() => setSelectedPaymentMethod('qris')}
                    className={`p-5 border transition-all cursor-pointer ${
                      selectedPaymentMethod === 'qris'
                        ? 'border-black bg-white shadow-md ring-1 ring-black'
                        : 'border-black/20 bg-white hover:border-black'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center space-x-3">
                        <input
                          type="radio"
                          name="payment"
                          checked={selectedPaymentMethod === 'qris'}
                          onChange={() => setSelectedPaymentMethod('qris')}
                          className="accent-black"
                        />
                        <span className="font-bold text-sm font-mono-spaced">QRIS INSTANT (SEMUA E-WALLET &amp; M-BANKING)</span>
                      </div>
                      <span className="text-[10px] font-mono-spaced border border-black/20 px-2 py-0.5 uppercase bg-neutral-100">
                        Otomatis
                      </span>
                    </div>

                    <p className="text-xs text-gray-500 font-mono-spaced mb-4 pl-7">
                      Scan QR Code menggunakan GoPay, OVO, Dana, ShopeePay, BCA, Mandiri, dll.
                    </p>

                    {selectedPaymentMethod === 'qris' && (
                      <div className="mt-4 pt-4 border-t border-black/10 flex flex-col sm:flex-row items-center gap-6 bg-neutral-50 p-4">
                        {/* Simulated High-Res QRIS */}
                        <div className="w-36 h-36 bg-white border border-black/20 p-2 flex flex-col items-center justify-center shadow-inner">
                          <img
                            src="https://api.qrserver.com/v1/create-qr-code/?size=140x140&data=HAIR-DEPT-QRIS-ORDER"
                            alt="QRIS Hair Dept"
                            className="w-full h-full object-contain"
                          />
                        </div>
                        <div className="text-xs font-mono-spaced space-y-1.5 text-center sm:text-left">
                          <div className="font-bold text-sm">NMID: ID102026849201</div>
                          <div className="text-gray-600">Hair Dept. Barbershop Tangerang</div>
                          <div className="text-xs font-bold text-black pt-1">
                            Total Bayar: Rp {totalPrice.toLocaleString('id-ID')}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Option 2: Virtual Account BCA */}
                  <div
                    onClick={() => setSelectedPaymentMethod('va_bca')}
                    className={`p-5 border transition-all cursor-pointer ${
                      selectedPaymentMethod === 'va_bca'
                        ? 'border-black bg-white shadow-md ring-1 ring-black'
                        : 'border-black/20 bg-white hover:border-black'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-3">
                        <input
                          type="radio"
                          name="payment"
                          checked={selectedPaymentMethod === 'va_bca'}
                          onChange={() => setSelectedPaymentMethod('va_bca')}
                          className="accent-black"
                        />
                        <span className="font-bold text-sm font-mono-spaced">TRANSFER BANK / VIRTUAL ACCOUNT</span>
                      </div>
                      <span className="text-[10px] font-mono-spaced border border-black/20 px-2 py-0.5 uppercase bg-neutral-100">
                        BCA
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 font-mono-spaced pl-7">
                      Transfer via BCA Virtual Account dengan konfirmasi instan.
                    </p>

                    {selectedPaymentMethod === 'va_bca' && (
                      <div className="mt-4 pt-4 border-t border-black/10 bg-neutral-50 p-4 font-mono-spaced text-xs space-y-2">
                        <div className="text-gray-500">Nomor Virtual Account:</div>
                        <div className="text-base font-bold tracking-widest text-black">
                          8271 0812 3456 7890
                        </div>
                        <div className="text-[11px] text-gray-500">Atas Nama: PT HAIR DEPT INDONESIA</div>
                      </div>
                    )}
                  </div>

                  {/* Option 3: Cash on Delivery */}
                  <div
                    onClick={() => setSelectedPaymentMethod('cash')}
                    className={`p-5 border transition-all cursor-pointer ${
                      selectedPaymentMethod === 'cash'
                        ? 'border-black bg-white shadow-md ring-1 ring-black'
                        : 'border-black/20 bg-white hover:border-black'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-3">
                        <input
                          type="radio"
                          name="payment"
                          checked={selectedPaymentMethod === 'cash'}
                          onChange={() => setSelectedPaymentMethod('cash')}
                          className="accent-black"
                        />
                        <span className="font-bold text-sm font-mono-spaced">BAYAR TUNAI KE KAPSTER (COD)</span>
                      </div>
                      <span className="text-[10px] font-mono-spaced border border-black/20 px-2 py-0.5 uppercase bg-neutral-100">
                        Cash
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 font-mono-spaced pl-7">
                      Bayar uang tunai langsung ke kapster setelah proses potong rambut selesai di rumah Anda.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Right 5 Columns: Final Checkout Summary */}
            <div className="lg:col-span-5">
              <div className="bg-black text-white p-6 sm:p-8 sticky top-8 space-y-6 shadow-xl border border-black">
                <div className="flex items-center justify-between border-b border-white/20 pb-3">
                  <h3 className="text-xs font-mono-spaced tracking-widest uppercase">
                    ( RINCIAN PEMBAYARAN )
                  </h3>
                  <span className="text-[10px] text-gray-400 font-mono-spaced">HAIR DEPT.</span>
                </div>

                <div className="text-xs font-mono-spaced space-y-2 border-b border-white/10 pb-4">
                  <div className="flex justify-between">
                    <span className="text-gray-400">JADWAL:</span>
                    <span className="font-bold text-white">{selectedDate} @ {selectedTime} WIB</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">KAPSTER:</span>
                    <span className="text-right text-gray-200">
                      {kapsters.find(k => k.id === selectedKapsterId)?.name || 'Home Service Capster'}
                    </span>
                  </div>
                  <div className="flex justify-between text-[11px] pt-1">
                    <span className="text-gray-400">TUJUAN:</span>
                    <span className="text-right text-gray-300 max-w-[180px] truncate">{homeAddress}</span>
                  </div>
                </div>

                <div className="space-y-2 border-b border-white/10 pb-4 text-xs font-mono-spaced">
                  <div className="text-gray-400 text-[11px] mb-1">ITEM PESANAN:</div>
                  {selectedServiceIds.map(id => {
                    const item = services.find(s => s.id === id);
                    if (!item) return null;
                    return (
                      <div key={item.id} className="flex justify-between text-gray-300">
                        <span>• {item.name}</span>
                        <span>Rp {Number(item.price).toLocaleString('id-ID')}</span>
                      </div>
                    );
                  })}
                </div>

                <div className="pt-2 flex justify-between items-baseline font-mono-spaced">
                  <span className="text-xs text-gray-300 font-bold uppercase">TOTAL TAGIHAN</span>
                  <span className="text-2xl font-bold text-white">
                    Rp {totalPrice.toLocaleString('id-ID')}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={handleFinalPaymentSubmit}
                  disabled={isSubmitting}
                  className="w-full bg-white text-black py-4 text-xs font-bold font-mono-spaced tracking-widest uppercase hover:bg-neutral-200 disabled:opacity-40 disabled:cursor-not-allowed transition cursor-pointer"
                >
                  {isSubmitting ? '( MEMPROSES TRANSAKSI... )' : '( SELESAIKAN PEMBAYARAN )'}
                </button>
              </div>
            </div>

          </div>
        ) : (
          /* ================= STEP 1: FORM SELECTION ================= */
          <form onSubmit={handleProceedToPayment} className="grid grid-cols-1 lg:grid-cols-12 gap-10">
            
            {/* Left 7 Columns: Selection Steps */}
            <div className="lg:col-span-7 space-y-10">
              
              {/* STEP 1: Select Services & Products */}
              <div className="space-y-6">
                <div className="flex items-center justify-between border-b border-black/10 pb-2">
                  <h3 className="text-sm font-bold font-mono-spaced uppercase tracking-wider">
                    01. PILIH LAYANAN &amp; PRODUK
                  </h3>
                  <span className="text-[11px] font-mono-spaced text-gray-500">
                    {selectedServiceIds.length} DIPILIH
                  </span>
                </div>

                {/* Sub-group 1: Layanan Grooming */}
                <div>
                  <div className="text-xs font-editorial-serif italic text-gray-600 font-semibold mb-2.5">
                    Layanan Grooming &amp; Treatment:
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {services
                      .filter(s => Number(s.duration) > 0 || !['powder', 'dot clay', 'hair paste', 'pomade'].some(p => s.name.toLowerCase().includes(p)))
                      .map(service => {
                        const isSelected = selectedServiceIds.includes(service.id);
                        return (
                          <button
                            key={service.id}
                            type="button"
                            onClick={() => toggleService(service.id)}
                            className={`p-3.5 border text-left transition-all flex flex-col justify-between cursor-pointer ${
                              isSelected
                                ? 'bg-black text-white border-black shadow-md'
                                : 'bg-white text-black border-black/20 hover:border-black'
                            }`}
                          >
                            <div className="flex items-start justify-between">
                              <span className="text-xs font-bold font-mono-spaced tracking-wide">
                                {service.name}
                              </span>
                              {Number(service.duration) > 0 && (
                                <span className="text-[10px] font-mono-spaced opacity-70">
                                  {service.duration} min
                                </span>
                              )}
                            </div>
                            <div className="mt-2 text-xs font-mono-spaced font-semibold">
                              Rp {Number(service.price).toLocaleString('id-ID')}
                            </div>
                          </button>
                        );
                      })}
                  </div>
                </div>

                {/* Sub-group 2: Produk Styling */}
                <div>
                  <div className="text-xs font-editorial-serif italic text-gray-600 font-semibold mb-2.5">
                    Styling From Hair Pro (Produk):
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {services
                      .filter(s => Number(s.duration) === 0 || ['powder', 'dot clay', 'hair paste', 'pomade'].some(p => s.name.toLowerCase().includes(p)))
                      .map(product => {
                        const isSelected = selectedServiceIds.includes(product.id);
                        return (
                          <button
                            key={product.id}
                            type="button"
                            onClick={() => toggleService(product.id)}
                            className={`p-3.5 border text-left transition-all flex flex-col justify-between cursor-pointer ${
                              isSelected
                                ? 'bg-black text-white border-black shadow-md'
                                : 'bg-white text-black border-black/20 hover:border-black'
                            }`}
                          >
                            <div className="flex items-start justify-between">
                              <span className="text-xs font-bold font-mono-spaced tracking-wide">
                                {product.name}
                              </span>
                              <span className="text-[10px] font-mono-spaced opacity-70 uppercase">
                                Produk
                              </span>
                            </div>
                            <div className="mt-2 text-xs font-mono-spaced font-semibold">
                              Rp {Number(product.price).toLocaleString('id-ID')}
                            </div>
                          </button>
                        );
                      })}
                  </div>
                </div>
              </div>

              {/* STEP 2: Select Kapster */}
              <div>
                <div className="mb-4 border-b border-black/10 pb-2 flex justify-between items-baseline">
                  <h3 className="text-sm font-bold font-mono-spaced uppercase tracking-wider">
                    02. PILIH KAPSTER (HOME SERVICE)
                  </h3>
                  <span className="text-[10px] font-mono-spaced text-gray-500">KHUSUS LAYANAN HOME SERVICE</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {kapsters.map(kapster => {
                    const isSelected = selectedKapsterId === kapster.id;

                    return (
                      <button
                        key={kapster.id}
                        type="button"
                        onClick={() => setSelectedKapsterId(kapster.id)}
                        className={`p-3.5 border text-left transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-black text-white border-black shadow-md'
                            : 'bg-white text-black border-black/20 hover:border-black'
                        }`}
                      >
                        <div className="text-xs font-bold font-mono-spaced">{kapster.name}</div>
                        <div className="text-[10px] opacity-70 font-mono-spaced mt-0.5">
                          {kapster.role || 'Home Service Capster'}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* STEP 3: Select Date & Time */}
              <div>
                <div className="mb-4 border-b border-black/10 pb-2">
                  <h3 className="text-sm font-bold font-mono-spaced uppercase tracking-wider">
                    03. PILIH JADWAL KEDATANGAN
                  </h3>
                </div>

                {/* Date Picker (Horizontal) */}
                <div className="grid grid-cols-4 sm:grid-cols-7 gap-2 mb-4">
                  {availableDates.map(d => {
                    const isSelected = selectedDate === d.full;
                    return (
                      <button
                        key={d.full}
                        type="button"
                        onClick={() => setSelectedDate(d.full)}
                        className={`py-2.5 px-1 border text-center transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-black text-white border-black'
                            : 'bg-white text-black border-black/20 hover:border-black'
                        }`}
                      >
                        <div className="text-[9px] font-mono-spaced opacity-70 uppercase">{d.day}</div>
                        <div className="text-base font-bold font-mono-spaced">{d.dateNum}</div>
                        <div className="text-[9px] font-mono-spaced opacity-70 uppercase">{d.month}</div>
                      </button>
                    );
                  })}
                </div>

                {/* Time Slots */}
                <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                  {TIME_SLOTS.map(time => {
                    const isSelected = selectedTime === time;
                    return (
                      <button
                        key={time}
                        type="button"
                        onClick={() => setSelectedTime(time)}
                        className={`py-2 text-center border font-mono-spaced text-xs transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-black text-white border-black font-bold'
                            : 'bg-white text-black border-black/20 hover:border-black'
                        }`}
                      >
                        {time}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* STEP 4: Home Address & Notes */}
              <div className="space-y-4">
                <div className="border-b border-black/10 pb-2">
                  <h3 className="text-sm font-bold font-mono-spaced uppercase tracking-wider">
                    04. ALAMAT RUMAH &amp; CATATAN
                  </h3>
                </div>

                <div>
                  <label className="block text-[11px] font-mono-spaced uppercase text-gray-700 mb-1">
                    Alamat Lengkap Tujuan (Wajib) *
                  </label>
                  <textarea
                    rows={3}
                    value={homeAddress}
                    onChange={e => setHomeAddress(e.target.value)}
                    placeholder="Masukkan alamat lengkap rumah / apartemen, nomor rumah, blok, RT/RW, dan patokan..."
                    className="w-full bg-white border border-black/20 p-3 text-xs font-mono-spaced focus:border-black focus:outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-mono-spaced uppercase text-gray-700 mb-1">
                    Catatan Tambahan (Opsional)
                  </label>
                  <input
                    type="text"
                    value={notes}
                    onChange={e => setNotes(e.target.value)}
                    placeholder="Contoh: Model low fade / bawa hair powder..."
                    className="w-full bg-white border border-black/20 p-3 text-xs font-mono-spaced focus:border-black focus:outline-none"
                  />
                </div>
              </div>

            </div>

            {/* Right 5 Columns: Booking Summary Sticky Sidebar */}
            <div className="lg:col-span-5">
              <div className="bg-black text-white p-6 sm:p-8 sticky top-8 space-y-6 shadow-xl border border-black">
                
                <div className="flex items-center justify-between border-b border-white/20 pb-3">
                  <h3 className="text-xs font-mono-spaced tracking-widest uppercase">
                    ( RINGKASAN HOME SERVICE )
                  </h3>
                  <span className="text-[10px] text-gray-400 font-mono-spaced">HAIR DEPT.</span>
                </div>

                {/* Service Type Info */}
                <div className="text-xs space-y-1 font-light border-b border-white/10 pb-4">
                  <div className="font-bold uppercase tracking-wider text-white">
                    HOME SERVICE APPOINTMENT
                  </div>
                  <p className="text-gray-400 text-[11px]">
                    Kapster datang langsung ke lokasi rumah Anda
                  </p>
                </div>

                {/* Date & Kapster Summary */}
                <div className="text-xs font-mono-spaced space-y-2 border-b border-white/10 pb-4">
                  <div className="flex justify-between">
                    <span className="text-gray-400">TANGGAL:</span>
                    <span className="font-bold text-white">{selectedDate || '-'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">JAM:</span>
                    <span className="font-bold text-white">{selectedTime ? `${selectedTime} WIB` : 'Pilih Jam'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">KAPSTER:</span>
                    <span className="text-right text-gray-200">
                      {kapsters.find(k => k.id === selectedKapsterId)?.name || 'Home Service Capster'}
                    </span>
                  </div>
                  {homeAddress && (
                    <div className="flex justify-between text-[11px] pt-1">
                      <span className="text-gray-400">ALAMAT:</span>
                      <span className="text-right text-gray-300 max-w-[180px] truncate">{homeAddress}</span>
                    </div>
                  )}
                </div>

                {/* Selected Services List */}
                <div className="space-y-2 border-b border-white/10 pb-4 text-xs font-mono-spaced">
                  <div className="text-gray-400 text-[11px] mb-1">LAYANAN DIPILIH:</div>
                  {selectedServiceIds.length === 0 ? (
                    <div className="text-gray-500 italic text-[11px]">Belum ada layanan dipilih</div>
                  ) : (
                    selectedServiceIds.map(id => {
                      const item = services.find(s => s.id === id);
                      if (!item) return null;
                      return (
                        <div key={item.id} className="flex justify-between text-gray-300">
                          <span>• {item.name}</span>
                          <span>Rp {Number(item.price).toLocaleString('id-ID')}</span>
                        </div>
                      );
                    })
                  )}
                </div>

                {/* Total Calculation */}
                <div className="pt-2 flex justify-between items-baseline font-mono-spaced">
                  <span className="text-xs text-gray-300 font-bold uppercase">TOTAL ESTIMASI</span>
                  <span className="text-xl sm:text-2xl font-bold text-white">
                    Rp {totalPrice.toLocaleString('id-ID')}
                  </span>
                </div>

                {/* Submit Action Button -> Proceeds to Payment */}
                <button
                  type="submit"
                  disabled={selectedServiceIds.length === 0 || !selectedTime || !homeAddress.trim()}
                  className="w-full bg-white text-black py-3.5 text-xs font-bold font-mono-spaced tracking-widest uppercase hover:bg-neutral-200 disabled:opacity-40 disabled:cursor-not-allowed transition cursor-pointer"
                >
                  ( LANJUT KE PEMBAYARAN → )
                </button>

                <p className="text-[9px] font-mono-spaced text-gray-500 text-center leading-relaxed">
                  PILIH METODE PEMBAYARAN (QRIS, TRANSFER BANK, ATAU TUNAI) DI TAHAP BERIKUTNYA.
                </p>
              </div>
            </div>

          </form>
        )}

      </main>

      {/* Footer */}
      <footer className="w-full max-w-6xl mx-auto pt-6 border-t border-black/10 flex items-center justify-between text-[10px] font-mono-spaced text-gray-500 uppercase">
        <span>© 2026 HAIR DEPT. IN YOUR HOME. ALL RIGHTS RESERVED.</span>
        <span>PREMIUM HOME GROOMING EXPERIENCE</span>
      </footer>

    </div>
  );
}
