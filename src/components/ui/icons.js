// Icônes en trait (style uniforme), décoratives par défaut
const Svg = ({ children, size = 20, strokeWidth = 2, className = "" }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={strokeWidth}
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
    className={className}
  >
    {children}
  </svg>
);

export const IconUser = (p) => <Svg {...p}><circle cx="12" cy="8" r="4" /><path d="M4 21c0-4 4-6 8-6s8 2 8 6" /></Svg>;
export const IconSearch = (p) => <Svg {...p}><circle cx="11" cy="11" r="7" /><path d="M20 20l-3.5-3.5" /></Svg>;
export const IconMap = (p) => <Svg {...p}><path d="M9 4L3 6v14l6-2 6 2 6-2V4l-6 2-6-2z" /><path d="M9 4v14M15 6v14" /></Svg>;
export const IconList = (p) => <Svg {...p}><path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" /></Svg>;
export const IconPlus = (p) => <Svg strokeWidth={2.5} {...p}><path d="M12 5v14M5 12h14" /></Svg>;
export const IconX = (p) => <Svg {...p}><path d="M6 6l12 12M18 6L6 18" /></Svg>;
export const IconCalendar = (p) => <Svg {...p}><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M3 10h18M8 3v4M16 3v4" /></Svg>;
export const IconPin = (p) => <Svg {...p}><path d="M12 21s-7-6.2-7-11a7 7 0 0114 0c0 4.8-7 11-7 11z" /><circle cx="12" cy="10" r="2.5" /></Svg>;
export const IconTag = (p) => <Svg {...p}><path d="M3 12V4h8l10 10-8 8L3 12z" /><circle cx="7.5" cy="7.5" r="1.5" /></Svg>;
export const IconEuro = (p) => <Svg {...p}><path d="M17 6.5A7 7 0 1017 17.5M4 10h9M4 14h9" /></Svg>;
export const IconBell = (p) => <Svg {...p}><path d="M6 16V11a6 6 0 0112 0v5l2 2H4l2-2zM10 21h4" /></Svg>;
export const IconRoute = (p) => <Svg {...p}><circle cx="6" cy="19" r="2" /><circle cx="18" cy="5" r="2" /><path d="M8 19h7a3.5 3.5 0 000-7H9a3.5 3.5 0 010-7h7" /></Svg>;
export const IconLogout = (p) => <Svg {...p}><path d="M15 4h4v16h-4M10 8l-4 4 4 4M6 12h10" /></Svg>;
export const IconBoule = (p) => <Svg {...p}><circle cx="12" cy="12" r="8" /><path d="M4.5 9.5c5 2 10 2 15 0M4.5 14.5c5-2 10-2 15 0" /></Svg>;
