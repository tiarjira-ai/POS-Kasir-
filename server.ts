import express from 'express';
import path from 'path';
import fs from 'fs';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';

// Intercept and suppress benign Firebase/Firestore idle stream timeout warnings
const originalConsoleError = console.error;
console.error = function (...args: any[]) {
  const message = args.map(arg => typeof arg === 'object' ? JSON.stringify(arg) : String(arg)).join(' ');
  if (
    message.includes('@firebase/firestore') && 
    (message.includes('Disconnecting idle stream') || message.includes('CANCELLED') || message.includes('Listen'))
  ) {
    return;
  }
  originalConsoleError.apply(console, args);
};

// Firebase Client SDK imports for backend data synchronization
import { initializeApp } from 'firebase/app';
import { 
  initializeFirestore, doc, setDoc, getDoc, getDocs, collection, deleteDoc, setLogLevel
} from 'firebase/firestore';

const app = express();
const PORT = 3000;
const DB_FILE = path.join(process.cwd(), 'db.json');

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Enable CORS for external frontend hosting (like Vercel)
app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (origin) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  } else {
    res.setHeader('Access-Control-Allow-Origin', '*');
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, PUT, PATCH, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

// Lightweight health check endpoint
app.get('/api/v1/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Load Firebase configuration
let firestoreDb: any = null;
try {
  const configPath = path.join(process.cwd(), 'firebase-applet-config.json');
  if (fs.existsSync(configPath)) {
    const firebaseConfig = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
    const firebaseApp = initializeApp(firebaseConfig);
    setLogLevel('error');
    firestoreDb = initializeFirestore(firebaseApp, {
      experimentalForceLongPolling: true,
    }, firebaseConfig.firestoreDatabaseId);
    console.log('Firebase initialized successfully with database:', firebaseConfig.firestoreDatabaseId);
  } else {
    console.warn('firebase-applet-config.json not found. Firestore sync is disabled.');
  }
} catch (error) {
  console.error('Failed to initialize Firebase SDK:', error);
}

// Global cached in-memory database
let cachedDB: any = null;

// Helper to safely read database (always returns cachedDB, fallback to local file)
function readDB() {
  if (cachedDB) {
    return cachedDB;
  }
  return readLocalDB();
}

function readLocalDB() {
  try {
    if (!fs.existsSync(DB_FILE)) {
      const initialData = generateInitialData();
      fs.writeFileSync(DB_FILE, JSON.stringify(initialData, null, 2));
      return initialData;
    }
    const raw = fs.readFileSync(DB_FILE, 'utf-8');
    return JSON.parse(raw);
  } catch (error) {
    console.error('Error reading db.json, returning fresh state:', error);
    return generateInitialData();
  }
}

// Background Firestore synchronization
async function saveToFirestore(newData: any) {
  if (!firestoreDb) return;
  try {
    // 1. Save settings/config
    const configDocRef = doc(firestoreDb, 'settings', 'config');
    await setDoc(configDocRef, {
      serviceChargePercent: newData.serviceChargePercent ?? 0,
      taxPercent: newData.taxPercent ?? 0,
      currency: newData.currency ?? 'Rupiah',
      timezone: newData.timezone ?? 'WITA (UTC+8)',
      storeProfile: newData.storeProfile ?? {}
    });

    // 3. Sync each main collection
    const collectionsToSync = [
      'menu', 'employees', 'customers', 'inventory', 'suppliers', 
      'outlets', 'purchaseOrders', 'orders', 'stockMovements', 
      'attendances', 'payrolls', 'tables', 'expenses'
    ];

    for (const colName of collectionsToSync) {
      const items = newData[colName] || [];
      const localIds = new Set(items.map((item: any) => String(item.id)));

      // Fetch existing documents from Firestore for this collection to find deletions
      const colRef = collection(firestoreDb, colName);
      const querySnap = await getDocs(colRef);
      const firestoreDocIds: string[] = [];
      querySnap.forEach((d) => firestoreDocIds.push(d.id));

      // Delete items in Firestore that are no longer present locally
      for (const fsId of firestoreDocIds) {
        if (!localIds.has(fsId)) {
          await deleteDoc(doc(firestoreDb, colName, fsId));
        }
      }

      // Create or update items
      for (const item of items) {
        await setDoc(doc(firestoreDb, colName, String(item.id)), item);
      }
    }
    console.log('Successfully synchronized changes to Firestore.');
  } catch (error) {
    console.error('Error synchronizing to Firestore:', error);
  }
}

// Helper to safely write database (updates cachedDB, saves local fallback, and syncs Firestore)
function writeDB(data: any) {
  cachedDB = data;
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
    saveToFirestore(data).catch((err) => {
      console.error('Background Firestore sync failed:', err);
    });
  } catch (error) {
    console.error('Error writing to db.json:', error);
  }
}

// Async initialization of Firestore on server startup
async function initFirestore() {
  if (!firestoreDb) {
    console.warn('Firestore client not available. Skipping Firestore initialization.');
    cachedDB = readLocalDB();
    return;
  }
  
  try {
    console.log('Connecting to Firestore...');
    const configDocRef = doc(firestoreDb, 'settings', 'config');
    const configSnap = await getDoc(configDocRef);

    if (configSnap.exists()) {
      console.log('Existing Firestore configuration found. Loading from Cloud...');
      const dbData: any = {};
      const configData = configSnap.data();
      
      dbData.serviceChargePercent = configData.serviceChargePercent ?? 0;
      dbData.taxPercent = configData.taxPercent ?? 0;
      dbData.currency = configData.currency ?? 'Rupiah';
      dbData.timezone = configData.timezone ?? 'WITA (UTC+8)';
      dbData.storeProfile = configData.storeProfile ?? {};

      const collectionsToLoad = [
        'menu', 'employees', 'customers', 'inventory', 'suppliers', 
        'outlets', 'purchaseOrders', 'orders', 'stockMovements', 
        'attendances', 'payrolls', 'tables'
      ];

      await Promise.all(collectionsToLoad.map(async (colName) => {
        const colRef = collection(firestoreDb, colName);
        const querySnap = await getDocs(colRef);
        dbData[colName] = [];
        querySnap.forEach((doc) => {
          dbData[colName].push({ id: doc.id, ...doc.data() });
        });
      }));

      cachedDB = dbData;
      console.log('Database successfully restored from Firestore.');
    } else {
      console.log('No Firestore database found. Seeding with initial dataset...');
      const initialData = readLocalDB();
      cachedDB = initialData;
      await saveToFirestore(initialData);
      console.log('Firestore seeding complete.');
    }
  } catch (error) {
    console.error('Error initializing Firestore. Falling back to local db.json...', error);
    cachedDB = readLocalDB();
  }
}

// Generate rich initial mock data
function generateInitialData() {
  const menu = [
    { id: '1', name: 'Bakso Bakar', category: 'Makanan', price: 5000, image: 'https://images.unsplash.com/photo-1544025162-d76694265947?w=300&q=80', stock: 120, minStock: 20, unit: 'Tusuk' },
    { id: '2', name: 'Tahu Bakar', category: 'Makanan', price: 8000, image: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=300&q=80', stock: 85, minStock: 15, unit: 'Tusuk' },
    { id: '3', name: 'Sosis Bakar', category: 'Makanan', price: 10000, image: 'https://images.unsplash.com/photo-1514933651103-005eec06c04b?w=300&q=80', stock: 15, minStock: 25, unit: 'Tusuk' }, // Trigger Critical Stock
    { id: '4', name: 'Pentol Telur', category: 'Makanan', price: 5000, image: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=300&q=80', stock: 140, minStock: 30, unit: 'Tusuk' },
    { id: '5', name: 'Tahu Bakso', category: 'Makanan', price: 2000, image: 'https://images.unsplash.com/photo-1565958011703-44f9829ba187?w=300&q=80', stock: 110, minStock: 20, unit: 'Pcs' },
    { id: '6', name: 'Es Teh Original', category: 'Minuman', price: 5000, image: 'https://images.unsplash.com/photo-1556679343-c7306c1976bc?w=300&q=80', stock: 300, minStock: 50, unit: 'Gelas' },
    { id: '7', name: 'Lemon Tea Soda', category: 'Minuman', price: 10000, image: 'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?w=300&q=80', stock: 90, minStock: 20, unit: 'Gelas' },
    { id: '8', name: 'Es Jeruk Peras', category: 'Minuman', price: 10000, image: 'https://images.unsplash.com/photo-1621506289937-a8e4df240d0b?w=300&q=80', stock: 8, minStock: 15, unit: 'Gelas' }, // Trigger Critical Stock
    { id: '9', name: 'Bakso Ayam Frozen', category: 'Frozen Food', price: 30000, image: 'https://images.unsplash.com/photo-1534422298391-e4f8c172dddb?w=300&q=80', stock: 45, minStock: 10, unit: 'Pack' },
    { id: '10', name: 'Tahu Bakso Frozen', category: 'Frozen Food', price: 20000, image: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=300&q=80', stock: 3, minStock: 8, unit: 'Pack' }, // Trigger Critical Stock
  ];

  const employees = [
    { id: 'emp_1', name: 'Daeng Baji (Owner)', role: 'OWNER', phone: '085342016403', address: 'Cikke\'e, Soppeng', salary: 15000000, pin: '123456', status: 'ACTIVE', attendanceCount: 26 },
    { id: 'emp_2', name: 'Sitti Saleha', role: 'MANAGER', phone: '081234567890', address: 'Jl. Salotungo, Soppeng', salary: 4500000, pin: '222222', status: 'ACTIVE', attendanceCount: 25 },
    { id: 'emp_3', name: 'Junaedi Kasir', role: 'KASIR', phone: '081234567891', address: 'Watansoppeng', salary: 3000000, pin: '333333', status: 'ACTIVE', attendanceCount: 24 },
    { id: 'emp_4', name: 'Chef Daeng', role: 'DAPUR', phone: '081234567892', address: 'Cikke\'e', salary: 3500000, pin: '444444', status: 'ACTIVE', attendanceCount: 25 },
    { id: 'emp_5', name: 'Gudang Daeng', role: 'GUDANG', phone: '081234567893', address: 'Lalabata, Soppeng', salary: 2800000, pin: '555555', status: 'ACTIVE', attendanceCount: 22 },
  ];

  const customers = [
    { id: 'c_1', name: 'Andi Yusuf', phone: '085299123456', email: 'andi.yusuf@gmail.com', birthDate: '1995-04-12', points: 450, level: 'Gold', joinDate: '2025-01-10' },
    { id: 'c_2', name: 'Bahrul', phone: '085299123457', email: 'bahrul@gmail.com', birthDate: '1998-08-22', points: 120, level: 'Silver', joinDate: '2025-02-14' },
    { id: 'c_3', name: 'Fitriani', phone: '085299123458', email: 'fitri@gmail.com', birthDate: '2001-11-03', points: 950, level: 'Platinum', joinDate: '2024-08-01' },
    { id: 'c_4', name: 'Jirana Daeng', phone: '085342016403', email: 'jiradaengbaji@gmail.com', birthDate: '1990-07-20', points: 2000, level: 'Platinum', joinDate: '2024-05-15' },
    { id: 'c_5', name: 'Rahmat', phone: '081298543122', email: 'rahmat@gmail.com', birthDate: '1997-01-15', points: 30, level: 'Bronze', joinDate: '2025-05-20' },
  ];

  const inventory = [
    { id: 'inv_1', name: 'Daging Sapi Giling', stock: 45, minStock: 10, unit: 'Kg', category: 'Daging', lastUpdated: '2026-07-03T10:00:00Z', supplierName: 'Supplier Daging Soppeng' },
    { id: 'inv_2', name: 'Tahu Putih Segar', stock: 120, minStock: 30, unit: 'Pcs', category: 'Tahu', lastUpdated: '2026-07-03T09:00:00Z', supplierName: 'Sinar Tahu Lalabata' },
    { id: 'inv_3', name: 'Sosis Sapi Jumbo', stock: 8, minStock: 25, unit: 'Pack', category: 'Sosis', lastUpdated: '2026-07-03T08:30:00Z', supplierName: 'Frozen Food Utama Soppeng' }, // Critical Stock
    { id: 'inv_4', name: 'Bumbu Bakso Rahasia', stock: 12, minStock: 5, unit: 'Kg', category: 'Rempah', lastUpdated: '2026-07-03T11:00:00Z', supplierName: 'Srikandi Rempah' },
    { id: 'inv_5', name: 'Jeruk Peras Fresh', stock: 4, minStock: 10, unit: 'Kg', category: 'Buah', lastUpdated: '2026-07-03T08:00:00Z', supplierName: 'Kebun Jeruk Gantarang' }, // Critical Stock
    { id: 'inv_6', name: 'Teh Celup Original', stock: 35, minStock: 10, unit: 'Kotak', category: 'Teh', lastUpdated: '2026-07-02T15:00:00Z', supplierName: 'Grosir Soppeng Raya' },
  ];

  const suppliers = [
    { id: 'sup_1', name: 'Supplier Daging Soppeng', phone: '081122334455', email: 'daging@soppeng.com', address: 'Pasar Sentral Soppeng' },
    { id: 'sup_2', name: 'Frozen Food Utama Soppeng', phone: '081122334456', email: 'ff.utama@gmail.com', address: 'Jl. Kemakmuran, Soppeng' },
    { id: 'sup_3', name: 'Sinar Tahu Lalabata', phone: '081122334457', email: 'sinartahu@gmail.com', address: 'Lalabata, Soppeng' },
  ];

  const outlets = [
    { id: 'out_1', name: 'Outlet Utama (Cikke\'e)', address: 'Cikke\'e, Jl. Salotungo, Soppeng', phone: '085342016403', status: 'OPEN' },
    { id: 'out_2', name: 'Cabang Lalabata', address: 'Jl. Pemuda, Lalabata, Soppeng', phone: '085342016404', status: 'OPEN' },
  ];

  const purchaseOrders = [
    {
      id: 'PO-20260701-01',
      supplierId: 'sup_1',
      supplierName: 'Supplier Daging Soppeng',
      items: [
        { name: 'Daging Sapi Giling', quantity: 20, unit: 'Kg', price: 120000 }
      ],
      total: 2400000,
      status: 'RECEIVED',
      createdAt: '2026-07-01T10:00:00Z'
    },
    {
      id: 'PO-20260703-01',
      supplierId: 'sup_2',
      supplierName: 'Frozen Food Utama Soppeng',
      items: [
        { name: 'Sosis Sapi Jumbo', quantity: 30, unit: 'Pack', price: 45000 }
      ],
      total: 1350000,
      status: 'PENDING',
      createdAt: '2026-07-03T11:00:00Z'
    }
  ];

  // Past 7 Days Sales to make charts look extremely rich and professional
  const pastOrders = [];
  const startDay = new Date('2026-06-27T14:00:00');
  const now = new Date('2026-07-03T20:00:00');
  let counter = 101;

  for (let d = new Date(startDay); d <= now; d.setDate(d.getDate() + 1)) {
    const dayStr = d.toISOString().split('T')[0];
    // Generate 5-12 orders per day
    const numOrders = Math.floor(Math.random() * 8) + 5;
    for (let i = 0; i < numOrders; i++) {
      const orderHour = Math.floor(Math.random() * 6) + 14; // Between 14:00 and 20:00
      const orderMin = Math.floor(Math.random() * 60);
      const orderTime = `${dayStr}T${orderHour}:${orderMin}:00Z`;

      const orderItems = [];
      const numProducts = Math.floor(Math.random() * 3) + 1;
      let subtotal = 0;
      for (let p = 0; p < numProducts; p++) {
        const item = menu[Math.floor(Math.random() * menu.length)];
        const qty = Math.floor(Math.random() * 4) + 1;
        orderItems.push({
          productId: item.id,
          name: item.name,
          price: item.price,
          quantity: qty,
        });
        subtotal += item.price * qty;
      }

      const discount = Math.random() > 0.8 ? 5000 : 0;
      const total = subtotal - discount; // Tax is 0%

      pastOrders.push({
        id: `ORD-${dayStr.replace(/-/g, '')}-${counter++}`,
        queueNumber: String(counter % 100).padStart(3, '0'),
        tableNumber: String(Math.floor(Math.random() * 12) + 1),
        customerId: customers[Math.floor(Math.random() * customers.length)].id,
        items: orderItems,
        subtotal,
        tax: 0,
        serviceCharge: 0,
        discount,
        total,
        paymentMethod: ['QRIS', 'Tunai', 'E-Wallet', 'Debit'][Math.floor(Math.random() * 4)] as any,
        paymentStatus: 'PAID',
        status: 'DELIVERED',
        source: 'POS',
        outletId: Math.random() > 0.8 ? 'out_2' : 'out_1',
        createdAt: orderTime,
      });
    }
  }

  // Add 4 pending/cooking/ready orders for today's live views
  const todayStr = '2026-07-03';
  pastOrders.push(
    {
      id: `ORD-${todayStr.replace(/-/g, '')}-501`,
      queueNumber: '001',
      tableNumber: '4',
      customerName: 'Ahmad',
      items: [
        { productId: '1', name: 'Bakso Bakar', price: 5000, quantity: 3 },
        { productId: '6', name: 'Es Teh Original', price: 5000, quantity: 2 }
      ],
      subtotal: 25000,
      tax: 0,
      serviceCharge: 0,
      discount: 0,
      total: 25000,
      paymentMethod: 'QRIS',
      paymentStatus: 'PAID',
      status: 'COOKING',
      source: 'POS',
      outletId: 'out_1',
      estimatedPrepTime: 12,
      createdAt: '2026-07-03T19:40:00Z'
    },
    {
      id: `ORD-${todayStr.replace(/-/g, '')}-502`,
      queueNumber: '002',
      tableNumber: '9',
      customerName: 'Irwan',
      items: [
        { productId: '3', name: 'Sosis Bakar', price: 10000, quantity: 2 },
        { productId: '8', name: 'Es Jeruk Peras', price: 10000, quantity: 2 }
      ],
      subtotal: 40000,
      tax: 0,
      serviceCharge: 0,
      discount: 0,
      total: 40000,
      paymentMethod: 'Tunai',
      paymentStatus: 'PAID',
      status: 'PENDING',
      source: 'POS',
      outletId: 'out_1',
      estimatedPrepTime: 15,
      createdAt: '2026-07-03T19:50:00Z'
    },
    {
      id: `ORD-${todayStr.replace(/-/g, '')}-503`,
      queueNumber: '003',
      tableNumber: '12',
      customerName: 'Self-Order Meja 12',
      items: [
        { productId: '2', name: 'Tahu Bakar', price: 8000, quantity: 1 },
        { productId: '7', name: 'Lemon Tea Soda', price: 10000, quantity: 1 }
      ],
      subtotal: 18000,
      tax: 0,
      serviceCharge: 0,
      discount: 0,
      total: 18000,
      paymentMethod: 'QRIS',
      paymentStatus: 'PAID',
      status: 'READY',
      source: 'QR_SELF_ORDER',
      outletId: 'out_1',
      estimatedPrepTime: 8,
      createdAt: '2026-07-03T19:42:00Z'
    }
  );

  const stockMovements = [
    { id: 'm_1', inventoryId: 'inv_1', type: 'IN', quantity: 20, notes: 'PO received', createdAt: '2026-07-01T10:00:00Z' },
    { id: 'm_2', inventoryId: 'inv_3', type: 'WASTE', quantity: 2, notes: 'Sosis rusak/hancur', createdAt: '2026-07-03T11:30:00Z' }
  ];

  const attendances = [
    { id: 'att_1', employeeId: 'emp_2', employeeName: 'Sitti Saleha', date: todayStr, clockIn: '13:45', status: 'PRESENT' },
    { id: 'att_2', employeeId: 'emp_3', employeeName: 'Junaedi Kasir', date: todayStr, clockIn: '13:50', status: 'PRESENT' },
    { id: 'att_3', employeeId: 'emp_4', employeeName: 'Chef Daeng', date: todayStr, clockIn: '13:40', status: 'PRESENT' },
    { id: 'att_4', employeeId: 'emp_5', employeeName: 'Gudang Daeng', date: todayStr, clockIn: '14:05', status: 'LATE' },
  ];

  const payrolls = [
    { id: 'pay_1', employeeId: 'emp_2', employeeName: 'Sitti Saleha', month: '2026-06', baseSalary: 4500000, bonus: 300000, deductions: 0, totalPaid: 4800000, status: 'PAID', paidAt: '2026-06-28T09:00:00Z' },
    { id: 'pay_2', employeeId: 'emp_3', employeeName: 'Junaedi Kasir', month: '2026-06', baseSalary: 3000000, bonus: 150000, deductions: 50000, totalPaid: 3100000, status: 'PAID', paidAt: '2026-06-28T09:10:00Z' },
    { id: 'pay_3', employeeId: 'emp_4', employeeName: 'Chef Daeng', month: '2026-06', baseSalary: 3500000, bonus: 200000, deductions: 0, totalPaid: 3700000, status: 'PAID', paidAt: '2026-06-28T09:15:00Z' }
  ];

  const tables = [
    { id: 't_1', number: '1', capacity: 4, status: 'Kosong', area: 'Indoor' },
    { id: 't_2', number: '2', capacity: 4, status: 'Terisi', area: 'Indoor' },
    { id: 't_3', number: '3', capacity: 2, status: 'Kosong', area: 'Indoor' },
    { id: 't_4', number: '4', capacity: 6, status: 'Reservasi', area: 'VIP' },
    { id: 't_5', number: '5', capacity: 4, status: 'Dibersihkan', area: 'Indoor' },
    { id: 't_6', number: '6', capacity: 4, status: 'Kosong', area: 'Outdoor' },
    { id: 't_7', number: '7', capacity: 2, status: 'Terisi', area: 'Outdoor' },
    { id: 't_8', number: '8', capacity: 4, status: 'Kosong', area: 'Outdoor' },
    { id: 't_9', number: '9', capacity: 8, status: 'Kosong', area: 'VIP' },
    { id: 't_10', number: '10', capacity: 4, status: 'Kosong', area: 'Indoor' },
    { id: 't_11', number: '11', capacity: 4, status: 'Kosong', area: 'Indoor' },
    { id: 't_12', number: '12', capacity: 4, status: 'Kosong', area: 'Indoor' },
  ];

  return {
    menu,
    employees,
    customers,
    inventory,
    suppliers,
    outlets,
    purchaseOrders,
    orders: pastOrders,
    stockMovements,
    attendances,
    payrolls,
    tables,
    serviceChargePercent: 0,
    taxPercent: 0,
    currency: 'Rupiah',
    timezone: 'WITA (UTC+8)',
    storeProfile: {
      name: 'Warung Daeng Soppeng',
      logo: 'Logo Warung Daeng Soppeng',
      address: "Cikke'e, Jl. Salotungo, Kabupaten Soppeng, Sulawesi Selatan",
      phone: '085342016403',
      googleMaps: 'Warung Daeng Soppeng',
      instagram: '@warung_daeng',
      tiktok: '@jiradaengbaji',
      operationalHours: '14.00 WITA – 20.00 WITA',
      categories: ['Kuliner', 'Frozen Food', 'Minuman']
    }
  };
}

// REST ENDPOINTS

// 1. Auth Login
app.post('/api/v1/auth/login', (req, res) => {
  const { pin } = req.body;
  if (!pin) {
    return res.status(400).json({ error: 'PIN is required' });
  }

  const db = readDB();
  const employee = db.employees.find((emp: any) => emp.pin === pin && emp.status === 'ACTIVE');

  if (!employee) {
    return res.status(401).json({ error: 'PIN Operator tidak valid atau tidak aktif' });
  }

  res.json({
    token: `jwt_token_simulated_${employee.id}_${Date.now()}`,
    user: {
      id: employee.id,
      name: employee.name,
      role: employee.role,
      phone: employee.phone
    }
  });
});

// 2. Menu Endpoints
app.get('/api/v1/menu', (req, res) => {
  const db = readDB();
  res.json(db.menu);
});

app.post('/api/v1/menu', (req, res) => {
  const db = readDB();
  const newItem = {
    id: String(db.menu.length + 1),
    ...req.body
  };
  db.menu.push(newItem);
  writeDB(db);
  res.status(201).json(newItem);
});

app.put('/api/v1/menu/:id', (req, res) => {
  const { id } = req.params;
  const db = readDB();
  const index = db.menu.findIndex((m: any) => m.id === id);
  if (index === -1) {
    return res.status(404).json({ error: 'Menu item not found' });
  }
  db.menu[index] = { ...db.menu[index], ...req.body };
  writeDB(db);
  res.json(db.menu[index]);
});

app.delete('/api/v1/menu/:id', (req, res) => {
  const { id } = req.params;
  const db = readDB();
  const index = db.menu.findIndex((m: any) => m.id === id);
  if (index === -1) {
    return res.status(404).json({ error: 'Menu item not found' });
  }
  db.menu.splice(index, 1);
  writeDB(db);
  res.json({ success: true, message: 'Menu item deleted' });
});

// 3. Orders Endpoints
app.get('/api/v1/orders', (req, res) => {
  const db = readDB();
  res.json(db.orders);
});

app.post('/api/v1/orders', (req, res) => {
  const db = readDB();
  const {
    customerId,
    customerName,
    paymentMethod,
    items,
    tableNumber,
    discount,
    subtotal,
    total,
    notes,
    source,
    outletId
  } = req.body;

  if (!items || items.length === 0) {
    return res.status(400).json({ error: 'Order items are required' });
  }

  // Auto-decrement physical menu stock & write stock movements
  items.forEach((orderItem: any) => {
    const menuItem = db.menu.find((m: any) => m.id === orderItem.productId);
    if (menuItem) {
      menuItem.stock = Math.max(0, menuItem.stock - orderItem.quantity);
    }
  });

  // If CRM customer, add point reward (Rp 1.000 = 1 point)
  if (customerId) {
    const customer = db.customers.find((c: any) => c.id === customerId);
    if (customer) {
      const addedPoints = Math.floor(total / 1000);
      customer.points += addedPoints;
      // Auto upgrade level
      if (customer.points >= 1500) customer.level = 'Platinum';
      else if (customer.points >= 800) customer.level = 'Gold';
      else if (customer.points >= 300) customer.level = 'Silver';
    }
  }

  const todayStr = new Date().toISOString().split('T')[0].replace(/-/g, '');
  const queueNum = String((db.orders.filter((o: any) => o.createdAt.startsWith(new Date().toISOString().split('T')[0])).length + 1)).padStart(3, '0');

  const newOrder = {
    id: `ORD-${todayStr}-${Math.floor(100 + Math.random() * 900)}`,
    queueNumber: queueNum,
    tableNumber: tableNumber || '',
    customerId: customerId || '',
    customerName: customerName || (customerId ? db.customers.find((c: any) => c.id === customerId)?.name : 'Pelanggan Umum'),
    items,
    subtotal: subtotal || total,
    tax: 0,
    serviceCharge: Math.floor((subtotal || total) * (db.serviceChargePercent ?? 0) / 100),
    discount: discount || 0,
    total: (subtotal || total) + Math.floor((subtotal || total) * (db.serviceChargePercent ?? 0) / 100) - (discount || 0),
    paymentMethod: paymentMethod || 'Tunai',
    paymentStatus: paymentMethod ? 'PAID' : 'UNPAID',
    status: 'PENDING',
    source: source || 'POS',
    outletId: outletId || 'out_1',
    notes: notes || '',
    estimatedPrepTime: 10 + items.length * 2,
    createdAt: new Date().toISOString()
  };

  db.orders.push(newOrder);
  writeDB(db);
  res.status(201).json(newOrder);
});

app.put('/api/v1/orders/:id', (req, res) => {
  const { id } = req.params;
  const db = readDB();
  const index = db.orders.findIndex((o: any) => o.id === id);
  if (index === -1) {
    return res.status(404).json({ error: 'Order not found' });
  }

  const currentStatus = db.orders[index].status;
  const newStatus = req.body.status;

  db.orders[index] = { ...db.orders[index], ...req.body };

  // Set cookedAt or deliveredAt
  if (newStatus === 'READY' && currentStatus !== 'READY') {
    db.orders[index].cookedAt = new Date().toISOString();
  }
  if (newStatus === 'DELIVERED' && currentStatus !== 'DELIVERED') {
    db.orders[index].deliveredAt = new Date().toISOString();
  }

  writeDB(db);
  res.json(db.orders[index]);
});

app.delete('/api/v1/orders/:id', (req, res) => {
  const { id } = req.params;
  const db = readDB();
  const index = db.orders.findIndex((o: any) => o.id === id);
  if (index === -1) {
    return res.status(404).json({ error: 'Order not found' });
  }
  // Mark as void instead of deletion for auditing and POS logs
  db.orders[index].status = 'VOID';
  writeDB(db);
  res.json({ success: true, message: 'Order has been voided successfully', order: db.orders[index] });
});

// 4. KDS (Kitchen Display System)
app.get('/api/v1/kds/orders', (req, res) => {
  const db = readDB();
  // KDS needs active unserved kitchen orders
  const activeOrders = db.orders.filter((o: any) => ['PENDING', 'COOKING', 'READY'].includes(o.status));
  res.json(activeOrders);
});

app.put('/api/v1/kds/status', (req, res) => {
  const { orderId, status } = req.body;
  if (!orderId || !status) {
    return res.status(400).json({ error: 'orderId and status are required' });
  }
  const db = readDB();
  const order = db.orders.find((o: any) => o.id === orderId);
  if (!order) {
    return res.status(404).json({ error: 'Order not found' });
  }

  order.status = status;
  if (status === 'READY') {
    order.cookedAt = new Date().toISOString();
  }
  if (status === 'DELIVERED') {
    order.deliveredAt = new Date().toISOString();
  }

  writeDB(db);
  res.json(order);
});

// 5. Gudang Inventori Endpoints
app.get('/api/v1/inventory', (req, res) => {
  const db = readDB();
  res.json({
    inventory: db.inventory,
    movements: db.stockMovements,
    suppliers: db.suppliers,
    purchaseOrders: db.purchaseOrders
  });
});

app.post('/api/v1/inventory', (req, res) => {
  const db = readDB();
  const newItem = {
    id: `inv_${db.inventory.length + 1}`,
    ...req.body,
    lastUpdated: new Date().toISOString()
  };
  db.inventory.push(newItem);

  // Track stock movement for creation
  db.stockMovements.push({
    id: `m_${db.stockMovements.length + 1}`,
    inventoryId: newItem.id,
    type: 'IN',
    quantity: newItem.stock,
    notes: 'Stok awal barang ditambahkan',
    createdAt: new Date().toISOString()
  });

  writeDB(db);
  res.status(201).json(newItem);
});

app.put('/api/v1/inventory/:id', (req, res) => {
  const { id } = req.params;
  const db = readDB();
  const index = db.inventory.findIndex((i: any) => i.id === id);
  if (index === -1) {
    return res.status(404).json({ error: 'Inventory item not found' });
  }

  const oldStock = db.inventory[index].stock;
  const newStock = req.body.stock !== undefined ? req.body.stock : oldStock;

  db.inventory[index] = {
    ...db.inventory[index],
    ...req.body,
    lastUpdated: new Date().toISOString()
  };

  // If stock was adjusted, add stock movement record
  if (oldStock !== newStock) {
    db.stockMovements.push({
      id: `m_${db.stockMovements.length + 1}`,
      inventoryId: id,
      type: newStock > oldStock ? 'IN' : 'OUT',
      quantity: Math.abs(newStock - oldStock),
      notes: req.body.movementNote || 'Penyesuaian stok manual',
      createdAt: new Date().toISOString()
    });
  }

  writeDB(db);
  res.json(db.inventory[index]);
});

app.delete('/api/v1/inventory/:id', (req, res) => {
  const { id } = req.params;
  const db = readDB();
  const index = db.inventory.findIndex((i: any) => i.id === id);
  if (index === -1) {
    return res.status(404).json({ error: 'Inventory item not found' });
  }
  db.inventory.splice(index, 1);
  writeDB(db);
  res.json({ success: true, message: 'Inventory item deleted' });
});

// Stock Adjustments / Waste / POs
app.post('/api/v1/inventory/adjust', (req, res) => {
  const { inventoryId, type, quantity, notes } = req.body;
  const db = readDB();
  const item = db.inventory.find((i: any) => i.id === inventoryId);
  if (!item) {
    return res.status(404).json({ error: 'Inventory item not found' });
  }

  if (type === 'IN') {
    item.stock += Number(quantity);
  } else if (['OUT', 'WASTE', 'EXPIRED'].includes(type)) {
    item.stock = Math.max(0, item.stock - Number(quantity));
  }

  const movement = {
    id: `m_${db.stockMovements.length + 1}`,
    inventoryId,
    type,
    quantity: Number(quantity),
    notes: notes || 'Mutasi stock',
    createdAt: new Date().toISOString()
  };

  db.stockMovements.push(movement);
  writeDB(db);
  res.json({ success: true, item, movement });
});

app.post('/api/v1/inventory/po', (req, res) => {
  const db = readDB();
  const { supplierId, items } = req.body;

  const supplier = db.suppliers.find((s: any) => s.id === supplierId);
  if (!supplier) {
    return res.status(404).json({ error: 'Supplier not found' });
  }

  let total = 0;
  items.forEach((it: any) => { total += (it.price * it.quantity); });

  const newPO = {
    id: `PO-${new Date().toISOString().split('T')[0].replace(/-/g, '')}-${db.purchaseOrders.length + 1}`,
    supplierId,
    supplierName: supplier.name,
    items,
    total,
    status: 'PENDING',
    createdAt: new Date().toISOString()
  };

  db.purchaseOrders.push(newPO);
  writeDB(db);
  res.status(201).json(newPO);
});

app.put('/api/v1/inventory/po/:id', (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  const db = readDB();
  const po = db.purchaseOrders.find((p: any) => p.id === id);
  if (!po) {
    return res.status(404).json({ error: 'PO not found' });
  }

  po.status = status;

  // If status received, increase corresponding inventory item stock
  if (status === 'RECEIVED') {
    po.items.forEach((poItem: any) => {
      const invItem = db.inventory.find((i: any) => i.name.toLowerCase() === poItem.name.toLowerCase());
      if (invItem) {
        invItem.stock += Number(poItem.quantity);
        db.stockMovements.push({
          id: `m_${db.stockMovements.length + 1}`,
          inventoryId: invItem.id,
          type: 'IN',
          quantity: poItem.quantity,
          notes: `Diterima dari PO ${id}`,
          createdAt: new Date().toISOString()
        });
      }
    });
  }

  writeDB(db);
  res.json(po);
});

// 6. CRM Customers Endpoints
app.get('/api/v1/customers', (req, res) => {
  const db = readDB();
  res.json(db.customers);
});

app.post('/api/v1/customers', (req, res) => {
  const db = readDB();
  const newCustomer = {
    id: `c_${db.customers.length + 1}`,
    points: 0,
    level: 'Bronze',
    joinDate: new Date().toISOString().split('T')[0],
    ...req.body
  };
  db.customers.push(newCustomer);
  writeDB(db);
  res.status(201).json(newCustomer);
});

app.put('/api/v1/customers/:id', (req, res) => {
  const { id } = req.params;
  const db = readDB();
  const index = db.customers.findIndex((c: any) => c.id === id);
  if (index === -1) {
    return res.status(404).json({ error: 'Customer not found' });
  }
  db.customers[index] = { ...db.customers[index], ...req.body };
  writeDB(db);
  res.json(db.customers[index]);
});

app.delete('/api/v1/customers/:id', (req, res) => {
  const { id } = req.params;
  const db = readDB();
  const index = db.customers.findIndex((c: any) => c.id === id);
  if (index === -1) {
    return res.status(404).json({ error: 'Customer not found' });
  }
  db.customers.splice(index, 1);
  writeDB(db);
  res.json({ success: true, message: 'Customer deleted successfully' });
});

// Redeem Customer points
app.post('/api/v1/customers/redeem', (req, res) => {
  const { customerId, pointsCost, discountValue } = req.body;
  const db = readDB();
  const customer = db.customers.find((c: any) => c.id === customerId);
  if (!customer) {
    return res.status(404).json({ error: 'Customer not found' });
  }

  if (customer.points < pointsCost) {
    return res.status(400).json({ error: 'Poin pelanggan tidak mencukupi' });
  }

  customer.points -= Number(pointsCost);
  writeDB(db);
  res.json({ success: true, customer, discountValue });
});

// 7. Outlets Endpoints
app.get('/api/v1/outlets', (req, res) => {
  const db = readDB();
  res.json(db.outlets);
});

app.post('/api/v1/outlets', (req, res) => {
  const db = readDB();
  const newOutlet = {
    id: `out_${db.outlets.length + 1}`,
    ...req.body
  };
  db.outlets.push(newOutlet);
  writeDB(db);
  res.status(201).json(newOutlet);
});

app.put('/api/v1/outlets/:id', (req, res) => {
  const { id } = req.params;
  const db = readDB();
  const index = db.outlets.findIndex((o: any) => o.id === id);
  if (index === -1) {
    return res.status(404).json({ error: 'Outlet not found' });
  }
  db.outlets[index] = { ...db.outlets[index], ...req.body };
  writeDB(db);
  res.json(db.outlets[index]);
});

app.delete('/api/v1/outlets/:id', (req, res) => {
  const { id } = req.params;
  const db = readDB();
  const index = db.outlets.findIndex((o: any) => o.id === id);
  if (index === -1) {
    return res.status(404).json({ error: 'Outlet not found' });
  }
  db.outlets.splice(index, 1);
  writeDB(db);
  res.json({ success: true, message: 'Outlet deleted successfully' });
});

// Tables Management Endpoints
app.get('/api/v1/tables', (req, res) => {
  const db = readDB();
  res.json(db.tables || []);
});

app.post('/api/v1/tables', (req, res) => {
  const db = readDB();
  if (!db.tables) db.tables = [];
  const newTable = {
    id: `t_${Date.now()}`,
    number: req.body.number,
    capacity: Number(req.body.capacity) || 4,
    status: req.body.status || 'Kosong',
    area: req.body.area || 'Indoor',
  };
  
  // Prevent duplicate table numbers
  const exists = db.tables.some((t: any) => String(t.number) === String(newTable.number));
  if (exists) {
    return res.status(400).json({ error: `Meja nomor ${newTable.number} sudah ada!` });
  }

  db.tables.push(newTable);
  writeDB(db);
  res.json(newTable);
});

app.put('/api/v1/tables/:id', (req, res) => {
  const { id } = req.params;
  const db = readDB();
  if (!db.tables) db.tables = [];
  const index = db.tables.findIndex((t: any) => String(t.id) === String(id));
  if (index === -1) {
    return res.status(404).json({ error: 'Meja tidak ditemukan' });
  }
  
  // Prevent duplicate table numbers if updated
  if (req.body.number && String(req.body.number) !== String(db.tables[index].number)) {
    const exists = db.tables.some((t: any) => String(t.number) === String(req.body.number) && String(t.id) !== String(id));
    if (exists) {
      return res.status(400).json({ error: `Meja nomor ${req.body.number} sudah ada!` });
    }
  }

  db.tables[index] = { ...db.tables[index], ...req.body };
  writeDB(db);
  res.json(db.tables[index]);
});

app.delete('/api/v1/tables/:id', (req, res) => {
  const { id } = req.params;
  const db = readDB();
  if (!db.tables) db.tables = [];
  const index = db.tables.findIndex((t: any) => String(t.id) === String(id));
  if (index === -1) {
    return res.status(404).json({ error: 'Meja tidak ditemukan' });
  }
  db.tables.splice(index, 1);
  writeDB(db);
  res.json({ success: true, message: 'Meja berhasil dihapus' });
});

// Expenses Management Endpoints
app.get('/api/v1/expenses', (req, res) => {
  const db = readDB();
  res.json(db.expenses || []);
});

app.post('/api/v1/expenses', (req, res) => {
  const db = readDB();
  if (!db.expenses) db.expenses = [];
  
  const newExpense = {
    id: req.body.id || `exp_${Date.now()}`,
    date: req.body.date || new Date().toISOString().split('T')[0],
    category: req.body.category || 'Operasional',
    amount: Number(req.body.amount) || 0,
    description: req.body.description || '',
    outletId: req.body.outletId || 'out_1',
    recordedBy: req.body.recordedBy || 'Owner'
  };

  db.expenses.push(newExpense);
  writeDB(db);
  res.status(201).json(newExpense);
});

app.put('/api/v1/expenses/:id', (req, res) => {
  const { id } = req.params;
  const db = readDB();
  if (!db.expenses) db.expenses = [];
  
  const index = db.expenses.findIndex((e: any) => String(e.id) === String(id));
  if (index === -1) {
    return res.status(404).json({ error: 'Pengeluaran tidak ditemukan' });
  }

  db.expenses[index] = { 
    ...db.expenses[index], 
    ...req.body, 
    id,
    amount: req.body.amount !== undefined ? Number(req.body.amount) : db.expenses[index].amount 
  };
  
  writeDB(db);
  res.json(db.expenses[index]);
});

app.delete('/api/v1/expenses/:id', (req, res) => {
  const { id } = req.params;
  const db = readDB();
  if (!db.expenses) db.expenses = [];
  
  const index = db.expenses.findIndex((e: any) => String(e.id) === String(id));
  if (index === -1) {
    return res.status(404).json({ error: 'Pengeluaran tidak ditemukan' });
  }
  
  db.expenses.splice(index, 1);
  writeDB(db);
  res.json({ success: true, message: 'Pengeluaran berhasil dihapus' });
});

// 8. Employees, Payroll, & Attendance
app.get('/api/v1/employees', (req, res) => {
  const db = readDB();
  res.json({
    employees: db.employees,
    attendances: db.attendances,
    payrolls: db.payrolls
  });
});

app.post('/api/v1/employees', (req, res) => {
  const db = readDB();
  const newEmp = {
    id: `emp_${db.employees.length + 1}`,
    attendanceCount: 0,
    status: 'ACTIVE',
    ...req.body
  };
  db.employees.push(newEmp);
  writeDB(db);
  res.status(201).json(newEmp);
});

app.put('/api/v1/employees/:id', (req, res) => {
  const { id } = req.params;
  const db = readDB();
  const index = db.employees.findIndex((e: any) => e.id === id);
  if (index === -1) {
    return res.status(404).json({ error: 'Employee not found' });
  }
  db.employees[index] = { ...db.employees[index], ...req.body };
  writeDB(db);
  res.json(db.employees[index]);
});

app.delete('/api/v1/employees/:id', (req, res) => {
  const { id } = req.params;
  const db = readDB();
  const index = db.employees.findIndex((e: any) => e.id === id);
  if (index === -1) {
    return res.status(404).json({ error: 'Employee not found' });
  }
  db.employees[index].status = 'INACTIVE';
  writeDB(db);
  res.json({ success: true, message: 'Employee inactivated', employee: db.employees[index] });
});

// Employee clock-in simulator compatible route
app.post('/api/v1/employees/clock', (req, res) => {
  const { employeeId, status } = req.body; // status: 'PRESENT' | 'LATE' | 'PERMIT'
  const db = readDB();
  const emp = db.employees.find((e: any) => e.id === employeeId);
  if (!emp) {
    return res.status(404).json({ error: 'Karyawan tidak ditemukan' });
  }

  const todayStr = new Date().toISOString().split('T')[0];
  const timeStr = new Date().toTimeString().split(' ')[0].substring(0, 5);

  const newAttendance = {
    id: `att_${(db.attendances || []).length + 1}`,
    employeeId,
    employeeName: emp.name,
    date: todayStr,
    clockIn: timeStr,
    status: status || 'PRESENT'
  };

  if (!db.attendances) db.attendances = [];
  db.attendances.push(newAttendance);
  emp.attendanceCount = (emp.attendanceCount || 0) + 1;
  writeDB(db);
  res.status(201).json(newAttendance);
});

// Employee pay salary (payslip) route
app.post('/api/v1/employees/pay/:id', (req, res) => {
  const { id } = req.params;
  const db = readDB();
  const emp = db.employees.find((e: any) => e.id === id);
  if (!emp) {
    return res.status(404).json({ error: 'Karyawan tidak ditemukan' });
  }

  // Set payrollStatus on employee
  emp.payrollStatus = 'PAID';

  const baseSalary = emp.salary ?? emp.baseSalary ?? 1500000;
  const bonus = 150000; // Bonus shift/makan
  const deductions = 0;
  const totalPaid = baseSalary + bonus - deductions;

  const newPayroll = {
    id: `pay_${(db.payrolls || []).length + 1}`,
    employeeId: emp.id,
    employeeName: emp.name,
    month: new Date().toISOString().substring(0, 7), // e.g. "2026-07"
    baseSalary,
    bonus,
    deductions,
    totalPaid,
    status: 'PAID',
    paidAt: new Date().toISOString()
  };

  if (!db.payrolls) db.payrolls = [];
  db.payrolls.push(newPayroll);
  writeDB(db);
  res.json({ success: true, payroll: newPayroll, employee: emp });
});

// Attendance clocking
app.post('/api/v1/employees/attendance', (req, res) => {
  const { employeeId, type } = req.body; // type: 'CLOCK_IN' | 'CLOCK_OUT'
  const db = readDB();
  const emp = db.employees.find((e: any) => e.id === employeeId);
  if (!emp) {
    return res.status(404).json({ error: 'Employee not found' });
  }

  const todayStr = new Date().toISOString().split('T')[0];
  const timeStr = new Date().toTimeString().split(' ')[0].substring(0, 5);

  if (type === 'CLOCK_IN') {
    const existing = db.attendances.find((a: any) => a.employeeId === employeeId && a.date === todayStr);
    if (existing) {
      return res.status(400).json({ error: 'Sudah melakukan absensi masuk hari ini' });
    }

    const attendance = {
      id: `att_${db.attendances.length + 1}`,
      employeeId,
      employeeName: emp.name,
      date: todayStr,
      clockIn: timeStr,
      status: Number(timeStr.replace(':', '')) > 1405 ? 'LATE' : 'PRESENT'
    };

    db.attendances.push(attendance);
    emp.attendanceCount = (emp.attendanceCount || 0) + 1;
    writeDB(db);
    return res.status(201).json(attendance);
  } else {
    // CLOCK OUT
    const att = db.attendances.find((a: any) => a.employeeId === employeeId && a.date === todayStr);
    if (!att) {
      return res.status(400).json({ error: 'Harap absen masuk terlebih dahulu' });
    }
    att.clockOut = timeStr;
    writeDB(db);
    return res.json(att);
  }
});

// 9. QR Self Ordering Simulators
app.get('/api/v1/qr/menu/:table', (req, res) => {
  const { table } = req.params;
  const db = readDB();
  res.json({
    tableNumber: table,
    storeProfile: db.storeProfile,
    menu: db.menu.filter((m: any) => m.stock > 0)
  });
});

app.post('/api/v1/qr/order', (req, res) => {
  const db = readDB();
  const { tableNumber, items, notes } = req.body;

  if (!items || items.length === 0) {
    return res.status(400).json({ error: 'Order items required' });
  }

  let subtotal = 0;
  items.forEach((orderItem: any) => {
    const menuItem = db.menu.find((m: any) => m.id === orderItem.productId);
    if (menuItem) {
      menuItem.stock = Math.max(0, menuItem.stock - orderItem.quantity);
      subtotal += menuItem.price * orderItem.quantity;
    }
  });

  const todayStr = new Date().toISOString().split('T')[0].replace(/-/g, '');
  const queueNum = String((db.orders.filter((o: any) => o.createdAt.startsWith(new Date().toISOString().split('T')[0])).length + 1)).padStart(3, '0');

  const newOrder = {
    id: `ORD-QR-${todayStr}-${Math.floor(1000 + Math.random() * 9000)}`,
    queueNumber: queueNum,
    tableNumber,
    customerName: `Self-Order Meja ${tableNumber}`,
    items,
    subtotal,
    tax: 0,
    serviceCharge: Math.floor(subtotal * (db.serviceChargePercent ?? 0) / 100),
    discount: 0,
    total: subtotal + Math.floor(subtotal * (db.serviceChargePercent ?? 0) / 100),
    paymentMethod: 'QRIS', // QR is prepaid via integrated simulated payments
    paymentStatus: 'PAID',
    status: 'PENDING',
    source: 'QR_SELF_ORDER',
    outletId: 'out_1',
    notes: notes || '',
    estimatedPrepTime: 12 + items.length * 2,
    createdAt: new Date().toISOString()
  };

  db.orders.push(newOrder);
  writeDB(db);
  res.status(201).json(newOrder);
});

// 9.5. Store Settings and Profile Endpoints
app.get('/api/v1/settings', (req, res) => {
  const db = readDB();
  res.json({
    serviceChargePercent: db.serviceChargePercent ?? 0,
    taxPercent: db.taxPercent ?? 0,
    currency: db.currency ?? 'Rupiah',
    timezone: db.timezone ?? 'WITA (UTC+8)',
    storeProfile: db.storeProfile ?? {}
  });
});

app.put('/api/v1/settings', (req, res) => {
  const db = readDB();
  const { serviceChargePercent, taxPercent, currency, timezone, storeProfile } = req.body;
  
  if (serviceChargePercent !== undefined) db.serviceChargePercent = Number(serviceChargePercent);
  if (taxPercent !== undefined) db.taxPercent = Number(taxPercent);
  if (currency !== undefined) db.currency = currency;
  if (timezone !== undefined) db.timezone = timezone;
  if (storeProfile !== undefined) db.storeProfile = { ...(db.storeProfile || {}), ...storeProfile };
  
  writeDB(db);
  res.json({
    serviceChargePercent: db.serviceChargePercent,
    taxPercent: db.taxPercent,
    currency: db.currency,
    timezone: db.timezone,
    storeProfile: db.storeProfile
  });
});

// 10. Reports & Finance Metrics
app.get('/api/v1/reports/sales', (req, res) => {
  const db = readDB();
  const orders = db.orders.filter((o: any) => o.status !== 'VOID');

  // Daily totals
  const dailySalesMap: { [key: string]: number } = {};
  const itemVolumeMap: { [key: string]: { name: string; quantity: number; revenue: number } } = {};

  orders.forEach((o: any) => {
    const date = o.createdAt.split('T')[0];
    dailySalesMap[date] = (dailySalesMap[date] || 0) + o.total;

    o.items.forEach((it: any) => {
      if (!itemVolumeMap[it.productId]) {
        itemVolumeMap[it.productId] = { name: it.name, quantity: 0, revenue: 0 };
      }
      itemVolumeMap[it.productId].quantity += it.quantity;
      itemVolumeMap[it.productId].revenue += (it.price * it.quantity);
    });
  });

  const sortedItems = Object.values(itemVolumeMap).sort((a, b) => b.quantity - a.quantity);

  res.json({
    totalRevenue: orders.reduce((sum: number, o: any) => sum + o.total, 0),
    totalOrders: orders.length,
    dailySales: Object.entries(dailySalesMap).map(([date, amount]) => ({ date, amount })),
    topProducts: sortedItems.slice(0, 5),
    allProductsVolume: sortedItems
  });
});

app.get('/api/v1/reports/profit', (req, res) => {
  const db = readDB();
  const orders = db.orders.filter((o: any) => o.status !== 'VOID');

  const totalRevenue = orders.reduce((sum: number, o: any) => sum + o.total, 0);

  // Simulated food cost ratio (ideal target ~35% for Warung Daeng Soppeng)
  const cogs = Math.floor(totalRevenue * 0.35);
  const employeeSalaries = db.employees.reduce((sum: number, e: any) => sum + (e.status === 'ACTIVE' ? e.salary : 0), 0);
  const monthlyOperationalCost = 3500000; // Rent, electricity, utilities

  const totalExpense = cogs + (employeeSalaries / 4) + monthlyOperationalCost; // Divided by 4 weeks to map daily/weekly
  const netProfit = totalRevenue - totalExpense;

  res.json({
    revenue: totalRevenue,
    cogs: cogs,
    salaries: Math.floor(employeeSalaries / 4),
    rentAndUtilities: monthlyOperationalCost,
    grossProfit: totalRevenue - cogs,
    netProfit: netProfit,
    foodCostPercent: 35
  });
});

app.get('/api/v1/reports/cashflow', (req, res) => {
  const db = readDB();
  const orders = db.orders.filter((o: any) => o.status !== 'VOID');

  // POs and payroll represent outflows
  const inFlow = orders.reduce((sum: number, o: any) => sum + o.total, 0);
  const outFlowPO = db.purchaseOrders.filter((p: any) => p.status === 'RECEIVED').reduce((sum: number, p: any) => sum + p.total, 0);
  const outFlowSalary = db.payrolls.reduce((sum: number, p: any) => sum + p.totalPaid, 0);

  res.json({
    totalCashIn: inFlow,
    totalCashOut: outFlowPO + outFlowSalary,
    netCashFlow: inFlow - (outFlowPO + outFlowSalary),
    breakdown: [
      { name: 'Penjualan POS', amount: inFlow, type: 'IN' },
      { name: 'Belanja Gudang (PO)', amount: outFlowPO, type: 'OUT' },
      { name: 'Gaji Karyawan', amount: outFlowSalary, type: 'OUT' },
    ]
  });
});

// 11. Dashboard Owner AI - Gemini API Insight Engine
app.post('/api/v1/owner/ai-assistant', async (req, res) => {
  const { query, language = 'id' } = req.body;
  if (!query) {
    return res.status(400).json({ error: 'Query is required' });
  }

  try {
    const db = readDB();

    // Prepare dense business summary for context
    const totalRevenue = db.orders.filter((o: any) => o.status === 'DELIVERED').reduce((sum: number, o: any) => sum + o.total, 0);
    const orderCount = db.orders.length;
    const itemsVolume: { [key: string]: number } = {};
    db.orders.forEach((o: any) => {
      o.items.forEach((it: any) => {
        itemsVolume[it.name] = (itemsVolume[it.name] || 0) + it.quantity;
      });
    });

    const criticalItems = db.inventory.filter((i: any) => i.stock <= i.minStock).map((i: any) => `${i.name} (Sisa: ${i.stock} ${i.unit})`);
    const employeeCount = db.employees.filter((e: any) => e.status === 'ACTIVE').length;

    const bestSellers = Object.entries(itemsVolume)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([name, qty]) => `${name} (${qty} terjual)`);

    const context = `
      Anda adalah "Daeng AI", asisten bisnis pintar eksklusif untuk Warung Daeng Soppeng POS.
      Anda berbicara dalam Bahasa Indonesia yang ramah, sopan, bersahabat, dan profesional (menggunakan sapaan 'Daeng' atau 'Siri' jika sesuai).
      Berikut adalah metrik real-time terbaru dari Warung Daeng Soppeng:
      - Omzet Penjualan Terkumpul: Rp ${totalRevenue.toLocaleString('id-ID')}
      - Jumlah Transaksi POS: ${orderCount}
      - Produk Terlaris saat ini: ${bestSellers.join(', ')}
      - Karyawan Aktif: ${employeeCount} orang
      - Stok Bahan Baku Kritis: ${criticalItems.length > 0 ? criticalItems.join(', ') : 'Tidak ada. Semua aman!'}
      - Jam Operasional: 14.00 - 20.00 WITA
      - Lokasi Cabang Utama: Cikke'e, Jl. Salotungo, Soppeng
      - Kategori Menu Utama: Makanan, Minuman, Frozen Food.
      
      Gunakan data bisnis ini untuk memberikan saran finansial, tips pengelolaan stok, ide promosi kuliner Sulawesi, atau jawaban analisis bisnis mendalam yang ditanyakan oleh Owner. Berikan respon yang terstruktur, padat, elegan, dan solutif.
    `;

    // Lazy initialization of Gemini API
    if (!process.env.GEMINI_API_KEY) {
      console.warn('GEMINI_API_KEY is not configured in secrets. Using beautiful fallback expert agent.');
      const simulatedResponses: { [key: string]: string } = {
        "halo": "Halo Daeng! Saya Daeng AI, asisten bisnis pintar Warung Daeng Soppeng. Ada yang bisa saya bantu untuk menganalisis penjualan atau stok gudang kita hari ini?",
        "rekomendasi": `Berdasarkan performa penjualan kita, menu **${bestSellers[0] || 'Bakso Bakar'}** sangat dominan. Berikut rekomendasi strategi Daeng AI:\n\n1. **Bundling Promo**: Pasangkan **${bestSellers[0] || 'Bakso Bakar'}** dengan minuman penyegar seperti **Lemon Tea Soda** sebagai paket hemat sore hari (jam 15.00 - 17.00 WITA).\n2. **Restock Cepat**: ${criticalItems.length > 0 ? `Bahan baku **${criticalItems.join(', ')}** berada di bawah batas minimum. Harap segera setujui Purchase Order untuk menghindari kehabisan menu.` : 'Stok bahan baku kita saat ini masih sangat sehat. Pertahankan sirkulasi bahan baku dengan sistem FIFO.'}\n3. **Loyalty Program**: Tingkatkan penawaran ke pelanggan level Bronze untuk bertransaksi lagi agar mendapatkan voucher cashback menarik.`,
        "stok": criticalItems.length > 0 
          ? `Peringatan Daeng AI: Ada stok kritis yang harus segera diperhatikan:\n- **${criticalItems.join('\n- ')}**\n\nSaya sarankan untuk menghubungi supplier terdaftar segera melalui modul Gudang Inventori di POS.`
          : "Laporan Gudang: Semua persediaan bahan baku berada dalam tingkat yang aman, Daeng! Stok minimum terpenuhi dengan baik.",
        "default": `Analisis Bisnis Daeng AI:\n- Omzet saat ini telah mencapai **Rp ${totalRevenue.toLocaleString('id-ID')}** melalui **${orderCount} transaksi**.\n- Menu paling dicari adalah **${bestSellers[0] || 'Bakso Bakar'}**.\n- Untuk mengoptimalkan jam operasional kita (14.00 - 20.00 WITA), pastikan shift staff kasir dan dapur siap melayani puncak keramaian pada pukul 16.30 - 18.30 WITA.\n\nApakah Daeng ingin saya buatkan kalkulasi keuntungan atau draf PO baru?`
      };

      const matchedKey = Object.keys(simulatedResponses).find(k => query.toLowerCase().includes(k)) || 'default';
      return res.json({ answer: simulatedResponses[matchedKey] });
    }

    const ai = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build'
        }
      }
    });

    const response = await ai.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: query,
      config: {
        systemInstruction: context,
        temperature: 0.7,
      }
    });

    res.json({ answer: response.text });
  } catch (error: any) {
    console.error('Error contacting Gemini API:', error);
    res.status(500).json({ error: 'Gagal memproses data melalui AI. Silakan coba sesaat lagi.' });
  }
});

// START EXPRESS SERVER WITH VITE INTEGRATION

async function startServer() {
  // Initialize Firestore and load cached DB before starting
  await initFirestore();

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server Warung Daeng Soppeng Smart POS running on http://localhost:${PORT}`);
  });
}

startServer();
