import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { socket } from '../api/socket';
import { getCustomerOrders, getKapsters, getDirectSnapToken, updateOrderStatus, ensureSnapLoaded, type Kapster } from '../api/bookingApi';

export default function OrderHistory() {
  const navigate = useNavigate();
  const [customer, setCustomer] = useState<{ id?: number; name?: string; phone?: string } | null>(null);
  const [orders, setOrders] = useState<any[]>([]);
  const [kapsters, setKapsters] = useState<Kapster[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [payingOrderId, setPayingOrderId] = useState<number | null>(null);
  
  // Active Order selected for Tracking Modal
  const [trackingOrder, setTrackingOrder] = useState<any | null>(null);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const storedCustomer = localStorage.getItem('customer');

    if (!token) {
      navigate('/login');
      return;
    }

    let currentCust: any = null;
    if (storedCustomer) {
      try {
        currentCust = JSON.parse(storedCustomer);
        setCustomer(currentCust);
      } catch (e) {
        console.error(e);
      }
    }

    const loadOrders = async () => {
      try {
        setIsLoading(true);
        const [ordersData, kapstersData] = await Promise.all([
          currentCust?.id ? getCustomerOrders(currentCust.id) : Promise.resolve([]),
          getKapsters(),
        ]);
        setOrders(ordersData);
        setKapsters(kapstersData);
      } catch (err) {
        console.error('Failed to load order history:', err);
      } finally {
        setIsLoading(false);
      }
    };

    loadOrders();

    // Real-time WebSocket listener
    const handleRealtimeUpdate = async () => {
      if (!currentCust?.id) return;
      try {
        const updated = await getCustomerOrders(currentCust.id);
        setOrders(updated);

        // Also update currently opened tracking modal if matching
        setTrackingOrder((prev: any) => {
          if (!prev) return null;
          const fresh = updated.find((o: any) => o.id === prev.id);
          return fresh || prev;
        });
      } catch (e) {
        console.error(e);
      }
    };

    socket.on('data:updated', handleRealtimeUpdate);

    return () => {
      socket.off('data:updated', handleRealtimeUpdate);
    };
  }, [navigate]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('customer');
    localStorage.removeItem('activeHomeServiceBooking');
    navigate('/login');
  };

  // Trigger Midtrans payment directly for unpaid order
  const handlePayOrder = async (order: any) => {
    try {
      setPayingOrderId(order.id);
      await ensureSnapLoaded();
      const grossAmount = Number(order.totalPrice || 35000);
      const snapToken = await getDirectSnapToken(
        order.id,
        grossAmount,
        customer?.name || 'Customer Hair Dept',
        customer?.phone || '08123456789'
      );

      if (typeof window !== 'undefined' && window.snap && snapToken) {
        window.snap.pay(snapToken, {
          onSuccess: async function (result: any) {
            console.log('Midtrans Payment Success:', result);
            try {
              await updateOrderStatus(order.id, {
                paymentStatus: 'paid',
                paymentMethod: 'Midtrans Payment Gateway',
                amountReceived: grossAmount,
                changeAmount: 0,
              });
            } catch (syncErr) {
              console.error('Failed to sync paid status to backend:', syncErr);
            }

            // Update local state
            setOrders(prev =>
              prev.map(o => (o.id === order.id ? { ...o, paymentStatus: 'paid' } : o))
            );
            setTrackingOrder((prev: any) =>
              prev && prev.id === order.id ? { ...prev, paymentStatus: 'paid' } : prev
            );
          },
          onPending: function (result: any) {
            console.log('Midtrans Payment Pending:', result);
          },
          onError: function (err: any) {
            console.error('Midtrans Payment Error:', err);
            alert('Pembayaran Midtrans gagal atau dibatalkan. Silakan coba kembali.');
          },
          onClose: function () {
            console.log('Midtrans popup closed');
          },
        });
      } else {
        alert('Gagal memuat sistem pembayaran Midtrans. Pastikan koneksi internet aktif.');
      }
    } catch (err) {
      console.error('Failed to initiate Midtrans payment:', err);
      alert('Terjadi kesalahan saat memproses pembayaran.');
    } finally {
      setPayingOrderId(null);
    }
  };

  const getStatusText = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'on_the_way':
      case 'otw':
        return 'DALAM PERJALANAN (OTW)';
      case 'in_service':
      case 'in_progress':
        return 'SEDANG DILAYANI';
      case 'completed':
        return 'SELESAI';
      case 'cancelled':
        return 'DIBATALKAN';
      default:
        return 'MENUNGGU KONFIRMASI';
    }
  };

  const getStepIndex = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'on_the_way':
      case 'otw':
        return 1;
      case 'in_service':
      case 'in_progress':
        return 2;
      case 'completed':
        return 3;
      default:
        return 0; // waiting
    }
  };

  const trackingSteps = [
    {
      title: 'Pesanan Diterima',
      desc: 'Pesanan Anda telah diterima & kapster sedang dijadwalkan',
    },
    {
      title: 'Kapster Menuju Lokasi (OTW)',
      desc: 'Kapster sedang dalam perjalanan menuju ke alamat Anda',
    },
    {
      title: 'Sedang Dilayani (In Service)',
      desc: 'Kapster sudah tiba di lokasi dan proses grooming berlangsung',
    },
    {
      title: 'Layanan Selesai',
      desc: 'Pesanan selesai. Terima kasih telah menggunakan Hair Dept.',
    },
  ];

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
          <Link to="/booking" className="border border-black bg-black text-white px-3.5 py-1 text-xs hover:bg-neutral-800 transition font-bold font-mono">
            + BOOKING
          </Link>
          <button
            onClick={handleLogout}
            className="border border-black/30 px-3.5 py-1 text-xs hover:border-black hover:bg-black hover:text-white transition cursor-pointer font-mono"
          >
            LOGOUT
          </button>
        </div>
      </header>

      {/* Main Order History Section */}
      <main className="my-8 w-full max-w-6xl mx-auto">
        
        {/* Title Section */}
        <div className="mb-10 text-center sm:text-left flex flex-col sm:flex-row sm:items-baseline sm:justify-between gap-2 border-b border-black pb-4">
          <div>
            <h1 className="text-3xl sm:text-5xl font-light tracking-tight">
              ORDER <span className="font-editorial-serif italic font-normal">history</span>
            </h1>
          </div>
          <span className="text-xs font-mono uppercase tracking-widest text-neutral-500">
            [ {orders.length} PESANAN TERCATAT ]
          </span>
        </div>

        {isLoading ? (
          <div className="py-24 text-center font-mono text-xs text-neutral-500 tracking-wider">
            ( MEMUAT RIWAYAT PEMESANAN... )
          </div>
        ) : orders.length === 0 ? (
          <div className="py-20 text-center space-y-4 border border-black/15 bg-white p-10">
            <h3 className="text-lg font-bold tracking-tight text-neutral-900 uppercase">
              Belum Ada Riwayat Pemesanan
            </h3>
            <p className="text-xs text-neutral-500 font-mono max-w-md mx-auto">
              Semua riwayat pemesanan Home Service Anda akan muncul di sini secara otomatis.
            </p>
            <div className="pt-4">
              <Link
                to="/booking"
                className="inline-block border border-black bg-black text-white px-6 py-2.5 text-xs font-bold font-mono tracking-widest uppercase hover:bg-neutral-800 transition"
              >
                ( BOOKING SEKARANG )
              </Link>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {orders.map((order) => {
              const kapsterObj = kapsters.find(k => k.id === order.kapsterId);
              const kapsterName = kapsterObj?.name || 'Home Service Capster';
              const kapsterPhone = kapsterObj?.phone || '';

              // WhatsApp Link
              const rawPhone = kapsterPhone.replace(/\D/g, '') || '';
              const waNumber = rawPhone.startsWith('0')
                ? '62' + rawPhone.slice(1)
                : rawPhone.startsWith('62')
                ? rawPhone
                : rawPhone ? '62' + rawPhone : '6281345678910';

              const waMessage = encodeURIComponent(
                `Halo ${kapsterName} (Kapster Hair Dept),\n\nSaya ${customer?.name || 'Customer'} ingin konfirmasi pesanan Home Service:\n` +
                `• Kode: HD-00${order.id}\n` +
                `• Jam: ${order.checkInTime} WIB\n\nTerima kasih!`
              );

              const isPaid = order.paymentStatus?.toLowerCase() === 'paid';

              return (
                <div
                  key={order.id}
                  className="bg-white border border-black/20 p-6 sm:p-8 space-y-6 transition-all shadow-sm"
                >
                  {/* Top Bar: Order Code & Statuses */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-black/10 pb-4">
                    <div className="flex items-center space-x-4">
                      <span className="font-mono text-xl sm:text-2xl font-bold tracking-tight text-black">
                        HD-00{order.id}
                      </span>
                      <span className="text-[10px] font-mono border border-black px-2.5 py-0.5 uppercase bg-neutral-100 text-neutral-800 font-medium">
                        {getStatusText(order.serviceStatus)}
                      </span>
                    </div>

                    <div className="flex items-center space-x-3 text-xs font-mono">
                      <span className={`px-2.5 py-0.5 border uppercase font-medium ${
                        isPaid ? 'border-emerald-600 bg-emerald-50 text-emerald-700' : 'border-amber-600 bg-amber-50 text-amber-800 font-bold'
                      }`}>
                        {isPaid ? 'LUNAS' : 'BELUM LUNAS'}
                      </span>
                    </div>
                  </div>

                  {/* Order Details Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-6 text-xs">
                    {/* Schedule & Kapster */}
                    <div className="md:col-span-4 space-y-1.5 font-mono">
                      <div className="text-[10px] text-neutral-400 uppercase">JADWAL KEDATANGAN</div>
                      <div className="font-bold text-sm text-neutral-900">
                        {order.checkInTime} WIB
                      </div>
                      <div className="text-neutral-600 pt-1">
                        Kapster: <span className="text-black font-semibold">{kapsterName}</span>
                      </div>
                    </div>

                    {/* Location Address */}
                    <div className="md:col-span-4 space-y-1.5 font-mono">
                      <div className="text-[10px] text-neutral-400 uppercase">ALAMAT &amp; CATATAN</div>
                      <div className="text-neutral-700 font-sans line-clamp-3 leading-relaxed">
                        {order.notes || 'Home Service Location'}
                      </div>
                    </div>

                    {/* Services & Total */}
                    <div className="md:col-span-4 space-y-2 font-mono flex flex-col justify-between">
                      <div>
                        <div className="text-[10px] text-neutral-400 uppercase mb-1">LAYANAN</div>
                        {Array.isArray(order.services) && order.services.length > 0 ? (
                          order.services.map((s: any) => (
                            <div key={s.id} className="flex justify-between text-neutral-700 py-0.5">
                              <span className="font-sans">• {s.name}</span>
                              <span className="font-semibold">Rp {Number(s.price).toLocaleString('id-ID')}</span>
                            </div>
                          ))
                        ) : (
                          <div className="text-neutral-700">• Home Service Treatment</div>
                        )}
                      </div>

                      <div className="pt-3 border-t border-black/10 flex justify-between items-baseline font-bold text-sm text-black">
                        <span>TOTAL</span>
                        <span className="text-base font-mono">
                          Rp {Number(order.totalPrice || 0).toLocaleString('id-ID')}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Footer Action Buttons */}
                  <div className="pt-4 border-t border-black/10 flex flex-col sm:flex-row items-center justify-between gap-3">
                    <span className="text-[10px] font-mono text-neutral-400 uppercase">
                      ⚡ REAL-TIME WEBSOCKET SYNC
                    </span>
                    <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
                      {!isPaid && (
                        <button
                          type="button"
                          disabled={payingOrderId === order.id}
                          onClick={() => handlePayOrder(order)}
                          className="border border-emerald-600 bg-emerald-600 text-white px-4 py-2 text-[11px] font-mono uppercase font-semibold hover:bg-emerald-700 transition cursor-pointer"
                        >
                          {payingOrderId === order.id ? '( MEMPROSES... )' : '( BAYAR SEKARANG → )'}
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => setTrackingOrder(order)}
                        className="flex-1 sm:flex-initial border border-black bg-black text-white px-5 py-2 text-[11px] font-mono uppercase font-semibold hover:bg-neutral-800 transition cursor-pointer"
                      >
                        ( LACAK STATUS PESANAN → )
                      </button>
                      <a
                        href={`https://wa.me/${waNumber}?text=${waMessage}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="border border-black/30 px-4 py-2 text-[11px] font-mono uppercase hover:border-black transition"
                      >
                        ( HUBUNGI )
                      </a>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

      </main>

      {/* ================= MODAL TRACKING PESANAN ================= */}
      {trackingOrder && (() => {
        const kapsterObj = kapsters.find(k => k.id === trackingOrder.kapsterId);
        const kapsterName = kapsterObj?.name || 'Home Service Capster';
        const kapsterPhone = kapsterObj?.phone || '';
        const currentStepIdx = getStepIndex(trackingOrder.serviceStatus);
        const isOrderPaid = trackingOrder.paymentStatus?.toLowerCase() === 'paid';

        const rawPhone = kapsterPhone.replace(/\D/g, '') || '';
        const waNumber = rawPhone.startsWith('0')
          ? '62' + rawPhone.slice(1)
          : rawPhone.startsWith('62')
          ? rawPhone
          : rawPhone ? '62' + rawPhone : '6281345678910';

        const waMessage = encodeURIComponent(
          `Halo ${kapsterName} (Kapster Hair Dept),\n\nSaya ${customer?.name || 'Customer'} ingin menanyakan status pesanan Home Service:\n` +
          `• Order ID: #HD-00${trackingOrder.id}\n` +
          `• Jam: ${trackingOrder.checkInTime} WIB\n\nTerima kasih!`
        );

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
            <div className="bg-white border-2 border-black w-full max-w-md p-6 sm:p-8 shadow-2xl space-y-6 relative max-h-[90vh] overflow-y-auto">
              
              {/* Close Button */}
              <button
                type="button"
                onClick={() => setTrackingOrder(null)}
                className="absolute top-4 right-4 text-xs font-mono font-bold hover:opacity-60 transition cursor-pointer"
              >
                [ ✕ TUTUP ]
              </button>

              {/* Header */}
              <div className="border-b border-black/10 pb-4">
                <div className="text-[10px] font-mono text-neutral-400 uppercase tracking-widest mb-1">
                  LIVE REAL-TIME TRACKING
                </div>
                <h3 className="text-2xl font-bold tracking-tight text-black">
                  Status Pesanan
                </h3>
                <div className="font-mono text-xs text-neutral-600 mt-1">
                  Order ID: <span className="font-bold text-black">#HD-00{trackingOrder.id}</span>
                </div>
              </div>

              {/* Vertical Stepper Timeline */}
              <div className="py-2 pl-2">
                <div className="relative">
                  {trackingSteps.map((step, idx) => {
                    const isCompleted = idx < currentStepIdx;
                    const isCurrent = idx === currentStepIdx;
                    const isUpcoming = idx > currentStepIdx;
                    const isLast = idx === trackingSteps.length - 1;

                    return (
                      <div key={idx} className="relative flex items-start">
                        {/* Connecting Line */}
                        {!isLast && (
                          <div
                            className={`absolute left-[13px] top-[26px] bottom-[-10px] w-[2px] transition-colors ${
                              idx < currentStepIdx ? 'bg-black' : 'bg-neutral-200'
                            }`}
                          />
                        )}

                        {/* Step Circle */}
                        <div className="relative z-10 flex items-center justify-center mr-4 shrink-0 mt-0.5">
                          {isCompleted ? (
                            <div className="w-7 h-7 rounded-full bg-black text-white flex items-center justify-center text-xs font-mono font-bold">
                              ✓
                            </div>
                          ) : isCurrent ? (
                            <div className="w-7 h-7 rounded-full bg-black text-white flex items-center justify-center text-[10px] font-mono font-bold ring-4 ring-black/10">
                              <span className="w-2 h-2 rounded-full bg-white animate-pulse"></span>
                            </div>
                          ) : (
                            <div className="w-7 h-7 rounded-full border-2 border-neutral-300 bg-white text-neutral-400 flex items-center justify-center text-[10px] font-mono">
                              0{idx + 1}
                            </div>
                          )}
                        </div>

                        {/* Step Description */}
                        <div className="pb-7 pt-0.5">
                          <h4 className={`text-sm font-bold tracking-tight ${
                            isCurrent ? 'text-black' : isCompleted ? 'text-neutral-800' : 'text-neutral-400'
                          }`}>
                            {step.title}
                          </h4>
                          <p className={`text-xs mt-0.5 leading-relaxed ${
                            isUpcoming ? 'text-neutral-400' : 'text-neutral-600'
                          }`}>
                            {step.desc}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Detail Info Card */}
              <div className="border border-black/10 bg-neutral-50 p-4 rounded text-xs font-mono space-y-2">
                <div className="flex justify-between">
                  <span className="text-neutral-500">Jadwal Kedatangan:</span>
                  <span className="font-bold text-black">{trackingOrder.checkInTime} WIB</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-500">Kapster Bertugas:</span>
                  <span className="font-bold text-black">{kapsterName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-500">Status Pembayaran:</span>
                  <span className={`font-bold ${isOrderPaid ? 'text-emerald-700' : 'text-amber-700'}`}>
                    {isOrderPaid ? 'LUNAS (PAID)' : 'BELUM LUNAS (UNPAID)'}
                  </span>
                </div>
                <div className="flex justify-between border-t border-black/5 pt-1.5">
                  <span className="text-neutral-500">Total Tagihan:</span>
                  <span className="font-bold text-black">
                    Rp {Number(trackingOrder.totalPrice || 0).toLocaleString('id-ID')}
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="space-y-2.5 pt-2">
                {!isOrderPaid && (
                  <button
                    type="button"
                    disabled={payingOrderId === trackingOrder.id}
                    onClick={() => handlePayOrder(trackingOrder)}
                    className="w-full block border border-emerald-600 bg-emerald-600 text-white py-3 text-xs font-mono uppercase font-bold text-center hover:bg-emerald-700 transition tracking-wider shadow-sm cursor-pointer"
                  >
                    {payingOrderId === trackingOrder.id ? '( MEMBUKA MIDTRANS... )' : 'BAYAR SEKARANG VIA MIDTRANS →'}
                  </button>
                )}
                <a
                  href={`https://wa.me/${waNumber}?text=${waMessage}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full block border border-black bg-black text-white py-3 text-xs font-mono uppercase font-bold text-center hover:bg-neutral-800 transition tracking-wider"
                >
                  Hubungi Kapster / Staff
                </a>
                <button
                  type="button"
                  onClick={() => setTrackingOrder(null)}
                  className="w-full block border border-black/20 text-neutral-700 py-2.5 text-xs font-mono uppercase text-center hover:border-black transition"
                >
                  Tutup
                </button>
              </div>

            </div>
          </div>
        );
      })()}

      {/* Footer */}
      <footer className="w-full max-w-6xl mx-auto pt-6 border-t border-black/10 flex items-center justify-between text-[10px] font-mono text-neutral-500 uppercase">
        <span>© 2026 HAIR DEPT. IN YOUR HOME. ALL RIGHTS RESERVED.</span>
        <span>PREMIUM HOME GROOMING EXPERIENCE</span>
      </footer>

    </div>
  );
}
