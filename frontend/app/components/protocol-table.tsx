'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

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
  const skeletonRows = Array(5)
    .fill(0)
    .map((_, i) => (
      <TableRow key={`skeleton-${i}`}>
        <TableCell>
          <Skeleton className='h-4 w-32' />
        </TableCell>
        <TableCell className='text-right'>
          <Skeleton className='h-4 w-20 ml-auto' />
        </TableCell>
        <TableCell className='text-right'>
          <Skeleton className='h-4 w-12 ml-auto' />
        </TableCell>
      </TableRow>
    ));

  return (
    <Card className={cn('w-full', className)}>
      <CardHeader>
        <CardTitle>
          {isLoading ? <Skeleton className='h-6 w-48' /> : title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className='w-[200px]'>
                {isLoading ? (
                  <Skeleton className='h-4 w-16' />
                ) : (
                  columns.nameLabel
                )}
              </TableHead>
              <TableHead className='text-right'>
                {isLoading ? (
                  <Skeleton className='h-4 w-14 ml-auto' />
                ) : (
                  columns.packetLabel
                )}
              </TableHead>
              <TableHead className='text-right'>
                {isLoading ? (
                  <Skeleton className='h-4 w-10 ml-auto' />
                ) : (
                  columns.percentageLabel
                )}
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading
              ? skeletonRows
              : sortedData.map((item) => (
                  <TableRow key={item.name}>
                    <TableCell className='font-medium'>{item.name}</TableCell>
                    <TableCell className='text-right'>
                      {item.packets.toLocaleString()} packets
                    </TableCell>
                    <TableCell className='text-right'>
                      {item.percentage.toFixed(2)}%
                    </TableCell>
                  </TableRow>
                ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
