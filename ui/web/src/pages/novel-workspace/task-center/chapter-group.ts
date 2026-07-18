type AnyRecord = Record<string, any>

export function chapterGroupActionState(chapter: any = {}) {
  const approvalStage = String(chapter.approval_stage || chapter.approvalStage || '')
  const errorCode = String(chapter.error_code || chapter.errorCode || '')
  const blockedByApprovalBlocker = approvalStage === 'approval_blocker' || errorCode === 'APPROVAL_BLOCKER'
  const terminalAdmission = String(chapter.admission_status || chapter.admissionStatus || '') === 'blocked_invalid'
    || errorCode === 'PROSE_ADMISSION_BLOCKED_INVALID'
  const blocked = blockedByApprovalBlocker || terminalAdmission
  return {
    blockedByApprovalBlocker,
    terminalAdmission,
    canApprove: chapter.status === 'needs_approval' && !blocked,
    canRetry: !blocked,
    canSkip: !blocked,
    actionHint: terminalAdmission
      ? '正文无效且未入库；需要显式修复后重新提交。'
      : blockedByApprovalBlocker ? '先修复入库阻断并重新运行正文质检和入库门禁' : '',
  }
}

export function chapterGroupRunActionState(run: any = {}) {
  const output = parseJsonValue(run.output_ref || run.outputRef) || run.payload || {}
  const chapters = Array.isArray(output.chapters) ? output.chapters : []
  const index = Number(output.current_index ?? output.currentIndex ?? 0) || 0
  const current = chapters[index] || null
  const chapter = current || {}
  const lastError = output.last_error || output.lastError || {}
  const chapterState = chapterGroupActionState({
    ...chapter,
    approval_stage: chapter.approval_stage || chapter.approvalStage || lastError.approval_stage || lastError.approvalStage,
    error_code: current
      ? chapter.error_code || chapter.errorCode || lastError.error_code || lastError.errorCode
      : output.error_code || output.errorCode || lastError.error_code || lastError.errorCode,
    admission_status: current
      ? chapter.admission_status || chapter.admissionStatus || lastError.admission_status || lastError.admissionStatus
      : output.admission_status || output.admissionStatus || lastError.admission_status || lastError.admissionStatus,
  })
  const isChapterGroup = run.run_type === 'chapter_group_generation'
  const status = String(run.status || '')
  return {
    blockedByApprovalBlocker: chapterState.blockedByApprovalBlocker,
    terminalAdmission: chapterState.terminalAdmission,
    canResume: isChapterGroup && ['ready', 'paused', 'failed'].includes(status) && !chapterState.blockedByApprovalBlocker && !chapterState.terminalAdmission,
    canExecute: isChapterGroup && ['ready', 'paused', 'failed', 'running'].includes(status) && !chapterState.blockedByApprovalBlocker && !chapterState.terminalAdmission,
    actionHint: chapterState.actionHint,
  }
}

export function buildChapterAdmissionWarningCards(run: any) {
  const output = parseJsonValue(run?.output_ref || run?.outputRef) || run?.payload || {}
  const chapters = Array.isArray(output.chapters) ? output.chapters : []
  const groups = new Map<string, { source: string; title: string; messages: string[]; chapterNos: number[] }>()
  const seenMessages = new Set<string>()
  chapters.forEach((chapter: any) => {
    if (String(chapter.admission_status || chapter.admissionStatus || '') !== 'accepted_with_warnings') return
    const warningItems = [
      ...(Array.isArray(chapter.quality_warnings || chapter.qualityWarnings) ? chapter.quality_warnings || chapter.qualityWarnings : []),
      ...(Array.isArray(chapter.warnings) ? chapter.warnings : []),
      ...(Array.isArray(chapter.post_commit_warnings || chapter.postCommitWarnings) ? chapter.post_commit_warnings || chapter.postCommitWarnings : []),
    ]
    if (String(chapter.story_state_status || chapter.storyStateStatus || '') === 'pending') {
      warningItems.push({ source: 'story_state', message: 'Story State 同步待完成' })
    }
    warningItems.forEach((warning: any) => {
      const source = String(warning?.source || warning?.stage || 'quality')
      const message = String(warning?.message || warning?.detail || warning?.summary || warning || '').trim()
      if (!message) return
      const normalizedMessage = message.normalize('NFKC').replace(/\s+/g, ' ').replace(/[。．.!！?？；;，,]+$/g, '')
      const fingerprint = `${source}:${normalizedMessage}`
      const current = groups.get(source) || {
        source,
        title: source === 'story_state' ? '正文已入库，故事状态待补同步' : '已入库，建议修订',
        messages: [],
        chapterNos: [],
      }
      const chapterNo = Number(chapter.chapter_no || chapter.chapterNo || 0)
      if (chapterNo > 0 && !current.chapterNos.includes(chapterNo)) current.chapterNos.push(chapterNo)
      if (!seenMessages.has(fingerprint)) {
        seenMessages.add(fingerprint)
        current.messages.push(message)
      }
      groups.set(source, current)
    })
  })
  return Array.from(groups.values())
}

export function parseJsonValue(value: any) {
  if (!value) return null
  if (typeof value === 'object') return value
  try {
    return JSON.parse(String(value))
  } catch {
    return null
  }
}

type TaskRunCardTone = 'default' | 'blue' | 'green' | 'gold' | 'red'

export type TaskRunCardModel = {
  title: string
  stepName: string
  lifecycle: {
    key: string
    label: string
    color: TaskRunCardTone
  }
  execution: {
    key: 'auto' | 'manual'
    label: string
    color: TaskRunCardTone
  }
  directorStage?: {
    key: string
    label: string
    color: TaskRunCardTone
  }
  blocking: {
    key: 'blocking' | 'non_blocking'
    label: string
    color: TaskRunCardTone
  }
  timeline: Array<{
    key: 'created' | 'started' | 'ended' | 'updated'
    label: string
    value: string
  }>
  closure: {
    total: number
    pending: number
    needsReview: number
    resolved: number
    failed: number
    summary: string
  }
  progress: number
  admissionWarnings: Array<{
    source: string
    title: string
    messages: string[]
    chapterNos: number[]
  }>
  primaryAction: {
    key: 'process_repair' | 'recheck' | 'resume' | 'execute' | 'view_failure' | 'none'
    label: string
  }
}

