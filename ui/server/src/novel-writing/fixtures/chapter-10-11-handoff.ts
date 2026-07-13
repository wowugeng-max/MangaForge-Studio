export const chapter10HandoffFixture = {
  previousChapterTail: [
    '地下通道尽头只剩应急灯一明一灭。',
    '老陈扶着墙追上来，喘着气提醒沈砚别碰那本东西。',
    '沈砚没有松手。暗金绢册贴着掌心，先是发热，继而从封边透出一线暗红。',
    '老陈的脸色变了：“它在认路。”',
    '绢册又烫了一下，地下更深处随即传来铁链拖地的声音。',
  ].join('\n\n'),
  continuousCandidateOpening: [
    '暗金绢册第三次发热时，沈砚已经跟着老陈退到地下通道的岔口。',
    '铁链声从左侧黑暗里逼近，他把绢册压进衣襟，示意老陈先关应急门。',
  ].join('\n\n'),
  disconnectedRewriteOpening: [
    '剧痛从骨髓深处炸开。',
    '沈砚猛地睁眼，发现自己躺在一间陌生的白色房间里，窗外阳光刺目。',
  ].join('\n\n'),
  requiredAnchors: ['地下通道', '老陈', '暗金绢册', '发热'],
  lastSentenceSentinel: '绢册又烫了一下，地下更深处随即传来铁链拖地的声音。',
}

export function chapterScaleText(opening: string) {
  return `${opening}\n\n${'沈砚贴着墙向前挪，老陈守住身后的门，每一步都逼近铁链声。'.repeat(140)}`
}
