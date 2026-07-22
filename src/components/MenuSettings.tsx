import React, { useState, useEffect } from 'react';
import { 
  Plus, Edit3, Trash2, RefreshCw, ShoppingBag, 
  Sparkles, Layers, DollarSign, Package, Upload, X 
} from 'lucide-react';
import { MenuItem, Category } from '../types';

export default function MenuSettings() {
  const [menu, setMenu] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'ALL' | 'Makanan' | 'Minuman' | 'Frozen Food'>('ALL');

  // Restock State
  const [restockItem, setRestockItem] = useState<MenuItem | null>(null);
  const [customRestockQty, setCustomRestockQty] = useState<number>(50);

  // Modal / Creator State
  const [productModal, setProductModal] = useState<MenuItem | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    category: 'Makanan' as Category,
    price: 0,
    image: '',
    stock: 100,
    minStock: 10,
    unit: 'Tusuk',
    variations: 'Original, Pedas, Sangat Pedas',
    modifiers: 'Tambah Keju:2000, Tambah Mayo:1000'
  });

  // Image drag-and-drop / select states
  const [dragActive, setDragActive] = useState(false);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const processFile = (file: File) => {
    if (!file.type.startsWith('image/')) {
      alert('Hanya file gambar yang diperbolehkan!');
      return;
    }
    
    // Check file size limit to 4MB to keep it performant
    if (file.size > 4 * 1024 * 1024) {
      alert('Ukuran gambar terlalu besar! Maksimal 4MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      if (e.target?.result) {
        setFormData(prev => ({ ...prev, image: e.target!.result as string }));
      }
    };
    reader.readAsDataURL(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  useEffect(() => {
    fetchMenu();
  }, []);

  const openRestockModal = (item: MenuItem) => {
    setRestockItem(item);
    setCustomRestockQty(50); // Default recommendation
  };

  const handleRestockSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!restockItem) return;

    const newStock = Number(restockItem.stock) + Number(customRestockQty);

    try {
      const res = await fetch(`/api/v1/menu/${restockItem.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stock: newStock }),
      });

      if (res.ok) {
        setRestockItem(null);
        fetchMenu();
      } else {
        alert('Gagal menambah stok jualan');
      }
    } catch (err) {
      console.error('Error updating stock:', err);
    }
  };

  const fetchMenu = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/v1/menu');
      if (res.ok) {
        const data = await res.json();
        setMenu(data);
      }
    } catch (err) {
      console.error('Error loading menu:', err);
    } finally {
      setLoading(false);
    }
  };

  const openAddModal = () => {
    setIsEditMode(false);
    setFormData({
      name: '',
      category: 'Makanan',
      price: 5000,
      image: 'https://images.unsplash.com/photo-1544025162-d76694265947?w=300&q=80',
      stock: 100,
      minStock: 10,
      unit: 'Tusuk',
      variations: 'Original, Pedas, Sangat Pedas',
      modifiers: 'Tambah Keju:2000, Tambah Mayo:1000'
    });
    setProductModal({} as any); // Trigger modal
  };

  const openEditModal = (item: MenuItem) => {
    setIsEditMode(true);
    setFormData({
      name: item.name,
      category: item.category,
      price: item.price,
      image: item.image,
      stock: item.stock,
      minStock: item.minStock,
      unit: item.unit,
      variations: item.variations?.join(', ') || '',
      modifiers: item.modifiers?.map(m => `${m.name}:${m.price}`).join(', ') || ''
    });
    setProductModal(item);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Parse variations and modifiers
    const variationsArray = formData.variations.split(',').map(s => s.trim()).filter(Boolean);
    const modifiersArray = formData.modifiers.split(',').map(s => {
      const parts = s.split(':');
      if (parts.length === 2) {
        return { name: parts[0].trim(), price: Number(parts[1].trim()) || 0 };
      }
      return null;
    }).filter(Boolean) as { name: string; price: number }[];

    const payload = {
      name: formData.name,
      category: formData.category,
      price: Number(formData.price),
      image: formData.image,
      stock: Number(formData.stock),
      minStock: Number(formData.minStock),
      unit: formData.unit,
      variations: variationsArray,
      modifiers: modifiersArray
    };

    try {
      let url = '/api/v1/menu';
      let method = 'POST';

      if (isEditMode && productModal?.id) {
        url = `/api/v1/menu/${productModal.id}`;
        method = 'PUT';
      }

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        setProductModal(null);
        fetchMenu();
      } else {
        alert('Gagal menyimpan menu');
      }
    } catch (err) {
      console.error('Error saving menu:', err);
    }
  };

  const handleDeleteItem = async (itemId: string) => {
    if (!confirm('Apakah Daeng yakin ingin menghapus produk ini dari katalog menu?')) return;

    try {
      const res = await fetch(`/api/v1/menu/${itemId}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        fetchMenu();
      }
    } catch (err) {
      console.error('Error deleting item:', err);
    }
  };

  const filteredMenu = menu.filter(item => {
    return activeTab === 'ALL' || item.category === activeTab;
  });

  return (
    <div className="space-y-4">
      {/* Settings Toolbar */}
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex flex-col md:flex-row justify-between items-center gap-3">
        {/* Category filtering */}
        <div className="flex gap-2.5">
          {([
            { code: 'ALL', label: 'Semua Katalog' },
            { code: 'Makanan', label: 'Kategori Makanan' },
            { code: 'Minuman', label: 'Kategori Minuman' },
            { code: 'Frozen Food', label: 'Kategori Frozen Food' }
          ] as const).map((tab) => (
            <button
              key={tab.code}
              onClick={() => setActiveTab(tab.code)}
              className={`px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === tab.code 
                  ? 'bg-amber-500 text-slate-950' 
                  : 'bg-slate-50 text-slate-500 hover:bg-slate-100'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="flex gap-2">
          <button
            onClick={openAddModal}
            className="bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold px-4 py-2.5 rounded-xl flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Tambah Menu</span>
          </button>
          <button onClick={fetchMenu} className="bg-slate-100 hover:bg-slate-200 text-slate-600 p-2.5 rounded-xl cursor-pointer">
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Grid catalog cards */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 bg-white rounded-3xl border border-slate-100">
          <RefreshCw className="w-8 h-8 animate-spin text-amber-500" />
        </div>
      ) : filteredMenu.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-3xl border border-slate-100 p-8">
          <Layers className="w-12 h-12 text-slate-200 mx-auto mb-3" />
          <p className="text-slate-500 text-xs font-semibold">Katalog menu kosong.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredMenu.map((item) => (
            <div 
              key={item.id}
              className="bg-white rounded-2xl border border-slate-100 p-4 shadow-sm flex flex-col justify-between group hover:border-amber-300 transition-all"
            >
              <div>
                {/* Header info */}
                <div className="flex gap-3.5">
                  <div className="w-16 h-16 rounded-xl bg-slate-50 overflow-hidden shrink-0 border border-slate-100">
                    <img src={item.image} alt={item.name} referrerPolicy="no-referrer" className="w-full h-full object-cover" />
                  </div>
                  <div className="space-y-1 overflow-hidden">
                    <span className="text-[9px] bg-slate-100 text-slate-500 font-extrabold px-1.5 py-0.5 rounded uppercase tracking-wider">
                      {item.category}
                    </span>
                    <h4 className="text-xs font-extrabold text-slate-800 leading-snug truncate">{item.name}</h4>
                    <span className="text-xs font-black text-amber-600 font-mono block">Rp {item.price.toLocaleString('id-ID')}</span>
                  </div>
                </div>

                {/* Sub details: Stock / Modifiers */}
                <div className="mt-4 pt-3 border-t border-slate-100/60 space-y-2 text-[10px] text-slate-400 font-semibold">
                  <div className="flex justify-between">
                    <span>Stok Saat Ini:</span>
                    <span className={`font-mono font-bold ${item.stock <= item.minStock ? 'text-red-600' : 'text-slate-700'}`}>
                      {item.stock} {item.unit}
                    </span>
                  </div>
                  {item.variations && (
                    <div className="flex flex-col">
                      <span className="text-[9px] text-slate-400">Variasi:</span>
                      <span className="text-slate-600 font-bold mt-0.5 truncate">{item.variations.join(', ')}</span>
                    </div>
                  )}
                  {item.modifiers && item.modifiers.length > 0 && (
                    <div className="flex flex-col">
                      <span className="text-[9px] text-slate-400">Modifiers:</span>
                      <span className="text-slate-600 font-bold mt-0.5 truncate">{item.modifiers.map(m => `${m.name} (+Rp ${m.price})`).join(', ')}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="mt-4 pt-3.5 border-t border-slate-100 flex flex-col gap-2">
                <button
                  onClick={() => openRestockModal(item)}
                  className="w-full bg-amber-500 hover:bg-amber-400 text-slate-950 py-2 rounded-xl text-[11px] font-extrabold flex items-center justify-center gap-1.5 cursor-pointer shadow-xs transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Tambah Stok Jualan</span>
                </button>
                <div className="flex gap-2">
                  <button
                    onClick={() => openEditModal(item)}
                    className="flex-1 bg-slate-50 hover:bg-amber-50 hover:text-amber-800 border border-slate-100 py-2 rounded-xl text-[11px] font-bold text-slate-600 flex items-center justify-center gap-1 cursor-pointer transition-colors"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>Ubah Info</span>
                  </button>
                  <button
                    onClick={() => handleDeleteItem(item.id)}
                    className="p-2 bg-slate-50 hover:bg-red-50 hover:text-red-600 hover:border-red-200 border border-slate-100 rounded-xl text-slate-400 transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

            </div>
          ))}
        </div>
      )}

      {/* MODAL: Create / Edit Product Form */}
      {productModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-fade-in">
          <form onSubmit={handleFormSubmit} className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl relative">
            <h3 className="text-sm font-black text-slate-800 mb-4">
              {isEditMode ? 'Ubah Informasi Menu' : 'Tambah Produk Baru'}
            </h3>

            <div className="space-y-3.5 text-xs">
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Nama Produk</label>
                <input 
                  type="text" 
                  required
                  value={formData.name || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Contoh: Bakso Ayam Bakar"
                  className="w-full bg-slate-50 border border-slate-150 rounded-xl px-3.5 py-2.5 font-bold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Kategori</label>
                  <select
                    value={formData.category || 'Makanan'}
                    onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value as any }))}
                    className="w-full bg-slate-50 border border-slate-150 rounded-xl px-3 py-2.5 font-bold text-slate-700"
                  >
                    <option value="Makanan">Makanan</option>
                    <option value="Minuman">Minuman</option>
                    <option value="Frozen Food">Frozen Food</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Harga Jual (Rp)</label>
                  <input 
                    type="number" 
                    required
                    value={formData.price || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, price: Number(e.target.value) }))}
                    placeholder="10000"
                    className="w-full bg-slate-50 border border-slate-150 rounded-xl px-3.5 py-2.5 font-bold font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Stok Fisik</label>
                  <input 
                    type="number" 
                    required
                    value={formData.stock || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, stock: Number(e.target.value) }))}
                    placeholder="100"
                    className="w-full bg-slate-50 border border-slate-150 rounded-xl px-3.5 py-2.5 font-bold"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Satuan Jual</label>
                  <input 
                    type="text" 
                    required
                    value={formData.unit || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, unit: e.target.value }))}
                    placeholder="Tusuk, Pcs, Gelas, Pack..."
                    className="w-full bg-slate-50 border border-slate-150 rounded-xl px-3.5 py-2.5 font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1.5">Foto Produk</label>
                
                {/* Drag and Drop / Device Upload Container */}
                <div
                  onDragEnter={handleDrag}
                  onDragOver={handleDrag}
                  onDragLeave={handleDrag}
                  onDrop={handleDrop}
                  onClick={() => document.getElementById('file-upload-input')?.click()}
                  className={`relative border-2 border-dashed rounded-2xl p-4 transition-all flex flex-col items-center justify-center text-center cursor-pointer min-h-[120px] ${
                    dragActive 
                      ? 'border-amber-500 bg-amber-50/50' 
                      : 'border-slate-200 hover:border-amber-400 bg-slate-50 hover:bg-slate-100/50'
                  }`}
                >
                  <input
                    id="file-upload-input"
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                  
                  {formData.image ? (
                    <div className="flex items-center gap-3 w-full">
                      <div className="w-16 h-16 rounded-xl bg-white border border-slate-100 overflow-hidden shrink-0 shadow-xs relative">
                        <img 
                          src={formData.image} 
                          alt="Pratinjau" 
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-cover" 
                        />
                      </div>
                      <div className="text-left flex-1 min-w-0">
                        <p className="text-[11px] font-bold text-slate-700 truncate">Gambar Terpilih</p>
                        <p className="text-[9px] text-slate-400 mt-0.5">
                          {formData.image.startsWith('data:') ? 'Unggahan lokal' : 'Tautan gambar URL'}
                        </p>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setFormData(prev => ({ ...prev, image: '' }));
                          }}
                          className="mt-1 text-[10px] text-red-500 hover:text-red-600 font-extrabold flex items-center gap-0.5"
                        >
                          Hapus Gambar
                        </button>
                      </div>
                      <div className="text-[10px] text-slate-400 font-bold flex flex-col items-center gap-0.5 shrink-0 bg-slate-200/50 px-2.5 py-1.5 rounded-lg border border-slate-200">
                        <Upload className="w-3.5 h-3.5 text-slate-500" />
                        <span>Ganti</span>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-1.5 py-2">
                      <div className="w-9 h-9 rounded-full bg-amber-500/10 text-amber-600 flex items-center justify-center mx-auto">
                        <Upload className="w-5 h-5 animate-bounce" />
                      </div>
                      <div className="text-slate-600 font-bold text-[11px]">
                        Seret & Lepas gambar di sini, atau <span className="text-amber-600 hover:underline">Pilih dari perangkat</span>
                      </div>
                      <p className="text-[9px] text-slate-400">Mendukung format JPG, PNG, WEBP (Maksimal 4MB)</p>
                    </div>
                  )}
                </div>

                {/* URL Option underneath */}
                <div className="mt-2.5">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[9px] font-bold text-slate-400 uppercase">Atau masukkan Tautan Gambar (URL)</span>
                    {formData.image && !formData.image.startsWith('data:') && (
                      <span className="text-[9px] text-emerald-600 font-bold flex items-center gap-0.5">✓ Tautan Aktif</span>
                    )}
                  </div>
                  <input 
                    type="text" 
                    value={formData.image.startsWith('data:') ? '' : formData.image}
                    onChange={(e) => setFormData(prev => ({ ...prev, image: e.target.value }))}
                    placeholder="https://images.unsplash.com/..."
                    className="w-full bg-slate-50 border border-slate-150 rounded-xl px-3.5 py-2 font-mono text-[11px]"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Variasi Rasa (Pisahkan Koma)</label>
                <input 
                  type="text" 
                  value={formData.variations}
                  onChange={(e) => setFormData(prev => ({ ...prev, variations: e.target.value }))}
                  placeholder="Original, Pedas, Sangat Pedas"
                  className="w-full bg-slate-50 border border-slate-150 rounded-xl px-3.5 py-2.5"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Modifiers / Topping (Format: Topping:Harga, Topping:Harga)</label>
                <input 
                  type="text" 
                  value={formData.modifiers}
                  onChange={(e) => setFormData(prev => ({ ...prev, modifiers: e.target.value }))}
                  placeholder="Tambah Keju:2000, Tambah Mayo:1000"
                  className="w-full bg-slate-50 border border-slate-150 rounded-xl px-3.5 py-2.5 font-mono"
                />
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-slate-100 flex gap-2">
              <button 
                type="button" 
                onClick={() => setProductModal(null)}
                className="bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold text-xs px-4 py-3.5 rounded-xl flex-1 cursor-pointer"
              >
                Batal
              </button>
              <button 
                type="submit"
                className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs px-5 py-3.5 rounded-xl flex-1 shadow shadow-amber-500/10 cursor-pointer"
              >
                Simpan Menu
              </button>
            </div>
          </form>
         </div>
      )}

      {/* MODAL: Tambah Stok Jualan */}
      {restockItem && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-fade-in">
          <form onSubmit={handleRestockSubmit} className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl relative border border-slate-100">
            <div className="flex items-center gap-2 mb-3">
              <div className="p-2 bg-amber-50 text-amber-600 rounded-xl">
                <Package className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-black text-slate-800">
                Tambah Stok Jualan
              </h3>
            </div>

            <p className="text-xs text-slate-500 font-medium mb-4">
              Menambah stok fisik untuk menu jualan <span className="font-extrabold text-slate-700">{restockItem.name}</span>.
            </p>

            <div className="space-y-4 text-xs">
              {/* Info Ringkas */}
              <div className="bg-slate-50 rounded-2xl p-3.5 border border-slate-100 flex justify-between items-center">
                <div>
                  <span className="text-[10px] text-slate-400 font-bold uppercase block">Stok Sekarang</span>
                  <span className="text-sm font-extrabold text-slate-800 font-mono">
                    {restockItem.stock} {restockItem.unit}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-slate-400 font-bold uppercase block">Setelah Ditambah</span>
                  <span className="text-sm font-extrabold text-amber-600 font-mono">
                    {Number(restockItem.stock) + Number(customRestockQty || 0)} {restockItem.unit}
                  </span>
                </div>
              </div>

              {/* Pilihan Quick Add */}
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1.5">Pilihan Cepat</label>
                <div className="grid grid-cols-4 gap-2">
                  {([10, 25, 50, 100] as const).map((amount) => (
                    <button
                      key={amount}
                      type="button"
                      onClick={() => setCustomRestockQty(amount)}
                      className={`py-2 rounded-xl text-xs font-bold font-mono transition-all border cursor-pointer ${
                        customRestockQty === amount
                          ? 'bg-amber-500 text-slate-950 border-amber-500'
                          : 'bg-slate-50 hover:bg-slate-100 text-slate-600 border-slate-150'
                      }`}
                    >
                      +{amount}
                    </button>
                  ))}
                </div>
              </div>

              {/* Input Manual */}
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Jumlah Tambahan Lainnya</label>
                <div className="relative">
                  <input
                    type="number"
                    required
                    min="1"
                    value={customRestockQty || ''}
                    onChange={(e) => setCustomRestockQty(Math.max(1, Number(e.target.value)))}
                    placeholder="Masukkan jumlah tambahan"
                    className="w-full bg-slate-50 border border-slate-150 rounded-xl px-3.5 py-2.5 font-bold font-mono"
                  />
                  <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold">
                    {restockItem.unit}
                  </span>
                </div>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-slate-100 flex gap-2">
              <button
                type="button"
                onClick={() => setRestockItem(null)}
                className="bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold text-xs px-4 py-3.5 rounded-xl flex-1 cursor-pointer"
              >
                Batal
              </button>
              <button
                type="submit"
                className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs px-5 py-3.5 rounded-xl flex-1 shadow shadow-amber-500/10 cursor-pointer"
              >
                Konfirmasi
              </button>
            </div>
          </form>
        </div>
      )}

    </div>
  );
}
