import type { SVGProps } from 'react'

export type IconName =
  | 'arrow'
  | 'back'
  | 'book'
  | 'check'
  | 'grownups'
  | 'grip'
  | 'home'
  | 'journal'
  | 'letters'
  | 'lock'
  | 'mix'
  | 'photos'
  | 'play'
  | 'record'
  | 'reset'
  | 'settings'
  | 'songs'
  | 'sprout'
  | 'stop'
  | 'talk'
  | 'up'
  | 'down'
  | 'wave'

interface IconProps extends Omit<SVGProps<SVGSVGElement>, 'name'> {
  name: IconName
  size?: number
}

/** A small, consistent icon set for app chrome. Phrase imagery stays expressive. */
export default function Icon({ name, size = 24, ...props }: IconProps) {
  const common = {
    width: size,
    height: size,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.9,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    'aria-hidden': true,
    focusable: false,
    ...props,
  }

  switch (name) {
    case 'grip':
      return (
        <svg {...common}>
          <circle cx="8" cy="6" r="1" fill="currentColor" stroke="none" />
          <circle cx="16" cy="6" r="1" fill="currentColor" stroke="none" />
          <circle cx="8" cy="12" r="1" fill="currentColor" stroke="none" />
          <circle cx="16" cy="12" r="1" fill="currentColor" stroke="none" />
          <circle cx="8" cy="18" r="1" fill="currentColor" stroke="none" />
          <circle cx="16" cy="18" r="1" fill="currentColor" stroke="none" />
        </svg>
      )
    case 'up':
      return (
        <svg {...common}>
          <path d="m6 14 6-6 6 6" />
        </svg>
      )
    case 'down':
      return (
        <svg {...common}>
          <path d="m6 10 6 6 6-6" />
        </svg>
      )
    case 'arrow':
      return (
        <svg {...common}>
          <path d="M5 12h13M13 7l5 5-5 5" />
        </svg>
      )
    case 'back':
      return (
        <svg {...common}>
          <path d="m15 18-6-6 6-6" />
        </svg>
      )
    case 'home':
      return (
        <svg {...common}>
          <path d="m3 10 9-7 9 7" />
          <path d="M5 9v11h14V9M9 20v-6h6v6" />
        </svg>
      )
    case 'talk':
      return (
        <svg {...common}>
          <path d="M20 14a4 4 0 0 1-4 4H9l-5 3v-6a6 6 0 0 1-1-3.3V8a5 5 0 0 1 5-5h8a5 5 0 0 1 5 5v3" />
          <path d="M8 9h8M8 13h5" />
        </svg>
      )
    case 'mix':
      return (
        <svg {...common}>
          <path d="M8 3v4H4a1 1 0 0 0-1 1v4h3a2 2 0 1 1 0 4H3v4a1 1 0 0 0 1 1h5v-3a2 2 0 1 1 4 0v3h4a1 1 0 0 0 1-1v-5h3a2 2 0 1 0 0-4h-3V8a1 1 0 0 0-1-1h-5V3a2 2 0 1 0-4 0Z" />
        </svg>
      )
    case 'letters':
      return (
        <svg {...common}>
          <path d="m4 19 4.5-14L13 19M5.7 14h5.6" />
          <path d="M15 9h3.5a2.5 2.5 0 0 1 0 5H15V9Zm0 5h4a2.5 2.5 0 0 1 0 5h-4v-5Z" />
        </svg>
      )
    case 'songs':
      return (
        <svg {...common}>
          <path d="M9 18V5l11-2v13" />
          <ellipse cx="6.5" cy="18.5" rx="2.5" ry="2" />
          <ellipse cx="17.5" cy="16.5" rx="2.5" ry="2" />
          <path d="M9 9l11-2" />
        </svg>
      )
    case 'photos':
      return (
        <svg {...common}>
          <rect x="3" y="5" width="18" height="15" rx="3" />
          <circle cx="9" cy="10" r="2" />
          <path d="m5 18 4.5-4 3 2.5 2.5-2 4 3.5" />
        </svg>
      )
    case 'grownups':
      return (
        <svg {...common}>
          <path d="m12 3 1.4 4.2L18 8.5l-3.7 2.7.1 4.6L12 14.3l-2.4 1.5.1-4.6L6 8.5l4.6-1.3L12 3Z" />
          <path d="M5 21c.5-3.1 3.3-5 7-5s6.5 1.9 7 5" />
        </svg>
      )
    case 'book':
      return (
        <svg {...common}>
          <path d="M4 5.5A3.5 3.5 0 0 1 7.5 2H12v18H7.5A3.5 3.5 0 0 0 4 23V5.5Z" />
          <path d="M20 5.5A3.5 3.5 0 0 0 16.5 2H12v18h4.5A3.5 3.5 0 0 1 20 23V5.5Z" />
        </svg>
      )
    case 'journal':
      return (
        <svg {...common}>
          <rect x="5" y="3" width="15" height="18" rx="2" />
          <path d="M9 3v18M2.5 7H7M2.5 12H7M2.5 17H7M12 8h5M12 12h5" />
        </svg>
      )
    case 'settings':
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="3" />
          <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-2.8 2.8-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.6v.2h-4V21a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1L4.2 17l.1-.1a1.7 1.7 0 0 0 .3-1.9A1.7 1.7 0 0 0 3 14H2.8v-4H3a1.7 1.7 0 0 0 1.6-1 1.7 1.7 0 0 0-.3-1.9L4.2 7 7 4.2l.1.1a1.7 1.7 0 0 0 1.9.3A1.7 1.7 0 0 0 10 3V2.8h4V3a1.7 1.7 0 0 0 1 1.6 1.7 1.7 0 0 0 1.9-.3l.1-.1L19.8 7l-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.6 1h.2v4H21a1.7 1.7 0 0 0-1.6 1Z" />
        </svg>
      )
    case 'record':
      return (
        <svg {...common}>
          <rect x="9" y="3" width="6" height="11" rx="3" />
          <path d="M6 11a6 6 0 0 0 12 0M12 17v4M9 21h6" />
        </svg>
      )
    case 'play':
      return (
        <svg {...common} fill="currentColor" stroke="none">
          <path d="M8 5.4v13.2a1 1 0 0 0 1.55.83l9.4-6.6a1 1 0 0 0 0-1.66l-9.4-6.6A1 1 0 0 0 8 5.4Z" />
        </svg>
      )
    case 'stop':
      return (
        <svg {...common} fill="currentColor" stroke="none">
          <rect x="6" y="6" width="12" height="12" rx="2" />
        </svg>
      )
    case 'reset':
      return (
        <svg {...common}>
          <path d="M4 8V4m0 0h4M4 4l3 3a8 8 0 1 1-2 8" />
        </svg>
      )
    case 'lock':
      return (
        <svg {...common}>
          <rect x="5" y="10" width="14" height="11" rx="3" />
          <path d="M8 10V7a4 4 0 0 1 8 0v3M12 14v3" />
        </svg>
      )
    case 'check':
      return (
        <svg {...common}>
          <path d="m5 12 4 4L19 6" />
        </svg>
      )
    case 'wave':
      return (
        <svg {...common}>
          <path d="M4 14v-4M8 18V6M12 21V3M16 18V6M20 14v-4" />
        </svg>
      )
    case 'sprout':
      return (
        <svg {...common}>
          <path d="M12 21V10" />
          <path d="M12 13C8 13 5 10 5 6c4 0 7 2 7 7Z" />
          <path d="M12 10c0-4 3-7 7-7 0 4-3 7-7 7Z" />
          <path d="M7 21h10" />
        </svg>
      )
  }
}
