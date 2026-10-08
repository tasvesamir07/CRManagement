import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import PlatformSelector from './PlatformSelector';
import type { Platform } from './types';

describe('PlatformSelector - WhatsApp Pin & Duration', () => {
  const mockPlatforms: Platform[] = [
    {
      id: 1,
      platform_name: 'CS101 WhatsApp Group',
      platform_type: 'whatsapp',
      chat_id: '12036329481920@g.us',
      is_active: true,
      service_available: true
    },
    {
      id: 2,
      platform_name: 'CS101 Telegram Channel',
      platform_type: 'telegram',
      chat_id: '-100123456789',
      is_active: true,
      service_available: true
    }
  ];

  it('renders target channels and allows toggling channel selection', async () => {
    const user = userEvent.setup();
    const onToggle = vi.fn();

    render(
      <PlatformSelector
        platforms={mockPlatforms}
        selectedPlatforms={[1]}
        onToggle={onToggle}
        waStatus="CONNECTED"
        alreadySentPlatforms={[]}
      />
    );

    expect(screen.getByText('CS101 WhatsApp Group')).toBeInTheDocument();
    expect(screen.getByText('CS101 Telegram Channel')).toBeInTheDocument();

    const telegramItem = screen.getByText('CS101 Telegram Channel');
    await user.click(telegramItem);
    expect(onToggle).toHaveBeenCalledWith(2);
  });

  it('shows WhatsApp Pin button and calls onTogglePin when clicked', async () => {
    const user = userEvent.setup();
    const onTogglePin = vi.fn();

    render(
      <PlatformSelector
        platforms={mockPlatforms}
        selectedPlatforms={[1]}
        onToggle={() => {}}
        waStatus="CONNECTED"
        alreadySentPlatforms={[]}
        pinPlatforms={[]}
        onTogglePin={onTogglePin}
        pinDuration={604800}
      />
    );

    const pinBtn = screen.getByRole('button', { name: /^pin$/i });
    expect(pinBtn).toBeInTheDocument();
    await user.click(pinBtn);
    expect(onTogglePin).toHaveBeenCalledWith(1);
  });

  it('renders WhatsApp Pin Duration selector when a WhatsApp channel is pinned', () => {
    render(
      <PlatformSelector
        platforms={mockPlatforms}
        selectedPlatforms={[1]}
        onToggle={() => {}}
        waStatus="CONNECTED"
        alreadySentPlatforms={[]}
        pinPlatforms={[1]}
        pinDuration={604800}
      />
    );

    expect(screen.getByText('WhatsApp Pin Duration:')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '24 Hours' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '7 Days' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '30 Days' })).toBeInTheDocument();
    expect(screen.getByText('Pin (7d)')).toBeInTheDocument();
  });

  it('calls onChangePinDuration when duration buttons (24h, 7d, 30d) are clicked', async () => {
    const user = userEvent.setup();
    const onChangePinDuration = vi.fn();

    // Select both platform 1 and 2, but only pin platform 1 so top button says "Pin All (duration)"
    const { rerender } = render(
      <PlatformSelector
        platforms={mockPlatforms}
        selectedPlatforms={[1, 2]}
        onToggle={() => {}}
        waStatus="CONNECTED"
        alreadySentPlatforms={[]}
        pinPlatforms={[1]}
        pinDuration={604800}
        onChangePinDuration={onChangePinDuration}
      />
    );

    await user.click(screen.getByRole('button', { name: '24 Hours' }));
    expect(onChangePinDuration).toHaveBeenCalledWith(86400);

    await user.click(screen.getByRole('button', { name: '30 Days' }));
    expect(onChangePinDuration).toHaveBeenCalledWith(2592000);

    // Verify rerender with 30 days updates badge to 30d
    rerender(
      <PlatformSelector
        platforms={mockPlatforms}
        selectedPlatforms={[1, 2]}
        onToggle={() => {}}
        waStatus="CONNECTED"
        alreadySentPlatforms={[]}
        pinPlatforms={[1]}
        pinDuration={2592000}
        onChangePinDuration={onChangePinDuration}
      />
    );

    expect(screen.getByText('Pin (30d)')).toBeInTheDocument();
    expect(screen.getByText('Pin All (30d)')).toBeInTheDocument();

    // Verify rerender with 24 hours updates badge to 24h
    rerender(
      <PlatformSelector
        platforms={mockPlatforms}
        selectedPlatforms={[1, 2]}
        onToggle={() => {}}
        waStatus="CONNECTED"
        alreadySentPlatforms={[]}
        pinPlatforms={[1]}
        pinDuration={86400}
        onChangePinDuration={onChangePinDuration}
      />
    );

    expect(screen.getByText('Pin (24h)')).toBeInTheDocument();
    expect(screen.getByText('Pin All (24h)')).toBeInTheDocument();
  });
});
