import React from "react";

const drawings = {
  home: <><path d="m3 11 9-8 9 8" /><path d="M5.5 9.5V21h13V9.5M9 21v-6h6v6" /></>,
  workspace: <><rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="3" width="7" height="7" rx="1.5" /><rect x="3" y="14" width="7" height="7" rx="1.5" /><rect x="14" y="14" width="7" height="7" rx="1.5" /></>,
  orders: <><path d="M5 7h14l-1 14H6L5 7Z" /><path d="M9 8V5a3 3 0 0 1 6 0v3" /></>,
  users: <><circle cx="9" cy="8" r="3" /><path d="M3 20a6 6 0 0 1 12 0" /><path d="M16 5.5a3 3 0 0 1 0 5.8M16 14a5.5 5.5 0 0 1 5 5.5" /></>,
  message: <path d="M4 4h16v13H8l-4 4V4Z" />,
  product: <><path d="m8 4 4-2 4 2 5 3-3 5v9H6v-9L3 7l5-3Z" /><path d="M9 4a3 3 0 0 0 6 0" /></>,
  categories: <><rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="3" width="7" height="7" rx="1.5" /><rect x="3" y="14" width="7" height="7" rx="1.5" /><rect x="14" y="14" width="7" height="7" rx="1.5" /></>,
  inventory: <><path d="M4 7h16v14H4V7Z" /><path d="M3 3h18v4H3V3ZM9 11h6" /></>,
  purchase: <><path d="M12 3v12M7 10l5 5 5-5" /><path d="M4 20h16" /></>,
  employees: <><circle cx="9" cy="8" r="3" /><path d="M3 20a6 6 0 0 1 12 0M18 8v6M15 11h6" /></>,
  accounts: <><path d="M12 3 5 6v5c0 4.7 2.8 8.1 7 10 4.2-1.9 7-5.3 7-10V6l-7-3Z" /><path d="m9 12 2 2 4-4" /></>,
  external: <><path d="M14 4h6v6M20 4l-9 9" /><path d="M18 13v7H4V6h7" /></>,
  menu: <path d="M4 7h16M4 12h16M4 17h16" />,
  close: <path d="m6 6 12 12M18 6 6 18" />,
  bell: <><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" /><path d="M10 21h4" /></>,
  chevronDown: <path d="m8 10 4 4 4-4" />,
  arrowRight: <path d="M5 12h14M14 7l5 5-5 5" />,
};

export default function OpsIcon({ name, size = 18, className = "" }) {
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {drawings[name]}
    </svg>
  );
}
