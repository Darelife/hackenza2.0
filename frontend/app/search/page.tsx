'use client';

import { AppSidebar } from '@/components/app-sidebar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { Download, Filter, RefreshCw, Search } from 'lucide-react';
import { useEffect, useState } from 'react';
import { ThemeToggle } from '../components/theme-toggle';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
} from '@/components/ui/breadcrumb';
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from '@/components/ui/sidebar';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { parse } from 'path';

// Define interfaces for packet data
interface Packet {
  number: number;
  time: string;
  source: string;
  destination: string;
  protocol: string;
  length: number;
  info: string;
  [key: string]: any; // For any additional fields
}

// Define API base URL
const API_BASE_URL = 'https://hackenza2pac.onrender.com';

export default function SearchPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [allPackets, setAllPackets] = useState<Packet[]>([]);
  const [filteredPackets, setFilteredPackets] = useState<Packet[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [protocolFilter, setProtocolFilter] = useState('all');
  const [sourceIpFilter, setSourceIpFilter] = useState('all');
  const [destinationIpFilter, setDestinationIpFilter] = useState('all');
  const [lengthFilter, setLengthFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(15); // Increased from 10 to 15
  const [analysisInfo, setAnalysisInfo] = useState<any>(null);
  const [showFilters, setShowFilters] = useState(false);

  const totalPages = Math.ceil(filteredPackets.length / pageSize);
  const paginatedPackets = filteredPackets.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize,
  );

  // Calculate page ranges for pagination display
  const startItem =
    filteredPackets.length > 0 ? (currentPage - 1) * pageSize + 1 : 0;
  const endItem = Math.min(currentPage * pageSize, filteredPackets.length);

  // Load data either from localStorage (if user uploaded a file) or from the API
  // useEffect(() => {
  //   const fetchData = async () => {
  //     try {
  //       setLoading(true);

  //       // // Check if we have analysis data in localStorage
  //       // // const savedAnalysis = localStorage.getItem('analysisData');
  //       // const formData = localStorage.getItem('formData');
  //       // console.log('formData:', formData);

  //       // const xhr = new XMLHttpRequest();
  //       // xhr.open('GET', `${API_BASE_URL}/api/getAllPackets`, true);
  //       // xhr.setRequestHeader('Content-Type', 'application/json');
  //       // xhr.send(formData);

  //       // const apiData = await new Promise<any>((resolve, reject) => {
  //       //   xhr.onload = () => {
  //       //     if (xhr.status >= 200 && xhr.status < 300) {
  //       //       try {
  //       //         const data = JSON.parse(xhr.responseText);
  //       //         resolve(data);
  //       //       } catch (e) {
  //       //         reject(new Error('Invalid response from server'));
  //       //       }
  //       //     } else {
  //       //       reject(new Error(`Upload failed: ${xhr.status} ${xhr.statusText}`));
  //       //     }
  //       //   };

  //       //   xhr.onerror = () => {
  //       //     reject(new Error('Network error occurred'));
  //       //   };
  //       // });

  //       // if (savedAnalysis) {
  //       //   try {
  //       //     const parsedAnalysis = JSON.parse(savedAnalysis);
  //       //     setAnalysisInfo({
  //       //       originalFilename: parsedAnalysis.originalFilename,
  //       //       timestamp: parsedAnalysis.timestamp,
  //       //     });

  //       //     // Check for AllPackets in the data structure
  //       //     if (parsedAnalysis.data && parsedAnalysis.data.AllPackets) {
  //       //       setAllPackets(parsedAnalysis.data.AllPackets);
  //       //       setFilteredPackets(parsedAnalysis.data.AllPackets);
  //       //       console.log('Packet data from localStorage:', parsedAnalysis.data.AllPackets);
  //       //       setError(null);
  //       //       return; // Exit early since we have data
  //       //     }

  //       //     // For backward compatibility - try other possible structures
  //       //     if (parsedAnalysis.AllPackets) {
  //       //       setAllPackets(parsedAnalysis.AllPackets);
  //       //       setFilteredPackets(parsedAnalysis.AllPackets);
  //       //       console.log('Packet data from localStorage (alternative format):', parsedAnalysis.AllPackets);
  //       //       setError(null);
  //       //       return;
  //       //     }
  //       //   } catch (e) {
  //       //     console.error('Error parsing analysis data:', e);
  //       //     // Fall through to API request if parsing fails
  //       //   }
  //       // }

  //       // If we don't have usable localStorage data, fetch from API
  //       // const response = await fetch(`${API_BASE_URL}/api/getAllPackets`);

  //       // console.log('API response:', apiData);
  //       // console.log('API response:', apiData);

  //       // if (apiData.AllPackets && Array.isArray(apiData.AllPackets)) {
  //       //   setAllPackets(apiData.AllPackets);
  //       //   setFilteredPackets(apiData.AllPackets);
  //       //   setError(null);
  //       // } else {
  //       //   throw new Error('Invalid packet data structure received from API');
  //       // }
  //       // get data from the localstorage : analysisData
  //       const savedAnalysis = localStorage.getItem('analysisData');
  //       if (savedAnalysis) {
  //         // set the packets data from the localstorage
  //         try {
  //           const parsedAnalysis = JSON.parse(savedAnalysis);
  //           console.log('Parsed analysis data:', parsedAnalysis);

  //           // Check if we have a valid data structure
  //           if (parsedAnalysis.data && parsedAnalysis.data.packets) {
  //             setAllPackets(parsedAnalysis.data.packets);
  //             setFilteredPackets(parsedAnalysis.data.packets);

  //             // Set analysis metadata if available
  //             if (parsedAnalysis.originalFilename && parsedAnalysis.timestamp) {
  //               setAnalysisInfo({
  //                 originalFilename: parsedAnalysis.originalFilename,
  //                 timestamp: parsedAnalysis.timestamp,
  //               });
  //             }
  //             setError(null);
  //           } else if (parsedAnalysis.packets) {
  //             // Alternative data structure
  //             setAllPackets(parsedAnalysis.packets);
  //             setFilteredPackets(parsedAnalysis.packets);
  //             setError(null);
  //           } else {
  //             console.error('Invalid packet data structure:', parsedAnalysis);
  //             throw new Error('Invalid packet data structure in localStorage');
  //           }
  //         } catch (e) {
  //           console.error('Error parsing analysis data:', e);
  //           throw new Error('Failed to parse saved analysis data');
  //         }
  //       }
  //     } catch (err) {
  //       console.error('Failed to fetch data:', err);
  //       setError(err instanceof Error ? err.message : 'Unknown error occurred');
  //       // Use empty array as fallback
  //       setAllPackets([]);
  //       setFilteredPackets([]);
  //     } finally {
  //       // Short delay to prevent UI flicker on fast loads
  //       setTimeout(() => setLoading(false), 300);
  //     }
  //   };

  //   fetchData();
  // }, []);

  // In the fetchData function of your useEffect
  // Inside your useEffect where data is fetched:
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);

        // Get metadata from localStorage
        const metadataString = localStorage.getItem('analysisMetadata');

        if (metadataString) {
          try {
            const metadata = JSON.parse(metadataString);
            setAnalysisInfo(metadata);

            // Try to get the data from CacheStorage
            const cache = await caches.open('packet-analysis-data');
            const response = await cache.match('/analysis-data');

            if (response) {
              const cacheData = await response.json();
              console.log('Data from CacheStorage:', cacheData);

              // Extract packets from the cached data
              let packets = [];
              if (cacheData.packets && Array.isArray(cacheData.packets)) {
                packets = cacheData.packets;
              } else if (
                cacheData.AllPackets &&
                Array.isArray(cacheData.AllPackets)
              ) {
                packets = cacheData.AllPackets;
              }

              if (packets.length > 0) {
                setAllPackets(packets);
                setFilteredPackets(packets);
                setError(null);
                return; // Exit early since we have data
              }
            }
          } catch (e) {
            console.error('Error retrieving cache data:', e);
            // Fall through to API request if cache retrieval fails
          }
        }

        // If we don't have CacheStorage data, fetch from API
        const response = await fetch(`${API_BASE_URL}/api/getAllPackets`);

        if (!response.ok) {
          throw new Error(`API Error: ${response.status}`);
        }

        const apiData = await response.json();
        console.log('API response:', apiData);

        // Try to extract packets from the API response
        let packets = [];
        if (apiData.packets && Array.isArray(apiData.packets)) {
          packets = apiData.packets;
        } else if (apiData.AllPackets && Array.isArray(apiData.AllPackets)) {
          packets = apiData.AllPackets;
        }

        if (packets.length > 0) {
          setAllPackets(packets);
          setFilteredPackets(packets);
          setError(null);
        } else {
          throw new Error('No packet data found in API response');
        }
      } catch (err) {
        console.error('Failed to fetch data:', err);
        setError(err instanceof Error ? err.message : 'Unknown error occurred');
        // Use empty array as fallback
        setAllPackets([]);
        setFilteredPackets([]);
      } finally {
        // Short delay to prevent UI flicker on fast loads
        setTimeout(() => setLoading(false), 300);
      }
    };

    fetchData();
  }, []);

  // Reset all filters
  const resetFilters = () => {
    setSearchQuery('');
    setProtocolFilter('all');
    setSourceIpFilter('all');
    setDestinationIpFilter('all');
    setLengthFilter('all');
    setCurrentPage(1);
  };

  // Filter packets based on search query and all filters
  useEffect(() => {
    if (!allPackets || allPackets.length === 0) return;

    let filtered = [...allPackets];

    // Apply protocol filter
    if (protocolFilter !== 'all') {
      filtered = filtered.filter(
        (packet) =>
          packet.protocol.toLowerCase() === protocolFilter.toLowerCase(),
      );
    }

    // Apply source IP filter
    if (sourceIpFilter !== 'all') {
      filtered = filtered.filter((packet) => packet.source === sourceIpFilter);
    }

    // Apply destination IP filter
    if (destinationIpFilter !== 'all') {
      filtered = filtered.filter(
        (packet) => packet.destination === destinationIpFilter,
      );
    }

    // Apply length filter
    if (lengthFilter !== 'all') {
      if (lengthFilter === 'small') {
        filtered = filtered.filter((packet) => packet.length < 100);
      } else if (lengthFilter === 'medium') {
        filtered = filtered.filter(
          (packet) => packet.length >= 100 && packet.length < 500,
        );
      } else if (lengthFilter === 'large') {
        filtered = filtered.filter((packet) => packet.length >= 500);
      }
    }

    // Apply search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (packet) =>
          packet.source.toLowerCase().includes(query) ||
          packet.destination.toLowerCase().includes(query) ||
          packet.protocol.toLowerCase().includes(query) ||
          (packet.info && packet.info.toLowerCase().includes(query)),
      );
    }

    setFilteredPackets(filtered);
    setCurrentPage(1); // Reset to first page when filter changes
  }, [
    searchQuery,
    protocolFilter,
    sourceIpFilter,
    destinationIpFilter,
    lengthFilter,
    allPackets,
  ]);

  // Generate unique protocol list for the filter dropdown
  const uniqueProtocols = Array.from(
    new Set(allPackets.map((packet) => packet.protocol)),
  ).sort();

  // Generate unique source IPs for filter dropdown
  const uniqueSourceIps = Array.from(
    new Set(allPackets.map((packet) => packet.source)),
  ).sort();

  // Generate unique destination IPs for filter dropdown
  const uniqueDestinationIps = Array.from(
    new Set(allPackets.map((packet) => packet.destination)),
  ).sort();

  // Download packets data as JSON
  const downloadPacketsAsJson = () => {
    if (!filteredPackets || filteredPackets.length === 0) return;

    // Create a blob of the data
    const jsonString = JSON.stringify(filteredPackets, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });

    // Create a download link and trigger it
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'packets.json';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    console.log('Packets downloaded to packets.json file');
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
                  Packet Search
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>
          <div className='flex items-center gap-2'>
            <Button
              variant='outline'
              size='sm'
              onClick={() => setShowFilters(!showFilters)}
              className='flex items-center gap-1'
            >
              <Filter className='h-4 w-4' />
              <span>{showFilters ? 'Hide Filters' : 'Show Filters'}</span>
            </Button>
            <Button
              variant='outline'
              size='sm'
              onClick={resetFilters}
              className='flex items-center gap-1'
            >
              <RefreshCw className='h-4 w-4' />
              <span>Reset</span>
            </Button>
            <Button
              variant='outline'
              size='sm'
              onClick={downloadPacketsAsJson}
              disabled={loading || filteredPackets.length === 0}
              className='flex items-center gap-1'
            >
              <Download className='h-4 w-4' />
              <span>Export</span>
            </Button>
            <ThemeToggle />
          </div>
        </header>
        <div className='flex flex-1 flex-col gap-4 p-4'>
          {analysisInfo && analysisInfo.originalFilename && (
            <div className='p-3 bg-blue-50 dark:bg-blue-900/20 rounded-md text-sm'>
              <p className='font-medium'>
                Analyzing: {analysisInfo.originalFilename}
              </p>
              <p className='text-muted-foreground text-xs'>
                Uploaded on {new Date(analysisInfo.timestamp).toLocaleString()}
              </p>
            </div>
          )}

          <div className='rounded-xl bg-muted/50 p-4'>
            <div className='mb-4 flex flex-col gap-4'>
              <div className='relative flex-1'>
                <Search className='absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground' />
                <Input
                  type='search'
                  placeholder='Search packets by IP, protocol, info...'
                  className='pl-8'
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>

              {/* Advanced filters section - now visible by default */}
              <div className='grid grid-cols-1 md:grid-cols-4 gap-3 p-3 rounded-md bg-muted/50'>
                <div>
                  <label className='text-xs text-muted-foreground mb-1 block'>
                    Protocol
                  </label>
                  <Select
                    value={protocolFilter}
                    onValueChange={setProtocolFilter}
                  >
                    <SelectTrigger className='w-full'>
                      <SelectValue placeholder='Protocol' />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value='all'>All Protocols</SelectItem>
                      {uniqueProtocols.map((protocol) => (
                        <SelectItem key={protocol} value={protocol}>
                          {protocol}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className='text-xs text-muted-foreground mb-1 block'>
                    Source IP
                  </label>
                  <Select
                    value={sourceIpFilter}
                    onValueChange={setSourceIpFilter}
                  >
                    <SelectTrigger className='w-full'>
                      <SelectValue placeholder='Source IP' />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value='all'>All Sources</SelectItem>
                      {uniqueSourceIps.map((ip) => (
                        <SelectItem key={ip} value={ip}>
                          {ip}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className='text-xs text-muted-foreground mb-1 block'>
                    Destination IP
                  </label>
                  <Select
                    value={destinationIpFilter}
                    onValueChange={setDestinationIpFilter}
                  >
                    <SelectTrigger className='w-full'>
                      <SelectValue placeholder='Destination IP' />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value='all'>All Destinations</SelectItem>
                      {uniqueDestinationIps.map((ip) => (
                        <SelectItem key={ip} value={ip}>
                          {ip}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className='text-xs text-muted-foreground mb-1 block'>
                    Packet Length
                  </label>
                  <Select value={lengthFilter} onValueChange={setLengthFilter}>
                    <SelectTrigger className='w-full'>
                      <SelectValue placeholder='Length' />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value='all'>All Sizes</SelectItem>
                      <SelectItem value='small'>Small (&lt;100)</SelectItem>
                      <SelectItem value='medium'>Medium (100-500)</SelectItem>
                      <SelectItem value='large'>Large (&gt;500)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {loading ? (
              <div className='space-y-2'>
                {[...Array(8)].map((_, i) => (
                  <div
                    key={i}
                    className='h-10 w-full animate-pulse rounded-md bg-muted'
                  />
                ))}
              </div>
            ) : error ? (
              <div className='rounded-xl bg-destructive/10 p-4 text-destructive'>
                <h3 className='font-medium'>Error loading packet data</h3>
                <p>{error}</p>
              </div>
            ) : filteredPackets.length === 0 ? (
              <div className='flex h-32 items-center justify-center text-muted-foreground'>
                {searchQuery ||
                protocolFilter !== 'all' ||
                sourceIpFilter !== 'all' ||
                destinationIpFilter !== 'all' ||
                lengthFilter !== 'all'
                  ? 'No packets match your search criteria'
                  : 'No packet data available'}
              </div>
            ) : (
              <>
                <div className='flex justify-between items-center text-sm text-muted-foreground mb-2'>
                  <div>
                    Showing {filteredPackets.length} packets
                    {protocolFilter !== 'all' &&
                      `, Protocol: ${protocolFilter}`}
                    {sourceIpFilter !== 'all' && `, Source: ${sourceIpFilter}`}
                    {destinationIpFilter !== 'all' &&
                      `, Destination: ${destinationIpFilter}`}
                    {lengthFilter !== 'all' && `, Size: ${lengthFilter}`}
                    {searchQuery && `, Search: "${searchQuery}"`}
                  </div>
                  <div>
                    <Select
                      value={pageSize.toString()}
                      onValueChange={(value) => {
                        setPageSize(parseInt(value));
                        setCurrentPage(1);
                      }}
                    >
                      <SelectTrigger className='w-[110px] h-8'>
                        <SelectValue placeholder='Show' />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value='10'>10 per page</SelectItem>
                        <SelectItem value='15'>15 per page</SelectItem>
                        <SelectItem value='25'>25 per page</SelectItem>
                        <SelectItem value='50'>50 per page</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className='rounded-md border'>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className='w-[80px]'>No.</TableHead>
                        <TableHead className='w-[120px]'>Time</TableHead>
                        <TableHead className='w-[150px]'>Source</TableHead>
                        <TableHead className='w-[150px]'>Destination</TableHead>
                        <TableHead className='w-[100px]'>Protocol</TableHead>
                        <TableHead className='w-[80px]'>Length</TableHead>
                        <TableHead>Info</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paginatedPackets.map((packet) => (
                        <TableRow key={packet.number}>
                          <TableCell>{packet.number}</TableCell>
                          <TableCell>{packet.time}</TableCell>
                          <TableCell className='font-mono text-xs'>
                            {packet.source}
                          </TableCell>
                          <TableCell className='font-mono text-xs'>
                            {packet.destination}
                          </TableCell>
                          <TableCell>
                            <span className='rounded-full bg-primary/10 px-2 py-1 text-xs'>
                              {packet.protocol}
                            </span>
                          </TableCell>
                          <TableCell>{packet.length}</TableCell>
                          <TableCell className='max-w-md truncate'>
                            {packet.info}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                <div className='flex justify-between items-center mt-4'>
                  {/* <div className='text-sm text-muted-foreground'>
                    Showing {startItem} to {endItem} of {filteredPackets.length} packets | Page {currentPage} of {totalPages}
                  </div> */}

                  {totalPages > 1 && (
                    <Pagination>
                      <PaginationContent>
                        <PaginationItem>
                          <PaginationPrevious
                            onClick={() =>
                              setCurrentPage((curr) => Math.max(1, curr - 1))
                            }
                            className={
                              currentPage === 1
                                ? 'pointer-events-none opacity-50'
                                : ''
                            }
                          />
                        </PaginationItem>

                        {(() => {
                          // Logic for showing page numbers with ellipsis for large page counts
                          const pages = [];
                          if (totalPages <= 7) {
                            // Show all pages if 7 or fewer
                            for (let i = 1; i <= totalPages; i++) {
                              pages.push(i);
                            }
                          } else {
                            // Always show first page
                            pages.push(1);

                            // Show ellipsis or additional pages
                            if (currentPage > 3) {
                              pages.push('ellipsis1');
                            }

                            // Pages around current page
                            const startPage = Math.max(2, currentPage - 1);
                            const endPage = Math.min(
                              totalPages - 1,
                              currentPage + 1,
                            );

                            for (let i = startPage; i <= endPage; i++) {
                              pages.push(i);
                            }

                            // Show ellipsis or additional pages
                            if (currentPage < totalPages - 2) {
                              pages.push('ellipsis2');
                            }

                            // Always show last page
                            pages.push(totalPages);
                          }

                          return pages.map((page, i) => {
                            if (page === 'ellipsis1' || page === 'ellipsis2') {
                              return (
                                <PaginationItem key={`ellipsis-${i}`}>
                                  <div className='px-2'>...</div>
                                </PaginationItem>
                              );
                            }

                            return (
                              <PaginationItem key={i}>
                                <PaginationLink
                                  isActive={currentPage === page}
                                  onClick={() => setCurrentPage(page as number)}
                                >
                                  {page}
                                </PaginationLink>
                              </PaginationItem>
                            );
                          });
                        })()}

                        <PaginationItem>
                          <PaginationNext
                            onClick={() =>
                              setCurrentPage((curr) =>
                                Math.min(totalPages, curr + 1),
                              )
                            }
                            className={
                              currentPage === totalPages
                                ? 'pointer-events-none opacity-50'
                                : ''
                            }
                          />
                        </PaginationItem>
                      </PaginationContent>
                    </Pagination>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
