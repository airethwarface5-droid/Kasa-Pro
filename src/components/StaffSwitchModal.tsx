import React, { useState } from 'react';
import {
  X,
  ShieldCheck,
  UserCheck,
  Lock,
  KeyRound,
  Check,
  AlertCircle,
  Users
} from 'lucide-react';
import { StaffUser, StaffRole } from '../types';
import { localDB } from '../services/localDB';
import { sounds } from '../utils/audio';

interface StaffSwitchModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: StaffUser;
  onUserChanged: (user: StaffUser) => void;
}

export const StaffSwitchModal: React.FC<StaffSwitchModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onUserChanged,
}) => {
  const [staffList] = useState<StaffUser[]>(() => localDB.getStaffUsers());
  const [selectedStaff, setSelectedStaff] = useState<StaffUser>(currentUser);
  const [pinInput, setPinInput] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleDigitClick = (digit: string) => {
    if (pinInput.length < 4) {
      const next = pinInput + digit;
      setPinInput(next);
      setErrorMsg(null);
      if (next.length === 4) {
        verifyAndSwitch(next, selectedStaff);
      }
    }
  };

  const handleBackspace = () => {
    setPinInput(prev => prev.slice(0, -1));
    setErrorMsg(null);
  };

  const verifyAndSwitch = (pin: string, user: StaffUser) => {
    if (user.pin === pin) {
      sounds.playSuccessChime();
      localDB.setCurrentUser(user);
      onUserChanged(user);
      onClose();
    } else {
      sounds.playErrorBeep();
      setErrorMsg('Неверный PIN-код сотрудника');
      setPinInput('');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-md bg-white border border-slate-200 rounded-3xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-900 text-white shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center">
              <KeyRound className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <h3 className="font-bold text-base leading-tight">Смена сотрудника / PIN</h3>
              <p className="text-xs text-slate-400">
                Авторизация кассира и администратора
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

        {/* Body */}
        <div className="p-6 space-y-5">
          {/* Employee selector pills */}
          <div className="space-y-1.5">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
              Выберите сотрудника:
            </span>
            <div className="grid grid-cols-2 gap-2">
              {staffList.map(user => {
                const isSelected = selectedStaff.id === user.id;
                return (
                  <button
                    key={user.id}
                    type="button"
                    onClick={() => {
                      setSelectedStaff(user);
                      setPinInput('');
                      setErrorMsg(null);
                    }}
                    className={`p-3 rounded-2xl border text-left transition-all ${
                      isSelected
                        ? 'border-blue-600 bg-blue-50/70 shadow-xs ring-1 ring-blue-500'
                        : 'border-slate-200 hover:border-slate-300 bg-slate-50/60'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs text-slate-900 line-clamp-1">
                        {user.name.split(' ')[0]}
                      </span>
                      {user.role === 'admin' ? (
                        <ShieldCheck className="w-4 h-4 text-amber-600 shrink-0" />
                      ) : (
                        <UserCheck className="w-4 h-4 text-blue-600 shrink-0" />
                      )}
                    </div>
                    <div className="text-[10px] text-slate-500 mt-1">
                      {user.role === 'admin' ? 'Администратор (1234)' : 'Кассир (0000)'}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* PIN dots display */}
          <div className="text-center py-2 space-y-2">
            <p className="text-xs text-slate-500">
              Введите 4-значный PIN для входа:
            </p>
            <div className="flex items-center justify-center gap-3">
              {[0, 1, 2, 3].map(idx => {
                const filled = pinInput.length > idx;
                return (
                  <div
                    key={idx}
                    className={`w-4 h-4 rounded-full transition-all ${
                      filled
                        ? 'bg-blue-600 scale-110 shadow-xs'
                        : 'bg-slate-200 border border-slate-300'
                    }`}
                  />
                );
              })}
            </div>

            {errorMsg && (
              <p className="text-xs text-rose-600 font-semibold flex items-center justify-center gap-1">
                <AlertCircle className="w-3.5 h-3.5" />
                <span>{errorMsg}</span>
              </p>
            )}
          </div>

          {/* Numpad */}
          <div className="grid grid-cols-3 gap-2 max-w-[260px] mx-auto">
            {['1', '2', '3', '4', '5', '6', '7', '8', '9', 'C', '0', '⌫'].map(btn => {
              const isAction = btn === 'C' || btn === '⌫';
              return (
                <button
                  key={btn}
                  type="button"
                  onClick={() => {
                    if (btn === 'C') {
                      setPinInput('');
                      setErrorMsg(null);
                    } else if (btn === '⌫') {
                      handleBackspace();
                    } else {
                      handleDigitClick(btn);
                    }
                  }}
                  className={`h-12 rounded-2xl font-bold text-base flex items-center justify-center transition-all ${
                    isAction
                      ? 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      : 'bg-slate-50 hover:bg-blue-50 hover:text-blue-600 text-slate-800 border border-slate-200 shadow-2xs active:scale-95'
                  }`}
                >
                  {btn}
                </button>
              );
            })}
          </div>

          {/* Quick hint */}
          <div className="text-center text-[11px] text-slate-400">
            Подсказка: Кассир = <b>0000</b> | Администратор = <b>1234</b>
          </div>
        </div>
      </div>
    </div>
  );
};
