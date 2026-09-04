import React, { useState } from 'react';
import { X, Store, Database, Cloud, RefreshCw, CheckCircle2, ShieldCheck, Download, Trash2, KeyRound, Lock, Unlock, ShieldAlert } from 'lucide-react';
import { localDB } from '../services/localDB';
import { syncService } from '../services/syncService';
import { SyncStatus } from '../types';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  syncStatus: SyncStatus;
  onStoreUpdated: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  syncStatus,
  onStoreUpdated,
}) => {
  const [storeInfo, setStoreInfo] = useState(localDB.getStoreInfo());
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [syncFeedback, setSyncFeedback] = useState<string | null>(null);

  // Developer Security Mode State
  const [isDevUnlocked, setIsDevUnlocked] = useState(localDB.isDeveloperUnlocked());
  const [masterKeyInput, setMasterKeyInput] = useState('');
  const [newMasterKeyInput, setNewMasterKeyInput] = useState('');
  const [devSecurityFeedback, setDevSecurityFeedback] = useState<string | null>(null);
  const [showKeyForm, setShowKeyForm] = useState(false);

  if (!isOpen) return null;

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    localDB.saveStoreInfo(storeInfo);
    setSavedSuccess(true);
    onStoreUpdated();
    setTimeout(() => setSavedSuccess(false), 2000);
  };

  const handleForceSync = async () => {
    setSyncFeedback('Выполняется синхронизация...');
    const res = await syncService.syncNow();
    setSyncFeedback(res.message);
    setTimeout(() => setSyncFeedback(null), 4000);
  };

  const handleExportBackup = () => {
    const backup = {
      products: localDB.getProducts(),
      sales: localDB.getSales(),
      logs: localDB.getInventoryLogs(),
      storeInfo: localDB.getStoreInfo(),
      exportedAt: new Date().toISOString()
    };
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Резервная_копия_POS_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div id="settings-modal-backdrop" className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
      <div id="settings-modal-content" className="w-full max-w-lg bg-neutral-900 border border-neutral-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-800">
          <div className="flex items-center gap-2">
            <Store className="w-5 h-5 text-emerald-400" />
            <h3 className="font-bold text-neutral-100 text-base">Настройки кассы и синхронизации</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-neutral-400 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto space-y-6">
          {/* Cloud & Local Storage Status Card */}
          <div className="bg-neutral-950 border border-neutral-800 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Database className="w-4 h-4 text-blue-400" />
                <span className="text-xs font-bold text-neutral-200">Локальная база данных (Offline First)</span>
              </div>
              <span className="text-[11px] px-2 py-0.5 rounded-md bg-emerald-950 text-emerald-300 border border-emerald-800/60 font-semibold">
                Активна
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs text-neutral-400 pt-1 border-t border-neutral-800/60">
              <div>
                <span>Ожидает отправки в облако:</span>
                <span className="font-bold text-white block">
                  {syncStatus.pendingSalesCount} чеков, {syncStatus.pendingAdjustmentsCount} движений
                </span>
              </div>
              <div>
                <span>Последняя синхронизация:</span>
                <span className="font-bold text-white block font-mono">
                  {syncStatus.lastSyncTime || 'Только что'}
                </span>
              </div>
            </div>

            <div className="pt-2 flex items-center gap-2">
              <button
                id="force-sync-btn"
                type="button"
                onClick={handleForceSync}
                disabled={syncStatus.isSyncing}
                className="flex-1 py-2 px-3 bg-neutral-800 hover:bg-neutral-700 disabled:opacity-50 text-neutral-200 text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 transition-colors"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${syncStatus.isSyncing ? 'animate-spin' : ''}`} />
                <span>{syncStatus.isSyncing ? 'Синхронизация...' : 'Синхронизировать сейчас'}</span>
              </button>

              <button
                id="export-backup-btn"
                type="button"
                onClick={handleExportBackup}
                className="py-2 px-3 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 transition-colors"
                title="Скачать полную резервную копию JSON"
              >
                <Download className="w-3.5 h-3.5 text-emerald-400" />
                <span>Бэкап JSON</span>
              </button>
            </div>

            {syncFeedback && (
              <p className="text-xs text-emerald-400 text-center bg-emerald-950/40 p-2 rounded-lg border border-emerald-800/40">
                {syncFeedback}
              </p>
            )}
          </div>

          {/* Store & Fiscal Header Details Form */}
          <form onSubmit={handleSave} className="space-y-3.5">
            <h4 className="text-xs font-bold text-neutral-300 uppercase tracking-wider">
              Реквизиты торговой точки (для чеков и отчетов):
            </h4>

            <div>
              <label className="text-xs text-neutral-400 block mb-1">Название магазина / компании:</label>
              <input
                type="text"
                value={storeInfo.storeName}
                onChange={(e) => setStoreInfo({ ...storeInfo, storeName: e.target.value })}
                className="w-full px-3 py-2 bg-neutral-950 border border-neutral-700 rounded-xl text-xs text-white outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="text-xs text-neutral-400 block mb-1">Адрес торгового зала:</label>
              <input
                type="text"
                value={storeInfo.address}
                onChange={(e) => setStoreInfo({ ...storeInfo, address: e.target.value })}
                className="w-full px-3 py-2 bg-neutral-950 border border-neutral-700 rounded-xl text-xs text-white outline-none focus:border-emerald-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-neutral-400 block mb-1">ИНН организации:</label>
                <input
                  type="text"
                  value={storeInfo.inn}
                  onChange={(e) => setStoreInfo({ ...storeInfo, inn: e.target.value })}
                  className="w-full px-3 py-2 bg-neutral-950 border border-neutral-700 rounded-xl text-xs text-white font-mono outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="text-xs text-neutral-400 block mb-1">Кассир по умолчанию:</label>
                <input
                  type="text"
                  value={storeInfo.cashier}
                  onChange={(e) => setStoreInfo({ ...storeInfo, cashier: e.target.value })}
                  className="w-full px-3 py-2 bg-neutral-950 border border-neutral-700 rounded-xl text-xs text-white outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            {savedSuccess && (
              <p className="text-xs text-emerald-400 flex items-center gap-1.5 justify-center">
                <CheckCircle2 className="w-4 h-4" /> Реквизиты сохранены!
              </p>
            )}

            <button
              id="save-settings-btn"
              type="submit"
              className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl transition-colors shadow-sm"
            >
              Сохранить изменения
            </button>
          </form>

          {/* Developer Loyalty Security Section */}
          <div className="bg-neutral-950 border border-neutral-800 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-amber-400" />
                <span className="text-xs font-bold text-neutral-200">
                  Безопасность лояльности (Режим разработчика)
                </span>
              </div>
              <span className={`text-[11px] px-2 py-0.5 rounded-md font-semibold flex items-center gap-1 ${
                isDevUnlocked
                  ? 'bg-emerald-950 text-emerald-300 border border-emerald-800/60'
                  : 'bg-amber-950 text-amber-300 border border-amber-800/60'
              }`}>
                {isDevUnlocked ? <Unlock className="w-3 h-3" /> : <Lock className="w-3 h-3" />}
                {isDevUnlocked ? 'Разблокирован' : 'Защита включена'}
              </span>
            </div>

            <p className="text-[11px] text-neutral-400 leading-relaxed">
              Ручная правка бонусного баланса и персональной скидки клиентов строго ограничена разработчиком.
              Кассиры и администраторы не могут злоупотреблять начислением баллов.
            </p>

            {devSecurityFeedback && (
              <p className="text-xs text-amber-300 bg-amber-950/40 p-2 rounded-lg border border-amber-800/40">
                {devSecurityFeedback}
              </p>
            )}

            {!isDevUnlocked ? (
              <div className="space-y-2">
                <div className="flex gap-2">
                  <input
                    type="password"
                    placeholder="Мастер-код разработчика..."
                    value={masterKeyInput}
                    onChange={e => setMasterKeyInput(e.target.value)}
                    className="flex-1 px-3 py-1.5 bg-neutral-900 border border-neutral-700 rounded-lg text-xs text-white outline-none focus:border-amber-500 font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (localDB.verifyDeveloperKey(masterKeyInput)) {
                        setIsDevUnlocked(true);
                        setMasterKeyInput('');
                        setDevSecurityFeedback('Режим разработчика активирован.');
                        setTimeout(() => setDevSecurityFeedback(null), 3500);
                      } else {
                        setDevSecurityFeedback('Неверный мастер-код разработчика!');
                      }
                    }}
                    className="px-3 py-1.5 bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs rounded-lg transition-colors"
                  >
                    Войти
                  </button>
                </div>
                <span className="text-[10px] text-neutral-500 block">
                  Мастер-код по умолчанию: 7788
                </span>
              </div>
            ) : (
              <div className="space-y-3 pt-1 border-t border-neutral-800">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-emerald-400 font-medium">
                    Доступ разработчика активен
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      localDB.setDeveloperUnlocked(false);
                      setIsDevUnlocked(false);
                      setDevSecurityFeedback('Режим разработчика заблокирован.');
                      setTimeout(() => setDevSecurityFeedback(null), 3000);
                    }}
                    className="px-2.5 py-1 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-white rounded-lg text-xs transition-colors"
                  >
                    Заблокировать
                  </button>
                </div>

                {!showKeyForm ? (
                  <button
                    type="button"
                    onClick={() => setShowKeyForm(true)}
                    className="text-xs text-amber-400 hover:underline flex items-center gap-1 font-medium"
                  >
                    <KeyRound className="w-3.5 h-3.5" />
                    <span>Сменить мастер-код разработчика</span>
                  </button>
                ) : (
                  <div className="space-y-2 bg-neutral-900/80 p-2.5 rounded-lg border border-neutral-800">
                    <label className="text-[11px] text-neutral-300 block font-semibold">
                      Новый мастер-код:
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="Минимум 4 символа"
                        value={newMasterKeyInput}
                        onChange={e => setNewMasterKeyInput(e.target.value)}
                        className="flex-1 px-3 py-1.5 bg-neutral-950 border border-neutral-700 rounded-lg text-xs text-white outline-none focus:border-amber-500 font-mono"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          if (newMasterKeyInput.trim().length >= 4) {
                            localDB.setDeveloperMasterKey(newMasterKeyInput.trim());
                            setNewMasterKeyInput('');
                            setShowKeyForm(false);
                            setDevSecurityFeedback('Новый мастер-код сохранен!');
                            setTimeout(() => setDevSecurityFeedback(null), 3000);
                          } else {
                            setDevSecurityFeedback('Код должен быть от 4 символов');
                          }
                        }}
                        className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-lg transition-colors"
                      >
                        Сохранить
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowKeyForm(false)}
                        className="px-2.5 py-1.5 bg-neutral-800 text-neutral-300 rounded-lg text-xs"
                      >
                        Отмена
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
