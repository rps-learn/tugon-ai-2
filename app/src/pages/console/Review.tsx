import { useState } from 'react'
import { supabase } from '../../lib/supabase'
import SeverityBadge from '../../components/SeverityBadge'
import { useI18n, type TKey } from '../../lib/i18n'
import { AGENCIES, CATEGORIES, SEVERITIES, type Incident } from '../../lib/types'

function ReviewRow({ i, onDone }: { i: Incident; onDone: () => void }) {
  const { t, cat, agency, ago } = useI18n()
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
        <div className="row wrap">
          <SeverityBadge severity={i.severity} />
          <strong>{i.in_progress ? t('in_progress') : t('not_in_progress')}</strong>
          <span className={`pill ${i.reporter_type === 'registered' ? '' : 'warn'}`}>{t(`reporter_${i.reporter_type}` as TKey)}</span>
        </div>
        <span className="muted caption">{ago(i.created_at)}</span>
      </div>
      <p className="desc">{i.description || t('photo_only')}</p>
      <p className="muted">
        {t('ai_label')}: {i.urgency_note ?? t('no_suggestion')} — {t('conf_word')} {Math.round((i.confidence ?? 0) * 100)}%
        {i.purok ? ` · ${i.purok}` : ''}
        {i.landmark ? ` · ${t('landmark')}: ${i.landmark}` : ''}
        {i.address ? ` · ${i.address}` : ''}
      </p>
      <div className="grid4">
        <label>{t('f_category')}
          <select value={category} onChange={(e) => setCategory(e.target.value)}>
            {CATEGORIES.map((c) => <option key={c} value={c}>{cat(c)}</option>)}
          </select>
        </label>
        <label>{t('f_severity')}
          <select value={severity} onChange={(e) => setSeverity(e.target.value as typeof severity)}>
            {SEVERITIES.map((s) => <option key={s}>{s}</option>)}
          </select>
        </label>
        <label>{t('f_primary')}
          <select value={primary} onChange={(e) => setPrimary(e.target.value as typeof primary)}>
            {AGENCIES.map((a) => <option key={a} value={a}>{agency(a)}</option>)}
          </select>
        </label>
        <label>{t('f_secondary')}
          <select value={secondary} onChange={(e) => setSecondary(e.target.value as typeof secondary)}>
            <option value="">{t('none')}</option>
            {AGENCIES.filter((a) => a !== primary).map((a) => <option key={a} value={a}>{agency(a)}</option>)}
          </select>
        </label>
      </div>
      {err && <div className="banner err" role="alert">{err}</div>}
      <button className="btn" disabled={busy} onClick={route}>
        {busy && <span className="spinner" aria-hidden="true" />}{i.category ? t('route_confirm') : t('route_new')}
      </button>
    </article>
  )
}

export default function Review({ incidents, onChanged }: { incidents: Incident[]; onChanged: () => void }) {
  const { t } = useI18n()
  const queue = incidents.filter((i) => i.needs_review)
  return (
    <div className="stack">
      <p className="muted">{t('review_intro')}</p>
      {queue.length === 0 && <div className="card"><p>{t('review_empty')}</p></div>}
      {queue.map((i) => <ReviewRow key={i.id} i={i} onDone={onChanged} />)}
    </div>
  )
}
