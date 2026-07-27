/** Stream readers and response payload parsing for provider runtime. */
import { normalizeLLMResponse } from './adapter'
import type { LLMResponse } from './types'
import {
  getValueByPathFromEnvelopes,
  isClaudeCodeFormat,
  isCodexResponsesFormat,
  isGeminiNativeFormat,
  isMediaRouteType,
  parseAnthropicResponse,
  parseGeminiGenerateContentResponse,
  parseResponsesResponse,
  providerEnvelopeCandidates,
  routeDslValue,
  runtimeRequestCanceledError,
  type RuntimeModelSelection,
} from './provider-runtime-support'

async function readStreamChunk(reader: ReadableStreamDefaultReader<Uint8Array>, signal?: AbortSignal) {
  if (signal?.aborted) throw runtimeRequestCanceledError()
  if (!signal) return reader.read()
  return await new Promise<ReadableStreamReadResult<Uint8Array>>((resolve, reject) => {
    let settled = false
    const cleanup = () => signal.removeEventListener('abort', onAbort)
    const onAbort = () => {
      if (settled) return
      settled = true
      cleanup()
      reader.cancel().catch(() => {})
      reject(runtimeRequestCanceledError())
    }
    signal.addEventListener('abort', onAbort, { once: true })
    reader.read()
      .then(result => {
        if (settled) return
        settled = true
        cleanup()
        if (signal.aborted) {
          reader.cancel().catch(() => {})
          reject(runtimeRequestCanceledError())
          return
        }
        resolve(result)
      })
      .catch(error => {
        if (settled) return
        settled = true
        cleanup()
        reject(signal.aborted ? runtimeRequestCanceledError() : error)
      })
  })
}

async function readClaudeCodeStream(response: Response, signal?: AbortSignal): Promise<any> {
  if (!response.body) throw new Error('Streaming response has no body')

  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  let rawText = ''
  let content = ''
  let finishReason = ''
  let usage: any = undefined
  const tailChunks: any[] = []

  const consumeLine = (line: string) => {
    const trimmed = line.trim()
    if (!trimmed.startsWith('data:')) return
    const payload = trimmed.slice(5).trim()
    if (!payload || payload === '[DONE]') return
    const chunk = JSON.parse(payload)
    const deltaText = chunk?.delta?.text || chunk?.content_block?.text || chunk?.text || ''
    if (deltaText) content += String(deltaText)
    if (chunk?.delta?.stop_reason) finishReason = String(chunk.delta.stop_reason)
    if (chunk?.stop_reason) finishReason = String(chunk.stop_reason)
    if (chunk?.usage) usage = chunk.usage
    tailChunks.push(chunk)
    if (tailChunks.length > 20) tailChunks.shift()
  }

  while (true) {
    const { value, done } = await readStreamChunk(reader, signal)
    if (done) break
    const chunkText = decoder.decode(value, { stream: true })
    rawText += chunkText
    buffer += chunkText
    const lines = buffer.split(/\r?\n/)
    buffer = lines.pop() || ''
    for (const line of lines) consumeLine(line)
  }

  const finalText = decoder.decode()
  rawText += finalText
  buffer += finalText
  for (const line of buffer.split(/\r?\n/)) consumeLine(line)

  if (!content && rawText.trim()) {
    try {
      return JSON.parse(rawText)
    } catch {}
  }

  return {
    content: [{ type: 'text', text: content }],
    stop_reason: finishReason || 'end_turn',
    usage,
    stream_chunks_tail: tailChunks,
  }
}

async function readOpenAIStream(response: Response, signal?: AbortSignal): Promise<any> {
  if (!response.body) throw new Error('Streaming response has no body')

  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  let content = ''
  let finishReason = ''
  let usage: any = undefined
  const tailChunks: any[] = []

  const consumeLine = (line: string) => {
    const trimmed = line.trim()
    if (!trimmed.startsWith('data:')) return
    const payload = trimmed.slice(5).trim()
    if (!payload || payload === '[DONE]') return
    const chunk = JSON.parse(payload)
    const choice = chunk?.choices?.[0] || {}
    const delta = choice?.delta || {}
    const piece = delta?.content ?? choice?.text ?? ''
    if (piece) content += String(piece)
    if (choice?.finish_reason) finishReason = String(choice.finish_reason)
    if (chunk?.usage) usage = chunk.usage
    tailChunks.push(chunk)
    if (tailChunks.length > 20) tailChunks.shift()
  }

  while (true) {
    const { value, done } = await readStreamChunk(reader, signal)
    if (done) break
    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split(/\r?\n/)
    buffer = lines.pop() || ''
    for (const line of lines) consumeLine(line)
  }

  buffer += decoder.decode()
  for (const line of buffer.split(/\r?\n/)) consumeLine(line)

  return {
    content,
    choices: [{ message: { role: 'assistant', content }, finish_reason: finishReason || 'stop' }],
    usage,
    stream_chunks_tail: tailChunks,
  }
}

