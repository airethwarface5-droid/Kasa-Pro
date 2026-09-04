import React, { useState, useEffect } from 'react';
import {
  X,
  User,
  UserPlus,
  UserCheck,
  Phone,
  Gift,
  Search,
  CheckCircle2,
  Trash2,
  Edit2,
  Percent,
  Coins,
  AlertTriangle,
  ArrowLeft,
  Calendar,
  ShoppingBag,
  Clock,
  Lock,
  Unlock,
  ShieldCheck,
  ShieldAlert,
  KeyRound,
  Eye,
  EyeOff,
  Shield
} from 'lucide-react';
import { Customer } from '../types';
import { localDB } from '../services/localDB';
import { sounds } from '../utils/audio';

interface CustomerLoyaltyModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedCustomer?: Customer | null;
  currentCustomer?: Customer | null;
  onSelectCustomer: (cust: Customer | null) => void;
}

export const CustomerLoyaltyModal: React.FC<CustomerLoyaltyModalProps> = ({
  isOpen,
  onClose,
  selectedCustomer,
  currentCustomer,
  onSelectCustomer,
}) => {
  const [customers, setCustomers] = useState<Customer[]>(() => localDB.getCustomers() || []);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'bonuses' | 'discount'>('all');
  const [mode, setMode] = useState<'list' | 'add' | 'edit'>('list');
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);

  // Developer Security Mode State
  const [isDevUnlocked, setIsDevUnlocked] = useState(() => localDB.isDeveloperUnlocked());
  const [isDevAuthModalOpen, setIsDevAuthModalOpen] = useState(false);
  const [devKeyInput, setDevKeyInput] = useState('');
  const [devKeyError, setDevKeyError] = useState<string | null>(null);
  const [showDevKey, setShowDevKey] = useState(false);
  const [isChangingMasterKey, setIsChangingMasterKey] = useState(false);
  const [newMasterKeyInput, setNewMasterKeyInput] = useState('');

  // Form state
  const [formName, setFormName] = useState('');
  const [formPhone, setFormPhone] = useState('+7 ');
  const [formBonus, setFormBonus] = useState(100);
  const [formDiscount, setFormDiscount] = useState(0);

  const activeSelected = selectedCustomer || currentCustomer || null;

  // Whenever modal opens, refresh from DB and reset states
  useEffect(() => {
    if (isOpen) {
      const fresh = localDB.getCustomers() || [];
      setCustomers(fresh);
      setIsDevUnlocked(localDB.isDeveloperUnlocked());
      setSearch('');
      setFilterType('all');
      setMode('list');
      setEditingCustomer(null);
      setDeleteConfirmId(null);
      setFeedbackMessage(null);
      setIsDevAuthModalOpen(false);
      setDevKeyInput('');
      setDevKeyError(null);
      setIsChangingMasterKey(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const showFeedback = (msg: string) => {
    setFeedbackMessage(msg);
    setTimeout(() => setFeedbackMessage(null), 3500);
  };

  const handleStartAdd = () => {
    setFormName('');
    setFormPhone('+7 ');
    // Only developer can set custom initial bonuses / discounts
    setFormBonus(isDevUnlocked ? 100 : 0);
    setFormDiscount(0);
    setEditingCustomer(null);
    setDeleteConfirmId(null);
    setMode('add');
  };

  const handleStartEdit = (cust: Customer, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setEditingCustomer(cust);
    setFormName(cust.name);
    setFormPhone(cust.phone);
    setFormBonus(cust.bonusBalance || 0);
    setFormDiscount(cust.discountPercent || 0);
    setDeleteConfirmId(null);
    setMode('edit');
  };

  const handleCancelForm = () => {
    setMode('list');
    setEditingCustomer(null);
  };

  const handleVerifyDevKey = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (localDB.verifyDeveloperKey(devKeyInput)) {
      setIsDevUnlocked(true);
      setIsDevAuthModalOpen(false);
      setDevKeyInput('');
      setDevKeyError(null);
      sounds.playSuccessChime();
      showFeedback('Режим разработчика активирован! Доступ к бонусам и скидкам открыт.');
    } else {
      sounds.playErrorBeep();
      setDevKeyError('Неверный мастер-код разработчика! В доступе отказано.');
    }
  };

  const handleLockDeveloperMode = () => {
    localDB.setDeveloperUnlocked(false);
    setIsDevUnlocked(false);
    sounds.playTrashSound();
    showFeedback('Режим разработчика выключен. Изменение бонусов и скидок заблокировано.');
  };

  const handleChangeMasterKey = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMasterKeyInput || newMasterKeyInput.trim().length < 4) {
      setDevKeyError('Мастер-код должен содержать не менее 4 символов');
      return;
    }
    localDB.setDeveloperMasterKey(newMasterKeyInput.trim());
    setIsChangingMasterKey(false);
    setNewMasterKeyInput('');
    sounds.playSuccessChime();
    showFeedback('Мастер-код разработчика успешно обновлен!');
  };

  const handleSaveCustomer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim() || formPhone.trim().length < 6) return;

    if (mode === 'edit' && editingCustomer) {
      const updated: Customer = {
        ...editingCustomer,
        name: formName.trim(),
        phone: formPhone.trim(),
        // Only developer can modify bonusBalance and discountPercent
        bonusBalance: isDevUnlocked
          ? Math.max(0, Number(formBonus) || 0)
          : editingCustomer.bonusBalance,
        discountPercent: isDevUnlocked
          ? Math.min(100, Math.max(0, Number(formDiscount) || 0))
          : editingCustomer.discountPercent,
      };

      const updatedList = localDB.saveCustomer(updated, isDevUnlocked);
      setCustomers(updatedList);

      // If this customer is currently assigned to the active cart, update it
      if (activeSelected?.id === updated.id) {
        onSelectCustomer(updated);
      }

      sounds.playSuccessChime();
      showFeedback(`Данные клиента «${updated.name}» успешно обновлены!`);
      setMode('list');
      setEditingCustomer(null);
    } else {
      // Add new
      const newCust: Customer = {
        id: 'cust-' + Date.now().toString(36),
        name: formName.trim(),
        phone: formPhone.trim(),
        // Only developer can assign initial bonuses or discount
        bonusBalance: isDevUnlocked ? Math.max(0, Number(formBonus) || 0) : 0,
        discountPercent: isDevUnlocked ? Math.min(100, Math.max(0, Number(formDiscount) || 0)) : 0,
        totalSpent: 0,
        visitsCount: 1,
        createdAt: new Date().toISOString()
      };

      const updatedList = localDB.saveCustomer(newCust, isDevUnlocked);
      setCustomers(updatedList);
      sounds.playSuccessChime();
      showFeedback(`Покупатель «${newCust.name}» добавлен в базу!`);
      setMode('list');

      // Auto-select newly created customer
      onSelectCustomer(newCust);
    }
  };

  const handleDeleteCustomer = (cust: Customer, e?: React.MouseEvent) => {
    e?.stopPropagation();
    const updatedList = localDB.deleteCustomer(cust.id);
    setCustomers(updatedList);
    setDeleteConfirmId(null);

    // If deleted customer was selected in POS, unselect them
    if (activeSelected?.id === cust.id) {
      onSelectCustomer(null);
    }

    sounds.playTrashSound();
    showFeedback(`Клиент «${cust.name}» удален из базы.`);
  };

  const handlePickCustomer = (c: Customer) => {
    onSelectCustomer(c);
    sounds.playScanBeep();
    onClose();
  };

  const handleClearSelection = () => {
    onSelectCustomer(null);
  };

  // Filtered list
  const filtered = (customers || []).filter(c => {
    if (!c) return false;
    const q = (search || '').trim().toLowerCase();
    if (!q) {
      if (filterType === 'bonuses') return (c.bonusBalance || 0) > 0;
      if (filterType === 'discount') return (c.discountPercent || 0) > 0;
      return true;
    }
    const cleanDigits = q.replace(/\D/g, '');
    const matchesQuery =
      (c.name ? c.name.toLowerCase().includes(q) : false) ||
      (cleanDigits && c.phone ? c.phone.replace(/\D/g, '').includes(cleanDigits) : false);

    if (!matchesQuery) return false;

    if (filterType === 'bonuses') return (c.bonusBalance || 0) > 0;
    if (filterType === 'discount') return (c.discountPercent || 0) > 0;
    return true;
  });

  const totalBonuses = customers.reduce((acc, c) => acc + (c.bonusBalance || 0), 0);
  const totalWithDiscount = customers.filter(c => (c.discountPercent || 0) > 0).length;

  return (
    <div
      id="customer-loyalty-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200"
    >
      <div
        id="customer-loyalty-modal-container"
        className="relative w-full max-w-2xl bg-white border border-slate-200 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-gradient-to-r from-indigo-600 to-blue-600 text-white shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/20 flex items-center justify-center shadow-xs">
              <Gift className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-base leading-tight">База клиентов & Программа лояльности</h3>
                <span className="text-[11px] bg-white/20 text-white font-bold px-2 py-0.5 rounded-full">
                  {customers.length} чел.
                </span>
              </div>
              <p className="text-xs text-indigo-100 mt-0.5">
                Редактирование профилей, скидки, баланс бонусов и привязка к чеку
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {isDevUnlocked ? (
              <button
                id="dev-mode-active-btn"
                type="button"
                onClick={handleLockDeveloperMode}
                className="text-[11px] bg-emerald-500/30 hover:bg-emerald-500/40 text-emerald-100 border border-emerald-400/40 font-bold px-2.5 py-1 rounded-xl flex items-center gap-1.5 transition-colors shadow-2xs cursor-pointer"
                title="Режим разработчика активен. Нажмите чтобы заблокировать доступ"
              >
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-300" />
                <span className="hidden sm:inline">Разработчик</span>
                <Lock className="w-3 h-3 text-emerald-300 ml-0.5" />
              </button>
            ) : (
              <button
                id="dev-mode-login-btn"
                type="button"
                onClick={() => {
                  setDevKeyInput('');
                  setDevKeyError(null);
                  setIsDevAuthModalOpen(true);
                }}
                className="text-[11px] bg-white/15 hover:bg-white/25 text-indigo-100 hover:text-white border border-white/20 font-bold px-2.5 py-1 rounded-xl flex items-center gap-1.5 transition-colors shadow-2xs cursor-pointer"
                title="Войти как разработчик для изменения бонусов и скидок"
              >
                <Lock className="w-3.5 h-3.5 text-amber-300" />
                <span className="hidden sm:inline">Доступ разработчика</span>
              </button>
            )}

            <button
              id="close-loyalty-modal-btn"
              onClick={onClose}
              className="w-8 h-8 rounded-xl flex items-center justify-center bg-white/10 hover:bg-white/20 text-white transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Feedback Alert */}
        {feedbackMessage && (
          <div className="bg-emerald-50 border-b border-emerald-200 px-6 py-2.5 flex items-center gap-2 text-emerald-800 text-xs font-semibold animate-in fade-in slide-in-from-top-1">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{feedbackMessage}</span>
          </div>
        )}

        {/* Body Content */}
        <div className="p-6 overflow-y-auto space-y-4 flex-1">
          {/* Active selection banner */}
          {activeSelected && mode === 'list' && (
            <div
              id="active-customer-banner"
              className="p-4 rounded-2xl bg-indigo-50/80 border border-indigo-200 flex items-center justify-between gap-3 shadow-2xs"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-11 h-11 rounded-2xl bg-indigo-600 text-white flex items-center justify-center font-bold text-base shadow-xs shrink-0">
                  {activeSelected.name.slice(0, 1).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-slate-900 truncate">
                      {activeSelected.name}
                    </span>
                    <span className="text-[10px] bg-indigo-600 text-white px-2 py-0.5 rounded-full font-bold shrink-0 flex items-center gap-1">
                      <UserCheck className="w-3 h-3" />
                      Выбран в кассу
                    </span>
                  </div>
                  <div className="text-xs text-slate-600 mt-0.5 flex items-center gap-3 flex-wrap">
                    <span className="font-mono">{activeSelected.phone}</span>
                    <span className="font-bold text-amber-700 flex items-center gap-1">
                      <Coins className="w-3.5 h-3.5 text-amber-500" />
                      {activeSelected.bonusBalance} бонусов
                    </span>
                    {activeSelected.discountPercent > 0 && (
                      <span className="font-bold text-emerald-700 flex items-center gap-1">
                        <Percent className="w-3 h-3" />
                        Скидка {activeSelected.discountPercent}%
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  onClick={e => handleStartEdit(activeSelected, e)}
                  className="px-2.5 py-1.5 rounded-xl border border-indigo-200 text-indigo-700 bg-white hover:bg-indigo-100 text-xs font-semibold flex items-center gap-1 transition-colors"
                  title="Редактировать выбранного клиента"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Изменить</span>
                </button>
                <button
                  type="button"
                  onClick={handleClearSelection}
                  className="px-2.5 py-1.5 rounded-xl border border-rose-200 text-rose-700 bg-white hover:bg-rose-50 text-xs font-semibold transition-colors"
                  title="Убрать клиента из чека"
                >
                  Открепить
                </button>
              </div>
            </div>
          )}

          {/* MODE: ADD OR EDIT CUSTOMER */}
          {mode !== 'list' ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleCancelForm}
                    className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-500 hover:text-slate-800 transition-colors"
                  >
                    <ArrowLeft className="w-4 h-4" />
                  </button>
                  <h4 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                    {mode === 'edit' ? (
                      <>
                        <Edit2 className="w-4 h-4 text-indigo-600" />
                        <span>Редактирование профиля: {editingCustomer?.name}</span>
                      </>
                    ) : (
                      <>
                        <UserPlus className="w-4 h-4 text-indigo-600" />
                        <span>Регистрация нового покупателя</span>
                      </>
                    )}
                  </h4>
                </div>
                <button
                  type="button"
                  onClick={handleCancelForm}
                  className="text-xs text-slate-500 hover:text-slate-800"
                >
                  Вернуться к списку
                </button>
              </div>

              {mode === 'edit' && editingCustomer && (
                <div className="grid grid-cols-3 gap-2.5 bg-slate-50 p-3 rounded-2xl border border-slate-200/80 text-xs">
                  <div className="flex items-center gap-2">
                    <ShoppingBag className="w-4 h-4 text-slate-400" />
                    <div>
                      <div className="text-[10px] text-slate-400">Покупок на сумму</div>
                      <div className="font-bold text-slate-800">
                        {(editingCustomer.totalSpent || 0).toLocaleString('ru-RU')} ₽
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-slate-400" />
                    <div>
                      <div className="text-[10px] text-slate-400">Количество чеков</div>
                      <div className="font-bold text-slate-800">
                        {editingCustomer.visitsCount || 1} визитов
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-slate-400" />
                    <div>
                      <div className="text-[10px] text-slate-400">В базе с</div>
                      <div className="font-bold text-slate-800">
                        {editingCustomer.createdAt
                          ? new Date(editingCustomer.createdAt).toLocaleDateString('ru-RU')
                          : 'Ранее'}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <form onSubmit={handleSaveCustomer} className="space-y-4 bg-slate-50/70 p-4 rounded-2xl border border-slate-200">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-bold uppercase text-slate-600 block mb-1">
                      ФИО / Имя клиента <span className="text-rose-500">*</span>
                    </label>
                    <input
                      id="customer-form-name"
                      type="text"
                      required
                      value={formName}
                      onChange={e => setFormName(e.target.value)}
                      placeholder="Например: Анна Смирнова"
                      className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2 text-xs font-medium text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none shadow-2xs"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-bold uppercase text-slate-600 block mb-1">
                      Номер телефона <span className="text-rose-500">*</span>
                    </label>
                    <input
                      id="customer-form-phone"
                      type="tel"
                      required
                      value={formPhone}
                      onChange={e => setFormPhone(e.target.value)}
                      placeholder="+7 (999) 000-00-00"
                      className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2 text-xs font-mono font-medium text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none shadow-2xs"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-bold uppercase text-slate-600 block mb-1 flex items-center justify-between">
                      <span className="flex items-center gap-1">
                        <Coins className="w-3.5 h-3.5 text-amber-500" />
                        Баланс бонусов (баллы)
                      </span>
                      {isDevUnlocked ? (
                        <span className="text-[10px] text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded font-bold flex items-center gap-1">
                          <Unlock className="w-2.5 h-2.5 text-emerald-600" />
                          Разблокировано
                        </span>
                      ) : (
                        <span className="text-[10px] text-amber-800 bg-amber-100 px-1.5 py-0.5 rounded font-bold flex items-center gap-1">
                          <Lock className="w-2.5 h-2.5 text-amber-600" />
                          Только разработчик
                        </span>
                      )}
                    </label>
                    <div className="relative">
                      <input
                        id="customer-form-bonuses"
                        type="number"
                        min="0"
                        disabled={!isDevUnlocked}
                        value={formBonus}
                        onChange={e => setFormBonus(Math.max(0, parseInt(e.target.value, 10) || 0))}
                        className={`w-full border rounded-xl px-3.5 py-2 text-xs font-bold outline-none shadow-2xs transition-colors ${
                          isDevUnlocked
                            ? 'bg-white border-amber-300 text-amber-900 focus:ring-2 focus:ring-indigo-500'
                            : 'bg-slate-100/90 border-slate-200 text-slate-500 cursor-not-allowed select-none'
                        }`}
                      />
                      {!isDevUnlocked && (
                        <button
                          type="button"
                          onClick={() => {
                            setDevKeyInput('');
                            setDevKeyError(null);
                            setIsDevAuthModalOpen(true);
                          }}
                          title="Разблокировать редактирование бонусов (вход разработчика)"
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-amber-600 p-1 transition-colors cursor-pointer"
                        >
                          <Lock className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                    {!isDevUnlocked && (
                      <p className="text-[10px] text-slate-400 mt-1 flex items-center gap-1">
                        <span>Заблокировано системой безопасности. Начисление разрешено только разработчику</span>
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="text-[11px] font-bold uppercase text-slate-600 block mb-1 flex items-center justify-between">
                      <span className="flex items-center gap-1">
                        <Percent className="w-3.5 h-3.5 text-emerald-600" />
                        Персональная скидка (%)
                      </span>
                      {isDevUnlocked ? (
                        <span className="text-[10px] text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded font-bold flex items-center gap-1">
                          <Unlock className="w-2.5 h-2.5 text-emerald-600" />
                          Разблокировано
                        </span>
                      ) : (
                        <span className="text-[10px] text-amber-800 bg-amber-100 px-1.5 py-0.5 rounded font-bold flex items-center gap-1">
                          <Lock className="w-2.5 h-2.5 text-amber-600" />
                          Только разработчик
                        </span>
                      )}
                    </label>
                    <div className="relative">
                      <input
                        id="customer-form-discount"
                        type="number"
                        min="0"
                        max="50"
                        disabled={!isDevUnlocked}
                        value={formDiscount}
                        onChange={e => setFormDiscount(Math.min(50, Math.max(0, parseInt(e.target.value, 10) || 0)))}
                        className={`w-full border rounded-xl px-3.5 py-2 text-xs font-bold outline-none shadow-2xs transition-colors ${
                          isDevUnlocked
                            ? 'bg-white border-emerald-300 text-emerald-900 focus:ring-2 focus:ring-indigo-500'
                            : 'bg-slate-100/90 border-slate-200 text-slate-500 cursor-not-allowed select-none'
                        }`}
                      />
                      {!isDevUnlocked && (
                        <button
                          type="button"
                          onClick={() => {
                            setDevKeyInput('');
                            setDevKeyError(null);
                            setIsDevAuthModalOpen(true);
                          }}
                          title="Разблокировать редактирование скидки (вход разработчика)"
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-emerald-600 p-1 transition-colors cursor-pointer"
                        >
                          <Lock className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                    {!isDevUnlocked && (
                      <p className="text-[10px] text-slate-400 mt-1 flex items-center gap-1">
                        <span>Заблокировано. Персональная скидка устанавливается только разработчиком</span>
                      </p>
                    )}
                  </div>
                </div>

                {/* Developer Security Banner inside Form */}
                {!isDevUnlocked ? (
                  <div
                    id="loyalty-security-locked-card"
                    className="bg-amber-50/90 border border-amber-200/90 rounded-2xl p-3.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-2xs"
                  >
                    <div className="flex items-start gap-2.5">
                      <div className="w-8 h-8 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-2xs mt-0.5">
                        <ShieldAlert className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-amber-950 flex items-center gap-1.5">
                          <span>Защита финансовой программы лояльности</span>
                          <span className="text-[10px] bg-amber-200 text-amber-900 px-1.5 py-0.5 rounded font-bold">
                            Безопасность
                          </span>
                        </div>
                        <p className="text-[11px] text-amber-800 mt-0.5 leading-snug">
                          Никакие сотрудники и кассиры не могут менять баланс бонусов или скидку.
                          Для ручной корректировки требуется авторизация разработчика приложения.
                        </p>
                      </div>
                    </div>
                    <button
                      id="open-dev-auth-modal-btn"
                      type="button"
                      onClick={() => {
                        setDevKeyInput('');
                        setDevKeyError(null);
                        setIsDevAuthModalOpen(true);
                      }}
                      className="px-3 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold flex items-center gap-1.5 shrink-0 transition-colors shadow-2xs cursor-pointer"
                    >
                      <KeyRound className="w-3.5 h-3.5" />
                      <span>Ввести мастер-код</span>
                    </button>
                  </div>
                ) : (
                  <div
                    id="loyalty-security-unlocked-card"
                    className="bg-emerald-50 border border-emerald-200 rounded-2xl p-3.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-2xs"
                  >
                    <div className="flex items-start gap-2.5">
                      <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-2xs mt-0.5">
                        <ShieldCheck className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-emerald-950 flex items-center gap-1.5">
                          <span>Режим разработчика активирован</span>
                          <span className="text-[10px] bg-emerald-200 text-emerald-900 px-1.5 py-0.5 rounded font-bold">
                            Полный доступ
                          </span>
                        </div>
                        <p className="text-[11px] text-emerald-800 mt-0.5 leading-snug">
                          Вы авторизованы как разработчик. Изменение баланса бонусов и персональной скидки открыто.
                        </p>
                      </div>
                    </div>
                    <button
                      id="lock-dev-mode-btn"
                      type="button"
                      onClick={handleLockDeveloperMode}
                      className="px-3 py-1.5 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs font-bold flex items-center gap-1.5 shrink-0 transition-colors cursor-pointer"
                    >
                      <Lock className="w-3.5 h-3.5" />
                      <span>Заблокировать доступ</span>
                    </button>
                  </div>
                )}

                <div className="flex items-center justify-between pt-3 border-t border-slate-200">
                  {mode === 'edit' && editingCustomer ? (
                    <button
                      type="button"
                      onClick={e => {
                        setDeleteConfirmId(editingCustomer.id);
                        handleCancelForm();
                      }}
                      className="text-xs text-rose-600 hover:text-rose-800 font-semibold flex items-center gap-1"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Удалить клиента</span>
                    </button>
                  ) : <div />}

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleCancelForm}
                      className="px-3.5 py-2 text-xs text-slate-600 hover:bg-slate-200 rounded-xl transition-colors font-medium"
                    >
                      Отмена
                    </button>
                    <button
                      id="save-customer-submit-btn"
                      type="submit"
                      className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors"
                    >
                      {mode === 'edit' ? 'Сохранить изменения' : 'Создать и выбрать'}
                    </button>
                  </div>
                </div>
              </form>
            </div>
          ) : (
            /* MODE: CUSTOMER LIST */
            <div className="space-y-3.5">
              {/* Top Controls: Search + New Button */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    id="customer-search-input"
                    type="text"
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    placeholder="Поиск по имени или номеру телефона..."
                    className="w-full pl-9.5 pr-4 py-2 bg-slate-100 border border-slate-200 rounded-xl text-xs outline-none focus:bg-white focus:ring-2 focus:ring-indigo-500 transition-all placeholder:text-slate-400"
                  />
                  {search && (
                    <button
                      type="button"
                      onClick={() => setSearch('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs"
                    >
                      ✕
                    </button>
                  )}
                </div>

                <button
                  id="add-customer-btn"
                  type="button"
                  onClick={handleStartAdd}
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-colors shadow-xs shrink-0"
                >
                  <UserPlus className="w-4 h-4" />
                  <span>Новый покупатель</span>
                </button>
              </div>

              {/* Quick Filter Badges */}
              <div className="flex items-center justify-between gap-2 flex-wrap text-xs">
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setFilterType('all')}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-colors ${
                      filterType === 'all'
                        ? 'bg-slate-900 text-white'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    Все ({customers.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setFilterType('bonuses')}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-colors flex items-center gap-1 ${
                      filterType === 'bonuses'
                        ? 'bg-amber-600 text-white'
                        : 'bg-amber-50 text-amber-800 border border-amber-200/60 hover:bg-amber-100'
                    }`}
                  >
                    <Coins className="w-3 h-3" />
                    <span>С бонусами ({customers.filter(c => (c.bonusBalance || 0) > 0).length})</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setFilterType('discount')}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-colors flex items-center gap-1 ${
                      filterType === 'discount'
                        ? 'bg-emerald-700 text-white'
                        : 'bg-emerald-50 text-emerald-800 border border-emerald-200/60 hover:bg-emerald-100'
                    }`}
                  >
                    <Percent className="w-3 h-3" />
                    <span>VIP со скидкой ({totalWithDiscount})</span>
                  </button>
                </div>

                <div className="text-[11px] text-slate-400">
                  Бонусный фонд: <span className="font-bold text-amber-700">{totalBonuses.toLocaleString('ru-RU')} Б</span>
                </div>
              </div>

              {/* Customers List */}
              <div className="space-y-2 max-h-[460px] overflow-y-auto pr-0.5">
                {filtered.length === 0 ? (
                  <div className="text-center py-12 text-slate-400 text-xs bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
                    <User className="w-8 h-8 text-slate-300 mx-auto mb-2 stroke-1" />
                    <p className="font-medium text-slate-600">Клиенты не найдены</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      {search ? 'Попробуйте изменить запрос поиска' : 'Добавьте первого покупателя кнопкой выше'}
                    </p>
                  </div>
                ) : (
                  filtered.map(c => {
                    const isSelected = activeSelected?.id === c.id;
                    const isConfirmingDelete = deleteConfirmId === c.id;

                    return (
                      <div
                        key={c.id}
                        id={`customer-card-${c.id}`}
                        className={`rounded-2xl border transition-all overflow-hidden ${
                          isSelected
                            ? 'border-indigo-500 bg-indigo-50/40 shadow-xs ring-1 ring-indigo-500'
                            : 'border-slate-200 hover:border-indigo-200 bg-white hover:bg-slate-50/60'
                        }`}
                      >
                        {/* Main card row */}
                        <div className="p-3.5 flex items-center justify-between gap-3">
                          <div
                            onClick={() => handlePickCustomer(c)}
                            className="flex items-center gap-3 min-w-0 flex-1 cursor-pointer"
                          >
                            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-indigo-500 to-blue-600 text-white flex items-center justify-center font-bold text-sm shadow-2xs shrink-0">
                              {c.name.slice(0, 1).toUpperCase()}
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-xs text-slate-900 truncate">
                                  {c.name}
                                </span>
                                {isSelected && (
                                  <span className="text-[9px] bg-indigo-600 text-white px-1.5 py-0.5 rounded font-bold uppercase tracking-wider">
                                    В чеке
                                  </span>
                                )}
                              </div>
                              <div className="text-[11px] text-slate-500 font-mono flex items-center gap-2 mt-0.5">
                                <span>{c.phone}</span>
                                {c.visitsCount > 0 && (
                                  <span className="text-[10px] text-slate-400 font-sans hidden sm:inline">
                                    • {c.visitsCount} чеков
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Stats & Actions */}
                          <div className="flex items-center gap-3 shrink-0">
                            <div className="text-right">
                              <div className="text-xs font-bold text-amber-700 flex items-center justify-end gap-1">
                                <Coins className="w-3.5 h-3.5 text-amber-500" />
                                <span>{c.bonusBalance || 0} Б</span>
                              </div>
                              {c.discountPercent > 0 ? (
                                <div className="text-[10px] text-emerald-700 font-bold flex items-center justify-end gap-0.5">
                                  <Percent className="w-2.5 h-2.5" />
                                  <span>Скидка {c.discountPercent}%</span>
                                </div>
                              ) : (
                                <div className="text-[10px] text-slate-400">
                                  {(c.totalSpent || 0).toLocaleString('ru-RU')} ₽
                                </div>
                              )}
                            </div>

                            <div className="flex items-center gap-1">
                              {/* Edit Button */}
                              <button
                                type="button"
                                onClick={e => handleStartEdit(c, e)}
                                title="Редактировать клиента"
                                className="w-8 h-8 rounded-xl flex items-center justify-center bg-slate-100 hover:bg-indigo-50 text-slate-600 hover:text-indigo-600 transition-colors"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>

                              {/* Delete Button */}
                              <button
                                type="button"
                                onClick={e => {
                                  e.stopPropagation();
                                  setDeleteConfirmId(c.id);
                                }}
                                title="Удалить клиента из базы"
                                className="w-8 h-8 rounded-xl flex items-center justify-center bg-slate-100 hover:bg-rose-50 text-slate-500 hover:text-rose-600 transition-colors"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>

                              {/* Pick / Select button */}
                              <button
                                type="button"
                                onClick={() => handlePickCustomer(c)}
                                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ml-1 ${
                                  isSelected
                                    ? 'bg-indigo-600 text-white shadow-xs'
                                    : 'bg-slate-100 hover:bg-indigo-600 text-slate-700 hover:text-white'
                                }`}
                              >
                                {isSelected ? 'Выбран' : 'Выбрать'}
                              </button>
                            </div>
                          </div>
                        </div>

                        {/* Inline Delete Confirmation Confirmation */}
                        {isConfirmingDelete && (
                          <div className="p-3 bg-rose-50/90 border-t border-rose-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 text-xs text-rose-950 animate-in fade-in duration-150">
                            <div className="flex items-center gap-2">
                              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                              <span>
                                Удалить клиента <strong>«{c.name}»</strong>? Накоплено: {c.bonusBalance || 0} Б.
                              </span>
                            </div>
                            <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                              <button
                                type="button"
                                onClick={e => {
                                  e.stopPropagation();
                                  setDeleteConfirmId(null);
                                }}
                                className="px-2.5 py-1 text-[11px] font-semibold text-slate-600 hover:bg-white rounded-lg transition-colors"
                              >
                                Отмена
                              </button>
                              <button
                                type="button"
                                onClick={e => handleDeleteCustomer(c, e)}
                                className="px-3 py-1 text-[11px] font-bold bg-rose-600 hover:bg-rose-700 text-white rounded-lg transition-colors flex items-center gap-1 shadow-2xs"
                              >
                                <Trash2 className="w-3 h-3" />
                                <span>Да, удалить</span>
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500 shrink-0">
          <span className="text-[11px]">
            Кэшбэк 5% начисляется автоматически при каждой закрытой продаже
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold transition-colors cursor-pointer"
          >
            Закрыть
          </button>
        </div>

        {/* Developer Master Key Authorization Modal */}
        {isDevAuthModalOpen && (
          <div
            id="dev-auth-modal-overlay"
            className="absolute inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150"
          >
            <div
              id="dev-auth-modal-box"
              className="w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden animate-in zoom-in-95 duration-150"
            >
              {/* Modal Header */}
              <div className="px-6 py-4.5 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-2xl bg-indigo-500/30 border border-indigo-400/30 flex items-center justify-center text-amber-400 shadow-xs">
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-white">Авторизация разработчика</h4>
                    <p className="text-[11px] text-slate-300">Защита лояльности и баланса бонусов</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setIsDevAuthModalOpen(false);
                    setDevKeyError(null);
                  }}
                  className="w-7 h-7 rounded-lg flex items-center justify-center bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-6 space-y-4">
                <div className="flex items-start gap-3 bg-amber-50/90 border border-amber-200/90 rounded-2xl p-3 text-xs text-amber-950">
                  <Lock className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <p className="leading-relaxed text-[11px]">
                    Внимание: для предотвращения несанкционированного начисления бонусов и завышения скидок персоналом, ручное изменение баланса и персональной скидки разрешено <strong>исключительно разработчику приложения</strong>.
                  </p>
                </div>

                {!isChangingMasterKey ? (
                  <form onSubmit={handleVerifyDevKey} className="space-y-3.5">
                    <div>
                      <label className="text-[11px] font-bold uppercase text-slate-600 block mb-1">
                        Секретный мастер-код разработчика
                      </label>
                      <div className="relative">
                        <KeyRound className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                        <input
                          id="dev-master-key-input"
                          type={showDevKey ? 'text' : 'password'}
                          autoFocus
                          value={devKeyInput}
                          onChange={e => {
                            setDevKeyInput(e.target.value);
                            setDevKeyError(null);
                          }}
                          placeholder="Введите мастер-код..."
                          className="w-full pl-10 pr-10 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono font-bold text-slate-900 outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all shadow-2xs"
                        />
                        <button
                          type="button"
                          onClick={() => setShowDevKey(!showDevKey)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                        >
                          {showDevKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                      {devKeyError && (
                        <p className="text-xs text-rose-600 font-semibold mt-1.5 flex items-center gap-1 animate-in fade-in">
                          <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                          <span>{devKeyError}</span>
                        </p>
                      )}
                    </div>

                    <div className="bg-slate-50 rounded-xl p-2.5 border border-slate-200/70 text-[11px] text-slate-500 flex items-center justify-between">
                      <span>Мастер-код по умолчанию:</span>
                      <code className="bg-white border border-slate-200 px-2 py-0.5 rounded font-mono font-bold text-slate-800">
                        7788
                      </code>
                    </div>

                    <div className="flex items-center justify-between pt-2">
                      <button
                        type="button"
                        onClick={() => {
                          setIsDevAuthModalOpen(false);
                          setDevKeyError(null);
                        }}
                        className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                      >
                        Отмена
                      </button>
                      <button
                        id="submit-dev-auth-btn"
                        type="submit"
                        className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
                      >
                        <ShieldCheck className="w-4 h-4" />
                        <span>Подтвердить и разблокировать</span>
                      </button>
                    </div>
                  </form>
                ) : (
                  <form onSubmit={handleChangeMasterKey} className="space-y-3.5">
                    <div>
                      <label className="text-[11px] font-bold uppercase text-slate-600 block mb-1">
                        Новый мастер-код разработчика
                      </label>
                      <input
                        type="text"
                        required
                        value={newMasterKeyInput}
                        onChange={e => setNewMasterKeyInput(e.target.value)}
                        placeholder="Минимум 4 символа"
                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono font-bold text-slate-900 outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                    <div className="flex items-center justify-between pt-2">
                      <button
                        type="button"
                        onClick={() => setIsChangingMasterKey(false)}
                        className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
                      >
                        Назад
                      </button>
                      <button
                        type="submit"
                        className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-xs cursor-pointer"
                      >
                        Сохранить новый код
                      </button>
                    </div>
                  </form>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
