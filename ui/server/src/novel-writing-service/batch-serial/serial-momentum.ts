import { asArray, compactText, parseJsonLikePayload } from '../../routes/novel-route-utils'
import { countProseChars } from '../../novel-writing/word-target'
import { firstCompactText } from '../../novel-writing/story-drive-basics'
import { normalizeBeatCoolingType, inferBeatCoolingTypeFromText } from '../../novel-writing/beat-cooling-basics'
import { compactBriefText, uniqueBriefStrings } from '../quality/text-utils'
import { reviewBelongsToChapter, reviewPayloadForType, reviewTimestamp } from '../quality/review-lookup'
import { proseQualitySerialRiskRepairRisks } from '../quality/serial-risk-repair'
import { inferEndingHookType } from './ending-hook-type'
import {
  paragraphHasDownwardPressure,
  paragraphHasOppressionPressure,
  textHasDownwardSafetySignal,
} from '../../novel-writing/emotional-payoff-scans'
import { anchorMatchScore, normalizedMatchText } from '../../novel-writing/text-matching'
import { normalizeRecentFatigueBrief } from '../../novel-writing/rolling-rhythm-preflight'

const SERIAL_PROGRESS_SIGNAL_PATTERN = /发现|揭开|确认|决定|选择|进入|打开|破解|反制|击败|夺回|获得|失去|暴露|改变|升级|回收|推进|救|逃|杀|追查|定位|证明|否定|推翻|兑现|转向|封锁|阻止/
const SERIAL_PAYOFF_SIGNAL_PATTERN = /爽点|回报|兑现|打脸|反杀|反制|奖励|收益|拿到|夺回|证明|洗清|升级|突破|赢|胜|失态|改口|翻盘|救下|解锁|阶段结算|读者看到/
const SERIAL_AFTERMATH_SIGNAL_PATTERN = /关系余波|反应余波|承接余波|关系变化|态度改变|伏笔|线索|状态变化|新状态|新目标|下一目标|新代价|新风险|新门槛|资源门槛|继续推进|倒向|倒戈|担保|旁证倒向|打开下一目标/
const SERIAL_LINE_INACTIVE_PATTERN = /暂不推进|不推进|没有变化|无变化|待推进|等待|观察|整理|复盘|继续铺垫|暂时压住|压住不爆|只保留|保留[^。！？!?；;]{0,30}(?:暂不|不解决|不爆)/
const SERIAL_LINE_CONCRETE_PROGRESS_PATTERN = /推进到|主线推进|支线推进|关系线推进|确认|发现|揭开|打开|进入|改变|倒向|倒戈|担保|获得|夺回|解决|反制|证明|新目标|新风险|新代价|新门槛/
const SERIAL_PROTAGONIST_CURRENT_GOAL_PATTERN = /当前小目标|短期目标|本章小目标|本章目标|眼前目标|下一步|先要|必须先|本章要|目标[:：]/
const SERIAL_PROTAGONIST_LONG_GOAL_PATTERN = /长线大目标|长线目标|长期目标|长远目标|全书目标|卷级目标|主线目标|最终目标|终局目标|阶段目标|大目标/
const SERIAL_ENDING_HARVEST_PATTERN = /收获|清点|拿到|获得|夺回|赢得|通过|改口|倒向|资格|回报|结算|收益|线索|证据|资源|状态|代价|阶段结果|最终状态|final_state/
const SERIAL_ENDING_HANDOFF_PATTERN = /铺垫下一段|下一段|下一章|下一目标|新目标|新风险|新代价|新门槛|下一步|指向|转向|打开|留下|入口|未解决|危险|钩子|悬念|威胁|next_chapter_pull|unresolved_question/
const SERIAL_ENDING_SAFE_CLOSURE_PATTERN = /终于结束|已经结束|彻底结束|告一段落|收束|完成|完毕|整理完|归档|收好|收进|恢复平静|平静下来|各自回房|回房休息|散去|夜色渐深|夜色已深|暂无波澜|暂时无事|尘埃落定/
const SERIAL_ENDING_SUSPENSE_HOOK_PATTERN = /未解决|未解|悬念|危险|危机|威胁|倒计时|只剩(?:下)?(?:十息|一刻|半刻|三日|一天|一夜|[0-9一二三四五六七八九十]+)|必须(?:在|去|把|拿|杀|救|选|打开|交出|找到|证明|完成)|不能(?:再|让|离开|进入|打开)|否则|门外|敲门|门缝|第二声|阵鸣|血|符光|缺页|名字|名单|露出|渗出|响起|突然|发现|谁|为何|为什么|哪里|真相|新风险|新门槛|新阻碍|新线索|更深|下一层|要求[^。！？!?；;]{0,24}(?:交出|立刻|马上|限时)/
const SERIAL_EXPECTATION_CHAIN_RESOLUTION_PATTERN = /旧期待|当前期待|期待[^。！？!?；;]{0,20}(?:兑现|完成|结束)|(?:兑现|完成|结束)[^。！？!?；;]{0,20}期待|终于|总算|解决|结束|通过|赢得|拿到|改判|查清|答案|真相|门槛[^。！？!?；;]{0,12}通过|资格[^。！？!?；;]{0,12}通过|证人[^。！？!?；;]{0,20}答案/
const SERIAL_EXPECTATION_CHAIN_BREAK_PATTERN = /所有期待都兑现|期待(?:全部|都)?兑现|期待清空|没有新的?期待(?:线)?|没有新期待|没有新的?开环|麻烦(?:彻底|全部)?消失|麻烦消失了|谜题彻底解决|之后只需等待|只需等待新生活|当前期待全部兑现/
const SERIAL_EXPECTATION_CHAIN_OPEN_LOOP_PATTERN = /下一开环|下一目标|下一章|下一步|新目标|新问题|新危机|新线索|新门槛|新任务|新名单|新困境|新期待|长期期待|中期期待|短期期待|继续保温|继续追|更深一层|更深|背后还有|幕后名单|第四个名字|必须追查|还没|仍未|未解|没有答案|倒计时|否则/
const SERIAL_CORE_HOOK_DELIVERY_PATTERN = /核心梗|核心卖点|金手指|隐藏工具箱|工具箱[^。！？!?；;]{0,18}(?:检测|定位|弹出|修|奖励)|系统[^。！？!?；;]{0,18}(?:检测|奖励|评价|提示|反馈|到账)|(?:报废设备|旧件|旧设备)[^。！？!?；;]{0,28}(?:修成|修复|翻新|启动|交付)|(?:修成|修复|翻新)[^。！？!?；;]{0,28}(?:新订单|样机|报废设备|旧件)|客户态度反转|新订单|订单期待|奖励到账|能力使用|规则边界|信息差破解|身份反转|期待点|爽点|最高频爽点|题材长板/
const SERIAL_EXPECTATION_SETUP_PATTERN = /危机|期待|铺垫|压迫|逼|承压|定罪|质问|威胁|抢|杀|倒计时|矛盾|代价|选择|阻止|不能|必须|规则|门槛|信息差|误判|得意|怀疑|暗牌|线索|准备/
const SERIAL_PAYOFF_RELEASE_PATTERN = /高潮|爆发|释放|爽点|回报|兑现|打脸|反杀|反制|奖励|收益|拿到|获得|夺回|证明|揭穿|洗清|升级|突破|赢|胜|失态|改口|翻盘|解锁|阶段结算|收获|倒向/
const SERIAL_NO_EXIT_GLUE_PATTERN = /杀人理由|工作职责|道德责任|实体场所|副本|密室|锁死|困在|无法离开|不能离开|不得离开|不能退出|不得退出|不能随时退出|非踏入不可|非去不可|必须(?:完成|留下|继续|当场|处理|破案|复核|接案|执行)|不得不|无法袖手旁观|值班|任务|接案|担保|连累|追责|退出代价|失去(?:复核)?资格|资格归零|身份死亡|职场死亡|心理死亡|亲人遇险|朋友遇险|置主角于死地|钉在现场|无法轻易脱身/
const SERIAL_LOOSE_EXIT_PATTERN = /(?:可以|能够|能|可)随时(?:退出|离开)|随时转身离开|没有(?:任何)?代价|无(?:任何)?代价|普通争吵|只是争吵/
const SERIAL_SOCIAL_INTERACTION_PATTERN = /(?:林青禾|同门|朋友|亲人|盟友|队友|师兄|师姐|师弟|师妹|掌院|长老|执事|巡夜弟子|旁观弟子|权威者|上位者|友方|敌方|中立方|熟人|反派)[^。！？!?；;]{0,50}(?:担保|质问|反对|认可|改口|协作|站队|倒向|倒戈|帮助|求助|传令|命令|约定|承诺|背叛|争执|劝|阻止|保护|救|交给|递给|告诉|提醒|试探|支持|施压|怀疑|相信|态度)|(?:担保|质问|反对|认可|改口|协作|站队|倒向|倒戈|帮助|求助|传令|命令|约定|承诺|背叛|争执|阻止|保护|救下|告诉|提醒|试探|支持|施压|态度改变|关系变化)[^。！？!?；;]{0,50}(?:主角|他|她|林青禾|同门|朋友|亲人|盟友|掌院|执事|弟子|巡夜弟子|旁观弟子)/
const SERIAL_STATUS_LADDER_CONTEXT_PATTERN = /外门|杂役|弟子|宗门|宗派|协会|审判庭|账房|候选|阶层|地位|权限|等级|排名|榜单|试炼|晋升|低层|旧规|门槛|规则/
const SERIAL_UPPER_STATUS_CONTACT_PATTERN = /上位者|上层|高层|掌院|长老|长老席|宗主|掌门|会长|审判长|核心层|内门|审判庭|资格|名额|候选名单|候选阵师|晋升|招揽|点名|传令|改判|重审|权限|资源门槛|地位|声望|排名|榜单|上层账册/
const SERIAL_DOWNWARD_RECOVERY_PATTERN = /拉回情绪|安全感|意外收获|深层逻辑|锅是别人的|功是主角的|潜在解法|暗牌|底牌|后手|证据|线索|备份|规则漏洞|漏洞|盟友动作|盟友|林青禾[^。！？!?；;]{0,30}(?:递来|担保|帮助|站到|提醒)|反制|反击|反压|翻盘|改口|发现|确认|拿到|获得|解锁|新目标|下一步|收益|阶段结算/
const SERIAL_MAINLINE_CLOSURE_PATTERN = /主线(?:已经|彻底)?(?:完成|收束|完结|结束)|阶段主线(?:完成|收束|完结|结束)|旧案(?:已经|彻底|终于)?(?:全部查清|结清|结束|解决)|真相大白|全部查清|彻底洗清|彻底解决|完全解决|一切结束|终于结束|幕后(?:黑手|改阵者|主谋)?(?:全部|已经)?伏法/
const SERIAL_DECEPTIVE_MAINLINE_HANDOFF_PATTERN = /接近完成|几乎(?:查清|完成|收束|解决)|差一点|还差|只差|仅差|仍缺|仍未|未拿到|未找到|未打开|未开|缺口|最后一(?:块|页|枚|道|步|个|层)|关键(?:缺口|入口|证人|证据|名单|线索)|还有(?:一人|一层|下一层|更深|幕后|背后)|更深一层|下一层|背后还有|幕后(?:还有|仍|长老|主谋)|入口未开|仍未露面|未露面|新阻碍|新门槛|新风险|新代价|下一目标|下一章|下一步/
const SERIAL_UPGRADE_STAGE_CONTEXT_PATTERN = /升级文|成长线|成长系统|系统面板|升级节奏|升级阶段|试炼|考核|境界|修为|战力|技能|功法|排行榜|榜单|排名|段位|等级|进阶|晋级|突破门槛|内门|外门|候选资格/
const SERIAL_UPGRADE_REWARD_POINT_PATTERN = /(?:拿到|获得|得到|赢得|收获|解锁|恢复|通过|晋升|提升|奖励到账|经验到账)[^。！？!?；;]{0,28}(?:升级|装备|法器|道具|资源|名额|资格|认可|声望|排名|技能|能力|功能|词条|品质|熟练度|经验|线索|真相)|(?:升级|装备|法器|道具|资源|名额|资格|认可|声望|排名|技能|能力|功能|词条|品质|熟练度|经验|线索|真相)[^。！？!?；;]{0,28}(?:拿到|获得|得到|赢得|收获|解锁|恢复|提升|到账)|突破(?:小)?境界|境界突破|升级成功|晋级成功|进阶成功|排名提升|揭开|揭秘|真相大白|新能力|新技能|新功能|隐藏工具箱|客户认可|长老(?:席)?认可|通过[^。！？!?；;]{0,24}试炼/
const SERIAL_ROMANCE_CONTEXT_PATTERN = /感情线|恋爱线|暧昧|心动|喜欢|爱意|恋人|男主|女主|男二|女二|CP|亲密|递茶|披风|陪伴|照顾|疗伤|避雨|并肩|牵手|拥抱|告白|林青禾/
const SERIAL_ROMANCE_TENSION_LAYER_PATTERN = /拉扯|试探|误会|吃醋|边界|退让|再确认|确认关系|共同目标|主动选择|选择|代价|风险|失去|保护不是拒绝|不信任|信任|立场|事业节点|成长节点|资格|危机|压力|分歧|冲突|让步|克制|拒绝|靠近又退开|暧昧→确认|确认→危机|危机→升华|关系升级|共同承担/
const SERIAL_ROMANCE_CAREER_BINDING_PATTERN = /(?:感情选择|关系选择|主动选择|主动留下|共同承担|确认立场|选择站队|站队|作证|交出|递出|证言|名单)[^。！？!?；;]{0,50}(?:主线推进|事业线(?:推进|变化)|职业线(?:推进|变化)|调查(?:推进|打开)|复核(?:资格|名额)|候选资格|内门资格|审判庭资格|获得关键证言|打开下一|打开幕后|指向幕后|新资源|资源到账|新线索|资格被暂停)|(?:主线推进|事业线(?:推进|变化)|职业线(?:推进|变化)|成长节点|事业节点|调查(?:推进|打开)|证人立场改变|复核(?:资格|名额)|候选资格|内门资格|审判庭资格|新资源到账|资源到账|旧案名单打开|名单指向|打开下一(?:份)?账册|进入审判庭)[^。！？!?；;]{0,50}(?:感情线|关系线|林青禾|选择|站队|作证|共同承担|主动留下)/
const SERIAL_TRUMP_CARD_RELEASE_PATTERN = /(?:亮出|放出|摊开|动用|揭开|祭出|打出|交出|抛出|露出)[^。！？!?；;]{0,28}(?:底牌|暗牌|后手|旧阵盘|残符|血印)|(?:底牌|暗牌|后手|旧阵盘|残符|血印)[^。！？!?；;]{0,28}(?:亮出|放出|摊开|动用|揭开|祭出|打出|用完|耗尽|尽出)/
const SERIAL_TRUMP_CARD_RESERVE_PATTERN = /(?:仍|还|继续|另外)[^。！？!?；;]{0,18}(?:留|有|压着|藏着|保留)[^。！？!?；;]{0,24}(?:两|三|2|3|几)(?:张|道|个|枚|层)?[^。！？!?；;]{0,18}(?:未揭示|未亮|没亮|隐藏|暗藏)?(?:底牌|暗牌|后手)|(?:保留|留下|压着|藏着)[^。！？!?；;]{0,28}(?:未揭示|未亮|隐藏|暗藏)[^。！？!?；;]{0,18}(?:底牌|暗牌|后手)|(?:解锁|获得|补|补入|打开|换来)[^。！？!?；;]{0,24}(?:新后手|新技能|新阵纹|新目标|更高门槛|下一目标|新线索)/
const SERIAL_TRUMP_CARD_DEPLETION_PATTERN = /底牌(?:用完|耗尽|尽出|摊空)|所有底牌|全部(?:底牌|暗牌|后手)|最后一(?:张|个|道|枚|层)(?:底牌|暗牌|后手)|只剩最后一(?:张|个|道|枚|层)|再无后手|没有(?:新|新的)?后手|没有(?:任何)?底牌|无后手|一口气摊空/
const SERIAL_SHOWDOWN_CONTEXT_PATTERN = /装逼|爽点|高潮|翻盘|反制|打脸|公开反证|当场(?:改判|翻盘|反制)|全场震惊|众人震惊|所有人震惊|一爆|碾压|群众层|中间层|核心层/
const SERIAL_SHOWDOWN_FRIENDLY_PRESSURE_PATTERN = /(?:友方|友好势力|林青禾|外门弟子|巡夜弟子|盟友)[^。！？!?；;]{0,40}(?:期待|相信|觉得主角是大佬|站队|传话|作证|押注|担保)/
const SERIAL_SHOWDOWN_ENEMY_PRESSURE_PATTERN = /(?:敌方|敌方势力|执事|反派|审问席|对手)[^。！？!?；;]{0,45}(?:不服|质疑|逼|逼他|压迫|加压|冷笑|阻止|要求|追责)/
const SERIAL_SHOWDOWN_NEUTRAL_PRESSURE_PATTERN = /(?:中立|中立势力|长老|长老席|账房|核心层)[^。！？!?；;]{0,45}(?:观望|压下|压住|加压|不表态|旁观|要求|审问|判签)/
const SERIAL_SHOWDOWN_BURST_PATTERN = /一爆|爆发|碾压|当场(?:改判|翻盘|反制)|公开反证|打脸|反杀|反制|翻盘|赢下|证明|破解|打开/
const SERIAL_SHOWDOWN_FRIENDLY_SHOCK_PATTERN = /(?:友方|友好势力|林青禾|外门弟子|巡夜弟子|盟友)[^。！？!?；;]{0,45}(?:震动|震惊|传话|站队|作证|改口|激动)/
const SERIAL_SHOWDOWN_ENEMY_SHOCK_PATTERN = /(?:敌方|敌方势力|执事|反派|审问席|对手)[^。！？!?；;]{0,45}(?:震动|震惊|破防|失态|退后|低头|改口|认输)/
const SERIAL_SHOWDOWN_NEUTRAL_SHOCK_PATTERN = /(?:中立|中立势力|长老|长老席|账房|核心层)[^。！？!?；;]{0,45}(?:震动|震惊|改口|改判|递出|第一次|意识到|重审)/
const SERIAL_CHARACTER_ACTION_PATTERN = /(?:主角|林青禾|巡夜弟子|执事|反派|长老|长老席|审问席|证人|配角)[^。！？!?；;]{0,60}(?:决定|选择|冲上|质问|递出|交出|改口|改判|退场|站出来|露面|夜闯|上堂)|(?:决定|选择|冲上|质问|递出|交出|改口|改判|退场|站出来|露面|夜闯|上堂)[^。！？!?；;]{0,40}(?:主角|林青禾|巡夜弟子|执事|反派|长老|长老席|审问席|证人|配角)/
const SERIAL_PLOT_CONVENIENCE_PATTERN = /突然|剧情需要|为了剧情|为了推进|推进主线|方便主线|方便剧情|强行|毫无铺垫|没有说明(?:自己的)?动机|没有动机|只为(?:了)?让主角|直接给出资格|直接质问|直接进入/
const SERIAL_CHARACTER_MOTIVATION_PATTERN = /动机链|具体起因|起因|因为|因|想要|不想|担心|害怕|为了保住|为了保护|为了证明|情感动机|羞辱|亲情|亏欠|旧痛|责任|不甘|想换取|自保|保住|声望压力|信任|约束|风险|代价|承担|交换条件|权衡|选择.*(?:代价|风险)|从(?:他|她|主角|反派)的视角/
const SERIAL_SUPPORTING_CHARACTER_ACTIVITY_PATTERN = /(?:林青禾|巡夜弟子|旁观弟子|掌院|长老|执事|同门|盟友|朋友|证人|客户|会长|配角|反派)[^。！？!?；;]{0,60}(?:递来|递给|交给|告诉|提醒|帮助|保护|担保|阻止|封锁|传令|命令|质问|改口|作证|出面|站队|倒向|陪|照顾)|(?:递来|递给|交给|告诉|提醒|帮助|保护|担保|阻止|封锁|传令|命令|质问|改口|作证|出面|站队|倒向)[^。！？!?；;]{0,50}(?:主角|他|她|林青禾|巡夜弟子|旁观弟子|掌院|长老|执事|证人|客户)/
const SERIAL_SUPPORTING_CHARACTER_AGENCY_PATTERN = /自己的(?:目标|立场|动机|利益|代价|选择)|有(?:自保)?(?:目标|立场|动机|利益|代价)|为了|因为|担心|害怕|想要|不想|宁愿|保住|自保|牵连|资格|名额|家人|妹妹|父亲|旧案|旧痛|梦想|责任|压力|立场来自|交换条件|担保代价|承担(?:担保)?代价|旧账利益|交易|理念|选择站队|主动选择|从他的视角|从她的视角/
const SERIAL_CORE_ELEMENT_HINTS: Array<[RegExp, string]> = [
  [/美女|女主|关系奖励|关系|认可|信任|担保|倒向|倒戈|盟友|好感|林青禾/, '关系奖励'],
  [/夺宝|宝物|秘宝|玉牌|旧印|道具|资源|名额|资格|装备/, '夺宝资源'],
  [/比武|试炼|擂台|考核|斗法|挑战|上台|比试/, '比武试炼'],
  [/副本|秘境|禁库|探索|闯关|关卡|地图/, '副本探索'],
  [/追查|调查|线索|证据|真相|记录|账册|名册|解谜|揭秘/, '信息追查'],
  [/复仇|清算|报仇|反杀|反制|打脸|揭穿|洗清/, '反制清算'],
  [/升级|突破|觉醒|新能力|技能|修为|境界|战力/, '能力升级'],
]
const SERIAL_CORE_HOOK_ANGLE_HINTS: Array<[RegExp, string]> = [
  [/检测|定位|扫描|评估|报告|轴承|磨损|发现[^。！？!?；;]{0,20}(?:可修|故障|漏洞)/, '检测定位'],
  [/规则|审核|协会|判定|门槛|反制|卡住|旧规|规则边界/, '规则反制'],
  [/修复|修成|翻新|样机|启动|交付|演示|维修过程/, '修复交付'],
  [/客户态度|客户[^。！？!?；;]{0,18}(?:反转|松动|追加)|追加[^。！？!?；;]{0,12}订单|新订单|订单回报/, '客户订单回报'],
  [/系统|奖励|到账|新功能|反馈|面板|词条/, '系统奖励反馈'],
  [/信息差|破解|身份反转|血缘|妈妈|误判|揭穿/, '信息差反转'],
]
const SERIAL_WORLD_EXPANSION_CONTRACT_PATTERN = /换地图|地图承接|地图转换|新地图|新环境|新角色|新规则|新目标|新冲突|世界观(?:扩展|展开)|扩展世界观|小循环|中循环|大循环|卷目标|长期期待/
const SERIAL_WORLD_EXPANSION_SIGNAL_PATTERN = /新地图|新环境|新角色|新势力|新规则|新目标|新冲突|世界观(?:扩展|展开)|扩展世界观|离开[^。！？!?；;]{0,24}(?:旧城|旧地图|维修铺)|进入[^。！？!?；;]{0,24}(?:新地图|新城|赤炉城|宗门|学院|海港|边城|外门|内门)|赤炉城|炉烟|矿车|城门税契|矿脉|矿脉账册|掌炉人|协会高层|地头蛇|城主|堂主|长老席|上层势力|更高层势力|新势力|炼炉保|城规|新规|规则漏洞|资源门槛|第一块炉牌|炉牌|大循环|卷目标|长期期待|资源黑幕|幕后(?:名单|势力)|更高层/
const SERIAL_READER_NEED_CONTRACT_PATTERN = /目标读者|读者画像|读者欲望|读者想看|情绪缺口|核心痛苦|深层情结|未满足需求|本章吸引点|可感知回报|尊严|掌控感|安全感|认可|认同|翻盘|反制|爽点|读者需求/
const SERIAL_READER_NEED_SIGNAL_PATTERN = /被轻视|被否定|被规则压着走|不公平|公平|当场反制|亲手反制|反制|打脸|翻盘|改口|低头|客户[^。！？!?；;]{0,24}(?:认可|态度反转|追加)|认可|认同|被尊重|尊严|掌控感|安全感|优越感|解气|即时反馈|快速反馈|即时收益|可感知回报|订单回报|追加订单|奖励到账|收益到账|拿到收益|收获|规则边界|规则漏洞|信息差|破局|爽点|爽感/
const SERIAL_EXPECTATION_LADDER_CONTRACT_PATTERN = /两长一短|三层期待|短期期待|中期期待|长期期待|剧情期待|主题甜头|新鲜感|期待阈值|期待门槛|期待层级|期待线/
const SERIAL_EXPECTATION_SHORT_LAYER_PATTERN = /短期期待|下一章|下一步|下一目标|当前目标|当前材料|当前清单|当前报价|本章目标|本章小目标|眼前目标|先拿到|先过|先查|十息|立刻|马上/
const SERIAL_EXPECTATION_MEDIUM_LAYER_PATTERN = /中期期待|中期|剧情单元|这个单元|这一轮|单元目标|单元收束|调包链|链条|中循环|次级目标|阶段目标|下一环|第二个故事/
const SERIAL_EXPECTATION_LONG_LAYER_PATTERN = /长期期待|长期|长线|大目标|远期目标|卷目标|大循环|全书|最终|终局|父亲旧案|幕后长老|幕后|背后|更高层|主角最终/
const SERIAL_FORESHADOWING_CONTRACT_PATTERN = /伏笔不是谜语人|信息延迟超过3章|信息延迟|长期线索|伏笔|谜语人|中间无推进|提前给|删除|自然藏进|动作|物件|误判|环境回声/
const SERIAL_FORESHADOWING_NO_PROGRESS_PATTERN = /没有(?:任何)?(?:推进|新发现|答案|答案路径|信息增量)|无(?:任何)?推进|仍未(?:推进|给出答案|给出答案路径|回收)|没有推进|暂时不查|只是(?:把|收|压|提起|重复)|只(?:是)?重复提醒|继续(?:被)?(?:收好|压回|留在|放回)|仍然没有答案|没有答案路径|长期线索没有推进|仍旧没有推进/
const SERIAL_FORESHADOWING_PROGRESS_PATTERN = /推进|新发现|信息增量|答案路径|答案公布|给出答案|兑现|回收|半回收|部分答案|一半答案|对应|匹配|对上|确认|揭开|露出|打开|指向|下一层|新门槛|新线索|新名单|门锁|齿痕|水痕|门环|锁芯/
const SERIAL_TEXTURE_NEGATION_PATTERN = /没有|无|缺少|不是|不算|未|并非|仍无|仍未/
const SERIAL_RELATION_TEXTURE_PATTERN = /关系(?:深化|推进|质变|变化|升级)|信任(?:边界)?(?:改变|推进|升级)|同盟|盟友|承诺|担保|共同承担|和解|并肩|倒向|站队|站到|林青禾[^。！？!?；;]{0,36}(?:担保|信任|承诺|共同承担|递出|站到)/
const SERIAL_WORLD_TEXTURE_PATTERN = /世界观(?:展开|扩展)|新地图|新环境|新势力|新规则(?:展开|建立|公布)?|地图规则|规则体系|制度(?:展开|代价|门槛)|城规|宗门法度|资源门槛|炼炉保|税契|地契|矿脉|赤炉城|风土|组织结构|阶层|上层势力|更高层势力/
const SERIAL_CONFLICT_THRILL_BEAT_PATTERN = /conflict_thrill|大冲突|打斗|战斗|开打|拔剑|追杀|正面对抗|会审|审判|审问|压问|压迫|翻案|逼问|硬顶|当场质问|当众压问|继续应战|继续开打/
const SERIAL_MOMENTUM_GOAL_ADVANCE_PATTERN = /目标(?:推进|转向|打开|完成|达成|升级)|推进到|拿到|获得|通过|夺回|进入|打开(?:下一目标|新目标|入口|门槛)|转向|查到|找到|确认[^。！？!?；;]{0,20}(?:编号|证据|线索|名单|入口|真相)|复核资格(?:到手|通过)|资格(?:到手|通过|拿到)|阶段(?:推进|结果|结算)/
const SERIAL_MOMENTUM_OBSTACLE_ESCALATION_PATTERN = /阻碍(?:升级|加码)|升级|加码|新门槛|更高门槛|倒计时|限时|三日|资格冻结|冻结资格|惩罚|代价|追责|封锁|不得|禁止|否则|必须(?:马上|立刻|限时)|要求[^。！？!?；;]{0,24}(?:否则|冻结|罚|追责)/
const SERIAL_MOMENTUM_NEW_INFO_PATTERN = /新信息|新线索|发现|确认|揭开|露出|第二张|背面|证据|账册编号|名单|真相|漏洞|入口|指向|调包|幕后|答案路径/
const SERIAL_FORESHADOWING_LABEL_HINTS: Array<[RegExp, string]> = [
  [/旧钥匙缺口|钥匙缺口|旧钥匙/, '旧钥匙缺口'],
  [/玻璃门水痕|水痕/, '玻璃门水痕'],
  [/旧印章背面|旧印章|旧印|第二个证人/, '旧印章背面'],
  [/铃铛水痕|铃铛/, '铃铛水痕'],
  [/半枚旧印纹|旧印纹/, '半枚旧印纹'],
  [/第七层有人影|第七层|人影/, '第七层人影'],
  [/暗门钥匙|暗门/, '暗门钥匙伏笔'],
]
const SERIAL_WEAK_CONFLICT_PATTERN = /^(?:过渡|等待|观察|整理|复盘|说明|铺垫|转场|日常|回忆|闲聊|赶路|休息|无|暂无|无明显|没有明显)[^。！？!?；;]{0,30}$|过渡等待|观察环境|复盘说明|转场铺垫|日常铺垫|整理资料|等待通知/
const SERIAL_CONFLICT_SIGNAL_PATTERN = /阻止|封锁|追杀|逼迫|压迫|争夺|反制|对抗|冲突|危险|威胁|阻碍|陷阱|追查|质问|打断|夺|杀|救|逃|战|打|规则|惩罚|代价|反派|执事|敌/

