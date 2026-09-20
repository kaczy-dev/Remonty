'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { NotificationItem } from '@/types/renovation';
import {
  Bell,
  X,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Flame,
  Wallet,
  ShieldAlert,
  CalendarDays,
  Plus,
  Trash2,
  Filter,
} from 'lucide-react';

interface NotificationsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  notifications: NotificationItem[];
  onDismissNotification: (id: string) => void;
  onAddNotification: (notification: NotificationItem) => void;
  onMarkAllAsRead?: () => void;
  onClearAll?: () => void;
  onRequestPushPermission?: () => void;
  pushPermissionState?: string;
}

export const NotificationsDrawer: React.FC<NotificationsDrawerProps> = ({
  isOpen,
  onClose,
  notifications,
  onDismissNotification,
  onAddNotification,
  onMarkAllAsRead,
  onClearAll,
  onRequestPushPermission,
  pushPermissionState,
}) => {
  const [filterType, setFilterType] = useState<string>('all');
  const [showAddForm, setShowAddForm] = useState(false);
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [priority, setPriority] = useState<NotificationItem['priority']>('medium');
  const [notifType, setNotifType] = useState<NotificationItem['type']>('schedule');

  const filtered = notifications.filter((n) => {
    if (filterType === 'all') return true;
    if (filterType === 'unread') return !n.read;
    return n.type === filterType;
  });

  const unreadCount = notifications.filter((n) => !n.read).length;

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    onAddNotification({
      id: `manual-notif-${Date.now()}`,
      title: title.trim(),
      message: message.trim() || 'Własne przypomnienie budowlane.',
      type: notifType,
      timestamp: 'Przed chwilą',
      read: false,
      priority,
    });

    setTitle('');
    setMessage('');
    setShowAddForm(false);
  };

  const getIcon = (type: NotificationItem['type'], priority: NotificationItem['priority']) => {
    if (priority === 'high') {
      return <AlertTriangle className="w-4 h-4 text-amber-400" />;
    }
    switch (type) {
      case 'cure_time':
        return <Clock className="w-4 h-4 text-amber-400 animate-spin" />;
      case 'budget':
        return <Wallet className="w-4 h-4 text-emerald-400" />;
      case 'qa':
        return <ShieldAlert className="w-4 h-4 text-rose-400" />;
      case 'schedule':
      default:
        return <CalendarDays className="w-4 h-4 text-teal-400" />;
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 overflow-hidden">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
          />

          <div className="fixed inset-y-0 right-0 flex max-w-full pl-10">
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              className="w-screen max-w-md bg-slate-900 border-l border-slate-800 text-slate-100 flex flex-col shadow-2xl"
            >
              {/* Drawer Header */}
              <div className="flex items-center justify-between border-b border-slate-800 bg-slate-950 px-5 py-4">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-teal-500/20 text-teal-400 border border-teal-500/30">
                    <Bell className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                      Centrum Powiadomień
                      {unreadCount > 0 && (
                        <span className="rounded-full bg-teal-500 text-slate-950 text-[10px] font-bold px-2 py-0.5">
                          {unreadCount} nowe
                        </span>
                      )}
                    </h3>
                    <p className="text-[11px] text-slate-400">
                      Harmonogram, czas schnięcia & alerty budżetowe
                    </p>
                  </div>
                </div>

                <button
                  onClick={onClose}
                  className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Action Toolbar */}
              <div className="border-b border-slate-800/80 bg-slate-950/60 p-3 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  {/* Filter Selector */}
                  <div className="flex items-center gap-1.5 overflow-x-auto text-[11px]">
                    <button
                      onClick={() => setFilterType('all')}
                      className={`px-2.5 py-1 rounded-lg font-medium transition ${
                        filterType === 'all'
                          ? 'bg-teal-500/20 text-teal-300 border border-teal-500/40'
                          : 'text-slate-400 hover:text-slate-200 bg-slate-900'
                      }`}
                    >
                      Wszystkie ({notifications.length})
                    </button>
                    <button
                      onClick={() => setFilterType('unread')}
                      className={`px-2.5 py-1 rounded-lg font-medium transition ${
                        filterType === 'unread'
                          ? 'bg-teal-500/20 text-teal-300 border border-teal-500/40'
                          : 'text-slate-400 hover:text-slate-200 bg-slate-900'
                      }`}
                    >
                      Nieprzeczytane ({unreadCount})
                    </button>
                    <button
                      onClick={() => setFilterType('cure_time')}
                      className={`px-2.5 py-1 rounded-lg font-medium transition ${
                        filterType === 'cure_time'
                          ? 'bg-teal-500/20 text-teal-300 border border-teal-500/40'
                          : 'text-slate-400 hover:text-slate-200 bg-slate-900'
                      }`}
                    >
                      Schnięcie
                    </button>
                    <button
                      onClick={() => setFilterType('budget')}
                      className={`px-2.5 py-1 rounded-lg font-medium transition ${
                        filterType === 'budget'
                          ? 'bg-teal-500/20 text-teal-300 border border-teal-500/40'
                          : 'text-slate-400 hover:text-slate-200 bg-slate-900'
                      }`}
                    >
                      Budżet
                    </button>
                  </div>

                  <button
                    onClick={() => setShowAddForm(!showAddForm)}
                    className="flex items-center gap-1 rounded-lg bg-teal-600 px-2.5 py-1 text-xs font-semibold text-white hover:bg-teal-500 transition shrink-0"
                    title="Dodaj własne przypomnienie"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Dodaj</span>
                  </button>
                </div>

                {/* Optional Web Push activation pill */}
                {onRequestPushPermission && pushPermissionState !== 'granted' && (
                  <div className="flex items-center justify-between rounded-lg bg-teal-950/40 border border-teal-500/30 p-2 text-xs">
                    <span className="text-teal-300 text-[11px]">Chcesz powiadomienia na telefon/pulpit?</span>
                    <button
                      onClick={onRequestPushPermission}
                      className="rounded-md bg-teal-600 px-2 py-0.5 text-[10px] font-bold text-white hover:bg-teal-500 transition"
                    >
                      Włącz Push
                    </button>
                  </div>
                )}
              </div>

              {/* Add Custom Notification Inline Box */}
              {showAddForm && (
                <form onSubmit={handleCreate} className="border-b border-slate-800 bg-slate-950/90 p-4 space-y-3">
                  <div className="flex items-center justify-between text-xs font-semibold text-teal-400">
                    <span>Nowe Przypomnienie</span>
                    <button type="button" onClick={() => setShowAddForm(false)} className="text-slate-500 hover:text-slate-300">
                      Anuluj
                    </button>
                  </div>
                  <div>
                    <input
                      type="text"
                      required
                      placeholder="Tytuł, np. Odbiór zamówionych płytek"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      className="w-full rounded-lg border border-slate-700 bg-slate-900 px-2.5 py-1.5 text-xs text-white placeholder-slate-500 focus:border-teal-500 focus:outline-hidden"
                    />
                  </div>
                  <div>
                    <textarea
                      rows={2}
                      placeholder="Szczegóły / instrukcje dla ekipy..."
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      className="w-full rounded-lg border border-slate-700 bg-slate-900 px-2.5 py-1.5 text-xs text-white placeholder-slate-500 focus:border-teal-500 focus:outline-hidden"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-[10px] text-slate-400 block mb-0.5">Typ:</span>
                      <select
                        value={notifType}
                        onChange={(e) => setNotifType(e.target.value as NotificationItem['type'])}
                        className="w-full rounded-lg border border-slate-700 bg-slate-900 px-2 py-1 text-xs text-slate-300 focus:outline-hidden"
                      >
                        <option value="schedule">Harmonogram</option>
                        <option value="cure_time">Czas schnięcia</option>
                        <option value="budget">Budżet</option>
                        <option value="material">Dostawa materiałów</option>
                        <option value="qa">Kontrola jakości</option>
                      </select>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block mb-0.5">Priorytet:</span>
                      <select
                        value={priority}
                        onChange={(e) => setPriority(e.target.value as NotificationItem['priority'])}
                        className="w-full rounded-lg border border-slate-700 bg-slate-900 px-2 py-1 text-xs text-slate-300 focus:outline-hidden"
                      >
                        <option value="low">Niski</option>
                        <option value="medium">Średni</option>
                        <option value="high">Wysoki (Krytyczny)</option>
                      </select>
                    </div>
                  </div>
                  <button
                    type="submit"
                    className="w-full rounded-lg bg-teal-600 py-1.5 text-xs font-semibold text-white hover:bg-teal-500 transition"
                  >
                    Dodaj przypomnienie
                  </button>
                </form>
              )}

              {/* Notifications List */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {filtered.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center text-slate-500">
                    <CheckCircle2 className="w-10 h-10 text-teal-500/40 mb-2" />
                    <p className="text-sm font-semibold text-slate-400">Wszystko pod kontrolą!</p>
                    <p className="text-xs text-slate-500 mt-0.5">Brak aktywnych alertów w tej kategorii.</p>
                  </div>
                ) : (
                  filtered.map((item) => (
                    <div
                      key={item.id}
                      className={`group relative rounded-xl border p-3.5 transition ${
                        item.priority === 'high'
                          ? 'border-amber-500/50 bg-amber-950/20'
                          : item.read
                          ? 'border-slate-800 bg-slate-950/50 opacity-80'
                          : 'border-slate-800 bg-slate-950 shadow-xs'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div
                          className={`mt-0.5 rounded-lg p-1.5 shrink-0 ${
                            item.priority === 'high'
                              ? 'bg-amber-500/20'
                              : 'bg-teal-500/10'
                          }`}
                        >
                          {getIcon(item.type, item.priority)}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <h4 className="text-xs font-bold text-white truncate">{item.title}</h4>
                            <span className="text-[10px] text-slate-500 font-mono shrink-0">
                              {item.timestamp}
                            </span>
                          </div>

                          <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                            {item.message}
                          </p>

                          <div className="mt-2.5 flex items-center justify-between pt-1 border-t border-slate-800/60 text-[10px]">
                            <span className="font-mono text-slate-400 uppercase tracking-wider">
                              {item.type.replace('_', ' ')}
                            </span>
                            <button
                              onClick={() => onDismissNotification(item.id)}
                              className="text-slate-400 hover:text-rose-400 font-medium transition"
                            >
                              Usuń alert
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Bottom Footer Actions */}
              <div className="border-t border-slate-800 bg-slate-950 px-5 py-3 flex items-center justify-between text-xs text-slate-400">
                <span>Łącznie: <strong>{notifications.length}</strong></span>
                <div className="flex items-center gap-3">
                  {onMarkAllAsRead && unreadCount > 0 && (
                    <button
                      onClick={onMarkAllAsRead}
                      className="text-teal-400 hover:text-teal-300 font-medium cursor-pointer"
                    >
                      Oznacz jako przeczytane
                    </button>
                  )}
                  {onClearAll && notifications.length > 0 && (
                    <button
                      onClick={onClearAll}
                      className="text-rose-400 hover:text-rose-300 font-medium cursor-pointer"
                    >
                      Wyczyść listę
                    </button>
                  )}
                </div>
              </div>

            </motion.div>
          </div>
        </div>
      )}
    </AnimatePresence>
  );
};
