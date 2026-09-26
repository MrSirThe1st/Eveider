import { useCallback, useEffect, useState } from 'react';
import { ScreenHeader } from './ScreenHeader';
import { useNotificationRoutingOptional } from '../context/notification-routing-context';
import { useCustomerShellOptional } from '../navigation/customer-shell';
import {
  fetchCustomerNotifications,
  fetchCourierNotifications,
} from '../lib/api';

type NotificationBellHeaderProps = {
  mode: 'CLIENT' | 'DRIVER';
  title?: string;
};

/**
 * Lightweight header bell for primary tabs — opens the existing Notifications screen.
 */
export function NotificationBellHeader({ mode, title }: NotificationBellHeaderProps) {
  const shell = useCustomerShellOptional();
  const routing = useNotificationRoutingOptional();
  const [unreadCount, setUnreadCount] = useState(0);

  const refresh = useCallback(async () => {
    if (!shell || shell.isGuest) {
      setUnreadCount(0);
      return;
    }
    const result =
      mode === 'DRIVER'
        ? await fetchCourierNotifications()
        : await fetchCustomerNotifications();
    if (result.success) {
      setUnreadCount(result.data.unreadCount);
    }
  }, [mode, shell]);

  useEffect(() => {
    void refresh();
  }, [refresh, routing?.unreadVersion]);

  return (
    <ScreenHeader
      mode={mode}
      title={title}
      onNotifications={
        shell && !shell.isGuest
          ? () => shell.openSettings('Notifications')
          : undefined
      }
      unreadCount={unreadCount}
    />
  );
}
