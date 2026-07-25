/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';

interface DivaLogoProps {
  variant?: 'full' | 'icon';
  className?: string;
  size?: number | string; // Height of the logo
}

/**
 * DivaLogo component
 * Represents the official "Diva Kencana Borneo" Brand Logo
 */
export default function DivaLogo({ 
  variant = 'full', 
  className = '', 
  size = 40 
}: DivaLogoProps) {
  const brandGreen = "#547B4C";

  if (variant === 'icon') {
    return (
      <svg
        id="diva-logo-icon"
        viewBox="0 0 160 160"
        className={className}
        style={{ height: size, width: 'auto' }}
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Left circular crescent brand ring */}
        <path 
          d="M 80 8 A 72 72 0 0 0 80 152" 
          stroke={brandGreen} 
          strokeWidth="15" 
          strokeLinecap="butt" 
        />
        {/* Central main background circle */}
        <circle cx="80" cy="80" r="58" fill={brandGreen} />
        {/* Concentric white decorative border */}
        <circle cx="80" cy="80" r="48" stroke="#FFFFFF" strokeWidth="5" fill="none" />
        {/* Character D styled vector */}
        <text 
          x="80" 
          y="102" 
          fontFamily="'Inter', 'Arial Black', sans-serif" 
          fontWeight="950" 
          fontSize="66" 
          fill="#FFFFFF" 
          textAnchor="middle"
        >
          D
        </text>
      </svg>
    );
  }

  // Full variant (includes the customized branding labels)
  return (
    <svg
      id="diva-logo-full"
      viewBox="0 0 520 160"
      className={className}
      style={{ height: size, width: 'auto' }}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Left circular crescent brand ring */}
      <path 
        d="M 80 8 A 72 72 0 0 0 80 152" 
        stroke={brandGreen} 
        strokeWidth="15" 
        strokeLinecap="butt" 
      />
      {/* Central main background circle */}
      <circle cx="80" cy="80" r="58" fill={brandGreen} />
      {/* Concentric white decorative border */}
      <circle cx="80" cy="80" r="48" stroke="#FFFFFF" strokeWidth="5" fill="none" />
      {/* Character D styled vector */}
      <text 
        x="80" 
        y="102" 
        fontFamily="'Inter', 'Arial Black', sans-serif" 
        fontWeight="950" 
        fontSize="66" 
        fill="#FFFFFF" 
        textAnchor="middle"
      >
        D
      </text>

      {/* Brand Typography labels in lowercase matching user's logo precisely */}
      <g 
        fill={brandGreen} 
        fontFamily="'Inter', 'Outfit', 'Helvetica Neue', sans-serif" 
        fontWeight="800" 
        fontSize="48" 
        letterSpacing="-1.5px"
      >
        <text x="175" y="55">diva</text>
        <text x="175" y="98">kencana</text>
        <text x="175" y="141">borneo</text>
      </g>
    </svg>
  );
}
