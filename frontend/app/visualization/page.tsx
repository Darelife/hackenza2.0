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

// Sample data for the charts
const packetTimeData = [
  { name: '00:00', TCP: 65, UDP: 28, ICMP: 12 },
  { name: '01:00', TCP: 59, UDP: 42, ICMP: 8 },
  { name: '02:00', TCP: 80, UDP: 30, ICMP: 15 },
  { name: '03:00', TCP: 81, UDP: 37, ICMP: 10 },
  { name: '04:00', TCP: 56, UDP: 25, ICMP: 15 },
  { name: '05:00', TCP: 55, UDP: 33, ICMP: 11 },
  { name: '06:00', TCP: 40, UDP: 22, ICMP: 16 },
  { name: '07:00', TCP: 72, UDP: 20, ICMP: 17 },
  { name: '08:00', TCP: 90, UDP: 45, ICMP: 20 },
  { name: '09:00', TCP: 110, UDP: 40, ICMP: 20 },
  { name: '10:00', TCP: 145, UDP: 50, ICMP: 28 },
  { name: '11:00', TCP: 132, UDP: 55, ICMP: 35 },
];

const packetSizeData = [
  { name: '00:00', Min: 64, Avg: 512, Max: 1500 },
  { name: '01:00', Min: 64, Avg: 480, Max: 1500 },
  { name: '02:00', Min: 64, Avg: 550, Max: 1500 },
  { name: '03:00', Min: 64, Avg: 510, Max: 1500 },
  { name: '04:00', Min: 64, Avg: 490, Max: 1500 },
  { name: '05:00', Min: 64, Avg: 475, Max: 1500 },
  { name: '06:00', Min: 64, Avg: 520, Max: 1500 },
  { name: '07:00', Min: 64, Avg: 580, Max: 1500 },
  { name: '08:00', Min: 64, Avg: 610, Max: 1500 },
  { name: '09:00', Min: 64, Avg: 640, Max: 1500 },
  { name: '10:00', Min: 64, Avg: 590, Max: 1500 },
  { name: '11:00', Min: 64, Avg: 620, Max: 1500 },
];

export default function VisualizationPage() {
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
            <h1 className='text-2xl font-bold mb-4'>Network Visualization</h1>
            <p className='text-muted-foreground mb-6'>
              Visualize network traffic patterns with interactive charts.
            </p>

            <div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
              <MultiLineChart
                title='Packet Types Over Time'
                data={packetTimeData}
                lines={[
                  { id: 'TCP', name: 'TCP', color: '#0ea5e9' },
                  { id: 'UDP', name: 'UDP', color: '#f97316' },
                  { id: 'ICMP', name: 'ICMP', color: '#8b5cf6' },
                ]}
                xAxisLabel='Time'
                yAxisLabel='Packets'
              />

              <MultiLineChart
                title='Packet Size Distribution'
                data={packetSizeData}
                lines={[
                  { id: 'Min', name: 'Minimum Size', color: '#22c55e' },
                  { id: 'Avg', name: 'Average Size', color: '#eab308' },
                  { id: 'Max', name: 'Maximum Size', color: '#ef4444' },
                ]}
                xAxisLabel='Time'
                yAxisLabel='Bytes'
              />
            </div>

            <div className='mt-6'>
              <MultiLineChart
                title='Network Traffic Volume'
                data={packetTimeData.map((item) => ({
                  name: item.name,
                  Total: item.TCP + item.UDP + item.ICMP,
                }))}
                lines={[
                  { id: 'Total', name: 'Total Traffic', color: '#6366f1' },
                ]}
                xAxisLabel='Time'
                yAxisLabel='Packets/Second'
              />
            </div>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
