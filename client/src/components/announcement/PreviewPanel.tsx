import { useState, useMemo, useCallback } from 'react';
import { Smartphone, Paperclip, Clipboard, Sun, Moon, Check, CheckCheck } from 'lucide-react';
import { FaWhatsapp, FaTelegram, FaFacebookMessenger } from 'react-icons/fa6';
import toast from 'react-hot-toast';
import { formatMessageToHtml } from '../../lib/announcementPresets';
import { loadFontsFromHtml } from '../../lib/fontLoader';
import { htmlToWhatsappMarkdown, cleanHtmlForTelegram, stripHtml } from '../../lib/htmlParser';
import type { UploadedFile } from './types';

interface PreviewPanelProps {
  compiledMessage: () => string;
  previewTab: string;
  onTabChange: (tab: string) => void;
  uploadedFiles: UploadedFile[];
}

export default function PreviewPanel({ compiledMessage, previewTab, onTabChange, uploadedFiles }: PreviewPanelProps) {
  const [mockTheme, setMockTheme] = useState<'dark' | 'light'>('dark');
  const messageText = useMemo(() => compiledMessage() || 'Your message preview will appear here...', [compiledMessage]);

  // Load fonts dynamically from HTML message if any
  useMemo(() => {
    loadFontsFromHtml(messageText);
  }, [messageText]);

  const platformName = useMemo(() => {
    return previewTab.charAt(0).toUpperCase() + previewTab.slice(1);
  }, [previewTab]);

  const getFormattedMessageForCopy = useCallback(() => {
    const rawText = compiledMessage() || '';
    if (!rawText) return '';
    const isHtml = rawText.startsWith('<') || /<[a-z][\s\S]*>/i.test(rawText);

    if (previewTab === 'telegram') {
      if (isHtml) {
        return cleanHtmlForTelegram(rawText);
      } else {
        return rawText
          .replace(/\*(.*?)\*/g, '<b>$1</b>')
          .replace(/_(.*?)_/g, '<i>$1</i>')
          .replace(/~(.*?)~/g, '<s>$1</s>')
          .replace(/`(.*?)`/g, '<code>$1</code>');
      }
    } else if (previewTab === 'messenger') {
      if (isHtml) {
        return stripHtml(rawText);
      } else {
        return rawText
          .replace(/\*\*(.*?)\*\*/g, '$1')
          .replace(/__(.*?)__/g, '$1')
          .replace(/\*(.*?)\*/g, '$1')
          .replace(/_(.*?)_/g, '$1')
          .replace(/~(.*?)~/g, '$1')
          .replace(/`(.*?)`/g, '$1');
      }
    } else {
      // WhatsApp format
      if (isHtml) {
        return htmlToWhatsappMarkdown(rawText);
      } else {
        return rawText;
      }
    }
  }, [compiledMessage, previewTab]);

  const handleCopy = () => {
    const formatted = getFormattedMessageForCopy();
    if (!formatted) {
      toast.error('Nothing to copy!');
      return;
    }
    navigator.clipboard.writeText(formatted);
    toast.success(`Copied formatted message for ${platformName}!`);
  };

  const renderedHtml = useMemo(() => {
    const isHtml = messageText.startsWith('<') || /<[a-z][\s\S]*>/i.test(messageText);

    if (isHtml) {
      if (previewTab === 'whatsapp') {
        const whatsappMarkdown = htmlToWhatsappMarkdown(messageText);
        return formatMessageToHtml(whatsappMarkdown);
      } else if (previewTab === 'telegram') {
        return cleanHtmlForTelegram(messageText);
      } else {
        return stripHtml(messageText).replace(/\n/g, '<br/>');
      }
    } else {
      if (previewTab === 'messenger') {
        return messageText
          .replace(/\*\*(.*?)\*\*/g, '$1')
          .replace(/__(.*?)__/g, '$1')
          .replace(/\*(.*?)\*/g, '$1')
          .replace(/_(.*?)_/g, '$1')
          .replace(/~(.*?)~/g, '$1')
          .replace(/`(.*?)`/g, '$1')
          .replace(/\n/g, '<br/>');
      }
      return formatMessageToHtml(messageText);
    }
  }, [messageText, previewTab]);

  const charLength = messageText === 'Your message preview will appear here...' ? 0 : messageText.length;
  const maxLimit = previewTab === 'whatsapp' ? 1024 : previewTab === 'telegram' ? 4096 : 2000;
  const charPercent = Math.min(100, Math.round((charLength / maxLimit) * 100));

  return (
    <div className="lg:col-span-5 space-y-4 lg:sticky lg:top-8">
      {/* Top Header & Platform Selector */}
      <div className="flex items-center justify-between border-b border-hairline-cool pb-2.5">
        <h3 className="text-sm font-semibold text-ink flex items-center gap-1.5 font-sans">
          <Smartphone className="w-4 h-4 text-primary" /> Live Device Preview
        </h3>
        <div className="flex items-center gap-2">
          {/* Light/Dark Toggle for Phone Screen */}
          <button
            type="button"
            onClick={() => setMockTheme(prev => prev === 'dark' ? 'light' : 'dark')}
            className="p-1.5 border border-hairline rounded bg-canvas-soft text-ink-mute hover:text-ink transition-colors cursor-pointer"
            title={`Switch to ${mockTheme === 'dark' ? 'Light' : 'Dark'} Mockup`}
          >
            {mockTheme === 'dark' ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
          </button>

          <div className="flex border border-hairline rounded bg-canvas-soft p-0.5">
            {['whatsapp', 'telegram', 'messenger'].map(tab => (
              <button
                key={tab}
                type="button"
                onClick={() => onTabChange(tab)}
                className={`px-2.5 py-1 text-xs font-medium rounded-sm transition-all duration-150 cursor-pointer ${
                  previewTab === tab ? 'bg-canvas text-ink font-semibold shadow-xs' : 'text-ink-mute hover:text-ink'
                }`}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Realistic Smartphone Mockup Outer Container */}
      <div className={`rounded-[24px] p-3.5 border-[6px] border-[#202020] shadow-xl w-full flex flex-col justify-between overflow-hidden min-h-[480px] transition-colors duration-200 ${
        mockTheme === 'dark' ? 'bg-[#181818] text-white' : 'bg-slate-200 text-slate-900'
      }`}>
        {/* Status Bar */}
        <div className={`flex justify-between items-center text-[10px] px-2 pb-2 font-mono ${
          mockTheme === 'dark' ? 'text-zinc-400' : 'text-slate-600'
        }`}>
          <span>9:41 AM</span>
          <div className="flex items-center gap-1.5 text-[9px]">
            <span>5G</span>
            <span>📶</span>
            <span>🔋 98%</span>
          </div>
        </div>

        {/* Channel Header Bar */}
        <div className={`flex items-center justify-between px-3 py-2 rounded-t-lg mb-2 text-white text-xs ${
          previewTab === 'whatsapp'
            ? 'bg-[#075E54]'
            : previewTab === 'telegram'
            ? 'bg-[#229ED9]'
            : 'bg-gradient-to-r from-[#0084FF] to-[#00C6FF]'
        }`}>
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
              {previewTab === 'whatsapp' ? (
                <FaWhatsapp className="w-3.5 h-3.5 text-white" />
              ) : previewTab === 'telegram' ? (
                <FaTelegram className="w-3.5 h-3.5 text-white" />
              ) : (
                <FaFacebookMessenger className="w-3.5 h-3.5 text-white" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-[11px] truncate leading-tight">CS Announcements</p>
              <p className="text-[9px] text-white/80 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span> online
              </p>
            </div>
          </div>
        </div>

        {/* Chat Background & Message Container */}
        <div className={`flex-1 rounded-[12px] p-3 overflow-y-auto flex flex-col justify-end transition-colors duration-200 ${
          previewTab === 'whatsapp'
            ? mockTheme === 'dark' ? 'bg-[#0b141a]' : 'bg-[#e5ddd5]'
            : previewTab === 'telegram'
            ? mockTheme === 'dark' ? 'bg-[#0e1621]' : 'bg-[#8ca4b8]/20'
            : mockTheme === 'dark' ? 'bg-[#121212]' : 'bg-slate-100'
        }`}>
          <div className={`rounded-xl p-3 max-w-[90%] text-xs font-sans relative flex flex-col shadow-sm ${
            previewTab === 'whatsapp'
              ? mockTheme === 'dark'
                ? 'bg-[#005c4b] text-white self-end rounded-tr-none'
                : 'bg-[#dcf8c6] text-slate-900 self-end rounded-tr-none border border-emerald-200'
              : previewTab === 'telegram'
              ? mockTheme === 'dark'
                ? 'bg-[#182533] text-white self-start rounded-tl-none border border-slate-700'
                : 'bg-white text-slate-900 self-start rounded-tl-none border border-slate-200'
              : 'bg-gradient-to-r from-[#0084FF] to-[#00C6FF] text-white self-end rounded-br-none'
          }`}>
            {uploadedFiles.length > 0 && (
              <div className="mb-2 space-y-1.5">
                {uploadedFiles.map((file, idx) => (
                  <div key={file.id || idx} className={`flex items-center gap-2 p-2 rounded-md border text-xs ${
                    mockTheme === 'dark' || previewTab === 'messenger' ? 'bg-black/20 border-white/10 text-white' : 'bg-slate-100 border-slate-300 text-slate-800'
                  }`}>
                    <Paperclip className="w-3.5 h-3.5 flex-shrink-0 opacity-80" />
                    <div className="min-w-0 flex-1">
                      <p className="text-[10px] font-medium truncate" title={file.original_name}>{file.original_name}</p>
                      <p className="text-[9px] opacity-75">{(file.file_size / 1024 / 1024).toFixed(2)} MB</p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {previewTab === 'telegram' && (
              <div className={`text-[10px] font-semibold mb-1 select-none ${
                mockTheme === 'dark' ? 'text-[#5288c1]' : 'text-[#2481cc]'
              }`}>CR Class Notices</div>
            )}

            <div className="pb-4 leading-relaxed break-words text-[11px] font-sans" dangerouslySetInnerHTML={{ __html: renderedHtml }} />

            <div className="absolute bottom-1 right-2 flex items-center gap-1 text-[9px] opacity-75 select-none font-mono">
              <span>9:41 AM</span>
              {previewTab === 'whatsapp' ? (
                <CheckCheck className="w-3 h-3 text-cyan-400 inline" />
              ) : previewTab === 'telegram' ? (
                <Check className="w-3 h-3 text-sky-400 inline" />
              ) : (
                <Check className="w-3 h-3 text-white/90 inline" />
              )}
            </div>
          </div>
        </div>

        {/* Home Indicator Bar */}
        <div className={`w-24 h-1 rounded-full mx-auto mt-3 ${
          mockTheme === 'dark' ? 'bg-zinc-600' : 'bg-slate-400'
        }`}></div>
      </div>

      {/* Character Limit Counter Bar */}
      <div className="flex items-center justify-between text-xs px-1">
        <div className="flex items-center gap-2 text-ink-mute text-[11px]">
          <span>Length: <strong className="text-ink font-mono">{charLength}</strong> / {maxLimit} chars</span>
        </div>
        <div className="w-24 bg-canvas-soft border border-hairline h-2 rounded-full overflow-hidden">
          <div
            className={`h-full transition-all duration-300 ${
              charPercent > 90 ? 'bg-accent-tomato' : charPercent > 70 ? 'bg-amber-500' : 'bg-primary'
            }`}
            style={{ width: `${charPercent}%` }}
          ></div>
        </div>
      </div>

      {/* Copy Action Button */}
      <button
        type="button"
        onClick={handleCopy}
        className="w-full flex items-center justify-center py-2.5 px-4 border border-primary/40 bg-primary/5 hover:bg-primary/10 rounded-sm text-sm font-semibold text-primary transition-all cursor-pointer shadow-xs active:scale-[0.99]"
      >
        <Clipboard className="w-4 h-4 mr-2" /> Copy Formatted Text for {platformName}
      </button>
    </div>
  );
}
