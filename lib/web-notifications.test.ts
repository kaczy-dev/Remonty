// @vitest-environment jsdom
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import {
  isNotificationSupported,
  getNotificationPermission,
  sendBrowserNotification,
  dispatchPendingNotifications,
} from './web-notifications';
import { NotificationItem } from '@/types/renovation';

describe('Web Notifications Engine', () => {
  const originalNotification = global.Notification;

  beforeEach(() => {
    sessionStorage.clear();
  });

  afterEach(() => {
    global.Notification = originalNotification;
    vi.restoreAllMocks();
  });

  it('detects when Notification API is available', () => {
    const mockNotification = vi.fn();
    (mockNotification as unknown as { permission: string }).permission = 'default';
    global.Notification = mockNotification as unknown as typeof Notification;
    expect(isNotificationSupported()).toBe(true);
  });

  it('returns current notification permission', () => {
    const mockNotification = vi.fn();
    (mockNotification as unknown as { permission: string }).permission = 'granted';
    global.Notification = mockNotification as unknown as typeof Notification;

    expect(getNotificationPermission()).toBe('granted');
  });

  it('sends notification when permission is granted', () => {
    const mockConstructor = vi.fn();
    (mockConstructor as unknown as { permission: string }).permission = 'granted';
    global.Notification = mockConstructor as unknown as typeof Notification;

    const notif = sendBrowserNotification('Usterka krytyczna', { body: 'Test' });
    expect(mockConstructor).toHaveBeenCalledWith('Usterka krytyczna', expect.objectContaining({
      body: 'Test',
      icon: '/icon.svg',
    }));
  });

  it('does not send notification when permission is denied', () => {
    const mockConstructor = vi.fn();
    (mockConstructor as unknown as { permission: string }).permission = 'denied';
    global.Notification = mockConstructor as unknown as typeof Notification;

    const notif = sendBrowserNotification('Test', { body: 'Test' });
    expect(notif).toBeNull();
    expect(mockConstructor).not.toHaveBeenCalled();
  });

  it('dispatches critical pending notifications and avoids duplicates on subsequent calls', () => {
    const mockConstructor = vi.fn();
    (mockConstructor as unknown as { permission: string }).permission = 'granted';
    global.Notification = mockConstructor as unknown as typeof Notification;

    const notifications: NotificationItem[] = [
      {
        id: 'alert-cure-1',
        title: 'Schnięcie wylewki',
        message: 'Pozostało 24h',
        type: 'cure_time',
        timestamp: 'Dzisiaj',
        read: false,
        priority: 'high',
      },
      {
        id: 'alert-low-priority',
        title: 'Niski priorytet',
        message: 'Info',
        type: 'schedule',
        timestamp: 'Dzisiaj',
        read: false,
        priority: 'low',
      },
    ];

    const res1 = dispatchPendingNotifications(notifications);
    expect(res1.dispatchedCount).toBe(1);
    expect(mockConstructor).toHaveBeenCalledTimes(1);

    // Second run with same notification should not dispatch again (cached in sessionStorage)
    const res2 = dispatchPendingNotifications(notifications);
    expect(res2.dispatchedCount).toBe(0);
    expect(mockConstructor).toHaveBeenCalledTimes(1);
  });
});
