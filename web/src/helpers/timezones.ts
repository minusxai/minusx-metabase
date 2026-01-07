import { DateTime } from 'luxon';
import cronstrue from 'cronstrue';

export interface TimezoneOption {
  value: string;  // IANA timezone identifier
  label: string;  // Display label
  group: string;  // Group for categorization
}

// Priority US timezones + international
export const TIMEZONE_OPTIONS: TimezoneOption[] = [
  // US Priority
  { value: 'America/New_York', label: 'Eastern Time (ET)', group: 'US' },
  { value: 'America/Chicago', label: 'Central Time (CT)', group: 'US' },
  { value: 'America/Denver', label: 'Mountain Time (MT)', group: 'US' },
  { value: 'America/Los_Angeles', label: 'Pacific Time (PT)', group: 'US' },
  { value: 'America/Phoenix', label: 'Arizona (MST)', group: 'US' },
  { value: 'America/Anchorage', label: 'Alaska Time (AKT)', group: 'US' },
  { value: 'Pacific/Honolulu', label: 'Hawaii Time (HST)', group: 'US' },

  // International
  { value: 'UTC', label: 'UTC (Coordinated Universal Time)', group: 'International' },
  { value: 'Europe/London', label: 'London (GMT/BST)', group: 'International' },
  { value: 'Europe/Paris', label: 'Paris (CET/CEST)', group: 'International' },
  { value: 'Asia/Tokyo', label: 'Tokyo (JST)', group: 'International' },
  { value: 'Asia/Shanghai', label: 'Shanghai (CST)', group: 'International' },
  { value: 'Asia/Kolkata', label: 'Kolkata (IST)', group: 'International' },
  { value: 'Australia/Sydney', label: 'Sydney (AEDT/AEST)', group: 'International' },
];

/**
 * Format ISO timestamp in specified timezone
 */
export const formatTimestampInTimezone = (
  isoTimestamp: string,
  timezone: string = 'UTC',
  format: string = 'MMM dd, yyyy h:mm a'
): string => {
  try {
    return DateTime.fromISO(isoTimestamp)
      .setZone(timezone)
      .toFormat(format);
  } catch {
    return new Date(isoTimestamp).toLocaleString();
  }
};

/**
 * Validate cron expression (basic validation)
 */
export const validateCronExpression = (cron: string): { valid: boolean; error?: string } => {
  if (!cron || cron.trim() === '') {
    return { valid: false, error: 'Cron expression cannot be empty' };
  }

  const parts = cron.trim().split(/\s+/);

  // Standard cron has 5 parts (minute hour day month weekday)
  if (parts.length !== 5) {
    return {
      valid: false,
      error: 'Cron expression must have 5 parts: minute hour day month weekday'
    };
  }

  // Basic validation - check each part
  const validParts = parts.every((part, index) => {
    // Allow *, numbers, ranges (1-5), lists (1,2,3), steps (*/5)
    const pattern = /^(\*|[0-9]+|[0-9]+-[0-9]+|[0-9]+(,[0-9]+)*|\*\/[0-9]+)$/;
    return pattern.test(part);
  });

  if (!validParts) {
    return { valid: false, error: 'Invalid cron expression format' };
  }

  // Try to parse with cronstrue for additional validation
  try {
    cronstrue.toString(cron);
    return { valid: true };
  } catch (error) {
    return {
      valid: false,
      error: error instanceof Error ? error.message : 'Invalid cron expression'
    };
  }
};
