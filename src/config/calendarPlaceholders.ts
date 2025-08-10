// Local placeholders for planned/tentative items that should appear on the calendar
// even if they are not yet created in the backend.
//
// Tip: Use full ISO timestamps (YYYY-MM-DDTHH:mm:ss.sssZ) or at least YYYY-MM-DD.
// Example below includes one sample for the current month—replace or remove as needed.

export interface CalendarPlaceholder {
  id: string;           // unique id, e.g., 'placeholder-2025-08-orientation'
  title: string;        // short title
  eventDate: string;    // ISO date string
  venue?: string;       // optional
  href?: string;        // optional: external link if available
}

// SAMPLE: adjust dates/titles or clear the array to disable
export const calendarPlaceholders: CalendarPlaceholder[] = [
  // { id: 'placeholder-2025-08-20', title: 'Tentative CCIS Orientation', eventDate: '2025-08-20', venue: 'CCIS Main Hall' },
];
