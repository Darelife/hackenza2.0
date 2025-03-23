'use client';

import { usePathname } from 'next/navigation';
import * as React from 'react';

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from '@/components/ui/sidebar';

const data = {
  navMain: [
    {
      title: 'Navigation',
      url: '#',
      items: [
        {
          title: 'Overview',
          url: '/overview',
        },
        {
          title: 'Classification',
          url: '/classification',
        },
        {
          title: 'Visualization',
          url: '/visualization',
        },
        {
          title: 'Search and Filter',
          url: '/search',
        },
      ],
    },
  ],
};

export function AppSidebar({
  activeItem,
  ...props
}: React.ComponentProps<typeof Sidebar> & {
  activeItem?: string;
}) {
  const pathname = usePathname();

  // Determine active item based on current path if not explicitly provided
  const currentActive =
    activeItem ||
    data.navMain[0].items.find(
      (item) => pathname === item.url || pathname?.startsWith(item.url + '/'),
    )?.title ||
    'Overview';

  return (
    <Sidebar {...props}>
      <SidebarHeader>
        <div className='flex items-center justify-between p-2'>
          <div className='text-lg font-semibold'>Packet Analysis</div>
          <a href='/' aria-label='Home'>
            <svg
              xmlns='http://www.w3.org/2000/svg'
              viewBox='0 0 24 24'
              fill='none'
              stroke='currentColor'
              strokeWidth='2'
              strokeLinecap='round'
              strokeLinejoin='round'
              className='w-5 h-5 cursor-pointer hover:text-primary'
            >
              <path d='m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z' />
              <polyline points='9 22 9 12 15 12 15 22' />
            </svg>
          </a>
        </div>
      </SidebarHeader>
      <SidebarContent>
        {data.navMain.map((item) => (
          <SidebarGroup key={item.title}>
            <SidebarGroupLabel>{item.title}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {item.items.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      asChild
                      isActive={item.title === currentActive}
                    >
                      <a href={item.url}>{item.title}</a>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>
      <SidebarFooter className='p-4 border-t'>
        <div className='text-xs text-muted-foreground text-center'>
          Packet Analysis Tool
        </div>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
