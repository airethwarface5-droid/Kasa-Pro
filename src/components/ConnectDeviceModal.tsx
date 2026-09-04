import React, { useState, useEffect } from 'react';
import {
  X,
  Smartphone,
  Tablet,
  Laptop,
  QrCode,
  Copy,
  Check,
  ExternalLink,
  Share2,
  Sparkles,
  Wifi,
  Layers,
  ArrowRight,
  AlertTriangle,
  Info,
  CheckCircle2
} from 'lucide-react';
import QRCode from 'qrcode';

interface ConnectDeviceModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const DEV_URL = 'https://ais-dev-lpnfp4jfraayqh7mysr3se-503660720440.europe-west2.run.app';
const SHARED_URL = 'https://ais-pre-lpnfp4jfraayqh7mysr3se-503660720440.europe-west2.run.app';

export function ConnectDeviceModal({ isOpen, onClose }: ConnectDeviceModalProps) {
  const [urlType, setUrlType] = useState<'dev' | 'shared'>('dev');
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [copied, setCopied] = useState(false);
  const [selectedDeviceTab, setSelectedDeviceTab] = useState<'phone' | 'tablet' | 'pc'>('phone');

  const activeUrl = urlType === 'dev' ? DEV_URL : SHARED_URL;

  useEffect(() => {
    if (!isOpen) return;

    QRCode.toDataURL(activeUrl, {
      width: 280,
      margin: 2,
      color: {
        dark: '#0f172a',
        light: '#ffffff'
      }
    })
      .then((url) => setQrDataUrl(url))
      .catch((err) => console.error('Failed to generate QR code', err));
  }, [isOpen, activeUrl]);

  if (!isOpen) return null;

  const handleCopy = (textToCopy: string) => {
    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleOpenInNewTab = () => {
    window.open(activeUrl, '_blank');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        id="connect-device-modal-container"
        className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-2xl max-h-[92vh] flex flex-col overflow-hidden"
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between gap-3 bg-gradient-to-r from-blue-700 via-indigo-700 to-slate-900 text-white shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/15 flex items-center justify-center text-white backdrop-blur-xs border border-white/20 shadow-sm">
              <QrCode className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base sm:text-lg text-white leading-tight">
                Запуск на другом устройстве
              </h3>
              <p className="text-xs text-blue-200 mt-0.5">
                Откройте кассу на телефоне, планшете или ноутбуке за 5 секунд
              </p>
            </div>
          </div>

          <button
            id="close-connect-modal-btn"
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl bg-white/10 hover:bg-white/25 text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-5">
          {/* Important explanation alert about Page Not Found */}
          <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs space-y-2">
            <div className="flex items-center gap-2 font-bold text-amber-950">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
              <span>Если у вас отобразилась ошибка «Error: Page not found»:</span>
            </div>
            <p className="leading-relaxed text-amber-900">
              В облаке Google AI Studio публичная ссылка <span className="font-mono font-semibold bg-amber-100 px-1 py-0.5 rounded">ais-pre-...</span> начинает отвечать <strong>только после нажатия кнопки «Share» (Поделиться)</strong> в правом верхнем углу окна AI Studio.
            </p>
            <div className="pt-1 flex flex-wrap items-center gap-2 text-[11px]">
              <span className="font-bold text-amber-950">Как исправить прямо сейчас:</span>
              <span className="bg-white/80 border border-amber-300 px-2 py-0.5 rounded font-medium">1. Нажмите «Share» вверху экрана</span>
              <span className="text-amber-700">или</span>
              <span className="bg-white/80 border border-amber-300 px-2 py-0.5 rounded font-medium">2. Откройте прямую Dev-ссылку ниже</span>
            </div>
          </div>

          {/* QR Code Hero Block */}
          <div className="bg-slate-50 border border-slate-200/90 rounded-2xl p-5 flex flex-col sm:flex-row items-center gap-6 shadow-2xs">
            {/* QR Box */}
            <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-sm shrink-0 flex flex-col items-center">
              {qrDataUrl ? (
                <img
                  src={qrDataUrl}
                  alt="QR-код для открытия кассы на другом устройстве"
                  className="w-48 h-48 sm:w-44 sm:h-44 rounded-lg object-contain"
                />
              ) : (
                <div className="w-48 h-48 sm:w-44 sm:h-44 rounded-lg bg-slate-100 animate-pulse flex items-center justify-center text-xs text-slate-400">
                  Генерация QR...
                </div>
              )}
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mt-2 flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-amber-500" />
                Наведите камеру
              </span>
            </div>

            {/* URL Selection & Copy */}
            <div className="space-y-3.5 flex-1 w-full text-center sm:text-left">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-md">
                  Выберите какую ссылку открыть
                </span>
                <h4 className="font-extrabold text-slate-900 text-base sm:text-lg mt-1.5 leading-snug">
                  {urlType === 'dev' ? 'Прямая ссылка сервера (Dev URL)' : 'Публичная ссылка (Shared URL)'}
                </h4>
                <p className="text-xs text-slate-500 leading-relaxed mt-1">
                  {urlType === 'dev'
                    ? 'Активна прямо сейчас. Если открываете на телефоне с вашим Google-аккаунтом — откроется сразу.'
                    : 'Работает для любых пользователей без авторизации сразу после нажатия кнопки «Share» в AI Studio.'}
                </p>
              </div>

              {/* URL Type Switcher */}
              <div className="grid grid-cols-2 gap-2 bg-slate-200/80 p-1 rounded-xl text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => setUrlType('dev')}
                  className={`py-1.5 px-2.5 rounded-lg transition-all text-center ${
                    urlType === 'dev'
                      ? 'bg-white text-blue-700 font-bold shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Прямая (Dev)
                </button>
                <button
                  type="button"
                  onClick={() => setUrlType('shared')}
                  className={`py-1.5 px-2.5 rounded-lg transition-all text-center ${
                    urlType === 'shared'
                      ? 'bg-white text-blue-700 font-bold shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Публичная (Share)
                </button>
              </div>

              {/* URL Box with Copy Button */}
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={activeUrl}
                    className="flex-1 bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono text-slate-700 truncate shadow-2xs focus:outline-none"
                  />
                  <button
                    id="copy-device-url-btn"
                    type="button"
                    onClick={() => handleCopy(activeUrl)}
                    className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center gap-1.5 transition-all shadow-xs shrink-0 active:scale-95"
                  >
                    {copied ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-300" />
                        <span>Скопировано!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Скопировать</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Step-by-step Tabs for Different Devices */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                <Layers className="w-4 h-4 text-blue-600" />
                <span>Инструкция по типу устройства:</span>
              </h4>
            </div>

            {/* Device Switcher Pills */}
            <div className="grid grid-cols-3 gap-2 bg-slate-100 p-1 rounded-2xl text-xs font-bold">
              <button
                type="button"
                onClick={() => setSelectedDeviceTab('phone')}
                className={`py-2 px-3 rounded-xl flex items-center justify-center gap-1.5 transition-all ${
                  selectedDeviceTab === 'phone'
                    ? 'bg-white text-blue-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Smartphone className="w-4 h-4" />
                <span>Смартфон</span>
              </button>

              <button
                type="button"
                onClick={() => setSelectedDeviceTab('tablet')}
                className={`py-2 px-3 rounded-xl flex items-center justify-center gap-1.5 transition-all ${
                  selectedDeviceTab === 'tablet'
                    ? 'bg-white text-blue-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Tablet className="w-4 h-4" />
                <span>Планшет кассы</span>
              </button>

              <button
                type="button"
                onClick={() => setSelectedDeviceTab('pc')}
                className={`py-2 px-3 rounded-xl flex items-center justify-center gap-1.5 transition-all ${
                  selectedDeviceTab === 'pc'
                    ? 'bg-white text-blue-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Laptop className="w-4 h-4" />
                <span>ПК / Ноутбук</span>
              </button>
            </div>

            {/* Tab Details */}
            <div className="p-4 rounded-2xl bg-white border border-slate-200 text-xs space-y-3 shadow-2xs">
              {selectedDeviceTab === 'phone' && (
                <div className="space-y-2">
                  <div className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center text-[11px] shrink-0 mt-0.5">
                      1
                    </span>
                    <p className="text-slate-700">
                      Откройте стандартную камеру на телефоне (Android или iPhone) и наведите на QR-код выше.
                    </p>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center text-[11px] shrink-0 mt-0.5">
                      2
                    </span>
                    <p className="text-slate-700">
                      Нажмите на появившуюся ссылку желтого или синего цвета — откроется веб-касса.
                    </p>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center text-[11px] shrink-0 mt-0.5">
                      3
                    </span>
                    <p className="text-slate-700">
                      <strong>Как сделать иконку на рабочий стол:</strong> в меню браузера (на Android — три точки `⋮`, на iPhone — кнопка «Поделиться») выберите <em>«Добавить на главный экран»</em>.
                    </p>
                  </div>
                </div>
              )}

              {selectedDeviceTab === 'tablet' && (
                <div className="space-y-2">
                  <div className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center text-[11px] shrink-0 mt-0.5">
                      1
                    </span>
                    <p className="text-slate-700">
                      Планшет — идеальное решение для стойки кассира. Откройте на нем ссылку или отсканируйте QR-код.
                    </p>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center text-[11px] shrink-0 mt-0.5">
                      2
                    </span>
                    <p className="text-slate-700">
                      Интерфейс автоматически подстроится под диагональ планшета: большие кнопки товаров и удобная сенсорная корзина.
                    </p>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center text-[11px] shrink-0 mt-0.5">
                      3
                    </span>
                    <p className="text-slate-700">
                      Камеру планшета можно использовать как встроенный оптический сканер штрихкодов.
                    </p>
                  </div>
                </div>
              )}

              {selectedDeviceTab === 'pc' && (
                <div className="space-y-2">
                  <div className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center text-[11px] shrink-0 mt-0.5">
                      1
                    </span>
                    <p className="text-slate-700">
                      Отправьте ссылку себе в Telegram, WhatsApp или по почте и откройте ее на рабочем компьютере.
                    </p>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center text-[11px] shrink-0 mt-0.5">
                      2
                    </span>
                    <p className="text-slate-700">
                      Поддерживается любой браузер (Google Chrome, Яндекс.Браузер, Microsoft Edge, Safari).
                    </p>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center text-[11px] shrink-0 mt-0.5">
                      3
                    </span>
                    <p className="text-slate-700">
                      К компьютеру можно подключить проводной USB-сканер штрихкодов и офисный или чековый термопринтер для печати чеков.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Offline & Cloud Note */}
          <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs flex items-center gap-3">
            <Wifi className="w-5 h-5 text-emerald-600 shrink-0" />
            <div className="leading-snug">
              <span className="font-bold">Мгновенная синхронизация:</span>
              <p className="text-emerald-800 text-[11px] mt-0.5">
                Все товары, настройки и складские остатки работают согласованно на всех устройствах.
              </p>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-3 shrink-0">
          <button
            type="button"
            onClick={handleOpenInNewTab}
            className="text-xs font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1.5 transition-colors"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span>Открыть в новой вкладке</span>
          </button>

          <button
            id="close-connect-modal-bottom-btn"
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs transition-colors shadow-xs"
          >
            Понятно, закрыть
          </button>
        </div>
      </div>
    </div>
  );
}