function serialChapterText(chapter: any) {
  const rawPayload = chapter?.raw_payload || chapter?.rawPayload || {}
  const scenePayoffs = [
    ...asArray(chapter?.scene_cards || chapter?.sceneCards),
    ...asArray(rawPayload?.scene_cards || rawPayload?.sceneCards),
  ].map((scene: any) => scene?.reader_payoff || scene?.readerPayoff || scene?.payoff)
  return [
    chapter?.chapter_summary,
    chapter?.summary,
    chapter?.conflict,
    chapter?.ending_hook,
    chapter?.reader_payoff,
    chapter?.readerPayoff,
    chapter?.core_payoff,
    chapter?.corePayoff,
    chapter?.payoff,
    rawPayload?.reader_payoff,
    rawPayload?.readerPayoff,
    rawPayload?.core_payoff,
    rawPayload?.corePayoff,
    rawPayload?.payoff,
    ...scenePayoffs,
    chapter?.chapter_text ? compactText(chapter.chapter_text, 260) : '',
  ].map((item: any) => String(item || '').trim()).filter(Boolean).join('。')
}

function serialChapterHasProgress(chapter: any) {
  const text = serialChapterText(chapter)
  SERIAL_PROGRESS_SIGNAL_PATTERN.lastIndex = 0
  return SERIAL_PROGRESS_SIGNAL_PATTERN.test(text)
}

function serialChapterHasPayoff(chapter: any) {
  const text = serialChapterText(chapter)
  SERIAL_PAYOFF_SIGNAL_PATTERN.lastIndex = 0
  return SERIAL_PAYOFF_SIGNAL_PATTERN.test(text)
}

function serialChapterHasAftermath(chapter: any) {
  const rawPayload = chapter?.raw_payload || chapter?.rawPayload || {}
  const sceneAftermath = [
    ...asArray(chapter?.scene_cards || chapter?.sceneCards),
    ...asArray(rawPayload?.scene_cards || rawPayload?.sceneCards),
    ...asArray(rawPayload?.pre_draft_brief?.scene_briefs || rawPayload?.preDraftBrief?.sceneBriefs),
  ].flatMap((scene: any) => [
    scene?.aftermath,
    scene?.aftermath_brief,
    scene?.aftermathBrief,
    scene?.state_change,
    scene?.stateChange,
    scene?.relation_change,
    scene?.relationChange,
    scene?.foreshadowing,
    scene?.next_goal,
    scene?.nextGoal,
  ])
  const text = [
    chapter?.chapter_summary,
    chapter?.summary,
    chapter?.ending_hook,
    chapter?.endingHook,
    chapter?.reader_payoff,
    chapter?.readerPayoff,
    rawPayload?.chapter_summary,
    rawPayload?.chapterSummary,
    rawPayload?.summary,
    rawPayload?.ending_hook,
    rawPayload?.endingHook,
    rawPayload?.reader_payoff,
    rawPayload?.readerPayoff,
    rawPayload?.pre_draft_brief?.aftermath,
    rawPayload?.preDraftBrief?.aftermath,
    rawPayload?.pre_draft_brief?.state_change,
    rawPayload?.preDraftBrief?.stateChange,
    rawPayload?.pre_draft_brief?.next_goal,
    rawPayload?.preDraftBrief?.nextGoal,
    ...sceneAftermath,
  ].map((item: any) => String(item || '').trim()).filter(Boolean).join('。')
  SERIAL_AFTERMATH_SIGNAL_PATTERN.lastIndex = 0
  return SERIAL_AFTERMATH_SIGNAL_PATTERN.test(text)
}

function serialChapterMomentumText(chapter: any) {
  const rawPayload = chapter?.raw_payload || chapter?.rawPayload || {}
  const blueprint = serialChapterBlueprintForLines(chapter)
  const outline = blueprint?.content_outline || blueprint?.contentOutline || {}
  const plotLines = blueprint?.plot_lines || blueprint?.plotLines || {}
  const sceneCards = [
    ...asArray(chapter?.scene_cards || chapter?.sceneCards),
    ...asArray(rawPayload?.scene_cards || rawPayload?.sceneCards),
    ...asArray(rawPayload?.pre_draft_brief?.scene_briefs || rawPayload?.preDraftBrief?.sceneBriefs),
  ]
  return compactBriefText([
    chapter?.title,
    chapter?.chapter_summary,
    chapter?.summary,
    chapter?.conflict,
    chapter?.ending_hook,
    chapter?.endingHook,
    rawPayload?.title,
    rawPayload?.chapter_summary,
    rawPayload?.chapterSummary,
    rawPayload?.summary,
    rawPayload?.conflict,
    rawPayload?.ending_hook,
    rawPayload?.endingHook,
    outline?.cause,
    outline?.development,
    outline?.turn,
    outline?.climax,
    outline?.ending,
    plotLines?.mainline,
    plotLines?.main_line,
    plotLines?.mainLine,
    plotLines?.logic_line,
    plotLines?.logicLine,
    ...sceneCards.flatMap((scene: any) => [
      scene?.title,
      scene?.goal,
      scene?.conflict,
      scene?.obstacle,
      scene?.turning_point,
      scene?.turningPoint,
      scene?.state_change,
      scene?.stateChange,
      scene?.ending_hook,
      scene?.endingHook,
      scene?.clue,
      scene?.information_gain,
      scene?.informationGain,
    ]),
  ].flat().map((item: any) => String(item || '').trim()).filter(Boolean).join('。'))
}

function serialChapterHasGoalObstacleOrInfoAdvance(chapter: any) {
  const text = serialChapterMomentumText(chapter)
  return Boolean(
    serialPositivePatternTest(text, SERIAL_MOMENTUM_GOAL_ADVANCE_PATTERN)
    || serialPositivePatternTest(text, SERIAL_MOMENTUM_OBSTACLE_ESCALATION_PATTERN)
    || serialPositivePatternTest(text, SERIAL_MOMENTUM_NEW_INFO_PATTERN)
  )
}

function serialChapterBlueprintForLines(chapter: any) {
  const rawPayload = chapter?.raw_payload || chapter?.rawPayload || {}
  return chapter?.chapter_blueprint
    || chapter?.chapterBlueprint
    || rawPayload?.chapter_blueprint
    || rawPayload?.chapterBlueprint
    || rawPayload?.pre_draft_brief?.chapter_blueprint
    || rawPayload?.pre_draft_brief?.chapterBlueprint
    || rawPayload?.preDraftBrief?.chapter_blueprint
    || rawPayload?.preDraftBrief?.chapterBlueprint
    || rawPayload?.context_package?.chapter_target?.chapter_blueprint
    || rawPayload?.context_package?.chapter_target?.chapterBlueprint
    || rawPayload?.context_package?.chapterTarget?.chapter_blueprint
    || rawPayload?.context_package?.chapterTarget?.chapterBlueprint
    || rawPayload?.contextPackage?.chapter_target?.chapter_blueprint
    || rawPayload?.contextPackage?.chapter_target?.chapterBlueprint
    || rawPayload?.contextPackage?.chapterTarget?.chapter_blueprint
    || rawPayload?.contextPackage?.chapterTarget?.chapterBlueprint
    || rawPayload?.context_package?.chapter_blueprint
    || rawPayload?.context_package?.chapterBlueprint
    || rawPayload?.contextPackage?.chapter_blueprint
    || rawPayload?.contextPackage?.chapterBlueprint
    || {}
}

function serialChapterRawContextTarget(chapter: any) {
  const rawPayload = chapter?.raw_payload || chapter?.rawPayload || {}
  return {
    ...(rawPayload?.context_package?.chapterTarget || {}),
    ...(rawPayload?.contextPackage?.chapter_target || {}),
    ...(rawPayload?.contextPackage?.chapterTarget || {}),
    ...(rawPayload?.context_package?.chapter_target || {}),
  }
}

function serialChapterPlotLineText(chapter: any, keys: string[]) {
  const blueprint = serialChapterBlueprintForLines(chapter)
  const plotLines = blueprint?.plot_lines || blueprint?.plotLines || {}
  return compactBriefText(keys.map(key => plotLines?.[key]).filter(Boolean).join('。'))
}

function serialLineHasProgress(text: string) {
  const value = compactBriefText(text)
  if (!value) return false
  SERIAL_LINE_INACTIVE_PATTERN.lastIndex = 0
  SERIAL_LINE_CONCRETE_PROGRESS_PATTERN.lastIndex = 0
  if (SERIAL_LINE_INACTIVE_PATTERN.test(value) && !SERIAL_LINE_CONCRETE_PROGRESS_PATTERN.test(value)) return false
  SERIAL_PROGRESS_SIGNAL_PATTERN.lastIndex = 0
  SERIAL_LINE_CONCRETE_PROGRESS_PATTERN.lastIndex = 0
  return SERIAL_PROGRESS_SIGNAL_PATTERN.test(value) || SERIAL_LINE_CONCRETE_PROGRESS_PATTERN.test(value)
}

function serialChapterLineStaggerState(chapter: any) {
  const mainlineText = serialChapterPlotLineText(chapter, ['mainline', 'main_line', 'mainLine'])
  const subplotText = serialChapterPlotLineText(chapter, ['subplot', 'sub_line', 'subLine', 'relationship_line', 'relationshipLine'])
  return {
    mainline_text: mainlineText,
    subplot_text: subplotText,
    has_line_contract: Boolean(mainlineText && subplotText),
    mainline_active: serialLineHasProgress(mainlineText),
    subplot_active: serialLineHasProgress(subplotText),
  }
}

function serialChapterBlueprintContentOutline(chapter: any) {
  const blueprint = serialChapterBlueprintForLines(chapter)
  return blueprint?.content_outline || blueprint?.contentOutline || {}
}

function serialChapterBlueprintHasClimaxRewardClosure(chapter: any) {
  const outline = serialChapterBlueprintContentOutline(chapter)
  const cause = compactBriefText(outline?.cause)
  const development = compactBriefText(outline?.development)
  const climax = compactBriefText(outline?.climax || outline?.payoff || outline?.turning_point || outline?.turningPoint)
  const ending = compactBriefText(outline?.ending || outline?.result || outline?.reward || outline?.harvest)
  const hasOutlineContract = Boolean(cause || development || climax || ending)
  if (!hasOutlineContract) return { has_outline_contract: false, has_closure: true }
  const hasRewardClosure = /收获|拿到|获得|夺回|赢得|通过|改口|倒向|资格|回报|结算|阶段|下一目标|新目标|新风险|新代价|新门槛|打开|指向|留下下一/.test(ending)
  return {
    has_outline_contract: true,
    has_climax: Boolean(climax),
    has_reward_closure: hasRewardClosure,
    has_closure: Boolean(climax && hasRewardClosure),
  }
}

function serialChapterEndingContractState(chapter: any) {
  const rawPayload = chapter?.raw_payload || chapter?.rawPayload || {}
  const blueprint = serialChapterBlueprintForLines(chapter)
  const outline = blueprint?.content_outline || blueprint?.contentOutline || {}
  const endingContract = blueprint?.ending_contract || blueprint?.endingContract || {}
  const preDraftBrief = rawPayload?.pre_draft_brief || rawPayload?.preDraftBrief || {}
  const preDraftEndingContract = preDraftBrief?.ending_contract || preDraftBrief?.endingContract || {}
  const ending = compactBriefText(outline?.ending || outline?.result || outline?.reward || outline?.harvest)
  const finalState = compactBriefText(endingContract?.final_state || endingContract?.finalState || preDraftEndingContract?.final_state || preDraftEndingContract?.finalState)
  const nextPull = compactBriefText(
    endingContract?.next_chapter_pull
    || endingContract?.nextChapterPull
    || endingContract?.unresolved_question
    || endingContract?.unresolvedQuestion
    || preDraftEndingContract?.next_chapter_pull
    || preDraftEndingContract?.nextChapterPull
    || preDraftEndingContract?.unresolved_question
    || preDraftEndingContract?.unresolvedQuestion,
  )
  const endingText = compactBriefText([
    ending,
    finalState ? `final_state：${finalState}` : '',
    nextPull ? `next_chapter_pull：${nextPull}` : '',
  ].filter(Boolean).join('。'))
  const hasEndingContract = Boolean(ending || finalState || nextPull)
  SERIAL_ENDING_HARVEST_PATTERN.lastIndex = 0
  SERIAL_ENDING_HANDOFF_PATTERN.lastIndex = 0
  const hasHarvest = Boolean(finalState || SERIAL_ENDING_HARVEST_PATTERN.test(endingText))
  const hasHandoff = Boolean(nextPull || SERIAL_ENDING_HANDOFF_PATTERN.test(endingText))
  return {
    has_ending_contract: hasEndingContract,
    has_harvest: hasHarvest,
    has_handoff: hasHandoff,
    has_complete_handoff: Boolean(hasHarvest && hasHandoff),
  }
}

function serialChapterEndingSuspenseState(chapter: any) {
  const rawPayload = chapter?.raw_payload || chapter?.rawPayload || {}
  const blueprint = serialChapterBlueprintForLines(chapter)
  const outline = blueprint?.content_outline || blueprint?.contentOutline || {}
  const preDraftBrief = rawPayload?.pre_draft_brief || rawPayload?.preDraftBrief || {}
  const chapterTarget = serialChapterRawContextTarget(chapter)
  const endingContract = blueprint?.ending_contract
    || blueprint?.endingContract
    || rawPayload?.ending_contract
    || rawPayload?.endingContract
    || preDraftBrief?.ending_contract
    || preDraftBrief?.endingContract
    || chapterTarget?.ending_contract
    || chapterTarget?.endingContract
    || {}
  const sceneCards = [
    ...asArray(chapter?.scene_cards || chapter?.sceneCards),
    ...asArray(rawPayload?.scene_cards || rawPayload?.sceneCards),
    ...asArray(preDraftBrief?.scene_briefs || preDraftBrief?.sceneBriefs),
  ]
  const lastScene = sceneCards.length > 0 ? sceneCards[sceneCards.length - 1] : {}
  const endingText = compactBriefText([
    chapter?.ending_hook,
    chapter?.endingHook,
    chapter?.ending_excerpt,
    chapter?.endingExcerpt,
    rawPayload?.ending_hook,
    rawPayload?.endingHook,
    rawPayload?.ending_excerpt,
    rawPayload?.endingExcerpt,
    outline?.ending,
    outline?.result,
    outline?.reward,
    endingContract?.next_chapter_pull,
    endingContract?.nextChapterPull,
    endingContract?.unresolved_question,
    endingContract?.unresolvedQuestion,
    chapterTarget?.ending_hook,
    chapterTarget?.endingHook,
    lastScene?.ending_hook,
    lastScene?.endingHook,
    lastScene?.ending_hook_seed,
    lastScene?.endingHookSeed,
    lastScene?.exit_state,
    lastScene?.exitState,
  ].flat().map((item: any) => String(item || '').trim()).filter(Boolean).join('。'))
  SERIAL_ENDING_SAFE_CLOSURE_PATTERN.lastIndex = 0
  SERIAL_ENDING_SUSPENSE_HOOK_PATTERN.lastIndex = 0
  return {
    has_ending_text: Boolean(endingText),
    has_safe_closure: Boolean(endingText && SERIAL_ENDING_SAFE_CLOSURE_PATTERN.test(endingText)),
    has_suspense_hook: Boolean(endingText && SERIAL_ENDING_SUSPENSE_HOOK_PATTERN.test(endingText)),
  }
}

function serialChapterExpectationChainState(chapter: any) {
  const rawPayload = chapter?.raw_payload || chapter?.rawPayload || {}
  const blueprint = serialChapterBlueprintForLines(chapter)
  const outline = blueprint?.content_outline || blueprint?.contentOutline || {}
  const preDraftBrief = rawPayload?.pre_draft_brief || rawPayload?.preDraftBrief || {}
  const chapterTarget = serialChapterRawContextTarget(chapter)
  const expectationContract = chapter?.expectation_threshold_contract
    || chapter?.expectationThresholdContract
    || rawPayload?.expectation_threshold_contract
    || rawPayload?.expectationThresholdContract
    || preDraftBrief?.expectation_threshold_contract
    || preDraftBrief?.expectationThresholdContract
    || chapterTarget?.expectation_threshold_contract
    || chapterTarget?.expectationThresholdContract
    || blueprint?.expectation_threshold_contract
    || blueprint?.expectationThresholdContract
    || {}
  const suspenseContract = chapter?.suspense_contract
    || chapter?.suspenseContract
    || rawPayload?.suspense_contract
    || rawPayload?.suspenseContract
    || preDraftBrief?.suspense_contract
    || preDraftBrief?.suspenseContract
    || chapterTarget?.suspense_contract
    || chapterTarget?.suspenseContract
    || blueprint?.suspense_contract
    || blueprint?.suspenseContract
    || {}
  const expectationChain = suspenseContract?.expectation_chain || suspenseContract?.expectationChain || {}
  const resolutionText = compactBriefText([
    chapter?.chapter_summary,
    chapter?.summary,
    chapter?.conflict,
    chapter?.ending_hook,
    chapter?.endingHook,
    rawPayload?.chapter_summary,
    rawPayload?.chapterSummary,
    rawPayload?.summary,
    rawPayload?.conflict,
    rawPayload?.ending_hook,
    rawPayload?.endingHook,
    outline?.cause,
    outline?.development,
    outline?.turn,
    outline?.climax,
    outline?.ending,
    expectationContract?.current_expectations,
    expectationContract?.currentExpectations,
    expectationContract?.payoff_or_delay_plan,
    expectationContract?.payoffOrDelayPlan,
    suspenseContract?.expectation_layers,
    suspenseContract?.expectationLayers,
    expectationChain?.active_lines,
    expectationChain?.activeLines,
  ].flat().map((item: any) => String(item || '').trim()).filter(Boolean).join('。'))
  const openLoopText = compactBriefText([
    chapter?.ending_hook,
    chapter?.endingHook,
    rawPayload?.ending_hook,
    rawPayload?.endingHook,
    outline?.ending,
    expectationContract?.next_open_loop,
    expectationContract?.nextOpenLoop,
    expectationContract?.open_loop,
    expectationContract?.openLoop,
    expectationContract?.vacuum_guardrails,
    expectationContract?.vacuumGuardrails,
    expectationChain?.next_open_loop,
    expectationChain?.nextOpenLoop,
    expectationChain?.carry_rules,
    expectationChain?.carryRules,
  ].flat().map((item: any) => String(item || '').trim()).filter(Boolean).join('。'))
  SERIAL_EXPECTATION_CHAIN_RESOLUTION_PATTERN.lastIndex = 0
  SERIAL_EXPECTATION_CHAIN_BREAK_PATTERN.lastIndex = 0
  SERIAL_EXPECTATION_CHAIN_OPEN_LOOP_PATTERN.lastIndex = 0
  const hasBreak = Boolean(resolutionText && SERIAL_EXPECTATION_CHAIN_BREAK_PATTERN.test(resolutionText))
  return {
    has_expectation_resolution: Boolean(resolutionText && SERIAL_EXPECTATION_CHAIN_RESOLUTION_PATTERN.test(resolutionText)),
    has_expectation_break: hasBreak,
    has_next_open_loop: Boolean(openLoopText && !hasBreak && SERIAL_EXPECTATION_CHAIN_OPEN_LOOP_PATTERN.test(openLoopText)),
  }
}

function serialChapterExpectationPayoffSetupState(chapter: any) {
  const rawPayload = chapter?.raw_payload || chapter?.rawPayload || {}
  const blueprint = serialChapterBlueprintForLines(chapter)
  const storyLoop = serialChapterStoryLoopContract(chapter)
  const outline = blueprint?.content_outline || blueprint?.contentOutline || {}
  const plotLines = blueprint?.plot_lines || blueprint?.plotLines || {}
  const preDraftBrief = rawPayload?.pre_draft_brief || rawPayload?.preDraftBrief || {}
  const sceneCards = [
    ...asArray(chapter?.scene_cards || chapter?.sceneCards),
    ...asArray(rawPayload?.scene_cards || rawPayload?.sceneCards),
    ...asArray(preDraftBrief?.scene_briefs || preDraftBrief?.sceneBriefs),
  ]
  const setupText = compactBriefText([
    blueprint?.expectation_setup,
    blueprint?.expectationSetup,
    blueprint?.setup,
    blueprint?.setup_beats,
    blueprint?.setupBeats,
    blueprint?.pressure_setup,
    blueprint?.pressureSetup,
    blueprint?.suspense_setup,
    blueprint?.suspenseSetup,
    storyLoop?.setup,
    storyLoop?.escalation,
    outline?.cause,
    outline?.development,
    outline?.turn,
    plotLines?.logic_line,
    plotLines?.logicLine,
    ...sceneCards.flatMap((scene: any) => [
      scene?.setup,
      scene?.expectation_setup,
      scene?.expectationSetup,
      scene?.pressure_setup,
      scene?.pressureSetup,
      scene?.conflict,
      scene?.fear_point,
      scene?.fearPoint,
      scene?.information_gap,
      scene?.informationGap,
      scene?.required_beats,
      scene?.requiredBeats,
    ]),
  ].flat().map((item: any) => String(item || '').trim()).filter(Boolean).join('。'))
  const payoffText = compactBriefText([
    blueprint?.core_payoff,
    blueprint?.corePayoff,
    blueprint?.reader_payoff,
    blueprint?.readerPayoff,
    storyLoop?.payoff,
    outline?.climax,
    outline?.ending,
    chapter?.reader_payoff,
    chapter?.readerPayoff,
    rawPayload?.reader_payoff,
    rawPayload?.readerPayoff,
    preDraftBrief?.reader_payoff,
    preDraftBrief?.readerPayoff,
    serialChapterReaderPayoffText(chapter),
    ...sceneCards.flatMap((scene: any) => [
      scene?.reader_payoff,
      scene?.readerPayoff,
      scene?.payoff,
      scene?.reader_reward,
      scene?.readerReward,
    ]),
  ].flat().map((item: any) => String(item || '').trim()).filter(Boolean).join('。'))
  SERIAL_EXPECTATION_SETUP_PATTERN.lastIndex = 0
  SERIAL_PAYOFF_RELEASE_PATTERN.lastIndex = 0
  const setupChars = countProseChars(setupText)
  const payoffChars = countProseChars(payoffText)
  const hasSetupSignal = SERIAL_EXPECTATION_SETUP_PATTERN.test(setupText)
  const hasPayoffRelease = Boolean(payoffText && (outline?.climax || SERIAL_PAYOFF_RELEASE_PATTERN.test(payoffText)))
  return {
    has_payoff_release: hasPayoffRelease,
    has_setup_signal: hasSetupSignal,
    setup_chars: setupChars,
    payoff_chars: payoffChars,
    has_setup_before_payoff: Boolean(hasPayoffRelease && hasSetupSignal && setupChars >= payoffChars),
  }
}

function serialChapterDeceptiveMainlineState(chapter: any) {
  const rawPayload = chapter?.raw_payload || chapter?.rawPayload || {}
  const blueprint = serialChapterBlueprintForLines(chapter)
  const storyLoop = serialChapterStoryLoopContract(chapter)
  const outline = blueprint?.content_outline || blueprint?.contentOutline || {}
  const plotLines = blueprint?.plot_lines || blueprint?.plotLines || {}
  const preDraftBrief = rawPayload?.pre_draft_brief || rawPayload?.preDraftBrief || {}
  const chapterTarget = serialChapterRawContextTarget(chapter)
  const endingContract = blueprint?.ending_contract || blueprint?.endingContract || preDraftBrief?.ending_contract || preDraftBrief?.endingContract || {}
  const text = compactBriefText([
    chapter?.chapter_summary,
    chapter?.summary,
    chapter?.conflict,
    chapter?.ending_hook,
    chapter?.endingHook,
    chapter?.reader_payoff,
    chapter?.readerPayoff,
    rawPayload?.chapter_summary,
    rawPayload?.chapterSummary,
    rawPayload?.summary,
    rawPayload?.conflict,
    rawPayload?.ending_hook,
    rawPayload?.endingHook,
    rawPayload?.reader_payoff,
    rawPayload?.readerPayoff,
    outline?.cause,
    outline?.development,
    outline?.turn,
    outline?.climax,
    outline?.ending,
    plotLines?.mainline,
    plotLines?.main_line,
    plotLines?.mainLine,
    plotLines?.logic_line,
    plotLines?.logicLine,
    plotLines?.event_line,
    plotLines?.eventLine,
    storyLoop?.setup,
    storyLoop?.escalation,
    storyLoop?.payoff,
    storyLoop?.carry_over,
    storyLoop?.carryOver,
    endingContract?.next_chapter_pull,
    endingContract?.nextChapterPull,
    endingContract?.unresolved_question,
    endingContract?.unresolvedQuestion,
    chapterTarget?.mainline,
    chapterTarget?.main_line,
    chapterTarget?.mainLine,
    chapterTarget?.long_term_goal,
    chapterTarget?.longTermGoal,
    preDraftBrief?.mainline,
    preDraftBrief?.main_line,
    preDraftBrief?.mainLine,
  ].flat().map((item: any) => String(item || '').trim()).filter(Boolean).join('。'))
  SERIAL_MAINLINE_CLOSURE_PATTERN.lastIndex = 0
  SERIAL_DECEPTIVE_MAINLINE_HANDOFF_PATTERN.lastIndex = 0
  return {
    has_mainline_closure: Boolean(text && SERIAL_MAINLINE_CLOSURE_PATTERN.test(text)),
    has_deceptive_handoff: Boolean(text && SERIAL_DECEPTIVE_MAINLINE_HANDOFF_PATTERN.test(text)),
  }
}

