import React, { useState } from 'react';
import {
  X,
  Truck,
  TrendingDown,
  Download,
  Copy,
  Check,
  CheckCircle2,
  PackageCheck,
  AlertTriangle,
  FileSpreadsheet,
  Coins
} from 'lucide-react';
import { Product, PurchaseOrderItem } from '../types';
import { localDB } from '../services/localDB';
import { downloadCSVFile } from '../utils/csv';
import { sounds } from '../utils/audio';

interface AutoOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  products?: Product[];
  onRestockFromOrder?: () => void;
  onApplyStock?: (items: { product: Product; orderQty: number }[]) => void;
}

export const AutoOrderModal: React.FC<AutoOrderModalProps> = ({
  isOpen,
  onClose,
  products = [],
  onRestockFromOrder,
  onApplyStock,
}) => {
  // Compute initial recommended order items
  const [orderItems, setOrderItems] = useState<PurchaseOrderItem[]>(() => {
    return (products || [])
      .filter(p => p.stock <= p.minStock)
      .map(p => {
        // formula: target is minStock * 3 or at least 10 units
        const needed = Math.max(p.minStock * 2 - p.stock + 5, 5);
        return {
          product: p,
          recommendedQty: needed,
          estimatedCost: needed * p.costPrice,
          reason: p.stock <= 0 ? 'Товар полностью закончился' : `Остаток (${p.stock}) ниже минимума (${p.minStock})`
        };
      });
  });

  const [copiedText, setCopiedText] = useState(false);
  const [restockedSuccess, setRestockedSuccess] = useState(false);

  if (!isOpen) return null;

  const store = localDB.getStoreInfo();

  const handleQtyChange = (idx: number, qty: number) => {
    setOrderItems(prev => {
      const copy = [...prev];
      const safeQty = Math.max(0, qty);
      copy[idx] = {
        ...copy[idx],
        recommendedQty: safeQty,
        estimatedCost: safeQty * copy[idx].product.costPrice
      };
      return copy;
    });
  };

  const handleRemoveItem = (idx: number) => {
    setOrderItems(prev => prev.filter((_, i) => i !== idx));
  };

  const totalUnits = orderItems.reduce((acc, it) => acc + it.recommendedQty, 0);
  const totalCost = orderItems.reduce((acc, it) => acc + it.estimatedCost, 0);

  // Generate readable text for WhatsApp / Email
  const generateTextOrder = (): string => {
    const lines = [
      `ЗАКАЗ ТОВАРОВ ПОСТАВЩИКУ`,
      `Магазин: ${store.storeName}`,
      `Дата: ${new Date().toLocaleDateString('ru-RU')}`,
      `---------------------------------`,
      ...orderItems.map((it, idx) =>
        `${idx + 1}. ${it.product.name} (арт: ${it.product.sku}, ш/к: ${it.product.barcode}) — ${it.recommendedQty} ${it.product.unit}`
      ),
      `---------------------------------`,
      `Итого позиций: ${orderItems.length} | Единиц: ${totalUnits} шт.`,
      `Ориентировочная сумма: ${totalCost.toLocaleString('ru-RU')} руб.`
    ];
    return lines.join('\n');
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(generateTextOrder());
    setCopiedText(true);
    sounds.playSuccessChime();
    setTimeout(() => setCopiedText(false), 2500);
  };

  const handleExportCSV = () => {
    const headers = ['Артикул', 'Наименование', 'Штрихкод', 'Количество к заказу', 'Ед.изм.', 'Себестоимость', 'Сумма'];
    const rows = orderItems.map(it => [
      `"${it.product.sku}"`,
      `"${it.product.name}"`,
      `"${it.product.barcode}"`,
      it.recommendedQty,
      `"${it.product.unit}"`,
      it.product.costPrice,
      it.estimatedCost
    ].join(';'));
    const content = '\uFEFF' + [headers.join(';'), ...rows].join('\r\n');
    downloadCSVFile(content, `Заказ_поставщику_${new Date().toISOString().slice(0, 10)}.csv`);
  };

  const handleExecuteRestock = () => {
    if (orderItems.length === 0) return;

    // Apply restock in localDB
    const allProducts = localDB.getProducts();
    orderItems.forEach(it => {
      const prod = allProducts.find(p => p.id === it.product.id);
      if (prod && it.recommendedQty > 0) {
        prod.stock += it.recommendedQty;
        prod.updatedAt = new Date().toISOString();

        localDB.addInventoryLog({
          id: 'log-' + Date.now().toString(36) + '-' + Math.random().toString(36).substring(2, 6),
          productId: prod.id,
          productName: prod.name,
          type: 'restock',
          delta: it.recommendedQty,
          newStock: prod.stock,
          reason: `Поступление по автозаказу поставщику`,
          timestamp: new Date().toISOString(),
          synced: true
        });
      }
    });

    localDB.saveProducts(allProducts);
    sounds.playSuccessChime();
    setRestockedSuccess(true);
    if (onApplyStock) {
      onApplyStock(orderItems.map(it => ({ product: it.product, orderQty: it.recommendedQty })));
    }
    if (onRestockFromOrder) {
      onRestockFromOrder();
    }
    setTimeout(() => {
      setRestockedSuccess(false);
      onClose();
    }, 1500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-2xl bg-white border border-slate-200 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-gradient-to-r from-emerald-600 to-teal-600 text-white shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center">
              <Truck className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-base leading-tight">Умный автозаказ поставщику</h3>
              <p className="text-xs text-emerald-100">
                Расчет потребности на основе неснижаемого остатка и динамики продаж
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl flex items-center justify-center bg-white/10 hover:bg-white/20 text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1">
          {/* Summary KPIs */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">
                Дефицитных позиций
              </span>
              <div className="text-xl font-black text-slate-900 mt-0.5">
                {orderItems.length} <span className="text-xs font-normal text-slate-400">товаров</span>
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">
                Всего к поставке
              </span>
              <div className="text-xl font-black text-emerald-600 mt-0.5">
                {totalUnits} <span className="text-xs font-normal text-slate-400">единиц</span>
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">
                Бюджет закупки
              </span>
              <div className="text-xl font-black text-slate-900 mt-0.5">
                {totalCost.toLocaleString('ru-RU')} ₽
              </div>
            </div>
          </div>

          {/* Success Banner */}
          {restockedSuccess && (
            <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-300 text-emerald-800 text-xs font-bold flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              <span>Товары успешно оприходованы! Остатки на складе пополнены.</span>
            </div>
          )}

          {/* Items List */}
          {orderItems.length === 0 ? (
            <div className="text-center py-10 text-slate-400 text-xs">
              <PackageCheck className="w-10 h-10 mx-auto text-emerald-400 mb-2" />
              <p className="font-bold text-slate-700">Все запасы в норме!</p>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Ни один товар на складе сейчас не требует срочного пополнения.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
                Рекомендованный список к заказу:
              </span>

              <div className="divide-y divide-slate-100 border border-slate-200 rounded-2xl overflow-hidden bg-white">
                {orderItems.map((it, idx) => (
                  <div key={it.product.id} className="p-3.5 flex items-center justify-between gap-3 hover:bg-slate-50">
                    <div className="min-w-0">
                      <div className="font-bold text-xs text-slate-900 truncate">
                        {it.product.name}
                      </div>
                      <div className="text-[11px] text-slate-500 mt-0.5 flex items-center gap-2">
                        <span>Текущий остаток: <b>{it.product.stock} {it.product.unit}</b></span>
                        <span>Мин: <b>{it.product.minStock}</b></span>
                        <span className="text-amber-600">({it.reason})</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl">
                        <button
                          type="button"
                          onClick={() => handleQtyChange(idx, it.recommendedQty - 1)}
                          className="w-7 h-7 rounded-lg bg-white shadow-2xs flex items-center justify-center text-slate-700 hover:bg-slate-200 font-bold text-xs"
                        >
                          -
                        </button>
                        <input
                          type="number"
                          min="1"
                          value={it.recommendedQty}
                          onChange={e => handleQtyChange(idx, parseInt(e.target.value) || 0)}
                          className="w-12 text-center text-xs font-bold bg-transparent outline-none"
                        />
                        <button
                          type="button"
                          onClick={() => handleQtyChange(idx, it.recommendedQty + 1)}
                          className="w-7 h-7 rounded-lg bg-white shadow-2xs flex items-center justify-center text-slate-700 hover:bg-slate-200 font-bold text-xs"
                        >
                          +
                        </button>
                      </div>

                      <div className="text-right w-24">
                        <div className="text-xs font-black text-slate-900">
                          {it.estimatedCost.toLocaleString('ru-RU')} ₽
                        </div>
                        <div className="text-[10px] text-slate-400">
                          по {it.product.costPrice} ₽/ед
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleRemoveItem(idx)}
                        className="text-slate-400 hover:text-rose-600 text-xs p-1"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCopy}
              disabled={orderItems.length === 0}
              className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs flex items-center gap-1.5 transition-colors"
            >
              {copiedText ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4 text-slate-500" />}
              <span>{copiedText ? 'Скопировано!' : 'Скопировать текст (WhatsApp)'}</span>
            </button>

            <button
              type="button"
              onClick={handleExportCSV}
              disabled={orderItems.length === 0}
              className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs flex items-center gap-1.5 transition-colors"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
              <span>Экспорт CSV</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={orderItems.length === 0}
              onClick={handleExecuteRestock}
              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold text-xs flex items-center gap-1.5 transition-all shadow-md shadow-emerald-600/20"
            >
              <PackageCheck className="w-4 h-4" />
              <span>Оприходовать поставку</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold text-xs transition-colors"
            >
              Закрыть
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
