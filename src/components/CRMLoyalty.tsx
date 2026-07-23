import React, { useState, useEffect } from 'react';
import { 
  Users, Gift, Award, Plus, RefreshCw, UserCheck, 
  ChevronRight, Sparkles, Send, Percent, Calendar,
  Search, Edit3, Trash2, Phone, Mail, Filter, Check, X,
  PlusCircle, MinusCircle, ShieldAlert
} from 'lucide-react';
import { Customer } from '../types';

export default function CRMLoyalty() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'MEMBERS' | 'REWARDS' | 'TIERS'>('MEMBERS');

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState('');
  const [filterLevel, setFilterLevel] = useState<string>('ALL');

  // Add / Edit Modal State
  const [addModal, setAddModal] = useState(false);
  const [editModal, setEditModal] = useState(false);
  const [deleteModal, setDeleteModal] = useState(false);
  const [pointsModal, setPointsModal] = useState(false);

  // Form States
  const [formData, setFormData] = useState({ 
    id: '',
    name: '', 
    phone: '', 
    email: '', 
    points: 0,
    level: 'Bronze' as 'Bronze' | 'Silver' | 'Gold' | 'Platinum' 
  });

  const [custToDelete, setCustToDelete] = useState<Customer | null>(null);
  const [custToAdjust, setCustToAdjust] = useState<Customer | null>(null);
  const [pointDelta, setPointDelta] = useState<number>(10);
  const [pointReason, setPointReason] = useState<string>('Bonus Loyalitas Manual');

  // Selected customer details
  const [selectedCust, setSelectedCust] = useState<Customer | null>(null);

  // Feedback notifications
  const [toastMsg, setToastMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToastMsg({ text, type });
    setTimeout(() => setToastMsg(null), 3500);
  };

  // Rewards list
  const rewardsList = [
    { id: 'r1', name: 'Voucher Bakso Daeng Rp 15.000', cost: 150, description: 'Potongan harga langsung pada pesanan POS' },
    { id: 'r2', name: 'Free Es Teh Manis Jumbo', cost: 50, description: 'Gratis 1 Gelas Es Teh Manis Jumbo segar' },
    { id: 'r3', name: 'Free Sosis Bakar Soppeng', cost: 80, description: 'Gratis 1 Tusuk Sosis Bakar Soppeng rasa Pedas' },
    { id: 'r4', name: 'Diskon 10% All Menu', cost: 200, description: 'Maksimum diskon senilai Rp 25.000' }
  ];

  useEffect(() => {
    fetchCustomers();
  }, []);

  const fetchCustomers = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/v1/customers');
      if (res.ok) {
        const data = await res.json();
        setCustomers(data);
        // Sync selectedCust if active
        if (selectedCust) {
          const updated = data.find((c: Customer) => c.id === selectedCust.id);
          if (updated) setSelectedCust(updated);
        }
      }
    } catch (err) {
      console.error('Error fetching CRM customers:', err);
      showToast('Gagal memuat data pelanggan', 'error');
    } finally {
      setLoading(false);
    }
  };

  // CREATE Customer
  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.phone.trim()) {
      showToast('Nama dan nomor telepon wajib diisi!', 'error');
      return;
    }

    try {
      const res = await fetch('/api/v1/customers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name.trim(),
          phone: formData.phone.trim(),
          email: formData.email.trim(),
          points: Number(formData.points) || 0,
          level: formData.level
        }),
      });
      if (res.ok) {
        const newCust = await res.json();
        setAddModal(false);
        resetForm();
        fetchCustomers();
        setSelectedCust(newCust);
        showToast(`Pelanggan "${newCust.name}" berhasil ditambahkan!`);
      } else {
        showToast('Gagal menambah pelanggan baru', 'error');
      }
    } catch (err) {
      console.error('Error adding customer:', err);
      showToast('Terjadi kesalahan koneksi', 'error');
    }
  };

  // UPDATE Customer
  const openEditModal = (cust: Customer) => {
    setFormData({
      id: cust.id,
      name: cust.name,
      phone: cust.phone,
      email: cust.email || '',
      points: cust.points || 0,
      level: cust.level || 'Bronze'
    });
    setEditModal(true);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.id) return;

    try {
      const res = await fetch(`/api/v1/customers/${formData.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name.trim(),
          phone: formData.phone.trim(),
          email: formData.email.trim(),
          points: Number(formData.points) || 0,
          level: formData.level
        }),
      });

      if (res.ok) {
        const updated = await res.json();
        setEditModal(false);
        resetForm();
        fetchCustomers();
        setSelectedCust(updated);
        showToast(`Data pelanggan "${updated.name}" berhasil diperbarui!`);
      } else {
        showToast('Gagal memperbarui data pelanggan', 'error');
      }
    } catch (err) {
      console.error('Error updating customer:', err);
      showToast('Terjadi kesalahan koneksi', 'error');
    }
  };

  // DELETE Customer
  const confirmDelete = (cust: Customer) => {
    setCustToDelete(cust);
    setDeleteModal(true);
  };

  const handleDeleteSubmit = async () => {
    if (!custToDelete) return;

    try {
      const res = await fetch(`/api/v1/customers/${custToDelete.id}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        const deletedName = custToDelete.name;
        if (selectedCust?.id === custToDelete.id) {
          setSelectedCust(null);
        }
        setDeleteModal(false);
        setCustToDelete(null);
        fetchCustomers();
        showToast(`Pelanggan "${deletedName}" telah dihapus.`);
      } else {
        showToast('Gagal menghapus pelanggan', 'error');
      }
    } catch (err) {
      console.error('Error deleting customer:', err);
      showToast('Terjadi kesalahan koneksi', 'error');
    }
  };

  // ADJUST POINTS
  const openPointsModal = (cust: Customer) => {
    setCustToAdjust(cust);
    setPointDelta(10);
    setPointReason('Bonus Loyalitas');
    setPointsModal(true);
  };

  const handleAdjustPointsSubmit = async (isAddition: boolean) => {
    if (!custToAdjust) return;
    const change = isAddition ? Math.abs(pointDelta) : -Math.abs(pointDelta);
    const newPoints = Math.max(0, (custToAdjust.points || 0) + change);

    // Auto calculate level based on points
    let newLevel: 'Bronze' | 'Silver' | 'Gold' | 'Platinum' = custToAdjust.level;
    if (newPoints >= 1501) newLevel = 'Platinum';
    else if (newPoints >= 501) newLevel = 'Gold';
    else if (newPoints >= 151) newLevel = 'Silver';
    else newLevel = 'Bronze';

    try {
      const res = await fetch(`/api/v1/customers/${custToAdjust.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...custToAdjust,
          points: newPoints,
          level: newLevel
        }),
      });

      if (res.ok) {
        const updated = await res.json();
        setPointsModal(false);
        setCustToAdjust(null);
        fetchCustomers();
        setSelectedCust(updated);
        showToast(`Poin ${updated.name} diubah menjadi ${newPoints} Pts!`);
      } else {
        showToast('Gagal mengubah poin pelanggan', 'error');
      }
    } catch (err) {
      console.error('Error adjusting points:', err);
      showToast('Terjadi kesalahan koneksi', 'error');
    }
  };

  const resetForm = () => {
    setFormData({ id: '', name: '', phone: '', email: '', points: 0, level: 'Bronze' });
  };

  const redeemPoints = async (customerId: string, rewardName: string, costPoints: number) => {
    const cust = customers.find(c => c.id === customerId);
    if (!cust) return;
    if (cust.points < costPoints) {
      showToast('Poin tidak mencukupi untuk reward ini!', 'error');
      return;
    }

    try {
      const res = await fetch(`/api/v1/customers/redeem`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ customerId, pointsCost: costPoints, discountValue: rewardName }),
      });
      if (res.ok) {
        showToast(`Berhasil menukarkan ${costPoints} poin untuk "${rewardName}"!`);
        fetchCustomers();
      } else {
        showToast('Gagal memproses penukaran poin', 'error');
      }
    } catch (err) {
      console.error('Error redeeming points:', err);
      showToast('Kesalahan koneksi saat klaim reward', 'error');
    }
  };

  const getTierBadge = (tier: string) => {
    switch (tier) {
      case 'Platinum':
        return 'bg-violet-500/10 text-violet-400 border-violet-500/20';
      case 'Gold':
        return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
      case 'Silver':
        return 'bg-slate-700/60 text-slate-300 border-slate-700/50';
      default:
        return 'bg-orange-500/10 text-orange-400 border-orange-500/20';
    }
  };

  // Filter & Search Logic
  const filteredCustomers = customers.filter(c => {
    const matchesSearch = 
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.phone.includes(searchQuery) ||
      (c.email && c.email.toLowerCase().includes(searchQuery.toLowerCase()));
    
    const matchesLevel = filterLevel === 'ALL' || c.level === filterLevel;
    return matchesSearch && matchesLevel;
  });

  return (
    <div className="space-y-4 relative">
      {/* Toast Notification */}
      {toastMsg && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-2xl shadow-2xl border flex items-center gap-2.5 text-xs font-bold animate-slide-down ${
          toastMsg.type === 'success' 
            ? 'bg-emerald-950/90 border-emerald-500/40 text-emerald-200 shadow-emerald-500/10' 
            : 'bg-rose-950/90 border-rose-500/40 text-rose-200 shadow-rose-500/10'
        }`}>
          {toastMsg.type === 'success' ? <Check className="w-4 h-4 text-emerald-400" /> : <ShieldAlert className="w-4 h-4 text-rose-400" />}
          <span>{toastMsg.text}</span>
        </div>
      )}

      {/* Top action bar */}
      <div className="bg-[#0F172A]/70 backdrop-blur-md p-4 rounded-2xl border border-slate-800/80 flex flex-col md:flex-row justify-between items-center gap-3">
        <div className="flex flex-wrap gap-2">
          {([
            { code: 'MEMBERS', label: 'Roster Pelanggan', icon: Users },
            { code: 'REWARDS', label: 'Reward Penukaran Poin', icon: Gift },
            { code: 'TIERS', label: 'Skema Cashback Level', icon: Award }
          ] as const).map((tab) => (
            <button
              key={tab.code}
              onClick={() => setActiveTab(tab.code)}
              className={`px-3.5 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
                activeTab === tab.code 
                  ? 'bg-emerald-500 text-slate-950 shadow-[0_0_12px_rgba(16,185,129,0.3)] font-black' 
                  : 'bg-slate-800/60 text-slate-400 hover:bg-slate-800 hover:text-slate-200 border border-slate-700/50'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        <div className="flex gap-2 shrink-0 w-full md:w-auto justify-end">
          {activeTab === 'MEMBERS' && (
            <button
              onClick={() => {
                resetForm();
                setAddModal(true);
              }}
              className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-black px-4 py-2.5 rounded-xl flex items-center gap-1.5 cursor-pointer shadow-[0_0_12px_rgba(16,185,129,0.2)] transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>Tambah Member Baru</span>
            </button>
          )}
          <button 
            onClick={fetchCustomers} 
            title="Refresh Data"
            className="bg-slate-800/80 hover:bg-slate-700 text-slate-300 p-2.5 rounded-xl border border-slate-700/50 cursor-pointer transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Main Grid Content */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 bg-[#0F172A]/70 backdrop-blur-md rounded-3xl border border-slate-800">
          <RefreshCw className="w-8 h-8 animate-spin text-emerald-500 mb-2" />
          <span className="text-xs text-slate-400 font-semibold">Memuat database CRM...</span>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* LEFT AREA: Depends on selected TAB (8 columns) */}
          <div className="lg:col-span-8 bg-[#0F172A]/70 backdrop-blur-md rounded-3xl p-5 border border-slate-800/60 shadow-xl space-y-4">
            
            {/* MEMBERS TAB */}
            {activeTab === 'MEMBERS' && (
              <div className="space-y-4">
                {/* Search & Filter Controls */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 pb-3 border-b border-slate-800/80">
                  <div className="relative flex-1 w-full sm:w-auto">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                    <input 
                      type="text"
                      placeholder="Cari nama, telepon, atau email..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full bg-slate-900/90 border border-slate-800 rounded-xl pl-9 pr-3.5 py-2 text-xs font-semibold text-slate-200 focus:outline-none focus:border-emerald-500 placeholder-slate-500"
                    />
                    {searchQuery && (
                      <button 
                        onClick={() => setSearchQuery('')}
                        className="absolute right-3 top-2.5 text-slate-500 hover:text-slate-300"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
                    <Filter className="w-3.5 h-3.5 text-slate-500 shrink-0 ml-1" />
                    {['ALL', 'Bronze', 'Silver', 'Gold', 'Platinum'].map((lvl) => (
                      <button
                        key={lvl}
                        onClick={() => setFilterLevel(lvl)}
                        className={`px-2.5 py-1 rounded-lg text-[10px] font-extrabold uppercase transition-all cursor-pointer shrink-0 border ${
                          filterLevel === lvl
                            ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
                            : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200'
                        }`}
                      >
                        {lvl === 'ALL' ? 'Semua Tier' : lvl}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Customers Table */}
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-900/80 text-slate-400 uppercase font-extrabold tracking-wider border-b border-slate-800">
                        <th className="p-3">Nama Pelanggan</th>
                        <th className="p-3">Kontak</th>
                        <th className="p-3">Poin Belanja</th>
                        <th className="p-3 text-center">Level Tier</th>
                        <th className="p-3 text-right">Opsi CRUD</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/50 font-semibold text-slate-300">
                      {filteredCustomers.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="py-12 text-center text-slate-500 italic">
                            Tidak ada data pelanggan yang sesuai kriteria pencarian.
                          </td>
                        </tr>
                      ) : (
                        filteredCustomers.map((c) => (
                          <tr 
                            key={c.id} 
                            className={`hover:bg-slate-800/40 transition-colors ${selectedCust?.id === c.id ? 'bg-emerald-500/5 border-l-2 border-emerald-500' : ''}`}
                          >
                            <td className="p-3">
                              <div className="flex items-center gap-2.5">
                                <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-emerald-400 text-xs font-black shrink-0">
                                  {c.name ? c.name[0].toUpperCase() : 'U'}
                                </div>
                                <div>
                                  <span className="font-bold text-slate-100 block">{c.name}</span>
                                  {c.joinDate && <span className="text-[10px] text-slate-500 font-mono">Gabung: {c.joinDate}</span>}
                                </div>
                              </div>
                            </td>
                            <td className="p-3 font-mono text-slate-400">
                              <div>{c.phone}</div>
                              {c.email && <div className="text-[10px] text-slate-500 font-sans">{c.email}</div>}
                            </td>
                            <td className="p-3 font-mono font-bold text-emerald-400">
                              <div className="flex items-center gap-1.5">
                                <span>{c.points} Pts</span>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    openPointsModal(c);
                                  }}
                                  title="Ubah / Tambah Poin"
                                  className="text-[9px] bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded border border-emerald-500/20 font-sans"
                                >
                                  + - Poin
                                </button>
                              </div>
                            </td>
                            <td className="p-3 text-center">
                              <span className={`px-2 py-0.5 rounded-full text-[9px] font-extrabold border uppercase tracking-wider ${getTierBadge(c.level)}`}>
                                {c.level}
                              </span>
                            </td>
                            <td className="p-3 text-right">
                              <div className="flex items-center justify-end gap-1">
                                <button
                                  onClick={() => setSelectedCust(c)}
                                  title="Lihat Profil Detail"
                                  className={`p-1.5 rounded-lg border transition-all cursor-pointer ${
                                    selectedCust?.id === c.id 
                                      ? 'bg-emerald-500 text-slate-950 border-emerald-400 font-bold' 
                                      : 'bg-slate-800 text-slate-300 hover:text-emerald-400 border-slate-700'
                                  }`}
                                >
                                  <ChevronRight className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => openEditModal(c)}
                                  title="Edit Pelanggan"
                                  className="p-1.5 text-amber-400 hover:text-amber-300 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/20 rounded-lg transition-all cursor-pointer"
                                >
                                  <Edit3 className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => confirmDelete(c)}
                                  title="Hapus Pelanggan"
                                  className="p-1.5 text-rose-400 hover:text-rose-300 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 rounded-lg transition-all cursor-pointer"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* REWARDS TAB */}
            {activeTab === 'REWARDS' && (
              <div className="space-y-4">
                <div className="pb-3 border-b border-slate-800/80">
                  <h3 className="text-sm font-bold text-slate-100">Katalog Reward Penukaran Poin</h3>
                  <p className="text-xs text-slate-400">Tukarkan poin belanja member dengan voucher & sajian spesial secara instan</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {rewardsList.map((r) => (
                    <div key={r.id} className="border border-slate-800/80 hover:border-emerald-500/30 bg-slate-900/40 p-4 rounded-2xl flex flex-col justify-between transition-all hover:shadow-[0_0_12px_rgba(16,185,129,0.05)]">
                      <div>
                        <div className="flex justify-between items-start mb-2">
                          <span className="text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-extrabold px-2 py-0.5 rounded font-mono uppercase">
                            {r.cost} POIN
                          </span>
                        </div>
                        <h4 className="text-xs font-bold text-slate-200">{r.name}</h4>
                        <p className="text-[10px] text-slate-400 mt-1 leading-relaxed">{r.description}</p>
                      </div>

                      {/* If a customer is selected on CRM, show instant redeem */}
                      {selectedCust ? (
                        <button
                          onClick={() => redeemPoints(selectedCust.id, r.name, r.cost)}
                          disabled={selectedCust.points < r.cost}
                          className="mt-4 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-30 disabled:hover:bg-emerald-500 text-slate-950 text-[10px] font-black py-2.5 rounded-xl flex items-center justify-center gap-1 cursor-pointer transition-all shadow-md"
                        >
                          <Gift className="w-3.5 h-3.5" />
                          <span>Tukarkan Poin untuk {selectedCust.name} ({selectedCust.points} Pts)</span>
                        </button>
                      ) : (
                        <p className="text-[9px] text-slate-500 italic text-center mt-4">Pilih member di roster kiri untuk melakukan tukar poin</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* TIERS TAB */}
            {activeTab === 'TIERS' && (
              <div className="space-y-4">
                <div className="pb-3 border-b border-slate-800/80">
                  <h3 className="text-sm font-bold text-slate-100">Aturan Akumulasi Level Tier</h3>
                  <p className="text-xs text-slate-400">Sistem otomatis menaikkan level pelanggan sesuai total akumulasi poin belanja</p>
                </div>

                <div className="space-y-3">
                  {[
                    { tier: 'Bronze', threshold: '0 - 150 Poin', multiplier: '1.0x Point', bonus: 'Cashback 2%', color: 'Bronze' },
                    { tier: 'Silver', threshold: '151 - 500 Poin', multiplier: '1.2x Point', bonus: 'Cashback 4% + Prioritas Meja', color: 'Silver' },
                    { tier: 'Gold', threshold: '501 - 1500 Poin', multiplier: '1.5x Point', bonus: 'Cashback 6% + Free Minuman Es', color: 'Gold' },
                    { tier: 'Platinum', threshold: '1501+ Poin', multiplier: '2.0x Point', bonus: 'Cashback 10% + Free 1 Pcs Frozen Food', color: 'Platinum' }
                  ].map((t) => (
                    <div key={t.tier} className="flex flex-col md:flex-row justify-between items-start md:items-center p-3.5 bg-slate-900/50 rounded-2xl border border-slate-800/80 gap-2">
                      <div className="flex items-center gap-3">
                        <span className={`px-3 py-1 rounded-full text-xs font-black tracking-wider border ${getTierBadge(t.tier)}`}>
                          {t.tier}
                        </span>
                        <span className="text-xs text-slate-400 font-semibold font-mono">Milestone: {t.threshold}</span>
                      </div>

                      <div className="flex gap-2 text-[10px] font-bold">
                        <span className="bg-slate-800 text-slate-300 px-2.5 py-0.5 rounded-md border border-slate-700/55">{t.multiplier}</span>
                        <span className="bg-emerald-500/10 text-emerald-400 px-2.5 py-0.5 rounded-md border border-emerald-500/20">{t.bonus}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

          </div>

          {/* RIGHT AREA: Member Detail & Actions Panel (4 columns) */}
          <div className="lg:col-span-4 bg-[#0F172A]/70 backdrop-blur-md rounded-3xl p-5 border border-slate-800/60 shadow-xl flex flex-col justify-between min-h-[380px]">
            {selectedCust ? (
              <div className="space-y-4">
                <div className="text-center pb-3 border-b border-slate-800/80 relative">
                  <div className="w-14 h-14 rounded-full bg-gradient-to-tr from-emerald-500 to-teal-400 text-slate-950 mx-auto mb-2 flex items-center justify-center font-black text-lg shadow-[0_0_16px_rgba(16,185,129,0.3)]">
                    {selectedCust.name ? selectedCust.name[0].toUpperCase() : 'U'}
                  </div>
                  <h4 className="text-sm font-bold text-slate-100">{selectedCust.name}</h4>
                  <div className="flex items-center justify-center gap-2 mt-1">
                    <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-extrabold border uppercase tracking-wider ${getTierBadge(selectedCust.level)}`}>
                      {selectedCust.level} Member
                    </span>
                  </div>
                </div>

                <div className="space-y-3 text-xs bg-slate-900/50 p-3.5 rounded-2xl border border-slate-800/80">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400 flex items-center gap-1.5"><Phone className="w-3.5 h-3.5 text-slate-500" /> WhatsApp:</span>
                    <span className="font-mono text-slate-100 font-bold">{selectedCust.phone}</span>
                  </div>
                  {selectedCust.email && (
                    <div className="flex justify-between items-center">
                      <span className="text-slate-400 flex items-center gap-1.5"><Mail className="w-3.5 h-3.5 text-slate-500" /> Email:</span>
                      <span className="text-slate-200 font-semibold truncate max-w-[140px]">{selectedCust.email}</span>
                    </div>
                  )}
                  <div className="flex justify-between items-center pt-2 border-t border-slate-800">
                    <span className="text-slate-400">Total Poin:</span>
                    <span className="font-mono text-emerald-400 font-black text-base">{selectedCust.points} Pts</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400">Estimasi Value:</span>
                    <span className="font-mono text-slate-300 font-bold">Rp {(selectedCust.points * 100).toLocaleString('id-ID')}</span>
                  </div>
                </div>

                {/* Quick CRUD Action buttons inside detail panel */}
                <div className="grid grid-cols-3 gap-2">
                  <button
                    onClick={() => openPointsModal(selectedCust)}
                    className="bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 text-[10px] font-bold py-2 rounded-xl flex items-center justify-center gap-1 cursor-pointer transition-all"
                  >
                    <PlusCircle className="w-3.5 h-3.5" />
                    <span>Point</span>
                  </button>

                  <button
                    onClick={() => openEditModal(selectedCust)}
                    className="bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/20 text-[10px] font-bold py-2 rounded-xl flex items-center justify-center gap-1 cursor-pointer transition-all"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>Edit</span>
                  </button>

                  <button
                    onClick={() => confirmDelete(selectedCust)}
                    className="bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 text-[10px] font-bold py-2 rounded-xl flex items-center justify-center gap-1 cursor-pointer transition-all"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Hapus</span>
                  </button>
                </div>

                {/* Simulated Point history */}
                <div className="pt-2">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-2">Aktivitas Terakhir</span>
                  <div className="space-y-1.5 text-[10px] font-semibold text-slate-400 max-h-24 overflow-y-auto pr-1">
                    <div className="flex justify-between p-2 bg-slate-900/50 border border-slate-800/50 rounded-lg">
                      <span>Transaksi Kasir POS</span>
                      <span className="text-emerald-400 font-mono">+12 Pts</span>
                    </div>
                    <div className="flex justify-between p-2 bg-slate-900/50 border border-slate-800/50 rounded-lg">
                      <span>Bonus Registrasi</span>
                      <span className="text-emerald-400 font-mono">+10 Pts</span>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center text-center h-full text-slate-500 py-12 space-y-2">
                <Users className="w-10 h-10 text-slate-700" />
                <p className="text-xs font-bold text-slate-400">Belum Ada Pelanggan Terpilih</p>
                <p className="text-[10px] text-slate-600 max-w-[200px]">Pilih salah satu member di tabel untuk melihat detail, ubah poin, atau edit informasi.</p>
              </div>
            )}

            {selectedCust && (
              <button
                onClick={() => setSelectedCust(null)}
                className="mt-4 w-full bg-slate-850 hover:bg-slate-800 text-slate-400 border border-slate-750 font-bold text-xs py-2 rounded-xl cursor-pointer transition-colors"
              >
                Tutup Ringkasan Profile
              </button>
            )}
          </div>

        </div>
      )}

      {/* MODAL 1: Add New Member Form */}
      {addModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-fade-in">
          <form onSubmit={handleAddSubmit} className="bg-[#0F172A] border border-slate-800 text-slate-200 rounded-3xl max-w-sm w-full p-6 shadow-2xl relative">
            <div className="flex justify-between items-center mb-4 pb-2 border-b border-slate-800">
              <h3 className="text-sm font-black text-slate-100">Tambah Pelanggan CRM Baru</h3>
              <button 
                type="button" 
                onClick={() => setAddModal(false)}
                className="text-slate-400 hover:text-slate-200 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3.5 text-xs">
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Nama Lengkap *</label>
                <input 
                  type="text" 
                  required
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Contoh: Muhammad Yusuf"
                  className="w-full bg-[#1E293B] border border-slate-800 rounded-xl px-3.5 py-2.5 text-slate-100 font-bold focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Nomor Telepon / WA *</label>
                <input 
                  type="text" 
                  required
                  value={formData.phone}
                  onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                  placeholder="Contoh: 085342016403"
                  className="w-full bg-[#1E293B] border border-slate-800 rounded-xl px-3.5 py-2.5 text-slate-100 font-mono font-bold focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Email (Opsional)</label>
                <input 
                  type="email" 
                  value={formData.email}
                  onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                  placeholder="Contoh: yusuf@gmail.com"
                  className="w-full bg-[#1E293B] border border-slate-800 rounded-xl px-3.5 py-2.5 text-slate-100 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Awal Poin</label>
                  <input 
                    type="number" 
                    min="0"
                    value={formData.points}
                    onChange={(e) => setFormData(prev => ({ ...prev, points: Number(e.target.value) || 0 }))}
                    className="w-full bg-[#1E293B] border border-slate-800 rounded-xl px-3 py-2.5 font-mono font-bold text-emerald-400 focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Level Tier</label>
                  <select
                    value={formData.level}
                    onChange={(e) => setFormData(prev => ({ ...prev, level: e.target.value as any }))}
                    className="w-full bg-[#1E293B] border border-slate-800 rounded-xl px-2 py-2.5 font-bold text-slate-200 focus:outline-none focus:border-emerald-500"
                  >
                    <option value="Bronze">Bronze</option>
                    <option value="Silver">Silver</option>
                    <option value="Gold">Gold</option>
                    <option value="Platinum">Platinum</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-slate-800 flex gap-2">
              <button 
                type="button" 
                onClick={() => setAddModal(false)}
                className="bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs px-4 py-3 rounded-xl flex-1 cursor-pointer transition-colors"
              >
                Batal
              </button>
              <button 
                type="submit"
                className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs px-5 py-3 rounded-xl flex-1 cursor-pointer transition-colors shadow-md"
              >
                Simpan
              </button>
            </div>
          </form>
        </div>
      )}

      {/* MODAL 2: Edit Member Form */}
      {editModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-fade-in">
          <form onSubmit={handleEditSubmit} className="bg-[#0F172A] border border-slate-800 text-slate-200 rounded-3xl max-w-sm w-full p-6 shadow-2xl relative">
            <div className="flex justify-between items-center mb-4 pb-2 border-b border-slate-800">
              <h3 className="text-sm font-black text-amber-400 flex items-center gap-1.5">
                <Edit3 className="w-4 h-4" /> Edit Informasi Pelanggan
              </h3>
              <button 
                type="button" 
                onClick={() => setEditModal(false)}
                className="text-slate-400 hover:text-slate-200 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3.5 text-xs">
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Nama Lengkap *</label>
                <input 
                  type="text" 
                  required
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full bg-[#1E293B] border border-slate-800 rounded-xl px-3.5 py-2.5 text-slate-100 font-bold focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Nomor Telepon / WA *</label>
                <input 
                  type="text" 
                  required
                  value={formData.phone}
                  onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                  className="w-full bg-[#1E293B] border border-slate-800 rounded-xl px-3.5 py-2.5 text-slate-100 font-mono font-bold focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Email</label>
                <input 
                  type="email" 
                  value={formData.email}
                  onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                  className="w-full bg-[#1E293B] border border-slate-800 rounded-xl px-3.5 py-2.5 text-slate-100 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Jumlah Poin</label>
                  <input 
                    type="number" 
                    min="0"
                    value={formData.points}
                    onChange={(e) => setFormData(prev => ({ ...prev, points: Number(e.target.value) || 0 }))}
                    className="w-full bg-[#1E293B] border border-slate-800 rounded-xl px-3 py-2.5 font-mono font-bold text-emerald-400 focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Level Tier</label>
                  <select
                    value={formData.level}
                    onChange={(e) => setFormData(prev => ({ ...prev, level: e.target.value as any }))}
                    className="w-full bg-[#1E293B] border border-slate-800 rounded-xl px-2 py-2.5 font-bold text-slate-200 focus:outline-none focus:border-amber-500"
                  >
                    <option value="Bronze">Bronze</option>
                    <option value="Silver">Silver</option>
                    <option value="Gold">Gold</option>
                    <option value="Platinum">Platinum</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-slate-800 flex gap-2">
              <button 
                type="button" 
                onClick={() => setEditModal(false)}
                className="bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs px-4 py-3 rounded-xl flex-1 cursor-pointer transition-colors"
              >
                Batal
              </button>
              <button 
                type="submit"
                className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs px-5 py-3 rounded-xl flex-1 cursor-pointer transition-colors shadow-md"
              >
                Simpan Perubahan
              </button>
            </div>
          </form>
        </div>
      )}

      {/* MODAL 3: Delete Confirmation Modal */}
      {deleteModal && custToDelete && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-[#0F172A] border border-rose-500/30 text-slate-200 rounded-3xl max-w-sm w-full p-6 shadow-2xl relative text-center">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center mx-auto mb-3">
              <Trash2 className="w-6 h-6" />
            </div>

            <h3 className="text-sm font-black text-slate-100">Konfirmasi Hapus Member</h3>
            <p className="text-xs text-slate-400 mt-2 leading-relaxed">
              Apakah Anda yakin ingin menghapus pelanggan <strong className="text-rose-400">{custToDelete.name}</strong> ({custToDelete.phone})?
            </p>

            <div className="mt-6 pt-4 border-t border-slate-800 flex gap-2">
              <button 
                type="button" 
                onClick={() => {
                  setDeleteModal(false);
                  setCustToDelete(null);
                }}
                className="bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs px-4 py-3 rounded-xl flex-1 cursor-pointer transition-colors"
              >
                Batal
              </button>
              <button 
                type="button"
                onClick={handleDeleteSubmit}
                className="bg-rose-500 hover:bg-rose-600 text-white font-black text-xs px-5 py-3 rounded-xl flex-1 cursor-pointer transition-colors shadow-md shadow-rose-500/20"
              >
                Ya, Hapus
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 4: Manual Points Adjustment Modal */}
      {pointsModal && custToAdjust && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-[#0F172A] border border-slate-800 text-slate-200 rounded-3xl max-w-sm w-full p-6 shadow-2xl relative">
            <div className="flex justify-between items-center mb-3 pb-2 border-b border-slate-800">
              <h3 className="text-sm font-black text-slate-100 flex items-center gap-1.5">
                <Gift className="w-4 h-4 text-emerald-400" /> Kelola Poin Loyalitas
              </h3>
              <button 
                type="button" 
                onClick={() => {
                  setPointsModal(false);
                  setCustToAdjust(null);
                }}
                className="text-slate-400 hover:text-slate-200 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="bg-slate-900 p-3 rounded-2xl border border-slate-800 text-xs mb-4">
              <div className="text-slate-400">Member: <strong className="text-slate-100">{custToAdjust.name}</strong></div>
              <div className="text-slate-400 mt-0.5">Poin Saat Ini: <strong className="text-emerald-400 font-mono text-sm">{custToAdjust.points} Pts</strong></div>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Jumlah Poin Penyesuaian</label>
                <div className="flex gap-2">
                  {[10, 25, 50, 100].map(val => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => setPointDelta(val)}
                      className={`flex-1 py-1.5 rounded-lg font-mono font-bold text-xs border transition-all ${
                        pointDelta === val ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40' : 'bg-slate-900 text-slate-400 border-slate-800'
                      }`}
                    >
                      +{val}
                    </button>
                  ))}
                </div>
                <input 
                  type="number" 
                  min="1"
                  value={pointDelta}
                  onChange={(e) => setPointDelta(Math.max(1, Number(e.target.value) || 0))}
                  className="w-full mt-2 bg-[#1E293B] border border-slate-800 rounded-xl px-3.5 py-2 text-slate-100 font-mono font-bold focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Catatan Alasan</label>
                <input 
                  type="text" 
                  value={pointReason}
                  onChange={(e) => setPointReason(e.target.value)}
                  placeholder="Misal: Bonus Ulang Tahun / Penyesuaian"
                  className="w-full bg-[#1E293B] border border-slate-800 rounded-xl px-3.5 py-2 text-slate-100 focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-slate-800 flex gap-2">
              <button 
                type="button" 
                onClick={() => handleAdjustPointsSubmit(false)}
                className="bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/30 font-bold text-xs px-3 py-3 rounded-xl flex-1 cursor-pointer transition-colors flex items-center justify-center gap-1"
              >
                <MinusCircle className="w-3.5 h-3.5" />
                <span>Kurangi Poin</span>
              </button>
              <button 
                type="button"
                onClick={() => handleAdjustPointsSubmit(true)}
                className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs px-3 py-3 rounded-xl flex-1 cursor-pointer transition-colors shadow-md flex items-center justify-center gap-1"
              >
                <PlusCircle className="w-3.5 h-3.5" />
                <span>Tambah Poin</span>
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

