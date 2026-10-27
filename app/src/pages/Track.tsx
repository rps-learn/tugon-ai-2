import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import SeverityBadge from '../components/SeverityBadge'
import { useAuth } from '../lib/auth'
import { useI18n, type TKey } from '../lib/i18n'
import { getMyReportIds, queueSize } from '../lib/report'
import { supabase } from '../lib/supabase'
import { CATEGORY_LABEL, type Severity, type Status } from '../lib/types'
import { timeAgo } from '../lib/util'

interface Row {
  id: string
  category: string | null
  severity: Severity | null
  status: Status
  created_at: string
}

const STEPS: Status[] = [
  'submitted', 'classified', 'agency_notified', 'acknowledged', 'en_route', 'on_scene', 'resolved',
]

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
      <h1>{t('track_title')}</h1>
      {queued > 0 && <div className="banner warn" role="status">{queued} {t('track_queued')}</div>}
      {rows === null && <p className="loading"><span className="spinner" aria-hidden="true" /> {t('track_loading')}</p>}
      {rows?.length === 0 && queued === 0 && (
        <div className="card stack">
          <p>{t('track_empty')}</p>
          <Link className="btn" to="/">{t('track_cta')}</Link>
        </div>
      )}
      {rows?.map((r) => {
        const idx = STEPS.indexOf(r.status)
        return (
          <article key={r.id} className="card">
            <div className="row between">
              <h2>{CATEGORY_LABEL[r.category ?? ''] ?? '…'}</h2>
              {r.severity && <SeverityBadge severity={r.severity} />}
            </div>
            <p className="muted caption">{timeAgo(r.created_at)}</p>
            <ol className="steps">
              {STEPS.map((s, i) => (
                <li key={s} className={`${i <= idx ? 'done' : ''} ${i === idx ? 'current' : ''}`} aria-current={i === idx ? 'step' : undefined}>
                  <span className="dot" aria-hidden="true" />
                  {t(`status_${s}` as TKey)}
                </li>
              ))}
            </ol>
          </article>
        )
      })}
    </div>
  )
}
