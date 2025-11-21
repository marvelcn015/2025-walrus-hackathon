/**
 * Period Calculator Utility
 *
 * Generates monthly sub-periods from a deal's start date.
 * Each period represents one calendar month:
 * - First period: start date -> end of that month
 * - Subsequent periods: first day of month -> last day of month
 */

export interface SubPeriod {
  periodId: string;
  name: string;
  startDate: string; // ISO date string (YYYY-MM-DD)
  endDate: string; // ISO date string (YYYY-MM-DD)
  periodIndex: number;
}

/**
 * Generate sub-periods from a start date to the current date (or specified end date)
 *
 * @param startDateMs - Start date in milliseconds (from Deal.start_date)
 * @param endDateMs - Optional end date in milliseconds. Defaults to current time.
 * @returns Array of sub-periods
 */
export function generateSubPeriods(
  startDateMs: number,
  endDateMs?: number
): SubPeriod[] {
  if (!startDateMs || startDateMs <= 0) {
    return [];
  }

  const periods: SubPeriod[] = [];
  const startDate = new Date(startDateMs);
  const endDate = endDateMs ? new Date(endDateMs) : new Date();

  // Start from the first day of the start month
  let currentDate = new Date(startDate);
  let periodIndex = 0;

  while (currentDate <= endDate) {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    // Period start: either the deal start date (for first period) or first of month
    const periodStart =
      periodIndex === 0
        ? startDate
        : new Date(year, month, 1);

    // Period end: last day of the month
    const periodEnd = new Date(year, month + 1, 0);

    // Only include periods that have started
    if (periodStart <= endDate) {
      const monthNames = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'
      ];

      periods.push({
        periodId: `period_${year}_${String(month + 1).padStart(2, '0')}`,
        name: `${monthNames[month]} ${year}`,
        startDate: formatDate(periodStart),
        endDate: formatDate(periodEnd),
        periodIndex,
      });
    }

    // Move to next month
    currentDate = new Date(year, month + 1, 1);
    periodIndex++;

    // Safety limit: max 120 months (10 years)
    if (periodIndex > 120) {
      break;
    }
  }

  return periods;
}

/**
 * Format a Date object as YYYY-MM-DD string
 */
function formatDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Get period by ID from generated periods
 */
export function findPeriodById(
  periods: SubPeriod[],
  periodId: string
): SubPeriod | undefined {
  return periods.find((p) => p.periodId === periodId);
}

/**
 * Get period by index from generated periods
 */
export function findPeriodByIndex(
  periods: SubPeriod[],
  index: number
): SubPeriod | undefined {
  return periods.find((p) => p.periodIndex === index);
}

/**
 * Check if a date falls within a period
 */
export function isDateInPeriod(
  dateMs: number,
  period: SubPeriod
): boolean {
  const date = new Date(dateMs);
  const start = new Date(period.startDate);
  const end = new Date(period.endDate);
  end.setHours(23, 59, 59, 999); // Include the entire end day

  return date >= start && date <= end;
}
