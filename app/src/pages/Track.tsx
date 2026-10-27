import { useEffect, useState } from 'react'
import { useAuth } from '../lib/auth'
import { useI18n, type TKey } from '../lib/i18n'
import { getMyReportIds, queueSize } from '../lib/report'
import { supabase } from '../lib/supabase'
import { CATEGORY_LABEL, SEVERITY_COLOR, type Severity, type Status } from '../lib/types'
import { timeAgo } from '../lib/util'

interface Row {
  id: string
  category: string | null
  severity: Severity | null
  status: Status
  created_at: string
}

const STEPS: Status[][] = [
  ['submitted'],
  ['classified'],
  ['agency_notified'],
  ['acknowledged', 'en_route', 'on_scene'],
  ['resolved'],
]

function stepIndex(s: Status) {
  return STEPS.findIndex((g) => g.includes(s))
}

export default function TrackPage() {
  const { t } = useI18n()
  const { session } = useAuth()
  const [rows, setRows] = useState<Row[] | null>(null)
  const [queued, setQueued] = useState(0)

  useEffect(() => {
    let alive = true
    async function load() {
      const ids = getMyReportIds()
      const found = new Map<string, Row>()
      if (ids.length) {
        const { data } = await supabase.rpc('get_report_status', { p_ids: ids })
        ;(data as Row[] | null)?.forEach((r) => found.set(r.id, r))
      }
      if (session) {
        const { data } = await supabase.from('incidents').select('id,category,severity,status,created_at')
          .eq('reporter_id', session.user.id).order('created_at', { ascending: false }).limit(50)
        ;(data as Row[] | null)?.forEach((r) => found.set(r.id, r))
      }
      if (!alive) return
      setRows([...found.values()].sort((a, b) => b.created_at.localeCompare(a.created_at)))
      setQueued(await queueSize())
    }
    load()
    const timer = setInterval(load, 15000)
    return () => { alive = false; clearInterval(timer) }
  }, [session])

  return (
    <div className="stack">
      <h2>{t('track_title')}</h2>
      {queued > 0 && <div className="banner warn">{queued} {t('track_queued')}</div>}
      {rows === null && <p className="muted">{t('track_loading')}</p>}
      {rows?.length === 0 && queued === 0 && <p className="muted">{t('track_empty')}</p>}
      {rows?.map((r) => {
        const idx = stepIndex(r.status)
        return (
          <article key={r.id} className="card">
            <div className="row between">
              <strong>{CATEGORY_LABEL[r.category ?? ''] ?? '…'}</strong>
              {r.severity && <span className="badge" style={{ background: SEVERITY_COLOR[r.severity] }}>{r.severity}</span>}
            </div>
            <div className="muted small">{timeAgo(r.created_at)}</div>
            <ol className="steps">
              {STEPS.map((g, i) => (
                <li key={i} className={i <= idx ? 'done' : ''}>
                  <span className="dot" />
                  {i === idx && r.status !== 'resolved' ? t(`status_${r.status}` as TKey) : t(`status_${g[0]}` as TKey)}
                </li>
              ))}
            </ol>
          </article>
        )
      })}
    </div>
  )
}
