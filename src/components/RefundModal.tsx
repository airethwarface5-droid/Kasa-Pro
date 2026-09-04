import React, { useState } from 'react';
import {
  X,
  RotateCcw,
  Search,
  CheckCircle2,
  Calendar,
  CreditCard,
  Banknote,
  QrCode,
  AlertTriangle,
  ArrowRight,
  Receipt,
  FileText
} from 'lucide-react';
import { Sale, SaleItem, ReturnRecord, ReturnItem, PaymentMethod } from '../types';
import { localDB } from '../services/localDB';
import { sounds } from '../utils/audio';

interface RefundModalProps {
  isOpen: boolean;
  onClose: () => void;
  onReturnProcessed?: (returnSale: Sale) => void;
  onRefundCompleted?: (record: ReturnRecord) => void;
  currentCashierName?: string;
}

export const RefundModal: React.FC<RefundModalProps> = ({
  isOpen,
  onClose,
  onReturnProcessed,
  onRefundCompleted,
  currentCashierName = 'Кассир',
}) => {
  const [sales, setSales] = useState<Sale[]>(() =>
    (localDB.getSales() || []).filter(s => !s.isReturn)
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);

  // Return item selection: record item index to return quantity
  const [returnQuantities, setReturnQuantities] = useState<Record<number, number>>({});
  const [refundMethod, setRefundMethod] = useState<PaymentMethod>('cash');
  const [refundReason, setRefundReason] = useState<string>('Отказ покупателя / товар не подошел');

  if (!isOpen) return null;

  const filteredSales = (sales || []).filter(s => {
    if (!s) return false;
    const q = (searchQuery || '').trim().toLowerCase();
    if (!q) return true;
    const receiptMatch = s.receiptNumber ? s.receiptNumber.toLowerCase().includes(q) : false;
    const phoneMatch = s.customerPhone ? s.customerPhone.includes(q) : false;
    const nameMatch = s.customerName ? s.customerName.toLowerCase().includes(q) : false;
    const itemsMatch = Array.isArray(s.items) && s.items.some(i => i && i.name && i.name.toLowerCase().includes(q));
    return receiptMatch || phoneMatch || nameMatch || itemsMatch;
  });

  const handleSelectSale = (sale: Sale) => {
    setSelectedSale(sale);
    setRefundMethod(sale.paymentMethod === 'split' ? 'cash' : sale.paymentMethod);
    // default full return
    const initialQty: Record<number, number> = {};
    (sale.items || []).forEach((item, idx) => {
      initialQty[idx] = item.quantity;
    });
    setReturnQuantities(initialQty);
  };

  const handleQtyChange = (idx: number, maxQty: number, val: number) => {
    const safeVal = Math.max(0, Math.min(maxQty, val));
    setReturnQuantities(prev => ({ ...prev, [idx]: safeVal }));
  };

  // Calculate refund sum
  const calculateTotalRefund = (): number => {
    if (!selectedSale) return 0;
    return selectedSale.items.reduce((sum, item, idx) => {
      const qty = returnQuantities[idx] || 0;
      const effectiveUnitPrice = item.quantity > 0 ? (item.total / item.quantity) : item.unitPrice;
      return sum + Math.round(effectiveUnitPrice * qty);
    }, 0);
  };

  const totalRefundAmount = calculateTotalRefund();

  const handleConfirmReturn = () => {
    if (!selectedSale || totalRefundAmount <= 0) {
      sounds.playErrorBeep();
      return;
    }

    const itemsToReturn: ReturnItem[] = [];
    selectedSale.items.forEach((item, idx) => {
      const qty = returnQuantities[idx] || 0;
      if (qty > 0) {
        const effectiveUnitPrice = item.quantity > 0 ? (item.total / item.quantity) : item.unitPrice;
        itemsToReturn.push({
          productId: item.productId,
          name: item.name,
          quantity: qty,
          unitPrice: item.unitPrice,
          refundAmount: Math.round(effectiveUnitPrice * qty)
        });
      }
    });

    const returnRecord: ReturnRecord = {
      id: 'ret-' + Date.now().toString(36),
      originalSaleId: selectedSale.id,
      originalReceiptNumber: selectedSale.receiptNumber,
      returnReceiptNumber: 'ВОЗВРАТ-' + Math.floor(1000 + Math.random() * 9000),
      timestamp: new Date().toISOString(),
      cashierName: currentCashierName,
      items: itemsToReturn,
      totalRefund: totalRefundAmount,
      refundMethod,
      reason: refundReason
    };

    const returnSale = localDB.processReturn(returnRecord);
    sounds.playSuccessChime();
    if (onReturnProcessed) onReturnProcessed(returnSale);
    if (onRefundCompleted) onRefundCompleted(returnRecord);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-2xl bg-white border border-slate-200 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-gradient-to-r from-rose-600 to-red-700 text-white shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center">
              <RotateCcw className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-base leading-tight">Возврат товара покупателем</h3>
              <p className="text-xs text-rose-100">
                Оформление чека возврата и автоматический возврат остатка на склад
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

        {/* Body */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1">
          {!selectedSale ? (
            /* STEP 1: Select Sale */
            <div className="space-y-4">
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  autoFocus
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Введите номер чека (например, ЧЕК-1001) или название товара..."
                  className="w-full pl-9.5 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:bg-white focus:ring-2 focus:ring-rose-500 transition-all"
                />
              </div>

              <div className="space-y-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
                  Выберите чек для возврата ({filteredSales.length})
                </span>

                {filteredSales.length === 0 ? (
                  <div className="text-center py-10 text-slate-400 text-xs">
                    Чеки не найдены
                  </div>
                ) : (
                  filteredSales.map(sale => (
                    <div
                      key={sale.id}
                      onClick={() => handleSelectSale(sale)}
                      className="p-4 rounded-2xl border border-slate-200 hover:border-rose-300 hover:bg-rose-50/40 cursor-pointer transition-all flex items-center justify-between gap-3 shadow-2xs group"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-xs sm:text-sm text-slate-900 group-hover:text-rose-700 transition-colors">
                            {sale.receiptNumber}
                          </span>
                          <span className="text-[10px] text-slate-500 flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {sale.timestamp ? new Date(sale.timestamp).toLocaleString('ru-RU', {
                              day: 'numeric',
                              month: 'short',
                              hour: '2-digit',
                              minute: '2-digit'
                            }) : '—'}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-500 line-clamp-1">
                          {(sale.items || []).map(i => `${i?.name || 'Товар'} (${i?.quantity || 1} шт)`).join(', ')}
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <div className="text-sm font-black text-slate-900">
                          {Number(sale.total || 0).toLocaleString('ru-RU')} ₽
                        </div>
                        <span className="text-[10px] font-semibold text-rose-600 group-hover:underline flex items-center gap-1 justify-end">
                          <span>Оформить возврат</span>
                          <ArrowRight className="w-3 h-3" />
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          ) : (
            /* STEP 2: Configure Return Items */
            <div className="space-y-5">
              {/* Selected Sale info banner */}
              <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 flex items-center justify-between gap-3">
                <div>
                  <span className="text-xs font-bold text-rose-950 flex items-center gap-1.5">
                    <Receipt className="w-4 h-4 text-rose-600" />
                    <span>Исходный чек: {selectedSale.receiptNumber}</span>
                  </span>
                  <span className="text-[11px] text-rose-800 block mt-0.5">
                    Дата продажи: {selectedSale.timestamp ? new Date(selectedSale.timestamp).toLocaleString('ru-RU') : '—'} | Исходная оплата: {selectedSale.paymentMethod === 'card' ? 'Банковская карта' : selectedSale.paymentMethod === 'sbp_qr' ? 'СБП' : 'Наличные'}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedSale(null)}
                  className="text-xs text-rose-700 hover:text-rose-900 font-semibold underline"
                >
                  Выбрать другой чек
                </button>
              </div>

              {/* Items to return selector */}
              <div className="space-y-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
                  Товары в чеке (укажите возвращаемое количество):
                </span>
                <div className="divide-y divide-slate-100 border border-slate-200 rounded-2xl overflow-hidden bg-white">
                  {(selectedSale.items || []).map((item, idx) => {
                    const qty = returnQuantities[idx] || 0;
                    const itemQty = Number(item.quantity) || 1;
                    const itemTotal = Number(item.total) || (itemQty * (Number(item.unitPrice) || 0));
                    const effectivePrice = itemQty > 0 ? (itemTotal / itemQty) : (Number(item.unitPrice) || 0);
                    return (
                      <div key={idx} className="p-3.5 flex items-center justify-between gap-3 hover:bg-slate-50">
                        <div className="min-w-0">
                          <div className="font-bold text-xs text-slate-900 truncate">
                            {item.name || 'Товар'}
                          </div>
                          <div className="text-[11px] text-slate-500">
                            В чеке: {itemQty} шт. × {Number(effectivePrice || 0).toLocaleString('ru-RU')} ₽ = {Number(itemTotal || 0).toLocaleString('ru-RU')} ₽
                          </div>
                        </div>

                        <div className="flex items-center gap-3 shrink-0">
                          <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl">
                            <button
                              type="button"
                              onClick={() => handleQtyChange(idx, item.quantity, qty - 1)}
                              className="w-7 h-7 rounded-lg bg-white shadow-2xs flex items-center justify-center text-slate-700 hover:bg-slate-200 font-bold text-xs"
                            >
                              -
                            </button>
                            <input
                              type="number"
                              min="0"
                              max={item.quantity}
                              value={qty}
                              onChange={e => handleQtyChange(idx, item.quantity, parseFloat(e.target.value) || 0)}
                              className="w-12 text-center text-xs font-bold bg-transparent outline-none"
                            />
                            <button
                              type="button"
                              onClick={() => handleQtyChange(idx, item.quantity, qty + 1)}
                              className="w-7 h-7 rounded-lg bg-white shadow-2xs flex items-center justify-center text-slate-700 hover:bg-slate-200 font-bold text-xs"
                            >
                              +
                            </button>
                          </div>

                          <div className="text-right w-20">
                            <span className="text-xs font-black text-rose-600 block">
                              {(qty * effectivePrice).toLocaleString('ru-RU')} ₽
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Reason & Refund payment method */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-bold uppercase text-slate-500 block mb-1">
                    Причина возврата:
                  </label>
                  <select
                    value={refundReason}
                    onChange={e => setRefundReason(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium text-slate-800 outline-none focus:ring-2 focus:ring-rose-500"
                  >
                    <option value="Отказ покупателя / товар не подошел">Отказ покупателя / не подошел</option>
                    <option value="Производственный брак">Производственный брак</option>
                    <option value="Ошибка кассира при пробитии">Ошибка кассира при пробитии</option>
                    <option value="Истек срок годности">Истек срок годности</option>
                  </select>
                </div>

                <div>
                  <label className="text-[11px] font-bold uppercase text-slate-500 block mb-1">
                    Способ возврата средств:
                  </label>
                  <div className="grid grid-cols-3 gap-1.5">
                    <button
                      type="button"
                      onClick={() => setRefundMethod('cash')}
                      className={`py-2 px-2 rounded-xl text-xs font-bold flex flex-col items-center justify-center gap-1 border transition-all ${
                        refundMethod === 'cash'
                          ? 'border-rose-600 bg-rose-50 text-rose-700 shadow-xs'
                          : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      <Banknote className="w-3.5 h-3.5" />
                      <span>Наличные</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setRefundMethod('card')}
                      className={`py-2 px-2 rounded-xl text-xs font-bold flex flex-col items-center justify-center gap-1 border transition-all ${
                        refundMethod === 'card'
                          ? 'border-rose-600 bg-rose-50 text-rose-700 shadow-xs'
                          : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      <CreditCard className="w-3.5 h-3.5" />
                      <span>Карта</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setRefundMethod('sbp_qr')}
                      className={`py-2 px-2 rounded-xl text-xs font-bold flex flex-col items-center justify-center gap-1 border transition-all ${
                        refundMethod === 'sbp_qr'
                          ? 'border-rose-600 bg-rose-50 text-rose-700 shadow-xs'
                          : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      <QrCode className="w-3.5 h-3.5" />
                      <span>СБП</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Total Refund Banner */}
              <div className="p-4 rounded-2xl bg-slate-900 text-white flex items-center justify-between shadow-md">
                <div>
                  <span className="text-[11px] text-slate-400 block uppercase tracking-wider font-bold">
                    Сумма к возврату покупателю
                  </span>
                  <div className="text-2xl sm:text-3xl font-black text-rose-400 mt-0.5">
                    {totalRefundAmount.toLocaleString('ru-RU')} ₽
                  </div>
                </div>

                <button
                  type="button"
                  disabled={totalRefundAmount <= 0}
                  onClick={handleConfirmReturn}
                  className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold text-xs sm:text-sm flex items-center gap-2 transition-all shadow-md shadow-rose-600/30"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>Выдать возврат</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex justify-end">
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
  );
};
