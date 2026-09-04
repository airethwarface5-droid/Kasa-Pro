import React, { useState, useEffect } from 'react';
import {
  X,
  ChevronLeft,
  ChevronRight,
  MonitorPlay,
  FileText,
  Copy,
  Download,
  Check,
  Printer,
  Sparkles,
  WifiOff,
  Volume2,
  AlertTriangle,
  TrendingUp,
  ShoppingCart,
  Package,
  Layers,
  ArrowRight,
  Zap,
  ShieldCheck
} from 'lucide-react';

interface PresentationModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface SlideData {
  id: number;
  title: string;
  subtitle: string;
  badge: string;
  highlights: string[];
  features: { icon: string; title: string; description: string }[];
  quote?: string;
  metric?: { value: string; label: string };
  speakerNotes: string;
}

const slides: SlideData[] = [
  {
    id: 1,
    title: 'KASSA PRO POS & СКЛАД',
    subtitle: 'Комплексная торгово-складская экосистема нового поколения',
    badge: 'Слайд 1 • Введение',
    quote: '«Бесперебойные продажи, идеальный складской учет и нулевой простой кассы даже без интернета.»',
    highlights: [
      'Готовое решение для магазинов у дома, бутиков, кофеен и торговых сетей',
      'Единый контур: Касса (POS) + Умный склад + Аналитика + Офлайн-движок',
      'Мгновенный запуск на любом устройстве: ПК, планшет, смартфон или моноблок'
    ],
    features: [
      {
        icon: 'zap',
        title: 'Скорость 0 мс задержки',
        description: 'Локальная обработка каждого чека без ожидания сетевых ответов.'
      },
      {
        icon: 'offline',
        title: 'Offline-First архитектура',
        description: 'Полная автономность при обрыве интернет-соединения с автосинхронизацией.'
      },
      {
        icon: 'scan',
        title: 'Акустический сканер',
        description: 'Распознавание штрихкодов камерой и сканером со звуком 2400 Гц.'
      }
    ],
    metric: { value: '100%', label: 'готовность к работе без интернета' },
    speakerNotes:
      'Приветствуем на презентации KASSA PRO. Сегодня мы покажем, как современный розничный бизнес может избавиться от очередей, потерь товара и простоев кассы при сбоях связи.'
  },
  {
    id: 2,
    title: 'Проблематика ритейла и наше решение',
    subtitle: 'Устраняем 4 ключевые причины потери выручки в торговой точке',
    badge: 'Слайд 2 • Анализ рынка',
    highlights: [
      'Обычные облачные кассы зависают при малейшем сбое провайдера',
      'Кассиры не успевают отследить окончание ходового товара (out-of-stock)',
      'Долгое обслуживание клиентов из-за отсутствия четкой звуковой обратной связи',
      'Высокая стоимость и длительность обучения новых кассиров'
    ],
    features: [
      {
        icon: 'shield',
        title: 'Бесперебойная работа',
        description: 'Касса никогда не блокирует продажи: чеки сохраняются локально и отправляются в облако в фоне.'
      },
      {
        icon: 'alert',
        title: 'Интеллектуальный контроль (<5 шт)',
        description: 'Янтарная индикация дефицита и фильтр быстрой закупки предотвращают пустые полки.'
      },
      {
        icon: 'volume',
        title: 'Звуковой фидбек 2400 Гц',
        description: 'Кассир сканирует товар не глядя на экран, ориентируясь на четкий кассовый тон.'
      },
      {
        icon: 'ui',
        title: 'Интуитивный Bento-дизайн',
        description: 'Новый сотрудник начинает пробивать чеки через 5 минут после первого знакомства.'
      }
    ],
    metric: { value: '-85%', label: 'сокращение ошибок оператора' },
    speakerNotes:
      'Традиционные системы уязвимы к сетевым сбоям. KASSA PRO решает эту проблему в корне за счет локального кэширования и мгновенной акустической индикации.'
  },
  {
    id: 3,
    title: 'Архитектура Offline-First',
    subtitle: 'Надежность уровня Enterprise с облачной синхронизацией',
    badge: 'Слайд 3 • Архитектура',
    highlights: [
      'Локальный контур на клиенте обеспечивает максимальную скорость отклика интерфейса',
      'Транзакционная очередь сохраняет чеки и списания до подтверждения сервером',
      'Встроенная симуляция офлайн-режима для проверки регламентов работы кассиров',
      'Автоматическое разрешение конфликтов при параллельной работе нескольких касс'
    ],
    features: [
      {
        icon: 'db',
        title: 'Local Database (Кэш)',
        description: 'Хранение каталога, остатков и истории продаж прямо на устройстве кассира.'
      },
      {
        icon: 'sync',
        title: 'Очередь синхронизации',
        description: 'Асинхронная отправка пакетов изменений при появлении связи.'
      },
      {
        icon: 'cloud',
        title: 'Облачный бэкенд',
        description: 'Централизованная агрегация выручки, аналитики и остатков сети.'
      }
    ],
    metric: { value: '0 сек', label: 'простоя при аварии интернета' },
    speakerNotes:
      'В архитектуре KASSA PRO клиентский терминал самодостаточен. Облако служит для агрегации и отчетности, но отсутствие сети никогда не остановит продажи.'
  },
  {
    id: 4,
    title: 'Кассовый модуль (POS View)',
    subtitle: 'Скоростное оформление чеков и все виды оплат',
    badge: 'Слайд 4 • Касса',
    highlights: [
      'Интерактивная сетка товаров с группировкой по категориям и поиском по SKU',
      'Гибкие скидки: персональная скидка на строку или глобальная скидка на весь чек',
      'Мульти-оплата: наличные с мгновенным расчетом сдачи, карта, СБП по QR-коду',
      'Печать красивых чеков с QR-кодом проверки и реквизитами организации'
    ],
    features: [
      {
        icon: 'cart',
        title: 'Корзина в реальном времени',
        description: 'Управление количеством (+/-), быстрый сброс и проверка итоговых сумм.'
      },
      {
        icon: 'tag',
        title: 'Система скидок',
        description: 'Процентные и фиксированные скидки для программ лояльности.'
      },
      {
        icon: 'doc',
        title: 'Электронный и печатный чек',
        description: 'Готовые шаблоны чека 80мм/58мм с разбивкой по НДС и способам оплаты.'
      }
    ],
    metric: { value: '15 сек', label: 'среднее время пробития чека' },
    speakerNotes:
      'Интерфейс кассы оптимизирован под сенсорные экраны и клавиатуру. Минимальное количество кликов позволяет ускорить обслуживание очереди в 3 раза.'
  },
  {
    id: 5,
    title: 'Сканирование штрихкодов & Аудио-фидбек',
    subtitle: 'Оптическое распознавание камерой и поддержка физических сканеров',
    badge: 'Слайд 5 • Сканирование',
    highlights: [
      'Камера-сканер: распознавание 1D-кодов (EAN-13, CODE-128) прямо в браузере',
      'Поддержка беспроводных и USB сканеров в режиме клавиатурного клина',
      'Аутентичный звуковой сигнал 2400 Гц (~75 мс) на базе Web Audio API',
      'Предупреждающий сигнал ошибки, если товар не найден или закончился'
    ],
    features: [
      {
        icon: 'camera',
        title: 'Встроенный видео-сканер',
        description: 'Не требует покупки дорогостоящего оборудования — достаточно камеры смартфона.'
      },
      {
        icon: 'barcode',
        title: 'Фоновый перехват',
        description: 'Аппаратный сканер считывает штрихкод без обязательного фокуса в поле ввода.'
      },
      {
        icon: 'volume',
        title: 'Контроль звука',
        description: 'Кнопка быстрого тестирования громкости и отключения звука на панели.'
      }
    ],
    metric: { value: '2400 Гц', label: 'чистый кассовый аудиосигнал' },
    speakerNotes:
      'Качественная звуковая обратная связь подтверждает кассиру факт фиксации позиции, исключая двойное пробитие или пропуск товара.'
  },
  {
    id: 6,
    title: 'Склад и подсветка критических остатков',
    subtitle: 'Автоматическое предотвращение упущенной выручки (out-of-stock)',
    badge: 'Слайд 6 • Склад',
    highlights: [
      'Янтарная визуальная подсветка товаров с запасом менее 5 единиц в каталоге и чеке',
      'Кнопка-фильтр экспресс-закупки со счетчиком заканчивающихся позиций',
      'Журнал складских операций: оприходование, списание, переоценка, инвентаризация',
      'Полный контроль себестоимости, розничной наценки и минимального остатка'
    ],
    features: [
      {
        icon: 'alert',
        title: 'Маркер «Закупка (<5)»',
        description: 'Яркий бейдж и предупреждающая рамка сразу бросаются в глаза кассиру.'
      },
      {
        icon: 'filter',
        title: 'Режим закупки в 1 клик',
        description: 'Моментальная выборка позиций, которые необходимо передать менеджеру по закупкам.'
      },
      {
        icon: 'box',
        title: 'Аудит и корректировка',
        description: 'Быстрое внесение расхождений после ревизии без остановки продаж.'
      }
    ],
    metric: { value: '< 5 шт', label: 'порог немедленной закупки' },
    speakerNotes:
      'Система берет на себя рутину отслеживания дефицита. Кассир и товаровед видят критические остатки еще до того, как полка опустеет.'
  },
  {
    id: 7,
    title: 'Аналитика, X/Z-отчеты и экспорт',
    subtitle: 'Управленческий учет и контроль кассовой дисциплины',
    badge: 'Слайд 7 • Аналитика',
    highlights: [
      'Дашборд показателей: Выручка, Валовая прибыль, Средний чек, Количество продаж',
      'Распределение по видам оплат: Наличные, Банковские карты, СБП QR',
      'Формирование промежуточного X-отчета и итогового фискального Z-отчета',
      'Экспорт отчетов в PDF и табличные форматы для бухгалтерии'
    ],
    features: [
      {
        icon: 'chart',
        title: 'Динамика выручки',
        description: 'Наглядные графики продаж по часам дня и дням недели.'
      },
      {
        icon: 'top',
        title: 'Топ-товары (ABC-анализ)',
        description: 'Определение лидеров продаж и низкорентабельных позиций.'
      },
      {
        icon: 'pdf',
        title: 'Готовые отчеты',
        description: 'Печать сменных отчетов и инкассации одной кнопкой.'
      }
    ],
    metric: { value: '100%', label: 'прозрачность финансов и смен' },
    speakerNotes:
      'Руководитель получает полную картину происходящего на точке без необходимости вручную сводить чеки и кассовые ленты.'
  },
  {
    id: 8,
    title: 'Экономический эффект внедрения',
    subtitle: 'Окупаемость с первого месяца эксплуатации',
    badge: 'Слайд 8 • ROI & Эффект',
    highlights: [
      'Сокращение времени обслуживания очереди в 3 раза (с 60 до 20 секунд)',
      'Ликвидация простоев из-за отсутствия интернета (экономия до 12% дневной выручки)',
      'Снижение потерь от пересортицы и забытых заказов поставщикам',
      'Минимум затрат на оборудование: подходит существующая компьютерная техника'
    ],
    features: [
      {
        icon: 'trend',
        title: '+18% к пропускной способности',
        description: 'Касса обслуживает больше покупателей в часы пик.'
      },
      {
        icon: 'check',
        title: '0 руб. скрытых платежей',
        description: 'Прозрачная модель владения без принудительных платных обновлений.'
      },
      {
        icon: 'shield',
        title: 'Сохранность данных',
        description: 'Резервное копирование и экспорт базы в 1 клик.'
      }
    ],
    metric: { value: 'x3', label: 'ускорение обслуживания на кассе' },
    speakerNotes:
      'Внедрение KASSA PRO окупается за счет снижения очередей в часы пик и исключения упущенной выгоды от отсутствия ходового товара.'
  },
  {
    id: 9,
    title: 'Дорожная карта развития (Roadmap)',
    subtitle: 'План расширения возможностей системы на 2026 год',
    badge: 'Слайд 9 • Перспективы',
    highlights: [
      'Глубокая интеграция с национальной системой цифровой маркировки «Честный ЗНАК»',
      'Встроенная CRM-система и клиентские карты с начислением кешбэка',
      'Мульти-склад: распределение остатков по точкам и перемещение накладными',
      'AI-прогнозирование заказов на базе моделей машинного обучения'
    ],
    features: [
      {
        icon: 'sparkle',
        title: 'Маркировка DataMatrix',
        description: 'Валидация кодов маркировки табака, воды и молочной продукции.'
      },
      {
        icon: 'tag',
        title: 'Бонусные программы',
        description: 'Оплата бонусами, скидочные уровни и SMS-чеки клиентам.'
      },
      {
        icon: 'zap',
        title: 'AI Закупки',
        description: 'Автоматический расчет оптимального заказа с учетом сезонности.'
      }
    ],
    metric: { value: '2026', label: 'горизонт масштабирования' },
    speakerNotes:
      'Архитектура системы изначально проектировалась с запасом гибкости под регуляторные требования и сетевой масштаб.'
  },
  {
    id: 10,
    title: 'Запуск и подключение',
    subtitle: 'Начните автоматизацию вашей торговли уже сегодня',
    badge: 'Слайд 10 • Финал',
    quote: 'KASSA PRO — надежный цифровой фундамент вашей торговли.',
    highlights: [
      'Работает прямо в веб-браузере без сложной установки системных драйверов',
      'Предустановленная база с товарами и тестовыми операциями для быстрого теста',
      'Возможность выгрузки презентации и технической документации в формате Markdown/PDF'
    ],
    features: [
      {
        icon: 'check',
        title: 'Быстрый старт',
        description: 'Откройте ссылку на терминале кассира и начните сканирование.'
      },
      {
        icon: 'doc',
        title: 'Документация и файл',
        description: 'Полный текст презентации доступен в файле PRESENTATION.md.'
      },
      {
        icon: 'shield',
        title: 'Поддержка и надежность',
        description: 'Регулярные обновления и гарантия сохранности локальных данных.'
      }
    ],
    metric: { value: '5 мин', label: 'на первый запуск системы' },
    speakerNotes:
      'Благодарим за внимание! Мы готовы ответить на любые вопросы и провести демонстрацию работы сканера и офлайн-режима прямо сейчас.'
  }
];

