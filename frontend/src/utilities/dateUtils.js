/**
 * Helper function to parse and validate date inputs.
 * This MUST be in the same file as the formatters below.
 */
const parseValidDate = (dateInput) => {
  if (!dateInput) return null;

  let date = dateInput;

  if (typeof dateInput === 'string' && dateInput.includes('T')) {
    const hasTimezone = /(Z|[+-]\d{2}:?\d{2})$/i.test(dateInput);
    if (!hasTimezone) {
      date = `${dateInput}Z`;
    }
  }

  const parsedDate = new Date(date);
  return isNaN(parsedDate.getTime()) ? null : parsedDate;
};

/**
 * Detects the browser's timezone (e.g., 'Asia/Kolkata', 'America/New_York')
 */
export const getUserTimezone = () => {
  return Intl.DateTimeFormat().resolvedOptions().timeZone;
};

/**
 * Formats to User's Local Time (Dynamic)
 */
export const formatToLocalTime = (dateInput) => {
  try {
    const validDate = parseValidDate(dateInput); // This is where the error was!
    if (!validDate) return "Unknown";

    return validDate.toLocaleString('en-US', {
      timeZone: getUserTimezone(),
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  } catch (error) {
    console.error("Error formatting time:", error);
    return "Unknown";
  }
};

/**
 * Formats to User's Local Date and Time (Dynamic)
 */
export const formatDateTimeToLocal = (dateInput) => {
  try {
    const validDate = parseValidDate(dateInput);
    if (!validDate) return "Unknown";

    return validDate.toLocaleString('en-US', {
      timeZone: getUserTimezone(),
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  } catch (error) {
    console.error("Error formatting datetime:", error);
    return "Unknown";
  }
};

/**
 * True if the given timestamps don't all fall on the same local calendar day.
 * Used to decide whether a trend chart needs date+time labels (7d/24h-crossing-midnight)
 * or time-only is unambiguous (1h/6h within a single day).
 */
export const spansMultipleDays = (dateInputs) => {
  const days = new Set();
  for (const input of (dateInputs || [])) {
    const validDate = parseValidDate(input);
    if (!validDate) continue;
    days.add(validDate.toLocaleDateString('en-US', { timeZone: getUserTimezone() }));
    if (days.size > 1) return true;
  }
  return false;
};

/**
 * Chart axis / tooltip label: time-only when every point is the same local day,
 * date+time when the series spans multiple days, so multi-day ranges aren't ambiguous.
 */
export const formatChartTimeLabel = (dateInput, multiDay) => {
  return multiDay ? formatDateTimeToLocal(dateInput) : formatToLocalTime(dateInput);
};