import { createPortal } from 'react-dom';
import { X, File, Download } from 'lucide-react';
import { formatSize } from '../../lib/announcementPresets';

export default function LightboxPreviewModal({
  previewFile,
  previewUrl,
  previewLoading,
  previewTextContent,
  previewTextError,
  onClose
}) {
  if (!previewFile) return null;

  const isText = previewFile.file_type?.startsWith('text/') ||
    previewFile.original_name.toLowerCase().endsWith('.csv') ||
    previewFile.original_name.toLowerCase().endsWith('.txt');

  const isOffice =
    previewFile.file_type?.includes('officedocument') ||
    previewFile.file_type?.includes('ms-excel') ||
    previewFile.file_type?.includes('ms-powerpoint') ||
    previewFile.file_type?.includes('msword') ||
    previewFile.original_name.endsWith('.docx') ||
    previewFile.original_name.endsWith('.doc') ||
    previewFile.original_name.endsWith('.xlsx') ||
    previewFile.original_name.endsWith('.xls') ||
    previewFile.original_name.endsWith('.pptx') ||
    previewFile.original_name.endsWith('.ppt');

  return createPortal(
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-[60] flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="relative bg-canvas border border-hairline w-full max-w-4xl h-[85vh] rounded-lg shadow-2xl overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-200 font-sans">
        <div className="p-4 border-b border-hairline flex items-center justify-between bg-canvas">
          <div className="min-w-0">
            <h3 className="text-sm font-bold text-ink truncate font-sans">{previewFile.original_name}</h3>
            <p className="text-xs text-ink-mute font-sans">
              {formatSize(previewFile.file_size)} &bull; {previewFile.file_type}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-ink-mute hover:text-ink transition-colors p-1.5 hover:bg-canvas-soft rounded-full cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="flex-1 bg-canvas-soft flex items-center justify-center overflow-auto p-4">
          {previewLoading ? (
            <div className="flex flex-col items-center gap-3">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              <p className="text-xs text-ink-mute font-sans">Loading preview...</p>
            </div>
          ) : previewUrl ? (
            <>
              {previewFile.file_type?.startsWith('image/') ? (
                <img
                  src={previewUrl}
                  alt={previewFile.original_name}
                  className="max-w-full max-h-full object-contain rounded shadow-md"
                />
              ) : previewFile.file_type === 'application/pdf' ? (
                <iframe
                  src={`${previewUrl}#toolbar=0`}
                  title={previewFile.original_name}
                  className="w-full h-full border-0 rounded"
                />
              ) : isOffice ? (
                (previewUrl.includes('localhost') || previewUrl.includes('127.0.0.1')) ? (
                  <div className="text-center p-8 max-w-sm">
                    <File className="w-16 h-16 text-amber-500 mx-auto mb-4" />
                    <p className="text-sm font-semibold text-ink font-sans mb-1">Local Preview Limitation</p>
                    <p className="text-xs text-ink-mute font-sans mb-4">Office documents (.docx, .xlsx, .pptx) cannot be previewed when running on localhost. Please download the file to view it.</p>
                    <a
                      href={previewUrl}
                      download={previewFile.original_name}
                      className="inline-flex items-center gap-1.5 px-4 py-2 bg-primary hover:bg-primary-deep text-on-primary text-xs font-semibold rounded transition-colors cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5" />
                      Download to View
                    </a>
                  </div>
                ) : (
                  <iframe
                    src={`https://docs.google.com/gview?url=${encodeURIComponent(previewUrl)}&embedded=true`}
                    title={previewFile.original_name}
                    className="w-full h-full border-0 rounded bg-canvas"
                  />
                )
              ) : isText ? (
                previewTextError ? (
                  <div className="text-center p-8 max-w-sm">
                    <File className="w-16 h-16 text-ink-mute/50 mx-auto mb-4" />
                    <p className="text-sm font-semibold text-ink font-sans mb-1">Preview not available</p>
                    <p className="text-xs text-ink-mute font-sans mb-4">Could not load file content. Please download to view.</p>
                    <a
                      href={previewUrl}
                      download={previewFile.original_name}
                      className="inline-flex items-center gap-1.5 px-4 py-2 bg-primary hover:bg-primary-deep text-on-primary text-xs font-semibold rounded transition-colors cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5" />
                      Download to View
                    </a>
                  </div>
                ) : (
                  <div className="w-full h-full flex flex-col bg-canvas border border-hairline rounded overflow-hidden shadow-inner">
                    <div className="overflow-auto flex-1 font-mono text-[11px] text-ink p-4 bg-canvas-soft select-text whitespace-pre-wrap leading-relaxed max-w-full text-left">
                      {previewTextContent || 'Loading content...'}
                    </div>
                  </div>
                )
              ) : (
                <div className="text-center p-8 max-w-sm">
                  <File className="w-16 h-16 text-ink-mute/50 mx-auto mb-4" />
                  <p className="text-sm font-semibold text-ink font-sans mb-1">Preview not available</p>
                  <p className="text-xs text-ink-mute font-sans mb-4">This file type ({previewFile.file_type}) cannot be previewed directly in the browser.</p>
                  <a
                    href={previewUrl}
                    download={previewFile.original_name}
                    className="inline-flex items-center gap-1.5 px-4 py-2 bg-primary hover:bg-primary-deep text-on-primary text-xs font-semibold rounded transition-colors cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Download to View
                  </a>
                </div>
              )}
            </>
          ) : (
            <p className="text-sm text-ink-mute font-sans">Failed to load preview.</p>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
