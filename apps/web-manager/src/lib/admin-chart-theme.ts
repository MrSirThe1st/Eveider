'use client';

import { readCssColor } from '@eveider/config-ui';
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
  get primary() {
    return readCssColor('primary');
  },
  primarySoft: 'rgba(9, 212, 11, 0.16)',
  get muted() {
    return readCssColor('textMuted');
  },
  get border() {
    return readCssColor('border');
  },
  get surface() {
    return readCssColor('surface');
  },
  get info() {
    return readCssColor('info');
  },
  get warning() {
    return readCssColor('warning');
  },
  get danger() {
    return readCssColor('danger');
  },
  get successMuted() {
    return readCssColor('successMuted');
  },
  get surfaceMuted() {
    return readCssColor('surfaceMuted');
  },
};

export function parcelStatusColors(): Record<string, string> {
  return {
    created: '#86EFAC',
    in_transit: readCssColor('info'),
    delivered_to_locker: readCssColor('warning'),
    ready_for_pickup: readCssColor('primary'),
    collected: readCssColor('successFg'),
  };
}

export function issueTypeColors(): Record<string, string> {
  return {
    failed_delivery: readCssColor('danger'),
    locker_unavailable: readCssColor('warning'),
    parcel_problem: readCssColor('info'),
    locker_system: '#0D9488',
  };
}

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
        backgroundColor: readCssColor('secondary'),
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
          color: readCssColor('textMuted'),
          font: baseFont,
          maxRotation: 0,
          autoSkip: true,
          maxTicksLimit: 8,
        },
      },
      y: {
        beginAtZero: true,
        grid: { color: readCssColor('borderSubtle') },
        border: { display: false },
        ticks: {
          color: readCssColor('textMuted'),
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
          color: readCssColor('secondary'),
          font: baseFont,
          boxWidth: 10,
          boxHeight: 10,
          padding: 12,
        },
      },
      tooltip: {
        backgroundColor: readCssColor('secondary'),
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
