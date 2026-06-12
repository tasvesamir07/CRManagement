import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import PasswordInput from './PasswordInput';

describe('PasswordInput', () => {
  const defaultProps = {
    id: 'password',
    value: '',
    onChange: () => {},
    placeholder: 'Enter password',
  };

  it('renders with placeholder', () => {
    render(<PasswordInput {...defaultProps} />);
    expect(screen.getByPlaceholderText('Enter password')).toBeInTheDocument();
  });

  it('starts with password type (hidden)', () => {
    render(<PasswordInput {...defaultProps} />);
    const input = screen.getByPlaceholderText('Enter password');
    expect(input).toHaveAttribute('type', 'password');
  });

  it('toggles visibility when button is clicked', async () => {
    const user = userEvent.setup();
    render(<PasswordInput {...defaultProps} />);

    const input = screen.getByPlaceholderText('Enter password');
    expect(input).toHaveAttribute('type', 'password');

    const toggleButton = screen.getByRole('button');
    await user.click(toggleButton);
    expect(input).toHaveAttribute('type', 'text');

    await user.click(toggleButton);
    expect(input).toHaveAttribute('type', 'password');
  });

  it('forwards additional props to input element', () => {
    render(<PasswordInput {...defaultProps} data-testid="pw-input" />);
    expect(screen.getByTestId('pw-input')).toBeInTheDocument();
  });
});
