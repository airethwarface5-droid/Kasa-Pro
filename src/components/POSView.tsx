import React, { useState, useRef, useEffect } from 'react';
import {
  Search,
  Scan,
  ShoppingCart,
  Trash2,
  Plus,
  Minus,
  Percent,
  CreditCard,
  Package,
  AlertTriangle,
  Flame,
  Clock,
  Sparkles,
  Check,
  Volume2,
  VolumeX,
  UserCheck,
  RotateCcw,
  BookmarkPlus,
  Bookmark,
  ShieldCheck,
  Tag
} from 'lucide-react';
import {
  Product,
  CartItem,
  Sale,
  PaymentMethod,
  Customer,
  ParkedReceipt,
  StaffUser,
  ReturnRecord,
  SplitPaymentDetails
} from '../types';
import { sounds } from '../utils/audio';
import { localDB } from '../services/localDB';
import { BarcodeScannerModal } from './BarcodeScannerModal';
import { CheckoutModal } from './CheckoutModal';
import { ReceiptModal } from './ReceiptModal';
import { BarcodeBadge } from './BarcodeBadge';
import { CustomerLoyaltyModal } from './CustomerLoyaltyModal';
import { ParkedReceiptsModal } from './ParkedReceiptsModal';
import { RefundModal } from './RefundModal';
import { StaffSwitchModal } from './StaffSwitchModal';
import { MarkingCodeModal } from './MarkingCodeModal';

interface POSViewProps {
  products: Product[];
  onSaleCompleted: (sale: Sale) => void;
  isOnline: boolean;
}

