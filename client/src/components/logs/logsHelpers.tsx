import type { ReactNode } from 'react';

interface TroubleshootResult {
  title: string;
  explanation: string;
  steps: string[];
}

export const parseDetails = (detailsStr: string | object | null | undefined): object | string | null => {
  if (!detailsStr) return null;
  try {
    if (typeof detailsStr === 'object') return detailsStr;
    return JSON.parse(detailsStr);
  } catch {
    return detailsStr;
  }
};

export const getActionLabel = (action: string): ReactNode => {
  switch (action) {
    case 'announcement.delivery_failed':
      return <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-accent-tomato/15 text-accent-tomato">Delivery Failed</span>;
    case 'announcement.delivery_sent':
      return <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-primary/15 text-primary">Delivery Success</span>;
    case 'announcement.broadcast_completed':
      return <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-accent-violet/15 text-accent-violet">Broadcast End</span>;
    case 'admin.create_user':
      return <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-accent-indigo/15 text-accent-indigo">User Created</span>;
    case 'admin.update_user':
      return <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-accent-violet/15 text-accent-violet">User Updated</span>;
    case 'admin.delete_user':
      return <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-accent-tomato/15 text-accent-tomato">User Removed</span>;
    default:
      return <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-hairline-strong/15 text-ink-mute capitalize">{action.replace(/[._]/g, ' ')}</span>;
  }
};

export const troubleshootError = (errorStr: string | undefined | null): TroubleshootResult | null => {
  if (!errorStr) return null;
  const lower = errorStr.toLowerCase();

  if (lower.includes('thread not found') || lower.includes('message thread not found') || lower.includes('message thread no')) {
    return {
      title: 'Telegram Topic/Thread Missing',
      explanation: 'The Telegram broadcast was sent to a topic/thread ID that does not exist or was deleted in that group.',
      steps: [
        'Open the target Telegram group and check if the topic/thread still exists.',
        'If the topic was deleted, recreate it in Telegram.',
        'Go to "Broadcasting Targets" in the sidebar, edit the Telegram platform, and update the Chat ID suffix (e.g. -100xxxxxxxx/thread_id) with the correct thread ID.',
        'Ensure the Telegram bot is permitted to post inside topics.'
      ]
    };
  }

  if (lower.includes('chat not found') || lower.includes('chat_id_invalid')) {
    return {
      title: 'Chat/Group Not Found',
      explanation: 'The Telegram bot cannot find the chat or group ID specified in the platform setup.',
      steps: [
        'Ensure the Telegram Bot token in the server configuration (.env) is correct.',
        'Double-check that the Chat ID in "Broadcasting Targets" is correct (group IDs usually start with -100).',
        'Make sure the Telegram Bot has been added as a member/administrator to the target group.'
      ]
    };
  }

  if (lower.includes('bot was blocked') || lower.includes('user is deactivated')) {
    return {
      title: 'Bot Blocked/Kicked',
      explanation: 'The bot was blocked by the user or removed from the group chat.',
      steps: [
        'Ensure the bot is still a member of the group/channel.',
        'If it is a private chat, the target user must start the chat with the bot first by clicking "/start".',
        'Verify the bot has not been banned or restricted.'
      ]
    };
  }

  if (lower.includes('admin') || lower.includes('not enough rights') || lower.includes('privileges')) {
    return {
      title: 'Insufficient Permissions',
      explanation: 'The bot does not have permission to post messages in the selected group or channel.',
      steps: [
        'Promote the Telegram Bot to an Administrator in the group/channel settings.',
        'Make sure the administrator permission "Post Messages" (or "Send Messages") is enabled for the bot.'
      ]
    };
  }

  if (lower.includes('whatsapp') && (lower.includes('session') || lower.includes('close') || lower.includes('not paired') || lower.includes('disconnected'))) {
    return {
      title: 'WhatsApp Session Disconnected',
      explanation: 'The WhatsApp service is running in mock mode or its authentication session has expired.',
      steps: [
        'Go to "Broadcasting Targets" in the sidebar.',
        'Check the status badge for WhatsApp.',
        'If disconnected, follow the pairing instructions (scan QR code or use a pairing code) to re-authenticate the device.'
      ]
    };
  }

  if (lower.includes('quota') || lower.includes('limit') || lower.includes('size')) {
    return {
      title: 'Size or Rate Limit Exceeded',
      explanation: 'The payload or attachment is too large, or you are broadcasting too many messages at once.',
      steps: [
        'Verify that your file attachments are within size limits (WhatsApp/Telegram have limits around 16MB - 50MB depending on type).',
        'If sending a large notice with multiple attachments, use the "Schedule" feature instead of sending immediately to allow staggered dispatch.'
      ]
    };
  }

  if (lower.includes('text is empty') || lower.includes('message text is empty') || lower.includes('empty text') || lower.includes('body is empty')) {
    return {
      title: 'Empty Message Content',
      explanation: 'The Telegram broadcast failed because the compiled message body was empty.',
      steps: [
        'Ensure the notice content is not blank before sending.',
        'If broadcasting a "Share File" notice, verify that you have uploaded at least one attachment.',
        'If using a template, verify that all variables are filled out so that the compiled content is not empty.'
      ]
    };
  }

  return {
    title: 'General Delivery Failure',
    explanation: 'An unexpected platform or network error occurred during broadcast delivery.',
    steps: [
      'Check the server console logs for full stack traces.',
      'Verify internet connectivity and external platform API status.',
      'Double check that the broadcasting target channel details are valid.'
    ]
  };
};
