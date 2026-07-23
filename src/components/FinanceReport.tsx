import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { 
  FileText, Download, Landmark, Percent, Calendar as CalendarIcon, 
  RefreshCw, TrendingUp, TrendingDown, DollarSign, ArrowUpDown,
  RotateCcw, Plus, Trash2, Edit, X, Coins, CheckCircle, Save
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, PieChart, Pie, Cell } from 'recharts';

export default function FinanceReport() {
  const [sales, setSales] = useState<any>(null);
  const [profit, setProfit] = useState<any>(null);
  const [cashflow, setCashflow] = useState<any>(null);
  const [orders, setOrders] = useState<any[]>([]);
  const [purchaseOrders, setPurchaseOrders] = useState<any[]>([]);
  const [payrolls, setPayrolls] = useState<any[]>([]);
  const [expenses, setExpenses] = useState<any[]>([]);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeSubTab, setActiveSubTab] = useState<'KALENDER' | 'LABARUGI' | 'CASHFLOW' | 'PENGELUARAN'>('KALENDER');
  const [storeProfile, setStoreProfile] = useState<any>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('smart_pos_store_profile');
        if (saved) return JSON.parse(saved);
      } catch (_) {}
    }
    return { name: 'Warung Daeng Soppeng' };
  });

  useEffect(() => {
    const fetchStoreProfile = async () => {
      try {
        const res = await fetch('/api/v1/settings');
        if (res.ok) {
          const data = await res.json();
          if (data && data.storeProfile) {
            setStoreProfile(data.storeProfile);
            try {
              localStorage.setItem('smart_pos_store_profile', JSON.stringify(data.storeProfile));
            } catch (_) {}
          }
        }
      } catch (err) {
        console.error('Error fetching settings in FinanceReport:', err);
      }
    };
    fetchStoreProfile();
  }, []);

  // Expense management form and sub-tab state
  const [expenseForm, setExpenseForm] = useState({
    category: 'Operasional',
    amount: '',
    date: new Date().toISOString().split('T')[0],
    description: '',
    outletId: 'out_1',
    recordedBy: 'Owner'
  });

  const [editingExpense, setEditingExpense] = useState<any | null>(null);
  const [submittingExpense, setSubmittingExpense] = useState(false);

  const handleAddExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!expenseForm.amount || Number(expenseForm.amount) <= 0) {
      alert('Masukkan jumlah pengeluaran yang valid');
      return;
    }
    setSubmittingExpense(true);
    try {
      const response = await fetch('/api/v1/expenses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...expenseForm,
          amount: Number(expenseForm.amount)
        })
      });
      if (response.ok) {
        setExpenseForm({
          category: 'Operasional',
          amount: '',
          date: new Date().toISOString().split('T')[0],
          description: '',
          outletId: 'out_1',
          recordedBy: 'Owner'
        });
        await fetchFinancialData();
      } else {
        const err = await response.json();
        alert(`Gagal menambah pengeluaran: ${err.error || 'error'}`);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSubmittingExpense(false);
    }
  };

  const handleUpdateExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingExpense.amount || Number(editingExpense.amount) <= 0) {
      alert('Masukkan jumlah pengeluaran yang valid');
      return;
    }
    setSubmittingExpense(true);
    try {
      const response = await fetch(`/api/v1/expenses/${editingExpense.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...editingExpense,
          amount: Number(editingExpense.amount)
        })
      });
      if (response.ok) {
        setEditingExpense(null);
        await fetchFinancialData();
      } else {
        const err = await response.json();
        alert(`Gagal mengubah pengeluaran: ${err.error || 'error'}`);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSubmittingExpense(false);
    }
  };

  const handleDeleteExpense = async (id: string) => {
    if (!confirm('Apakah Anda yakin ingin menghapus pengeluaran ini?')) return;
    try {
      const response = await fetch(`/api/v1/expenses/${id}`, {
        method: 'DELETE'
      });
      if (response.ok) {
        await fetchFinancialData();
      } else {
        const err = await response.json();
        alert(`Gagal menghapus pengeluaran: ${err.error || 'error'}`);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Calendar State
  const [currentYear, setCurrentYear] = useState(2026);
  const [currentMonth, setCurrentMonth] = useState(6); // 0-indexed, so 6 is July

  // Date Filtering states
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [datePreset, setDatePreset] = useState<string>('ALL'); // 'ALL' | 'TODAY' | 'WEEK' | 'MONTH' | 'CUSTOM'

  useEffect(() => {
    fetchFinancialData();
  }, []);

  const fetchFinancialData = async () => {
    setLoading(true);
    try {
      const [salesRes, profitRes, cashRes, ordersRes, poRes, payrollRes, expensesRes] = await Promise.all([
        fetch('/api/v1/reports/sales'),
        fetch('/api/v1/reports/profit'),
        fetch('/api/v1/reports/cashflow'),
        fetch('/api/v1/orders'),
        fetch('/api/v1/purchaseOrders'),
        fetch('/api/v1/payrolls'),
        fetch('/api/v1/expenses').catch(() => new Response('[]'))
      ]);

      const salesData = await salesRes.json();
      const profitData = await profitRes.json();
      const cashData = await cashRes.json();
      const ordersData = await ordersRes.json();
      const poData = await poRes.json().catch(() => []);
      const payrollData = await payrollRes.json().catch(() => []);
      const expensesData = await expensesRes.json().catch(() => []);

      setSales(salesData);
      setProfit(profitData);
      setCashflow(cashData);
      setOrders(ordersData || []);
      setPurchaseOrders(poData || []);
      setPayrolls(payrollData || []);
      setExpenses(expensesData || []);
    } catch (err) {
      console.error('Error fetching financial reports:', err);
    } finally {
      setLoading(false);
    }
  };

  const getTodayStr = () => {
    return new Date().toISOString().split('T')[0];
  };

  // Compute all metrics dynamically based on active filters
  const getFilteredData = () => {
    let finalStartDate = startDate;
    let finalEndDate = endDate;

    if (datePreset === 'TODAY') {
      finalStartDate = getTodayStr();
      finalEndDate = getTodayStr();
    } else if (datePreset === 'WEEK') {
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      finalStartDate = sevenDaysAgo.toISOString().split('T')[0];
      finalEndDate = getTodayStr();
    } else if (datePreset === 'MONTH') {
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      finalStartDate = startOfMonth.toISOString().split('T')[0];
      finalEndDate = getTodayStr();
    }

    // Filter non-void orders
    const filteredOrders = orders.filter((o: any) => {
      if (o.status === 'VOID') return false;
      const orderDate = o.createdAt ? o.createdAt.split('T')[0] : '';
      if (finalStartDate && orderDate < finalStartDate) return false;
      if (finalEndDate && orderDate > finalEndDate) return false;
      return true;
    });

    // Filter purchase orders
    const filteredPOs = purchaseOrders.filter((p: any) => {
      if (p.status !== 'RECEIVED') return false;
      const poDate = p.createdAt ? p.createdAt.split('T')[0] : '';
      if (finalStartDate && poDate < finalStartDate) return false;
      if (finalEndDate && poDate > finalEndDate) return false;
      return true;
    });

    // Filter payrolls
    const filteredPayrollsList = payrolls.filter((p: any) => {
      const payDate = p.paidAt ? p.paidAt.split('T')[0] : '';
      if (finalStartDate && payDate < finalStartDate) return false;
      if (finalEndDate && payDate > finalEndDate) return false;
      return true;
    });

    // Filter custom expenses
    const filteredExpenses = expenses.filter((e: any) => {
      const expDate = e.date ? e.date.split('T')[0] : '';
      if (finalStartDate && expDate < finalStartDate) return false;
      if (finalEndDate && expDate > finalEndDate) return false;
      return true;
    });

    // Compute range days
    let daysCount = 30;
    if (finalStartDate && finalEndDate) {
      const startMs = new Date(finalStartDate).getTime();
      const endMs = new Date(finalEndDate).getTime();
      const diffTime = Math.abs(endMs - startMs);
      daysCount = Math.max(1, Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1);
    }

    const computedRevenue = filteredOrders.reduce((sum: number, o: any) => sum + (o.total || 0), 0);
    const computedCogs = Math.floor(computedRevenue * 0.35);
    const computedGrossProfit = computedRevenue - computedCogs;

    const baseSalariesTotal = profit?.salaries ?? 7200000;
    const payrollPaid = filteredPayrollsList.reduce((sum: number, p: any) => sum + (p.totalPaid || 0), 0);
    const computedSalaries = payrollPaid > 0 ? payrollPaid : Math.floor((baseSalariesTotal / 7) * daysCount);

    const baseRentTotal = profit?.rentAndUtilities ?? 3500000;
    const computedRentAndUtilities = Math.floor((baseRentTotal / 30) * daysCount);

    const totalCustomExpenses = filteredExpenses.reduce((sum: number, e: any) => sum + (Number(e.amount) || 0), 0);
    const computedNetProfit = computedGrossProfit - computedSalaries - computedRentAndUtilities - totalCustomExpenses;

    // Volume calculation
    const itemVolumeMap: { [key: string]: { name: string; quantity: number; revenue: number } } = {};
    filteredOrders.forEach((o: any) => {
      if (o.items && Array.isArray(o.items)) {
        o.items.forEach((it: any) => {
          if (it.productId) {
            if (!itemVolumeMap[it.productId]) {
              itemVolumeMap[it.productId] = { name: it.name || 'Produk', quantity: 0, revenue: 0 };
            }
            itemVolumeMap[it.productId].quantity += (it.quantity || 0);
            itemVolumeMap[it.productId].revenue += ((it.price || 0) * (it.quantity || 0));
          }
        });
      }
    });
    const sortedVolumeList = Object.values(itemVolumeMap).sort((a: any, b: any) => b.quantity - a.quantity);

    // Cashflow Calculation
    const totalCashIn = computedRevenue;
    const totalCashOutPO = filteredPOs.reduce((sum: number, p: any) => sum + (p.total || 0), 0);
    const totalCashOutSalary = payrollPaid;
    
    const fallbackPOOutflow = Math.floor(computedRevenue * 0.15);
    const fallbackSalaryOutflow = Math.floor(computedSalaries * 0.8);
    
    const totalCashOut = (totalCashOutPO + totalCashOutSalary + totalCustomExpenses) > 0 
      ? (totalCashOutPO + totalCashOutSalary + totalCustomExpenses)
      : (fallbackPOOutflow + fallbackSalaryOutflow + totalCustomExpenses);

    const netCashFlow = totalCashIn - totalCashOut;

    return {
      orders: filteredOrders,
      purchaseOrders: filteredPOs,
      payrolls: filteredPayrollsList,
      expenses: filteredExpenses,
      revenue: computedRevenue,
      cogs: computedCogs,
      grossProfit: computedGrossProfit,
      salaries: computedSalaries,
      rentAndUtilities: computedRentAndUtilities,
      customExpenses: totalCustomExpenses,
      netProfit: computedNetProfit,
      allProductsVolume: sortedVolumeList,
      cashflow: {
        totalCashIn,
        totalCashOut,
        netCashFlow,
        breakdown: [
          { name: 'Penjualan POS', amount: totalCashIn, type: 'IN' },
          { name: 'Belanja Gudang (PO)', amount: totalCashOutPO || fallbackPOOutflow, type: 'OUT' },
          { name: 'Gaji Karyawan', amount: totalCashOutSalary || fallbackSalaryOutflow, type: 'OUT' },
          { name: 'Pengeluaran Lainnya', amount: totalCustomExpenses, type: 'OUT' },
        ]
      },
      startDate: finalStartDate,
      endDate: finalEndDate,
      daysCount
    };
  };

  const data = getFilteredData();

  // Dynamic daily sales computed from orders for the calendar
  const computedDailySales: { date: string; amount: number }[] = [];
  const dailyMap: { [key: string]: number } = {};
  orders.forEach((o: any) => {
    if (o.status !== 'VOID') {
      const date = o.createdAt ? o.createdAt.split('T')[0] : '';
      if (date) {
        dailyMap[date] = (dailyMap[date] || 0) + (o.total || 0);
      }
    }
  });
  Object.entries(dailyMap).forEach(([date, amount]) => {
    computedDailySales.push({ date, amount });
  });

  const handleExport = (format: 'PDF' | 'EXCEL') => {
    if (format === 'EXCEL') {
      // Create simple CSV download for Excel
      let csvContent = "data:text/csv;charset=utf-8,";
      csvContent += `LAPORAN KEUANGAN ${storeProfile?.name?.toUpperCase() || 'WARUNG DAENG SOPPENG'}\r\n`;
      csvContent += `Periode: ${data.startDate && data.endDate ? `${data.startDate} s.d. ${data.endDate}` : 'Semua Waktu'}\r\n\r\n`;
      
      csvContent += "LABA RUGI (P&L)\r\n";
      csvContent += `Total Pendapatan (Omzet);Rp ${data.revenue}\r\n`;
      csvContent += `Beban Pokok Penjualan (COGS);-Rp ${data.cogs}\r\n`;
      csvContent += `Laba Kotor;Rp ${data.grossProfit}\r\n`;
      csvContent += `Gaji Karyawan;-Rp ${data.salaries}\r\n`;
      csvContent += `Sewa & Utilitas;-Rp ${data.rentAndUtilities}\r\n`;
      csvContent += `Laba Bersih;Rp ${data.netProfit}\r\n\r\n`;

      csvContent += "KINERJA VOLUME MENU\r\n";
      csvContent += "Nama Menu;Volume Terjual (Tusuk/Pcs);Pendapatan\r\n";
      data.allProductsVolume.forEach((item: any) => {
        csvContent += `${item.name};${item.quantity};Rp ${item.revenue}\r\n`;
      });

      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", `Laporan_Keuangan_Terupdate.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      return;
    }

    // Trigger standard native print flow styled completely by @media print rules
    window.print();
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 bg-[#0F172A]/70 backdrop-blur-md rounded-3xl border border-slate-800">
        <RefreshCw className="w-8 h-8 animate-spin text-emerald-500" />
        <p className="text-xs text-slate-400 font-semibold mt-3">Mengompilasi Laporan Keuangan...</p>
      </div>
    );
  }

  // Monthly Calendar Builder based on currentYear & currentMonth
  const buildCalendarDays = () => {
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    const startOffset = new Date(currentYear, currentMonth, 1).getDay();
    let cells = [];

    // Empty offset cells
    for (let i = 0; i < startOffset; i++) {
      cells.push({ day: null, sales: 0, dateStr: '' });
    }

    // Days with sales calculation
    for (let d = 1; d <= daysInMonth; d++) {
      const dayStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const dailyRecord = computedDailySales.find((item: any) => item.date === dayStr);
      cells.push({
        day: d,
        sales: dailyRecord ? dailyRecord.amount : 0,
        dateStr: dayStr
      });
    }

    return cells;
  };

  const calendarCells = buildCalendarDays();
  const weekDays = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];
  const COLORS = ['#10b981', '#f43f5e', '#f59e0b', '#3b82f6'];

  // Calculate daily product performance if a date is selected
  const getProductPerformance = () => {
    if (!selectedDate) {
      return {
        title: 'Kinerja Volume Menu (Terfilter)',
        volumeList: data.allProductsVolume || [],
        totalRevenue: data.revenue
      };
    }

    // Filter non-void orders on selected date
    const dailyOrders = orders.filter((o: any) => {
      if (o.status === 'VOID') return false;
      const orderDate = o.createdAt ? o.createdAt.split('T')[0] : '';
      return orderDate === selectedDate;
    });

    const dailyItemVolumeMap: { [key: string]: { name: string; quantity: number; revenue: number } } = {};
    let dailyTotalRevenue = 0;

    dailyOrders.forEach((o: any) => {
      dailyTotalRevenue += (o.total || 0);
      o.items.forEach((it: any) => {
        if (!dailyItemVolumeMap[it.productId]) {
          dailyItemVolumeMap[it.productId] = { name: it.name, quantity: 0, revenue: 0 };
        }
        dailyItemVolumeMap[it.productId].quantity += it.quantity;
        dailyItemVolumeMap[it.productId].revenue += (it.price * it.quantity);
      });
    });

    const dailyProductsVolume = Object.values(dailyItemVolumeMap).sort((a: any, b: any) => b.quantity - a.quantity);

    // Format local date for display (e.g. "08 Juli 2026")
    const dateObj = new Date(selectedDate);
    const formattedDate = dateObj.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });

    return {
      title: `Kinerja Volume (${formattedDate})`,
      volumeList: dailyProductsVolume,
      totalRevenue: dailyTotalRevenue
    };
  };

  const performanceData = getProductPerformance();

  return (
    <div className="space-y-6">

      {/* Date Filter Panel */}
      <div className="bg-[#0F172A]/70 backdrop-blur-md p-5 rounded-2xl border border-slate-800/80 space-y-4 shadow-lg animate-fade-in">
        <div className="flex justify-between items-center border-b border-slate-800/85 pb-3">
          <div className="flex items-center gap-2">
            <CalendarIcon className="w-5 h-5 text-emerald-500" />
            <h3 className="text-sm font-bold text-slate-200">Filter Periode Laporan Penjualan</h3>
          </div>
          <span className="text-[10px] text-slate-400 font-mono bg-slate-900 px-2.5 py-1 rounded-md border border-slate-800">
            Rentang Terpilih: <span className="text-emerald-400 font-extrabold">{data.daysCount} Hari</span>
          </span>
        </div>

        <div className="flex flex-col md:flex-row gap-4 items-end">
          {/* Preset Buttons */}
          <div className="flex-1 space-y-2">
            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Pilih Cepat Periode:</span>
            <div className="flex flex-wrap gap-2">
              {[
                { code: 'ALL', label: 'Semua Waktu' },
                { code: 'TODAY', label: 'Hari Ini' },
                { code: 'WEEK', label: '7 Hari Terakhir' },
                { code: 'MONTH', label: 'Bulan Ini' },
                { code: 'CUSTOM', label: 'Kustom Tanggal' }
              ].map((preset) => (
                <button
                  key={preset.code}
                  onClick={() => {
                    setDatePreset(preset.code);
                    if (preset.code !== 'CUSTOM') {
                      setStartDate('');
                      setEndDate('');
                    }
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    datePreset === preset.code
                      ? 'bg-emerald-500 text-slate-950 shadow-md font-black scale-[1.02]'
                      : 'bg-slate-800/40 text-slate-400 hover:bg-slate-800 hover:text-slate-200 border border-slate-700/30'
                  }`}
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>

          {/* Custom Date Inputs */}
          {datePreset === 'CUSTOM' && (
            <div className="flex flex-col md:flex-row gap-2 shrink-0 w-full md:w-auto">
              <div className="flex flex-col gap-1">
                <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">Tanggal Mulai:</span>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="bg-slate-900 text-slate-200 text-xs px-3 py-2 rounded-lg border border-slate-800 focus:outline-none focus:border-emerald-500 font-mono cursor-pointer"
                />
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">Tanggal Selesai:</span>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="bg-slate-900 text-slate-200 text-xs px-3 py-2 rounded-lg border border-slate-800 focus:outline-none focus:border-emerald-500 font-mono cursor-pointer"
                />
              </div>
            </div>
          )}
        </div>
      </div>
      
      {/* Fin toolbar */}
      <div className="bg-[#0F172A]/70 backdrop-blur-md p-4 rounded-2xl border border-slate-800/80 flex flex-col md:flex-row justify-between items-center gap-3">
        <div className="flex flex-wrap gap-2">
          {([
            { code: 'KALENDER', label: 'Kalender Penjualan', icon: CalendarIcon },
            { code: 'LABARUGI', label: 'Laba Rugi (P&L)', icon: FileText },
            { code: 'CASHFLOW', label: 'Aliran Kas & Hutang', icon: Landmark },
            { code: 'PENGELUARAN', label: 'Pencatatan Pengeluaran', icon: Coins }
          ] as const).map((tab) => (
            <button
              key={tab.code}
              onClick={() => setActiveSubTab(tab.code)}
              className={`px-3.5 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
                activeSubTab === tab.code 
                  ? 'bg-emerald-500 text-slate-950 shadow-[0_0_12px_rgba(16,185,129,0.3)] font-black' 
                  : 'bg-slate-800/60 text-slate-400 hover:bg-slate-800 hover:text-slate-200 border border-slate-700/50'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        <div className="flex gap-2 shrink-0">
          <button 
            onClick={() => handleExport('PDF')}
            className="bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold px-3.5 py-2.5 rounded-xl flex items-center gap-1.5 cursor-pointer border border-slate-700/60 transition-colors border-none"
          >
            <Download className="w-4 h-4" />
            <span>Ekspor PDF</span>
          </button>
          <button 
            onClick={() => handleExport('EXCEL')}
            className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-black px-3.5 py-2.5 rounded-xl flex items-center gap-1.5 cursor-pointer shadow-[0_0_12px_rgba(16,185,129,0.2)] transition-all"
          >
            <FileText className="w-4 h-4" />
            <span>Ekspor Excel</span>
          </button>
        </div>
      </div>

      {/* SUB-TAB 1: CALENDAR MODEL SALES */}
      {activeSubTab === 'KALENDER' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Calendar element (8 cols) */}
          <div className="lg:col-span-8 bg-[#0F172A]/70 backdrop-blur-md rounded-3xl p-5 border border-slate-800/60 shadow-xl">
            <div className="flex justify-between items-center mb-4 pb-3 border-b border-slate-800/80">
              <div>
                <h2 className="text-base font-bold text-slate-100">Kalender Penjualan Bulanan</h2>
                <p className="text-xs text-slate-400">Inspeksi omzet harian model kalender (Klik tanggal untuk memfilter)</p>
              </div>
              
              {/* Month Navigation */}
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => {
                    if (currentMonth === 0) {
                      setCurrentMonth(11);
                      setCurrentYear(prev => prev - 1);
                    } else {
                      setCurrentMonth(prev => prev - 1);
                    }
                  }}
                  className="p-1.5 bg-slate-800 hover:bg-slate-700 rounded-lg text-slate-300 border border-slate-700/60 transition-colors cursor-pointer"
                  title="Bulan Sebelumnya"
                >
                  &larr;
                </button>
                <span className="text-xs bg-emerald-500/10 text-emerald-400 font-black px-3 py-1 rounded-full border border-emerald-500/20 font-mono min-w-[110px] text-center uppercase tracking-wider">
                  {new Date(currentYear, currentMonth).toLocaleString('id-ID', { month: 'short', year: 'numeric' })}
                </span>
                <button
                  onClick={() => {
                    if (currentMonth === 11) {
                      setCurrentMonth(0);
                      setCurrentYear(prev => prev + 1);
                    } else {
                      setCurrentMonth(prev => prev + 1);
                    }
                  }}
                  className="p-1.5 bg-slate-800 hover:bg-slate-700 rounded-lg text-slate-300 border border-slate-700/60 transition-colors cursor-pointer"
                  title="Bulan Berikutnya"
                >
                  &rarr;
                </button>
              </div>
            </div>

            {/* Grid Days Header */}
            <div className="grid grid-cols-7 gap-2 text-center text-[10px] font-black text-slate-500 uppercase tracking-wider mb-2">
              {weekDays.map(w => <div key={w}>{w}</div>)}
            </div>

            {/* Calendar Grid cells */}
            <div className="grid grid-cols-7 gap-2">
              {calendarCells.map((cell, idx) => {
                const isSelected = selectedDate === cell.dateStr;
                return (
                  <button 
                    key={idx} 
                    disabled={cell.day === null}
                    onClick={() => cell.dateStr && setSelectedDate(selectedDate === cell.dateStr ? null : cell.dateStr)}
                    className={`min-h-[64px] rounded-xl p-2 border flex flex-col justify-between transition-all text-left cursor-pointer ${
                      cell.day === null 
                        ? 'bg-slate-950/20 border-transparent text-transparent pointer-events-none' 
                        : isSelected
                          ? 'bg-emerald-500 text-slate-950 border-emerald-400 font-extrabold shadow-[0_0_12px_rgba(16,185,129,0.3)] scale-[1.03]'
                          : cell.sales > 0 
                            ? 'bg-emerald-500/10 border-emerald-500/25 text-slate-100 hover:bg-emerald-500/20 hover:border-emerald-500/50' 
                            : 'bg-slate-900/40 border-slate-800/60 text-slate-500 hover:bg-slate-800/40 hover:border-slate-700/60'
                    }`}
                  >
                    <span className={`text-[10px] font-mono font-bold ${isSelected ? 'text-slate-950' : 'text-slate-400'}`}>{cell.day}</span>
                    {cell.sales > 0 && (
                      <span className={`text-[9px] font-black font-mono block truncate text-right w-full ${isSelected ? 'text-slate-950' : 'text-emerald-400'}`}>
                        Rp{(cell.sales / 1000).toFixed(0)}k
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Side Info: Menu performance & volumes (4 cols) */}
          <div className="lg:col-span-4 bg-[#0F172A]/70 backdrop-blur-md rounded-3xl p-5 border border-slate-800/60 shadow-xl flex flex-col justify-between space-y-4">
            <div className="flex-1 flex flex-col">
              <div className="flex justify-between items-center mb-3">
                <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider">{performanceData.title}</h3>
                {selectedDate && (
                  <button 
                    onClick={() => setSelectedDate(null)}
                    className="p-1 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 rounded-lg text-[10px] flex items-center gap-1 transition-colors cursor-pointer border border-slate-700"
                    title="Lihat Semua"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>Reset</span>
                  </button>
                )}
              </div>
              <div className="space-y-3.5 max-h-[300px] overflow-y-auto pr-1 flex-1">
                {performanceData.volumeList.length === 0 ? (
                  <div className="text-center py-10 bg-slate-900/30 rounded-xl border border-slate-800/40 p-4">
                    <p className="text-xs text-slate-500">Tidak ada penjualan menu pada tanggal ini.</p>
                  </div>
                ) : (
                  performanceData.volumeList.map((item: any, idx: number) => (
                    <div key={idx} className="flex justify-between items-center p-2.5 bg-slate-900/50 rounded-xl border border-slate-800/60">
                      <div>
                        <p className="text-xs font-bold text-slate-200">{item.name}</p>
                        <p className="text-[9px] text-slate-500 font-mono">Vol: {item.quantity} Pcs</p>
                      </div>
                      <span className="text-xs font-bold text-emerald-400 font-mono">
                        Rp {item.revenue.toLocaleString('id-ID')}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="bg-emerald-500/5 p-3 rounded-2xl border border-emerald-500/20 flex justify-between items-center text-xs text-slate-300 font-semibold shrink-0">
              <span>{selectedDate ? 'Total Omzet Hari Ini:' : 'Total Omzet Terfilter:'}</span>
              <span className="font-mono text-sm font-black text-emerald-400">Rp {performanceData.totalRevenue.toLocaleString('id-ID')}</span>
            </div>
          </div>

        </div>
      )}

      {/* SUB-TAB 2: PROFIT & LOSS STATEMENTS */}
      {activeSubTab === 'LABARUGI' && (
        <div className="bg-[#0F172A]/70 backdrop-blur-md rounded-3xl p-6 border border-slate-800/60 shadow-xl">
          <div className="border-b border-slate-800/80 pb-4 mb-4 flex justify-between items-center">
            <div>
              <h2 className="text-base font-bold text-slate-100">Laba Rugi (Profit & Loss Statement)</h2>
              <p className="text-xs text-slate-400">Kalkulasi laba kotor, laba bersih, beban operasional, dan sirkulasi modal terupdate</p>
            </div>
            <span className="text-xs bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-black px-3.5 py-1.5 rounded-xl font-mono">
              {data.daysCount} Hari
            </span>
          </div>

          <div className="space-y-4 text-xs font-bold text-slate-300">
            {/* Revenue */}
            <div className="flex justify-between p-3.5 bg-green-500/10 text-green-400 rounded-xl text-sm font-extrabold border border-green-500/20 font-black">
              <span>TOTAL PENDAPATAN (OMZET)</span>
              <span className="font-mono text-sm font-black">Rp {data.revenue.toLocaleString('id-ID')}</span>
            </div>

            {/* COGS */}
            <div className="flex justify-between p-3.5 bg-slate-900/50 rounded-xl border border-slate-800">
              <span>Beban Pokok Penjualan (COGS / Food Cost 35%)</span>
              <span className="font-mono text-red-400">-Rp {data.cogs.toLocaleString('id-ID')}</span>
            </div>

            {/* Gross profit */}
            <div className="flex justify-between p-3.5 bg-emerald-500/5 text-emerald-400 rounded-xl border border-emerald-500/20 font-black">
              <span>LABA KOTOR (GROSS PROFIT)</span>
              <span className="font-mono">Rp {data.grossProfit.toLocaleString('id-ID')}</span>
            </div>

            {/* Expenses */}
            <div className="space-y-2 p-3.5 bg-slate-900/40 rounded-xl border border-slate-800">
              <span className="text-[10px] text-slate-500 uppercase tracking-wide block mb-1">Beban Operasional Terfilter ({data.daysCount} Hari)</span>
              <div className="flex justify-between text-slate-400 font-medium pl-3">
                <span>Beban Gaji Karyawan Roster (Sesuai Periode)</span>
                <span className="font-mono text-red-400">-Rp {data.salaries.toLocaleString('id-ID')}</span>
              </div>
              <div className="flex justify-between text-slate-400 font-medium pl-3">
                <span>Beban Sewa Tempat & Utilitas (Proporsional)</span>
                <span className="font-mono text-red-400">-Rp {data.rentAndUtilities.toLocaleString('id-ID')}</span>
              </div>
              <div className="flex justify-between text-slate-400 font-medium pl-3 border-t border-slate-800/60 pt-2 mt-1">
                <span>Beban Pengeluaran Operasional Lainnya</span>
                <span className="font-mono text-red-400">-Rp {data.customExpenses.toLocaleString('id-ID')}</span>
              </div>
            </div>

            {/* Net profit */}
            <div className={`flex justify-between p-4 rounded-2xl text-base font-black shadow-lg transition-all ${
              data.netProfit >= 0
                ? 'bg-emerald-500 text-slate-950 shadow-emerald-500/10'
                : 'bg-red-500 text-slate-950 shadow-red-500/10'
            }`}>
              <span>LABA BERSIH (NET PROFIT)</span>
              <span className="font-mono">
                {data.netProfit >= 0 ? '' : '-'}Rp {Math.abs(data.netProfit).toLocaleString('id-ID')}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* SUB-TAB 3: CASH FLOW & DEBT METRICS */}
      {activeSubTab === 'CASHFLOW' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* Cashflow visual comparison */}
          <div className="bg-[#0F172A]/70 backdrop-blur-md rounded-3xl p-5 border border-slate-800/60 shadow-xl flex flex-col justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-200 mb-4 pb-3 border-b border-slate-800/80">Perbandingan Arus Kas Terfilter (In vs Out)</h3>
              <div className="h-48 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={[
                        { name: 'Uang Kas Masuk', value: data.cashflow.totalCashIn },
                        { name: 'Uang Kas Keluar', value: data.cashflow.totalCashOut }
                      ]}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={70}
                      paddingAngle={4}
                      dataKey="value"
                    >
                      <Cell fill="#10b981" />
                      <Cell fill="#f43f5e" />
                    </Pie>
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: '12px', color: '#f1f5f9' }}
                      formatter={(val: any) => `Rp ${(val ?? 0).toLocaleString('id-ID')}`} 
                    />
                    <Legend style={{ fontSize: 10, color: '#94a3b8' }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-800/80 flex justify-between items-center text-xs font-bold text-slate-300">
              <span>Sisa Saldo Kas (Net Cash):</span>
              <span className={`font-mono text-sm font-black ${data.cashflow.netCashFlow >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                Rp {data.cashflow.netCashFlow.toLocaleString('id-ID')}
              </span>
            </div>
          </div>

          {/* Debt & Receivable Tracker */}
          <div className="bg-[#0F172A]/70 backdrop-blur-md rounded-3xl p-5 border border-slate-800/60 shadow-xl space-y-4">
            <h3 className="text-sm font-bold text-slate-200 mb-4 pb-3 border-b border-slate-800/80">Catatan Hutang & Piutang Dagang</h3>
            
            <div className="space-y-2.5 text-xs font-semibold text-slate-300">
              {/* Debt */}
              <div className="p-3 bg-red-500/10 rounded-xl border border-red-500/20 flex justify-between items-center">
                <div>
                  <span className="text-slate-100 font-bold block text-sm">Hutang Bahan Baku (Supplier)</span>
                  <span className="text-[10px] text-slate-500">Jatuh tempo pembayaran tanggal 15 tiap bulan</span>
                </div>
                <span className="font-mono text-red-400 font-bold text-sm">Rp 1.350.000</span>
              </div>

              {/* Receivable */}
              <div className="p-3 bg-emerald-500/10 rounded-xl border border-emerald-500/20 flex justify-between items-center">
                <div>
                  <span className="text-slate-100 font-bold block text-sm">Piutang Katering Cabang</span>
                  <span className="text-[10px] text-slate-500">Pembayaran pending dari pesanan katering</span>
                </div>
                <span className="font-mono text-emerald-400 font-bold text-sm">Rp 420.000</span>
              </div>
            </div>
          </div>

        </div>
      )}

      {activeSubTab === 'PENGELUARAN' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-fade-in">
          {/* Form Section */}
          <div className="lg:col-span-4 bg-[#0F172A]/70 backdrop-blur-md rounded-3xl p-5 border border-slate-800/60 shadow-xl space-y-4">
            <div>
              <h2 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                <Plus className="w-4 h-4 text-emerald-400" />
                Catat Pengeluaran Baru
              </h2>
              <p className="text-[11px] text-slate-400 mt-1">
                Catat biaya operasional harian, belanja bahan baku darurat, atau utilitas outlet secara langsung.
              </p>
            </div>

            <form onSubmit={handleAddExpense} className="space-y-4 text-xs">
              <div className="space-y-1">
                <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Kategori</label>
                <select
                  value={expenseForm.category}
                  onChange={(e) => setExpenseForm({ ...expenseForm, category: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-800 focus:outline-none focus:border-emerald-500 rounded-xl px-3.5 py-2.5 text-slate-200 font-bold cursor-pointer"
                >
                  <option value="Bahan Baku">Bahan Baku (Darurat)</option>
                  <option value="Operasional">Operasional</option>
                  <option value="Gaji">Gaji / Roster Tambahan</option>
                  <option value="Utilitas">Utilitas (Listrik / Air / Wi-Fi)</option>
                  <option value="Sewa & Pemeliharaan">Sewa & Pemeliharaan</option>
                  <option value="Pemasaran">Pemasaran & Promosi</option>
                  <option value="Lain-lain">Lain-lain</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block font-mono">Jumlah (Rp)</label>
                <input
                  type="number"
                  placeholder="Contoh: 150000"
                  value={expenseForm.amount}
                  onChange={(e) => setExpenseForm({ ...expenseForm, amount: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-800 focus:outline-none focus:border-emerald-500 rounded-xl px-3.5 py-2.5 text-slate-200 font-mono font-bold"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Tanggal Pengeluaran</label>
                <input
                  type="date"
                  value={expenseForm.date}
                  onChange={(e) => setExpenseForm({ ...expenseForm, date: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-800 focus:outline-none focus:border-emerald-500 rounded-xl px-3.5 py-2.5 text-slate-200 font-mono font-bold cursor-pointer"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Keterangan / Deskripsi</label>
                <textarea
                  placeholder="Detail pengeluaran (contoh: Beli gas melon 3 tabung, sedot AC dapur)"
                  value={expenseForm.description}
                  onChange={(e) => setExpenseForm({ ...expenseForm, description: e.target.value })}
                  rows={3}
                  className="w-full bg-slate-900 border border-slate-800 focus:outline-none focus:border-emerald-500 rounded-xl px-3.5 py-2.5 text-slate-200"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Dicatat Oleh</label>
                  <input
                    type="text"
                    value={expenseForm.recordedBy}
                    onChange={(e) => setExpenseForm({ ...expenseForm, recordedBy: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-800 focus:outline-none focus:border-emerald-500 rounded-xl px-3 py-2 text-slate-300 font-bold"
                    required
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Outlet Cabang</label>
                  <select
                    value={expenseForm.outletId}
                    onChange={(e) => setExpenseForm({ ...expenseForm, outletId: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-800 focus:outline-none focus:border-emerald-500 rounded-xl px-3 py-2 text-slate-300 font-bold cursor-pointer"
                  >
                    <option value="out_1">Cabang Utama</option>
                    <option value="out_2">Cabang Boulevard</option>
                    <option value="out_3">Cabang Gowa</option>
                  </select>
                </div>
              </div>

              <button
                type="submit"
                disabled={submittingExpense}
                className="w-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black py-3 rounded-xl transition-all cursor-pointer shadow-lg shadow-emerald-500/10 flex items-center justify-center gap-2"
              >
                {submittingExpense ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin text-slate-950" />
                    <span>Menyimpan...</span>
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 text-slate-950" />
                    <span>Simpan Pengeluaran</span>
                  </>
                )}
              </button>
            </form>
          </div>

          {/* List Section */}
          <div className="lg:col-span-8 bg-[#0F172A]/70 backdrop-blur-md rounded-3xl p-5 border border-slate-800/60 shadow-xl space-y-4 flex flex-col">
            <div className="flex justify-between items-center border-b border-slate-800/60 pb-3">
              <div>
                <h2 className="text-sm font-bold text-slate-100">Riwayat Pengeluaran</h2>
                <p className="text-[11px] text-slate-400 mt-1">Daftar biaya operasional yang tercatat pada rentang periode terpilih</p>
              </div>
              <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-3.5 py-1.5 rounded-xl flex items-center gap-2 text-xs font-black">
                <Coins className="w-4 h-4" />
                <span>Total: Rp {data.customExpenses.toLocaleString('id-ID')}</span>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto max-h-[420px] pr-1 space-y-2">
              {!data.expenses || data.expenses.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center text-slate-500">
                  <Coins className="w-10 h-10 stroke-[1.5] text-slate-600 mb-3" />
                  <p className="text-xs font-bold text-slate-400">Belum Ada Pengeluaran Tercatat</p>
                  <p className="text-[10px] text-slate-500 mt-1">Silakan tambahkan pengeluaran baru menggunakan formulir di sebelah kiri.</p>
                </div>
              ) : (
                data.expenses.map((exp: any) => {
                  let categoryBadgeClass = 'bg-slate-800/60 text-slate-400 border border-slate-700/30';
                  if (exp.category === 'Bahan Baku') categoryBadgeClass = 'bg-amber-500/10 text-amber-400 border border-amber-500/20';
                  else if (exp.category === 'Utilitas') categoryBadgeClass = 'bg-blue-500/10 text-blue-400 border border-blue-500/20';
                  else if (exp.category === 'Gaji') categoryBadgeClass = 'bg-purple-500/10 text-purple-400 border border-purple-500/20';
                  else if (exp.category === 'Operasional') categoryBadgeClass = 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20';
                  else if (exp.category === 'Pemasaran') categoryBadgeClass = 'bg-pink-500/10 text-pink-400 border border-pink-500/20';
                  else if (exp.category === 'Sewa & Pemeliharaan') categoryBadgeClass = 'bg-teal-500/10 text-teal-400 border border-teal-500/20';

                  return (
                    <div key={exp.id} className="p-3 bg-slate-900/40 rounded-2xl border border-slate-800 flex justify-between items-center gap-4 hover:bg-slate-900/70 transition-all">
                      <div className="space-y-1.5 flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-[9px] font-extrabold px-2 py-0.5 rounded-md uppercase font-mono tracking-wider bg-slate-950/60 text-slate-300 border border-slate-850">
                            {new Date(exp.date).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}
                          </span>
                          <span className={`text-[9px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wide ${categoryBadgeClass}`}>
                            {exp.category}
                          </span>
                          <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">
                            By: {exp.recordedBy || 'Owner'}
                          </span>
                        </div>
                        <p className="text-xs text-slate-200 font-medium leading-relaxed truncate" title={exp.description}>
                          {exp.description}
                        </p>
                      </div>

                      <div className="flex items-center gap-3 shrink-0">
                        <span className="text-xs font-extrabold text-red-400 font-mono">
                          -Rp {Number(exp.amount).toLocaleString('id-ID')}
                        </span>
                        
                        <div className="flex gap-1">
                          <button
                            onClick={() => setEditingExpense(exp)}
                            className="p-1.5 hover:bg-slate-800 text-slate-400 hover:text-slate-200 rounded-lg transition-colors cursor-pointer"
                            title="Edit Pengeluaran"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteExpense(exp.id)}
                            className="p-1.5 hover:bg-red-500/10 text-red-400 hover:text-red-300 rounded-lg transition-colors cursor-pointer"
                            title="Hapus Pengeluaran"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Edit Overlay Modal */}
          {editingExpense && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
              <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-4">
                <div className="flex justify-between items-center border-b border-slate-850 pb-3">
                  <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                    <Edit className="w-4 h-4 text-emerald-400" />
                    Ubah Pengeluaran
                  </h3>
                  <button
                    onClick={() => setEditingExpense(null)}
                    className="p-1.5 hover:bg-slate-800 text-slate-400 hover:text-white rounded-xl transition-colors cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <form onSubmit={handleUpdateExpense} className="space-y-4 text-xs">
                  <div className="space-y-1">
                    <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Kategori</label>
                    <select
                      value={editingExpense.category}
                      onChange={(e) => setEditingExpense({ ...editingExpense, category: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 focus:outline-none focus:border-emerald-500 rounded-xl px-3.5 py-2.5 text-slate-200 font-bold cursor-pointer"
                    >
                      <option value="Bahan Baku">Bahan Baku (Darurat)</option>
                      <option value="Operasional">Operasional</option>
                      <option value="Gaji">Gaji / Roster Tambahan</option>
                      <option value="Utilitas">Utilitas (Listrik / Air / Wi-Fi)</option>
                      <option value="Sewa & Pemeliharaan">Sewa & Pemeliharaan</option>
                      <option value="Pemasaran">Pemasaran & Promosi</option>
                      <option value="Lain-lain">Lain-lain</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block font-mono">Jumlah (Rp)</label>
                    <input
                      type="number"
                      placeholder="Contoh: 150000"
                      value={editingExpense.amount}
                      onChange={(e) => setEditingExpense({ ...editingExpense, amount: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 focus:outline-none focus:border-emerald-500 rounded-xl px-3.5 py-2.5 text-slate-200 font-mono font-bold"
                      required
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Tanggal Pengeluaran</label>
                    <input
                      type="date"
                      value={editingExpense.date ? editingExpense.date.split('T')[0] : ''}
                      onChange={(e) => setEditingExpense({ ...editingExpense, date: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 focus:outline-none focus:border-emerald-500 rounded-xl px-3.5 py-2.5 text-slate-200 font-mono font-bold cursor-pointer"
                      required
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Keterangan / Deskripsi</label>
                    <textarea
                      placeholder="Detail pengeluaran"
                      value={editingExpense.description}
                      onChange={(e) => setEditingExpense({ ...editingExpense, description: e.target.value })}
                      rows={3}
                      className="w-full bg-slate-950 border border-slate-800 focus:outline-none focus:border-emerald-500 rounded-xl px-3.5 py-2.5 text-slate-200"
                      required
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Dicatat Oleh</label>
                      <input
                        type="text"
                        value={editingExpense.recordedBy || ''}
                        onChange={(e) => setEditingExpense({ ...editingExpense, recordedBy: e.target.value })}
                        className="w-full bg-slate-950 border border-slate-800 focus:outline-none focus:border-emerald-500 rounded-xl px-3 py-2 text-slate-300 font-bold"
                        required
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Outlet Cabang</label>
                      <select
                        value={editingExpense.outletId || 'out_1'}
                        onChange={(e) => setEditingExpense({ ...editingExpense, outletId: e.target.value })}
                        className="w-full bg-slate-950 border border-slate-800 focus:outline-none focus:border-emerald-500 rounded-xl px-3 py-2 text-slate-300 font-bold cursor-pointer"
                      >
                        <option value="out_1">Cabang Utama</option>
                        <option value="out_2">Cabang Boulevard</option>
                        <option value="out_3">Cabang Gowa</option>
                      </select>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setEditingExpense(null)}
                      className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300 py-3 rounded-xl transition-colors cursor-pointer font-bold"
                    >
                      Batal
                    </button>
                    <button
                      type="submit"
                      disabled={submittingExpense}
                      className="flex-1 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black py-3 rounded-xl transition-all cursor-pointer shadow-lg shadow-emerald-500/10 flex items-center justify-center gap-2"
                    >
                      {submittingExpense ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin text-slate-950" />
                          <span>Menyimpan...</span>
                        </>
                      ) : (
                        <>
                          <Save className="w-4 h-4 text-slate-950" />
                          <span>Simpan Perubahan</span>
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      )}

      {createPortal(
      <div id="print-area" className="hidden print:block bg-white text-slate-900 p-8 font-sans">
        {/* Header */}
        <div className="text-center border-b-4 border-double border-slate-700 pb-4 mb-6">
          <h1 className="text-2xl font-black tracking-tight text-slate-900 uppercase">{storeProfile?.name?.toUpperCase() || 'WARUNG DAENG SOPPENG'}</h1>
          <p className="text-xs text-slate-600 font-medium mt-1">Sistem Manajemen Keuangan & Operasional Outlet</p>
          <p className="text-[10px] text-slate-500 mt-0.5">{storeProfile?.address || "Cikke'e, Watansoppeng, Sulawesi Selatan"} | Telp: {storeProfile?.phone || '085342016403'}</p>
        </div>

        {/* Metadata */}
        <div className="flex justify-between items-center text-xs text-slate-700 bg-slate-100 p-3 rounded-lg border border-slate-200 mb-6 font-medium">
          <span><strong>LAPORAN KEUANGAN & OPERASIONAL (TERUPDATE)</strong></span>
          <span>Periode: <strong>{data.startDate && data.endDate ? `${data.startDate} s.d. ${data.endDate}` : 'Semua Waktu'}</strong></span>
          <span>Dicetak: <strong>{new Date().toLocaleString('id-ID', { dateStyle: 'long', timeStyle: 'short' })}</strong></span>
        </div>

        {/* Key Cards */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="border border-slate-200 rounded-lg p-3 bg-slate-50">
            <span className="text-[10px] text-slate-500 font-bold uppercase block tracking-wider">Total Pendapatan (Omzet)</span>
            <span className="text-sm font-bold text-emerald-700 font-mono mt-1 block">Rp {data.revenue.toLocaleString('id-ID')}</span>
          </div>
          <div className="border border-slate-200 rounded-lg p-3 bg-slate-50">
            <span className="text-[10px] text-slate-500 font-bold uppercase block tracking-wider">Total Biaya & Beban</span>
            <span className="text-sm font-bold text-red-700 font-mono mt-1 block">Rp {(data.cogs + data.salaries + data.rentAndUtilities + data.customExpenses).toLocaleString('id-ID')}</span>
          </div>
          <div className="border border-slate-200 rounded-lg p-3 bg-slate-50">
            <span className="text-[10px] text-slate-500 font-bold uppercase block tracking-wider">Laba Bersih (Net Profit)</span>
            <span className="text-sm font-bold text-teal-700 font-mono mt-1 block">Rp {data.netProfit.toLocaleString('id-ID')}</span>
          </div>
        </div>

        {/* Section 1: P&L */}
        <div className="mb-6">
          <h2 className="text-xs font-bold uppercase text-slate-950 border-l-4 border-emerald-500 pl-2 mb-3 tracking-wider">I. Laba Rugi (Profit & Loss Statement)</h2>
          <table className="w-full border-collapse border border-slate-200 text-xs">
            <thead>
              <tr className="bg-slate-100">
                <th className="border border-slate-200 p-2 text-left font-bold text-slate-700">Keterangan / Pos Keuangan</th>
                <th className="border border-slate-200 p-2 text-right font-bold text-slate-700">Jumlah (Rupiah)</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="border border-slate-200 p-2 font-bold text-slate-900">TOTAL PENDAPATAN (OMZET)</td>
                <td className="border border-slate-200 p-2 text-right font-mono font-bold text-emerald-700">Rp {data.revenue.toLocaleString('id-ID')}</td>
              </tr>
              <tr>
                <td className="border border-slate-200 p-2 pl-6 text-slate-600">Beban Pokok Penjualan (COGS / Food Cost 35%)</td>
                <td className="border border-slate-200 p-2 text-right font-mono text-red-600">-Rp {data.cogs.toLocaleString('id-ID')}</td>
              </tr>
              <tr className="bg-slate-50">
                <td className="border border-slate-200 p-2 font-bold text-slate-900">LABA KOTOR (GROSS PROFIT)</td>
                <td className="border border-slate-200 p-2 text-right font-mono font-bold text-slate-900">Rp {data.grossProfit.toLocaleString('id-ID')}</td>
              </tr>
              <tr>
                <td className="border border-slate-200 p-2 pl-6 text-slate-600">Beban Gaji Karyawan Roster (Sesuai Shift)</td>
                <td className="border border-slate-200 p-2 text-right font-mono text-red-600">-Rp {data.salaries.toLocaleString('id-ID')}</td>
              </tr>
              <tr>
                <td className="border border-slate-200 p-2 pl-6 text-slate-600">Beban Sewa Tempat & Utilitas (Listrik/Air)</td>
                <td className="border border-slate-200 p-2 text-right font-mono text-red-600">-Rp {data.rentAndUtilities.toLocaleString('id-ID')}</td>
              </tr>
              <tr>
                <td className="border border-slate-200 p-2 pl-6 text-slate-600">Beban Pengeluaran Operasional Lainnya</td>
                <td className="border border-slate-200 p-2 text-right font-mono text-red-600">-Rp {data.customExpenses.toLocaleString('id-ID')}</td>
              </tr>
              <tr className="bg-emerald-50/50 font-bold text-emerald-800">
                <td className="border border-slate-200 p-2 font-bold text-emerald-900">LABA BERSIH (NET PROFIT)</td>
                <td className="border border-slate-200 p-2 text-right font-mono font-bold text-emerald-900 border-t-2 border-emerald-600">Rp {data.netProfit.toLocaleString('id-ID')}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Section 2: Volume Performance */}
        <div className="mb-6">
          <h2 className="text-xs font-bold uppercase text-slate-950 border-l-4 border-emerald-500 pl-2 mb-3 tracking-wider">II. Kinerja Volume Penjualan Menu</h2>
          <table className="w-full border-collapse border border-slate-200 text-xs">
            <thead>
              <tr className="bg-slate-100">
                <th className="border border-slate-200 p-2 text-center font-bold text-slate-700 w-12">No</th>
                <th className="border border-slate-200 p-2 text-left font-bold text-slate-700">Nama Menu / Produk</th>
                <th className="border border-slate-200 p-2 text-center font-bold text-slate-700">Volume Terjual</th>
                <th className="border border-slate-200 p-2 text-right font-bold text-slate-700">Total Pendapatan</th>
              </tr>
            </thead>
            <tbody>
              {(data.allProductsVolume || []).map((item: any, idx: number) => (
                <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                  <td className="border border-slate-200 p-2 text-center font-mono text-slate-600">{idx + 1}</td>
                  <td className="border border-slate-200 p-2 font-bold text-slate-800">{item.name}</td>
                  <td className="border border-slate-200 p-2 text-center font-mono">{item.quantity} Pcs</td>
                  <td className="border border-slate-200 p-2 text-right font-mono font-bold text-slate-900">Rp {item.revenue.toLocaleString('id-ID')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Section 3: Cashflow */}
        <div className="mb-8">
          <h2 className="text-xs font-bold uppercase text-slate-950 border-l-4 border-emerald-500 pl-2 mb-3 tracking-wider">III. Arus Kas & Posisi Hutang Piutang</h2>
          <table className="w-full border-collapse border border-slate-200 text-xs">
            <thead>
              <tr className="bg-slate-100">
                <th className="border border-slate-200 p-2 text-left font-bold text-slate-700">Metrik Aliran Kas</th>
                <th className="border border-slate-200 p-2 text-right font-bold text-slate-700">Jumlah (Rupiah)</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="border border-slate-200 p-2 text-slate-700">Total Aliran Kas Masuk (Inflow)</td>
                <td className="border border-slate-200 p-2 text-right font-mono text-emerald-700">Rp {data.cashflow.totalCashIn.toLocaleString('id-ID')}</td>
              </tr>
              <tr>
                <td className="border border-slate-200 p-2 text-slate-700">Total Aliran Kas Keluar (Outflow)</td>
                <td className="border border-slate-200 p-2 text-right font-mono text-red-700">Rp {data.cashflow.totalCashOut.toLocaleString('id-ID')}</td>
              </tr>
              <tr className="bg-slate-50 font-bold">
                <td className="border border-slate-200 p-2 text-slate-900 font-bold">Sisa Saldo Kas (Net Cash)</td>
                <td className="border border-slate-200 p-2 text-right font-mono font-bold text-slate-900">Rp {data.cashflow.netCashFlow.toLocaleString('id-ID')}</td>
              </tr>
              <tr>
                <td className="border border-slate-200 p-2 font-bold text-red-900">Hutang Bahan Baku (Supplier)</td>
                <td className="border border-slate-200 p-2 text-right font-mono font-bold text-red-700">Rp 1.350.000</td>
              </tr>
              <tr>
                <td className="border border-slate-200 p-2 font-bold text-emerald-900">Piutang Katering Cabang</td>
                <td className="border border-slate-200 p-2 text-right font-mono font-bold text-emerald-700">Rp 420.000</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Signatures */}
        <div className="flex justify-between items-center mt-12 px-12">
          <div className="text-center w-48 text-xs text-slate-700">
            <p>Dibuat Oleh,</p>
            <div className="h-16 font-medium"></div>
            <p className="font-bold underline text-slate-900">KASIR / ADMIN KASIR</p>
            <p className="text-[10px] text-slate-500">{storeProfile?.name || 'Warung Daeng Soppeng'}</p>
          </div>
          <div className="text-center w-48 text-xs text-slate-700">
            <p>Disetujui Oleh,</p>
            <div className="h-16 font-medium"></div>
            <p className="font-bold underline text-slate-900">OWNER / OWNER DAENG</p>
            <p className="text-[10px] text-slate-500">{storeProfile?.name || 'Warung Daeng Soppeng'}</p>
          </div>
        </div>
      </div>,
      document.body
    )}
  </div>
);
}
