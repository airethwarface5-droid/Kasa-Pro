import React, { useState } from 'react';
import {
  X,
  Printer,
  Tag,
  CheckSquare,
  Square,
  Search,
  Check,
  Sparkles,
  Layers,
  LayoutGrid
} from 'lucide-react';
import { Product } from '../types';
import { localDB } from '../services/localDB';
import { BarcodeBadge } from './BarcodeBadge';

interface LabelsPrintModalProps {
  isOpen: boolean;
  onClose: () => void;
  products?: Product[];
  initialSelectedProduct?: Product | null;
}

type LabelFormat = 'thermal_58x40' | 'shelf_60x40' | 'mini_40x30' | 'sheet_a4';

export const LabelsPrintModal: React.FC<LabelsPrintModalProps> = ({
  isOpen,
  onClose,
  products = [],
  initialSelectedProduct,
}) => {
  const [selectedFormat, setSelectedFormat] = useState<LabelFormat>('thermal_58x40');
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>(() =>
    initialSelectedProduct
      ? [initialSelectedProduct.id]
      : (products || []).slice(0, 6).map(p => p.id)
  );
  const [search, setSearch] = useState('');
  const [copiesPerItem, setCopiesPerItem] = useState<number>(1);

  if (!isOpen) return null;

  const store = localDB.getStoreInfo();

  const safeProducts = products || [];
  const q = (search || '').trim().toLowerCase();
  const filteredProducts = safeProducts.filter(p => {
    if (!p) return false;
    if (!q) return true;
    return (
      (p.name ? p.name.toLowerCase().includes(q) : false) ||
      (p.barcode ? p.barcode.includes(q) : false) ||
      (p.sku ? p.sku.toLowerCase().includes(q) : false)
    );
  });

  const toggleSelectAll = () => {
    if (selectedProductIds.length === filteredProducts.length) {
      setSelectedProductIds([]);
    } else {
      setSelectedProductIds(filteredProducts.map(p => p.id));
    }
  };

  const toggleSelectProduct = (id: string) => {
    setSelectedProductIds(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const selectedItems = products.filter(p => selectedProductIds.includes(p.id));

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const dateStr = new Date().toLocaleDateString('ru-RU');

    let labelHtml = '';

    selectedItems.forEach(item => {
      for (let c = 0; c < copiesPerItem; c++) {
        if (selectedFormat === 'thermal_58x40') {
          // 58x40mm thermal label
          labelHtml += `
            <div class="label-item thermal-58">
              <div class="store-title">${store.storeName}</div>
              <div class="product-name">${item.name}</div>
              <div class="sku-unit">Арт: ${item.sku} | Ед: ${item.unit}${item.isMarked ? ' | [М] Маркировка' : ''}</div>
              <div class="barcode-box">
                <div class="barcode-dummy">||| | |||| | ||| |||| |</div>
                <div class="barcode-num">${item.barcode}</div>
              </div>
              <div class="price-box">
                <span class="price-val">${item.price.toLocaleString('ru-RU')}</span>
                <span class="currency">₽</span>
              </div>
            </div>
          `;
        } else if (selectedFormat === 'shelf_60x40') {
          // Shelf tag with big price
          labelHtml += `
            <div class="label-item shelf-tag">
              <div class="shelf-header">
                <span>${store.storeName}</span>
                <span class="date">${dateStr}</span>
              </div>
              <div class="product-name shelf-pname">${item.name}</div>
              <div class="shelf-middle">
                <span class="sku">Арт: ${item.sku}</span>
                <span class="barcode-small">${item.barcode}</span>
              </div>
              <div class="shelf-price-row">
                <div class="shelf-price">${item.price.toLocaleString('ru-RU')} <span class="rub">₽</span></div>
                <div class="shelf-unit">за 1 ${item.unit}</div>
              </div>
            </div>
          `;
        } else if (selectedFormat === 'mini_40x30') {
          // Mini label
          labelHtml += `
            <div class="label-item mini-label">
              <div class="product-name mini-name">${item.name}</div>
              <div class="barcode-box mini-bc">
                <div class="barcode-num">${item.barcode}</div>
              </div>
              <div class="price-box mini-p">
                <span class="price-val">${item.price.toLocaleString('ru-RU')} ₽</span>
              </div>
            </div>
          `;
        } else {
          // A4 sheet item
          labelHtml += `
            <div class="label-item a4-item">
              <div class="store-title">${store.storeName}</div>
              <div class="product-name">${item.name}</div>
              <div class="sku-unit">Арт: ${item.sku} | ШК: ${item.barcode}</div>
              <div class="price-box">
                <span class="price-val">${item.price.toLocaleString('ru-RU')}</span>
                <span class="currency">₽ / ${item.unit}</span>
              </div>
            </div>
          `;
        }
      }
    });

    const fullHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Печать ценников и этикеток - ${store.storeName}</title>
        <style>
          @page {
            margin: 0;
            size: auto;
          }
          body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            margin: 4px;
            padding: 0;
            background: #fff;
            color: #000;
          }
          .labels-container {
            display: flex;
            flex-wrap: wrap;
            gap: 4px;
          }
          .label-item {
            box-sizing: border-box;
            border: 1px dashed #ccc;
            padding: 6px;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
            page-break-inside: avoid;
            background: #fff;
          }
          /* Thermal 58x40 */
          .thermal-58 {
            width: 58mm;
            height: 40mm;
            border: 1px solid #000;
            padding: 2mm 3mm;
          }
          .shelf-tag {
            width: 60mm;
            height: 40mm;
            border: 1.5px solid #000;
            padding: 2mm 3mm;
          }
          .mini-label {
            width: 40mm;
            height: 30mm;
            border: 1px solid #000;
            padding: 2mm;
          }
          .a4-item {
            width: 65mm;
            height: 38mm;
            border: 1px solid #999;
            padding: 3mm;
          }
          .store-title {
            font-size: 8pt;
            font-weight: bold;
            text-transform: uppercase;
            color: #444;
            border-bottom: 1px solid #ddd;
            padding-bottom: 1px;
            margin-bottom: 2px;
          }
          .product-name {
            font-size: 9.5pt;
            font-weight: 700;
            line-height: 1.15;
            max-height: 2.3em;
            overflow: hidden;
          }
          .shelf-pname {
            font-size: 10.5pt;
          }
          .mini-name {
            font-size: 8pt;
            max-height: 2em;
          }
          .sku-unit {
            font-size: 7.5pt;
            color: #555;
            margin-top: 1px;
          }
          .barcode-box {
            text-align: center;
            margin: 2px 0;
          }
          .barcode-dummy {
            font-size: 14pt;
            letter-spacing: 2px;
            font-family: monospace;
            line-height: 1;
          }
          .barcode-num {
            font-size: 7pt;
            font-family: monospace;
            font-weight: bold;
          }
          .price-box {
            display: flex;
            align-items: baseline;
            justify-content: flex-end;
            gap: 2px;
            border-top: 1px solid #000;
            padding-top: 1px;
          }
          .price-val {
            font-size: 15pt;
            font-weight: 900;
          }
          .currency {
            font-size: 9pt;
            font-weight: bold;
          }
          .shelf-header {
            display: flex;
            justify-content: space-between;
            font-size: 7pt;
            color: #555;
            border-bottom: 1px solid #aaa;
            padding-bottom: 2px;
          }
          .shelf-middle {
            display: flex;
            justify-content: space-between;
            font-size: 7pt;
            color: #555;
          }
          .shelf-price-row {
            display: flex;
            justify-content: space-between;
            align-items: baseline;
            border-top: 2px solid #000;
            padding-top: 2px;
          }
          .shelf-price {
            font-size: 18pt;
            font-weight: 900;
          }
          .shelf-unit {
            font-size: 8pt;
            font-weight: 600;
          }
          @media print {
            .label-item {
              border-style: solid;
            }
          }
        </style>
      </head>
      <body>
        <div class="labels-container">
          ${labelHtml}
        </div>
        <script>
          window.onload = function() {
            window.print();
          };
        </script>
      </body>
      </html>
    `;

    printWindow.document.write(fullHtml);
    printWindow.document.close();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-3xl bg-white border border-slate-200 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-gradient-to-r from-blue-600 to-cyan-600 text-white shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center">
              <Tag className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-base leading-tight">Печать ценников и этикеток</h3>
              <p className="text-xs text-blue-100">
                Шаблоны 58×40 мм, полочные ценники и термопечать со штрихкодами
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
          {/* Format selector */}
          <div className="space-y-2">
            <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">
              Выберите формат этикетки:
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {[
                { id: 'thermal_58x40', name: 'Термо 58×40 мм', desc: 'Для принтера чеков и термоэтикеток' },
                { id: 'shelf_60x40', name: 'Ценник на полку', desc: 'Крупная цена и дата' },
                { id: 'mini_40x30', name: 'Мини 40×30 мм', desc: 'Компактный стикер' },
                { id: 'sheet_a4', name: 'Сетка на лист А4', desc: 'Для офисного принтера' },
              ].map(f => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setSelectedFormat(f.id as LabelFormat)}
                  className={`p-3 rounded-2xl border text-left transition-all ${
                    selectedFormat === f.id
                      ? 'border-blue-600 bg-blue-50/70 shadow-xs ring-1 ring-blue-500'
                      : 'border-slate-200 hover:border-blue-300 hover:bg-slate-50'
                  }`}
                >
                  <div className="font-bold text-xs text-slate-900">{f.name}</div>
                  <div className="text-[10px] text-slate-500 mt-0.5">{f.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Controls: search and copies */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Поиск товара для ценника..."
                className="w-full pl-9 pr-3 py-1.5 bg-slate-100 border border-slate-200 rounded-xl text-xs outline-none focus:bg-white focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
              <div className="flex items-center gap-2 text-xs text-slate-600">
                <span>Копий на товар:</span>
                <input
                  type="number"
                  min="1"
                  max="50"
                  value={copiesPerItem}
                  onChange={e => setCopiesPerItem(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-14 bg-slate-100 border border-slate-200 rounded-lg px-2 py-1 text-xs text-center font-bold"
                />
              </div>

              <button
                type="button"
                onClick={toggleSelectAll}
                className="text-xs text-blue-600 hover:underline font-semibold"
              >
                {selectedProductIds.length === filteredProducts.length ? 'Снять все' : 'Выбрать все'}
              </button>
            </div>
          </div>

          {/* Product selector grid */}
          <div className="space-y-1.5 max-h-48 overflow-y-auto border border-slate-200 rounded-2xl p-2 bg-slate-50/50">
            {filteredProducts.map(p => {
              const isChecked = selectedProductIds.includes(p.id);
              return (
                <div
                  key={p.id}
                  onClick={() => toggleSelectProduct(p.id)}
                  className={`p-2 rounded-xl flex items-center justify-between gap-3 cursor-pointer text-xs transition-all ${
                    isChecked ? 'bg-blue-50 text-blue-900 font-semibold' : 'hover:bg-white text-slate-700'
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    {isChecked ? (
                      <CheckSquare className="w-4 h-4 text-blue-600 shrink-0" />
                    ) : (
                      <Square className="w-4 h-4 text-slate-400 shrink-0" />
                    )}
                    <span className="truncate">{p.name}</span>
                  </div>
                  <div className="flex items-center gap-3 shrink-0 text-[11px]">
                    <span className="text-slate-400 font-mono">{p.barcode}</span>
                    <span className="font-bold text-slate-900">{p.price} ₽</span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Live Preview of first selected label */}
          <div className="space-y-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">
              Превью этикетки:
            </span>

            {selectedItems.length === 0 ? (
              <div className="text-center py-6 text-slate-400 text-xs bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                Выберите хотя бы один товар для печати
              </div>
            ) : (
              <div className="p-4 bg-slate-100 rounded-2xl flex items-center justify-center border border-slate-200">
                {/* 58x40 Card preview */}
                <div className="w-64 bg-white border-2 border-slate-800 rounded-xl p-3 shadow-md flex flex-col justify-between h-40">
                  <div>
                    <div className="text-[9px] font-bold uppercase tracking-wider text-slate-500 border-b pb-0.5 mb-1">
                      {store.storeName}
                    </div>
                    <div className="text-xs font-bold text-slate-900 line-clamp-2 leading-tight">
                      {selectedItems[0].name}
                    </div>
                    <div className="text-[9px] text-slate-500 mt-0.5">
                      Арт: {selectedItems[0].sku} | Ед: {selectedItems[0].unit}
                      {selectedItems[0].isMarked && ' | [М] Маркировка'}
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-1 border-t border-slate-200">
                    <div className="scale-75 origin-left">
                      <BarcodeBadge code={selectedItems[0].barcode} showText={true} />
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-black text-slate-900 leading-none">
                        {selectedItems[0].price.toLocaleString('ru-RU')} ₽
                      </div>
                      <div className="text-[8px] text-slate-400">в т.ч. НДС 20%</div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          <span className="text-xs text-slate-600 font-medium">
            Выбрано товаров: {selectedItems.length} (всего этикеток к печати: {selectedItems.length * copiesPerItem} шт.)
          </span>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold text-xs transition-colors"
            >
              Отмена
            </button>
            <button
              type="button"
              disabled={selectedItems.length === 0}
              onClick={handlePrint}
              className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-bold text-xs flex items-center gap-2 transition-all shadow-md shadow-blue-600/20"
            >
              <Printer className="w-4 h-4" />
              <span>Распечатать этикетки</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
