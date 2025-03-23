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

// Remove the CSV processing function as we don't need it anymore

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

    // Fetch the JSON file from public directory instead of CSV
    fetch('/latency_distribution.json')
      .then((response) => {
        if (!response.ok) {
          throw new Error(`Failed to load JSON file: ${response.status}`);
        }
        return response.json();
      })
      .then((jsonData) => {
        try {
          // Extract the data from the JSON structure
          // Based on your sample JSON, the data is nested in a "data" property
          if (jsonData && jsonData.data) {
            setLatencyData(jsonData.data);
            console.log(
              'Data loaded successfully:',
              Object.keys(jsonData.data),
            );
          } else {
            throw new Error('Invalid JSON structure: missing data property');
          }
        } catch (err) {
          console.error('Error processing JSON data:', err);
          setError(`Error processing JSON data: ${err}`);
        }
      })
      .catch((err) => {
        console.error('Error fetching JSON:', err);
        setError(`Error fetching JSON: ${err.message}`);
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
