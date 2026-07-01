import { useEffect, useState } from 'react';
import { HiCheckCircle, HiXCircle, HiInformationCircle, HiX } from 'react-icons/hi';

export type ToastType = 'success' | 'error' | 'info';

interface ToastMessage {
  id: string;
  type: ToastType;
  message: string;
}

let addToastExternal: ((msg: Omit<ToastMessage, 'id'>) => void) | null = null;

export const toast = {
  success: (message: string) => addToastExternal?.({ type: 'success', message }),
  error: (message: string) => addToastExternal?.({ type: 'error', message }),
  info: (message: string) => addToastExternal?.({ type: 'info', message }),
};

const icons = {
  success: <HiCheckCircle className="w-5 h-5 text-green-500" />,
  error: <HiXCircle className="w-5 h-5 text-red-500" />,
  info: <HiInformationCircle className="w-5 h-5 text-blue-500" />,
};

const ToastContainer = () => {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  useEffect(() => {
    addToastExternal = (msg) => {
      const id = Math.random().toString(36).slice(2);
      setToasts((prev) => [...prev, { ...msg, id }]);
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, 3500);
    };
    return () => { addToastExternal = null; };
  }, []);

  const remove = (id: string) => setToasts((prev) => prev.filter((t) => t.id !== id));

  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2 pointer-events-none">
      {toasts.map((t) => (
        <div
          key={t.id}
          className="flex items-center gap-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg px-4 py-3 pointer-events-auto animate-slide-up min-w-[280px] max-w-sm"
        >
          {icons[t.type]}
          <span className="flex-1 text-sm font-medium text-gray-800 dark:text-gray-200">{t.message}</span>
          <button
            onClick={() => remove(t.id)}
            className="p-0.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors flex-shrink-0"
          >
            <HiX className="w-3.5 h-3.5 text-gray-400" />
          </button>
        </div>
      ))}
    </div>
  );
};

export default ToastContainer;
