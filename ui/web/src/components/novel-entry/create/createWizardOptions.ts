export const GENRES = [
  { value: '玄幻', label: '玄幻' },
  { value: '仙侠', label: '仙侠' },
  { value: '科幻', label: '科幻' },
  { value: '悬疑', label: '悬疑' },
  { value: '都市', label: '都市' },
  { value: '历史', label: '历史' },
  { value: '奇幻', label: '奇幻' },
  { value: '武侠', label: '武侠' },
  { value: '言情', label: '言情' },
  { value: '末世', label: '末世' },
  { value: '穿越', label: '穿越' },
  { value: '系统', label: '系统流' },
  { value: '其他', label: '其他' },
]

export const LENGTH_TARGETS = [
  { value: 'short', label: '短篇（< 20万）', description: '短篇快完结，适合试水' },
  { value: 'medium', label: '中篇（20-80万）', description: '节奏紧凑，主线明确' },
  { value: 'long', label: '长篇连载（80-300万）', description: '多卷多线，世界观宏大' },
  { value: 'epic', label: '超长篇连载（> 300万）', description: '史诗级篇幅，适合长线连载' },
]

export const AUDIENCES = [
  { value: '男频', label: '男频' },
  { value: '女频', label: '女频' },
  { value: '全向', label: '全向' },
  { value: '轻小说', label: '轻小说' },
  { value: '漫剧', label: '漫剧读者' },
  { value: 'Z世代', label: 'Z世代' },
]

export const FEMALE_AUDIENCE_MODES = [
  { value: 'auto', label: '自动识别' },
  { value: 'enabled', label: '强制启用' },
  { value: 'disabled', label: '强制关闭' },
]

export const STYLE_TAGS = [
  '高燃', '黑暗', '轻松', '群像', '单线', '智斗', '热血',
  '搞笑', '催泪', '虐心', '慢热', '快节奏', '沙雕', '治愈',
  '致郁', '赛博朋克', '克苏鲁', '种田', '经营', '冒险',
]

export const COMMERCIAL_TAGS = [
  '爆款潜质', '爽文', '起点感', '番茄感', '知乎感',
  'IP改编', '影视化', '短剧改编', '漫改', '有声书',
]


export type CreateMode = 'manual' | 'deep_draft'
