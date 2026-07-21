import React from 'react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from './dropdown-menu';
import { ChevronDown, Check } from 'lucide-react';
import { cn } from '../../lib/utils';

export interface SelectOption {
  value: string;
  label: React.ReactNode;
  icon?: React.ReactNode;
  disabled?: boolean;
}

interface CustomSelectProps {
  value: string | number;
  onChange: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  className?: string;
  triggerClassName?: string;
  contentClassName?: string;
  disabled?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export const CustomSelect: React.FC<CustomSelectProps> = ({
  value,
  onChange,
  options,
  placeholder = 'Select...',
  className = '',
  triggerClassName = '',
  contentClassName = '',
  disabled = false,
  size = 'md',
}) => {
  const selectedOption = options.find((opt) => String(opt.value) === String(value));

  const sizeClasses = {
    sm: 'h-8 px-2.5 text-xs',
    md: 'h-9 px-3 text-xs sm:text-sm',
    lg: 'h-10 px-3 text-sm',
  }[size];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild disabled={disabled}>
        <button
          type="button"
          className={cn(
            'w-full min-w-0 flex items-center justify-between gap-1.5 border border-hairline rounded-sm bg-canvas text-ink hover:border-hairline-strong focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all duration-150 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed select-none font-sans text-left',
            sizeClasses,
            triggerClassName,
            className
          )}
        >
          <span className="truncate flex items-center gap-1.5 font-medium flex-1 min-w-0">
            {selectedOption ? (
              <>
                {selectedOption.icon}
                <span className="truncate">{selectedOption.label}</span>
              </>
            ) : (
              <span className="text-ink-mute truncate">{placeholder}</span>
            )}
          </span>
          <ChevronDown className="w-3.5 h-3.5 text-ink-mute flex-shrink-0 opacity-75" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="start"
        className={cn(
          'w-[var(--radix-dropdown-menu-trigger-width)] min-w-[160px] max-h-[300px] overflow-y-auto bg-canvas border border-hairline shadow-lg p-1 text-xs z-50',
          contentClassName
        )}
      >
        {options.map((opt, idx) => {
          const isSelected = String(opt.value) === String(value);
          return (
            <DropdownMenuItem
              key={`${opt.value}-${idx}`}
              disabled={opt.disabled}
              onSelect={() => onChange(String(opt.value))}
              className={cn(
                'flex items-center justify-between px-2.5 py-1.5 rounded cursor-pointer text-ink transition-colors font-medium text-xs',
                isSelected ? 'bg-primary/10 text-primary font-semibold' : 'hover:bg-canvas-soft'
              )}
            >
              <span className="flex items-center gap-2 truncate flex-1">
                {opt.icon}
                <span className="truncate">{opt.label}</span>
              </span>
              {isSelected && <Check className="w-3.5 h-3.5 text-primary flex-shrink-0 ml-1.5" />}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default CustomSelect;
