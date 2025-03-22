'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

interface DataPoint {
  name: string;
  [key: string]: string | number;
}

interface MultiLineChartProps {
  title: string;
  data: DataPoint[];
  lines: {
    id: string;
    name: string;
    color: string;
  }[];
  xAxisLabel?: string;
  yAxisLabel?: string;
  className?: string;
}

export function MultiLineChart({
  title,
  data,
  lines,
  xAxisLabel = 'Time',
  yAxisLabel = 'Value',
  className,
}: MultiLineChartProps) {
  return (
    <Card className={cn('w-full', className)}>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className='h-[300px] w-full'>
          <ResponsiveContainer width='100%' height='100%'>
            <LineChart
              data={data}
              margin={{
                top: 5,
                right: 30,
                left: 20,
                bottom: 5,
              }}
            >
              <CartesianGrid
                strokeDasharray='3 3'
                stroke='var(--muted)'
                opacity={0.3}
              />
              <XAxis
                dataKey='name'
                stroke='var(--muted-foreground)'
                fontSize={12}
                tickLine={false}
                axisLine={false}
                label={{
                  value: xAxisLabel,
                  position: 'insideBottomRight',
                  offset: -5,
                }}
              />
              <YAxis
                stroke='var(--muted-foreground)'
                fontSize={12}
                tickLine={false}
                axisLine={false}
                label={{
                  value: yAxisLabel,
                  angle: -90,
                  position: 'insideLeft',
                }}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'var(--background)',
                  borderColor: 'var(--border)',
                  borderRadius: '0.5rem',
                }}
                labelStyle={{ color: 'var(--foreground)' }}
              />
              <Legend
                verticalAlign='bottom'
                height={36}
                wrapperStyle={{
                  fontSize: '12px',
                  color: 'var(--muted-foreground)',
                }}
              />
              {lines.map((line) => (
                <Line
                  key={line.id}
                  type='monotone'
                  dataKey={line.id}
                  name={line.name}
                  stroke={line.color}
                  activeDot={{ r: 6 }}
                  strokeWidth={2}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
