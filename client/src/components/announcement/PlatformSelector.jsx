import React from 'react';
import { CheckSquare, Square } from 'lucide-react';
import { FaWhatsapp, FaTelegram } from 'react-icons/fa6';

export default function PlatformSelector({ platforms, selectedPlatforms, onToggle, waStatus }) {
  if (platforms.length === 0) {
    return (
      <div className="text-center py-6 text-ink-mute text-sm">
        <p>No broadcast targets configured.</p>
        <p className="text-xs mt-1">Go to Broadcasting Targets to add WhatsApp or Telegram channels.</p>
      </div>
    );
  }

  const allSelected = platforms.every(p => selectedPlatforms.includes(p.id));
  const toggleAll = () => {
    if (allSelected) {
      onToggle('clear');
    } else {
      platforms.forEach(p => {
        const off = p.service_available === false || p.is_active === false;
        if (!off && !selectedPlatforms.includes(p.id)) {
          onToggle(p.id);
        }
      });
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="text-xs font-medium text-ink-mute uppercase tracking-wider">Target Channels</label>
        <button type="button" onClick={toggleAll} className="text-xs text-primary hover:underline cursor-pointer">
          {allSelected ? 'Deselect All' : 'Select All'}
        </button>
      </div>
      {platforms.map(p => {
        const isSelected = selectedPlatforms.includes(p.id);
        const engineUnavailable = p.service_available === false || p.is_active === false;
        const needsPairing = !engineUnavailable && p.platform_type === 'whatsapp' && waStatus !== 'CONNECTED';
        const isUnavailable = engineUnavailable;
        let badgeText = '';
        let badgeClass = '';
        if (engineUnavailable) {
          badgeText = 'Offline';
          badgeClass = 'text-accent-yellow';
        } else if (needsPairing) {
          badgeText = 'Needs Pairing';
          badgeClass = 'text-ink-mute';
        }
        return (
          <div key={p.id}
            className={`flex items-center justify-between p-3 border rounded-sm transition-all cursor-pointer ${isSelected
              ? 'border-primary bg-primary/5'
              : isUnavailable ? 'border-hairline-cool bg-canvas-soft/50 opacity-60' : 'border-hairline hover:border-hairline-strong'}`}
            onClick={() => { if (!isUnavailable) onToggle(p.id); }}>
            <div className="flex items-center gap-3 min-w-0">
              <div className="shrink-0">
                {isSelected ? <CheckSquare className="w-5 h-5 text-primary" /> : <Square className="w-5 h-5 text-ink-mute" />}
              </div>
              <div className="w-8 h-8 rounded-sm flex items-center justify-center border border-hairline bg-canvas-soft shrink-0">
                {p.platform_type === 'whatsapp' ? <FaWhatsapp className="w-4 h-4" style={{ color: '#25D366' }} /> : <FaTelegram className="w-4 h-4" style={{ color: '#0088CC' }} />}
              </div>
              <div className="min-w-0">
                <h4 className="text-sm font-medium text-ink truncate">{p.platform_name}</h4>
                <p className="text-[10px] text-ink-mute font-mono truncate">{p.chat_id}</p>
              </div>
            </div>
            {badgeText && (
              <span className={`text-[10px] font-medium ${badgeClass} shrink-0`}>{badgeText}</span>
            )}
          </div>
        );
      })}
    </div>
  );
}
