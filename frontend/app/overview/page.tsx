'use client';

import { AppSidebar } from '@/components/app-sidebar';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
} from '@/components/ui/breadcrumb';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from '@/components/ui/sidebar';
import { Download } from 'lucide-react';
import { useEffect, useState } from 'react';
import { DataCard } from '../components/data-card';
import { DataTable } from '../components/protocol-table';
import { ThemeToggle } from '../components/theme-toggle';

// Define interfaces for protocol data
interface ProtocolData {
  name: string;
  packets: number;
  percentage: number;
}

// Define interfaces for delay categories
interface DelayStats {
  avg: number;
  count: number;
  max: number;
  min?: number;
  std?: number;
}

interface DelayCategories {
  broker_processing_delays?: DelayStats;
  bundling_delays?: DelayStats;
  device_to_broker_delays?: DelayStats;
  [key: string]: DelayStats | undefined;
}

// Define interface for statistics
interface Stats {
  avg_packet_size: number;
  capture_duration: number;
  max_packet_size: number;
  min_packet_size: number;
  packets_per_second: number;
  total_packets?: number;
}

// Define interface for IP stats
interface IPEntry {
  ip: string;
  packets: number;
  percentage: number;
}

interface IPStats {
  top_sources: IPEntry[];
  top_destinations: IPEntry[];
}

// Define interface for port stats
interface PortEntry {
  port: number;
  packets: number;
  percentage: number;
}

interface PortStats {
  top_sources: PortEntry[];
  top_destinations: PortEntry[];
}

// Define interface for time range
interface TimeRange {
  start: number;
  end: number;
}

// Define interfaces for IOT metrics
interface DeviceStats {
  small_packets: number;
  bundled_packets: number;
  total: number;
}

interface DevicePatterns {
  [key: string]: DeviceStats;
}

interface IoTMetrics {
  bundle_sizes: any[];
  aggregation_intervals: any[];
  device_patterns: DevicePatterns;
}

// Define interfaces for latency/jitter data
interface ProtocolStats {
  avg: number;
  count: number;
  max: number;
  min: number;
  std: number;
}

interface ProtocolMetrics {
  [key: string]: ProtocolStats;
}

// Define interface for packet loss
interface LossStats {
  loss_events: number;
  loss_percentage: number;
  lost_packets?: number;
  total_lost_packets?: number;
  transmitted?: number;
  total_transmitted?: number;
}

interface PacketLoss {
  overall: LossStats;
  per_protocol: {
    [key: string]: LossStats;
  };
}

// Define interfaces for nested data structure
interface OverviewData {
  Protocol: ProtocolData[];
  Packet: ProtocolData[];
  stats: Stats;
  ip_stats: IPStats;
  port_stats: PortStats;
  time_range: TimeRange;
}

interface AnalysisData {
  delay_categories: DelayCategories;
  iot_metrics: IoTMetrics;
  jitter: ProtocolMetrics;
  latency: ProtocolMetrics;
  packet_loss: PacketLoss;
}

// Main API response interface - covers both flat and nested formats
interface ApiResponse {
  // Flat format properties
  Protocol?: ProtocolData[];
  Packet?: ProtocolData[];
  total_packets?: number;
  stats?: Stats;
  delay_categories?: DelayCategories;

  // Nested format properties
  overview?: OverviewData;
  analysis?: AnalysisData;
}

// Define final display data structure
interface DisplayData {
  Protocol: ProtocolData[];
  Packet: ProtocolData[];
  total_packets: number;
  stats?: Stats;
  delay_categories?: DelayCategories;
  ip_stats?: IPStats;
  port_stats?: PortStats;
  // Can add more properties as needed
}

// Empty data for skeleton loading state
const emptyData: ProtocolData[] = [];

// Define API base URL
const API_BASE_URL = 'http://localhost:8000';

