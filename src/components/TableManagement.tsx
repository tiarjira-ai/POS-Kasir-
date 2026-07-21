import React, { useState, useEffect } from 'react';
import { 
  Coffee, Users, Plus, Edit2, Trash2, ShieldAlert, Check, RefreshCw, 
  MapPin, Sparkles, Filter, X, Grid, Sliders, Calendar
} from 'lucide-react';
import { Table, TableStatus } from '../types';

export default function TableManagement() {
  const [tables, setTables] = useState<Table[]>([]);
  const [loading, setLoading] = useState(false);
  const [notif, setNotif] = useState<string | null>(null);

  // Filter States
  const [filterStatus, setFilterStatus] = useState<string>('Semua');
  const [filterArea, setFilterArea] = useState<string>('Semua');

  // Modal / Form States
  const [showModal, setShowModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentTableId, setCurrentTableId] = useState<string | null>(null);
  const [tableNumber, setTableNumber] = useState('');
  const [tableCapacity, setTableCapacity] = useState('4');
  const [tableStatus, setTableStatus] = useState<TableStatus>('Kosong');
  const [tableArea, setTableArea] = useState('Indoor');

  // Notification helper
  const showNotification = (msg: string) => {
    setNotif(msg);
    setTimeout(() => setNotif(null), 3000);
  };

  useEffect(() => {
    fetchTables();
  }, []);

  const fetchTables = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/v1/tables');
      if (res.ok) {
        const data = await res.json();
        setTables(data);
      }
    } catch (err) {
      console.error('Error fetching tables:', err);
      showNotification('Gagal mengambil data meja!');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenCreate = () => {
    setIsEditing(false);
    setCurrentTableId(null);
    setTableNumber('');
    setTableCapacity('4');
    setTableStatus('Kosong');
    setTableArea('Indoor');
    setShowModal(true);
  };

  const handleOpenEdit = (table: Table) => {
    setIsEditing(true);
    setCurrentTableId(table.id);
    setTableNumber(table.number);
    setTableCapacity(String(table.capacity));
    setTableStatus(table.status);
    setTableArea(table.area);
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tableNumber.trim()) {
      alert('Nomor meja harus diisi!');
      return;
    }

    const payload = {
      number: tableNumber.trim(),
      capacity: Number(tableCapacity) || 4,
      status: tableStatus,
      area: tableArea
    };

    try {
      const url = isEditing ? `/api/v1/tables/${currentTableId}` : '/api/v1/tables';
      const method = isEditing ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (res.ok) {
        showNotification(isEditing ? 'Meja berhasil diperbarui!' : 'Meja baru ditambahkan!');
        setShowModal(false);
        fetchTables();
      } else {
        alert(data.error || 'Terjadi kesalahan sistem');
      }
    } catch (err) {
      console.error('Error submitting table:', err);
      alert('Gagal menghubungi server');
    }
  };

  const handleDeleteTable = async (id: string, num: string) => {
    if (!window.confirm(`Apakah Anda yakin ingin menghapus Meja ${num}?`)) return;

    try {
      const res = await fetch(`/api/v1/tables/${id}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        showNotification(`Meja ${num} berhasil dihapus.`);
        fetchTables();
      } else {
        const data = await res.json();
        alert(data.error || 'Gagal menghapus meja');
      }
    } catch (err) {
      console.error('Error deleting table:', err);
      alert('Gagal menghubungi server');
    }
  };

  const handleQuickStatusChange = async (id: string, newStatus: TableStatus) => {
    try {
      const res = await fetch(`/api/v1/tables/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });
      if (res.ok) {
        showNotification(`Status meja berhasil diubah ke ${newStatus}`);
        fetchTables();
      } else {
        const data = await res.json();
        alert(data.error || 'Gagal mengubah status meja');
      }
    } catch (err) {
      console.error('Error changing table status:', err);
    }
  };

  // Unique lists for filters
  const uniqueAreas = Array.from(new Set(tables.map(t => t.area)));

  const filteredTables = tables.filter(t => {
    const matchStatus = filterStatus === 'Semua' || t.status === filterStatus;
    const matchArea = filterArea === 'Semua' || t.area === filterArea;
    return matchStatus && matchArea;
  });

  const getStatusStyle = (status: TableStatus) => {
    switch (status) {
      case 'Kosong':
        return {
          bg: 'bg-emerald-500/10 hover:bg-emerald-500/15',
          border: 'border-emerald-500/20',
          text: 'text-emerald-400',
          indicator: 'bg-emerald-500',
          accent: 'emerald'
        };
      case 'Terisi':
        return {
          bg: 'bg-red-500/10 hover:bg-red-500/15',
          border: 'border-red-500/20',
          text: 'text-red-400',
          indicator: 'bg-red-500',
          accent: 'red'
        };
      case 'Reservasi':
        return {
          bg: 'bg-amber-500/10 hover:bg-amber-500/15',
          border: 'border-amber-500/20',
          text: 'text-amber-400',
          indicator: 'bg-amber-500',
          accent: 'amber'
        };
      case 'Dibersihkan':
        return {
          bg: 'bg-sky-500/10 hover:bg-sky-500/15',
          border: 'border-sky-500/20',
          text: 'text-sky-400',
          indicator: 'bg-sky-500',
          accent: 'sky'
        };
      default:
        return {
          bg: 'bg-slate-800/40',
          border: 'border-slate-800',
          text: 'text-slate-400',
          indicator: 'bg-slate-500',
          accent: 'slate'
        };
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Toast Alert */}
      {notif && (
        <div className="fixed top-20 right-6 bg-slate-950 text-emerald-400 px-5 py-3 rounded-2xl shadow-xl z-50 text-xs font-bold border border-slate-800 flex items-center gap-2 font-mono">
          <Sparkles className="w-4 h-4 animate-bounce" />
          <span>{notif}</span>
        </div>
      )}

      {/* Header Panel */}
      <div className="bg-slate-900 rounded-3xl p-6 border border-slate-800/80 shadow-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-extrabold px-1.5 py-0.5 rounded uppercase tracking-wider font-mono">
              Operational Room
            </span>
            <span className="text-xs text-slate-500 font-bold">•</span>
            <span className="text-xs text-slate-400 font-bold flex items-center gap-1 font-mono">
              <Grid className="w-3.5 h-3.5 text-slate-500" />
              {tables.length} Total Meja
            </span>
          </div>
          <h2 className="text-xl md:text-2xl font-black text-slate-100 tracking-tight">TABLE MANAGEMENT</h2>
          <p className="text-xs text-slate-400 mt-1">Atur meja pelanggan, status reservasi, dan zonasi area restoran Anda.</p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
          <button
            onClick={fetchTables}
            className="p-3 bg-slate-950 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-slate-300 hover:text-white rounded-xl transition-all cursor-pointer"
            title="Muat Ulang Meja"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          
          <button
            onClick={handleOpenCreate}
            className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black px-4 py-3 rounded-xl shadow-lg shadow-emerald-500/10 text-xs transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>Tambah Meja Baru</span>
          </button>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="bg-slate-900/50 rounded-2xl p-4 border border-slate-850 flex flex-col sm:flex-row justify-between items-center gap-4">
        <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
          {/* Status filter selection */}
          <div className="flex items-center gap-1.5 bg-slate-950/60 p-1.5 rounded-xl border border-slate-800">
            <span className="text-[10px] text-slate-500 font-bold px-1.5">Status:</span>
            {['Semua', 'Kosong', 'Terisi', 'Reservasi', 'Dibersihkan'].map((st) => (
              <button
                key={st}
                onClick={() => setFilterStatus(st)}
                className={`text-[10px] font-black px-2.5 py-1.5 rounded-lg transition-all cursor-pointer ${
                  filterStatus === st 
                    ? 'bg-slate-800 text-slate-100' 
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {st}
              </button>
            ))}
          </div>

          {/* Area filter selection */}
          <div className="flex items-center gap-1.5 bg-slate-950/60 p-1.5 rounded-xl border border-slate-800">
            <span className="text-[10px] text-slate-500 font-bold px-1.5">Area:</span>
            {['Semua', 'Indoor', 'Outdoor', 'VIP'].map((ar) => (
              <button
                key={ar}
                onClick={() => setFilterArea(ar)}
                className={`text-[10px] font-black px-2.5 py-1.5 rounded-lg transition-all cursor-pointer ${
                  filterArea === ar 
                    ? 'bg-slate-800 text-slate-100' 
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {ar}
              </button>
            ))}
          </div>
        </div>

        <div className="text-[10px] text-slate-500 font-bold font-mono">
          Menampilkan {filteredTables.length} dari {tables.length} meja
        </div>
      </div>

      {/* Tables Display Grid */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20">
          <RefreshCw className="w-8 h-8 text-emerald-500 animate-spin mb-3" />
          <p className="text-xs text-slate-400">Sedang memproses data meja...</p>
        </div>
      ) : filteredTables.length === 0 ? (
        <div className="bg-slate-900/20 rounded-2xl p-12 text-center border border-dashed border-slate-800">
          <Coffee className="w-10 h-10 text-slate-600 mx-auto mb-3" />
          <p className="text-sm font-bold text-slate-400">Tidak ada meja ditemukan</p>
          <p className="text-xs text-slate-500 mt-1">Silakan ubah filter atau tambah meja baru di pojok kanan atas.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
          {filteredTables.map((table) => {
            const styles = getStatusStyle(table.status);
            return (
              <div 
                key={table.id}
                className={`rounded-2xl border ${styles.border} ${styles.bg} p-4.5 transition-all duration-300 relative group flex flex-col justify-between min-h-[160px]`}
              >
                {/* Upper row: table number and capacity */}
                <div>
                  <div className="flex justify-between items-start mb-2.5">
                    <div>
                      <span className="text-[10px] font-mono font-black text-slate-500 block leading-none">MEJA</span>
                      <span className="text-2xl font-black text-white font-mono tracking-tight">{table.number}</span>
                    </div>
                    <div className="flex flex-col items-end">
                      <span className="text-[9px] font-extrabold uppercase bg-slate-950/50 px-1.5 py-0.5 rounded border border-slate-850 text-slate-400 flex items-center gap-1 font-mono">
                        <MapPin className="w-2.5 h-2.5 text-slate-500" />
                        {table.area}
                      </span>
                    </div>
                  </div>

                  {/* Capacity & Status Badge */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-1 text-xs text-slate-300 font-bold">
                      <Users className="w-3.5 h-3.5 text-slate-500" />
                      <span>{table.capacity} Kursi</span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <span className={`w-2 h-2 rounded-full ${styles.indicator}`}></span>
                      <span className={`text-[11px] font-extrabold uppercase tracking-wider font-mono ${styles.text}`}>
                        {table.status}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Bottom Row / Hover actions */}
                <div className="mt-4 pt-3 border-t border-slate-800/40 flex items-center justify-between gap-2.5">
                  {/* Status Dropdown Controller */}
                  <select
                    value={table.status}
                    onChange={(e) => handleQuickStatusChange(table.id, e.target.value as TableStatus)}
                    className="bg-slate-950 text-slate-300 text-[10px] font-bold px-1.5 py-1 rounded border border-slate-800 focus:outline-none focus:border-emerald-500 shrink-0 cursor-pointer"
                  >
                    <option value="Kosong">Kosong</option>
                    <option value="Terisi">Terisi</option>
                    <option value="Reservasi">Reservasi</option>
                    <option value="Dibersihkan">Dibersihkan</option>
                  </select>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleOpenEdit(table)}
                      className="p-1.5 hover:bg-slate-950 text-slate-400 hover:text-slate-100 rounded-lg transition-all cursor-pointer"
                      title="Edit Meja"
                    >
                      <Edit2 className="w-3 h-3" />
                    </button>
                    <button
                      onClick={() => handleDeleteTable(table.id, table.number)}
                      className="p-1.5 hover:bg-red-500/10 text-slate-400 hover:text-red-400 rounded-lg transition-all cursor-pointer"
                      title="Hapus Meja"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* CREATE/EDIT MEJA MODAL */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-200">
            {/* Modal Header */}
            <div className="px-6 py-4.5 border-b border-slate-800 bg-slate-950/40 flex justify-between items-center">
              <div>
                <h3 className="text-sm font-black text-white tracking-tight uppercase">
                  {isEditing ? `Edit Meja ${tableNumber}` : 'Tambah Meja Baru'}
                </h3>
                <p className="text-[10px] text-slate-400 mt-0.5">Lengkapi formulir di bawah dengan benar</p>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-all cursor-pointer"
              >
                <X className="w-4.5 h-4.5" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">Nomor / Nama Meja</label>
                <input
                  type="text"
                  required
                  value={tableNumber}
                  onChange={(e) => setTableNumber(e.target.value)}
                  placeholder="Contoh: 1, 2, A1, VIP-1"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">Kapasitas (Kursi)</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={tableCapacity}
                    onChange={(e) => setTableCapacity(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">Zonasi Area</label>
                  <select
                    value={tableArea}
                    onChange={(e) => setTableArea(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-500 cursor-pointer"
                  >
                    <option value="Indoor">Indoor (Dalam)</option>
                    <option value="Outdoor">Outdoor (Luar)</option>
                    <option value="VIP">VIP Room</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">Status Awal</label>
                <div className="grid grid-cols-2 gap-2 bg-slate-950 p-2 rounded-xl border border-slate-800">
                  {(['Kosong', 'Terisi', 'Reservasi', 'Dibersihkan'] as TableStatus[]).map((st) => (
                    <button
                      key={st}
                      type="button"
                      onClick={() => setTableStatus(st)}
                      className={`text-[10px] font-bold py-2 rounded-lg transition-all cursor-pointer ${
                        tableStatus === st 
                          ? 'bg-slate-800 text-white' 
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      {st}
                    </button>
                  ))}
                </div>
              </div>

              <div className="pt-4 flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 bg-slate-950 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-slate-400 hover:text-slate-200 py-3 rounded-xl text-xs font-bold cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-emerald-500 hover:bg-emerald-400 text-slate-950 py-3 rounded-xl text-xs font-black shadow-lg shadow-emerald-500/10 cursor-pointer"
                >
                  Simpan Meja
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
