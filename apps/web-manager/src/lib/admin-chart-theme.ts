'use client';

import { colors } from '@eveider/config-ui';
import {
  ArcElement,
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  Filler,
  Legend,
  LinearScale,
  LineElement,
  PointElement,
  Tooltip,
  type ChartOptions,
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  ArcElement,
  Tooltip,
  Legend,
  Filler,
);

export const chartPalette = {
  primary: colors.primary,
  secondary: colors.secondary,
  muted: colors.textMuted,
  border: colors.border,
  surface: colors.surface,
  info: colors.info,
  warning: colors.warning,
  danger: colors.danger,
  successMuted: colors.successMuted,
  surfaceMuted: colors.surfaceMuted,
};

export const parcelStatusColors: Record<string, string> = {
  created: colors.textMuted,
  in_transit: colors.info,
  delivered_to_locker: colors.warning,
  ready_for_pickup: colors.primary,
  collected: '#64748B',
};

export const issueTypeColors: Record<string, string> = {
  failed_delivery: colors.danger,
  locker_unavailable: colors.warning,
  parcel_problem: colors.info,
  locker_system: colors.secondary,
};

const baseFont = {
  family: 'inherit',
  size: 11,
  weight: 600,
};

export function baseBarOptions(): ChartOptions<'bar'> {
  return {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: colors.secondary,
        titleFont: baseFont,
        bodyFont: baseFont,
        padding: 10,
        cornerRadius: 8,
      },
    },
    scales: {
      x: {
        grid: { display: false },
        border: { display: false },
        ticks: {
          color: colors.textMuted,
          font: baseFont,
          maxRotation: 0,
          autoSkip: true,
          maxTicksLimit: 8,
        },
      },
      y: {
        beginAtZero: true,
        grid: { color: colors.borderSubtle },
        border: { display: false },
        ticks: {
          color: colors.textMuted,
          font: baseFont,
          precision: 0,
        },
      },
    },
  };
}

export function baseLineOptions(): ChartOptions<'line'> {
  return baseBarOptions() as ChartOptions<'line'>;
}

/** @deprecated Use baseBarOptions or baseLineOptions */
export function baseCartesianOptions(): ChartOptions<'bar'> {
  return baseBarOptions();
}

export function baseDoughnutOptions(): ChartOptions<'doughnut'> {
  return {
    responsive: true,
    maintainAspectRatio: false,
    cutout: '62%',
    plugins: {
      legend: {
        position: 'bottom',
        labels: {
          color: colors.secondary,
          font: baseFont,
          boxWidth: 10,
          boxHeight: 10,
          padding: 12,
        },
      },
      tooltip: {
        backgroundColor: colors.secondary,
        titleFont: baseFont,
        bodyFont: baseFont,
        padding: 10,
        cornerRadius: 8,
      },
    },
  };
}

export function formatDayLabel(isoDate: string) {
  const [year = 2026, month = 1, day = 1] = isoDate.split('-').map(Number);
  return new Intl.DateTimeFormat('fr-CD', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  }).format(new Date(year, month - 1, day));
}
