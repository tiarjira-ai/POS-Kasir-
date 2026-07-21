import React, { useState, useEffect } from 'react';
import { 
  Package, ShoppingCart, RefreshCcw, Plus, Truck, 
  Trash2, AlertTriangle, ArrowUpDown, ChevronDown, CheckCircle 
} from 'lucide-react';
import { InventoryItem, StockMovement, Supplier, PurchaseOrder } from '../types';

export default function GudangInventori() {
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'STOCK' | 'MUTASI' | 'PO' | 'SUPPLIERS'>('STOCK');

  // Modals / Creators
  const [adjustModal, setAdjustModal] = useState<InventoryItem | null>(null);
  const [adjustType, setAdjustType] = useState<'IN' | 'OUT' | 'WASTE' | 'EXPIRED'>('IN');
  const [adjustQty, setAdjustQty] = useState('');
  const [adjustNote, setAdjustNote] = useState('');

  const [addInvModal, setAddInvModal] = useState(false);
  const [newInv, setNewInv] = useState({ name: '', stock: 0, minStock: 5, unit: 'Kg', category: 'Daging', supplierName: '' });

  const [poModal, setPoModal] = useState(false);
  const [selectedSupplierId, setSelectedSupplierId] = useState('');
  const [poItems, setPoItems] = useState<{ name: string; quantity: number; unit: string; price: number }[]>([
    { name: '', quantity: 1, unit: 'Kg', price: 50000 }
  ]);

  useEffect(() => {
    fetchInventory();
  }, []);

  const fetchInventory = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/v1/inventory');
      if (res.ok) {
        const data = await res.json();
        setInventory(data.inventory || []);
        setMovements(data.movements || []);
        setSuppliers(data.suppliers || []);
        setPurchaseOrders(data.purchaseOrders || []);
      }
    } catch (err) {
      console.error('Error loading inventory data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAdjustSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjustModal || !adjustQty) return;

    try {
      const res = await fetch('/api/v1/inventory/adjust', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          inventoryId: adjustModal.id,
          type: adjustType,
          quantity: Number(adjustQty),
          notes: adjustNote
        }),
      });
      if (res.ok) {
        setAdjustModal(null);
        setAdjustQty('');
        setAdjustNote('');
        fetchInventory();
      }
    } catch (err) {
      console.error('Error submitting adjustment:', err);
    }
  };

  const handleAddInventory = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/v1/inventory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newInv),
      });
      if (res.ok) {
        setAddInvModal(false);
        setNewInv({ name: '', stock: 0, minStock: 5, unit: 'Kg', category: 'Daging', supplierName: '' });
        fetchInventory();
      }
    } catch (err) {
      console.error('Error adding inventory:', err);
    }
  };

  const handlePoSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSupplierId || poItems.some(i => !i.name || i.quantity <= 0)) return;

    try {
      const res = await fetch('/api/v1/inventory/po', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          supplierId: selectedSupplierId,
          items: poItems
        }),
      });
      if (res.ok) {
        setPoModal(false);
        setSelectedSupplierId('');
        setPoItems([{ name: '', quantity: 1, unit: 'Kg', price: 50000 }]);
        fetchInventory();
      }
    } catch (err) {
      console.error('Error creating PO:', err);
    }
  };

  const receivePO = async (poId: string) => {
    try {
      const res = await fetch(`/api/v1/inventory/po/${poId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'RECEIVED' }),
      });
      if (res.ok) {
        fetchInventory();
      }
    } catch (err) {
      console.error('Error receiving PO:', err);
    }
  };

  return (
    <div className="space-y-4">
      
      {/* Tab bar header */}
      <div className="bg-[#0F172A]/70 backdrop-blur-md p-4 rounded-2xl border border-slate-800/80 flex flex-col md:flex-row justify-between items-center gap-3">
        <div className="flex flex-wrap gap-2">
          {([
            { code: 'STOCK', label: 'Stok Bahan', icon: Package },
            { code: 'MUTASI', label: 'Riwayat Mutasi', icon: ArrowUpDown },
            { code: 'PO', label: 'Purchase Order', icon: ShoppingCart },
            { code: 'SUPPLIERS', label: 'Supplier Roster', icon: Truck }
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
          {activeTab === 'STOCK' && (
            <button 
              onClick={() => setAddInvModal(true)}
              className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold px-3.5 py-2.5 rounded-xl flex items-center gap-1.5 cursor-pointer shadow-[0_0_12px_rgba(16,185,129,0.2)] transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>Tambah Bahan</span>
            </button>
          )}
          {activeTab === 'PO' && (
            <button 
              onClick={() => setPoModal(true)}
              className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold px-3.5 py-2.5 rounded-xl flex items-center gap-1.5 cursor-pointer shadow-[0_0_12px_rgba(16,185,129,0.2)] transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>Buat PO Baru</span>
            </button>
          )}
          <button 
            onClick={fetchInventory} 
            className="bg-slate-800/80 hover:bg-slate-700 text-slate-300 p-2.5 rounded-xl border border-slate-700/50 cursor-pointer transition-colors"
          >
            <RefreshCcw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 bg-[#0F172A]/70 backdrop-blur-md rounded-3xl border border-slate-800">
          <RefreshCcw className="w-8 h-8 animate-spin text-emerald-500" />
        </div>
      ) : (
        <div className="bg-[#0F172A]/70 backdrop-blur-md rounded-3xl shadow-xl border border-slate-800/60 overflow-hidden">
          
          {/* TAB 1: STOCK & RAW INGREDIENTS */}
          {activeTab === 'STOCK' && (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-900/60 border-b border-slate-800 text-slate-400 uppercase font-extrabold tracking-wider">
                    <th className="p-4">Bahan Baku</th>
                    <th className="p-4">Kategori</th>
                    <th className="p-4 text-center">Status Stok</th>
                    <th className="p-4 text-center">Minimum</th>
                    <th className="p-4">Supplier Utama</th>
                    <th className="p-4">Update Terakhir</th>
                    <th className="p-4 text-right">Tindakan</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/50 font-semibold text-slate-300">
                  {(inventory || []).map((item) => {
                    const isLow = item.stock <= item.minStock;
                    return (
                      <tr key={item.id} className="hover:bg-slate-800/30 transition-colors">
                        <td className="p-4 flex items-center gap-3">
                          <div className={`p-2 rounded-xl border ${isLow ? 'bg-red-500/10 text-red-400 border-red-500/20' : 'bg-slate-800 text-slate-300 border-slate-700/40'}`}>
                            <Package className="w-4 h-4" />
                          </div>
                          <div>
                            <span className="font-bold text-slate-100 text-sm block">{item.name}</span>
                            <span className="text-[10px] text-slate-500 font-mono">ID: {item.id}</span>
                          </div>
                        </td>
                        <td className="p-4">
                          <span className="bg-slate-800 text-slate-300 border border-slate-700/60 px-2.5 py-0.5 rounded-md font-bold uppercase text-[9px] tracking-wider">
                            {item.category}
                          </span>
                        </td>
                        <td className="p-4 text-center">
                          <span className={`font-mono text-sm font-black ${isLow ? 'text-red-400 font-black' : 'text-emerald-400'}`}>{item.stock}</span>
                          <span className="text-slate-500 text-[10px] ml-1 font-medium">{item.unit}</span>
                          {isLow && (
                            <span className="ml-2 inline-flex items-center gap-0.5 bg-red-500/10 text-red-400 text-[9px] font-bold px-1.5 py-0.5 rounded-full border border-red-500/30">
                              <AlertTriangle className="w-3 h-3" /> KRITIS
                            </span>
                          )}
                        </td>
                        <td className="p-4 text-center text-slate-400 font-mono">{item.minStock} {item.unit}</td>
                        <td className="p-4 text-slate-400">{item.supplierName || 'Umum'}</td>
                        <td className="p-4 text-slate-500 font-medium text-[11px]">{new Date(item.lastUpdated).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</td>
                        <td className="p-4 text-right">
                          <button
                            onClick={() => setAdjustModal(item)}
                            className="bg-slate-800 hover:bg-emerald-500 hover:text-slate-950 text-slate-300 hover:border-emerald-500 px-3 py-1.5 rounded-lg border border-slate-700/60 transition-all font-bold cursor-pointer"
                          >
                            Sesuaikan Stok
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* TAB 2: STOCK MOVEMENT HISTORY */}
          {activeTab === 'MUTASI' && (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-900/60 border-b border-slate-800 text-slate-400 uppercase font-extrabold tracking-wider">
                    <th className="p-4">Tanggal</th>
                    <th className="p-4">Bahan Baku</th>
                    <th className="p-4">Arah / Tipe</th>
                    <th className="p-4 text-center">Kuantitas</th>
                    <th className="p-4">Catatan Mutasi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/50 font-semibold text-slate-300">
                  {(movements || []).map((mov) => {
                    const itemName = inventory.find(i => i.id === mov.inventoryId)?.name || 'Bahan Dihapus';
                    return (
                      <tr key={mov.id} className="hover:bg-slate-800/30">
                        <td className="p-4 text-slate-500 font-medium text-[11px]">{new Date(mov.createdAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</td>
                        <td className="p-4 font-bold text-slate-100">{itemName}</td>
                        <td className="p-4">
                          <span className={`px-2 py-0.5 rounded text-[9px] font-extrabold uppercase border ${
                            mov.type === 'IN' 
                              ? 'bg-green-500/10 text-green-400 border-green-500/20' 
                              : mov.type === 'WASTE' 
                                ? 'bg-red-500/10 text-red-400 border-red-500/20' 
                                : 'bg-slate-800 text-slate-300 border-slate-700/50'
                          }`}>
                            {mov.type}
                          </span>
                        </td>
                        <td className="p-4 text-center font-mono font-bold text-slate-200">{mov.type === 'IN' ? '+' : '-'}{mov.quantity}</td>
                        <td className="p-4 text-slate-400 italic">{mov.notes}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* TAB 3: PURCHASE ORDERS */}
          {activeTab === 'PO' && (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-900/60 border-b border-slate-800 text-slate-400 uppercase font-extrabold tracking-wider">
                    <th className="p-4">ID PO</th>
                    <th className="p-4">Supplier</th>
                    <th className="p-4">Item Belanja</th>
                    <th className="p-4">Estimasi Tagihan</th>
                    <th className="p-4">Tanggal PO</th>
                    <th className="p-4">Status PO</th>
                    <th className="p-4 text-right">Tindakan</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/50 font-semibold text-slate-300">
                  {(purchaseOrders || []).map((po) => (
                    <tr key={po.id} className="hover:bg-slate-800/30">
                      <td className="p-4 font-bold font-mono text-slate-300">{po.id}</td>
                      <td className="p-4 text-slate-200 font-bold">{po.supplierName}</td>
                      <td className="p-4 max-w-xs truncate text-slate-400">
                        {(po.items || []).map(i => `${i.name} (${i.quantity} ${i.unit})`).join(', ')}
                      </td>
                      <td className="p-4 font-mono font-bold text-emerald-400">Rp {po.total.toLocaleString('id-ID')}</td>
                      <td className="p-4 text-slate-500">{new Date(po.createdAt).toLocaleDateString('id-ID')}</td>
                      <td className="p-4">
                        <span className={`px-2 py-0.5 rounded text-[9px] font-extrabold uppercase border ${
                          po.status === 'RECEIVED' 
                            ? 'bg-green-500/10 text-green-400 border-green-500/20' 
                            : 'bg-amber-500/10 text-amber-400 border-amber-500/20 animate-pulse'
                        }`}>
                          {po.status === 'RECEIVED' ? 'Diterima' : 'Menunggu Kirim'}
                        </span>
                      </td>
                      <td className="p-4 text-right">
                        {po.status === 'PENDING' && (
                          <button
                            onClick={() => receivePO(po.id)}
                            className="bg-[#10B981] hover:bg-emerald-400 text-slate-950 font-bold text-[10px] px-3 py-1.5 rounded-lg flex items-center gap-1 ml-auto cursor-pointer shadow-[0_0_10px_rgba(16,185,129,0.2)] transition-all"
                          >
                            <CheckCircle className="w-3.5 h-3.5" />
                            <span>Terima Barang</span>
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* TAB 4: SUPPLIERS ROSTER */}
          {activeTab === 'SUPPLIERS' && (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-900/60 border-b border-slate-800 text-slate-400 uppercase font-extrabold tracking-wider">
                    <th className="p-4">Supplier</th>
                    <th className="p-4">Telepon / WhatsApp</th>
                    <th className="p-4">Email</th>
                    <th className="p-4">Alamat Kantor</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/50 font-semibold text-slate-300">
                  {(suppliers || []).map((sup) => (
                    <tr key={sup.id} className="hover:bg-slate-800/30">
                      <td className="p-4 font-extrabold text-slate-100 text-sm">{sup.name}</td>
                      <td className="p-4 font-mono text-slate-400">{sup.phone}</td>
                      <td className="p-4 text-slate-400">{sup.email}</td>
                      <td className="p-4 text-slate-400">{sup.address}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

        </div>
      )}

      {/* MODAL 1: Adjust Inventory Stock (Masuk, Waste, etc.) */}
      {adjustModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-fade-in">
          <form onSubmit={handleAdjustSubmit} className="bg-[#0F172A] border border-slate-800 text-slate-200 rounded-3xl max-w-sm w-full p-6 shadow-2xl relative animate-scale-in">
            <h3 className="text-sm font-black text-slate-100 mb-1">Sesuaikan Stok Gudang</h3>
            <p className="text-xs text-emerald-400 font-bold mb-4">{adjustModal.name} (Sisa: {adjustModal.stock} {adjustModal.unit})</p>

            <div className="space-y-4 text-xs">
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Arah Penyesuaian</label>
                <select
                  value={adjustType}
                  onChange={(e) => setAdjustType(e.target.value as any)}
                  className="w-full bg-[#1E293B] border border-slate-800 rounded-xl px-3 py-2.5 font-bold text-slate-200 focus:outline-none focus:border-emerald-500"
                >
                  <option value="IN" className="bg-[#0F172A]">Stok Masuk (Kulakan / Sisa Pagi)</option>
                  <option value="OUT" className="bg-[#0F172A]">Stok Keluar Manual</option>
                  <option value="WASTE" className="bg-[#0F172A]">Bahan Rusak / Kebuang (Waste)</option>
                  <option value="EXPIRED" className="bg-[#0F172A]">Kedaluwarsa (Expired)</option>
                </select>
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Jumlah Kuantitas ({adjustModal.unit})</label>
                <input 
                  type="number" 
                  required
                  value={adjustQty}
                  onChange={(e) => setAdjustQty(e.target.value)}
                  placeholder="Contoh: 10"
                  className="w-full bg-[#1E293B] border border-slate-800 rounded-xl px-3.5 py-2.5 text-slate-100 font-bold focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Catatan Keterangan</label>
                <input 
                  type="text" 
                  value={adjustNote}
                  onChange={(e) => setAdjustNote(e.target.value)}
                  placeholder="Contoh: Pengiriman PO gagal, buah busuk..."
                  className="w-full bg-[#1E293B] border border-slate-800 rounded-xl px-3.5 py-2.5 text-slate-100 focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-slate-800/80 flex gap-2">
              <button 
                type="button" 
                onClick={() => setAdjustModal(null)}
                className="bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs px-4 py-3.5 rounded-xl flex-1 cursor-pointer transition-colors"
              >
                Batal
              </button>
              <button 
                type="submit"
                className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs px-5 py-3.5 rounded-xl flex-1 shadow-[0_0_12px_rgba(16,185,129,0.25)] cursor-pointer transition-colors"
              >
                Terapkan Mutasi
              </button>
            </div>
          </form>
        </div>
      )}

      {/* MODAL 2: Add New Inventory Item */}
      {addInvModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-fade-in">
          <form onSubmit={handleAddInventory} className="bg-[#0F172A] border border-slate-800 text-slate-200 rounded-3xl max-w-sm w-full p-6 shadow-2xl relative animate-scale-in">
            <h3 className="text-sm font-black text-slate-100 mb-4">Tambah Bahan Baku Gudang</h3>

            <div className="space-y-4 text-xs">
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Nama Bahan Baku</label>
                <input 
                  type="text" 
                  required
                  value={newInv.name}
                  onChange={(e) => setNewInv(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Contoh: Saus Pedas Soppeng"
                  className="w-full bg-[#1E293B] border border-slate-800 rounded-xl px-3.5 py-2.5 text-slate-100 font-bold focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Kategori</label>
                  <input 
                    type="text" 
                    required
                    value={newInv.category}
                    onChange={(e) => setNewInv(prev => ({ ...prev, category: e.target.value }))}
                    placeholder="Tahu, Daging, Rempah..."
                    className="w-full bg-[#1E293B] border border-slate-800 rounded-xl px-3.5 py-2.5 text-slate-100 font-bold focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Satuan</label>
                  <input 
                    type="text" 
                    required
                    value={newInv.unit}
                    onChange={(e) => setNewInv(prev => ({ ...prev, unit: e.target.value }))}
                    placeholder="Kg, Pcs, Gelas..."
                    className="w-full bg-[#1E293B] border border-slate-800 rounded-xl px-3.5 py-2.5 text-slate-100 font-bold focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Stok Awal</label>
                  <input 
                    type="number" 
                    required
                    value={newInv.stock || ''}
                    onChange={(e) => setNewInv(prev => ({ ...prev, stock: Number(e.target.value) }))}
                    placeholder="100"
                    className="w-full bg-[#1E293B] border border-slate-800 rounded-xl px-3.5 py-2.5 text-slate-100 font-bold focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Stok Minimum</label>
                  <input 
                    type="number" 
                    required
                    value={newInv.minStock || ''}
                    onChange={(e) => setNewInv(prev => ({ ...prev, minStock: Number(e.target.value) }))}
                    placeholder="15"
                    className="w-full bg-[#1E293B] border border-slate-800 rounded-xl px-3.5 py-2.5 text-slate-100 font-bold focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Supplier Terkait</label>
                <select
                  value={newInv.supplierName}
                  onChange={(e) => setNewInv(prev => ({ ...prev, supplierName: e.target.value }))}
                  className="w-full bg-[#1E293B] border border-slate-800 rounded-xl px-3 py-2.5 text-slate-200 focus:outline-none focus:border-emerald-500 font-bold"
                >
                  <option value="" className="bg-[#0F172A]">-- Pilih Supplier Utama --</option>
                  {(suppliers || []).map(s => <option key={s.id} value={s.name} className="bg-[#0F172A]">{s.name}</option>)}
                </select>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-slate-800/85 flex gap-2">
              <button 
                type="button" 
                onClick={() => setAddInvModal(false)}
                className="bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs px-4 py-3.5 rounded-xl flex-1 cursor-pointer transition-colors"
              >
                Batal
              </button>
              <button 
                type="submit"
                className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs px-5 py-3.5 rounded-xl flex-1 shadow-[0_0_12px_rgba(16,185,129,0.25)] cursor-pointer transition-colors"
              >
                Simpan Bahan
              </button>
            </div>
          </form>
        </div>
      )}

      {/* MODAL 3: Create Purchase Order (PO) */}
      {poModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-fade-in">
          <form onSubmit={handlePoSubmit} className="bg-[#0F172A] border border-slate-800 text-slate-200 rounded-3xl max-w-lg w-full p-6 shadow-2xl relative animate-scale-in">
            <h3 className="text-sm font-black text-slate-100 mb-1">Buat Purchase Order (PO) Gudang</h3>
            <p className="text-xs text-slate-400 mb-4">Lakukan pengadaan ulang stok langsung ke Supplier terdaftar</p>

            <div className="space-y-4 text-xs font-bold text-slate-400">
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Pilih Supplier Penerima</label>
                <select
                  required
                  value={selectedSupplierId}
                  onChange={(e) => setSelectedSupplierId(e.target.value)}
                  className="w-full bg-[#1E293B] border border-slate-800 rounded-xl px-3 py-2.5 text-slate-200 focus:outline-none focus:border-emerald-500"
                >
                  <option value="" className="bg-[#0F172A] text-slate-400">-- Pilih Supplier --</option>
                  {(suppliers || []).map(s => <option key={s.id} value={s.id} className="bg-[#0F172A]">{s.name}</option>)}
                </select>
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase block mb-2">Item Belanja PO</label>
                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {(poItems || []).map((poIt, index) => (
                    <div key={index} className="flex flex-wrap sm:flex-nowrap gap-2 items-center bg-[#1E293B]/60 p-2 rounded-xl border border-slate-800">
                      <input 
                        type="text" 
                        required
                        value={poIt.name}
                        onChange={(e) => {
                          const copy = [...poItems];
                          copy[index].name = e.target.value;
                          setPoItems(copy);
                        }}
                        placeholder="Nama Bahan Baku"
                        className="flex-1 min-w-[120px] bg-[#1E293B] border border-slate-800 text-slate-100 rounded-lg px-2.5 py-1.5 font-semibold focus:outline-none"
                      />
                      <input 
                        type="number" 
                        required
                        value={poIt.quantity || ''}
                        onChange={(e) => {
                          const copy = [...poItems];
                          copy[index].quantity = Number(e.target.value);
                          setPoItems(copy);
                        }}
                        placeholder="Qty"
                        className="w-16 bg-[#1E293B] border border-slate-800 text-slate-100 rounded-lg px-2 py-1.5 text-center font-bold focus:outline-none"
                      />
                      <input 
                        type="text" 
                        required
                        value={poIt.unit}
                        onChange={(e) => {
                          const copy = [...poItems];
                          copy[index].unit = e.target.value;
                          setPoItems(copy);
                        }}
                        placeholder="Satuan"
                        className="w-16 bg-[#1E293B] border border-slate-800 text-slate-100 rounded-lg px-2 py-1.5 text-center focus:outline-none"
                      />
                      <input 
                        type="number" 
                        required
                        value={poIt.price || ''}
                        onChange={(e) => {
                          const copy = [...poItems];
                          copy[index].price = Number(e.target.value);
                          setPoItems(copy);
                        }}
                        placeholder="Harga"
                        className="w-24 bg-[#1E293B] border border-slate-800 text-emerald-400 rounded-lg px-2 py-1.5 font-bold text-right font-mono focus:outline-none"
                      />
                      <button 
                        type="button"
                        onClick={() => {
                          if (poItems.length > 1) {
                            setPoItems(poItems.filter((_, i) => i !== index));
                          }
                        }}
                        className="p-1.5 text-red-400 hover:bg-red-500/10 rounded-lg transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-4.5 h-4.5" />
                      </button>
                    </div>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={() => setPoItems([...poItems, { name: '', quantity: 1, unit: 'Kg', price: 20000 }])}
                  className="mt-2.5 text-emerald-400 font-extrabold flex items-center gap-1 hover:text-emerald-300 transition-colors cursor-pointer"
                >
                  + Tambah Baris Belanja
                </button>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-slate-800/85 flex gap-2">
              <button 
                type="button" 
                onClick={() => setPoModal(false)}
                className="bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs px-4 py-3.5 rounded-xl flex-1 cursor-pointer transition-colors"
              >
                Batal
              </button>
              <button 
                type="submit"
                className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs px-5 py-3.5 rounded-xl flex-1 shadow-[0_0_12px_rgba(16,185,129,0.25)] cursor-pointer transition-colors"
              >
                Kirim Draf PO ke Supplier
              </button>
            </div>
          </form>
        </div>
      )}

    </div>
  );
}
