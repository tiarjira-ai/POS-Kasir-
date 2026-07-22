import React, { useState, useEffect, useRef } from 'react';
import { 
  Flame, CheckCircle, PackageCheck, Play, Utensils, 
  Clock, AlertCircle, RefreshCw, Volume2 
} from 'lucide-react';
import { Order } from '../types';
import { db, safeOnSnapshot } from '../lib/firebaseClientApi';

export default function KDSView() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(false);
  const previousCountRef = useRef(0);

  useEffect(() => {
    // Real-time subscription for instantaneous Kitchen Display System updates
    const unsubscribe = safeOnSnapshot('orders', (allOrders: Order[]) => {
      const activeOrders = allOrders
        .filter(o => ['PENDING', 'COOKING', 'READY'].includes(o.status))
        .sort((a, b) => {
          const tA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
          const tB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
          return tA - tB; // oldest first
        });

      setOrders(activeOrders);

      // Play kitchen chime if a new order arrives
      if (activeOrders.length > previousCountRef.current && previousCountRef.current > 0) {
        playKitchenChime();
      }
      previousCountRef.current = activeOrders.length;
    });

    return () => unsubscribe();
  }, []);

  const fetchActiveOrders = async () => {
    try {
      const res = await fetch('/api/v1/kds/orders');
      if (res.ok) {
        const data = await res.json();
        setOrders(data);
        previousCountRef.current = data.length;
      }
    } catch (err) {
      console.error('Error fetching kitchen orders:', err);
    }
  };

  // Synthesize kitchen chime using Web Audio API to prevent broken external file links
  const playKitchenChime = () => {
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, ctx.currentTime); // High pitched pleasant A5 note
      osc.frequency.exponentialRampToValueAtTime(1200, ctx.currentTime + 0.15);
      
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.4);
    } catch (e) {
      console.warn('Audio context not allowed by browser permissions:', e);
    }
  };

  const updateOrderStatus = async (orderId: string, nextStatus: 'COOKING' | 'READY' | 'DELIVERED') => {
    setLoading(true);
    try {
      const res = await fetch('/api/v1/kds/status', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId, status: nextStatus }),
      });
      if (res.ok) {
        fetchActiveOrders();
      }
    } catch (err) {
      console.error('Error updating kitchen order status:', err);
    } finally {
      setLoading(false);
    }
  };

  // Group active orders by current cooking lanes
  const pendingOrders = orders.filter(o => o.status === 'PENDING');
  const cookingOrders = orders.filter(o => o.status === 'COOKING');
  const readyOrders = orders.filter(o => o.status === 'READY');

  return (
    <div className="space-y-4 h-[calc(100vh-140px)] flex flex-col overflow-hidden">
      
      {/* KDS Header Controls */}
      <div className="bg-[#0F172A]/70 backdrop-blur-md p-4 rounded-2xl border border-slate-800/80 flex justify-between items-center shrink-0">
        <div>
          <h1 className="text-sm font-bold text-slate-100 flex items-center gap-2">
            <Utensils className="w-5 h-5 text-emerald-400 animate-pulse" />
            Kitchen Display System (KDS)
          </h1>
          <p className="text-xs text-slate-400">Monitor antrean masak dapur utama real-time</p>
        </div>

        <div className="flex gap-2">
          {/* Sound test button */}
          <button 
            onClick={playKitchenChime}
            className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all border border-slate-700/60 cursor-pointer"
          >
            <Volume2 className="w-4 h-4 text-emerald-400 animate-bounce" />
            <span>Tes Bell</span>
          </button>
          
          <button 
            onClick={fetchActiveOrders}
            className="flex items-center gap-1.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 px-3.5 py-2.5 rounded-xl text-xs font-black transition-all cursor-pointer shadow-[0_0_12px_rgba(16,185,129,0.3)]"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Lanes Grid */}
      <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-6 overflow-hidden">
        
        {/* COLUMN 1: PENDING (Antrean Baru) */}
        <div className="bg-[#0F172A]/40 rounded-3xl p-4 flex flex-col h-full overflow-hidden border border-slate-800/80">
          <div className="flex justify-between items-center mb-3 shrink-0">
            <span className="text-xs font-extrabold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-slate-500 animate-ping" />
              Baru (Antrean)
            </span>
            <span className="bg-slate-800 border border-slate-700/60 text-slate-300 font-mono font-bold text-xs px-2 py-0.5 rounded-full">
              {pendingOrders.length}
            </span>
          </div>

          <div className="flex-1 overflow-y-auto space-y-3 pr-1">
            {pendingOrders.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-40 text-center">
                <Clock className="w-8 h-8 text-slate-700 mb-1" />
                <p className="text-slate-500 text-[10px] font-semibold">Tidak ada antrean baru</p>
              </div>
            ) : (
              pendingOrders.map((o) => (
                <KdsOrderCard key={o.id} order={o} onAction={() => updateOrderStatus(o.id, 'COOKING')} actionLabel="Mulai Masak" actionIcon={Play} colorTheme="pending" />
              ))
            )}
          </div>
        </div>

        {/* COLUMN 2: COOKING (Sedang Dimasak) */}
        <div className="bg-[#0F172A]/40 rounded-3xl p-4 flex flex-col h-full overflow-hidden border border-amber-500/10">
          <div className="flex justify-between items-center mb-3 shrink-0">
            <span className="text-xs font-extrabold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
              <Flame className="w-4.5 h-4.5 text-amber-500 animate-bounce" />
              Sedang Dimasak
            </span>
            <span className="bg-amber-500/10 border border-amber-500/20 text-amber-400 font-mono font-bold text-xs px-2 py-0.5 rounded-full">
              {cookingOrders.length}
            </span>
          </div>

          <div className="flex-1 overflow-y-auto space-y-3 pr-1">
            {cookingOrders.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-40 text-center">
                <Flame className="w-8 h-8 text-slate-800 mb-1" />
                <p className="text-slate-600 text-[10px] font-semibold">Kompor masih mati</p>
              </div>
            ) : (
              cookingOrders.map((o) => (
                <KdsOrderCard key={o.id} order={o} onAction={() => updateOrderStatus(o.id, 'READY')} actionLabel="Selesai Masak" actionIcon={CheckCircle} colorTheme="cooking" />
              ))
            )}
          </div>
        </div>

        {/* COLUMN 3: READY (Siap Sajikan) */}
        <div className="bg-[#0F172A]/40 rounded-3xl p-4 flex flex-col h-full overflow-hidden border border-emerald-500/10">
          <div className="flex justify-between items-center mb-3 shrink-0">
            <span className="text-xs font-extrabold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
              <CheckCircle className="w-4 h-4 text-emerald-500" />
              Siap Saji
            </span>
            <span className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-mono font-bold text-xs px-2 py-0.5 rounded-full">
              {readyOrders.length}
            </span>
          </div>

          <div className="flex-1 overflow-y-auto space-y-3 pr-1">
            {readyOrders.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-40 text-center">
                <Utensils className="w-8 h-8 text-slate-800 mb-1" />
                <p className="text-slate-600 text-[10px] font-semibold">Semua masakan sudah tersaji</p>
              </div>
            ) : (
              readyOrders.map((o) => (
                <KdsOrderCard key={o.id} order={o} onAction={() => updateOrderStatus(o.id, 'DELIVERED')} actionLabel="Sajikan" actionIcon={PackageCheck} colorTheme="ready" />
              ))
            )}
          </div>
        </div>

      </div>
    </div>
  );
}

