import { useEffect, useMemo, useState } from "react";

export function useVirtualList({ items, scrollRef, estimateSize = 140, overscan = 6 }) {
  const [range, setRange] = useState({
    start: 0,
    end: Math.min(items.length, 20),
    viewportHeight: 0,
  });

  useEffect(() => {
    const element = scrollRef.current;
    if (!element) return;

    function updateRange() {
      const viewportHeight = element.clientHeight;
      const scrollTop = element.scrollTop;
      const visibleCount = Math.ceil(viewportHeight / estimateSize);
      const start = Math.max(0, Math.floor(scrollTop / estimateSize) - overscan);
      const end = Math.min(items.length, start + visibleCount + overscan * 2);

      setRange({ start, end, viewportHeight });
    }

    updateRange();
    element.addEventListener("scroll", updateRange, { passive: true });
    window.addEventListener("resize", updateRange);

    return () => {
      element.removeEventListener("scroll", updateRange);
      window.removeEventListener("resize", updateRange);
    };
  }, [estimateSize, items.length, overscan, scrollRef]);

  return useMemo(() => {
    const safeStart = Math.min(range.start, items.length);
    const safeEnd = Math.min(Math.max(range.end, safeStart), items.length);

    return {
      afterHeight: Math.max(0, (items.length - safeEnd) * estimateSize),
      beforeHeight: safeStart * estimateSize,
      items: items.slice(safeStart, safeEnd),
      totalHeight: items.length * estimateSize,
    };
  }, [estimateSize, items, range.end, range.start]);
}
