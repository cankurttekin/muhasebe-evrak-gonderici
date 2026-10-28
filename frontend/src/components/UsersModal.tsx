import React, { useState, useEffect } from 'react';
import { 
  X, 
  Users, 
  UserPlus, 
  ShieldCheck, 
  Trash2, 
  Key, 
  Check, 
  AlertCircle,
  RotateCw
} from 'lucide-react';
import { api, AuthUser, UserRole } from '../api';

interface UsersModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: AuthUser | null;
}

export const UsersModal: React.FC<UsersModalProps> = ({ isOpen, onClose, currentUser }) => {
  const [users, setUsers] = useState<AuthUser[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isAddingUser, setIsAddingUser] = useState(false);
  
  // New user form state
  const [newUsername, setNewUsername] = useState('');
  const [newName, setNewName] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRole, setNewRole] = useState<UserRole>('USER');
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);

  // Reset password state
  const [resetUserId, setResetUserId] = useState<number | null>(null);
  const [resetPasswordVal, setResetPasswordVal] = useState('');
  const [resetError, setResetError] = useState<string | null>(null);

  const fetchUsers = async () => {
    setIsLoading(true);
    try {
      const res = await api.getUsers();
      if (res.success && res.users) {
        setUsers(res.users);
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchUsers();
      setIsAddingUser(false);
      setFormError(null);
      setFormSuccess(null);
      setResetUserId(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setFormSuccess(null);

    try {
      const res = await api.createUser({
        username: newUsername,
        name: newName,
        password: newPassword,
        role: newRole
      });

      if (res.success) {
        setFormSuccess('Kullanıcı başarıyla oluşturuldu.');
        setNewUsername('');
        setNewName('');
        setNewPassword('');
        setNewRole('USER');
        setIsAddingUser(false);
        fetchUsers();
      } else {
        setFormError(res.error || 'Kullanıcı eklenemedi.');
      }
    } catch (err: any) {
      setFormError(err.message || 'Sunucu hatası oluştu.');
    }
  };

  const handleToggleStatus = async (user: AuthUser) => {
    if (currentUser?.id === user.id) {
      alert('Kendi hesabınızı pasife alamazsınız.');
      return;
    }
    const newStatus = user.is_active ? 0 : 1;
    await api.updateUser(user.id, { is_active: newStatus });
    fetchUsers();
  };

  const handleChangeRole = async (user: AuthUser, role: UserRole) => {
    if (currentUser?.id === user.id && role !== 'ADMIN') {
      alert('Kendi yönetici rolünüzü kaldıramazsınız.');
      return;
    }
    await api.updateUser(user.id, { role });
    fetchUsers();
  };

  const handleDeleteUser = async (user: AuthUser) => {
    if (currentUser?.id === user.id) {
      alert('Kendi hesabınızı silemezsiniz.');
      return;
    }
    if (!confirm(`"${user.name}" (${user.username}) kullanıcısını silmek istediğinize emin misiniz?`)) {
      return;
    }
    await api.deleteUser(user.id);
    fetchUsers();
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetUserId || resetPasswordVal.length < 4) {
      setResetError('Parola en az 4 karakter olmalıdır.');
      return;
    }
    setResetError(null);
    try {
      const res = await api.resetUserPassword(resetUserId, resetPasswordVal);
      if (res.success) {
        alert('Parola başarıyla güncellendi.');
        setResetUserId(null);
        setResetPasswordVal('');
      } else {
        setResetError(res.error || 'Parola sıfırlanamadı.');
      }
    } catch (err: any) {
      setResetError(err.message || 'Sunucu hatası.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 dark:bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-zinc-800 w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden text-slate-800 dark:text-zinc-100">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 dark:border-zinc-800 flex items-center justify-between bg-slate-50 dark:bg-zinc-850">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 dark:text-zinc-100 text-sm">Kullanıcı Yönetimi</h3>
              <p className="text-xs text-slate-500 dark:text-zinc-400">Ofis kullanıcı hesapları, yetkiler ve erişim denetimi</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-zinc-200 hover:bg-slate-200 dark:hover:bg-zinc-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-4">
          {formSuccess && (
            <div className="p-3 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 rounded-xl text-xs text-emerald-800 dark:text-emerald-300 flex items-center gap-2">
              <Check className="w-4 h-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
              <span>{formSuccess}</span>
            </div>
          )}

          {/* Action Bar */}
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-700 dark:text-zinc-300">
              Kayıtlı Kullanıcılar ({users.length})
            </span>
            <button
              type="button"
              onClick={() => {
                setIsAddingUser(!isAddingUser);
                setFormError(null);
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm transition-colors"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>{isAddingUser ? 'Formu Kapat' : 'Yeni Kullanıcı Ekle'}</span>
            </button>
          </div>

          {/* Add User Form */}
          {isAddingUser && (
            <form onSubmit={handleCreateUser} className="p-4 bg-slate-50 dark:bg-zinc-850 rounded-xl border border-slate-200 dark:border-zinc-750 space-y-3">
              <div className="font-bold text-xs text-slate-900 dark:text-zinc-100 flex items-center gap-1.5">
                <UserPlus className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                <span>Yeni Hesap Oluştur</span>
              </div>

              {formError && (
                <div className="p-2.5 bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900 rounded-lg text-xs text-rose-700 dark:text-rose-300 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 dark:text-rose-400" />
                  <span>{formError}</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 dark:text-zinc-300 mb-1">
                    Ad Soyad
                  </label>
                  <input
                    type="text"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="örn: Ahmet Yılmaz"
                    required
                    className="w-full text-xs px-3 py-1.5 border border-slate-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-900 text-slate-800 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 dark:text-zinc-300 mb-1">
                    Kullanıcı Adı (Giriş için)
                  </label>
                  <input
                    type="text"
                    value={newUsername}
                    onChange={(e) => setNewUsername(e.target.value)}
                    placeholder="örn: ahmet"
                    required
                    className="w-full text-xs px-3 py-1.5 border border-slate-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-900 text-slate-800 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 dark:text-zinc-300 mb-1">
                    Parola
                  </label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    className="w-full text-xs px-3 py-1.5 border border-slate-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-900 text-slate-800 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 dark:text-zinc-300 mb-1">
                    Yetki Rolü
                  </label>
                  <select
                    value={newRole}
                    onChange={(e) => setNewRole(e.target.value as UserRole)}
                    className="w-full text-xs px-3 py-1.5 border border-slate-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-900 text-slate-800 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="USER">Kullanıcı (Evrak Gönderici)</option>
                    <option value="ADMIN">Yönetici (Tüm Yetkiler)</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddingUser(false)}
                  className="px-3 py-1.5 text-xs text-slate-600 dark:text-zinc-300 hover:text-slate-800 rounded-lg hover:bg-slate-200 dark:hover:bg-zinc-750 transition-colors"
                >
                  İptal
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors shadow-sm"
                >
                  Kullanıcıyı Kaydet
                </button>
              </div>
            </form>
          )}

          {/* Reset Password Submodal / Row */}
          {resetUserId && (
            <form onSubmit={handleResetPassword} className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900 rounded-xl space-y-2 text-xs">
              <div className="font-semibold text-amber-900 dark:text-amber-300 flex items-center gap-1.5">
                <Key className="w-3.5 h-3.5" />
                <span>Kullanıcı Parolasını Sıfırla: {users.find(u => u.id === resetUserId)?.name}</span>
              </div>
              {resetError && <div className="text-rose-600">{resetError}</div>}
              <div className="flex items-center gap-2">
                <input
                  type="password"
                  value={resetPasswordVal}
                  onChange={(e) => setResetPasswordVal(e.target.value)}
                  placeholder="Yeni parola belirleyin..."
                  className="flex-1 text-xs px-3 py-1.5 border border-amber-300 dark:border-amber-800 rounded-lg bg-white dark:bg-zinc-900 focus:outline-none"
                  autoFocus
                />
                <button
                  type="submit"
                  className="px-3 py-1.5 text-xs font-semibold text-white bg-amber-600 hover:bg-amber-700 rounded-lg"
                >
                  Parolayı Değiştir
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setResetUserId(null);
                    setResetPasswordVal('');
                  }}
                  className="px-2.5 py-1.5 text-xs text-slate-600 dark:text-zinc-400 hover:text-slate-800"
                >
                  Vazgeç
                </button>
              </div>
            </form>
          )}

          {/* Users Table */}
          <div className="border border-slate-200 dark:border-zinc-750 rounded-xl overflow-hidden">
            <table className="w-full text-left text-xs text-slate-600 dark:text-zinc-300">
              <thead className="bg-slate-50 dark:bg-zinc-800 text-slate-500 dark:text-zinc-400 uppercase font-semibold text-[10px] tracking-wider border-b border-slate-200 dark:border-zinc-750">
                <tr>
                  <th className="py-2.5 px-3">İsim & Kullanıcı Adı</th>
                  <th className="py-2.5 px-3">Yetki Rolü</th>
                  <th className="py-2.5 px-3">Durum</th>
                  <th className="py-2.5 px-3 text-right">İşlemler</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-zinc-800">
                {isLoading ? (
                  <tr>
                    <td colSpan={4} className="py-8 text-center text-slate-400">
                      <RotateCw className="w-5 h-5 animate-spin mx-auto mb-1 text-blue-600" />
                      <span>Yükleniyor...</span>
                    </td>
                  </tr>
                ) : users.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-8 text-center text-slate-400">
                      Kullanıcı bulunamadı.
                    </td>
                  </tr>
                ) : (
                  users.map((user) => {
                    const isSelf = currentUser?.id === user.id;
                    return (
                      <tr key={user.id} className="hover:bg-slate-50/70 dark:hover:bg-zinc-850/60 transition-colors">
                        <td className="py-3 px-3">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-full bg-slate-200 dark:bg-zinc-750 flex items-center justify-center font-bold text-slate-700 dark:text-zinc-300 text-xs">
                              {user.name.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <div className="font-semibold text-slate-900 dark:text-zinc-100 flex items-center gap-1.5">
                                <span>{user.name}</span>
                                {isSelf && (
                                  <span className="text-[10px] bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 px-1.5 py-0.2 rounded font-medium">
                                    Siz
                                  </span>
                                )}
                              </div>
                              <div className="text-[11px] font-mono text-slate-400 dark:text-zinc-500">
                                @{user.username}
                              </div>
                            </div>
                          </div>
                        </td>

                        <td className="py-3 px-3">
                          {isSelf ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/60 px-2 py-0.5 rounded border border-blue-200 dark:border-blue-800">
                              <ShieldCheck className="w-3 h-3" />
                              Yönetici
                            </span>
                          ) : (
                            <select
                              value={user.role}
                              onChange={(e) => handleChangeRole(user, e.target.value as UserRole)}
                              className="text-xs font-semibold rounded px-2 py-1 border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-850 text-slate-800 dark:text-zinc-200 focus:outline-none"
                            >
                              <option value="USER">Kullanıcı</option>
                              <option value="ADMIN">Yönetici</option>
                            </select>
                          )}
                        </td>

                        <td className="py-3 px-3">
                          {isSelf ? (
                            <span className="inline-flex items-center text-[11px] font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded">
                              Aktif
                            </span>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleToggleStatus(user)}
                              className={`text-[11px] font-semibold px-2 py-0.5 rounded transition-colors ${
                                user.is_active
                                  ? 'text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100'
                                  : 'text-slate-500 dark:text-zinc-500 bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200'
                              }`}
                            >
                              {user.is_active ? 'Aktif' : 'Pasif'}
                            </button>
                          )}
                        </td>

                        <td className="py-3 px-3 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              type="button"
                              onClick={() => {
                                setResetUserId(user.id);
                                setResetPasswordVal('');
                              }}
                              className="p-1.5 text-slate-500 dark:text-zinc-400 hover:text-amber-600 dark:hover:text-amber-400 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded transition-colors"
                              title="Parolayı Sıfırla"
                            >
                              <Key className="w-3.5 h-3.5" />
                            </button>

                            {!isSelf && (
                              <button
                                type="button"
                                onClick={() => handleDeleteUser(user)}
                                className="p-1.5 text-slate-500 dark:text-zinc-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded transition-colors"
                                title="Kullanıcıyı Sil"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-slate-50 dark:bg-zinc-850 border-t border-slate-100 dark:border-zinc-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-semibold text-slate-600 dark:text-zinc-300 hover:text-slate-800 dark:hover:text-white rounded-lg hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors"
          >
            Kapat
          </button>
        </div>
      </div>
    </div>
  );
};
