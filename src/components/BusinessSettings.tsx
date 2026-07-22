import React, { useState, useEffect } from 'react';
import { 
  Store, MapPin, Phone, MessageSquare, Instagram, Video, 
  Clock, Tag, Percent, Globe, Calendar, RefreshCw, Save, CheckCircle, AlertTriangle 
} from 'lucide-react';

interface StoreProfile {
  name: string;
  logo: string;
  address: string;
  phone: string;
  googleMaps: string;
  instagram: string;
  tiktok: string;
  operationalHours: string;
  categories: string[];
}

interface SettingsConfig {
  serviceChargePercent: number;
  taxPercent: number;
  currency: string;
  timezone: string;
  storeProfile: StoreProfile;
}

export default function BusinessSettings({ onSettingsSaved }: { onSettingsSaved?: (profile: StoreProfile) => void }) {
  const [settings, setSettings] = useState<SettingsConfig | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  
  // Tag input temporary state
  const [newCategory, setNewCategory] = useState('');

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const res = await fetch('/api/v1/settings');
      if (res.ok) {
        const data = await res.json();
        setSettings({
          serviceChargePercent: data?.serviceChargePercent ?? 0,
          taxPercent: data?.taxPercent ?? 0,
          currency: data?.currency || 'Rupiah',
          timezone: data?.timezone || 'WITA (UTC+8)',
          storeProfile: {
            name: data?.storeProfile?.name || '',
            logo: data?.storeProfile?.logo || '',
            address: data?.storeProfile?.address || '',
            phone: data?.storeProfile?.phone || '',
            googleMaps: data?.storeProfile?.googleMaps || '',
            instagram: data?.storeProfile?.instagram || '',
            tiktok: data?.storeProfile?.tiktok || '',
            operationalHours: data?.storeProfile?.operationalHours || '',
            categories: data?.storeProfile?.categories || ['Makanan', 'Minuman', 'Frozen Food']
          }
        });
      } else {
        setErrorMsg('Gagal mengambil pengaturan usaha.');
      }
    } catch (err) {
      console.error('Error fetching settings:', err);
      setErrorMsg('Kesalahan koneksi saat mengambil pengaturan.');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!settings) return;

    setSaving(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const res = await fetch('/api/v1/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings)
      });

      if (res.ok) {
        const data = await res.json();
        setSettings(data);
        if (onSettingsSaved && data.storeProfile) {
          onSettingsSaved(data.storeProfile);
        }
        setSuccessMsg('Informasi usaha dan pengaturan berhasil disimpan!');
        setTimeout(() => setSuccessMsg(''), 4000);
      } else {
        setErrorMsg('Gagal menyimpan perubahan pengaturan.');
      }
    } catch (err) {
      console.error('Error saving settings:', err);
      setErrorMsg('Kesalahan koneksi saat menyimpan pengaturan.');
    } finally {
      setSaving(false);
    }
  };

  const handleProfileChange = (key: keyof StoreProfile, value: any) => {
    if (!settings) return;
    setSettings({
      ...settings,
      storeProfile: {
        ...settings.storeProfile,
        [key]: value
      }
    });
  };

  const handleConfigChange = (key: keyof Omit<SettingsConfig, 'storeProfile'>, value: any) => {
    if (!settings) return;
    setSettings({
      ...settings,
      [key]: value
    });
  };

  const addCategory = () => {
    if (!settings || !newCategory.trim()) return;
    const currentCats = settings.storeProfile.categories || [];
    if (!currentCats.includes(newCategory.trim())) {
      handleProfileChange('categories', [...currentCats, newCategory.trim()]);
    }
    setNewCategory('');
  };

  const removeCategory = (catToRemove: string) => {
    if (!settings) return;
    const currentCats = settings.storeProfile.categories || [];
    handleProfileChange('categories', currentCats.filter(c => c !== catToRemove));
  };

  if (loading || !settings) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3">
        <RefreshCw className="w-8 h-8 text-emerald-500 animate-spin" />
        <p className="text-slate-400 text-sm font-semibold">Memuat informasi & pengaturan usaha...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <span className="text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-extrabold px-2 py-0.5 rounded uppercase tracking-wider font-mono">
            Pengaturan Usaha Utama
          </span>
          <h2 className="text-xl md:text-2xl font-black text-white mt-1.5 flex items-center gap-2">
            <Store className="w-6 h-6 text-emerald-400" /> Profil Usaha & Pengaturan
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Konfigurasi identitas gerai, kanal komunikasi sosial, pajak, biaya layanan, dan zona waktu operasional.
          </p>
        </div>

        <button 
          onClick={fetchSettings}
          disabled={loading || saving}
          className="bg-slate-900/60 hover:bg-slate-800 border border-slate-800 text-slate-300 p-2.5 rounded-xl flex items-center gap-2 text-xs font-black transition-all cursor-pointer"
          title="Muat Ulang"
        >
          <RefreshCw className={`w-4 h-4 ${(loading || saving) ? 'animate-spin' : ''}`} />
          <span>Segarkan</span>
        </button>
      </div>

      {/* Notifications */}
      {successMsg && (
        <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400 flex items-center gap-3 text-xs font-semibold">
          <CheckCircle className="w-4 h-4 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 flex items-center gap-3 text-xs font-semibold">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Main Form */}
      <form onSubmit={handleSave} className="space-y-6">
        
        {/* Row 1: Profil Warung (Card) */}
        <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-6 space-y-6">
          <div className="border-b border-slate-800 pb-4">
            <h3 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
              <Store className="w-4 h-4 text-emerald-400" /> Profil Gerai Warung
            </h3>
            <p className="text-[11px] text-slate-500 mt-1">Informasi legalitas dan kontak utama yang tampil di struk kasir, invoice, dan QR Self-Order.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            
            {/* Nama Usaha */}
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Nama Usaha</label>
              <div className="relative">
                <input 
                  type="text" 
                  value={settings.storeProfile?.name || ''}
                  onChange={(e) => handleProfileChange('name', e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2.5 px-3.5 pl-10 text-xs font-semibold text-slate-200 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                  required
                />
                <Store className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5" />
              </div>
            </div>

            {/* Logo Usaha */}
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Logo Usaha (Deskripsi / URL)</label>
              <div className="relative">
                <input 
                  type="text" 
                  value={settings.storeProfile?.logo || ''}
                  onChange={(e) => handleProfileChange('logo', e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2.5 px-3.5 pl-10 text-xs font-semibold text-slate-200 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                  required
                />
                <Globe className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5" />
              </div>
            </div>

            {/* Alamat Usaha */}
            <div className="space-y-2 md:col-span-2">
              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Alamat Lengkap Gerai</label>
              <div className="relative">
                <textarea 
                  value={settings.storeProfile?.address || ''}
                  onChange={(e) => handleProfileChange('address', e.target.value)}
                  rows={2}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2.5 px-3.5 pl-10 text-xs font-semibold text-slate-200 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                  required
                />
                <MapPin className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5" />
              </div>
            </div>

            {/* Google Maps Query / Link */}
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Google Maps Search / Link</label>
              <div className="relative">
                <input 
                  type="text" 
                  value={settings.storeProfile?.googleMaps || ''}
                  onChange={(e) => handleProfileChange('googleMaps', e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2.5 px-3.5 pl-10 text-xs font-semibold text-slate-200 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                  required
                />
                <MapPin className="w-4 h-4 text-amber-500 absolute left-3.5 top-3.5" />
              </div>
            </div>

            {/* WhatsApp */}
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Nomor WhatsApp Operasional</label>
              <div className="relative">
                <input 
                  type="text" 
                  value={settings.storeProfile?.phone || ''}
                  onChange={(e) => handleProfileChange('phone', e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2.5 px-3.5 pl-10 text-xs font-semibold text-slate-200 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                  required
                />
                <Phone className="w-4 h-4 text-emerald-500 absolute left-3.5 top-3.5" />
              </div>
            </div>

            {/* Instagram */}
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Instagram Gerai</label>
              <div className="relative">
                <input 
                  type="text" 
                  value={settings.storeProfile?.instagram || ''}
                  onChange={(e) => handleProfileChange('instagram', e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2.5 px-3.5 pl-10 text-xs font-semibold text-slate-200 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                  placeholder="@username"
                />
                <Instagram className="w-4 h-4 text-pink-500 absolute left-3.5 top-3.5" />
              </div>
            </div>

            {/* TikTok */}
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">TikTok Gerai</label>
              <div className="relative">
                <input 
                  type="text" 
                  value={settings.storeProfile?.tiktok || ''}
                  onChange={(e) => handleProfileChange('tiktok', e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2.5 px-3.5 pl-10 text-xs font-semibold text-slate-200 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                  placeholder="@username"
                />
                <Video className="w-4 h-4 text-cyan-400 absolute left-3.5 top-3.5" />
              </div>
            </div>

            {/* Jam Operasional */}
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Jam Operasional</label>
              <div className="relative">
                <input 
                  type="text" 
                  value={settings.storeProfile?.operationalHours || ''}
                  onChange={(e) => handleProfileChange('operationalHours', e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2.5 px-3.5 pl-10 text-xs font-semibold text-slate-200 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                  required
                />
                <Clock className="w-4 h-4 text-indigo-400 absolute left-3.5 top-3.5" />
              </div>
            </div>

            {/* Kategori Usaha (Array of Tags) */}
            <div className="space-y-2 md:col-span-2">
              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Kategori Usaha / Bisnis</label>
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-3.5 space-y-3">
                
                {/* Visual Category Tags */}
                <div className="flex flex-wrap gap-2">
                  {(settings.storeProfile.categories || []).map((cat, i) => (
                    <span 
                      key={i}
                      className="bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-[11px] font-bold px-3 py-1 rounded-full flex items-center gap-1.5"
                    >
                      <span>{cat}</span>
                      <button 
                        type="button" 
                        onClick={() => removeCategory(cat)}
                        className="text-emerald-500 hover:text-emerald-300 transition-colors font-extrabold"
                        title="Hapus"
                      >
                        &times;
                      </button>
                    </span>
                  ))}
                  {(settings.storeProfile.categories || []).length === 0 && (
                    <span className="text-slate-600 text-xs italic">Kategori kosong. Silakan tambahkan kategori.</span>
                  )}
                </div>

                {/* Input category */}
                <div className="flex gap-2">
                  <input 
                    type="text"
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value)}
                    placeholder="Contoh: Kuliner, Minuman, Frozen Food"
                    className="bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-xs font-medium text-slate-200 focus:outline-none focus:border-emerald-500 max-w-xs"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        addCategory();
                      }
                    }}
                  />
                  <button
                    type="button"
                    onClick={addCategory}
                    className="bg-slate-800 hover:bg-slate-750 text-slate-200 border border-slate-700 px-4 rounded-lg text-xs font-bold transition-all"
                  >
                    Tambah Kategori
                  </button>
                </div>
              </div>
            </div>

          </div>
        </div>

        {/* Row 2: Pengaturan Keuangan & Sistem (Card) */}
        <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-6 space-y-6">
          <div className="border-b border-slate-800 pb-4">
            <h3 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
              <Percent className="w-4 h-4 text-emerald-400" /> Kebijakan Keuangan & Regional
            </h3>
            <p className="text-[11px] text-slate-500 mt-1">Konfigurasi nilai persentase pajak, biaya layanan, standard mata uang, dan penentuan zona waktu.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-5">
            
            {/* Pajak (%) */}
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Pajak Pertambahan Nilai (PPN)</label>
              <div className="relative">
                <input 
                  type="number" 
                  min="0"
                  max="100"
                  step="0.1"
                  value={settings.taxPercent}
                  onChange={(e) => handleConfigChange('taxPercent', Number(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2.5 px-3.5 pl-10 pr-8 text-xs font-semibold text-slate-200 focus:outline-none focus:border-emerald-500"
                  required
                />
                <Percent className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5" />
                <span className="text-xs text-slate-500 absolute right-3.5 top-3 font-semibold">%</span>
              </div>
            </div>

            {/* Service Charge (%) */}
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Service Charge (Layanan)</label>
              <div className="relative">
                <input 
                  type="number" 
                  min="0"
                  max="100"
                  step="0.1"
                  value={settings.serviceChargePercent}
                  onChange={(e) => handleConfigChange('serviceChargePercent', Number(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2.5 px-3.5 pl-10 pr-8 text-xs font-semibold text-slate-200 focus:outline-none focus:border-emerald-500"
                  required
                />
                <Percent className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5" />
                <span className="text-xs text-slate-500 absolute right-3.5 top-3 font-semibold">%</span>
              </div>
            </div>

            {/* Mata Uang */}
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Mata Uang Default</label>
              <div className="relative">
                <select
                  value={settings.currency}
                  onChange={(e) => handleConfigChange('currency', e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2.5 px-3.5 pl-10 text-xs font-semibold text-slate-200 focus:outline-none focus:border-emerald-500 appearance-none cursor-pointer"
                >
                  <option value="Rupiah">Rupiah (IDR)</option>
                  <option value="Dollar">US Dollar (USD)</option>
                  <option value="Euro">Euro (EUR)</option>
                </select>
                <Globe className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5" />
              </div>
            </div>

            {/* Zona Waktu */}
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Zona Waktu Sistem</label>
              <div className="relative">
                <select
                  value={settings.timezone}
                  onChange={(e) => handleConfigChange('timezone', e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2.5 px-3.5 pl-10 text-xs font-semibold text-slate-200 focus:outline-none focus:border-emerald-500 appearance-none cursor-pointer"
                >
                  <option value="WITA (UTC+8)">WITA (Makassar/Soppeng, UTC+8)</option>
                  <option value="WIB (UTC+7)">WIB (Jakarta, UTC+7)</option>
                  <option value="WIT (UTC+9)">WIT (Jayapura, UTC+9)</option>
                  <option value="UTC">Coordinated Universal Time (UTC)</option>
                </select>
                <Calendar className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5" />
              </div>
            </div>

          </div>
        </div>

        {/* Big Save Button */}
        <div className="flex justify-end pt-2">
          <button
            type="submit"
            disabled={saving}
            className="bg-emerald-500 hover:bg-emerald-600 disabled:bg-emerald-800 text-slate-950 font-black px-6 py-3.5 rounded-2xl flex items-center gap-2.5 text-sm transition-all shadow-xl shadow-emerald-500/15 cursor-pointer hover:scale-[1.01] active:scale-[0.99]"
          >
            {saving ? (
              <>
                <RefreshCw className="w-4.5 h-4.5 animate-spin text-slate-950" />
                <span>Menyimpan Perubahan...</span>
              </>
            ) : (
              <>
                <Save className="w-4.5 h-4.5 stroke-[2.5]" />
                <span>Simpan Semua Pengaturan</span>
              </>
            )}
          </button>
        </div>

      </form>

    </div>
  );
}
