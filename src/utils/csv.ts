import { Product } from '../types';

export function exportProductsToCSV(products: Product[]): string {
  const headers = [
    'Артикул (SKU)',
    'Наименование товара',
    'Штрихкод',
    'Категория',
    'Цена продажи (руб)',
    'Себестоимость (руб)',
    'Текущий остаток',
    'Мин. остаток',
    'Единица измерения',
    'Маркировка (Честный ЗНАК)'
  ];

  const escapeField = (val: string | number | undefined): string => {
    if (val === undefined || val === null) return '';
    const str = String(val).replace(/"/g, '""');
    return `"${str}"`;
  };

  const rows = products.map(p => [
    escapeField(p.sku),
    escapeField(p.name),
    escapeField(p.barcode),
    escapeField(p.category),
    p.price,
    p.costPrice,
    p.stock,
    p.minStock,
    escapeField(p.unit),
    p.isMarked ? 'Да' : 'Нет'
  ].join(';'));

  // UTF-8 BOM for Excel to open Russian characters correctly
  return '\uFEFF' + [headers.map(h => `"${h}"`).join(';'), ...rows].join('\r\n');
}

export function parseProductsFromCSV(csvText: string): Partial<Product>[] {
  const cleanText = csvText.replace(/^\uFEFF/, '');
  const lines = cleanText.split(/\r\n|\n|\r/).filter(l => l.trim().length > 0);
  if (lines.length < 2) return [];

  // Determine delimiter: semicolon or comma
  const headerLine = lines[0];
  const delimiter = headerLine.includes(';') ? ';' : ',';

  const parseLine = (line: string): string[] => {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === delimiter && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    result.push(current.trim());
    return result;
  };

  const items: Partial<Product>[] = [];

  for (let i = 1; i < lines.length; i++) {
    const cols = parseLine(lines[i]);
    if (cols.length < 3) continue;

    // Col indexes heuristics
    const sku = cols[0] || ('SKU-' + Math.floor(1000 + Math.random() * 9000));
    const name = cols[1];
    const barcode = cols[2] || ('460' + Math.floor(1000000000 + Math.random() * 9000000000));
    const category = cols[3] || 'Прочие товары';
    const price = parseFloat((cols[4] || '0').replace(',', '.')) || 0;
    const costPrice = parseFloat((cols[5] || '0').replace(',', '.')) || Math.round(price * 0.6);
    const stock = parseFloat((cols[6] || '0').replace(',', '.')) || 0;
    const minStock = parseFloat((cols[7] || '5').replace(',', '.')) || 5;
    const unitRaw = (cols[8] || 'шт').toLowerCase();
    const unit: 'шт' | 'кг' | 'л' | 'м' | 'уп' =
      unitRaw === 'кг' ? 'кг' : unitRaw === 'л' ? 'л' : unitRaw === 'м' ? 'м' : unitRaw === 'уп' ? 'уп' : 'шт';
    const isMarked = (cols[9] || '').toLowerCase() === 'да' || (cols[9] || '').toLowerCase() === 'true';

    if (name) {
      items.push({
        sku,
        name,
        barcode,
        category,
        price,
        costPrice,
        stock,
        minStock,
        unit,
        isMarked
      });
    }
  }

  return items;
}

export const parseCSV = parseProductsFromCSV;

export function downloadCSVFile(content: string, fileName: string) {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', fileName);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
