import { CheckCircle, AlertTriangle } from 'lucide-react';

interface TelegramStatusCardProps {
  tgStatus: string;
  isTgMock: boolean;
}

const TelegramStatusCard = ({ tgStatus, isTgMock }: TelegramStatusCardProps) => {
  return (
    <div className="bg-canvas border border-hairline rounded-lg p-6 shadow-sm space-y-4">
      <div className="flex items-center justify-between border-b border-hairline-cool pb-3">
        <h3 className="text-md font-medium text-ink font-sans">Telegram Status</h3>
        {isTgMock && (
          <span className="px-2 py-0.5 rounded-full text-[10px] uppercase font-bold bg-accent-yellow/10 text-ink">Disconnected</span>
        )}
      </div>
      <div className="flex flex-col items-center justify-center p-4 border border-dashed border-hairline rounded-sm min-h-[100px]">
        {!isTgMock ? (
          <div className="text-center space-y-2">
            <CheckCircle className="w-12 h-12 text-primary stroke-[1.25] mx-auto" />
            <h4 className="text-sm font-medium text-ink">Bot Connected</h4>
            <p className="text-xs text-ink-mute">Telegram bot is active. Messages will be delivered.</p>
          </div>
        ) : (
          <div className="text-center space-y-3">
            <AlertTriangle className="w-12 h-12 text-ink-mute stroke-[1.25] mx-auto" />
            <h4 className="text-sm font-medium text-ink">Not Connected</h4>
            <p className="text-xs text-ink-mute">Telegram bot token is not configured. Set TELEGRAM_BOT_TOKEN in your .env file.</p>
          </div>
        )}
      </div>
      {!isTgMock && (
        <div className="pt-2 border-t border-hairline-cool">
          <div className="flex items-center gap-2 text-xs text-ink-mute">
            <span className={`w-1.5 h-1.5 rounded-full ${tgStatus === 'CONNECTED' ? 'bg-primary' : 'bg-accent-yellow'}`} />
            Status: {tgStatus}
          </div>
        </div>
      )}
    </div>
  );
};

export default TelegramStatusCard;
