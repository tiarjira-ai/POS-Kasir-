import React, { useState, useEffect } from 'react';
import { 
  Users, Gift, Award, Plus, RefreshCw, UserCheck, 
  ChevronRight, Sparkles, Send, Percent, Calendar 
} from 'lucide-react';
import { Customer } from '../types';

export default function CRMLoyalty() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'MEMBERS' | 'REWARDS' | 'TIERS'>('MEMBERS');

  // New Customer State
  const [addModal, setAddModal] = useState(false);
  const [formData, setFormData] = useState({ name: '', phone: '', email: '', level: 'Bronze' as any });

  // Selected customer details
  const [selectedCust, setSelectedCust] = useState<Customer | null>(null);

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
      }
    } catch (err) {
      console.error('Error fetching CRM customers:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/v1/customers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      if (res.ok) {
        setAddModal(false);
        setFormData({ name: '', phone: '', email: '', level: 'Bronze' });
        fetchCustomers();
      }
    } catch (err) {
      console.error('Error adding customer:', err);
    }
  };

  const redeemPoints = async (customerId: string, rewardName: string, costPoints: number) => {
    const cust = customers.find(c => c.id === customerId);
    if (!cust) return;
    if (cust.points < costPoints) {
      alert('Poin tidak mencukupi untuk melakukan penukaran reward ini!');
      return;
    }

    try {
      const res = await fetch(`/api/v1/customers/${customerId}/redeem`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rewardName, costPoints }),
      });
      if (res.ok) {
        alert(`Berhasil menukarkan poin untuk ${rewardName}! Kupon diskon telah ditambahkan ke profil member.`);
        fetchCustomers();
        // Update selection if active
        if (selectedCust?.id === customerId) {
          setSelectedCust(prev => prev ? { ...prev, points: prev.points - costPoints } : null);
        }
      }
    } catch (err) {
      console.error('Error redeeming points:', err);
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

  return (
    <div className="space-y-4">
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

        <div className="flex gap-2 shrink-0">
          {activeTab === 'MEMBERS' && (
            <button
              onClick={() => setAddModal(true)}
              className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold px-3.5 py-2.5 rounded-xl flex items-center gap-1.5 cursor-pointer shadow-[0_0_12px_rgba(16,185,129,0.2)] transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>Tambah Member</span>
            </button>
          )}
          <button 
            onClick={fetchCustomers} 
            className="bg-slate-800/80 hover:bg-slate-700 text-slate-300 p-2.5 rounded-xl border border-slate-700/50 cursor-pointer transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Grid Content */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 bg-[#0F172A]/70 backdrop-blur-md rounded-3xl border border-slate-800">
          <RefreshCw className="w-8 h-8 animate-spin text-emerald-500" />
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* LEFT AREA: Depends on selected TAB (8 columns) */}
          <div className="lg:col-span-8 bg-[#0F172A]/70 backdrop-blur-md rounded-3xl p-5 border border-slate-800/60 shadow-xl">
            
            {/* MEMBERS TAB */}
            {activeTab === 'MEMBERS' && (
              <div className="space-y-4">
                <div className="flex justify-between items-center pb-3 border-b border-slate-800/80">
                  <h3 className="text-sm font-bold text-slate-100">Daftar Member Loyalitas CRM</h3>
                  <span className="text-xs text-slate-400">Pilih salah satu member untuk melihat poin & voucher</span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-900/60 text-slate-400 uppercase font-extrabold tracking-wider border-b border-slate-800">
                        <th className="p-3">Nama Lengkap</th>
                        <th className="p-3">Telepon / Kontak</th>
                        <th className="p-3">Poin Saat Ini</th>
                        <th className="p-3 text-center">Level Tier</th>
                        <th className="p-3 text-right">Detail</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/50 font-semibold text-slate-300">
                      {customers.map((c) => (
                        <tr key={c.id} className="hover:bg-slate-800/30 transition-colors">
                          <td className="p-3 flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-750 flex items-center justify-center text-slate-300 text-xs font-black">
                              {c.name[0]}
                            </div>
                            <div>
                              <span className="font-bold text-slate-100 block">{c.name}</span>
                              <span className="text-[10px] text-slate-500 font-mono">ID: {c.id}</span>
                            </div>
                          </td>
                          <td className="p-3 font-mono text-slate-400">{c.phone}</td>
                          <td className="p-3 font-mono font-bold text-emerald-400">{c.points} Pts</td>
                          <td className="p-3 text-center">
                            <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-extrabold border uppercase tracking-wider ${getTierBadge(c.level)}`}>
                              {c.level}
                            </span>
                          </td>
                          <td className="p-3 text-right">
                            <button
                              onClick={() => setSelectedCust(c)}
                              className="p-1.5 text-slate-400 hover:text-emerald-400 bg-slate-800 hover:bg-slate-750 border border-slate-700/60 rounded-lg transition-all cursor-pointer"
                            >
                              <ChevronRight className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* REWARDS TAB */}
            {activeTab === 'REWARDS' && (
              <div className="space-y-4">
                <div className="pb-3 border-b border-slate-800/80">
                  <h3 className="text-sm font-bold text-slate-100">Skema Katalog Reward Poin</h3>
                  <p className="text-xs text-slate-400">Konversikan akumulasi poin belanja member menjadi voucher & sajian gratis</p>
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
                          className="mt-4 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-30 disabled:hover:bg-emerald-500 text-slate-950 text-[10px] font-black py-2.5 rounded-xl flex items-center justify-center gap-1 cursor-pointer transition-all"
                        >
                          <Gift className="w-3.5 h-3.5" />
                          <span>Tukarkan Poin untuk {selectedCust.name}</span>
                        </button>
                      ) : (
                        <p className="text-[9px] text-slate-500 italic text-center mt-4">Pilih member di tab roster untuk klaim instan</p>
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
                  <h3 className="text-sm font-bold text-slate-100">Aturan Akumulasi & Cashback Level</h3>
                  <p className="text-xs text-slate-400">Atur bonus poin belanja berdasarkan level keanggotaan pelanggan</p>
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

          {/* RIGHT AREA: Member Detail Card (4 columns) */}
          <div className="lg:col-span-4 bg-[#0F172A]/70 backdrop-blur-md rounded-3xl p-5 border border-slate-800/60 shadow-xl flex flex-col justify-between min-h-[350px]">
            {selectedCust ? (
              <div className="space-y-4">
                <div className="text-center pb-3 border-b border-slate-800/80">
                  <div className="w-12 h-12 rounded-full bg-emerald-500 text-slate-950 mx-auto mb-2 flex items-center justify-center font-black text-sm shadow-[0_0_12px_rgba(16,185,129,0.3)]">
                    {selectedCust.name[0]}
                  </div>
                  <h4 className="text-sm font-bold text-slate-150">{selectedCust.name}</h4>
                  <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-extrabold border inline-block mt-1 uppercase tracking-wider ${getTierBadge(selectedCust.level)}`}>
                    {selectedCust.level} Member
                  </span>
                </div>

                <div className="space-y-3.5 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Kontak Telepon:</span>
                    <span className="font-mono text-slate-200 font-bold">{selectedCust.phone}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Total Poin:</span>
                    <span className="font-mono text-emerald-400 font-black text-sm">{selectedCust.points} Pts</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Estimasi Cashback:</span>
                    <span className="font-mono text-slate-200 font-bold">Rp {(selectedCust.points * 100).toLocaleString('id-ID')}</span>
                  </div>
                </div>

                {/* Simulated Point history */}
                <div className="pt-3 border-t border-slate-800/80">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-2">Riwayat Transaksi Poin</span>
                  <div className="space-y-2 text-[10px] font-semibold text-slate-400 max-h-28 overflow-y-auto pr-1">
                    <div className="flex justify-between p-2 bg-slate-900/50 border border-slate-800/50 rounded-lg">
                      <span>Order #POS-102030</span>
                      <span className="text-emerald-400 font-mono">+12 Pts</span>
                    </div>
                    <div className="flex justify-between p-2 bg-slate-900/50 border border-slate-800/50 rounded-lg">
                      <span>Order #POS-099401</span>
                      <span className="text-emerald-400 font-mono">+8 Pts</span>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center text-center h-full text-slate-500 py-12">
                <Users className="w-10 h-10 text-slate-700 mb-2" />
                <p className="text-xs">Belum ada member terpilih</p>
                <p className="text-[10px] text-slate-600 mt-1">Pilih member di roster kiri untuk mengelola penukaran reward</p>
              </div>
            )}

            {selectedCust && (
              <button
                onClick={() => setSelectedCust(null)}
                className="mt-6 w-full bg-slate-850 hover:bg-slate-800 text-slate-300 border border-slate-750 font-bold text-xs py-2.5 rounded-xl cursor-pointer transition-colors"
              >
                Tutup Profil
              </button>
            )}
          </div>

        </div>
      )}

      {/* MODAL: Add New Member Form */}
      {addModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-fade-in">
          <form onSubmit={handleAddSubmit} className="bg-[#0F172A] border border-slate-800 text-slate-200 rounded-3xl max-w-sm w-full p-6 shadow-2xl relative animate-scale-in">
            <h3 className="text-sm font-black text-slate-100 mb-4">Pendaftaran Member Baru</h3>

            <div className="space-y-4 text-xs">
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Nama Lengkap Pelanggan</label>
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
                <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Nomor Telepon / WhatsApp</label>
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
                <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Alamat Email</label>
                <input 
                  type="email" 
                  value={formData.email}
                  onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                  placeholder="Contoh: yusuf@gmail.com"
                  className="w-full bg-[#1E293B] border border-slate-800 rounded-xl px-3.5 py-2.5 text-slate-100 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Tingkatan Level</label>
                <select
                  value={formData.level}
                  onChange={(e) => setFormData(prev => ({ ...prev, level: e.target.value as any }))}
                  className="w-full bg-[#1E293B] border border-slate-800 rounded-xl px-3 py-2.5 font-bold text-slate-200 focus:outline-none focus:border-emerald-500"
                >
                  <option value="Bronze" className="bg-[#0F172A]">Bronze (Member Baru)</option>
                  <option value="Silver" className="bg-[#0F172A]">Silver</option>
                  <option value="Gold" className="bg-[#0F172A]">Gold</option>
                  <option value="Platinum" className="bg-[#0F172A]">Platinum</option>
                </select>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-slate-800/85 flex gap-2">
              <button 
                type="button" 
                onClick={() => setAddModal(false)}
                className="bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs px-4 py-3.5 rounded-xl flex-1 cursor-pointer transition-colors"
              >
                Batal
              </button>
              <button 
                type="submit"
                className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs px-5 py-3.5 rounded-xl flex-1 shadow-[0_0_12px_rgba(16,185,129,0.25)] cursor-pointer transition-colors"
              >
                Simpan Member
              </button>
            </div>
          </form>
        </div>
      )}

    </div>
  );
}
