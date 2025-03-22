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
}: DataTableProps) {
  const sortedData = [...data].sort((a, b) => b.percentage - a.percentage);

  return (
    <Card className={cn('w-full', className)}>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className='w-[200px]'>{columns.nameLabel}</TableHead>
              <TableHead className='text-right'>
                {columns.packetLabel}
              </TableHead>
              <TableHead className='text-right'>
                {columns.percentageLabel}
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedData.map((item) => (
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
