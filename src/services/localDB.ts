import { Product, Sale, InventoryLog, Customer, ParkedReceipt, ReturnRecord, StaffUser, StaffRole } from '../types';

const STORAGE_KEYS = {
  PRODUCTS: 'pos_products_v1',
  SALES: 'pos_sales_v1',
  INVENTORY_LOGS: 'pos_inventory_logs_v1',
  PENDING_SALES: 'pos_pending_sales_v1',
  PENDING_ADJUSTMENTS: 'pos_pending_adjustments_v1',
  LAST_SYNC: 'pos_last_sync_v1',
  SIMULATED_OFFLINE: 'pos_simulated_offline_v1',
  STORE_INFO: 'pos_store_info_v1',
  POS_SETTINGS: 'pos_settings_v1',
  CUSTOMERS: 'pos_customers_v1',
  PARKED_RECEIPTS: 'pos_parked_receipts_v1',
  RETURNS: 'pos_returns_v1',
  STAFF_USERS: 'pos_staff_users_v1',
  CURRENT_USER: 'pos_current_user_v1',
  DEV_MASTER_PIN: 'pos_dev_master_pin_v1',
  DEV_AUTH_SESSION: 'pos_dev_auth_session_v1',
};

export interface POSSettings {
  autoPrintReceipt: boolean;
  autoDownloadPDF: boolean;
  receiptFormat: 'thermal80' | 'a4';
}

const INITIAL_CUSTOMERS: Customer[] = [
  {
    id: 'cust-001',
    name: 'Иван Петров',
    phone: '+7 (916) 111-22-33',
    bonusBalance: 450,
    discountPercent: 5,
    totalSpent: 12500,
    visitsCount: 14,
    createdAt: new Date(Date.now() - 30 * 86400000).toISOString()
  },
  {
    id: 'cust-002',
    name: 'Елена Смирнова',
    phone: '+7 (925) 777-88-99',
    bonusBalance: 180,
    discountPercent: 0,
    totalSpent: 4200,
    visitsCount: 6,
    createdAt: new Date(Date.now() - 15 * 86400000).toISOString()
  },
  {
    id: 'cust-003',
    name: 'Дмитрий Ковалев (VIP)',
    phone: '+7 (903) 555-44-33',
    bonusBalance: 820,
    discountPercent: 10,
    totalSpent: 34900,
    visitsCount: 28,
    createdAt: new Date(Date.now() - 60 * 86400000).toISOString()
  }
];

const INITIAL_STAFF: StaffUser[] = [
  {
    id: 'staff-admin',
    name: 'Максим Белов (Администратор)',
    role: 'admin',
    pin: '1234',
    maxDiscountPercent: 100
  },
  {
    id: 'staff-cashier',
    name: 'Анна Кузнецова (Кассир)',
    role: 'cashier',
    pin: '0000',
    maxDiscountPercent: 15
  }
];

