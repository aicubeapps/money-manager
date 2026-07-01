import { HiExclamation, HiX } from 'react-icons/hi';

interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  alternativeLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
  onAlternative?: () => void;
  danger?: boolean;
}

const ConfirmDialog = ({
  isOpen,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  alternativeLabel,
  onConfirm,
  onCancel,
  onAlternative,
  danger = false,
}: ConfirmDialogProps) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[60] p-4 animate-fade-in">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-sm p-6 animate-slide-up">
        <div className="flex items-start gap-4">
          <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${danger ? 'bg-red-100 dark:bg-red-900/30' : 'bg-amber-100 dark:bg-amber-900/30'}`}>
            <HiExclamation className={`w-5 h-5 ${danger ? 'text-red-600 dark:text-red-400' : 'text-amber-600 dark:text-amber-400'}`} />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-1">{title}</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">{message}</p>
          </div>
          <button onClick={onCancel} className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors flex-shrink-0">
            <HiX className="w-4 h-4 text-gray-400" />
          </button>
        </div>
        <div className="flex flex-col gap-2 mt-5">
          {alternativeLabel && onAlternative && (
            <button
              onClick={() => { onAlternative(); onCancel(); }}
              className="w-full px-4 py-2 rounded-lg text-sm font-medium bg-amber-500 hover:bg-amber-600 text-white transition-all duration-150 active:scale-95"
            >
              {alternativeLabel}
            </button>
          )}
          <div className="flex gap-2">
            <button onClick={onCancel} className="flex-1 btn-secondary justify-center text-sm py-2">
              {cancelLabel}
            </button>
            <button
              onClick={() => { onConfirm(); onCancel(); }}
              className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-150 active:scale-95 justify-center ${
                danger
                  ? 'bg-red-500 hover:bg-red-600 text-white'
                  : 'bg-primary-500 hover:bg-primary-600 text-white'
              }`}
            >
              {confirmLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ConfirmDialog;
