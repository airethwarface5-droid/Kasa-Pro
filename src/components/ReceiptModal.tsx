import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Printer,
  Download,
  CheckCircle2,
  Store,
  Sparkles,
  ExternalLink,
  Copy,
  Check,
  FileText,
  Sliders,
  AlertCircle
} from 'lucide-react';
import { Sale } from '../types';
import { pdfExportService } from '../services/pdfExport';
import { localDB, POSSettings } from '../services/localDB';
import { BarcodeBadge } from './BarcodeBadge';

interface ReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  sale: Sale | null;
  autoPrintOnOpen?: boolean;
}

export const ReceiptModal: React.FC<ReceiptModalProps> = ({
  isOpen,
  onClose,
  sale,
  autoPrintOnOpen = false,
}) => {
  const [posSettings, setPosSettings] = useState<POSSettings>(() => localDB.getPOSSettings());
  const [format, setFormat] = useState<'thermal80' | 'a4'>(() => localDB.getPOSSettings().receiptFormat || 'thermal80');
  const [isProcessing, setIsProcessing] = useState(false);
  const [copiedText, setCopiedText] = useState(false);
  const [actionNotification, setActionNotification] = useState<string | null>(null);

  const autoPrintTriggeredRef = useRef(false);
  const store = localDB.getStoreInfo();

  // Handle auto-print if requested on open
  useEffect(() => {
    if (!isOpen || !sale) {
      autoPrintTriggeredRef.current = false;
      return;
    }

    const shouldAutoPrint = autoPrintOnOpen || posSettings.autoPrintReceipt;
    if (shouldAutoPrint && !autoPrintTriggeredRef.current) {
      autoPrintTriggeredRef.current = true;
      const timer = setTimeout(() => {
        handlePrintPDF();
      }, 350);
      return () => clearTimeout(timer);
    }
  }, [isOpen, sale]);

  if (!isOpen || !sale) return null;

  const showNotification = (msg: string) => {
    setActionNotification(msg);
    setTimeout(() => setActionNotification(null), 3000);
  };

  const handleFormatChange = (newFormat: 'thermal80' | 'a4') => {
    setFormat(newFormat);
    const updated = localDB.savePOSSettings({ receiptFormat: newFormat });
    setPosSettings(updated);
  };

  const handleToggleAutoPrint = (enabled: boolean) => {
    const updated = localDB.savePOSSettings({ autoPrintReceipt: enabled });
    setPosSettings(updated);
    showNotification(enabled ? 'Автопечать включена для всех чеков' : 'Автопечать отключена');
  };

  const handlePrintPDF = async () => {
    if (!sale) return;
    setIsProcessing(true);
    showNotification('Отправка на печать...');
    try {
      await pdfExportService.printReceiptPDF(sale, store, format);
      showNotification('Документ передан в очередь печати');
    } catch (e) {
      console.error('Print failed', e);
      window.print();
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDownloadPDF = async () => {
    if (!sale) return;
    setIsProcessing(true);
    try {
      await pdfExportService.downloadReceiptPDF(sale, store, format);
      showNotification(`PDF-файл скачан (${format === 'a4' ? 'формат А4' : 'лента 80мм'})`);
    } catch (e) {
      console.error('Download failed', e);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleOpenPDF = async () => {
    if (!sale) return;
    try {
      await pdfExportService.openReceiptPDF(sale, store, format);
    } catch (e) {
      console.error('Open PDF failed', e);
    }
  };

  const handleCopyReceiptText = () => {
    if (!sale) return;
    const paymentNames: Record<string, string> = {
      cash: 'Наличными',
      card: 'Банковской картой',
      sbp_qr: 'СБП (QR)',
      split: 'Смешанная оплата'
    };

    const text = [
      `=== ${store.storeName.toUpperCase()} ===`,
      `${store.address}`,
      `ИНН: ${store.inn}`,
      `КАССОВЫЙ ЧЕК № ${sale.receiptNumber}`,
      `Дата: ${sale.timestamp ? new Date(sale.timestamp).toLocaleString('ru-RU') : '—'}`,
      `Кассир: ${sale.cashierName || 'Кассир'}`,
      '--------------------------------',
      ...(sale.items || []).map(
        (it, idx) =>
          `${idx + 1}. ${it.name || 'Товар'}\n   ${it.quantity || 1} шт × ${it.unitPrice || 0} ₽ = ${it.total || 0} ₽${it.discount ? ` (скидка ${it.discount}%)` : ''}`
      ),
      '--------------------------------',
      `Подытог: ${sale.subtotal || 0} ₽`,
      sale.discountAmount > 0 ? `Скидка: -${sale.discountAmount} ₽` : null,
      `В т.ч. НДС 20%: ${Math.round(sale.taxAmount || 0)} ₽`,
      `ИТОГО: ${sale.total} ₽`,
      `Оплата: ${paymentNames[sale.paymentMethod] || 'Безналичная'}`,
      sale.cashReceived ? `Получено: ${sale.cashReceived} ₽, Сдача: ${sale.change || 0} ₽` : null,
      '--------------------------------',
      'Спасибо за покупку!'
    ]
      .filter(Boolean)
      .join('\n');

    navigator.clipboard.writeText(text);
    setCopiedText(true);
    showNotification('Текст чека скопирован в буфер');
    setTimeout(() => setCopiedText(false), 2000);
  };

  const paymentLabels: Record<string, string> = {
    cash: 'Наличными',
    card: 'Банковской картой',
    sbp_qr: 'СБП (QR-код)',
    split: 'Смешанная оплата'
  };

  return (
    <div
      id="receipt-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-3 sm:p-4 print:p-0 print:bg-white overflow-y-auto"
    >
      <div
        id="receipt-modal-content"
        className="w-full max-w-xl bg-white border border-slate-200 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[95vh] print:max-w-none print:w-full print:border-none print:shadow-none print:bg-white my-auto"
      >
        {/* Top Control Bar (Hidden on print) */}
        <div className="px-5 sm:px-6 py-4 border-b border-slate-100 bg-slate-50/80 flex items-center justify-between print:hidden">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600 shrink-0">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-slate-800 text-base leading-tight">
                  Чек № {sale.receiptNumber}
                </h3>
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                  PDF готов
                </span>
              </div>
              <p className="text-xs text-slate-400">
                {new Date(sale.timestamp).toLocaleString('ru-RU')} • {sale.cashierName}
              </p>
            </div>
          </div>

          <button
            id="close-receipt-modal-btn"
            onClick={onClose}
            className="w-9 h-9 rounded-xl flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition-colors shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Format Selector & Settings Bar (Hidden on print) */}
        <div className="px-5 sm:px-6 py-3 bg-slate-100/70 border-b border-slate-200/80 flex flex-wrap items-center justify-between gap-3 text-xs print:hidden">
          {/* Format Toggle */}
          <div className="flex items-center gap-1.5 bg-white p-1 rounded-xl border border-slate-200 shadow-2xs">
            <button
              id="format-thermal-btn"
              type="button"
              onClick={() => handleFormatChange('thermal80')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
                format === 'thermal80'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              Лента 80 мм (Касса)
            </button>
            <button
              id="format-a4-btn"
              type="button"
              onClick={() => handleFormatChange('a4')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
                format === 'a4'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              Товарный чек (А4)
            </button>
          </div>

          {/* Auto-print toggle */}
          <label className="flex items-center gap-2 cursor-pointer select-none text-slate-600 hover:text-slate-900">
            <input
              id="auto-print-receipt-toggle"
              type="checkbox"
              checked={posSettings.autoPrintReceipt}
              onChange={(e) => handleToggleAutoPrint(e.target.checked)}
              className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
            />
            <span className="font-semibold text-xs">Автопечать при продаже</span>
          </label>
        </div>

        {/* Status Toast Notification */}
        {actionNotification && (
          <div className="px-5 py-2 bg-blue-50 border-b border-blue-200 text-blue-800 text-xs font-semibold flex items-center justify-between animate-fade-in print:hidden">
            <span>{actionNotification}</span>
            <span className="text-[10px] text-blue-600">Система POS</span>
          </div>
        )}

        {/* Scrollable Receipt Body */}
        <div className="p-4 sm:p-6 overflow-y-auto bg-slate-100/50 flex justify-center print:p-0 print:bg-white">
          {format === 'thermal80' ? (
            /* ================= 80mm Thermal Receipt Preview ================= */
            <div
              id="thermal-receipt-paper"
              className="w-full max-w-[340px] bg-white text-slate-900 p-6 rounded-2xl shadow-md font-mono text-xs border border-slate-200 print:shadow-none print:border-none print:max-w-none"
            >
              {/* Header */}
              <div className="text-center space-y-1 pb-3 border-b border-dashed border-slate-300">
                <div className="flex items-center justify-center gap-1.5 font-sans font-extrabold text-base tracking-tight text-slate-900">
                  <Store className="w-4 h-4 text-slate-700" />
                  <span>{store.storeName}</span>
                </div>
                <p className="text-[10px] text-slate-500 font-sans">{store.address}</p>
                <p className="text-[10px] text-slate-500">ИНН: {store.inn}</p>
                <div className="pt-1 text-[11px] font-bold text-slate-800">
                  КАССОВЫЙ ЧЕК № {sale.receiptNumber}
                </div>
                <p className="text-[10px] text-slate-400">
                  {sale.timestamp ? new Date(sale.timestamp).toLocaleString('ru-RU') : '—'}
                </p>
                <p className="text-[10px] text-slate-400">
                  Кассир: {sale.cashierName || 'Кассир'}
                </p>
              </div>

              {/* Items Table */}
              <div className="py-3 space-y-2.5 border-b border-dashed border-slate-300">
                <div className="flex justify-between font-bold text-[10px] text-slate-400 uppercase pb-1 border-b border-slate-100">
                  <span>Товар</span>
                  <span>Сумма</span>
                </div>
                {(sale.items || []).map((item, idx) => (
                  <div key={idx} className="space-y-0.5">
                    <div className="flex justify-between font-semibold text-[11px] text-slate-800 leading-snug">
                      <span className="truncate pr-2 flex items-center gap-1">
                        {item.name || 'Товар'}
                        {item.markingCode && (
                          <span className="text-[9px] font-bold px-1 bg-amber-100 text-amber-800 border border-amber-300 rounded shrink-0">
                            [М]
                          </span>
                        )}
                      </span>
                      <span className="whitespace-nowrap font-bold">
                        {(item.total || 0).toLocaleString('ru-RU')} ₽
                      </span>
                    </div>
                    <div className="flex justify-between text-[10px] text-slate-400">
                      <span>
                        {item.quantity || 1} шт × {(item.unitPrice || 0).toLocaleString('ru-RU')} ₽
                      </span>
                      {item.discount > 0 && (
                        <span className="text-emerald-600 font-semibold">
                          скидка {item.discount}%
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Calculations */}
              <div className="py-3 space-y-1 border-b border-dashed border-slate-300">
                <div className="flex justify-between text-slate-500">
                  <span>Подытог:</span>
                  <span>{(sale.subtotal || 0).toLocaleString('ru-RU')} ₽</span>
                </div>
                {sale.discountAmount > 0 && (
                  <div className="flex justify-between text-emerald-600 font-medium">
                    <span>Скидка:</span>
                    <span>-{(sale.discountAmount || 0).toLocaleString('ru-RU')} ₽</span>
                  </div>
                )}
                <div className="flex justify-between text-slate-500">
                  <span>В т.ч. НДС 20%:</span>
                  <span>{Math.round(sale.taxAmount || 0).toLocaleString('ru-RU')} ₽</span>
                </div>
                {sale.bonusesUsed && sale.bonusesUsed > 0 && (
                  <div className="flex justify-between text-amber-700 font-medium">
                    <span>Оплачено бонусами:</span>
                    <span>-{sale.bonusesUsed} б.</span>
                  </div>
                )}
                <div className="flex justify-between font-black text-sm text-slate-900 pt-2 border-t border-slate-100">
                  <span>ИТОГО:</span>
                  <span>{(sale.total || 0).toLocaleString('ru-RU')} ₽</span>
                </div>
              </div>

              {/* Payment Info */}
              <div className="py-3 space-y-1 border-b border-dashed border-slate-300 text-[11px]">
                <div className="flex justify-between text-slate-600">
                  <span>Оплата:</span>
                  <span className="font-bold text-slate-800">
                    {paymentLabels[sale.paymentMethod] || 'Безналичная'}
                  </span>
                </div>
                {sale.splitDetails && (
                  <div className="text-[10px] text-slate-500 pl-2">
                    <div>• Наличные: {(sale.splitDetails.cash || 0).toLocaleString('ru-RU')} ₽</div>
                    <div>• Безналичные: {(sale.splitDetails.card || 0).toLocaleString('ru-RU')} ₽</div>
                  </div>
                )}
                {sale.customerName && (
                  <div className="flex justify-between text-slate-600 pt-1 border-t border-slate-100">
                    <span>Покупатель:</span>
                    <span className="font-medium text-slate-800">{sale.customerName}</span>
                  </div>
                )}
                {sale.bonusesEarned && sale.bonusesEarned > 0 && (
                  <div className="flex justify-between text-amber-600 text-[10px]">
                    <span>Начислено бонусов:</span>
                    <span className="font-bold">+{sale.bonusesEarned} б.</span>
                  </div>
                )}
                {sale.cashReceived && (
                  <>
                    <div className="flex justify-between text-slate-500">
                      <span>Получено:</span>
                      <span>{(sale.cashReceived || 0).toLocaleString('ru-RU')} ₽</span>
                    </div>
                    <div className="flex justify-between text-slate-500">
                      <span>Сдача:</span>
                      <span>{(sale.change || 0).toLocaleString('ru-RU')} ₽</span>
                    </div>
                  </>
                )}
                <div className="flex justify-between text-[10px] text-slate-400 pt-1">
                  <span>Фискальный статус:</span>
                  <span>{sale.synced ? 'Синхронизирован' : 'Офлайн (локально)'}</span>
                </div>
              </div>

              {/* Barcode & Footer Message */}
              <div className="pt-4 flex flex-col items-center text-center space-y-2">
                <BarcodeBadge
                  code={sale.receiptNumber}
                  showText={false}
                  className="w-full justify-center border-none shadow-none"
                />
                <p className="text-[10px] text-slate-400">* {sale.receiptNumber} *</p>
                <p className="text-[10px] text-slate-600 font-medium">
                  Спасибо за покупку! Ждем вас снова!
                </p>
              </div>
            </div>
          ) : (
            /* ================= A4 Goods Receipt Document Preview ================= */
            <div
              id="a4-receipt-document"
              className="w-full bg-white text-slate-900 p-6 sm:p-8 rounded-2xl shadow-md font-sans text-xs border border-slate-200 print:shadow-none print:border-none"
            >
              {/* Organization block */}
              <div className="border-b border-slate-200 pb-4 mb-4">
                <h4 className="font-bold text-sm text-slate-900">{store.storeName}</h4>
                <p className="text-[11px] text-slate-500">ИНН: {store.inn} • Адрес: {store.address}</p>
              </div>

              {/* Document Title */}
              <div className="mb-4">
                <h3 className="font-black text-base text-slate-900 tracking-tight">
                  ТОВАРНЫЙ ЧЕК № {sale.receiptNumber}
                </h3>
                <p className="text-[11px] text-slate-500">
                  от {new Date(sale.timestamp).toLocaleString('ru-RU')} • Кассир: {sale.cashierName}
                </p>
              </div>

              {/* Items Table */}
              <div className="border border-slate-200 rounded-xl overflow-hidden mb-4">
                <table className="w-full text-left border-collapse text-[11px]">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-700 font-bold">
                      <th className="py-2 px-2.5 w-8">№</th>
                      <th className="py-2 px-2.5">Наименование товара</th>
                      <th className="py-2 px-2.5 text-center w-16">Кол-во</th>
                      <th className="py-2 px-2.5 text-right w-20">Цена</th>
                      <th className="py-2 px-2.5 text-right w-24">Сумма</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {sale.items.map((item, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/50">
                        <td className="py-2 px-2.5 text-slate-400 font-mono">{idx + 1}</td>
                        <td className="py-2 px-2.5">
                          <p className="font-semibold text-slate-800">{item.name}</p>
                          <p className="text-[10px] text-slate-400 font-mono">{item.barcode}</p>
                        </td>
                        <td className="py-2 px-2.5 text-center text-slate-700 font-semibold">
                          {item.quantity || 1} шт
                        </td>
                        <td className="py-2 px-2.5 text-right text-slate-600 font-mono">
                          {item.unitPrice || 0} ₽
                        </td>
                        <td className="py-2 px-2.5 text-right font-bold text-slate-900 font-mono">
                          {(item.total || 0).toLocaleString('ru-RU')} ₽
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Totals & Tax */}
              <div className="flex justify-between items-start mb-6 text-xs">
                <div className="text-slate-500 space-y-1">
                  <p>Форма оплаты: <span className="font-bold text-slate-800">{paymentLabels[sale.paymentMethod] || 'Безналичная'}</span></p>
                  {sale.cashReceived && (
                    <p>Получено наличными: {sale.cashReceived} ₽ | Сдача: {sale.change || 0} ₽</p>
                  )}
                  <p>Всего наименований {(sale.items || []).length}, на сумму {(sale.total || 0).toLocaleString('ru-RU')} руб.</p>
                </div>

                <div className="text-right space-y-1 font-mono">
                  {sale.discountAmount > 0 && (
                    <p className="text-emerald-600 font-semibold">
                      Скидка: -{(sale.discountAmount || 0).toLocaleString('ru-RU')} ₽
                    </p>
                  )}
                  <p className="text-slate-500">В т.ч. НДС 20%: {Math.round(sale.taxAmount || 0).toLocaleString('ru-RU')} ₽</p>
                  <p className="text-base font-black text-slate-900 pt-1 border-t border-slate-200">
                    ИТОГО: {(sale.total || 0).toLocaleString('ru-RU')} ₽
                  </p>
                </div>
              </div>

              {/* Signatures and Stamp */}
              <div className="border-t border-slate-200 pt-4 flex items-center justify-between text-[11px] text-slate-500">
                <div>
                  <p>Отпустил: _________________ / {sale.cashierName} /</p>
                  <p className="mt-2">Получил: _________________ / Покупатель /</p>
                </div>
                <div className="w-16 h-16 rounded-full border-2 border-dashed border-slate-300 flex items-center justify-center font-bold text-slate-400 text-xs">
                  М.П.
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Action Buttons Bar (Hidden on print) */}
        <div className="p-4 sm:p-5 border-t border-slate-100 bg-slate-50/90 flex flex-wrap items-center gap-2.5 print:hidden">
          {/* Print PDF (Primary Action) */}
          <button
            id="print-receipt-pdf-btn"
            type="button"
            disabled={isProcessing}
            onClick={handlePrintPDF}
            className="flex-1 min-w-[140px] py-3 px-4 rounded-2xl bg-blue-600 hover:bg-blue-500 active:scale-95 disabled:opacity-50 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all shadow-md shadow-blue-600/25"
          >
            <Printer className="w-4 h-4 shrink-0" />
            <span>Отправить на печать</span>
          </button>

          {/* Download PDF */}
          <button
            id="download-receipt-pdf-btn"
            type="button"
            disabled={isProcessing}
            onClick={handleDownloadPDF}
            className="py-3 px-4 rounded-2xl bg-white hover:bg-slate-100 active:scale-95 border border-slate-200 text-slate-700 font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all shadow-2xs"
          >
            <Download className="w-4 h-4 text-slate-500 shrink-0" />
            <span>Скачать PDF</span>
          </button>

          {/* Open in New Tab */}
          <button
            id="open-receipt-pdf-btn"
            type="button"
            onClick={handleOpenPDF}
            title="Открыть PDF в новой вкладке"
            className="p-3 rounded-2xl bg-white hover:bg-slate-100 active:scale-95 border border-slate-200 text-slate-600 font-bold text-xs flex items-center justify-center transition-all shadow-2xs"
          >
            <ExternalLink className="w-4 h-4" />
          </button>

          {/* Copy Receipt Text */}
          <button
            id="copy-receipt-text-btn"
            type="button"
            onClick={handleCopyReceiptText}
            title="Скопировать текст чека"
            className="p-3 rounded-2xl bg-white hover:bg-slate-100 active:scale-95 border border-slate-200 text-slate-600 font-bold text-xs flex items-center justify-center transition-all shadow-2xs"
          >
            {copiedText ? (
              <Check className="w-4 h-4 text-emerald-600" />
            ) : (
              <Copy className="w-4 h-4" />
            )}
          </button>

          {/* New Sale Button */}
          <button
            id="new-sale-btn"
            type="button"
            onClick={onClose}
            className="py-3 px-4 rounded-2xl bg-slate-900 hover:bg-slate-800 active:scale-95 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-1.5 transition-all shadow-sm"
          >
            <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
            <span>Новый чек</span>
          </button>
        </div>
      </div>
    </div>
  );
};
