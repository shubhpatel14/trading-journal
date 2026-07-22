import React from 'react';

interface BrandLogoProps {
  size?: number; // Size in pixels
  className?: string;
  showText?: boolean;
}

export default function BrandLogo({ size = 44, className = '', showText = true }: BrandLogoProps) {
  return (
    <div className={`flex items-center gap-3 group cursor-pointer ${className}`}>
      {/* Animated Orb Container with Glow */}
      <div 
        className="relative flex items-center justify-center transition-transform duration-300 ease-out group-hover:scale-105"
        style={{ width: size, height: size }}
      >
        {/* Ambient Pulsing Glow behind logo */}
        <div 
          className="absolute inset-0 rounded-full bg-gradient-to-br from-sky-400 via-blue-500 to-purple-600 opacity-60 blur-md animate-pulse group-hover:opacity-90 group-hover:blur-lg transition-all duration-500" 
        />

        {/* Vector SVG Logo */}
        <svg 
          width={size} 
          height={size} 
          viewBox="0 0 100 100" 
          fill="none" 
          xmlns="http://www.w3.org/2000/svg"
          className="relative z-10 drop-shadow-md transition-transform duration-500 ease-in-out group-hover:rotate-[3deg]"
        >
          <defs>
            <style>{`
              @keyframes t-float-glow {
                0%, 100% {
                  transform: translateY(0px) scale(1);
                  opacity: 0.96;
                }
                50% {
                  transform: translateY(-2.2px) scale(1.02);
                  opacity: 1;
                }
              }
              @keyframes t-hover-bounce {
                0% {
                  transform: translateY(0px) scale(1);
                  filter: drop-shadow(0 0 2px rgba(255, 255, 255, 0.6));
                }
                100% {
                  transform: translateY(-3.5px) scale(1.04);
                  filter: drop-shadow(0 0 8px rgba(255, 255, 255, 0.95));
                }
              }
              .tf-animated-t {
                animation: t-float-glow 3.2s ease-in-out infinite;
                transform-origin: 50% 50%;
                transition: all 0.3s ease;
              }
              .group:hover .tf-animated-t {
                animation: t-hover-bounce 0.9s ease-in-out infinite alternate;
              }
            `}</style>

            {/* Primary Gradient (Cyan -> Vibrant Blue -> Deep Purple) */}
            <linearGradient id="tf-brand-gradient" x1="10%" y1="10%" x2="90%" y2="90%">
              <stop offset="0%" stopColor="#38BDF8" />
              <stop offset="45%" stopColor="#2563EB" />
              <stop offset="100%" stopColor="#7C3AED" />
            </linearGradient>

            {/* Shimmer Overlay Gradient */}
            <linearGradient id="tf-shimmer-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.3" />
              <stop offset="50%" stopColor="#FFFFFF" stopOpacity="0" />
              <stop offset="100%" stopColor="#000000" stopOpacity="0.15" />
            </linearGradient>

            {/* Subtle Drop Shadow for TF Monogram */}
            <filter id="tf-shadow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="1.5" dy="3" stdDeviation="2.5" floodColor="#0F172A" floodOpacity="0.25" />
            </filter>
          </defs>

          {/* Background Circle */}
          <circle cx="50" cy="50" r="46" fill="url(#tf-brand-gradient)" />
          <circle cx="50" cy="50" r="46" fill="url(#tf-shimmer-gradient)" />

          {/* Inner Monogram "TF" */}
          <g filter="url(#tf-shadow)">
            {/* Animated Slanted "T" Top Bar & Diagonal Stem */}
            <path 
              className="tf-animated-t"
              d="M 28 29 
                 C 26.5 29 25.5 30 26 31.5 
                 L 27.5 36.5 
                 C 28 38 29.2 39 30.5 39 
                 L 44.5 39 
                 L 34.5 67 
                 C 33.8 69 34.8 71 36.8 71 
                 L 43.5 71 
                 C 45.2 71 46.5 69.8 47.2 68 
                 L 57 39 
                 L 70.5 39 
                 C 72 39 73 38 72.5 36.5 
                 L 71 31.5 
                 C 70.5 30 69.2 29 67.8 29 
                 Z" 
              fill="#FFFFFF" 
            />

            {/* "F" Middle Horizontal Bar */}
            <path 
              d="M 47.5 48 
                 C 46.2 48 45.2 49 45.5 50.3 
                 L 46.5 54.5 
                 C 46.8 55.8 48 57 49.3 57 
                 L 66 57 
                 C 67.8 57 69 55.8 69.5 54 
                 L 70.2 51 
                 C 70.5 49.5 69.5 48 67.8 48 
                 Z" 
              fill="#FFFFFF"
              fillOpacity="0.9"
            />
          </g>
        </svg>
      </div>

      {/* Brand Title text (Optional) */}
      {showText && (
        <div>
          <span className="font-display font-black tracking-tight text-clay-foreground text-sm block leading-none group-hover:text-purple-600 transition-colors">
            TradeForge
          </span>
          <span className="text-4xs font-bold text-clay-muted font-mono uppercase tracking-wide block mt-0.5">
            Turn Data To Discipline
          </span>
        </div>
      )}
    </div>
  );
}
