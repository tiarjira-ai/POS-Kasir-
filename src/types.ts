export type Role = 'OWNER' | 'MANAGER' | 'KASIR' | 'DAPUR' | 'GUDANG';

export interface UserSession {
  employeeId: string;
  name: string;
  role: Role;
  pin: string;
}

export type Category = 'Makanan' | 'Minuman' | 'Frozen Food';

export interface MenuItem {
  id: string;
  name: string;
  category: Category;
  price: number;
  image: string;
  stock: number;
  minStock: number;
  unit: string;
  variations?: string[];
  modifiers?: { name: string; price: number }[];
}

export interface CartItem {
  product: MenuItem;
  quantity: number;
  selectedVariation?: string;
  selectedModifiers: { name: string; price: number }[];
  notes?: string;
}

export type OrderStatus = 'PENDING' | 'COOKING' | 'READY' | 'DELIVERED' | 'VOID' | 'REFUNDED';
export type PaymentMethod = 'Tunai' | 'QRIS' | 'Transfer' | 'E-Wallet' | 'Debit' | 'Kredit';
export type OrderSource = 'POS' | 'QR_SELF_ORDER';

export interface Order {
  id: string;
  queueNumber: string;
  tableNumber?: string;
  customerId?: string;
  customerName?: string;
  items: {
    productId: string;
    name: string;
    price: number;
    quantity: number;
    variation?: string;
    modifiers?: { name: string; price: number }[];
    notes?: string;
  }[];
  subtotal: number;
  tax: number; // e.g. 0%
  serviceCharge: number; // e.g. 5%
  discount: number;
  total: number;
  paymentMethod?: PaymentMethod;
  paymentStatus: 'PAID' | 'UNPAID' | 'REFUNDED';
  status: OrderStatus;
  source: OrderSource;
  outletId: string;
  notes?: string;
  createdAt: string;
  cookedAt?: string;
  deliveredAt?: string;
  estimatedPrepTime?: number; // in minutes
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  email: string;
  birthDate: string;
  points: number;
  level: 'Bronze' | 'Silver' | 'Gold' | 'Platinum';
  joinDate: string;
}

export interface InventoryItem {
  id: string;
  name: string;
  stock: number;
  minStock: number;
  unit: string;
  category: string;
  lastUpdated: string;
  supplierName?: string;
}

export interface StockMovement {
  id: string;
  inventoryId: string;
  type: 'IN' | 'OUT' | 'WASTE' | 'EXPIRED' | 'OPNAME';
  quantity: number;
  notes: string;
  createdAt: string;
}

export interface Supplier {
  id: string;
  name: string;
  phone: string;
  email: string;
  address: string;
}

export interface PurchaseOrder {
  id: string;
  supplierId: string;
  supplierName: string;
  items: {
    name: string;
    quantity: number;
    unit: string;
    price: number;
  }[];
  total: number;
  status: 'PENDING' | 'ORDERED' | 'RECEIVED';
  createdAt: string;
}

export interface Employee {
  id: string;
  name: string;
  role: Role;
  phone: string;
  address: string;
  salary: number;
  pin: string;
  status: 'ACTIVE' | 'INACTIVE';
  attendanceCount: number;
}

export interface Outlet {
  id: string;
  name: string;
  address: string;
  phone: string;
  status: 'OPEN' | 'CLOSED';
}

export interface Attendance {
  id: string;
  employeeId: string;
  employeeName: string;
  date: string;
  clockIn: string;
  clockOut?: string;
  status: 'PRESENT' | 'ABSENT' | 'LATE' | 'LEAVE';
}

export interface Payroll {
  id: string;
  employeeId: string;
  employeeName: string;
  month: string;
  baseSalary: number;
  bonus: number;
  deductions: number;
  totalPaid: number;
  status: 'UNPAID' | 'PAID';
  paidAt?: string;
}

export type TableStatus = 'Kosong' | 'Terisi' | 'Reservasi' | 'Dibersihkan';

export interface Table {
  id: string;
  number: string;
  capacity: number;
  status: TableStatus;
  area: string;
}