// Sample data for fallback when API fails - matches data.json structure
const sampleData: ApiResponse = {
  overview: {
    Protocol: [
      { name: 'MQTT', packets: 9256, percentage: 99.39 },
      { name: 'HTTPS', packets: 28, percentage: 0.3 },
      { name: 'ARP', packets: 12, percentage: 0.12 },
      { name: 'UDP', packets: 8, percentage: 0.08 },
      { name: 'IPv6', packets: 8, percentage: 0.08 },
    ],
    Packet: [
      { name: 'IP', packets: 9292, percentage: 99.78 },
      { name: 'TCP', packets: 9284, percentage: 99.69 },
      { name: 'ARP', packets: 12, percentage: 0.12 },
      { name: 'UDP', packets: 8, percentage: 0.08 },
      { name: 'IPv6', packets: 8, percentage: 0.08 },
    ],
    stats: {
      avg_packet_size: 134.99,
      capture_duration: 146.62,
      max_packet_size: 854,
      min_packet_size: 54,
      packets_per_second: 63.5,
      total_packets: 9312,
    },
    ip_stats: {
      top_sources: [],
      top_destinations: [],
    },
    port_stats: {
      top_sources: [],
      top_destinations: [],
    },
    time_range: {
      start: 0,
      end: 0,
    },
  },
  analysis: {
    delay_categories: {
      broker_processing_delays: {
        avg: 1549.77,
        count: 17,
        max: 14000.83,
      },
      bundling_delays: {
        avg: 0.12,
        count: 2529,
        max: 0.99,
      },
      device_to_broker_delays: {
        avg: 8.13,
        count: 4922,
        max: 14000.83,
      },
    },
    iot_metrics: {
      bundle_sizes: [],
      aggregation_intervals: [],
      device_patterns: {},
    },
    jitter: {},
    latency: {},
    packet_loss: {
      overall: {
        loss_events: 0,
        loss_percentage: 0,
        total_lost_packets: 0,
        total_transmitted: 0,
      },
      per_protocol: {},
    },
  },
};

// Helper function to get common port names
function getServiceName(port: number): string {
  const commonPorts: Record<number, string> = {
    20: 'FTP Data',
    21: 'FTP Control',
    22: 'SSH',
    23: 'Telnet',
    25: 'SMTP',
    53: 'DNS',
    80: 'HTTP',
    110: 'POP3',
    143: 'IMAP',
    443: 'HTTPS',
    465: 'SMTPS',
    587: 'SMTP',
    993: 'IMAPS',
    995: 'POP3S',
    3306: 'MySQL',
    3389: 'RDP',
    5353: 'mDNS',
    8080: 'HTTP Alt',
    8443: 'HTTPS Alt',
    8883: 'MQTT/SSL',
  };

  return commonPorts[port] || '';
}

