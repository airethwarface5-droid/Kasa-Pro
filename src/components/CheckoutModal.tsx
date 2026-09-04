import React, { useState } from 'react';
import {
  X,
  CreditCard,
  Banknote,
  QrCode,
  CheckCircle2,
  FileText,
  ArrowRight,
  DollarSign,
  Printer,
  Coins,
  Layers
} from 'lucide-react';
import { PaymentMethod, CartItem, Sale, Customer, SplitPaymentDetails } from '../types';
import { sounds } from '../utils/audio';
import { localDB } from '../services/localDB';

interface CheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  cart: CartItem[];
  subtotal: number;
  discountAmount: number;
  total: number;
  customer: Customer | null;
  onCompleteSale: (
    paymentMethod: PaymentMethod,
    cashReceived?: number,
    change?: number,
    autoPrint?: boolean,
    splitDetails?: SplitPaymentDetails,
    bonusesUsed?: number,
    bonusesEarned?: number
  ) => void;
}

export const CheckoutModal: React.FC<CheckoutModalProps> = ({
  isOpen,
  onClose,
  cart,
  subtotal,
  discountAmount,
  total,
  customer,
  onCompleteSale,
}) => {
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod>('cash');
  const [isProcessing, setIsProcessing] = useState(false);
  const [shouldPrintReceipt, setShouldPrintReceipt] = useState<boolean>(() => localDB.getPOSSettings().autoPrintReceipt);

  // Bonus redemption state
  const maxBonusesAllowed = customer ? Math.min(customer.bonusBalance, Math.floor(total * 0.5)) : 0;
  const [bonusesToUse, setBonusesToUse] = useState<number>(0);

  // Final amount to pay after bonus deduction
  const payableTotal = Math.max(0, total - bonusesToUse);

  // Cash state
  const [cashInput, setCashInput] = useState<string>(payableTotal.toString());

  // Split state
  const [splitCash, setSplitCash] = useState<number>(Math.floor(payableTotal / 2));
  const [splitCard, setSplitCard] = useState<number>(payableTotal - Math.floor(payableTotal / 2));

  // Recalculate cash defaults when payable changes
  const handleToggleBonusMax = (useMax: boolean) => {
    const amt = useMax ? maxBonusesAllowed : 0;
    setBonusesToUse(amt);
    const newPayable = Math.max(0, total - amt);
    setCashInput(newPayable.toString());
    setSplitCash(Math.floor(newPayable / 2));
    setSplitCard(newPayable - Math.floor(newPayable / 2));
  };

  if (!isOpen) return null;

  const cashReceivedNum = parseFloat(cashInput) || 0;
  const change = Math.max(0, cashReceivedNum - payableTotal);
  const isCashInsufficient = selectedMethod === 'cash' && cashReceivedNum < payableTotal;
  const isSplitMismatch = selectedMethod === 'split' && (splitCash + splitCard !== payableTotal);

  // 5% cashback earned
  const bonusesEarned = Math.round(payableTotal * 0.05);

  const quickAmounts = [
    payableTotal,
    Math.ceil(payableTotal / 100) * 100,
    Math.ceil(payableTotal / 500) * 500,
    1000,
    2000,
    5000
  ].filter((v, idx, arr) => v >= payableTotal && arr.indexOf(v) === idx).slice(0, 4);

  const handleConfirm = () => {
    if (isCashInsufficient || isSplitMismatch) {
      sounds.playErrorBeep();
      return;
    }

    setIsProcessing(true);
    sounds.playSuccessChime();

    setTimeout(() => {
      onCompleteSale(
        selectedMethod,
        selectedMethod === 'cash' ? cashReceivedNum : undefined,
        selectedMethod === 'cash' ? change : undefined,
        shouldPrintReceipt,
        selectedMethod === 'split' ? { cash: splitCash, card: splitCard } : undefined,
        bonusesToUse > 0 ? bonusesToUse : undefined,
        customer ? bonusesEarned : undefined
      );
      setIsProcessing(false);
      onClose();
    }, 450);
  };

  return (
    <div id="checkout-modal-backdrop" className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
      <div id="checkout-modal-content" className="w-full max-w-lg bg-white border border-slate-200 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/70 shrink-0">
          <div>
            <h3 className="font-bold text-slate-800 text-lg">Кассовый расчет</h3>
            <p className="text-xs text-slate-400">Выберите метод оплаты и подтвердите операцию</p>
          </div>
          <button
            id="close-checkout-modal-btn"
            onClick={onClose}
            className="w-8 h-8 rounded-xl flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-5 overflow-y-auto flex-1">
          {/* Big Amount Card */}
          <div className="bg-slate-50 border border-slate-200/90 rounded-2xl p-5 text-center relative overflow-hidden">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Сумма к оплате</p>
            <div className="text-3xl sm:text-4xl font-black text-slate-900 mt-1">
              {payableTotal.toLocaleString('ru-RU')} <span className="text-blue-600 text-2xl">₽</span>
            </div>
            {bonusesToUse > 0 && (
              <p className="text-xs text-amber-700 font-bold mt-1">
                Оплачено бонусами: -{bonusesToUse} бонусов
              </p>
            )}
            {discountAmount > 0 && (
              <p className="text-xs text-emerald-600 mt-1 font-semibold">
                С учетом скидки: -{discountAmount.toLocaleString('ru-RU')} ₽
              </p>
            )}
            <p className="text-[11px] text-slate-400 mt-1">
              Позиций: {cart.length} шт. | НДС 20%: {Math.round(payableTotal * 0.2).toLocaleString('ru-RU')} ₽
            </p>
          </div>

          {/* Customer & Bonus Loyalty Bar */}
          {customer && (
            <div className="p-3.5 rounded-2xl bg-indigo-50/70 border border-indigo-200/80 flex items-center justify-between gap-3 text-xs">
              <div>
                <div className="font-bold text-slate-900 flex items-center gap-1.5">
                  <Coins className="w-4 h-4 text-amber-500" />
                  <span>Покупатель: {customer.name}</span>
                </div>
                <div className="text-[11px] text-slate-600 mt-0.5">
                  Баланс: <b className="text-amber-700">{customer.bonusBalance}</b> бонусов | К начислению: +{bonusesEarned} б.
                </div>
              </div>

              {maxBonusesAllowed > 0 && (
                <div className="flex items-center gap-1.5 shrink-0">
                  {bonusesToUse > 0 ? (
                    <button
                      type="button"
                      onClick={() => handleToggleBonusMax(false)}
                      className="px-2.5 py-1.5 rounded-xl bg-slate-200 text-slate-700 font-bold text-[11px]"
                    >
                      Отменить бонусы
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleToggleBonusMax(true)}
                      className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-[11px] shadow-xs"
                    >
                      Списать {maxBonusesAllowed} б.
                    </button>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Payment Method Selector */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-700 block">
              Способ оплаты:
            </label>
            <div className="grid grid-cols-4 gap-2">
              <button
                id="pay-method-cash"
                type="button"
                onClick={() => setSelectedMethod('cash')}
                className={`flex flex-col items-center justify-center p-2.5 rounded-2xl border transition-all text-center ${
                  selectedMethod === 'cash'
                    ? 'bg-emerald-50 border-emerald-500 text-emerald-700 shadow-sm ring-2 ring-emerald-500/20'
                    : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                }`}
              >
                <Banknote className="w-5 h-5 mb-1" />
                <span className="text-[11px] font-bold">Наличные</span>
              </button>

              <button
                id="pay-method-card"
                type="button"
                onClick={() => setSelectedMethod('card')}
                className={`flex flex-col items-center justify-center p-2.5 rounded-2xl border transition-all text-center ${
                  selectedMethod === 'card'
                    ? 'bg-blue-50 border-blue-500 text-blue-700 shadow-sm ring-2 ring-blue-500/20'
                    : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                }`}
              >
                <CreditCard className="w-5 h-5 mb-1" />
                <span className="text-[11px] font-bold">Карта</span>
              </button>

              <button
                id="pay-method-sbp"
                type="button"
                onClick={() => setSelectedMethod('sbp_qr')}
                className={`flex flex-col items-center justify-center p-2.5 rounded-2xl border transition-all text-center ${
                  selectedMethod === 'sbp_qr'
                    ? 'bg-purple-50 border-purple-500 text-purple-700 shadow-sm ring-2 ring-purple-500/20'
                    : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                }`}
              >
                <QrCode className="w-5 h-5 mb-1" />
                <span className="text-[11px] font-bold">СБП QR</span>
              </button>

              <button
                id="pay-method-split"
                type="button"
                onClick={() => setSelectedMethod('split')}
                className={`flex flex-col items-center justify-center p-2.5 rounded-2xl border transition-all text-center ${
                  selectedMethod === 'split'
                    ? 'bg-amber-50 border-amber-500 text-amber-700 shadow-sm ring-2 ring-amber-500/20'
                    : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                }`}
              >
                <Layers className="w-5 h-5 mb-1" />
                <span className="text-[11px] font-bold">Смешанная</span>
              </button>
            </div>
          </div>

          {/* Cash Details */}
          {selectedMethod === 'cash' && (
            <div className="space-y-3 bg-slate-50 p-4 rounded-2xl border border-slate-200">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700">Получено от покупателя:</span>
                <div className="relative w-36">
                  <input
                    id="cash-received-input"
                    type="number"
                    value={cashInput}
                    onChange={(e) => setCashInput(e.target.value)}
                    className="w-full pl-3 pr-7 py-2 bg-white border border-slate-200 rounded-xl text-right font-black text-slate-900 text-sm focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                  />
                  <span className="absolute right-2.5 top-2 text-xs font-bold text-slate-400">₽</span>
                </div>
              </div>

              {/* Quick Bill shortcuts */}
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-[11px] font-semibold text-slate-400">Быстрые суммы:</span>
                {quickAmounts.map((amt) => (
                  <button
                    key={amt}
                    type="button"
                    onClick={() => setCashInput(amt.toString())}
                    className="text-xs font-bold px-2.5 py-1 rounded-lg bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 transition-colors shadow-2xs"
                  >
                    {amt} ₽
                  </button>
                ))}
              </div>

              {/* Change Output */}
              <div className="flex items-center justify-between pt-2.5 border-t border-slate-200">
                <span className="text-xs font-semibold text-slate-500">Сдача клиенту:</span>
                <span className={`text-base font-black ${isCashInsufficient ? 'text-rose-600' : 'text-emerald-600'}`}>
                  {isCashInsufficient ? 'Недостаточно средств' : `${change.toLocaleString('ru-RU')} ₽`}
                </span>
              </div>
            </div>
          )}

          {/* Split Payment Details */}
          {selectedMethod === 'split' && (
            <div className="space-y-3 bg-amber-50/50 p-4 rounded-2xl border border-amber-200">
              <div className="flex items-center justify-between text-xs text-amber-900 font-bold">
                <span>Разделение оплаты:</span>
                <span>Итого: {payableTotal} ₽</span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] uppercase font-bold text-slate-500 block mb-1">
                    Наличными (₽)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max={payableTotal}
                    value={splitCash}
                    onChange={(e) => {
                      const c = Math.max(0, parseInt(e.target.value) || 0);
                      setSplitCash(c);
                      setSplitCard(Math.max(0, payableTotal - c));
                    }}
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 focus:ring-2 focus:ring-amber-500 outline-none"
                  />
                </div>

                <div>
                  <label className="text-[10px] uppercase font-bold text-slate-500 block mb-1">
                    Картой / СБП (₽)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max={payableTotal}
                    value={splitCard}
                    onChange={(e) => {
                      const cd = Math.max(0, parseInt(e.target.value) || 0);
                      setSplitCard(cd);
                      setSplitCash(Math.max(0, payableTotal - cd));
                    }}
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 focus:ring-2 focus:ring-amber-500 outline-none"
                  />
                </div>
              </div>

              {splitCash + splitCard !== payableTotal && (
                <p className="text-[11px] text-rose-600 font-bold">
                  Ошибка: сумма частей ({splitCash + splitCard} ₽) не равна сумме чека ({payableTotal} ₽)
                </p>
              )}
            </div>
          )}

          {/* Card Terminal Details */}
          {selectedMethod === 'card' && (
            <div className="p-4 rounded-2xl bg-blue-50/80 border border-blue-200/80 text-center space-y-2">
              <CreditCard className="w-8 h-8 text-blue-600 mx-auto animate-pulse" />
              <p className="text-xs font-bold text-blue-900">
                Приложите карту к банковскому терминалу или вставьте чип
              </p>
              <p className="text-[11px] text-blue-700">
                Связь с эквайрингом активна. Нажмите «Пробить чек» после подтверждения.
              </p>
            </div>
          )}

          {/* SBP QR Details */}
          {selectedMethod === 'sbp_qr' && (
            <div className="p-4 rounded-2xl bg-purple-50/80 border border-purple-200/80 flex flex-col items-center text-center space-y-2">
              <div className="w-24 h-24 bg-white p-2 rounded-2xl shadow-md flex items-center justify-center border border-purple-200">
                <div className="w-full h-full border-2 border-slate-900 grid grid-cols-4 grid-rows-4 p-1 gap-1">
                  <div className="bg-slate-900" />
                  <div className="bg-slate-900" />
                  <div className="bg-transparent" />
                  <div className="bg-slate-900" />
                  <div className="bg-slate-900" />
                  <div className="bg-transparent" />
                  <div className="bg-slate-900" />
                  <div className="bg-transparent" />
                  <div className="bg-transparent" />
                  <div className="bg-slate-900" />
                  <div className="bg-slate-900" />
                  <div className="bg-slate-900" />
                  <div className="bg-slate-900" />
                  <div className="bg-transparent" />
                  <div className="bg-slate-900" />
                  <div className="bg-slate-900" />
                </div>
              </div>
              <p className="text-xs font-bold text-purple-900">
                Отсканируйте камерой смартфона в приложении банка (СБП)
              </p>
              <p className="text-[11px] text-purple-700">
                Сумма {payableTotal} ₽ зафиксирована в шлюзе
              </p>
            </div>
          )}
        </div>

        {/* Print Option Bar */}
        <div className="px-6 py-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-xs shrink-0">
          <label className="flex items-center gap-2 cursor-pointer select-none text-slate-700 hover:text-slate-900">
            <input
              id="checkout-autoprint-checkbox"
              type="checkbox"
              checked={shouldPrintReceipt}
              onChange={(e) => setShouldPrintReceipt(e.target.checked)}
              className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
            />
            <span className="font-bold flex items-center gap-1.5">
              <Printer className="w-3.5 h-3.5 text-blue-600" />
              <span>Сформировать PDF и отправить на печать</span>
            </span>
          </label>
          <span className="text-[11px] text-slate-400 font-medium">Лента 80мм / А4</span>
        </div>

        {/* Footer actions */}
        <div className="p-6 border-t border-slate-100 bg-slate-50/70 flex items-center gap-3 shrink-0">
          <button
            id="cancel-checkout-btn"
            type="button"
            onClick={onClose}
            className="flex-1 py-3 px-4 rounded-2xl border border-slate-200 hover:bg-slate-100 text-slate-700 font-bold text-sm transition-colors"
          >
            Отмена
          </button>
          <button
            id="confirm-checkout-btn"
            type="button"
            disabled={isCashInsufficient || isSplitMismatch || isProcessing}
            onClick={handleConfirm}
            className="flex-2 py-3 px-5 rounded-2xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:pointer-events-none text-white font-bold text-sm transition-all shadow-lg shadow-blue-600/25 flex items-center justify-center gap-2"
          >
            {isProcessing ? (
              <span>Обработка чека...</span>
            ) : (
              <>
                <CheckCircle2 className="w-5 h-5" />
                <span>Пробить чек ({payableTotal.toLocaleString('ru-RU')} ₽)</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