function serialChapterUpgradeRewardPointState(chapter: any) {
  const rawPayload = chapter?.raw_payload || chapter?.rawPayload || {}
  const blueprint = serialChapterBlueprintForLines(chapter)
  const storyLoop = serialChapterStoryLoopContract(chapter)
  const outline = blueprint?.content_outline || blueprint?.contentOutline || {}
  const plotLines = blueprint?.plot_lines || blueprint?.plotLines || {}
  const preDraftBrief = rawPayload?.pre_draft_brief || rawPayload?.preDraftBrief || {}
  const chapterTarget = serialChapterRawContextTarget(chapter)
  const upgradeRhythmContract = chapter?.upgrade_rhythm_contract
    || chapter?.upgradeRhythmContract
    || rawPayload?.upgrade_rhythm_contract
    || rawPayload?.upgradeRhythmContract
    || preDraftBrief?.upgrade_rhythm_contract
    || preDraftBrief?.upgradeRhythmContract
    || chapterTarget?.upgrade_rhythm_contract
    || chapterTarget?.upgradeRhythmContract
    || blueprint?.upgrade_rhythm_contract
    || blueprint?.upgradeRhythmContract
    || {}
  const sceneCards = [
    ...asArray(chapter?.scene_cards || chapter?.sceneCards),
    ...asArray(rawPayload?.scene_cards || rawPayload?.sceneCards),
    ...asArray(preDraftBrief?.scene_briefs || preDraftBrief?.sceneBriefs),
  ]
  const text = compactBriefText([
    chapter?.chapter_summary,
    chapter?.summary,
    chapter?.conflict,
    chapter?.ending_hook,
    chapter?.endingHook,
    chapter?.reader_payoff,
    chapter?.readerPayoff,
    rawPayload?.chapter_summary,
    rawPayload?.chapterSummary,
    rawPayload?.summary,
    rawPayload?.conflict,
    rawPayload?.ending_hook,
    rawPayload?.endingHook,
    rawPayload?.reader_payoff,
    rawPayload?.readerPayoff,
    outline?.cause,
    outline?.development,
    outline?.turn,
    outline?.climax,
    outline?.ending,
    plotLines?.mainline,
    plotLines?.main_line,
    plotLines?.mainLine,
    plotLines?.growth_line,
    plotLines?.growthLine,
    plotLines?.upgrade_line,
    plotLines?.upgradeLine,
    storyLoop?.setup,
    storyLoop?.escalation,
    storyLoop?.payoff,
    storyLoop?.carry_over,
    storyLoop?.carryOver,
    upgradeRhythmContract?.upgrade_gap,
    upgradeRhythmContract?.upgradeGap,
    upgradeRhythmContract?.upgrade_gain_plan,
    upgradeRhythmContract?.upgradeGainPlan,
    upgradeRhythmContract?.feedback_loop,
    upgradeRhythmContract?.feedbackLoop,
    upgradeRhythmContract?.bridge_rhythm,
    upgradeRhythmContract?.bridgeRhythm,
    chapterTarget?.upgrade_goal,
    chapterTarget?.upgradeGoal,
    chapterTarget?.growth_goal,
    chapterTarget?.growthGoal,
    preDraftBrief?.upgrade_goal,
    preDraftBrief?.upgradeGoal,
    preDraftBrief?.growth_goal,
    preDraftBrief?.growthGoal,
    ...sceneCards.flatMap((scene: any) => [
      scene?.goal,
      scene?.purpose,
      scene?.conflict,
      scene?.reader_payoff,
      scene?.readerPayoff,
      scene?.state_change,
      scene?.stateChange,
      scene?.reward,
      scene?.gain,
      scene?.upgrade,
      scene?.recognition,
      scene?.reveal,
    ]),
  ].flat().map((item: any) => String(item || '').trim()).filter(Boolean).join('。'))
  SERIAL_UPGRADE_STAGE_CONTEXT_PATTERN.lastIndex = 0
  SERIAL_UPGRADE_REWARD_POINT_PATTERN.lastIndex = 0
  return {
    has_upgrade_context: Boolean(text && SERIAL_UPGRADE_STAGE_CONTEXT_PATTERN.test(text)),
    has_reward_point: Boolean(text && SERIAL_UPGRADE_REWARD_POINT_PATTERN.test(text)),
  }
}

function serialChapterRomanceTensionState(chapter: any) {
  const rawPayload = chapter?.raw_payload || chapter?.rawPayload || {}
  const blueprint = serialChapterBlueprintForLines(chapter)
  const storyLoop = serialChapterStoryLoopContract(chapter)
  const outline = blueprint?.content_outline || blueprint?.contentOutline || {}
  const plotLines = blueprint?.plot_lines || blueprint?.plotLines || {}
  const preDraftBrief = rawPayload?.pre_draft_brief || rawPayload?.preDraftBrief || {}
  const chapterTarget = serialChapterRawContextTarget(chapter)
  const femaleAudienceContract = chapter?.female_audience_contract
    || chapter?.femaleAudienceContract
    || rawPayload?.female_audience_contract
    || rawPayload?.femaleAudienceContract
    || preDraftBrief?.female_audience_contract
    || preDraftBrief?.femaleAudienceContract
    || chapterTarget?.female_audience_contract
    || chapterTarget?.femaleAudienceContract
    || blueprint?.female_audience_contract
    || blueprint?.femaleAudienceContract
    || {}
  const characterRelationContract = chapter?.character_relation_contract
    || chapter?.characterRelationContract
    || rawPayload?.character_relation_contract
    || rawPayload?.characterRelationContract
    || preDraftBrief?.character_relation_contract
    || preDraftBrief?.characterRelationContract
    || chapterTarget?.character_relation_contract
    || chapterTarget?.characterRelationContract
    || blueprint?.character_relation_contract
    || blueprint?.characterRelationContract
    || {}
  const sceneCards = [
    ...asArray(chapter?.scene_cards || chapter?.sceneCards),
    ...asArray(rawPayload?.scene_cards || rawPayload?.sceneCards),
    ...asArray(preDraftBrief?.scene_briefs || preDraftBrief?.sceneBriefs),
  ]
  const text = compactBriefText([
    chapter?.chapter_summary,
    chapter?.summary,
    chapter?.conflict,
    chapter?.ending_hook,
    chapter?.endingHook,
    rawPayload?.chapter_summary,
    rawPayload?.chapterSummary,
    rawPayload?.summary,
    rawPayload?.conflict,
    rawPayload?.ending_hook,
    rawPayload?.endingHook,
    outline?.cause,
    outline?.development,
    outline?.turn,
    outline?.climax,
    outline?.ending,
    plotLines?.relationship_line,
    plotLines?.relationshipLine,
    plotLines?.romance_line,
    plotLines?.romanceLine,
    storyLoop?.setup,
    storyLoop?.escalation,
    storyLoop?.payoff,
    storyLoop?.carry_over,
    storyLoop?.carryOver,
    femaleAudienceContract?.romance_axis_rules,
    femaleAudienceContract?.romanceAxisRules,
    femaleAudienceContract?.reader_need_rules,
    femaleAudienceContract?.readerNeedRules,
    characterRelationContract?.relationship_types,
    characterRelationContract?.relationshipTypes,
    characterRelationContract?.attitude_shifts,
    characterRelationContract?.attitudeShifts,
    characterRelationContract?.tests_or_pressure,
    characterRelationContract?.testsOrPressure,
    chapterTarget?.relationship_line,
    chapterTarget?.relationshipLine,
    chapterTarget?.romance_line,
    chapterTarget?.romanceLine,
    preDraftBrief?.relationship_line,
    preDraftBrief?.relationshipLine,
    preDraftBrief?.romance_line,
    preDraftBrief?.romanceLine,
    ...sceneCards.flatMap((scene: any) => [
      scene?.purpose,
      scene?.goal,
      scene?.conflict,
      scene?.relationship_change,
      scene?.relationshipChange,
      scene?.relation_change,
      scene?.relationChange,
      scene?.romance_beat,
      scene?.romanceBeat,
      scene?.emotional_turn,
      scene?.emotionalTurn,
      scene?.state_change,
      scene?.stateChange,
    ]),
  ].flat().map((item: any) => String(item || '').trim()).filter(Boolean).join('。'))
  SERIAL_ROMANCE_CONTEXT_PATTERN.lastIndex = 0
  SERIAL_ROMANCE_TENSION_LAYER_PATTERN.lastIndex = 0
  return {
    has_romance_context: Boolean(text && SERIAL_ROMANCE_CONTEXT_PATTERN.test(text)),
    has_tension_layer: Boolean(text && SERIAL_ROMANCE_TENSION_LAYER_PATTERN.test(text)),
  }
}

function serialChapterRomanceCareerBindingState(chapter: any) {
  const rawPayload = chapter?.raw_payload || chapter?.rawPayload || {}
  const blueprint = serialChapterBlueprintForLines(chapter)
  const storyLoop = serialChapterStoryLoopContract(chapter)
  const outline = blueprint?.content_outline || blueprint?.contentOutline || {}
  const plotLines = blueprint?.plot_lines || blueprint?.plotLines || {}
  const preDraftBrief = rawPayload?.pre_draft_brief || rawPayload?.preDraftBrief || {}
  const chapterTarget = serialChapterRawContextTarget(chapter)
  const femaleAudienceContract = chapter?.female_audience_contract
    || chapter?.femaleAudienceContract
    || rawPayload?.female_audience_contract
    || rawPayload?.femaleAudienceContract
    || preDraftBrief?.female_audience_contract
    || preDraftBrief?.femaleAudienceContract
    || chapterTarget?.female_audience_contract
    || chapterTarget?.femaleAudienceContract
    || blueprint?.female_audience_contract
    || blueprint?.femaleAudienceContract
    || {}
  const characterRelationContract = chapter?.character_relation_contract
    || chapter?.characterRelationContract
    || rawPayload?.character_relation_contract
    || rawPayload?.characterRelationContract
    || preDraftBrief?.character_relation_contract
    || preDraftBrief?.characterRelationContract
    || chapterTarget?.character_relation_contract
    || chapterTarget?.characterRelationContract
    || blueprint?.character_relation_contract
    || blueprint?.characterRelationContract
    || {}
  const sceneCards = [
    ...asArray(chapter?.scene_cards || chapter?.sceneCards),
    ...asArray(rawPayload?.scene_cards || rawPayload?.sceneCards),
    ...asArray(preDraftBrief?.scene_briefs || preDraftBrief?.sceneBriefs),
  ]
  const text = compactBriefText([
    chapter?.chapter_summary,
    chapter?.summary,
    chapter?.conflict,
    chapter?.ending_hook,
    chapter?.endingHook,
    rawPayload?.chapter_summary,
    rawPayload?.chapterSummary,
    rawPayload?.summary,
    rawPayload?.conflict,
    rawPayload?.ending_hook,
    rawPayload?.endingHook,
    outline?.cause,
    outline?.development,
    outline?.turn,
    outline?.climax,
    outline?.ending,
    plotLines?.mainline,
    plotLines?.main_line,
    plotLines?.mainLine,
    plotLines?.career_line,
    plotLines?.careerLine,
    plotLines?.business_line,
    plotLines?.businessLine,
    plotLines?.growth_line,
    plotLines?.growthLine,
    plotLines?.relationship_line,
    plotLines?.relationshipLine,
    plotLines?.romance_line,
    plotLines?.romanceLine,
    storyLoop?.setup,
    storyLoop?.escalation,
    storyLoop?.payoff,
    storyLoop?.carry_over,
    storyLoop?.carryOver,
    femaleAudienceContract?.romance_axis_rules,
    femaleAudienceContract?.romanceAxisRules,
    femaleAudienceContract?.career_axis_rules,
    femaleAudienceContract?.careerAxisRules,
    femaleAudienceContract?.reader_need_rules,
    femaleAudienceContract?.readerNeedRules,
    characterRelationContract?.relationship_types,
    characterRelationContract?.relationshipTypes,
    characterRelationContract?.attitude_shifts,
    characterRelationContract?.attitudeShifts,
    characterRelationContract?.career_linkage,
    characterRelationContract?.careerLinkage,
    characterRelationContract?.tests_or_pressure,
    characterRelationContract?.testsOrPressure,
    chapterTarget?.mainline,
    chapterTarget?.main_line,
    chapterTarget?.mainLine,
    chapterTarget?.career_line,
    chapterTarget?.careerLine,
    chapterTarget?.business_line,
    chapterTarget?.businessLine,
    chapterTarget?.relationship_line,
    chapterTarget?.relationshipLine,
    chapterTarget?.romance_line,
    chapterTarget?.romanceLine,
    preDraftBrief?.mainline,
    preDraftBrief?.main_line,
    preDraftBrief?.mainLine,
    preDraftBrief?.career_line,
    preDraftBrief?.careerLine,
    preDraftBrief?.business_line,
    preDraftBrief?.businessLine,
    preDraftBrief?.relationship_line,
    preDraftBrief?.relationshipLine,
    preDraftBrief?.romance_line,
    preDraftBrief?.romanceLine,
    ...sceneCards.flatMap((scene: any) => [
      scene?.purpose,
      scene?.goal,
      scene?.conflict,
      scene?.mainline_change,
      scene?.mainlineChange,
      scene?.career_change,
      scene?.careerChange,
      scene?.business_change,
      scene?.businessChange,
      scene?.relationship_change,
      scene?.relationshipChange,
      scene?.relation_change,
      scene?.relationChange,
      scene?.romance_beat,
      scene?.romanceBeat,
      scene?.emotional_turn,
      scene?.emotionalTurn,
      scene?.state_change,
      scene?.stateChange,
      scene?.consequence,
      scene?.result,
      scene?.reward,
      scene?.gain,
    ]),
  ].flat().map((item: any) => String(item || '').trim()).filter(Boolean).join('。'))
  SERIAL_ROMANCE_CONTEXT_PATTERN.lastIndex = 0
  SERIAL_ROMANCE_CAREER_BINDING_PATTERN.lastIndex = 0
  return {
    has_romance_context: Boolean(text && SERIAL_ROMANCE_CONTEXT_PATTERN.test(text)),
    has_career_binding: Boolean(text && SERIAL_ROMANCE_CAREER_BINDING_PATTERN.test(text)),
  }
}

function serialChapterShowdownContract(chapter: any, blueprint: any = null) {
  const rawPayload = chapter?.raw_payload || chapter?.rawPayload || {}
  return chapter?.showdown_contract
    || chapter?.showdownContract
    || rawPayload?.showdown_contract
    || rawPayload?.showdownContract
    || rawPayload?.pre_draft_brief?.showdown_contract
    || rawPayload?.pre_draft_brief?.showdownContract
    || rawPayload?.preDraftBrief?.showdown_contract
    || rawPayload?.preDraftBrief?.showdownContract
    || rawPayload?.context_package?.chapter_target?.showdown_contract
    || rawPayload?.context_package?.chapter_target?.showdownContract
    || rawPayload?.context_package?.chapterTarget?.showdown_contract
    || rawPayload?.context_package?.chapterTarget?.showdownContract
    || rawPayload?.contextPackage?.chapter_target?.showdown_contract
    || rawPayload?.contextPackage?.chapter_target?.showdownContract
    || rawPayload?.contextPackage?.chapterTarget?.showdown_contract
    || rawPayload?.contextPackage?.chapterTarget?.showdownContract
    || blueprint?.showdown_contract
    || blueprint?.showdownContract
    || {}
}

function serialChapterTrumpCardReserveState(chapter: any) {
  const rawPayload = chapter?.raw_payload || chapter?.rawPayload || {}
  const blueprint = serialChapterBlueprintForLines(chapter)
  const outline = blueprint?.content_outline || blueprint?.contentOutline || {}
  const plotLines = blueprint?.plot_lines || blueprint?.plotLines || {}
  const showdownContract = serialChapterShowdownContract(chapter, blueprint)
  const sceneCards = [
    ...asArray(chapter?.scene_cards || chapter?.sceneCards),
    ...asArray(rawPayload?.scene_cards || rawPayload?.sceneCards),
    ...asArray(rawPayload?.pre_draft_brief?.scene_briefs || rawPayload?.preDraftBrief?.sceneBriefs),
  ]
  const text = compactBriefText([
    serialChapterText(chapter),
    outline?.cause,
    outline?.development,
    outline?.turn,
    outline?.climax,
    outline?.ending,
    plotLines?.mainline,
    plotLines?.main_line,
    plotLines?.mainLine,
    plotLines?.growth_line,
    plotLines?.growthLine,
    plotLines?.upgrade_line,
    plotLines?.upgradeLine,
    showdownContract?.payoff_release_rules,
    showdownContract?.payoffReleaseRules,
    showdownContract?.trump_card_reserve_rules,
    showdownContract?.trumpCardReserveRules,
    showdownContract?.quality_checks,
    showdownContract?.qualityChecks,
    ...sceneCards.flatMap((scene: any) => [
      scene?.purpose,
      scene?.goal,
      scene?.conflict,
      scene?.reader_payoff,
      scene?.readerPayoff,
      scene?.payoff,
      scene?.trump_card,
      scene?.trumpCard,
      scene?.reserve,
      scene?.backhand,
      scene?.state_change,
      scene?.stateChange,
      scene?.ending_hook,
      scene?.endingHook,
    ]),
  ].flat().map((item: any) => String(item || '').trim()).filter(Boolean).join('。'))
  SERIAL_TRUMP_CARD_RELEASE_PATTERN.lastIndex = 0
  SERIAL_TRUMP_CARD_RESERVE_PATTERN.lastIndex = 0
  SERIAL_TRUMP_CARD_DEPLETION_PATTERN.lastIndex = 0
  const hasRelease = Boolean(text && SERIAL_TRUMP_CARD_RELEASE_PATTERN.test(text))
  const hasReserve = Boolean(text && SERIAL_TRUMP_CARD_RESERVE_PATTERN.test(text))
  const hasDepletion = Boolean(text && SERIAL_TRUMP_CARD_DEPLETION_PATTERN.test(text))
  return {
    has_trump_card_release: hasRelease,
    has_trump_card_reserve: hasReserve && !hasDepletion,
  }
}

function serialChapterShowdownPressureShockState(chapter: any) {
  const rawPayload = chapter?.raw_payload || chapter?.rawPayload || {}
  const blueprint = serialChapterBlueprintForLines(chapter)
  const outline = blueprint?.content_outline || blueprint?.contentOutline || {}
  const plotLines = blueprint?.plot_lines || blueprint?.plotLines || {}
  const showdownContract = serialChapterShowdownContract(chapter, blueprint)
  const sceneCards = [
    ...asArray(chapter?.scene_cards || chapter?.sceneCards),
    ...asArray(rawPayload?.scene_cards || rawPayload?.sceneCards),
    ...asArray(rawPayload?.pre_draft_brief?.scene_briefs || rawPayload?.preDraftBrief?.sceneBriefs),
  ]
  const text = compactBriefText([
    serialChapterText(chapter),
    outline?.cause,
    outline?.development,
    outline?.turn,
    outline?.climax,
    outline?.ending,
    plotLines?.mainline,
    plotLines?.main_line,
    plotLines?.mainLine,
    plotLines?.showdown_line,
    plotLines?.showdownLine,
    plotLines?.payoff_line,
    plotLines?.payoffLine,
    showdownContract?.payoff_release_rules,
    showdownContract?.payoffReleaseRules,
    showdownContract?.three_pressure_shock_rules,
    showdownContract?.threePressureShockRules,
    showdownContract?.stage_chain_rules,
    showdownContract?.stageChainRules,
    showdownContract?.shock_chain_rules,
    showdownContract?.shockChainRules,
    showdownContract?.quality_checks,
    showdownContract?.qualityChecks,
    ...sceneCards.flatMap((scene: any) => [
      scene?.purpose,
      scene?.goal,
      scene?.conflict,
      scene?.reader_payoff,
      scene?.readerPayoff,
      scene?.payoff,
      scene?.showdown,
      scene?.shock_layers,
      scene?.shockLayers,
      scene?.pressure,
      scene?.state_change,
      scene?.stateChange,
      scene?.ending_hook,
      scene?.endingHook,
    ]),
  ].flat().map((item: any) => String(item || '').trim()).filter(Boolean).join('。'))
  SERIAL_SHOWDOWN_CONTEXT_PATTERN.lastIndex = 0
  SERIAL_SHOWDOWN_FRIENDLY_PRESSURE_PATTERN.lastIndex = 0
  SERIAL_SHOWDOWN_ENEMY_PRESSURE_PATTERN.lastIndex = 0
  SERIAL_SHOWDOWN_NEUTRAL_PRESSURE_PATTERN.lastIndex = 0
  SERIAL_SHOWDOWN_BURST_PATTERN.lastIndex = 0
  SERIAL_SHOWDOWN_FRIENDLY_SHOCK_PATTERN.lastIndex = 0
  SERIAL_SHOWDOWN_ENEMY_SHOCK_PATTERN.lastIndex = 0
  SERIAL_SHOWDOWN_NEUTRAL_SHOCK_PATTERN.lastIndex = 0
  const hasFriendlyPressure = Boolean(text && SERIAL_SHOWDOWN_FRIENDLY_PRESSURE_PATTERN.test(text))
  const hasEnemyPressure = Boolean(text && SERIAL_SHOWDOWN_ENEMY_PRESSURE_PATTERN.test(text))
  const hasNeutralPressure = Boolean(text && SERIAL_SHOWDOWN_NEUTRAL_PRESSURE_PATTERN.test(text))
  const hasFriendlyShock = Boolean(text && SERIAL_SHOWDOWN_FRIENDLY_SHOCK_PATTERN.test(text))
  const hasEnemyShock = Boolean(text && SERIAL_SHOWDOWN_ENEMY_SHOCK_PATTERN.test(text))
  const hasNeutralShock = Boolean(text && SERIAL_SHOWDOWN_NEUTRAL_SHOCK_PATTERN.test(text))
  return {
    has_showdown_context: Boolean(text && SERIAL_SHOWDOWN_CONTEXT_PATTERN.test(text)),
    has_pressure_shock_structure: Boolean(
      text
      && hasFriendlyPressure
      && hasEnemyPressure
      && hasNeutralPressure
      && SERIAL_SHOWDOWN_BURST_PATTERN.test(text)
      && hasFriendlyShock
      && hasEnemyShock
      && hasNeutralShock,
    ),
  }
}

function serialChapterCharacterMotivationState(chapter: any) {
  const rawPayload = chapter?.raw_payload || chapter?.rawPayload || {}
  const blueprint = serialChapterBlueprintForLines(chapter)
  const outline = blueprint?.content_outline || blueprint?.contentOutline || {}
  const plotLines = blueprint?.plot_lines || blueprint?.plotLines || {}
  const preDraftBrief = rawPayload?.pre_draft_brief || rawPayload?.preDraftBrief || {}
  const chapterTarget = serialChapterRawContextTarget(chapter)
  const characterBehaviorContract = chapter?.character_behavior_contract
    || chapter?.characterBehaviorContract
    || rawPayload?.character_behavior_contract
    || rawPayload?.characterBehaviorContract
    || preDraftBrief?.character_behavior_contract
    || preDraftBrief?.characterBehaviorContract
    || chapterTarget?.character_behavior_contract
    || chapterTarget?.characterBehaviorContract
    || blueprint?.character_behavior_contract
    || blueprint?.characterBehaviorContract
    || {}
  const sceneCards = [
    ...asArray(chapter?.scene_cards || chapter?.sceneCards),
    ...asArray(rawPayload?.scene_cards || rawPayload?.sceneCards),
    ...asArray(preDraftBrief?.scene_briefs || preDraftBrief?.sceneBriefs),
  ]
  const text = compactBriefText([
    chapter?.chapter_summary,
    chapter?.summary,
    chapter?.conflict,
    chapter?.ending_hook,
    chapter?.endingHook,
    rawPayload?.chapter_summary,
    rawPayload?.chapterSummary,
    rawPayload?.summary,
    rawPayload?.conflict,
    rawPayload?.ending_hook,
    rawPayload?.endingHook,
    outline?.cause,
    outline?.development,
    outline?.turn,
    outline?.climax,
    outline?.ending,
    plotLines?.character_line,
    plotLines?.characterLine,
    plotLines?.relationship_line,
    plotLines?.relationshipLine,
    plotLines?.mainline,
    plotLines?.main_line,
    plotLines?.mainLine,
    characterBehaviorContract?.motivation_chain,
    characterBehaviorContract?.motivationChain,
    characterBehaviorContract?.motivation_specificity_rules,
    characterBehaviorContract?.motivationSpecificityRules,
    characterBehaviorContract?.behavior_rules,
    characterBehaviorContract?.behaviorRules,
    characterBehaviorContract?.quality_checks,
    characterBehaviorContract?.qualityChecks,
    chapterTarget?.character_line,
    chapterTarget?.characterLine,
    preDraftBrief?.character_line,
    preDraftBrief?.characterLine,
    ...sceneCards.flatMap((scene: any) => [
      scene?.characters,
      scene?.participants,
      scene?.purpose,
      scene?.goal,
      scene?.conflict,
      scene?.motivation,
      scene?.motive,
      scene?.cause,
      scene?.constraint,
      scene?.cost,
      scene?.risk,
      scene?.state_change,
      scene?.stateChange,
    ]),
  ].flat().map((item: any) => String(item || '').trim()).filter(Boolean).join('。'))
  SERIAL_CHARACTER_ACTION_PATTERN.lastIndex = 0
  SERIAL_PLOT_CONVENIENCE_PATTERN.lastIndex = 0
  SERIAL_CHARACTER_MOTIVATION_PATTERN.lastIndex = 0
  return {
    has_character_action: Boolean(text && SERIAL_CHARACTER_ACTION_PATTERN.test(text)),
    has_plot_convenience: Boolean(text && SERIAL_PLOT_CONVENIENCE_PATTERN.test(text)),
    has_motivation_chain: Boolean(text && SERIAL_CHARACTER_MOTIVATION_PATTERN.test(text)),
  }
}

