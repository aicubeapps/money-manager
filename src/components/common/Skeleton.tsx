interface SkeletonProps {
  width?: string | number;
  height?: string | number;
  shape?: 'rect' | 'circle';
  className?: string;
}

const Skeleton = ({ width = '100%', height = '1rem', shape = 'rect', className = '' }: SkeletonProps) => (
  <div
    className={`animate-pulse bg-gray-200 dark:bg-gray-700 ${shape === 'circle' ? 'rounded-full' : 'rounded-lg'} ${className}`}
    style={{ width, height }}
  />
);

export default Skeleton;
