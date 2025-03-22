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

interface ProtocolData {
  name: string;
  packets: number;
  percentage: number;
}

interface ProtocolTableProps {
  data: ProtocolData[];
  className?: string;
}

export function ProtocolTable({ data, className }: ProtocolTableProps) {
  const sortedData = [...data].sort((a, b) => b.percentage - a.percentage);

  return (
    <Card className={cn('w-full', className)}>
      <CardHeader>
        <CardTitle>Protocol Distribution</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className='w-[200px]'>Protocol</TableHead>
              <TableHead className='text-right'>Packets</TableHead>
              <TableHead className='text-right'>Percentage</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedData.map((protocol) => (
              <TableRow key={protocol.name}>
                <TableCell className='font-medium'>{protocol.name}</TableCell>
                <TableCell className='text-right'>
                  {protocol.packets.toLocaleString()} packets
                </TableCell>
                <TableCell className='text-right'>
                  {protocol.percentage.toFixed(2)}%
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
