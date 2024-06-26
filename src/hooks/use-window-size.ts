import { useState } from 'react';
import { useEventListener, useIsomorphicLayoutEffect } from 'usehooks-ts';

interface WindowSize {
  width: number;
  height: number;
}

export function useDevice(): { windowSize: WindowSize; isMobile: boolean } {
  const [windowSize, setWindowSize] = useState<WindowSize>({
    width: 0,
    height: 0,
  });

  const handleSize = () => {
    setWindowSize({
      width: window.innerWidth,
      height: window.innerHeight,
    });
  };

  const isMobile = windowSize.width < 767;

  useEventListener('resize', handleSize);

  // Set size at the first client-side load
  useIsomorphicLayoutEffect(() => {
    handleSize();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { windowSize, isMobile };
}
