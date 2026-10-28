import React from 'react';
import { 
  Send, 
  Settings, 
  History, 
  RotateCw, 
  HelpCircle,
  Users,
  LogOut,
  Key,
  User as UserIcon,
  ShieldCheck
} from 'lucide-react';
import { AuthUser } from '../api';

interface NavbarProps {
  periods: string[];
  selectedPeriod: string;
  onPeriodChange: (p: string) => void;
  onOpenSettingsModal: () => void;
  onOpenHistoryModal: () => void;
  onOpenHelpModal: () => void;
  onRefresh: () => void;
  isLoading: boolean;
  currentUser: AuthUser | null;
  onOpenUsersModal: () => void;
  onOpenChangePasswordModal: () => void;
  onLogout: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  periods,
  selectedPeriod,
  onPeriodChange,
  onOpenSettingsModal,
  onOpenHistoryModal,
  onOpenHelpModal,
  onRefresh,
  isLoading,
  currentUser,
  onOpenUsersModal,
  onOpenChangePasswordModal,
  onLogout
}) => {
  return (
    <header className="bg-white dark:bg-zinc-800 border-b border-slate-200 dark:border-zinc-700 sticky top-0 z-30 shadow-sm transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between gap-2">
        {/* Brand */}
        <div className="flex items-center gap-2.5 flex-shrink-0">
          <div className="h-8 rounded-lg bg-blue-600 px-3 flex items-center justify-center text-white shadow-sm shadow-blue-200 dark:shadow-none">
            <Send className="w-4 h-4 mr-2 shrink-0" />
            <span className="font-bold tracking-tight text-sm whitespace-nowrap">
              Evrak Gönderici
            </span>
          </div>
        </div>

        {/* Center: Period Selector */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-slate-500 dark:text-zinc-400 hidden sm:inline">Dönem:</span>
          <select
            value={selectedPeriod}
            onChange={(e) => onPeriodChange(e.target.value)}
            className="text-xs font-semibold bg-slate-100 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 rounded-lg px-2.5 py-1 text-slate-800 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer hover:bg-slate-200 dark:hover:bg-zinc-700 transition-colors"
          >
            {periods.map((p) => {
              const [year, month] = p.split('-');
              const monthNames = [
                'Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
                'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'
              ];
              const monthIndex = parseInt(month, 10) - 1;
              const label = `${monthNames[monthIndex] || month} ${year}`;
              return (
                <option key={p} value={p}>
                  {label} ({p})
                </option>
              );
            })}
          </select>
        </div>

        {/* Right actions: Refresh, History, Help, Settings, Users, Account */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Refresh */}
          <button
            onClick={onRefresh}
            disabled={isLoading}
            className="p-1.5 text-slate-600 dark:text-zinc-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-zinc-700 rounded-lg transition-colors border border-slate-200 dark:border-zinc-700"
            title="Verileri Yenile"
          >
            <RotateCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          </button>

          {/* History */}
          <button
            onClick={onOpenHistoryModal}
            className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-slate-700 dark:text-zinc-200 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-zinc-700 rounded-lg transition-colors border border-slate-200 dark:border-zinc-700"
            title="Gönderim Geçmişi"
          >
            <History className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Geçmiş</span>
          </button>

          {/* Help */}
          <button
            onClick={onOpenHelpModal}
            className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-slate-700 dark:text-zinc-200 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-zinc-700 rounded-lg transition-colors border border-slate-200 dark:border-zinc-700"
            title="Kullanım Kılavuzu & Yardım"
          >
            <HelpCircle className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
            <span className="hidden md:inline">Yardım</span>
          </button>

          {/* Settings */}
          <button
            onClick={onOpenSettingsModal}
            className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold text-slate-700 dark:text-zinc-200 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-zinc-700 rounded-lg transition-colors border border-slate-200 dark:border-zinc-700"
            title="Ayarlar & Kanallar"
          >
            <Settings className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Ayarlar</span>
          </button>

          {/* Admin: Users Management */}
          {currentUser?.role === 'ADMIN' && (
            <button
              onClick={onOpenUsersModal}
              className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/60 hover:bg-blue-100 dark:hover:bg-blue-900/80 rounded-lg transition-colors border border-blue-200 dark:border-blue-800"
              title="Kullanıcı Yönetimi"
            >
              <Users className="w-3.5 h-3.5" />
              <span className="hidden lg:inline">Kullanıcılar</span>
            </button>
          )}

          {/* User Account Pill */}
          {currentUser && (
            <div className="flex items-center gap-1 pl-1 border-l border-slate-200 dark:border-zinc-700 ml-1">
              <div 
                className="hidden xl:flex items-center gap-1.5 text-xs text-slate-700 dark:text-zinc-300 px-2 py-1 bg-slate-50 dark:bg-zinc-850 rounded-lg border border-slate-200 dark:border-zinc-750"
                title={`Kullanıcı: ${currentUser.name} (@${currentUser.username})`}
              >
                {currentUser.role === 'ADMIN' ? (
                  <ShieldCheck className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                ) : (
                  <UserIcon className="w-3.5 h-3.5 text-slate-500" />
                )}
                <span className="font-semibold truncate max-w-[100px]">{currentUser.name}</span>
                <span className="text-[10px] text-slate-400 font-mono">
                  {currentUser.role === 'ADMIN' ? 'Yönetici' : 'Kullanıcı'}
                </span>
              </div>

              {/* Password change button */}
              <button
                onClick={onOpenChangePasswordModal}
                className="p-1.5 text-slate-500 dark:text-zinc-400 hover:text-slate-800 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-zinc-700 rounded-lg transition-colors"
                title="Parola Değiştir"
              >
                <Key className="w-3.5 h-3.5" />
              </button>

              {/* Logout button */}
              <button
                onClick={onLogout}
                className="p-1.5 text-rose-600 dark:text-rose-400 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/50 rounded-lg transition-colors"
                title="Güvenli Çıkış"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
