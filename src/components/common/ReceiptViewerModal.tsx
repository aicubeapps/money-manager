import { useEffect, useState } from 'react';
import { HiX } from 'react-icons/hi';
import { getReceiptImageUrl } from '../../services/receiptService';
import { isDriveConnected, reconnectDriveSilently } from '../../services/googleDriveService';

interface ReceiptViewerModalProps {
  fileId: string;
  onClose: () => void;
}

/** Lightweight full-size image lightbox for a receipt stored on Drive. */
const ReceiptViewerModal = ({ fileId, onClose }: ReceiptViewerModalProps) => {
  const [url, setUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        if (!isDriveConnected()) {
          const ok = await reconnectDriveSilently();
          if (!ok) {
            if (!cancelled) setError('Reconnect Google Drive in Settings to view this receipt.');
            return;
          }
        }
        const objectUrl = await getReceiptImageUrl(fileId);
        if (!cancelled) setUrl(objectUrl);
      } catch (err) {
        console.error('Error loading receipt image:', err);
        if (!cancelled) setError('Failed to load receipt image.');
      }
    };
    load();
    return () => { cancelled = true; };
  }, [fileId]);

  return (
    <div
      className="fixed inset-0 bg-black/80 flex items-center justify-center z-[80] p-4 animate-fade-in"
      onClick={onClose}
    >
      <button
        onClick={onClose}
        className="absolute top-4 right-4 p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
        aria-label="Close"
      >
        <HiX className="w-6 h-6 text-white" />
      </button>
      {error ? (
        <p className="text-white text-sm text-center max-w-xs">{error}</p>
      ) : !url ? (
        <p className="text-white text-sm">Loading receipt...</p>
      ) : (
        <img
          src={url}
          alt="Receipt"
          className="max-w-full max-h-full rounded-lg shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        />
      )}
    </div>
  );
};

export default ReceiptViewerModal;
