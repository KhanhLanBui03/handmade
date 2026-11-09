import { useId } from 'react';

// Hoa 5 cánh vẽ bằng nét "sợi kẽm" uốn vòng — gợi chất liệu kẽm nhung của shop
const PETALS = [0, 72, 144, 216, 288];

/** Biểu tượng logo: ô bo góc xanh nước + hoa kẽm trắng */
export function BrandMark({ className = 'size-9', title }) {
  const gid = useId();
  return (
    <svg
      viewBox="0 0 40 40"
      className={className}
      role={title ? 'img' : undefined}
      aria-hidden={title ? undefined : true}
      aria-label={title}
    >
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#1a9be0" />
          <stop offset="1" stopColor="#015a92" />
        </linearGradient>
      </defs>
      <rect width="40" height="40" rx="11" fill={`url(#${gid})`} />
      <g fill="none" stroke="#fff" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
        {PETALS.map((deg) => (
          <ellipse key={deg} cx="20" cy="13.6" rx="3.1" ry="5.4" transform={`rotate(${deg} 20 20)`} />
        ))}
      </g>
      <circle cx="20" cy="20" r="2.3" fill="#fff" />
    </svg>
  );
}

/** Logo đầy đủ: biểu tượng + tên shop */
export function BrandLogo({ subtitle = 'Hoa kẽm nhung', size = 'md', className = '' }) {
  const big = size === 'lg';
  return (
    <span className={`flex items-center gap-2.5 ${className}`}>
      <BrandMark className={big ? 'size-11' : 'size-9'} />
      <span className="leading-none">
        <span className={`block font-semibold tracking-[-0.02em] text-ink ${big ? 'text-2xl' : 'text-lg'}`}>
          Trạm Hoa Nhỏ
        </span>
        {subtitle && (
          <span className="mt-1 block text-[10px] font-semibold uppercase tracking-[0.18em] text-brick">
            {subtitle}
          </span>
        )}
      </span>
    </span>
  );
}
