/**
 * AxonClaw - Placeholder View
 * 通用占位视图
 */

import React from 'react';

interface PlaceholderViewProps {
  title?: string;
}

const PlaceholderView: React.FC<PlaceholderViewProps> = ({ title = '功能开发中' }) => {
  return (
    <div className="h-full flex flex-col items-center justify-center p-12 text-center">
      <div className="text-6xl mb-4">🚧</div>
      <h2 className="text-2xl font-semibold text-white mb-2">{title}</h2>
      <p className="text-sm text-white/60">敬请期待</p>
    </div>
  );
};

export { PlaceholderView };
export default PlaceholderView;
