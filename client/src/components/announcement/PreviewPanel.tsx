import { useMemo } from 'react';
import { Smartphone, Paperclip, Clipboard } from 'lucide-react';
import toast from 'react-hot-toast';
import { formatMessageToHtml } from '../../lib/announcementPresets';
import type { UploadedFile } from './types';

interface PreviewPanelProps {
  compiledMessage: () => string;
  previewTab: string;
  onTabChange: (tab: string) => void;
  uploadedFiles: UploadedFile[];
}

export default function PreviewPanel({ compiledMessage, previewTab, onTabChange, uploadedFiles }: PreviewPanelProps) {
  const messageText = useMemo(() => compiledMessage() || 'Your message preview will appear here...', [compiledMessage]);
  const renderedHtml = useMemo(() => formatMessageToHtml(messageText), [messageText]);

  return (
    <div className="lg:col-span-5 space-y-6 lg:sticky lg:top-8">
      <div className="flex items-center justify-between border-b border-hairline-cool pb-2.5">
        <h3 className="text-md font-medium text-ink flex items-center gap-1.5 font-sans">
          <Smartphone className="w-5 h-5 text-ink-mute" /> Device Live Preview
        </h3>
        <div className="flex border border-hairline rounded bg-canvas-soft p-0.5">
          {['whatsapp', 'telegram', 'messenger'].map(tab => (
            <button
              key={tab}
              type="button"
              onClick={() => onTabChange(tab)}
              className={`px-3 py-1 text-xs font-medium rounded-sm transition-all duration-150 cursor-pointer ${
                previewTab === tab ? 'bg-canvas text-ink font-semibold shadow-sm' : 'text-ink-mute hover:text-ink'
              }`}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-[#1c1c1c] text-white rounded-[24px] p-4 border-[6px] border-[#252525] shadow-xl w-full flex flex-col justify-between overflow-hidden min-h-[500px]">
        <div className="flex justify-between items-center text-[10px] text-zinc-500 px-2 pb-2">
          <span>9:41 AM</span>
          <div className="flex gap-1"><span>📶</span><span>🔋</span></div>
        </div>
        <div className={`flex-1 rounded-[16px] p-3 overflow-y-auto flex flex-col justify-end ${
          previewTab === 'whatsapp' ? 'bg-[#0b141a]' : previewTab === 'telegram' ? 'bg-[#182533]' : 'bg-[#121212]'
        }`}>
          <div className={`rounded-lg p-3 max-w-[85%] text-xs font-sans relative flex flex-col ${
            previewTab === 'whatsapp'
              ? 'bg-[#005c4b] text-white self-end rounded-tr-none shadow-sm'
              : previewTab === 'telegram'
              ? 'bg-[#182533] text-white self-start rounded-tl-none border border-slate-700 shadow-sm'
              : 'bg-gradient-to-r from-[#00c6ff] to-[#0072ff] text-white self-end rounded-br-none shadow-md'
          }`}>
            {uploadedFiles.length > 0 && (
              <div className="mb-2 space-y-1.5">
                {uploadedFiles.map((file, idx) => (
                  <div key={file.id || idx} className="flex items-center gap-2 p-2 bg-black/20 rounded-md border border-white/10 text-white">
                    <Paperclip className="w-3.5 h-3.5 text-zinc-300 flex-shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="text-[10px] font-medium truncate text-white" title={file.original_name}>{file.original_name}</p>
                      <p className="text-[9px] text-zinc-400">{(file.file_size / 1024 / 1024).toFixed(2)} MB</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
            {previewTab === 'telegram' && (
              <div className="text-[10px] font-semibold text-[#5288c1] mb-1 select-none">CR Announcements</div>
            )}
            <div className="pb-4 leading-relaxed break-words text-[11px] font-sans" dangerouslySetInnerHTML={{ __html: renderedHtml }} />
            <div className="absolute bottom-1 right-2 flex items-center gap-1 text-[9px] text-zinc-300/80 select-none">
              <span>9:41 AM</span>
              {previewTab === 'whatsapp' ? (
                <span className="text-[#53bdeb] font-bold">✓✓</span>
              ) : previewTab === 'telegram' ? (
                <span className="text-[#5288c1] font-bold">✓</span>
              ) : (
                <span className="text-white/80 font-bold">✓</span>
              )}
            </div>
          </div>
        </div>
        <div className="w-24 h-1 bg-zinc-600 rounded-full mx-auto mt-3.5"></div>
      </div>

      <button
        type="button"
        onClick={() => { navigator.clipboard.writeText(compiledMessage() || ''); toast.success('Message copied!'); }}
        className="w-full flex items-center justify-center py-2.5 px-4 border-2 border-dashed border-primary/40 hover:border-primary rounded-sm text-sm font-medium text-primary hover:bg-primary/5 transition-colors cursor-pointer mt-4"
      >
        <Clipboard className="w-4 h-4 mr-2" />Copy Message to Clipboard
      </button>
    </div>
  );
}