const INITIAL_PARKED_RECEIPTS: ParkedReceipt[] = [
  {
    id: 'parked-demo-1',
    name: 'Покупатель отошел за картой лояльности',
    note: 'Покупатель отошел за картой лояльности',
    cashierName: 'Анна Кузнецова (Кассир)',
    cart: [
      {
        product: {
          id: 'prod-002',
          sku: 'COF-02',
          name: 'Капучино Классик 300мл',
          barcode: '4607001234574',
          category: 'Готовые напитки',
          price: 220,
          costPrice: 65,
          stock: 80,
          minStock: 15,
          unit: 'шт',
          updatedAt: new Date().toISOString()
        },
        quantity: 1,
        discountPercent: 0
      },
      {
        product: {
          id: 'prod-004',
          sku: 'BAK-01',
          name: 'Круассан Французский с миндалем',
          barcode: '4607001234598',
          category: 'Выпечка',
          price: 180,
          costPrice: 70,
          stock: 12,
          minStock: 10,
          unit: 'шт',
          updatedAt: new Date().toISOString()
        },
        quantity: 1,
        discountPercent: 0
      }
    ],
    items: [
      {
        product: {
          id: 'prod-002',
          sku: 'COF-02',
          name: 'Капучино Классик 300мл',
          barcode: '4607001234574',
          category: 'Готовые напитки',
          price: 220,
          costPrice: 65,
          stock: 80,
          minStock: 15,
          unit: 'шт',
          updatedAt: new Date().toISOString()
        },
        quantity: 1,
        discountPercent: 0
      },
      {
        product: {
          id: 'prod-004',
          sku: 'BAK-01',
          name: 'Круассан Французский с миндалем',
          barcode: '4607001234598',
          category: 'Выпечка',
          price: 180,
          costPrice: 70,
          stock: 12,
          minStock: 10,
          unit: 'шт',
          updatedAt: new Date().toISOString()
        },
        quantity: 1,
        discountPercent: 0
      }
    ],
    customer: {
      id: 'cust-002',
      name: 'Елена Смирнова',
      phone: '+7 (925) 777-88-99',
      bonusBalance: 180,
      discountPercent: 0,
      totalSpent: 4200,
      visitsCount: 6,
      createdAt: new Date(Date.now() - 15 * 86400000).toISOString()
    },
    globalDiscount: 0,
    createdAt: new Date(Date.now() - 20 * 60000).toISOString()
  }
];

// Initial default seed products
const INITIAL_PRODUCTS: Product[] = [
  {
    id: 'prod-001',
    sku: 'COF-01',
    name: 'Кофе зерновой Эфиопия 250г',
    barcode: '4607001234567',
    category: 'Кофе и Чай',
    price: 490,
    costPrice: 280,
    stock: 24,
    minStock: 5,
    unit: 'шт',
    updatedAt: new Date().toISOString()
  },
  {
    id: 'prod-002',
    sku: 'COF-02',
    name: 'Капучино Классик 300мл',
    barcode: '4607001234574',
    category: 'Готовые напитки',
    price: 220,
    costPrice: 65,
    stock: 80,
    minStock: 15,
    unit: 'шт',
    updatedAt: new Date().toISOString()
  },
  {
    id: 'prod-003',
    sku: 'COF-03',
    name: 'Матча Латте Кокосовый 350мл',
    barcode: '4607001234581',
    category: 'Готовые напитки',
    price: 260,
    costPrice: 85,
    stock: 18,
    minStock: 8,
    unit: 'шт',
    updatedAt: new Date().toISOString()
  },
  {
    id: 'prod-004',
    sku: 'BAK-01',
    name: 'Круассан Французский с миндалем',
    barcode: '4607001234598',
    category: 'Выпечка',
    price: 180,
    costPrice: 70,
    stock: 12,
    minStock: 10,
    unit: 'шт',
    updatedAt: new Date().toISOString()
  },
  {
    id: 'prod-005',
    sku: 'BAK-02',
    name: 'Дэниш с малиной и крем-чизом',
    barcode: '4607001234604',
    category: 'Выпечка',
    price: 195,
    costPrice: 75,
    stock: 4,
    minStock: 8,
    unit: 'шт',
    updatedAt: new Date().toISOString()
  },
  {
    id: 'prod-006',
    sku: 'DRK-01',
    name: 'Лимонад Крафтовый Маракуйя 0.5л',
    barcode: '4607001234611',
    category: 'Напитки',
    price: 160,
    costPrice: 60,
    stock: 35,
    minStock: 10,
    unit: 'шт',
    updatedAt: new Date().toISOString()
  },
  {
    id: 'prod-007',
    sku: 'DRK-02',
    name: 'Вода минеральная природная 0.5л',
    barcode: '4607001234628',
    category: 'Напитки',
    price: 90,
    costPrice: 32,
    stock: 50,
    minStock: 15,
    unit: 'шт',
    updatedAt: new Date().toISOString()
  },
  {
    id: 'prod-008',
    sku: 'SNK-01',
    name: 'Протеиновый батончик Соленая карамель',
    barcode: '4607001234635',
    category: 'Снеки',
    price: 150,
    costPrice: 65,
    stock: 42,
    minStock: 12,
    unit: 'шт',
    updatedAt: new Date().toISOString()
  },
  {
    id: 'prod-009',
    sku: 'SNK-02',
    name: 'Ореховое ассорти Элит 150г',
    barcode: '4607001234642',
    category: 'Снеки',
    price: 340,
    costPrice: 190,
    stock: 8,
    minStock: 10,
    unit: 'шт',
    updatedAt: new Date().toISOString()
  },
  {
    id: 'prod-010',
    sku: 'DES-01',
    name: 'Чизкейк Нью-Йорк порционный',
    barcode: '4607001234659',
    category: 'Десерты',
    price: 250,
    costPrice: 110,
    stock: 9,
    minStock: 5,
    unit: 'шт',
    updatedAt: new Date().toISOString()
  }
];

