import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';

const app = express();
const PORT = 3000;

app.use(express.json());

// Type definitions for server data
interface Product {
  id: string;
  sku: string;
  name: string;
  barcode: string;
  category: string;
  price: number;
  costPrice: number;
  stock: number;
  minStock: number;
  unit: 'шт' | 'кг' | 'л' | 'уп';
  updatedAt: string;
}

interface SaleItem {
  productId: string;
  name: string;
  barcode: string;
  quantity: number;
  unitPrice: number;
  costPrice: number;
  discount: number;
  total: number;
}

interface Sale {
  id: string;
  receiptNumber: string;
  timestamp: string;
  items: SaleItem[];
  subtotal: number;
  discountAmount: number;
  taxAmount: number;
  total: number;
  paymentMethod: 'cash' | 'card' | 'sbp_qr' | 'split';
  cashReceived?: number;
  change?: number;
  cashierName: string;
  synced: boolean;
  createdAt: string;
}

interface InventoryLog {
  id: string;
  productId: string;
  productName: string;
  type: 'sale' | 'restock' | 'adjustment' | 'write_off' | 'audit';
  delta: number;
  newStock: number;
  reason: string;
  timestamp: string;
  synced: boolean;
}

// Initial Seed Products
let products: Product[] = [
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

// Initial Seed Sales
let sales: Sale[] = [
  {
    id: 'sale-001',
    receiptNumber: 'ЧЕК-1001',
    timestamp: new Date(Date.now() - 3600 * 1000 * 5).toISOString(),
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
    taxAmount: 620 * 0.2,
    total: 620,
    paymentMethod: 'card',
    cashierName: 'Анна К.',
    synced: true,
    createdAt: new Date(Date.now() - 3600 * 1000 * 5).toISOString()
  },
  {
    id: 'sale-002',
    receiptNumber: 'ЧЕК-1002',
    timestamp: new Date(Date.now() - 3600 * 1000 * 2).toISOString(),
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
    taxAmount: 790 * 0.2,
    total: 790,
    paymentMethod: 'sbp_qr',
    cashierName: 'Анна К.',
    synced: true,
    createdAt: new Date(Date.now() - 3600 * 1000 * 2).toISOString()
  }
];

let inventoryLogs: InventoryLog[] = [
  {
    id: 'log-001',
    productId: 'prod-001',
    productName: 'Кофе зерновой Эфиопия 250г',
    type: 'restock',
    delta: 25,
    newStock: 25,
    reason: 'Поступление от поставщика ООО "КофеИмпорт"',
    timestamp: new Date(Date.now() - 3600 * 1000 * 24).toISOString(),
    synced: true
  },
  {
    id: 'log-002',
    productId: 'prod-001',
    productName: 'Кофе зерновой Эфиопия 250г',
    type: 'sale',
    delta: -1,
    newStock: 24,
    reason: 'Продажа по чеку ЧЕК-1002',
    timestamp: new Date(Date.now() - 3600 * 1000 * 2).toISOString(),
    synced: true
  }
];

// Health Check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', serverTime: new Date().toISOString() });
});

// Products API
app.get('/api/products', (req, res) => {
  res.json(products);
});

app.post('/api/products', (req, res) => {
  const productData: Partial<Product> = req.body;
  if (!productData.name || !productData.barcode) {
    return res.status(400).json({ error: 'Наименование и штрихкод обязательны' });
  }

  const existingIndex = products.findIndex(p => p.id === productData.id || p.barcode === productData.barcode);
  if (existingIndex >= 0) {
    products[existingIndex] = {
      ...products[existingIndex],
      ...productData,
      updatedAt: new Date().toISOString()
    } as Product;
    return res.json(products[existingIndex]);
  } else {
    const newProduct: Product = {
      id: productData.id || 'prod-' + Date.now().toString(36),
      sku: productData.sku || 'SKU-' + Math.floor(1000 + Math.random() * 9000),
      name: productData.name,
      barcode: productData.barcode,
      category: productData.category || 'Общая',
      price: Number(productData.price) || 0,
      costPrice: Number(productData.costPrice) || 0,
      stock: Number(productData.stock) || 0,
      minStock: Number(productData.minStock) || 5,
      unit: productData.unit || 'шт',
      updatedAt: new Date().toISOString()
    };
    products.unshift(newProduct);
    return res.status(201).json(newProduct);
  }
});

app.delete('/api/products/:id', (req, res) => {
  const { id } = req.params;
  const initialLength = products.length;
  products = products.filter(p => p.id !== id);
  if (products.length === initialLength) {
    return res.status(404).json({ error: 'Товар не найден' });
  }
  res.json({ success: true });
});

function sanitizeSaleServer(s: any): Sale {
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
    synced: true,
    createdAt: s.createdAt || s.timestamp || new Date().toISOString()
  };
}

// Sales API
app.get('/api/sales', (req, res) => {
  res.json(
    sales
      .filter(s => s && s.id && s.receiptNumber && Array.isArray(s.items))
      .map(sanitizeSaleServer)
  );
});

