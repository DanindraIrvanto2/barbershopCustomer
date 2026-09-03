import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { socket } from '../api/socket';
import { getServices, getKapsters, createOrder, getOrderById, getAllOrders, updateOrderStatus, getDirectSnapToken, ensureSnapLoaded, type Service, type Kapster } from '../api/bookingApi';


const formatDateDMY = (dateStr?: string) => {
    if (!dateStr || dateStr === "-") return "-";
    const cleanDate = dateStr.includes("T") ? dateStr.split("T")[0] : dateStr;
    if (/^\d{4}-\d{2}-\d{2}$/.test(cleanDate)) {
        const [year, month, day] = cleanDate.split("-");
        return `${day}-${month}-${year}`;
    }
    return dateStr;
};

const TIME_SLOTS = [
    '10:00', '11:00', '12:00', '13:00', '14:00',
    '15:00', '16:00', '17:00', '18:00', '19:00', '20:00', '21:00'
];

declare global {
    interface Window {
        snap?: any;
    }
}

export default function Booking() {
    const navigate = useNavigate();

    // Customer info from localStorage
    const [customer, setCustomer] = useState<{ id?: number; name?: string; phone?: string } | null>(null);

    // Dynamic Data from Backend
    const [services, setServices] = useState<Service[]>([]);
    const [kapsters, setKapsters] = useState<Kapster[]>([]);
    const [existingOrders, setExistingOrders] = useState<any[]>([]);
    const [isLoadingData, setIsLoadingData] = useState<boolean>(true);

    // Booking form state
    const [selectedServiceIds, setSelectedServiceIds] = useState<number[]>([]);
    const [selectedKapsterId, setSelectedKapsterId] = useState<number | null>(null);
    const [selectedDate, setSelectedDate] = useState<string>('');
    const [selectedTime, setSelectedTime] = useState<string>('');
    const [homeAddress, setHomeAddress] = useState<string>('');
    const [notes, setNotes] = useState<string>('');

    // Submission & Success state
    const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
    const [errorMessage, setErrorMessage] = useState<string>('');
    const [bookingSuccess, setBookingSuccess] = useState<any | null>(() => {
        const saved = localStorage.getItem('activeHomeServiceBooking');
        if (saved) {
            try {
                return JSON.parse(saved);
            } catch (e) {
                return null;
            }
        }
        return null;
    });

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

        // 2. Fetch backend services, kapsters & existing orders
        const fetchBackendData = async () => {
            try {
                setIsLoadingData(true);
                const [servicesRes, kapstersRes, ordersRes] = await Promise.all([
                    getServices(),
                    getKapsters('home_service'),
                    getAllOrders(),
                ]);
                setServices(servicesRes);
                setKapsters(kapstersRes);
                setExistingOrders(ordersRes);

                if (servicesRes.length > 0) {
                    setSelectedServiceIds([servicesRes[0].id]);
                }

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

    // Real-time WebSocket listener: when admin changes status / new order is placed, auto-update slots and status
    useEffect(() => {
        const handleRealtimeUpdate = async () => {
            try {
                // Refresh all orders to keep slot booking in real-time sync
                const freshOrders = await getAllOrders();
                setExistingOrders(freshOrders);
            } catch (e) {
                console.error('Failed to refresh orders on socket update:', e);
            }

            if (!bookingSuccess?.orderId) return;

            try {
                const latestOrder = await getOrderById(bookingSuccess.orderId);
                if (latestOrder) {
                    setBookingSuccess((prev: any) => {
                        if (!prev) return null;
                        const updated = {
                            ...prev,
                            serviceStatus: latestOrder.serviceStatus,
                            paymentStatus: latestOrder.paymentStatus === 'paid' ? 'LUNAS (PAID)' : 'BELUM LUNAS (UNPAID)',
                            rawPaymentStatus: latestOrder.paymentStatus,
                        };
                        localStorage.setItem('activeHomeServiceBooking', JSON.stringify(updated));
                        return updated;
                    });
                }
            } catch (err) {
                console.error('Realtime update fetch failed:', err);
            }
        };

        socket.on('data:updated', handleRealtimeUpdate);

        return () => {
            socket.off('data:updated', handleRealtimeUpdate);
        };
    }, [bookingSuccess?.orderId]);

    // Check if a specific time slot is unavailable (already passed today OR already booked)
    const isSlotUnavailable = (date: string, time: string, kapsterId: number | null) => {
        if (!date || !time) return false;

        // 1. Check if the time has already passed today
        const now = new Date();
        const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

        if (date === todayStr) {
            const [slotHour, slotMinute] = time.split(':').map(Number);
            const currentHour = now.getHours();
            const currentMinute = now.getMinutes();

            if (slotHour < currentHour || (slotHour === currentHour && slotMinute <= currentMinute)) {
                return true; // Already passed
            }
        }

        // 2. Check if already booked for that date & kapster
        if (!kapsterId) return false;

        return existingOrders.some((order: any) => {
            // Must match assigned kapster
            if (Number(order.kapsterId) !== Number(kapsterId)) return false;

            // Ignore cancelled orders
            if (order.serviceStatus?.toLowerCase() === 'cancelled') return false;

            // Normalize time string (e.g. "11:00" or "11:00 WIB")
            const orderTime = (order.checkInTime || '').replace(' WIB', '').trim();
            if (orderTime !== time.trim()) return false;

            // Check date in notes or createdAt
            const notesStr = order.notes || '';
            if (notesStr.includes(date)) return true;

            if (order.createdAt) {
                const orderDate = new Date(order.createdAt).toISOString().split('T')[0];
                if (orderDate === date) return true;
            }

            return false;
        });
    };

    // Toggle service selection
    const toggleService = (id: number) => {
        setSelectedServiceIds(prev =>
            prev.includes(id) ? prev.filter(sId => sId !== id) : [...prev, id]
        );
    };

    // Calculate total price dynamically
    const totalPrice = selectedServiceIds.reduce((sum, id) => {
        const item = services.find(s => s.id === id);
        return sum + (item ? Number(item.price) : 0);
    }, 0);

    const handleLogout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('customer');
        localStorage.removeItem('activeHomeServiceBooking');
        navigate('/login');
    };

    // Main submit: Creates order in backend and launches Midtrans payment
    const handleProceedToPayment = async (e: React.FormEvent) => {
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
        if (isSlotUnavailable(selectedDate, selectedTime, selectedKapsterId)) {
            setErrorMessage(`Jadwal jam ${selectedTime} WIB pada tanggal tersebut tidak tersedia (sudah lewat atau sudah dipesan). Silakan pilih jam lain.`);
            return;
        }
        if (!homeAddress.trim()) {
            setErrorMessage('Alamat lengkap rumah wajib diisi untuk layanan Home Service.');
            return;
        }

        setIsSubmitting(true);

        try {
            const combinedNotes = [
                `[HOME SERVICE]`,
                `Alamat: ${homeAddress.trim()}`,
                notes.trim() ? `Catatan: ${notes.trim()}` : '',
                `Tanggal: ${selectedDate}`,
                `Metode Pembayaran: Midtrans Gateway`,
            ].filter(Boolean).join(' | ');

            const payload = {
                customerId: customer?.id || 1,
                kapsterId: selectedKapsterId || (kapsters.length > 0 ? kapsters[0].id : 1),
                serviceIds: selectedServiceIds,
                checkInTime: selectedTime,
                paymentStatus: 'unpaid',
                notes: combinedNotes,
            };

            const orderRes = await createOrder(payload);
            console.log('Order created successfully in backend with Midtrans:', orderRes);

            const bookingCode = `HD-00${orderRes.id}`;
            const chosenKapsterObj = kapsters.find(k => k.id === selectedKapsterId);
            const chosenKapster = chosenKapsterObj?.name || 'Home Service Capster';
            const chosenKapsterPhone = chosenKapsterObj?.phone || '';
            const chosenServices = services.filter(s => selectedServiceIds.includes(s.id));

            const successData = {
                code: bookingCode,
                orderId: orderRes.id,
                date: selectedDate,
                time: selectedTime,
                address: homeAddress.trim(),
                barber: chosenKapster,
                kapsterPhone: chosenKapsterPhone,
                services: chosenServices,
                serviceStatus: 'waiting',
                paymentMethod: 'Midtrans Payment Gateway',
                paymentStatus: 'BELUM LUNAS (MENUNGGU PEMBAYARAN)',
                rawPaymentStatus: 'unpaid',
                totalPrice: Number(orderRes.totalPrice || totalPrice),
                customerName: customer?.name || 'Customer Hair Dept',
                customerPhone: customer?.phone || '-',
            };

            // Check for Midtrans Snap Token or Redirect URL
            let snapToken = orderRes.snapToken || orderRes.snap_token || orderRes.token;
            if (!snapToken) {
                snapToken = await getDirectSnapToken(
                    orderRes.id,
                    Number(orderRes.totalPrice || totalPrice),
                    customer?.name || 'Customer Hair Dept',
                    customer?.phone || '08123456789'
                ) || undefined;
            }

            await ensureSnapLoaded();
            if (typeof window !== 'undefined' && window.snap && snapToken) {
                window.snap.pay(snapToken, {
                    onSuccess: async function (result: any) {
                        console.log('Midtrans Payment Success:', result);
                        try {
                            await updateOrderStatus(orderRes.id, {
                                paymentStatus: 'paid',
                                paymentMethod: 'Midtrans Payment Gateway',
                                amountReceived: Number(orderRes.totalPrice || totalPrice),
                                changeAmount: 0,
                            });
                        } catch (syncErr) {
                            console.error('Failed to sync paid status to backend:', syncErr);
                        }
                        const finalData = {
                            ...successData,
                            paymentStatus: 'LUNAS (PAID VIA MIDTRANS)',
                            rawPaymentStatus: 'paid',
                        };
                        setBookingSuccess(finalData);
                        localStorage.setItem('activeHomeServiceBooking', JSON.stringify(finalData));
                    },
                    onPending: function (result: any) {
                        console.log('Midtrans Payment Pending:', result);
                        setBookingSuccess(successData);
                        localStorage.setItem('activeHomeServiceBooking', JSON.stringify(successData));
                    },
                    onError: function (err: any) {
                        console.error('Midtrans Payment Error:', err);
                        setErrorMessage('Pembayaran Midtrans gagal atau dibatalkan. Silakan coba kembali.');
                    },
                    onClose: function () {
                        console.log('Midtrans popup closed by user');
                        setBookingSuccess(successData);
                        localStorage.setItem('activeHomeServiceBooking', JSON.stringify(successData));
                    },
                });
            } else if (orderRes.redirectUrl || orderRes.redirect_url || orderRes.paymentUrl) {
                setBookingSuccess(successData);
                localStorage.setItem('activeHomeServiceBooking', JSON.stringify(successData));
                window.location.href = (orderRes.redirectUrl || orderRes.redirect_url || orderRes.paymentUrl)!;
            } else {
                setBookingSuccess(successData);
                localStorage.setItem('activeHomeServiceBooking', JSON.stringify(successData));
            }
        } catch (err: any) {
            console.error('Failed to submit booking to backend:', err);
            setErrorMessage(
                err?.response?.data?.error ||
                err?.response?.data?.message ||
                'Gagal memproses pesanan ke Midtrans. Silakan coba kembali.'
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

                <div className="flex items-center space-x-6 text-[11px] sm:text-xs font-mono uppercase tracking-wider">
                    {customer?.name && (
                        <span className="hidden sm:inline-block text-neutral-500 font-medium">
                            ( {customer.name} )
                        </span>
                    )}
                    <Link to="/" className="hover:opacity-60 transition text-neutral-700">
                        ( HOME )
                    </Link>
                    <Link to="/history" className="hover:opacity-60 transition text-neutral-700">
                        ( RIWAYAT PESANAN )
                    </Link>
                    <button
                        onClick={handleLogout}
                        className="border border-black px-3.5 py-1 text-xs hover:bg-black hover:text-white transition cursor-pointer font-mono"
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
                        BOOK <span className="font-editorial-serif italic font-normal">home</span> SERVICE
                    </h1>
                    <span className="text-xs font-mono uppercase tracking-widest text-neutral-500">
                        [ HAIR DEPT. IN YOUR HOME ]
                    </span>
                </div>

                {errorMessage && (
                    <div className="mb-6 p-4 bg-red-50 border border-red-500 text-red-700 text-xs font-mono">
                        {errorMessage}
                    </div>
                )}

                {isLoadingData ? (
                    <div className="py-20 text-center font-mono text-xs text-neutral-500 tracking-wider">
                        ( MEMUAT DATA LAYANAN &amp; KAPSTER HOME SERVICE... )
                    </div>
                ) : bookingSuccess ? (
                    /* ================= SUCCESS INVOICE RECEIPT ================= */
                    <div className="max-w-2xl mx-auto bg-black text-white p-8 sm:p-12 shadow-2xl border border-black animate-fade-in">
                        <div className="text-center space-y-4">
                            <div className="text-xs font-mono uppercase tracking-widest text-neutral-400">
                                ( TRANSAKSI BERHASIL DITERIMA )
                            </div>
                            <h2 className="text-3xl sm:text-4xl font-light">
                                SEE YOU <span className="font-editorial-serif italic font-normal">at</span> YOUR HOME
                            </h2>
                            <div className="inline-block border border-white/20 bg-white/5 px-6 py-3 font-mono text-xl font-bold tracking-widest my-4">
                                {bookingSuccess.code}
                            </div>
                        </div>

                        <div className="mt-8 space-y-3 border-t border-white/10 pt-6 text-xs font-mono">
                            <div className="flex justify-between py-1 border-b border-white/5">
                                <span className="text-neutral-400">CUSTOMER</span>
                                <span className="text-right font-medium">{bookingSuccess.customerName} ({bookingSuccess.customerPhone})</span>
                            </div>
                            <div className="flex justify-between py-1 border-b border-white/5">
                                <span className="text-neutral-400">ALAMAT RUMAH</span>
                                <span className="text-right max-w-xs">{bookingSuccess.address}</span>
                            </div>
                            <div className="flex justify-between py-1 border-b border-white/5">
                                <span className="text-neutral-400">JADWAL HOME SERVICE</span>
                                <span className="text-right font-bold text-white">
                                    {formatDateDMY(bookingSuccess.date)} @ {bookingSuccess.time} WIB
                                </span>
                            </div>
                            <div className="flex justify-between py-1 border-b border-white/5">
                                <span className="text-neutral-400">KAPSTER BERTUGAS</span>
                                <span className="text-right">{bookingSuccess.barber}</span>
                            </div>
                            <div className="flex justify-between py-1 border-b border-white/5">
                                <span className="text-neutral-400">STATUS PEMBAYARAN</span>
                                <span className={`text-right font-bold ${bookingSuccess.rawPaymentStatus === 'paid' || bookingSuccess.paymentStatus?.includes('LUNAS')
                                        ? 'text-emerald-400'
                                        : 'text-amber-400'
                                    }`}>
                                    {bookingSuccess.paymentMethod} • {bookingSuccess.paymentStatus}
                                </span>
                            </div>
                            <div className="py-2 border-b border-white/5">
                                <span className="text-neutral-400 block mb-2">RINCIAN PESANAN:</span>
                                {bookingSuccess.services.map((s: Service) => (
                                    <div key={s.id} className="flex justify-between text-neutral-300 pl-2 py-0.5">
                                        <span className="font-sans text-xs">• {s.name}</span>
                                        <span>Rp {Number(s.price).toLocaleString('id-ID')}</span>
                                    </div>
                                ))}
                            </div>
                            <div className="flex justify-between py-2 text-sm font-bold text-white pt-3">
                                <span>TOTAL PEMBAYARAN</span>
                                <span>Rp {bookingSuccess.totalPrice.toLocaleString('id-ID')}</span>
                            </div>
                        </div>

                        {/* Actions */}
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
                                `• Jadwal: ${formatDateDMY(bookingSuccess.date)} @ ${bookingSuccess.time} WIB\n` +
                                `• Pembayaran: ${bookingSuccess.paymentMethod} (${bookingSuccess.paymentStatus})\n` +
                                `• Total: Rp ${bookingSuccess.totalPrice.toLocaleString('id-ID')}\n\n` +
                                `Mohon konfirmasi kedatangannya ya. Terima kasih!`
                            );

                            return (
                                <div className="mt-10 flex flex-col sm:flex-row gap-3 justify-center">
                                    <a
                                        href={`https://wa.me/${waNumber}?text=${waMessage}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="border border-white bg-white text-black px-6 py-3 text-xs font-bold font-mono text-center uppercase hover:bg-transparent hover:text-white transition tracking-wider"
                                    >
                                        ( HUBUNGI KAPSTER VIA WHATSAPP )
                                    </a>
                                    <Link
                                        to="/history"
                                        className="border border-white/40 text-white px-6 py-3 text-xs font-mono text-center uppercase hover:border-white hover:bg-white/10 transition tracking-wider"
                                    >
                                        ( RIWAYAT &amp; TRACKING )
                                    </Link>
                                    <button
                                        onClick={() => {
                                            localStorage.removeItem('activeHomeServiceBooking');
                                            setBookingSuccess(null);
                                        }}
                                        className="border border-white/20 text-neutral-400 px-6 py-3 text-xs font-mono text-center uppercase hover:border-white hover:text-white transition cursor-pointer tracking-wider"
                                    >
                                        ( PESANAN BARU )
                                    </button>
                                </div>
                            );
                        })()}
                    </div>
                ) : (
                    /* ================= BOOKING FORM (DIRECT TO MIDTRANS) ================= */
                    <form onSubmit={handleProceedToPayment} className="grid grid-cols-1 lg:grid-cols-12 gap-10">

                        {/* Left 7 Columns: Selection Steps */}
                        <div className="lg:col-span-7 space-y-10">

                            {/* STEP 1: Select Services & Products */}
                            <div className="space-y-8">
                                {/* Sub-group 1: Layanan Grooming */}
                                <div>
                                    <div className="flex items-baseline justify-between border-b-2 border-black pb-2 mb-4">
                                        <h3 className="text-xl sm:text-2xl font-extrabold uppercase tracking-tight text-neutral-950">
                                            01. PILIH LAYANAN GROOMING
                                        </h3>
                                        <span className="text-xs font-mono text-neutral-500 font-bold">
                                            {selectedServiceIds.length} DIPILIH
                                        </span>
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                        {services
                                            .filter(s => {
                                                const n = s.name.toLowerCase();
                                                return n.includes('cut') || n.includes('wash') || n.includes('perm') || n.includes('trim') || n.includes('color');
                                            })
                                            .map(s => {
                                                const isSelected = selectedServiceIds.includes(s.id);
                                                return (
                                                    <div
                                                        key={s.id}
                                                        onClick={() => toggleService(s.id)}
                                                        className={`p-4 border transition-all cursor-pointer flex flex-col justify-between h-28 ${isSelected
                                                                ? 'bg-black text-white border-black shadow-md'
                                                                : 'bg-white text-black border-black/15 hover:border-black'
                                                            }`}
                                                    >
                                                        <div className="flex justify-between items-start">
                                                            <span className="font-bold text-sm tracking-tight">{s.name}</span>
                                                            <span className="text-[10px] font-mono opacity-60">
                                                                {s.duration > 0 ? `${s.duration} MIN` : 'SERVICE'}
                                                            </span>
                                                        </div>
                                                        <div className="flex justify-between items-end">
                                                            <span className="text-xs font-mono font-bold">
                                                                Rp {Number(s.price).toLocaleString('id-ID')}
                                                            </span>
                                                            <span className="text-xs font-mono">
                                                                {isSelected ? '[ ✓ ]' : '[ + ]'}
                                                            </span>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                    </div>
                                </div>

                                {/* Sub-group 2: Produk Rambut */}
                                <div>
                                    <div className="flex items-baseline justify-between border-b border-black/30 pb-2 mb-4">
                                        <h3 className="text-lg font-bold uppercase tracking-tight text-neutral-800">
                                            02. PRODUK RAMBUT (OPSIONAL)
                                        </h3>
                                        <span className="text-[11px] font-mono text-neutral-500">
                                            DIBAWAKAN OLEH KAPSTER
                                        </span>
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                        {services
                                            .filter(s => {
                                                const n = s.name.toLowerCase();
                                                return n.includes('powder') || n.includes('clay') || n.includes('paste') || n.includes('pomade');
                                            })
                                            .map(s => {
                                                const isSelected = selectedServiceIds.includes(s.id);
                                                return (
                                                    <div
                                                        key={s.id}
                                                        onClick={() => toggleService(s.id)}
                                                        className={`p-3.5 border transition-all cursor-pointer flex flex-col justify-between h-24 ${isSelected
                                                                ? 'bg-black text-white border-black shadow-md'
                                                                : 'bg-white text-black border-black/15 hover:border-black'
                                                            }`}
                                                    >
                                                        <div className="flex justify-between items-start">
                                                            <span className="font-medium text-xs tracking-tight">{s.name}</span>
                                                            <span className="text-[9px] font-mono opacity-60">PRODUCT</span>
                                                        </div>
                                                        <div className="flex justify-between items-end">
                                                            <span className="text-xs font-mono font-bold">
                                                                Rp {Number(s.price).toLocaleString('id-ID')}
                                                            </span>
                                                            <span className="text-xs font-mono">
                                                                {isSelected ? '[ ✓ ]' : '[ + ]'}
                                                            </span>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                    </div>
                                </div>
                            </div>

                            {/* STEP 2: Choose Home Service Kapster */}
                            <div className="space-y-4">
                                <div className="border-b-2 border-black pb-2">
                                    <h3 className="text-xl sm:text-2xl font-extrabold uppercase tracking-tight text-neutral-950">
                                        03. PILIH KAPSTER HOME SERVICE
                                    </h3>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    {kapsters.map(k => {
                                        const isSelected = selectedKapsterId === k.id;
                                        return (
                                            <div
                                                key={k.id}
                                                onClick={() => setSelectedKapsterId(k.id)}
                                                className={`p-4 border transition-all cursor-pointer flex items-center justify-between ${isSelected
                                                        ? 'bg-black text-white border-black shadow-md'
                                                        : 'bg-white text-black border-black/15 hover:border-black'
                                                    }`}
                                            >
                                                <div className="flex items-center space-x-3">
                                                    <div className={`w-10 h-10 border flex items-center justify-center font-bold text-sm font-mono ${isSelected ? 'border-white/30 bg-white/10 text-white' : 'border-black/20 bg-neutral-100 text-black'
                                                        }`}>
                                                        {k.name.charAt(0)}
                                                    </div>
                                                    <div>
                                                        <div className="font-bold text-sm">{k.name}</div>
                                                        <div className="text-[10px] font-mono opacity-70">
                                                            {k.phone || 'Home Service Capster'}
                                                        </div>
                                                    </div>
                                                </div>
                                                <span className="text-xs font-mono font-bold">
                                                    {isSelected ? '[ PILIHAN ]' : '[ PILIH ]'}
                                                </span>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* STEP 3: Choose Date & Time */}
                            <div className="space-y-6">
                                <div className="border-b-2 border-black pb-2">
                                    <h3 className="text-xl sm:text-2xl font-extrabold uppercase tracking-tight text-neutral-950">
                                        04. JADWAL HOME SERVICE 
                                    </h3>
                                </div>

                                {/* Available Date Chips */}
                                <div className="grid grid-cols-3 sm:grid-cols-7 gap-2">
                                    {availableDates.map(d => {
                                        const isSelected = selectedDate === d.full;
                                        return (
                                            <button
                                                key={d.full}
                                                type="button"
                                                onClick={() => setSelectedDate(d.full)}
                                                className={`py-3 px-2 text-center border transition-all cursor-pointer flex flex-col items-center justify-center gap-1 ${isSelected
                                                        ? 'bg-black text-white border-black font-bold shadow-md'
                                                        : 'bg-white text-black border-black/15 hover:border-black'
                                                    }`}
                                            >
                                                <div className="text-[9px] font-mono opacity-70 uppercase">{d.day}</div>
                                                <div className="text-base font-semibold tracking-tight">{d.dateNum}</div>
                                                <div className="text-[9px] font-mono opacity-70 uppercase">{d.month}</div>
                                            </button>
                                        );
                                    })}
                                </div>

                                {/* Time Slots */}
                                <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                                    {TIME_SLOTS.map(time => {
                                        const isSelected = selectedTime === time;
                                        const isUnavailable = isSlotUnavailable(selectedDate, time, selectedKapsterId);

                                        return (
                                            <button
                                                key={time}
                                                type="button"
                                                disabled={isUnavailable}
                                                onClick={() => {
                                                    if (!isUnavailable) {
                                                        setSelectedTime(time);
                                                        setErrorMessage('');
                                                    }
                                                }}
                                                className={`py-2.5 text-center border text-xs font-mono transition-all ${isUnavailable
                                                        ? 'bg-neutral-100 text-neutral-400 border-neutral-200 cursor-not-allowed line-through opacity-50'
                                                        : isSelected
                                                            ? 'bg-black text-white border-black font-bold shadow-sm cursor-pointer'
                                                            : 'bg-white text-black border-black/15 hover:border-black cursor-pointer'
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
                                <div className="border-b-2 border-black pb-2">
                                    <h3 className="text-xl sm:text-2xl font-extrabold uppercase tracking-tight text-neutral-950">
                                        05. ALAMAT &amp; CATATAN
                                    </h3>
                                </div>

                                <div>
                                    <label className="block text-[11px] font-mono uppercase text-neutral-700 mb-1.5 font-medium">
                                        Alamat Lengkap Rumah (Wajib) *
                                    </label>
                                    <textarea
                                        rows={3}
                                        value={homeAddress}
                                        onChange={e => setHomeAddress(e.target.value)}
                                        placeholder="Masukkan alamat lengkap rumah / apartemen, nomor rumah, blok, RT/RW, dan patokan lokasi..."
                                        className="w-full bg-white border border-black/20 p-3.5 text-xs focus:border-black focus:outline-none transition-colors"
                                        required
                                    />
                                </div>

                                <div>
                                    <label className="block text-[11px] font-mono uppercase text-neutral-700 mb-1.5 font-medium">
                                        Catatan Tambahan (Opsional)
                                    </label>
                                    <input
                                        type="text"
                                        value={notes}
                                        onChange={e => setNotes(e.target.value)}
                                        placeholder="Contoh: Model low fade / bawa hair powder..."
                                        className="w-full bg-white border border-black/20 p-3.5 text-xs focus:border-black focus:outline-none transition-colors"
                                    />
                                </div>
                            </div>

                        </div>

                        {/* Right 5 Columns: Booking Summary Sticky Sidebar */}
                        <div className="lg:col-span-5">
                            <div className="bg-black text-white p-6 sm:p-8 sticky top-8 space-y-6 shadow-xl border border-black">

                                <div className="flex items-center justify-between border-b border-white/20 pb-3">
                                    <h3 className="text-xs font-mono tracking-widest uppercase text-neutral-300">
                                        ( RINGKASAN HOME SERVICE )
                                    </h3>
                                    <span className="text-[10px] text-neutral-400 font-mono">HAIR DEPT.</span>
                                </div>

                                {/* Service Type Info */}
                                <div className="text-xs space-y-1 font-light border-b border-white/10 pb-4">
                                    <div className="font-bold uppercase tracking-wider text-white">
                                        HOME SERVICE APPOINTMENT
                                    </div>
                                    <p className="text-neutral-400 text-[11px]">
                                        Kapster datang langsung ke lokasi rumah Anda
                                    </p>
                                </div>

                                {/* Date & Kapster Summary */}
                                <div className="text-xs font-mono space-y-2 border-b border-white/10 pb-4">
                                    <div className="flex justify-between">
                                        <span className="text-neutral-400">TANGGAL:</span>
                                        <span className="font-bold text-white">{selectedDate || '-'}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-neutral-400">JAM:</span>
                                        <span className="font-bold text-white">{selectedTime ? `${selectedTime} WIB` : 'Pilih Jam'}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-neutral-400">KAPSTER:</span>
                                        <span className="text-right text-neutral-200">
                                            {kapsters.find(k => k.id === selectedKapsterId)?.name || 'Home Service Capster'}
                                        </span>
                                    </div>
                                    {homeAddress && (
                                        <div className="flex justify-between text-[11px] pt-1">
                                            <span className="text-neutral-400">ALAMAT:</span>
                                            <span className="text-right text-neutral-300 max-w-[180px] truncate">{homeAddress}</span>
                                        </div>
                                    )}
                                </div>

                                {/* Selected Services List */}
                                <div className="space-y-2 border-b border-white/10 pb-4 text-xs font-mono">
                                    <div className="text-neutral-400 text-[11px] mb-1">LAYANAN DIPILIH:</div>
                                    {selectedServiceIds.length === 0 ? (
                                        <div className="text-neutral-500 italic text-[11px]">Belum ada layanan dipilih</div>
                                    ) : (
                                        selectedServiceIds.map(id => {
                                            const item = services.find(s => s.id === id);
                                            if (!item) return null;
                                            return (
                                                <div key={item.id} className="flex justify-between text-neutral-300">
                                                    <span>• {item.name}</span>
                                                    <span>Rp {Number(item.price).toLocaleString('id-ID')}</span>
                                                </div>
                                            );
                                        })
                                    )}
                                </div>

                                {/* Total Calculation */}
                                <div className="pt-2 flex justify-between items-baseline font-mono">
                                    <span className="text-xs text-neutral-300 font-bold uppercase">TOTAL ESTIMASI</span>
                                    <span className="text-xl sm:text-2xl font-bold text-white">
                                        Rp {totalPrice.toLocaleString('id-ID')}
                                    </span>
                                </div>

                                {/* Submit Action Button -> Opens Midtrans directly */}
                                <button
                                    type="submit"
                                    disabled={selectedServiceIds.length === 0 || !selectedTime || !homeAddress.trim() || isSubmitting}
                                    className="w-full bg-white text-black py-4 text-xs font-bold font-mono tracking-widest uppercase hover:bg-neutral-200 disabled:opacity-40 disabled:cursor-not-allowed transition cursor-pointer shadow-md"
                                >
                                    {isSubmitting ? '( MEMPROSES KE MIDTRANS... )' : '( LANJUT KE PEMBAYARAN → )'}
                                </button>

                                <p className="text-[9px] font-mono text-neutral-400 text-center leading-relaxed uppercase">
                                    PEMBAYARAN RESMI DILINDUNGI &amp; DIPROSES OLEH MIDTRANS PAYMENT GATEWAY.
                                </p>
                            </div>
                        </div>

                    </form>
                )}

            </main>

            {/* Footer */}
            <footer className="w-full max-w-6xl mx-auto pt-6 border-t border-black/10 flex items-center justify-between text-[10px] font-mono text-neutral-500 uppercase">
                <span>© 2026 HAIR DEPT. IN YOUR HOME. ALL RIGHTS RESERVED.</span>
                <span>PREMIUM HOME GROOMING EXPERIENCE</span>
            </footer>

        </div>
    );
}
