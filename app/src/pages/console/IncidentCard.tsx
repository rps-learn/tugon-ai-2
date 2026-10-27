import { useState } from 'react'
import SeverityBadge from '../../components/SeverityBadge'
import { supabase } from '../../lib/supabase'
import { AGENCY_LABEL, CATEGORY_LABEL, type Incident, type Status } from '../../lib/types'
import { fmtMinutes, minutesBetween, timeAgo } from '../../lib/util'

const ACTIONS: { status: Status; label: string }[] = [
  { status: 'acknowledged', label: 'Acknowledge' },
  { status: 'en_route', label: 'En route' },
  { status: 'on_scene', label: 'On scene' },
  { status: 'resolved', label: 'Resolve' },
]
const ORDER: Status[] = ['submitted', 'classified', 'agency_notified', 'acknowledged', 'en_route', 'on_scene', 'resolved']

export default function IncidentCard({
  incident: i, duplicates, selected, onChanged, onSelect,
}: { incident: Incident; duplicates: number; selected: boolean; onChanged: () => void; onSelect?: (id: string) => void }) {
  const [open, setOpen] = useState(false)
  const [photo, setPhoto] = useState<string | null>(null)
  const [busy, setBusy] = useState<Status | null>(null)
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
    const note = status === 'resolved' ? window.prompt('Resolution notes (optional)') : null
    if (status === 'resolved' && note === null) return
    setBusy(status); setErr('')
    const { error } = await supabase.rpc('update_incident_status', { p_id: i.id, p_status: status, p_note: note })
    setBusy(null)
    if (error) setErr(`Could not update the status: ${error.message}. Check your connection and try again.`)
    else onChanged()
  }

  const idx = ORDER.indexOf(i.status)
  const ack = minutesBetween(i.created_at, i.acknowledged_at)
  const next = ACTIONS.filter((a) => ORDER.indexOf(a.status) > idx)
  const showMap = () => {
    onSelect?.(i.id)
    document.querySelector('.map')?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }

  return (
    <article className={`card incident ${selected ? 'selected' : ''} ${i.severity === 'P1' ? 'p1' : ''}`}>
      <button type="button" className="incident-head" onClick={toggle} aria-expanded={open}>
        <span className="row wrap">
          <SeverityBadge severity={i.severity} />
          <strong>{CATEGORY_LABEL[i.category ?? ''] ?? 'Unclassified'}</strong>
          {duplicates > 0 && <span className="pill">+{duplicates} similar</span>}
          {i.needs_review && <span className="pill warn">⚠ needs review</span>}
        </span>
        <span className="muted caption">{timeAgo(i.created_at)} {open ? '▲' : '▼'}</span>
      </button>

      <p className="muted">
        {i.status.replace('_', ' ')} · {AGENCY_LABEL[i.primary_agency ?? 'official']}
        {i.secondary_agency ? ` + ${AGENCY_LABEL[i.secondary_agency]}` : ''}
        {i.purok ? ` · ${i.purok}` : ''}
        {i.lat === null ? ' · 📍 no GPS' : ''}
        {ack !== null ? ` · ack in ${fmtMinutes(ack)}` : ''}
      </p>
      {i.description && <p className="desc">{i.description}</p>}

      {open && (
        <div className="stack">
          <div className="location">
            {i.landmark && <p><b>Landmark:</b> {i.landmark}</p>}
            {i.address && <p><b>Address (approx.):</b> {i.address}</p>}
            <p>
              <b>Location:</b>{' '}
              {i.lat !== null && i.lng !== null
                ? `${i.purok ? `${i.purok} · ` : ''}${i.lat.toFixed(5)}, ${i.lng.toFixed(5)}`
                : <span className="pill warn">⚠ No GPS location{i.purok ? ` · ${i.purok}` : ' - ask the reporter'}</span>}
            </p>
          </div>
          {i.lat !== null && i.lng !== null && (
            <div className="row wrap">
              <a className="btn secondary" target="_blank" rel="noreferrer"
                href={`https://www.google.com/maps/search/?api=1&query=${i.lat},${i.lng}`}>Open in Google Maps ↗</a>
              <button type="button" className="btn secondary" onClick={showMap}>Show on map</button>
            </div>
          )}
          {i.urgency_note && <p><b>AI note:</b> {i.urgency_note} ({Math.round((i.confidence ?? 0) * 100)}% confidence)</p>}
          {photo && <img className="evidence" src={photo} alt="Photo sent with the report" />}
          {i.resolution_note && <p><b>Resolution:</b> {i.resolution_note}</p>}
          {i.status !== 'resolved' && !i.needs_review && next.length > 0 && (
            <div className="row wrap">
              {next.map((a, n) => (
                <button key={a.status} className={`btn ${n === 0 ? '' : 'secondary'}`} disabled={busy !== null}
                  onClick={() => setStatus(a.status)}>
                  {busy === a.status && <span className="spinner" aria-hidden="true" />}{a.label}
                </button>
              ))}
            </div>
          )}
          {err && <div className="banner err" role="alert">{err}</div>}
        </div>
      )}
    </article>
  )
}