async function readResponsesStream(response: Response, signal?: AbortSignal): Promise<any> {
  if (!response.body) throw new Error('Streaming response has no body')

  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  let content = ''
  let finishReason = ''
  let usage: any = undefined
  const tailChunks: any[] = []
  let sawTextDelta = false
  let finalContent = ''

  const appendText = (value: any) => {
    const text = String(value || '')
    if (text) content += text
  }

  const textFromContentParts = (parts: any[]) => parts
    .map((part: any) => String(part?.text || part?.content || ''))
    .filter(Boolean)
    .join('\n')

  const textFromOutputItems = (items: any[]) => items
    .flatMap((item: any) => Array.isArray(item?.content) ? item.content : [])
    .map((part: any) => String(part?.text || part?.content || ''))
    .filter(Boolean)
    .join('\n')

  const rememberFinalText = (value: any) => {
    const text = String(value || '')
    if (text && !finalContent.includes(text)) {
      finalContent += finalContent ? `\n${text}` : text
    }
  }

  const consumeLine = (line: string) => {
    const trimmed = line.trim()
    if (!trimmed.startsWith('data:')) return
    const payload = trimmed.slice(5).trim()
    if (!payload || payload === '[DONE]') return
    const chunk = JSON.parse(payload)
    if (typeof chunk?.delta === 'string') {
      sawTextDelta = true
      appendText(chunk.delta)
    }
    if (typeof chunk?.text === 'string') {
      if (String(chunk?.type || '').includes('.done')) {
        rememberFinalText(chunk.text)
      } else {
        sawTextDelta = true
        appendText(chunk.text)
      }
    }
    const choice = Array.isArray(chunk?.choices) ? chunk.choices[0] : null
    if (typeof choice?.delta?.content === 'string') {
      sawTextDelta = true
      appendText(choice.delta.content)
    }
    if (typeof choice?.message?.content === 'string') {
      sawTextDelta = true
      appendText(choice.message.content)
    }
    if (typeof choice?.text === 'string') {
      sawTextDelta = true
      appendText(choice.text)
    }
    if (!sawTextDelta && Array.isArray(chunk?.item?.content)) appendText(textFromContentParts(chunk.item.content))
    if (!sawTextDelta && Array.isArray(chunk?.part?.content)) appendText(textFromContentParts(chunk.part.content))
    if (!sawTextDelta && chunk?.part?.text) appendText(chunk.part.text)
    if (typeof chunk?.output_text === 'string') rememberFinalText(chunk.output_text)
    if (typeof chunk?.response?.output_text === 'string') rememberFinalText(chunk.response.output_text)
    if (Array.isArray(chunk?.output)) rememberFinalText(textFromOutputItems(chunk.output))
    if (Array.isArray(chunk?.response?.output)) rememberFinalText(textFromOutputItems(chunk.response.output))
    if (choice?.finish_reason) finishReason = String(choice.finish_reason)
    if (chunk?.response?.status) finishReason = String(chunk.response.status)
    if (chunk?.status) finishReason = String(chunk.status)
    if (chunk?.response?.usage) usage = chunk.response.usage
    if (chunk?.usage) usage = chunk.usage
    tailChunks.push(chunk)
    if (tailChunks.length > 20) tailChunks.shift()
  }

  while (true) {
    const { value, done } = await readStreamChunk(reader, signal)
    if (done) break
    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split(/\r?\n/)
    buffer = lines.pop() || ''
    for (const line of lines) consumeLine(line)
  }

  buffer += decoder.decode()
  for (const line of buffer.split(/\r?\n/)) consumeLine(line)

  return {
    content: content || finalContent,
    output_text: content || finalContent,
    status: finishReason || 'completed',
    finish_reason: finishReason || 'completed',
    usage,
    stream_chunks_tail: tailChunks,
  }
}

export async function readProviderStream(response: Response, selection: RuntimeModelSelection, signal?: AbortSignal): Promise<any> {
  if (isClaudeCodeFormat(selection.apiFormat)) return readClaudeCodeStream(response, signal)
  if (isCodexResponsesFormat(selection.apiFormat)) return readResponsesStream(response, signal)
  return readOpenAIStream(response, signal)
}

