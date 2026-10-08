import { CheckSquare, Square, CheckCircle, Paperclip, FileText, AtSign, Pin } from 'lucide-react';
import { FaWhatsapp, FaTelegram, FaFacebookMessenger } from 'react-icons/fa6';
import type { Platform } from './types';

interface PlatformSelectorProps {
  platforms: Platform[];
  selectedPlatforms: number[];
  onToggle: (id: number | 'clear') => void;
  waStatus: string;
  alreadySentPlatforms: number[];
  hasAttachments?: boolean;
  excludedAttachmentPlatforms?: number[];
  onToggleAttachment?: (id: number) => void;
  mentionAllPlatforms?: number[];
  onToggleMention?: (id: number) => void;
  pinPlatforms?: number[];
  onTogglePin?: (id: number) => void;
  pinDuration?: number;
  onChangePinDuration?: (duration: number) => void;
}

export default function PlatformSelector({
  platforms,
  selectedPlatforms,
  onToggle,
  waStatus,
  alreadySentPlatforms = [],
  hasAttachments = false,
  excludedAttachmentPlatforms = [],
  onToggleAttachment,
  mentionAllPlatforms = [],
  onToggleMention,
  pinPlatforms = [],
  onTogglePin,
  pinDuration = 604800,
  onChangePinDuration
}: PlatformSelectorProps) {
  if (platforms.length === 0) {
    return (
      <div className="text-center py-6 text-ink-mute text-sm">
        <p>No broadcast targets configured.</p>
        <p className="text-xs mt-1">Go to Broadcasting Targets to add WhatsApp or Telegram channels.</p>
      </div>
    );
  }

  const displayPlatforms = platforms
    .filter(p => !alreadySentPlatforms.includes(p.id))
    .filter(p => !(p.platform_type === 'messenger' && p.service_available === false));

  if (displayPlatforms.length === 0) {
    return (
      <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-800 dark:text-emerald-400 rounded-sm p-4 text-center text-sm font-semibold flex items-center justify-center gap-2">
        <CheckCircle className="w-5 h-5 text-emerald-500 shrink-0" />
        All target channels have successfully received this broadcast.
      </div>
    );
  }

  const availablePlatforms = displayPlatforms.filter(p => {
    const engineUnavailable = p.service_available === false || p.is_active === false;
    const needsPairing = !engineUnavailable && p.platform_type === 'whatsapp' && waStatus !== 'CONNECTED';
    return !(engineUnavailable || needsPairing);
  });

  const allSelected = availablePlatforms.length > 0 && availablePlatforms.every(p => selectedPlatforms.includes(p.id));
  const toggleAll = () => {
    if (allSelected) {
      onToggle('clear');
    } else {
      availablePlatforms.forEach(p => {
        if (!selectedPlatforms.includes(p.id)) {
          onToggle(p.id);
        }
      });
    }
  };

  const getPinDurationLabel = (d: number) => {
    if (d === 86400) return '24h';
    if (d === 2592000) return '30d';
    return '7d';
  };

  const getPinDurationFullName = (d: number) => {
    if (d === 86400) return '24 hours';
    if (d === 2592000) return '30 days';
    return '7 days';
  };

  const hasPinnedWhatsApp = displayPlatforms.some(
    p => p.platform_type === 'whatsapp' && selectedPlatforms.includes(p.id) && pinPlatforms.includes(p.id)
  );

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <label className="text-xs font-medium text-ink-mute uppercase tracking-wider">Target Channels</label>
        <div className="flex flex-wrap items-center gap-2.5 sm:gap-3">
          {displayPlatforms.some(p => (p.platform_type === 'whatsapp' || p.platform_type === 'telegram') && selectedPlatforms.includes(p.id)) && (
            <button
              type="button"
              onClick={() => {
                const pinnableSelected = displayPlatforms.filter(p => (p.platform_type === 'whatsapp' || p.platform_type === 'telegram') && selectedPlatforms.includes(p.id));
                const allPinnablePinned = pinnableSelected.length > 0 && pinnableSelected.every(p => pinPlatforms.includes(p.id));
                pinnableSelected.forEach(p => {
                  if (allPinnablePinned && pinPlatforms.includes(p.id)) {
                    onTogglePin?.(p.id);
                  } else if (!allPinnablePinned && !pinPlatforms.includes(p.id)) {
                    onTogglePin?.(p.id);
                  }
                });
              }}
              className="text-xs text-amber-600 dark:text-amber-400 hover:underline cursor-pointer flex items-center gap-1"
            >
              <Pin className="w-3 h-3" />
              <span>
                {displayPlatforms
                  .filter(p => (p.platform_type === 'whatsapp' || p.platform_type === 'telegram') && selectedPlatforms.includes(p.id))
                  .every(p => pinPlatforms.includes(p.id))
                  ? 'Unpin All'
                  : `Pin All (${getPinDurationLabel(pinDuration)})`}
              </span>
            </button>
          )}
          <button type="button" onClick={toggleAll} className="text-xs text-primary hover:underline cursor-pointer">
            {allSelected ? 'Deselect All' : 'Select All'}
          </button>
        </div>
      </div>

      {hasPinnedWhatsApp && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs bg-amber-500/10 border border-amber-500/25 rounded-md px-3 py-2 animate-in fade-in slide-in-from-top-1 duration-200">
          <div className="flex items-center gap-1.5 font-medium text-amber-800 dark:text-amber-200">
            <Pin className="w-3.5 h-3.5 text-amber-500 fill-amber-500/30 shrink-0" />
            <span>WhatsApp Pin Duration:</span>
          </div>
          <div className="flex items-center gap-1 bg-canvas border border-hairline rounded p-0.5 shadow-2xs self-start sm:self-auto">
            {[
              { label: '24 Hours', value: 86400 },
              { label: '7 Days', value: 604800 },
              { label: '30 Days', value: 2592000 }
            ].map(opt => (
              <button
                key={opt.value}
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onChangePinDuration?.(opt.value);
                }}
                className={`px-2.5 py-1 rounded text-[11px] font-medium transition-all cursor-pointer ${
                  pinDuration === opt.value
                    ? 'bg-amber-500 text-white font-semibold shadow-xs'
                    : 'text-ink-mute hover:text-ink hover:bg-canvas-soft'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      )}
      {displayPlatforms.map(p => {
        const alreadySent = false;
        const isSelected = selectedPlatforms.includes(p.id);
        const engineUnavailable = p.service_available === false || p.is_active === false;
        const needsPairing = !engineUnavailable && p.platform_type === 'whatsapp' && waStatus !== 'CONNECTED';
        const isUnavailable = engineUnavailable || needsPairing || alreadySent;
        const isAttachmentExcluded = excludedAttachmentPlatforms.includes(p.id);
        const supportsMention = p.platform_type === 'whatsapp' || p.platform_type === 'messenger';
        const isMentionAll = mentionAllPlatforms.includes(p.id);
        const mentionToken = p.platform_type === 'whatsapp' ? '@all' : '@everyone';
        const supportsPin = p.platform_type === 'whatsapp' || p.platform_type === 'telegram';
        const isPinned = pinPlatforms.includes(p.id);

        let badgeText = '';
        let badgeClass = '';
        if (alreadySent) {
          badgeText = 'Already Sent';
          badgeClass = 'text-emerald-700 bg-emerald-100 dark:text-emerald-400 dark:bg-emerald-500/15 px-2 py-0.5 rounded-full text-[9px] font-semibold';
        } else if (engineUnavailable) {
          badgeText = 'Offline';
          badgeClass = 'text-accent-yellow bg-accent-yellow/10 px-2 py-0.5 rounded-full text-[9px] font-semibold';
        } else if (needsPairing) {
          badgeText = 'Needs Pairing';
          badgeClass = 'text-accent-yellow bg-accent-yellow/10 px-2 py-0.5 rounded-full text-[9px] font-semibold';
        }

        let containerClass;
        if (alreadySent) {
          containerClass = 'border-emerald-500/30 bg-emerald-500/5 dark:bg-emerald-500/5 opacity-90 pointer-events-none';
        } else if (isSelected) {
          containerClass = 'border-primary bg-primary/5';
        } else if (isUnavailable) {
          containerClass = 'border-hairline-cool bg-canvas-soft/50 opacity-60 pointer-events-none';
        } else {
          containerClass = 'border-hairline hover:border-hairline-strong';
        }

        return (
          <div key={p.id}
            className={`flex flex-col sm:flex-row sm:items-center justify-between p-2.5 sm:p-3 border rounded-sm transition-all cursor-pointer gap-2 ${containerClass}`}
            onClick={() => { if (!isUnavailable) onToggle(p.id); }}>
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <div className="shrink-0">
                {alreadySent ? (
                  <CheckCircle className="w-5 h-5 text-emerald-500 fill-emerald-500/10" />
                ) : isSelected ? (
                  <CheckSquare className="w-5 h-5 text-primary" />
                ) : (
                  <Square className="w-5 h-5 text-ink-mute" />
                )}
              </div>
              <div className="w-8 h-8 rounded-sm flex items-center justify-center border border-hairline bg-canvas-soft shrink-0">
                {p.platform_type === 'whatsapp' ? (
                  <FaWhatsapp className="w-4 h-4" style={{ color: '#25D366' }} />
                ) : p.platform_type === 'telegram' ? (
                  <FaTelegram className="w-4 h-4" style={{ color: '#0088CC' }} />
                ) : (
                  <FaFacebookMessenger className="w-4 h-4" style={{ color: '#00B2FF' }} />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <h4 className="text-sm font-medium text-ink truncate">{p.platform_name}</h4>
                <p className="text-[10px] text-ink-mute font-mono truncate">{p.chat_id}</p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 justify-end self-end sm:self-auto shrink-0">
              {isSelected && supportsMention && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggleMention?.(p.id);
                  }}
                  title={isMentionAll
                    ? `Click to remove the ${mentionToken} mention`
                    : `Click to prepend ${mentionToken} so everyone in the group gets notified`}
                  className={`text-[10px] font-semibold px-2 py-1 rounded border flex items-center gap-1 cursor-pointer transition-colors ${
                    isMentionAll
                      ? 'bg-primary/15 text-primary border-primary/30 hover:bg-primary/25'
                      : 'bg-white/5 text-ink-mute border-hairline hover:bg-canvas-soft'
                  }`}
                >
                  <AtSign className={`w-3 h-3 ${isMentionAll ? 'text-primary' : ''}`} />
                  <span>{mentionToken}</span>
                </button>
              )}
              {isSelected && supportsPin && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onTogglePin?.(p.id);
                  }}
                  title={isPinned
                    ? 'Click to remove pin for this channel'
                    : p.platform_type === 'whatsapp'
                      ? `Click to pin notice to top of WhatsApp group (${getPinDurationFullName(pinDuration)})`
                      : 'Click to pin notice in Telegram channel'}
                  className={`text-[10px] font-semibold px-2 py-1 rounded border flex items-center gap-1 cursor-pointer transition-colors ${
                    isPinned
                      ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30 hover:bg-amber-500/25 shadow-sm'
                      : 'bg-white/5 text-ink-mute border-hairline hover:bg-canvas-soft'
                  }`}
                >
                  <Pin className={`w-3 h-3 ${isPinned ? 'text-amber-500 fill-amber-500/30' : ''}`} />
                  <span>
                    {isPinned
                      ? (p.platform_type === 'whatsapp' ? `Pin (${getPinDurationLabel(pinDuration)})` : 'Pinned')
                      : 'Pin'}
                  </span>
                </button>
              )}
              {isSelected && hasAttachments && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggleAttachment?.(p.id);
                  }}
                  title={isAttachmentExcluded ? "Click to include attachments for this channel" : "Click to send text-only without attachments"}
                  className={`text-[10px] font-semibold px-2 py-1 rounded border flex items-center gap-1 cursor-pointer transition-colors ${
                    isAttachmentExcluded
                      ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30 hover:bg-amber-500/20'
                      : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20'
                  }`}
                >
                  {isAttachmentExcluded ? (
                    <>
                      <FileText className="w-3 h-3 text-amber-500" />
                      <span>Text Only</span>
                    </>
                  ) : (
                    <>
                      <Paperclip className="w-3 h-3 text-emerald-500" />
                      <span>With File</span>
                    </>
                  )}
                </button>
              )}
              {badgeText && (
                <span className={`text-[10px] font-medium ${badgeClass} shrink-0`}>{badgeText}</span>
              )}
            </div>
          </div>
        );
      })}
      {selectedPlatforms.some(id => platforms.find(p => p.id === id && p.platform_type === 'whatsapp')) && (
        <div className="text-[11px] text-ink-mute flex items-center gap-1.5 pt-1">
          <Pin className="w-3 h-3 text-amber-500 shrink-0" />
          <span>Pinned notices stay at top of WhatsApp groups for {getPinDurationFullName(pinDuration)}. (Messenger automated pins are not supported by Meta).</span>
        </div>
      )}
    </div>
  );
}
