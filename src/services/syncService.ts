import { localDB } from './localDB';
import { SyncStatus, Product, Sale, InventoryLog } from '../types';

type SyncListener = (status: SyncStatus) => void;

class SyncService {
  private listeners: Set<SyncListener> = new Set();
  private isSyncing: boolean = false;
  private syncTimer: number | null = null;
  private serverConnected: boolean = true;

  constructor() {
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => this.handleNetworkChange());
      window.addEventListener('offline', () => this.handleNetworkChange());

      // Initial check & periodic sync
      this.startPeriodicSync();
    }
  }

  public subscribe(listener: SyncListener): () => void {
    this.listeners.add(listener);
    listener(this.getStatus());
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify() {
    const status = this.getStatus();
    this.listeners.forEach(fn => fn(status));
  }

  public getStatus(): SyncStatus {
    const isSimulatedOffline = localDB.getSimulatedOffline();
    const isNativeOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
    const isOnline = isNativeOnline && !isSimulatedOffline;
    const pendingSales = localDB.getPendingSales();
    const pendingAdjustments = localDB.getPendingAdjustments();

    return {
      isOnline,
      isSimulatedOffline,
      isSyncing: this.isSyncing,
      lastSyncTime: localDB.getLastSyncTime(),
      pendingSalesCount: pendingSales.length,
      pendingAdjustmentsCount: pendingAdjustments.length,
      serverConnected: this.serverConnected
    };
  }

  public setSimulatedOffline(offline: boolean) {
    localDB.setSimulatedOffline(offline);
    this.notify();
    if (!offline) {
      // Auto-trigger sync when back online
      this.syncNow();
    }
  }

  private handleNetworkChange() {
    this.notify();
    if (this.getStatus().isOnline) {
      this.syncNow();
    }
  }

  private startPeriodicSync() {
    if (this.syncTimer) clearInterval(this.syncTimer);
    // Sync every 20 seconds if online
    this.syncTimer = window.setInterval(() => {
      if (this.getStatus().isOnline && !this.isSyncing) {
        this.syncNow(true);
      }
    }, 20000);
  }

  public async checkHealth(): Promise<boolean> {
    if (!this.getStatus().isOnline) return false;
    try {
      const res = await fetch('/api/health', { method: 'GET', signal: AbortSignal.timeout(3000) });
      this.serverConnected = res.ok;
      return res.ok;
    } catch {
      this.serverConnected = false;
      return false;
    }
  }

  public async syncNow(silent: boolean = false): Promise<{ success: boolean; message: string }> {
    const status = this.getStatus();
    if (!status.isOnline) {
      return { success: false, message: 'Устройство находится в офлайн-режиме' };
    }

    if (this.isSyncing) {
      return { success: false, message: 'Синхронизация уже выполняется...' };
    }

    this.isSyncing = true;
    this.notify();

    try {
      const pendingSales = localDB.getPendingSales();
      const pendingAdjustments = localDB.getPendingAdjustments();
      const clientProducts = localDB.getProducts();
      const clientSales = localDB.getSales();

      const response = await fetch('/api/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pendingSales,
          pendingAdjustments,
          clientProducts,
          clientSales,
        }),
        signal: AbortSignal.timeout(10000)
      });

      if (!response.ok) {
        throw new Error(`Server returned status ${response.status}`);
      }

      const data: {
        success: boolean;
        appliedSalesCount: number;
        appliedAdjustmentsCount: number;
        serverTime: string;
        products: Product[];
        sales: Sale[];
        inventoryLogs: InventoryLog[];
      } = await response.json();

      // Successfully synced with server
      const syncedSaleIds = pendingSales.map(s => s.id);
      localDB.markSalesSynced(syncedSaleIds);
      localDB.removePendingSales(syncedSaleIds);
      const syncedAdjIds = pendingAdjustments.map(a => a.id);
      localDB.removePendingAdjustments(syncedAdjIds);

      // 1. Merge and save sales: preserve all local sales and apply server ones
      if (data.sales && Array.isArray(data.sales)) {
        const localSales = localDB.getSales();
        const salesMap = new Map<string, Sale>();
        
        // Populate with valid server sales (all marked synced)
        data.sales
          .filter(s => s && s.id && s.receiptNumber && Array.isArray(s.items))
          .forEach(s => salesMap.set(s.id, { ...s, synced: true }));
        
        // Ensure every local sale is retained (never wipe out user sales)
        localSales.forEach(s => {
          if (!salesMap.has(s.id)) {
            salesMap.set(s.id, s);
          } else {
            const serverSale = salesMap.get(s.id)!;
            salesMap.set(s.id, { ...serverSale, synced: true });
          }
        });

        const mergedSales = Array.from(salesMap.values()).sort(
          (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
        );
        localDB.saveSales(mergedSales);
      }

      // 2. Merge products: update products with server's confirmed stock while protecting fresh local sales
      if (data.products && Array.isArray(data.products)) {
        const localProducts = localDB.getProducts();
        const productsMap = new Map<string, Product>();
        data.products.forEach(p => productsMap.set(p.id, p));

        localProducts.forEach(lp => {
          if (!productsMap.has(lp.id)) {
            productsMap.set(lp.id, lp);
          } else {
            const serverProd = productsMap.get(lp.id)!;
            const localTime = new Date(lp.updatedAt || 0).getTime();
            const serverTime = new Date(serverProd.updatedAt || 0).getTime();
            // If local product has newer or equal update timestamp, keep local stock
            if (localTime >= serverTime) {
              productsMap.set(lp.id, {
                ...serverProd,
                stock: lp.stock,
                updatedAt: lp.updatedAt
              });
            }
          }
        });
        localDB.saveProducts(Array.from(productsMap.values()));
      }

      // 3. Merge inventory logs
      if (data.inventoryLogs && Array.isArray(data.inventoryLogs)) {
        const localLogs = localDB.getInventoryLogs();
        const logsMap = new Map<string, InventoryLog>();
        data.inventoryLogs.forEach(l => logsMap.set(l.id, { ...l, synced: true }));
        localLogs.forEach(ll => {
          if (!logsMap.has(ll.id)) {
            logsMap.set(ll.id, ll);
          }
        });
        const mergedLogs = Array.from(logsMap.values()).sort(
          (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
        );
        localDB.saveInventoryLogs(mergedLogs);
      }

      const nowStr = new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      localDB.setLastSyncTime(nowStr);
      this.serverConnected = true;

      const msg = `Синхронизация успешна. Отправлено чеков: ${pendingSales.length}, корректировок: ${pendingAdjustments.length}`;
      return { success: true, message: msg };
    } catch (err: any) {
      console.warn('Sync failed:', err);
      this.serverConnected = false;
      return { success: false, message: 'Не удалось связаться с облачным сервером: ' + (err.message || 'Ошибка сети') };
    } finally {
      this.isSyncing = false;
      this.notify();
    }
  }
}

export const syncService = new SyncService();
