import React, { useState, useRef } from 'react';
import {
  Package,
  Plus,
  Search,
  Download,
  AlertTriangle,
  ArrowUpDown,
  History,
  CheckCircle,
  FileSpreadsheet,
  Edit2,
  Trash2,
  Barcode,
  Sparkles,
  ClipboardList,
  Layers,
  Printer,
  Truck,
  Upload
} from 'lucide-react';
import { Product, InventoryLog, InventoryAuditItem } from '../types';
import { BarcodeBadge } from './BarcodeBadge';
import { pdfExportService } from '../services/pdfExport';
import { localDB } from '../services/localDB';
import { LabelsPrintModal } from './LabelsPrintModal';
import { AutoOrderModal } from './AutoOrderModal';
import { parseCSV, exportProductsToCSV, downloadCSVFile } from '../utils/csv';
import { sounds } from '../utils/audio';

interface InventoryViewProps {
  products: Product[];
  logs: InventoryLog[];
  onSaveProduct: (product: Product) => void;
  onDeleteProduct: (id: string) => void;
  onAdjustStock: (productId: string, type: 'restock' | 'write_off' | 'adjustment' | 'audit', delta?: number, newStock?: number, reason?: string) => void;
  onBulkImport?: () => void;
}

export const InventoryView: React.FC<InventoryViewProps> = ({
  products = [],
  logs = [],
  onSaveProduct,
  onDeleteProduct,
  onAdjustStock,
  onBulkImport,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Все');
  const [stockFilter, setStockFilter] = useState<'all' | 'low' | 'out'>('all');
  const [activeTab, setActiveTab] = useState<'stock' | 'logs' | 'audit'>('stock');

  // Modals
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isAdjustModalOpen, setIsAdjustModalOpen] = useState(false);
  const [adjustTargetProduct, setAdjustTargetProduct] = useState<Product | null>(null);
  const [adjustType, setAdjustType] = useState<'restock' | 'write_off' | 'adjustment'>('restock');
  const [adjustAmount, setAdjustAmount] = useState<number>(10);
  const [adjustReason, setAdjustReason] = useState<string>('');

  // New enterprise feature modals
  const [isLabelsModalOpen, setIsLabelsModalOpen] = useState(false);
  const [labelsModalSingleProduct, setLabelsModalSingleProduct] = useState<Product | undefined>(undefined);
  const [isAutoOrderModalOpen, setIsAutoOrderModalOpen] = useState(false);

  // File input ref for CSV import
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importNotification, setImportNotification] = useState<string | null>(null);

  // Audit state
  const [auditCounts, setAuditCounts] = useState<Record<string, number>>({});

  const store = localDB.getStoreInfo();
  const categories = ['Все', ...Array.from(new Set(products.map(p => p.category)))];

  // Filtering
  const filteredProducts = products.filter(p => {
    if (!p) return false;
    const q = (searchQuery || '').trim().toLowerCase();
    const matchesSearch = !q
      ? true
      : (p.name ? p.name.toLowerCase().includes(q) : false) ||
        (p.sku ? p.sku.toLowerCase().includes(q) : false) ||
        (p.barcode ? p.barcode.includes(q) : false);

    const matchesCategory = selectedCategory === 'Все' || p.category === selectedCategory;

    let matchesStock = true;
    if (stockFilter === 'low') matchesStock = p.stock > 0 && p.stock <= (p.minStock || 0);
    if (stockFilter === 'out') matchesStock = p.stock <= 0;

    return matchesSearch && matchesCategory && matchesStock;
  });

  // KPIs
  const totalUnits = products.reduce((acc, p) => acc + p.stock, 0);
  const totalCostValuation = products.reduce((acc, p) => acc + (p.costPrice * p.stock), 0);
  const totalRetailValuation = products.reduce((acc, p) => acc + (p.price * p.stock), 0);
  const lowStockCount = products.filter(p => p.stock <= p.minStock).length;

  const handleOpenNewProduct = () => {
    setEditingProduct({
      id: '',
      sku: 'SKU-' + Math.floor(1000 + Math.random() * 9000),
      name: '',
      barcode: '460' + Math.floor(1000000000 + Math.random() * 9000000000),
      category: 'Кофе и Чай',
      price: 150,
      costPrice: 70,
      stock: 10,
      minStock: 5,
      unit: 'шт',
      updatedAt: new Date().toISOString()
    });
    setIsProductModalOpen(true);
  };

  const handleOpenEditProduct = (prod: Product) => {
    setEditingProduct({ ...prod });
    setIsProductModalOpen(true);
  };

  const handleSaveProductSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct || !editingProduct.name || !editingProduct.barcode) return;

    onSaveProduct({
      ...editingProduct,
      id: editingProduct.id || 'prod-' + Date.now().toString(36),
      updatedAt: new Date().toISOString()
    });
    setIsProductModalOpen(false);
    setEditingProduct(null);
  };

  const handleOpenAdjust = (prod: Product, type: 'restock' | 'write_off') => {
    setAdjustTargetProduct(prod);
    setAdjustType(type);
    setAdjustAmount(type === 'restock' ? 10 : 1);
    setAdjustReason(type === 'restock' ? 'Поступление от поставщика' : 'Списание / брак');
    setIsAdjustModalOpen(true);
  };

  const handleConfirmAdjust = () => {
    if (!adjustTargetProduct) return;
    const delta = adjustType === 'restock' ? adjustAmount : -adjustAmount;
    onAdjustStock(adjustTargetProduct.id, adjustType, delta, undefined, adjustReason);
    setIsAdjustModalOpen(false);
    setAdjustTargetProduct(null);
  };

  // Inventory Audit Functions
  const handleStartAudit = () => {
    const initial: Record<string, number> = {};
    products.forEach(p => {
      initial[p.id] = p.stock;
    });
    setAuditCounts(initial);
    setActiveTab('audit');
  };

  const handleApplyAudit = () => {
    Object.entries(auditCounts).forEach(([prodId, actual]) => {
      const prod = products.find(p => p.id === prodId);
      if (prod && prod.stock !== actual) {
        onAdjustStock(prod.id, 'audit', undefined, actual, 'Сверка инвентаризации');
      }
    });
    alert('Остатки успешно скорректированы в соответствии с фактическим пересчетом!');
    setActiveTab('stock');
  };

  // CSV Import / Export handlers
  const handleExportCSV = () => {
    const csvContent = exportProductsToCSV(products);
    downloadCSVFile(csvContent, `Номенклатура_${new Date().toISOString().slice(0, 10)}.csv`);
    sounds.playSuccessChime();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const parsedProducts = parseCSV(text);
        if (parsedProducts.length === 0) {
          alert('Не удалось распознать товары из CSV файла. Проверьте формат.');
          return;
        }

        const count = localDB.bulkImportProducts(parsedProducts);
        sounds.playSuccessChime();
        setImportNotification(`Успешно импортировано ${count} товаров из CSV!`);
        setTimeout(() => setImportNotification(null), 4000);

        if (onBulkImport) {
          onBulkImport();
        }
      } catch (err) {
        alert('Ошибка чтения CSV: ' + String(err));
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  return (
    <div id="inventory-view-container" className="flex-1 flex flex-col h-full gap-4 sm:gap-6 overflow-hidden">
      {/* Hidden file input for CSV */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept=".csv,text/csv"
        className="hidden"
      />

      {/* Top Header & Metrics Bento Banner */}
      <div className="bg-white rounded-3xl border border-slate-200/90 shadow-sm p-4 sm:p-6 space-y-4 shrink-0">
        {importNotification && (
          <div className="p-3 bg-emerald-50 border border-emerald-300 rounded-2xl text-emerald-800 text-xs font-bold flex items-center justify-between animate-fade-in">
            <span>{importNotification}</span>
            <button onClick={() => setImportNotification(null)} className="text-emerald-700 hover:text-emerald-900">✕</button>
          </div>
        )}

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
              <Package className="w-5 h-5 text-blue-600" />
              <span>Инвентаризация и склад товаров</span>
            </h2>
            <p className="text-xs text-slate-400">
              Учет остатков в реальном времени, поступления, списания и PDF ведомости
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Auto Order Supplier Button */}
            <button
              id="auto-order-btn"
              type="button"
              onClick={() => setIsAutoOrderModalOpen(true)}
              className="px-3.5 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-2xs relative"
              title="Расчет и формирование автозаказа поставщику по дефицитным позициям"
            >
              <Truck className="w-4 h-4 text-emerald-600" />
              <span>Автозаказ</span>
              {lowStockCount > 0 && (
                <span className="w-5 h-5 rounded-full bg-rose-600 text-white text-[10px] font-black flex items-center justify-center">
                  {lowStockCount}
                </span>
              )}
            </button>

            {/* Print Labels Button */}
            <button
              id="print-labels-modal-btn"
              type="button"
              onClick={() => {
                setLabelsModalSingleProduct(undefined);
                setIsLabelsModalOpen(true);
              }}
              className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-xs"
              title="Печать штрихкодов и ценников (58x40, 43x25, полочные)"
            >
              <Printer className="w-4 h-4 text-blue-600" />
              <span>Печать ценников</span>
            </button>

            {/* CSV Import / Export */}
            <button
              id="import-csv-btn"
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-xs"
              title="Массовый импорт каталога товаров из CSV файла"
            >
              <Upload className="w-4 h-4 text-slate-600" />
              <span>Импорт CSV</span>
            </button>

            <button
              id="export-csv-btn"
              type="button"
              onClick={handleExportCSV}
              className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-xs"
              title="Экспорт всей номенклатуры в CSV для 1C или Excel"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
              <span>CSV</span>
            </button>

            <button
              id="export-inventory-pdf-btn"
              type="button"
              onClick={() => pdfExportService.downloadInventoryReportPDF(products, store)}
              className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-xs"
            >
              <Download className="w-4 h-4 text-blue-600" />
              <span>PDF</span>
            </button>

            <button
              id="start-audit-btn"
              type="button"
              onClick={handleStartAudit}
              className="px-3.5 py-2 bg-blue-50 hover:bg-blue-100 text-blue-600 border border-blue-200 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-xs"
            >
              <ClipboardList className="w-4 h-4 text-blue-600" />
              <span>Инвентаризация</span>
            </button>

            <button
              id="add-product-btn"
              type="button"
              onClick={handleOpenNewProduct}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors shadow-md shadow-blue-600/20"
            >
              <Plus className="w-4 h-4" />
              <span>Добавить товар</span>
            </button>
          </div>
        </div>

        {/* Warehouse Metrics Bento Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
          <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-3.5 sm:p-4 shadow-xs">
            <span className="text-[10px] sm:text-[11px] text-slate-400 uppercase tracking-wider block font-bold">
              Номенклатура
            </span>
            <div className="text-xl sm:text-2xl font-black text-slate-900 mt-1">
              {products.length} <span className="text-xs font-normal text-slate-400">поз.</span>
            </div>
          </div>

          <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-3.5 sm:p-4 shadow-xs">
            <span className="text-[10px] sm:text-[11px] text-slate-400 uppercase tracking-wider block font-bold">
              Общий остаток
            </span>
            <div className="text-xl sm:text-2xl font-black text-blue-600 mt-1">
              {totalUnits} <span className="text-xs font-normal text-slate-400">ед.</span>
            </div>
          </div>

          <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-3.5 sm:p-4 shadow-xs">
            <span className="text-[10px] sm:text-[11px] text-slate-400 uppercase tracking-wider block font-bold">
              Оценка в себестоимости
            </span>
            <div className="text-xl sm:text-2xl font-black text-slate-900 mt-1">
              {totalCostValuation.toLocaleString('ru-RU')} ₽
            </div>
          </div>

          <div className="bg-emerald-500 rounded-2xl p-3.5 sm:p-4 text-white shadow-md shadow-emerald-500/20">
            <span className="text-[10px] sm:text-[11px] text-emerald-100 uppercase tracking-wider block font-bold">
              Оценка в рознице
            </span>
            <div className="text-xl sm:text-2xl font-black text-white mt-1">
              {totalRetailValuation.toLocaleString('ru-RU')} ₽
            </div>
          </div>
        </div>

        {/* View Tabs */}
        <div className="flex items-center gap-2 border-t border-slate-100 pt-3">
          <button
            id="tab-stock"
            onClick={() => setActiveTab('stock')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeTab === 'stock'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Каталог остатков ({products.length})</span>
          </button>

          <button
            id="tab-logs"
            onClick={() => setActiveTab('logs')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeTab === 'logs'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            <span>Журнал движения ({logs.length})</span>
          </button>

          <button
            id="tab-audit"
            onClick={() => setActiveTab('audit')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeTab === 'audit'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100'
            }`}
          >
            <ClipboardList className="w-3.5 h-3.5" />
            <span>Сверка инвентаризации</span>
          </button>
        </div>
      </div>

      {/* Main Tab Content */}
      <div className="flex-1 flex flex-col overflow-hidden bg-white rounded-3xl border border-slate-200/90 shadow-sm p-4 sm:p-5 space-y-3">
        {/* Filter Bar (for stock & audit) */}
        {activeTab !== 'logs' && (
          <div className="flex flex-col sm:flex-row gap-2.5 items-stretch sm:items-center justify-between">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
              <input
                id="inventory-search-input"
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Поиск по названию, SKU или штрихкоду..."
                className="w-full pl-9 pr-4 py-2 bg-slate-100 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
              />
            </div>

            <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
              <select
                id="inventory-cat-filter"
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="px-3 py-2 bg-slate-100 border border-slate-200 rounded-xl text-xs text-slate-700 font-medium focus:outline-none focus:border-blue-500"
              >
                {categories.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>

              <div className="flex items-center bg-slate-100 p-0.5 rounded-xl border border-slate-200 shrink-0">
                <button
                  id="stock-filter-all"
                  onClick={() => setStockFilter('all')}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    stockFilter === 'all' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  Все ({products.length})
                </button>
                <button
                  id="stock-filter-low"
                  onClick={() => setStockFilter('low')}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1 ${
                    stockFilter === 'low' ? 'bg-white text-amber-700 shadow-xs' : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  Мало ({lowStockCount})
                </button>
                <button
                  id="stock-filter-out"
                  onClick={() => setStockFilter('out')}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    stockFilter === 'out' ? 'bg-white text-rose-700 shadow-xs' : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  Нет ({products.filter(p => p.stock <= 0).length})
                </button>
              </div>
            </div>
          </div>
        )}

        {/* TAB 1: Stock Inventory Table */}
        {activeTab === 'stock' && (
          <div className="flex-1 overflow-auto rounded-2xl border border-slate-200">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-50 text-slate-500 font-bold sticky top-0 z-10 border-b border-slate-200">
                <tr>
                  <th className="p-3">Штрихкод / SKU</th>
                  <th className="p-3">Наименование</th>
                  <th className="p-3">Категория</th>
                  <th className="p-3 text-right">Себест.</th>
                  <th className="p-3 text-right">Розница</th>
                  <th className="p-3 text-center">Остаток</th>
                  <th className="p-3 text-right">Оценка</th>
                  <th className="p-3 text-center">Действия</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {filteredProducts.map((prod) => {
                  const isOut = prod.stock <= 0;
                  const isLow = prod.stock > 0 && prod.stock <= prod.minStock;
                  const markup = prod.costPrice > 0 ? Math.round(((prod.price - prod.costPrice) / prod.costPrice) * 100) : 0;

                  return (
                    <tr key={prod.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="p-3">
                        <div className="font-mono text-slate-500 font-medium">{prod.sku}</div>
                        <div className="font-mono text-[11px] text-slate-400">{prod.barcode}</div>
                      </td>

                      <td className="p-3 font-medium text-slate-800 max-w-[220px]">
                        <div className="flex items-center gap-1.5 truncate">
                          <span className="truncate font-bold">{prod.name}</span>
                          {prod.isMarked && (
                            <span className="shrink-0 px-1.5 py-0.5 rounded bg-blue-100 text-blue-800 border border-blue-200 text-[9px] font-black" title="Маркированный товар (Честный ЗНАК)">
                              [М]
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] text-slate-400">Мин. порог: {prod.minStock} {prod.unit}</div>
                      </td>

                      <td className="p-3 text-slate-500">
                        <span className="px-2.5 py-0.5 rounded-lg bg-slate-100 text-[11px] font-semibold">{prod.category}</span>
                      </td>

                      <td className="p-3 text-right font-mono text-slate-600">
                        {prod.costPrice} ₽
                      </td>

                      <td className="p-3 text-right font-mono">
                        <span className="font-extrabold text-slate-900">{prod.price} ₽</span>
                        <span className="text-[10px] text-emerald-600 font-semibold block">+{markup}%</span>
                      </td>

                      <td className="p-3 text-center">
                        <span
                          className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold border ${
                            isOut
                              ? 'bg-rose-50 border-rose-200 text-rose-700'
                              : isLow
                              ? 'bg-amber-50 border-amber-200 text-amber-800'
                              : 'bg-emerald-50 border-emerald-200 text-emerald-700'
                          }`}
                        >
                          {prod.stock} {prod.unit}
                        </span>
                      </td>

                      <td className="p-3 text-right font-mono text-slate-800 font-bold">
                        {(prod.stock * prod.price).toLocaleString('ru-RU')} ₽
                      </td>

                      <td className="p-3 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            id={`print-single-label-${prod.id}`}
                            type="button"
                            title="Печать ценника"
                            onClick={() => {
                              setLabelsModalSingleProduct(prod);
                              setIsLabelsModalOpen(true);
                            }}
                            className="p-1.5 rounded-xl bg-slate-100 hover:bg-blue-50 text-slate-600 hover:text-blue-600 transition-colors"
                          >
                            <Printer className="w-3.5 h-3.5" />
                          </button>

                          <button
                            id={`restock-btn-${prod.id}`}
                            type="button"
                            title="Поступление товара (+)"
                            onClick={() => handleOpenAdjust(prod, 'restock')}
                            className="p-1.5 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-600 border border-blue-200 transition-colors"
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>

                          <button
                            id={`edit-prod-btn-${prod.id}`}
                            type="button"
                            title="Редактировать товар"
                            onClick={() => handleOpenEditProduct(prod)}
                            className="p-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>

                          <button
                            id={`delete-prod-btn-${prod.id}`}
                            type="button"
                            title="Удалить товар"
                            onClick={() => {
                              if (confirm(`Удалить товар "${prod.name}" из каталога?`)) {
                                onDeleteProduct(prod.id);
                              }
                            }}
                            className="p-1.5 rounded-xl bg-slate-100 hover:bg-rose-50 text-slate-400 hover:text-rose-600 transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* TAB 2: Inventory Movement Logs */}
        {activeTab === 'logs' && (
          <div className="flex-1 overflow-auto rounded-2xl border border-slate-200 p-4">
            <div className="space-y-2">
              {logs.length === 0 ? (
                <p className="text-center text-slate-400 text-xs py-8">История движения товара пуста</p>
              ) : (
                logs.map((log) => {
                  const isPositive = log.delta > 0;
                  return (
                    <div
                      key={log.id}
                      className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-50 border border-slate-100 text-xs shadow-xs"
                    >
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span
                            className={`px-2 py-0.5 rounded-lg text-[10px] font-bold ${
                              log.type === 'sale'
                                ? 'bg-blue-100 text-blue-800'
                                : log.type === 'restock'
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-purple-100 text-purple-800'
                            }`}
                          >
                            {log.type === 'sale' ? 'Продажа' : log.type === 'restock' ? 'Поступление' : 'Корректировка'}
                          </span>
                          <span className="font-bold text-slate-800">{log.productName}</span>
                        </div>
                        <p className="text-[11px] text-slate-500">{log.reason}</p>
                        <p className="text-[10px] text-slate-400">{new Date(log.timestamp).toLocaleString('ru-RU')}</p>
                      </div>

                      <div className="text-right">
                        <span
                          className={`text-sm font-black font-mono ${
                            isPositive ? 'text-emerald-600' : 'text-rose-600'
                          }`}
                        >
                          {isPositive ? `+${log.delta}` : log.delta} ед.
                        </span>
                        <div className="text-[10px] text-slate-400">
                          Итог на складе: {log.newStock} ед.
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* TAB 3: Inventory Audit Mode */}
        {activeTab === 'audit' && (
          <div className="flex-1 flex flex-col overflow-hidden rounded-2xl border border-slate-200 p-4 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-blue-50 border border-blue-200 p-4 rounded-2xl">
              <div>
                <h4 className="text-xs font-bold text-blue-900">Режим сверки фактических остатков</h4>
                <p className="text-[11px] text-blue-700/90">
                  Внесите фактическое количество после подсчета. Система автоматически выявит недостачи и излишки.
                </p>
              </div>

              <button
                id="apply-audit-btn"
                type="button"
                onClick={handleApplyAudit}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold shrink-0 shadow-md shadow-blue-600/20"
              >
                Применить результаты инвентаризации
              </button>
            </div>

            <div className="flex-1 overflow-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-50 text-slate-500 sticky top-0 z-10 border-b border-slate-200 font-bold">
                  <tr>
                    <th className="p-2.5">Товар</th>
                    <th className="p-2.5 text-center">Учетный остаток</th>
                    <th className="p-2.5 text-center">Факт (пересчет)</th>
                    <th className="p-2.5 text-center">Расхождение</th>
                    <th className="p-2.5 text-right">Сумма отклонения</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {filteredProducts.map((p) => {
                    const actual = auditCounts[p.id] ?? p.stock;
                    const diff = actual - p.stock;
                    const diffCost = diff * p.costPrice;

                    return (
                      <tr key={p.id}>
                        <td className="p-2.5">
                          <div className="font-bold text-slate-800">{p.name}</div>
                          <div className="font-mono text-[10px] text-slate-400">{p.barcode} • {p.sku}</div>
                        </td>
                        <td className="p-2.5 text-center font-bold text-slate-700">
                          {p.stock} {p.unit}
                        </td>
                        <td className="p-2.5 text-center">
                          <input
                            type="number"
                            value={actual}
                            onChange={(e) => {
                              const val = Math.max(0, parseInt(e.target.value) || 0);
                              setAuditCounts(prev => ({ ...prev, [p.id]: val }));
                            }}
                            className="w-20 px-2 py-1 text-center bg-slate-100 border border-slate-300 rounded-lg text-slate-900 font-bold"
                          />
                        </td>
                        <td className="p-2.5 text-center">
                          <span
                            className={`font-bold font-mono px-2 py-0.5 rounded text-xs ${
                              diff === 0
                                ? 'text-slate-400 bg-slate-100'
                                : diff > 0
                                ? 'text-emerald-700 bg-emerald-100'
                                : 'text-rose-700 bg-rose-100'
                            }`}
                          >
                            {diff === 0 ? 'Норма' : diff > 0 ? `+${diff} (излишек)` : `${diff} (недостача)`}
                          </span>
                        </td>
                        <td className="p-2.5 text-right font-mono font-bold">
                          <span className={diff > 0 ? 'text-emerald-600' : diff < 0 ? 'text-rose-600' : 'text-slate-400'}>
                            {diffCost > 0 ? `+${diffCost} ₽` : `${diffCost} ₽`}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* MODAL 1: Add/Edit Product */}
      {isProductModalOpen && editingProduct && (
        <div id="product-modal-backdrop" className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg bg-white border border-slate-200 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/70">
              <h3 className="font-bold text-slate-800 text-base">
                {editingProduct.id ? 'Редактировать товар' : 'Новый товар в каталог'}
              </h3>
              <button
                type="button"
                onClick={() => setIsProductModalOpen(false)}
                className="text-slate-400 hover:text-slate-700"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveProductSubmit} className="p-6 overflow-y-auto space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Наименование товара:
                </label>
                <input
                  type="text"
                  required
                  value={editingProduct.name}
                  onChange={(e) => setEditingProduct({ ...editingProduct, name: e.target.value })}
                  placeholder="Например: Кофе зерновой Кения 250г"
                  className="w-full px-3.5 py-2 bg-slate-100 border border-slate-200 rounded-xl text-xs text-slate-900 focus:border-blue-500 outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Штрихкод (EAN-13 / Code128):
                  </label>
                  <div className="flex gap-1">
                    <input
                      type="text"
                      required
                      value={editingProduct.barcode}
                      onChange={(e) => setEditingProduct({ ...editingProduct, barcode: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-100 border border-slate-200 rounded-xl text-xs text-slate-900 font-mono outline-none"
                    />
                    <button
                      type="button"
                      title="Сгенерировать случайный штрихкод"
                      onClick={() => {
                        const newBc = '460' + Math.floor(1000000000 + Math.random() * 9000000000);
                        setEditingProduct({ ...editingProduct, barcode: newBc });
                      }}
                      className="px-2 bg-slate-100 hover:bg-slate-200 text-blue-600 rounded-xl text-xs border border-slate-200"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Артикул (SKU):
                  </label>
                  <input
                    type="text"
                    value={editingProduct.sku}
                    onChange={(e) => setEditingProduct({ ...editingProduct, sku: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-100 border border-slate-200 rounded-xl text-xs text-slate-900 font-mono outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Категория:
                  </label>
                  <input
                    type="text"
                    value={editingProduct.category}
                    onChange={(e) => setEditingProduct({ ...editingProduct, category: e.target.value })}
                    placeholder="Например: Выпечка"
                    className="w-full px-3 py-2 bg-slate-100 border border-slate-200 rounded-xl text-xs text-slate-900 outline-none"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Единица измерения:
                  </label>
                  <select
                    value={editingProduct.unit}
                    onChange={(e) => setEditingProduct({ ...editingProduct, unit: e.target.value as any })}
                    className="w-full px-3 py-2 bg-slate-100 border border-slate-200 rounded-xl text-xs text-slate-900 outline-none"
                  >
                    <option value="шт">шт (штуки)</option>
                    <option value="кг">кг (килограммы)</option>
                    <option value="л">л (литры)</option>
                    <option value="уп">уп (упаковки)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Себестоимость закупки (₽):
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={editingProduct.costPrice}
                    onChange={(e) => setEditingProduct({ ...editingProduct, costPrice: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 bg-slate-100 border border-slate-200 rounded-xl text-xs text-slate-900 outline-none"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Цена продажи (₽):
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={editingProduct.price}
                    onChange={(e) => setEditingProduct({ ...editingProduct, price: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 bg-slate-100 border border-slate-200 rounded-xl text-xs text-blue-600 font-bold outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Текущий остаток на складе:
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={editingProduct.stock}
                    onChange={(e) => setEditingProduct({ ...editingProduct, stock: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-2 bg-slate-100 border border-slate-200 rounded-xl text-xs text-slate-900 outline-none"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Минимальный остаток (порог):
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={editingProduct.minStock}
                    onChange={(e) => setEditingProduct({ ...editingProduct, minStock: parseInt(e.target.value) || 5 })}
                    className="w-full px-3 py-2 bg-slate-100 border border-slate-200 rounded-xl text-xs text-slate-900 outline-none"
                  />
                </div>
              </div>

              {/* National Marking system checkbox */}
              <div className="flex items-center gap-2 p-3 bg-blue-50/70 border border-blue-200 rounded-xl">
                <input
                  type="checkbox"
                  id="product-is-marked-cb"
                  checked={!!editingProduct.isMarked}
                  onChange={(e) => setEditingProduct({ ...editingProduct, isMarked: e.target.checked })}
                  className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300"
                />
                <label htmlFor="product-is-marked-cb" className="text-xs font-bold text-slate-700 cursor-pointer select-none">
                  Обязательная маркировка («Честный ЗНАК» / DataMatrix [М])
                </label>
              </div>

              {/* Barcode visual preview */}
              {editingProduct.barcode && (
                <div className="pt-2 border-t border-slate-200 text-center">
                  <span className="text-[11px] text-slate-500 block mb-1 font-semibold">Предпросмотр штрихкода:</span>
                  <BarcodeBadge code={editingProduct.barcode} />
                </div>
              )}

              <div className="flex gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsProductModalOpen(false)}
                  className="flex-1 py-2.5 px-4 rounded-xl border border-slate-200 text-slate-600 text-xs font-semibold hover:bg-slate-50"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 px-4 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl shadow-md shadow-blue-600/20"
                >
                  Сохранить товар
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: Restock / Adjust */}
      {isAdjustModalOpen && adjustTargetProduct && (
        <div id="adjust-modal-backdrop" className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-white border border-slate-200 rounded-3xl shadow-2xl overflow-hidden p-6 space-y-4">
            <h3 className="font-bold text-slate-800 text-base">
              {adjustType === 'restock' ? 'Поступление товара на склад' : 'Списание товара'}
            </h3>

            <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 space-y-1">
              <span className="text-xs font-bold text-slate-800">{adjustTargetProduct.name}</span>
              <div className="flex justify-between text-[11px] text-slate-500 font-mono">
                <span>Текущий остаток:</span>
                <span className="text-blue-600 font-bold">{adjustTargetProduct.stock} {adjustTargetProduct.unit}</span>
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">
                {adjustType === 'restock' ? 'Количество к поступлению:' : 'Количество к списанию:'}
              </label>
              <input
                type="number"
                min="1"
                value={adjustAmount}
                onChange={(e) => setAdjustAmount(Math.max(1, parseInt(e.target.value) || 1))}
                className="w-full px-3.5 py-2 bg-slate-100 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 outline-none"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">
                Основание / Причина:
              </label>
              <input
                type="text"
                value={adjustReason}
                onChange={(e) => setAdjustReason(e.target.value)}
                placeholder="Накладная №..., брак, пересортица..."
                className="w-full px-3.5 py-2 bg-slate-100 border border-slate-200 rounded-xl text-xs text-slate-900 outline-none"
              />
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsAdjustModalOpen(false)}
                className="flex-1 py-2.5 px-3 rounded-xl border border-slate-200 text-slate-600 text-xs font-semibold hover:bg-slate-50"
              >
                Отмена
              </button>
              <button
                type="button"
                onClick={handleConfirmAdjust}
                className="flex-1 py-2.5 px-3 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl shadow-md shadow-blue-600/20"
              >
                Подтвердить
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Labels & Barcode Printing Modal */}
      <LabelsPrintModal
        isOpen={isLabelsModalOpen}
        onClose={() => setIsLabelsModalOpen(false)}
        products={products}
        initialSelectedProduct={labelsModalSingleProduct}
      />

      {/* Auto Order to Supplier Modal */}
      <AutoOrderModal
        isOpen={isAutoOrderModalOpen}
        onClose={() => setIsAutoOrderModalOpen(false)}
        products={products}
        onApplyStock={(items) => {
          items.forEach(item => {
            onAdjustStock(item.product.id, 'restock', item.orderQty, undefined, 'Поступление по автозаказу поставщика');
          });
        }}
      />
    </div>
  );
};
