'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { cva } from 'class-variance-authority';

interface DataItem {
  name: string;
  packets: number;
  percentage: number;
}

interface DataTableProps {
  data: DataItem[];
  title?: string;
  className?: string;
  columns?: {
    nameLabel?: string;
    packetLabel?: string;
    percentageLabel?: string;
  };
  isLoading?: boolean;
}

// Color variants based on percentage
const colorVariants = cva("", {
  variants: {
    severity: {
      high: "bg-blue-100 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800",
      medium: "bg-indigo-100 dark:bg-indigo-900/20 border-indigo-200 dark:border-indigo-800",
      low: "bg-purple-100 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800",
      minimal: "bg-slate-100 dark:bg-slate-900/20 border-slate-200 dark:border-slate-800"
    }
  },
  defaultVariants: {
    severity: "minimal"
  }
});

const textVariants = cva("", {
  variants: {
    severity: {
      high: "text-blue-800 dark:text-blue-400",
      medium: "text-indigo-800 dark:text-indigo-400",
      low: "text-purple-800 dark:text-purple-400",
      minimal: "text-slate-800 dark:text-slate-400"
    }
  },
  defaultVariants: {
    severity: "minimal"
  }
});

// Function to determine severity based on percentage
function getSeverity(percentage: number) {
  if (percentage > 50) return "high";
  if (percentage > 10) return "medium";
  if (percentage > 1) return "low";
  return "minimal";
}

export function DataTable({
  data,
  title = 'Data Distribution',
  className = '',
  columns = {
    nameLabel: 'Name',
    packetLabel: 'Packets',
    percentageLabel: 'Percentage',
  },
  isLoading = false,
}: DataTableProps) {
  const sortedData = [...data].sort((a, b) => b.percentage - a.percentage);

  // Create skeleton rows
  const skeletonCards = Array(5)
    .fill(0)
    .map((_, i) => (
      <div key={`skeleton-${i}`} className="border rounded-lg p-3">
        <div className='flex justify-between items-center'>
          <Skeleton className='h-5 w-32' />
          <div className='flex items-center gap-3'>
            <Skeleton className='h-4 w-20' />
            <Skeleton className='h-6 w-14 rounded-full' />
          </div>
        </div>
        <div className='mt-2'>
          <Skeleton className='h-1.5 w-full rounded-full' />
        </div>
      </div>
    ));

  return (
    <Card className={cn('w-full', className)}>
      <CardHeader>
        <CardTitle>
          {isLoading ? <Skeleton className='h-6 w-48' /> : title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {isLoading ? (
            skeletonCards
          ) : (
            sortedData.map((item) => {
              const severity = getSeverity(item.percentage);
              return (
                <div
                  key={item.name}
                  className={`border rounded-lg p-3 ${colorVariants({ severity })}`}
                >
                  <div className='flex justify-between items-center'>
                    <div className='flex items-center gap-2'>
                      <div className={`w-2 h-2 rounded-full ${textVariants({ severity })}`}></div>
                      <span className='font-medium'>{item.name}</span>
                    </div>
                    <div className='flex items-center gap-3'>
                      <span className='text-sm'>{item.packets.toLocaleString()} packets</span>
                      <span className={`text-xs px-2 py-1 rounded-full ${textVariants({ severity })} font-medium`}>
                        {item.percentage.toFixed(2)}%
                      </span>
                    </div>
                  </div>
                  <div className='mt-2'>
                    <div className='w-full bg-white/50 dark:bg-black/20 rounded-full h-1.5'>
                      <div
                        className='bg-primary h-1.5 rounded-full'
                        style={{
                          width: `${Math.min(100, item.percentage)}%`,
                        }}
                      ></div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </CardContent>
    </Card>
  );
}
