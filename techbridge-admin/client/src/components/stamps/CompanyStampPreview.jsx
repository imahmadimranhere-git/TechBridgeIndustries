import { useMemo } from 'react';
import { Stamp } from 'lucide-react';
import { cn } from '../../utils/cn.js';
import { generateStampSvg } from '../../utils/stampSvg.js';

/**
 * Live preview of the company stamp exactly as PDFs will show it.
 * mode: 'auto' | 'uploaded' | 'none'
 */
export default function CompanyStampPreview({ mode = 'auto', companyName, city, country, color, uploadedUrl, size = 160, className }) {
  const autoSrc = useMemo(() => {
    if (mode !== 'auto') return null;
    const svg = generateStampSvg({ companyName, city, country, color });
    return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
  }, [mode, companyName, city, country, color]);

  const box = cn('flex items-center justify-center rounded-xl border border-dashed border-gray-300 bg-white', className);
  const style = { width: size, height: size };

  if (mode === 'none') {
    return (
      <div className={box} style={style}>
        <p className="px-4 text-center text-xs text-gray-500">No company stamp on documents</p>
      </div>
    );
  }

  if (mode === 'uploaded') {
    return uploadedUrl ? (
      <img src={uploadedUrl} alt="Uploaded company stamp" style={style} className={cn('object-contain', className)} />
    ) : (
      <div className={box} style={style}>
        <div className="text-center text-gray-400">
          <Stamp className="mx-auto size-8" aria-hidden="true" />
          <p className="mt-2 text-xs">Upload a stamp image</p>
        </div>
      </div>
    );
  }

  return <img src={autoSrc} alt="Auto-generated company stamp" width={size} height={size} className={className} />;
}