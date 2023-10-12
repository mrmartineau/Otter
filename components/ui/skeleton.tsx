import { cn } from '@/src/utils/classnames';

function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('animate-pulse rounded-m bg-muted', className)}
      {...props}
    />
  );
}

export { Skeleton };
