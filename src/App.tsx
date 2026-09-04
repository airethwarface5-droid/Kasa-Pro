import React, { useState, useEffect } from 'react';
import {
  ShoppingCart,
  Package,
  BarChart3,
  Cloud,
  CloudOff,
  RefreshCw,
  Settings,
  Store,
  Wifi,
  WifiOff,
  FileText,
  MonitorPlay,
  QrCode,
  Smartphone
} from 'lucide-react';
import { POSView } from './components/POSView';
import { InventoryView } from './components/InventoryView';
import { AnalyticsView } from './components/AnalyticsView';
import { SettingsModal } from './components/SettingsModal';
import { PresentationModal } from './components/PresentationModal';
import { ConnectDeviceModal } from './components/ConnectDeviceModal';
import { localDB } from './services/localDB';
import { syncService } from './services/syncService';
import { Product, Sale, InventoryLog, SyncStatus } from './types';

export default function App() {
  const [activeTab, setActiveTab] = useState<'pos' | 'inventory' | 'analytics'>('pos');
  const [products, setProducts] = useState<Product[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [logs, setLogs] = useState<InventoryLog[]>([]);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>(syncService.getStatus());
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isPresentationOpen, setIsPresentationOpen] = useState(false);
  const [isConnectDeviceOpen, setIsConnectDeviceOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Initialize data and sync subscription
  useEffect(() => {
    // Initial local read
    refreshLocalState();

    // Subscribe to sync service events
    const unsubscribe = syncService.subscribe((status) => {
      setSyncStatus(status);
      refreshLocalState();
    });

    // Check backend health & perform initial sync
    syncService.checkHealth().then((connected) => {
      if (connected) {
        syncService.syncNow(true);
      }
    });

    return () => {
      unsubscribe();
    };
  }, []);

  const refreshLocalState = () => {
    setProducts(localDB.getProducts());
    setSales(localDB.getSales());
    setLogs(localDB.getInventoryLogs());
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Handlers for POS and Inventory
  const handleSaleCompleted = (newSale: Sale) => {
    const isOffline = !syncStatus.isOnline;
    localDB.addSale(newSale, isOffline);
    refreshLocalState();

    if (!isOffline) {
      syncService.syncNow().then((res) => {
        refreshLocalState();
        if (res.success) {
          showToast(`Чек ${newSale.receiptNumber} сохранен и синхронизирован с облаком!`);
        }
      });
    } else {
      showToast(`Чек ${newSale.receiptNumber} сохранен локально в офлайн-базе! Будет синхронизирован при сети.`);
    }
  };

  const handleSaveProduct = (prod: Product) => {
    const isOffline = !syncStatus.isOnline;
    const updated = localDB.saveProduct(prod);
    localDB.addInventoryLog({
      id: 'log-' + Date.now().toString(36),
      productId: prod.id,
      productName: prod.name,
      type: 'adjustment',
      delta: 0,
      newStock: prod.stock,
      reason: 'Добавление / изменение номенклатуры в каталоге',
      timestamp: new Date().toISOString(),
      synced: !isOffline
    }, isOffline);

    setProducts(updated);
    refreshLocalState();

    if (!isOffline) syncService.syncNow();
    showToast(`Товар "${prod.name}" сохранен!`);
  };

  const handleDeleteProduct = (id: string) => {
    const updated = localDB.deleteProduct(id);
    setProducts(updated);
    refreshLocalState();
    if (syncStatus.isOnline) syncService.syncNow();
    showToast('Товар удален из каталога');
  };

  const handleAdjustStock = (
    productId: string,
    type: 'restock' | 'write_off' | 'adjustment' | 'audit',
    delta?: number,
    newStock?: number,
    reason?: string
  ) => {
    const isOffline = !syncStatus.isOnline;
    const currentProducts = localDB.getProducts();
    const prod = currentProducts.find(p => p.id === productId);
    if (!prod) return;

    let targetStock = prod.stock;
    let targetDelta = delta || 0;

    if (typeof newStock === 'number') {
      targetDelta = newStock - prod.stock;
      targetStock = newStock;
    } else if (typeof delta === 'number') {
      targetStock = Math.max(0, prod.stock + delta);
      targetDelta = delta;
    }

    prod.stock = targetStock;
    prod.updatedAt = new Date().toISOString();
    localDB.saveProducts(currentProducts);

    localDB.addInventoryLog({
      id: 'log-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 6),
      productId: prod.id,
      productName: prod.name,
      type,
      delta: targetDelta,
      newStock: targetStock,
      reason: reason || 'Корректировка остатка на складе',
      timestamp: new Date().toISOString(),
      synced: false
    }, true);

    refreshLocalState();
    if (!isOffline) {
      syncService.syncNow().then(() => refreshLocalState());
    }
  };

  const handleToggleOfflineSimulation = () => {
    const nextState = !syncStatus.isSimulatedOffline;
    syncService.setSimulatedOffline(nextState);
    if (nextState) {
      showToast('Включен режим офлайн. Продажи будут сохраняться в локальную базу данных.');
    } else {
      showToast('Офлайн-режим отключен. Запущена автоматическая синхронизация с облаком!');
    }
  };

  const pendingCount = syncStatus.pendingSalesCount + syncStatus.pendingAdjustmentsCount;

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#f1f5f9] text-slate-800 font-sans selection:bg-blue-500/20 selection:text-blue-900">
      {/* Sleek Bento Dark Slate Sidebar (Desktop / Tablet) */}
      <aside className="w-64 bg-slate-900 text-slate-300 flex-col border-r border-slate-800 shrink-0 hidden md:flex select-none">
        {/* Brand Logo & Store Header */}
        <div className="p-5 lg:p-6 flex items-center gap-3 border-b border-slate-800/80">
          <div className="w-9 h-9 bg-blue-600 rounded-xl flex items-center justify-center text-white font-black text-xl shadow-md shadow-blue-500/20">
            K
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <span className="text-white font-bold text-lg tracking-tight leading-none">
                KASSA PRO
              </span>
              <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-400 border border-blue-500/30">
                POS
              </span>
            </div>
            <p className="text-[11px] text-slate-400 truncate mt-1">
              {localDB.getStoreInfo().storeName || 'Торговая точка'}
            </p>
          </div>
        </div>

        {/* Bento Nav Tabs */}
        <nav className="flex-1 px-4 py-4 space-y-2 overflow-y-auto">
          <button
            id="nav-pos"
            type="button"
            onClick={() => setActiveTab('pos')}
            className={`w-full flex items-center gap-3 p-3 rounded-2xl text-sm font-semibold transition-all ${
              activeTab === 'pos'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-600/25 border border-blue-500'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/70 border border-transparent'
            }`}
          >
            <ShoppingCart className={`w-5 h-5 ${activeTab === 'pos' ? 'text-white' : 'text-slate-400'}`} />
            <span>Касса (Продажи)</span>
          </button>

          <button
            id="nav-inventory"
            type="button"
            onClick={() => setActiveTab('inventory')}
            className={`w-full flex items-center gap-3 p-3 rounded-2xl text-sm font-semibold transition-all ${
              activeTab === 'inventory'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-600/25 border border-blue-500'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/70 border border-transparent'
            }`}
          >
            <Package className={`w-5 h-5 ${activeTab === 'inventory' ? 'text-white' : 'text-slate-400'}`} />
            <span>Инвентарь и Склад</span>
          </button>

          <button
            id="nav-analytics"
            type="button"
            onClick={() => setActiveTab('analytics')}
            className={`w-full flex items-center gap-3 p-3 rounded-2xl text-sm font-semibold transition-all ${
              activeTab === 'analytics'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-600/25 border border-blue-500'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/70 border border-transparent'
            }`}
          >
            <BarChart3 className={`w-5 h-5 ${activeTab === 'analytics' ? 'text-white' : 'text-slate-400'}`} />
            <span>Аналитика & Отчеты</span>
          </button>

          <button
            id="nav-presentation-btn"
            type="button"
            onClick={() => setIsPresentationOpen(true)}
            className="w-full flex items-center gap-3 p-3 rounded-2xl text-sm font-semibold text-slate-300 hover:text-white hover:bg-blue-600/20 hover:border-blue-500/40 transition-all border border-transparent group"
          >
            <MonitorPlay className="w-5 h-5 text-blue-400 group-hover:text-blue-300 transition-colors" />
            <div className="text-left leading-tight">
              <span>Презентация системы</span>
              <span className="block text-[10px] text-slate-400 font-normal">Слайды & Документ</span>
            </div>
          </button>

          <button
            id="nav-connect-device-btn"
            type="button"
            onClick={() => setIsConnectDeviceOpen(true)}
            className="w-full flex items-center gap-3 p-3 rounded-2xl text-sm font-semibold text-emerald-300 hover:text-white hover:bg-emerald-600/20 hover:border-emerald-500/40 transition-all border border-transparent group"
          >
            <QrCode className="w-5 h-5 text-emerald-400 group-hover:text-emerald-300 transition-colors" />
            <div className="text-left leading-tight">
              <span>Другое устройство</span>
              <span className="block text-[10px] text-emerald-400/80 font-normal">QR-код & Ссылка</span>
            </div>
          </button>

          <button
            id="nav-settings-btn"
            type="button"
            onClick={() => setIsSettingsOpen(true)}
            className="w-full flex items-center gap-3 p-3 rounded-2xl text-sm font-semibold text-slate-400 hover:text-slate-200 hover:bg-slate-800/70 transition-all border border-transparent"
          >
            <Settings className="w-5 h-5 text-slate-400" />
            <span>Настройки кассы</span>
          </button>
        </nav>

        {/* Bottom Bento Status Card (exact match from Bento Design) */}
        <div className="p-4 mt-auto">
          <div className="bg-slate-800/90 rounded-2xl p-4 border border-slate-700/60 shadow-xs space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase tracking-wider font-bold text-slate-400">
                Статус синхронизации
              </span>
              <div
                className={`w-2.5 h-2.5 rounded-full ${
                  syncStatus.isOnline
                    ? 'bg-emerald-500 shadow-[0_0_8px_#10b981]'
                    : 'bg-amber-400 shadow-[0_0_8px_#fbbf24]'
                }`}
              />
            </div>

            <div className="text-xs">
              <p className="text-slate-300 font-medium">
                {syncStatus.isOnline ? 'Облако: Активно' : 'Режим: Офлайн (Локально)'}
              </p>
              <p className="text-[10px] text-slate-400">
                {pendingCount > 0 ? `В очереди: ${pendingCount} операций` : 'Все данные синхронизированы'}
              </p>
            </div>

            <div className="flex items-center gap-2 pt-1">
              <button
                id="toggle-offline-btn"
                type="button"
                onClick={handleToggleOfflineSimulation}
                className="flex-1 py-1.5 px-2 bg-slate-700/80 hover:bg-slate-700 text-slate-200 text-[11px] font-semibold rounded-xl transition-colors text-center"
              >
                {syncStatus.isOnline ? 'Тест офлайн' : 'Включить сеть'}
              </button>

              <button
                id="header-sync-btn"
                type="button"
                disabled={syncStatus.isSyncing || !syncStatus.isOnline}
                onClick={() => syncService.syncNow().then(res => showToast(res.message))}
                title="Синхронизировать сейчас"
                className="p-1.5 bg-slate-700/80 hover:bg-slate-700 disabled:opacity-40 text-slate-200 rounded-xl transition-colors"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${syncStatus.isSyncing ? 'animate-spin text-blue-400' : ''}`} />
              </button>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Container Area */}
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        {/* Top Bento Header Bar */}
        <header className="m-3 sm:m-4 md:m-6 mb-0 flex items-center justify-between bg-white px-4 sm:px-6 py-3 rounded-2xl sm:rounded-3xl shadow-sm border border-slate-200/90 shrink-0 gap-3">
          {/* Mobile Brand / View Title & Nav */}
          <div className="flex items-center gap-2.5">
            <div className="md:hidden w-8 h-8 bg-blue-600 rounded-xl flex items-center justify-center text-white font-bold text-base shadow-sm">
              K
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold text-slate-800 leading-tight">
                {activeTab === 'pos' && 'Кассовый терминал'}
                {activeTab === 'inventory' && 'Складской учет & Номенклатура'}
                {activeTab === 'analytics' && 'Финансовая аналитика & Продажи'}
              </h2>
              <p className="text-[11px] text-slate-500 hidden sm:block">
                Система быстрых расчетов и контроля остатков
              </p>
            </div>
          </div>

          {/* Center Mobile Nav Switcher (only on mobile screens) */}
          <div className="md:hidden flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200">
            <button
              onClick={() => setActiveTab('pos')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                activeTab === 'pos' ? 'bg-blue-600 text-white' : 'text-slate-600'
              }`}
            >
              Касса
            </button>
            <button
              onClick={() => setActiveTab('inventory')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                activeTab === 'inventory' ? 'bg-blue-600 text-white' : 'text-slate-600'
              }`}
            >
              Склад
            </button>
            <button
              onClick={() => setActiveTab('analytics')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                activeTab === 'analytics' ? 'bg-blue-600 text-white' : 'text-slate-600'
              }`}
            >
              Отчеты
            </button>
          </div>

          {/* Right Bento Status Block: Shift & Cashier */}
          <div className="flex items-center gap-3">
            <div className="text-right hidden sm:block">
              <p className="text-[10px] text-slate-400 uppercase font-bold tracking-widest leading-none">
                Текущая смена
              </p>
              <p className="text-xs sm:text-sm font-bold text-slate-700 mt-0.5">
                {localDB.getStoreInfo().cashier || 'Анна К.'} {syncStatus.isOnline ? '' : '(ОФЛАЙН)'}
              </p>
            </div>

            {/* Avatar Pill */}
            <div className="w-9 h-9 sm:w-10 sm:h-10 bg-gradient-to-tr from-blue-600 to-indigo-600 text-white font-bold rounded-2xl flex items-center justify-center text-sm shadow-xs border-2 border-white">
              {(localDB.getStoreInfo().cashier || 'АК').slice(0, 2).toUpperCase()}
            </div>

            {/* Presentation Deck Trigger Button */}
            <button
              id="open-presentation-btn"
              type="button"
              onClick={() => setIsPresentationOpen(true)}
              title="Открыть интерактивную презентацию функционала программы"
              className="px-2.5 sm:px-3 py-1.5 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 text-xs font-bold flex items-center gap-1.5 transition-colors shadow-2xs"
            >
              <MonitorPlay className="w-4 h-4 text-blue-600 shrink-0" />
              <span className="hidden sm:inline">Презентация</span>
            </button>

            {/* Connect Another Device Button */}
            <button
              id="open-connect-device-btn"
              type="button"
              onClick={() => setIsConnectDeviceOpen(true)}
              title="Открыть кассу на другом устройстве по QR-коду или ссылке"
              className="px-2.5 sm:px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-xs font-bold flex items-center gap-1.5 transition-colors shadow-2xs"
            >
              <QrCode className="w-4 h-4 text-emerald-600 shrink-0" />
              <span className="hidden sm:inline">QR кассы</span>
            </button>

            {/* Settings Trigger Button for mobile/tablet */}
            <button
              id="open-settings-btn"
              type="button"
              onClick={() => setIsSettingsOpen(true)}
              title="Настройки магазина и синхронизации"
              className="w-9 h-9 rounded-xl bg-slate-100 hover:bg-slate-200 border border-slate-200 flex items-center justify-center text-slate-600 transition-colors"
            >
              <Settings className="w-4 h-4" />
            </button>
          </div>
        </header>

        {/* Main View Area */}
        <main className="flex-1 p-3 sm:p-4 md:p-6 overflow-hidden flex flex-col relative">
          {activeTab === 'pos' && (
            <POSView
              products={products}
              onSaleCompleted={handleSaleCompleted}
              isOnline={syncStatus.isOnline}
            />
          )}

          {activeTab === 'inventory' && (
            <InventoryView
              products={products}
              logs={logs}
              onSaveProduct={handleSaveProduct}
              onDeleteProduct={handleDeleteProduct}
              onAdjustStock={handleAdjustStock}
            />
          )}

          {activeTab === 'analytics' && (
            <AnalyticsView
              sales={sales}
              products={products}
            />
          )}
        </main>
      </div>

      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-5 right-5 z-50 px-4 py-3 bg-slate-900 border border-slate-700 text-white rounded-2xl shadow-xl text-xs flex items-center gap-2.5 animate-fade-in">
          <div className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_#34d399]" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        syncStatus={syncStatus}
        onStoreUpdated={refreshLocalState}
      />

      {/* Interactive Presentation Deck Modal */}
      <PresentationModal
        isOpen={isPresentationOpen}
        onClose={() => setIsPresentationOpen(false)}
      />

      {/* Connect Another Device Modal with Instant QR Code */}
      <ConnectDeviceModal
        isOpen={isConnectDeviceOpen}
        onClose={() => setIsConnectDeviceOpen(false)}
      />
    </div>
  );
}
