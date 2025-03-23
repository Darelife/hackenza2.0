'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';

// Dynamically import Plotly to avoid SSR issues
const Plot = dynamic(() => import('react-plotly.js'), { ssr: false });

interface MultiLineChartProps {
  title: string;
  data?: any[]; // Traditional data format
  latencyData?: Record<string, { x: number[]; y: number[] }>; // CSV-style data format
  xAxisLabel?: string;
  yAxisLabel?: string;
  className?: string;
  height?: number;
}

// Simple color array for protocols
const colors = [
  '#0ea5e9', // blue
  '#f97316', // orange
  '#8b5cf6', // purple
  '#22c55e', // green
  '#eab308', // yellow
  '#ef4444', // red
  '#6366f1', // indigo
  '#ec4899', // pink
  '#14b8a6', // teal
  '#f43f5e', // rose
];

export function MultiLineChart({
  title,
  latencyData,
  xAxisLabel = 'Time',
  yAxisLabel = 'Value',
  className,
  height = 400,
}: MultiLineChartProps) {
  const [plotData, setPlotData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setIsLoading(true);
    console.log(
      'MultiLineChart received data:',
      latencyData ? Object.keys(latencyData) : 'none',
    );

    if (latencyData && Object.keys(latencyData).length > 0) {
      // Create a simple plotly dataset from the latency data
      const formattedData = Object.keys(latencyData).map((protocol, index) => {
        const values = latencyData[protocol];

        return {
          x: values.x,
          y: values.y,
          type: 'scatter',
          mode: 'lines',
          name: protocol,
          line: {
            color: colors[index % colors.length],
            width: 2,
          },
        };
      });

      setPlotData(formattedData);
    } else {
      setPlotData([]);
    }

    setIsLoading(false);
  }, [latencyData]);

  return (
    <Card className={cn('w-full', className)}>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div style={{ height: `${height}px`, width: '100%' }}>
          {isLoading ? (
            <div className='w-full h-full flex items-center justify-center'>
              <div className='animate-spin rounded-full h-12 w-12 border-b-2 border-primary'></div>
            </div>
          ) : plotData.length > 0 ? (
            <Plot
              data={plotData}
              layout={{
                autosize: true,
                margin: { l: 50, r: 20, t: 10, b: 50 },
                height: height,
                xaxis: {
                  title: xAxisLabel,
                },
                yaxis: {
                  title: yAxisLabel,
                },
              }}
              config={{
                responsive: true,
              }}
              style={{ width: '100%', height: '100%' }}
            />
          ) : (
            <div className='w-full h-full flex items-center justify-center text-muted-foreground'>
              No data available
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