app.post('/api/sales', (req, res) => {
  const saleData: Sale = req.body;
  if (!saleData.items || !saleData.items.length) {
    return res.status(400).json({ error: 'Чек пуст' });
  }

  const newSale = sanitizeSaleServer({
    ...saleData,
    id: saleData.id || 'sale-' + Date.now().toString(36),
    receiptNumber: saleData.receiptNumber || 'ЧЕК-' + (sales.length + 1001),
    timestamp: saleData.timestamp || new Date().toISOString(),
    createdAt: new Date().toISOString(),
    synced: true
  });

  // Reduce product stock and create logs
  newSale.items.forEach(item => {
    const product = products.find(p => p.id === item.productId || p.barcode === item.barcode);
    if (product) {
      product.stock = Math.max(0, product.stock - item.quantity);
      product.updatedAt = new Date().toISOString();

      inventoryLogs.unshift({
        id: 'log-' + Date.now().toString(36) + '-' + Math.random().toString(36).substring(2, 6),
        productId: product.id,
        productName: product.name,
        type: 'sale',
        delta: -item.quantity,
        newStock: product.stock,
        reason: `Продажа по чеку ${newSale.receiptNumber}`,
        timestamp: newSale.timestamp,
        synced: true
      });
    }
  });

  sales.unshift(newSale);
  res.status(201).json(newSale);
});

// Inventory Logs & Adjustments
app.get('/api/inventory/logs', (req, res) => {
  res.json(inventoryLogs);
});

app.post('/api/inventory/adjust', (req, res) => {
  const { productId, type, delta, newStock, reason } = req.body;
  const product = products.find(p => p.id === productId);

  if (!product) {
    return res.status(404).json({ error: 'Товар не найден' });
  }

  let finalStock = product.stock;
  let finalDelta = delta;

  if (typeof newStock === 'number') {
    finalDelta = newStock - product.stock;
    finalStock = newStock;
  } else if (typeof delta === 'number') {
    finalStock = Math.max(0, product.stock + delta);
    finalDelta = delta;
  }

  product.stock = finalStock;
  product.updatedAt = new Date().toISOString();

  const log: InventoryLog = {
    id: 'log-' + Date.now().toString(36),
    productId: product.id,
    productName: product.name,
    type: type || 'adjustment',
    delta: finalDelta,
    newStock: finalStock,
    reason: reason || 'Ручная корректировка остатка',
    timestamp: new Date().toISOString(),
    synced: true
  };

  inventoryLogs.unshift(log);
  res.json({ product, log });
});

// Cloud Sync Endpoint: Handles offline queued sales, live sales sync, and adjustments
app.post('/api/sync', (req, res) => {
  const { pendingSales = [], pendingAdjustments = [], clientProducts = [], clientSales = [] } = req.body;

  let appliedSalesCount = 0;
  let appliedAdjustmentsCount = 0;

  // 1. Process new pending sales FIRST (deduct server stock and record sales)
  for (const sale of pendingSales as Sale[]) {
    if (sale && sale.id && sale.receiptNumber && Array.isArray(sale.items) && !sales.some(s => s.id === sale.id)) {
      const syncedSale = sanitizeSaleServer({ ...sale, synced: true });
      sales.unshift(syncedSale);
      appliedSalesCount++;

      // Deduct stock on server
      sale.items.forEach(item => {
        const prod = products.find(p => p.id === item.productId || p.barcode === item.barcode);
        if (prod) {
          prod.stock = Math.max(0, prod.stock - item.quantity);
          prod.updatedAt = new Date().toISOString();

          inventoryLogs.unshift({
            id: 'log-' + Date.now().toString(36) + '-' + Math.random().toString(36).substring(2, 6),
            productId: prod.id,
            productName: prod.name,
            type: 'sale',
            delta: -item.quantity,
            newStock: prod.stock,
            reason: `Продажа по чеку ${sale.receiptNumber}`,
            timestamp: sale.timestamp || new Date().toISOString(),
            synced: true
          });
        }
      });
    }
  }

  // 2. Process inventory adjustments
  for (const adj of pendingAdjustments as InventoryLog[]) {
    if (adj && adj.id && !inventoryLogs.some(l => l.id === adj.id)) {
      inventoryLogs.unshift({ ...adj, synced: true });
      const prod = products.find(p => p.id === adj.productId);
      if (prod) {
        prod.stock = adj.newStock;
        prod.updatedAt = new Date().toISOString();
      }
      appliedAdjustmentsCount++;
    }
  }

  // 3. Recover previously synced sales from client if server was restarted
  for (const cs of clientSales as Sale[]) {
    if (cs && cs.id && cs.receiptNumber && Array.isArray(cs.items) && !sales.some(s => s.id === cs.id)) {
      sales.unshift(sanitizeSaleServer({ ...cs, synced: true }));
    }
  }

  // 4. Sync client products catalog updates & additions
  for (const clientProd of clientProducts as Product[]) {
    const existing = products.find(p => p.id === clientProd.id || p.barcode === clientProd.barcode);
    if (!existing) {
      products.unshift({ ...clientProd, updatedAt: new Date().toISOString() });
    } else {
      // Sync metadata changes made by user
      existing.name = clientProd.name;
      existing.category = clientProd.category;
      existing.price = clientProd.price;
      existing.costPrice = clientProd.costPrice;
      existing.minStock = clientProd.minStock;
      existing.unit = clientProd.unit;
      // If client has a valid stock value, synchronize stock to match client's confirmed state
      if (typeof clientProd.stock === 'number') {
        existing.stock = clientProd.stock;
        existing.updatedAt = clientProd.updatedAt || new Date().toISOString();
      }
    }
  }

  res.json({
    success: true,
    appliedSalesCount,
    appliedAdjustmentsCount,
    serverTime: new Date().toISOString(),
    products,
    sales: sales.filter(s => s && s.id && s.receiptNumber && Array.isArray(s.items)).map(sanitizeSaleServer),
    inventoryLogs
  });
});

async function startServer() {
  // Vite middleware for development
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
    console.log(`POS Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