interface KdsOrderCardProps {
  key?: string;
  order: Order;
  onAction: () => void;
  actionLabel: string;
  actionIcon: any;
  colorTheme: 'pending' | 'cooking' | 'ready';
}

function KdsOrderCard({ order, onAction, actionLabel, actionIcon: ActionIcon, colorTheme }: KdsOrderCardProps) {
  // Prep duration tracker
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const start = new Date(order.createdAt).getTime();
    const updateTime = () => {
      setElapsed(Math.floor((Date.now() - start) / 1000));
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, [order.createdAt]);

  const elapsedMin = Math.floor(elapsed / 60);
  const isOverdue = elapsedMin > (order.estimatedPrepTime || 12);

  const cardBorderClass = 
    colorTheme === 'cooking' 
      ? 'border-amber-500/30' 
      : colorTheme === 'ready' 
        ? 'border-emerald-500/30 shadow-[0_0_12px_rgba(16,185,129,0.05)]' 
        : 'border-slate-800';

  const headingBgClass =
    colorTheme === 'cooking' 
      ? 'bg-amber-500/10 text-amber-400 border-b border-slate-850' 
      : colorTheme === 'ready' 
        ? 'bg-emerald-500/10 text-emerald-400 border-b border-slate-850' 
        : 'bg-slate-900/60 text-slate-300 border-b border-slate-850';

  return (
    <div className={`bg-slate-900/95 rounded-2xl shadow-xl border ${cardBorderClass} overflow-hidden flex flex-col justify-between`}>
      {/* Card Header */}
      <div className={`px-3.5 py-2.5 ${headingBgClass} flex justify-between items-center`}>
        <div>
          <span className="font-bold text-xs text-slate-100">Antrean Q-{order.queueNumber}</span>
          {order.tableNumber && (
            <span className="ml-2.5 bg-slate-950/60 text-emerald-400 px-1.5 py-0.5 rounded text-[10px] font-extrabold border border-slate-800">
              Meja {order.tableNumber}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1 text-[10px] font-bold text-slate-400">
          <Clock className="w-3.5 h-3.5 text-slate-400" />
          <span className="font-mono">{elapsedMin}m</span>
        </div>
      </div>

      {/* Card Items body */}
      <div className="p-3.5 space-y-2">
        <div className="space-y-1.5 max-h-32 overflow-y-auto pr-1">
          {order.items.map((item, idx) => (
            <div key={idx} className="flex justify-between text-xs text-slate-300 leading-snug">
              <span className="font-bold">
                {item.quantity}x <span className="font-medium text-slate-100">{item.name}</span>
              </span>
              {item.notes && (
                <span className="text-[10px] text-red-400 font-bold bg-red-500/10 border border-red-500/20 px-1.5 py-0.5 rounded truncate max-w-24 shrink-0">
                  {item.notes}
                </span>
              )}
            </div>
          ))}
        </div>

        {/* Order Notes / Source metadata */}
        <div className="pt-2 border-t border-slate-800/80 flex justify-between items-center text-[9px] text-slate-500 font-semibold uppercase">
          <span>Source: {order.source.replace('_', ' ')}</span>
          <span className="font-mono">{order.id.split('-').pop()}</span>
        </div>

        {/* Target warning banner */}
        {isOverdue && colorTheme !== 'ready' && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-2 rounded-lg flex items-center gap-1.5 text-[10px] font-bold animate-pulse">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>Melebihi estimasi masak ({order.estimatedPrepTime}m)</span>
          </div>
        )}
      </div>

      {/* Card Action Button */}
      <button
        onClick={onAction}
        className={`w-full py-2.5 text-xs font-extrabold flex items-center justify-center gap-1.5 cursor-pointer transition-colors ${
          colorTheme === 'cooking' 
            ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 font-black' 
            : colorTheme === 'ready' 
              ? 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black shadow-[0_0_12px_rgba(16,185,129,0.2)]' 
              : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black'
        }`}
      >
        <ActionIcon className="w-4 h-4" />
        <span>{actionLabel}</span>
      </button>
    </div>
  );
}
