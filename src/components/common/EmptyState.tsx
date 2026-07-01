import type { ReactNode } from 'react';

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description: string;
  action?: ReactNode;
}

const EmptyState = ({ icon, title, description, action }: EmptyStateProps) => (
  <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
    {icon && (
      <div className="w-16 h-16 rounded-2xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-4 text-3xl">
        {icon}
      </div>
    )}
    <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-1">{title}</h3>
    <p className="text-sm text-gray-500 dark:text-gray-400 mb-6 max-w-xs">{description}</p>
    {action}
  </div>
);

export default EmptyState;