function serialChapterSupportingAgencyState(chapter: any) {
  const rawPayload = chapter?.raw_payload || chapter?.rawPayload || {}
  const blueprint = serialChapterBlueprintForLines(chapter)
  const outline = blueprint?.content_outline || blueprint?.contentOutline || {}
  const plotLines = blueprint?.plot_lines || blueprint?.plotLines || {}
  const preDraftBrief = rawPayload?.pre_draft_brief || rawPayload?.preDraftBrief || {}
  const chapterTarget = serialChapterRawContextTarget(chapter)
  const characterRelationContract = chapter?.character_relation_contract
    || chapter?.characterRelationContract
    || rawPayload?.character_relation_contract
    || rawPayload?.characterRelationContract
    || preDraftBrief?.character_relation_contract
    || preDraftBrief?.characterRelationContract
    || chapterTarget?.character_relation_contract
    || chapterTarget?.characterRelationContract
    || blueprint?.character_relation_contract
    || blueprint?.characterRelationContract
    || {}
  const characterBehaviorContract = chapter?.character_behavior_contract
    || chapter?.characterBehaviorContract
    || rawPayload?.character_behavior_contract
    || rawPayload?.characterBehaviorContract
    || preDraftBrief?.character_behavior_contract
    || preDraftBrief?.characterBehaviorContract
    || chapterTarget?.character_behavior_contract
    || chapterTarget?.characterBehaviorContract
    || blueprint?.character_behavior_contract
    || blueprint?.characterBehaviorContract
    || {}
  const sceneCards = [
    ...asArray(chapter?.scene_cards || chapter?.sceneCards),
    ...asArray(rawPayload?.scene_cards || rawPayload?.sceneCards),
    ...asArray(preDraftBrief?.scene_briefs || preDraftBrief?.sceneBriefs),
  ]
  const text = compactBriefText([
    chapter?.chapter_summary,
    chapter?.summary,
    chapter?.conflict,
    chapter?.ending_hook,
    chapter?.endingHook,
    rawPayload?.chapter_summary,
    rawPayload?.chapterSummary,
    rawPayload?.summary,
    rawPayload?.conflict,
    rawPayload?.ending_hook,
    rawPayload?.endingHook,
    outline?.cause,
    outline?.development,
    outline?.turn,
    outline?.climax,
    outline?.ending,
    plotLines?.relationship_line,
    plotLines?.relationshipLine,
    plotLines?.character_line,
    plotLines?.characterLine,
    plotLines?.subplot,
    plotLines?.sub_line,
    plotLines?.subLine,
    characterRelationContract?.relationship_types,
    characterRelationContract?.relationshipTypes,
    characterRelationContract?.important_relationships,
    characterRelationContract?.importantRelationships,
    characterRelationContract?.independent_goals,
    characterRelationContract?.independentGoals,
    characterRelationContract?.relationship_life_rules,
    characterRelationContract?.relationshipLifeRules,
    characterRelationContract?.tests_or_pressure,
    characterRelationContract?.testsOrPressure,
    characterRelationContract?.attitude_shifts,
    characterRelationContract?.attitudeShifts,
    characterBehaviorContract?.motivation_chain,
    characterBehaviorContract?.motivationChain,
    characterBehaviorContract?.supporting_role_functions,
    characterBehaviorContract?.supportingRoleFunctions,
    characterBehaviorContract?.antagonist_logic,
    characterBehaviorContract?.antagonistLogic,
    characterBehaviorContract?.antagonist_self_story_rules,
    characterBehaviorContract?.antagonistSelfStoryRules,
    chapterTarget?.relationship_line,
    chapterTarget?.relationshipLine,
    chapterTarget?.character_line,
    chapterTarget?.characterLine,
    preDraftBrief?.relationship_line,
    preDraftBrief?.relationshipLine,
    preDraftBrief?.character_line,
    preDraftBrief?.characterLine,
    ...sceneCards.flatMap((scene: any) => [
      scene?.characters,
      scene?.participants,
      scene?.purpose,
      scene?.goal,
      scene?.conflict,
      scene?.stakeholder,
      scene?.motivation,
      scene?.motive,
      scene?.position,
      scene?.stance,
      scene?.interest,
      scene?.cost,
      scene?.relationship_change,
      scene?.relationshipChange,
      scene?.state_change,
      scene?.stateChange,
    ]),
  ].flat().map((item: any) => String(item || '').trim()).filter(Boolean).join('。'))
  SERIAL_SUPPORTING_CHARACTER_ACTIVITY_PATTERN.lastIndex = 0
  SERIAL_SUPPORTING_CHARACTER_AGENCY_PATTERN.lastIndex = 0
  return {
    has_supporting_activity: Boolean(text && SERIAL_SUPPORTING_CHARACTER_ACTIVITY_PATTERN.test(text)),
    has_supporting_agency: Boolean(text && SERIAL_SUPPORTING_CHARACTER_AGENCY_PATTERN.test(text)),
  }
}

function serialChapterProtagonistGoalState(chapter: any) {
  const rawPayload = chapter?.raw_payload || chapter?.rawPayload || {}
  const blueprint = serialChapterBlueprintForLines(chapter)
  const storyLoop = serialChapterStoryLoopContract(chapter)
  const contentOutline = blueprint?.content_outline || blueprint?.contentOutline || {}
  const plotLines = blueprint?.plot_lines || blueprint?.plotLines || {}
  const preDraftBrief = rawPayload?.pre_draft_brief || rawPayload?.preDraftBrief || {}
  const chapterTarget = serialChapterRawContextTarget(chapter)
  const explicitCurrentGoal = firstCompactText(
    chapter?.chapter_goal,
    chapter?.chapterGoal,
    chapter?.goal,
    chapter?.current_goal,
    chapter?.currentGoal,
    chapter?.short_goal,
    chapter?.shortGoal,
    chapter?.protagonist_goal,
    chapter?.protagonistGoal,
    rawPayload?.chapter_goal,
    rawPayload?.chapterGoal,
    rawPayload?.goal,
    rawPayload?.current_goal,
    rawPayload?.currentGoal,
    rawPayload?.short_goal,
    rawPayload?.shortGoal,
    rawPayload?.protagonist_goal,
    rawPayload?.protagonistGoal,
    preDraftBrief?.chapter_goal,
    preDraftBrief?.chapterGoal,
    preDraftBrief?.goal,
    preDraftBrief?.current_goal,
    preDraftBrief?.currentGoal,
    preDraftBrief?.short_goal,
    preDraftBrief?.shortGoal,
    preDraftBrief?.protagonist_goal,
    preDraftBrief?.protagonistGoal,
    chapterTarget?.chapter_goal,
    chapterTarget?.chapterGoal,
    chapterTarget?.goal,
    chapterTarget?.current_goal,
    chapterTarget?.currentGoal,
    blueprint?.chapter_goal,
    blueprint?.chapterGoal,
    blueprint?.goal,
    blueprint?.current_goal,
    blueprint?.currentGoal,
    blueprint?.short_goal,
    blueprint?.shortGoal,
    blueprint?.protagonist_goal,
    blueprint?.protagonistGoal,
    storyLoop?.goal,
    storyLoop?.current_goal,
    storyLoop?.currentGoal,
    storyLoop?.short_goal,
    storyLoop?.shortGoal,
  )
  const explicitLongGoal = firstCompactText(
    chapter?.long_term_goal,
    chapter?.longTermGoal,
    chapter?.long_goal,
    chapter?.longGoal,
    chapter?.big_goal,
    chapter?.bigGoal,
    chapter?.volume_goal,
    chapter?.volumeGoal,
    chapter?.mainline_goal,
    chapter?.mainlineGoal,
    rawPayload?.long_term_goal,
    rawPayload?.longTermGoal,
    rawPayload?.long_goal,
    rawPayload?.longGoal,
    rawPayload?.big_goal,
    rawPayload?.bigGoal,
    rawPayload?.volume_goal,
    rawPayload?.volumeGoal,
    rawPayload?.current_volume_goal,
    rawPayload?.currentVolumeGoal,
    preDraftBrief?.long_term_goal,
    preDraftBrief?.longTermGoal,
    preDraftBrief?.long_goal,
    preDraftBrief?.longGoal,
    preDraftBrief?.big_goal,
    preDraftBrief?.bigGoal,
    preDraftBrief?.volume_goal,
    preDraftBrief?.volumeGoal,
    chapterTarget?.long_term_goal,
    chapterTarget?.longTermGoal,
    chapterTarget?.volume_goal,
    chapterTarget?.volumeGoal,
    blueprint?.long_term_goal,
    blueprint?.longTermGoal,
    blueprint?.long_goal,
    blueprint?.longGoal,
    blueprint?.big_goal,
    blueprint?.bigGoal,
    blueprint?.volume_goal,
    blueprint?.volumeGoal,
    blueprint?.mainline_goal,
    blueprint?.mainlineGoal,
    storyLoop?.long_term_goal,
    storyLoop?.longTermGoal,
    storyLoop?.long_goal,
    storyLoop?.longGoal,
    storyLoop?.big_goal,
    storyLoop?.bigGoal,
    storyLoop?.volume_goal,
    storyLoop?.volumeGoal,
    storyLoop?.mainline_goal,
    storyLoop?.mainlineGoal,
  )
  const contractText = compactBriefText([
    contentOutline?.cause,
    contentOutline?.development,
    contentOutline?.turn,
    contentOutline?.climax,
    contentOutline?.ending,
    plotLines?.mainline,
    plotLines?.main_line,
    plotLines?.mainLine,
    plotLines?.logic_line,
    plotLines?.logicLine,
    plotLines?.event_line,
    plotLines?.eventLine,
    storyLoop?.setup,
    storyLoop?.escalation,
    storyLoop?.carry_over,
    storyLoop?.carryOver,
    storyLoop?.nested_loop_rules,
    storyLoop?.nestedLoopRules,
  ].flat().map((item: any) => String(item || '').trim()).filter(Boolean).join('。'))
  const hasPlanningContract = Boolean(
    explicitCurrentGoal
    || explicitLongGoal
    || Object.keys(blueprint || {}).length
    || Object.keys(storyLoop || {}).length
    || preDraftBrief?.chapter_blueprint
    || preDraftBrief?.chapterBlueprint
    || chapterTarget?.chapter_blueprint
    || chapterTarget?.chapterBlueprint,
  )
  SERIAL_PROTAGONIST_CURRENT_GOAL_PATTERN.lastIndex = 0
  SERIAL_PROTAGONIST_LONG_GOAL_PATTERN.lastIndex = 0
  const hasCurrentGoal = Boolean(explicitCurrentGoal || SERIAL_PROTAGONIST_CURRENT_GOAL_PATTERN.test(contractText))
  const hasLongGoal = Boolean(explicitLongGoal || SERIAL_PROTAGONIST_LONG_GOAL_PATTERN.test(contractText))
  return {
    has_goal_contract: hasPlanningContract,
    has_current_goal: hasCurrentGoal,
    has_long_goal: hasLongGoal,
    missing: [
      hasCurrentGoal ? '' : '当前小目标',
      hasLongGoal ? '' : '长线大目标',
    ].filter(Boolean),
  }
}

function serialChapterStoryLoopContract(chapter: any) {
  const rawPayload = chapter?.raw_payload || chapter?.rawPayload || {}
  const chapterTarget = serialChapterRawContextTarget(chapter)
  return chapter?.story_loop_contract
    || chapter?.storyLoopContract
    || rawPayload?.story_loop_contract
    || rawPayload?.storyLoopContract
    || rawPayload?.pre_draft_brief?.story_loop_contract
    || rawPayload?.preDraftBrief?.storyLoopContract
    || chapterTarget?.story_loop_contract
    || chapterTarget?.storyLoopContract
    || rawPayload?.context_package?.story_loop_contract
    || rawPayload?.contextPackage?.storyLoopContract
    || {}
}

function serialChapterNoExitGlueState(chapter: any) {
  const rawPayload = chapter?.raw_payload || chapter?.rawPayload || {}
  const blueprint = serialChapterBlueprintForLines(chapter)
  const preDraftBrief = rawPayload?.pre_draft_brief || rawPayload?.preDraftBrief || {}
  const chapterTarget = serialChapterRawContextTarget(chapter)
  const conflictStructureContract = chapter?.conflict_structure_contract
    || chapter?.conflictStructureContract
    || rawPayload?.conflict_structure_contract
    || rawPayload?.conflictStructureContract
    || preDraftBrief?.conflict_structure_contract
    || preDraftBrief?.conflictStructureContract
    || chapterTarget?.conflict_structure_contract
    || chapterTarget?.conflictStructureContract
    || blueprint?.conflict_structure_contract
    || blueprint?.conflictStructureContract
    || {}
  const sceneCards = [
    ...asArray(chapter?.scene_cards || chapter?.sceneCards),
    ...asArray(rawPayload?.scene_cards || rawPayload?.sceneCards),
    ...asArray(preDraftBrief?.scene_briefs || preDraftBrief?.sceneBriefs),
  ]
  const text = compactBriefText([
    chapter?.chapter_summary,
    chapter?.summary,
    chapter?.conflict,
    chapter?.chapter_conflict,
    chapter?.chapterConflict,
    chapter?.conflict_summary,
    chapter?.conflictSummary,
    rawPayload?.chapter_summary,
    rawPayload?.chapterSummary,
    rawPayload?.summary,
    rawPayload?.conflict,
    rawPayload?.chapter_conflict,
    rawPayload?.chapterConflict,
    rawPayload?.conflict_summary,
    rawPayload?.conflictSummary,
    conflictStructureContract?.no_exit_rules,
    conflictStructureContract?.noExitRules,
    conflictStructureContract?.stakes,
    conflictStructureContract?.exit_cost,
    conflictStructureContract?.exitCost,
    conflictStructureContract?.glue,
    conflictStructureContract?.conflict_glue,
    conflictStructureContract?.conflictGlue,
    blueprint?.conflict,
    blueprint?.chapter_conflict,
    blueprint?.chapterConflict,
    blueprint?.stakes,
    blueprint?.exit_cost,
    blueprint?.exitCost,
    ...sceneCards.flatMap((scene: any) => [
      scene?.conflict,
      scene?.obstacle,
      scene?.rule_pressure,
      scene?.rulePressure,
      scene?.fear_point,
      scene?.fearPoint,
      scene?.stakes,
      scene?.exit_cost,
      scene?.exitCost,
      scene?.no_exit_rule,
      scene?.noExitRule,
      scene?.glue,
      scene?.conflict_glue,
      scene?.conflictGlue,
    ]),
  ].flat().map((item: any) => String(item || '').trim()).filter(Boolean).join('。'))
  SERIAL_WEAK_CONFLICT_PATTERN.lastIndex = 0
  SERIAL_CONFLICT_SIGNAL_PATTERN.lastIndex = 0
  SERIAL_NO_EXIT_GLUE_PATTERN.lastIndex = 0
  SERIAL_LOOSE_EXIT_PATTERN.lastIndex = 0
  const hasConflict = Boolean(text && SERIAL_CONFLICT_SIGNAL_PATTERN.test(text) && !SERIAL_WEAK_CONFLICT_PATTERN.test(text))
  const hasLooseExit = Boolean(text && SERIAL_LOOSE_EXIT_PATTERN.test(text))
  const hasNoExitGlue = Boolean(text && SERIAL_NO_EXIT_GLUE_PATTERN.test(text) && !hasLooseExit)
  return {
    has_conflict: hasConflict,
    has_no_exit_glue: hasNoExitGlue,
    has_loose_exit: hasLooseExit,
  }
}

function serialChapterSocialNetworkState(chapter: any) {
  const rawPayload = chapter?.raw_payload || chapter?.rawPayload || {}
  const blueprint = serialChapterBlueprintForLines(chapter)
  const preDraftBrief = rawPayload?.pre_draft_brief || rawPayload?.preDraftBrief || {}
  const chapterTarget = serialChapterRawContextTarget(chapter)
  const sceneCards = [
    ...asArray(chapter?.scene_cards || chapter?.sceneCards),
    ...asArray(rawPayload?.scene_cards || rawPayload?.sceneCards),
    ...asArray(preDraftBrief?.scene_briefs || preDraftBrief?.sceneBriefs),
  ]
  const text = compactBriefText([
    chapter?.chapter_summary,
    chapter?.summary,
    chapter?.conflict,
    chapter?.ending_hook,
    chapter?.endingHook,
    rawPayload?.chapter_summary,
    rawPayload?.chapterSummary,
    rawPayload?.summary,
    rawPayload?.conflict,
    rawPayload?.ending_hook,
    rawPayload?.endingHook,
    blueprint?.relationship_change,
    blueprint?.relationshipChange,
    blueprint?.character_relation,
    blueprint?.characterRelation,
    blueprint?.social_network,
    blueprint?.socialNetwork,
    chapterTarget?.relationship_change,
    chapterTarget?.relationshipChange,
    chapterTarget?.social_network,
    chapterTarget?.socialNetwork,
    preDraftBrief?.relationship_change,
    preDraftBrief?.relationshipChange,
    preDraftBrief?.social_network,
    preDraftBrief?.socialNetwork,
    ...sceneCards.flatMap((scene: any) => [
      scene?.characters,
      scene?.participants,
      scene?.relationship_change,
      scene?.relationshipChange,
      scene?.relation_change,
      scene?.relationChange,
      scene?.social_interaction,
      scene?.socialInteraction,
      scene?.dialogue_goal,
      scene?.dialogueGoal,
      scene?.stakeholder,
      scene?.witness_reactions,
      scene?.witnessReactions,
      scene?.spectator_reactions,
      scene?.spectatorReactions,
    ]),
  ].flat().map((item: any) => String(item || '').trim()).filter(Boolean).join('。'))
  SERIAL_SOCIAL_INTERACTION_PATTERN.lastIndex = 0
  return {
    has_social_interaction: Boolean(text && SERIAL_SOCIAL_INTERACTION_PATTERN.test(text)),
  }
}

function serialChapterUpperStatusState(chapter: any) {
  const rawPayload = chapter?.raw_payload || chapter?.rawPayload || {}
  const blueprint = serialChapterBlueprintForLines(chapter)
  const preDraftBrief = rawPayload?.pre_draft_brief || rawPayload?.preDraftBrief || {}
  const storyLoop = serialChapterStoryLoopContract(chapter)
  const outline = blueprint?.content_outline || blueprint?.contentOutline || {}
  const plotLines = blueprint?.plot_lines || blueprint?.plotLines || {}
  const sceneCards = [
    ...asArray(chapter?.scene_cards || chapter?.sceneCards),
    ...asArray(rawPayload?.scene_cards || rawPayload?.sceneCards),
    ...asArray(preDraftBrief?.scene_briefs || preDraftBrief?.sceneBriefs),
  ]
  const text = compactBriefText([
    chapter?.chapter_summary,
    chapter?.summary,
    chapter?.conflict,
    chapter?.reader_payoff,
    chapter?.readerPayoff,
    chapter?.ending_hook,
    chapter?.endingHook,
    rawPayload?.chapter_summary,
    rawPayload?.chapterSummary,
    rawPayload?.summary,
    rawPayload?.conflict,
    rawPayload?.reader_payoff,
    rawPayload?.readerPayoff,
    rawPayload?.ending_hook,
    rawPayload?.endingHook,
    outline?.cause,
    outline?.development,
    outline?.turn,
    outline?.climax,
    outline?.ending,
    plotLines?.mainline,
    plotLines?.main_line,
    plotLines?.mainLine,
    plotLines?.event_line,
    plotLines?.eventLine,
    storyLoop?.setup,
    storyLoop?.escalation,
    storyLoop?.payoff,
    storyLoop?.carry_over,
    storyLoop?.carryOver,
    storyLoop?.map_transition_rules,
    storyLoop?.mapTransitionRules,
    ...sceneCards.flatMap((scene: any) => [
      scene?.goal,
      scene?.conflict,
      scene?.obstacle,
      scene?.state_change,
      scene?.stateChange,
      scene?.reader_payoff,
      scene?.readerPayoff,
      scene?.stakes,
      scene?.rule_pressure,
      scene?.rulePressure,
    ]),
  ].flat().map((item: any) => String(item || '').trim()).filter(Boolean).join('。'))
  SERIAL_STATUS_LADDER_CONTEXT_PATTERN.lastIndex = 0
  SERIAL_UPPER_STATUS_CONTACT_PATTERN.lastIndex = 0
  return {
    has_status_ladder_context: Boolean(text && SERIAL_STATUS_LADDER_CONTEXT_PATTERN.test(text)),
    has_upper_status_contact: Boolean(text && SERIAL_UPPER_STATUS_CONTACT_PATTERN.test(text)),
  }
}

function serialChapterDownwardRecoveryState(chapter: any) {
  const rawPayload = chapter?.raw_payload || chapter?.rawPayload || {}
  const blueprint = serialChapterBlueprintForLines(chapter)
  const preDraftBrief = rawPayload?.pre_draft_brief || rawPayload?.preDraftBrief || {}
  const outline = blueprint?.content_outline || blueprint?.contentOutline || {}
  const sceneCards = [
    ...asArray(chapter?.scene_cards || chapter?.sceneCards),
    ...asArray(rawPayload?.scene_cards || rawPayload?.sceneCards),
    ...asArray(preDraftBrief?.scene_briefs || preDraftBrief?.sceneBriefs),
  ]
  const text = compactBriefText([
    chapter?.chapter_summary,
    chapter?.summary,
    chapter?.conflict,
    chapter?.reader_payoff,
    chapter?.readerPayoff,
    chapter?.ending_hook,
    chapter?.endingHook,
    rawPayload?.chapter_summary,
    rawPayload?.chapterSummary,
    rawPayload?.summary,
    rawPayload?.conflict,
    rawPayload?.reader_payoff,
    rawPayload?.readerPayoff,
    rawPayload?.ending_hook,
    rawPayload?.endingHook,
    outline?.cause,
    outline?.development,
    outline?.turn,
    outline?.climax,
    outline?.ending,
    blueprint?.emotional_recovery,
    blueprint?.emotionalRecovery,
    blueprint?.counterplay,
    blueprint?.safety_signal,
    blueprint?.safetySignal,
    ...sceneCards.flatMap((scene: any) => [
      scene?.conflict,
      scene?.fear_point,
      scene?.fearPoint,
      scene?.pressure,
      scene?.reader_payoff,
      scene?.readerPayoff,
      scene?.counterplay,
      scene?.safety_signal,
      scene?.safetySignal,
      scene?.unexpected_gain,
      scene?.unexpectedGain,
      scene?.information_gain,
      scene?.informationGain,
      scene?.state_change,
      scene?.stateChange,
    ]),
  ].flat().map((item: any) => String(item || '').trim()).filter(Boolean).join('。'))
  SERIAL_DOWNWARD_RECOVERY_PATTERN.lastIndex = 0
  const hasDownwardPressure = Boolean(text && (paragraphHasDownwardPressure(text) || paragraphHasOppressionPressure(text)))
  const hasRecovery = Boolean(text && (textHasDownwardSafetySignal(text) || SERIAL_DOWNWARD_RECOVERY_PATTERN.test(text)))
  return {
    has_downward_pressure: hasDownwardPressure,
    has_recovery: hasRecovery,
  }
}

function serialNormalizeCoreElement(text: string) {
  const value = compactBriefText(text)
  if (!value) return ''
  for (const [pattern, label] of SERIAL_CORE_ELEMENT_HINTS) {
    pattern.lastIndex = 0
    if (pattern.test(value)) return label
  }
  return value.slice(0, 18)
}

function serialCoreHookAngleLabel(text: string) {
  const value = compactBriefText(text)
  if (!value) return ''
  for (const [pattern, label] of SERIAL_CORE_HOOK_ANGLE_HINTS) {
    pattern.lastIndex = 0
    if (pattern.test(value)) return label
  }
  return ''
}

function serialChapterCoreElementCombo(chapter: any) {
  const contract = serialChapterStoryLoopContract(chapter)
  const explicitElements = asArray(contract?.core_elements || contract?.coreElements || chapter?.core_elements || chapter?.coreElements)
    .map((item: any) => serialNormalizeCoreElement(String(item || '')))
    .filter(Boolean)
  const inferredElements = SERIAL_CORE_ELEMENT_HINTS
    .filter(([pattern]) => {
      const text = serialChapterText(chapter)
      pattern.lastIndex = 0
      return pattern.test(text)
    })
    .map(([, label]) => label)
  const elements = uniqueBriefStrings(explicitElements.length ? explicitElements : inferredElements, 6).sort()
  if (elements.length < 3) return null
  return {
    elements,
    key: elements.join('|'),
    label: elements.join(' + '),
  }
}

function serialChapterCoreHookState(chapter: any) {
  const rawPayload = chapter?.raw_payload || chapter?.rawPayload || {}
  const blueprint = serialChapterBlueprintForLines(chapter)
  const outline = blueprint?.content_outline || blueprint?.contentOutline || {}
  const plotLines = blueprint?.plot_lines || blueprint?.plotLines || {}
  const preDraftBrief = rawPayload?.pre_draft_brief || rawPayload?.preDraftBrief || {}
  const chapterTarget = serialChapterRawContextTarget(chapter)
  const genreContract = chapter?.genre_positioning_contract
    || chapter?.genrePositioningContract
    || rawPayload?.genre_positioning_contract
    || rawPayload?.genrePositioningContract
    || preDraftBrief?.genre_positioning_contract
    || preDraftBrief?.genrePositioningContract
    || chapterTarget?.genre_positioning_contract
    || chapterTarget?.genrePositioningContract
    || blueprint?.genre_positioning_contract
    || blueprint?.genrePositioningContract
    || {}
  const qualityContract = chapter?.quality_audit_contract
    || chapter?.qualityAuditContract
    || rawPayload?.quality_audit_contract
    || rawPayload?.qualityAuditContract
    || preDraftBrief?.quality_audit_contract
    || preDraftBrief?.qualityAuditContract
    || chapterTarget?.quality_audit_contract
    || chapterTarget?.qualityAuditContract
    || blueprint?.quality_audit_contract
    || blueprint?.qualityAuditContract
    || {}
  const commercial = rawPayload?.commercial_positioning
    || rawPayload?.commercialPositioning
    || rawPayload?.writing_bible?.commercial_positioning
    || rawPayload?.writingBible?.commercialPositioning
    || {}
  const coreHookItems = uniqueBriefStrings([
    chapter?.core_selling_point,
    chapter?.coreSellingPoint,
    rawPayload?.core_selling_point,
    rawPayload?.coreSellingPoint,
    rawPayload?.writing_bible?.core_selling_point,
    rawPayload?.writingBible?.coreSellingPoint,
    commercial?.core_selling_point,
    commercial?.coreSellingPoint,
    commercial?.selling_points,
    commercial?.sellingPoints,
    genreContract?.core_hook_rules,
    genreContract?.coreHookRules,
    genreContract?.longboard_focus_rules,
    genreContract?.longboardFocusRules,
    qualityContract?.selling_point_expression_rules,
    qualityContract?.sellingPointExpressionRules,
  ].flat().map((item: any) => compactBriefText(item)).filter(Boolean), 10)
  const deliveryText = compactBriefText([
    chapter?.title,
    chapter?.chapter_summary,
    chapter?.summary,
    chapter?.conflict,
    chapter?.ending_hook,
    chapter?.endingHook,
    rawPayload?.title,
    rawPayload?.chapter_summary,
    rawPayload?.chapterSummary,
    rawPayload?.summary,
    rawPayload?.conflict,
    rawPayload?.ending_hook,
    rawPayload?.endingHook,
    outline?.cause,
    outline?.development,
    outline?.turn,
    outline?.climax,
    outline?.ending,
    plotLines?.mainline,
    plotLines?.main_line,
    plotLines?.mainLine,
    plotLines?.subplot,
    plotLines?.subplot_line,
    plotLines?.subplotLine,
    plotLines?.reader_payoff,
    plotLines?.readerPayoff,
  ].flat().map((item: any) => String(item || '').trim()).filter(Boolean).join('。'))
  SERIAL_CORE_HOOK_DELIVERY_PATTERN.lastIndex = 0
  const hasSignalDelivery = Boolean(deliveryText && SERIAL_CORE_HOOK_DELIVERY_PATTERN.test(deliveryText))
  const hasAnchorDelivery = coreHookItems.some((item: string) => anchorMatchScore(item, deliveryText).score >= 34)
  const angleLabel = serialCoreHookAngleLabel(deliveryText)
  return {
    has_core_hook_contract: coreHookItems.length > 0,
    has_core_hook_delivery: Boolean(hasSignalDelivery || hasAnchorDelivery),
    core_hook_angle: angleLabel,
  }
}

