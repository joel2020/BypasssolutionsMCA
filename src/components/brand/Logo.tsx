import { useId } from 'react';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg';
  variant?: 'full' | 'icon';
  className?: string;
  inverse?: boolean;
}

const fullSizeClasses = {
  sm: 'w-[150px]',
  md: 'w-[190px]',
  lg: 'w-[280px]',
};

const iconSizeClasses = {
  sm: 'h-8 w-8',
  md: 'h-10 w-10',
  lg: 'h-14 w-14',
};

function MarkPaths({ gradientId, slashId, inverse = false }: { gradientId: string; slashId: string; inverse?: boolean }) {
  return (
    <>
      <defs>
        <linearGradient id={gradientId} x1="22" y1="18" x2="134" y2="142" gradientUnits="userSpaceOnUse">
          <stop stopColor="#2F8CFF" />
          <stop offset="0.52" stopColor="#0E5BE8" />
          <stop offset="1" stopColor="#062C86" />
        </linearGradient>
        <linearGradient id={slashId} x1="30" y1="124" x2="129" y2="48" gradientUnits="userSpaceOnUse">
          <stop stopColor={inverse ? '#F8FBFF' : '#001536'} />
          <stop offset="1" stopColor={inverse ? '#DBEAFF' : '#0B64D8'} />
        </linearGradient>
      </defs>
      <path
        fill={`url(#${gradientId})`}
        d="M25 18h78c27 0 45 17 45 41 0 17-8 30-22 37 17 7 27 21 27 40 0 25-19 42-48 42H25l20-31h57c13 0 21-7 21-18 0-12-8-19-22-19H69l20-31h13c11 0 18-6 18-16 0-9-7-15-18-15H60v29H25V18Z"
      />
      <path fill="#FFFFFF" d="M26 131 132 55 109 86 47 145 26 131Z" opacity="0.94" />
      <path fill={`url(#${slashId})`} d="M43 123 124 65 101 96 58 137 43 123Z" opacity="0.92" />
    </>
  );
}

function LogoMark({ inverse = false }: { inverse?: boolean }) {
  const id = useId().replace(/:/g, '');

  return (
    <svg viewBox="0 0 160 160" className="h-full w-full" aria-hidden="true" focusable="false">
      <MarkPaths gradientId={`bypass-mark-${id}`} slashId={`bypass-slash-${id}`} inverse={inverse} />
    </svg>
  );
}

function FullLogoSvg({ inverse = false }: { inverse?: boolean }) {
  const id = useId().replace(/:/g, '');
  const primary = inverse ? '#FFFFFF' : '#001536';
  const blue = '#0B64D8';
  const muted = inverse ? '#C8D2E2' : '#667085';
  const line = inverse ? '#2F8CFF' : '#0B64D8';

  return (
    <svg viewBox="0 0 760 178" className="h-auto w-full" role="img" aria-label="Bypass Solution">
      <g transform="translate(0 0)">
        <MarkPaths gradientId={`bypass-full-mark-${id}`} slashId={`bypass-full-slash-${id}`} inverse={inverse} />
      </g>
      <text
        x="190"
        y="79"
        fill={primary}
        fontFamily="Inter, Arial, Helvetica, sans-serif"
        fontSize="78"
        fontWeight="800"
        letterSpacing="12"
      >
        BYPASS
      </text>
      <line x1="194" y1="116" x2="260" y2="116" stroke={line} strokeWidth="5" />
      <text
        x="289"
        y="125"
        fill={blue}
        fontFamily="Inter, Arial, Helvetica, sans-serif"
        fontSize="28"
        fontWeight="700"
        letterSpacing="23"
      >
        SOLUTION
      </text>
      <line x1="625" y1="116" x2="696" y2="116" stroke={line} strokeWidth="5" />
      <text
        x="194"
        y="160"
        fill={muted}
        fontFamily="Inter, Arial, Helvetica, sans-serif"
        fontSize="18"
        fontWeight="600"
        letterSpacing="8"
      >
        WORKING CAPITAL. SMARTER. FASTER.
      </text>
    </svg>
  );
}

export default function Logo({ size = 'md', variant = 'full', className = '', inverse = false }: LogoProps) {
  if (variant === 'icon') {
    return (
      <span className={`inline-flex ${iconSizeClasses[size]} ${className}`} role="img" aria-label="Bypass Solution">
        <LogoMark inverse={inverse} />
      </span>
    );
  }

  return (
    <span className={`inline-flex ${fullSizeClasses[size]} ${className}`}>
      <FullLogoSvg inverse={inverse} />
    </span>
  );
}
