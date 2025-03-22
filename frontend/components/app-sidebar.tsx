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
          url: '#',
        },
        {
          title: 'Classification',
          url: '#',
        },
        {
          title: 'Visualization',
          url: '#',
        },
        {
          title: 'Comparison',
          url: '#',
        },
        {
          title: 'Search and Filter',
          url: '#',
        },
      ],
    },
  ],
};

export function AppSidebar({ 
  activeItem = 'Overview',
  ...props 
}: React.ComponentProps<typeof Sidebar> & { 
  activeItem?: string 
}) {
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
                    <SidebarMenuButton asChild isActive={item.title === activeItem}>
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
