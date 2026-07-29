import * as React from "react"
import { Calendar as CalendarIcon, X } from "lucide-react"
import { parseDate } from "@internationalized/date"
import { JollyCalendar } from "./calendar"
import { cn } from "@/lib/utils"

export interface DatePickerProps {
  value?: string // YYYY-MM-DD
  onChange?: (value: string) => void
  placeholder?: string
  className?: string
}

export function DatePicker({ value, onChange, placeholder = "Pick a date", className }: DatePickerProps) {
  const [isOpen, setIsOpen] = React.useState(false)
  const containerRef = React.useRef<HTMLDivElement>(null)

  // Parse current value string to CalendarDate object
  const dateValue = React.useMemo(() => {
    if (!value) return null
    try {
      return parseDate(value)
    } catch (e) {
      return null
    }
  }, [value])

  // Format YYYY-MM-DD to DD-MM-YYYY for display
  const displayValue = React.useMemo(() => {
    if (!value) return ""
    const parts = value.split("-")
    if (parts.length === 3) {
      return `${parts[2]}-${parts[1]}-${parts[0]}`
    }
    return value
  }, [value])

  // Handle outside click to close popover
  React.useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleOutsideClick)
    }
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick)
    }
  }, [isOpen])

  return (
    <div className={cn("relative w-full", className)} ref={containerRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex h-9 w-full items-center justify-between gap-1.5 rounded-sm border border-hairline bg-canvas px-2.5 py-1.5 text-xs text-ink placeholder-ink-faint shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary hover:border-hairline-strong transition-all duration-150 cursor-pointer text-left font-sans select-none"
      >
        <span className={cn("flex items-center gap-1.5 min-w-0 truncate whitespace-nowrap", !value && "text-ink-mute")}>
          <CalendarIcon className="h-3.5 w-3.5 shrink-0 text-ink-mute" />
          <span className="truncate">{value ? displayValue : placeholder}</span>
        </span>
        {value && (
          <span
            onClick={(e) => {
              e.stopPropagation()
              onChange?.("")
            }}
            className="rounded p-0.5 hover:bg-canvas-soft text-ink-mute hover:text-ink transition-colors cursor-pointer shrink-0 ml-0.5"
          >
            <X className="h-3.5 w-3.5" />
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute left-0 top-full mt-1.5 z-50 rounded-md border border-hairline bg-canvas p-3 shadow-xl animate-in fade-in slide-in-from-top-1 duration-150">
          <JollyCalendar
            aria-label="Select date"
            value={dateValue}
            onChange={(val) => {
              onChange?.(val.toString())
              setIsOpen(false)
            }}
          />
        </div>
      )}
    </div>
  )
}
