export const novelRouteModules = [
  { key: 'core_crud', label: '项目/角色/大纲/章节基础数据', owner: 'ui/server/src/novel.ts' },
  { key: 'reference', label: '参考作品投喂、覆盖度和迁移计划', owner: 'ui/server/src/routes/novel.ts' },
  { key: 'generation', label: '章节上下文、场景卡、正文生成和修订', owner: 'ui/server/src/routes/novel.ts' },
  { key: 'production', label: '章节群队列、worker、预算和恢复', owner: 'ui/server/src/routes/novel.ts' },
  { key: 'quality', label: '质量门禁、相似度、编辑报告和版本合并', owner: 'ui/server/src/routes/novel.ts' },
  { key: 'memory', label: '记忆宫殿、正文缓存和故事状态机', owner: 'ui/server/src/memory-service.ts' },
  { key: 'agents', label: '多 Agent 计划、修复和平台适配', owner: 'ui/server/src/routes/novel.ts' },
]

