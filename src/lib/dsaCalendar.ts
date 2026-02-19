/**
 * DSA Zwölfgöttliche Zeitrechnung (Jahreswechsel-Methode)
 * 
 * Kalenderstruktur:
 * - 12 Monate à 30 Tage = 360 Tage
 * - 5 Namenlose Tage am Ende des Jahres
 * - Gesamt: 365 Tage pro Jahr
 * - Zeitrechnung: nach Bosparans Fall (BF)
 * 
 * Wochentage (laufen ununterbrochen durch, unabhängig von Monaten):
 * Windstag, Erdstag, Markttag, Praiostag, Rohalstag, Feuertag, Wassertag
 */

export const DSA_MONTHS = [
  { index: 0, name: 'Praios',     short: 'PRA', days: 30 },
  { index: 1, name: 'Rondra',     short: 'RON', days: 30 },
  { index: 2, name: 'Efferd',     short: 'EFF', days: 30 },
  { index: 3, name: 'Travia',     short: 'TRA', days: 30 },
  { index: 4, name: 'Boron',      short: 'BOR', days: 30 },
  { index: 5, name: 'Hesinde',    short: 'HES', days: 30 },
  { index: 6, name: 'Firun',      short: 'FIR', days: 30 },
  { index: 7, name: 'Tsa',        short: 'TSA', days: 30 },
  { index: 8, name: 'Phex',       short: 'PHE', days: 30 },
  { index: 9, name: 'Peraine',    short: 'PER', days: 30 },
  { index: 10, name: 'Ingerimm',  short: 'ING', days: 30 },
  { index: 11, name: 'Rahja',     short: 'RAH', days: 30 },
  { index: 12, name: 'Namenlose Tage', short: 'NL', days: 5 },
] as const

export const DSA_WEEKDAYS = [
  'Windstag',
  'Erdstag',
  'Markttag',
  'Praiostag',
  'Rohalstag',
  'Feuertag',
  'Wassertag',
] as const

export type DsaMonthIndex = 0|1|2|3|4|5|6|7|8|9|10|11|12

export interface DsaDate {
  day: number        // 1-30 (or 1-5 for Namenlose Tage)
  month: DsaMonthIndex // 0-12
  year: number       // BF year (e.g. 1049)
}

/**
 * Parse a DSA date string like "15. Praios 1049 BF" or "3. NL 1049 BF"
 * Also handles just year "1049 BF"
 */
export function parseDsaDate(str: string): DsaDate | null {
  if (!str || !str.trim()) return null

  // Full date: "15. Praios 1049 BF" or "15. PRA 1049 BF"
  const fullMatch = str.match(/^(\d+)\.\s*([A-Za-züäöÄÖÜ\s]+?)\s+(-?\d+)\s*(?:BF)?$/i)
  if (fullMatch) {
    const day = parseInt(fullMatch[1])
    const monthStr = fullMatch[2].trim()
    const year = parseInt(fullMatch[3])
    const monthRaw = DSA_MONTHS.findIndex(m => 
      m.name.toLowerCase() === monthStr.toLowerCase() ||
      m.short.toLowerCase() === monthStr.toLowerCase()
    )
    if (monthRaw === -1) return null
    const month = monthRaw as DsaMonthIndex
    const maxDay = DSA_MONTHS[month].days
    if (day < 1 || day > maxDay) return null
    return { day, month, year }
  }

  // Year only: "1049 BF" or "1049"
  const yearMatch = str.match(/^(-?\d+)\s*(?:BF)?$/)
  if (yearMatch) {
    return { day: 1, month: 0, year: parseInt(yearMatch[1]) }
  }

  return null
}

/**
 * Format a DSA date to string
 */
export function formatDsaDate(date: DsaDate, options?: { 
  showWeekday?: boolean
  short?: boolean 
}): string {
  const month = DSA_MONTHS[date.month]
  if (!month) return ''
  
  const monthName = options?.short ? month.short : month.name
  
  if (date.month === 12) {
    // Namenlose Tage
    return options?.short 
      ? `${date.day}. NL ${date.year} BF`
      : `${date.day}. Namenloser Tag ${date.year} BF`
  }
  
  return `${date.day}. ${monthName} ${date.year} BF`
}

/**
 * Convert DsaDate to a sortable number (day-of-year based)
 * Used for timeline sorting
 */
export function dsaDateToSortKey(date: DsaDate): number {
  const dayOfYear = date.month * 30 + date.day
  return date.year * 400 + dayOfYear
}

/**
 * Compare two DSA dates. Returns negative if a < b, 0 if equal, positive if a > b
 */
export function compareDsaDates(a: DsaDate, b: DsaDate): number {
  return dsaDateToSortKey(a) - dsaDateToSortKey(b)
}

/**
 * Get the day of year (1-365) for a DSA date
 */
export function dsaDayOfYear(date: DsaDate): number {
  return date.month * 30 + date.day
}

/**
 * Get weekday name for a DSA date
 * The DSA week runs continuously. Reference: 1. Praios 0 BF = Windstag (day 0 of week)
 * Total days from epoch = year * 365 + dayOfYear - 1
 */
export function getDsaWeekday(date: DsaDate): string {
  const totalDays = date.year * 365 + dsaDayOfYear(date) - 1
  const weekdayIndex = ((totalDays % 7) + 7) % 7
  return DSA_WEEKDAYS[weekdayIndex]
}

/**
 * Serialize DsaDate to storage string: "YYYY-MM-DD" format (DSA internal)
 * Month is 0-indexed, stored as 0-12
 */
export function dsaDateToString(date: DsaDate): string {
  return `${date.year}|${date.month}|${date.day}`
}

/**
 * Deserialize from storage string
 */
export function dsaDateFromString(str: string): DsaDate | null {
  if (!str) return null
  const parts = str.split('|')
  if (parts.length !== 3) return null
  const year = parseInt(parts[0])
  const month = parseInt(parts[1]) as DsaMonthIndex
  const day = parseInt(parts[2])
  if (isNaN(year) || isNaN(month) || isNaN(day)) return null
  if (month < 0 || month > 12) return null
  return { year, month, day }
}

/**
 * Validate a DsaDate
 */
export function isValidDsaDate(date: DsaDate): boolean {
  if (date.month < 0 || date.month > 12) return false
  const maxDay = DSA_MONTHS[date.month].days
  if (date.day < 1 || date.day > maxDay) return false
  return true
}

/**
 * Get all months with their max days
 */
export function getDsaMonths() {
  return DSA_MONTHS
}

/**
 * Current default DSA year (campaign setting, configurable)
 * DSA 5 is set in ~1039-1049 BF. We default to 1039 BF as campaign start.
 */
export const DEFAULT_DSA_YEAR = 1039