export function PresentationModal({ isOpen, onClose }: PresentationModalProps) {
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [activeViewMode, setActiveViewMode] = useState<'slides' | 'document'>('slides');
  const [isCopied, setIsCopied] = useState(false);

  // Keyboard navigation (ArrowLeft / ArrowRight)
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === 'PageDown' || e.key === 'Space') {
        if (activeViewMode === 'slides') {
          e.preventDefault();
          setCurrentSlideIndex((prev) => Math.min(slides.length - 1, prev + 1));
        }
      } else if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
        if (activeViewMode === 'slides') {
          e.preventDefault();
          setCurrentSlideIndex((prev) => Math.max(0, prev - 1));
        }
      } else if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, activeViewMode, onClose]);

  if (!isOpen) return null;

  const currentSlide = slides[currentSlideIndex];

  // Full presentation markdown document string
  const fullDocumentText = `# KASSA PRO POS & СКЛАД — ПРЕЗЕНТАЦИЯ СИСТЕМЫ\n\n` +
    slides
      .map(
        (s) => `## СЛАЙД ${s.id}. ${s.title.toUpperCase()}\n` +
          `**${s.subtitle}** (${s.badge})\n\n` +
          (s.quote ? `> ${s.quote}\n\n` : '') +
          `### Ключевые тезисы:\n` +
          s.highlights.map((h) => `- ${h}`).join('\n') +
          `\n\n### Модули и возможности:\n` +
          s.features.map((f) => `- **${f.title}**: ${f.description}`).join('\n') +
          (s.metric ? `\n\n*Ключевая метрика: ${s.metric.value} — ${s.metric.label}*\n` : '') +
          `\n\n*Сноска докладчика:* ${s.speakerNotes}\n\n---`
      )
      .join('\n\n');

  const handleCopyDocument = () => {
    navigator.clipboard.writeText(fullDocumentText);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const handleDownloadMarkdown = () => {
    const blob = new Blob([fullDocumentText], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'KASSA_PRO_PRESENTATION.md';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handlePrint = () => {
    window.print();
  };

  const renderFeatureIcon = (type: string) => {
    switch (type) {
      case 'zap':
        return <Zap className="w-4 h-4 text-amber-500" />;
      case 'offline':
        return <WifiOff className="w-4 h-4 text-blue-500" />;
      case 'scan':
      case 'barcode':
        return <Package className="w-4 h-4 text-emerald-500" />;
      case 'shield':
        return <ShieldCheck className="w-4 h-4 text-indigo-500" />;
      case 'alert':
        return <AlertTriangle className="w-4 h-4 text-amber-600" />;
      case 'volume':
        return <Volume2 className="w-4 h-4 text-emerald-600" />;
      case 'ui':
        return <Layers className="w-4 h-4 text-blue-600" />;
      case 'cart':
        return <ShoppingCart className="w-4 h-4 text-blue-500" />;
      case 'chart':
      case 'trend':
        return <TrendingUp className="w-4 h-4 text-emerald-500" />;
      case 'sparkle':
        return <Sparkles className="w-4 h-4 text-purple-500" />;
      default:
        return <Check className="w-4 h-4 text-blue-500" />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        id="presentation-modal-container"
        className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-5xl h-[92vh] max-h-[850px] flex flex-col overflow-hidden"
      >
        {/* Modal Top Header Bar */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between gap-3 bg-slate-900 text-white shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-md shadow-blue-500/20">
              <MonitorPlay className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-base sm:text-lg tracking-tight text-white leading-none">
                  Презентация KASSA PRO
                </h3>
                <span className="text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-md bg-blue-500/30 text-blue-300 border border-blue-400/30">
                  Документ системы
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1 hidden sm:block">
                Полный обзор функционала, архитектуры, кассы, склада и бизнес-эффекта
              </p>
            </div>
          </div>

          {/* View Mode Switcher & Actions */}
          <div className="flex items-center gap-2">
            <div className="bg-slate-800 p-1 rounded-xl flex items-center border border-slate-700/80 text-xs font-semibold">
              <button
                id="view-mode-slides-btn"
                type="button"
                onClick={() => setActiveViewMode('slides')}
                className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all ${
                  activeViewMode === 'slides'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <MonitorPlay className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Слайды</span>
              </button>

              <button
                id="view-mode-document-btn"
                type="button"
                onClick={() => setActiveViewMode('document')}
                className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all ${
                  activeViewMode === 'document'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <FileText className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Текст документа</span>
              </button>
            </div>

            {/* Download / Copy Buttons */}
            <button
              id="copy-presentation-btn"
              type="button"
              onClick={handleCopyDocument}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition-colors"
              title="Копировать текст презентации в буфер обмена"
            >
              {isCopied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
            </button>

            <button
              id="download-presentation-btn"
              type="button"
              onClick={handleDownloadMarkdown}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition-colors"
              title="Скачать документ презентации (.md)"
            >
              <Download className="w-4 h-4" />
            </button>

            <button
              id="print-presentation-btn"
              type="button"
              onClick={handlePrint}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition-colors hidden sm:block"
              title="Печать / Сохранить в PDF"
            >
              <Printer className="w-4 h-4" />
            </button>

            <button
              id="close-presentation-btn"
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl bg-slate-800 hover:bg-rose-600 text-slate-300 hover:text-white border border-slate-700 transition-colors ml-1"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Body Content */}
        {activeViewMode === 'slides' ? (
          <div className="flex-1 flex flex-col md:flex-row overflow-hidden bg-slate-50/50">
            {/* Left Slides Navigation Sidebar */}
            <div className="w-full md:w-64 bg-slate-900 text-slate-300 border-r border-slate-800 flex flex-col shrink-0 overflow-y-auto max-h-44 md:max-h-none">
              <div className="p-3 border-b border-slate-800/80 flex items-center justify-between text-[11px] uppercase tracking-wider text-slate-400 font-bold">
                <span>Оглавление слайдов</span>
                <span>{slides.length} разделов</span>
              </div>
              <div className="p-2 space-y-1">
                {slides.map((s, idx) => (
                  <button
                    key={s.id}
                    id={`slide-nav-${s.id}`}
                    type="button"
                    onClick={() => setCurrentSlideIndex(idx)}
                    className={`w-full text-left p-2.5 rounded-xl text-xs transition-all flex items-start gap-2.5 ${
                      currentSlideIndex === idx
                        ? 'bg-blue-600 text-white font-bold shadow-sm'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                    }`}
                  >
                    <span
                      className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${
                        currentSlideIndex === idx ? 'bg-blue-700 text-white' : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      {s.id}
                    </span>
                    <span className="truncate leading-tight flex-1">{s.title}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Center Slide Stage */}
            <div className="flex-1 flex flex-col overflow-y-auto p-5 sm:p-8 justify-between">
              <div className="space-y-6 max-w-3xl mx-auto w-full">
                {/* Slide Header */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold px-3 py-1 rounded-full bg-blue-100 text-blue-800 border border-blue-200">
                      {currentSlide.badge}
                    </span>
                    {currentSlide.metric && (
                      <span className="text-xs font-bold px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center gap-1.5">
                        <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
                        <span>{currentSlide.metric.value} {currentSlide.metric.label}</span>
                      </span>
                    )}
                  </div>

                  <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight leading-tight">
                    {currentSlide.title}
                  </h2>
                  <p className="text-sm sm:text-base text-slate-600 font-medium">
                    {currentSlide.subtitle}
                  </p>
                </div>

                {/* Quote block if available */}
                {currentSlide.quote && (
                  <div className="p-4 rounded-2xl bg-blue-50/70 border-l-4 border-blue-600 text-blue-950 font-semibold text-sm sm:text-base italic shadow-2xs">
                    {currentSlide.quote}
                  </div>
                )}

                {/* Highlights list */}
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-2.5">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                    <span>Ключевые тезисы слайда</span>
                  </h4>
                  <ul className="space-y-2 text-xs sm:text-sm text-slate-700">
                    {currentSlide.highlights.map((h, i) => (
                      <li key={i} className="flex items-start gap-2.5">
                        <span className="w-5 h-5 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center text-xs font-bold shrink-0 mt-0.5 border border-blue-100">
                          ✓
                        </span>
                        <span className="leading-snug">{h}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Features Bento Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {currentSlide.features.map((feat, idx) => (
                    <div
                      key={idx}
                      className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-2xs hover:shadow-xs hover:border-blue-300 transition-all space-y-1.5"
                    >
                      <div className="w-8 h-8 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center shrink-0">
                        {renderFeatureIcon(feat.icon)}
                      </div>
                      <h5 className="font-bold text-xs sm:text-sm text-slate-900 leading-tight">
                        {feat.title}
                      </h5>
                      <p className="text-xs text-slate-500 leading-relaxed">
                        {feat.description}
                      </p>
                    </div>
                  ))}
                </div>

                {/* Speaker Notes Callout */}
                <div className="p-3.5 rounded-xl bg-slate-100/90 border border-slate-200 text-xs text-slate-600 flex items-start gap-2.5">
                  <span className="font-bold text-[10px] uppercase tracking-wider text-slate-400 px-1.5 py-0.5 rounded bg-slate-200 shrink-0 mt-0.5">
                    Заметка спикера
                  </span>
                  <p className="italic leading-relaxed">{currentSlide.speakerNotes}</p>
                </div>
              </div>

              {/* Bottom Navigation Toolbar */}
              <div className="pt-6 mt-6 border-t border-slate-200 flex items-center justify-between gap-4 max-w-3xl mx-auto w-full shrink-0">
                <button
                  id="prev-slide-btn"
                  type="button"
                  disabled={currentSlideIndex === 0}
                  onClick={() => setCurrentSlideIndex((prev) => Math.max(0, prev - 1))}
                  className={`px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all border ${
                    currentSlideIndex === 0
                      ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed opacity-60'
                      : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-300 shadow-xs active:scale-95'
                  }`}
                >
                  <ChevronLeft className="w-4 h-4" />
                  <span>Предыдущий</span>
                </button>

                {/* Slide Dots / Counter */}
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-500 font-mono">
                    {currentSlideIndex + 1} / {slides.length}
                  </span>
                  <div className="hidden sm:flex items-center gap-1">
                    {slides.map((_, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => setCurrentSlideIndex(i)}
                        className={`h-2 rounded-full transition-all ${
                          currentSlideIndex === i
                            ? 'w-6 bg-blue-600'
                            : 'w-2 bg-slate-300 hover:bg-slate-400'
                        }`}
                        title={`Слайд ${i + 1}`}
                      />
                    ))}
                  </div>
                </div>

                <button
                  id="next-slide-btn"
                  type="button"
                  disabled={currentSlideIndex === slides.length - 1}
                  onClick={() =>
                    setCurrentSlideIndex((prev) => Math.min(slides.length - 1, prev + 1))
                  }
                  className={`px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all ${
                    currentSlideIndex === slides.length - 1
                      ? 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed opacity-60'
                      : 'bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-500/20 active:scale-95'
                  }`}
                >
                  <span>Следующий</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        ) : (
          /* Full Text Document Mode */
          <div className="flex-1 overflow-y-auto p-6 sm:p-10 bg-slate-50 font-mono text-xs sm:text-sm text-slate-800 leading-relaxed select-text">
            <div className="max-w-3xl mx-auto bg-white p-6 sm:p-10 rounded-2xl border border-slate-200 shadow-xs space-y-6">
              <div className="flex items-center justify-between border-b border-slate-200 pb-4">
                <div>
                  <h2 className="text-lg font-bold font-sans text-slate-900">
                    Документ: Презентация KASSA PRO
                  </h2>
                  <p className="text-xs text-slate-500 font-sans mt-0.5">
                    Формат: Markdown (.md) • Версия v2.4 Enterprise
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleDownloadMarkdown}
                  className="px-3 py-1.5 rounded-xl bg-blue-600 text-white font-sans text-xs font-bold flex items-center gap-1.5 hover:bg-blue-700 shadow-xs"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Скачать PRESENTATION.md</span>
                </button>
              </div>

              <pre className="whitespace-pre-wrap font-mono text-slate-700 text-xs sm:text-sm leading-relaxed overflow-x-auto bg-slate-50 p-4 rounded-xl border border-slate-200">
                {fullDocumentText}
              </pre>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
