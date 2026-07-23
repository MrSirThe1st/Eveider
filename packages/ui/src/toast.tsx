'use client';

import { colors, radius, spacing, typography, shadows, borderSubtle } from '@eveider/config-ui';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

export type ToastVariant = 'success' | 'error' | 'info';

export type ToastInput = {
  title?: string;
  message: string;
  variant?: ToastVariant;
  /** Auto-dismiss ms. Default 4000. Pass 0 to keep until dismissed. */
  durationMs?: number;
};

type ToastRecord = ToastInput & {
  id: string;
  variant: ToastVariant;
  durationMs: number;
};

type ToastContextValue = {
  toast: (input: ToastInput) => string;
  success: (message: string, title?: string) => string;
  error: (message: string, title?: string) => string;
  info: (message: string, title?: string) => string;
  dismiss: (id: string) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

const VARIANT_STYLES: Record<
  ToastVariant,
  { border: string; background: string; accent: string }
> = {
  success: {
    border: colors.borderSubtle,
    background: colors.surface,
    accent: colors.success,
  },
  error: {
    border: colors.borderSubtle,
    background: colors.surface,
    accent: colors.danger,
  },
  info: {
    border: colors.borderSubtle,
    background: colors.surface,
    accent: colors.info,
  },
};

function createId() {
  return `toast-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastRecord[]>([]);

  const dismiss = useCallback((id: string) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const toast = useCallback((input: ToastInput) => {
    const id = createId();
    const record: ToastRecord = {
      id,
      message: input.message,
      title: input.title,
      variant: input.variant ?? 'info',
      durationMs: input.durationMs ?? 4000,
    };
    setToasts((current) => [...current, record].slice(-4));
    return id;
  }, []);

  const api = useMemo<ToastContextValue>(
    () => ({
      toast,
      success: (message, title) => toast({ message, title, variant: 'success' }),
      error: (message, title) => toast({ message, title, variant: 'error' }),
      info: (message, title) => toast({ message, title, variant: 'info' }),
      dismiss,
    }),
    [dismiss, toast],
  );

  return (
    <ToastContext.Provider value={api}>
      {children}
      <ToastViewport toasts={toasts} onDismiss={dismiss} />
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error('useToast must be used within ToastProvider');
  }
  return ctx;
}

function ToastViewport({
  toasts,
  onDismiss,
}: {
  toasts: ToastRecord[];
  onDismiss: (id: string) => void;
}) {
  return (
    <div
      className="nb-toast-viewport"
      aria-live="polite"
      aria-relevant="additions text"
      style={{
        position: 'fixed',
        right: spacing[4],
        bottom: spacing[4],
        zIndex: 1000,
        display: 'flex',
        flexDirection: 'column-reverse',
        gap: spacing[2],
        width: 'min(360px, calc(100vw - 32px))',
        pointerEvents: 'none',
      }}
    >
      {toasts.map((item) => (
        <ToastItem key={item.id} toast={item} onDismiss={onDismiss} />
      ))}
    </div>
  );
}

function ToastItem({
  toast,
  onDismiss,
}: {
  toast: ToastRecord;
  onDismiss: (id: string) => void;
}) {
  useEffect(() => {
    if (toast.durationMs <= 0) return;
    const timer = window.setTimeout(() => onDismiss(toast.id), toast.durationMs);
    return () => window.clearTimeout(timer);
  }, [onDismiss, toast.durationMs, toast.id]);

  const tone = VARIANT_STYLES[toast.variant];

  return (
    <div
      role={toast.variant === 'error' ? 'alert' : 'status'}
      className="nb-toast"
      style={{
        pointerEvents: 'auto',
        display: 'flex',
        gap: spacing[3],
        alignItems: 'flex-start',
        padding: `${spacing[3]}px ${spacing[4]}px`,
        borderRadius: radius.md,
        border: borderSubtle(),
        background: tone.background,
        boxShadow: shadows.hard,
        overflow: 'hidden',
      }}
    >
      <span
        aria-hidden
        style={{
          width: 4,
          alignSelf: 'stretch',
          borderRadius: radius.badge,
          background: tone.accent,
          flexShrink: 0,
        }}
      />
      <div style={{ flex: 1, minWidth: 0 }}>
        {toast.title ? (
          <p
            style={{
              margin: 0,
              fontSize: typography.bodySm.fontSize,
              fontWeight: typography.weights.bold,
              color: colors.secondary,
            }}
          >
            {toast.title}
          </p>
        ) : null}
        <p
          style={{
            margin: toast.title ? `${spacing[1]}px 0 0` : 0,
            fontSize: typography.bodySm.fontSize,
            fontWeight: typography.weights.medium,
            color: colors.secondary,
            lineHeight: 1.45,
          }}
        >
          {toast.message}
        </p>
      </div>
      <button
        type="button"
        aria-label="Fermer la notification"
        onClick={() => onDismiss(toast.id)}
        style={{
          border: 'none',
          background: 'transparent',
          cursor: 'pointer',
          color: colors.textMuted,
          fontWeight: typography.weights.semibold,
          padding: spacing[1],
          lineHeight: 1,
        }}
      >
        ✕
      </button>
    </div>
  );
}
