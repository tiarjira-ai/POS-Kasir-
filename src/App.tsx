import React, { useState, useEffect } from 'react';
import { 
  LogOut, ShieldAlert, Sparkles, LayoutDashboard, ShoppingCart, 
  UtensilsCrossed, Package, Settings, BarChart2, Users, QrCode, ClipboardList,
  Menu, X, Store, Sliders, ChevronLeft, ChevronRight,
  Download, Smartphone, Monitor, CheckCircle, Wifi, WifiOff
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

// Components
import PINLogin from './components/PINLogin';
import DashboardOwner from './components/DashboardOwner';
import POSKasir from './components/POSKasir';
import KDSView from './components/KDSView';
import GudangInventori from './components/GudangInventori';
import MenuSettings from './components/MenuSettings';
import FinanceReport from './components/FinanceReport';
import CRMLoyalty from './components/CRMLoyalty';
import QRSelfOrder from './components/QRSelfOrder';
import EmployeeManagement from './components/EmployeeManagement';
import OutletManagement from './components/OutletManagement';
import TableManagement from './components/TableManagement';
import BusinessSettings from './components/BusinessSettings';

type UserSession = {
  id: string;
  name: string;
  role: string; // 'Owner' | 'Supervisor' | 'Kasir' | 'Kitchen Staff' | 'Gudang' | 'Admin Cabang'
  token: string;
};

type TabCode = 
  | 'OWNER_DASHBOARD'
  | 'POS_KASIR'
  | 'TABLE_MANAGEMENT'
  | 'KDS'
  | 'INVENTORY'
  | 'MENU_SETTINGS'
  | 'FINANCE_REPORT'
  | 'CRM'
  | 'QR_SELF_ORDER'
  | 'EMPLOYEE'
  | 'OUTLET'
  | 'BUSINESS_SETTINGS';

const DEMO_ROLES = [
  { label: '👑 Owner (Daeng Baji)', role: 'Owner', id: 'emp_1' },
  { label: '💼 Supervisor (Sitti)', role: 'Supervisor', id: 'emp_2' },
  { label: '💵 Kasir (Junaedi)', role: 'Kasir', id: 'emp_3' },
  { label: '🍳 Kitchen Staff (Chef)', role: 'Kitchen Staff', id: 'emp_4' },
  { label: '📦 Gudang (Dullah)', role: 'Gudang', id: 'emp_5' }
];

export default function App() {
  const [session, setSession] = useState<UserSession | null>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('smart_pos_session');
        if (saved) {
          const parsed = JSON.parse(saved);
          if (parsed && parsed.id && parsed.role) {
            return parsed;
          }
        }
      } catch (e) {
        console.error('Error restoring session:', e);
      }
    }
    return null;
  });
  const [activeTab, setActiveTab] = useState<TabCode>('POS_KASIR');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [isCustomerSelfOrder, setIsCustomerSelfOrder] = useState(false);
  const [customerTable, setCustomerTable] = useState<string>('');
  const [isMaintenanceMode, setIsMaintenanceMode] = useState(false);
  const [storeProfile, setStoreProfile] = useState<any>({ name: 'Warung Daeng Soppeng' });
  const [showQuickAccess, setShowQuickAccess] = useState(false);
  const [headerClickCount, setHeaderClickCount] = useState(0);
  const [isOnline, setIsOnline] = useState<boolean>(() => typeof navigator !== 'undefined' ? navigator.onLine : true);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const handleHeaderLogoClick = () => {
    const nextCount = headerClickCount + 1;
    if (nextCount >= 5) {
      setShowQuickAccess(!showQuickAccess);
      setHeaderClickCount(0);
    } else {
      setHeaderClickCount(nextCount);
    }
  };

  // PWA states and listeners
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [showInstallGuide, setShowInstallGuide] = useState(false);
  const [installGuideTab, setInstallGuideTab] = useState<'LAPTOP' | 'ANDROID' | 'IOS'>('LAPTOP');

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const res = await fetch('/api/v1/settings');
        if (res.ok) {
          const data = await res.json();
          if (data && data.storeProfile) {
            setStoreProfile(data.storeProfile);
          }
        }
      } catch (err) {
        console.error('Error fetching settings in App:', err);
      }
    };
    fetchSettings();
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const isStandalone = window.matchMedia('(display-mode: standalone)').matches || (navigator as any).standalone;
      if (isStandalone) {
        setIsInstalled(true);
      }

      const handleBeforeInstallPrompt = (e: Event) => {
        e.preventDefault();
        setDeferredPrompt(e);
      };

      const handleAppInstalled = () => {
        setIsInstalled(true);
        setDeferredPrompt(null);
        console.log('[PWA] Aplikasi berhasil terinstal!');
      };

      window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.addEventListener('appinstalled', handleAppInstalled);

      return () => {
        window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
        window.removeEventListener('appinstalled', handleAppInstalled);
      };
    }
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setDeferredPrompt(null);
        setIsInstalled(true);
      }
    } else {
      setShowInstallGuide(true);
    }
  };

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const checkPathAndParams = () => {
        const params = new URLSearchParams(window.location.search);
        let tableParam = params.get('table');

        const pathParts = window.location.pathname.split('/');
        if (window.location.pathname.startsWith('/t/') && pathParts[2]) {
          tableParam = pathParts[2];
        }

        if (window.location.pathname === '/maintenance') {
          setIsMaintenanceMode(true);
        } else {
          setIsMaintenanceMode(false);
          const isSelfOrder = 
            window.location.pathname === '/self-order' || 
            window.location.pathname === '/order' || 
            window.location.pathname.startsWith('/t/') || 
            !!tableParam;
            
          if (isSelfOrder) {
            setIsCustomerSelfOrder(true);
            setCustomerTable(tableParam || '');
          } else {
            setIsCustomerSelfOrder(false);
          }
        }
      };

      checkPathAndParams();

      // Listen for dynamic popstate / route changes (e.g. from history.pushState)
      window.addEventListener('popstate', checkPathAndParams);
      return () => window.removeEventListener('popstate', checkPathAndParams);
    }
  }, []);

  useEffect(() => {
    // Auto collapse sidebar on smaller screens / tablets (less than 1024px)
    if (typeof window !== 'undefined' && window.innerWidth < 1024) {
      setSidebarCollapsed(true);
    }
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const normalizeRole = (rawRole: string): string => {
    const upper = rawRole.toUpperCase();
    if (upper === 'OWNER') return 'Owner';
    if (upper === 'MANAGER' || upper === 'SUPERVISOR') return 'Supervisor';
    if (upper === 'KASIR' || upper === 'CASHIER') return 'Kasir';
    if (upper === 'DAPUR' || upper === 'KITCHEN' || upper === 'KITCHEN STAFF') return 'Kitchen Staff';
    if (upper === 'GUDANG' || upper === 'INVENTORY' || upper === 'STOCK') return 'Gudang';
    if (upper === 'ADMIN_CABANG' || upper === 'ADMIN CABANG') return 'Admin Cabang';
    return rawRole;
  };

  const handleLoginSuccess = (user: UserSession) => {
    const normalizedUser = {
      ...user,
      role: normalizeRole(user.role)
    };
    setSession(normalizedUser);
    try {
      localStorage.setItem('smart_pos_session', JSON.stringify(normalizedUser));
    } catch (e) {
      console.error('Error persisting session:', e);
    }
    
    // Set logical initial tabs depending on staff role
    if (normalizedUser.role === 'Owner') {
      setActiveTab('OWNER_DASHBOARD');
    } else if (normalizedUser.role === 'Kitchen Staff') {
      setActiveTab('KDS');
    } else if (normalizedUser.role === 'Gudang') {
      setActiveTab('INVENTORY');
    } else {
      setActiveTab('POS_KASIR');
    }
  };

  const handleLogout = () => {
    setSession(null);
    try {
      localStorage.removeItem('smart_pos_session');
    } catch (e) {}
  };

  if (isMaintenanceMode) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center text-white p-6">
        <div className="max-w-md w-full bg-slate-900 border border-slate-800 p-8 rounded-3xl shadow-2xl text-center space-y-6">
          <div className="w-16 h-16 bg-red-500/10 border border-red-500/25 rounded-full flex items-center justify-center mx-auto">
            <ShieldAlert className="w-8 h-8 text-red-500" />
          </div>
          <div className="space-y-2">
            <h1 className="text-xl font-extrabold tracking-tight text-slate-100">Sistem Sedang Pemeliharaan</h1>
            <p className="text-xs text-slate-400 leading-relaxed">
              Koneksi server atau database Smart POS saat ini sedang tidak tersedia. Kami sedang melakukan pemeliharaan berkala untuk meningkatkan kenyamanan bertransaksi Anda.
            </p>
          </div>
          
          <div className="bg-slate-950/60 p-4 rounded-2xl border border-slate-800 text-left space-y-2 text-[10px] font-mono text-slate-400">
            <div className="flex justify-between items-center">
              <span>Firebase Auth:</span> <span className="text-red-400 font-bold">TERPUTUS</span>
            </div>
            <div className="flex justify-between items-center">
              <span>Firestore Server:</span> <span className="text-red-400 font-bold">OFFLINE</span>
            </div>
            <div className="flex justify-between items-center">
              <span>Konfigurasi Outlet:</span> <span className="text-amber-400 font-bold">PEMELIHARAAN</span>
            </div>
          </div>

          <button
            onClick={() => {
              window.location.href = '/self-order?table=5';
            }}
            className="w-full bg-amber-500 hover:bg-amber-400 text-slate-950 font-black py-3 rounded-xl transition-all cursor-pointer shadow-lg shadow-amber-500/10"
          >
            Coba Hubungkan Kembali
          </button>
        </div>
      </div>
    );
  }

  if (isCustomerSelfOrder) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center">
        <QRSelfOrder isCustomerMode={true} tableNum={customerTable} />
      </div>
    );
  }

  // If there is no authenticated session, force them to input their 6-digit credential PIN
  if (!session) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
        <PINLogin onLoginSuccess={handleLoginSuccess} />
      </div>
    );
  }

  // Filter available tabs based on employee role (Role-based Access Control)
  const isAllowed = (tab: TabCode): boolean => {
    const role = session.role;
    if (role === 'Owner') return true; // Owner can see and manage everything
    
    switch (tab) {
      case 'POS_KASIR':
        return ['Kasir', 'Supervisor', 'Admin Cabang'].includes(role);
      case 'TABLE_MANAGEMENT':
        return ['Kasir', 'Supervisor', 'Admin Cabang'].includes(role);
      case 'KDS':
        return ['Kitchen Staff', 'Supervisor'].includes(role);
      case 'INVENTORY':
        return ['Gudang', 'Supervisor', 'Admin Cabang'].includes(role);
      case 'CRM':
        return ['Kasir', 'Supervisor'].includes(role);
      case 'QR_SELF_ORDER':
        return ['Kasir', 'Supervisor'].includes(role);
      case 'MENU_SETTINGS':
        return ['Admin Cabang', 'Supervisor'].includes(role);
      case 'EMPLOYEE':
        return ['Admin Cabang', 'Supervisor'].includes(role);
      case 'OUTLET':
        return ['Admin Cabang', 'Supervisor'].includes(role);
      case 'BUSINESS_SETTINGS':
        return ['Admin Cabang', 'Supervisor'].includes(role);
      case 'OWNER_DASHBOARD':
      case 'FINANCE_REPORT':
        return false; // Strictly restricted to Owner only
      default:
        return false;
    }
  };

  // Sidebar navigation mapping
  const navigationItems = [
    { code: 'OWNER_DASHBOARD', label: 'Dashboard Daeng', icon: LayoutDashboard },
    { code: 'POS_KASIR', label: 'POS Kasir Cepet', icon: ShoppingCart },
    { code: 'TABLE_MANAGEMENT', label: 'Manajemen Meja', icon: UtensilsCrossed },
    { code: 'KDS', label: 'Dapur (KDS)', icon: ClipboardList },
    { code: 'INVENTORY', label: 'Gudang / Stock', icon: Package },
    { code: 'MENU_SETTINGS', label: 'Atur Menu', icon: Settings },
    { code: 'FINANCE_REPORT', label: 'Laporan Keuangan', icon: BarChart2 },
    { code: 'CRM', label: 'Pelanggan CRM', icon: Users },
    { code: 'QR_SELF_ORDER', label: 'QR Self-Order', icon: QrCode },
    { code: 'EMPLOYEE', label: 'Staff Karyawan', icon: ClipboardList },
    { code: 'OUTLET', label: 'Cabang Outlet', icon: Store },
    { code: 'BUSINESS_SETTINGS', label: 'Informasi Usaha', icon: Sliders },
  ] as const;

  const formattedTime = currentTime.toLocaleTimeString('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  });
  
  const formattedDate = currentTime.toLocaleDateString('id-ID', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 flex flex-col font-sans">
      
      {/* Top Header Navigation Panel */}
      <header className="bg-slate-900 border-b border-slate-800 text-white px-4 py-3 md:px-6 md:py-4 flex justify-between items-center shadow-2xl relative z-50">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-3">
            <button
              onClick={handleHeaderLogoClick}
              className="w-9 h-9 md:w-10 md:h-10 rounded-xl bg-emerald-500 flex items-center justify-center text-slate-950 shadow-md shadow-emerald-500/10 shrink-0 hover:opacity-95 active:scale-95 transition-all cursor-default"
              title="Smart POS Enterprise"
            >
              <Sparkles className="w-5 h-5 fill-slate-950 stroke-none" />
            </button>
            <div className="hidden sm:block">
              <span className="text-[9px] md:text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-extrabold px-1.5 py-0.5 rounded uppercase tracking-wider font-mono">Smart POS Enterprise</span>
              <h1 className="text-sm md:text-base font-black tracking-tight leading-none mt-1">{storeProfile?.name?.toUpperCase() || 'WARUNG DAENG SOPPENG'}</h1>
            </div>
          </div>

          {/* Real-time Clock & Network Pill */}
          <div className="hidden sm:flex bg-slate-950/60 border border-slate-800/80 px-3 py-1 md:py-1.5 rounded-xl items-center gap-3 shadow-inner shrink-0">
            <div className="flex items-center gap-2">
              <span className="relative flex h-1.5 w-1.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
              </span>
              <div className="flex flex-col text-left">
                <span className="text-[11px] md:text-xs font-black font-mono tracking-wider text-slate-100 leading-tight">{formattedTime} WITA</span>
                <span className="text-[8px] text-slate-400 font-extrabold uppercase tracking-wider leading-none mt-0.5">{formattedDate}</span>
              </div>
            </div>

            <div className="h-4 w-px bg-slate-800" />

            {/* Offline-first / Connection Status Indicator */}
            <div className="flex items-center gap-1.5 text-[10px] font-bold" title={isOnline ? "Koneksi Aktif - Mode Cepat" : "Koneksi Lambat/Offline - Menggunakan Cache Lokal (Lancar & Ringan)"}>
              {isOnline ? (
                <span className="flex items-center gap-1 text-emerald-400">
                  <Wifi className="w-3 h-3" />
                  <span className="hidden lg:inline font-mono">ONLINE</span>
                </span>
              ) : (
                <span className="flex items-center gap-1 text-amber-400">
                  <WifiOff className="w-3 h-3 animate-pulse" />
                  <span className="font-mono">OFFLINE (CACHE LOKAL)</span>
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Quick Role Switcher for Demo Purposes */}
        <div className="flex items-center gap-1.5 md:gap-2">
          {showQuickAccess && (
            <div className="flex items-center bg-slate-950/80 p-1 md:p-1.5 rounded-xl border border-slate-800/80 animate-in fade-in slide-in-from-top-1 duration-200">
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider pl-1.5 pr-1 hidden lg:inline">Akses Cepat:</span>
              <select
                value={session.role}
                onChange={(e) => {
                  const selectedRole = e.target.value;
                  const found = DEMO_ROLES.find(r => r.role === selectedRole);
                  if (found) {
                    setSession({
                      id: found.id,
                      name: found.label.split(' ')[2].replace('(', '').replace(')', ''), // Daeng, Sitti, Junaedi, Chef, Dullah
                      role: found.role,
                      token: `jwt_token_simulated_${found.id}_${Date.now()}`
                    });
                    // Set active tab accordingly
                    if (found.role === 'Owner') setActiveTab('OWNER_DASHBOARD');
                    else if (found.role === 'Kitchen Staff') setActiveTab('KDS');
                    else if (found.role === 'Gudang') setActiveTab('INVENTORY');
                    else setActiveTab('POS_KASIR');
                  }
                }}
                className="bg-slate-900 text-emerald-400 text-[11px] md:text-xs font-black px-2 py-1 md:py-1.5 rounded-lg border border-slate-800 focus:outline-none focus:border-emerald-500 cursor-pointer"
              >
                {DEMO_ROLES.map((r) => (
                  <option key={r.role} value={r.role}>
                    {r.label}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* User Session card */}
          <div className="text-right hidden sm:block bg-slate-950/30 px-3 py-1.5 rounded-xl border border-slate-800/40">
            <span className="text-xs font-bold text-slate-200 block leading-none">{session.name}</span>
            <span className="text-[9px] text-emerald-400 font-extrabold uppercase mt-0.5 inline-block tracking-wider font-mono">{session.role}</span>
          </div>

          {/* PWA Install Button */}
          <button
            onClick={handleInstallClick}
            className={`flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all border shadow-lg ${
              isInstalled
                ? 'bg-slate-950/40 border-slate-800 text-slate-500 cursor-default'
                : 'bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 border-emerald-500 hover:scale-[1.02] active:scale-[0.98] cursor-pointer shadow-emerald-500/10 animate-pulse'
            }`}
            title={isInstalled ? `Aplikasi ${storeProfile?.name || 'Warung Daeng Soppeng'} Smart POS sudah terpasang` : "Instal Aplikasi POS di Laptop, Tablet, atau HP Anda"}
          >
            {isInstalled ? (
              <>
                <CheckCircle className="w-4 h-4 text-emerald-500" />
                <span className="hidden sm:inline">Terpasang</span>
              </>
            ) : (
              <>
                <Download className="w-4 h-4 text-slate-950" />
                <span>Instal POS</span>
              </>
            )}
          </button>

          <button
            onClick={handleLogout}
            title="Keluar / Kunci Terminal"
            className="p-2 md:p-3 bg-slate-950 hover:bg-slate-800 border border-slate-850 hover:border-slate-700 text-red-400 hover:text-red-300 rounded-xl transition-all cursor-pointer"
          >
            <LogOut className="w-4 h-4 md:w-4.5 md:h-4.5" />
          </button>

          {/* Hamburger trigger for mobile menu */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 bg-slate-950 hover:bg-slate-800 border border-slate-850 hover:border-slate-700 text-slate-300 hover:text-white rounded-xl md:hidden transition-all cursor-pointer"
            aria-label="Toggle Menu"
          >
            {mobileMenuOpen ? <X className="w-4.5 h-4.5" /> : <Menu className="w-4.5 h-4.5" />}
          </button>
        </div>
      </header>

      {/* Mobile Navigation Dropdown Menu */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="md:hidden bg-slate-900 border-b border-slate-800 overflow-hidden shrink-0 shadow-2xl relative z-40"
          >
            <div className="p-4 space-y-1">
              <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest block mb-2 px-2 font-mono">Modul Smart POS</span>
              
              {navigationItems.map((item) => {
                const allowed = isAllowed(item.code);
                const isActive = activeTab === item.code;

                if (!allowed) return null;

                return (
                  <button
                    key={item.code}
                    onClick={() => {
                      setActiveTab(item.code);
                      setMobileMenuOpen(false);
                    }}
                    className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-black transition-all cursor-pointer border ${
                      isActive 
                        ? 'bg-emerald-500 text-slate-950 border-emerald-500 shadow-md font-bold' 
                        : 'text-slate-400 border-transparent hover:bg-slate-800/40 hover:text-slate-200'
                    }`}
                  >
                    <item.icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-slate-950' : 'text-slate-500'}`} />
                    <span>{item.label}</span>
                  </button>
                );
              })}

              {/* Mobile PWA Install trigger */}
              <div className="pt-2 mt-2 border-t border-slate-800/80">
                <button
                  onClick={() => {
                    handleInstallClick();
                    setMobileMenuOpen(false);
                  }}
                  className={`w-full flex items-center justify-center gap-3 px-3.5 py-3 rounded-xl text-xs font-black transition-all cursor-pointer border shadow-lg ${
                    isInstalled
                      ? 'bg-slate-950/40 text-slate-500 border-transparent'
                      : 'bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 border-emerald-500 font-bold'
                  }`}
                >
                  {isInstalled ? (
                    <>
                      <CheckCircle className="w-4 h-4 text-emerald-500" />
                      <span>Aplikasi POS Terpasang</span>
                    </>
                  ) : (
                    <>
                      <Download className="w-4 h-4 text-slate-950 animate-bounce" />
                      <span>Instal di HP / Tablet</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Frame Body: Left Rail Menu & Right Viewport */}
      <div className="flex-1 flex overflow-hidden">
        
        {/* Left Navigation Menu Rail */}
        <nav className={`${sidebarCollapsed ? 'w-20 px-2' : 'w-64 p-4'} bg-slate-900/40 border-r border-slate-800/80 space-y-1.5 hidden md:flex flex-col justify-between overflow-y-auto shrink-0 transition-all duration-300 relative`}>
          
          {/* Floating Collapse Toggle */}
          <button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="absolute top-5 -right-3 w-6 h-6 rounded-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 flex items-center justify-center shadow-lg shadow-emerald-500/20 border border-slate-800 transition-transform cursor-pointer z-50 focus:outline-none"
            title={sidebarCollapsed ? "Buka Sidebar" : "Tutup Sidebar"}
          >
            {sidebarCollapsed ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronLeft className="w-3.5 h-3.5" />}
          </button>

          <div className="space-y-1">
            <span className={`text-[9px] font-bold text-slate-500 uppercase tracking-widest block mb-3 font-mono text-center ${sidebarCollapsed ? 'opacity-0 h-0 overflow-hidden' : 'px-3'}`}>
              Modul Smart POS
            </span>
            
            {navigationItems.map((item) => {
              const allowed = isAllowed(item.code);
              const isActive = activeTab === item.code;

              if (!allowed) return null;

              return (
                <button
                  key={item.code}
                  onClick={() => setActiveTab(item.code)}
                  title={item.label}
                  className={`w-full flex items-center rounded-xl text-xs font-black transition-all cursor-pointer border ${
                    sidebarCollapsed ? 'justify-center p-3' : 'gap-3 px-3.5 py-3'
                  } ${
                    isActive 
                      ? 'bg-emerald-500 text-slate-950 border-emerald-500 shadow-lg shadow-emerald-500/10 font-bold' 
                      : 'text-slate-400 border-transparent hover:bg-slate-800/40 hover:text-slate-200'
                  }`}
                >
                  <item.icon className={`w-4.5 h-4.5 shrink-0 ${isActive ? 'text-slate-950' : 'text-slate-500'}`} />
                  {!sidebarCollapsed && <span className="truncate">{item.label}</span>}
                </button>
              );
            })}
          </div>

          {/* PWA Install Promo Box */}
          <div className={`p-3 bg-slate-950/40 rounded-2xl border border-slate-800/80 flex flex-col gap-2 ${sidebarCollapsed ? 'items-center justify-center p-2' : ''}`}>
            {sidebarCollapsed ? (
              <button
                onClick={handleInstallClick}
                className={`p-2 rounded-xl transition-all cursor-pointer shadow ${
                  isInstalled
                    ? 'bg-slate-900 border border-slate-800 text-slate-500'
                    : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 hover:scale-105 active:scale-95'
                }`}
                title={isInstalled ? "Aplikasi Sudah Terpasang" : "Instal Aplikasi di Laptop / HP"}
              >
                {isInstalled ? <CheckCircle className="w-4 h-4 text-emerald-500" /> : <Download className="w-4 h-4" />}
              </button>
            ) : (
              <>
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 rounded bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0 font-mono text-[9px] font-black">
                    PWA
                  </div>
                  <div className="text-[10px] font-bold text-slate-300 leading-none">
                    {isInstalled ? "Aplikasi Terpasang" : "Aplikasi Belum Diinstal"}
                  </div>
                </div>
                <p className="text-[9px] text-slate-500 font-medium leading-relaxed">
                  Bisa diinstal di laptop, tablet, & HP untuk akses instan langsung dari home screen.
                </p>
                <button
                  onClick={handleInstallClick}
                  className={`w-full flex items-center justify-center gap-1.5 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all border ${
                    isInstalled
                      ? 'bg-slate-950/40 border-slate-850 text-slate-500 cursor-default'
                      : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 border-emerald-500 hover:scale-[1.01] cursor-pointer'
                  }`}
                >
                  {isInstalled ? (
                    <>
                      <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
                      <span>Terpasang</span>
                    </>
                  ) : (
                    <>
                      <Download className="w-3.5 h-3.5" />
                      <span>Instal Sekarang</span>
                    </>
                  )}
                </button>
              </>
            )}
          </div>

          <div className={`p-3 bg-slate-900/20 rounded-xl border border-slate-800/60 flex items-center gap-2 ${sidebarCollapsed ? 'justify-center p-2' : ''}`}>
            <ShieldAlert className="w-4.5 h-4.5 text-slate-500 shrink-0" />
            {!sidebarCollapsed && (
              <div className="text-[9px] text-slate-500 font-semibold leading-relaxed font-mono">
                Terminal terproteksi enkripsi militer RSA-256.
              </div>
            )}
          </div>
        </nav>

        {/* Right Active Viewport */}
        <main className="flex-1 overflow-y-auto p-6">
          <div className="max-w-7xl mx-auto h-full">
            
            {activeTab === 'OWNER_DASHBOARD' && isAllowed('OWNER_DASHBOARD') && <DashboardOwner userSession={session} />}
            {activeTab === 'POS_KASIR' && isAllowed('POS_KASIR') && <POSKasir userSession={session} />}
            {activeTab === 'TABLE_MANAGEMENT' && isAllowed('TABLE_MANAGEMENT') && <TableManagement />}
            {activeTab === 'KDS' && isAllowed('KDS') && <KDSView />}
            {activeTab === 'INVENTORY' && isAllowed('INVENTORY') && <GudangInventori />}
            {activeTab === 'MENU_SETTINGS' && isAllowed('MENU_SETTINGS') && <MenuSettings />}
            {activeTab === 'FINANCE_REPORT' && isAllowed('FINANCE_REPORT') && <FinanceReport />}
            {activeTab === 'CRM' && isAllowed('CRM') && <CRMLoyalty />}
            {activeTab === 'QR_SELF_ORDER' && isAllowed('QR_SELF_ORDER') && <QRSelfOrder />}
            {activeTab === 'EMPLOYEE' && isAllowed('EMPLOYEE') && <EmployeeManagement />}
            {activeTab === 'OUTLET' && isAllowed('OUTLET') && <OutletManagement />}
            {activeTab === 'BUSINESS_SETTINGS' && isAllowed('BUSINESS_SETTINGS') && <BusinessSettings onSettingsSaved={(newProfile) => setStoreProfile(newProfile)} />}

          </div>
        </main>

      </div>

      {/* PWA Installation Guide Modal */}
      <AnimatePresence>
        {showInstallGuide && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md"
          >
            <motion.div
              initial={{ scale: 0.95, y: 15 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 15 }}
              className="max-w-lg w-full bg-slate-900 border border-slate-800/80 rounded-3xl p-6 shadow-2xl space-y-5"
            >
              {/* Modal Header */}
              <div className="flex justify-between items-center border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                    <Download className="w-5 h-5 animate-bounce" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-slate-100 uppercase tracking-wide">Panduan Instalasi POS</h3>
                    <p className="text-[10px] text-slate-400 mt-0.5">{storeProfile?.name || 'Warung Daeng Soppeng'} Smart POS Enterprise</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowInstallGuide(false)}
                  className="p-1.5 hover:bg-slate-800 text-slate-400 hover:text-white rounded-xl transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Device Category Tabs */}
              <div className="grid grid-cols-3 gap-1.5 p-1 bg-slate-950/80 rounded-2xl border border-slate-800/60">
                <button
                  onClick={() => setInstallGuideTab('LAPTOP')}
                  className={`flex flex-col items-center gap-1 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all border ${
                    installGuideTab === 'LAPTOP'
                      ? 'bg-emerald-500 text-slate-950 border-emerald-500 shadow-md font-bold'
                      : 'text-slate-400 border-transparent hover:text-slate-200 hover:bg-slate-900/50'
                  }`}
                >
                  <Monitor className="w-4 h-4" />
                  <span>Laptop / PC</span>
                </button>
                <button
                  onClick={() => setInstallGuideTab('ANDROID')}
                  className={`flex flex-col items-center gap-1 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all border ${
                    installGuideTab === 'ANDROID'
                      ? 'bg-emerald-500 text-slate-950 border-emerald-500 shadow-md font-bold'
                      : 'text-slate-400 border-transparent hover:text-slate-200 hover:bg-slate-900/50'
                  }`}
                >
                  <Smartphone className="w-4 h-4 text-emerald-400" />
                  <span>HP Android</span>
                </button>
                <button
                  onClick={() => setInstallGuideTab('IOS')}
                  className={`flex flex-col items-center gap-1 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all border ${
                    installGuideTab === 'IOS'
                      ? 'bg-emerald-500 text-slate-950 border-emerald-500 shadow-md font-bold'
                      : 'text-slate-400 border-transparent hover:text-slate-200 hover:bg-slate-900/50'
                  }`}
                >
                  <Smartphone className="w-4 h-4 text-amber-400" />
                  <span>iPhone / iPad</span>
                </button>
              </div>

              {/* Tab Contents */}
              <div className="bg-slate-950/60 p-4.5 rounded-2xl border border-slate-800/60 text-xs text-slate-300 space-y-4">
                {installGuideTab === 'LAPTOP' && (
                  <div className="space-y-3.5">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] bg-emerald-500/10 text-emerald-400 font-extrabold px-2 py-0.5 rounded border border-emerald-500/20 uppercase font-mono">Chrome / Edge / Opera</span>
                      <span className="text-[10px] text-slate-500 font-bold font-sans">Direkomendasikan</span>
                    </div>
                    <ol className="space-y-2.5 list-decimal list-inside text-slate-300 font-medium leading-relaxed pl-1 font-sans">
                      <li>
                        Klik tombol <strong className="text-emerald-400">Instal POS</strong> di pojok kanan atas layar atau tombol di sidebar sebelah kiri.
                      </li>
                      <li>
                        Atau, perhatikan bagian kanan <strong className="text-slate-100">Address Bar (kolom URL browser)</strong> Anda. Cari ikon <strong className="text-slate-100">Instal (panah ke bawah dalam lingkaran atau ikon monitor bertanda plus)</strong>.
                      </li>
                      <li>
                        Klik ikon tersebut, kemudian tekan <strong className="text-emerald-400">Instal / Pasang</strong> saat jendela konfirmasi dari browser muncul.
                      </li>
                      <li>
                        Selesai! Aplikasi kini berjalan mandiri tanpa frame browser, memiliki shortcut langsung di Desktop, dan performa loading jauh lebih cepat.
                      </li>
                    </ol>
                  </div>
                )}

                {installGuideTab === 'ANDROID' && (
                  <div className="space-y-3.5">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] bg-emerald-500/10 text-emerald-400 font-extrabold px-2 py-0.5 rounded border border-emerald-500/20 uppercase font-mono">Google Chrome</span>
                      <span className="text-[10px] text-slate-500 font-bold font-sans">Semua Tablet & HP Android</span>
                    </div>
                    <ol className="space-y-2.5 list-decimal list-inside text-slate-300 font-medium leading-relaxed pl-1 font-sans">
                      <li>
                        Jika tombol <strong className="text-emerald-400">Instal</strong> tidak memicu dialog bawaan browser, ketuk <strong className="text-slate-100">ikon tiga titik (⋮)</strong> di pojok kanan atas browser Google Chrome Anda.
                      </li>
                      <li>
                        Cari dan ketuk pilihan <strong className="text-emerald-400">"Instal Aplikasi"</strong> atau <strong className="text-emerald-400">"Tambahkan ke Layar Utama" (Add to Home Screen)</strong>.
                      </li>
                      <li>
                        Sebuah pop-up konfirmasi akan muncul. Tekan <strong className="text-emerald-400">"Instal"</strong>.
                      </li>
                      <li>
                        Sistem Android akan mengunduh paket ringan PWA dan meletakkan ikon pintasan Smart POS langsung di laci aplikasi (App Drawer) dan home screen HP/Tablet Anda.
                      </li>
                    </ol>
                  </div>
                )}

                {installGuideTab === 'IOS' && (
                  <div className="space-y-3.5">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] bg-amber-500/10 text-amber-400 font-extrabold px-2 py-0.5 rounded border border-amber-500/20 uppercase font-mono">Apple Safari</span>
                      <span className="text-[10px] text-slate-500 font-bold font-sans">iPhone / iPad iOS</span>
                    </div>
                    <ol className="space-y-2.5 list-decimal list-inside text-slate-300 font-medium leading-relaxed pl-1 font-sans">
                      <li>
                        Pastikan Anda sedang membuka aplikasi ini menggunakan browser bawaan <strong className="text-slate-100">Safari</strong> di iPhone/iPad Anda.
                      </li>
                      <li>
                        Ketuk tombol <strong className="text-emerald-400">"Bagikan" (ikon Share berbentuk kotak dengan anak panah menunjuk ke atas)</strong> di bagian bawah layar Safari (atau bagian atas pada iPad).
                      </li>
                      <li>
                        Gulir menu ke bawah dan pilih opsi <strong className="text-emerald-400">"Tambahkan ke Layar Utama" (Add to Home Screen)</strong>.
                      </li>
                      <li>
                        Anda bisa mengubah nama pintasan menjadi <strong className="text-slate-100">"WDS POS"</strong>, lalu ketuk tombol <strong className="text-emerald-400">"Tambah" (Add)</strong> di pojok kanan atas layar.
                      </li>
                      <li>
                        Ikon aplikasi siap digunakan langsung dari Home Screen perangkat Apple Anda, mendukung mode layar penuh (standalone) tanpa gangguan navigasi browser.
                      </li>
                    </ol>
                  </div>
                )}
              </div>

              {/* Dialog Footer Actions */}
              <div className="flex gap-2">
                <button
                  onClick={() => setShowInstallGuide(false)}
                  className="flex-1 bg-slate-800 hover:bg-slate-750 text-slate-300 font-bold py-3 rounded-xl transition-all cursor-pointer text-xs"
                >
                  Tutup Panduan
                </button>
                {deferredPrompt && (
                  <button
                    onClick={() => {
                      setShowInstallGuide(false);
                      handleInstallClick();
                    }}
                    className="flex-1 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black py-3 rounded-xl transition-all cursor-pointer text-xs shadow-lg shadow-emerald-500/10"
                  >
                    Instal Langsung
                  </button>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
