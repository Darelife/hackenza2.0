'use client';

import { useRouter } from 'next/navigation';

interface NavCardProps {
  title: string;
  description?: string;
  href: string;
  className?: string;
}

export function NavCard({
  title,
  description = 'View details',
  href,
  className = '',
}: NavCardProps) {
  const router = useRouter();

  return (
    <div
      onClick={() => router.push(href)}
      className={`rounded-xl bg-muted/50 p-3 cursor-pointer hover:bg-muted/70 transition-colors duration-200 flex flex-col justify-between h-32 ${className}`}
    >
      <h3 className='text-lg font-medium'>{title}</h3>
      <div className='flex justify-between items-end'>
        <span className='text-sm text-muted-foreground'>{description}</span>
        <svg
          xmlns='http://www.w3.org/2000/svg'
          width='20'
          height='20'
          viewBox='0 0 24 24'
          fill='none'
          stroke='currentColor'
          strokeWidth='2'
          strokeLinecap='round'
          strokeLinejoin='round'
          className='text-muted-foreground'
        >
          <path d='M9 18l6-6-6-6' />
        </svg>
      </div>
    </div>
  );
}
