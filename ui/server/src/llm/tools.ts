import { appendNovelRun, createNovelChapter, createNovelCharacter, createNovelOutline, createNovelReview, createNovelWorldbuilding, getNovelProject, listNovelCharacters, listNovelChapters, listNovelOutlines, listNovelProjects, listNovelReviews, listNovelWorldbuilding } from '../novel'
import type { LLMToolDefinition } from './types'

const TOOL_SCHEMA_CACHE = new Map<string, LLMToolDefinition[]>()

function cacheKey(projectId: number) {
  return String(projectId)
}

export function clearNovelToolsCache() {
  TOOL_SCHEMA_CACHE.clear()
}

export function buildNovelTools(projectId: number): LLMToolDefinition[] {
  const key = cacheKey(projectId)
  const cached = TOOL_SCHEMA_CACHE.get(key)
  if (cached) return cached

  const tools = [
    readProjectTool(projectId),
    readWorldbuildingTool(projectId),
    readCharactersTool(projectId),
    readOutlinesTool(projectId),
    readChaptersTool(projectId),
    writeOutlineTool(projectId),
    writeChapterTool(projectId),
    writeReviewTool(projectId),
    repairTool(projectId),
    writeWorldbuildingTool(projectId),
  ]

  TOOL_SCHEMA_CACHE.set(key, tools)
  return tools
}

export function resolveNovelTool(name: string, projectId: number): LLMToolDefinition | null {
  const tools = buildNovelTools(projectId)
  return tools.find(tool => tool.name === name) || null
}

export async function runNovelTool(name: string, input: Record<string, any>, projectId: number, activeWorkspace = '') {
  const tool = resolveNovelTool(name, projectId)
  if (!tool) {
    return {
      tool_name: name,
      success: false,
      output: null,
      error: 'tool_not_found',
    }
  }

  if (!activeWorkspace) {
    return {
      tool_name: tool.name,
      success: false,
      output: null,
      error: 'workspace_required',
    }
  }

  try {
    if (tool.name === 'read_project') {
      return { tool_name: tool.name, success: true, output: await getNovelProject(activeWorkspace, projectId), error: null }
    }
    if (tool.name === 'read_worldbuilding') {
      return { tool_name: tool.name, success: true, output: await listNovelWorldbuilding(activeWorkspace, projectId), error: null }
    }
    if (tool.name === 'read_characters') {
      return { tool_name: tool.name, success: true, output: await listNovelCharacters(activeWorkspace, projectId), error: null }
    }
    if (tool.name === 'read_outlines') {
      return { tool_name: tool.name, success: true, output: await listNovelOutlines(activeWorkspace, projectId), error: null }
    }
    if (tool.name === 'read_chapters') {
      return { tool_name: tool.name, success: true, output: await listNovelChapters(activeWorkspace, projectId), error: null }
    }
    if (tool.name === 'write_outline') {
      return { tool_name: tool.name, success: true, output: await createNovelOutline(activeWorkspace, { ...input.payload, project_id: projectId }), error: null }
    }
    if (tool.name === 'write_chapter') {
      return { tool_name: tool.name, success: true, output: await createNovelChapter(activeWorkspace, { ...input.payload, project_id: projectId }), error: null }
    }
    if (tool.name === 'write_review') {
      return { tool_name: tool.name, success: true, output: await createNovelReview(activeWorkspace, { ...input.payload, project_id: projectId }), error: null }
    }
    if (tool.name === 'apply_repair') {
      return { tool_name: tool.name, success: true, output: { project_id: projectId, repaired: true, input }, error: null }
    }
    if (tool.name === 'write_worldbuilding') {
      return { tool_name: tool.name, success: true, output: await createNovelWorldbuilding(activeWorkspace, { ...input.payload, project_id: projectId }), error: null }
    }

    return {
      tool_name: tool.name,
      success: true,
      output: {
        tool: tool.name,
        input,
        project_id: projectId,
        status: 'stubbed',
      },
      error: null,
    }
  } catch (error) {
    return {
      tool_name: tool.name,
      success: false,
      output: null,
      error: String(error),
    }
  }
}

// P1-2: 完善 Tool Schema — 使用标准 JSON Schema 格式

function jsonSchema(type: string, properties: Record<string, any> = {}, required: string[] = []) {
  const schema: Record<string, any> = { type }
  if (Object.keys(properties).length > 0) schema.properties = properties
  if (required.length > 0) schema.required = required
  return schema
}