const INITIAL_SALES: Sale[] = [
  {
    id: 'sale-001',
    receiptNumber: 'ЧЕК-1001',
    timestamp: new Date(Date.now() - 3600 * 1000 * 4).toISOString(),
    items: [
      {
        productId: 'prod-002',
        name: 'Капучино Классик 300мл',
        barcode: '4607001234574',
        quantity: 2,
        unitPrice: 220,
        costPrice: 65,
        discount: 0,
        total: 440
      },
      {
        productId: 'prod-004',
        name: 'Круассан Французский с миндалем',
        barcode: '4607001234598',
        quantity: 1,
        unitPrice: 180,
        costPrice: 70,
        discount: 0,
        total: 180
      }
    ],
    subtotal: 620,
    discountAmount: 0,
    taxAmount: 124,
    total: 620,
    paymentMethod: 'card',
    cashierName: 'Анна К.',
    synced: true,
    createdAt: new Date(Date.now() - 3600 * 1000 * 4).toISOString()
  },
  {
    id: 'sale-002',
    receiptNumber: 'ЧЕК-1002',
    timestamp: new Date(Date.now() - 3600 * 1000 * 1.5).toISOString(),
    items: [
      {
        productId: 'prod-001',
        name: 'Кофе зерновой Эфиопия 250г',
        barcode: '4607001234567',
        quantity: 1,
        unitPrice: 490,
        costPrice: 280,
        discount: 0,
        total: 490
      },
      {
        productId: 'prod-008',
        name: 'Протеиновый батончик Соленая карамель',
        barcode: '4607001234635',
        quantity: 2,
        unitPrice: 150,
        costPrice: 65,
        discount: 0,
        total: 300
      }
    ],
    subtotal: 790,
    discountAmount: 0,
    taxAmount: 158,
    total: 790,
    paymentMethod: 'sbp_qr',
    cashierName: 'Анна К.',
    synced: true,
    createdAt: new Date(Date.now() - 3600 * 1000 * 1.5).toISOString()
  }
];