function serialChapterWorldExpansionState(chapter: any) {
  const rawPayload = chapter?.raw_payload || chapter?.rawPayload || {}
  const blueprint = serialChapterBlueprintForLines(chapter)
  const outline = blueprint?.content_outline || blueprint?.contentOutline || {}
  const plotLines = blueprint?.plot_lines || blueprint?.plotLines || {}
  const preDraftBrief = rawPayload?.pre_draft_brief || rawPayload?.preDraftBrief || {}
  const chapterTarget = serialChapterRawContextTarget(chapter)
  const storyLoop = serialChapterStoryLoopContract(chapter)
  const blueprintStoryLoop = blueprint?.story_loop_contract
    || blueprint?.storyLoopContract
    || chapterTarget?.story_loop_contract
    || chapterTarget?.storyLoopContract
    || preDraftBrief?.story_loop_contract
    || preDraftBrief?.storyLoopContract
    || {}
  const storyLoopContracts = [storyLoop, blueprintStoryLoop]
  const contractItems = uniqueBriefStrings(storyLoopContracts.flatMap((contract: any) => [
    contract?.map_transition_rules,
    contract?.mapTransitionRules,
    contract?.nested_loop_rules,
    contract?.nestedLoopRules,
    contract?.quality_checks,
    contract?.qualityChecks,
  ]).flat().map((item: any) => compactBriefText(item)).filter(Boolean), 12)
  const hasContractFields = storyLoopContracts.some((contract: any) => Boolean(
    asArray(contract?.map_transition_rules || contract?.mapTransitionRules).length
    || asArray(contract?.nested_loop_rules || contract?.nestedLoopRules).length,
  ))
  const hasExpansionContract = hasContractFields || contractItems.some((item: string) => {
    SERIAL_WORLD_EXPANSION_CONTRACT_PATTERN.lastIndex = 0
    return SERIAL_WORLD_EXPANSION_CONTRACT_PATTERN.test(item)
  })
  const sceneCards = [
    ...asArray(chapter?.scene_cards || chapter?.sceneCards),
    ...asArray(rawPayload?.scene_cards || rawPayload?.sceneCards),
    ...asArray(preDraftBrief?.scene_briefs || preDraftBrief?.sceneBriefs),
  ]
  const deliveryText = compactBriefText([
    chapter?.title,
    chapter?.chapter_summary,
    chapter?.summary,
    chapter?.conflict,
    chapter?.ending_hook,
    chapter?.endingHook,
    chapter?.reader_payoff,
    chapter?.readerPayoff,
    rawPayload?.title,
    rawPayload?.chapter_summary,
    rawPayload?.chapterSummary,
    rawPayload?.summary,
    rawPayload?.conflict,
    rawPayload?.ending_hook,
    rawPayload?.endingHook,
    rawPayload?.reader_payoff,
    rawPayload?.readerPayoff,
    outline?.cause,
    outline?.development,
    outline?.turn,
    outline?.climax,
    outline?.ending,
    plotLines?.mainline,
    plotLines?.main_line,
    plotLines?.mainLine,
    plotLines?.subplot,
    plotLines?.subplot_line,
    plotLines?.subplotLine,
    plotLines?.reader_payoff,
    plotLines?.readerPayoff,
    ...storyLoopContracts.flatMap((contract: any) => [
      contract?.setup,
      contract?.escalation,
      contract?.payoff,
      contract?.carry_over,
      contract?.carryOver,
    ]),
    ...sceneCards.flatMap((scene: any) => [
      scene?.title,
      scene?.goal,
      scene?.conflict,
      scene?.obstacle,
      scene?.turning_point,
      scene?.turningPoint,
      scene?.reader_payoff,
      scene?.readerPayoff,
      scene?.exit_state,
      scene?.exitState,
      scene?.ending_hook,
      scene?.endingHook,
      scene?.state_change,
      scene?.stateChange,
    ]),
  ].flat().map((item: any) => String(item || '').trim()).filter(Boolean).join('。'))
  SERIAL_WORLD_EXPANSION_SIGNAL_PATTERN.lastIndex = 0
  return {
    has_world_expansion_contract: hasExpansionContract,
    has_world_expansion_signal: Boolean(deliveryText && SERIAL_WORLD_EXPANSION_SIGNAL_PATTERN.test(deliveryText)),
  }
}

function serialChapterTargetReaderContract(chapter: any) {
  const rawPayload = chapter?.raw_payload || chapter?.rawPayload || {}
  const blueprint = serialChapterBlueprintForLines(chapter)
  const preDraftBrief = rawPayload?.pre_draft_brief || rawPayload?.preDraftBrief || {}
  const chapterTarget = serialChapterRawContextTarget(chapter)
  return chapter?.target_reader_contract
    || chapter?.targetReaderContract
    || rawPayload?.target_reader_contract
    || rawPayload?.targetReaderContract
    || blueprint?.target_reader_contract
    || blueprint?.targetReaderContract
    || preDraftBrief?.target_reader_contract
    || preDraftBrief?.targetReaderContract
    || chapterTarget?.target_reader_contract
    || chapterTarget?.targetReaderContract
    || rawPayload?.context_package?.target_reader_contract
    || rawPayload?.contextPackage?.targetReaderContract
    || {}
}

function serialChapterReaderNeedCoverageState(chapter: any) {
  const rawPayload = chapter?.raw_payload || chapter?.rawPayload || {}
  const blueprint = serialChapterBlueprintForLines(chapter)
  const outline = blueprint?.content_outline || blueprint?.contentOutline || {}
  const plotLines = blueprint?.plot_lines || blueprint?.plotLines || {}
  const preDraftBrief = rawPayload?.pre_draft_brief || rawPayload?.preDraftBrief || {}
  const contract = serialChapterTargetReaderContract(chapter)
  const contractItems = uniqueBriefStrings([
    contract?.reader_profile,
    contract?.readerProfile,
    contract?.reader_desires,
    contract?.readerDesires,
    contract?.desires,
    contract?.emotional_gap_analysis,
    contract?.emotionalGapAnalysis,
    contract?.emotional_gaps,
    contract?.emotionalGaps,
    contract?.chapter_attractions,
    contract?.chapterAttractions,
    contract?.attractions,
    contract?.validation_questions,
    contract?.validationQuestions,
    contract?.quality_checks,
    contract?.qualityChecks,
    contract?.revision_priorities,
    contract?.revisionPriorities,
  ].flat().map((item: any) => compactBriefText(item)).filter(Boolean), 16)
  const hasContract = Boolean(Object.keys(contract || {}).length && (
    contractItems.length > 0
    || asArray(contract?.reader_desires || contract?.readerDesires || contract?.desires).length
    || asArray(contract?.emotional_gap_analysis || contract?.emotionalGapAnalysis || contract?.emotional_gaps || contract?.emotionalGaps).length
    || asArray(contract?.chapter_attractions || contract?.chapterAttractions || contract?.attractions).length
  ))
  const hasReaderNeedContract = hasContract && contractItems.some((item: string) => {
    SERIAL_READER_NEED_CONTRACT_PATTERN.lastIndex = 0
    return SERIAL_READER_NEED_CONTRACT_PATTERN.test(item)
  })
  const sceneCards = [
    ...asArray(chapter?.scene_cards || chapter?.sceneCards),
    ...asArray(rawPayload?.scene_cards || rawPayload?.sceneCards),
    ...asArray(preDraftBrief?.scene_briefs || preDraftBrief?.sceneBriefs),
  ]
  const deliveryText = compactBriefText([
    chapter?.title,
    chapter?.chapter_summary,
    chapter?.summary,
    chapter?.conflict,
    chapter?.ending_hook,
    chapter?.endingHook,
    chapter?.reader_payoff,
    chapter?.readerPayoff,
    chapter?.core_payoff,
    chapter?.corePayoff,
    rawPayload?.title,
    rawPayload?.chapter_summary,
    rawPayload?.chapterSummary,
    rawPayload?.summary,
    rawPayload?.conflict,
    rawPayload?.ending_hook,
    rawPayload?.endingHook,
    rawPayload?.reader_payoff,
    rawPayload?.readerPayoff,
    rawPayload?.core_payoff,
    rawPayload?.corePayoff,
    outline?.cause,
    outline?.development,
    outline?.turn,
    outline?.climax,
    outline?.ending,
    plotLines?.mainline,
    plotLines?.main_line,
    plotLines?.mainLine,
    plotLines?.subplot,
    plotLines?.subplot_line,
    plotLines?.subplotLine,
    plotLines?.reader_payoff,
    plotLines?.readerPayoff,
    ...sceneCards.flatMap((scene: any) => [
      scene?.title,
      scene?.goal,
      scene?.conflict,
      scene?.obstacle,
      scene?.turning_point,
      scene?.turningPoint,
      scene?.reader_payoff,
      scene?.readerPayoff,
      scene?.payoff,
      scene?.exit_state,
      scene?.exitState,
      scene?.ending_hook,
      scene?.endingHook,
      scene?.state_change,
      scene?.stateChange,
    ]),
  ].flat().map((item: any) => String(item || '').trim()).filter(Boolean).join('。'))
  SERIAL_READER_NEED_SIGNAL_PATTERN.lastIndex = 0
  return {
    has_reader_need_contract: hasReaderNeedContract,
    has_reader_need_signal: Boolean(deliveryText && SERIAL_READER_NEED_SIGNAL_PATTERN.test(deliveryText)),
  }
}

function serialChapterExpectationThresholdContract(chapter: any) {
  const rawPayload = chapter?.raw_payload || chapter?.rawPayload || {}
  const blueprint = serialChapterBlueprintForLines(chapter)
  const preDraftBrief = rawPayload?.pre_draft_brief || rawPayload?.preDraftBrief || {}
  const chapterTarget = serialChapterRawContextTarget(chapter)
  return chapter?.expectation_threshold_contract
    || chapter?.expectationThresholdContract
    || rawPayload?.expectation_threshold_contract
    || rawPayload?.expectationThresholdContract
    || blueprint?.expectation_threshold_contract
    || blueprint?.expectationThresholdContract
    || preDraftBrief?.expectation_threshold_contract
    || preDraftBrief?.expectationThresholdContract
    || chapterTarget?.expectation_threshold_contract
    || chapterTarget?.expectationThresholdContract
    || rawPayload?.context_package?.expectation_threshold_contract
    || rawPayload?.contextPackage?.expectationThresholdContract
    || {}
}

function serialChapterExpectationLadderState(chapter: any) {
  const rawPayload = chapter?.raw_payload || chapter?.rawPayload || {}
  const blueprint = serialChapterBlueprintForLines(chapter)
  const outline = blueprint?.content_outline || blueprint?.contentOutline || {}
  const plotLines = blueprint?.plot_lines || blueprint?.plotLines || {}
  const preDraftBrief = rawPayload?.pre_draft_brief || rawPayload?.preDraftBrief || {}
  const contract = serialChapterExpectationThresholdContract(chapter)
  const threeLines = contract?.three_expectation_lines || contract?.threeExpectationLines || {}
  const contractItems = uniqueBriefStrings([
    contract?.short_expectation,
    contract?.shortExpectation,
    contract?.current_expectations,
    contract?.currentExpectations,
    contract?.medium_expectations,
    contract?.mediumExpectations,
    contract?.long_expectations,
    contract?.longExpectations,
    contract?.next_open_loop,
    contract?.nextOpenLoop,
    contract?.expectation_before_payoff_rules,
    contract?.expectationBeforePayoffRules,
    contract?.quality_checks,
    contract?.qualityChecks,
    threeLines?.plot_expectation,
    threeLines?.plotExpectation,
    threeLines?.theme_payoff,
    threeLines?.themePayoff,
    threeLines?.freshness_hook,
    threeLines?.freshnessHook,
  ].flat().map((item: any) => compactBriefText(item)).filter(Boolean), 18)
  const hasLayerFields = Boolean(
    contract?.short_expectation
    || contract?.shortExpectation
    || asArray(contract?.medium_expectations || contract?.mediumExpectations).length
    || asArray(contract?.long_expectations || contract?.longExpectations).length
    || Object.keys(threeLines || {}).length,
  )
  const hasExpectationLadderContract = hasLayerFields || contractItems.some((item: string) => {
    SERIAL_EXPECTATION_LADDER_CONTRACT_PATTERN.lastIndex = 0
    return SERIAL_EXPECTATION_LADDER_CONTRACT_PATTERN.test(item)
  })
  const sceneCards = [
    ...asArray(chapter?.scene_cards || chapter?.sceneCards),
    ...asArray(rawPayload?.scene_cards || rawPayload?.sceneCards),
    ...asArray(preDraftBrief?.scene_briefs || preDraftBrief?.sceneBriefs),
  ]
  const deliveryText = compactBriefText([
    chapter?.title,
    chapter?.chapter_summary,
    chapter?.summary,
    chapter?.conflict,
    chapter?.ending_hook,
    chapter?.endingHook,
    chapter?.reader_payoff,
    chapter?.readerPayoff,
    rawPayload?.title,
    rawPayload?.chapter_summary,
    rawPayload?.chapterSummary,
    rawPayload?.summary,
    rawPayload?.conflict,
    rawPayload?.ending_hook,
    rawPayload?.endingHook,
    rawPayload?.reader_payoff,
    rawPayload?.readerPayoff,
    outline?.cause,
    outline?.development,
    outline?.turn,
    outline?.climax,
    outline?.ending,
    plotLines?.mainline,
    plotLines?.main_line,
    plotLines?.mainLine,
    plotLines?.subplot,
    plotLines?.subplot_line,
    plotLines?.subplotLine,
    plotLines?.reader_payoff,
    plotLines?.readerPayoff,
    ...sceneCards.flatMap((scene: any) => [
      scene?.title,
      scene?.goal,
      scene?.conflict,
      scene?.obstacle,
      scene?.turning_point,
      scene?.turningPoint,
      scene?.reader_payoff,
      scene?.readerPayoff,
      scene?.ending_hook,
      scene?.endingHook,
      scene?.state_change,
      scene?.stateChange,
    ]),
  ].flat().map((item: any) => String(item || '').trim()).filter(Boolean).join('。'))
  SERIAL_EXPECTATION_SHORT_LAYER_PATTERN.lastIndex = 0
  SERIAL_EXPECTATION_MEDIUM_LAYER_PATTERN.lastIndex = 0
  SERIAL_EXPECTATION_LONG_LAYER_PATTERN.lastIndex = 0
  const hasShort = Boolean(deliveryText && SERIAL_EXPECTATION_SHORT_LAYER_PATTERN.test(deliveryText))
  const hasMedium = Boolean(deliveryText && SERIAL_EXPECTATION_MEDIUM_LAYER_PATTERN.test(deliveryText))
  const hasLong = Boolean(deliveryText && SERIAL_EXPECTATION_LONG_LAYER_PATTERN.test(deliveryText))
  return {
    has_expectation_ladder_contract: hasExpectationLadderContract,
    has_short_expectation: hasShort,
    has_medium_expectation: hasMedium,
    has_long_expectation: hasLong,
    missing: [
      hasShort ? '' : '短期期待',
      hasMedium ? '' : '中期期待',
      hasLong ? '' : '长期期待',
    ].filter(Boolean),
  }
}

function serialChapterSuspenseContract(chapter: any) {
  const rawPayload = chapter?.raw_payload || chapter?.rawPayload || {}
  const blueprint = serialChapterBlueprintForLines(chapter)
  const preDraftBrief = rawPayload?.pre_draft_brief || rawPayload?.preDraftBrief || {}
  const chapterTarget = serialChapterRawContextTarget(chapter)
  return chapter?.suspense_contract
    || chapter?.suspenseContract
    || rawPayload?.suspense_contract
    || rawPayload?.suspenseContract
    || blueprint?.suspense_contract
    || blueprint?.suspenseContract
    || preDraftBrief?.suspense_contract
    || preDraftBrief?.suspenseContract
    || chapterTarget?.suspense_contract
    || chapterTarget?.suspenseContract
    || rawPayload?.context_package?.suspense_contract
    || rawPayload?.contextPackage?.suspenseContract
    || {}
}

function serialForeshadowingLabel(text: string) {
  const value = compactBriefText(text)
  if (!value) return ''
  for (const [pattern, label] of SERIAL_FORESHADOWING_LABEL_HINTS) {
    pattern.lastIndex = 0
    if (pattern.test(value)) return label
  }
  const genericMatch = value.match(/([\u4e00-\u9fa5A-Za-z0-9]{1,12}(?:缺口|水痕|旧印|钥匙|名单|血印|门锁|门环|人影|伏笔|线索))/)
  return genericMatch?.[1] || ''
}

function serialChapterForeshadowingState(chapter: any) {
  const rawPayload = chapter?.raw_payload || chapter?.rawPayload || {}
  const blueprint = serialChapterBlueprintForLines(chapter)
  const outline = blueprint?.content_outline || blueprint?.contentOutline || {}
  const plotLines = blueprint?.plot_lines || blueprint?.plotLines || {}
  const preDraftBrief = rawPayload?.pre_draft_brief || rawPayload?.preDraftBrief || {}
  const contract = serialChapterSuspenseContract(chapter)
  const expectationChain = contract?.expectation_chain || contract?.expectationChain || {}
  const contractItems = uniqueBriefStrings([
    contract?.foreshadowing_boundary_rules,
    contract?.foreshadowingBoundaryRules,
    contract?.suspense_cycle,
    contract?.suspenseCycle,
    contract?.expectation_layers,
    contract?.expectationLayers,
    expectationChain?.active_lines,
    expectationChain?.activeLines,
    expectationChain?.carry_rules,
    expectationChain?.carryRules,
    expectationChain?.next_open_loop,
    expectationChain?.nextOpenLoop,
    contract?.quality_checks,
    contract?.qualityChecks,
  ].flat().map((item: any) => compactBriefText(item)).filter(Boolean), 18)
  const hasContract = Boolean(Object.keys(contract || {}).length && contractItems.length)
  const hasForeshadowingContract = hasContract && contractItems.some((item: string) => {
    SERIAL_FORESHADOWING_CONTRACT_PATTERN.lastIndex = 0
    return SERIAL_FORESHADOWING_CONTRACT_PATTERN.test(item)
  })
  const sceneCards = [
    ...asArray(chapter?.scene_cards || chapter?.sceneCards),
    ...asArray(rawPayload?.scene_cards || rawPayload?.sceneCards),
    ...asArray(preDraftBrief?.scene_briefs || preDraftBrief?.sceneBriefs),
  ]
  const deliveryText = compactBriefText([
    chapter?.title,
    chapter?.chapter_summary,
    chapter?.summary,
    chapter?.conflict,
    chapter?.ending_hook,
    chapter?.endingHook,
    rawPayload?.title,
    rawPayload?.chapter_summary,
    rawPayload?.chapterSummary,
    rawPayload?.summary,
    rawPayload?.conflict,
    rawPayload?.ending_hook,
    rawPayload?.endingHook,
    outline?.cause,
    outline?.development,
    outline?.turn,
    outline?.climax,
    outline?.ending,
    plotLines?.mainline,
    plotLines?.main_line,
    plotLines?.mainLine,
    plotLines?.subplot,
    plotLines?.subplot_line,
    plotLines?.subplotLine,
    ...sceneCards.flatMap((scene: any) => [
      scene?.title,
      scene?.goal,
      scene?.conflict,
      scene?.obstacle,
      scene?.turning_point,
      scene?.turningPoint,
      scene?.ending_hook,
      scene?.endingHook,
      scene?.foreshadowing,
      scene?.clue,
      scene?.state_change,
      scene?.stateChange,
    ]),
  ].flat().map((item: any) => String(item || '').trim()).filter(Boolean).join('。'))
  const label = serialForeshadowingLabel(deliveryText)
  SERIAL_FORESHADOWING_NO_PROGRESS_PATTERN.lastIndex = 0
  SERIAL_FORESHADOWING_PROGRESS_PATTERN.lastIndex = 0
  const hasNoProgress = Boolean(deliveryText && SERIAL_FORESHADOWING_NO_PROGRESS_PATTERN.test(deliveryText))
  const hasProgress = Boolean(deliveryText && SERIAL_FORESHADOWING_PROGRESS_PATTERN.test(deliveryText) && !hasNoProgress)
  return {
    has_foreshadowing_contract: hasForeshadowingContract,
    foreshadowing_label: label,
    has_foreshadowing_progress: hasProgress,
    has_no_progress_marker: hasNoProgress,
  }
}

function serialPositivePatternTest(text: string, pattern: RegExp) {
  const chunks = compactBriefText(text)
    .split(/[。！？!?；;\n]/)
    .map(item => item.trim())
    .filter(Boolean)
  return chunks.some(chunk => {
    pattern.lastIndex = 0
    SERIAL_TEXTURE_NEGATION_PATTERN.lastIndex = 0
    return pattern.test(chunk) && !SERIAL_TEXTURE_NEGATION_PATTERN.test(chunk)
  })
}

function serialChapterTextureBeatState(chapter: any) {
  const rawPayload = chapter?.raw_payload || chapter?.rawPayload || {}
  const blueprint = serialChapterBlueprintForLines(chapter)
  const outline = blueprint?.content_outline || blueprint?.contentOutline || {}
  const plotLines = blueprint?.plot_lines || blueprint?.plotLines || {}
  const chapterTarget = serialChapterRawContextTarget(chapter)
  const currentBeat = chapterTarget?.current_beat || chapterTarget?.currentBeat || rawPayload?.current_beat || rawPayload?.currentBeat || {}
  const explicitBeatType = normalizeBeatCoolingType(
    chapter?.beat_type,
    chapter?.beatType,
    chapter?.event_type,
    chapter?.eventType,
    rawPayload?.beat_type,
    rawPayload?.beatType,
    rawPayload?.event_type,
    rawPayload?.eventType,
    blueprint?.beat_type,
    blueprint?.beatType,
    chapterTarget?.beat_type,
    chapterTarget?.beatType,
    chapterTarget?.event_type,
    chapterTarget?.eventType,
    currentBeat?.beat_type,
    currentBeat?.beatType,
    currentBeat?.type,
    currentBeat?.event_type,
    currentBeat?.eventType,
  )
  if (['bond_deepening', 'world_painting'].includes(explicitBeatType)) {
    return {
      has_texture_beat: true,
      beat_type: explicitBeatType,
    }
  }

  const sceneCards = [
    ...asArray(chapter?.scene_cards || chapter?.sceneCards),
    ...asArray(rawPayload?.scene_cards || rawPayload?.sceneCards),
    ...asArray(rawPayload?.pre_draft_brief?.scene_briefs || rawPayload?.preDraftBrief?.sceneBriefs),
  ]
  const text = [
    chapter?.title,
    chapter?.chapter_summary,
    chapter?.summary,
    chapter?.conflict,
    chapter?.ending_hook,
    chapter?.endingHook,
    chapter?.reader_payoff,
    chapter?.readerPayoff,
    rawPayload?.title,
    rawPayload?.chapter_summary,
    rawPayload?.chapterSummary,
    rawPayload?.summary,
    rawPayload?.conflict,
    rawPayload?.ending_hook,
    rawPayload?.endingHook,
    outline?.cause,
    outline?.development,
    outline?.turn,
    outline?.climax,
    outline?.ending,
    plotLines?.mainline,
    plotLines?.main_line,
    plotLines?.mainLine,
    plotLines?.subplot,
    plotLines?.subplot_line,
    plotLines?.subplotLine,
    ...sceneCards.flatMap((scene: any) => [
      scene?.title,
      scene?.goal,
      scene?.conflict,
      scene?.turning_point,
      scene?.turningPoint,
      scene?.reader_payoff,
      scene?.readerPayoff,
      scene?.ending_hook,
      scene?.endingHook,
      scene?.state_change,
      scene?.stateChange,
      scene?.relation_change,
      scene?.relationChange,
      scene?.worldbuilding,
      scene?.world_building,
      scene?.worldBuilding,
    ]),
  ].flat().map((item: any) => String(item || '').trim()).filter(Boolean).join('。')

  if (serialPositivePatternTest(text, SERIAL_RELATION_TEXTURE_PATTERN)) {
    return {
      has_texture_beat: true,
      beat_type: 'bond_deepening',
    }
  }
  if (serialPositivePatternTest(text, SERIAL_WORLD_TEXTURE_PATTERN)) {
    return {
      has_texture_beat: true,
      beat_type: 'world_painting',
    }
  }
  return {
    has_texture_beat: false,
    beat_type: '',
  }
}

function serialFiveChapterTextureGap(chapters: any[]) {
  if (chapters.length < 5) return null
  const recentFive = chapters.slice(-5)
  const hasTextureBeat = recentFive.some((chapter: any) => serialChapterTextureBeatState(chapter).has_texture_beat)
  return hasTextureBeat ? null : recentFive
}

function serialChapterCoolingBeatType(chapter: any) {
  const rawPayload = chapter?.raw_payload || chapter?.rawPayload || {}
  const blueprint = serialChapterBlueprintForLines(chapter)
  const chapterTarget = serialChapterRawContextTarget(chapter)
  const currentBeat = chapterTarget?.current_beat || chapterTarget?.currentBeat || rawPayload?.current_beat || rawPayload?.currentBeat || {}
  const explicitBeatType = normalizeBeatCoolingType(
    chapter?.beat_type,
    chapter?.beatType,
    chapter?.event_type,
    chapter?.eventType,
    rawPayload?.beat_type,
    rawPayload?.beatType,
    rawPayload?.event_type,
    rawPayload?.eventType,
    blueprint?.beat_type,
    blueprint?.beatType,
    chapterTarget?.beat_type,
    chapterTarget?.beatType,
    chapterTarget?.event_type,
    chapterTarget?.eventType,
    currentBeat?.beat_type,
    currentBeat?.beatType,
    currentBeat?.type,
    currentBeat?.event_type,
    currentBeat?.eventType,
  )
  if (explicitBeatType) return explicitBeatType

  const textureState = serialChapterTextureBeatState(chapter)
  if (textureState.has_texture_beat) return textureState.beat_type

  const text = compactBriefText([
    chapter?.title,
    rawPayload?.title,
    serialChapterText(chapter),
  ].filter(Boolean).join('。'))
  SERIAL_CONFLICT_THRILL_BEAT_PATTERN.lastIndex = 0
  if (SERIAL_CONFLICT_THRILL_BEAT_PATTERN.test(text)) return 'conflict_thrill'
  return inferBeatCoolingTypeFromText(text)
}

function serialConflictThrillOverrun(chapters: any[]) {
  const tailConflictRun: any[] = []
  for (let index = chapters.length - 1; index >= 0; index -= 1) {
    if (serialChapterCoolingBeatType(chapters[index]) !== 'conflict_thrill') break
    tailConflictRun.unshift(chapters[index])
  }
  return tailConflictRun.length > 2 ? tailConflictRun : null
}

function serialRepeatedCoreElementComboRuns(chapters: any[]) {
  const runs: Array<Array<{ chapter: any; combo: any }>> = []
  let current: Array<{ chapter: any; combo: any }> = []
  for (const chapter of chapters) {
    const combo = serialChapterCoreElementCombo(chapter)
    if (!combo) {
      if (current.length >= 2) runs.push(current)
      current = []
      continue
    }
    if (!current.length || current[current.length - 1].combo.key === combo.key) {
      current.push({ chapter, combo })
      continue
    }
    if (current.length >= 2) runs.push(current)
    current = [{ chapter, combo }]
  }
  if (current.length >= 2) runs.push(current)
  return runs
}

function serialCoreHookAbsenceGapRuns(chapters: any[]) {
  const runs: any[][] = []
  let current: any[] = []
  chapters.forEach((chapter: any) => {
    const state = serialChapterCoreHookState(chapter)
    if (state.has_core_hook_contract && !state.has_core_hook_delivery) {
      current.push(chapter)
      return
    }
    if (current.length >= 3) runs.push(current)
    current = []
  })
  if (current.length >= 3) runs.push(current)
  return runs
}

function serialCoreHookAngleRepetitionGapRuns(chapters: any[]) {
  const runs: Array<Array<{ chapter: any; angle: string }>> = []
  let current: Array<{ chapter: any; angle: string }> = []
  chapters.forEach((chapter: any) => {
    const state = serialChapterCoreHookState(chapter)
    const angle = compactBriefText(state.core_hook_angle)
    if (!state.has_core_hook_contract || !state.has_core_hook_delivery || !angle) {
      if (current.length >= 3) runs.push(current)
      current = []
      return
    }
    if (!current.length || current[current.length - 1].angle === angle) {
      current.push({ chapter, angle })
      return
    }
    if (current.length >= 3) runs.push(current)
    current = [{ chapter, angle }]
  })
  if (current.length >= 3) runs.push(current)
  return runs
}

