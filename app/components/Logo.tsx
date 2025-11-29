'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useState } from 'react';

interface LogoProps {
  className?: string;
  href?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  width?: number;
  height?: number;
}

export default function Logo({
  className = '',
  href,
  size = 'md',
  width,
  height
}: LogoProps) {
  const [imageError, setImageError] = useState(false);

  // Размеры по умолчанию в зависимости от размера
  const defaultSizes = {
    sm: { width: 80, height: 30 },
    md: { width: 120, height: 45 },
    lg: { width: 160, height: 60 },
    xl: { width: 200, height: 75 },
  };

  const logoWidth = width || defaultSizes[size].width;
  const logoHeight = height || defaultSizes[size].height;

  // Fallback к тексту, если изображение не загрузилось
  if (imageError) {
    const sizeClasses = {
      sm: 'text-xl',
      md: 'text-2xl',
      lg: 'text-3xl',
      xl: 'text-4xl',
    };

    const hasTextColor = className.includes('text-');
    const defaultColor = hasTextColor ? {} : { color: '#1a0a2e' };

    const textLogo = (
      <span
        className={`font-bold lowercase tracking-tight ${sizeClasses[size]} ${className}`}
        style={{
          fontFamily: 'system-ui, -apple-system, sans-serif',
          ...defaultColor,
          letterSpacing: '-0.02em',
        }}
      >
        arma
      </span>
    );

    if (href) {
      return (
        <Link href={href} className="inline-block hover:opacity-80 transition-opacity">
          {textLogo}
        </Link>
      );
    }
    return textLogo;
  }

  const logoContent = (
    <div className={`relative ${className}`} style={{ width: logoWidth, height: logoHeight }}>
      <Image
        src="/logo.png"
        alt="arma logo"
        fill
        className="object-contain"
        priority
        sizes={`${logoWidth}px`}
        style={{
          filter: className.includes('text-white') || className.includes('invert')
            ? 'invert(1) brightness(1.2)'
            : 'none'
        }}
        onError={() => setImageError(true)}
      />
    </div>
  );

  if (href) {
    return (
      <Link href={href} className="inline-block hover:opacity-80 transition-opacity">
        {logoContent}
      </Link>
    );
  }

  return logoContent;
}

