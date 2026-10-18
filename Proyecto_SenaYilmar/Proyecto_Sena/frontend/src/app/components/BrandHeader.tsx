import React from 'react';
import { BrandLogo } from './BrandLogo';

export type BrandHeaderSize = 'sm' | 'md' | 'lg';

export interface BrandHeaderProps {
  size?: BrandHeaderSize;
  className?: string;
  onClick?: () => void;
  showDivider?: boolean;
  showSena?: boolean;
}

export const BrandHeader: React.FC<BrandHeaderProps> = ({
  size = 'md',
  className = '',
  onClick,
  showSena = true,
}) => {
  return (
    <BrandLogo
      size={size}
      className={className}
      onClick={onClick}
      showSena={showSena}
    />
  );
};

export const AppLogo = BrandHeader;
export default BrandHeader;
