import React, { useRef, useState, useEffect } from 'react';

interface SafeResponsiveContainerProps {
  children: (width: number, height: number) => React.ReactNode;
  height?: number;
}

export default function SafeResponsiveContainer({ children, height = 300 }: SafeResponsiveContainerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState<{ width: number; height: number }>({ width: 0, height });

  useEffect(() => {
    if (!containerRef.current) return;
    
    // Initial safe calculation
    const width = containerRef.current.clientWidth || 400;
    setDimensions({ width, height });

    // Local ResizeObserver bound only to this container element
    const observer = new ResizeObserver((entries) => {
      if (!entries || entries.length === 0) return;
      const { width: newWidth } = entries[0].contentRect;
      // Wrap setState inside requestAnimationFrame to prevent re-entrancy and synchronous rendering conflicts
      requestAnimationFrame(() => {
        setDimensions({ width: newWidth, height });
      });
    });

    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [height]);

  return (
    <div ref={containerRef} className="w-full h-full relative" style={{ minHeight: height }}>
      {dimensions.width > 0 && children(dimensions.width, dimensions.height)}
    </div>
  );
}
