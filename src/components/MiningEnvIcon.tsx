/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';

export type MiningEnvIconType = 
  | 'emblem'
  | 'water-kpl'
  | 'surface-water'
  | 'rainfall'
  | 'reclamation'
  | 'tps-b3'
  | 'solid-waste'
  | 'compliance';

interface MiningEnvIconProps {
  type: MiningEnvIconType;
  size?: number;
  className?: string;
}

export default function MiningEnvIcon({
  type,
  size = 24,
  className = ''
}: MiningEnvIconProps) {
  const s = size;

  switch (type) {
    case 'emblem':
      // Open-pit terraced mountain + central reclamation sprout + settling pond water waves
      return (
        <svg
          width={s}
          height={s}
          viewBox="0 0 64 64"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className={className}
        >
          {/* Subtle Eco-Circle Shield */}
          <circle cx="32" cy="32" r="30" fill="#2E4B3D" fillOpacity="0.08" stroke="#3FA66B" strokeWidth="2" strokeDasharray="3 3" />
          
          {/* Terraced Open Pit Mine / Mountains */}
          <path
            d="M8 44L18 28L28 34L38 18L48 28L56 44H8Z"
            fill="#E2A43B"
            fillOpacity="0.25"
          />
          <path
            d="M12 44L20 32H28L36 22H42L50 34H54"
            stroke="#D97706"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          {/* Bench terraces stepped lines */}
          <path d="M16 40H48" stroke="#B45309" strokeWidth="1.5" strokeLinecap="round" strokeDasharray="2 2" />
          <path d="M22 36H42" stroke="#B45309" strokeWidth="1.5" strokeLinecap="round" strokeDasharray="2 2" />

          {/* Settling Pond Water Waves at Bottom */}
          <path
            d="M8 48C14 45 18 51 24 48C30 45 34 51 40 48C46 45 50 51 56 48"
            stroke="#0EA5E9"
            strokeWidth="3"
            strokeLinecap="round"
          />
          <path
            d="M10 54C16 51 20 57 26 54C32 51 36 57 42 54C48 51 52 57 56 54"
            stroke="#38BDF8"
            strokeWidth="2"
            strokeLinecap="round"
          />

          {/* Central Reclamation Leaf Sprout */}
          <path
            d="M32 46V24C32 24 23 23 23 33C23 41 32 46 32 46Z"
            fill="#3FA66B"
            stroke="#2E4B3D"
            strokeWidth="1.5"
          />
          <path
            d="M32 38C32 38 41 33 41 23C41 15 32 14 32 14C32 14 32 32 32 38Z"
            fill="#10B981"
            stroke="#2E4B3D"
            strokeWidth="1.5"
          />
          <circle cx="32" cy="14" r="2" fill="#E2A43B" />
        </svg>
      );

    case 'water-kpl':
      // Terraced Settling Pond with clear water drop and compliance badge
      return (
        <svg
          width={s}
          height={s}
          viewBox="0 0 48 48"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className={className}
        >
          {/* Settling pond contours */}
          <path
            d="M6 32C10 26 18 24 24 24C30 24 38 26 42 32L40 40H8L6 32Z"
            fill="#0EA5E9"
            fillOpacity="0.2"
            stroke="#0284C7"
            strokeWidth="2"
            strokeLinejoin="round"
          />
          <path d="M12 36C18 34 30 34 36 36" stroke="#38BDF8" strokeWidth="2" strokeLinecap="round" />
          <path d="M10 40H38" stroke="#0284C7" strokeWidth="2" strokeLinecap="round" />
          {/* Baffle / Weir walls */}
          <path d="M18 30V38" stroke="#E2A43B" strokeWidth="2.5" strokeLinecap="round" />
          <path d="M30 30V38" stroke="#E2A43B" strokeWidth="2.5" strokeLinecap="round" />

          {/* Effluent Pure Water Droplet */}
          <path
            d="M24 6C24 6 15 15 15 20C15 24.97 19.03 29 24 29C28.97 29 33 24.97 33 20C33 15 24 6 24 6Z"
            fill="#3FA66B"
            fillOpacity="0.3"
            stroke="#3FA66B"
            strokeWidth="2"
          />
          {/* Droplet Highlight */}
          <path d="M21 17C21 15 23 13 25 12" stroke="#10B981" strokeWidth="2" strokeLinecap="round" />
          <circle cx="24" cy="22" r="3" fill="#0EA5E9" />
        </svg>
      );

    case 'surface-water':
      // River meandering through hill contours and riverside greenery
      return (
        <svg
          width={s}
          height={s}
          viewBox="0 0 48 48"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className={className}
        >
          {/* Hills / Riverbanks */}
          <path
            d="M4 22L14 12L24 18L34 8L44 18V42H4V22Z"
            fill="#2E4B3D"
            fillOpacity="0.1"
          />
          <path d="M4 24L14 14L22 20" stroke="#3FA66B" strokeWidth="2" strokeLinecap="round" />
          <path d="M28 14L36 8L44 16" stroke="#3FA66B" strokeWidth="2" strokeLinecap="round" />

          {/* Riverside Trees */}
          <circle cx="12" cy="18" r="3" fill="#10B981" />
          <path d="M12 21V25" stroke="#2E4B3D" strokeWidth="1.5" />
          <circle cx="36" cy="12" r="2.5" fill="#3FA66B" />
          <path d="M36 14.5V18" stroke="#2E4B3D" strokeWidth="1.5" />

          {/* Winding River Stream */}
          <path
            d="M28 20C22 24 26 28 20 32C14 36 18 40 12 44"
            stroke="#0EA5E9"
            strokeWidth="3.5"
            strokeLinecap="round"
          />
          <path
            d="M34 22C28 26 32 30 26 34C20 38 24 42 18 44"
            stroke="#38BDF8"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </svg>
      );

    case 'rainfall':
      // Mining slope cloud + precipitation + rain gauge cylinder
      return (
        <svg
          width={s}
          height={s}
          viewBox="0 0 48 48"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className={className}
        >
          {/* Rain Cloud */}
          <path
            d="M12 22C9.79 22 8 20.21 8 18C8 15.93 9.57 14.23 11.6 14.03C12.35 10.58 15.42 8 19.1 8C23.15 8 26.47 11.04 26.92 15.02C27.42 14.94 27.93 14.9 28.45 14.9C31.52 14.9 34 17.38 34 20.45C34 20.65 33.99 20.85 33.97 21.05C35.19 21.6 36 22.84 36 24.28C36 26.17 34.47 27.7 32.58 27.7H12"
            fill="#0EA5E9"
            fillOpacity="0.15"
            stroke="#0284C7"
            strokeWidth="2"
            strokeLinejoin="round"
          />
          {/* Rainfall streaks */}
          <path d="M12 32L10 38" stroke="#0EA5E9" strokeWidth="2.5" strokeLinecap="round" />
          <path d="M19 32L17 40" stroke="#38BDF8" strokeWidth="2.5" strokeLinecap="round" />
          <path d="M26 32L24 38" stroke="#0EA5E9" strokeWidth="2.5" strokeLinecap="round" />

          {/* Rain Gauge Cylinder on Right */}
          <rect x="34" y="24" width="8" height="18" rx="2" fill="#FFFFFF" stroke="#E2A43B" strokeWidth="2" />
          <path d="M36 28H40" stroke="#E2A43B" strokeWidth="1.5" />
          <path d="M36 32H39" stroke="#E2A43B" strokeWidth="1.5" />
          <path d="M36 36H40" stroke="#E2A43B" strokeWidth="1.5" />
          {/* Liquid level */}
          <rect x="35" y="33" width="6" height="8" rx="1" fill="#0EA5E9" />
        </svg>
      );

    case 'reclamation':
      // Terraced post-mining slope + growing tree sapling with caring hands
      return (
        <svg
          width={s}
          height={s}
          viewBox="0 0 48 48"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className={className}
        >
          {/* Soil Contour Layers */}
          <path
            d="M6 38L16 32L28 36L42 26V42H6V38Z"
            fill="#E2A43B"
            fillOpacity="0.2"
          />
          <path d="M6 40C16 34 26 38 42 28" stroke="#D97706" strokeWidth="2" strokeLinecap="round" />
          <path d="M6 44C20 40 30 42 42 34" stroke="#B45309" strokeWidth="1.5" strokeLinecap="round" strokeDasharray="2 2" />

          {/* Sapling Tree */}
          <path d="M24 36V18" stroke="#2E4B3D" strokeWidth="2.5" strokeLinecap="round" />
          {/* Leaves */}
          <path
            d="M24 24C18 20 18 12 24 10C30 12 30 20 24 24Z"
            fill="#3FA66B"
            stroke="#2E4B3D"
            strokeWidth="1.5"
          />
          <path
            d="M24 28C28 26 33 22 34 16C28 17 25 22 24 28Z"
            fill="#10B981"
            stroke="#2E4B3D"
            strokeWidth="1.5"
          />
          <path
            d="M24 30C20 28 15 24 14 18C20 19 23 24 24 30Z"
            fill="#3FA66B"
            stroke="#2E4B3D"
            strokeWidth="1.5"
          />
          <circle cx="24" cy="10" r="2" fill="#E2A43B" />
        </svg>
      );

    case 'tps-b3':
      // Protected storage shelter warehouse with hazardous waste drum and environmental shield
      return (
        <svg
          width={s}
          height={s}
          viewBox="0 0 48 48"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className={className}
        >
          {/* TPS Warehouse Roof Shelter */}
          <path
            d="M6 18L24 6L42 18H6Z"
            fill="#2E4B3D"
            fillOpacity="0.15"
            stroke="#2E4B3D"
            strokeWidth="2"
            strokeLinejoin="round"
          />
          <path d="M10 18V40H38V18" stroke="#2E4B3D" strokeWidth="2" />
          <path d="M6 40H42" stroke="#2E4B3D" strokeWidth="2.5" strokeLinecap="round" />

          {/* Storage Drum B3 */}
          <rect x="18" y="24" width="12" height="15" rx="2" fill="#E2A43B" fillOpacity="0.25" stroke="#D97706" strokeWidth="2" />
          <path d="M18 29H30" stroke="#D97706" strokeWidth="1.5" />
          <path d="M18 34H30" stroke="#D97706" strokeWidth="1.5" />

          {/* Hazmat Warning / Eco-Shield Mark on Drum */}
          <path
            d="M24 26L27 31H21L24 26Z"
            fill="#E2A43B"
            stroke="#B45309"
            strokeWidth="1"
          />
          <circle cx="24" cy="30" r="0.8" fill="#B45309" />

          {/* Leaf of environmental protection beside warehouse */}
          <path
            d="M36 28C36 22 42 20 42 20C42 20 43 27 39 29C37.5 29.8 36 28 36 28Z"
            fill="#3FA66B"
            stroke="#2E4B3D"
            strokeWidth="1"
          />
        </svg>
      );

    case 'solid-waste':
      // Circular waste recycling loop with organic composting leaf
      return (
        <svg
          width={s}
          height={s}
          viewBox="0 0 48 48"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className={className}
        >
          {/* Circular recycling loop */}
          <path
            d="M24 8L28 12L24 16"
            stroke="#3FA66B"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M16 12H28C34.63 12 40 17.37 40 24C40 27.24 38.72 30.18 36.64 32.36"
            stroke="#3FA66B"
            strokeWidth="2.5"
            strokeLinecap="round"
          />
          <path
            d="M24 40L20 36L24 32"
            stroke="#0EA5E9"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M32 36H20C13.37 36 8 30.63 8 24C8 20.76 9.28 17.82 11.36 15.64"
            stroke="#0EA5E9"
            strokeWidth="2.5"
            strokeLinecap="round"
          />

          {/* Compost Leaf in Center */}
          <path
            d="M24 18C19 18 18 24 18 27C18 31 24 33 24 33C24 33 30 31 30 27C30 21 25 18 24 18Z"
            fill="#3FA66B"
            fillOpacity="0.3"
            stroke="#2E4B3D"
            strokeWidth="1.5"
          />
          <path d="M24 21V30" stroke="#3FA66B" strokeWidth="1.5" strokeLinecap="round" />
          <circle cx="24" cy="25" r="1.5" fill="#E2A43B" />
        </svg>
      );

    case 'compliance':
      // Legal permit document with leaf validation stamp and safety hard hat
      return (
        <svg
          width={s}
          height={s}
          viewBox="0 0 48 48"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className={className}
        >
          {/* Permit Document */}
          <path
            d="M10 8C10 6.9 10.9 6 12 6H30L38 14V40C38 41.1 37.1 42 36 42H12C10.9 42 10 41.1 10 40V8Z"
            fill="#FFFFFF"
            stroke="#2E4B3D"
            strokeWidth="2"
            strokeLinejoin="round"
          />
          <path d="M30 6V14H38" stroke="#2E4B3D" strokeWidth="2" strokeLinejoin="round" />

          {/* Document Content Lines */}
          <path d="M16 16H24" stroke="#64748B" strokeWidth="2" strokeLinecap="round" />
          <path d="M16 22H32" stroke="#64748B" strokeWidth="2" strokeLinecap="round" />
          <path d="M16 28H28" stroke="#64748B" strokeWidth="2" strokeLinecap="round" />

          {/* Official Green Stamp / Seal with Leaf */}
          <circle cx="30" cy="32" r="7" fill="#3FA66B" fillOpacity="0.2" stroke="#3FA66B" strokeWidth="1.5" />
          <path
            d="M30 28C28 28 27 30 27 32C27 34 30 36 30 36C30 36 33 34 33 32C33 29 31 28 30 28Z"
            fill="#3FA66B"
          />

          {/* Safety Hard Hat on top left corner */}
          <path
            d="M6 14C6 9 10 7 14 7C18 7 22 9 22 14H6Z"
            fill="#E2A43B"
            stroke="#D97706"
            strokeWidth="1.5"
          />
          <path d="M4 14H24" stroke="#B45309" strokeWidth="2" strokeLinecap="round" />
        </svg>
      );

    default:
      return null;
  }
}
