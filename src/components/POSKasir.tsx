import React, { useState, useEffect } from 'react';
import { 
  ShoppingBag, Search, Plus, Minus, Trash2, 
  User, Check, Receipt, Printer, Send, RefreshCw,
  Sparkles, DollarSign, Users, CreditCard, Landmark, 
  MapPin, Clock, PlusCircle, Split, Merge, ArrowLeftRight,
  RotateCcw, AlertTriangle, FileText, QrCode, Clipboard,
  Coffee
} from 'lucide-react';
import { MenuItem, CartItem, Customer, PaymentMethod, Order, Table } from '../types';
import { db } from '../lib/firebaseClientApi';
import { collection, onSnapshot } from 'firebase/firestore';

interface POSKasirProps {
  userSession: { id: string; name: string; role: string; token: string };
}

type OrderType = 'DINE_IN' | 'TAKE_AWAY' | 'DELIVERY' | 'QR_ORDER' | 'MANUAL_ORDER';

export default function POSKasir({ userSession }: POSKasirProps) {
  // Navigation / Tab
  const [activeTab, setActiveTab] = useState<'POS' | 'TRANSACTIONS'>('POS');
  const [mobilePosTab, setMobilePosTab] = useState<'menu' | 'cart'>('menu');

  const [storeProfile, setStoreProfile] = useState<any>({ name: 'Warung Daeng Soppeng', address: "Cikke'e, Jl. Salotungo, Soppeng", phone: '085342016403' });
  const [taxPercent, setTaxPercent] = useState<number>(0);
  const [serviceChargePercent, setServiceChargePercent] = useState<number>(0);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const res = await fetch('/api/v1/settings');
        if (res.ok) {
          const data = await res.json();
          if (data) {
            if (data.storeProfile) {
              setStoreProfile(data.storeProfile);
            }
            if (typeof data.taxPercent === 'number') {
              setTaxPercent(data.taxPercent);
            }
            if (typeof data.serviceChargePercent === 'number') {
              setServiceChargePercent(data.serviceChargePercent);
            }
          }
        }
      } catch (err) {
        console.error('Error fetching settings in POSKasir:', err);
      }
    };
    fetchSettings();
  }, []);

  // Menu, CRM, Tables, and Orders data
  const [menu, setMenu] = useState<MenuItem[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [tables, setTables] = useState<Table[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  
  const [activeCategory, setActiveCategory] = useState<'Semua' | 'Makanan' | 'Minuman' | 'Frozen Food'>('Semua');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);

  // Cart / Ordering state
  const [cart, setCart] = useState<CartItem[]>([]);
  const [orderType, setOrderType] = useState<OrderType>('DINE_IN');
  const [tableNumber, setTableNumber] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [notes, setNotes] = useState('');
  const [discountAmount, setDiscountAmount] = useState(0);

  // Active Hold Orders (for Hold/Merge Order features)
  const [heldOrders, setHeldOrders] = useState<{ id: string; cart: CartItem[]; type: OrderType; table: string; customer: Customer | null }[]>([]);

  // Editing state (for UPDATE Transaksi)
  const [editingOrderId, setEditingOrderId] = useState<string | null>(null);

  // Modals
  const [itemCustomize, setItemCustomize] = useState<MenuItem | null>(null);
  const [selectedVariation, setSelectedVariation] = useState<string>('');
  const [selectedModifiers, setSelectedModifiers] = useState<{ name: string; price: number }[]>([]);
  const [customQty, setCustomQty] = useState(1);
  const [customNotes, setCustomNotes] = useState('');

  const [paymentModal, setPaymentModal] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('QRIS');
  const [cashAmountPaid, setCashAmountPaid] = useState<string>('');
  const [finalCreatedOrder, setFinalCreatedOrder] = useState<Order | null>(null);

  // Transaction History States
  const [searchHistoryQuery, setSearchHistoryQuery] = useState('');
  const [filterHistoryStatus, setFilterHistoryStatus] = useState<string>('Semua');
  const [filterHistoryType, setFilterHistoryType] = useState<string>('Semua');
  const [selectedHistoryOrder, setSelectedHistoryOrder] = useState<Order | null>(null);

  // Split Bill State
  const [showSplitModal, setShowSplitModal] = useState(false);
  const [splitOrderTarget, setSplitOrderTarget] = useState<Order | null>(null);
  const [splitItemsQuantities, setSplitItemsQuantities] = useState<Record<number, number>>({}); // index -> quantity to split

  // Merge Bill Selection
  const [selectedOrdersForMerge, setSelectedOrdersForMerge] = useState<string[]>([]);

  // Transfer Table State
  const [showTransferTableModal, setShowTransferTableModal] = useState(false);
  const [transferTargetOrder, setTransferTargetOrder] = useState<Order | null>(null);
  const [newTransferTableNumber, setNewTransferTableNumber] = useState('');

  // Notifications
  const [notif, setNotif] = useState<string | null>(null);

  // Quick Restock State
  const [restockProduct, setRestockProduct] = useState<MenuItem | null>(null);
  const [restockQty, setRestockQty] = useState<number>(50);

  const handleQuickRestockClick = (e: React.MouseEvent, product: MenuItem) => {
    e.stopPropagation();
    setRestockProduct(product);
    setRestockQty(50); // Default recommendation
  };

  const handleQuickRestockSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!restockProduct) return;

    const newStock = Number(restockProduct.stock) + Number(restockQty);

    try {
      const res = await fetch(`/api/v1/menu/${restockProduct.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stock: newStock }),
      });

      if (res.ok) {
        setRestockProduct(null);
        showNotification(`Stok ${restockProduct.name} berhasil ditambah (+${restockQty})`);
      } else {
        alert('Gagal menambah stok jualan');
      }
    } catch (err) {
      console.error('Error updating stock from POS:', err);
    }
  };

  useEffect(() => {
    fetchData();

    // Subscribe to real-time orders list
    const unsubscribeOrders = onSnapshot(collection(db, 'orders'), (snapshot) => {
      const list: Order[] = [];
      snapshot.forEach((doc) => {
        list.push({ id: doc.id, ...doc.data() } as Order);
      });
      // Sort descending by createdAt
      list.sort((a, b) => {
        const tA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const tB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return tB - tA;
      });
      setOrders(list);
    }, (error) => {
      console.error('POS orders live subscribe error:', error);
    });

    // Subscribe to real-time tables status
    const unsubscribeTables = onSnapshot(collection(db, 'tables'), (snapshot) => {
      const list: Table[] = [];
      snapshot.forEach((doc) => {
        list.push({ id: doc.id, ...doc.data() } as Table);
      });
      list.sort((a, b) => Number(a.number) - Number(b.number));
      setTables(list);
    }, (error) => {
      console.error('POS tables live subscribe error:', error);
    });

    // Subscribe to real-time menu items
    const unsubscribeMenu = onSnapshot(collection(db, 'menu'), (snapshot) => {
      const list: MenuItem[] = [];
      snapshot.forEach((doc) => {
        list.push({ id: doc.id, ...doc.data() } as MenuItem);
      });
      setMenu(list);
    }, (error) => {
      console.error('POS menu live subscribe error:', error);
    });

    return () => {
      unsubscribeOrders();
      unsubscribeTables();
      unsubscribeMenu();
    };
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [menuRes, crmRes, tablesRes, ordersRes] = await Promise.all([
        fetch('/api/v1/menu'),
        fetch('/api/v1/customers'),
        fetch('/api/v1/tables'),
        fetch('/api/v1/orders')
      ]);
      const menuData = await menuRes.json();
      const crmData = await crmRes.json();
      const tablesData = await tablesRes.json();
      const ordersData = await ordersRes.json();
      
      setMenu(menuData);
      setCustomers(crmData);
      setTables(tablesData);
      setOrders(ordersData);
    } catch (err) {
      console.error('Error loading POS data:', err);
    } finally {
      setLoading(false);
    }
  };

  const showNotification = (msg: string) => {
    setNotif(msg);
    setTimeout(() => setNotif(null), 3000);
  };

  // Cart calculations
  const cartSubtotal = cart.reduce((sum, item) => {
    const modifiersTotal = item.selectedModifiers.reduce((acc, m) => acc + m.price, 0);
    return sum + (item.product.price + modifiersTotal) * item.quantity;
  }, 0);

  const serviceCharge = Math.floor(cartSubtotal * (serviceChargePercent / 100));
  const cartTotal = cartSubtotal + serviceCharge - discountAmount;

  // Add Item flow
  const handleItemClick = (product: MenuItem) => {
    if (product.stock === 0) {
      showNotification('Bahan baku / menu kosong!');
      return;
    }
    // Check if it has modifiers
    const variations = product.variations || ['Original', 'Pedas', 'Sangat Pedas'];
    const modifiers = product.modifiers || [
      { name: 'Tambah Keju', price: 2000 },
      { name: 'Tambah Mayo', price: 1000 },
      { name: 'Ekstra Saus Daeng', price: 1000 }
    ];

    setItemCustomize({
      ...product,
      variations,
      modifiers
    });
    setSelectedVariation(variations[0]);
    setSelectedModifiers([]);
    setCustomQty(1);
    setCustomNotes('');
  };

  const addCustomizedToCart = () => {
    if (!itemCustomize) return;

    const newCartItem: CartItem = {
      product: itemCustomize,
      quantity: customQty,
      selectedVariation,
      selectedModifiers: [...selectedModifiers],
      notes: customNotes
    };

    setCart(prev => [...prev, newCartItem]);
    setItemCustomize(null);
    showNotification(`${itemCustomize.name} ditambahkan ke keranjang`);
  };

  const toggleModifier = (mod: { name: string; price: number }) => {
    setSelectedModifiers(prev => {
      const idx = prev.findIndex(m => m.name === mod.name);
      if (idx > -1) {
        return prev.filter((_, i) => i !== idx);
      } else {
        return [...prev, mod];
      }
    });
  };

  const removeFromCart = (index: number) => {
    setCart(prev => prev.filter((_, i) => i !== index));
  };

  const updateCartQty = (index: number, delta: number) => {
    setCart(prev => {
      const copy = [...prev];
      const newQty = copy[index].quantity + delta;
      if (newQty <= 0) {
        copy.splice(index, 1);
      } else {
        copy[index].quantity = newQty;
      }
      return copy;
    });
  };

  // Hold Order Feature
  const holdCurrentOrder = () => {
    if (cart.length === 0) return;
    const newHold = {
      id: `HOLD-${Date.now()}`,
      cart: [...cart],
      type: orderType,
      table: tableNumber,
      customer: selectedCustomer
    };
    setHeldOrders(prev => [...prev, newHold]);
    setCart([]);
    setTableNumber('');
    setSelectedCustomer(null);
    setNotes('');
    setDiscountAmount(0);
    setEditingOrderId(null);
    showNotification('Pesanan ditangguhkan (Hold Order)');
  };

  const recallHeldOrder = (holdId: string) => {
    const held = heldOrders.find(h => h.id === holdId);
    if (held) {
      setCart(held.cart);
      setOrderType(held.type);
      setTableNumber(held.table);
      setSelectedCustomer(held.customer);
      setHeldOrders(prev => prev.filter(h => h.id !== holdId));
      showNotification('Pesanan ditarik kembali');
    }
  };

  // Finalize Checkout / Update
  const handleCheckoutSubmit = async () => {
    if (cart.length === 0) return;
    setPaymentModal(true);
  };

  const finalizePayment = async () => {
    const orderItems = cart.map(item => {
      const modifiersTotal = item.selectedModifiers.reduce((acc, m) => acc + m.price, 0);
      return {
        productId: item.product.id,
        name: `${item.product.name} (${item.selectedVariation})`,
        price: item.product.price + modifiersTotal,
        quantity: item.quantity,
        variation: item.selectedVariation,
        modifiers: item.selectedModifiers,
        notes: item.notes
      };
    });

    const payload = {
      customerId: selectedCustomer?.id || '',
      customerName: selectedCustomer?.name || 'Pelanggan Umum',
      paymentMethod,
      tableNumber: (orderType === 'DINE_IN' || orderType === 'QR_ORDER') ? tableNumber : '',
      items: orderItems,
      subtotal: cartSubtotal,
      discount: discountAmount,
      total: cartTotal,
      notes: notes,
      source: orderType === 'QR_ORDER' ? 'QR_SELF_ORDER' : 'POS',
      outletId: 'out_1',
      status: (paymentMethod === 'Tunai' || paymentMethod === 'QRIS' || paymentMethod === 'Transfer' || paymentMethod === 'E-Wallet') ? 'DELIVERED' : 'PENDING',
      paymentStatus: 'PAID'
    };

    try {
      let url = '/api/v1/orders';
      let method = 'POST';

      // If we are editing an existing unpaid transaction, call PUT instead
      if (editingOrderId) {
        url = `/api/v1/orders/${editingOrderId}`;
        method = 'PUT';
      }

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (res.ok) {
        setFinalCreatedOrder(data);
        setCart([]);
        setTableNumber('');
        setSelectedCustomer(null);
        setNotes('');
        setDiscountAmount(0);
        setEditingOrderId(null);
        setPaymentModal(false);
        showNotification(editingOrderId ? 'Transaksi Berhasil Diperbarui!' : 'Transaksi Berhasil! Struk siap cetak.');
        
        // If we updated a table-bound order, let's mark that table as "Terisi"
        if (orderType === 'DINE_IN' && tableNumber) {
          const tableObj = tables.find(t => String(t.number) === String(tableNumber));
          if (tableObj) {
            await fetch(`/api/v1/tables/${tableObj.id}`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ status: 'Terisi' })
            });
          }
        }

        // Refresh local state
        fetchData();
      } else {
        alert(data.error || 'Gagal menyimpan transaksi');
      }
    } catch (err) {
      console.error('Error making payment:', err);
      alert('Gagal menghubungi server');
    }
  };

  // Void Transaksi (DELETE)
  const handleVoidOrder = async (orderId: string) => {
    if (!window.confirm('Apakah Anda yakin ingin membatalkan/void transaksi ini?')) return;

    try {
      const res = await fetch(`/api/v1/orders/${orderId}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        showNotification('Transaksi berhasil dibatalkan (VOID)');
        setSelectedHistoryOrder(null);
        fetchData();
      } else {
        alert('Gagal membatalkan transaksi');
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Refund Transaksi
  const handleRefundOrder = async (order: Order) => {
    if (!window.confirm('Apakah Anda yakin ingin melakukan REFUND (pengembalian dana) untuk transaksi ini?')) return;

    try {
      const res = await fetch(`/api/v1/orders/${order.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          status: 'REFUNDED',
          paymentStatus: 'REFUNDED'
        })
      });
      if (res.ok) {
        showNotification('Transaksi berhasil di-refund.');
        setSelectedHistoryOrder(null);
        fetchData();
      } else {
        alert('Gagal memproses refund');
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Load Order to Cart to EDIT (UPDATE Transaksi)
  const handleEditOrderInCart = (order: Order) => {
    // Check if the order is already paid or voided
    if (order.status === 'VOID' || order.status === 'REFUNDED') {
      alert('Transaksi yang sudah dibatalkan atau direfund tidak dapat diedit.');
      return;
    }

    // Populate the cart
    const reconstructedCart: CartItem[] = order.items.map(item => {
      // Find matching menu item to reconstruct product
      const menuItem = menu.find(m => m.id === item.productId) || {
        id: item.productId,
        name: item.name,
        category: 'Makanan' as any,
        price: item.price,
        image: 'https://images.unsplash.com/photo-1544025162-d76694265947?w=300&q=80',
        stock: 100,
        minStock: 5,
        unit: 'Pcs'
      };

      return {
        product: menuItem,
        quantity: item.quantity,
        selectedVariation: item.variation || 'Original',
        selectedModifiers: item.modifiers || [],
        notes: item.notes
      };
    });

    setCart(reconstructedCart);
    setOrderType(order.source === 'QR_SELF_ORDER' ? 'QR_ORDER' : 'DINE_IN');
    setTableNumber(order.tableNumber || '');
    
    const customer = customers.find(c => c.id === order.customerId);
    setSelectedCustomer(customer || null);
    setNotes(order.notes || '');
    setDiscountAmount(order.discount || 0);
    setEditingOrderId(order.id);
    
    setActiveTab('POS');
    showNotification(`Memuat Pesanan #${order.queueNumber} ke POS untuk diedit.`);
  };

  // Cancel editing mode
  const handleCancelEditMode = () => {
    setCart([]);
    setTableNumber('');
    setSelectedCustomer(null);
    setNotes('');
    setDiscountAmount(0);
    setEditingOrderId(null);
    showNotification('Mode edit dibatalkan.');
  };

  // Transfer Table Operation
  const handleOpenTransferTable = (order: Order) => {
    setTransferTargetOrder(order);
    setNewTransferTableNumber(order.tableNumber || '');
    setShowTransferTableModal(true);
  };

  const submitTransferTable = async () => {
    if (!transferTargetOrder) return;
    if (!newTransferTableNumber.trim()) {
      alert('Nomor meja baru harus diisi!');
      return;
    }

    try {
      // Find old and new table objects if they exist to sync statuses
      const oldTable = tables.find(t => String(t.number) === String(transferTargetOrder.tableNumber));
      const newTable = tables.find(t => String(t.number) === String(newTransferTableNumber));

      const res = await fetch(`/api/v1/orders/${transferTargetOrder.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tableNumber: newTransferTableNumber })
      });

      if (res.ok) {
        showNotification(`Pesanan berhasil dipindah ke Meja ${newTransferTableNumber}`);
        setShowTransferTableModal(false);
        setTransferTargetOrder(null);

        // Synchronize table management states dynamically!
        if (oldTable) {
          await fetch(`/api/v1/tables/${oldTable.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: 'Kosong' })
          });
        }
        if (newTable) {
          await fetch(`/api/v1/tables/${newTable.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: 'Terisi' })
          });
        }

        fetchData();
      } else {
        alert('Gagal memindahkan meja');
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Split Bill Operation
  const handleOpenSplitBill = (order: Order) => {
    setSplitOrderTarget(order);
    const initialQty: Record<number, number> = {};
    order.items.forEach((_, idx) => {
      initialQty[idx] = 0;
    });
    setSplitItemsQuantities(initialQty);
    setShowSplitModal(true);
  };

  const handleSplitQtyChange = (idx: number, delta: number, max: number) => {
    setSplitItemsQuantities(prev => {
      const current = prev[idx] || 0;
      const next = current + delta;
      if (next < 0 || next > max) return prev;
      return { ...prev, [idx]: next };
    });
  };

  const submitSplitBill = async () => {
    if (!splitOrderTarget) return;

    // Separate split items and original remaining items
    const splitItemsList: any[] = [];
    const remainingItemsList: any[] = [];

    splitOrderTarget.items.forEach((item, idx) => {
      const splitQty = splitItemsQuantities[idx] || 0;
      const remQty = item.quantity - splitQty;

      if (splitQty > 0) {
        splitItemsList.push({
          ...item,
          quantity: splitQty
        });
      }

      if (remQty > 0) {
        remainingItemsList.push({
          ...item,
          quantity: remQty
        });
      }
    });

    if (splitItemsList.length === 0) {
      alert('Silakan pilih minimal 1 kuantitas item untuk dipisah!');
      return;
    }

    try {
      // Calculate subtotals
      const splitSubtotal = splitItemsList.reduce((sum, item) => sum + item.price * item.quantity, 0);
      const remSubtotal = remainingItemsList.reduce((sum, item) => sum + item.price * item.quantity, 0);

      // 1. Create split bill (new order)
      const splitPayload = {
        customerId: splitOrderTarget.customerId || '',
        customerName: `${splitOrderTarget.customerName || 'Pelanggan'} (Split)`,
        paymentMethod: 'Tunai', // Default split method
        tableNumber: splitOrderTarget.tableNumber || '',
        items: splitItemsList,
        subtotal: splitSubtotal,
        discount: 0,
        total: splitSubtotal,
        notes: `Pecahan dari order #${splitOrderTarget.queueNumber}`,
        source: splitOrderTarget.source,
        outletId: splitOrderTarget.outletId,
        status: 'PENDING',
        paymentStatus: 'UNPAID'
      };

      // 2. Update remaining bill (original order)
      const originalPayload = {
        items: remainingItemsList,
        subtotal: remSubtotal,
        total: Math.max(0, remSubtotal - (splitOrderTarget.discount || 0)),
        notes: `${splitOrderTarget.notes || ''} (Telah dipisah)`
      };

      // Perform API Updates
      const postRes = await fetch('/api/v1/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(splitPayload)
      });

      const putRes = await fetch(`/api/v1/orders/${splitOrderTarget.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(originalPayload)
      });

      if (postRes.ok && putRes.ok) {
        showNotification('Tagihan berhasil dipisahkan menjadi dua!');
        setShowSplitModal(false);
        setSplitOrderTarget(null);
        setSelectedHistoryOrder(null);
        fetchData();
      } else {
        alert('Gagal memproses split bill');
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Merge Bill / Gabung Pesanan
  const handleSelectOrderForMerge = (id: string) => {
    setSelectedOrdersForMerge(prev => {
      if (prev.includes(id)) {
        return prev.filter(oid => oid !== id);
      } else {
        return [...prev, id];
      }
    });
  };

  const processMergeBills = async () => {
    if (selectedOrdersForMerge.length < 2) {
      alert('Pilih minimal 2 pesanan untuk digabungkan!');
      return;
    }

    if (!window.confirm(`Gabungkan ${selectedOrdersForMerge.length} pesanan terpilih menjadi satu keranjang belanja aktif?`)) return;

    try {
      const mergedCartItems: CartItem[] = [];
      let mergedTableNum = '';
      let mergedNotes = 'Gabungan dari pesanan: ';

      // Collect all items from target orders
      selectedOrdersForMerge.forEach(orderId => {
        const orderObj = orders.find(o => o.id === orderId);
        if (orderObj) {
          mergedTableNum = mergedTableNum || orderObj.tableNumber || '';
          mergedNotes += `#${orderObj.queueNumber} `;

          orderObj.items.forEach(item => {
            const menuItem = menu.find(m => m.id === item.productId) || {
              id: item.productId,
              name: item.name,
              category: 'Makanan' as any,
              price: item.price,
              image: 'https://images.unsplash.com/photo-1544025162-d76694265947?w=300&q=80',
              stock: 100,
              minStock: 5,
              unit: 'Pcs'
            };

            mergedCartItems.push({
              product: menuItem,
              quantity: item.quantity,
              selectedVariation: item.variation || 'Original',
              selectedModifiers: item.modifiers || [],
              notes: item.notes
            });
          });
        }
      });

      // Populate into active cart
      setCart(mergedCartItems);
      setTableNumber(mergedTableNum);
      setNotes(mergedNotes);
      setOrderType('DINE_IN');
      setActiveTab('POS');

      // Void the merged old transactions so they are not double-counted
      await Promise.all(selectedOrdersForMerge.map(async (orderId) => {
        await fetch(`/api/v1/orders/${orderId}`, {
          method: 'DELETE'
        });
      }));

      setSelectedOrdersForMerge([]);
      showNotification('Pesanan berhasil digabungkan ke keranjang!');
      fetchData();
    } catch (err) {
      console.error(err);
      alert('Gagal menggabungkan pesanan');
    }
  };

  // Filtering Menu
  const filteredMenu = menu.filter(item => {
    const matchCategory = activeCategory === 'Semua' || item.category === activeCategory;
    const matchSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchCategory && matchSearch;
  });

  // Filtering History Orders
  const filteredHistoryOrders = orders.filter(o => {
    const matchSearch = (o.customerName || '').toLowerCase().includes(searchHistoryQuery.toLowerCase()) || 
                        o.queueNumber.includes(searchHistoryQuery) ||
                        o.id.toLowerCase().includes(searchHistoryQuery.toLowerCase());
    const matchStatus = filterHistoryStatus === 'Semua' || o.status === filterHistoryStatus;
    
    let matchType = true;
    if (filterHistoryType !== 'Semua') {
      if (filterHistoryType === 'QR_ORDER') {
        matchType = o.source === 'QR_SELF_ORDER';
      } else {
        matchType = o.source === 'POS'; // fallbacks or map specifically if needed
      }
    }

    return matchSearch && matchStatus && matchType;
  });

  const cashChange = Number(cashAmountPaid) >= cartTotal ? Number(cashAmountPaid) - cartTotal : 0;

  return (
    <div className="flex flex-col space-y-5 h-[calc(100vh-140px)]">
      
      {/* Top Section Tabs */}
      <div className="bg-slate-900 p-2.5 rounded-2xl shadow-lg border border-slate-800/80 flex justify-between items-center shrink-0">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('POS')}
            className={`px-5 py-2.5 rounded-xl text-xs font-black transition-all flex items-center gap-2 cursor-pointer border ${
              activeTab === 'POS' 
                ? 'bg-emerald-500 text-slate-950 border-emerald-500 font-bold shadow-md shadow-emerald-500/10' 
                : 'text-slate-400 border-transparent hover:bg-slate-850 hover:text-slate-200'
            }`}
          >
            <ShoppingBag className="w-4.5 h-4.5" />
            <span>TERMINAL KASIR (POS)</span>
          </button>
          
          <button
            onClick={() => setActiveTab('TRANSACTIONS')}
            className={`px-5 py-2.5 rounded-xl text-xs font-black transition-all flex items-center gap-2 cursor-pointer border ${
              activeTab === 'TRANSACTIONS' 
                ? 'bg-emerald-500 text-slate-950 border-emerald-500 font-bold shadow-md shadow-emerald-500/10' 
                : 'text-slate-400 border-transparent hover:bg-slate-850 hover:text-slate-200'
            }`}
          >
            <FileText className="w-4.5 h-4.5" />
            <span>TRANSAKSI & RIWAYAT</span>
            {orders.filter(o => o.status === 'PENDING').length > 0 && (
              <span className="bg-red-500 text-white font-mono text-[9px] font-bold px-1.5 py-0.5 rounded-full">
                {orders.filter(o => o.status === 'PENDING').length}
              </span>
            )}
          </button>
        </div>

        {editingOrderId && (
          <div className="flex items-center gap-2.5 bg-amber-500/10 border border-amber-500/20 text-amber-400 px-4 py-1.5 rounded-xl text-xs font-bold font-mono">
            <span>MODE EDIT PESANAN #{orders.find(o => o.id === editingOrderId)?.queueNumber}</span>
            <button 
              onClick={handleCancelEditMode}
              className="bg-amber-500 text-slate-950 px-2 py-0.5 rounded text-[10px] font-extrabold cursor-pointer"
            >
              BATAL
            </button>
          </div>
        )}
      </div>

      {/* Main viewport dependent on active tab */}
      {activeTab === 'POS' ? (
        <div className="flex flex-col flex-1 overflow-hidden min-h-0">
          
          {/* Mobile sub-tabs for Menu vs Cart (only visible below lg) */}
          <div className="lg:hidden grid grid-cols-2 gap-2 p-1 bg-slate-950 border border-slate-850 rounded-xl mb-3 shrink-0">
            <button
              onClick={() => setMobilePosTab('menu')}
              className={`py-2 rounded-lg text-xs font-black uppercase tracking-wider flex items-center justify-center gap-1.5 cursor-pointer ${
                mobilePosTab === 'menu' 
                  ? 'bg-emerald-500 text-slate-950 font-bold shadow-xs' 
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Coffee className="w-4 h-4" />
              <span>Pilih Menu</span>
            </button>
            <button
              onClick={() => setMobilePosTab('cart')}
              className={`py-2 rounded-lg text-xs font-black uppercase tracking-wider flex items-center justify-center gap-1.5 cursor-pointer relative ${
                mobilePosTab === 'cart' 
                  ? 'bg-emerald-500 text-slate-950 font-bold shadow-xs' 
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <ShoppingBag className="w-4 h-4" />
              <span>Keranjang ({cart.reduce((sum, item) => sum + item.quantity, 0)})</span>
              {cart.reduce((sum, item) => sum + item.quantity, 0) > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white font-mono text-[9px] font-bold w-4.5 h-4.5 rounded-full flex items-center justify-center">
                  {cart.reduce((sum, item) => sum + item.quantity, 0)}
                </span>
              )}
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 flex-1 overflow-hidden min-h-0">
            {/* Toast Alert */}
            {notif && (
              <div className="fixed top-20 right-6 bg-slate-950 text-emerald-400 px-5 py-3 rounded-2xl shadow-xl z-50 text-xs font-bold border border-slate-800 flex items-center gap-2 font-mono">
                <Sparkles className="w-4 h-4 animate-bounce" />
                <span>{notif}</span>
              </div>
            )}

            {/* LEFT: Menu list, Categories, Search */}
            <div className={`lg:col-span-7 xl:col-span-8 flex flex-col space-y-4 h-full overflow-hidden ${mobilePosTab === 'menu' ? 'flex' : 'hidden lg:flex'}`}>
            
            {/* Search, Hold order controls, Category Selector bar */}
            <div className="bg-slate-900 p-4 rounded-2xl shadow-sm border border-slate-800 flex flex-col md:flex-row gap-3 items-center justify-between shrink-0">
              
              {/* Search bar */}
              <div className="relative w-full md:w-64">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-slate-500" />
                <input 
                  type="text" 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Cari menu bakso, sosis, teh..." 
                  className="w-full bg-slate-950 pl-10 pr-4 py-2.5 rounded-xl text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-emerald-500 border border-slate-800 text-slate-100 placeholder-slate-500"
                />
              </div>

              {/* Held Orders quick access list */}
              {heldOrders.length > 0 && (
                <div className="flex gap-2 items-center bg-emerald-500/5 p-1.5 rounded-xl border border-emerald-500/10 w-full md:w-auto overflow-x-auto">
                  <span className="text-[10px] font-extrabold text-emerald-400 uppercase px-1.5 shrink-0 font-mono">Held:</span>
                  {heldOrders.map((hold) => (
                    <button
                      key={hold.id}
                      onClick={() => recallHeldOrder(hold.id)}
                      className="bg-emerald-500 text-slate-950 px-2.5 py-1 rounded-lg text-[10px] font-black hover:bg-emerald-400 transition-colors flex items-center gap-1 shrink-0 cursor-pointer"
                    >
                      <RefreshCw className="w-3 h-3 animate-spin-slow" />
                      <span>Meja {hold.table || 'N/A'}</span>
                    </button>
                  ))}
                </div>
              )}

              {/* Category Pills */}
              <div className="flex gap-1.5 overflow-x-auto w-full md:w-auto pr-1">
                {(['Semua', 'Makanan', 'Minuman', 'Frozen Food'] as const).map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setActiveCategory(cat)}
                    className={`px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
                      activeCategory === cat 
                        ? 'bg-emerald-500 text-slate-950 shadow-sm shadow-emerald-500/20' 
                        : 'bg-slate-950 text-slate-400 hover:bg-slate-850 hover:text-slate-100 border border-slate-850'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {/* Dynamic Menu Grid */}
            <div className="flex-1 overflow-y-auto pr-1">
              {loading ? (
                <div className="flex flex-col items-center justify-center py-20">
                  <RefreshCw className="w-8 h-8 animate-spin text-emerald-500" />
                </div>
              ) : filteredMenu.length === 0 ? (
                <div className="text-center py-16 bg-slate-900 rounded-3xl border border-slate-800 p-8">
                  <ShoppingBag className="w-12 h-12 text-slate-700 mx-auto mb-3" />
                  <p className="text-slate-400 text-xs font-semibold">Tidak ada produk menu yang cocok.</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 pb-6">
                  {filteredMenu.map((product) => {
                    const isOutOfStock = product.stock <= 0;
                    const isLowStock = product.stock <= product.minStock;

                    return (
                      <div
                        key={product.id}
                        className="bg-slate-900 rounded-2xl border border-slate-800 hover:border-emerald-500 shadow-sm overflow-hidden text-left flex flex-col justify-between group transition-all relative"
                      >
                        <div 
                          onClick={() => handleItemClick(product)}
                          className="cursor-pointer"
                        >
                          {/* Image Frame */}
                          <div className="relative h-28 w-full bg-slate-950 overflow-hidden">
                            <img 
                              src={product.image} 
                              alt={product.name} 
                              referrerPolicy="no-referrer"
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            />
                            {isOutOfStock ? (
                              <div className="absolute inset-0 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center">
                                <span className="bg-red-600 text-white text-[9px] font-extrabold px-2 py-0.5 rounded-full uppercase tracking-wider font-mono">HABIS</span>
                              </div>
                            ) : isLowStock ? (
                              <div className="absolute top-2 left-2 bg-emerald-500 text-slate-950 text-[9px] font-extrabold px-1.5 py-0.5 rounded-md shadow flex items-center gap-1 font-mono">
                                <span>Sisa {product.stock}</span>
                              </div>
                            ) : null}
                          </div>

                          {/* Info body */}
                          <div className="p-3">
                            <div className="flex items-center justify-between gap-1">
                              <span className="text-[10px] bg-slate-950 text-slate-400 font-bold px-1.5 py-0.5 rounded uppercase tracking-wider border border-slate-850 font-mono">
                                {product.category}
                              </span>
                              <span className={`text-[10px] font-bold font-mono ${isOutOfStock ? 'text-red-500' : isLowStock ? 'text-amber-500' : 'text-slate-400'}`}>
                                Stok: {product.stock} {product.unit}
                              </span>
                            </div>
                            <h4 className="text-xs font-bold text-slate-200 mt-1.5 leading-snug truncate">
                              {product.name}
                            </h4>
                          </div>
                        </div>

                        <div className="p-3 pt-0 flex justify-between items-center border-t border-slate-850 mt-1 gap-2">
                          <span className="text-xs font-extrabold text-emerald-400 font-mono cursor-pointer" onClick={() => handleItemClick(product)}>
                            Rp {product.price.toLocaleString('id-ID')}
                          </span>
                          
                          <div className="flex gap-1.5 shrink-0">
                            {/* Tombol Tambah Stok */}
                            <button
                              onClick={(e) => handleQuickRestockClick(e, product)}
                              title="Tambah Stok Jualan"
                              className="px-2 py-1 bg-amber-500/10 hover:bg-amber-500 border border-amber-500/25 rounded-lg text-amber-500 hover:text-slate-950 transition-colors cursor-pointer flex items-center gap-1"
                            >
                              <Plus className="w-3 h-3" />
                              <span className="text-[9px] font-black">Stok</span>
                            </button>

                            {/* Tombol Masuk Keranjang */}
                            <button
                              onClick={() => handleItemClick(product)}
                              title="Tambah ke Keranjang"
                              className="p-1.5 bg-slate-950 border border-slate-850 hover:bg-emerald-500 hover:text-slate-950 rounded-lg text-slate-500 transition-colors cursor-pointer flex items-center justify-center"
                            >
                              <Plus className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* RIGHT: Cart sidebar */}
          <div className={`lg:col-span-5 xl:col-span-4 bg-slate-900 rounded-2xl shadow-xl border border-slate-800 p-4 lg:p-5 flex flex-col h-full overflow-hidden ${mobilePosTab === 'cart' ? 'flex' : 'hidden lg:flex'}`}>
            
            {/* Cart Header */}
            <div className="pb-4 border-b border-slate-800 flex justify-between items-center shrink-0">
              <div className="flex items-center gap-2">
                <ShoppingBag className="w-5 h-5 text-emerald-400" />
                <h2 className="text-sm font-bold text-white">Keranjang Belanja</h2>
              </div>
              <span className="bg-slate-950 border border-slate-850 text-emerald-400 text-xs font-extrabold px-2.5 py-0.5 rounded-full font-mono">
                {cart.reduce((sum, item) => sum + item.quantity, 0)} Items
              </span>
            </div>

            {/* Order settings: 5-Type Channel Selector & Meja input */}
            <div className="py-3.5 border-b border-slate-800 space-y-3 shrink-0">
              {/* 5-Channels */}
              <div className="grid grid-cols-5 gap-1 bg-slate-950 p-1 border border-slate-850 rounded-xl">
                {([
                  { code: 'DINE_IN', label: 'Dine In', icon: Coffee },
                  { code: 'TAKE_AWAY', label: 'Take Away', icon: ShoppingBag },
                  { code: 'DELIVERY', label: 'Delivery', icon: MapPin },
                  { code: 'QR_ORDER', label: 'QR', icon: QrCode },
                  { code: 'MANUAL_ORDER', label: 'Manual', icon: Clipboard }
                ] as const).map((type) => (
                  <button
                    key={type.code}
                    onClick={() => setOrderType(type.code)}
                    title={type.label}
                    className={`py-2 rounded-lg text-[9px] font-extrabold uppercase transition-all tracking-wider flex flex-col items-center justify-center gap-0.5 cursor-pointer font-mono ${
                      orderType === type.code 
                        ? 'bg-emerald-500 text-slate-950 shadow-xs font-bold' 
                        : 'text-slate-500 hover:text-slate-300'
                    }`}
                  >
                    <type.icon className="w-3.5 h-3.5" />
                    <span className="text-[7px] font-black truncate">{type.label}</span>
                  </button>
                ))}
              </div>

              <div className="flex gap-2">
                {(orderType === 'DINE_IN' || orderType === 'QR_ORDER') && (
                  <select
                    value={tableNumber}
                    onChange={(e) => setTableNumber(e.target.value)}
                    className="w-1/3 bg-slate-950 border border-slate-800 rounded-xl px-2 py-2 text-xs font-bold text-slate-200 focus:outline-none"
                  >
                    <option value="">Meja</option>
                    {tables.map(t => (
                      <option key={t.id} value={t.number}>
                        Meja {t.number} ({t.status})
                      </option>
                    ))}
                  </select>
                )}
                
                {/* Pick CRM customer */}
                <select
                  value={selectedCustomer?.id || ''}
                  onChange={(e) => {
                    const c = customers.find(cust => cust.id === e.target.value);
                    setSelectedCustomer(c || null);
                  }}
                  className="flex-1 bg-slate-950 border border-slate-850 rounded-xl px-3 py-2 text-xs font-semibold text-slate-200 focus:outline-none"
                >
                  <option value="">-- CRM Pelanggan --</option>
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.level} - {c.points} Pts)
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Cart Item Rows */}
            <div className="flex-1 overflow-y-auto py-3 space-y-3 pr-1">
              {cart.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center py-10">
                  <ShoppingBag className="w-10 h-10 text-slate-750 mb-2" />
                  <p className="text-slate-500 text-xs font-mono">Keranjang masih kosong.</p>
                  <p className="text-[10px] text-slate-600 mt-1">Ketuk menu di kiri untuk menambahkan.</p>
                </div>
              ) : (
                cart.map((item, idx) => {
                  const itemPrice = item.product.price + item.selectedModifiers.reduce((acc, m) => acc + m.price, 0);

                  return (
                    <div key={idx} className="bg-slate-950/40 hover:bg-slate-950 rounded-xl p-3 border border-slate-850 transition-colors">
                      <div className="flex justify-between items-start gap-1">
                        <div>
                          <h4 className="text-xs font-bold text-slate-100">{item.product.name}</h4>
                          <p className="text-[10px] text-emerald-400 font-semibold mt-0.5 font-mono">Var: {item.selectedVariation}</p>
                          {item.selectedModifiers.length > 0 && (
                            <p className="text-[9px] text-slate-500 mt-0.5">
                              Mods: {item.selectedModifiers.map(m => m.name).join(', ')}
                            </p>
                          )}
                          {item.notes && (
                            <p className="text-[9px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-medium rounded px-1.5 py-0.5 mt-1.5 inline-block font-mono">
                              Note: "{item.notes}"
                            </p>
                          )}
                        </div>
                        <button 
                          onClick={() => removeFromCart(idx)}
                          className="p-1 text-slate-500 hover:text-red-400 hover:bg-slate-900 rounded-lg transition-all cursor-pointer border border-transparent"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <div className="flex justify-between items-center mt-2.5 pt-2 border-t border-slate-850">
                        <span className="text-xs font-bold text-slate-200 font-mono">
                          Rp {(itemPrice * item.quantity).toLocaleString('id-ID')}
                        </span>
                        <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-800 rounded-lg p-0.5 shadow-2xs">
                          <button 
                            onClick={() => updateCartQty(idx, -1)}
                            className="p-1 bg-slate-950 hover:bg-slate-800 rounded text-slate-400 cursor-pointer"
                          >
                            <Minus className="w-3 h-3" />
                          </button>
                          <span className="text-xs font-bold text-white px-1 font-mono">{item.quantity}</span>
                          <button 
                            onClick={() => updateCartQty(idx, 1)}
                            className="p-1 bg-slate-950 hover:bg-slate-800 rounded text-slate-400 cursor-pointer"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Totals & Actions block */}
            <div className="pt-4 border-t border-slate-850 space-y-3.5 bg-slate-900 shrink-0">
              <div className="space-y-1.5 text-xs text-slate-400">
                <div className="flex justify-between">
                  <span>Subtotal</span>
                  <span className="font-bold text-slate-200 font-mono">Rp {cartSubtotal.toLocaleString('id-ID')}</span>
                </div>
                <div className="flex justify-between">
                  <span className="flex items-center gap-1">Service Charge <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-1.5 py-0.5 rounded font-mono">{serviceChargePercent}%</span></span>
                  <span className="font-bold text-slate-200 font-mono">Rp {serviceCharge.toLocaleString('id-ID')}</span>
                </div>
                
                {/* Promo / Discount entry */}
                <div className="flex justify-between items-center py-1">
                  <span>Diskon Manual</span>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] text-slate-500 font-mono">Rp</span>
                    <input 
                      type="number" 
                      value={discountAmount || ''}
                      onChange={(e) => setDiscountAmount(Math.max(0, Number(e.target.value)))}
                      className="w-20 bg-slate-950 border border-slate-800 rounded px-1.5 py-0.5 text-right font-bold text-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    />
                  </div>
                </div>

                <div className="flex justify-between text-sm font-black text-white pt-2 border-t border-slate-850">
                  <span>Total Akhir</span>
                  <span className="text-emerald-400 font-mono text-base">Rp {cartTotal.toLocaleString('id-ID')}</span>
                </div>
              </div>

              <div className="flex gap-2.5">
                {/* Hold order Button */}
                <button
                  onClick={holdCurrentOrder}
                  disabled={cart.length === 0}
                  className="w-1/3 bg-slate-950 hover:bg-slate-850 disabled:opacity-50 text-slate-400 py-3.5 rounded-2xl text-xs font-bold border border-slate-800 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Clock className="w-4 h-4" />
                  <span>Hold</span>
                </button>
                {/* Pay Button */}
                <button
                  onClick={handleCheckoutSubmit}
                  disabled={cart.length === 0}
                  className="flex-1 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-950 py-3.5 rounded-2xl text-xs font-black transition-all shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Check className="w-4.5 h-4.5 stroke-[3]" />
                  <span>{editingOrderId ? 'SIMPAN PERUBAHAN' : 'BAYAR & CHECKOUT'}</span>
                </button>
              </div>
            </div>

          </div>
        </div>
        </div>
      ) : (
        /* TRANSACTIONS HISTORY & MANAGEMENT VIEW (CRUD Transaksi) */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 flex-1 overflow-hidden">
          
          {/* LEFT: Search, Filters & Transactions list */}
          <div className="lg:col-span-8 flex flex-col space-y-4 h-full overflow-hidden">
            
            {/* Filter and Search Bar */}
            <div className="bg-slate-900 p-4 rounded-2xl border border-slate-800 flex flex-col md:flex-row gap-3.5 justify-between items-center shrink-0">
              <div className="relative w-full md:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input
                  type="text"
                  value={searchHistoryQuery}
                  onChange={(e) => setSearchHistoryQuery(e.target.value)}
                  placeholder="Cari nomor antrean atau nama..."
                  className="w-full bg-slate-950 pl-9 pr-4 py-2 rounded-xl text-xs font-semibold focus:outline-none border border-slate-800 text-slate-100 placeholder-slate-500"
                />
              </div>

              <div className="flex gap-2 w-full md:w-auto">
                <select
                  value={filterHistoryStatus}
                  onChange={(e) => setFilterHistoryStatus(e.target.value)}
                  className="bg-slate-950 border border-slate-800 text-slate-300 text-xs font-bold px-3 py-2 rounded-xl focus:outline-none"
                >
                  <option value="Semua">Semua Status</option>
                  <option value="PENDING">Pending (Belum Bayar)</option>
                  <option value="DELIVERED">Selesai (Paid)</option>
                  <option value="VOID">Batal (Void)</option>
                  <option value="REFUNDED">Refunded</option>
                </select>

                <select
                  value={filterHistoryType}
                  onChange={(e) => setFilterHistoryType(e.target.value)}
                  className="bg-slate-950 border border-slate-800 text-slate-300 text-xs font-bold px-3 py-2 rounded-xl focus:outline-none"
                >
                  <option value="Semua">Semua Channel</option>
                  <option value="POS">POS Kasir</option>
                  <option value="QR_ORDER">QR Self-Order</option>
                </select>

                {selectedOrdersForMerge.length >= 2 && (
                  <button
                    onClick={processMergeBills}
                    className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-black px-4 py-2 rounded-xl text-xs flex items-center gap-1.5 transition-all cursor-pointer shadow-lg shadow-amber-500/10"
                  >
                    <Merge className="w-4 h-4" />
                    <span>Merge ({selectedOrdersForMerge.length})</span>
                  </button>
                )}
              </div>
            </div>

            {/* List Table of Transactions */}
            <div className="flex-1 bg-slate-900 rounded-2xl border border-slate-800 overflow-y-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 bg-slate-950/40 text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                    <th className="p-4">Merge</th>
                    <th className="p-4">Antrean</th>
                    <th className="p-4">Pelanggan / Meja</th>
                    <th className="p-4">Tanggal</th>
                    <th className="p-4">Channel</th>
                    <th className="p-4 text-right">Total Tagihan</th>
                    <th className="p-4 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-850 text-xs">
                  {filteredHistoryOrders.map((order) => {
                    const isSelected = selectedHistoryOrder?.id === order.id;
                    const canMerge = order.status === 'PENDING' || order.paymentStatus === 'UNPAID';

                    return (
                      <tr
                        key={order.id}
                        onClick={() => setSelectedHistoryOrder(order)}
                        className={`hover:bg-slate-800/40 cursor-pointer transition-colors ${
                          isSelected ? 'bg-slate-800/60 border-l-4 border-emerald-500' : ''
                        }`}
                      >
                        <td className="p-4" onClick={(e) => e.stopPropagation()}>
                          {canMerge ? (
                            <input
                              type="checkbox"
                              checked={selectedOrdersForMerge.includes(order.id)}
                              onChange={() => handleSelectOrderForMerge(order.id)}
                              className="w-4 h-4 rounded bg-slate-950 border-slate-800 text-emerald-500 focus:ring-emerald-500"
                            />
                          ) : (
                            <span className="text-slate-600">-</span>
                          )}
                        </td>
                        <td className="p-4 font-black text-slate-100 font-mono">
                          #{order.queueNumber}
                        </td>
                        <td className="p-4">
                          <div className="font-bold text-slate-200">{order.customerName || 'Pelanggan Umum'}</div>
                          {order.tableNumber && (
                            <div className="text-[10px] text-slate-500 font-semibold mt-0.5">
                              Meja {order.tableNumber}
                            </div>
                          )}
                        </td>
                        <td className="p-4 text-slate-400 font-mono text-[11px]">
                          {new Date(order.createdAt).toLocaleDateString('id-ID')} {new Date(order.createdAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                        </td>
                        <td className="p-4">
                          <span className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded border ${
                            order.source === 'QR_SELF_ORDER'
                              ? 'bg-purple-500/10 text-purple-400 border-purple-500/20'
                              : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                          }`}>
                            {order.source === 'QR_SELF_ORDER' ? 'QR Code' : 'Kasir POS'}
                          </span>
                        </td>
                        <td className="p-4 text-right font-bold text-emerald-400 font-mono">
                          Rp {order.total.toLocaleString('id-ID')}
                        </td>
                        <td className="p-4 text-center">
                          <span className={`text-[10px] font-black uppercase px-2 py-1 rounded-lg font-mono ${
                            order.status === 'DELIVERED' || order.status === 'READY'
                              ? 'bg-emerald-500/15 text-emerald-400'
                              : order.status === 'PENDING'
                              ? 'bg-amber-500/15 text-amber-400'
                              : order.status === 'VOID'
                              ? 'bg-red-500/15 text-red-500'
                              : 'bg-slate-800 text-slate-400'
                          }`}>
                            {order.status === 'DELIVERED' ? 'PAID' : order.status}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* RIGHT: Selected Order Detail view with all CRUD operations */}
          <div className="lg:col-span-4 bg-slate-900 rounded-2xl border border-slate-800 p-5 flex flex-col h-full overflow-hidden">
            {selectedHistoryOrder ? (
              <div className="flex flex-col h-full justify-between overflow-hidden">
                <div className="overflow-y-auto space-y-4 pr-1">
                  
                  {/* Detail Header */}
                  <div className="border-b border-slate-800 pb-3 flex justify-between items-start">
                    <div>
                      <span className="text-[10px] text-slate-500 font-bold block font-mono uppercase">Detail Transaksi</span>
                      <h3 className="text-base font-black text-slate-100 font-mono mt-0.5">ANTREAN #{selectedHistoryOrder.queueNumber}</h3>
                      <p className="text-[10px] text-slate-500 mt-0.5 font-mono">ID: {selectedHistoryOrder.id}</p>
                    </div>
                    <span className={`text-[10px] font-black px-2.5 py-1 rounded-lg ${
                      selectedHistoryOrder.status === 'DELIVERED' || selectedHistoryOrder.status === 'READY'
                        ? 'bg-emerald-500/15 text-emerald-400'
                        : selectedHistoryOrder.status === 'PENDING'
                        ? 'bg-amber-500/15 text-amber-400'
                        : 'bg-red-500/15 text-red-500'
                    }`}>
                      {selectedHistoryOrder.status === 'DELIVERED' ? 'PAID' : selectedHistoryOrder.status}
                    </span>
                  </div>

                  {/* Order Metadata */}
                  <div className="bg-slate-950 p-3 rounded-xl border border-slate-850 space-y-1.5 text-xs text-slate-400">
                    <div className="flex justify-between">
                      <span>Pelanggan:</span>
                      <span className="font-bold text-slate-200">{selectedHistoryOrder.customerName || 'Pelanggan Umum'}</span>
                    </div>
                    {selectedHistoryOrder.tableNumber && (
                      <div className="flex justify-between">
                        <span>Nomor Meja:</span>
                        <span className="font-black text-slate-200">Meja {selectedHistoryOrder.tableNumber}</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span>Tanggal / Waktu:</span>
                      <span className="font-mono text-slate-300">
                        {new Date(selectedHistoryOrder.createdAt).toLocaleDateString('id-ID')} {new Date(selectedHistoryOrder.createdAt).toLocaleTimeString('id-ID')}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Metode Pembayaran:</span>
                      <span className="font-bold text-slate-300">{selectedHistoryOrder.paymentMethod || 'Belum Bayar'}</span>
                    </div>
                  </div>

                  {/* Items Ordered List */}
                  <div>
                    <span className="text-[10px] text-slate-500 font-bold uppercase block mb-2 font-mono">Item Yang Dipesan</span>
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {selectedHistoryOrder.items.map((item, idx) => (
                        <div key={idx} className="bg-slate-950/40 p-2 rounded-lg border border-slate-850 flex justify-between text-xs">
                          <div>
                            <div className="font-bold text-slate-200">{item.name}</div>
                            <div className="text-[10px] text-slate-500 mt-0.5">{item.quantity} x Rp {item.price.toLocaleString('id-ID')}</div>
                          </div>
                          <span className="font-mono font-bold text-slate-100">Rp {(item.price * item.quantity).toLocaleString('id-ID')}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Payment Summary breakdown */}
                  <div className="border-t border-slate-800 pt-3 space-y-1.5 text-xs text-slate-400">
                    <div className="flex justify-between">
                      <span>Subtotal</span>
                      <span className="font-mono text-slate-300">Rp {selectedHistoryOrder.subtotal.toLocaleString('id-ID')}</span>
                    </div>
                    {selectedHistoryOrder.discount > 0 && (
                      <div className="flex justify-between text-red-400">
                        <span>Diskon Manual</span>
                        <span className="font-mono">-Rp {selectedHistoryOrder.discount.toLocaleString('id-ID')}</span>
                      </div>
                    )}
                    <div className="flex justify-between font-black text-white text-sm pt-1.5 border-t border-slate-850">
                      <span>Total Bayar</span>
                      <span className="text-emerald-400 font-mono">Rp {selectedHistoryOrder.total.toLocaleString('id-ID')}</span>
                    </div>
                  </div>

                </div>

                {/* POS Cashier Action Operations (Void, Reprint, Split, Transfer, Refund, Edit) */}
                <div className="pt-4 border-t border-slate-800 space-y-2 shrink-0">
                  <div className="grid grid-cols-2 gap-2">
                    {/* Reprint Struk */}
                    <button
                      onClick={() => setFinalCreatedOrder(selectedHistoryOrder)}
                      className="bg-slate-950 hover:bg-slate-850 border border-slate-800 text-slate-300 hover:text-white py-2.5 rounded-xl text-[11px] font-bold flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Printer className="w-3.5 h-3.5" />
                      <span>Reprint Struk</span>
                    </button>

                    {/* Edit Order (UPDATE Transaksi) */}
                    <button
                      onClick={() => handleEditOrderInCart(selectedHistoryOrder)}
                      className="bg-slate-950 hover:bg-slate-850 border border-slate-800 text-slate-300 hover:text-white py-2.5 rounded-xl text-[11px] font-bold flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <PlusCircle className="w-3.5 h-3.5 text-amber-400" />
                      <span>Edit Pesanan</span>
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    {/* Transfer Meja */}
                    {selectedHistoryOrder.status === 'PENDING' && (
                      <button
                        onClick={() => handleOpenTransferTable(selectedHistoryOrder)}
                        className="bg-slate-950 hover:bg-slate-850 border border-slate-800 text-slate-300 hover:text-white py-2.5 rounded-xl text-[11px] font-bold flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <ArrowLeftRight className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Transfer Meja</span>
                      </button>
                    )}

                    {/* Split Bill */}
                    {selectedHistoryOrder.status === 'PENDING' && (
                      <button
                        onClick={() => handleOpenSplitBill(selectedHistoryOrder)}
                        className="bg-slate-950 hover:bg-slate-850 border border-slate-800 text-slate-300 hover:text-white py-2.5 rounded-xl text-[11px] font-bold flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <Split className="w-3.5 h-3.5 text-indigo-400" />
                        <span>Split Bill</span>
                      </button>
                    )}
                  </div>

                  {/* Destructive Buttons (Refund and Void/Delete) */}
                  <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-850">
                    {selectedHistoryOrder.status === 'DELIVERED' && (
                      <button
                        onClick={() => handleRefundOrder(selectedHistoryOrder)}
                        className="bg-red-500/10 hover:bg-red-500/20 text-red-400 py-2.5 rounded-xl text-[11px] font-black flex items-center justify-center gap-1.5 cursor-pointer border border-red-500/20"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>Refund Dana</span>
                      </button>
                    )}

                    {(selectedHistoryOrder.status === 'PENDING' || selectedHistoryOrder.status === 'DELIVERED') && (
                      <button
                        onClick={() => handleVoidOrder(selectedHistoryOrder.id)}
                        className="bg-red-600 hover:bg-red-500 text-white py-2.5 rounded-xl text-[11px] font-black flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <AlertTriangle className="w-3.5 h-3.5" />
                        <span>Void / Batal</span>
                      </button>
                    )}
                  </div>
                </div>

              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-center py-20 text-slate-500">
                <FileText className="w-10 h-10 text-slate-700 mb-2" />
                <p className="text-xs font-bold">Pilih salah satu transaksi</p>
                <p className="text-[10px] text-slate-600 mt-1">Gunakan panel kiri untuk mencari dan mengelola transaksi kasir.</p>
              </div>
            )}
          </div>

        </div>
      )}

      {/* MODAL 1: Customize Menu Options (Variations / Modifiers) */}
      {itemCustomize && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full p-6 shadow-2xl relative">
            <h3 className="text-base font-bold text-white mb-1">{itemCustomize.name}</h3>
            <p className="text-xs text-slate-400">Pilih variasi rasa dan pelengkap saus</p>

            {/* Variations */}
            <div className="mt-4">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-2 font-mono">Pilih Variasi</span>
              <div className="flex flex-wrap gap-2">
                {itemCustomize.variations?.map((v) => (
                  <button
                    key={v}
                    onClick={() => setSelectedVariation(v)}
                    className={`px-3 py-2 rounded-xl text-xs font-bold transition-all border cursor-pointer ${
                      selectedVariation === v 
                        ? 'bg-emerald-500 border-emerald-500 text-slate-950 shadow-xs' 
                        : 'border-slate-800 hover:border-slate-700 text-slate-400 bg-slate-950'
                    }`}
                  >
                    {v}
                  </button>
                ))}
              </div>
            </div>

            {/* Modifiers */}
            <div className="mt-5">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-2 font-mono">Tambahan (Add-on)</span>
              <div className="space-y-2">
                {itemCustomize.modifiers?.map((m) => {
                  const isChecked = selectedModifiers.some(mod => mod.name === m.name);
                  return (
                    <button
                      key={m.name}
                      onClick={() => toggleModifier(m)}
                      className={`w-full flex justify-between items-center p-2.5 rounded-xl border text-xs font-semibold transition-all cursor-pointer ${
                        isChecked 
                          ? 'bg-emerald-500/10 border-emerald-500 text-emerald-400 font-bold' 
                          : 'border-slate-800 text-slate-400 hover:bg-slate-950'
                      }`}
                    >
                      <span className="flex items-center gap-2">
                        <span className={`w-4.5 h-4.5 rounded border flex items-center justify-center text-[10px] ${isChecked ? 'bg-emerald-500 border-emerald-500 text-slate-950' : 'border-slate-800 bg-slate-950'}`}>
                          {isChecked && '✓'}
                        </span>
                        {m.name}
                      </span>
                      <span className="font-mono text-slate-400">+Rp {m.price.toLocaleString('id-ID')}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Custom Notes */}
            <div className="mt-4">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-2 font-mono">Catatan Pesanan</span>
              <input 
                type="text" 
                value={customNotes}
                onChange={(e) => setCustomNotes(e.target.value)}
                placeholder="Contoh: Saus dipisah, agak kering..."
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>

            {/* Qty and Actions */}
            <div className="mt-6 pt-4 border-t border-slate-800 flex justify-between items-center">
              <div className="flex items-center gap-1 bg-slate-950 rounded-xl p-1 border border-slate-800">
                <button onClick={() => setCustomQty(Math.max(1, customQty - 1))} className="p-1.5 bg-slate-900 border border-slate-800 rounded-lg text-slate-400"><Minus className="w-3.5 h-3.5" /></button>
                <span className="text-sm font-bold text-white px-3 font-mono">{customQty}</span>
                <button onClick={() => setCustomQty(customQty + 1)} className="p-1.5 bg-slate-900 border border-slate-800 rounded-lg text-slate-400"><Plus className="w-3.5 h-3.5" /></button>
              </div>

              <div className="flex gap-2">
                <button 
                  onClick={() => setItemCustomize(null)}
                  className="bg-slate-950 hover:bg-slate-800 text-slate-400 font-bold text-xs px-4 py-3.5 rounded-xl border border-slate-850 cursor-pointer"
                >
                  Batal
                </button>
                <button 
                  onClick={addCustomizedToCart}
                  className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs px-5 py-3.5 rounded-xl shadow-md cursor-pointer"
                >
                  Tambahkan ({customQty} Qty)
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* MODAL 2: Checkout & Payment details */}
      {paymentModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-xl w-full p-6 shadow-2xl relative flex flex-col md:flex-row gap-6">
            
            {/* Pay Methods (Left side) */}
            <div className="flex-1 space-y-4">
              <h3 className="text-base font-bold text-white">Metode Pembayaran</h3>
              <p className="text-xs text-slate-400 font-medium">Pilih salah satu kanal pembayaran di bawah:</p>
              
              <div className="grid grid-cols-2 gap-2">
                {([
                  { code: 'QRIS', label: 'Simulasi QRIS', icon: Sparkles },
                  { code: 'Tunai', label: 'Uang Tunai', icon: DollarSign },
                  { code: 'Transfer', label: 'Bank Transfer', icon: Landmark },
                  { code: 'E-Wallet', label: 'E-Wallet', icon: Users }
                ] as const).map((item) => (
                  <button
                    key={item.code}
                    onClick={() => {
                      setPaymentMethod(item.code);
                      if (item.code !== 'Tunai') setCashAmountPaid('');
                    }}
                    className={`p-3.5 rounded-2xl border text-left flex flex-col justify-between transition-all cursor-pointer ${
                      paymentMethod === item.code 
                        ? 'bg-emerald-500/10 border-emerald-500 text-emerald-400 font-bold' 
                        : 'border-slate-800 bg-slate-950 text-slate-400 hover:bg-slate-900'
                    }`}
                  >
                    <item.icon className={`w-5 h-5 mb-2 ${paymentMethod === item.code ? 'text-emerald-400' : 'text-slate-500'}`} />
                    <span className="text-xs font-semibold">{item.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Pay Calculation (Right side) */}
            <div className="w-full md:w-64 bg-slate-950 border border-slate-850 p-4 rounded-2xl flex flex-col justify-between">
              <div>
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 font-mono">Rangkuman Pembayaran</h4>
                <div className="text-slate-500 text-xs flex justify-between items-center">
                  <span>Total Tagihan:</span>
                  <span className="font-extrabold text-white font-mono text-sm">Rp {cartTotal.toLocaleString('id-ID')}</span>
                </div>

                {/* QRIS display */}
                {paymentMethod === 'QRIS' && (
                  <div className="mt-4 p-3 bg-slate-900 rounded-xl border border-slate-800 flex flex-col items-center">
                    <img 
                      src="https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=qris-warung-daeng-soppeng-smartpos" 
                      alt="QRIS Code" 
                      className="w-32 h-32 rounded-lg"
                    />
                    <span className="text-[9px] text-slate-500 font-bold tracking-wider uppercase mt-2 font-mono">NMID: ID102030405060</span>
                    <span className="text-[10px] text-emerald-400 font-bold mt-1 animate-pulse font-mono">✓ QRIS TERINTEGRASI</span>
                  </div>
                )}

                {/* Cash Calculator */}
                {paymentMethod === 'Tunai' && (
                  <div className="mt-4 space-y-3">
                    <div>
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide block mb-1 font-mono">Diterima (Tunai)</label>
                      <input 
                        type="number" 
                        value={cashAmountPaid}
                        onChange={(e) => setCashAmountPaid(e.target.value)}
                        placeholder="Contoh: 50000"
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white font-bold focus:outline-none"
                      />
                    </div>
                    {/* Fast Denominations */}
                    <div className="grid grid-cols-2 gap-1.5">
                      {[10000, 20000, 50000, 100000].map((denom) => (
                        <button
                          key={denom}
                          onClick={() => setCashAmountPaid(String(denom))}
                          className="bg-slate-900 hover:bg-slate-850 border border-slate-800 py-1.5 rounded-lg text-[10px] font-bold text-slate-300 cursor-pointer font-mono"
                        >
                          Rp {denom / 1000}k
                        </button>
                      ))}
                    </div>
                    {Number(cashAmountPaid) > 0 && (
                      <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/20 rounded-xl">
                        <span className="text-[10px] text-emerald-400 font-bold block font-mono">Uang Kembalian</span>
                        <span className="text-sm font-black text-emerald-400 font-mono">Rp {cashChange.toLocaleString('id-ID')}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="mt-6 flex gap-2">
                <button
                  onClick={() => setPaymentModal(false)}
                  className="bg-slate-900 hover:bg-slate-850 text-slate-400 font-bold text-xs px-3 py-2.5 rounded-xl border border-slate-800 cursor-pointer"
                >
                  Kembali
                </button>
                <button
                  onClick={finalizePayment}
                  disabled={paymentMethod === 'Tunai' && Number(cashAmountPaid) < cartTotal}
                  className="flex-1 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-950 font-black text-xs px-3 py-2.5 rounded-xl shadow-md cursor-pointer"
                >
                  Selesai Bayar
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* MODAL 3: Print Receipt after completion & REPRINT STRUK */}
      {finalCreatedOrder && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-sm w-full p-5 shadow-2xl relative flex flex-col">
            
            {/* Cashier Struk layout */}
            <div className="bg-slate-950/80 border border-dashed border-slate-800 p-4 rounded-2xl flex flex-col font-mono text-xs text-slate-300 max-h-[380px] overflow-y-auto">
              <div className="text-center pb-3 border-b border-dashed border-slate-800">
                <h3 className="font-bold text-slate-100 text-sm">{storeProfile?.name?.toUpperCase() || 'WARUNG DAENG SOPPENG'}</h3>
                <p className="text-[10px] text-slate-500 mt-1">{storeProfile?.address || "Cikke'e, Jl. Salotungo, Soppeng"}</p>
                <p className="text-[9px] text-slate-500">Telp: {storeProfile?.phone || '085342016403'}</p>
              </div>

              <div className="py-2.5 border-b border-dashed border-slate-800 space-y-0.5 text-[10px] text-slate-500">
                <div className="flex justify-between"><span>No: {finalCreatedOrder.id}</span> <span>Q: {finalCreatedOrder.queueNumber}</span></div>
                <div className="flex justify-between"><span>Tgl: {new Date(finalCreatedOrder.createdAt).toLocaleDateString('id-ID')}</span> <span>{new Date(finalCreatedOrder.createdAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}</span></div>
                {finalCreatedOrder.tableNumber && <div>Meja: {finalCreatedOrder.tableNumber}</div>}
                <div>Kasir: {userSession.name}</div>
                {finalCreatedOrder.customerId && <div>Loyalty ID: {finalCreatedOrder.customerId}</div>}
              </div>

              {/* Items */}
              <div className="py-2.5 border-b border-dashed border-slate-800 space-y-1.5">
                {finalCreatedOrder.items.map((item, idx) => (
                  <div key={idx} className="flex justify-between items-start gap-1">
                    <div>
                      <span className="text-slate-200">{item.name}</span>
                      <div className="text-[10px] text-slate-500">{item.quantity} x Rp {item.price.toLocaleString('id-ID')}</div>
                    </div>
                    <span className="font-bold text-emerald-400">Rp {(item.price * item.quantity).toLocaleString('id-ID')}</span>
                  </div>
                ))}
              </div>

              {/* Breakdown */}
              <div className="py-2.5 space-y-1 text-[10px] border-b border-dashed border-slate-800">
                <div className="flex justify-between"><span>Subtotal:</span> <span>Rp {finalCreatedOrder.subtotal.toLocaleString('id-ID')}</span></div>
                <div className="flex justify-between"><span>Svc Charge {serviceChargePercent}%:</span> <span>Rp {finalCreatedOrder.serviceCharge.toLocaleString('id-ID')}</span></div>
                {finalCreatedOrder.discount > 0 && <div className="flex justify-between text-red-400"><span>Diskon:</span> <span>-Rp {finalCreatedOrder.discount.toLocaleString('id-ID')}</span></div>}
                <div className="flex justify-between font-bold text-white text-xs pt-1"><span>TOTAL AKHIR:</span> <span className="text-emerald-400">Rp {finalCreatedOrder.total.toLocaleString('id-ID')}</span></div>
              </div>

              <div className="text-center pt-3 text-[10px] text-slate-500">
                <p>Terima Kasih Atas Kunjungan Anda</p>
                <p className="mt-0.5 font-bold text-emerald-400">Smart POS Enterprise</p>
              </div>
            </div>

            {/* WA/Email Send Simulation */}
            <div className="mt-4 space-y-2.5">
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1 font-mono">Simulasi WhatsApp Receipt</label>
                <div className="flex gap-1.5">
                  <input 
                    type="text" 
                    placeholder="0853..." 
                    defaultValue="085342016403"
                    className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs focus:outline-none text-white font-mono"
                  />
                  <button 
                    onClick={() => alert('Simulasi WhatsApp Receipt terkirim!')}
                    className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 p-2 rounded-xl text-xs flex items-center justify-center cursor-pointer"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>

            <div className="mt-5 pt-3 border-t border-slate-800 flex gap-2">
              <button
                onClick={() => {
                  alert('Melakukan cetak struk ke printer thermal Bluetooth...');
                }}
                className="flex-1 bg-slate-950 hover:bg-slate-800 text-slate-400 py-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 border border-slate-800 cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                <span>Cetak Thermal</span>
              </button>
              <button
                onClick={() => setFinalCreatedOrder(null)}
                className="flex-1 bg-emerald-500 hover:bg-emerald-400 text-slate-950 py-3 rounded-xl text-xs font-black transition-all shadow shadow-emerald-500/20 cursor-pointer"
              >
                Selesai
              </button>
            </div>

          </div>
        </div>
      )}

      {/* TRANSFER MEJA MODAL */}
      {showTransferTableModal && transferTargetOrder && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-sm w-full p-6 shadow-2xl relative">
            <h3 className="text-sm font-black text-white uppercase tracking-tight mb-2">TRANSFER MEJA</h3>
            <p className="text-xs text-slate-400 mb-4">Pindahkan Pesanan #{transferTargetOrder.queueNumber} ke meja lain:</p>

            <div className="space-y-4">
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5 font-mono">Pilih Meja Tujuan</label>
                <select
                  value={newTransferTableNumber}
                  onChange={(e) => setNewTransferTableNumber(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-200 focus:outline-none"
                >
                  <option value="">Pilih Meja</option>
                  {tables.map(t => (
                    <option key={t.id} value={t.number}>
                      Meja {t.number} ({t.status} - {t.area})
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  onClick={() => {
                    setShowTransferTableModal(false);
                    setTransferTargetOrder(null);
                  }}
                  className="flex-1 bg-slate-950 hover:bg-slate-850 border border-slate-800 text-slate-400 py-3 rounded-xl text-xs font-bold cursor-pointer"
                >
                  Batal
                </button>
                <button
                  onClick={submitTransferTable}
                  className="flex-1 bg-emerald-500 hover:bg-emerald-400 text-slate-950 py-3 rounded-xl text-xs font-black cursor-pointer shadow-lg shadow-emerald-500/10"
                >
                  Proses Pindah
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SPLIT BILL MODAL */}
      {showSplitModal && splitOrderTarget && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full p-6 shadow-2xl relative flex flex-col max-h-[90vh]">
            <h3 className="text-sm font-black text-white uppercase tracking-tight shrink-0 mb-1">PISAH TAGIHAN (SPLIT BILL)</h3>
            <p className="text-xs text-slate-400 shrink-0 mb-4">Pilih kuantitas item yang ingin dipisahkan ke bill baru:</p>

            <div className="flex-1 overflow-y-auto space-y-3.5 pr-1 py-1">
              {splitOrderTarget.items.map((item, idx) => {
                const splitQty = splitItemsQuantities[idx] || 0;
                return (
                  <div key={idx} className="bg-slate-950 p-3 rounded-xl border border-slate-850 flex justify-between items-center text-xs">
                    <div>
                      <div className="font-bold text-slate-200">{item.name}</div>
                      <div className="text-[10px] text-slate-500 mt-0.5">Total Kuantitas: {item.quantity}</div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleSplitQtyChange(idx, -1, item.quantity)}
                        className="p-1 bg-slate-900 border border-slate-800 rounded text-slate-400"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="font-mono font-bold text-white w-6 text-center">{splitQty}</span>
                      <button
                        onClick={() => handleSplitQtyChange(idx, 1, item.quantity)}
                        className="p-1 bg-slate-900 border border-slate-800 rounded text-slate-400"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex gap-2 pt-4 border-t border-slate-800 shrink-0 mt-4">
              <button
                onClick={() => {
                  setShowSplitModal(false);
                  setSplitOrderTarget(null);
                }}
                className="flex-1 bg-slate-950 hover:bg-slate-850 border border-slate-800 text-slate-400 py-3 rounded-xl text-xs font-bold cursor-pointer"
              >
                Batal
              </button>
              <button
                onClick={submitSplitBill}
                className="flex-1 bg-emerald-500 hover:bg-emerald-400 text-slate-950 py-3 rounded-xl text-xs font-black cursor-pointer shadow-lg shadow-emerald-500/10"
              >
                Proses Split Bill
              </button>
            </div>
          </div>
        </div>
      )}

      {/* QUICK RESTOCK MODAL */}
      {restockProduct && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
          <form onSubmit={handleQuickRestockSubmit} className="bg-slate-900 border border-slate-800 rounded-3xl max-w-sm w-full p-6 shadow-2xl relative">
            <div className="flex items-center gap-2 mb-3">
              <div className="p-2 bg-amber-500/10 text-amber-500 rounded-xl border border-amber-500/20">
                <Plus className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-black text-slate-100">
                Tambah Stok Jualan
              </h3>
            </div>

            <p className="text-xs text-slate-400 font-medium mb-4">
              Menambah stok fisik untuk menu jualan <span className="font-extrabold text-slate-200">{restockProduct.name}</span>.
            </p>

            <div className="space-y-4 text-xs">
              {/* Info Ringkas */}
              <div className="bg-slate-950 rounded-2xl p-3.5 border border-slate-850 flex justify-between items-center">
                <div>
                  <span className="text-[10px] text-slate-500 font-bold uppercase block">Stok Sekarang</span>
                  <span className="text-sm font-extrabold text-slate-200 font-mono">
                    {restockProduct.stock} {restockProduct.unit}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-slate-500 font-bold uppercase block">Setelah Ditambah</span>
                  <span className="text-sm font-extrabold text-amber-500 font-mono">
                    {Number(restockProduct.stock) + Number(restockQty || 0)} {restockProduct.unit}
                  </span>
                </div>
              </div>

              {/* Pilihan Quick Add */}
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1.5 font-mono">Pilihan Cepat</label>
                <div className="grid grid-cols-4 gap-2">
                  {([10, 25, 50, 100] as const).map((amount) => (
                    <button
                      key={amount}
                      type="button"
                      onClick={() => setRestockQty(amount)}
                      className={`py-2 rounded-xl text-xs font-bold font-mono transition-all border cursor-pointer ${
                        restockQty === amount
                          ? 'bg-amber-500 text-slate-950 border-amber-500'
                          : 'bg-slate-950 hover:bg-slate-850 text-slate-400 border-slate-850'
                      }`}
                    >
                      +{amount}
                    </button>
                  ))}
                </div>
              </div>

              {/* Input Manual */}
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1 font-mono">Jumlah Tambahan Lainnya</label>
                <div className="relative">
                  <input
                    type="number"
                    required
                    min="1"
                    value={restockQty || ''}
                    onChange={(e) => setRestockQty(Math.max(1, Number(e.target.value)))}
                    placeholder="Masukkan jumlah tambahan"
                    className="w-full bg-slate-950 border border-slate-800 text-slate-200 rounded-xl px-3.5 py-2.5 font-bold font-mono focus:outline-none focus:border-amber-500"
                  />
                  <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 font-bold font-mono">
                    {restockProduct.unit}
                  </span>
                </div>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-slate-800 flex gap-2">
              <button
                type="button"
                onClick={() => setRestockProduct(null)}
                className="bg-slate-950 hover:bg-slate-850 text-slate-400 font-bold text-xs px-4 py-3.5 rounded-xl flex-1 cursor-pointer border border-slate-850"
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
