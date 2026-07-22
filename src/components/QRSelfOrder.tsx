import React, { useState, useEffect } from 'react';
import { 
  Send, Utensils, CheckCircle, RefreshCw, Star, 
  Plus, Minus, QrCode, WifiOff, AlertTriangle, RefreshCw as Spinner 
} from 'lucide-react';
import { MenuItem, Order } from '../types';
import { auth, db } from '../lib/firebaseClientApi';
import { onAuthStateChanged } from 'firebase/auth';
import { collection, addDoc, getDocs, doc, getDoc } from 'firebase/firestore';

interface QRSelfOrderProps {
  isCustomerMode?: boolean;
  tableNum?: string;
}

// Custom request timeout & retry utility
async function fetchWithRetryAndTimeout(
  url: string,
  options: RequestInit = {},
  retries = 3,
  timeoutMs = 10000
): Promise<Response> {
  let attempt = 0;
  while (attempt < retries) {
    attempt++;
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
      });
      clearTimeout(id);
      return response;
    } catch (err) {
      clearTimeout(id);
      console.warn(`[Retry & Timeout] Attempt ${attempt} failed for ${url}:`, err);
      if (attempt >= retries) {
        throw err;
      }
      // Simple linear backoff delay
      await new Promise((resolve) => setTimeout(resolve, attempt * 1000));
    }
  }
  throw new Error('Semua percobaan request gagal.');
}