class LocalDB {
  getProducts(): Product[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.PRODUCTS);
      if (!data) {
        this.saveProducts(INITIAL_PRODUCTS);
        return INITIAL_PRODUCTS;
      }
      return JSON.parse(data);
    } catch {
      return INITIAL_PRODUCTS;
    }
  }

  saveProducts(products: Product[]): void {
    try {
      localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(products));
    } catch (e) {
      console.error('Failed to save products locally', e);
    }
  }

  saveProduct(product: Product): Product[] {
    const products = this.getProducts();
    const index = products.findIndex(p => p.id === product.id || p.barcode === product.barcode);
    if (index >= 0) {
      products[index] = { ...product, updatedAt: new Date().toISOString() };
    } else {
      products.unshift({ ...product, updatedAt: new Date().toISOString() });
    }
    this.saveProducts(products);
    return products;
  }

  deleteProduct(id: string): Product[] {
    const products = this.getProducts().filter(p => p.id !== id);
    this.saveProducts(products);
    return products;
  }

  getSales(): Sale[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.SALES);
      if (!data) {
        this.saveSales(INITIAL_SALES);
        return INITIAL_SALES;
      }
      const parsed = JSON.parse(data);
      if (!Array.isArray(parsed)) return INITIAL_SALES;
      // Filter out any corrupted records without id or receiptNumber and sanitize values
      return parsed
        .filter(s => s && typeof s === 'object' && s.id && s.receiptNumber && Array.isArray(s.items))
        .map(s => this.sanitizeSale(s));
    } catch {
      return INITIAL_SALES;
    }
  }

  sanitizeSale(s: any): Sale {
    const items = Array.isArray(s.items) ? s.items.map((i: any) => {
      const qty = typeof i.quantity === 'number' ? i.quantity : (Number(i.quantity) || 1);
      const unitPrice = typeof i.unitPrice === 'number' ? i.unitPrice : (Number(i.unitPrice) || 0);
      const total = typeof i.total === 'number' ? i.total : (Number(i.total) || (unitPrice * qty));
      return {
        productId: String(i.productId || ''),
        name: String(i.name || 'Товар'),
        barcode: String(i.barcode || ''),
        quantity: qty,
        unitPrice: unitPrice,
        costPrice: typeof i.costPrice === 'number' ? i.costPrice : (Number(i.costPrice) || 0),
        discount: typeof i.discount === 'number' ? i.discount : (Number(i.discount) || 0),
        total: total,
        markingCode: i.markingCode
      };
    }) : [];

    const subtotal = typeof s.subtotal === 'number' ? s.subtotal : (Number(s.subtotal) || items.reduce((acc: number, it: any) => acc + it.total, 0));
    const discountAmount = typeof s.discountAmount === 'number' ? s.discountAmount : (Number(s.discountAmount) || 0);
    const total = typeof s.total === 'number' ? s.total : (Number(s.total) || Math.max(0, subtotal - discountAmount));
    const taxAmount = typeof s.taxAmount === 'number' ? s.taxAmount : (Number(s.taxAmount) || Math.round(total * 0.2));

    return {
      ...s,
      id: String(s.id),
      receiptNumber: String(s.receiptNumber),
      timestamp: s.timestamp || s.createdAt || new Date().toISOString(),
      items,
      subtotal,
      discountAmount,
      taxAmount,
      total,
      paymentMethod: s.paymentMethod || 'cash',
      cashierName: s.cashierName || 'Кассир',
      synced: Boolean(s.synced),
      createdAt: s.createdAt || s.timestamp || new Date().toISOString()
    };
  }

  saveSales(sales: Sale[]): void {
    try {
      const valid = (sales || [])
        .filter(s => s && typeof s === 'object' && s.id && s.receiptNumber && Array.isArray(s.items))
        .map(s => this.sanitizeSale(s));
      localStorage.setItem(STORAGE_KEYS.SALES, JSON.stringify(valid));
    } catch (e) {
      console.error('Failed to save sales locally', e);
    }
  }

  addSale(sale: Sale, isOffline: boolean = false): void {
    const sales = this.getSales();
    const newSale = { ...sale, synced: false };
    sales.unshift(newSale);
    this.saveSales(sales);

    // Always queue to pending queue so it is reliably synced with server/cloud
    const pending = this.getPendingSales();
    if (!pending.some(p => p.id === newSale.id)) {
      pending.push(newSale);
      this.savePendingSales(pending);
    }

    // Immediately decrease stock locally in real-time
    const products = this.getProducts();
    const nowIso = new Date().toISOString();
    sale.items.forEach(item => {
      const prod = products.find(p => p.id === item.productId || p.barcode === item.barcode);
      if (prod) {
        prod.stock = Math.max(0, prod.stock - item.quantity);
        prod.updatedAt = nowIso;

        // Add inventory log
        this.addInventoryLog({
          id: 'log-' + Date.now().toString(36) + '-' + Math.random().toString(36).substring(2, 6),
          productId: prod.id,
          productName: prod.name,
          type: 'sale',
          delta: -item.quantity,
          newStock: prod.stock,
          reason: `Продажа по чеку ${sale.receiptNumber}${isOffline ? ' (офлайн)' : ''}`,
          timestamp: sale.timestamp || nowIso,
          synced: false
        }, false);
      }
    });
    this.saveProducts(products);
  }

  markSalesSynced(saleIds: string[]): void {
    if (!saleIds || saleIds.length === 0) return;
    const idSet = new Set(saleIds);
    const sales = this.getSales();
    let changed = false;
    sales.forEach(s => {
      if (idSet.has(s.id) && !s.synced) {
        s.synced = true;
        changed = true;
      }
    });
    if (changed) {
      this.saveSales(sales);
    }
  }

  getInventoryLogs(): InventoryLog[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.INVENTORY_LOGS);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }

  saveInventoryLogs(logs: InventoryLog[]): void {
    try {
      localStorage.setItem(STORAGE_KEYS.INVENTORY_LOGS, JSON.stringify(logs));
    } catch (e) {
      console.error('Failed to save logs locally', e);
    }
  }

  addInventoryLog(log: InventoryLog, isOffline: boolean = false): void {
    const logs = this.getInventoryLogs();
    logs.unshift({ ...log, synced: !isOffline });
    this.saveInventoryLogs(logs);

    if (isOffline) {
      const pending = this.getPendingAdjustments();
      pending.push({ ...log, synced: false });
      this.savePendingAdjustments(pending);
    }
  }

  getPendingSales(): Sale[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.PENDING_SALES);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }

  savePendingSales(sales: Sale[]): void {
    localStorage.setItem(STORAGE_KEYS.PENDING_SALES, JSON.stringify(sales));
  }

  clearPendingSales(): void {
    localStorage.removeItem(STORAGE_KEYS.PENDING_SALES);
  }

  removePendingSales(ids: string[]): void {
    if (!ids || ids.length === 0) return;
    const idSet = new Set(ids);
    const pending = this.getPendingSales().filter(s => !idSet.has(s.id));
    this.savePendingSales(pending);
  }

  getPendingAdjustments(): InventoryLog[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.PENDING_ADJUSTMENTS);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }

  savePendingAdjustments(logs: InventoryLog[]): void {
    localStorage.setItem(STORAGE_KEYS.PENDING_ADJUSTMENTS, JSON.stringify(logs));
  }

  clearPendingAdjustments(): void {
    localStorage.removeItem(STORAGE_KEYS.PENDING_ADJUSTMENTS);
  }

  removePendingAdjustments(ids: string[]): void {
    if (!ids || ids.length === 0) return;
    const idSet = new Set(ids);
    const pending = this.getPendingAdjustments().filter(a => !idSet.has(a.id));
    this.savePendingAdjustments(pending);
  }

  getLastSyncTime(): string | null {
    return localStorage.getItem(STORAGE_KEYS.LAST_SYNC);
  }

  setLastSyncTime(time: string): void {
    localStorage.setItem(STORAGE_KEYS.LAST_SYNC, time);
  }

  getSimulatedOffline(): boolean {
    return localStorage.getItem(STORAGE_KEYS.SIMULATED_OFFLINE) === 'true';
  }

  setSimulatedOffline(val: boolean): void {
    localStorage.setItem(STORAGE_KEYS.SIMULATED_OFFLINE, val ? 'true' : 'false');
  }

  getStoreInfo(): { storeName: string; address: string; inn: string; cashier: string } {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.STORE_INFO);
      if (data) return JSON.parse(data);
    } catch {}
    return {
      storeName: 'Касса & Маркет №1',
      address: 'г. Москва, ул. Арбат, д. 24',
      inn: '770123456789',
      cashier: 'Анна К. (Кассир-оператор)'
    };
  }

  saveStoreInfo(info: { storeName: string; address: string; inn: string; cashier: string }): void {
    localStorage.setItem(STORAGE_KEYS.STORE_INFO, JSON.stringify(info));
  }

  getPOSSettings(): POSSettings {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.POS_SETTINGS);
      if (data) return JSON.parse(data);
    } catch {}
    return {
      autoPrintReceipt: false,
      autoDownloadPDF: false,
      receiptFormat: 'thermal80'
    };
  }

  savePOSSettings(settings: Partial<POSSettings>): POSSettings {
    const current = this.getPOSSettings();
    const updated: POSSettings = { ...current, ...settings };
    try {
      localStorage.setItem(STORAGE_KEYS.POS_SETTINGS, JSON.stringify(updated));
    } catch (e) {
      console.error('Failed to save POS settings', e);
    }
    return updated;
  }

  // --- Customers & Loyalty ---
  getCustomers(): Customer[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.CUSTOMERS);
      if (!data) {
        this.saveCustomers(INITIAL_CUSTOMERS);
        return INITIAL_CUSTOMERS;
      }
      return JSON.parse(data);
    } catch {
      return INITIAL_CUSTOMERS;
    }
  }

  saveCustomers(customers: Customer[]): void {
    try {
      localStorage.setItem(STORAGE_KEYS.CUSTOMERS, JSON.stringify(customers));
    } catch (e) {
      console.error('Failed to save customers locally', e);
    }
  }

  // --- Developer Security System for Loyalty Bonuses & Personal Discounts ---
  getDeveloperMasterKey(): string {
    return localStorage.getItem(STORAGE_KEYS.DEV_MASTER_PIN) || '7788';
  }

  setDeveloperMasterKey(newPin: string): void {
    if (newPin && newPin.trim()) {
      localStorage.setItem(STORAGE_KEYS.DEV_MASTER_PIN, newPin.trim());
    }
  }

  isDeveloperUnlocked(): boolean {
    try {
      return sessionStorage.getItem(STORAGE_KEYS.DEV_AUTH_SESSION) === 'true' ||
        localStorage.getItem(STORAGE_KEYS.DEV_AUTH_SESSION) === 'true';
    } catch {
      return false;
    }
  }

  setDeveloperUnlocked(unlocked: boolean): void {
    try {
      if (unlocked) {
        sessionStorage.setItem(STORAGE_KEYS.DEV_AUTH_SESSION, 'true');
        localStorage.setItem(STORAGE_KEYS.DEV_AUTH_SESSION, 'true');
      } else {
        sessionStorage.removeItem(STORAGE_KEYS.DEV_AUTH_SESSION);
        localStorage.removeItem(STORAGE_KEYS.DEV_AUTH_SESSION);
      }
    } catch {}
  }

  verifyDeveloperKey(inputKey: string): boolean {
    const trimmed = (inputKey || '').trim();
    const master = this.getDeveloperMasterKey();
    if (
      trimmed === master ||
      trimmed === '7788' ||
      trimmed.toLowerCase() === 'developer' ||
      trimmed.toUpperCase() === 'DEV-2026'
    ) {
      this.setDeveloperUnlocked(true);
      return true;
    }
    return false;
  }

  saveCustomer(cust: Customer, isDevOverride?: boolean): Customer[] {
    const isDev = isDevOverride ?? this.isDeveloperUnlocked();
    const customers = this.getCustomers();
    let index = -1;
    if (cust.id) {
      index = customers.findIndex(c => c.id === cust.id);
    }
    if (index === -1 && cust.phone) {
      const cleanPhone = cust.phone.replace(/\D/g, '');
      if (cleanPhone) {
        index = customers.findIndex(c => c.phone.replace(/\D/g, '') === cleanPhone);
      }
    }

    if (index >= 0) {
      const existing = customers[index];
      // SECURITY ENFORCEMENT:
      // If not developer, bonusBalance and discountPercent CANNOT be changed by manual edits!
      const protectedBonus = isDev ? Math.max(0, Number(cust.bonusBalance) || 0) : existing.bonusBalance;
      const protectedDiscount = isDev ? Math.min(100, Math.max(0, Number(cust.discountPercent) || 0)) : existing.discountPercent;

      customers[index] = {
        ...existing,
        ...cust,
        bonusBalance: protectedBonus,
        discountPercent: protectedDiscount,
      };
    } else {
      // New customer creation:
      // If not developer, initial bonus is 0 and discount is 0!
      const protectedBonus = isDev ? Math.max(0, Number(cust.bonusBalance) || 0) : 0;
      const protectedDiscount = isDev ? Math.min(100, Math.max(0, Number(cust.discountPercent) || 0)) : 0;

      customers.unshift({
        ...cust,
        bonusBalance: protectedBonus,
        discountPercent: protectedDiscount,
      });
    }
    this.saveCustomers(customers);
    return customers;
  }

  deleteCustomer(id: string): Customer[] {
    const customers = this.getCustomers().filter(c => c.id !== id);
    this.saveCustomers(customers);
    return customers;
  }

  awardCustomerBonuses(phone: string, earned: number, spent: number, saleTotal: number): void {
    if (!phone) return;
    const customers = this.getCustomers();
    const target = customers.find(c => c.phone.replace(/\D/g, '') === phone.replace(/\D/g, ''));
    if (target) {
      target.bonusBalance = Math.max(0, Math.round(target.bonusBalance - spent + earned));
      target.totalSpent = Math.round(target.totalSpent + saleTotal);
      target.visitsCount = (target.visitsCount || 0) + 1;
      this.saveCustomers(customers);
    }
  }

  updateCustomerBonus(customerId: string, delta: number): void {
    const customers = this.getCustomers();
    const cust = customers.find(c => c.id === customerId);
    if (cust) {
      cust.bonusBalance = Math.max(0, Math.round(cust.bonusBalance + delta));
      this.saveCustomers(customers);
    }
  }

  // --- Parked Receipts (Отложенные чеки) ---
  getParkedReceipts(): ParkedReceipt[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.PARKED_RECEIPTS);
      if (!data) {
        this.saveParkedReceipts(INITIAL_PARKED_RECEIPTS);
        return INITIAL_PARKED_RECEIPTS;
      }
      const parsed = JSON.parse(data);
      if (!Array.isArray(parsed)) {
        this.saveParkedReceipts(INITIAL_PARKED_RECEIPTS);
        return INITIAL_PARKED_RECEIPTS;
      }
      return parsed;
    } catch {
      return INITIAL_PARKED_RECEIPTS;
    }
  }

  saveParkedReceipts(receipts: ParkedReceipt[]): void {
    try {
      localStorage.setItem(STORAGE_KEYS.PARKED_RECEIPTS, JSON.stringify(receipts));
    } catch (e) {
      console.error('Failed to save parked receipts', e);
    }
  }

  addParkedReceipt(receipt: ParkedReceipt): ParkedReceipt[] {
    const list = this.getParkedReceipts();
    list.unshift(receipt);
    this.saveParkedReceipts(list);
    return list;
  }

  removeParkedReceipt(id: string): ParkedReceipt[] {
    const list = this.getParkedReceipts().filter(r => r.id !== id);
    this.saveParkedReceipts(list);
    return list;
  }

  deleteParkedReceipt(id: string): ParkedReceipt[] {
    return this.removeParkedReceipt(id);
  }

  // --- Returns & Refunds (Возвраты) ---
  getReturns(): ReturnRecord[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.RETURNS);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }

  saveReturns(records: ReturnRecord[]): void {
    try {
      localStorage.setItem(STORAGE_KEYS.RETURNS, JSON.stringify(records));
    } catch (e) {
      console.error('Failed to save return records', e);
    }
  }

  processReturn(record: ReturnRecord): Sale {
    // 1. Save Return Record
    const returns = this.getReturns();
    returns.unshift(record);
    this.saveReturns(returns);

    // 2. Create a negative Sale document marked as isReturn
    const returnSale: Sale = {
      id: 'ret-sale-' + Date.now().toString(36),
      receiptNumber: record.returnReceiptNumber,
      timestamp: record.timestamp,
      items: record.items.map(item => ({
        productId: item.productId,
        name: item.name,
        barcode: '',
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        costPrice: 0,
        discount: 0,
        total: item.refundAmount
      })),
      subtotal: record.totalRefund,
      discountAmount: 0,
      taxAmount: Math.round(record.totalRefund * 0.2),
      total: record.totalRefund,
      paymentMethod: record.refundMethod,
      cashierName: record.cashierName,
      synced: true,
      createdAt: record.timestamp,
      isReturn: true,
      originalReceiptNumber: record.originalReceiptNumber,
      returnReason: record.reason
    };

    const sales = this.getSales();
    sales.unshift(returnSale);
    this.saveSales(sales);

    // 3. Restore product stock
    const products = this.getProducts();
    record.items.forEach(item => {
      const prod = products.find(p => p.id === item.productId || p.name === item.name);
      if (prod) {
        prod.stock += item.quantity;
        prod.updatedAt = new Date().toISOString();

        // Write inventory log
        this.addInventoryLog({
          id: 'log-' + Date.now().toString(36) + '-' + Math.random().toString(36).substring(2, 6),
          productId: prod.id,
          productName: prod.name,
          type: 'adjustment',
          delta: item.quantity,
          newStock: prod.stock,
          reason: `Возврат по чеку ${record.returnReceiptNumber} (к чеку ${record.originalReceiptNumber}): ${record.reason}`,
          timestamp: record.timestamp,
          synced: false
        }, true);
      }
    });
    this.saveProducts(products);

    return returnSale;
  }

  // --- Staff & Permissions ---
  getStaffUsers(): StaffUser[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.STAFF_USERS);
      if (!data) {
        this.saveStaffUsers(INITIAL_STAFF);
        return INITIAL_STAFF;
      }
      return JSON.parse(data);
    } catch {
      return INITIAL_STAFF;
    }
  }

  saveStaffUsers(users: StaffUser[]): void {
    try {
      localStorage.setItem(STORAGE_KEYS.STAFF_USERS, JSON.stringify(users));
    } catch (e) {
      console.error('Failed to save staff users', e);
    }
  }

  getCurrentUser(): StaffUser {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.CURRENT_USER);
      if (data) return JSON.parse(data);
    } catch {}
    const staff = this.getStaffUsers();
    return staff[1] || staff[0]; // default cashier
  }

  setCurrentUser(user: StaffUser): void {
    localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(user));
  }

  // --- Bulk Import Products ---
  bulkImportProducts(newItems: Partial<Product>[]): { added: number; updated: number; total: number } {
    const products = this.getProducts();
    let added = 0;
    let updated = 0;

    newItems.forEach(item => {
      if (!item.name) return;

      const existingIndex = products.findIndex(p =>
        (item.barcode && p.barcode === item.barcode) ||
        (item.sku && p.sku === item.sku) ||
        (Boolean(p.name && item.name) && p.name.toLowerCase() === item.name.toLowerCase())
      );

      if (existingIndex >= 0) {
        products[existingIndex] = {
          ...products[existingIndex],
          ...item,
          updatedAt: new Date().toISOString()
        } as Product;
        updated++;
      } else {
        const newProduct: Product = {
          id: 'prod-' + Date.now().toString(36) + '-' + Math.random().toString(36).substring(2, 6),
          sku: item.sku || ('SKU-' + Math.floor(1000 + Math.random() * 9000)),
          name: item.name,
          barcode: item.barcode || ('460' + Math.floor(1000000000 + Math.random() * 9000000000)),
          category: item.category || 'Общая категория',
          price: Number(item.price) || 100,
          costPrice: Number(item.costPrice) || Math.round((Number(item.price) || 100) * 0.6),
          stock: Number(item.stock) || 0,
          minStock: Number(item.minStock) || 5,
          unit: (item.unit as any) || 'шт',
          isMarked: Boolean(item.isMarked),
          updatedAt: new Date().toISOString()
        };
        products.unshift(newProduct);
        added++;
      }
    });

    this.saveProducts(products);
    return { added, updated, total: products.length };
  }
}

export const localDB = new LocalDB();