export const POSView: React.FC<POSViewProps> = ({ products = [], onSaleCompleted, isOnline }) => {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('Все');
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [completedSale, setCompletedSale] = useState<Sale | null>(null);
  const [autoPrintOnOpen, setAutoPrintOnOpen] = useState(false);
  const [globalDiscount, setGlobalDiscount] = useState<number>(0);
  const [barcodeInput, setBarcodeInput] = useState('');
  const [recentScannedAlert, setRecentScannedAlert] = useState<string | null>(null);
  const [isSoundMuted, setIsSoundMuted] = useState(() => sounds.getMuted());
  const [filterLowStockOnly, setFilterLowStockOnly] = useState(false);

  // New enterprise feature states
  const [activeCustomer, setActiveCustomer] = useState<Customer | null>(null);
  const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);
  const [isParkedModalOpen, setIsParkedModalOpen] = useState(false);
  const [parkModalMode, setParkModalMode] = useState(false);
  const [parkedCount, setParkedCount] = useState(() => (localDB.getParkedReceipts() || []).length);
  const [isRefundModalOpen, setIsRefundModalOpen] = useState(false);
  const [isStaffModalOpen, setIsStaffModalOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState<StaffUser>(() => localDB.getCurrentUser());
  const [isMarkingModalOpen, setIsMarkingModalOpen] = useState(false);
  const [markingTargetItem, setMarkingTargetItem] = useState<{ productId: string; productName: string } | null>(null);

  const barcodeInputRef = useRef<HTMLInputElement>(null);

  // Extract unique categories
  const categories = ['Все', ...Array.from(new Set(products.map(p => p.category)))];

  // Count items with stock below 5
  const lowStockUnder5Count = products.filter(p => p.stock < 5).length;

  // Filtered products
  const filteredProducts = products.filter(p => {
    if (!p) return false;
    const matchesCategory = selectedCategory === 'Все' || p.category === selectedCategory;
    const q = (searchQuery || '').trim().toLowerCase();
    const matchesSearch = !q
      ? true
      : (p.name ? p.name.toLowerCase().includes(q) : false) ||
        (p.barcode ? p.barcode.includes(q) : false) ||
        (p.sku ? p.sku.toLowerCase().includes(q) : false);
    const matchesLowStock = !filterLowStockOnly || (typeof p.stock === 'number' && p.stock < 5);
    return matchesCategory && matchesSearch && matchesLowStock;
  });

  // Calculate totals
  const subtotal = cart.reduce((acc, item) => acc + item.product.price * item.quantity, 0);
  const itemDiscounts = cart.reduce((acc, item) => {
    const lineGross = item.product.price * item.quantity;
    return acc + (lineGross * (item.discountPercent / 100));
  }, 0);
  const orderDiscount = (subtotal - itemDiscounts) * (globalDiscount / 100);
  const totalDiscount = itemDiscounts + orderDiscount;
  const finalTotal = Math.max(0, Math.round(subtotal - totalDiscount));

  // Add product to cart
  const addToCart = (product: Product, qty: number = 1, skipSound: boolean = false) => {
    if (product.stock <= 0) {
      sounds.playErrorBeep();
      setRecentScannedAlert(`Ошибка: Товар «${product.name}» закончился на складе!`);
      setTimeout(() => setRecentScannedAlert(null), 3000);
      return;
    }

    if (!skipSound) {
      sounds.playScanBeep();
    }

    setCart(prev => {
      const existing = prev.find(item => item.product.id === product.id);
      if (existing) {
        const newQty = Math.min(product.stock, existing.quantity + qty);
        return prev.map(item =>
          item.product.id === product.id ? { ...item, quantity: newQty } : item
        );
      } else {
        return [...prev, { product, quantity: qty, discountPercent: 0 }];
      }
    });

    // If item is subject to national marking regulation (Честный ЗНАК), prompt DataMatrix scanner
    if (product.isMarked) {
      setMarkingTargetItem({ productId: product.id, productName: product.name });
      setIsMarkingModalOpen(true);
    }

    setRecentScannedAlert(`Добавлено: ${product.name}`);
    setTimeout(() => setRecentScannedAlert(null), 2000);
  };

  // Modify item quantity
  const updateQuantity = (productId: string, delta: number) => {
    setCart(prev =>
      prev
        .map(item => {
          if (item.product.id === productId) {
            const nextQty = item.quantity + delta;
            if (nextQty <= 0) return null;
            if (nextQty > item.product.stock) return item; // stock limit
            return { ...item, quantity: nextQty };
          }
          return item;
        })
        .filter(Boolean) as CartItem[]
    );
  };

  const removeItem = (productId: string) => {
    setCart(prev => prev.filter(item => item.product.id !== productId));
  };

  const clearCart = () => {
    setCart([]);
    setGlobalDiscount(activeCustomer?.discountPercent || 0);
  };

  // Park current receipt
  const handleParkReceipt = () => {
    if (cart.length === 0) return;
    setParkModalMode(true);
    setIsParkedModalOpen(true);
  };

  // Resume parked receipt
  const handleResumeParked = (receipt: ParkedReceipt) => {
    const receiptItems = receipt.cart || receipt.items || [];
    setCart(receiptItems);
    if (receipt.customer) {
      setActiveCustomer(receipt.customer);
    } else {
      setActiveCustomer(null);
    }
    setGlobalDiscount(receipt.globalDiscount || 0);
    localDB.deleteParkedReceipt(receipt.id);
    setParkedCount(localDB.getParkedReceipts().length);
    sounds.playSuccessChime();
    setRecentScannedAlert(`Чек "${receipt.name || receipt.note || 'Отложенный чек'}" восстановлен в кассу!`);
    setTimeout(() => setRecentScannedAlert(null), 3000);
  };

  // Customer Loyalty selection
  const handleSelectCustomer = (customer: Customer | null) => {
    setActiveCustomer(customer);
    if (customer && customer.discountPercent > 0) {
      setGlobalDiscount(customer.discountPercent);
    }
    sounds.playSuccessChime();
  };

  // Marking Code modal save
  const handleSaveMarkingCode = (code: string) => {
    if (!markingTargetItem) return;
    setCart(prev =>
      prev.map(item =>
        item.product.id === markingTargetItem.productId
          ? { ...item, markingCode: code }
          : item
      )
    );
    setIsMarkingModalOpen(false);
    setMarkingTargetItem(null);
    sounds.playSuccessChime();
    setRecentScannedAlert('✓ Код маркировки DataMatrix прикреплен к позиции');
    setTimeout(() => setRecentScannedAlert(null), 2500);
  };

  // Refund / Returns completed
  const handleRefundCompleted = (record: ReturnRecord) => {
    sounds.playSuccessChime();
    setRecentScannedAlert(`✓ Оформлен возврат по чеку ${record.originalReceiptNumber} на сумму ${record.totalRefundAmount.toLocaleString('ru-RU')} ₽`);
    setTimeout(() => setRecentScannedAlert(null), 4000);
  };

  // Staff User switched
  const handleStaffUserChanged = (user: StaffUser) => {
    setCurrentUser(user);
    sounds.playSuccessChime();
    setRecentScannedAlert(`Кассир изменен: ${user.name} (${user.role})`);
    setTimeout(() => setRecentScannedAlert(null), 3000);
  };

  // Handle hardware or manual barcode submission
  const handleBarcodeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!barcodeInput.trim()) return;

    handleBarcodeScanned(barcodeInput.trim(), false);
    setBarcodeInput('');
  };

  const handleBarcodeScanned = (barcode: string, alreadyBeeped: boolean = false) => {
    const matchedProduct = products.find(p => p.barcode === barcode);
    if (!matchedProduct) {
      sounds.playErrorBeep();
      setRecentScannedAlert(`Штрихкод «${barcode}» не найден в каталоге!`);
      setTimeout(() => setRecentScannedAlert(null), 3000);
      return;
    }

    if (matchedProduct.stock <= 0) {
      sounds.playErrorBeep();
      setRecentScannedAlert(`Ошибка: Товар «${matchedProduct.name}» закончился на складе!`);
      setTimeout(() => setRecentScannedAlert(null), 3000);
      return;
    }

    // Play crisp authentic scanner beep upon successful barcode scan
    if (!alreadyBeeped) {
      sounds.playScanBeep();
    }

    // Add to cart
    addToCart(matchedProduct, 1, true);
    setRecentScannedAlert(`✓ Сканер: "${matchedProduct.name}" добавлен в чек (${matchedProduct.price} ₽)`);
    setTimeout(() => setRecentScannedAlert(null), 2500);
  };

  // Hardware barcode scanner listener (captures rapid keyboard wedge strokes)
  useEffect(() => {
    let buffer = '';
    let lastKeyTime = Date.now();

    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const isInput = target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA');

      // If user is inside the barcode input, the form submit handles it
      if (target === barcodeInputRef.current) return;

      // If user is typing in another input (e.g. search box or modal), ignore hardware scanner wedge
      if (isInput) return;

      const now = Date.now();
      if (now - lastKeyTime > 120) {
        buffer = '';
      }
      lastKeyTime = now;

      if (e.key === 'Enter') {
        if (buffer.trim().length >= 3) {
          e.preventDefault();
          handleBarcodeScanned(buffer.trim(), false);
          buffer = '';
        }
      } else if (e.key.length === 1) {
        buffer += e.key;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [products]);

  const handleToggleSound = () => {
    const nextMuted = sounds.toggleMute();
    setIsSoundMuted(nextMuted);
    setRecentScannedAlert(
      nextMuted
        ? 'Звуковой сигнал сканера отключен'
        : 'Звуковой сигнал сканера включен (тестовый сигнал воспроизведен)'
    );
    setTimeout(() => setRecentScannedAlert(null), 2500);
  };

  // Sale finalized
  const handleCompleteSale = (
    paymentMethod: PaymentMethod,
    cashReceived?: number,
    change?: number,
    autoPrint?: boolean,
    splitDetails?: SplitPaymentDetails,
    bonusesUsed?: number,
    bonusesEarned?: number
  ) => {
    const saleId = 'sale-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 6);
    const receiptNum = 'ЧЕК-' + Math.floor(1000 + Math.random() * 9000);

    const saleItems = cart.map(item => {
      const lineGross = item.product.price * item.quantity;
      const lineDiscount = lineGross * (item.discountPercent / 100);
      const lineTotal = Math.round(lineGross - lineDiscount);

      return {
        productId: item.product.id,
        name: item.product.name,
        barcode: item.product.barcode,
        quantity: item.quantity,
        unitPrice: item.product.price,
        costPrice: item.product.costPrice,
        discount: item.discountPercent,
        total: lineTotal,
        markingCode: item.markingCode
      };
    });

    // Update customer loyalty bonus balance in persistent storage
    if (activeCustomer) {
      if (bonusesUsed && bonusesUsed > 0) {
        localDB.updateCustomerBonus(activeCustomer.id, -bonusesUsed);
      }
      if (bonusesEarned && bonusesEarned > 0) {
        localDB.updateCustomerBonus(activeCustomer.id, bonusesEarned);
      }
    }

    const newSale: Sale = {
      id: saleId,
      receiptNumber: receiptNum,
      timestamp: new Date().toISOString(),
      items: saleItems,
      subtotal,
      discountAmount: totalDiscount,
      taxAmount: finalTotal * 0.2, // 20% VAT
      total: finalTotal,
      paymentMethod,
      cashReceived,
      change,
      splitDetails,
      bonusesUsed,
      bonusesEarned,
      customerId: activeCustomer?.id,
      customerName: activeCustomer?.name,
      cashierName: currentUser.name || 'Анна К.',
      synced: isOnline,
      createdAt: new Date().toISOString()
    };

    onSaleCompleted(newSale);
    setCompletedSale(newSale);
    setAutoPrintOnOpen(!!autoPrint);
    clearCart();
    setActiveCustomer(null);
  };

  return (
    <div id="pos-terminal-container" className="flex-1 flex flex-col lg:flex-row h-full gap-4 sm:gap-6 overflow-hidden">
      {/* Left Bento Section: Catalog & Barcode Scanner */}
      <div className="flex-1 bg-white rounded-3xl border border-slate-200/90 shadow-sm flex flex-col overflow-hidden">
        {/* Top Action Bar */}
        <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-col sm:flex-row gap-3 bg-white">
          {/* Hardware Barcode input & Camera scan trigger */}
          <form onSubmit={handleBarcodeSubmit} className="flex-1 flex gap-2">
            <div className="relative flex-1">
              <input
                ref={barcodeInputRef}
                id="pos-barcode-fast-input"
                type="text"
                value={barcodeInput}
                onChange={(e) => setBarcodeInput(e.target.value)}
                placeholder="Штрихкод (сканер или ручной ввод)..."
                className="w-full pl-9 pr-4 py-2.5 bg-slate-100 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-800 placeholder-slate-400 font-mono focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
              />
              <Scan className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
            </div>
            <button
              id="open-camera-scanner-btn"
              type="button"
              onClick={() => setIsScannerOpen(true)}
              className="px-3.5 py-2.5 bg-blue-50 hover:bg-blue-100 text-blue-600 border border-blue-200 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all shrink-0 shadow-xs"
              title="Открыть камеру для сканирования"
            >
              <Scan className="w-4 h-4" />
              <span className="hidden sm:inline">Камера-сканер</span>
            </button>

            {/* Scanner Sound Indicator & Test Button */}
            <button
              id="toggle-scanner-sound-btn"
              type="button"
              onClick={handleToggleSound}
              className={`p-2.5 rounded-xl border text-xs font-semibold flex items-center justify-center transition-all shrink-0 shadow-xs ${
                isSoundMuted
                  ? 'bg-slate-100 border-slate-200 text-slate-400 hover:text-slate-600 hover:bg-slate-200'
                  : 'bg-emerald-50 border-emerald-200 text-emerald-600 hover:bg-emerald-100'
              }`}
              title={
                isSoundMuted
                  ? 'Звук сканера отключен (нажмите, чтобы включить)'
                  : 'Звуковой сигнал сканера включен (нажмите для проверки сигнала или отключения)'
              }
            >
              {isSoundMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            </button>
          </form>

          {/* Product Name / SKU Filter */}
          <div className="relative sm:w-64">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
            <input
              id="pos-product-search"
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Поиск по названию/артикулу..."
              className="w-full pl-9 pr-4 py-2.5 bg-slate-100 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
            />
          </div>
        </div>

        {/* Categories Bar & Low Stock Quick Filter */}
        <div className="px-4 py-2.5 bg-slate-50/70 border-b border-slate-100 flex items-center justify-between gap-2 overflow-x-auto no-scrollbar">
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
            {categories.map((cat) => (
              <button
                key={cat}
                id={`cat-filter-${cat}`}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                  selectedCategory === cat
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-white border border-slate-200/80 text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Quick Filter: Products needing purchase (< 5 units) */}
          <button
            id="toggle-low-stock-filter-btn"
            type="button"
            onClick={() => setFilterLowStockOnly(prev => !prev)}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 shrink-0 border shadow-xs ${
              filterLowStockOnly
                ? 'bg-amber-500 border-amber-600 text-white ring-2 ring-amber-400/30'
                : lowStockUnder5Count > 0
                ? 'bg-amber-50 border-amber-300 text-amber-900 hover:bg-amber-100'
                : 'bg-slate-100 border-slate-200 text-slate-500 hover:bg-slate-200'
            }`}
            title="Показать товары с остатком менее 5 единиц (требуется закупка)"
          >
            <AlertTriangle className={`w-3.5 h-3.5 ${filterLowStockOnly ? 'text-white' : 'text-amber-600'}`} />
            <span>Закупка (&lt;5 шт): {lowStockUnder5Count}</span>
          </button>
        </div>

        {/* Low Stock Active Filter Banner */}
        {filterLowStockOnly && (
          <div className="mx-4 mt-3 py-2 px-3.5 rounded-xl bg-amber-50 border border-amber-300 text-amber-900 text-xs flex items-center justify-between gap-2 shadow-2xs">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
              <span>
                <strong>Режим закупки:</strong> показаны только позиции с остатком ниже 5 единиц ({filteredProducts.length} шт.)
              </span>
            </div>
            <button
              id="reset-low-stock-filter-btn"
              type="button"
              onClick={() => setFilterLowStockOnly(false)}
              className="text-amber-900 hover:text-amber-950 font-bold underline text-xs transition-colors shrink-0"
            >
              Сбросить фильтр
            </button>
          </div>
        )}

        {/* Scan alert banner */}
        {recentScannedAlert && (
          <div className="mx-4 mt-3 py-2 px-3.5 rounded-xl bg-blue-50 border border-blue-200 text-blue-700 text-xs flex items-center gap-2 animate-fade-in">
            <Check className="w-4 h-4 text-blue-600 shrink-0" />
            <span>{recentScannedAlert}</span>
          </div>
        )}

        {/* Product Catalog Grid */}
        <div className="flex-1 p-4 sm:p-5 overflow-y-auto">
          {filteredProducts.length === 0 ? (
            <div className="h-64 flex flex-col items-center justify-center text-center text-slate-400 space-y-2">
              <Package className="w-10 h-10 stroke-1" />
              <p className="text-sm font-semibold text-slate-600">
                {filterLowStockOnly ? 'Товаров с остатком менее 5 единиц не найдено' : 'Товары не найдены'}
              </p>
              <p className="text-xs text-slate-400">
                {filterLowStockOnly
                  ? 'Все товары на складе имеют достаточный запас'
                  : 'Попробуйте изменить поисковый запрос или категорию'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
              {filteredProducts.map((prod) => {
                const isOutOfStock = prod.stock <= 0;
                const isUnder5 = prod.stock > 0 && prod.stock < 5;
                const isLowStock = prod.stock > 0 && prod.stock <= prod.minStock;

                return (
                  <button
                    key={prod.id}
                    id={`pos-card-${prod.id}`}
                    disabled={isOutOfStock}
                    onClick={() => addToCart(prod, 1)}
                    className={`group relative flex flex-col justify-between p-3.5 rounded-2xl border text-left transition-all ${
                      isOutOfStock
                        ? 'bg-rose-50/20 border-rose-200/80 opacity-60 cursor-not-allowed'
                        : isUnder5
                        ? 'bg-amber-50/50 hover:bg-amber-50/90 border-amber-300 hover:border-amber-400 ring-1 ring-amber-300/60 shadow-xs hover:shadow-md hover:shadow-amber-500/10 active:scale-[0.98]'
                        : 'bg-slate-50/80 hover:bg-white border-slate-200/80 hover:border-blue-400 hover:shadow-md shadow-xs active:scale-[0.98]'
                    }`}
                  >
                    {/* Top Info */}
                    <div className="space-y-1.5 w-full">
                      <div className="flex items-center justify-between text-[10px]">
                        <span className="font-mono text-slate-400">{prod.sku}</span>
                        {isOutOfStock ? (
                          <span className="font-bold text-[10px] text-rose-700 bg-rose-100 border border-rose-200 px-1.5 py-0.5 rounded-md">
                            Закончился
                          </span>
                        ) : isUnder5 ? (
                          <span
                            className="inline-flex items-center gap-1 font-bold text-[10px] text-amber-900 bg-amber-200/80 border border-amber-300 px-1.5 py-0.5 rounded-md shadow-2xs"
                            title="Текущий остаток ниже 5 единиц. Требуется закупка."
                          >
                            <AlertTriangle className="w-3 h-3 text-amber-700 shrink-0" />
                            <span>Закупка (&lt;5)</span>
                          </span>
                        ) : (
                          <span className="truncate max-w-[90px] text-slate-400">{prod.category}</span>
                        )}
                      </div>
                      <h4 className="text-xs sm:text-sm font-bold text-slate-800 group-hover:text-blue-600 transition-colors line-clamp-2 leading-snug">
                        {prod.name}
                      </h4>
                    </div>

                    {/* Bottom Price & Stock Badge */}
                    <div className="pt-2.5 mt-2 border-t border-slate-200/80 w-full space-y-1">
                      <div className="flex items-end justify-between w-full">
                        <div>
                          <span className="text-sm sm:text-base font-extrabold text-slate-900">
                            {prod.price.toLocaleString('ru-RU')} ₽
                          </span>
                        </div>

                        {/* Stock Badge */}
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-lg border flex items-center gap-1 ${
                            isOutOfStock
                              ? 'bg-rose-50 border-rose-200 text-rose-600'
                              : isUnder5
                              ? 'bg-amber-100 border-amber-300 text-amber-900 font-extrabold shadow-2xs'
                              : isLowStock
                              ? 'bg-amber-50 border-amber-200 text-amber-700'
                              : 'bg-white border-slate-200 text-slate-600'
                          }`}
                        >
                          {isUnder5 && <AlertTriangle className="w-3 h-3 text-amber-600 shrink-0" />}
                          {isOutOfStock ? 'Нет' : `${prod.stock} ${prod.unit}`}
                        </span>
                      </div>

                      {/* Explicit Warning Caption for Cashier */}
                      {isUnder5 && (
                        <div className="flex items-center gap-1 text-[10px] font-semibold text-amber-800 leading-tight">
                          <span className="truncate">
                            Остаток: {prod.stock} {prod.unit} • нужна закупка
                          </span>
                        </div>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Right Bento Section: Current Cart & Checkout */}
      <div className="w-full lg:w-[420px] bg-white rounded-3xl border border-slate-200/90 shadow-sm flex flex-col overflow-hidden">
        {/* Cart Header */}
        <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between bg-white">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-50 border border-blue-200/60 flex items-center justify-center text-blue-600">
              <ShoppingCart className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-slate-800 text-sm sm:text-base">Текущий чек</h3>
              <p className="text-[11px] text-slate-400">
                {cart.length > 0 ? `${cart.reduce((a, c) => a + c.quantity, 0)} ед. товаров` : 'Чек пуст'}
              </p>
            </div>
          </div>

          {cart.length > 0 && (
            <button
              id="clear-cart-btn"
              type="button"
              onClick={clearCart}
              className="text-xs text-blue-600 hover:text-rose-600 font-bold flex items-center gap-1 transition-colors px-2 py-1 rounded-lg hover:bg-slate-100"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Очистить все</span>
            </button>
          )}
        </div>

        {/* Enterprise Quick Action Bar: CRM, Parked Receipts, Returns, Staff Switch */}
        <div className="px-3.5 py-2.5 bg-slate-50/90 border-b border-slate-200/80 flex items-center justify-between gap-1.5 flex-wrap">
          {/* Active Customer Chip or Customer Selection Trigger */}
          {activeCustomer ? (
            <div className="flex items-center gap-1.5 bg-blue-100/80 border border-blue-300/80 px-2.5 py-1 rounded-xl text-blue-900 shadow-2xs">
              <UserCheck className="w-3.5 h-3.5 text-blue-600 shrink-0" />
              <button
                type="button"
                onClick={() => setIsCustomerModalOpen(true)}
                title="Редактировать клиента или открыть базу"
                className="truncate max-w-[110px] text-[11px] font-bold hover:underline cursor-pointer text-left"
              >
                {activeCustomer.name}
              </button>
              <span className="text-[10px] text-blue-700 bg-white px-1 py-0.5 rounded font-mono font-bold shadow-2xs">
                {activeCustomer.bonusBalance} Б
              </span>
              <button
                type="button"
                onClick={() => {
                  setActiveCustomer(null);
                  setGlobalDiscount(0);
                }}
                title="Отвязать клиента"
                className="text-blue-500 hover:text-blue-800 text-xs ml-0.5 font-bold"
              >
                ✕
              </button>
            </div>
          ) : (
            <button
              id="open-loyalty-modal-btn"
              type="button"
              onClick={() => setIsCustomerModalOpen(true)}
              className="flex items-center gap-1 text-[11px] font-semibold text-slate-700 hover:text-blue-600 bg-white border border-slate-200 hover:border-blue-300 px-2.5 py-1 rounded-xl transition-all shadow-2xs"
            >
              <UserCheck className="w-3.5 h-3.5 text-blue-500" />
              <span>+ Клиент / Бонусы</span>
            </button>
          )}

          <div className="flex items-center gap-1">
            {/* Park Receipt Button */}
            <button
              id="park-receipt-btn"
              type="button"
              disabled={cart.length === 0}
              onClick={handleParkReceipt}
              title="Отложить текущий чек покупателя"
              className="flex items-center gap-1 text-[11px] font-semibold text-slate-600 hover:text-slate-900 disabled:opacity-40 disabled:pointer-events-none bg-white border border-slate-200 hover:border-slate-300 px-2 py-1 rounded-xl transition-all shadow-2xs"
            >
              <BookmarkPlus className="w-3 h-3 text-slate-500" />
              <span className="hidden sm:inline">Отложить</span>
            </button>

            {/* View Parked Receipts */}
            <button
              id="view-parked-receipts-btn"
              type="button"
              onClick={() => {
                setParkModalMode(false);
                setIsParkedModalOpen(true);
              }}
              className={`flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-xl transition-all shadow-2xs ${
                parkedCount > 0
                  ? 'bg-amber-500 text-white shadow-amber-500/20 font-bold hover:bg-amber-600 animate-pulse'
                  : 'bg-white text-slate-600 border border-slate-200 hover:text-slate-900'
              }`}
              title="Список отложенных чеков"
            >
              <Bookmark className="w-3 h-3" />
              <span>Чеки ({parkedCount})</span>
            </button>

            {/* Refund Return Button */}
            <button
              id="open-refund-modal-btn"
              type="button"
              onClick={() => setIsRefundModalOpen(true)}
              className="flex items-center gap-1 text-[11px] font-semibold text-slate-600 hover:text-rose-600 bg-white border border-slate-200 hover:border-rose-300 px-2 py-1 rounded-xl transition-all shadow-2xs"
              title="Оформить возврат товара по чеку"
            >
              <RotateCcw className="w-3 h-3 text-rose-500" />
              <span className="hidden sm:inline">Возврат</span>
            </button>

            {/* Staff Switch */}
            <button
              id="open-staff-switch-btn"
              type="button"
              onClick={() => setIsStaffModalOpen(true)}
              className="flex items-center gap-1 text-[11px] font-bold text-slate-700 bg-white border border-slate-200 hover:border-indigo-300 px-2 py-1 rounded-xl transition-all shadow-2xs"
              title={`Текущий кассир: ${currentUser.name} (${currentUser.role}). Нажмите для смены.`}
            >
              <ShieldCheck className="w-3 h-3 text-indigo-500" />
              <span className="max-w-[70px] truncate">{currentUser.name.split(' ')[0]}</span>
            </button>
          </div>
        </div>

        {/* Cart Items List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2.5 min-h-[180px] max-h-[340px] lg:max-h-none">
          {cart.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center text-slate-400 p-6 space-y-3">
              {parkedCount > 0 && (
                <div
                  id="parked-receipts-quick-alert"
                  onClick={() => {
                    setParkModalMode(false);
                    setIsParkedModalOpen(true);
                  }}
                  className="w-full cursor-pointer bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-300/90 rounded-2xl p-3.5 text-left shadow-xs hover:border-amber-500 transition-all group"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-xl bg-amber-500 text-white flex items-center justify-center shadow-xs">
                        <Bookmark className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-amber-950 group-hover:text-amber-800">
                          Есть отложенные чеки ({parkedCount})
                        </div>
                        <div className="text-[11px] text-amber-700">
                          Нажмите, чтобы посмотреть и открыть чек
                        </div>
                      </div>
                    </div>
                    <span className="text-[11px] bg-amber-500 text-white font-bold px-2.5 py-1 rounded-lg shadow-2xs group-hover:bg-amber-600 transition-colors">
                      Открыть
                    </span>
                  </div>
                </div>
              )}
              <ShoppingCart className="w-10 h-10 stroke-1 text-slate-300" />
              <p className="text-xs font-semibold text-slate-600">В чеке пока нет товаров</p>
              <p className="text-[11px] text-slate-400">
                Сканируйте штрихкод или выберите товар из каталога слева для добавления
              </p>
            </div>
          ) : (
            cart.map((item) => {
              const lineTotal = item.product.price * item.quantity;
              const lineDiscount = lineTotal * (item.discountPercent / 100);
              const lineFinal = lineTotal - lineDiscount;

              return (
                <div
                  key={item.product.id}
                  id={`cart-item-${item.product.id}`}
                  className="bg-slate-50 border border-slate-100 rounded-2xl p-3 space-y-2 shadow-xs"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <h5 className="text-xs font-bold text-slate-800 truncate">
                          {item.product.name}
                        </h5>
                        {item.product.stock < 5 && (
                          <span
                            className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-100 text-amber-900 border border-amber-300 flex items-center gap-0.5 shrink-0"
                            title={`На складе осталось всего ${item.product.stock} ${item.product.unit}. Требуется закупка.`}
                          >
                            <AlertTriangle className="w-2.5 h-2.5 text-amber-600" />
                            <span>Закупка (&lt;5)</span>
                          </span>
                        )}

                        {/* National Marking badge */}
                        {item.product.isMarked && (
                          <button
                            type="button"
                            onClick={() => {
                              setMarkingTargetItem({ productId: item.product.id, productName: item.product.name });
                              setIsMarkingModalOpen(true);
                            }}
                            className={`text-[9px] font-bold px-1.5 py-0.5 rounded border flex items-center gap-1 transition-all ${
                              item.markingCode
                                ? 'bg-emerald-100 border-emerald-300 text-emerald-800'
                                : 'bg-amber-100 border-amber-300 text-amber-900 animate-pulse'
                            }`}
                            title={item.markingCode ? `DataMatrix: ${item.markingCode}` : 'Требуется отсканировать код маркировки!'}
                          >
                            <span>[М]</span>
                            <span>{item.markingCode ? 'Код внесен ✓' : 'Ввести код!'}</span>
                          </button>
                        )}
                      </div>
                      <p className="text-[10px] text-slate-400 font-mono">
                        {item.product.price} ₽ × {item.quantity} = {lineTotal} ₽
                        {item.product.stock < 5 && (
                          <span className="text-amber-700 ml-1.5 font-sans font-medium">
                            (остаток: {item.product.stock} {item.product.unit})
                          </span>
                        )}
                      </p>
                    </div>

                    <button
                      id={`remove-cart-${item.product.id}`}
                      type="button"
                      onClick={() => removeItem(item.product.id)}
                      className="text-slate-400 hover:text-rose-500 transition-colors p-1"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Quantity & Line Total */}
                  <div className="flex items-center justify-between pt-1 border-t border-slate-200/60">
                    <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-xl p-0.5 shadow-xs">
                      <button
                        id={`qty-minus-${item.product.id}`}
                        type="button"
                        onClick={() => updateQuantity(item.product.id, -1)}
                        className="w-6 h-6 rounded-lg flex items-center justify-center text-slate-600 hover:bg-slate-100 transition-colors"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="w-7 text-center text-xs font-bold text-slate-900 font-mono">
                        {item.quantity}
                      </span>
                      <button
                        id={`qty-plus-${item.product.id}`}
                        type="button"
                        onClick={() => updateQuantity(item.product.id, 1)}
                        disabled={item.quantity >= item.product.stock}
                        className="w-6 h-6 rounded-lg flex items-center justify-center text-slate-600 hover:bg-slate-100 disabled:opacity-40 transition-colors"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>

                    <div className="text-right">
                      {item.discountPercent > 0 && (
                        <span className="text-[10px] text-emerald-600 block line-through">
                          {lineTotal} ₽
                        </span>
                      )}
                      <span className="text-xs font-extrabold text-slate-900">
                        {Math.round(lineFinal).toLocaleString('ru-RU')} ₽
                      </span>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Cart Bottom Summary & Signature Bento Payment Box */}
        <div className="p-4 sm:p-5 border-t border-slate-200 bg-slate-50/70 space-y-3.5">
          {/* Discount / Coupon toggle */}
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span className="flex items-center gap-1 font-medium">
              <Percent className="w-3.5 h-3.5 text-blue-600" /> Скидка (%):
            </span>
            <div className="flex items-center gap-1">
              {[0, 5, 10, 15].map((pct) => (
                <button
                  key={pct}
                  type="button"
                  onClick={() => setGlobalDiscount(pct)}
                  className={`px-2.5 py-1 rounded-xl text-[11px] font-bold transition-all ${
                    globalDiscount === pct
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  {pct}%
                </button>
              ))}
            </div>
          </div>

          {/* Pricing Totals Breakdown */}
          <div className="space-y-1 pt-1 text-xs">
            <div className="flex justify-between text-slate-500">
              <span>Сумма без скидок:</span>
              <span className="font-medium text-slate-700">{subtotal.toLocaleString('ru-RU')} ₽</span>
            </div>
            {totalDiscount > 0 && (
              <div className="flex justify-between text-emerald-600 font-semibold">
                <span>Скидка:</span>
                <span>-{Math.round(totalDiscount).toLocaleString('ru-RU')} ₽</span>
              </div>
            )}
            <div className="flex justify-between text-slate-500">
              <span>В т.ч. НДС 20%:</span>
              <span className="font-medium text-slate-700">{Math.round(finalTotal * 0.2).toLocaleString('ru-RU')} ₽</span>
            </div>
          </div>

          {/* Signature Bento Payment Block */}
          <div className="flex justify-between items-center bg-blue-600 p-4 sm:p-5 rounded-2xl sm:rounded-3xl text-white shadow-lg shadow-blue-900/20">
            <div>
              <p className="text-xs opacity-85 uppercase font-bold tracking-wider">Итого к оплате</p>
              <p className="text-2xl sm:text-3xl font-black">{finalTotal.toLocaleString('ru-RU')} ₽</p>
            </div>
            <button
              id="proceed-to-checkout-btn"
              type="button"
              disabled={cart.length === 0}
              onClick={() => setIsCheckoutOpen(true)}
              className="bg-white text-blue-600 px-5 sm:px-6 py-3 rounded-xl font-bold hover:bg-slate-100 disabled:opacity-50 disabled:pointer-events-none shadow-md shadow-blue-950/20 transition-all active:scale-95 text-xs sm:text-sm uppercase tracking-wider"
            >
              ОПЛАТИТЬ
            </button>
          </div>
        </div>
      </div>

      {/* Barcode Scanner Modal */}
      <BarcodeScannerModal
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        onScan={(code) => handleBarcodeScanned(code, true)}
        products={products}
      />

      {/* Checkout Payment Modal */}
      <CheckoutModal
        isOpen={isCheckoutOpen}
        onClose={() => setIsCheckoutOpen(false)}
        cart={cart}
        subtotal={subtotal}
        discountAmount={totalDiscount}
        total={finalTotal}
        customer={activeCustomer}
        onCompleteSale={handleCompleteSale}
      />

      {/* Completed Sale Receipt Modal */}
      <ReceiptModal
        isOpen={!!completedSale}
        onClose={() => {
          setCompletedSale(null);
          setAutoPrintOnOpen(false);
        }}
        sale={completedSale}
        autoPrintOnOpen={autoPrintOnOpen}
      />

      {/* Customer Loyalty & CRM Modal */}
      <CustomerLoyaltyModal
        isOpen={isCustomerModalOpen}
        onClose={() => setIsCustomerModalOpen(false)}
        onSelectCustomer={handleSelectCustomer}
        currentCustomer={activeCustomer}
      />

      {/* Parked / Suspended Receipts Modal */}
      <ParkedReceiptsModal
        isOpen={isParkedModalOpen}
        initialParkingMode={parkModalMode}
        onClose={() => {
          setIsParkedModalOpen(false);
          setParkModalMode(false);
          setParkedCount(localDB.getParkedReceipts().length);
        }}
        currentCart={cart}
        currentCustomer={activeCustomer}
        currentDiscount={globalDiscount}
        onResumeReceipt={handleResumeParked}
        onParkCurrentCart={(note) => {
          localDB.addParkedReceipt({
            id: 'parked-' + Date.now().toString(36),
            name: note,
            note,
            customer: activeCustomer,
            cart: cart,
            items: cart,
            globalDiscount,
            createdAt: new Date().toISOString(),
            cashierName: currentUser.name
          });
          sounds.playSuccessChime();
          setParkedCount(localDB.getParkedReceipts().length);
          clearCart();
          setActiveCustomer(null);
        }}
      />

      {/* Refund & Return Receipt Modal */}
      <RefundModal
        isOpen={isRefundModalOpen}
        onClose={() => setIsRefundModalOpen(false)}
        currentCashierName={currentUser.name}
        onRefundCompleted={handleRefundCompleted}
      />

      {/* Staff Switch Modal */}
      <StaffSwitchModal
        isOpen={isStaffModalOpen}
        onClose={() => setIsStaffModalOpen(false)}
        currentUser={currentUser}
        onUserChanged={handleStaffUserChanged}
      />

      {/* National Marking DataMatrix Scanner Modal */}
      <MarkingCodeModal
        isOpen={isMarkingModalOpen}
        onClose={() => {
          setIsMarkingModalOpen(false);
          setMarkingTargetItem(null);
        }}
        productName={markingTargetItem?.productName || ''}
        onSaveMarkingCode={handleSaveMarkingCode}
      />
    </div>
  );
};
