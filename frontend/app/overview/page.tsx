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
import { ProtocolTable } from '../components/protocol-table';

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
          <div className='rounded-xl md:min-h-min'>
            <ProtocolTable data={protocolData} />
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
