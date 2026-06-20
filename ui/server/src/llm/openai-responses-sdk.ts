import OpenAI from 'openai'
import { withCodexClientCompatibilityBody } from './codex-responses'

export type OpenAIResponsesCreateCall = {
  apiKey: string
  baseURL: string
  headers: Record<string, string>
  body: Record<string, any>
  timeoutMs: number
  signal?: AbortSignal
}

type OpenAIResponsesCreate = (call: OpenAIResponsesCreateCall) => Promise<any>

let createOverride: OpenAIResponsesCreate | null = null

export function setOpenAIResponsesCreateForTest(create: OpenAIResponsesCreate) {
  createOverride = create
}

export function resetOpenAIResponsesCreateForTest() {
  createOverride = null
}

export async function createOpenAIResponseViaSdk(call: OpenAIResponsesCreateCall): Promise<any> {
  const normalizedCall = normalizeOpenAIResponsesSdkCall(call)
  if (createOverride) return createOverride(normalizedCall)

  const client = new OpenAI({
    apiKey: normalizedCall.apiKey,
    baseURL: normalizedCall.baseURL,
    defaultHeaders: normalizedCall.headers,
    timeout: normalizedCall.timeoutMs,
    maxRetries: 0,
  })

  const response = await client.responses.create(normalizedCall.body as any, {
    signal: normalizedCall.signal,
    maxRetries: 0,
    timeout: normalizedCall.timeoutMs,
  } as any)

  if (isAsyncIterable(response)) return collectResponsesStream(response)
  return response
}

function normalizeOpenAIResponsesSdkCall(call: OpenAIResponsesCreateCall): OpenAIResponsesCreateCall {
  if (!isCodexResponsesBody(call.body)) return call
  return {
    ...call,
    body: withCodexClientCompatibilityBody(call.body),
  }
}

function isCodexResponsesBody(body: any) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) return false
  const include = Array.isArray(body.include) ? body.include.map((item: unknown) => String(item)) : []
  return Array.isArray(body.input)
    && Array.isArray(body.tools)
    && Object.prototype.hasOwnProperty.call(body, 'tool_choice')
    && body.store === false
    && include.includes('reasoning.encrypted_content')
}

function isAsyncIterable(value: any): value is AsyncIterable<any> {
  return Boolean(value && typeof value[Symbol.asyncIterator] === 'function')
}

async function collectResponsesStream(stream: AsyncIterable<any>) {
  let content = ''
  let finalResponse: any = null
  let usage: any = undefined
  const tailEvents: any[] = []

  for await (const event of stream) {
    tailEvents.push(event)
    if (tailEvents.length > 20) tailEvents.shift()

    if (event?.type === 'response.output_text.delta') {
      content += String(event.delta || '')
    } else if (event?.type === 'response.output_text.done') {
      if (!content && event.text) content = String(event.text)
    } else if (event?.type === 'response.completed') {
      finalResponse = event.response || event
      usage = finalResponse?.usage
    }
  }

  return {
    ...(finalResponse || {}),
    content: content || finalResponse?.output_text || '',
    output_text: content || finalResponse?.output_text || '',
    status: finalResponse?.status || 'completed',
    usage,
    stream_events_tail: tailEvents,
  }
}
