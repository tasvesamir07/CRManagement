import React from 'react';
import { UploadCloud, Paperclip, X } from 'lucide-react';

export default function FileUploader({
  fileInputRef, uploadedFiles, uploading, uploadProgress,
  dragActive, onDrag, onDrop, onFileChange, onRemove,
  onChooseFromLibrary
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="text-xs font-semibold text-ink-mute uppercase tracking-wider">Attachments</label>
        {onChooseFromLibrary && (
          <button
            type="button"
            onClick={onChooseFromLibrary}
            className="text-xs font-semibold text-primary hover:text-primary-deep cursor-pointer border-none bg-transparent"
          >
            📂 Choose from Library
          </button>
        )}
      </div>
      <div
        className={`border-2 border-dashed rounded-sm p-6 text-center transition-colors cursor-pointer ${dragActive ? 'border-primary bg-primary/5' : 'border-hairline-strong hover:border-primary/50'}`}
        onDragEnter={onDrag} onDragLeave={onDrag} onDragOver={onDrag} onDrop={onDrop}
        onClick={() => fileInputRef.current?.click()}
      >
        <UploadCloud className="w-8 h-8 text-ink-mute mx-auto mb-2" />
        <p className="text-sm text-ink-mute">Drag & drop files here, or click to browse</p>
        <p className="text-xs text-ink-faint mt-1">Max 50MB per file — JPEG, PNG, GIF, WebP, PDF, DOC, DOCX, TXT, CSV</p>
        <input ref={fileInputRef} type="file" multiple onChange={onFileChange} className="hidden" />
      </div>

      {uploading && (
        <div className="w-full bg-hairline rounded-sm h-2">
          <div className="bg-primary h-2 rounded-sm transition-all duration-300" style={{ width: `${uploadProgress}%` }} />
        </div>
      )}

      {uploadedFiles.length > 0 && (
        <div className="space-y-2">
          {uploadedFiles.map((file, i) => (
            <div key={file.id || i} className="flex items-center justify-between p-3 border border-hairline rounded-sm">
              <div className="flex items-center gap-3 min-w-0">
                <Paperclip className="w-4 h-4 text-ink-mute shrink-0" />
                <span className="text-sm text-ink truncate">{file.original_name}</span>
                <span className="text-xs text-ink-mute shrink-0">({(file.file_size / 1024).toFixed(1)} KB)</span>
              </div>
              <button type="button" onClick={() => onRemove(i)} disabled={uploading}
                className="p-1 text-ink-mute hover:text-accent-tomato disabled:opacity-40 cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
