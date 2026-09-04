import { jsPDF } from 'jspdf';
import { Sale, Product, InventoryAuditItem } from '../types';

interface StoreInfo {
  storeName: string;
  address: string;
  inn: string;
  cashier: string;
}

/**
 * High-resolution canvas based Cyrillic PDF exporter.
 * Bypasses jsPDF standard font Cyrillic encoding limitations by using
 * browser canvas 2D vector typography (Plus Jakarta Sans / Arial) at 2x scale.
 */
export const pdfExportService = {
  /**
   * Generates high-res canvas for 80mm thermal receipt
   */
  createThermalReceiptCanvas(sale: Sale, store: StoreInfo): HTMLCanvasElement {
    const scale = 2;
    const widthMm = 80;
    const padding = 16 * scale;
    const contentWidth = 560; // 80mm at ~180dpi
    const canvasWidth = contentWidth + padding * 2;

    // Calculate dynamic height based on item count
    const itemHeight = 36 * scale;
    const baseHeight = 440 * scale;
    const canvasHeight = baseHeight + (sale.items.length * itemHeight);

    const canvas = document.createElement('canvas');
    canvas.width = canvasWidth;
    canvas.height = canvasHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return canvas;

    // Background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);

    let y = 30 * scale;

    // Header
    ctx.fillStyle = '#111827';
    ctx.font = `bold ${16 * scale}px system-ui, -apple-system, sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText(store.storeName.toUpperCase(), canvasWidth / 2, y);

    y += 18 * scale;
    ctx.font = `${10 * scale}px system-ui, -apple-system, sans-serif`;
    ctx.fillStyle = '#4b5563';
    ctx.fillText(store.address, canvasWidth / 2, y);

    y += 15 * scale;
    ctx.fillText(`ИНН: ${store.inn}  •  КАССОВЫЙ ЧЕК № ${sale.receiptNumber}`, canvasWidth / 2, y);

    y += 15 * scale;
    const dateFormatted = new Date(sale.timestamp).toLocaleString('ru-RU');
    ctx.fillText(`Дата: ${dateFormatted}  •  Кассир: ${sale.cashierName}`, canvasWidth / 2, y);

    // Separator line
    y += 15 * scale;
    ctx.strokeStyle = '#d1d5db';
    ctx.lineWidth = 1.5 * scale;
    ctx.setLineDash([4 * scale, 4 * scale]);
    ctx.beginPath();
    ctx.moveTo(padding, y);
    ctx.lineTo(canvasWidth - padding, y);
    ctx.stroke();
    ctx.setLineDash([]);

    // Table Header
    y += 18 * scale;
    ctx.textAlign = 'left';
    ctx.font = `bold ${10 * scale}px system-ui, -apple-system, sans-serif`;
    ctx.fillStyle = '#374151';
    ctx.fillText('НАИМЕНОВАНИЕ', padding, y);
    ctx.textAlign = 'right';
    ctx.fillText('СУММА (₽)', canvasWidth - padding, y);

    y += 10 * scale;
    ctx.strokeStyle = '#e5e7eb';
    ctx.lineWidth = 1 * scale;
    ctx.beginPath();
    ctx.moveTo(padding, y);
    ctx.lineTo(canvasWidth - padding, y);
    ctx.stroke();

    // Items
    ctx.font = `${11 * scale}px system-ui, -apple-system, sans-serif`;
    sale.items.forEach(item => {
      y += 18 * scale;
      ctx.textAlign = 'left';
      ctx.fillStyle = '#111827';
      const maxLen = 28;
      const displayName = item.name.length > maxLen ? item.name.slice(0, maxLen) + '…' : item.name;
      ctx.fillText(displayName, padding, y);

      ctx.textAlign = 'right';
      ctx.font = `bold ${11 * scale}px system-ui, -apple-system, sans-serif`;
      ctx.fillText(`${item.total.toLocaleString('ru-RU')} ₽`, canvasWidth - padding, y);

      y += 13 * scale;
      ctx.textAlign = 'left';
      ctx.font = `${9.5 * scale}px system-ui, -apple-system, sans-serif`;
      ctx.fillStyle = '#6b7280';
      ctx.fillText(`${item.quantity} шт × ${item.unitPrice.toLocaleString('ru-RU')} ₽${item.discount > 0 ? ` (скидка ${item.discount}%)` : ''}`, padding, y);
      ctx.font = `${11 * scale}px system-ui, -apple-system, sans-serif`;
    });

    // Separator line
    y += 18 * scale;
    ctx.strokeStyle = '#9ca3af';
    ctx.lineWidth = 1.5 * scale;
    ctx.beginPath();
    ctx.moveTo(padding, y);
    ctx.lineTo(canvasWidth - padding, y);
    ctx.stroke();

    // Totals
    y += 20 * scale;
    ctx.textAlign = 'left';
    ctx.font = `${11 * scale}px system-ui, -apple-system, sans-serif`;
    ctx.fillStyle = '#4b5563';
    ctx.fillText('Подытог:', padding, y);
    ctx.textAlign = 'right';
    ctx.fillText(`${sale.subtotal.toLocaleString('ru-RU')} ₽`, canvasWidth - padding, y);

    if (sale.discountAmount > 0) {
      y += 16 * scale;
      ctx.textAlign = 'left';
      ctx.fillStyle = '#15803d';
      ctx.fillText('Скидка:', padding, y);
      ctx.textAlign = 'right';
      ctx.fillText(`-${sale.discountAmount.toLocaleString('ru-RU')} ₽`, canvasWidth - padding, y);
    }

    y += 16 * scale;
    ctx.textAlign = 'left';
    ctx.fillStyle = '#4b5563';
    ctx.fillText('В т.ч. НДС 20%:', padding, y);
    ctx.textAlign = 'right';
    ctx.fillText(`${Math.round(sale.taxAmount).toLocaleString('ru-RU')} ₽`, canvasWidth - padding, y);

    y += 24 * scale;
    ctx.textAlign = 'left';
    ctx.font = `bold ${16 * scale}px system-ui, -apple-system, sans-serif`;
    ctx.fillStyle = '#111827';
    ctx.fillText('ИТОГО К ОПЛАТЕ:', padding, y);
    ctx.textAlign = 'right';
    ctx.fillText(`${sale.total.toLocaleString('ru-RU')} ₽`, canvasWidth - padding, y);

    // Payment method
    y += 22 * scale;
    const methodNames: Record<string, string> = {
      cash: 'Наличные',
      card: 'Банковская карта',
      sbp_qr: 'Система быстрых платежей (СБП QR)',
      split: 'Смешанная оплата'
    };
    ctx.font = `${10.5 * scale}px system-ui, -apple-system, sans-serif`;
    ctx.fillStyle = '#4b5563';
    ctx.textAlign = 'left';
    ctx.fillText(`Способ оплаты: ${methodNames[sale.paymentMethod] || 'Безналичный'}`, padding, y);

    if (sale.cashReceived && sale.change !== undefined) {
      y += 15 * scale;
      ctx.fillText(`Получено: ${sale.cashReceived} ₽  |  Сдача: ${sale.change} ₽`, padding, y);
    }

    // Barcode representation
    y += 26 * scale;
    this.drawBarcode(ctx, sale.receiptNumber, canvasWidth / 2, y, 260 * scale, 32 * scale);

    y += 44 * scale;
    ctx.textAlign = 'center';
    ctx.font = `bold ${10 * scale}px system-ui, -apple-system, sans-serif`;
    ctx.fillStyle = '#111827';
    ctx.fillText(`* ${sale.receiptNumber} *`, canvasWidth / 2, y);

    y += 16 * scale;
    ctx.font = `${9 * scale}px system-ui, -apple-system, sans-serif`;
    ctx.fillStyle = '#6b7280';
    ctx.fillText('Спасибо за покупку! Ждем вас снова!', canvasWidth / 2, y);

    return canvas;
  },

  /**
   * Generates high-res canvas for official A4 Goods Receipt (Товарный чек)
   */
  createA4ReceiptCanvas(sale: Sale, store: StoreInfo): HTMLCanvasElement {
    const scale = 2;
    const canvasWidth = 800 * scale;
    const canvasHeight = 1130 * scale; // Standard A4 ratio

    const canvas = document.createElement('canvas');
    canvas.width = canvasWidth;
    canvas.height = canvasHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return canvas;

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);

    const pad = 40 * scale;
    let y = 45 * scale;

    // Organization Header
    ctx.fillStyle = '#0f172a';
    ctx.font = `bold ${16 * scale}px system-ui, -apple-system, sans-serif`;
    ctx.textAlign = 'left';
    ctx.fillText(store.storeName, pad, y);

    y += 18 * scale;
    ctx.font = `${10.5 * scale}px system-ui, -apple-system, sans-serif`;
    ctx.fillStyle = '#475569';
    ctx.fillText(`ИНН: ${store.inn}  •  Адрес: ${store.address}`, pad, y);

    // Title
    y += 35 * scale;
    ctx.fillStyle = '#0f172a';
    ctx.font = `bold ${20 * scale}px system-ui, -apple-system, sans-serif`;
    ctx.fillText(`ТОВАРНЫЙ ЧЕК № ${sale.receiptNumber}`, pad, y);

    y += 18 * scale;
    ctx.font = `${11 * scale}px system-ui, -apple-system, sans-serif`;
    ctx.fillStyle = '#64748b';
    const dateStr = new Date(sale.timestamp).toLocaleString('ru-RU');
    ctx.fillText(`Дата составления: ${dateStr}  •  Кассир: ${sale.cashierName}`, pad, y);

    // Divider
    y += 16 * scale;
    ctx.strokeStyle = '#cbd5e1';
    ctx.lineWidth = 1.5 * scale;
    ctx.beginPath();
    ctx.moveTo(pad, y);
    ctx.lineTo(canvasWidth - pad, y);
    ctx.stroke();

    // Table Header
    y += 18 * scale;
    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(pad, y, canvasWidth - pad * 2, 28 * scale);

    ctx.fillStyle = '#334155';
    ctx.font = `bold ${10 * scale}px system-ui, -apple-system, sans-serif`;
    ctx.textAlign = 'left';
    ctx.fillText('№', pad + 8 * scale, y + 18 * scale);
    ctx.fillText('АРТИКУЛ/ШТРИХКОД', pad + 38 * scale, y + 18 * scale);
    ctx.fillText('НАИМЕНОВАНИЕ ТОВАРА', pad + 180 * scale, y + 18 * scale);
    ctx.fillText('КОЛ-ВО', pad + 450 * scale, y + 18 * scale);
    ctx.fillText('ЦЕНА', pad + 520 * scale, y + 18 * scale);
    ctx.textAlign = 'right';
    ctx.fillText('СУММА (₽)', canvasWidth - pad - 10 * scale, y + 18 * scale);

    // Rows
    y += 28 * scale;
    ctx.font = `${10 * scale}px system-ui, -apple-system, sans-serif`;

    sale.items.forEach((item, idx) => {
      const rowY = y + idx * 26 * scale;

      if (idx % 2 === 1) {
        ctx.fillStyle = '#fafafa';
        ctx.fillRect(pad, rowY, canvasWidth - pad * 2, 26 * scale);
      }

      ctx.strokeStyle = '#e2e8f0';
      ctx.lineWidth = 1 * scale;
      ctx.strokeRect(pad, rowY, canvasWidth - pad * 2, 26 * scale);

      ctx.textAlign = 'left';
      ctx.fillStyle = '#64748b';
      ctx.fillText((idx + 1).toString(), pad + 8 * scale, rowY + 17 * scale);

      ctx.fillStyle = '#475569';
      ctx.fillText(item.barcode, pad + 38 * scale, rowY + 17 * scale);

      ctx.fillStyle = '#0f172a';
      const name = item.name.length > 34 ? item.name.slice(0, 34) + '…' : item.name;
      ctx.fillText(name, pad + 180 * scale, rowY + 17 * scale);

      ctx.fillStyle = '#0f172a';
      ctx.fillText(`${item.quantity} шт`, pad + 450 * scale, rowY + 17 * scale);
      ctx.fillText(`${item.unitPrice} ₽`, pad + 520 * scale, rowY + 17 * scale);

      ctx.textAlign = 'right';
      ctx.font = `bold ${10 * scale}px system-ui, -apple-system, sans-serif`;
      ctx.fillText(`${item.total.toLocaleString('ru-RU')} ₽`, canvasWidth - pad - 10 * scale, rowY + 17 * scale);
      ctx.font = `${10 * scale}px system-ui, -apple-system, sans-serif`;
    });

    const rowsBottomY = y + sale.items.length * 26 * scale;

    // Totals Box
    let totY = rowsBottomY + 25 * scale;
    ctx.textAlign = 'right';
    ctx.font = `${11 * scale}px system-ui, -apple-system, sans-serif`;
    ctx.fillStyle = '#475569';

    if (sale.discountAmount > 0) {
      ctx.fillText(`Скидка: -${sale.discountAmount.toLocaleString('ru-RU')} ₽`, canvasWidth - pad, totY);
      totY += 18 * scale;
    }

    ctx.fillText(`В том числе НДС 20%: ${Math.round(sale.taxAmount).toLocaleString('ru-RU')} ₽`, canvasWidth - pad, totY);
    totY += 24 * scale;

    ctx.font = `bold ${16 * scale}px system-ui, -apple-system, sans-serif`;
    ctx.fillStyle = '#0f172a';
    ctx.fillText(`ИТОГО К ОПЛАТЕ: ${sale.total.toLocaleString('ru-RU')} ₽`, canvasWidth - pad, totY);

    // Payment details
    const methodNames: Record<string, string> = {
      cash: 'Наличными',
      card: 'Банковской картой',
      sbp_qr: 'Системой быстрых платежей (СБП QR)',
      split: 'Смешанной оплатой'
    };
    totY += 22 * scale;
    ctx.font = `${10.5 * scale}px system-ui, -apple-system, sans-serif`;
    ctx.fillStyle = '#64748b';
    ctx.textAlign = 'left';
    ctx.fillText(`Форма расчетов: ${methodNames[sale.paymentMethod] || 'Безналичная'}${sale.cashReceived ? ` (Получено: ${sale.cashReceived} ₽, сдача: ${sale.change} ₽)` : ''}`, pad, totY);

    // Barcode on A4
    this.drawBarcode(ctx, sale.receiptNumber, canvasWidth - pad - 130 * scale, totY + 10 * scale, 240 * scale, 30 * scale);
    ctx.textAlign = 'center';
    ctx.font = `bold ${9 * scale}px system-ui, -apple-system, sans-serif`;
    ctx.fillStyle = '#334155';
    ctx.fillText(`* ${sale.receiptNumber} *`, canvasWidth - pad - 130 * scale, totY + 50 * scale);

    // Signatures and Stamp Block
    const signY = canvasHeight - 65 * scale;
    ctx.strokeStyle = '#cbd5e1';
    ctx.lineWidth = 1 * scale;
    ctx.beginPath();
    ctx.moveTo(pad, signY - 20 * scale);
    ctx.lineTo(canvasWidth - pad, signY - 20 * scale);
    ctx.stroke();

    ctx.font = `${10 * scale}px system-ui, -apple-system, sans-serif`;
    ctx.fillStyle = '#475569';
    ctx.textAlign = 'left';
    ctx.fillText(`Отпустил: ____________________ / ${sale.cashierName} /`, pad, signY);

    ctx.fillText('Получил: ____________________ / Покупатель /', pad + 380 * scale, signY);

    ctx.textAlign = 'right';
    ctx.font = `bold ${11 * scale}px system-ui, -apple-system, sans-serif`;
    ctx.fillStyle = '#94a3b8';
    ctx.fillText('М.П.', canvasWidth - pad, signY);

    return canvas;
  },

  /**
   * Generates a jsPDF instance, Blob, and BlobURL for the receipt
   */
  async generateReceiptPDF(
    sale: Sale,
    store: StoreInfo,
    format: 'thermal80' | 'a4' = 'thermal80'
  ): Promise<{ pdf: jsPDF; blob: Blob; blobUrl: string; filename: string }> {
    const filename = `Чек_${sale.receiptNumber}.pdf`;

    if (format === 'a4') {
      const canvas = this.createA4ReceiptCanvas(sale, store);
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });
      const imgData = canvas.toDataURL('image/png', 1.0);
      pdf.addImage(imgData, 'PNG', 0, 0, 210, 297);
      const blob = pdf.output('blob');
      const blobUrl = URL.createObjectURL(blob);
      return { pdf, blob, blobUrl, filename };
    } else {
      const canvas = this.createThermalReceiptCanvas(sale, store);
      const widthMm = 80;
      const heightMm = (canvas.height / canvas.width) * widthMm;
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: [widthMm, heightMm]
      });
      const imgData = canvas.toDataURL('image/png', 1.0);
      pdf.addImage(imgData, 'PNG', 0, 0, widthMm, heightMm);
      const blob = pdf.output('blob');
      const blobUrl = URL.createObjectURL(blob);
      return { pdf, blob, blobUrl, filename };
    }
  },

  /**
   * Downloads receipt PDF directly to user's device
   */
  async downloadReceiptPDF(
    sale: Sale,
    store: StoreInfo,
    format: 'thermal80' | 'a4' = 'thermal80'
  ): Promise<void> {
    const { pdf, filename } = await this.generateReceiptPDF(sale, store, format);
    pdf.save(filename);
  },

  /**
   * Sends receipt PDF directly to printer dialog
   */
  async printReceiptPDF(
    sale: Sale,
    store: StoreInfo,
    format: 'thermal80' | 'a4' = 'thermal80'
  ): Promise<void> {
    const { blobUrl } = await this.generateReceiptPDF(sale, store, format);

    // Try printing via hidden iframe
    try {
      const iframe = document.createElement('iframe');
      iframe.style.position = 'fixed';
      iframe.style.right = '0';
      iframe.style.bottom = '0';
      iframe.style.width = '0';
      iframe.style.height = '0';
      iframe.style.border = '0';
      iframe.src = blobUrl;
      document.body.appendChild(iframe);

      iframe.onload = () => {
        setTimeout(() => {
          try {
            iframe.contentWindow?.focus();
            iframe.contentWindow?.print();
          } catch (e) {
            console.warn('Iframe print restricted, opening fallback print', e);
            window.print();
          }
          setTimeout(() => {
            try {
              document.body.removeChild(iframe);
            } catch {}
          }, 4000);
        }, 500);
      };
    } catch {
      window.print();
    }
  },

  /**
   * Opens receipt PDF in a new browser tab/viewer
   */
  async openReceiptPDF(
    sale: Sale,
    store: StoreInfo,
    format: 'thermal80' | 'a4' = 'thermal80'
  ): Promise<void> {
    const { blobUrl } = await this.generateReceiptPDF(sale, store, format);
    window.open(blobUrl, '_blank');
  },

  /**
   * Generates a comprehensive Sales & Analytics Report in PDF (A4 format)
   */
  async downloadSalesReportPDF(sales: Sale[], dateRangeLabel: string, store: StoreInfo): Promise<void> {
    const scale = 2;
    const canvasWidth = 800 * scale;
    const canvasHeight = 1130 * scale; // ~A4 ratio

    const canvas = document.createElement('canvas');
    canvas.width = canvasWidth;
    canvas.height = canvasHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);

    const pad = 36 * scale;
    let y = 40 * scale;

    // Header block
    ctx.fillStyle = '#0f172a';
    ctx.font = `bold ${18 * scale}px system-ui, -apple-system, sans-serif`;
    ctx.textAlign = 'left';
    ctx.fillText('ОТЧЕТ ПО ПРОДАЖАМ И АНАЛИТИКЕ', pad, y);

    y += 18 * scale;
    ctx.font = `${11 * scale}px system-ui, -apple-system, sans-serif`;
    ctx.fillStyle = '#64748b';
    ctx.fillText(`${store.storeName}  •  Период: ${dateRangeLabel}  •  Сформирован: ${new Date().toLocaleString('ru-RU')}`, pad, y);

    // Summary calculations
    const totalRevenue = sales.reduce((acc, s) => acc + s.total, 0);
    const totalCost = sales.reduce((acc, s) => acc + s.items.reduce((c, i) => c + (i.costPrice * i.quantity), 0), 0);
    const grossProfit = totalRevenue - totalCost;
    const margin = totalRevenue > 0 ? ((grossProfit / totalRevenue) * 100).toFixed(1) : '0';
    const avgCheck = sales.length > 0 ? Math.round(totalRevenue / sales.length) : 0;

    // KPI Cards
    y += 24 * scale;
    const cardWidth = (canvasWidth - pad * 2 - 20 * scale * 3) / 4;
    const cardHeight = 65 * scale;

    const kpis = [
      { label: 'Выручка', value: `${totalRevenue.toLocaleString('ru-RU')} ₽`, color: '#059669' },
      { label: 'Себестоимость', value: `${totalCost.toLocaleString('ru-RU')} ₽`, color: '#d97706' },
      { label: 'Валовая прибыль', value: `${grossProfit.toLocaleString('ru-RU')} ₽`, color: '#2563eb' },
      { label: 'Маржа / Чек', value: `${margin}% (${avgCheck} ₽)`, color: '#7c3aed' }
    ];

    kpis.forEach((kpi, idx) => {
      const cx = pad + idx * (cardWidth + 20 * scale);
      ctx.fillStyle = '#f8fafc';
      ctx.strokeStyle = '#e2e8f0';
      ctx.lineWidth = 1 * scale;
      ctx.beginPath();
      ctx.roundRect(cx, y, cardWidth, cardHeight, 6 * scale);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#64748b';
      ctx.font = `${9.5 * scale}px system-ui, -apple-system, sans-serif`;
      ctx.textAlign = 'left';
      ctx.fillText(kpi.label, cx + 12 * scale, y + 20 * scale);

      ctx.fillStyle = kpi.color;
      ctx.font = `bold ${13 * scale}px system-ui, -apple-system, sans-serif`;
      ctx.fillText(kpi.value, cx + 12 * scale, y + 46 * scale);
    });

    // Section 1: Sales Transactions Table
    y += cardHeight + 35 * scale;
    ctx.fillStyle = '#0f172a';
    ctx.font = `bold ${14 * scale}px system-ui, -apple-system, sans-serif`;
    ctx.fillText(`Реестр кассовых операций (${sales.length} чеков)`, pad, y);

    y += 16 * scale;
    // Table Header
    ctx.fillStyle = '#f1f5f9';
    ctx.fillRect(pad, y, canvasWidth - pad * 2, 28 * scale);

    ctx.fillStyle = '#334155';
    ctx.font = `bold ${10 * scale}px system-ui, -apple-system, sans-serif`;
    ctx.textAlign = 'left';
    ctx.fillText('№ ЧЕКА', pad + 10 * scale, y + 18 * scale);
    ctx.fillText('ДАТА И ВРЕМЯ', pad + 110 * scale, y + 18 * scale);
    ctx.fillText('СОСТАВ ЧЕКА', pad + 250 * scale, y + 18 * scale);
    ctx.fillText('ОПЛАТА', pad + 450 * scale, y + 18 * scale);
    ctx.textAlign = 'right';
    ctx.fillText('ИТОГО', canvasWidth - pad - 10 * scale, y + 18 * scale);

    // Rows
    const maxRows = Math.min(sales.length, 16);
    y += 28 * scale;
    ctx.font = `${10 * scale}px system-ui, -apple-system, sans-serif`;

    for (let i = 0; i < maxRows; i++) {
      const sale = sales[i];
      const rowY = y + i * 26 * scale;

      if (i % 2 === 1) {
        ctx.fillStyle = '#fafafa';
        ctx.fillRect(pad, rowY, canvasWidth - pad * 2, 26 * scale);
      }

      ctx.strokeStyle = '#f1f5f9';
      ctx.lineWidth = 1 * scale;
      ctx.strokeRect(pad, rowY, canvasWidth - pad * 2, 26 * scale);

      ctx.textAlign = 'left';
      ctx.fillStyle = '#0f172a';
      ctx.fillText(sale.receiptNumber, pad + 10 * scale, rowY + 17 * scale);

      ctx.fillStyle = '#64748b';
      const timeStr = new Date(sale.timestamp).toLocaleString('ru-RU', {
        day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit'
      });
      ctx.fillText(timeStr, pad + 110 * scale, rowY + 17 * scale);

      const itemsSummary = sale.items.map(it => `${it.name.slice(0, 14)} (${it.quantity})`).join(', ');
      ctx.fillText(itemsSummary.length > 32 ? itemsSummary.slice(0, 32) + '…' : itemsSummary, pad + 250 * scale, rowY + 17 * scale);

      const paymentTitles: Record<string, string> = {
        cash: 'Наличные',
        card: 'Карта',
        sbp_qr: 'СБП QR',
        split: 'Смешан.'
      };
      ctx.fillText(paymentTitles[sale.paymentMethod] || 'Безнал', pad + 450 * scale, rowY + 17 * scale);

      ctx.textAlign = 'right';
      ctx.font = `bold ${10 * scale}px system-ui, -apple-system, sans-serif`;
      ctx.fillStyle = '#0f172a';
      ctx.fillText(`${sale.total.toLocaleString('ru-RU')} ₽`, canvasWidth - pad - 10 * scale, rowY + 17 * scale);
      ctx.font = `${10 * scale}px system-ui, -apple-system, sans-serif`;
    }

    // Footer signature
    const footerY = canvasHeight - 40 * scale;
    ctx.strokeStyle = '#cbd5e1';
    ctx.lineWidth = 1 * scale;
    ctx.beginPath();
    ctx.moveTo(pad, footerY - 15 * scale);
    ctx.lineTo(canvasWidth - pad, footerY - 15 * scale);
    ctx.stroke();

    ctx.fillStyle = '#64748b';
    ctx.font = `${9.5 * scale}px system-ui, -apple-system, sans-serif`;
    ctx.textAlign = 'left';
    ctx.fillText(`Ответственное лицо: ${store.cashier}`, pad, footerY);
    ctx.textAlign = 'right';
    ctx.fillText('Подпись / Печать: _______________________', canvasWidth - pad, footerY);

    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    const imgData = canvas.toDataURL('image/png', 1.0);
    pdf.addImage(imgData, 'PNG', 0, 0, 210, 297);
    pdf.save(`Отчет_по_продажам_${new Date().toISOString().slice(0, 10)}.pdf`);
  },

  /**
   * Generates a Stock Inventory Valuation & Audit protocol in PDF
   */
  async downloadInventoryReportPDF(products: Product[], store: StoreInfo): Promise<void> {
    const scale = 2;
    const canvasWidth = 800 * scale;
    const canvasHeight = 1130 * scale;

    const canvas = document.createElement('canvas');
    canvas.width = canvasWidth;
    canvas.height = canvasHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);

    const pad = 36 * scale;
    let y = 40 * scale;

    ctx.fillStyle = '#0f172a';
    ctx.font = `bold ${18 * scale}px system-ui, -apple-system, sans-serif`;
    ctx.textAlign = 'left';
    ctx.fillText('ВЕДОМОСТЬ ОСТАТКОВ И ОЦЕНКИ СКЛАДА', pad, y);

    y += 18 * scale;
    ctx.font = `${11 * scale}px system-ui, -apple-system, sans-serif`;
    ctx.fillStyle = '#64748b';
    ctx.fillText(`${store.storeName}  •  Дата выгрузки: ${new Date().toLocaleString('ru-RU')}`, pad, y);

    // Summary calculations
    const totalItems = products.length;
    const totalUnits = products.reduce((acc, p) => acc + p.stock, 0);
    const totalCostValue = products.reduce((acc, p) => acc + (p.costPrice * p.stock), 0);
    const totalRetailValue = products.reduce((acc, p) => acc + (p.price * p.stock), 0);

    y += 24 * scale;
    const cardWidth = (canvasWidth - pad * 2 - 20 * scale * 3) / 4;
    const cardHeight = 65 * scale;

    const kpis = [
      { label: 'Всего номенклатур', value: `${totalItems} поз.`, color: '#0f172a' },
      { label: 'Общий остаток', value: `${totalUnits} ед.`, color: '#2563eb' },
      { label: 'Оценка в себестоимости', value: `${totalCostValue.toLocaleString('ru-RU')} ₽`, color: '#d97706' },
      { label: 'Оценка в рознице', value: `${totalRetailValue.toLocaleString('ru-RU')} ₽`, color: '#059669' }
    ];

    kpis.forEach((kpi, idx) => {
      const cx = pad + idx * (cardWidth + 20 * scale);
      ctx.fillStyle = '#f8fafc';
      ctx.strokeStyle = '#e2e8f0';
      ctx.lineWidth = 1 * scale;
      ctx.beginPath();
      ctx.roundRect(cx, y, cardWidth, cardHeight, 6 * scale);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#64748b';
      ctx.font = `${9.5 * scale}px system-ui, -apple-system, sans-serif`;
      ctx.textAlign = 'left';
      ctx.fillText(kpi.label, cx + 12 * scale, y + 20 * scale);

      ctx.fillStyle = kpi.color;
      ctx.font = `bold ${13 * scale}px system-ui, -apple-system, sans-serif`;
      ctx.fillText(kpi.value, cx + 12 * scale, y + 46 * scale);
    });

    y += cardHeight + 35 * scale;
    ctx.fillStyle = '#f1f5f9';
    ctx.fillRect(pad, y, canvasWidth - pad * 2, 28 * scale);

    ctx.fillStyle = '#334155';
    ctx.font = `bold ${9.5 * scale}px system-ui, -apple-system, sans-serif`;
    ctx.textAlign = 'left';
    ctx.fillText('АРТИКУЛ', pad + 10 * scale, y + 18 * scale);
    ctx.fillText('ШТРИХКОД', pad + 90 * scale, y + 18 * scale);
    ctx.fillText('НАИМЕНОВАНИЕ ТОВАРА', pad + 210 * scale, y + 18 * scale);
    ctx.fillText('ОСТАТОК', pad + 440 * scale, y + 18 * scale);
    ctx.fillText('СЕБЕСТ.', pad + 520 * scale, y + 18 * scale);
    ctx.fillText('ЦЕНА', pad + 590 * scale, y + 18 * scale);
    ctx.textAlign = 'right';
    ctx.fillText('СУММА (СЕБ.)', canvasWidth - pad - 10 * scale, y + 18 * scale);

    y += 28 * scale;
    ctx.font = `${9.5 * scale}px system-ui, -apple-system, sans-serif`;
    const maxRows = Math.min(products.length, 18);

    for (let i = 0; i < maxRows; i++) {
      const prod = products[i];
      const rowY = y + i * 26 * scale;

      if (i % 2 === 1) {
        ctx.fillStyle = '#fafafa';
        ctx.fillRect(pad, rowY, canvasWidth - pad * 2, 26 * scale);
      }

      ctx.strokeStyle = '#f1f5f9';
      ctx.lineWidth = 1 * scale;
      ctx.strokeRect(pad, rowY, canvasWidth - pad * 2, 26 * scale);

      ctx.textAlign = 'left';
      ctx.fillStyle = '#0f172a';
      ctx.fillText(prod.sku, pad + 10 * scale, rowY + 17 * scale);

      ctx.fillStyle = '#64748b';
      ctx.fillText(prod.barcode, pad + 90 * scale, rowY + 17 * scale);

      ctx.fillStyle = '#0f172a';
      const displayName = prod.name.length > 25 ? prod.name.slice(0, 25) + '…' : prod.name;
      ctx.fillText(displayName, pad + 210 * scale, rowY + 17 * scale);

      ctx.fillStyle = prod.stock <= prod.minStock ? '#dc2626' : '#059669';
      ctx.font = `bold ${9.5 * scale}px system-ui, -apple-system, sans-serif`;
      ctx.fillText(`${prod.stock} ${prod.unit}`, pad + 440 * scale, rowY + 17 * scale);
      ctx.font = `${9.5 * scale}px system-ui, -apple-system, sans-serif`;

      ctx.fillStyle = '#475569';
      ctx.fillText(`${prod.costPrice} ₽`, pad + 520 * scale, rowY + 17 * scale);
      ctx.fillText(`${prod.price} ₽`, pad + 590 * scale, rowY + 17 * scale);

      ctx.textAlign = 'right';
      ctx.font = `bold ${9.5 * scale}px system-ui, -apple-system, sans-serif`;
      ctx.fillStyle = '#0f172a';
      const sumCost = prod.stock * prod.costPrice;
      ctx.fillText(`${sumCost.toLocaleString('ru-RU')} ₽`, canvasWidth - pad - 10 * scale, rowY + 17 * scale);
      ctx.font = `${9.5 * scale}px system-ui, -apple-system, sans-serif`;
    }

    // Footer signature
    const footerY = canvasHeight - 40 * scale;
    ctx.strokeStyle = '#cbd5e1';
    ctx.lineWidth = 1 * scale;
    ctx.beginPath();
    ctx.moveTo(pad, footerY - 15 * scale);
    ctx.lineTo(canvasWidth - pad, footerY - 15 * scale);
    ctx.stroke();

    ctx.fillStyle = '#64748b';
    ctx.font = `${9.5 * scale}px system-ui, -apple-system, sans-serif`;
    ctx.textAlign = 'left';
    ctx.fillText(`Материально ответственное лицо: ${store.cashier}`, pad, footerY);
    ctx.textAlign = 'right';
    ctx.fillText('Подпись / Дата: _______________________', canvasWidth - pad, footerY);

    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    const imgData = canvas.toDataURL('image/png', 1.0);
    pdf.addImage(imgData, 'PNG', 0, 0, 210, 297);
    pdf.save(`Ведомость_остатков_${new Date().toISOString().slice(0, 10)}.pdf`);
  },

  /**
   * Helper to draw a crisp code-128 style barcode on canvas
   */
  drawBarcode(ctx: CanvasRenderingContext2D, code: string, centerX: number, topY: number, width: number, height: number): void {
    const leftX = centerX - width / 2;
    ctx.fillStyle = '#111827';

    // Simple deterministic pattern based on characters
    let seed = 0;
    for (let i = 0; i < code.length; i++) {
      seed = (seed * 31 + code.charCodeAt(i)) % 10000;
    }

    const numBars = 50;
    const barWidth = width / numBars;

    // Standard guard bars
    ctx.fillRect(leftX, topY, barWidth * 2, height);
    ctx.fillRect(leftX + width - barWidth * 2, topY, barWidth * 2, height);

    for (let i = 3; i < numBars - 3; i++) {
      seed = (seed * 9301 + 49297) % 233280;
      if (seed % 10 > 3) {
        const thickness = (seed % 2 === 0) ? barWidth : barWidth * 1.5;
        ctx.fillRect(leftX + i * barWidth, topY, thickness, height);
      }
    }
  }
};
