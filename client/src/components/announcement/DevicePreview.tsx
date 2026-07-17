import { useState } from 'react';
import { formatMessageToHtml } from './compileMessage';

interface DevicePreviewProps {
  preview: string;
}

export default function DevicePreview({ preview }: DevicePreviewProps) {
  const [previewTab, setPreviewTab] = useState<'whatsapp' | 'telegram' | 'messenger'>('whatsapp');

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between border-b border-hairline-cool pb-2">
        <label className="text-xs font-medium text-ink-mute uppercase tracking-wider">Device Live Preview</label>
        <div className="flex border border-hairline rounded bg-canvas-soft p-0.5">
          {(['whatsapp', 'telegram', 'messenger'] as const).map(tab => (
            <button key={tab} type="button" onClick={() => setPreviewTab(tab)}
              className={`px-2.5 py-0.5 text-[10px] font-medium rounded-sm transition-all duration-150 cursor-pointer ${previewTab === tab ? 'bg-canvas text-ink font-semibold shadow-sm' : 'text-ink-mute hover:text-ink'}`}>
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>
      </div>
      <div className="bg-[#1c1c1c] text-white rounded-[20px] p-3 border-[4px] border-[#252525] shadow-lg w-full flex flex-col justify-between overflow-hidden min-h-[350px]">
        <div className="flex justify-between items-center text-[9px] text-zinc-500 px-1 pb-1.5"><span>9:41 AM</span><div className="flex gap-1"><span>📶</span><span>🔋</span></div></div>
        <div className={`flex-1 rounded-[12px] p-2.5 overflow-y-auto flex flex-col justify-end ${
          previewTab === 'whatsapp' ? 'bg-[#0b141a]' : previewTab === 'telegram' ? 'bg-[#182533]' : 'bg-[#121212]'
        }`}>
          <div className={`rounded-lg p-2.5 max-w-[85%] text-xs font-sans text-white relative flex flex-col ${
            previewTab === 'whatsapp'
              ? 'bg-[#005c4b] self-end rounded-tr-none shadow-sm'
              : previewTab === 'telegram'
              ? 'bg-[#182533] self-start rounded-tl-none border border-slate-700 shadow-sm'
              : 'bg-gradient-to-r from-[#00c6ff] to-[#0072ff] self-end rounded-br-none shadow-md'
          }`}>
            {previewTab === 'telegram' && (
              <div className="text-[9px] font-semibold text-[#5288c1] mb-1 select-none">CR Announcements</div>
            )}
            <div className="pb-3.5 leading-relaxed break-words text-[11px] font-sans" dangerouslySetInnerHTML={{ __html: formatMessageToHtml(preview || 'Your message preview will appear here...') }} />
            <div className="absolute bottom-1 right-2 flex items-center gap-0.5 text-[8px] text-zinc-300/80 select-none">
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
        <div className="w-16 h-0.5 bg-zinc-600 rounded-full mx-auto mt-2"></div>
      </div>
    </div>
  );
}