function serialWorldExpansionStallGapRuns(chapters: any[]) {
  const runs: any[][] = []
  let current: any[] = []
  chapters.forEach((chapter: any) => {
    const state = serialChapterWorldExpansionState(chapter)
    if (state.has_world_expansion_contract && !state.has_world_expansion_signal) {
      current.push(chapter)
      return
    }
    if (current.length >= 3) runs.push(current)
    current = []
  })
  if (current.length >= 3) runs.push(current)
  return runs
}

function serialReaderNeedCoverageGapRuns(chapters: any[]) {
  const runs: any[][] = []
  let current: any[] = []
  chapters.forEach((chapter: any) => {
    const state = serialChapterReaderNeedCoverageState(chapter)
    if (state.has_reader_need_contract && !state.has_reader_need_signal) {
      current.push(chapter)
      return
    }
    if (current.length >= 3) runs.push(current)
    current = []
  })
  if (current.length >= 3) runs.push(current)
  return runs
}

function serialExpectationLadderGapRuns(chapters: any[]) {
  const runs: any[][] = []
  let current: any[] = []
  chapters.forEach((chapter: any) => {
    const state = serialChapterExpectationLadderState(chapter)
    if (state.has_expectation_ladder_contract && (!state.has_short_expectation || !state.has_medium_expectation || !state.has_long_expectation)) {
      current.push(chapter)
      return
    }
    if (current.length >= 3) runs.push(current)
    current = []
  })
  if (current.length >= 3) runs.push(current)
  return runs
}

function serialForeshadowingStallGapRuns(chapters: any[]) {
  const runs: Array<Array<{ chapter: any; label: string }>> = []
  let current: Array<{ chapter: any; label: string }> = []
  chapters.forEach((chapter: any) => {
    const state = serialChapterForeshadowingState(chapter)
    const label = compactBriefText(state.foreshadowing_label)
    if (!state.has_foreshadowing_contract || !label || state.has_foreshadowing_progress) {
      if (current.length >= 3) runs.push(current)
      current = []
      return
    }
    if (!current.length || current[current.length - 1].label === label) {
      current.push({ chapter, label })
      return
    }
    if (current.length >= 3) runs.push(current)
    current = [{ chapter, label }]
  })
  if (current.length >= 3) runs.push(current)
  return runs
}

function serialBlueprintClimaxRewardGapRuns(chapters: any[]) {
  const runs: any[][] = []
  let current: any[] = []
  chapters.forEach((chapter: any) => {
    const state = serialChapterBlueprintHasClimaxRewardClosure(chapter)
    if (state.has_outline_contract && !state.has_closure) {
      current.push(chapter)
      return
    }
    if (current.length >= 2) runs.push(current)
    current = []
  })
  if (current.length >= 2) runs.push(current)
  return runs
}

function serialEndingHarvestHandoffGapRuns(chapters: any[]) {
  const runs: any[][] = []
  let current: any[] = []
  chapters.forEach((chapter: any) => {
    const state = serialChapterEndingContractState(chapter)
    if (state.has_ending_contract && !state.has_complete_handoff) {
      current.push(chapter)
      return
    }
    if (current.length >= 2) runs.push(current)
    current = []
  })
  if (current.length >= 2) runs.push(current)
  return runs
}

function serialEndingSuspenseHookGapRuns(chapters: any[]) {
  const runs: any[][] = []
  let current: any[] = []
  chapters.forEach((chapter: any) => {
    const state = serialChapterEndingSuspenseState(chapter)
    if (state.has_ending_text && !state.has_suspense_hook && state.has_safe_closure) {
      current.push(chapter)
      return
    }
    if (current.length >= 2) runs.push(current)
    current = []
  })
  if (current.length >= 2) runs.push(current)
  return runs
}

function serialExpectationChainBreakGapRuns(chapters: any[]) {
  const runs: any[][] = []
  let current: any[] = []
  chapters.forEach((chapter: any) => {
    const state = serialChapterExpectationChainState(chapter)
    if (state.has_expectation_resolution && state.has_expectation_break && !state.has_next_open_loop) {
      current.push(chapter)
      return
    }
    if (current.length >= 2) runs.push(current)
    current = []
  })
  if (current.length >= 2) runs.push(current)
  return runs
}

function serialExpectationPayoffSetupGapRuns(chapters: any[]) {
  const runs: any[][] = []
  let current: any[] = []
  chapters.forEach((chapter: any) => {
    const state = serialChapterExpectationPayoffSetupState(chapter)
    if (state.has_payoff_release && !state.has_setup_before_payoff) {
      current.push(chapter)
      return
    }
    if (current.length >= 2) runs.push(current)
    current = []
  })
  if (current.length >= 2) runs.push(current)
  return runs
}

function serialDeceptiveMainlineHandoffGapRuns(chapters: any[]) {
  const runs: any[][] = []
  let current: any[] = []
  chapters.forEach((chapter: any) => {
    const state = serialChapterDeceptiveMainlineState(chapter)
    if (state.has_mainline_closure && !state.has_deceptive_handoff) {
      current.push(chapter)
      return
    }
    if (current.length >= 2) runs.push(current)
    current = []
  })
  if (current.length >= 2) runs.push(current)
  return runs
}

function serialUpgradeRewardPointGapRuns(chapters: any[]) {
  const runs: any[][] = []
  let current: any[] = []
  chapters.forEach((chapter: any) => {
    const state = serialChapterUpgradeRewardPointState(chapter)
    if (state.has_upgrade_context && !state.has_reward_point) {
      current.push(chapter)
      return
    }
    if (current.length >= 3) runs.push(current)
    current = []
  })
  if (current.length >= 3) runs.push(current)
  return runs
}

function serialRomanceTensionLayerGapRuns(chapters: any[]) {
  const runs: any[][] = []
  let current: any[] = []
  chapters.forEach((chapter: any) => {
    const state = serialChapterRomanceTensionState(chapter)
    if (state.has_romance_context && !state.has_tension_layer) {
      current.push(chapter)
      return
    }
    if (current.length >= 3) runs.push(current)
    current = []
  })
  if (current.length >= 3) runs.push(current)
  return runs
}

function serialRomanceCareerBindingGapRuns(chapters: any[]) {
  const runs: any[][] = []
  let current: any[] = []
  chapters.forEach((chapter: any) => {
    const state = serialChapterRomanceCareerBindingState(chapter)
    if (state.has_romance_context && !state.has_career_binding) {
      current.push(chapter)
      return
    }
    if (current.length >= 3) runs.push(current)
    current = []
  })
  if (current.length >= 3) runs.push(current)
  return runs
}

function serialTrumpCardReserveGapRuns(chapters: any[]) {
  const runs: any[][] = []
  let current: any[] = []
  chapters.forEach((chapter: any) => {
    const state = serialChapterTrumpCardReserveState(chapter)
    if (state.has_trump_card_release && !state.has_trump_card_reserve) {
      current.push(chapter)
      return
    }
    if (current.length >= 2) runs.push(current)
    current = []
  })
  if (current.length >= 2) runs.push(current)
  return runs
}

function serialShowdownPressureShockGapRuns(chapters: any[]) {
  const runs: any[][] = []
  let current: any[] = []
  chapters.forEach((chapter: any) => {
    const state = serialChapterShowdownPressureShockState(chapter)
    if (state.has_showdown_context && !state.has_pressure_shock_structure) {
      current.push(chapter)
      return
    }
    if (current.length >= 3) runs.push(current)
    current = []
  })
  if (current.length >= 3) runs.push(current)
  return runs
}

function serialCharacterMotivationChainGapRuns(chapters: any[]) {
  const runs: any[][] = []
  let current: any[] = []
  chapters.forEach((chapter: any) => {
    const state = serialChapterCharacterMotivationState(chapter)
    if (state.has_character_action && state.has_plot_convenience && !state.has_motivation_chain) {
      current.push(chapter)
      return
    }
    if (current.length >= 3) runs.push(current)
    current = []
  })
  if (current.length >= 3) runs.push(current)
  return runs
}

function serialSupportingCharacterAgencyGapRuns(chapters: any[]) {
  const runs: any[][] = []
  let current: any[] = []
  chapters.forEach((chapter: any) => {
    const state = serialChapterSupportingAgencyState(chapter)
    if (state.has_supporting_activity && !state.has_supporting_agency) {
      current.push(chapter)
      return
    }
    if (current.length >= 3) runs.push(current)
    current = []
  })
  if (current.length >= 3) runs.push(current)
  return runs
}

function serialConflictNoExitGlueGapRuns(chapters: any[]) {
  const runs: any[][] = []
  let current: any[] = []
  chapters.forEach((chapter: any) => {
    const state = serialChapterNoExitGlueState(chapter)
    if (state.has_conflict && !state.has_no_exit_glue) {
      current.push(chapter)
      return
    }
    if (current.length >= 2) runs.push(current)
    current = []
  })
  if (current.length >= 2) runs.push(current)
  return runs
}

function serialSocialNetworkBlankRuns(chapters: any[]) {
  const runs: any[][] = []
  let current: any[] = []
  chapters.forEach((chapter: any) => {
    const state = serialChapterSocialNetworkState(chapter)
    if (!state.has_social_interaction) {
      current.push(chapter)
      return
    }
    if (current.length >= 3) runs.push(current)
    current = []
  })
  if (current.length >= 3) runs.push(current)
  return runs
}

function serialUpperStatusContactGapRuns(chapters: any[]) {
  const runs: any[][] = []
  let current: any[] = []
  chapters.forEach((chapter: any) => {
    const state = serialChapterUpperStatusState(chapter)
    if (state.has_status_ladder_context && !state.has_upper_status_contact) {
      current.push(chapter)
      return
    }
    if (current.length >= 4) runs.push(current)
    current = []
  })
  if (current.length >= 4) runs.push(current)
  return runs
}

function serialDownwardPressureRecoveryGapRuns(chapters: any[]) {
  const runs: any[][] = []
  let current: any[] = []
  chapters.forEach((chapter: any) => {
    const state = serialChapterDownwardRecoveryState(chapter)
    if (state.has_downward_pressure && !state.has_recovery) {
      current.push(chapter)
      return
    }
    if (current.length >= 2) runs.push(current)
    current = []
  })
  if (current.length >= 2) runs.push(current)
  return runs
}

function serialProtagonistGoalContinuityGapRuns(chapters: any[]) {
  const runs: any[][] = []
  let current: any[] = []
  chapters.forEach((chapter: any) => {
    const state = serialChapterProtagonistGoalState(chapter)
    if (state.has_goal_contract && (!state.has_current_goal || !state.has_long_goal)) {
      current.push(chapter)
      return
    }
    if (current.length >= 2) runs.push(current)
    current = []
  })
  if (current.length >= 2) runs.push(current)
  return runs
}

function serialLineStaggerFlatlineRuns(chapters: any[]) {
  const runs: any[][] = []
  let current: any[] = []
  chapters.forEach((chapter: any) => {
    const state = serialChapterLineStaggerState(chapter)
    if (state.has_line_contract && !state.mainline_active && !state.subplot_active) {
      current.push(chapter)
      return
    }
    if (current.length >= 2) runs.push(current)
    current = []
  })
  if (current.length >= 2) runs.push(current)
  return runs
}

function serialChapterReaderPayoffText(chapter: any) {
  const rawPayload = chapter?.raw_payload || chapter?.rawPayload || {}
  const scenePayoffs = [
    ...asArray(chapter?.scene_cards || chapter?.sceneCards),
    ...asArray(rawPayload?.scene_cards || rawPayload?.sceneCards),
    ...asArray(rawPayload?.pre_draft_brief?.scene_briefs || rawPayload?.preDraftBrief?.sceneBriefs),
  ].flatMap((scene: any) => [
    scene?.reader_payoff,
    scene?.readerPayoff,
    scene?.payoff,
    scene?.reader_reward,
    scene?.purpose_tag,
    scene?.purposeTag,
    scene?.purpose,
  ])
  return [
    chapter?.reader_payoff,
    chapter?.readerPayoff,
    chapter?.core_payoff,
    chapter?.corePayoff,
    chapter?.payoff,
    rawPayload?.reader_payoff,
    rawPayload?.readerPayoff,
    rawPayload?.core_payoff,
    rawPayload?.corePayoff,
    rawPayload?.payoff,
    rawPayload?.pre_draft_brief?.reader_payoff,
    rawPayload?.preDraftBrief?.readerPayoff,
    ...scenePayoffs,
  ].map((item: any) => String(item || '').trim()).filter(Boolean).join('。')
}

function serialChapterReaderPayoffType(chapter: any) {
  const text = serialChapterReaderPayoffText(chapter)
  if (!text) return ''
  if (/公开打脸|打脸|当众[^。！？!?；;]{0,40}(?:改口|低头|失态|反证|揭穿|震惊)|(?:全场|围观|旁观)[^。！？!?；;]{0,20}震惊/.test(text)) return '公开打脸'
  if (/能力升级|升级|突破|觉醒|新能力|新技能|境界/.test(text)) return '能力升级'
  if (/资源收益|获得|拿到|夺回|奖励|收益|名额|资格|道具|旧印|灵石/.test(text)) return '资源收益'
  if (/关系回报|认可|信任|倒向|倒戈|盟友|态度改变|担保|站到主角/.test(text)) return '关系回报'
  if (/信息解锁|解锁|发现|揭开|确认|线索|证据|真相|记录|名册|账册|名单/.test(text)) return '信息解锁'
  if (/阶段结算|结算|收束|完成阶段|通过考核|晋级|阶段性/.test(text)) return '阶段结算'
  if (/反制|反杀|翻盘|压制|推翻|洗清/.test(text)) return '反制翻盘'
  return ''
}

function serialRepeatedReaderPayoffTypeRuns(chapters: any[]) {
  const runs: Array<Array<{ chapter: any; payoff_type: string }>> = []
  let current: Array<{ chapter: any; payoff_type: string }> = []
  for (const chapter of chapters) {
    const payoffType = serialChapterReaderPayoffType(chapter)
    if (!payoffType) {
      if (current.length >= 3) runs.push(current)
      current = []
      continue
    }
    if (!current.length || current[current.length - 1].payoff_type === payoffType) {
      current.push({ chapter, payoff_type: payoffType })
      continue
    }
    if (current.length >= 3) runs.push(current)
    current = [{ chapter, payoff_type: payoffType }]
  }
  if (current.length >= 3) runs.push(current)
  return runs
}

function serialPayoffWithoutAftermathRuns(chapters: any[]) {
  const runs: any[][] = []
  let current: any[] = []
  chapters.forEach((chapter: any) => {
    if (serialChapterHasPayoff(chapter) && !serialChapterHasAftermath(chapter)) {
      current.push(chapter)
      return
    }
    if (current.length >= 2) runs.push(current)
    current = []
  })
  if (current.length >= 2) runs.push(current)
  return runs
}

function serialChapterProseCharCount(chapter: any) {
  const prose = String(chapter?.chapter_text || chapter?.chapterText || '')
  if (prose.trim()) return countProseChars(prose)
  return countProseChars(serialChapterText(chapter))
}

function serialChapterHasWeakConflict(chapter: any) {
  const conflict = compactBriefText(chapter?.conflict || chapter?.chapter_conflict || chapter?.conflict_summary)
  const text = serialChapterText(chapter)
  SERIAL_WEAK_CONFLICT_PATTERN.lastIndex = 0
  SERIAL_CONFLICT_SIGNAL_PATTERN.lastIndex = 0
  if (!conflict) return true
  if (SERIAL_WEAK_CONFLICT_PATTERN.test(conflict)) return true
  return !SERIAL_CONFLICT_SIGNAL_PATTERN.test(`${conflict}。${text}`)
}

function serialChapterEndingHookType(chapter: any) {
  const rawPayload = chapter?.raw_payload || chapter?.rawPayload || {}
  const chapterTarget = serialChapterRawContextTarget(chapter)
  const explicitType = compactBriefText(
    chapter?.chapter_hook_contract?.ending_hook_type
    || chapter?.chapterHookContract?.endingHookType
    || rawPayload?.chapter_hook_contract?.ending_hook_type
    || rawPayload?.chapterHookContract?.endingHookType
    || rawPayload?.pre_draft_brief?.chapter_hook_contract?.ending_hook_type
    || rawPayload?.preDraftBrief?.chapterHookContract?.endingHookType
    || chapterTarget?.chapter_hook_contract?.ending_hook_type
    || chapterTarget?.chapterHookContract?.endingHookType
    || rawPayload?.pre_draft_brief?.page_turn_hook_brief?.hook_type
    || rawPayload?.preDraftBrief?.pageTurnHookBrief?.hookType
    || chapterTarget?.page_turn_hook_brief?.hook_type
    || chapterTarget?.pageTurnHookBrief?.hookType,
  )
  if (explicitType) return explicitType
  const sceneCards = [
    ...asArray(chapter?.scene_cards || chapter?.sceneCards),
    ...asArray(rawPayload?.scene_cards || rawPayload?.sceneCards),
    ...asArray(rawPayload?.generated_scene_breakdown || rawPayload?.generatedSceneBreakdown),
  ]
  const lastScene = sceneCards[sceneCards.length - 1] || {}
  const endingText = [
    chapter?.ending_hook,
    chapter?.endingHook,
    rawPayload?.ending_hook,
    rawPayload?.endingHook,
    lastScene?.ending_hook_seed,
    lastScene?.endingHookSeed,
    lastScene?.ending_hook,
    lastScene?.endingHook,
  ].map((item: any) => String(item || '').trim()).filter(Boolean).join('。')
  return endingText ? inferEndingHookType(endingText) : ''
}

function serialRepeatedEndingHookTypeRuns(chapters: any[]) {
  const runs: Array<Array<{ chapter: any; hook_type: string }>> = []
  let current: Array<{ chapter: any; hook_type: string }> = []
  for (const chapter of chapters) {
    const hookType = serialChapterEndingHookType(chapter)
    if (!hookType) {
      if (current.length >= 2) runs.push(current)
      current = []
      continue
    }
    if (!current.length || current[current.length - 1].hook_type === hookType) {
      current.push({ chapter, hook_type: hookType })
      continue
    }
    if (current.length >= 2) runs.push(current)
    current = [{ chapter, hook_type: hookType }]
  }
  if (current.length >= 2) runs.push(current)
  return runs
}

function serialChapterRangeLabel(chapters: any[]) {
  const nums = chapters.map((chapter: any) => Number(chapter?.chapter_no || chapter?.chapterNo || 0)).filter(Boolean)
  if (!nums.length) return ''
  return `第${Math.min(...nums)}-${Math.max(...nums)}章`
}

function serialWeakConflictRuns(chapters: any[]) {
  const runs: any[][] = []
  let current: any[] = []
  chapters.forEach((chapter: any) => {
    if (serialChapterHasWeakConflict(chapter)) {
      current.push(chapter)
      return
    }
    if (current.length >= 2) runs.push(current)
    current = []
  })
  if (current.length >= 2) runs.push(current)
  return runs
}

function serialTwoChapterMomentumStallRuns(chapters: any[]) {
  const runs: any[][] = []
  let current: any[] = []
  chapters.forEach((chapter: any) => {
    if (!serialChapterHasGoalObstacleOrInfoAdvance(chapter)) {
      current.push(chapter)
      return
    }
    if (current.length >= 2) runs.push(current)
    current = []
  })
  if (current.length >= 2) runs.push(current)
  return runs
}

