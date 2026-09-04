export interface Product {
  id: string;
  sku: string;
  name: string;
  barcode: string;
  category: string;
  price: number;
  costPrice: number;
  stock: number;
  minStock: number;
  unit: 'шт' | 'кг' | 'л' | 'м' | 'уп';
  isMarked?: boolean; // Честный ЗНАК (DataMatrix)
  updatedAt: string;
}

export interface CartItem {
  product: Product;
  quantity: number;
  discountPercent: number;
  markingCode?: string; // DataMatrix маркировка
}

export type PaymentMethod = 'cash' | 'card' | 'sbp_qr' | 'split';

export interface SaleItem {
  productId: string;
  name: string;
  barcode: string;
  quantity: number;
  unitPrice: number;
  costPrice: number;
  discount: number;
  total: number;
  markingCode?: string;
}

export interface SplitPaymentDetails {
  cash: number;
  card: number;
  sbp?: number;
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  bonusBalance: number;
  discountPercent: number; // e.g. 5% personal VIP discount
  totalSpent: number;
  visitsCount: number;
  createdAt: string;
}

export interface ParkedReceipt {
  id: string;
  name: string;
  note?: string;
  cart: CartItem[];
  items?: CartItem[];
  customer?: Customer | null;
  globalDiscount: number;
  createdAt: string;
  cashierName?: string;
}

export interface ReturnItem {
  productId: string;
  name: string;
  quantity: number;
  unitPrice: number;
  refundAmount: number;
}

export interface ReturnRecord {
  id: string;
  originalSaleId: string;
  originalReceiptNumber: string;
  returnReceiptNumber: string;
  timestamp: string;
  cashierName: string;
  items: ReturnItem[];
  totalRefund: number;
  totalRefundAmount?: number;
  refundMethod: PaymentMethod;
  reason: string;
}

export type StaffRole = 'admin' | 'cashier';

export interface StaffUser {
  id: string;
  name: string;
  role: StaffRole;
  pin: string;
  maxDiscountPercent: number;
}

export interface PurchaseOrderItem {
  product: Product;
  recommendedQty: number;
  estimatedCost: number;
  reason: string;
}

export interface Sale {
  id: string;
  receiptNumber: string;
  timestamp: string;
  items: SaleItem[];
  subtotal: number;
  discountAmount: number;
  taxAmount: number;
  total: number;
  paymentMethod: PaymentMethod;
  cashReceived?: number;
  change?: number;
  cashierName: string;
  cashierRole?: StaffRole;
  synced: boolean;
  createdAt: string;
  // Loyalty & Split additions
  splitDetails?: SplitPaymentDetails;
  customerId?: string;
  customerName?: string;
  customerPhone?: string;
  bonusesUsed?: number;
  bonusesEarned?: number;
  // Return receipt flag
  isReturn?: boolean;
  originalReceiptNumber?: string;
  returnReason?: string;
}

export type InventoryLogType = 'sale' | 'restock' | 'adjustment' | 'write_off' | 'audit';

export interface InventoryLog {
  id: string;
  productId: string;
  productName: string;
  type: InventoryLogType;
  delta: number;
  newStock: number;
  reason: string;
  timestamp: string;
  synced: boolean;
}

export interface SyncStatus {
  isOnline: boolean;
  isSimulatedOffline: boolean;
  isSyncing: boolean;
  lastSyncTime: string | null;
  pendingSalesCount: number;
  pendingAdjustmentsCount: number;
  serverConnected: boolean;
}

export interface InventoryAuditItem {
  productId: string;
  productName: string;
  barcode: string;
  systemStock: number;
  actualStock: number;
  costPrice: number;
  sellingPrice: number;
}

export interface CategorySummary {
  category: string;
  count: number;
  totalStock: number;
  retailValue: number;
  costValue: number;
  salesVolume: number;
}
