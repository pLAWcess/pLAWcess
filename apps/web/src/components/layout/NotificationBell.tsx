export default function NotificationBell() {
  return (
    <button
      className="relative w-9 h-9 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors"
      aria-label="알림"
    >
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
        <path d="M13.73 21a2 2 0 0 1-3.46 0" />
      </svg>
      <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-red-500" />
    </button>
  );
}
