import React, { useState, useEffect } from 'react';
import { 
  MapPin, Phone, Power, Edit, Trash2, Plus, RefreshCw, 
  Store, ShieldCheck, CheckCircle2, X, Search, Check, AlertTriangle
} from 'lucide-react';
import { Outlet } from '../types';

export default function OutletManagement() {
  const [outlets, setOutlets] = useState<Outlet[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  
  // Form states
  const [formData, setFormData] = useState({
    name: '',
    address: '',
    phone: '',
    status: 'OPEN' as 'OPEN' | 'CLOSED'
  });
  const [selectedOutlet, setSelectedOutlet] = useState<Outlet | null>(null);
  
  // Notification states
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    fetchOutlets();
  }, []);

  const fetchOutlets = async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const res = await fetch('/api/v1/outlets');
      if (res.ok) {
        const data = await res.json();
        setOutlets(data || []);
      } else {
        setErrorMsg('Gagal memuat data cabang outlet.');
      }
    } catch (err) {
      console.error('Error fetching outlets:', err);
      setErrorMsg('Kesalahan koneksi saat mengambil data outlet.');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenAddModal = () => {
    setFormData({
      name: '',
      address: '',
      phone: '',
      status: 'OPEN'
    });
    setErrorMsg('');
    setIsAddModalOpen(true);
  };

  const handleOpenEditModal = (outlet: Outlet) => {
    setSelectedOutlet(outlet);
    setFormData({
      name: outlet.name,
      address: outlet.address,
      phone: outlet.phone,
      status: outlet.status
    });
    setErrorMsg('');
    setIsEditModalOpen(true);
  };

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.address.trim() || !formData.phone.trim()) {
      setErrorMsg('Semua bidang isian wajib diisi!');
      return;
    }

    try {
      const res = await fetch('/api/v1/outlets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      
      if (res.ok) {
        setSuccessMsg('Cabang outlet baru berhasil ditambahkan!');
        setIsAddModalOpen(false);
        fetchOutlets();
        setTimeout(() => setSuccessMsg(''), 3000);
      } else {
        setErrorMsg('Gagal menambahkan cabang outlet baru.');
      }
    } catch (err) {
      console.error('Error adding outlet:', err);
      setErrorMsg('Kesalahan koneksi saat mendaftarkan outlet baru.');
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOutlet) return;
    if (!formData.name.trim() || !formData.address.trim() || !formData.phone.trim()) {
      setErrorMsg('Semua bidang isian wajib diisi!');
      return;
    }

    try {
      const res = await fetch(`/api/v1/outlets/${selectedOutlet.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      
      if (res.ok) {
        setSuccessMsg(`Data outlet "${formData.name}" berhasil diperbarui!`);
        setIsEditModalOpen(false);
        setSelectedOutlet(null);
        fetchOutlets();
        setTimeout(() => setSuccessMsg(''), 3000);
      } else {
        setErrorMsg('Gagal memperbarui data outlet.');
      }
    } catch (err) {
      console.error('Error updating outlet:', err);
      setErrorMsg('Kesalahan koneksi saat memperbarui data outlet.');
    }
  };

  const handleDeleteOutlet = async (id: string, name: string) => {
    if (!confirm(`Apakah Anda yakin ingin menghapus cabang "${name}"? Tindakan ini tidak dapat dibatalkan.`)) {
      return;
    }

    try {
      const res = await fetch(`/api/v1/outlets/${id}`, {
        method: 'DELETE'
      });
      
      if (res.ok) {
        setSuccessMsg(`Cabang "${name}" berhasil dihapus.`);
        fetchOutlets();
        setTimeout(() => setSuccessMsg(''), 3000);
      } else {
        setErrorMsg('Gagal menghapus cabang outlet.');
      }
    } catch (err) {
      console.error('Error deleting outlet:', err);
      setErrorMsg('Kesalahan koneksi saat menghapus outlet.');
    }
  };

  const handleToggleStatus = async (outlet: Outlet) => {
    const newStatus = outlet.status === 'OPEN' ? 'CLOSED' : 'OPEN';
    try {
      const res = await fetch(`/api/v1/outlets/${outlet.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...outlet, status: newStatus })
      });
      
      if (res.ok) {
        setSuccessMsg(`Status outlet "${outlet.name}" diubah menjadi ${newStatus}.`);
        fetchOutlets();
        setTimeout(() => setSuccessMsg(''), 3000);
      } else {
        setErrorMsg('Gagal merubah status operasional outlet.');
      }
    } catch (err) {
      console.error('Error toggling outlet status:', err);
      setErrorMsg('Kesalahan koneksi saat merubah status outlet.');
    }
  };

  const filteredOutlets = (outlets || []).filter(o => 
    o.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    o.address.toLowerCase().includes(searchTerm.toLowerCase()) ||
    o.phone.includes(searchTerm)
  );

  const totalOutlets = outlets.length;
  const activeOutlets = outlets.filter(o => o.status === 'OPEN').length;
  const inactiveOutlets = outlets.filter(o => o.status === 'CLOSED').length;

  return (
    <div className="space-y-6">
      
      {/* Upper Dashboard Banner / Stats Grid */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <span className="text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-extrabold px-2 py-0.5 rounded uppercase tracking-wider font-mono">
            Sistem Multi-Outlet Terintegrasi
          </span>
          <h2 className="text-xl md:text-2xl font-black text-white mt-1.5 flex items-center gap-2">
            <Store className="w-6 h-6 text-emerald-400" /> Manajemen Cabang & Outlet
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Pantau operasional, kelola data, dan buka cabang baru dalam satu dasbor pusat.
          </p>
        </div>

        <div className="flex flex-wrap gap-2 shrink-0">
          <button 
            onClick={fetchOutlets}
            disabled={loading}
            className="bg-slate-900/60 hover:bg-slate-800 border border-slate-800 text-slate-300 p-2.5 rounded-xl flex items-center gap-2 text-xs font-black transition-all cursor-pointer"
            title="Muat Ulang"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            <span>Segarkan</span>
          </button>
          
          <button 
            onClick={handleOpenAddModal}
            className="bg-emerald-500 hover:bg-emerald-600 text-slate-950 px-4 py-2.5 rounded-xl flex items-center gap-2 text-xs font-black shadow-lg shadow-emerald-500/10 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>Buka Cabang Baru</span>
          </button>
        </div>
      </div>

      {/* Analytics Bento Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 bg-slate-900/50 border border-slate-800/80 rounded-2xl flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-slate-800 flex items-center justify-center text-slate-300">
            <Store className="w-6 h-6 text-emerald-400" />
          </div>
          <div>
            <span className="text-[10px] text-slate-500 font-extrabold uppercase tracking-wider font-mono block">Total Cabang</span>
            <span className="text-2xl font-black text-white leading-none mt-0.5 block">{totalOutlets}</span>
          </div>
        </div>

        <div className="p-4 bg-slate-900/50 border border-slate-800/80 rounded-2xl flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-400">
            <CheckCircle2 className="w-6 h-6 text-emerald-400" />
          </div>
          <div>
            <span className="text-[10px] text-slate-500 font-extrabold uppercase tracking-wider font-mono block">Cabang Aktif (Buka)</span>
            <span className="text-2xl font-black text-emerald-400 leading-none mt-0.5 block">{activeOutlets}</span>
          </div>
        </div>

        <div className="p-4 bg-slate-900/50 border border-slate-800/80 rounded-2xl flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-400">
            <Power className="w-6 h-6 text-amber-400" />
          </div>
          <div>
            <span className="text-[10px] text-slate-500 font-extrabold uppercase tracking-wider font-mono block">Cabang Tutup Sementara</span>
            <span className="text-2xl font-black text-amber-400 leading-none mt-0.5 block">{inactiveOutlets}</span>
          </div>
        </div>
      </div>

      {/* Success and Error Banners */}
      {successMsg && (
        <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-center gap-3 text-emerald-400 text-xs font-bold font-mono">
          <Check className="w-4 h-4 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}
      {errorMsg && (
        <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-3 text-red-400 text-xs font-bold font-mono">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Filter / Search Bar */}
      <div className="bg-slate-900/30 p-3.5 border border-slate-800/80 rounded-2xl flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative w-full sm:max-w-md">
          <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-500">
            <Search className="w-4 h-4" />
          </span>
          <input 
            type="text" 
            placeholder="Cari cabang berdasarkan nama, alamat, atau kontak..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-4 py-2 text-xs font-bold text-slate-300 placeholder-slate-600 focus:outline-none focus:border-emerald-500"
          />
        </div>
        <div className="text-[10px] text-slate-500 font-bold font-mono text-right shrink-0 w-full sm:w-auto">
          Menampilkan <span className="text-slate-300">{filteredOutlets.length}</span> dari <span className="text-slate-300">{totalOutlets}</span> cabang
        </div>
      </div>

      {/* Outlets List Grid */}
      {loading && filteredOutlets.length === 0 ? (
        <div className="p-12 text-center bg-slate-900/20 border border-slate-800/40 rounded-2xl flex flex-col items-center justify-center gap-3">
          <RefreshCw className="w-8 h-8 text-slate-600 animate-spin" />
          <p className="text-slate-500 text-xs font-black">Mengambil data cabang dari server pusat...</p>
        </div>
      ) : filteredOutlets.length === 0 ? (
        <div className="p-12 text-center bg-slate-900/20 border border-slate-800/40 rounded-2xl flex flex-col items-center justify-center gap-2">
          <Store className="w-10 h-10 text-slate-600" />
          <p className="text-slate-400 text-sm font-black mt-2">Tidak Ada Cabang Outlet Ditemukan</p>
          <p className="text-slate-500 text-xs max-w-sm mt-0.5">Silakan tambahkan cabang baru atau ubah kata kunci pencarian Anda.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredOutlets.map((outlet) => {
            const isOpen = outlet.status === 'OPEN';
            return (
              <div 
                key={outlet.id} 
                className={`group p-5 bg-slate-900/40 border ${isOpen ? 'border-slate-800/80 hover:border-emerald-500/40' : 'border-slate-800/40 opacity-70'} hover:bg-slate-900/60 rounded-3xl transition-all relative flex flex-col justify-between`}
              >
                <div>
                  <div className="flex justify-between items-start gap-2">
                    <div className="flex items-center gap-2.5">
                      <div className={`w-9 h-9 rounded-xl ${isOpen ? 'bg-emerald-500/10 text-emerald-400' : 'bg-slate-800 text-slate-500'} flex items-center justify-center shrink-0`}>
                        <Store className="w-4.5 h-4.5" />
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-slate-100 group-hover:text-emerald-400 transition-colors leading-tight">
                          {outlet.name}
                        </h4>
                        <span className="text-[9px] text-slate-500 font-bold font-mono uppercase tracking-wider">{outlet.id}</span>
                      </div>
                    </div>

                    <button
                      onClick={() => handleToggleStatus(outlet)}
                      title={isOpen ? "Klik untuk tutup sementara" : "Klik untuk buka operasional"}
                      className={`text-[9px] font-black font-mono tracking-widest uppercase px-2.5 py-1 rounded-full border cursor-pointer transition-all ${
                        isOpen 
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500 hover:text-slate-950 hover:border-emerald-500' 
                          : 'bg-amber-500/10 text-amber-400 border-amber-500/30 hover:bg-amber-500 hover:text-slate-950 hover:border-amber-500'
                      }`}
                    >
                      {isOpen ? '● BUKA' : '○ TUTUP'}
                    </button>
                  </div>

                  <div className="mt-5 space-y-3 border-t border-slate-800/40 pt-4">
                    <div className="flex items-start gap-2.5 text-xs">
                      <MapPin className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
                      <p className="text-slate-300 leading-normal font-semibold">
                        {outlet.address}
                      </p>
                    </div>

                    <div className="flex items-center gap-2.5 text-xs font-mono">
                      <Phone className="w-4 h-4 text-slate-500 shrink-0" />
                      <span className="text-slate-300 font-bold">
                        {outlet.phone}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex gap-2 border-t border-slate-800/30 pt-4 mt-5">
                  <button 
                    onClick={() => handleOpenEditModal(outlet)}
                    className="flex-1 bg-slate-950 hover:bg-slate-800 border border-slate-850 hover:border-slate-700 text-slate-300 hover:text-white p-2 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                  >
                    <Edit className="w-3.5 h-3.5" />
                    <span>Ubah</span>
                  </button>

                  <button 
                    onClick={() => handleDeleteOutlet(outlet.id, outlet.name)}
                    className="bg-slate-950 hover:bg-red-950/20 border border-slate-850 hover:border-red-500/20 text-slate-500 hover:text-red-400 p-2 rounded-xl text-xs transition-all cursor-pointer"
                    title="Hapus Cabang"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Safety Shield Info */}
      <div className="bg-[#0F172A] border border-slate-800/60 p-4 rounded-2xl flex items-start gap-3">
        <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
        <div>
          <h5 className="text-xs font-bold text-slate-200">Sistem Keamanan Otorisasi Multi-Cabang</h5>
          <p className="text-[11px] text-slate-400 leading-normal mt-0.5">
            Semua perubahan status operasional outlet, penambahan cabang, dan data kontak langsung disinkronkan secara real-time ke modul POS Kasir, Pelaporan Keuangan, dan Gudang Inventori. Perubahan hanya diperbolehkan untuk akun Owner atau Supervisor yang memiliki hak akses administratif penuh.
          </p>
        </div>
      </div>

      {/* ADD OUTLET MODAL */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-[100] bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-slate-900 border border-slate-850 rounded-3xl overflow-hidden shadow-2xl">
            <div className="px-6 py-4 bg-slate-950 border-b border-slate-850 flex justify-between items-center">
              <h3 className="font-black text-white text-base flex items-center gap-2">
                <Store className="w-5 h-5 text-emerald-400" /> Daftarkan Cabang Baru
              </h3>
              <button 
                onClick={() => setIsAddModalOpen(false)}
                className="text-slate-500 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleAddSubmit} className="p-6 space-y-4">
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-1.5 font-mono">Nama Cabang / Outlet</label>
                <input 
                  type="text" 
                  placeholder="Contoh: Cabang Cangadi Soppeng"
                  value={formData.name || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-300 placeholder-slate-700 focus:outline-none focus:border-emerald-500"
                  required
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-1.5 font-mono">Alamat Lengkap</label>
                <textarea 
                  placeholder="Contoh: Jl. Poros Makassar, Cangadi, Liliriaja, Soppeng"
                  value={formData.address || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-300 placeholder-slate-700 focus:outline-none focus:border-emerald-500 min-h-20 max-h-32"
                  required
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-1.5 font-mono">Nomor Telepon / Kontak</label>
                <input 
                  type="text" 
                  placeholder="Contoh: 08534201xxxx"
                  value={formData.phone || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-300 placeholder-slate-700 focus:outline-none focus:border-emerald-500 font-mono"
                  required
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-1.5 font-mono">Status Awal</label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, status: 'OPEN' }))}
                    className={`flex-1 py-2 rounded-xl text-xs font-black border transition-all ${
                      formData.status === 'OPEN' 
                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' 
                        : 'bg-slate-950 text-slate-500 border-slate-800'
                    }`}
                  >
                    BUKA (OPEN)
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, status: 'CLOSED' }))}
                    className={`flex-1 py-2 rounded-xl text-xs font-black border transition-all ${
                      formData.status === 'CLOSED' 
                        ? 'bg-amber-500/10 text-amber-400 border-amber-500/30' 
                        : 'bg-slate-950 text-slate-500 border-slate-800'
                    }`}
                  >
                    TUTUP (CLOSED)
                  </button>
                </div>
              </div>

              {errorMsg && (
                <p className="text-[10px] font-bold font-mono text-red-400">{errorMsg}</p>
              )}

              <div className="flex gap-2 pt-4 border-t border-slate-850">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="flex-1 bg-slate-950 hover:bg-slate-800 border border-slate-850 hover:border-slate-700 text-slate-400 py-2.5 rounded-xl text-xs font-black transition-all cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-slate-950 py-2.5 rounded-xl text-xs font-black shadow-lg shadow-emerald-500/10 transition-all cursor-pointer"
                >
                  Simpan Cabang
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT OUTLET MODAL */}
      {isEditModalOpen && selectedOutlet && (
        <div className="fixed inset-0 z-[100] bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-slate-900 border border-slate-850 rounded-3xl overflow-hidden shadow-2xl">
            <div className="px-6 py-4 bg-slate-950 border-b border-slate-850 flex justify-between items-center">
              <h3 className="font-black text-white text-base flex items-center gap-2">
                <Edit className="w-5 h-5 text-emerald-400" /> Ubah Data Cabang
              </h3>
              <button 
                onClick={() => {
                  setIsEditModalOpen(false);
                  setSelectedOutlet(null);
                }}
                className="text-slate-500 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleEditSubmit} className="p-6 space-y-4">
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-1.5 font-mono">Nama Cabang / Outlet</label>
                <input 
                  type="text" 
                  value={formData.name || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-300 focus:outline-none focus:border-emerald-500"
                  required
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-1.5 font-mono">Alamat Lengkap</label>
                <textarea 
                  value={formData.address || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-300 focus:outline-none focus:border-emerald-500 min-h-20 max-h-32"
                  required
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-1.5 font-mono">Nomor Telepon / Kontak</label>
                <input 
                  type="text" 
                  value={formData.phone || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-300 focus:outline-none focus:border-emerald-500 font-mono"
                  required
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-1.5 font-mono">Status Operasional</label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, status: 'OPEN' }))}
                    className={`flex-1 py-2 rounded-xl text-xs font-black border transition-all ${
                      formData.status === 'OPEN' 
                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' 
                        : 'bg-slate-950 text-slate-500 border-slate-800'
                    }`}
                  >
                    BUKA (OPEN)
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, status: 'CLOSED' }))}
                    className={`flex-1 py-2 rounded-xl text-xs font-black border transition-all ${
                      formData.status === 'CLOSED' 
                        ? 'bg-amber-500/10 text-amber-400 border-amber-500/30' 
                        : 'bg-slate-950 text-slate-500 border-slate-800'
                    }`}
                  >
                    TUTUP (CLOSED)
                  </button>
                </div>
              </div>

              {errorMsg && (
                <p className="text-[10px] font-bold font-mono text-red-400">{errorMsg}</p>
              )}

              <div className="flex gap-2 pt-4 border-t border-slate-850">
                <button
                  type="button"
                  onClick={() => {
                    setIsEditModalOpen(false);
                    setSelectedOutlet(null);
                  }}
                  className="flex-1 bg-slate-950 hover:bg-slate-800 border border-slate-850 hover:border-slate-700 text-slate-400 py-2.5 rounded-xl text-xs font-black transition-all cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-slate-950 py-2.5 rounded-xl text-xs font-black shadow-lg shadow-emerald-500/10 transition-all cursor-pointer"
                >
                  Simpan Perubahan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
