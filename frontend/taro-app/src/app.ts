import { PropsWithChildren } from 'react';
import { getDongxingGlobal } from './services/store';
import './app.scss';

/**
 * 兼容旧引用：小程序构建会剥掉 app.ts 的具名导出，
 * 新代码请直接从 services/store 引入。
 */
export { getDongxingGlobal };
export type { DongxingGlobal } from './services/store';

function App({ children }: PropsWithChildren) {
  getDongxingGlobal();
  return children;
}

export default App;
