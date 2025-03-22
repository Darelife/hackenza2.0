'use client';

import { usePathname } from 'next/navigation';
import * as React from 'react';

import {
  Sidebar,
  SidebarContent,
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
          title: 'Comparison',
          url: '/comparison',
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
        <div className='flex text-lg font-semibold p-2'>Packet Analysis</div>
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
      <SidebarRail />
    </Sidebar>
  );
}
