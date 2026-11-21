const paths = {
  dashboard: 'M3 3h7v7H3z M14 3h7v7h-7z M3 14h7v7H3z M14 14h7v7h-7z',
  trips: 'M8 6V4h8v2 M4 7h16v14H4z M8 7v14 M16 7v14',
  destinations: 'M21 10c0 7-9 12-9 12S3 17 3 10a9 9 0 0 1 18 0Z M15 10a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z',
  bookings: 'M5 3h14v18l-3-2-4 2-4-2-3 2Z M9 8h6 M9 12h6',
  itinerary: 'M4 5h16v16H4z M8 3v4 M16 3v4 M4 10h16 M8 14h2 M14 14h2 M8 17h2',
  profiles: 'M16 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0Z M4 21v-2a8 8 0 0 1 16 0v2',
  admin: 'M4 20V10 M10 20V4 M16 20v-7 M22 20H2',
  arrow: 'M4 12h16 M14 6l6 6-6 6',
  plus: 'M12 5v14 M5 12h14',
};

export default function Icon({ name, size = 20 }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={paths[name] || paths.trips} /></svg>;
}
