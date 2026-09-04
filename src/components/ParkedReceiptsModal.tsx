import React, { useState, useEffect } from 'react';
import {
  X,
  PauseCircle,
  PlayCircle,
  Trash2,
  Clock,
  User,
  ShoppingBag,
  PlusCircle,
  AlertCircle
} from 'lucide-react';
import { ParkedReceipt, CartItem, Customer } from '../types';
import { localDB } from '../services/localDB';
import { sounds } from '../utils/audio';

interface ParkedReceiptsModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentCart?: CartItem[];
  cart?: CartItem[];
  currentCustomer?: Customer | null;
  customer?: Customer | null;
  currentDiscount?: number;
  globalDiscount?: number;
  initialParkingMode?: boolean;
  onRestoreReceipt?: (receipt: ParkedReceipt) => void;
  onResumeReceipt?: (receipt: ParkedReceipt) => void;
  onParkCurrentCart?: (note: string) => void;
}

export const ParkedReceiptsModal: React.FC<ParkedReceiptsModalProps> = ({
  isOpen,
  onClose,
  currentCart = [],
  cart = [],
  currentCustomer,
  customer,
  currentDiscount = 0,
  globalDiscount = 0,
  initialParkingMode = false,
  onRestoreReceipt,
  onResumeReceipt,
  onParkCurrentCart,
}) => {
  const [parkedList, setParkedList] = useState<ParkedReceipt[]>(() => localDB.getParkedReceipts() || []);
  const [noteInput, setNoteInput] = useState('');
  const [isParkingMode, setIsParkingMode] = useState(initialParkingMode);

  const activeCart = currentCart.length > 0 ? currentCart : cart;
  const activeCust = currentCustomer || customer || null;
  const activeDiscount = currentDiscount || globalDiscount || 0;

  // Whenever modal opens or parking mode prop changes, re-fetch the latest parked receipts from localDB
  useEffect(() => {
    if (isOpen) {
      const freshList = localDB.getParkedReceipts() || [];
      setParkedList(freshList);
      setIsParkingMode(initialParkingMode);
      setNoteInput('');
    }
  }, [isOpen, initialParkingMode]);

  if (!isOpen) return null;

  const handleParkCurrent = (e: React.FormEvent) => {
    e.preventDefault();
    if (activeCart.length === 0) return;

    const note = noteInput.trim() || `Чек от ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    if (onParkCurrentCart) {
      onParkCurrentCart(note);
    } else {
      localDB.addParkedReceipt({
        id: 'parked-' + Date.now().toString(36),
        name: note,
        note,
        customer: activeCust,
        cart: activeCart,
        items: activeCart,
        globalDiscount: activeDiscount,
        createdAt: new Date().toISOString(),
        cashierName: localDB.getCurrentUser()?.name || 'Кассир'
      });
    }
    setNoteInput('');
    setIsParkingMode(false);
    setParkedList(localDB.getParkedReceipts() || []);
    sounds.playScanBeep();
    onClose();
  };

  const handleRestore = (receipt: ParkedReceipt) => {
    const restoreFn = onResumeReceipt || onRestoreReceipt;
    if (restoreFn) {
      restoreFn(receipt);
    }
    const updated = localDB.removeParkedReceipt(receipt.id);
    setParkedList(updated || []);
    sounds.playScanBeep();
    onClose();
  };

  const handleDelete = (id: string) => {
    const updated = localDB.removeParkedReceipt(id);
    setParkedList(updated || []);
    sounds.playErrorBeep();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-xl bg-white border border-slate-200 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-gradient-to-r from-amber-500 to-orange-500 text-white shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center">
              <PauseCircle className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-base leading-tight">Отложенные чеки</h3>
              <p className="text-xs text-amber-100">
                Парковка чеков при ожидании клиента ({parkedList.length})
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
          {/* Quick park current cart action */}
          {activeCart.length > 0 && !isParkingMode && (
            <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-between gap-3">
              <div>
                <span className="text-xs font-bold text-amber-900 block">
                  В текущем чеке: {activeCart.length} поз. на сумму{' '}
                  {activeCart
                    .reduce((acc, it) => acc + it.product.price * it.quantity, 0)
                    .toLocaleString('ru-RU')}{' '}
                  ₽
                </span>
                <span className="text-[11px] text-amber-700">
                  Покупатель отошел? Отложите чек и обслужите следующего в очереди.
                </span>
              </div>
              <button
                type="button"
                onClick={() => setIsParkingMode(true)}
                className="px-3.5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shrink-0 transition-colors shadow-xs flex items-center gap-1.5"
              >
                <PauseCircle className="w-4 h-4" />
                <span>Отложить текущий</span>
              </button>
            </div>
          )}

          {/* Form to park current cart */}
          {isParkingMode && (
            <form onSubmit={handleParkCurrent} className="p-4 rounded-2xl bg-amber-50 border border-amber-200 space-y-3">
              <h4 className="text-xs font-bold text-amber-900">
                Укажите комментарий к отложенному чеку:
              </h4>
              <input
                type="text"
                autoFocus
                value={noteInput}
                onChange={e => setNoteInput(e.target.value)}
                placeholder="Например: Девушка в синем пальто / забыла карту..."
                className="w-full bg-white border border-amber-300 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsParkingMode(false)}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-600 hover:bg-amber-100/50"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shadow-xs"
                >
                  Сохранить и освободить кассу
                </button>
              </div>
            </form>
          )}

          {/* List of Parked Receipts */}
          {parkedList.length === 0 ? (
            <div className="text-center py-10 text-slate-400">
              <ShoppingBag className="w-10 h-10 mx-auto text-slate-300 mb-2" />
              <p className="text-xs font-medium">Нет отложенных чеков</p>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Вы можете временно откладывать корзину, если клиент забыл кошелек или товар
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
                Список ожидающих чеков
              </span>
              {parkedList.map(receipt => {
                const receiptItems = receipt.cart || receipt.items || [];
                const total = receiptItems.reduce(
                  (acc, it) => {
                    const price = it.product?.price ?? (it as any).price ?? 0;
                    const qty = it.quantity ?? 1;
                    return acc + price * qty;
                  },
                  0
                );
                return (
                  <div
                    key={receipt.id}
                    className="p-4 rounded-2xl border border-slate-200 bg-white hover:border-amber-300 transition-all shadow-2xs space-y-2.5"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-xs sm:text-sm text-slate-900">
                            {receipt.name || receipt.note || 'Отложенный чек'}
                          </span>
                          <span className="text-[10px] bg-amber-100 text-amber-800 font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {receipt.createdAt ? new Date(receipt.createdAt).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit'
                            }) : 'Сейчас'}
                          </span>
                        </div>
                        {receipt.customer && (
                          <div className="text-[11px] text-blue-600 font-medium flex items-center gap-1 mt-0.5">
                            <User className="w-3 h-3" />
                            <span>Клиент: {receipt.customer.name} ({receipt.customer.phone})</span>
                          </div>
                        )}
                        {receipt.cashierName && (
                          <div className="text-[10px] text-slate-400 mt-0.5">
                            Кассир: {receipt.cashierName}
                          </div>
                        )}
                      </div>

                      <div className="text-right shrink-0">
                        <div className="text-sm font-black text-slate-900">
                          {total.toLocaleString('ru-RU')} ₽
                        </div>
                        <div className="text-[10px] text-slate-400">
                          {receiptItems.length} поз.
                        </div>
                      </div>
                    </div>

                    {/* Preview first 3 items */}
                    <div className="text-[11px] text-slate-500 bg-slate-50 p-2 rounded-xl truncate">
                      {receiptItems.length > 0
                        ? receiptItems.map(it => `${it.product?.name || (it as any).name || 'Товар'} × ${it.quantity || 1}`).join(', ')
                        : 'Содержимое чека сохранено'}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center justify-between pt-1 border-t border-slate-100">
                      <button
                        type="button"
                        onClick={() => handleDelete(receipt.id)}
                        className="text-[11px] text-rose-600 hover:text-rose-800 font-medium flex items-center gap-1 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Отменить чек</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleRestore(receipt)}
                        className="px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center gap-1.5 transition-colors shadow-xs"
                      >
                        <PlayCircle className="w-4 h-4" />
                        <span>Открыть в кассе</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 flex justify-end">
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
