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
import {
  CaptureDurationCard,
  PacketCountCard,
  PacketSizeCard,
} from '../components/data-card';

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
  // useEffect(() => {
  //   const fetchData = async () => {
  //     try {
  //       setLoading(true);

  //       // Check if we have analysis data in localStorage
  //       if (typeof window !== 'undefined') {
  //         const savedAnalysis = localStorage.getItem('analysisData');

  //         if (savedAnalysis) {
  //           try {
  //             const parsedAnalysis = JSON.parse(savedAnalysis);
  //             setAnalysisInfo({
  //               originalFilename: parsedAnalysis.originalFilename,
  //               timestamp: parsedAnalysis.timestamp,
  //             });

  //             // Store raw data as-is
  //             setData(parsedAnalysis.data);
  //             console.log('Data from localStorage:', parsedAnalysis.data);
  //             setError(null);
  //             return; // Exit early since we have data
  //           } catch (e) {
  //             console.error('Error parsing analysis data:', e);
  //             // Fall through to API request if parsing fails
  //           }
  //         }
  //       }

  //       // If we don't have localStorage data, fetch from API
  //       const response = await fetch(`${API_BASE_URL}/api/analyzeOverview`);

  //       // save the response to local storage
  //       const data = await response.json();
  //       localStorage.setItem('analysisData', JSON.stringify(data));

  //       if (!response.ok) {
  //         throw new Error(`API Error: ${response.status}`);
  //       }

  //       const apiData = await response.json();
  //       console.log('API response:', apiData);

  //       // Store the raw API data
  //       setData(apiData);
  //       setError(null);
  //     } catch (err) {
  //       console.error('Failed to fetch data:', err);
  //       setError(err instanceof Error ? err.message : 'Unknown error occurred');
  //       // Fall back to sample data
  //       setData(sampleData);
  //     } finally {
  //       setTimeout(() => setLoading(false), 500);
  //     }
  //   };

  //   fetchData();
  // }, []);

  // Inside your useEffect where data is fetched:
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);

        // Get metadata from localStorage (small data)
        const metadataString = localStorage.getItem('analysisMetadata');

        if (metadataString) {
          const metadata = JSON.parse(metadataString);
          setAnalysisInfo(metadata);

          // Try to get data from CacheStorage
          try {
            const cache = await caches.open('packet-analysis-data');
            const response = await cache.match('/analysis-data');

            if (response) {
              const cacheData = await response.json();
              console.log('Data retrieved from CacheStorage:', cacheData);

              // Just set the data directly - don't try to set packet arrays that don't exist
              setData(cacheData);
              setError(null);
              return; // Exit early since we have data
            }
          } catch (cacheError) {
            console.error(
              'Error retrieving data from CacheStorage:',
              cacheError,
            );
            // Continue to fallback methods
          }
        }

        // If CacheStorage failed, try the API
        try {
          const response = await fetch(`${API_BASE_URL}/api/analyzeOverview`);

          if (!response.ok) {
            throw new Error(`API error: ${response.status}`);
          }

          const apiData = await response.json();
          console.log('API response:', apiData);

          // Store the API response in CacheStorage for future use
          try {
            const cache = await caches.open('packet-analysis-data');
            const jsonResponse = new Response(JSON.stringify(apiData), {
              headers: { 'Content-Type': 'application/json' },
            });
            await cache.put('/analysis-data', jsonResponse);

            // Store metadata in localStorage
            if (!metadataString) {
              localStorage.setItem(
                'analysisMetadata',
                JSON.stringify({
                  originalFilename: 'API Data',
                  timestamp: new Date().toISOString(),
                }),
              );
            }
          } catch (cacheError) {
            console.error(
              'Error storing API data in CacheStorage:',
              cacheError,
            );
          }

          // Set the data directly
          setData(apiData);
          setError(null);
        } catch (error) {
          const apiErr = error as Error;
          console.error('API fetch failed:', apiErr);
          throw new Error(`Failed to fetch data: ${apiErr.message}`);
        }
      } catch (err) {
        console.error('Failed to fetch data:', err);
        setError(err instanceof Error ? err.message : 'Unknown error occurred');
        // Fall back to sample data
        setData(sampleData);
      } finally {
        setTimeout(() => setLoading(false), 300);
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
            <PacketCountCard
              value={displayData.total_packets}
              isLoading={loading}
            />
            <PacketSizeCard
              value={displayData.stats?.avg_packet_size || 0}
              isLoading={loading}
            />
            <CaptureDurationCard
              value={displayData.stats?.capture_duration || 0}
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
          {/* Add Jitter Analysis Section */}
          {data?.analysis?.jitter &&
            Object.keys(data.analysis.jitter).length > 0 && (
              <div className='rounded-xl bg-muted/50 p-6 mt-4'>
                <h3 className='text-lg font-medium mb-4'>
                  Network Jitter Analysis
                </h3>

                <div className='grid grid-cols-1 md:grid-cols-3 gap-4'>
                  {Object.entries(data.analysis.jitter)
                    .sort((a, b) => b[1].avg - a[1].avg) // Sort by average jitter value (highest first)
                    .map(([protocol, stats]) => {
                      // Calculate jitter severity
                      const severityClass =
                        stats.avg < 10
                          ? 'bg-green-100 dark:bg-green-900/20 border-green-200 dark:border-green-800'
                          : stats.avg < 100
                          ? 'bg-yellow-100 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800'
                          : 'bg-red-100 dark:bg-red-900/20 border-red-200 dark:border-red-800';

                      const severityText =
                        stats.avg < 10
                          ? 'text-green-800 dark:text-green-400'
                          : stats.avg < 100
                          ? 'text-yellow-800 dark:text-yellow-400'
                          : 'text-red-800 dark:text-red-400';

                      return (
                        <div
                          key={protocol}
                          className={`border rounded-lg p-4 ${severityClass}`}
                        >
                          <div className='flex justify-between items-center'>
                            <h4 className='font-medium'>{protocol}</h4>
                            <span
                              className={`text-xs px-2 py-1 rounded-full ${severityText} font-medium`}
                            >
                              {stats.avg < 10
                                ? 'Low'
                                : stats.avg < 100
                                ? 'Medium'
                                : 'High'}{' '}
                              Jitter
                            </span>
                          </div>

                          <div className='space-y-2 mt-3'>
                            <div className='flex justify-between text-sm'>
                              <span>Average</span>
                              <span className='font-medium'>
                                {stats.avg.toFixed(2)} ms
                              </span>
                            </div>
                            <div className='flex justify-between text-sm'>
                              <span>Maximum</span>
                              <span>{stats.max.toFixed(2)} ms</span>
                            </div>
                            <div className='flex justify-between text-sm'>
                              <span>Minimum</span>
                              <span>{stats.min.toFixed(2)} ms</span>
                            </div>
                            <div className='flex justify-between text-sm'>
                              <span>Variability</span>
                              <span>±{stats.std.toFixed(2)} ms</span>
                            </div>
                            <div className='mt-3'>
                              <div className='w-full bg-white/50 dark:bg-black/20 rounded-full h-1.5'>
                                <div
                                  className='bg-primary h-1.5 rounded-full'
                                  style={{
                                    width: `${Math.min(
                                      100,
                                      (stats.avg / 50) * 100,
                                    )}%`,
                                  }}
                                ></div>
                              </div>
                              <div className='flex justify-between text-xs text-muted-foreground mt-1'>
                                <span>0 ms</span>
                                <span>50+ ms</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                </div>

                <div className='mt-4 text-sm text-muted-foreground'>
                  <p>
                    <strong>Jitter</strong> represents the variation in packet
                    delay. High jitter can cause issues with real-time
                    communications and streaming applications.
                  </p>
                </div>
              </div>
            )}

          {/* Add Latency Analysis Section - similar to Jitter section */}
          {data?.analysis?.latency &&
            Object.keys(data.analysis.latency).length > 0 && (
              <div className='rounded-xl bg-muted/50 p-6 mt-4'>
                <h3 className='text-lg font-medium mb-4'>
                  Network Latency Analysis
                </h3>

                <div className='grid grid-cols-1 md:grid-cols-3 gap-4'>
                  {Object.entries(data.analysis.latency)
                    .sort((a, b) => b[1].avg - a[1].avg) // Sort by average latency value (highest first)
                    .map(([protocol, stats]) => {
                      // Calculate latency severity
                      const severityClass =
                        stats.avg < 10
                          ? 'bg-green-100 dark:bg-green-900/20 border-green-200 dark:border-green-800'
                          : stats.avg < 100
                          ? 'bg-yellow-100 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800'
                          : 'bg-red-100 dark:bg-red-900/20 border-red-200 dark:border-red-800';

                      const severityText =
                        stats.avg < 10
                          ? 'text-green-800 dark:text-green-400'
                          : stats.avg < 100
                          ? 'text-yellow-800 dark:text-yellow-400'
                          : 'text-red-800 dark:text-red-400';

                      return (
                        <div
                          key={protocol}
                          className={`border rounded-lg p-4 ${severityClass}`}
                        >
                          <div className='flex justify-between items-center'>
                            <h4 className='font-medium'>{protocol}</h4>
                            <span
                              className={`text-xs px-2 py-1 rounded-full ${severityText} font-medium`}
                            >
                              {stats.avg < 10
                                ? 'Low'
                                : stats.avg < 100
                                ? 'Medium'
                                : 'High'}{' '}
                              Latency
                            </span>
                          </div>

                          <div className='space-y-2 mt-3'>
                            <div className='flex justify-between text-sm'>
                              <span>Average</span>
                              <span className='font-medium'>
                                {stats.avg.toFixed(2)} ms
                              </span>
                            </div>
                            <div className='flex justify-between text-sm'>
                              <span>Maximum</span>
                              <span>{stats.max.toFixed(2)} ms</span>
                            </div>
                            <div className='flex justify-between text-sm'>
                              <span>Minimum</span>
                              <span>{stats.min.toFixed(2)} ms</span>
                            </div>
                            <div className='flex justify-between text-sm'>
                              <span>Packets</span>
                              <span>{stats.count.toLocaleString()}</span>
                            </div>
                            <div className='mt-3'>
                              <div className='w-full bg-white/50 dark:bg-black/20 rounded-full h-1.5'>
                                <div
                                  className='bg-primary h-1.5 rounded-full'
                                  style={{
                                    width: `${Math.min(
                                      100,
                                      (stats.avg / 50) * 100,
                                    )}%`,
                                  }}
                                ></div>
                              </div>
                              <div className='flex justify-between text-xs text-muted-foreground mt-1'>
                                <span>0 ms</span>
                                <span>50+ ms</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                </div>

                <div className='mt-4 text-sm text-muted-foreground'>
                  <p>
                    <strong>Latency</strong> measures how long it takes for
                    packets to travel across the network. Lower latency leads to
                    more responsive applications.
                  </p>
                </div>
              </div>
            )}

          {/* Add Packet Loss Summary if available */}
          {data?.analysis?.packet_loss && data.analysis.packet_loss.overall && (
            <div className='rounded-xl bg-muted/50 p-6 mt-4'>
              <h3 className='text-lg font-medium mb-4'>Packet Loss Analysis</h3>

              <div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
                <div className='border rounded-lg p-4 bg-card'>
                  <h4 className='font-medium mb-3'>Overall Packet Loss</h4>

                  <div className='flex items-center gap-4 mb-4'>
                    <div
                      className={`text-2xl font-bold ${
                        data.analysis.packet_loss.overall.loss_percentage < 0.1
                          ? 'text-green-500'
                          : data.analysis.packet_loss.overall.loss_percentage <
                            1
                          ? 'text-yellow-500'
                          : 'text-red-500'
                      }`}
                    >
                      {data.analysis.packet_loss.overall.loss_percentage.toFixed(
                        2,
                      )}
                      %
                    </div>
                    <div className='text-sm text-muted-foreground'>
                      {data.analysis.packet_loss.overall.loss_events} loss
                      events detected
                    </div>
                  </div>

                  <div className='w-full bg-secondary rounded-full h-2.5 mb-1'>
                    <div
                      className={`h-2.5 rounded-full ${
                        data.analysis.packet_loss.overall.loss_percentage < 0.1
                          ? 'bg-green-500'
                          : data.analysis.packet_loss.overall.loss_percentage <
                            1
                          ? 'bg-yellow-500'
                          : 'bg-red-500'
                      }`}
                      style={{
                        width: `${Math.min(
                          100,
                          data.analysis.packet_loss.overall.loss_percentage *
                            10,
                        )}%`,
                      }}
                    ></div>
                  </div>
                  <div className='flex justify-between text-xs text-muted-foreground'>
                    <span>0%</span>
                    <span>10%+</span>
                  </div>

                  <div className='mt-4 text-sm space-y-1'>
                    <div className='flex justify-between'>
                      <span>Total Packets</span>
                      <span>
                        {data.analysis.packet_loss.overall.total_transmitted?.toLocaleString() ||
                          'N/A'}
                      </span>
                    </div>
                    <div className='flex justify-between'>
                      <span>Lost Packets</span>
                      <span>
                        {data.analysis.packet_loss.overall.total_lost_packets?.toLocaleString() ||
                          'N/A'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className='border rounded-lg p-4 bg-card'>
                  <h4 className='font-medium mb-3'>Protocol-Specific Loss</h4>

                  <div className='space-y-3 max-h-[200px] overflow-y-auto'>
                    {Object.entries(data.analysis.packet_loss.per_protocol)
                      .filter(([_, stats]) => stats.loss_percentage > 0)
                      .sort(
                        (a, b) => b[1].loss_percentage - a[1].loss_percentage,
                      )
                      .map(([protocol, stats]) => (
                        <div
                          key={protocol}
                          className='flex items-center justify-between'
                        >
                          <div className='flex items-center gap-2'>
                            <div className='w-2 h-2 rounded-full bg-primary'></div>
                            <span>{protocol}</span>
                          </div>
                          <div className='flex items-center gap-3'>
                            <span className='text-sm'>
                              {stats.loss_percentage.toFixed(2)}%
                            </span>
                            <div className='w-16 bg-secondary rounded-full h-1.5'>
                              <div
                                className={`h-1.5 rounded-full ${
                                  stats.loss_percentage < 0.1
                                    ? 'bg-green-500'
                                    : stats.loss_percentage < 1
                                    ? 'bg-yellow-500'
                                    : 'bg-red-500'
                                }`}
                                style={{
                                  width: `${Math.min(
                                    100,
                                    stats.loss_percentage * 10,
                                  )}%`,
                                }}
                              ></div>
                            </div>
                          </div>
                        </div>
                      ))}

                    {Object.entries(
                      data.analysis.packet_loss.per_protocol,
                    ).filter(([_, stats]) => stats.loss_percentage > 0)
                      .length === 0 && (
                      <div className='text-center text-muted-foreground py-4'>
                        No packet loss detected for any protocol
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Add Network Delay Analysis with colorful cards */}
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

                      // Determine severity based on average delay
                      const getSeverity = (avg: number) => {
                        if (avg > 1000)
                          return 'bg-red-100 dark:bg-red-900/20 border-red-200 dark:border-red-800';
                        if (avg > 100)
                          return 'bg-yellow-100 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800';
                        if (avg > 10)
                          return 'bg-orange-100 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800';
                        return 'bg-green-100 dark:bg-green-900/20 border-green-200 dark:border-green-800';
                      };

                      const getTextColor = (avg: number) => {
                        if (avg > 1000) return 'text-red-800 dark:text-red-400';
                        if (avg > 100)
                          return 'text-yellow-800 dark:text-yellow-400';
                        if (avg > 10)
                          return 'text-orange-800 dark:text-orange-400';
                        return 'text-green-800 dark:text-green-400';
                      };

                      const severityClass = getSeverity(stats.avg);
                      const textColorClass = getTextColor(stats.avg);

                      return (
                        <div
                          key={category}
                          className={`border rounded-lg p-4 ${severityClass}`}
                        >
                          <div className='flex justify-between items-center mb-2'>
                            <h4 className='font-medium'>{title}</h4>
                            <span
                              className={`text-xs px-2 py-1 rounded-full ${textColorClass} font-medium`}
                            >
                              {stats.avg < 0.1
                                ? 'Minimal'
                                : stats.avg < 10
                                ? 'Low'
                                : stats.avg < 100
                                ? 'Medium'
                                : 'High'}{' '}
                              Delay
                            </span>
                          </div>
                          <div className='space-y-2'>
                            <div className='flex justify-between text-sm'>
                              <span>Average</span>
                              <span className='font-medium'>
                                {stats.avg.toFixed(2)} ms
                              </span>
                            </div>
                            <div className='flex justify-between text-sm'>
                              <span>Maximum</span>
                              <span>{stats.max.toFixed(2)} ms</span>
                            </div>
                            <div className='flex justify-between text-sm'>
                              <span>Occurrences</span>
                              <span>{stats.count.toLocaleString()}</span>
                            </div>
                            <div className='mt-3'>
                              <div className='w-full bg-white/50 dark:bg-black/20 rounded-full h-1.5'>
                                <div
                                  className='bg-primary h-1.5 rounded-full'
                                  style={{
                                    width: `${Math.min(
                                      100,
                                      (stats.avg / (stats.max / 2)) * 100,
                                    )}%`,
                                  }}
                                ></div>
                              </div>
                              <div className='flex justify-between text-xs text-muted-foreground mt-1'>
                                <span>0 ms</span>
                                <span>{Math.round(stats.max / 2)} ms</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    },
                  )}
                </div>
              </div>
            )}

          {/* Add Top Sources and Destinations if available
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
          )} */}

          {/* Update the Top Sources and Destinations section to be more colorful */}
          {displayData.ip_stats && (
            <div className='grid grid-cols-1 md:grid-cols-2 gap-4 mt-4'>
              <div className='rounded-xl bg-muted/50 p-4'>
                <h3 className='text-lg font-medium mb-4'>Top Source IPs</h3>
                <div className='space-y-3'>
                  {loading ? (
                    <div className='h-40 animate-pulse bg-muted rounded-md'></div>
                  ) : (
                    displayData.ip_stats.top_sources
                      ?.slice(0, 5)
                      .map((source, index) => {
                        // Calculate color based on percentage
                        const getColor = () => {
                          if (source.percentage > 50) {
                            return {
                              bg: 'bg-blue-100 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800',
                              text: 'text-blue-800 dark:text-blue-400',
                            };
                          } else if (source.percentage > 20) {
                            return {
                              bg: 'bg-indigo-100 dark:bg-indigo-900/20 border-indigo-200 dark:border-indigo-800',
                              text: 'text-indigo-800 dark:text-indigo-400',
                            };
                          } else if (source.percentage > 5) {
                            return {
                              bg: 'bg-purple-100 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800',
                              text: 'text-purple-800 dark:text-purple-400',
                            };
                          }
                          return {
                            bg: 'bg-slate-100 dark:bg-slate-900/20 border-slate-200 dark:border-slate-800',
                            text: 'text-slate-800 dark:text-slate-400',
                          };
                        };

                        const colors = getColor();

                        return (
                          <div
                            key={index}
                            className={`flex items-center justify-between border rounded-lg p-3 ${colors.bg}`}
                          >
                            <div className='flex items-center'>
                              <div className='w-8 h-8 rounded-full bg-white/60 dark:bg-black/20 flex items-center justify-center mr-3'>
                                {index + 1}
                              </div>
                              <span className='font-mono'>{source.ip}</span>
                            </div>
                            <div className='flex items-center gap-3'>
                              <span className='text-sm'>
                                {source.packets.toLocaleString()} pkts
                              </span>
                              <span
                                className={`text-xs px-2 py-1 rounded-full ${colors.text} font-medium`}
                              >
                                {source.percentage.toFixed(1)}%
                              </span>
                            </div>
                          </div>
                        );
                      })
                  )}
                </div>
              </div>

              {displayData.port_stats && (
                <div className='rounded-xl bg-muted/50 p-4'>
                  <h3 className='text-lg font-medium mb-4'>
                    Top Destination Ports
                  </h3>
                  <div className='space-y-3'>
                    {loading ? (
                      <div className='h-40 animate-pulse bg-muted rounded-md'></div>
                    ) : (
                      displayData.port_stats.top_destinations
                        ?.slice(0, 5)
                        .map((port, index) => {
                          // Calculate color based on percentage
                          const getColor = () => {
                            if (port.percentage > 50) {
                              return {
                                bg: 'bg-green-100 dark:bg-green-900/20 border-green-200 dark:border-green-800',
                                text: 'text-green-800 dark:text-green-400',
                              };
                            } else if (port.percentage > 20) {
                              return {
                                bg: 'bg-emerald-100 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800',
                                text: 'text-emerald-800 dark:text-emerald-400',
                              };
                            } else if (port.percentage > 5) {
                              return {
                                bg: 'bg-teal-100 dark:bg-teal-900/20 border-teal-200 dark:border-teal-800',
                                text: 'text-teal-800 dark:text-teal-400',
                              };
                            }
                            return {
                              bg: 'bg-slate-100 dark:bg-slate-900/20 border-slate-200 dark:border-slate-800',
                              text: 'text-slate-800 dark:text-slate-400',
                            };
                          };

                          const colors = getColor();
                          const serviceName = getServiceName(port.port);

                          return (
                            <div
                              key={index}
                              className={`flex items-center justify-between border rounded-lg p-3 ${colors.bg}`}
                            >
                              <div className='flex items-center'>
                                <div className='w-8 h-8 rounded-full bg-white/60 dark:bg-black/20 flex items-center justify-center mr-3'>
                                  {index + 1}
                                </div>
                                <div>
                                  <span className='font-mono'>{port.port}</span>
                                  {serviceName && (
                                    <span
                                      className={`text-xs ml-2 ${colors.text}`}
                                    >
                                      {serviceName}
                                    </span>
                                  )}
                                </div>
                              </div>
                              <div className='flex items-center gap-3'>
                                <span className='text-sm'>
                                  {port.packets.toLocaleString()} pkts
                                </span>
                                <span
                                  className={`text-xs px-2 py-1 rounded-full ${colors.text} font-medium`}
                                >
                                  {port.percentage.toFixed(1)}%
                                </span>
                              </div>
                            </div>
                          );
                        })
                    )}

                    {!loading &&
                      displayData.port_stats.top_destinations?.length === 0 && (
                        <div className='text-center text-muted-foreground py-4'>
                          No port data available
                        </div>
                      )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Add Capture Time Information */}
          {data?.overview?.time_range &&
            (data.overview.time_range.start > 0 ||
              data.overview.time_range.end > 0) && (
              <div className='rounded-xl bg-muted/50 p-4 mt-4'>
                <h3 className='text-lg font-medium mb-3'>
                  Capture Time Information
                </h3>

                <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
                  <div className='border rounded-lg p-4 bg-card'>
                    <div className='flex justify-between items-center'>
                      <span className='text-sm'>Start Time</span>
                      <span className='font-medium'>
                        {new Date(
                          data.overview.time_range.start * 1000,
                        ).toLocaleString()}
                      </span>
                    </div>
                  </div>

                  <div className='border rounded-lg p-4 bg-card'>
                    <div className='flex justify-between items-center'>
                      <span className='text-sm'>End Time</span>
                      <span className='font-medium'>
                        {new Date(
                          data.overview.time_range.end * 1000,
                        ).toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>
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