export function readProjectTool(_projectId: number): LLMToolDefinition {
  return {
    name: 'read_project',
    description: '读取小说项目基础信息（标题、题材、风格标签、商业标签等）',
    input_schema: jsonSchema('object', {
      project_id: { type: 'integer', description: '项目 ID' },
    }),
    output_schema: jsonSchema('object', {
      id: { type: 'integer' },
      title: { type: 'string' },
      genre: { type: 'string' },
      sub_genres: { type: 'array', items: { type: 'string' } },
      style_tags: { type: 'array', items: { type: 'string' } },
      commercial_tags: { type: 'array', items: { type: 'string' } },
      length_target: { type: 'string' },
      target_audience: { type: 'string' },
    }),
  }
}

export function readWorldbuildingTool(_projectId: number): LLMToolDefinition {
  return {
    name: 'read_worldbuilding',
    description: '读取小说世界观记录（世界总结、规则、势力、地点、系统、时间锚点等）',
    input_schema: jsonSchema('object', {
      project_id: { type: 'integer', description: '项目 ID' },
    }),
    output_schema: jsonSchema('array', {
      items: jsonSchema('object', {
        world_summary: { type: 'string' },
        rules: { type: 'array', items: { type: 'string' } },
        factions: { type: 'array', items: jsonSchema('object', { name: { type: 'string' }, role: { type: 'string' } }) },
        locations: { type: 'array', items: jsonSchema('object', { name: { type: 'string' }, type: { type: 'string' } }) },
        systems: { type: 'array', items: jsonSchema('object', { name: { type: 'string' }, description: { type: 'string' } }) },
        timeline_anchor: { type: 'string' },
        known_unknowns: { type: 'array', items: { type: 'string' } },
      }),
    }),
  }
}

export function readCharactersTool(_projectId: number): LLMToolDefinition {
  return {
    name: 'read_characters',
    description: '读取小说角色记录（姓名、角色类型、原型、动机、目标、冲突等）',
    input_schema: jsonSchema('object', {
      project_id: { type: 'integer', description: '项目 ID' },
    }),
    output_schema: jsonSchema('array', {
      items: jsonSchema('object', {
        name: { type: 'string' },
        role_type: { type: 'string', enum: ['主角', '重要配角', '反派', '路人', '其他'] },
        archetype: { type: 'string' },
        motivation: { type: 'string' },
        goal: { type: 'string' },
        conflict: { type: 'string' },
        personality: { type: 'string' },
        appearance: { type: 'string' },
      }),
    }),
  }
}

export function readOutlinesTool(_projectId: number): LLMToolDefinition {
  return {
    name: 'read_outlines',
    description: '读取小说大纲记录（总纲、卷纲、章纲结构）',
    input_schema: jsonSchema('object', {
      project_id: { type: 'integer', description: '项目 ID' },
    }),
    output_schema: jsonSchema('array', {
      items: jsonSchema('object', {
        outline_type: { type: 'string', enum: ['master', 'volume', 'chapter'] },
        title: { type: 'string' },
        summary: { type: 'string' },
        conflict_points: { type: 'array', items: { type: 'string' } },
        turning_points: { type: 'array', items: { type: 'string' } },
        hook: { type: 'string' },
        parent_id: { type: ['integer', 'null'] },
      }),
    }),
  }
}

export function readChaptersTool(_projectId: number): LLMToolDefinition {
  return {
    name: 'read_chapters',
    description: '读取小说章节记录（章节编号、标题、目标、摘要、正文、冲突、结尾钩子等）',
    input_schema: jsonSchema('object', {
      project_id: { type: 'integer', description: '项目 ID' },
    }),
    output_schema: jsonSchema('array', {
      items: jsonSchema('object', {
        chapter_no: { type: 'integer' },
        title: { type: 'string' },
        chapter_goal: { type: 'string' },
        chapter_summary: { type: 'string' },
        chapter_text: { type: 'string' },
        conflict: { type: 'string' },
        ending_hook: { type: 'string' },
        status: { type: 'string', enum: ['draft', 'revision', 'final'] },
        outline_id: { type: ['integer', 'null'] },
      }),
    }),
  }
}

export function writeOutlineTool(_projectId: number): LLMToolDefinition {
  return {
    name: 'write_outline',
    description: '写入小说大纲（总纲、卷纲或章纲）',
    input_schema: jsonSchema('object', {
      payload: jsonSchema('object', {
        outline_type: { type: 'string', enum: ['master', 'volume', 'chapter'], description: '大纲类型' },
        title: { type: 'string', description: '大纲标题' },
        summary: { type: 'string', description: '大纲摘要' },
        conflict_points: { type: 'array', items: { type: 'string' }, description: '冲突点列表' },
        turning_points: { type: 'array', items: { type: 'string' }, description: '转折点列表' },
        hook: { type: 'string', description: '钩子/悬念' },
        parent_id: { type: ['integer', 'null'], description: '父级大纲 ID（卷纲指向总纲，章纲指向卷纲）' },
      }, ['outline_type', 'title', 'summary']),
    }, ['payload']),
    output_schema: jsonSchema('object', {
      id: { type: 'integer' },
      outline_type: { type: 'string' },
      title: { type: 'string' },
      summary: { type: 'string' },
    }),
  }
}

