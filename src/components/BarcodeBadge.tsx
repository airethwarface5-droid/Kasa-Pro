import React from 'react';

interface BarcodeBadgeProps {
  code: string;
  className?: string;
  showText?: boolean;
}

export const BarcodeBadge: React.FC<BarcodeBadgeProps> = ({
  code,
  className = '',
  showText = true,
}) => {
  // Deterministic bar widths based on code
  const bars: { width: number; isDark: boolean }[] = [];
  let seed = 0;
  for (let i = 0; i < code.length; i++) {
    seed = (seed * 31 + code.charCodeAt(i)) % 10000;
  }

  // Guard bars
  bars.push({ width: 2, isDark: true });
  bars.push({ width: 1, isDark: false });
  bars.push({ width: 2, isDark: true });

  for (let i = 0; i < 28; i++) {
    seed = (seed * 9301 + 49297) % 233280;
    const isDark = seed % 10 > 3;
    const width = (seed % 3 === 0) ? 3 : (seed % 2 === 0 ? 2 : 1);
    bars.push({ width, isDark });
  }

  // Guard bars end
  bars.push({ width: 2, isDark: true });
  bars.push({ width: 1, isDark: false });
  bars.push({ width: 2, isDark: true });

  return (
    <div className={`inline-flex flex-col items-center bg-white p-1.5 rounded border border-neutral-300 shadow-xs ${className}`}>
      <div className="flex items-stretch h-6 gap-[1px]">
        {bars.map((bar, idx) => (
          <span
            key={idx}
            className={`inline-block h-full ${bar.isDark ? 'bg-black' : 'bg-transparent'}`}
            style={{ width: `${bar.width}px` }}
          />
        ))}
      </div>
      {showText && (
        <span className="text-[9px] font-mono text-neutral-800 tracking-wider font-semibold mt-0.5">
          {code}
        </span>
      )}
    </div>
  );
};
