import React, { useState, useEffect, useRef } from 'react';
import { Camera, X, Scan, AlertCircle, Sparkles, Check } from 'lucide-react';
import { Html5Qrcode } from 'html5-qrcode';
import { sounds } from '../utils/audio';
import { Product } from '../types';

interface BarcodeScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScan: (barcode: string) => void;
  products: Product[];
}

export const BarcodeScannerModal: React.FC<BarcodeScannerModalProps> = ({
  isOpen,
  onClose,
  onScan,
  products
}) => {
  const [manualCode, setManualCode] = useState('');
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [scanSuccess, setScanSuccess] = useState<string | null>(null);
  const html5QrCodeRef = useRef<Html5Qrcode | null>(null);
  const scannerContainerId = 'interactive-barcode-reader';

  useEffect(() => {
    if (!isOpen) {
      stopCamera();
      setScanSuccess(null);
      setCameraError(null);
      return;
    }

    let isMounted = true;

    const startCamera = async () => {
      try {
        setCameraError(null);
        setIsScanning(true);

        // Wait for container to be rendered
        await new Promise(r => setTimeout(r, 100));
        if (!document.getElementById(scannerContainerId) || !isMounted) return;

        const scanner = new Html5Qrcode(scannerContainerId);
        html5QrCodeRef.current = scanner;

        await scanner.start(
          { facingMode: 'environment' },
          {
            fps: 15,
            qrbox: { width: 260, height: 160 },
            aspectRatio: 1.33
          },
          (decodedText) => {
            handleDetectedCode(decodedText);
          },
          () => {
            // Scanner scanning frame (silent)
          }
        );
      } catch (err: any) {
        console.warn('Camera scanner access issue:', err);
        if (isMounted) {
          setCameraError(
            err?.message?.includes('Permission') || err?.name === 'NotAllowedError'
              ? 'Доступ к камере заблокирован. Разрешите доступ в браузере или используйте ручной ввод/быстрые штрихкоды.'
              : 'Камера недоступна или используется другой программой. Используйте ручной ввод ниже.'
          );
        }
      } finally {
        if (isMounted) setIsScanning(false);
      }
    };

    startCamera();

    return () => {
      isMounted = false;
      stopCamera();
    };
  }, [isOpen]);

  const stopCamera = async () => {
    if (html5QrCodeRef.current) {
      try {
        if (html5QrCodeRef.current.isScanning) {
          await html5QrCodeRef.current.stop();
        }
        html5QrCodeRef.current.clear();
      } catch (e) {
        console.warn('Error stopping scanner:', e);
      }
      html5QrCodeRef.current = null;
    }
  };

  const handleDetectedCode = (code: string) => {
    const trimmed = code.trim();
    if (!trimmed) return;

    const matched = products.find(p => p.barcode === trimmed);
    if (matched) {
      if (matched.stock <= 0) {
        sounds.playErrorBeep();
        setCameraError(`Товар «${matched.name}» закончился на складе!`);
        return;
      }

      // Successful scan: play the short barcode sound signal and show confirmation
      sounds.playScanBeep();
      setScanSuccess(`${matched.name} — ${matched.price} ₽`);

      setTimeout(() => {
        onScan(trimmed);
        stopCamera();
        onClose();
      }, 350);
    } else {
      sounds.playErrorBeep();
      setCameraError(`Штрихкод ${trimmed} не найден в каталоге!`);
    }
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualCode.trim()) return;
    handleDetectedCode(manualCode);
    setManualCode('');
  };

  if (!isOpen) return null;

  return (
    <div id="barcode-scanner-modal-backdrop" className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
      <div id="barcode-scanner-modal-content" className="w-full max-w-lg bg-white border border-slate-200 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/70">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600">
              <Scan className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-800 text-base">Сканирование штрихкода</h3>
              <p className="text-xs text-slate-400">Камера, ручной ввод или быстрый выбор товара</p>
            </div>
          </div>
          <button
            id="close-barcode-scanner-btn"
            onClick={() => {
              stopCamera();
              onClose();
            }}
            className="w-8 h-8 rounded-xl flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-5">
          {/* Camera Viewport */}
          <div className="relative rounded-2xl overflow-hidden bg-slate-950 border border-slate-800 min-h-[200px] flex items-center justify-center">
            <div id={scannerContainerId} className="w-full overflow-hidden" />

            {/* Target Reticle Overlay */}
            {!cameraError && (
              <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                <div className="w-64 h-36 border-2 border-dashed border-blue-400/80 rounded-xl relative flex items-center justify-center">
                  <div className="w-full h-0.5 bg-blue-500 animate-pulse shadow-[0_0_8px_#3b82f6]" />
                  <span className="absolute -bottom-6 text-[11px] text-blue-400 font-bold bg-slate-900/85 px-2.5 py-0.5 rounded-full">
                    Наведите на штрихкод
                  </span>
                </div>
              </div>
            )}

            {scanSuccess && (
              <div className="absolute inset-0 bg-blue-950/85 backdrop-blur-xs flex flex-col items-center justify-center text-blue-200 gap-2 z-10 animate-fade-in">
                <div className="w-12 h-12 rounded-full bg-blue-500/20 border border-blue-400 flex items-center justify-center">
                  <Check className="w-6 h-6 text-blue-400" />
                </div>
                <p className="text-sm font-bold">Штрихкод считан: {scanSuccess}</p>
              </div>
            )}

            {cameraError && (
              <div className="p-6 text-center space-y-2 max-w-sm">
                <AlertCircle className="w-8 h-8 text-amber-400 mx-auto" />
                <p className="text-xs text-amber-200 font-medium">{cameraError}</p>
                <p className="text-[11px] text-slate-400">
                  Вы можете ввести номер штрихкода вручную или выбрать товар из списка быстрого тестирования ниже.
                </p>
              </div>
            )}
          </div>

          {/* Manual Input Form */}
          <form onSubmit={handleManualSubmit} className="space-y-2">
            <label className="text-xs font-bold text-slate-700 block">
              Ручной ввод штрихкода (или сканером с USB/Bluetooth):
            </label>
            <div className="flex gap-2">
              <input
                id="manual-barcode-input"
                type="text"
                value={manualCode}
                onChange={(e) => setManualCode(e.target.value)}
                placeholder="Например: 4607001234567"
                autoFocus
                className="flex-1 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 font-mono tracking-wider"
              />
              <button
                id="submit-manual-barcode-btn"
                type="submit"
                disabled={!manualCode.trim()}
                className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:pointer-events-none text-white text-sm font-bold rounded-xl transition-colors shadow-md shadow-blue-600/20 shrink-0"
              >
                Найти
              </button>
            </div>
          </form>

          {/* Quick Barcode Demo Picker (Immediate testing without hardware scanner) */}
          <div className="space-y-2 pt-2 border-t border-slate-100">
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-500">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              <span>Быстрое тестирование (нажмите для симуляции скана):</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-44 overflow-y-auto pr-1">
              {products.slice(0, 6).map((prod) => (
                <button
                  key={prod.id}
                  id={`demo-scan-${prod.id}`}
                  onClick={() => handleDetectedCode(prod.barcode)}
                  className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 hover:bg-blue-50/70 border border-slate-200 hover:border-blue-300 transition-all text-left group shadow-2xs"
                >
                  <div className="min-w-0 pr-2">
                    <p className="text-xs font-semibold text-slate-800 truncate group-hover:text-blue-700">
                      {prod.name}
                    </p>
                    <p className="text-[11px] text-slate-400 font-mono">
                      {prod.barcode}
                    </p>
                  </div>
                  <span className="text-xs font-black text-slate-900 whitespace-nowrap bg-white px-2.5 py-1 rounded-xl border border-slate-200 font-mono">
                    {prod.price} ₽
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
