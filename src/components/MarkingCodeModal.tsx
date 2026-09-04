import React, { useState } from 'react';
import {
  X,
  QrCode,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Scan,
  Sparkles
} from 'lucide-react';
import { Product } from '../types';
import { sounds } from '../utils/audio';

interface MarkingCodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  product?: Product | null;
  productName?: string;
  onSaveCode?: (code: string) => void;
  onSaveMarkingCode?: (code: string) => void;
}

export const MarkingCodeModal: React.FC<MarkingCodeModalProps> = ({
  isOpen,
  onClose,
  product,
  productName,
  onSaveCode,
  onSaveMarkingCode,
}) => {
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const displayName = productName || product?.name || 'Маркированный товар';
  const displayBarcode = product?.barcode || '4600000000000';

  const handleApply = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = code.trim();
    if (clean.length < 8) {
      setError('Код маркировки DataMatrix слишком короткий');
      sounds.playErrorBeep();
      return;
    }
    sounds.playScanBeep();
    if (onSaveCode) onSaveCode(clean);
    if (onSaveMarkingCode) onSaveMarkingCode(clean);
    setCode('');
    setError(null);
    onClose();
  };

  const handleFillDemoCode = () => {
    const demo = `01${displayBarcode.padEnd(14, '0')}21${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
    setCode(demo);
    setError(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-md bg-white border border-slate-200 rounded-3xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-gradient-to-r from-amber-600 to-yellow-600 text-white shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center">
              <QrCode className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-base leading-tight">Маркировка «Честный ЗНАК»</h3>
              <p className="text-xs text-amber-100">
                Сканирование кода DataMatrix [М]
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

        {/* Form */}
        <form onSubmit={handleApply} className="p-6 space-y-4">
          <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200">
            <span className="text-[10px] uppercase font-bold text-amber-900 block">
              Маркированный товар:
            </span>
            <div className="text-xs font-bold text-slate-900 mt-0.5">
              {displayName}
            </div>
            <div className="text-[11px] text-amber-800 mt-0.5">
              Штрихкод: {displayBarcode} | Требуется код DataMatrix для ФФД 1.2
            </div>
          </div>

          <div>
            <label className="text-[11px] font-bold uppercase text-slate-500 block mb-1">
              Код идентификации (DataMatrix / КМ):
            </label>
            <input
              type="text"
              autoFocus
              value={code}
              onChange={e => {
                setCode(e.target.value);
                setError(null);
              }}
              placeholder="010460...21... (отсканируйте 2D сканером)"
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-mono outline-none focus:bg-white focus:ring-2 focus:ring-amber-500"
            />
            {error && (
              <p className="text-xs text-rose-600 font-semibold mt-1 flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5" />
                <span>{error}</span>
              </p>
            )}
          </div>

          {/* Helper demo generator */}
          <button
            type="button"
            onClick={handleFillDemoCode}
            className="w-full py-2 px-3 rounded-xl border border-dashed border-amber-300 text-amber-700 hover:bg-amber-50 text-xs font-medium flex items-center justify-center gap-1.5 transition-colors"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            <span>Сгенерировать тестовый код Честный ЗНАК</span>
          </button>

          {/* Footer actions */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs"
            >
              Отмена
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs shadow-xs"
            >
              Применить код [М]
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