export function parseProviderResponsePayload<T = any>(raw: any, selection: RuntimeModelSelection): LLMResponse<T> {
  const resultExtractor = routeDslValue(selection.routeConfig, 'result_extractor', 'resultExtractor')
  if (resultExtractor) {
    const extracted = getValueByPathFromEnvelopes(raw, String(resultExtractor))
    const extractedContent = typeof extracted === 'string' ? extracted : JSON.stringify(extracted ?? '')
    const content = isMediaRouteType(selection.routeType) ? normalizeExtractedMediaContent(extractedContent) : extractedContent
    return normalizeLLMResponse<T>({ ...raw, content })
  }
  if (isMediaRouteType(selection.routeType)) {
    const extracted = extractMediaContent(raw)
    if (extracted) return normalizeLLMResponse<T>({ ...raw, content: extracted })
  }
  if (isClaudeCodeFormat(selection.apiFormat)) return parseAnthropicResponse<T>(raw)
  if (isGeminiNativeFormat(selection.apiFormat)) return parseGeminiGenerateContentResponse<T>(raw)
  if (isCodexResponsesFormat(selection.apiFormat)) return parseResponsesResponse<T>(raw)
  return normalizeLLMResponse<T>(raw)
}

function extractMediaContent(raw: any) {
  for (const candidate of providerEnvelopeCandidates(raw)) {
    const firstData = Array.isArray(candidate?.data) ? candidate.data[0] : null
    if (firstData?.url || firstData?.b64_json) return normalizeExtractedMediaContent(String(firstData.url || firstData.b64_json))
    const firstResult = Array.isArray(candidate?.output?.results) ? candidate.output.results[0] : Array.isArray(candidate?.results) ? candidate.results[0] : null
    if (firstResult?.video_url || firstResult?.image_url || firstResult?.url) return normalizeExtractedMediaContent(String(firstResult.video_url || firstResult.image_url || firstResult.url))
    if (candidate?.output?.video_url || candidate?.output?.image_url || candidate?.output?.url) return normalizeExtractedMediaContent(String(candidate.output.video_url || candidate.output.image_url || candidate.output.url))
    if (candidate?.video_url || candidate?.image_url || candidate?.url) return normalizeExtractedMediaContent(String(candidate.video_url || candidate.image_url || candidate.url))
    const firstVideoResult = Array.isArray(candidate?.video_result) ? candidate.video_result[0] : null
    if (firstVideoResult?.url) return normalizeExtractedMediaContent(String(firstVideoResult.url))
    const choiceMessage = candidate?.choices?.[0]?.message
    // OpenRouter/cliproxyapi-style chat image generation: content is null and
    // the image lives in message.images[].image_url.url.
    const messageImages = Array.isArray(choiceMessage?.images) ? choiceMessage.images : []
    for (const imageEntry of messageImages) {
      const imageUrl = typeof imageEntry === 'string' ? imageEntry : imageEntry?.image_url?.url || imageEntry?.url
      if (imageUrl) return normalizeExtractedMediaContent(String(imageUrl))
    }
    const choiceContent = choiceMessage?.content ?? candidate?.choices?.[0]?.text
    if (Array.isArray(choiceContent)) {
      const imagePart = choiceContent.find((part: any) => part && typeof part === 'object' && (part.image_url?.url || (part.type === 'image_url' && part.url)))
      if (imagePart) return normalizeExtractedMediaContent(String(imagePart.image_url?.url || imagePart.url))
      const joinedText = choiceContent.map((part: any) => typeof part === 'string' ? part : part?.text || '').filter(Boolean).join('\n')
      if (joinedText) return normalizeExtractedMediaContent(joinedText)
    } else if (choiceContent) {
      return normalizeExtractedMediaContent(String(choiceContent))
    }
  }
  return ''
}

function normalizeExtractedMediaContent(content: string) {
  const value = String(content || '').trim()
  if (!value) return ''
  if (/^(https?:|data:|blob:)/i.test(value)) return value
  const markdownMatch = value.match(/!\[.*?\]\((https?:\/\/[^\s)]+)\)/i)
  if (markdownMatch) return markdownMatch[1]
  const dataMatch = value.match(/(data:(?:image|video)\/[^;]+;base64,[A-Za-z0-9+/=]+)/i)
  if (dataMatch) return dataMatch[1]
  const urlMatch = value.match(/(https?:\/\/[^\s"'<>]+\.(?:png|jpg|jpeg|webp|gif|mp4|webm|mov)(?:\?[^\s"'<>)]*)?)/i)
  if (urlMatch) return urlMatch[1]
  if (value.length > 200 && /^[A-Za-z0-9+/=\s]+$/.test(value.slice(0, 120))) return `data:image/png;base64,${value.replace(/\s+/g, '')}`
  return value
}


