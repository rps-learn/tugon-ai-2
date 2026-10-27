import { useState } from 'react'
import { supabase } from '../../lib/supabase'
import {
  AGENCY_LABEL, CATEGORY_LABEL, SEVERITY_COLOR, type Incident, type Status,
} from '../../lib/types'
import { fmtMinutes, minutesBetween, timeAgo } from '../../lib/util'

const ACTIONS: { status: Status; label: string }[] = [
  { status: 'acknowledged', label: 'Acknowledge' },
  { status: 'en_route', label: 'En route' },
  { status: 'on_scene', label: 'On scene' },
  { status: 'resolved', label: 'Resolve' },
]
const ORDER: Status[] = ['submitted', 'classified', 'agency_notified', 'acknowledged', 'en_route', 'on_scene', 'resolved']

export default function IncidentCard({
  incident: i, duplicates, selected, onChanged,
}: { incident: Incident; duplicates: number; selected: boolean; onChanged: () => void }) {
  const [open, setOpen] = useState(false)
  const [photo, setPhoto] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')

  async function toggle() {
    setOpen(!open)
    if (!open && i.photo_path && !photo) {
      const { data } = await supabase.storage.from('incident-photos').createSignedUrl(i.photo_path, 600)
      setPhoto(data?.signedUrl ?? null)
    }
  }

  async function setStatus(status: Status) {
    const note = status === 'resolved' ? window.prompt('Resolution notes (optional)') : null
    if (status === 'resolved' && note === null) return
    setBusy(true); setErr('')
    const { error } = await supabase.rpc('update_incident_status', { p_id: i.id, p_status: status, p_note: note })
    setBusy(false)
    if (error) setErr(error.message)
    else onChanged()
  }

  const idx = ORDER.indexOf(i.status)
  const ack = minutesBetween(i.created_at, i.acknowledged_at)

  return (
    <article className={`card incident ${selected ? 'selected' : ''} ${i.severity === 'P1' ? 'p1' : ''}`}>
      <div className="row between" onClick={toggle} role="button" tabIndex={0} style={{ cursor: 'pointer' }}>
        <div className="row">
          <span className="badge" style={{ background: SEVERITY_COLOR[i.severity ?? 'P4'] }}>{i.severity ?? '?'}</span>
          <strong>{CATEGORY_LABEL[i.category ?? ''] ?? 'Unclassified'}</strong>
          {duplicates > 0 && <span className="pill">+{duplicates} similar</span>}
          {i.needs_review && <span className="pill warn">needs review</span>}
        </div>
        <span className="muted small">{timeAgo(i.created_at)}</span>
      </div>

      <div className="muted small">
        {i.status.replace('_', ' ')} · {AGENCY_LABEL[i.primary_agency ?? 'official']}
        {i.secondary_agency ? ` + ${AGENCY_LABEL[i.secondary_agency]}` : ''}
        {i.purok ? ` · ${i.purok}` : ''}
        {ack !== null ? ` · ack in ${fmtMinutes(ack)}` : ''}
      </div>
      {i.description && <p className="desc">{i.description}</p>}

      {open && (
        <div className="stack">
          {i.urgency_note && <p className="small"><b>AI note:</b> {i.urgency_note} ({Math.round((i.confidence ?? 0) * 100)}% confidence)</p>}
          {photo && <img className="evidence" src={photo} alt="Reported scene" />}
          {i.resolution_note && <p className="small"><b>Resolution:</b> {i.resolution_note}</p>}
          {i.status !== 'resolved' && !i.needs_review && (
            <div className="row wrap">
              {ACTIONS.filter((a) => ORDER.indexOf(a.status) > idx).map((a) => (
                <button key={a.status} className={`btn small ${a.status === 'resolved' ? '' : 'secondary'}`}
                  disabled={busy} onClick={() => setStatus(a.status)}>{a.label}</button>
              ))}
            </div>
          )}
          {err && <div className="banner err">{err}</div>}
        </div>
      )}
    </article>
  )
}
