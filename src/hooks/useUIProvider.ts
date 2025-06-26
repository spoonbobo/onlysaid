import { useState, useCallback } from 'react';

type UIProvider = 'mui';

export const useUIProvider = () => {
    const [provider] = useState<UIProvider>('mui');

    return {
        provider,
        isMUI: true,
        isChakra: false,
        isHybrid: false,
    };
}; 