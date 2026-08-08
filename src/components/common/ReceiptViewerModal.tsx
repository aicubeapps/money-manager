import { useEffect, useState } from 'react';
import { HiX } from 'react-icons/hi';
import { getReceiptImageUrl } from '../../services/receiptService';
import { isDriveConnected, reconnectDriveSilently } from '../../services/googleDriveService';

interface ReceiptViewerModalProps {
  fileId: string;
  mimeType?: string | null;
  onClose: () => void;
}

/** Lightweight full-size lightbox for a receipt stored on Drive — an image
 * or a PDF (rendered in an iframe, with a new-tab fallback link since some
 * mobile browsers don't render PDFs inline in an iframe). */
const ReceiptViewerModal = ({ fileId, mimeType, onClose }: ReceiptViewerModalProps) => {
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
      ) : mimeType === 'application/pdf' ? (
        <div
          className="w-full h-full max-w-3xl max-h-[85vh] flex flex-col gap-2"
          onClick={(e) => e.stopPropagation()}
        >
          <iframe src={url} title="Receipt PDF" className="flex-1 w-full rounded-lg bg-white" />
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="self-center text-sm text-white/80 hover:text-white hover:underline"
          >
            Open PDF in new tab
          </a>
        </div>
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
