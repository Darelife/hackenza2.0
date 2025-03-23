'use client';

import { AppSidebar } from '@/components/app-sidebar';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
} from '@/components/ui/breadcrumb';
import { Separator } from '@/components/ui/separator';
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from '@/components/ui/sidebar';
import { MultiLineChart } from '../components/multi-line-chart';
import { useState, useEffect } from 'react';

// Function to process CSV data
const processLatencyData = (csvString: string) => {
  const lines = csvString.split('\n');
  const data: Record<string, { x: number[]; y: number[] }> = {};

  let currentProtocol = '';
  let xValues: number[] = [];
  let yValues: number[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line || line.startsWith('//')) continue;

    const parts = line.split(',');
    if (parts.length === 3) {
      const protocol = parts[0];
      const x = parseFloat(parts[1]);
      const y = parseFloat(parts[2]);

      if (currentProtocol !== protocol) {
        if (currentProtocol && xValues.length > 0) {
          data[currentProtocol] = { x: xValues, y: yValues };
        }
        currentProtocol = protocol;
        xValues = [];
        yValues = [];
      }

      xValues.push(x);
      yValues.push(y);
    }
  }

  if (currentProtocol && xValues.length > 0) {
    data[currentProtocol] = { x: xValues, y: yValues };
  }

  return data;
};

export default function VisualizationPage() {
  const [latencyData, setLatencyData] = useState<Record<
    string,
    { x: number[]; y: number[] }
  > | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setIsLoading(true);
    setError(null);

    // Fetch the CSV file from public directory
    // (where Next.js exposes static files)
    fetch('/latency_distribution_coordinates.csv')
      .then((response) => {
        if (!response.ok) {
          throw new Error(`Failed to load CSV file: ${response.status}`);
        }
        return response.text();
      })
      .then((csvText) => {
        try {
          const processedData = processLatencyData(csvText);
          setLatencyData(processedData);
          console.log('Data loaded successfully:', Object.keys(processedData));
        } catch (err) {
          console.error('Error processing CSV data:', err);
          setError(`Error processing CSV data: ${err}`);
        }
      })
      .catch((err) => {
        console.error('Error fetching CSV:', err);
        setError(`Error fetching CSV: ${err.message}`);
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, []);

  return (
    <SidebarProvider>
      <AppSidebar activeItem='Visualization' />
      <SidebarInset>
        <header className='flex h-16 shrink-0 items-center gap-2 border-b px-4'>
          <SidebarTrigger className='-ml-1' />
          <Separator orientation='vertical' className='mr-2 h-4' />
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem className='hidden md:block'>
                Visualization
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </header>
        <div className='flex flex-1 flex-col gap-4 p-4'>
          <div className='rounded-xl bg-muted/50 p-6'>
            <h1 className='text-2xl font-bold mb-4'>
              Protocol Latency Distribution
            </h1>
            <p className='text-muted-foreground mb-6'>
              {isLoading
                ? 'Loading data...'
                : latencyData
                ? `Showing latency distribution for ${
                    Object.keys(latencyData).length
                  } protocols with ${Object.values(latencyData).reduce(
                    (sum, { x }) => sum + x.length,
                    0,
                  )} data points.`
                : 'No data available.'}
            </p>

            {error && (
              <div className='bg-destructive/10 text-destructive p-4 rounded-md mb-6'>
                <p>{error}</p>
              </div>
            )}

            {isLoading ? (
              <div className='h-[400px] flex items-center justify-center'>
                <div className='animate-spin rounded-full h-12 w-12 border-b-2 border-primary'></div>
              </div>
            ) : (
              <MultiLineChart
                title='Protocol Latency Distribution'
                latencyData={latencyData || {}}
                xAxisLabel='Latency (ms)'
                yAxisLabel='Density'
                height={500}
              />
            )}
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
