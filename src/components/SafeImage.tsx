import React, { useState, useEffect } from 'react';
import { resolveDriveImageUrl } from '../services/driveImageService';

export interface SafeImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  fallback?: React.ReactNode;
  containerClassName?: string;
  productId?: string;
}

export const SafeImage: React.FC<SafeImageProps> = ({
  src,
  alt = '',
  className = '',
  containerClassName = '',
  productId,
  fallback,
  ...props
}) => {
  const [hasError, setHasError] = useState(false);

  const resolvedSrc = resolveDriveImageUrl(src, productId);

  useEffect(() => {
    setHasError(false);
  }, [resolvedSrc]);

  if (!resolvedSrc || hasError) {
    if (fallback) {
      return <>{fallback}</>;
    }
    return null;
  }

  return (
    <img
      src={resolvedSrc}
      alt={alt}
      className={className}
      referrerPolicy="no-referrer"
      onError={() => {
        setHasError(true);
      }}
      {...props}
    />
  );
};

