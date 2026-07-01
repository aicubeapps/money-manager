const LoadingSpinner = ({ message = 'Loading...' }: { message?: string }) => (
  <div className="flex flex-col items-center justify-center h-64 gap-3">
    <div className="relative w-12 h-12">
      <div className="absolute inset-0 rounded-full border-4 border-gray-200 dark:border-gray-700"></div>
      <div className="absolute inset-0 rounded-full border-4 border-primary-500 border-t-transparent animate-spin"></div>
    </div>
    <p className="text-sm text-gray-500 dark:text-gray-400">{message}</p>
  </div>
);

export default LoadingSpinner;
