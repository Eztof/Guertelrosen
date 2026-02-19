import { useState, useEffect } from 'react'
import { DSA_MONTHS, getDsaWeekday, isValidDsaDate, type DsaDate, type DsaMonthIndex } from '@/lib/dsaCalendar'
import { ChevronDown } from 'lucide-react'

interface DsaDatePickerProps {
  value?: DsaDate | null
  onChange: (date: DsaDate | null) => void
  placeholder?: string
  className?: string
  showWeekday?: boolean
}

export default function DsaDatePicker({
  value,
  onChange,
  placeholder = 'DSA-Datum wählen…',
  className = '',
  showWeekday = true,
}: DsaDatePickerProps) {
  const [day, setDay] = useState<string>(value?.day?.toString() ?? '')
  const [month, setMonth] = useState<string>(value?.month?.toString() ?? '0')
  const [year, setYear] = useState<string>(value?.year?.toString() ?? '1039')

  useEffect(() => {
    if (value) {
      setDay(value.day.toString())
      setMonth(value.month.toString())
      setYear(value.year.toString())
    } else {
      setDay('')
    }
  }, [value])

  const handleChange = (newDay: string, newMonth: string, newYear: string) => {
    if (!newDay || !newYear) {
      onChange(null)
      return
    }
    const d = parseInt(newDay)
    const m = parseInt(newMonth) as DsaMonthIndex
    const y = parseInt(newYear)
    if (isNaN(d) || isNaN(m) || isNaN(y)) {
      onChange(null)
      return
    }
    const date: DsaDate = { day: d, month: m, year: y }
    if (isValidDsaDate(date)) {
      onChange(date)
    } else {
      onChange(null)
    }
  }

  const selectedMonth = DSA_MONTHS[parseInt(month) ?? 0]
  const maxDay = selectedMonth?.days ?? 30

  // Clamp day if switching to Namenlose Tage (5 days max)
  const handleMonthChange = (val: string) => {
    setMonth(val)
    const newMax = DSA_MONTHS[parseInt(val)]?.days ?? 30
    const clampedDay = Math.min(parseInt(day) || 1, newMax).toString()
    setDay(clampedDay)
    handleChange(clampedDay, val, year)
  }

  const weekday = (() => {
    if (!day || !year || !showWeekday) return null
    const d = parseInt(day), m = parseInt(month) as DsaMonthIndex, y = parseInt(year)
    if (isNaN(d) || isNaN(m) || isNaN(y)) return null
    const date: DsaDate = { day: d, month: m, year: y }
    if (!isValidDsaDate(date)) return null
    return getDsaWeekday(date)
  })()

  return (
    <div className={`space-y-2 ${className}`}>
      <div className="flex gap-2 items-center">
        {/* Day */}
        <input
          type="number"
          min={1}
          max={maxDay}
          value={day}
          onChange={e => { setDay(e.target.value); handleChange(e.target.value, month, year) }}
          className="input w-20 text-center"
          placeholder="Tag"
        />

        {/* Month */}
        <div className="relative flex-1">
          <select
            value={month}
            onChange={e => handleMonthChange(e.target.value)}
            className="input appearance-none pr-8 cursor-pointer"
          >
            {DSA_MONTHS.map(m => (
              <option key={m.index} value={m.index}>
                {m.name}
              </option>
            ))}
          </select>
          <ChevronDown size={14} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
        </div>

        {/* Year */}
        <div className="flex items-center gap-1">
          <input
            type="number"
            value={year}
            onChange={e => { setYear(e.target.value); handleChange(day, month, e.target.value) }}
            className="input w-24 text-center"
            placeholder="Jahr"
          />
          <span className="text-slate-400 text-sm whitespace-nowrap">BF</span>
        </div>
      </div>

      {/* Weekday display */}
      {weekday && (
        <p className="text-xs text-slate-500 flex items-center gap-1">
          <span className="text-brand-400">⚔</span>
          {weekday}, {day}. {selectedMonth?.name} {year} BF
        </p>
      )}
    </div>
  )
}

/**
 * Compact inline display of a DSA date
 */
export function DsaDateBadge({ date, className = '' }: { date: DsaDate; className?: string }) {
  const month = DSA_MONTHS[date.month]
  const weekday = getDsaWeekday(date)
  return (
    <span className={`inline-flex items-center gap-1.5 text-sm text-slate-300 ${className}`}>
      <span className="text-brand-400 text-xs">⚔</span>
      <span title={weekday}>{date.day}. {month?.name} {date.year} BF</span>
    </span>
  )
}
