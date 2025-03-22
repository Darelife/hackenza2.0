import { Skeleton } from '@/components/ui/skeleton';

interface DataCardProps {
  title: string;
  value?: string | number;
  className?: string;
  isLoading?: boolean;
}

export function DataCard({
  title,
  value = 'No data',
  className = '',
  isLoading = false,
}: DataCardProps) {
  return (
    <div
      className={`rounded-xl bg-muted/50 p-3 flex flex-col justify-between h-32 ${className}`}
    >
      {isLoading ? (
        <>
          <Skeleton className='h-6 w-24' />
          <Skeleton className='h-8 w-32 mb-1' />
        </>
      ) : (
        <>
          <h3 className='text-lg font-medium'>{title}</h3>
          <div className='text-2xl font-bold mb-1'>{value}</div>
        </>
      )}
    </div>
  );
}