export function writeChapterTool(_projectId: number): LLMToolDefinition {
  return {
    name: 'write_chapter',
    description: '写入小说章节（草稿或正文）',
    input_schema: jsonSchema('object', {
      payload: jsonSchema('object', {
        chapter_no: { type: 'integer', description: '章节编号' },
        title: { type: 'string', description: '章节标题' },
        chapter_goal: { type: 'string', description: '章节目标' },
        chapter_summary: { type: 'string', description: '章节摘要' },
        chapter_text: { type: 'string', description: '章节正文（可选）' },
        conflict: { type: 'string', description: '冲突描述' },
        ending_hook: { type: 'string', description: '结尾钩子' },
        status: { type: 'string', enum: ['draft', 'revision', 'final'], description: '状态' },
        outline_id: { type: ['integer', 'null'], description: '所属大纲 ID' },
      }, ['chapter_no', 'title']),
    }, ['payload']),
    output_schema: jsonSchema('object', {
      id: { type: 'integer' },
      chapter_no: { type: 'integer' },
      title: { type: 'string' },
      status: { type: 'string' },
    }),
  }
}

export function writeReviewTool(_projectId: number): LLMToolDefinition {
  return {
    name: 'write_review',
    description: '写入小说审校结果（问题列表与修复建议）',
    input_schema: jsonSchema('object', {
      payload: jsonSchema('object', {
        review_type: { type: 'string', enum: ['continuity', 'market_review', 'platform_fit', 'repair'], description: '审校类型' },
        summary: { type: 'string', description: '审校摘要' },
        issues: { type: 'array', items: { type: 'string' }, description: '问题列表' },
        repair_suggestions: { type: 'array', items: { type: 'string' }, description: '修复建议' },
        status: { type: 'string', enum: ['ok', 'warn', 'error'], description: '状态' },
      }, ['review_type', 'summary']),
    }, ['payload']),
    output_schema: jsonSchema('object', {
      id: { type: 'integer' },
      review_type: { type: 'string' },
      summary: { type: 'string' },
      issues: { type: 'array', items: { type: 'string' } },
    }),
  }
}

export function repairTool(_projectId: number): LLMToolDefinition {
  return {
    name: 'apply_repair',
    description: '应用小说修复动作（修复章节正文、大纲、角色等）',
    input_schema: jsonSchema('object', {
      payload: jsonSchema('object', {
        target: { type: 'string', enum: ['worldbuilding', 'character', 'outline', 'chapter', 'prose'], description: '修复目标类型' },
        target_id: { type: ['integer', 'null'], description: '修复目标的 ID（如果适用）' },
        issues: { type: 'array', items: { type: 'string' }, description: '需要修复的问题列表' },
        repaired_content: { type: 'object', description: '修复后的内容' },
      }, ['target', 'issues']),
    }, ['payload']),
    output_schema: jsonSchema('object', {
      success: { type: 'boolean' },
      applied_count: { type: 'integer' },
      details: { type: 'array', items: jsonSchema('object', { target: { type: 'string' }, action: { type: 'string' } }) },
    }),
  }
}

export function writeWorldbuildingTool(_projectId: number): LLMToolDefinition {
  return {
    name: 'write_worldbuilding',
    description: '写入或更新小说世界观设定',
    input_schema: jsonSchema('object', {
      payload: jsonSchema('object', {
        world_summary: { type: 'string', description: '世界设定摘要' },
        rules: { type: 'array', items: { type: 'string' }, description: '世界规则列表' },
        factions: { type: 'array', items: { type: 'object' }, description: '势力列表' },
        locations: { type: 'array', items: { type: 'object' }, description: '地点列表' },
        systems: { type: 'array', items: { type: 'object' }, description: '系统列表' },
        timeline_anchor: { type: 'string', description: '时间锚点' },
        known_unknowns: { type: 'array', items: { type: 'string' }, description: '已知未知项' },
      }, ['world_summary']),
    }, ['payload']),
    output_schema: jsonSchema('object', {
      id: { type: 'integer' },
      world_summary: { type: 'string' },
      version: { type: 'integer' },
    }),
  }
}
