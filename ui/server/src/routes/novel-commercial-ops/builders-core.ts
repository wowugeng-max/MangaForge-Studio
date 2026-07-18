import { createHash } from 'crypto'
import {
  appendNovelRun,
  createNovelChapter,
  createNovelCharacter,
  createNovelOutline,
  createNovelProject,
  createNovelReview,
  createNovelWorldbuilding,
  listNovelCharacters,
  listNovelChapters,
  listNovelOutlines,
  listNovelReviews,
  listNovelRuns,
  listNovelSettingEntities,
  listNovelWorldbuilding,
  updateNovelOutline,
  updateNovelProject,
} from '../../novel'
import { readKeys } from '../../key-store'
import { readModels } from '../../model-store'
import { readProviders } from '../../provider-store'
import { executeNovelAgent } from '../../llm'
import { asArray, compactText, parseJsonLikePayload, safeJsonStringify } from '../novel-route-utils'


export type CommercialOpsContext = {
  getWorkspace: () => string
  getProject: (workspace: string, id: number) => Promise<any>
}

export const genreTemplates = [
  {
    id: 'xianxia_upgrade',
    name: '仙侠升级流',
    genre: '仙侠',
    promise: '主角用清晰代价换取持续升级，每卷都有境界突破、身份跃迁和关系反转。',
    style_lock: {
      narrative_person: '第三人称有限视角',
      sentence_length: '中短句为主，关键战斗加速',
      dialogue_ratio: '30%-40%',
      payoff_density: '每章至少一个小爽点，每3-5章一个大爽点',
      description_density: '设定描写服务冲突，不连续堆设定',
    },
    structure: {
      volume_goal: '每卷围绕一个修炼阶段和一个外部压力闭环。',
      chapter_beat: ['开局压力', '策略选择', '代价执行', '反转收益', '章末新钩子'],
      forbidden: ['连续解释境界体系', '无代价突破', '反派只降智送资源'],
    },
  },
  {
    id: 'urban_comedy_growth',
    name: '都市轻喜成长',
    genre: '都市',
    promise: '现实压力、职场/校园关系和轻喜吐槽推动主角成长，爽点来自聪明解决具体难题。',
    style_lock: {
      narrative_person: '第三人称或第一人称均可',
      sentence_length: '短句和对话偏多',
      dialogue_ratio: '40%-55%',
      payoff_density: '每章一个现实问题解决或关系推进',
      description_density: '少量环境细节，重点写行动和反应',
    },
    structure: {
      volume_goal: '阶段性解决身份、金钱、关系或事业瓶颈。',
      chapter_beat: ['现实麻烦', '误会/压力升级', '主角奇招', '现场反馈', '新问题冒头'],
      forbidden: ['纯段子无剧情推进', '工具人只负责捧哏', '金手指无边界'],
    },
  },
  {
    id: 'infinite_horror',
    name: '无限流副本',
    genre: '无限流',
    promise: '每个副本都有规则、误导、死亡压力和破局推理，主角能力必须被规则约束。',
    style_lock: {
      narrative_person: '第三人称近距离',
      sentence_length: '悬疑段落短句，对抗段落加速',
      dialogue_ratio: '25%-40%',
      payoff_density: '每章至少一个规则发现或危险化解',
      description_density: '氛围描写点到即止，优先服务线索',
    },
    structure: {
      volume_goal: '副本从规则暴露、试错、牺牲、真相、破局逐步升级。',
      chapter_beat: ['异常现象', '规则线索', '错误代价', '临时破局', '更大威胁'],
      forbidden: ['无规则硬吓', '靠蛮力跳过谜题', '照搬经典恐怖桥段'],
    },
  },
]

export function textHash(value: string) {
  return createHash('sha256').update(value).digest('hex').slice(0, 16)
}

export function opsJson(value: any) {
  return safeJsonStringify(value, undefined, 0)
}





