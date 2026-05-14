import type { Express } from 'express'
import {
  appendChapterVersion,
  appendNovelRun,
  createNovelChapter,
  deleteNovelChapter,
  listChapterVersions,
  listNovelChapters,
  updateNovelChapter,
} from '../novel'
import { executeNovelAgentChain } from '../llm'

type RestructureRoutesContext = {
  getWorkspace: () => string
  getProject: (workspace: string, id: number) => Promise<any>
}

export function registerNovelRestructureRoutes(app: Express, ctx: RestructureRoutesContext) {
  /** P1-2: 章节重组 — 扩展 / 收缩 */
  app.post('/api/novel/chapters/restructure', async (req, res) => {
    try {
      const activeWorkspace = ctx.getWorkspace()
      const projectId = Number(req.body.project_id)
      const modelId = Number(req.body.model_id || 0) || undefined
      const chapterIds = Array.isArray(req.body.chapter_ids) ? req.body.chapter_ids.map(Number) : []
      const mode = req.body.mode // 'expand' | 'contract'
      const targetCount = Number(req.body.target_count || 0)
      const instructions = String(req.body.instructions || '')

      if (!chapterIds.length) return res.status(400).json({ error: 'chapter_ids 不能为空' })
      if (!mode || !['expand', 'contract'].includes(mode)) return res.status(400).json({ error: 'mode 必须是 expand 或 contract' })
      if (mode === 'expand' && targetCount <= chapterIds.length) {
        return res.status(400).json({ error: `扩展模式：目标章数 (${targetCount}) 必须大于原始章数 (${chapterIds.length})` })
      }
      if (mode === 'contract' && targetCount >= chapterIds.length) {
        return res.status(400).json({ error: `收缩模式：目标章数 (${targetCount}) 必须小于原始章数 (${chapterIds.length})` })
      }

      const project = await ctx.getProject(activeWorkspace, projectId)
      if (!project) return res.status(404).json({ error: 'project not found' })

      const allChapters = await listNovelChapters(activeWorkspace, projectId)
      const selected = allChapters
        .filter(ch => chapterIds.includes(ch.id))
        .sort((a, b) => a.chapter_no - b.chapter_no)

      if (selected.length !== chapterIds.length) return res.status(400).json({ error: '部分章节不存在' })

      const isContiguousSelection = selected.every((ch, index) =>
        index === 0 || ch.chapter_no === selected[index - 1].chapter_no + 1
      )
      if (!isContiguousSelection) return res.status(400).json({ error: '章节扩展/合并仅支持连续章节范围，请选择连续章节' })

      const backupVersionIds: number[] = []
      for (const ch of selected) {
        const existing = await listChapterVersions(activeWorkspace, ch.id)
        const versionNo = existing.length + 1
        const created = await appendChapterVersion(activeWorkspace, {
          chapter_id: ch.id,
          project_id: ch.project_id,
          version_no: versionNo,
          chapter_text: ch.chapter_text || '',
          scene_breakdown: ch.scene_breakdown || [],
          continuity_notes: ch.continuity_notes || [],
          source: 'manual_edit' as const,
        })
        if (created) backupVersionIds.push(created.id)
      }

      const chapterSummaries = selected.map((ch, i) =>
        `章节 ${i + 1}（第${ch.chapter_no}章）：\n- 标题：${ch.title}\n- 摘要：${ch.chapter_summary}\n- 冲突：${ch.conflict}\n- 结尾钩子：${ch.ending_hook}\n- 正文（前500字）：${(ch.chapter_text || '').slice(0, 500)}`
      ).join('\n\n')

      const prompt = mode === 'expand'
        ? `你是一个专业的小说编辑。任务是将当前选中的连续 ${selected.length} 章，在原有章节序列中的当前位置内，扩展重组为 ${targetCount} 章新的“细纲章节”。

原始章节内容：
${chapterSummaries}

项目信息：
- 书名：${project.title}

请将这段连续剧情重新拆分为 ${targetCount} 章新章节，并完整替换当前选中的章节范围。未选中的前后章节内容与相对顺序都不能改变；如果扩展后章数增加，则仅将后续章节整体顺延。

请注意：这里生成的是细纲，不是正文。每章只输出章节规划信息，不要写完整正文段落。

每章包含以下信息：
1. title：章节标题
2. chapter_goal：本章目标
3. chapter_summary：本章摘要（100-200字）
4. conflict：本章冲突
5. ending_hook：结尾钩子
6. scene_list：场景/节拍列表（数组，每项包含 scene_title 和 description）

要求：
- 只处理选中的连续章节范围，不改动范围外章节内容
- 保持故事连贯性和章节顺序稳定
- 扩展后的 ${targetCount} 章应覆盖原选中章节的全部剧情，并补足更细的过程、转折、心理、对话与场景推进
- 不要输出正文，不要生成长篇 prose/chapter_text
- 每章都有明确推进点、冲突和结尾钩子
${instructions ? `\n额外指令：${instructions}` : ''}

请返回一个包含 ${targetCount} 个元素的 JSON 数组，每个元素是一个对象。`
        : `你是一个专业的小说编辑。任务是将 ${selected.length} 章内容合并为 ${targetCount} 章新章节。原始章节会被删除，替换为 ${targetCount} 章新章节。

原始章节内容：
${chapterSummaries}

项目信息：
- 书名：${project.title}

请将原始内容重新合并为 ${targetCount} 章新章节。每章包含以下信息：
1. title：章节标题
2. chapter_goal：本章目标
3. chapter_summary：本章摘要（100-200字）
4. conflict：本章冲突
5. ending_hook：结尾钩子

要求：
- 合并后保持故事完整性
- 精简次要情节，保留主线
- 每章都有独立的冲突和结尾钩子
- 情节更加紧凑
${instructions ? `\n额外指令：${instructions}` : ''}

请返回一个包含 ${targetCount} 个元素的 JSON 数组，每个元素是一个对象。`

      let plan: any[] = []
      if (modelId) {
        const llmResult = await executeNovelAgentChain(
          project,
          prompt,
          activeWorkspace,
          modelId,
          ['outline-agent'],
          {},
          { mode, chapterIds, targetCount, instructions },
        )
        const outlineOutput = (llmResult.results || []).find(
          (r: any) => r.step === 'outline-agent' && r.outputSource === 'llm'
        )?.output
        if (outlineOutput && typeof outlineOutput === 'object') {
          if (Array.isArray(outlineOutput.chapter_outlines)) plan = outlineOutput.chapter_outlines
          else if (Array.isArray(outlineOutput.detail_chapters)) plan = outlineOutput.detail_chapters
          else if (Array.isArray(outlineOutput.outlines)) plan = outlineOutput.outlines
        }
      }

      if (!Array.isArray(plan) || plan.length !== targetCount) {
        plan = []
        for (let i = 0; i < targetCount; i++) {
          const ratio = i / targetCount
          const srcIdx = Math.min(Math.floor(ratio * selected.length), selected.length - 1)
          const srcCh = selected[srcIdx]
          plan.push({
            title: `${srcCh.title}（${mode === 'expand' ? '扩展' : '合并'} ${i + 1}/${targetCount}）`,
            chapter_goal: mode === 'expand'
              ? `扩展自第${srcCh.chapter_no}章，对应重组范围第 ${i + 1}/${targetCount} 章`
              : `合并自第${selected[0].chapter_no}-${selected[selected.length - 1].chapter_no}章`,
            chapter_summary: mode === 'expand'
              ? `${(srcCh.chapter_summary || '').slice(0, 160)}（扩展细纲 ${i + 1}/${targetCount}，正文待审核后手动生成）`
              : (srcCh.chapter_summary || '').slice(0, 200),
            conflict: srcCh.conflict || '',
            ending_hook: srcCh.ending_hook || '',
            scene_list: [],
          })
        }
      }

      const normalizedPlan = plan.slice(0, targetCount).map((item, i) => ({
        title: String(item?.title || `第${selected[0].chapter_no + i}章`),
        chapter_goal: String(item?.chapter_goal || ''),
        chapter_summary: String(item?.chapter_summary || ''),
        conflict: String(item?.conflict || ''),
        ending_hook: String(item?.ending_hook || ''),
        scene_list: Array.isArray(item?.scene_list)
          ? item.scene_list
          : Array.isArray(item?.scenes)
            ? item.scenes
            : Array.isArray(item?.scene_breakdown)
              ? item.scene_breakdown
              : [],
      }))

      const firstChapterNo = selected[0].chapter_no
      const lastChapterNo = selected[selected.length - 1].chapter_no
      const shift = targetCount - selected.length
      const trailingChapters = allChapters
        .filter(ch => ch.chapter_no > lastChapterNo)
        .sort((a, b) => b.chapter_no - a.chapter_no)

      if (shift !== 0) {
        for (const ch of trailingChapters) {
          await updateNovelChapter(activeWorkspace, ch.id, { chapter_no: ch.chapter_no + shift }, { createVersion: false })
        }
      }

      for (const ch of selected) {
        await deleteNovelChapter(activeWorkspace, ch.id)
      }

      const newChapterIds: number[] = []
      for (let i = 0; i < normalizedPlan.length; i++) {
        const item = normalizedPlan[i]
        const created = await createNovelChapter(activeWorkspace, {
          project_id: projectId,
          chapter_no: firstChapterNo + i,
          title: item.title || `第${firstChapterNo + i}章`,
          chapter_goal: item.chapter_goal || '',
          chapter_summary: item.chapter_summary || '',
          conflict: item.conflict || '',
          ending_hook: item.ending_hook || '',
          chapter_text: '',
          scene_breakdown: item.scene_list || [],
          continuity_notes: [],
          status: mode === 'expand' ? 'outline_pending_review' : 'draft',
        })
        newChapterIds.push(created.id)
      }

      await appendNovelRun(activeWorkspace, {
        project_id: projectId,
        run_type: 'restructure',
        step_name: mode,
        status: 'success',
        input_ref: JSON.stringify({ mode, chapterIds, targetCount }),
        output_ref: JSON.stringify({ mode, original_count: selected.length, target_count: targetCount, new_chapter_ids: newChapterIds, backup_version_ids: backupVersionIds }),
      })

      res.json({
        mode,
        original_count: selected.length,
        target_count: targetCount,
        new_chapter_ids: newChapterIds,
        backup_version_ids: backupVersionIds,
        plan: normalizedPlan,
        message: mode === 'expand'
          ? `已在原章节范围内将 ${selected.length} 章扩展为 ${targetCount} 章细纲，后续章节已顺延，正文需审核后手动生成`
          : `已将 ${selected.length} 章合并为 ${targetCount} 章`,
      })
    } catch (error) {
      res.status(500).json({ error: String(error) })
    }
  })
}
