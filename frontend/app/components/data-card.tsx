'use client';

import { Skeleton } from '@/components/ui/skeleton';
import { cva } from 'class-variance-authority';
import { LucideIcon } from 'lucide-react';

interface DataCardProps {
  title: string;
  value?: string | number;
  subValue?: string;
  className?: string;
  isLoading?: boolean;
  severity?: 'low' | 'medium' | 'high' | 'default';
  trend?: 'up' | 'down' | 'neutral';
  icon?: React.ReactNode;
  onClick?: () => void;
}

// Fix these background variants to actually work
const backgroundVariants = cva(
  'rounded-xl p-4 flex flex-col justify-between h-32 border', // Changed p-3 to p-4
  {
    variants: {
      severity: {
        low: 'bg-green-100 dark:bg-green-900/20 border-green-200 dark:border-green-800',
        medium:
          'bg-yellow-100 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800',
        high: 'bg-red-100 dark:bg-red-900/20 border-red-200 dark:border-red-800',
        default: 'bg-card border-transparent',
      },
    },
    defaultVariants: {
      severity: 'default',
    },
  },
);

const textVariants = cva('', {
  variants: {
    severity: {
      low: 'text-green-800 dark:text-green-400',
      medium: 'text-yellow-800 dark:text-yellow-400',
      high: 'text-red-800 dark:text-red-400',
      default: 'text-foreground',
    },
  },
  defaultVariants: {
    severity: 'default',
  },
});

const trendVariants = cva('text-xs font-medium', {
  variants: {
    trend: {
      up: 'text-green-600 dark:text-green-400',
      down: 'text-red-600 dark:text-red-400',
      neutral: 'text-muted-foreground',
    },
  },
  defaultVariants: {
    trend: 'neutral',
  },
});

export function DataCard({
  title,
  value = 'No data',
  subValue,
  className = '',
  isLoading = false,
  severity = 'default',
  trend = 'neutral',
  icon,
  onClick,
}: DataCardProps) {
  // Create the class string directly rather than using template literals
  const cardClass = `${backgroundVariants({ severity })} ${className} ${
    onClick ? 'cursor-pointer hover:opacity-90 transition-opacity' : ''
  }`;

  return (
    <div className={cardClass} onClick={onClick}>
      {isLoading ? (
        <>
          <Skeleton className='h-6 w-24' />
          <Skeleton className='h-8 w-32 mb-1' />
          {subValue && <Skeleton className='h-4 w-20' />}
        </>
      ) : (
        <>
          <div className='flex items-center justify-between'>
            <h3 className={`text-lg font-medium ${textVariants({ severity })}`}>
              {title}
            </h3>
            {icon && (
              <div
                className={`text-muted-foreground ${textVariants({
                  severity,
                })}`}
              >
                {icon}
              </div>
            )}
          </div>
          <div
            className={`text-2xl font-bold mb-1 ${textVariants({ severity })}`}
          >
            {value}
          </div>

          {subValue && (
            <div className={trendVariants({ trend })}>
              {trend === 'up' && '↑ '}
              {trend === 'down' && '↓ '}
              {subValue}
            </div>
          )}
        </>
      )}
    </div>
  );
}

export function StatsGrid({ children }: { children: React.ReactNode }) {
  return (
    <div className='grid auto-rows-min gap-4 md:grid-cols-3 lg:grid-cols-3'>
      {children}
    </div>
  );
}

// You can also create pre-configured cards for common metrics
export function PacketCountCard({
  value,
  isLoading = false,
  trend,
}: {
  value: number;
  isLoading?: boolean;
  trend?: 'up' | 'down' | 'neutral';
}) {
  // Determine severity based on packet count
  const severity =
    value > 100000
      ? 'high'
      : value > 10000
      ? 'medium'
      : value > 0
      ? 'low'
      : 'default';

  return (
    <DataCard
      title='Packet Count'
      value={value.toLocaleString()}
      isLoading={isLoading}
      severity={severity}
      trend={trend}
      subValue={`${Math.round(value / 1000)}k packets`}
    />
  );
}

export function PacketSizeCard({
  value,
  isLoading = false,
}: {
  value: number;
  isLoading?: boolean;
}) {
  // Determine severity based on packet size
  const severity = value > 1500 ? 'high' : value > 500 ? 'medium' : 'default';

  return (
    <DataCard
      title='Avg Packet Size'
      value={`${Math.round(value)} bytes`}
      isLoading={isLoading}
      severity={severity}
    />
  );
}

export function CaptureDurationCard({
  value,
  isLoading = false,
}: {
  value: number;
  isLoading?: boolean;
}) {
  // Format based on duration
  let formattedValue = '';
  let subValue = '';

  if (value < 60) {
    formattedValue = `${value.toFixed(2)}s`;
    subValue = 'Very short capture';
  } else if (value < 300) {
    formattedValue = `${(value / 60).toFixed(2)}m`;
    subValue = 'Short capture';
  } else if (value < 3600) {
    formattedValue = `${(value / 60).toFixed(2)}m`;
    subValue = 'Medium capture';
  } else {
    formattedValue = `${(value / 3600).toFixed(2)}h`;
    subValue = 'Long capture';
  }

  return (
    <DataCard
      title='Capture Duration'
      value={formattedValue}
      subValue={subValue}
      isLoading={isLoading}
      severity={value < 60 ? 'low' : value < 300 ? 'medium' : 'high'}
    />
  );
}

export function PacketRateCard({
  value,
  isLoading = false,
}: {
  value: number;
  isLoading?: boolean;
}) {
  // Determine severity based on packet rate
  const severity = value > 1000 ? 'high' : value > 100 ? 'medium' : 'default';

  return (
    <DataCard
      title='Packets/Second'
      value={value.toFixed(1)}
      isLoading={isLoading}
      severity={severity}
    />
  );
}
