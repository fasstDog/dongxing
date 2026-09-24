import { PropsWithChildren } from 'react';
import './app.scss';

export interface DongxingGlobal {
  lastQuery: Record<string, unknown> | null;
  lastPlans: unknown[] | null;
  disclaimer: string;
}

declare const global: { dongxing?: DongxingGlobal };

function ensureGlobal(): DongxingGlobal {
  if (typeof global !== 'undefined') {
    if (!global.dongxing) {
      global.dongxing = {
        lastQuery: null,
        lastPlans: null,
        disclaimer: '只推荐路线，不卖票。价格、时刻都是参考，不保证有票。'
      };
    }
    return global.dongxing;
  }
  return {
    lastQuery: null,
    lastPlans: null,
    disclaimer: '只推荐路线，不卖票。价格、时刻都是参考，不保证有票。'
  };
}

export function getDongxingGlobal(): DongxingGlobal {
  return ensureGlobal();
}

function App({ children }: PropsWithChildren) {
  ensureGlobal();
  return children;
}

export default App;
