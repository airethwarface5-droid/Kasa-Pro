import React, { useState } from 'react';
import {
  TrendingUp,
  BarChart3,
  DollarSign,
  PieChart,
  Calendar,
  Download,
  Receipt,
  CreditCard,
  Banknote,
  QrCode,
  ArrowUpRight,
  Sparkles,
  Layers
} from 'lucide-react';
import { Sale, Product } from '../types';
import { pdfExportService } from '../services/pdfExport';
import { localDB } from '../services/localDB';
import { ReceiptModal } from './ReceiptModal';

interface AnalyticsViewProps {
  sales: Sale[];
  products: Product[];
}

export const AnalyticsView: React.FC<AnalyticsViewProps> = ({ sales = [], products = [] }) => {
  const [timeRange, setTimeRange] = useState<'today' | '7days' | '30days' | 'all'>('7days');
  const [selectedReceipt, setSelectedReceipt] = useState<Sale | null>(null);

  const store = localDB.getStoreInfo();

  // Filter sales by time
  const now = Date.now();
  const safeSales = sales || [];
  const filteredSales = safeSales.filter(s => {
    const saleTime = new Date(s.timestamp).getTime();
    if (timeRange === 'today') {
      const todayStart = new Date().setHours(0, 0, 0, 0);
      return saleTime >= todayStart;
    }
    if (timeRange === '7days') return saleTime >= now - 7 * 86400 * 1000;
    if (timeRange === '30days') return saleTime >= now - 30 * 86400 * 1000;
    return true;
  });

  const rangeLabels = {
    today: 'Сегодня',
    '7days': 'Последние 7 дней',
    '30days': 'Последние 30 дней',
    all: 'Все время'
  };

  // KPI calculations
  const totalRevenue = filteredSales.reduce((acc, s) => acc + (Number(s.total) || 0), 0);
  const totalCost = filteredSales.reduce((acc, s) => {
    return acc + (Array.isArray(s.items) ? s.items.reduce((c, i) => c + ((Number(i.costPrice) || 0) * (Number(i.quantity) || 0)), 0) : 0);
  }, 0);
  const grossProfit = totalRevenue - totalCost;
  const marginPercent = totalRevenue > 0 ? ((grossProfit / totalRevenue) * 100).toFixed(1) : '0';
  const averageCheck = filteredSales.length > 0 ? Math.round(totalRevenue / filteredSales.length) : 0;
  const totalItemsSold = filteredSales.reduce((acc, s) => acc + (Array.isArray(s.items) ? s.items.reduce((q, i) => q + (Number(i.quantity) || 0), 0) : 0), 0);

  // Top Products breakdown
  const productStats: Record<string, { name: string; quantity: number; revenue: number }> = {};
  filteredSales.forEach(s => {
    (s.items || []).forEach(item => {
      const itemName = item?.name || 'Товар';
      const itemQty = Number(item?.quantity) || 0;
      const itemRev = Number(item?.total) || (itemQty * (Number(item?.unitPrice) || 0));
      if (!productStats[itemName]) {
        productStats[itemName] = { name: itemName, quantity: 0, revenue: 0 };
      }
      productStats[itemName].quantity += itemQty;
      productStats[itemName].revenue += itemRev;
    });
  });
  const topProducts = Object.values(productStats).sort((a, b) => b.revenue - a.revenue).slice(0, 5);

  // Category breakdown
  const categoryStats: Record<string, number> = {};
  filteredSales.forEach(s => {
    (s.items || []).forEach(item => {
      const prod = products.find(p => p.id === item.productId || (item.barcode && p.barcode === item.barcode));
      const cat = prod?.category || 'Прочее';
      const itemRev = Number(item?.total) || ((Number(item?.quantity) || 0) * (Number(item?.unitPrice) || 0));
      categoryStats[cat] = (categoryStats[cat] || 0) + itemRev;
    });
  });
  const categoryEntries = Object.entries(categoryStats).sort((a, b) => b[1] - a[1]);

  // Payment methods breakdown
  const paymentStats = {
    cash: filteredSales.filter(s => s.paymentMethod === 'cash').reduce((a, s) => a + (Number(s.total) || 0), 0),
    card: filteredSales.filter(s => s.paymentMethod === 'card').reduce((a, s) => a + (Number(s.total) || 0), 0),
    sbp_qr: filteredSales.filter(s => s.paymentMethod === 'sbp_qr').reduce((a, s) => a + (Number(s.total) || 0), 0),
  };

  const handleExportPDF = async () => {
    await pdfExportService.downloadSalesReportPDF(filteredSales, rangeLabels[timeRange], store);
  };

  return (
    <div id="analytics-view-container" className="flex-1 flex flex-col h-full overflow-y-auto gap-4 sm:gap-6">
      {/* Top Header & Range Filters */}
      <div className="bg-white rounded-3xl border border-slate-200/90 shadow-sm p-4 sm:p-6 space-y-4 shrink-0">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-blue-600" />
              <span>Финансовая аналитика и продажи</span>
            </h2>
            <p className="text-xs text-slate-400">
              Выручка, маржинальность, топ позиций и экспорт отчетности
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Time range selector */}
            <div className="flex items-center bg-slate-100 border border-slate-200 p-1 rounded-xl">
              {(['today', '7days', '30days', 'all'] as const).map((r) => (
                <button
                  key={r}
                  id={`time-range-${r}`}
                  onClick={() => setTimeRange(r)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    timeRange === r
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  {rangeLabels[r]}
                </button>
              ))}
            </div>

            <button
              id="export-sales-pdf-btn"
              type="button"
              onClick={handleExportPDF}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors shadow-md shadow-blue-600/20"
            >
              <Download className="w-4 h-4" />
              <span>Скачать отчет PDF</span>
            </button>
          </div>
        </div>

        {/* KPI Cards Bento Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 pt-2">
          {/* Revenue */}
          <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 sm:p-5 relative overflow-hidden shadow-xs">
            <div className="flex items-center justify-between text-slate-400 text-xs">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Общая выручка</span>
              <DollarSign className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="text-2xl sm:text-3xl font-black text-slate-900 mt-1">
              {totalRevenue.toLocaleString('ru-RU')} <span className="text-emerald-600 text-lg">₽</span>
            </div>
            <div className="text-[11px] text-slate-500 mt-1">
              Чеков: {filteredSales.length} • Единиц: {totalItemsSold} шт.
            </div>
          </div>

          {/* Gross Profit */}
          <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 sm:p-5 relative overflow-hidden shadow-xs">
            <div className="flex items-center justify-between text-slate-400 text-xs">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Валовая прибыль</span>
              <TrendingUp className="w-4 h-4 text-blue-600" />
            </div>
            <div className="text-2xl sm:text-3xl font-black text-blue-600 mt-1">
              {grossProfit.toLocaleString('ru-RU')} <span className="text-sm">₽</span>
            </div>
            <div className="text-[11px] text-slate-500 mt-1">
              Себестоимость: {totalCost.toLocaleString('ru-RU')} ₽
            </div>
          </div>

          {/* Margin */}
          <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 sm:p-5 relative overflow-hidden shadow-xs">
            <div className="flex items-center justify-between text-slate-400 text-xs">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Рентабельность</span>
              <BarChart3 className="w-4 h-4 text-purple-600" />
            </div>
            <div className="text-2xl sm:text-3xl font-black text-purple-600 mt-1">
              {marginPercent}%
            </div>
            <div className="text-[11px] text-slate-500 mt-1">
              Наценка: {totalCost > 0 ? Math.round((grossProfit / totalCost) * 100) : 0}%
            </div>
          </div>

          {/* Average Check */}
          <div className="bg-emerald-500 rounded-2xl p-4 sm:p-5 text-white relative overflow-hidden shadow-md shadow-emerald-500/20">
            <div className="flex items-center justify-between text-emerald-100 text-xs">
              <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-100">Средний чек</span>
              <Receipt className="w-4 h-4 text-white" />
            </div>
            <div className="text-2xl sm:text-3xl font-black text-white mt-1">
              {averageCheck.toLocaleString('ru-RU')} <span className="text-sm">₽</span>
            </div>
            <div className="text-[11px] text-emerald-100/90 mt-1">
              В чеке: {filteredSales.length > 0 ? (totalItemsSold / filteredSales.length).toFixed(1) : 0} шт.
            </div>
          </div>
        </div>
      </div>

      {/* Analytics Mid-Row: Top Products & Categories & Payments Bento Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        {/* Top Selling Products */}
        <div className="bg-white border border-slate-200/90 rounded-3xl p-5 sm:p-6 space-y-4 shadow-sm">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-slate-800 text-sm flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-amber-500" />
              <span>Лидеры продаж (Топ 5)</span>
            </h3>
            <span className="text-[11px] text-slate-400 font-medium">по выручке</span>
          </div>

          <div className="space-y-3.5">
            {topProducts.length === 0 ? (
              <p className="text-xs text-slate-400 py-6 text-center">Нет данных о продажах за период</p>
            ) : (
              topProducts.map((p, idx) => {
                const pct = totalRevenue > 0 ? Math.round((p.revenue / totalRevenue) * 100) : 0;
                return (
                  <div key={idx} className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="font-semibold text-slate-800 truncate pr-2">
                        {idx + 1}. {p.name}
                      </span>
                      <span className="font-extrabold text-blue-600 whitespace-nowrap">
                        {p.revenue.toLocaleString('ru-RU')} ₽
                      </span>
                    </div>
                    <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden flex">
                      <div
                        className="bg-blue-600 rounded-full transition-all"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-[10px] text-slate-400 font-medium">
                      <span>Продано: {p.quantity} шт.</span>
                      <span>{pct}% от выручки</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Category Breakdown */}
        <div className="bg-white border border-slate-200/90 rounded-3xl p-5 sm:p-6 space-y-4 shadow-sm">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-slate-800 text-sm flex items-center gap-1.5">
              <Layers className="w-4 h-4 text-teal-600" />
              <span>Продажи по категориям</span>
            </h3>
          </div>

          <div className="space-y-3.5">
            {categoryEntries.length === 0 ? (
              <p className="text-xs text-slate-400 py-6 text-center">Нет данных о категориях</p>
            ) : (
              categoryEntries.slice(0, 5).map(([cat, val], idx) => {
                const pct = totalRevenue > 0 ? Math.round((val / totalRevenue) * 100) : 0;
                return (
                  <div key={idx} className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="font-semibold text-slate-800">{cat}</span>
                      <span className="font-extrabold text-teal-700">{val.toLocaleString('ru-RU')} ₽</span>
                    </div>
                    <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="bg-teal-500 rounded-full transition-all"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className="text-[10px] text-slate-400 font-medium block text-right">{pct}%</span>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Payment Methods */}
        <div className="bg-white border border-slate-200/90 rounded-3xl p-5 sm:p-6 space-y-4 shadow-sm">
          <h3 className="font-bold text-slate-800 text-sm flex items-center gap-1.5">
            <PieChart className="w-4 h-4 text-purple-600" />
            <span>Структура оплат</span>
          </h3>

          <div className="space-y-3">
            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
                  <Banknote className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-xs font-bold text-slate-800">Наличные</span>
                  <p className="text-[10px] text-slate-400">В кассе магазина</p>
                </div>
              </div>
              <span className="text-xs font-black text-slate-900 font-mono">
                {paymentStats.cash.toLocaleString('ru-RU')} ₽
              </span>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center">
                  <CreditCard className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-xs font-bold text-slate-800">Банковские карты</span>
                  <p className="text-[10px] text-slate-400">Эквайринг</p>
                </div>
              </div>
              <span className="text-xs font-black text-slate-900 font-mono">
                {paymentStats.card.toLocaleString('ru-RU')} ₽
              </span>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center">
                  <QrCode className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-xs font-bold text-slate-800">СБП (QR код)</span>
                  <p className="text-[10px] text-slate-400">Быстрые платежи</p>
                </div>
              </div>
              <span className="text-xs font-black text-slate-900 font-mono">
                {paymentStats.sbp_qr.toLocaleString('ru-RU')} ₽
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Sales Transactions Journal Table */}
      <div className="bg-white border border-slate-200/90 rounded-3xl p-5 sm:p-6 space-y-4 shadow-sm">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
            <Receipt className="w-4 h-4 text-blue-600" />
            <span>Журнал пробитых чеков ({filteredSales.length})</span>
          </h3>
        </div>

        <div className="overflow-x-auto rounded-2xl border border-slate-200">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200">
              <tr>
                <th className="p-3">Номер чека</th>
                <th className="p-3">Дата и время</th>
                <th className="p-3">Кассир</th>
                <th className="p-3">Товары</th>
                <th className="p-3">Оплата</th>
                <th className="p-3 text-right">Сумма</th>
                <th className="p-3 text-center">Статус</th>
                <th className="p-3 text-center">Чек</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {filteredSales.map((sale) => {
                const methodNames: Record<string, string> = {
                  cash: 'Наличные',
                  card: 'Карта',
                  sbp_qr: 'СБП QR',
                  split: 'Смешанная'
                };

                return (
                  <tr key={sale.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="p-3 font-mono font-bold text-slate-900">
                      {sale.receiptNumber}
                    </td>

                    <td className="p-3 text-slate-500">
                      {sale.timestamp ? new Date(sale.timestamp).toLocaleString('ru-RU', {
                        day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit'
                      }) : '—'}
                    </td>

                    <td className="p-3 text-slate-700 font-medium">
                      {sale.cashierName || 'Кассир'}
                    </td>

                    <td className="p-3 text-slate-500 max-w-[200px] truncate">
                      {(sale.items || []).map(i => `${i?.name || 'Товар'} × ${i?.quantity || 1}`).join(', ')}
                    </td>

                    <td className="p-3">
                      <span className="px-2 py-0.5 rounded-lg bg-slate-100 text-[11px] font-semibold text-slate-700">
                        {methodNames[sale.paymentMethod] || 'Безнал'}
                      </span>
                    </td>

                    <td className="p-3 text-right font-mono font-black text-slate-900 text-sm">
                      {Number(sale.total || 0).toLocaleString('ru-RU')} ₽
                    </td>

                    <td className="p-3 text-center">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          sale.synced
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-amber-50 text-amber-700 border border-amber-200'
                        }`}
                      >
                        {sale.synced ? 'В облаке' : 'Офлайн'}
                      </span>
                    </td>

                    <td className="p-3 text-center">
                      <button
                        id={`view-receipt-${sale.id}`}
                        onClick={() => setSelectedReceipt(sale)}
                        className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-colors"
                      >
                        Просмотр
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Selected Receipt Modal */}
      <ReceiptModal
        isOpen={!!selectedReceipt}
        onClose={() => setSelectedReceipt(null)}
        sale={selectedReceipt}
      />
    </div>
  );
};