export default function Page() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<ApiResponse | null>(null);
  const [displayData, setDisplayData] = useState<DisplayData>({
    Protocol: [],
    Packet: [],
    total_packets: 0,
  });
  const [analysisInfo, setAnalysisInfo] = useState<any>(null);

  // Process data into a consistent format for display
  useEffect(() => {
    if (!data) return;

    // Create a normalized data structure regardless of the input format
    const processed: DisplayData = {
      Protocol: data.Protocol || data.overview?.Protocol || [],
      Packet: data.Packet || data.overview?.Packet || [],
      total_packets:
        data.total_packets || data.overview?.stats?.total_packets || 0,
      stats: data.stats || data.overview?.stats,
      delay_categories:
        data.delay_categories || data.analysis?.delay_categories,
      ip_stats: data.overview?.ip_stats,
      port_stats: data.overview?.port_stats,
    };

    setDisplayData(processed);
    console.log('Processed data for display:', processed);
  }, [data]);

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

              // Store raw data as-is
              setData(parsedAnalysis.data);
              console.log('Data from localStorage:', parsedAnalysis.data);
              setError(null);
              return; // Exit early since we have data
            } catch (e) {
              console.error('Error parsing analysis data:', e);
              // Fall through to API request if parsing fails
            }
          }
        }

        // If we don't have localStorage data, fetch from API
        const response = await fetch(`${API_BASE_URL}/api/analyzeOverview`);

        if (!response.ok) {
          throw new Error(`API Error: ${response.status}`);
        }

        const apiData = await response.json();
        console.log('API response:', apiData);

        // Store the raw API data
        setData(apiData);
        setError(null);
      } catch (err) {
        console.error('Failed to fetch data:', err);
        setError(err instanceof Error ? err.message : 'Unknown error occurred');
        // Fall back to sample data
        setData(sampleData);
      } finally {
        setTimeout(() => setLoading(false), 500);
      }
    };

    fetchData();
  }, []);

  // Add this function to download data to a JSON file
  const downloadDataAsJson = () => {
    if (!data) return;

    // Create a blob of the data
    const jsonString = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });

    // Create a download link and trigger it
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'data.json';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    console.log('Data downloaded to data.json file');
  };

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
          <div className='flex items-center gap-2'>
            <Button
              variant='outline'
              size='sm'
              onClick={downloadDataAsJson}
              disabled={loading || !data}
              className='flex items-center gap-1'
            >
              <Download className='h-4 w-4' />
              <span>Save Data</span>
            </Button>
            <ThemeToggle />
          </div>
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

          <div className='grid auto-rows-min gap-4 md:grid-cols-3 lg:grid-cols-3'>
            <DataCard
              title='Packet Count'
              value={displayData.total_packets.toLocaleString()}
              isLoading={loading}
            />
            <DataCard
              title='Avg Packet Size'
              value={`${Math.round(
                displayData.stats?.avg_packet_size || 0,
              )} bytes`}
              isLoading={loading}
            />
            <DataCard
              title='Capture Duration'
              value={`${(displayData.stats?.capture_duration || 0).toFixed(
                2,
              )}s`}
              isLoading={loading}
            />
          </div>

          <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
            <div className='rounded-xl bg-muted/50 p-4'>
              <DataTable
                data={loading ? emptyData : displayData.Protocol}
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
                data={loading ? emptyData : displayData.Packet}
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

          {/* Add Network Delay Analysis */}
          {displayData.delay_categories &&
            Object.keys(displayData.delay_categories).length > 0 && (
              <div className='rounded-xl bg-muted/50 p-6 mt-4'>
                <h3 className='text-lg font-medium mb-4'>
                  Network Delay Analysis
                </h3>

                <div className='grid grid-cols-1 md:grid-cols-3 gap-4'>
                  {Object.entries(displayData.delay_categories).map(
                    ([category, stats]) => {
                      if (!stats) return null;

                      const title = category
                        .replace(/_/g, ' ')
                        .split(' ')
                        .map(
                          (word) =>
                            word.charAt(0).toUpperCase() + word.slice(1),
                        )
                        .join(' ');

                      return (
                        <div
                          key={category}
                          className='border rounded-lg p-4 bg-card'
                        >
                          <h4 className='font-medium mb-2'>{title}</h4>
                          <div className='space-y-2'>
                            <div className='flex justify-between text-sm'>
                              <span>Average</span>
                              <span>{stats.avg.toFixed(2)} ms</span>
                            </div>
                            <div className='flex justify-between text-sm'>
                              <span>Maximum</span>
                              <span>{stats.max.toFixed(2)} ms</span>
                            </div>
                            <div className='flex justify-between text-sm'>
                              <span>Occurrences</span>
                              <span>{stats.count}</span>
                            </div>
                          </div>
                        </div>
                      );
                    },
                  )}
                </div>
              </div>
            )}

          {/* Add Top Sources and Destinations if available */}
          {displayData.ip_stats && (
            <div className='grid grid-cols-1 md:grid-cols-2 gap-4 mt-4'>
              <div className='rounded-xl bg-muted/50 p-4'>
                <h3 className='text-lg font-medium mb-3'>Top Source IPs</h3>
                <div className='space-y-3'>
                  {loading ? (
                    <div className='h-40 animate-pulse bg-muted rounded-md'></div>
                  ) : (
                    displayData.ip_stats.top_sources
                      ?.slice(0, 5)
                      .map((source, index) => (
                        <div
                          key={index}
                          className='flex items-center justify-between'
                        >
                          <div className='flex items-center'>
                            <div className='w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center mr-3'>
                              {index + 1}
                            </div>
                            <span className='font-mono'>{source.ip}</span>
                          </div>
                          <div className='flex items-center gap-2'>
                            <span className='text-sm'>
                              {source.packets.toLocaleString()} pkts
                            </span>
                            <div className='w-16 bg-secondary rounded-full h-1.5'>
                              <div
                                className='bg-primary h-1.5 rounded-full'
                                style={{ width: `${source.percentage}%` }}
                              ></div>
                            </div>
                            <span className='text-xs text-muted-foreground'>
                              {source.percentage.toFixed(1)}%
                            </span>
                          </div>
                        </div>
                      ))
                  )}
                </div>
              </div>

              {displayData.port_stats && (
                <div className='rounded-xl bg-muted/50 p-4'>
                  <h3 className='text-lg font-medium mb-3'>
                    Top Destination Ports
                  </h3>
                  <div className='space-y-3'>
                    {loading ? (
                      <div className='h-40 animate-pulse bg-muted rounded-md'></div>
                    ) : (
                      displayData.port_stats.top_destinations
                        ?.slice(0, 5)
                        .map((port, index) => (
                          <div
                            key={index}
                            className='flex items-center justify-between'
                          >
                            <div className='flex items-center'>
                              <div className='w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center mr-3'>
                                {index + 1}
                              </div>
                              <div>
                                <span className='font-mono'>{port.port}</span>
                                <span className='text-xs text-muted-foreground ml-2'>
                                  {getServiceName(port.port)}
                                </span>
                              </div>
                            </div>
                            <div className='flex items-center gap-2'>
                              <span className='text-sm'>
                                {port.packets.toLocaleString()} pkts
                              </span>
                              <div className='w-16 bg-secondary rounded-full h-1.5'>
                                <div
                                  className='bg-primary h-1.5 rounded-full'
                                  style={{ width: `${port.percentage}%` }}
                                ></div>
                              </div>
                              <span className='text-xs text-muted-foreground'>
                                {port.percentage.toFixed(1)}%
                              </span>
                            </div>
                          </div>
                        ))
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

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
