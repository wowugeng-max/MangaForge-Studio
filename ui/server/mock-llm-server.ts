import express from 'express'

const app = express()
app.use(express.json({ limit: '2mb' }))

function agentResponse(agentId: string) {
  if (agentId === 'market-agent') {
    return {
      preferred_hook: '强冲突开场',
      pace_hint: 'fast-start',
      tone_hint: '悬疑/高压',
      market_tags: ['高概念', '强钩子'],
    }
  }
  if (agentId === 'world-agent') {
    return {
      world_summary: '一个存在循环与重置机制的异常世界。',
      rules: ['因果不可随意破坏', '每次重置都会留下代价'],
      factions: [{ name: '管理机构', role: '秩序维持者' }],
      locations: [{ name: '事件现场', type: '起点' }],
      systems: [{ name: '循环系统', description: '重置与因果偏差机制' }],
      timeline_anchor: '故事起点',
      known_unknowns: ['为什么会重启', '谁在操控世界'],
    }
  }
  if (agentId === 'character-agent') {
    return {
      characters: [
        {
          name: '主角',
          role_type: '主角',
          archetype: '普通人 / 逆袭者',
          motivation: '从困境中找出真相并改变命运',
          goal: '完成自我救赎与世界拯救',
          conflict: '对未知世界的恐惧与责任并存',
        },
      ],
    }
  }
  if (agentId === 'outline-agent') {
    return {
      master_outline: {
        outline_type: 'master',
        title: '总纲',
        summary: '围绕异常世界展开的重建故事。',
        conflict_points: ['异常事件', '规则揭露', '反派浮现'],
        turning_points: ['发现循环', '主角反击'],
        hook: '循环秘密',
      },
      volume_outlines: [],
      chapter_outlines: [],
    }
  }
  if (agentId === 'chapter-agent') {
    return {
      chapters: [
        {
          chapter_no: 1,
          title: '第一章',
          chapter_goal: '引爆冲突',
          chapter_summary: '主角遭遇异常。',
          conflict: '无人相信主角。',
          ending_hook: '意识到重复发生。',
          status: 'draft',
        },
      ],
    }
  }
  if (agentId === 'review-agent') {
    return {
      issues: ['时间线可能不一致'],
      repair_suggestions: ['调整章节顺序', '补强角色动机'],
    }
  }
  if (agentId === 'tool-agent') {
    return {
      message: 'tool call demo',
    }
  }
  return {
    message: 'ok',
  }
}

function toolCallsForAgent(agentId: string) {
  if (agentId === 'world-agent') {
    return [
      {
        id: 'tc_world_read',
        name: 'read_worldbuilding',
        arguments: { project_id: 1 },
      },
    ]
  }
  if (agentId === 'outline-agent') {
    return [
      {
        id: 'tc_outline_write',
        name: 'write_outline',
        arguments: { project_id: 1, payload: { outline_type: 'master', title: 'Mock 大纲', summary: 'tool call 写入的大纲', conflict_points: ['冲突A'], turning_points: ['转折A'], hook: '工具调用钩子' } },
      },
    ]
  }
  if (agentId === 'chapter-agent') {
    return [
      {
        id: 'tc_chapter_write',
        name: 'write_chapter',
        arguments: { project_id: 1, payload: { chapter_no: 99, title: '工具调用章节', chapter_goal: '验证 tool call', chapter_summary: '这是由 mock tool call 触发的章节。', conflict: '工具链冲突', ending_hook: '工具链结束钩子', status: 'draft', outline_id: null } },
      },
    ]
  }
  if (agentId === 'review-agent') {
    return [
      {
        id: 'tc_review_write',
        name: 'write_review',
        arguments: { project_id: 1, payload: { review_type: 'continuity', status: 'ok', summary: 'tool call review', issues: ['mock issue'] } },
      },
    ]
  }
  return []
}

app.post('/llm', async (req, res) => {
  const agentId = String(req.body?.metadata?.agent_id || 'unknown')
  const projectId = Number(req.body?.metadata?.project_id || 0)
  const parsed = agentResponse(agentId)
  const requestDebug = {
    agent_id: agentId,
    project_id: projectId,
    received_tools: req.body?.tools || [],
    received_tool_choice: req.body?.tool_choice || null,
    received_response_format: req.body?.response_format || null,
  }

  console.log('[mock-llm] request', JSON.stringify(requestDebug, null, 2))

  const response = {
    content: JSON.stringify({ ...parsed, request_debug: requestDebug }),
    tool_calls: toolCallsForAgent(agentId),
    usage: {
      input_tokens: 120,
      output_tokens: 220,
      total_tokens: 340,
    },
    finish_reason: 'stop',
    parsed: { ...parsed, request_debug: requestDebug },
  }

  console.log('[mock-llm] response', JSON.stringify({ agent_id: agentId, tool_calls: response.tool_calls }, null, 2))

  res.json(response)
})

app.get('/health', (_req, res) => {
  res.json({ ok: true })
})

const port = Number(process.env.PORT || 3001)
app.listen(port, () => {
  console.log(`mock llm server listening on http://localhost:${port}`)
})