export default function QRSelfOrder({ isCustomerMode = false, tableNum = '' }: QRSelfOrderProps) {
  const [activeTable, setActiveTable] = useState<string>(tableNum || '5');
  const [activeCategory, setActiveCategory] = useState<'Makanan' | 'Minuman'>('Makanan');
  const [currentOrigin, setCurrentOrigin] = useState('https://wdspos.tiarjira.workers.dev');
  const [currentUser, setCurrentUser] = useState<any>(null);

  // States for Customer Phone Mode
  const [guestCart, setGuestCart] = useState<{ product: MenuItem; quantity: number; note: string }[]>([]);
  const [guestNotes, setGuestNotes] = useState('');
  const [successOrder, setSuccessOrder] = useState<any>(null);
  
  // Hardening, Validation and Health-check States
  const [menu, setMenu] = useState<MenuItem[]>([]);
  const [isOnline, setIsOnline] = useState<boolean>(true);
  const [healthStatus, setHealthStatus] = useState<'LOADING' | 'OK' | 'ERROR' | 'MAINTENANCE'>('LOADING');
  const [loadingStateMessage, setLoadingStateMessage] = useState('Menghubungkan ke server...');
  const [healthErrorMessage, setHealthErrorMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [storeProfile, setStoreProfile] = useState<any>({ name: 'Warung Daeng Soppeng' });

  // Load origin and environment url safely
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const configOrigin = 'https://wdspos.tiarjira.workers.dev';
      setCurrentOrigin(configOrigin);
      
      // Online/Offline Listeners
      setIsOnline(window.navigator.onLine);
      const goOnline = () => {
        setIsOnline(true);
        runHealthCheck();
      };
      const goOffline = () => setIsOnline(false);

      window.addEventListener('online', goOnline);
      window.addEventListener('offline', goOffline);

      return () => {
        window.removeEventListener('online', goOnline);
        window.removeEventListener('offline', goOffline);
      };
    }
  }, []);

  // Monitor Firebase Auth Anonymous Session
  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      if (user) {
        setCurrentUser(user);
        console.log('Firebase Anonymous Auth Active:', user.uid);
      } else {
        setCurrentUser(null);
      }
    });
    return () => unsubscribeAuth();
  }, []);

  // Synchronize tableNum prop to activeTable state
  useEffect(() => {
    if (tableNum) {
      setActiveTable(tableNum);
    }
  }, [tableNum]);

  // Save Cart to localStorage on changes
  useEffect(() => {
    if (isCustomerMode && activeTable) {
      try {
        localStorage.setItem(`wds_self_order_cart_table_${activeTable}`, JSON.stringify(guestCart));
      } catch (err) {
        console.error('Failed to write cart to localStorage:', err);
      }
    }
  }, [guestCart, isCustomerMode, activeTable]);

  // Load Cart from localStorage on init
  useEffect(() => {
    if (isCustomerMode && activeTable) {
      try {
        const saved = localStorage.getItem(`wds_self_order_cart_table_${activeTable}`);
        if (saved) {
          setGuestCart(JSON.parse(saved));
        }
      } catch (err) {
        console.error('Failed to read cart from localStorage:', err);
      }
    }
  }, [isCustomerMode, activeTable]);

  // Firestore System Error Logging Helper
  const logErrorToFirestore = async (errorMessage: string) => {
    try {
      const userAgent = typeof navigator !== 'undefined' ? navigator.userAgent : 'Unknown';
      const url = typeof window !== 'undefined' ? window.location.href : 'Unknown';
      
      let device = 'Desktop';
      if (/android/i.test(userAgent)) device = 'Android';
      else if (/ipad|iphone|ipod/i.test(userAgent)) device = 'iOS Device';
      else if (/tablet/i.test(userAgent)) device = 'Tablet';

      let browser = 'Unknown Browser';
      if (/chrome|crios/i.test(userAgent)) browser = 'Chrome';
      else if (/safari/i.test(userAgent)) browser = 'Safari';
      else if (/samsung/i.test(userAgent)) browser = 'Samsung Browser';
      else if (/firefox/i.test(userAgent)) browser = 'Firefox';

      await addDoc(collection(db, 'system_logs'), {
        timestamp: new Date().toISOString(),
        device,
        browser,
        url,
        error_message: errorMessage
      });
      console.log('[System Log] Error logged successfully to Firestore collection.');
    } catch (logErr) {
      console.warn('[System Log] Failed to record error log inside Firestore (Firestore offline/disabled):', logErr);
    }
  };

  // Run Thorough Health Checks & Load Menu
  const runHealthCheck = async () => {
    setHealthStatus('LOADING');
    setLoadingStateMessage('Menghubungkan ke server...');
    setHealthErrorMessage('');

    // Check immediate offline state
    if (typeof window !== 'undefined' && !window.navigator.onLine) {
      setIsOnline(false);
      setHealthStatus('ERROR');
      return;
    }

    try {
      // Validation 1: Table ID is Empty
      if (!activeTable || activeTable.trim() === '') {
        setHealthStatus('ERROR');
        setHealthErrorMessage('Nomor meja tidak ditentukan. Silakan scan QR Code kembali.');
        await logErrorToFirestore('Table validation failed: table id is empty.');
        return;
      }

      setLoadingStateMessage('Memuat menu...');

      // Run parallel fetches with 3x retry and 10s timeout to avoid any Cloud Run bottlenecks
      const [settingsRes, tablesRes, menuRes] = await Promise.all([
        fetchWithRetryAndTimeout('/api/v1/settings'),
        fetchWithRetryAndTimeout('/api/v1/tables'),
        fetchWithRetryAndTimeout('/api/v1/menu')
      ]);

      if (!settingsRes.ok || !tablesRes.ok || !menuRes.ok) {
        throw new Error('Satu atau lebih request konfigurasi gagal atau timeout.');
      }

      const settingsData = await settingsRes.json();
      const tablesData = await tablesRes.json();
      const menuData = await menuRes.json();

      if (settingsData && settingsData.storeProfile) {
        setStoreProfile(settingsData.storeProfile);
      }

      // Validation 2: Table ID Not Found in Database
      const tableExists = tablesData.some(
        (t: any) => String(t.number) === String(activeTable) || String(t.id) === String(activeTable)
      );
      if (!tableExists) {
        setHealthStatus('ERROR');
        setHealthErrorMessage('Nomor meja tidak terdaftar. Silakan hubungi kasir.');
        await logErrorToFirestore(`Table validation failed: Table ID "${activeTable}" not found in database.`);
        return;
      }

      // Validation 3: Outlet is Inactive / Closed
      const isOutletClosed = settingsData?.status === 'CLOSED' || settingsData?.outletStatus === 'CLOSED' || settingsData?.outlet?.status === 'CLOSED';
      if (isOutletClosed) {
        setHealthStatus('ERROR');
        setHealthErrorMessage('Outlet sedang tutup/tidak aktif. Silakan hubungi pelayanan kami.');
        await logErrorToFirestore('Outlet validation failed: outlet is closed.');
        return;
      }

      // Validation 4: Menu list is Empty
      if (!menuData || menuData.length === 0) {
        setHealthStatus('ERROR');
        setHealthErrorMessage('Menu belum tersedia saat ini.');
        await logErrorToFirestore('Menu validation failed: menu collection is empty.');
        return;
      }

      // Success
      setMenu(menuData);
      setHealthStatus('OK');
    } catch (err: any) {
      console.error('Error in QR Self Order health check:', err);
      setHealthStatus('MAINTENANCE');
      setHealthErrorMessage('Menu sementara tidak tersedia.');
      await logErrorToFirestore(`Health Check/Access Failed: ${err?.message || err}`);
      
      // Redirect to /maintenance dynamically to satisfy requirement 14
      if (typeof window !== 'undefined' && window.location.pathname !== '/maintenance') {
        window.history.pushState({}, '', '/maintenance');
        // Dispatch popstate to update any routers
        window.dispatchEvent(new PopStateEvent('popstate'));
      }
    }
  };

  useEffect(() => {
    runHealthCheck();
  }, [activeTable]);

  const addToGuestCart = (item: MenuItem) => {
    if (item.stock === 0) {
      alert('Sajian ini sedang habis, silakan pilih menu Daeng yang lain!');
      return;
    }
    setGuestCart(prev => {
      const idx = prev.findIndex(c => c.product.id === item.id);
      if (idx > -1) {
        const copy = [...prev];
        copy[idx].quantity += 1;
        return copy;
      } else {
        return [...prev, { product: item, quantity: 1, note: '' }];
      }
    });
  };

  const updateGuestQty = (index: number, delta: number) => {
    setGuestCart(prev => {
      const copy = [...prev];
      const newQty = copy[index].quantity + delta;
      if (newQty <= 0) {
        copy.splice(index, 1);
      } else {
        copy[index].quantity = newQty;
      }
      return copy;
    });
  };

  const handleSelfOrderSubmit = async () => {
    if (guestCart.length === 0) return;
    setIsSubmitting(true);

    const items = guestCart.map(c => ({
      productId: c.product.id,
      name: c.product.name,
      price: c.product.price,
      quantity: c.quantity,
      variation: 'Original',
      modifiers: [],
      notes: c.note
    }));

    const subtotal = guestCart.reduce((sum, c) => sum + c.product.price * c.quantity, 0);
    const serviceCharge = Math.floor(subtotal * 0.05); // 5% standard
    const total = subtotal + serviceCharge;

    const payload = {
      customerId: '',
      paymentMethod: 'QRIS',
      tableNumber: activeTable,
      items,
      subtotal,
      discount: 0,
      total,
      notes: guestNotes,
      source: 'QR_SELF_ORDER',
      outletId: 'out_1'
    };

    try {
      // POST order with built-in retry + timeout
      const res = await fetchWithRetryAndTimeout('/api/v1/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        const orderData = await res.json();
        setSuccessOrder(orderData);
        setGuestCart([]);
        setGuestNotes('');
        try {
          localStorage.removeItem(`wds_self_order_cart_table_${activeTable}`);
        } catch (_) {}
        runHealthCheck(); // Refresh menu levels
      } else {
        throw new Error(`Order submission responded with HTTP ${res.status}`);
      }
    } catch (err: any) {
      console.error('Error submitting self-order:', err);
      alert('Gagal mengirimkan pesanan mandiri. Silakan cek koneksi internet Anda dan coba lagi.');
      await logErrorToFirestore(`Self-order submit failed: ${err?.message || err}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const guestSubtotal = guestCart.reduce((sum, item) => sum + item.product.price * item.quantity, 0);

  // ==================== RENDERING BLOCKS ====================

  // OFFLINE FALLBACK SCREEN
  if (!isOnline) {
    return (
      <div className="fixed inset-0 bg-slate-950 flex flex-col items-center justify-center text-center p-6 text-white z-50 max-w-md mx-auto shadow-2xl">
        <WifiOff className="w-16 h-16 text-amber-500 mb-4 animate-pulse" />
        <h3 className="font-extrabold text-lg text-slate-100">Koneksi Terputus</h3>
        <p className="text-xs text-slate-400 mt-2 max-w-xs leading-relaxed">
          Koneksi internet tidak tersedia. Silakan coba kembali.
        </p>
        <div className="bg-slate-900 border border-slate-800 p-3 rounded-xl mt-4 w-full text-left font-mono text-[10px] text-slate-400">
          * Keranjang belanja Anda tetap aman tersimpan di memori perangkat ini.
        </div>
        <button 
          onClick={() => {
            setIsOnline(window.navigator.onLine);
            runHealthCheck();
          }}
          className="mt-6 w-full bg-amber-500 hover:bg-amber-400 text-slate-950 font-black px-5 py-3 rounded-xl transition-all cursor-pointer"
        >
          Coba Hubungkan Kembali
        </button>
      </div>
    );
  }

  // GENERAL ERROR / VALIDATION SCREEN
  if (healthStatus === 'ERROR') {
    return (
      <div className="fixed inset-0 bg-slate-950 flex flex-col items-center justify-center text-center p-6 text-white z-50 max-w-md mx-auto shadow-2xl">
        <AlertTriangle className="w-16 h-16 text-amber-500 mb-4" />
        <h3 className="font-extrabold text-lg text-slate-100">Pemberitahuan</h3>
        <p className="text-xs text-slate-400 mt-2 max-w-xs leading-relaxed">
          {healthErrorMessage || 'Gagal memproses validasi sistem.'}
        </p>
        <button 
          onClick={runHealthCheck}
          className="mt-6 w-full bg-slate-800 hover:bg-slate-700 text-amber-400 font-bold px-5 py-3 rounded-xl transition-all cursor-pointer border border-amber-500/20"
        >
          Perbarui Halaman
        </button>
      </div>
    );
  }

  // MAINTENANCE REDIRECT SCREEN
  if (healthStatus === 'MAINTENANCE') {
    return (
      <div className="fixed inset-0 bg-slate-950 flex flex-col items-center justify-center text-center p-6 text-white z-50 max-w-md mx-auto shadow-2xl">
        <Utensils className="w-16 h-16 text-red-500 mb-4 animate-bounce" />
        <h3 className="font-extrabold text-lg text-slate-100">Sistem Pemeliharaan</h3>
        <p className="text-xs text-slate-400 mt-2 max-w-xs leading-relaxed">
          {healthErrorMessage || 'Menu sementara tidak tersedia.'}
        </p>
        <button 
          onClick={runHealthCheck}
          className="mt-6 w-full bg-amber-500 hover:bg-amber-400 text-slate-950 font-black px-5 py-3 rounded-xl transition-all cursor-pointer"
        >
          Coba Lagi
        </button>
      </div>
    );
  }

  // LOADING SCREEN
  if (healthStatus === 'LOADING') {
    return (
      <div className="fixed inset-0 bg-slate-950 flex flex-col items-center justify-center text-center p-6 text-white z-50 max-w-md mx-auto shadow-2xl">
        <Spinner className="w-12 h-12 text-amber-500 animate-spin mb-4" />
        <h4 className="font-bold text-slate-200 text-sm tracking-wide">{loadingStateMessage}</h4>
        <p className="text-[10px] text-slate-500 mt-1">Menyiapkan portal menu digital terbaik...</p>
      </div>
    );
  }

  // CUSTOMER MODE SCREEN (Rendered nicely for mobile scanner simulation)
  if (isCustomerMode) {
    return (
      <div className="fixed inset-0 bg-slate-50 flex flex-col text-slate-700 overflow-hidden text-xs max-w-md mx-auto shadow-2xl z-50">
        {successOrder ? (
          <div className="flex-1 p-6 flex flex-col items-center justify-center text-center bg-white">
            <CheckCircle className="w-12 h-12 text-green-500 mb-3 animate-bounce" />
            <h3 className="font-extrabold text-sm text-slate-800">Pesanan Terkirim ke Dapur!</h3>
            <p className="text-[10px] text-slate-400 mt-1 max-w-xs leading-relaxed">
              Silakan tunggu di Meja {activeTable}. Koki sedang menyiapkan hidangan hangat Daeng.
            </p>

            <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-100 w-full mt-5 text-left font-mono text-[9px] text-slate-500 space-y-1">
              <div className="flex justify-between font-bold text-slate-700 text-xs pb-1.5 border-b border-dashed border-slate-200">
                <span>No Antrean:</span> <span className="text-amber-600 font-bold">Q-{successOrder.queueNumber}</span>
              </div>
              <div className="flex justify-between pt-1"><span>Total Bayar:</span> <span className="font-bold text-slate-800">Rp {successOrder.total.toLocaleString('id-ID')}</span></div>
              <div>Metode: QRIS Terpadu</div>
              <div>Tgl: {successOrder.createdAt ? new Date(successOrder.createdAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : ''}</div>
            </div>

            <button
              onClick={() => setSuccessOrder(null)}
              className="mt-6 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black px-5 py-2.5 rounded-xl cursor-pointer"
            >
              Pesan Menu Tambahan
            </button>
          </div>
        ) : (
          <div className="flex-1 flex flex-col h-full overflow-hidden">
            <div className="bg-slate-900 text-white p-4.5 flex justify-between items-center shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-amber-500 flex items-center justify-center text-slate-950 font-black text-xs shadow-md shadow-amber-500/15">
                  {storeProfile?.name ? storeProfile.name.split(' ').map((w: string) => w[0]).join('').substring(0, 2).toUpperCase() : 'WD'}
                </div>
                <div>
                  <h4 className="text-[11px] font-black tracking-wide">{storeProfile?.name?.toUpperCase() || 'WARUNG DAENG'}</h4>
                  <p className="text-[9px] text-amber-400 font-extrabold uppercase tracking-wider">Meja {activeTable}</p>
                </div>
              </div>
              <div className="flex items-center gap-1 bg-white/10 px-2 py-0.5 rounded-full text-[8px] font-bold">
                <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                <span>4.8</span>
              </div>
            </div>

            {/* Firebase Auth Anonymous & Real-time Sync connection info bar */}
            <div className="bg-emerald-950/45 border-b border-emerald-900/30 text-emerald-400 px-3 py-1.5 flex justify-between items-center text-[8px] font-semibold tracking-wide shrink-0">
              <div className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping shrink-0" />
                <span>ID Sesi: <span className="font-mono">{currentUser ? `${currentUser.uid.substring(0, 8)}...` : 'Menghubungkan...'}</span></span>
              </div>
              <div className="flex items-center gap-1">
                <span className="bg-emerald-400/10 text-emerald-400 px-1 py-0.5 rounded text-[7px] font-extrabold uppercase tracking-wider border border-emerald-500/10">
                  Firebase Auth
                </span>
                <span className="bg-blue-400/10 text-blue-400 px-1 py-0.5 rounded text-[7px] font-extrabold uppercase tracking-wider border border-blue-500/10">
                  Firestore Live
                </span>
              </div>
            </div>

            <div className="bg-white px-3 py-2.5 border-b border-slate-100 flex gap-2 shrink-0 overflow-x-auto">
              {(['Makanan', 'Minuman'] as const).map(cat => (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  className={`px-3.5 py-1.5 rounded-full text-[10px] font-bold transition-all cursor-pointer ${
                    activeCategory === cat 
                      ? 'bg-amber-500 text-slate-950 shadow-sm shadow-amber-500/10' 
                      : 'bg-slate-50 text-slate-400 hover:text-slate-600'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            <div className="flex-1 overflow-y-auto p-3.5 space-y-2 bg-slate-50/55 animate-fadeIn">
              {menu.filter(m => m.category === activeCategory).map((item) => (
                <div key={item.id} className="bg-white p-3 rounded-xl border border-slate-100/80 flex gap-2.5 justify-between items-center shadow-xs">
                  <div className="flex gap-2.5 items-center overflow-hidden">
                    <img src={item.image} alt={item.name} referrerPolicy="no-referrer" className="w-12 h-12 rounded-lg object-cover bg-slate-50 shrink-0 border border-slate-100" />
                    <div className="overflow-hidden">
                      <h5 className="font-bold text-xs text-slate-800 leading-tight truncate">{item.name}</h5>
                      <span className="text-[11px] font-black text-amber-600 font-mono">Rp {item.price.toLocaleString('id-ID')}</span>
                      {item.stock <= 5 && (
                        <span className="text-[8px] text-red-500 font-bold block mt-0.5">Sisa {item.stock}</span>
                      )}
                    </div>
                  </div>

                  <button
                    onClick={() => addToGuestCart(item)}
                    className="bg-amber-500 hover:bg-amber-400 text-slate-950 p-2 rounded-xl font-bold shrink-0 cursor-pointer shadow-sm shadow-amber-500/10"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>

            {guestCart.length > 0 && (
              <div className="bg-white border-t border-slate-200/60 p-4.5 space-y-3.5 max-h-56 overflow-y-auto shrink-0 shadow-2xl rounded-t-3xl">
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Keranjang Belanja Anda</span>
                
                <div className="space-y-2 max-h-24 overflow-y-auto pr-0.5">
                  {guestCart.map((cartIt, idx) => (
                    <div key={idx} className="flex justify-between items-center text-[11px] font-semibold">
                      <span className="truncate max-w-36 text-slate-700">{cartIt.product.name}</span>
                      
                      <div className="flex items-center gap-2 bg-slate-50 rounded-lg px-2 py-1 border border-slate-150">
                        <button onClick={() => updateGuestQty(idx, -1)} className="text-slate-500 cursor-pointer"><Minus className="w-2.5 h-2.5" /></button>
                        <span className="font-mono font-bold text-slate-800 px-1">{cartIt.quantity}</span>
                        <button onClick={() => updateGuestQty(idx, 1)} className="text-slate-500 cursor-pointer"><Plus className="w-2.5 h-2.5" /></button>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="pt-2.5 border-t border-slate-100 flex justify-between items-center text-xs font-black">
                  <span className="text-slate-500">Subtotal:</span>
                  <span className="text-amber-600 font-mono text-sm">Rp {guestSubtotal.toLocaleString('id-ID')}</span>
                </div>

                <button
                  onClick={handleSelfOrderSubmit}
                  disabled={isSubmitting}
                  className="w-full bg-slate-900 hover:bg-slate-850 text-amber-400 py-3 rounded-xl font-black tracking-wide text-[10px] flex items-center justify-center gap-1.5 cursor-pointer shadow-lg shadow-slate-900/10 disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <Spinner className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Send className="w-3.5 h-3.5" />
                  )}
                  <span>{isSubmitting ? 'MENGIRIM PESANAN...' : 'KIRIM ORDER MANDIRI'}</span>
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  // OPERATOR INTEGRATION INTERFACE (Dashboard view)
  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      
      {/* LEFT: QR Code Generator Card */}
      <div className="lg:col-span-5 bg-white rounded-3xl p-5 border border-slate-100 shadow-sm flex flex-col justify-between space-y-6">
        <div>
          <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
            <QrCode className="w-5 h-5 text-amber-500" />
            Integrasi QR Self Ordering
          </h2>
          <p className="text-xs text-slate-400">Tempelkan QR di meja makan agar pelanggan memesan mandiri</p>

          <div className="mt-5 space-y-3">
            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide block mb-1">Pilih Nomor Meja Aktif</label>
              <select
                value={activeTable}
                onChange={(e) => {
                  setActiveTable(e.target.value);
                  setSuccessOrder(null);
                }}
                className="w-full bg-slate-50 border border-slate-150 rounded-xl px-3 py-2.5 font-bold text-slate-700 text-xs"
              >
                {['1', '2', '3', '4', '5', '6', '7', '8', 'VIP 1', 'VIP 2'].map(t => (
                  <option key={t} value={t}>Meja {t}</option>
                ))}
              </select>
            </div>

            {/* Simulated QR Poster */}
            <div className="bg-slate-50 p-5 rounded-2xl border border-slate-150 flex flex-col items-center text-center">
              <span className="text-[10px] font-extrabold text-amber-600 bg-amber-500/10 px-2.5 py-1 rounded uppercase tracking-wider mb-3">
                Scan Meja {activeTable}
              </span>
              
              <img 
                src={`https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(`https://wdspos.tiarjira.workers.dev/?table=${activeTable}`)}`} 
                alt="QR Code Meja" 
                className="w-40 h-40 border-4 border-white shadow-md rounded-lg"
              />

              <div className="mt-3 space-y-1 w-full">
                <span className="text-[9px] text-slate-400 font-bold block">Tautan QR Meja {activeTable}:</span>
                <a 
                  href={`https://wdspos.tiarjira.workers.dev/?table=${activeTable}`} 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="text-[10px] text-amber-600 hover:text-amber-500 font-black underline break-all block"
                >
                  https://wdspos.tiarjira.workers.dev/?table={activeTable}
                </a>
              </div>

              <p className="text-[9px] text-slate-400 font-medium mt-3 max-w-xs leading-relaxed">
                Pindai barcode di atas menggunakan ponsel, atau klik tautan langsung untuk melakukan simulasi transaksi mandiri.
              </p>
            </div>
          </div>
        </div>

        <div className="bg-amber-500/5 p-3 rounded-2xl border border-amber-200/50 text-[10px] text-slate-500 leading-relaxed font-semibold">
          💡 <span className="text-amber-800 font-bold">POS Terintegrasi:</span> Ketika pelanggan melakukan pemesanan melalui HP simulasi di kanan, pesanan akan secara otomatis tercetak di **KDS (Kitchen)** dan antrean kasir POS secara real-time!
        </div>
      </div>

      {/* RIGHT: Live Interactive Customer Simulator (Smartphone shell) */}
      <div className="lg:col-span-7 flex justify-center">
        <div className="w-[330px] h-[640px] bg-slate-900 rounded-[40px] p-3.5 shadow-2xl border-[6px] border-slate-800 flex flex-col relative overflow-hidden shrink-0">
          
          <div className="absolute top-1 left-1/2 -translate-x-1/2 w-28 h-5 bg-slate-900 rounded-full z-20 flex items-center justify-center">
            <span className="w-1.5 h-1.5 rounded-full bg-slate-700 mr-2" />
            <span className="w-10 h-1 bg-slate-800 rounded-full" />
          </div>

          <div className="bg-slate-50 flex-1 rounded-[28px] overflow-hidden flex flex-col text-slate-700 relative text-xs">
            {successOrder ? (
              <div className="flex-1 p-6 flex flex-col items-center justify-center text-center bg-white">
                <CheckCircle className="w-12 h-12 text-green-500 mb-3 animate-bounce" />
                <h3 className="font-extrabold text-sm text-slate-800">Pesanan Terkirim!</h3>
                <p className="text-[10px] text-slate-400 mt-1 max-w-xs leading-relaxed">
                  Silakan tunggu di Meja {activeTable}. Koki sedang menyiapkan hidangan hangat Daeng.
                </p>

                <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-100 w-full mt-5 text-left font-mono text-[9px] text-slate-500 space-y-1">
                  <div className="flex justify-between font-bold text-slate-700 text-xs pb-1.5 border-b border-dashed border-slate-200">
                    <span>No Antrean:</span> <span className="text-amber-600">Q-{successOrder.queueNumber}</span>
                  </div>
                  <div className="flex justify-between pt-1"><span>Total Bayar:</span> <span className="font-bold text-slate-800">Rp {successOrder.total.toLocaleString('id-ID')}</span></div>
                  <div>Metode: QRIS Terpadu</div>
                  <div>Tgl: {new Date(successOrder.createdAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}</div>
                </div>

                <button
                  onClick={() => setSuccessOrder(null)}
                  className="mt-6 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black px-5 py-2.5 rounded-xl cursor-pointer"
                >
                  Pesan Menu Tambahan
                </button>
              </div>
            ) : (
              <div className="flex-1 flex flex-col h-full overflow-hidden">
                <div className="bg-slate-900 text-white p-3.5 pt-5 flex justify-between items-center shrink-0">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full bg-amber-500 flex items-center justify-center text-slate-950 font-black text-xs">
                      {storeProfile?.name ? storeProfile.name.split(' ').map((w: string) => w[0]).join('').substring(0, 2).toUpperCase() : 'WD'}
                    </div>
                    <div>
                      <h4 className="text-[10px] font-black tracking-wide">{storeProfile?.name?.toUpperCase() || 'WARUNG DAENG'}</h4>
                      <p className="text-[8px] text-amber-400 font-bold uppercase tracking-wider">Meja {activeTable}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 bg-white/10 px-2 py-0.5 rounded-full text-[8px] font-bold">
                    <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                    <span>4.8</span>
                  </div>
                </div>

                <div className="bg-white px-3 py-2 border-b border-slate-100 flex gap-2 shrink-0 overflow-x-auto">
                  {(['Makanan', 'Minuman'] as const).map(cat => (
                    <button
                      key={cat}
                      onClick={() => setActiveCategory(cat)}
                      className={`px-3 py-1.5 rounded-full text-[10px] font-bold transition-all cursor-pointer ${
                        activeCategory === cat 
                          ? 'bg-amber-500 text-slate-950' 
                          : 'bg-slate-50 text-slate-400 hover:text-slate-600'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>

                <div className="flex-1 overflow-y-auto p-3 space-y-2">
                  {menu.filter(m => m.category === activeCategory).map((item) => (
                    <div key={item.id} className="bg-white p-2.5 rounded-xl border border-slate-100 flex gap-2.5 justify-between items-center shadow-2xs">
                      <div className="flex gap-2 items-center overflow-hidden">
                        <img src={item.image} alt={item.name} referrerPolicy="no-referrer" className="w-10 h-10 rounded-lg object-cover bg-slate-50 shrink-0" />
                        <div className="overflow-hidden">
                          <h5 className="font-bold text-[11px] text-slate-800 leading-tight truncate">{item.name}</h5>
                          <span className="text-[10px] font-black text-amber-600 font-mono">Rp {item.price.toLocaleString('id-ID')}</span>
                        </div>
                      </div>

                      <button
                        onClick={() => addToGuestCart(item)}
                        className="bg-amber-500 hover:bg-amber-400 text-slate-950 p-1.5 rounded-lg font-bold shrink-0 cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>

                {guestCart.length > 0 && (
                  <div className="bg-white border-t border-slate-200/80 p-3 space-y-2 max-h-48 overflow-y-auto shrink-0 shadow-xl">
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Keranjang Guest</span>
                    
                    <div className="space-y-1.5 max-h-24 overflow-y-auto pr-0.5">
                      {guestCart.map((cartIt, idx) => (
                        <div key={idx} className="flex justify-between items-center text-[10px] font-semibold">
                          <span className="truncate max-w-32">{cartIt.product.name}</span>
                          
                          <div className="flex items-center gap-1.5 bg-slate-50 rounded px-1.5 py-0.5 border border-slate-100">
                            <button onClick={() => updateGuestQty(idx, -1)} className="text-slate-500 cursor-pointer"><Minus className="w-2.5 h-2.5" /></button>
                            <span className="font-mono font-bold text-slate-800">{cartIt.quantity}</span>
                            <button onClick={() => updateGuestQty(idx, 1)} className="text-slate-500 cursor-pointer"><Plus className="w-2.5 h-2.5" /></button>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="pt-2 border-t border-slate-100 flex justify-between items-center text-xs font-black">
                      <span className="text-slate-500">Subtotal:</span>
                      <span className="text-amber-600 font-mono">Rp {guestSubtotal.toLocaleString('id-ID')}</span>
                    </div>

                    <button
                      onClick={handleSelfOrderSubmit}
                      disabled={isSubmitting}
                      className="w-full bg-slate-900 hover:bg-slate-850 text-amber-400 py-2.5 rounded-xl font-black tracking-wide text-[10px] flex items-center justify-center gap-1 cursor-pointer disabled:opacity-50"
                    >
                      {isSubmitting ? (
                        <Spinner className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Send className="w-3.5 h-3.5" />
                      )}
                      <span>{isSubmitting ? 'MENGIRIM...' : 'KIRIM ORDER MANDIRI'}</span>
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
