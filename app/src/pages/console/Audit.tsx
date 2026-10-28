import { useEffect, useState } from 'react'
import SeverityBadge from '../../components/SeverityBadge'
import { useI18n, type TKey } from '../../lib/i18n'
import { supabase } from '../../lib/supabase'
import type { Severity } from '../../lib/types'

interface EventRow {
  id: number
  incident_id: string
  actor_id: string | null
  action: string
  note: string | null
  created_at: string
  incident: { category: string | null; severity: Severity | null; purok: string | null; address: string | null } | null
}

const PAGE = 50

// Official-only log of everything that happened to a report: who routed it, changed its status or marked the outcome.
export default function Audit() {
  const { t, cat, agency } = useI18n()
  const [rows, setRows] = useState<EventRow[] | null>(null)
  const [names, setNames] = useState<Map<string, string>>(new Map())
  const [shown, setShown] = useState(PAGE)

  useEffect(() => {
    let alive = true
    ;(async () => {
      const [ev, pr] = await Promise.all([
        supabase.from('incident_events')
          .select('id,incident_id,actor_id,action,note,created_at,incident:incidents(category,severity,purok,address)')
          .order('created_at', { ascending: false }).limit(500),
        supabase.from('profiles').select('id,full_name,role'),
      ])
      if (!alive) return
      const map = new Map<string, string>()
      ;(pr.data as { id: string; full_name: string; role: string }[] | null)?.forEach((p) =>
        map.set(p.id, p.full_name ? `${p.full_name} (${p.role})` : p.role))
      setNames(map)
      setRows((ev.data as unknown as EventRow[] | null) ?? [])
    })()
    return () => { alive = false }
  }, [])

  function describe(e: EventRow): string {
    if (e.action.startsWith('status:')) return `${t(`status_${e.action.slice(7)}` as TKey)}${e.note ? ` — ${e.note}` : ''}`
    if (e.action === 'outcome') {
      const k = e.note === 'false_alarm' ? 'outcome_false' : e.note === 'confirmed' ? 'outcome_confirmed' : 'outcome_unverified'
      return `${t('a_outcome')}: ${t(k)}`
    }
    if (e.action === 'reroute') {
      // note is "category / primary / secondary / severity"
      const [c, p, s, sev] = (e.note ?? '').split(' / ')
      return `${t('a_reroute')}: ${cat(c)} · ${agency(p)}${s && s !== '-' ? ` + ${agency(s)}` : ''} · ${sev ?? ''}`
    }
    const key = ({ submitted: 'a_submitted', classified: 'a_classified', ai_failed: 'a_ai_failed' } as Record<string, TKey>)[e.action]
    return key ? t(key) + (e.action !== 'submitted' && e.note ? ` (${e.note})` : '') : e.action
  }

  return (
    <div className="stack">
      <h2>{t('audit_title')}</h2>
      <p className="muted">{t('audit_intro')}</p>
      {rows === null && <p className="loading"><span className="spinner" aria-hidden="true" /> {t('loading')}</p>}
      {rows?.length === 0 && <div className="card"><p>{t('audit_empty')}</p></div>}
      {rows && rows.length > 0 && (
        <ul className="audit-list card">
          {rows.slice(0, shown).map((e) => (
            <li key={e.id}>
              <time className="muted caption" dateTime={e.created_at}>{new Date(e.created_at).toLocaleString()}</time>
              <span><b>{describe(e)}</b></span>
              <span className="row wrap muted">
                <SeverityBadge severity={e.incident?.severity ?? null} />
                {cat(e.incident?.category ?? null)}{e.incident?.purok ? ` · ${e.incident.purok}` : ''}
              </span>
              <span className="muted caption">{t('audit_who')}: {e.actor_id ? names.get(e.actor_id) ?? e.actor_id.slice(0, 8) : t('audit_system')}</span>
            </li>
          ))}
        </ul>
      )}
      {rows && rows.length > shown && (
        <button type="button" className="btn secondary" onClick={() => setShown(shown + PAGE)}>{t('audit_more')}</button>
      )}
    </div>
  )
}
