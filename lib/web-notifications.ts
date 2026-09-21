import { NotificationItem } from '@/types/renovation';

const NOTIFIED_CACHE_KEY = 'renovai_dispatched_notifs_v1';

/**
 * Reads the list of already-dispatched notification IDs to avoid spamming the user.
 */
function getDispatchedNotificationIds(): Set<string> {
  if (typeof window === 'undefined') return new Set();
  try {
    const raw = sessionStorage.getItem(NOTIFIED_CACHE_KEY);
    if (!raw) return new Set();
    const arr = JSON.parse(raw);
    return new Set(Array.isArray(arr) ? arr : []);
  } catch {
    return new Set();
  }
}

function recordDispatchedNotificationId(id: string): void {
  if (typeof window === 'undefined') return;
  try {
    const set = getDispatchedNotificationIds();
    set.add(id);
    sessionStorage.setItem(NOTIFIED_CACHE_KEY, JSON.stringify(Array.from(set)));
  } catch {
    // Ignore storage issues
  }
}

/**
 * Checks if browser Web Notifications API is supported.
 */
export function isNotificationSupported(): boolean {
  return typeof window !== 'undefined' && 'Notification' in window;
}

/**
 * Checks current Notification permission.
 */
export function getNotificationPermission(): NotificationPermission {
  if (!isNotificationSupported()) return 'default';
  return Notification.permission;
}

/**
 * Requests notification permission from user.
 */
export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!isNotificationSupported()) return 'denied';
  try {
    const perm = await Notification.requestPermission();
    return perm;
  } catch {
    return 'denied';
  }
}

/**
 * Safely updates the PWA app badge on mobile / desktop taskbar.
 */
export async function updateAppBadge(unreadCount: number): Promise<void> {
  if (typeof window === 'undefined' || !('setAppBadge' in navigator)) return;
  try {
    if (unreadCount > 0) {
      await navigator.setAppBadge(unreadCount);
    } else if ('clearAppBadge' in navigator) {
      await navigator.clearAppBadge();
    }
  } catch {
    // Some browsers or security contexts reject setAppBadge silently
  }
}

/**
 * Triggers a browser desktop notification if permission is granted.
 */
export function sendBrowserNotification(
  title: string,
  options?: NotificationOptions
): Notification | null {
  if (!isNotificationSupported() || Notification.permission !== 'granted') {
    return null;
  }

  try {
    const notif = new Notification(title, {
      icon: '/icon.svg',
      badge: '/icon.svg',
      ...options,
    });
    return notif;
  } catch {
    return null;
  }
}

/**
 * Dispatches browser notifications for critical or high-priority unread items,
 * preventing duplicate triggers for the same notification ID.
 */
export function dispatchPendingNotifications(
  notifications: NotificationItem[]
): { dispatchedCount: number } {
  if (!isNotificationSupported() || Notification.permission !== 'granted') {
    return { dispatchedCount: 0 };
  }

  const dispatchedSet = getDispatchedNotificationIds();
  let count = 0;

  notifications.forEach((item) => {
    if (item.read) return;
    if (dispatchedSet.has(item.id)) return;

    // Send only high priority or cure time alerts automatically
    if (item.priority === 'high' || item.type === 'cure_time' || item.type === 'qa') {
      sendBrowserNotification(`Renowacje: ${item.title}`, {
        body: item.message,
        tag: item.id,
      });
      recordDispatchedNotificationId(item.id);
      count++;
    }
  });

  return { dispatchedCount: count };
}
