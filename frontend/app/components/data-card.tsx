interface DataCardProps {
  title: string;
  value?: string | number;
  className?: string;
}

export function DataCard({
  title,
  value = 'No data',
  className = '',
}: DataCardProps) {
  return (
    <div
      className={`rounded-xl bg-muted/50 p-3 flex flex-col justify-between h-32 ${className}`}
    >
      <h3 className='text-lg font-medium'>{title}</h3>
      <div className='text-2xl font-bold mb-1'>{value}</div>
    </div>
  );
}