export function buildSerialMomentumBrief(chapter: any, chapters: any[] = []) {
  const chapterNo = Number(chapter?.chapter_no || chapter?.chapterNo || 0)
  const recent = [...asArray(chapters)]
    .filter((item: any) => Number(item?.chapter_no || item?.chapterNo || 0) > 0)
    .filter((item: any) => !chapterNo || Number(item?.chapter_no || item?.chapterNo || 0) < chapterNo)
    .sort((a: any, b: any) => Number(a.chapter_no || a.chapterNo || 0) - Number(b.chapter_no || b.chapterNo || 0))
    .slice(-5)
  if (recent.length < 2) return null

  const progressChapters = recent.filter(serialChapterHasProgress)
  const payoffChapters = recent.filter(serialChapterHasPayoff)
  const weakConflictRuns = serialWeakConflictRuns(recent)
  const twoChapterMomentumStallRuns = serialTwoChapterMomentumStallRuns(recent)
  const lineStaggerFlatlineRuns = serialLineStaggerFlatlineRuns(recent)
  const repeatedCoreElementComboRuns = serialRepeatedCoreElementComboRuns(recent)
  const coreHookAbsenceGapRuns = serialCoreHookAbsenceGapRuns(recent)
  const coreHookAngleRepetitionGapRuns = serialCoreHookAngleRepetitionGapRuns(recent)
  const worldExpansionStallGapRuns = serialWorldExpansionStallGapRuns(recent)
  const readerNeedCoverageGapRuns = serialReaderNeedCoverageGapRuns(recent)
  const expectationLadderGapRuns = serialExpectationLadderGapRuns(recent)
  const foreshadowingStallGapRuns = serialForeshadowingStallGapRuns(recent)
  const fiveChapterTextureGap = serialFiveChapterTextureGap(recent)
  const conflictThrillOverrun = serialConflictThrillOverrun(recent)
  const blueprintClimaxRewardGapRuns = serialBlueprintClimaxRewardGapRuns(recent)
  const endingHarvestHandoffGapRuns = serialEndingHarvestHandoffGapRuns(recent)
  const endingSuspenseHookGapRuns = serialEndingSuspenseHookGapRuns(recent)
  const expectationChainBreakGapRuns = serialExpectationChainBreakGapRuns(recent)
  const expectationPayoffSetupGapRuns = serialExpectationPayoffSetupGapRuns(recent)
  const deceptiveMainlineHandoffGapRuns = serialDeceptiveMainlineHandoffGapRuns(recent)
  const upgradeRewardPointGapRuns = serialUpgradeRewardPointGapRuns(recent)
  const romanceTensionLayerGapRuns = serialRomanceTensionLayerGapRuns(recent)
  const romanceCareerBindingGapRuns = serialRomanceCareerBindingGapRuns(recent)
  const trumpCardReserveGapRuns = serialTrumpCardReserveGapRuns(recent)
  const showdownPressureShockGapRuns = serialShowdownPressureShockGapRuns(recent)
  const characterMotivationChainGapRuns = serialCharacterMotivationChainGapRuns(recent)
  const supportingCharacterAgencyGapRuns = serialSupportingCharacterAgencyGapRuns(recent)
  const conflictNoExitGlueGapRuns = serialConflictNoExitGlueGapRuns(recent)
  const socialNetworkBlankRuns = serialSocialNetworkBlankRuns(recent)
  const upperStatusContactGapRuns = serialUpperStatusContactGapRuns(recent)
  const downwardPressureRecoveryGapRuns = serialDownwardPressureRecoveryGapRuns(recent)
  const protagonistGoalContinuityGapRuns = serialProtagonistGoalContinuityGapRuns(recent)
  const repeatedHookTypeRuns = serialRepeatedEndingHookTypeRuns(recent)
  const repeatedPayoffTypeRuns = serialRepeatedReaderPayoffTypeRuns(recent)
  const payoffWithoutAftermathRuns = serialPayoffWithoutAftermathRuns(recent)
  const lastPayoffIndex = (() => {
    for (let index = recent.length - 1; index >= 0; index -= 1) {
      if (serialChapterHasPayoff(recent[index])) return index
    }
    return -1
  })()
  const noPayoffSinceLast = lastPayoffIndex >= 0 ? recent.slice(lastPayoffIndex + 1) : recent
  const noPayoffCharCount = noPayoffSinceLast.reduce((sum, item) => sum + serialChapterProseCharCount(item), 0)
  const signals: any[] = []
  const fatigueRisks: string[] = []
  const nextActions: string[] = []
  const rangeLabel = serialChapterRangeLabel(recent)

  if (recent.length >= 5 && progressChapters.length <= 1) {
    signals.push({
      key: 'recent_five_low_progress',
      label: '最近5章进展',
      status: 'warn',
      detail: `${rangeLabel}只有 ${progressChapters.length} 章有明确进展，读者可能感觉主线停滞。`,
    })
    fatigueRisks.push(`${rangeLabel}最近5章明确进展不足：读完章节后世界、关系、主线或信息状态变化不够。`)
    nextActions.push('下一章必须让读完本章世界或关系必须不同：至少完成一个新发现、反制、胜负结果、关系变化或主线推进。')
  }

  if (weakConflictRuns.length > 0) {
    const longestRun = weakConflictRuns.sort((a, b) => b.length - a.length)[0]
    const runLabel = serialChapterRangeLabel(longestRun)
    signals.push({
      key: 'consecutive_weak_conflict',
      label: '连续弱冲突',
      status: 'warn',
      detail: `${runLabel}连续 ${longestRun.length} 章弱冲突或过场，缺少明确阻力。`,
    })
    fatigueRisks.push(`${runLabel}连续弱冲突：冲突停在等待、观察、复盘、转场或说明，没有可见阻力和胜负变化。`)
    nextActions.push('下一章必须给出明确阻力：有人、规则、资源、时间限制或代价真正挡住主角，并写出行动阻拦和胜负变化。')
  }

  if (twoChapterMomentumStallRuns.length > 0) {
    const longestRun = twoChapterMomentumStallRuns.sort((a, b) => b.length - a.length)[0]
    const runLabel = serialChapterRangeLabel(longestRun)
    signals.push({
      key: 'two_chapter_momentum_stall',
      label: '两章动能拖沓',
      status: 'warn',
      detail: `${runLabel}连续 ${longestRun.length} 章没有目标推进、阻碍升级或新信息，触发 oh-story 写前节奏自检。`,
    })
    fatigueRisks.push(`${runLabel}连续两章缺目标推进、阻碍升级或新信息：章节在整理、等待、复看或解释中原地打转，读者看不到局势变化。`)
    nextActions.push('下一章必须提高冲突密度：让目标推进一步，或让阻碍升级成新门槛/倒计时/代价，或抛出能改变判断的新信息。')
  }

  if (lineStaggerFlatlineRuns.length > 0) {
    const longestRun = lineStaggerFlatlineRuns.sort((a, b) => b.length - a.length)[0]
    const runLabel = serialChapterRangeLabel(longestRun)
    signals.push({
      key: 'line_stagger_flatline',
      label: '主支线同时空转',
      status: 'warn',
      detail: `${runLabel}连续 ${longestRun.length} 章主线和支线都停在等待、观察、整理、复盘或铺垫。`,
    })
    fatigueRisks.push(`${runLabel}主线和支线同时空转：两条线都没有错开推进，读者会感觉章节只在等信息而不是往前走。`)
    nextActions.push('下一章必须错开节奏：主线和支线至少推进一条，另一条只保留钩子、代价或伏笔；不要两条线一起等待、复盘或铺垫。')
  }

  if (repeatedCoreElementComboRuns.length > 0) {
    const longestRun = repeatedCoreElementComboRuns.sort((a, b) => b.length - a.length)[0]
    const runChapters = longestRun.map(row => row.chapter)
    const runLabel = serialChapterRangeLabel(runChapters)
    const comboLabel = longestRun[0]?.combo?.label || '同一核心要素组合'
    signals.push({
      key: 'repeated_core_element_combo',
      label: '核心要素组合重复',
      status: 'warn',
      detail: `${runLabel}连续 ${longestRun.length} 章使用「${comboLabel}」核心要素组合，套路轮廓过于相同。`,
    })
    fatigueRisks.push(`${runLabel}核心要素组合重复：连续章节都在使用「${comboLabel}」，读者容易看出模板。`)
    nextActions.push(`下一章必须更换场景、人物或情绪中的至少一项，并轮换核心事件要素；不要继续使用「${comboLabel}」的完整组合。`)
  }

  if (coreHookAbsenceGapRuns.length > 0) {
    const longestRun = coreHookAbsenceGapRuns.sort((a, b) => b.length - a.length)[0]
    const runLabel = serialChapterRangeLabel(longestRun)
    signals.push({
      key: 'core_hook_absence_gap',
      label: '核心梗空白',
      status: 'warn',
      detail: `${runLabel}连续 ${longestRun.length} 章有核心梗/卖点合同，但章节摘要和章尾没有交付相关期待点、爽点或核心卖点回报。`,
    })
    fatigueRisks.push(`${runLabel}核心梗连续空白：写了流程、排队、整理或普通对话，但没有让读者看到核心卖点、金手指/能力使用、期待点、爽点或题材长板回报。`)
    nextActions.push('下一章必须回到核心梗：至少写一个核心卖点相关期待点或爽点，例如金手指/能力使用、规则反制、客户态度反转、订单/奖励到账，且换一个角度推进。')
  }

  if (coreHookAngleRepetitionGapRuns.length > 0) {
    const longestRun = coreHookAngleRepetitionGapRuns.sort((a, b) => b.length - a.length)[0]
    const runChapters = longestRun.map(row => row.chapter)
    const runLabel = serialChapterRangeLabel(runChapters)
    const angleLabel = longestRun[0]?.angle || '同一角度'
    signals.push({
      key: 'core_hook_angle_repetition_gap',
      label: '核心梗角度重复',
      status: 'warn',
      detail: `${runLabel}连续 ${longestRun.length} 章都用「${angleLabel}」交付核心卖点，缺少不同角度或不同矛盾。`,
    })
    fatigueRisks.push(`${runLabel}同一核心卖点角度重复：核心梗有出现，但连续落在「${angleLabel}」，读者会感觉只是换设备、换对象、换壳重复同一小循环。`)
    nextActions.push('下一章必须把同一核心卖点换成不同角度/不同矛盾：从检测定位切到规则反制、修复交付、客户订单回报、系统奖励反馈或信息差反转之一。')
  }

  if (worldExpansionStallGapRuns.length > 0) {
    const longestRun = worldExpansionStallGapRuns.sort((a, b) => b.length - a.length)[0]
    const runLabel = serialChapterRangeLabel(longestRun)
    signals.push({
      key: 'world_expansion_stall_gap',
      label: '世界扩展停滞',
      status: 'warn',
      detail: `${runLabel}连续 ${longestRun.length} 章有地图/循环扩展合同，但章节摘要、蓝图和章尾没有打开新地图、新势力、新规则或大循环期待。`,
    })
    fatigueRisks.push(`${runLabel}世界观扩展停滞：长篇循环仍停在同一小场景、同类客户/设备或同一窗口流程，没有让地图、势力、规则层或大循环变大。`)
    nextActions.push('下一章必须显性打开世界扩展：新地图、新势力、新规则/资源门槛或大循环期待至少落一个，并把它接到当前小循环的下一目标。')
  }

  if (readerNeedCoverageGapRuns.length > 0) {
    const longestRun = readerNeedCoverageGapRuns.sort((a, b) => b.length - a.length)[0]
    const runLabel = serialChapterRangeLabel(longestRun)
    signals.push({
      key: 'reader_need_coverage_gap',
      label: '读者需求命中缺口',
      status: 'warn',
      detail: `${runLabel}连续 ${longestRun.length} 章有目标读者/情绪缺口合同，但章节没有落到尊严、掌控感、认可、反制、收益或可感知回报。`,
    })
    fatigueRisks.push(`${runLabel}读者需求连续未命中：章节在流程、设定或材料处理中推进，却没有满足目标读者想看的尊严补偿、掌控感、被认可、翻盘、即时收益或可见回报。`)
    nextActions.push('下一章必须把卖点重新对准读者需求：从尊严、掌控感、安全感、认可、反制翻盘或可感知回报里至少落一个，并写成现场行动、角色反应和结果。')
  }

  if (expectationLadderGapRuns.length > 0) {
    const longestRun = expectationLadderGapRuns.sort((a, b) => b.length - a.length)[0]
    const runLabel = serialChapterRangeLabel(longestRun)
    const missingKinds = uniqueBriefStrings(longestRun.flatMap((item: any) => serialChapterExpectationLadderState(item).missing), 6)
    signals.push({
      key: 'expectation_ladder_gap',
      label: '期待层级断线',
      status: 'warn',
      detail: `${runLabel}连续 ${longestRun.length} 章有两长一短/期待阈值合同，但缺少${missingKinds.join('、') || '短中长期待'}的正文证据。`,
    })
    fatigueRisks.push(`${runLabel}两长一短断线：章节只处理眼前流程或当前材料，短期下一章、中期剧情单元、长期卷/全书期待没有同时在线。`)
    nextActions.push('下一章必须恢复三层期待：短期写下一章会发生什么，中期写这个剧情单元怎么收，长期写父亲旧案/幕后势力/卷目标等远期悬念，并在章尾同时保温。')
  }

  if (foreshadowingStallGapRuns.length > 0) {
    const longestRun = foreshadowingStallGapRuns.sort((a, b) => b.length - a.length)[0]
    const runChapters = longestRun.map(row => row.chapter)
    const runLabel = serialChapterRangeLabel(runChapters)
    const clueLabel = longestRun[0]?.label || '同一伏笔'
    signals.push({
      key: 'foreshadowing_stall_gap',
      label: '伏笔推进停滞',
      status: 'warn',
      detail: `${runLabel}连续 ${longestRun.length} 章重复「${clueLabel}」，但没有信息增量、答案路径、半回收或新门槛。`,
    })
    fatigueRisks.push(`${runLabel}伏笔不是谜语人：同一长期线索「${clueLabel}」连续出现却不推进，读者会感觉作者只是在拖延信息。`)
    nextActions.push(`下一章必须推进「${clueLabel}」：提前给一部分答案、打开答案路径、让线索对应具体门锁/人物/地点，或删掉重复提醒并换成新的可追踪伏笔。`)
  }

  if (fiveChapterTextureGap) {
    const runLabel = serialChapterRangeLabel(fiveChapterTextureGap)
    signals.push({
      key: 'five_chapter_texture_gap',
      label: '五章调剂缺口',
      status: 'warn',
      detail: `${runLabel}最近5章缺少关系深化或世界观展开，连续流程/冲突会削弱连载层次。`,
    })
    fatigueRisks.push(`${runLabel}缺少关系深化或世界观展开：最近5章都在推进流程、压迫、追查或反制，人物关系和世界层次没有给读者新的可感知变化。`)
    nextActions.push('下一章必须补关系深化或世界观展开：让信任、同盟、承诺、担保发生质变，或打开新地图、新势力、新规则/资源门槛；世界观展开要绑定剧情推进，不搞说明文。')
  }

  if (conflictThrillOverrun) {
    const runLabel = serialChapterRangeLabel(conflictThrillOverrun)
    signals.push({
      key: 'conflict_thrill_overrun',
      label: '大冲突冷却',
      status: 'warn',
      detail: `${runLabel}连续 ${conflictThrillOverrun.length} 章是大冲突/打斗/公开压迫节拍，超过 oh-story 连续 2 章冷却线。`,
    })
    fatigueRisks.push(`${runLabel}大冲突连续超出冷却线：连续审问、打斗、对抗或压迫会让爽点疲劳，读者需要看到关系、世界、势力或余波层面的变化。`)
    nextActions.push('下一章必须轮换桥段类型：优先写关系深化、世界观展开、势力建设或冲突余波，不要继续开打或继续会审压问。')
  }

  if (blueprintClimaxRewardGapRuns.length > 0) {
    const longestRun = blueprintClimaxRewardGapRuns.sort((a, b) => b.length - a.length)[0]
    const runLabel = serialChapterRangeLabel(longestRun)
    signals.push({
      key: 'blueprint_climax_reward_gap',
      label: '蓝图闭环缺口',
      status: 'warn',
      detail: `${runLabel}连续 ${longestRun.length} 章蓝图缺少明确高潮和收获闭环，容易写成只有起因、发展和铺垫。`,
    })
    fatigueRisks.push(`${runLabel}缺少高潮和收获闭环：章节蓝图没有把起因、发展推到可见高潮，也没有清点收获或下一目标。`)
    nextActions.push('下一章蓝图必须补完整闭环：起因 -> 发展 -> 高潮 -> 收获，并在结尾清点收益、代价、下一目标或新门槛。')
  }

  if (endingHarvestHandoffGapRuns.length > 0) {
    const longestRun = endingHarvestHandoffGapRuns.sort((a, b) => b.length - a.length)[0]
    const runLabel = serialChapterRangeLabel(longestRun)
    signals.push({
      key: 'ending_harvest_handoff_gap',
      label: '章尾交接缺口',
      status: 'warn',
      detail: `${runLabel}连续 ${longestRun.length} 章章尾没有同时完成收获清点和铺垫下一段，结尾容易只结账或只开新坑。`,
    })
    fatigueRisks.push(`${runLabel}章尾没有同时完成收获清点和铺垫下一段：读者看不到本章到手的结果，或不知道下一段为什么必须继续追。`)
    nextActions.push('下一章结尾必须同时完成两件事：先做收获清点（收益、代价、状态或线索），再铺垫下一段（下一目标、新风险、未解决问题或新门槛）。')
  }

  if (endingSuspenseHookGapRuns.length > 0) {
    const longestRun = endingSuspenseHookGapRuns.sort((a, b) => b.length - a.length)[0]
    const runLabel = serialChapterRangeLabel(longestRun)
    signals.push({
      key: 'ending_suspense_hook_gap',
      label: '章尾悬念缺口',
      status: 'warn',
      detail: `${runLabel}连续 ${longestRun.length} 章结尾平静收束，没有留下未解决悬念、危险、倒计时或新门槛。`,
    })
    fatigueRisks.push(`${runLabel}断章追读不足：章尾把旧案、禁库或账册处理成完成、整理、恢复平静，但没有未解决问题、危险触发、倒计时压力或下一层新门槛。`)
    nextActions.push('下一章结尾必须留下具体追读钩子：未解决问题、可见危险、倒计时、新门槛或现场触发物至少落一个，不能只写整理完毕、恢复平静或回房休息。')
  }

  if (expectationChainBreakGapRuns.length > 0) {
    const longestRun = expectationChainBreakGapRuns.sort((a, b) => b.length - a.length)[0]
    const runLabel = serialChapterRangeLabel(longestRun)
    signals.push({
      key: 'expectation_chain_break_gap',
      label: '连续断期待',
      status: 'warn',
      detail: `${runLabel}连续 ${longestRun.length} 章闭合旧期待或兑现当前目标，但没有先立起下一开环。`,
    })
    fatigueRisks.push(`${runLabel}断期待风险：旧目标、证人答案、资格门槛或父亲旧案被连续兑现后，文本把期待清空或让麻烦消失，读者会觉得赢完就空。`)
    nextActions.push('下一章必须先补下一开环再兑现旧期待：至少挂一个下一目标、新门槛、新线索、新困境或长期期待，并让它在高潮前或章尾可见。')
  }

  if (expectationPayoffSetupGapRuns.length > 0) {
    const longestRun = expectationPayoffSetupGapRuns.sort((a, b) => b.length - a.length)[0]
    const runLabel = serialChapterRangeLabel(longestRun)
    const states = longestRun.map((item: any) => serialChapterExpectationPayoffSetupState(item))
    const setupChars = states.reduce((sum, item) => sum + Number(item.setup_chars || 0), 0)
    const payoffChars = states.reduce((sum, item) => sum + Number(item.payoff_chars || 0), 0)
    signals.push({
      key: 'expectation_payoff_setup_gap',
      label: '期待铺垫不足',
      status: 'warn',
      detail: `${runLabel}连续 ${longestRun.length} 章爽点/高潮释放前铺垫不足，铺垫约 ${setupChars} 字，释放约 ${payoffChars} 字。`,
    })
    fatigueRisks.push(`${runLabel}期待感小于爽点释放：爽点、打脸或揭露前的危机、期待、信息差或代价铺垫短于释放段。`)
    nextActions.push('下一章必须先铺期待再释放爽点：危机、压迫、信息差、误判、暗牌或代价的铺垫篇幅不少于释放篇幅，再进入打脸、揭露、反制或收获。')
  }

  if (deceptiveMainlineHandoffGapRuns.length > 0) {
    const longestRun = deceptiveMainlineHandoffGapRuns.sort((a, b) => b.length - a.length)[0]
    const runLabel = serialChapterRangeLabel(longestRun)
    signals.push({
      key: 'deceptive_mainline_handoff_gap',
      label: '欺骗式主线交接缺口',
      status: 'warn',
      detail: `${runLabel}连续 ${longestRun.length} 章把主线写成彻底收束，但没有留下接近完成又差一点的继续追读缺口。`,
    })
    fatigueRisks.push(`${runLabel}欺骗式主线不足：主线看起来已经完成、真相大白或彻底解决，却没有留下最后一块证据、更高一层阻碍或新的门槛。`)
    nextActions.push('下一章必须补欺骗式主线交接：让主线看似接近完成又差一点，明确最后一块证据、未开的入口、更高一层人物、新门槛或新代价，避免把阶段主线关死。')
  }

  if (upgradeRewardPointGapRuns.length > 0) {
    const longestRun = upgradeRewardPointGapRuns.sort((a, b) => b.length - a.length)[0]
    const runLabel = serialChapterRangeLabel(longestRun)
    signals.push({
      key: 'upgrade_reward_point_gap',
      label: '升级奖励点缺口',
      status: 'warn',
      detail: `${runLabel}连续 ${longestRun.length} 章处在升级/试炼/榜单/成长阶段，但缺少明确奖励点。`,
    })
    fatigueRisks.push(`${runLabel}升级文奖励点不足：阶段推进停在试炼、境界、榜单或系统条件里，读者没有拿到升级、装备、认可或揭秘的明确回报。`)
    nextActions.push('下一章必须落一个阶段奖励点：升级/装备/认可/揭秘至少一项要可见，并把奖励点接到下一门槛、下一排名、下一能力用途或下一条主线线索。')
  }

  if (romanceTensionLayerGapRuns.length > 0) {
    const longestRun = romanceTensionLayerGapRuns.sort((a, b) => b.length - a.length)[0]
    const runLabel = serialChapterRangeLabel(longestRun)
    signals.push({
      key: 'romance_tension_layer_gap',
      label: '感情线拉扯缺口',
      status: 'warn',
      detail: `${runLabel}连续 ${longestRun.length} 章有感情/暧昧桥段，但缺少拉扯、边界、选择或代价层次。`,
    })
    fatigueRisks.push(`${runLabel}感情线只有陪伴或甜味堆叠：关系在递茶、照顾、并肩等桥段里重复，但没有试探、误会、边界、主动选择、事业节点或代价变化。`)
    nextActions.push('下一章感情线必须补拉扯和层次：把一个甜/陪伴桥段改成试探、误会、边界、主动选择、代价或事业/成长节点绑定，做到有拉扯有层次，不是堆砌桥段。')
  }

  if (romanceCareerBindingGapRuns.length > 0) {
    const longestRun = romanceCareerBindingGapRuns.sort((a, b) => b.length - a.length)[0]
    const runLabel = serialChapterRangeLabel(longestRun)
    signals.push({
      key: 'romance_career_binding_gap',
      label: '感情事业绑定缺口',
      status: 'warn',
      detail: `${runLabel}连续 ${longestRun.length} 章有感情/关系桥段，但没有牵动事业线、主线调查、资格资源或角色选择后果。`,
    })
    fatigueRisks.push(`${runLabel}感情线和事业线脱钩：关系有试探、误会、确认或陪伴，但没有改写主线进度、调查资源、资格名额、证人立场或下一章门槛。`)
    nextActions.push('下一章必须让感情线绑定事业线或主线：一次亲密、误会、试探或共同承担，要改变主线线索、调查入口、资格资源、证人立场、事业选择或下一章门槛。')
  }

  if (trumpCardReserveGapRuns.length > 0) {
    const longestRun = trumpCardReserveGapRuns.sort((a, b) => b.length - a.length)[0]
    const runLabel = serialChapterRangeLabel(longestRun)
    signals.push({
      key: 'trump_card_reserve_gap',
      label: '底牌储备缺口',
      status: 'warn',
      detail: `${runLabel}连续 ${longestRun.length} 章释放底牌后没有保留未揭示底牌或补入新后手，后续期待会被摊空。`,
    })
    fatigueRisks.push(`${runLabel}底牌管理不足：连续亮底牌、摊底牌或用尽后手，但没有让读者看到仍有2-3个未揭示底牌、新后手、新技能、新目标或更高门槛。`)
    nextActions.push('下一章必须修底牌储备：每次只出1个底牌，并明确保留2-3个未揭示底牌；如果已经摊空，就立刻补新后手、新技能、新目标或更高门槛。')
  }

  if (showdownPressureShockGapRuns.length > 0) {
    const longestRun = showdownPressureShockGapRuns.sort((a, b) => b.length - a.length)[0]
    const runLabel = serialChapterRangeLabel(longestRun)
    signals.push({
      key: 'showdown_pressure_shock_gap',
      label: '三压三震缺口',
      status: 'warn',
      detail: `${runLabel}连续 ${longestRun.length} 章有装逼/反制/高潮爽点，但缺少友方、敌方、中立三路铺压和爆后三方震动。`,
    })
    fatigueRisks.push(`${runLabel}三压一爆三震不足：爽点连续落成主角拿证据、反制或翻盘后统一震惊，缺少友方期待、敌方不服、中立观望加压，以及友方/敌方/中立爆后不同震动。`)
    nextActions.push('下一章必须补三压一爆三震：先铺友方期待或站队、敌方两次不服或逼迫、中立方观望加压；主角一爆后分别写友方传话/站队、敌方破防/改口、中立方改判/重审。')
  }

  if (characterMotivationChainGapRuns.length > 0) {
    const longestRun = characterMotivationChainGapRuns.sort((a, b) => b.length - a.length)[0]
    const runLabel = serialChapterRangeLabel(longestRun)
    signals.push({
      key: 'character_motivation_chain_gap',
      label: '角色动机链缺口',
      status: 'warn',
      detail: `${runLabel}连续 ${longestRun.length} 章角色行动依赖突然决定、剧情需要或方便主线，但缺少可见动机链。`,
    })
    fatigueRisks.push(`${runLabel}角色动机链缺失，行为像被剧情倒推：主角、配角或反派在突然决定、交证据、改口、退场或改判，但看不到起因、情感动机、约束、风险、代价和行为变化。`)
    nextActions.push('下一章必须补角色动机链：关键行动前先写具体起因，再写情感动机、约束/风险、选择代价和行为变化；不要再用“突然”“剧情需要”“方便主线”推动角色。')
  }

  if (supportingCharacterAgencyGapRuns.length > 0) {
    const longestRun = supportingCharacterAgencyGapRuns.sort((a, b) => b.length - a.length)[0]
    const runLabel = serialChapterRangeLabel(longestRun)
    signals.push({
      key: 'supporting_character_agency_gap',
      label: '配角能动性缺口',
      status: 'warn',
      detail: `${runLabel}连续 ${longestRun.length} 章有配角参与推进，但缺少自己的立场、动机、利益或代价。`,
    })
    fatigueRisks.push(`${runLabel}配角工具人化：配角连续承担递证据、提醒、阻止、传令或交钥匙等功能位，但看不到自己的目标、立场、利益、压力或代价。`)
    nextActions.push('下一章必须补配角能动性：至少给一个关键配角明确立场、动机、利益或代价，并让这个配角的选择改变主角方案、冲突走向或下一章门槛，避免单纯工具人。')
  }

  if (conflictNoExitGlueGapRuns.length > 0) {
    const longestRun = conflictNoExitGlueGapRuns.sort((a, b) => b.length - a.length)[0]
    const runLabel = serialChapterRangeLabel(longestRun)
    signals.push({
      key: 'conflict_no_exit_glue_gap',
      label: '冲突黏结剂缺口',
      status: 'warn',
      detail: `${runLabel}连续 ${longestRun.length} 章已有阻力或对抗，但缺少让主角不能抽身的黏结剂。`,
    })
    fatigueRisks.push(`${runLabel}缺少冲突黏结剂：虽然有人阻止主角，但读者还看不出主角为什么不能随时退出，冲突紧张感会变松。`)
    nextActions.push('下一章必须补冲突黏结剂：让读者相信主角不能随时退出，并至少使用杀人理由、工作职责、道德责任或实体场所之一绑定对立双方。')
  }

  if (socialNetworkBlankRuns.length > 0) {
    const longestRun = socialNetworkBlankRuns.sort((a, b) => b.length - a.length)[0]
    const runLabel = serialChapterRangeLabel(longestRun)
    signals.push({
      key: 'protagonist_social_network_blank',
      label: '主角社会关系空白',
      status: 'warn',
      detail: `${runLabel}连续 ${longestRun.length} 章缺少能改变立场、关系、资源或规则评价的人际互动。`,
    })
    fatigueRisks.push(`${runLabel}社会关系不空白要求未满足：主角连续独自推进，缺少互动人际网络，读者看不到关系、立场和声望如何变化。`)
    nextActions.push('下一章必须补互动人际网络：安排至少一个有立场、有利益或有权威的人与主角互动，并让互动改变关系、立场、资源、声望或规则评价。')
  }

  if (upperStatusContactGapRuns.length > 0) {
    const longestRun = upperStatusContactGapRuns.sort((a, b) => b.length - a.length)[0]
    const runLabel = serialChapterRangeLabel(longestRun)
    signals.push({
      key: 'upper_status_contact_gap',
      label: '上层地位触点缺口',
      status: 'warn',
      detail: `${runLabel}连续 ${longestRun.length} 章停留在低层组织/阶层规则里，没有触碰上位者、资格门槛或地位收获。`,
    })
    fatigueRisks.push(`${runLabel}上层地位不缺失要求未满足：外门、杂役、低层规则持续循环，但缺少上位者、资格、名额、晋升或更高规则的牵引。`)
    nextActions.push('下一章必须补上行触点：让上位者、资格/名额、晋升门槛、审判庭/长老席规则或地位收获至少落一个，并让它改变主角下一段目标。')
  }

  if (downwardPressureRecoveryGapRuns.length > 0) {
    const longestRun = downwardPressureRecoveryGapRuns.sort((a, b) => b.length - a.length)[0]
    const runLabel = serialChapterRangeLabel(longestRun)
    signals.push({
      key: 'downward_pressure_recovery_gap',
      label: '下压回收缺口',
      status: 'warn',
      detail: `${runLabel}连续 ${longestRun.length} 章让主角承压或吃瘪，但缺少安全感、反制窗口或意外收获。`,
    })
    fatigueRisks.push(`${runLabel}主角吃瘪没有从其他角度拉回：连续下压缺少深层逻辑、潜在解法、暗牌证据、盟友动作、规则漏洞或意外收获。`)
    nextActions.push('下一章必须拉回情绪：在继续施压前先给读者看见潜在解法、暗牌/证据、盟友动作、规则漏洞、深层逻辑或意外收获，避免只让主角受辱受损。')
  }

  if (protagonistGoalContinuityGapRuns.length > 0) {
    const longestRun = protagonistGoalContinuityGapRuns.sort((a, b) => b.length - a.length)[0]
    const runLabel = serialChapterRangeLabel(longestRun)
    const missingKinds = uniqueBriefStrings(longestRun.flatMap((item: any) => serialChapterProtagonistGoalState(item).missing), 4)
    signals.push({
      key: 'protagonist_goal_continuity_gap',
      label: '主角目标断线',
      status: 'warn',
      detail: `${runLabel}连续 ${longestRun.length} 章缺少${missingKinds.join('、') || '当前小目标或长线大目标'}，主角行动容易变成被剧情推着走。`,
    })
    fatigueRisks.push(`${runLabel}当前小目标和长线大目标不够清晰：读者不知道主角眼前要拿什么、长线为什么非走不可。`)
    nextActions.push('下一章必须同时写清短线行动目标和长线大目标：先让主角主动选择眼前要拿到的结果，再把它挂回长期追求、卷级目标或主线终局。')
  }

  if (noPayoffSinceLast.length > 0 && noPayoffCharCount > 5000) {
    const noPayoffRangeLabel = serialChapterRangeLabel(noPayoffSinceLast)
    signals.push({
      key: 'payoff_interval_over_5000_chars',
      label: '爽点间隔',
      status: 'warn',
      detail: `${noPayoffRangeLabel || rangeLabel}距上次可见回报后累计约 ${noPayoffCharCount} 字没有新爽点，超过 oh-story 5000 字警戒线。`,
    })
    fatigueRisks.push(`${noPayoffRangeLabel || rangeLabel}爽点间隔超过5000字：读者长时间没有看到收益、反制、升级、信息解锁或阶段结算。`)
    nextActions.push('下一章必须交付显性回报：不要只继续铺垫或复盘，必须让主角获得收益、完成反制、逼对手改口、解锁关键信息或完成阶段结算。')
  }

  if (recent.length >= 3 && payoffChapters.length === 0) {
    signals.push({
      key: 'recent_payoff_drought',
      label: '回报间隔',
      status: 'warn',
      detail: `${rangeLabel}缺少可见读者回报，爽点、收益、反制结果或阶段结算间隔过长。`,
    })
    fatigueRisks.push(`${rangeLabel}可见读者回报不足：最近章节没有明确爽点、收益、反制结果、阶段结算或关系回报。`)
    nextActions.push('下一章必须交付显性回报：让主角拿到收益、完成反制、逼对手改口、解锁信息、推进关系或完成阶段结算。')
  }

  if (repeatedPayoffTypeRuns.length > 0) {
    const longestRun = repeatedPayoffTypeRuns.sort((a, b) => b.length - a.length)[0]
    const runChapters = longestRun.map(row => row.chapter)
    const runLabel = serialChapterRangeLabel(runChapters)
    const payoffType = longestRun[0]?.payoff_type || '同类回报'
    signals.push({
      key: 'repeated_reader_payoff_type',
      label: '回报形态重复',
      status: 'warn',
      detail: `${runLabel}连续 ${longestRun.length} 章使用「${payoffType}」回报形态，容易形成爽点重复和审美疲劳。`,
    })
    fatigueRisks.push(`${runLabel}连续回报形态重复：连续 ${longestRun.length} 章都用「${payoffType}」，需要按 oh-story 爽点递增对比更换角度。`)
    nextActions.push(`下一章必须避开「${payoffType}」回报形态，改用信息解锁、关系回报、资源收益、能力升级、阶段结算或反制翻盘之一，并在影响范围、揭示深度或身份落差上至少升级一项。`)
  }

  if (repeatedHookTypeRuns.length > 0) {
    const longestRun = repeatedHookTypeRuns.sort((a, b) => b.length - a.length)[0]
    const runChapters = longestRun.map(row => row.chapter)
    const runLabel = serialChapterRangeLabel(runChapters)
    const hookType = longestRun[0]?.hook_type || '同类钩子'
    signals.push({
      key: 'repeated_ending_hook_type',
      label: '章末钩子类型重复',
      status: 'warn',
      detail: `${runLabel}连续 ${longestRun.length} 章使用「${hookType}」章末钩子，容易让翻页期待疲劳。`,
    })
    fatigueRisks.push(`${runLabel}连续章尾钩子类型重复：连续 ${longestRun.length} 章都用「${hookType}」，违反 oh-story 连续两章不用同一种钩子的规则。`)
    nextActions.push(`下一章必须避开「${hookType}」章末钩子，改用新的选择、危险、倒计时、未完成动作、神秘物品或承诺/威胁，并让新钩子改变信息、风险或情绪角度。`)
  }

  if (payoffWithoutAftermathRuns.length > 0) {
    const longestRun = payoffWithoutAftermathRuns.sort((a, b) => b.length - a.length)[0]
    const runLabel = serialChapterRangeLabel(longestRun)
    signals.push({
      key: 'consecutive_payoff_without_aftermath',
      label: '连续爆点无余波',
      status: 'warn',
      detail: `${runLabel}连续 ${longestRun.length} 章交付爆点或回报，但缺少关系、伏笔、状态或下一目标承接。`,
    })
    fatigueRisks.push(`${runLabel}连续只爆点不留反应余波：读者看到赢点后，没有看到关系、伏笔、状态或新门槛被推进。`)
    nextActions.push('下一章必须插入1-2个承接余波场景：让关系、伏笔、状态、新目标或新代价至少推进一项，再进入下一个爆点。')
  }

  if (!signals.length) return null
  const hasPayoffDrought = signals.some((signal: any) => signal.key === 'recent_payoff_drought' || signal.key === 'payoff_interval_over_5000_chars')
  const repeatedHookTypeSignal = signals.find((signal: any) => signal.key === 'repeated_ending_hook_type')
  const repeatedPayoffTypeSignal = signals.find((signal: any) => signal.key === 'repeated_reader_payoff_type')
  const payoffWithoutAftermathSignal = signals.find((signal: any) => signal.key === 'consecutive_payoff_without_aftermath')
  return {
    version: 'oh_story_serial_momentum_v1',
    status: 'needs_attention',
    score: Math.max(0, 100 - signals.length * 18 - Math.max(0, 2 - progressChapters.length) * 8 - (hasPayoffDrought ? 6 : 0)),
    chapter_range_label: rangeLabel,
    summary: `${rangeLabel}连载动能需要修复：${signals.map(signal => signal.label).join('、')}。`,
    signals,
    fatigue_risks: uniqueBriefStrings(fatigueRisks, 8),
    next_actions: uniqueBriefStrings(nextActions, 8),
    conflict_variation: '本章必须更换冲突来源，并让阻力从背景说明升级为可见行动阻拦。',
    payoff_variation: repeatedPayoffTypeSignal
      ? `更换回报形态：${repeatedPayoffTypeSignal.detail} 下一章必须按影响范围、揭示深度或身份落差升级爽点。`
      : hasPayoffDrought
      ? '本章必须交付显性回报：收益、反制结果、阶段结算、信息解锁或关系变化至少落一个。'
      : '本章必须给出明确状态变化或读者回报，不能只复盘、等待或解释。',
    hook_variation: repeatedHookTypeSignal
      ? `更换章末钩子类型：${repeatedHookTypeSignal.detail}`
      : '章末必须留下新的选择、危险、发现或反转，不能用氛围句收束。',
    scene_freshness: payoffWithoutAftermathSignal
      ? '至少补一个承接场景，把上一轮爆点后的关系余波、伏笔线索、状态变化或新目标写成读者能复述的可视化场面。'
      : '至少补一个能被读者复述的可视化场面，证明连载动能恢复。',
  }
}

