import React from 'react';

export const Logo = ({ className = "w-12 h-12" }: { className?: string }) => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    viewBox="0 0 200 200" 
    fill="none" 
    className={className}
  >
    <defs>
      <linearGradient id="neonIndigo" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#818CF8" />
        <stop offset="100%" stopColor="#4F46E5" />
      </linearGradient>
      <linearGradient id="neonEmerald" x1="100%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stopColor="#34D399" />
        <stop offset="100%" stopColor="#10B981" />
      </linearGradient>
      <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
        <feGaussianBlur stdDeviation="8" result="blur" />
        <feComposite in="SourceGraphic" in2="blur" operator="over" />
      </filter>
    </defs>
    
    {/* Abstract Obelisk Structure */}
    <path 
      d="M100 20 L140 160 L100 180 L60 160 Z" 
      fill="url(#neonIndigo)" 
      opacity="0.8" 
      style={{ filter: 'drop-shadow(0px 0px 15px rgba(79,70,229,0.5))' }}
    />
    
    <path 
      d="M100 20 L140 160 L100 180 Z" 
      fill="url(#neonEmerald)" 
      opacity="0.6" 
      style={{ mixBlendMode: 'overlay' }}
    />
    
    <path 
      d="M100 20 L60 160 L100 180 Z" 
      fill="#ffffff" 
      opacity="0.1" 
    />
    
    {/* Tech accents */}
    <circle cx="100" cy="40" r="4" fill="#ffffff" filter="url(#glow)" />
    <circle cx="100" cy="180" r="4" fill="#10B981" filter="url(#glow)" />
    <path d="M100 180 L100 200" stroke="#10B981" strokeWidth="2" strokeDasharray="4 4" />
  </svg>
);
