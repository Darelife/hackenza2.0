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
import { DataCard } from '../components/data-card';
import { NavCard } from '../components/nav-card';
import { DataTable } from '../components/protocol-table';

// Sample data for protocol distribution
const protocolData = [
  { name: 'MQTT', packets: 8524, percentage: 97.23 },
  { name: 'HTTPS', packets: 141, percentage: 1.61 },
  { name: 'IPv6', packets: 59, percentage: 0.67 },
  { name: 'DNS', packets: 18, percentage: 0.21 },
  { name: 'ARP', packets: 14, percentage: 0.16 },
  { name: 'UDP', packets: 7, percentage: 0.08 },
  { name: 'IGMP', packets: 4, percentage: 0.05 },
];

// Packet type distribution data
const packetTypeData = [
  { name: 'IP', packets: 9292, percentage: 99.79 },
  { name: 'TCP', packets: 9284, percentage: 99.7 },
  { name: 'ARP', packets: 12, percentage: 0.13 },
  { name: 'UDP', packets: 8, percentage: 0.09 },
  { name: 'IPv6', packets: 8, percentage: 0.09 },
];

export default function Page() {
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className='flex h-16 shrink-0 items-center gap-2 border-b px-4'>
          <SidebarTrigger className='-ml-1' />
          <Separator orientation='vertical' className='mr-2 h-4' />
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem className='hidden md:block'>
                Overview
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </header>
        <div className='flex flex-1 flex-col gap-4 p-4'>
          <div className='grid auto-rows-min gap-4 md:grid-cols-2 lg:grid-cols-2'>
            <DataCard title='Packet Count' value='1,234' />
            <NavCard
              title='Timestamps'
              description='View all timestamps'
              href='/timestamps'
            />
          </div>
          <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
            <div className='rounded-xl bg-muted/50 p-4'>
              <DataTable
                data={protocolData}
                title='Protocol Distribution'
                columns={{
                  nameLabel: 'Protocol',
                  packetLabel: 'Count',
                  percentageLabel: '%',
                }}
              />
            </div>
            <div className='rounded-xl bg-muted/50 p-4'>
              <DataTable
                data={packetTypeData}
                title='Packet Type Distribution'
                columns={{
                  nameLabel: 'Type',
                  packetLabel: 'Count',
                  percentageLabel: '%',
                }}
              />
            </div>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
