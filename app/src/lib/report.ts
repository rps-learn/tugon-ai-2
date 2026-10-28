import { get, set } from 'idb-keyval'
import { supabase, SUPABASE_KEY, SUPABASE_URL } from './supabase'
import type { Severity } from './types'

export interface Draft {
  client_id: string
  description: string
  image_base64: string | null
  in_progress: boolean
  lat: number | null
  lng: number | null
  purok: string
  landmark: string
  address: string
  anonymous: boolean
  sos?: boolean // emergency button: the server alerts every responder agency
}

export interface TriageResult {
  id: string
  category: string | null
  severity: Severity | null
  status: string
  needs_review: boolean
  primary_agency: string | null
  pending?: boolean // true while the AI is still classifying in the background
}

export type SubmitOutcome =
  | { kind: 'sent'; result: TriageResult }
  | { kind: 'queued' }
  | { kind: 'error'; message: string }

const QUEUE_KEY = 'tugon.queue'
const MINE_KEY = 'tugon.myReports'

export const newClientId = () => crypto.randomUUID()

// Downscale photos before upload: keeps the request small on weak mobile data.
export async function compressImage(file: File, maxDim = 1024, quality = 0.7): Promise<string | null> {
  try {
    const bmp = await createImageBitmap(file)
    const scale = Math.min(1, maxDim / Math.max(bmp.width, bmp.height))
    const canvas = document.createElement('canvas')
    canvas.width = Math.round(bmp.width * scale)
    canvas.height = Math.round(bmp.height * scale)
    canvas.getContext('2d')!.drawImage(bmp, 0, 0, canvas.width, canvas.height)
    return canvas.toDataURL('image/jpeg', quality).split(',')[1]
  } catch {
    return null
  }
}

export function getMyReportIds(): string[] {
  try { return JSON.parse(localStorage.getItem(MINE_KEY) ?? '[]') } catch { return [] }
}
function rememberReport(id: string) {
  try {
    const ids = getMyReportIds()
    if (!ids.includes(id)) localStorage.setItem(MINE_KEY, JSON.stringify([id, ...ids].slice(0, 50)))
  } catch { /* ignore */ }
}

async function callTriage(draft: Draft): Promise<SubmitOutcome> {
  const { data } = await supabase.auth.getSession()
  const token = data.session?.access_token ?? SUPABASE_KEY
  let res: Response
  try {
    res = await fetch(`${SUPABASE_URL}/functions/v1/triage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', apikey: SUPABASE_KEY, Authorization: `Bearer ${token}` },
      body: JSON.stringify(draft),
    })
  } catch {
    return { kind: 'queued' } // network failure: keep for retry
  }
  if (res.status >= 500) return { kind: 'queued' }
  const body = await res.json().catch(() => ({}))
  if (!res.ok) return { kind: 'error', message: body.error ?? `Error ${res.status}` }
  rememberReport(body.id)
  return { kind: 'sent', result: body as TriageResult }
}

async function readQueue(): Promise<Draft[]> {
  return (await get<Draft[]>(QUEUE_KEY)) ?? []
}

export async function queueSize() {
  return (await readQueue()).length
}

export async function submitReport(draft: Draft): Promise<SubmitOutcome> {
  if (navigator.onLine) {
    const out = await callTriage(draft)
    if (out.kind !== 'queued') return out
  }
  await set(QUEUE_KEY, [...(await readQueue()), draft])
  window.dispatchEvent(new Event('tugon:queue'))
  return { kind: 'queued' }
}

let flushing = false
export async function flushQueue(): Promise<number> {
  if (flushing || !navigator.onLine) return 0
  flushing = true
  let sent = 0
  try {
    const remaining: Draft[] = []
    for (const d of await readQueue()) {
      const out = await callTriage(d)
      if (out.kind === 'sent') sent++
      else if (out.kind === 'queued') remaining.push(d)
      // 'error' (invalid report) is dropped so it cannot block the queue
    }
    await set(QUEUE_KEY, remaining)
  } finally {
    flushing = false
    window.dispatchEvent(new Event('tugon:queue'))
  }
  return sent
}
