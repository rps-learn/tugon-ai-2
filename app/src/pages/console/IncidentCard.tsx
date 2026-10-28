import { useState } from 'react'
import SeverityBadge from '../../components/SeverityBadge'
import { useI18n, type TKey } from '../../lib/i18n'
import { supabase } from '../../lib/supabase'
import type { Incident, Outcome, Status } from '../../lib/types'
import { fmtMinutes, minutesBetween } from '../../lib/util'

const ACTIONS: { status: Status; label: TKey }[] = [
  { status: 'acknowledged', label: 'act_ack' },
  { status: 'en_route', label: 'status_en_route' },
  { status: 'on_scene', label: 'status_on_scene' },
  { status: 'resolved', label: 'act_resolve' },
]
const ORDER: Status[] = ['submitted', 'classified', 'agency_notified', 'acknowledged', 'en_route', 'on_scene', 'resolved']

const OUTCOMES: { key: Outcome; label: TKey }[] = [
  { key: 'confirmed', label: 'outcome_confirmed' },
  { key: 'false_alarm', label: 'outcome_false' },
  { key: 'unverified', label: 'outcome_unverified' },
]

export default function IncidentCard({
  incident: i, duplicates, selected, onChanged, onSelect,
}: { incident: Incident; duplicates: number; selected: boolean; onChanged: () => void; onSelect?: (id: string) => void }) {
  const { t, cat, agency, ago } = useI18n()
  const [open, setOpen] = useState(false)
  const [photo, setPhoto] = useState<string | null>(null)
  const [busy, setBusy] = useState<Status | Outcome | null>(null)
  const [err, setErr] = useState('')

  async function toggle() {
    setOpen(!open)
    if (!open) onSelect?.(i.id) // map flies to this incident
    if (!open && i.photo_path && !photo) {
      const { data } = await supabase.storage.from('incident-photos').createSignedUrl(i.photo_path, 600)
      setPhoto(data?.signedUrl ?? null)
    }
  }

  async function setStatus(status: Status) {
    const note = status === 'resolved' ? window.prompt(t('resolve_prompt')) : null
    if (status === 'resolved' && note === null) return
    setBusy(status); setErr('')
    const { error } = await supabase.rpc('update_incident_status', { p_id: i.id, p_status: status, p_note: note })
    setBusy(null)
    if (error) setErr(t('err_status', { msg: error.message }))
    else onChanged()
  }

  async function setOutcome(outcome: Outcome) {
    setBusy(outcome); setErr('')
    const { error } = await supabase.rpc('set_incident_outcome', { p_id: i.id, p_outcome: outcome })
    setBusy(null)
    if (error) setErr(t('err_outcome', { msg: error.message }))
    else onChanged()
  }

  const idx = ORDER.indexOf(i.status)
  const ack = minutesBetween(i.created_at, i.acknowledged_at)
  const next = ACTIONS.filter((a) => ORDER.indexOf(a.status) > idx)
  const canMarkOutcome = idx >= ORDER.indexOf('acknowledged') && !i.needs_review
  const showMap = () => {
    onSelect?.(i.id)
    document.querySelector('.map')?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }

  return (
    <article className={`card incident ${selected ? 'selected' : ''} ${i.severity === 'P1' ? 'p1' : ''}`}>
      <button type="button" className="incident-head" onClick={toggle} aria-expanded={open}>
        <span className="row wrap">
          <SeverityBadge severity={i.severity} />
          {i.is_sos && <span className="pill sos-pill">SOS</span>}
          <strong>{cat(i.category)}</strong>
          {duplicates > 0 && <span className="pill">{t('similar', { n: duplicates })}</span>}
          {i.needs_review && <span className="pill warn">⚠ {t('needs_review')}</span>}
          {i.outcome === 'false_alarm' && <span className="pill warn">{t('outcome_false')}</span>}
          {i.outcome === 'confirmed' && <span className="pill ok">✓ {t('outcome_confirmed')}</span>}
        </span>
        <span className="muted caption">{ago(i.created_at)} {open ? '▲' : '▼'}</span>
      </button>

      <p className="muted">
        {t(`status_${i.status}` as TKey)} · {agency(i.primary_agency)}
        {i.secondary_agency ? ` + ${agency(i.secondary_agency)}` : ''}
        {i.purok ? ` · ${i.purok}` : ''}
        {i.lat === null ? ` · 📍 ${t('no_gps')}` : ''}
        {ack !== null ? ` · ${t('ack_in', { t: fmtMinutes(ack) })}` : ''}
        {' · '}<span className={i.reporter_type === 'registered' ? '' : 'reporter-warn'}>{t(`reporter_${i.reporter_type}` as TKey)}</span>
      </p>
      {i.description && <p className="desc">{i.description}</p>}

      {open && (
        <div className="stack">
          <div className="location">
            {i.landmark && <p><b>{t('landmark')}:</b> {i.landmark}</p>}
            {i.address && <p><b>{t('address_approx')}:</b> {i.address}</p>}
            <p>
              <b>{t('location')}:</b>{' '}
              {i.lat !== null && i.lng !== null
                ? `${i.purok ? `${i.purok} · ` : ''}${i.lat.toFixed(5)}, ${i.lng.toFixed(5)}`
                : <span className="pill warn">⚠ {t('no_gps_warn')}{i.purok ? ` · ${i.purok}` : ` - ${t('ask_reporter')}`}</span>}
            </p>
          </div>
          {i.lat !== null && i.lng !== null && (
            <div className="row wrap">
              <a className="btn secondary" target="_blank" rel="noreferrer"
                href={`https://www.google.com/maps/search/?api=1&query=${i.lat},${i.lng}`}>{t('open_gmaps')} ↗</a>
              <button type="button" className="btn secondary" onClick={showMap}>{t('show_map')}</button>
            </div>
          )}
          {i.urgency_note && <p><b>{t('ai_note')}:</b> {i.urgency_note} ({t('confidence_pct', { n: Math.round((i.confidence ?? 0) * 100) })})</p>}
          {photo && <img className="evidence" src={photo} alt={t('photo_alt')} />}
          {i.resolution_note && <p><b>{t('resolution')}:</b> {i.resolution_note}</p>}
          {i.status !== 'resolved' && !i.needs_review && next.length > 0 && (
            <div className="row wrap">
              {next.map((a, n) => (
                <button key={a.status} className={`btn ${n === 0 ? '' : 'secondary'}`} disabled={busy !== null}
                  onClick={() => setStatus(a.status)}>
                  {busy === a.status && <span className="spinner" aria-hidden="true" />}{t(a.label)}
                </button>
              ))}
            </div>
          )}
          {canMarkOutcome && (
            <div className="stack outcome">
              <b>{t('outcome_title')}</b>
              <div className="row wrap">
                {OUTCOMES.map((o) => (
                  <button key={o.key} type="button" aria-pressed={i.outcome === o.key} disabled={busy !== null}
                    className={`btn secondary ${i.outcome === o.key ? `on ${o.key}` : ''}`} onClick={() => setOutcome(o.key)}>
                    {busy === o.key && <span className="spinner" aria-hidden="true" />}{t(o.label)}
                  </button>
                ))}
              </div>
            </div>
          )}
          {err && <div className="banner err" role="alert">{err}</div>}
        </div>
      )}
    </article>
  )
}
