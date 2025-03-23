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
import { useEffect, useState } from 'react';
import { DataCard } from '../components/data-card';
import { NavCard } from '../components/nav-card';
import { DataTable } from '../components/protocol-table';
import { ThemeToggle } from '../components/theme-toggle';

interface ProtocolData {
  name: string;
  packets: number;
  percentage: number;
}

interface ApiResponse {
  Protocol: ProtocolData[];
  Packet: ProtocolData[];
  total_packets: number;
}

// Empty data for skeleton loading state
const emptyData: ProtocolData[] = [];

// Define API base URL
const API_BASE_URL = 'http://localhost:8000';

export default function Page() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<ApiResponse | null>(null);
  const [analysisInfo, setAnalysisInfo] = useState<any>(null);

  // Load data either from localStorage (if user uploaded a file) or from the API
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);

        // Check if we have analysis data in localStorage
        if (typeof window !== 'undefined') {
          const savedAnalysis = localStorage.getItem('analysisData');

          if (savedAnalysis) {
            try {
              const parsedAnalysis = JSON.parse(savedAnalysis);
              setAnalysisInfo({
                originalFilename: parsedAnalysis.originalFilename,
                timestamp: parsedAnalysis.timestamp,
              });
              setData(parsedAnalysis.data);
              setError(null);
              return; // Exit early since we have data
            } catch (e) {
              console.error('Error parsing analysis data:', e);
              // Fall through to API request if parsing fails
            }
          }
        }

        // If we don't have localStorage data, fetch from API
        const response = await fetch(`${API_BASE_URL}/api/getOverview`);

        if (!response.ok) {
          throw new Error(`API Error: ${response.status}`);
        }

        const apiData = await response.json();
        setData(apiData);
        setError(null);
      } catch (err) {
        console.error('Failed to fetch data:', err);
        setError(err instanceof Error ? err.message : 'Unknown error occurred');
        // Fall back to sample data
        setData({
          Protocol: [
            { name: 'MQTT', packets: 8524, percentage: 97.23 },
            { name: 'HTTPS', packets: 141, percentage: 1.61 },
            { name: 'IPv6', packets: 59, percentage: 0.67 },
            { name: 'DNS', packets: 18, percentage: 0.21 },
            { name: 'ARP', packets: 14, percentage: 0.16 },
            { name: 'UDP', packets: 7, percentage: 0.08 },
            { name: 'IGMP', packets: 4, percentage: 0.05 },
          ],
          Packet: [
            { name: 'IP', packets: 9292, percentage: 99.79 },
            { name: 'TCP', packets: 9284, percentage: 99.7 },
            { name: 'ARP', packets: 12, percentage: 0.13 },
            { name: 'UDP', packets: 8, percentage: 0.09 },
            { name: 'IPv6', packets: 8, percentage: 0.09 },
          ],
          total_packets: 9323,
        });
      } finally {
        setTimeout(() => setLoading(false), 500);
      }
    };

    fetchData();
  }, []);

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className='flex h-16 shrink-0 items-center justify-between border-b px-4'>
          <div className='flex items-center gap-2'>
            <SidebarTrigger className='-ml-1' />
            <Separator orientation='vertical' className='mr-2 h-4' />
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem className='hidden md:block'>
                  Overview
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>
          <ThemeToggle />
        </header>
        <div className='flex flex-1 flex-col gap-4 p-4'>
          {analysisInfo && analysisInfo.originalFilename && (
            <div className='p-3 bg-blue-50 dark:bg-blue-900/20 rounded-md text-sm'>
              <p className='font-medium'>
                Analyzed: {analysisInfo.originalFilename}
              </p>
              <p className='text-muted-foreground text-xs'>
                Uploaded on {new Date(analysisInfo.timestamp).toLocaleString()}
              </p>
            </div>
          )}

          <div className='grid auto-rows-min gap-4 md:grid-cols-2 lg:grid-cols-2'>
            <DataCard
              title='Packet Count'
              value={data?.total_packets.toLocaleString() || '0'}
              isLoading={loading}
            />
            <NavCard
              title='Visualization'
              description='View network visualizations'
              href='/visualization'
            />
          </div>
          <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
            <div className='rounded-xl bg-muted/50 p-4'>
              <DataTable
                data={loading ? emptyData : data?.Protocol || []}
                title='Protocol Distribution'
                columns={{
                  nameLabel: 'Protocol',
                  packetLabel: 'Count',
                  percentageLabel: '%',
                }}
                isLoading={loading}
              />
            </div>
            <div className='rounded-xl bg-muted/50 p-4'>
              <DataTable
                data={loading ? emptyData : data?.Packet || []}
                title='Packet Type Distribution'
                columns={{
                  nameLabel: 'Type',
                  packetLabel: 'Count',
                  percentageLabel: '%',
                }}
                isLoading={loading}
              />
            </div>
          </div>

          {error && (
            <div className='rounded-xl bg-destructive/10 p-4 text-destructive'>
              <h3 className='font-medium'>Error loading data</h3>
              <p>{error}</p>
              <p className='mt-2 text-sm'>
                Using fallback sample data instead.
              </p>
            </div>
          )}
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
