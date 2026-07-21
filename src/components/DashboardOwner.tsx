import React, { useState, useEffect, useRef } from 'react';
import { 
  TrendingUp, Users, Package, ShoppingBag, 
  AlertTriangle, Store, Brain, Send, Loader2, 
  Sparkles, ShieldCheck, Landmark, DollarSign, Percent 
} from 'lucide-react';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, 
  Tooltip, ResponsiveContainer, BarChart, Bar, 
  Cell, Legend 
} from 'recharts';

interface DashboardOwnerProps {
  userSession: { id: string; name: string; role: string; token: string };
}

export default function DashboardOwner({ userSession }: DashboardOwnerProps) {
  // POS & Business state
  const [salesData, setSalesData] = useState<any>({ totalRevenue: 0, totalOrders: 0, dailySales: [], topProducts: [] });
  const [profitData, setProfitData] = useState<any>({ revenue: 0, grossProfit: 0, netProfit: 0, cogs: 0, foodCostPercent: 35 });
  const [inventory, setInventory] = useState<any[]>([]);
  const [outlets, setOutlets] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // AI Chat State
  const [aiQuery, setAiQuery] = useState('');
  const [aiResponse, setAiResponse] = useState('');
  const [chatHistory, setChatHistory] = useState<{ sender: 'user' | 'ai'; text: string }[]>([
    { sender: 'ai', text: 'Halo Daeng! Saya Daeng AI, asisten bisnis pintar Anda. Tanyakan saya tentang performa menu kuliner, kondisi stok kritis, rekomendasi promo bundling, atau analisa profit!' }
  ]);
  const [aiLoading, setAiLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatHistory, aiLoading]);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const [salesRes, profitRes, invRes, outletsRes, empRes] = await Promise.all([
        fetch('/api/v1/reports/sales'),
        fetch('/api/v1/reports/profit'),
        fetch('/api/v1/inventory'),
        fetch('/api/v1/outlets'),
        fetch('/api/v1/employees')
      ]);

      const sales = await salesRes.json();
      const profit = await profitRes.json();
      const invData = await invRes.json();
      const outlets = await outletsRes.json();
      const empData = await empRes.json();

      setSalesData(sales);
      setProfitData(profit);
      setInventory(invData.inventory || []);
      setOutlets(outlets);
      setEmployees(empData.employees || []);
    } catch (err) {
      console.error('Error fetching dashboard metrics:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSendAiMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!aiQuery.trim()) return;

    const userMsg = aiQuery;
    setChatHistory(prev => [...prev, { sender: 'user', text: userMsg }]);
    setAiQuery('');
    setAiLoading(true);

    try {
      const res = await fetch('/api/v1/owner/ai-assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: userMsg }),
      });
      const data = await res.json();
      if (res.ok) {
        setChatHistory(prev => [...prev, { sender: 'ai', text: data.answer }]);
      } else {
        setChatHistory(prev => [...prev, { sender: 'ai', text: 'Maaf Daeng, saya sedang kendala memproses data tersebut. Coba sapa kembali.' }]);
      }
    } catch (err) {
      setChatHistory(prev => [...prev, { sender: 'ai', text: 'Maaf Daeng, koneksi asisten AI terputus. Silakan coba lagi.' }]);
    } finally {
      setAiLoading(false);
    }
  };

  // Filter low stock
  const criticalStockItems = inventory.filter(item => item.stock <= item.minStock);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <Loader2 className="w-10 h-10 animate-spin text-emerald-500" />
        <p className="mt-4 text-slate-400 font-medium font-mono text-sm">Memuat Analitik Owner...</p>
      </div>
    );
  }

  // Calculate stats
  const avgOrderValue = salesData.totalOrders > 0 ? Math.round(salesData.totalRevenue / salesData.totalOrders) : 0;

  return (
    <div className="space-y-6">
      {/* Header Welcome Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 text-white shadow-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="bg-emerald-500/10 text-emerald-400 text-xs font-bold px-2.5 py-1 rounded-full uppercase tracking-wider flex items-center gap-1 border border-emerald-500/20 font-mono">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              Mode Owner Enterprise
            </span>
          </div>
          <h1 className="text-2xl font-black tracking-tight text-white">Selamat Datang, {userSession.name}!</h1>
          <p className="text-slate-400 text-sm mt-1 max-w-xl font-medium leading-relaxed">
            Semua metrik operasional cabang dan konsolidasi finansial usaha Anda termonitor real-time di bawah.
          </p>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={fetchDashboardData}
            className="bg-slate-950 hover:bg-slate-800 text-slate-200 font-bold text-xs px-4 py-2.5 rounded-xl border border-slate-800 transition-all cursor-pointer shadow-sm"
          >
            Refresh Analitik
          </button>
        </div>
      </div>

      {/* KPI Overview Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {/* Total Revenue */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4.5 shadow-sm flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">Omzet</span>
            <div className="p-1.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/25 rounded-lg"><DollarSign className="w-4 h-4" /></div>
          </div>
          <div className="mt-4">
            <h3 className="text-base font-black text-white">Rp {salesData.totalRevenue.toLocaleString('id-ID')}</h3>
            <span className="text-[10px] text-emerald-400 font-semibold flex items-center gap-0.5 mt-0.5 font-mono">
              <TrendingUp className="w-3 h-3" /> +14.2% pekan ini
            </span>
          </div>
        </div>

        {/* Gross Profit */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4.5 shadow-sm flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">Laba Kotor</span>
            <div className="p-1.5 bg-blue-500/10 text-blue-400 border border-blue-500/25 rounded-lg"><Landmark className="w-4 h-4" /></div>
          </div>
          <div className="mt-4">
            <h3 className="text-base font-black text-white">Rp {profitData.grossProfit.toLocaleString('id-ID')}</h3>
            <span className="text-[10px] text-slate-400 font-medium font-mono">Margin ~65%</span>
          </div>
        </div>

        {/* Net Profit */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4.5 shadow-sm flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">Laba Bersih</span>
            <div className="p-1.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/25 rounded-lg"><TrendingUp className="w-4 h-4" /></div>
          </div>
          <div className="mt-4">
            <h3 className="text-base font-black text-white">Rp {profitData.netProfit.toLocaleString('id-ID')}</h3>
            <span className="text-[10px] text-emerald-400 font-semibold mt-0.5 font-mono">Setelah Gaji & Ops</span>
          </div>
        </div>

        {/* Average Order Value */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4.5 shadow-sm flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">Rerata Struk</span>
            <div className="p-1.5 bg-purple-500/10 text-purple-400 border border-purple-500/25 rounded-lg"><ShoppingBag className="w-4 h-4" /></div>
          </div>
          <div className="mt-4">
            <h3 className="text-base font-black text-white">Rp {avgOrderValue.toLocaleString('id-ID')}</h3>
            <span className="text-[10px] text-slate-400 font-medium font-mono">{salesData.totalOrders} Transaksi</span>
          </div>
        </div>

        {/* Food Cost % */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4.5 shadow-sm flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">Food Cost %</span>
            <div className="p-1.5 bg-rose-500/10 text-rose-400 border border-rose-500/25 rounded-lg"><Percent className="w-4 h-4" /></div>
          </div>
          <div className="mt-4">
            <h3 className="text-base font-black text-white">{profitData.foodCostPercent}%</h3>
            <span className="text-[10px] text-emerald-400 font-semibold mt-0.5 font-mono">Sangat Sehat (&lt;40%)</span>
          </div>
        </div>

        {/* Repeat Customer Rate */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4.5 shadow-sm flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">Repeat Rate</span>
            <div className="p-1.5 bg-teal-500/10 text-teal-400 border border-teal-500/25 rounded-lg"><Users className="w-4 h-4" /></div>
          </div>
          <div className="mt-4">
            <h3 className="text-base font-black text-white">42.5%</h3>
            <span className="text-[10px] text-teal-400 font-semibold mt-0.5 font-mono">Efek Loyalitas CRM</span>
          </div>
        </div>
      </div>

      {/* Main Insights Area: Charts & Daeng AI Assistant */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Charts & Graphs Panel */}
        <div className="lg:col-span-8 space-y-6">
          
          {/* Sales History Area Chart */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm">
            <div className="flex justify-between items-center mb-4">
              <div>
                <h2 className="text-sm font-bold text-white uppercase tracking-wider font-mono">Volume Omzet 7 Hari Terakhir</h2>
                <p className="text-xs text-slate-400">Total penjualan gabungan outlet utama & cabang</p>
              </div>
              <span className="text-xs bg-slate-950 text-emerald-400 border border-slate-800 font-bold px-2.5 py-1 rounded font-mono">Daily Sales</span>
            </div>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={salesData.dailySales} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.2}/>
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1e293b" />
                  <XAxis 
                    dataKey="date" 
                    tickFormatter={(str) => {
                      const d = new Date(str);
                      return d.toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric' });
                    }} 
                    tickLine={false}
                    axisLine={false}
                    style={{ fontSize: 10, fill: '#94a3b8' }}
                  />
                  <YAxis 
                    tickFormatter={(val) => `Rp ${val / 1000}k`}
                    tickLine={false}
                    axisLine={false}
                    style={{ fontSize: 10, fill: '#94a3b8' }}
                  />
                  <Tooltip 
                    formatter={(val: any) => [`Rp ${(val ?? 0).toLocaleString('id-ID')}`, 'Omzet']}
                    labelFormatter={(label) => `Tanggal: ${new Date(label).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}`}
                    contentStyle={{ backgroundColor: '#0f172a', borderRadius: 12, border: '1px solid #334155', color: '#e2e8f0' }}
                  />
                  <Area type="monotone" dataKey="amount" stroke="#10b981" strokeWidth={2.5} fillOpacity={1} fill="url(#colorSales)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Top Products Bar Chart */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm">
              <h2 className="text-sm font-bold text-white mb-3 uppercase tracking-wider font-mono">5 Produk Kuliner Terlaris</h2>
              <div className="h-48 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={salesData.topProducts} layout="vertical" margin={{ top: 5, right: 10, left: 30, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#1e293b" />
                    <XAxis type="number" tickLine={false} axisLine={false} style={{ fontSize: 10, fill: '#94a3b8' }} />
                    <YAxis dataKey="name" type="category" tickLine={false} axisLine={false} style={{ fontSize: 10, fill: '#cbd5e1', fontWeight: 600 }} />
                    <Tooltip 
                      formatter={(val) => [`${val} Pcs`, 'Kuantitas']}
                      contentStyle={{ backgroundColor: '#0f172a', borderRadius: 10, border: '1px solid #334155', color: '#e2e8f0' }}
                    />
                    <Bar dataKey="quantity" fill="#10b981" radius={[0, 8, 8, 0]}>
                      {(salesData?.topProducts || []).map((entry: any, index: number) => (
                        <Cell key={`cell-${index}`} fill={index === 0 ? '#047857' : index === 1 ? '#059669' : '#10b981'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Outlets Summary & Low Stock Warnings */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm flex flex-col justify-between">
              <div>
                <div className="flex justify-between items-center mb-3">
                  <h2 className="text-sm font-bold text-white uppercase tracking-wider font-mono">Status Stok Kritis Gudang</h2>
                  <span className="bg-red-500/10 border border-red-500/20 text-red-400 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 font-mono">
                    <AlertTriangle className="w-3 h-3" />
                    {criticalStockItems.length} Produk
                  </span>
                </div>
                
                {criticalStockItems.length === 0 ? (
                  <p className="text-xs text-slate-400 italic py-4">Semua stok bahan baku dan menu aman aman saja.</p>
                ) : (
                  <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                    {criticalStockItems.map((item, idx) => (
                      <div key={idx} className="flex justify-between items-center p-2.5 bg-red-950/20 hover:bg-red-900/10 rounded-xl border border-red-900/20 transition-colors">
                        <div>
                          <p className="text-xs font-bold text-slate-200">{item.name}</p>
                          <p className="text-[10px] text-slate-400 font-mono">Min stok: {item.minStock} {item.unit}</p>
                        </div>
                        <div className="text-right">
                          <span className="text-xs font-bold text-red-400 font-mono">{item.stock}</span>
                          <span className="text-[10px] text-slate-500 ml-1 font-mono">{item.unit}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="pt-4 border-t border-slate-800 mt-4 flex items-center justify-between text-xs text-slate-400 font-semibold font-mono">
                <div className="flex items-center gap-1"><Store className="w-4 h-4 text-emerald-400" /> <span>{outlets.length} Outlet Aktif</span></div>
                <div className="flex items-center gap-1"><Users className="w-4 h-4 text-emerald-400" /> <span>{employees.length} Karyawan</span></div>
              </div>
            </div>

          </div>
        </div>

        {/* Daeng AI Panel (Occupying 4 columns) */}
        <div className="lg:col-span-4 bg-slate-900 rounded-2xl border border-slate-800 shadow-xl overflow-hidden flex flex-col h-[520px]">
          
          {/* Chat Header */}
          <div className="p-4 bg-slate-900 border-b border-slate-850 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-emerald-500 rounded-xl text-slate-950 shadow-lg shadow-emerald-500/20">
                <Brain className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-xs font-bold text-white flex items-center gap-1.5 font-mono">
                  Daeng AI Advisor 
                  <span className="bg-emerald-500/10 text-emerald-400 text-[9px] px-1.5 py-0.5 rounded font-extrabold uppercase tracking-widest border border-emerald-500/20">
                    Active
                  </span>
                </h3>
                <p className="text-[10px] text-slate-400">Asisten Bisnis Pintar (Gemini AI)</p>
              </div>
            </div>
            <Sparkles className="w-4 h-4 text-emerald-400 animate-pulse" />
          </div>

          {/* Conversation History Area */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3.5 bg-slate-950/60">
            {chatHistory.map((chat, idx) => (
              <div 
                key={idx} 
                className={`flex flex-col max-w-[85%] ${chat.sender === 'user' ? 'ml-auto items-end' : 'mr-auto items-start'}`}
              >
                <div 
                  className={`p-3 rounded-2xl text-xs leading-relaxed ${
                    chat.sender === 'user' 
                      ? 'bg-emerald-500 text-slate-950 font-bold rounded-tr-none' 
                      : 'bg-slate-800 text-slate-200 rounded-tl-none border border-slate-750/30'
                  }`}
                >
                  {chat.text.split('\n').map((paragraph, pIdx) => (
                    <p key={pIdx} className={pIdx > 0 ? 'mt-2' : ''}>
                      {paragraph}
                    </p>
                  ))}
                </div>
                <span className="text-[9px] text-slate-500 mt-1 font-mono">
                  {chat.sender === 'user' ? 'Owner' : 'Daeng AI'}
                </span>
              </div>
            ))}
            {aiLoading && (
              <div className="flex items-center gap-2 mr-auto bg-slate-800 text-slate-400 p-3 rounded-2xl rounded-tl-none border border-slate-750/30 max-w-[80%] text-xs">
                <Loader2 className="w-4 h-4 animate-spin text-emerald-500" />
                <span className="font-mono">Daeng AI sedang berpikir...</span>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          {/* Chat Quick Queries */}
          <div className="px-3.5 py-2 bg-slate-950/90 border-t border-slate-850 flex flex-wrap gap-1.5">
            <button 
              onClick={() => { setAiQuery('Berikan rekomendasi strategi penjualan Daeng AI!'); }}
              className="text-[10px] font-semibold bg-slate-900 hover:bg-slate-850 text-emerald-400 px-2.5 py-1 rounded-lg border border-slate-800 cursor-pointer font-mono"
            >
              💡 Analisa Promo Bundling
            </button>
            <button 
              onClick={() => { setAiQuery('Ada stok kritis apa saja di gudang kita hari ini?'); }}
              className="text-[10px] font-semibold bg-slate-900 hover:bg-slate-850 text-emerald-400 px-2.5 py-1 rounded-lg border border-slate-800 cursor-pointer font-mono"
            >
              📦 Cek Stok Kritis Gudang
            </button>
          </div>

          {/* Chat Form */}
          <form onSubmit={handleSendAiMessage} className="p-3 bg-slate-950 border-t border-slate-850 flex gap-2">
            <input 
              type="text" 
              value={aiQuery}
              onChange={(e) => setAiQuery(e.target.value)}
              disabled={aiLoading}
              placeholder="Tanya Daeng AI (contoh: 'rekomendasi', 'stok')..."
              className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
            <button 
              type="submit"
              disabled={aiLoading || !aiQuery.trim()}
              className="p-2.5 bg-emerald-500 text-slate-950 hover:bg-emerald-400 rounded-xl transition-all disabled:opacity-50 flex items-center justify-center shrink-0 cursor-pointer"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>

        </div>

      </div>

    </div>
  );
}
