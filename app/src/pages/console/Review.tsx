import { useState } from 'react'
import { supabase } from '../../lib/supabase'
import SeverityBadge from '../../components/SeverityBadge'
import {
  AGENCIES, AGENCY_LABEL, CATEGORIES, CATEGORY_LABEL, SEVERITIES, type Incident,
} from '../../lib/types'
import { timeAgo } from '../../lib/util'

function ReviewRow({ i, onDone }: { i: Incident; onDone: () => void }) {
  const [category, setCategory] = useState(i.category ?? 'social_general')
  const [primary, setPrimary] = useState(i.primary_agency ?? 'official')
  const [secondary, setSecondary] = useState(i.secondary_agency ?? '')
  const [severity, setSeverity] = useState(i.severity ?? 'P3')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')

  async function route() {
    setBusy(true); setErr('')
    const { error } = await supabase.rpc('reroute_incident', {
      p_id: i.id, p_category: category, p_primary: primary, p_secondary: secondary, p_severity: severity,
    })
    setBusy(false)
    if (error) setErr(error.message)
    else onDone()
  }

  return (
    <article className="card stack">
      <div className="row between">
        <div className="row">
          <SeverityBadge severity={i.severity} />
          <strong>{i.in_progress ? 'In progress' : 'Not in progress'}</strong>
        </div>
        <span className="muted caption">{timeAgo(i.created_at)}</span>
      </div>
      <p className="desc">{i.description || '(photo only)'}</p>
      <p className="muted">
        AI: {i.urgency_note ?? 'no suggestion'} — confidence {Math.round((i.confidence ?? 0) * 100)}%
        {i.purok ? ` · ${i.purok}` : ''}
        {i.landmark ? ` · Landmark: ${i.landmark}` : ''}
        {i.address ? ` · ${i.address}` : ''}
      </p>
      <div className="grid4">
        <label>Category
          <select value={category} onChange={(e) => setCategory(e.target.value)}>
            {CATEGORIES.map((c) => <option key={c} value={c}>{CATEGORY_LABEL[c]}</option>)}
          </select>
        </label>
        <label>Severity
          <select value={severity} onChange={(e) => setSeverity(e.target.value as typeof severity)}>
            {SEVERITIES.map((s) => <option key={s}>{s}</option>)}
          </select>
        </label>
        <label>Primary agency
          <select value={primary} onChange={(e) => setPrimary(e.target.value as typeof primary)}>
            {AGENCIES.map((a) => <option key={a} value={a}>{AGENCY_LABEL[a]}</option>)}
          </select>
        </label>
        <label>Secondary
          <select value={secondary} onChange={(e) => setSecondary(e.target.value as typeof secondary)}>
            <option value="">None</option>
            {AGENCIES.filter((a) => a !== primary).map((a) => <option key={a} value={a}>{AGENCY_LABEL[a]}</option>)}
          </select>
        </label>
      </div>
      {err && <div className="banner err" role="alert">{err}</div>}
      <button className="btn" disabled={busy} onClick={route}>
        {i.category ? 'Confirm / re-route and notify agency' : 'Route and notify agency'}
      </button>
    </article>
  )
}

export default function Review({ incidents, onChanged }: { incidents: Incident[]; onChanged: () => void }) {
  const queue = incidents.filter((i) => i.needs_review)
  return (
    <div className="stack">
      <p className="muted">Reports the AI was unsure about (under 70% confidence) or could not classify. Agencies cannot see them until you route them.</p>
      {queue.length === 0 && <div className="card"><p>Nothing is waiting for review. New low-confidence reports appear here.</p></div>}
      {queue.map((i) => <ReviewRow key={i.id} i={i} onDone={onChanged} />)}
    </div>
  )
}
