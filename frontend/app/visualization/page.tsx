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

export default function VisualizationPage() {
  const [latencyData, setLatencyData] = useState<Record<string, { x: number[]; y: number[] }> | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [packetSize, setPacketSize] = useState<number[] | null>(null);
  const [latencyTimeline, setLatencyTimeline] = useState<number[] | null>(null);
  const [jitterDistribution, setJitterDistribution] = useState<number[] | null>(null);
  const [availableCharts, setAvailableCharts] = useState<string[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        // Get data from CacheStorage
        const cache = await caches.open('packet-analysis-data');
        const response = await cache.match('/analysis-data');
        
        if (response) {
          const cacheData = await response.json();
          console.log('Data from CacheStorage:', cacheData);
          
          const charts = [];
          
          // Extract and set all available data
          if (cacheData) {
            if (cacheData.data_distribution) {
              setLatencyData(cacheData.data_distribution);
              charts.push('latencyDistribution');
            }
            
            if (cacheData.packet_size) {
              const packetSizeData = Array.isArray(cacheData.packet_size) 
                ? cacheData.packet_size 
                : [cacheData.packet_size];
              setPacketSize(packetSizeData);
              charts.push('packetSize');
            }
            
            if (cacheData.latency_timeline) {
              setLatencyTimeline(cacheData.latency_timeline);
              charts.push('latencyTimeline');
            }
            
            if (cacheData.jitter_distribution) {
              setJitterDistribution(cacheData.jitter_distribution);
              charts.push('jitterDistribution');
            }
            
            setAvailableCharts(charts);
          } else {
            setError('No data found in cache');
          }
        } else {
          setError('No analysis data available in cache');
        }
      } catch (err) {
        console.error('Failed to fetch visualization data:', err);
        setError(err instanceof Error ? err.message : 'Unknown error occurred');
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchData();
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
              Protocol Analysis Visualization
            </h1>
            <p className='text-muted-foreground mb-6'>
              {isLoading
              ? 'Loading data...'
              : availableCharts.length > 0
              ? `Showing ${availableCharts.length} visualizations from the analysis data.`
              : 'No data available.'}
            </p>

            {/* Debug information */}
            <div className="mb-4 p-2 bg-gray-100 rounded">
              <p className="text-sm">Available charts: {availableCharts.join(', ')}</p>
              <p className="text-sm">Latency data: {latencyData ? `Yes (${Object.keys(latencyData).length} series)` : 'No'}</p>
              <p className="text-sm">Latency timeline: {latencyTimeline ? `Yes (${latencyTimeline.length} points)` : 'No'}</p>
              <p className="text-sm">Jitter distribution: {jitterDistribution ? `Yes (${jitterDistribution.length} points)` : 'No'}</p>
              <p className="text-sm">Packet size: {packetSize ? `Yes (${packetSize.length} points)` : 'No'}</p>
            </div>

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
              <div className="flex flex-col gap-8">
              {/* {latencyData && Object.keys(latencyData).length > 0 && (
                <div className="border p-4 rounded">
                <h3 className="text-lg font-medium mb-2">Chart 1: Protocol Latency Distribution</h3>
                <MultiLineChart
                  title='Protocol Latency Distribution'
                  latencyData={latencyData}
                  xAxisLabel='Latency (ms)'
                  yAxisLabel='Density'
                  height={500}
                />
                </div>
              )}
               */}
              {latencyTimeline && latencyTimeline.length > 0 && (
                <div className="border p-4 rounded">
                <h3 className="text-lg font-medium mb-2">Chart 2: Latency Timeline</h3>
                <MultiLineChart
                  title='Latency Timeline'
                  latencyData={{ 'Latency': { 
                  x: Array.from({length: latencyTimeline.length}, (_, i) => i), 
                  y: latencyTimeline 
                  }}}
                  xAxisLabel='Time'
                  yAxisLabel='Latency (ms)'
                  height={500}
                />
                </div>
              )}
              
              {jitterDistribution && jitterDistribution.length > 0 && (
                <div className="border p-4 rounded">
                <h3 className="text-lg font-medium mb-2">Chart 3: Jitter Distribution</h3>
                <MultiLineChart
                  title='Jitter Distribution'
                  latencyData={{ 'Jitter': { 
                  x: Array.from({length: jitterDistribution.length}, (_, i) => i), 
                  y: jitterDistribution 
                  }}}
                  xAxisLabel='Time'
                  yAxisLabel='Jitter (ms)'
                  height={500}
                />
                </div>
              )}
              
              {packetSize && packetSize.length > 0 && (
                <div className="border p-4 rounded">
                <h3 className="text-lg font-medium mb-2">Chart 4: Packet Size Distribution</h3>
                <MultiLineChart
                  title='Packet Size Distribution'
                  latencyData={{ 'Packet Size': { 
                  x: Array.from({length: packetSize.length}, (_, i) => i), 
                  y: packetSize 
                  }}}
                  xAxisLabel='Packet Index'
                  yAxisLabel='Size (bytes)'
                  height={500}
                />
                </div>
              )}
              
              {availableCharts.length === 0 && !error && (
                <div className="text-center p-8 text-muted-foreground">
                No visualization data available
                </div>
              )}
              </div>
            )}
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
