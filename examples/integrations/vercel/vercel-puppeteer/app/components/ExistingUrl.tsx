import React from 'react';
import Image from 'next/image';

interface ExistingUrlProps {
  onSelect: (url: string) => void;
}

// Move example URLs outside component to prevent recreation on each render
const EXAMPLE_URLS = [
  {
    url: 'https://docs.browserbase.com',
    title: 'Browserbase',
    icon: (
      <svg width="16" height="16" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className="mr-2">
        <path d="M0 0H100V100H0V0Z" fill="#F03603"/>
        <path d="M36 72.2222V27.7778H51.2381C57.5873 27.7778 62.6667 32.8571 62.6667 39.2063V41.746C62.6667 44.6667 61.5873 47.3968 59.7461 49.3651C62.2858 51.4603 63.9366 54.6349 63.9366 58.254V60.7936C63.9366 67.1428 58.8572 72.2222 52.508 72.2222H36ZM42.3493 65.873H52.508C55.3651 65.873 57.5873 63.6508 57.5873 60.7936V58.254C57.5873 55.3968 55.3651 53.1746 52.508 53.1746H42.3493V65.873ZM42.3493 46.8254H51.2381C54.0953 46.8254 56.3175 44.6032 56.3175 41.746V39.2063C56.3175 36.3492 54.0953 34.127 51.2381 34.127H42.3493V46.8254Z" fill="white"/>
      </svg>
    ),
  },
  {
    url: 'https://docs.stagehand.dev',
    title: 'Stagehand',
    icon: <Image src="/stagehand.png" alt="Stagehand" width={11} height={11} className="mr-2" />,
  },
  {
    url: 'https://nextjs.org/docs',
    title: 'Next.js',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 180 180" width="18" className="mr-2">
        <mask id="nextjs-mask" maskUnits="userSpaceOnUse" width="180" height="180" x="0" y="0" style={{ maskType: "alpha" }}>
          <circle cx="90" cy="90" r="90" fill="black" />
        </mask>
        <g mask="url(#nextjs-mask)">
          <circle cx="90" cy="90" r="90" data-circle="true" fill="black" />
          <path d="M149.508 157.52L69.142 54H54V125.97H66.1136V69.3836L139.999 164.845C143.333 162.614 146.509 160.165 149.508 157.52Z" fill="url(#nextjs-gradient1)" />
          <rect fill="url(#nextjs-gradient2)" height="72" width="12" x="115" y="54" />
        </g>
        <defs>
          <linearGradient id="nextjs-gradient1" gradientUnits="userSpaceOnUse" x1="109" x2="144.5" y1="116.5" y2="160.5">
            <stop stopColor="white" />
            <stop offset="1" stopColor="white" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="nextjs-gradient2" gradientUnits="userSpaceOnUse" x1="121" x2="120.799" y1="54" y2="106.875">
            <stop stopColor="white" />
            <stop offset="1" stopColor="white" stopOpacity="0" />
          </linearGradient>
        </defs>
      </svg>
    ),
  },
] as const;

const ExistingUrl: React.FC<ExistingUrlProps> = ({ onSelect }) => (
  <div className="flex flex-col sm:flex-row items-start sm:items-center w-full">
    <p className="hidden sm:block text-sm text-foreground/60 whitespace-nowrap mr-2">Try a Document URL:</p>
    
    <div className="flex gap-2 w-full">
      {EXAMPLE_URLS.map(({ url, title, icon }) => (
        <button
          key={url}
          onClick={() => onSelect(url)}
          className="px-1.5 py-1.5 text-xs bg-foreground/5 hover:bg-foreground/10 transition-colors flex flex-row items-center justify-center border hover:background/20 flex-1"
        >
          {icon}
          {title}
        </button>
      ))}
    </div>
  </div>
);

export default ExistingUrl;
