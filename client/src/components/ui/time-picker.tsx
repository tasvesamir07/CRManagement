import * as React from "react"
import { Clock, X } from "lucide-react"
import { cn } from "@/lib/utils"

export interface TimePickerProps {
  value?: string // "HH:MM" (24h format)
  onChange?: (value: string) => void
  placeholder?: string
  className?: string
}

export function TimePicker({ value, onChange, placeholder = "Pick a time", className }: TimePickerProps) {
  const [isOpen, setIsOpen] = React.useState(false)
  const containerRef = React.useRef<HTMLDivElement>(null)

  // Split 24h format "HH:MM" into 12h parts
  const parsedTime = React.useMemo(() => {
    if (!value) return { hour: "12", minute: "00", period: "AM" }
    const [hStr, mStr] = value.split(":")
    const h = parseInt(hStr, 10)
    const period = h >= 12 ? "PM" : "AM"
    const hour12 = h % 12 || 12
    return {
      hour: String(hour12).padStart(2, "0"),
      minute: mStr || "00",
      period,
    }
  }, [value])

  // Display value formatted as "hh:mm A" (e.g. "04:00 PM")
  const displayValue = React.useMemo(() => {
    if (!value) return ""
    return `${parsedTime.hour}:${parsedTime.minute} ${parsedTime.period}`
  }, [value, parsedTime])

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

  // Scroll selected elements to center when popover opens
  React.useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        const container = containerRef.current
        if (container) {
          const selecteds = container.querySelectorAll(".bg-primary")
          selecteds.forEach((el) => {
            el.scrollIntoView({ block: "center", behavior: "auto" })
          })
        }
      }, 50)
    }
  }, [isOpen])

  // Convert 12h parameters to 24h string
  const set24hTime = (hour12: string, min: string, ampm: string) => {
    let h = parseInt(hour12, 10)
    if (ampm === "PM" && h !== 12) h += 12
    if (ampm === "AM" && h === 12) h = 0
    const hStr = String(h).padStart(2, "0")
    const mStr = min.padStart(2, "0")
    onChange?.(`${hStr}:${mStr}`)
  }

  const hours = Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, "0"))
  const minutes = Array.from({ length: 60 }, (_, i) => String(i).padStart(2, "0"))
  const periods = ["AM", "PM"]

  return (
    <div className={cn("relative w-full", className)} ref={containerRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex h-9 w-full items-center justify-between rounded-sm border border-hairline bg-canvas px-2 py-1 text-xs text-ink placeholder-ink-faint shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary hover:border-hairline-strong transition-all duration-150 cursor-pointer text-left"
      >
        <span className={cn("flex items-center gap-1.5 whitespace-nowrap", !value && "text-ink-mute")}>
          <Clock className="h-3.5 w-3.5 shrink-0" />
          {value ? displayValue : placeholder}
        </span>
        {value && (
          <span
            onClick={(e) => {
              e.stopPropagation()
              onChange?.("")
            }}
            className="rounded p-0.5 hover:bg-canvas-soft text-ink-mute hover:text-ink transition-colors cursor-pointer shrink-0"
          >
            <X className="h-3 w-3" />
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute left-0 mt-2 z-50 flex gap-2 rounded-md border border-hairline bg-canvas p-3 shadow-lg animate-in fade-in slide-in-from-top-1 duration-150 h-52">
          {/* Hours column */}
          <div className="flex flex-col overflow-y-auto w-12 border-r border-hairline pr-1 h-full scrollbar-none scroll-smooth">
            <span className="text-[10px] text-ink-mute uppercase text-center font-bold mb-1 select-none">Hr</span>
            {hours.map((h) => {
              const isSelected = parsedTime.hour === h
              return (
                <button
                  key={h}
                  type="button"
                  onClick={() => set24hTime(h, parsedTime.minute, parsedTime.period)}
                  className={cn(
                    "py-1 text-xs text-center rounded-sm transition-all duration-150 cursor-pointer hover:bg-zinc-100 hover:text-zinc-900 select-none",
                    isSelected ? "bg-primary text-primary-foreground font-bold hover:bg-primary hover:text-primary-foreground" : "text-ink"
                  )}
                >
                  {h}
                </button>
              )
            })}
          </div>

          {/* Minutes column */}
          <div className="flex flex-col overflow-y-auto w-12 border-r border-hairline pr-1 h-full scrollbar-none scroll-smooth">
            <span className="text-[10px] text-ink-mute uppercase text-center font-bold mb-1 select-none">Min</span>
            {minutes.map((m) => {
              const isSelected = parsedTime.minute === m
              return (
                <button
                  key={m}
                  type="button"
                  onClick={() => set24hTime(parsedTime.hour, m, parsedTime.period)}
                  className={cn(
                    "py-1 text-xs text-center rounded-sm transition-all duration-150 cursor-pointer hover:bg-zinc-100 hover:text-zinc-900 select-none",
                    isSelected ? "bg-primary text-primary-foreground font-bold hover:bg-primary hover:text-primary-foreground" : "text-ink"
                  )}
                >
                  {m}
                </button>
              )
            })}
          </div>

          {/* Period column */}
          <div className="flex flex-col w-12 h-full justify-start">
            <span className="text-[10px] text-ink-mute uppercase text-center font-bold mb-1 select-none">AM/PM</span>
            {periods.map((p) => {
              const isSelected = parsedTime.period === p
              return (
                <button
                  key={p}
                  type="button"
                  onClick={() => set24hTime(parsedTime.hour, parsedTime.minute, p)}
                  className={cn(
                    "py-1 text-xs text-center rounded-sm transition-all duration-150 cursor-pointer hover:bg-zinc-100 hover:text-zinc-900 select-none mb-1",
                    isSelected ? "bg-primary text-primary-foreground font-bold hover:bg-primary hover:text-primary-foreground" : "text-ink"
                  )}
                >
                  {p}
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
