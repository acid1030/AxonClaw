import { motion } from 'framer-motion';

export function PanelContent() {
  return (
    <div className="space-y-4">
      {/* Health Card */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="p-4 rounded-xl bg-green-500/10 border border-green-500/20"
      >
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-white font-semibold text-sm">运行概览</h3>
          <span className="px-2 py-1 rounded-full bg-green-500/20 text-green-400 text-xs font-medium">
            在线
          </span>
        </div>
        
        <div className="space-y-3">
          <div>
            <div className="text-white/60 text-xs mb-1">Gateway</div>
            <div className="text-white font-semibold">稳定</div>
          </div>
          
          <div>
            <div className="text-white/60 text-xs mb-1">活跃 Channel</div>
            <div className="text-white font-semibold">4 / 6</div>
          </div>
          
          <div>
            <div className="text-white/60 text-xs mb-1">任务队列</div>
            <div className="text-white font-semibold">18</div>
          </div>
        </div>
      </motion.div>

      {/* Tasks Card */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/20"
      >
        <h3 className="text-white font-semibold text-sm mb-3">今日任务</h3>
        
        <div className="space-y-2">
          <div className="flex items-center justify-between p-2 rounded-lg bg-white/5">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full bg-blue-500/30 flex items-center justify-center">
                <div className="w-2 h-2 rounded-full bg-blue-400" />
              </div>
              <span className="text-white/90 text-sm">新品图文生成</span>
            </div>
            <span className="px-2 py-0.5 rounded-full bg-green-500/20 text-green-400 text-xs">
              进行中
            </span>
          </div>
          
          <div className="flex items-center justify-between p-2 rounded-lg bg-white/5">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full bg-white/10 flex items-center justify-center">
                <div className="w-2 h-2 rounded-full bg-white/60" />
              </div>
              <span className="text-white/90 text-sm">渠道健康巡检</span>
            </div>
            <span className="px-2 py-0.5 rounded-full bg-white/10 text-white/60 text-xs">
              排队
            </span>
          </div>
        </div>
      </motion.div>

      {/* Quick Actions */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="p-4 rounded-xl bg-purple-500/10 border border-purple-500/20"
      >
        <h3 className="text-white font-semibold text-sm mb-3">快捷操作</h3>
        
        <div className="flex flex-wrap gap-2">
          <button className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white/70 hover:text-white text-xs transition-colors">
            运行诊断
          </button>
          <button className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white/70 hover:text-white text-xs transition-colors">
            备份数据
          </button>
          <button className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white/70 hover:text-white text-xs transition-colors">
            新建模板
          </button>
        </div>
      </motion.div>
    </div>
  );
}
