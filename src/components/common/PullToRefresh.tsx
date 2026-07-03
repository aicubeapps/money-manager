import type { ReactNode } from 'react';
import { usePullToRefresh } from '../../hooks/usePullToRefresh';

interface PullToRefreshProps {
  onRefresh: () => Promise<void> | void;
  children: ReactNode;
}

const PullToRefresh = ({ onRefresh, children }: PullToRefreshProps) => {
  const { pullDistance, refreshing, triggerThreshold, handlers } = usePullToRefresh(onRefresh);
  const ready = pullDistance >= triggerThreshold;

  return (
    <div {...handlers} style={{ touchAction: pullDistance > 0 ? 'none' : 'pan-y' }}>
      <div
        className="flex items-center justify-center overflow-hidden transition-[height] duration-150"
        style={{ height: refreshing ? triggerThreshold : pullDistance }}
      >
        <div className="relative w-6 h-6">
          <div className="absolute inset-0 rounded-full border-2 border-gray-200 dark:border-gray-700" />
          <div
            className={`absolute inset-0 rounded-full border-2 border-primary-500 border-t-transparent ${
              refreshing ? 'animate-spin' : ''
            }`}
            style={{
              transform: refreshing ? undefined : `rotate(${(pullDistance / triggerThreshold) * 360}deg)`,
              opacity: ready || refreshing ? 1 : pullDistance / triggerThreshold,
            }}
          />
        </div>
      </div>
      {children}
    </div>
  );
};

export default PullToRefresh;