function serialQualityRiskFromReview(review: any, chapter: any) {
  const type = String(review?.review_type || '')
  const payload = reviewPayloadForType(review, type)
  if (!reviewBelongsToChapter(review, payload, chapter)) return null
  const status = String(payload?.status || review?.status || '').toLowerCase()
  const countFrom = (...keys: string[]) => keys.reduce((max, key) => {
    const value = Number(payload?.[key])
    return Number.isFinite(value) ? Math.max(max, value) : max
  }, 0)
  const score = Number(
    payload?.score
    ?? payload?.self_check?.review?.score
    ?? payload?.selfCheck?.review?.score
    ?? payload?.readability_score
    ?? payload?.readabilityScore,
  )
  const needsRevision = Boolean(
    payload?.needs_revision
    || payload?.needsRevision
    || payload?.self_check?.review?.needs_revision
    || payload?.selfCheck?.review?.needsRevision,
  )
  const serialRiskRepairRisks = type === 'prose_quality'
    ? proseQualitySerialRiskRepairRisks(payload)
    : []
  const riskCount = (() => {
    if (type === 'prose_quality') return serialRiskRepairRisks.length || ((status === 'warn' || needsRevision || (Number.isFinite(score) && score > 0 && score < 78)) ? 1 : 0)
    if (type === 'deterministic_prose_cleanup') return countFrom('risk_count', 'riskCount')
    if (type === 'state_delta_completeness') return countFrom('missed_count', 'missedCount')
    if (type === 'chapter_blueprint_sync') return countFrom('missed_count', 'missedCount')
    if (type === 'core_contract_sync') return countFrom('missed_count', 'missedCount')
    if (type === 'benchmark_recall_sync') return countFrom('missed_count', 'missedCount')
    if (type === 'style_boundary_sync') return countFrom('missed_count', 'missedCount')
    if (type === 'story_loop_sync') return countFrom('missed_count', 'missedCount')
    if (type === 'information_flow_sync') return countFrom('missed_count', 'missedCount')
    if (type === 'expectation_threshold_sync') return countFrom('missed_count', 'missedCount')
    if (type === 'emotional_arc_sync') return countFrom('missed_count', 'missedCount')
    if (type === 'chapter_hook_sync') return countFrom('missed_count', 'missedCount')
    if (type === 'paragraph_hook_sync') return countFrom('missed_count', 'missedCount')
    if (type === 'suspense_sync') return countFrom('missed_count', 'missedCount')
    if (type === 'reversal_sync') return countFrom('missed_count', 'missedCount')
    if (type === 'showdown_sync') return countFrom('missed_count', 'missedCount')
    if (type === 'spectator_reaction_sync') return countFrom('missed_count', 'missedCount')
    if (type === 'payoff_setup_sync') return countFrom('missed_count', 'missedCount')
    if (type === 'bridge_unit_sync') return countFrom('missed_count', 'missedCount')
    if (type === 'beat_cooling_sync') return countFrom('missed_count', 'missedCount')
    if (type === 'opening_sync') return countFrom('missed_count', 'missedCount')
    if (type === 'prose_craft_sync') return countFrom('missed_count', 'missedCount')
    if (type === 'punctuation_tone_sync') return countFrom('missed_count', 'missedCount')
    if (type === 'quality_audit_sync') return countFrom('missed_count', 'missedCount')
    if (type === 'chapter_handoff_sync') return countFrom('missed_count', 'missedCount')
    if (type === 'chapter_title_uniqueness_sync') return countFrom('missed_count', 'missedCount')
    if (type === 'dialogue_sync') return countFrom('missed_count', 'missedCount')
    if (type === 'character_behavior_sync') return countFrom('missed_count', 'missedCount')
    if (type === 'asset_linkage_sync') return countFrom('missed_count', 'missedCount')
    if (type === 'state_tracking_sync') return countFrom('missed_count', 'missedCount')
    if (type === 'source_readiness_sync') return countFrom('missed_count', 'missedCount')
    if (type === 'prose_meta_sync') return countFrom('missed_count', 'missedCount')
    if (type === 'intent_confirmation_sync') return countFrom('missed_count', 'missedCount')
    if (type === 'continuity_heat_sync') return countFrom('missed_count', 'missedCount')
    if (type === 'conflict_structure_sync') return countFrom('missed_count', 'missedCount')
    if (type === 'upgrade_rhythm_sync') return countFrom('missed_count', 'missedCount')
    if (type === 'target_reader_sync') return countFrom('missed_count', 'missedCount')
    if (type === 'genre_positioning_sync') return countFrom('missed_count', 'missedCount')
    if (type === 'female_audience_sync') return countFrom('missed_count', 'missedCount')
    if (type === 'plot_dynamics_sync') return countFrom('missed_count', 'missedCount')
    if (type === 'story_power_sync') return countFrom('missed_count', 'missedCount')
    if (type === 'character_relation_sync') return countFrom('missed_count', 'missedCount')
    if (type === 'reader_retention_sync') return countFrom('missed_count', 'missedCount', 'weak_count', 'weakCount')
    if (type === 'reader_payoff_sync') return countFrom('missed_count', 'missedCount')
    if (type === 'readability_review') return countFrom('risk_count', 'riskCount') || ((Number.isFinite(score) && score > 0 && score < 78) ? 1 : 0)
    return 0
  })()
  if (riskCount <= 0 || (status === 'ok' && serialRiskRepairRisks.length <= 0)) return null
  const labels: Record<string, string> = {
    prose_quality: '质量门禁',
    deterministic_prose_cleanup: '确定性清理',
    state_delta_completeness: '状态漏记',
    chapter_blueprint_sync: '细纲兑现',
    core_contract_sync: '核心契约',
    benchmark_recall_sync: '文风召回',
    style_boundary_sync: '文风边界',
    story_loop_sync: '故事循环',
    information_flow_sync: '信息流',
    expectation_threshold_sync: '期待阈值',
    emotional_arc_sync: '情绪弧',
    chapter_hook_sync: '章级钩子',
    paragraph_hook_sync: '段落钩子',
    suspense_sync: '悬念编排',
    reversal_sync: '反转设计',
    showdown_sync: '高潮对抗',
    spectator_reaction_sync: '围观反应',
    payoff_setup_sync: '爽点铺垫',
    bridge_unit_sync: '桥段节奏',
    beat_cooling_sync: '节奏冷却',
    opening_sync: '开篇设计',
    prose_craft_sync: '正文工艺',
    punctuation_tone_sync: '语气标点',
    quality_audit_sync: '质量诊断',
    chapter_handoff_sync: '章首承接',
    chapter_title_uniqueness_sync: '章节标题',
    dialogue_sync: '对白质量',
    character_behavior_sync: '角色行为',
    asset_linkage_sync: '资产挂钩',
    state_tracking_sync: '状态跟踪',
    source_readiness_sync: '来源就绪',
    prose_meta_sync: '正文元信息',
    intent_confirmation_sync: '意图确认',
    continuity_heat_sync: '连续性热度',
    conflict_structure_sync: '冲突结构',
    upgrade_rhythm_sync: '升级节奏',
    target_reader_sync: '目标读者',
    genre_positioning_sync: '题材定位',
    female_audience_sync: '女频长篇',
    plot_dynamics_sync: '剧情动力',
    story_power_sync: '故事力',
    character_relation_sync: '角色关系',
    reader_retention_sync: '追读留存',
    reader_payoff_sync: '读者回报',
    readability_review: '可读性',
  }
  return {
    type,
    label: serialRiskRepairRisks.length ? '近章风险修复' : labels[type] || type,
    count: riskCount,
    evidence: serialRiskRepairRisks.length
      ? uniqueBriefStrings(serialRiskRepairRisks.flatMap((item: any) => [item.fix, item.evidence, item.label]), 6).join('；')
      : compactBriefText(payload?.label || payload?.summary || payload?.message || payload?.error || ''),
  }
}

function serialQualityRiskRuns(rows: any[]) {
  const runs: any[][] = []
  let current: any[] = []
  for (const row of rows) {
    if (row.risks.length) {
      current.push(row)
      continue
    }
    if (current.length >= 2) runs.push(current)
    current = []
  }
  if (current.length >= 2) runs.push(current)
  return runs
}

export function buildSerialQualityRegressionBrief(chapter: any, chapters: any[] = [], reviews: any[] = []) {
  const chapterNo = Number(chapter?.chapter_no || chapter?.chapterNo || 0)
  const recent = [...asArray(chapters)]
    .filter((item: any) => Number(item?.chapter_no || item?.chapterNo || 0) > 0)
    .filter((item: any) => !chapterNo || Number(item?.chapter_no || item?.chapterNo || 0) < chapterNo)
    .sort((a: any, b: any) => Number(a.chapter_no || a.chapterNo || 0) - Number(b.chapter_no || b.chapterNo || 0))
    .slice(-5)
  if (recent.length < 2) return null
  const riskRows = recent.map((item: any) => ({
    chapter: item,
    risks: asArray(reviews).map(review => serialQualityRiskFromReview(review, item)).filter(Boolean),
  }))
  const riskyRows = riskRows.filter(row => row.risks.length)
  const runs = serialQualityRiskRuns(riskRows)
  if (riskyRows.length < 3 && !runs.length) return null
  const longestRun = runs.sort((a, b) => b.length - a.length)[0] || riskyRows
  const rangeLabel = serialChapterRangeLabel(recent)
  const runLabel = serialChapterRangeLabel(longestRun.map(row => row.chapter))
  const riskLabels = uniqueBriefStrings(riskyRows.flatMap(row => row.risks.map((risk: any) => risk.label)), 8)
  const riskEvidence = uniqueBriefStrings(riskyRows.flatMap(row => row.risks.map((risk: any) => risk.evidence || `${risk.label} ${risk.count}`)), 8)
  const serialRepairRegression = riskLabels.includes('近章风险修复')
  return {
    version: 'oh_story_serial_quality_regression_v1',
    status: 'needs_attention',
    score: Math.max(0, 70 - riskyRows.length * 8 - Math.max(0, longestRun.length - 1) * 6),
    chapter_range_label: rangeLabel,
    summary: `${rangeLabel}出现连续交稿质量退化：${riskLabels.join('、')}。`,
    signals: [{
      key: 'recent_delivery_quality_regression',
      label: '连续交稿质量退化',
      status: 'warn',
      detail: `${runLabel || rangeLabel}连续出现 ${riskLabels.join('、')} 等交稿风险。`,
    }],
    fatigue_risks: uniqueBriefStrings([
      `${runLabel || rangeLabel}连续交稿质量退化：${riskLabels.join('、')}。`,
      ...riskEvidence,
    ], 8),
    next_actions: [
      '无人值守连写必须降速：下一轮优先缩小到1-2章验证，不要继续扩批。',
      ...(serialRepairRegression ? ['下一章必须优先补近章风险修复：把失败的 scene_cards.serial_risk_repairs 和 recent_fatigue_action 写成目标推进、阻碍升级、新信息、关系/世界调剂或冲突冷却的可见事件。'] : []),
      '下一章必须先修复最近章节的质量债，再推进新冲突；质量门禁、状态增量、文风召回和细纲兑现不得继续累计。',
      '恢复扩批前必须证明本章有可见回报、状态写回、章末追读和确定性清理通过。',
    ],
    conflict_variation: '降速后先换冲突来源，并把阻力写成可见行动阻拦，避免继续复制上一批弱冲突。',
    payoff_variation: '降速验证章必须交付显性回报，用收益、反制结果、关系变化或阶段结算证明质量恢复。',
    hook_variation: '章末必须留下新的、可追问的问题，并写入下一章优先事项，不能继续制造空钩子。',
    scene_freshness: '本章至少放入一个验证修复的可视化场面，用正文证据证明状态、回报和风险债务已落地。',
  }
}

export function mergeRecentFatigueBriefs(...briefs: any[]) {
  const normalized = briefs
    .map(brief => brief ? normalizeRecentFatigueBrief(brief) : null)
    .filter(Boolean)
  if (!normalized.length) return null
  if (normalized.length === 1) return normalized[0]
  const warningBriefs = normalized.filter((brief: any) => String(brief.status || '').toLowerCase() !== 'ready')
  const source = warningBriefs[0] || normalized[0]
  return {
    status: warningBriefs.length ? 'needs_attention' : 'ready',
    score: Math.min(...normalized.map((brief: any) => Number.isFinite(Number(brief.score)) ? Number(brief.score) : 100)),
    chapter_range_label: uniqueBriefStrings(normalized.map((brief: any) => brief.chapter_range_label), 3).join('；'),
    summary: uniqueBriefStrings(normalized.map((brief: any) => brief.summary), 3).join('；'),
    fatigue_risks: uniqueBriefStrings(normalized.flatMap((brief: any) => brief.fatigue_risks), 12),
    next_actions: uniqueBriefStrings(normalized.flatMap((brief: any) => brief.next_actions), 12),
    signals: (() => {
      const seen = new Set<string>()
      const rows: any[] = []
      for (const signal of normalized.flatMap((brief: any) => asArray(brief.signals))) {
        const key = compactBriefText(signal?.key || signal?.label || signal?.detail)
        if (!key || seen.has(key)) continue
        seen.add(key)
        rows.push(signal)
      }
      return rows.slice(0, 12)
    })(),
    risk_signals: (() => {
      const seen = new Set<string>()
      const rows: any[] = []
      for (const signal of normalized.flatMap((brief: any) => asArray(brief.risk_signals || brief.signals))) {
        const key = compactBriefText(signal?.key || signal?.label || signal?.detail)
        if (!key || seen.has(key)) continue
        seen.add(key)
        rows.push(signal)
      }
      return rows.slice(0, 12)
    })(),
    conflict_variation: source.conflict_variation,
    payoff_variation: source.payoff_variation,
    hook_variation: source.hook_variation,
    scene_freshness: source.scene_freshness,
  }
}

export function normalizeExpectationItem(value: any, fallback: { key: string; label: string; type: string }) {
  const text = compactBriefText(typeof value === 'string' ? value : value?.text || value?.summary || value?.description || value?.name || value?.title)
  if (!text) return null
  return {
    key: compactBriefText(typeof value === 'object' ? value?.key : '', fallback.key),
    label: compactBriefText(typeof value === 'object' ? value?.label : '', fallback.label),
    type: compactBriefText(typeof value === 'object' ? value?.type : '', fallback.type),
    text,
  }
}

export function uniqueExpectationItems(items: any[]) {
  const seen = new Set<string>()
  const rows: any[] = []
  for (const item of items) {
    if (!item?.text) continue
    const key = `${item.type || 'expectation'}:${normalizedMatchText(item.text)}`
    if (!key || seen.has(key)) continue
    seen.add(key)
    rows.push(item)
  }
  return rows
}

function normalizeDebtExpectationItem(value: any, fallback: { key: string; label: string; type: string }, extra: any = {}) {
  const normalized = normalizeExpectationItem(value, fallback)
  if (!normalized) return null
  const raw = typeof value === 'object' && value ? value : {}
  return {
    ...extra,
    age_chapters: Number(raw.age_chapters ?? raw.ageChapters ?? extra.age_chapters ?? 0) || null,
    overdue: Boolean(raw.overdue ?? extra.overdue ?? false),
    urgency: compactBriefText(raw.urgency || extra.urgency),
    ...normalized,
  }
}

const EXPECTATION_MUST_CARRY_OVERDUE_AFTER_CHAPTERS = 2
const EXPECTATION_KEEP_ALIVE_OVERDUE_AFTER_CHAPTERS = 4

export function applyReaderExpectationDebtAging(context: any, currentChapterNo: number) {
  const chapterNo = Number(currentChapterNo || 0)
  const decorate = (item: any, kind: 'must_carry' | 'keep_alive') => {
    const fromChapterNo = Number(item?.from_chapter_no || item?.fromChapterNo || 0) || null
    const explicitAge = Number(item?.age_chapters ?? item?.ageChapters ?? 0) || null
    const age = chapterNo && fromChapterNo ? Math.max(0, chapterNo - fromChapterNo) : explicitAge
    const overdueAfter = kind === 'keep_alive'
      ? EXPECTATION_KEEP_ALIVE_OVERDUE_AFTER_CHAPTERS
      : EXPECTATION_MUST_CARRY_OVERDUE_AFTER_CHAPTERS
    const overdue = Boolean(item?.overdue) || (age !== null && age >= overdueAfter)
    return {
      ...item,
      from_chapter_no: fromChapterNo,
      age_chapters: age,
      overdue,
      urgency: overdue ? 'overdue' : age !== null && age > 0 ? 'due' : compactBriefText(item?.urgency),
    }
  }
  const mustCarry = uniqueExpectationItems(asArray(context?.must_carry).map((item: any) => decorate(item, 'must_carry')))
  const keepAlive = uniqueExpectationItems(asArray(context?.keep_alive).map((item: any) => decorate(item, 'keep_alive')))
  const overdue = uniqueExpectationItems([
    ...asArray(context?.overdue),
    ...mustCarry.filter((item: any) => item.overdue),
    ...keepAlive.filter((item: any) => item.overdue),
  ]).slice(0, 12)
  const sourceChapters = Array.from(new Set([
    ...mustCarry.map((item: any) => Number(item.from_chapter_no || 0)).filter(Boolean),
    ...keepAlive.map((item: any) => Number(item.from_chapter_no || 0)).filter(Boolean),
  ])).sort((a, b) => a - b)
  const summary = [
    mustCarry.length ? `待兑现 ${mustCarry.length} 项` : '',
    keepAlive.length ? `继续悬念 ${keepAlive.length} 项` : '',
    overdue.length ? `逾期 ${overdue.length} 项` : '',
  ].filter(Boolean).join('，')
  return {
    ...(context || {}),
    must_carry: mustCarry.slice(0, 12),
    keep_alive: keepAlive.slice(0, 12),
    overdue,
    overdue_count: overdue.length,
    source_chapters: sourceChapters.slice(-8),
    summary: compactBriefText(summary || context?.summary || ''),
  }
}

export function normalizeReaderExpectationDebtContext(value: any) {
  const raw = value || {}
  const mustCarry = uniqueExpectationItems(asArray(raw.must_carry || raw.mustCarry || raw.carry_over || raw.carryOver)
    .map((item: any, index: number) => normalizeDebtExpectationItem(item, { key: `carry_over_${index + 1}`, label: '期待债务', type: 'carry_over' }, {
      from_chapter_no: Number(item?.from_chapter_no || item?.fromChapterNo || 0) || null,
      source_review_id: item?.source_review_id || item?.sourceReviewId || null,
    }))
    .filter(Boolean))
  const keepAlive = uniqueExpectationItems(asArray(raw.keep_alive || raw.keepAlive)
    .map((item: any, index: number) => normalizeDebtExpectationItem(item, { key: `debt_keep_alive_${index + 1}`, label: '继续悬念', type: 'question' }, {
      from_chapter_no: Number(item?.from_chapter_no || item?.fromChapterNo || 0) || null,
      source_review_id: item?.source_review_id || item?.sourceReviewId || null,
    }))
    .filter(Boolean))
  const overdue = uniqueExpectationItems(asArray(raw.overdue || raw.overdue_items || raw.overdueItems)
    .map((item: any, index: number) => normalizeDebtExpectationItem(item, { key: `overdue_${index + 1}`, label: '逾期待补', type: 'overdue' }, {
      from_chapter_no: Number(item?.from_chapter_no || item?.fromChapterNo || 0) || null,
      source_review_id: item?.source_review_id || item?.sourceReviewId || null,
      overdue: true,
      urgency: 'overdue',
    }))
    .filter(Boolean))
  const sourceChapters = Array.from(new Set([
    ...mustCarry.map((item: any) => Number(item.from_chapter_no || 0)).filter(Boolean),
    ...keepAlive.map((item: any) => Number(item.from_chapter_no || 0)).filter(Boolean),
    ...overdue.map((item: any) => Number(item.from_chapter_no || 0)).filter(Boolean),
  ])).sort((a, b) => a - b)
  return {
    must_carry: mustCarry.slice(0, 12),
    keep_alive: keepAlive.slice(0, 12),
    overdue: overdue.slice(0, 12),
    overdue_count: Number(raw.overdue_count ?? raw.overdueCount ?? overdue.length) || overdue.length,
    source_chapters: sourceChapters.slice(-8),
    summary: compactBriefText(raw.summary || [
      mustCarry.length ? `待兑现 ${mustCarry.length} 项` : '',
      keepAlive.length ? `继续悬念 ${keepAlive.length} 项` : '',
      overdue.length ? `逾期 ${overdue.length} 项` : '',
    ].filter(Boolean).join('，')),
  }
}

export function normalizeReaderExpectationLedgerContract(explicit: any, target: any = {}, brief: any = {}, debtContext: any = {}) {
  if (!explicit || typeof explicit !== 'object') return null
  const carryOver = uniqueExpectationItems([
    ...asArray(explicit.carry_over || explicit.carryOver).map((item: any, index: number) => normalizeExpectationItem(item, { key: `carry_over_${index + 1}`, label: '期待债务', type: 'carry_over' })),
    ...asArray(debtContext?.must_carry),
  ].filter(Boolean))
  return {
    chapter_promise: compactBriefText(explicit.chapter_promise || explicit.chapterPromise || target.reader_promise || target.readerPromise || brief.reader_promise || brief.readerPromise),
    carry_over: carryOver,
    must_deliver: uniqueExpectationItems([
      ...carryOver,
      ...asArray(explicit.must_deliver || explicit.mustDeliver).map((item: any, index: number) => normalizeExpectationItem(item, { key: `expectation_${index + 1}`, label: '读者期待', type: 'expectation' })),
    ].filter(Boolean)),
    keep_alive: uniqueExpectationItems([
      ...asArray(debtContext?.keep_alive),
      ...asArray(explicit.keep_alive || explicit.keepAlive).map((item: any, index: number) => normalizeExpectationItem(item, { key: `keep_alive_${index + 1}`, label: '保留悬念', type: 'question' })),
    ].filter(Boolean)),
    must_not_break: asArray(explicit.must_not_break || explicit.mustNotBreak).map((item: any) => compactBriefText(item)).filter(Boolean),
  }
}

export function buildReaderExpectationDebtContext(chapter: any, chapters: any[] = [], reviews: any[] = []) {
  const chapterNo = Number(chapter?.chapter_no || 0)
  const chapterId = Number(chapter?.id || 0)
  if (!chapterNo && !chapterId) return normalizeReaderExpectationDebtContext(null)
  const previousChapters = asArray(chapters)
    .filter((item: any) => Number(item?.chapter_no || 0) > 0 && Number(item.chapter_no) < chapterNo)
    .sort((a: any, b: any) => Number(a.chapter_no || 0) - Number(b.chapter_no || 0))
    .slice(-6)
  const previousChapterNos = new Set(previousChapters.map((item: any) => Number(item.chapter_no || 0)).filter(Boolean))
  const previousChapterIds = new Set(previousChapters.map((item: any) => Number(item.id || 0)).filter(Boolean))
  const latestByChapter = new Map<string, any>()
  for (const review of asArray(reviews)) {
    if (String(review?.review_type || '') !== 'reader_expectation_sync') continue
    const payload = parseJsonLikePayload(review?.payload) || {}
    const reviewChapterNo = Number(payload?.chapter_no || payload?.reader_expectation_sync?.chapter_no || review?.chapter_no || 0)
    const reviewChapterId = Number(payload?.chapter_id || payload?.reader_expectation_sync?.chapter_id || review?.chapter_id || 0)
    const isPrevious = previousChapterNos.has(reviewChapterNo) || previousChapterIds.has(reviewChapterId)
    if (!isPrevious) continue
    const key = reviewChapterId ? `id:${reviewChapterId}` : `no:${reviewChapterNo}`
    const existing = latestByChapter.get(key)
    if (!existing || reviewTimestamp(review) >= reviewTimestamp(existing.review)) {
      latestByChapter.set(key, { review, payload, chapter_no: reviewChapterNo || previousChapters.find((item: any) => Number(item.id || 0) === reviewChapterId)?.chapter_no || null })
    }
  }
  const mustCarry: any[] = []
  const keepAlive: any[] = []
  for (const item of Array.from(latestByChapter.values()).sort((a: any, b: any) => Number(a.chapter_no || 0) - Number(b.chapter_no || 0))) {
    const sync = item.payload?.reader_expectation_sync || item.payload?.result?.reader_expectation_sync || item.payload?.result || item.payload || {}
    const fromChapterNo = Number(sync?.chapter_no || item.chapter_no || 0) || null
    for (const missed of asArray(sync?.missed)) {
      const normalized = normalizeDebtExpectationItem(missed, { key: 'missed_expectation', label: '待补期待', type: 'carry_over' }, {
        from_chapter_no: fromChapterNo,
        source_review_id: item.review?.id || null,
      })
      if (normalized) mustCarry.push(normalized)
    }
    for (const alive of asArray(sync?.keep_alive)) {
      const normalized = normalizeDebtExpectationItem(alive, { key: 'keep_alive', label: '继续悬念', type: 'question' }, {
        from_chapter_no: fromChapterNo,
        source_review_id: item.review?.id || null,
      })
      if (normalized) keepAlive.push(normalized)
    }
  }
  return applyReaderExpectationDebtAging(normalizeReaderExpectationDebtContext({ must_carry: mustCarry, keep_alive: keepAlive }), chapterNo)
}

