import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { PinPicker } from '../components/Maps'
import { useI18n, type TKey } from '../lib/i18n'
import { compressImage, newClientId, submitReport, type SubmitOutcome } from '../lib/report'
import { supabase } from '../lib/supabase'
import type { Severity } from '../lib/types'

type Pos = { lat: number; lng: number }
type Final = { severity: Severity | null; status: string }
type Draft = { desc: string; type: string | null; inProgress: boolean | null; purok: string; landmark: string; anonymous: boolean }

const DRAFT_KEY = 'tugon.draft'

// Four common types up front; the rest sit behind "More types" (Hick's law: fewer choices at once).
const TYPES: { key: string; label: TKey; icon: string }[] = [
  { key: 'fire', label: 'type_fire', icon: '🔥' },
  { key: 'medical', label: 'type_medical', icon: '🚑' },
  { key: 'disaster', label: 'type_disaster', icon: '🌊' },
  { key: 'crime', label: 'type_crime', icon: '🚨' },
  { key: 'disturbance', label: 'type_disturbance', icon: '⚠️' },
  { key: 'other', label: 'type_other', icon: '📋' },
]
const PRIMARY_TYPES = 4

function loadDraft(): Partial<Draft> {
  try { return JSON.parse(localStorage.getItem(DRAFT_KEY) ?? '{}') } catch { return {} }
}

export default function ReportPage() {
  const { t } = useI18n()
  const [d0] = useState(loadDraft) // a half-written report survives a reload or a lost signal
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [desc, setDesc] = useState(d0.desc ?? '')
  const [type, setType] = useState<string | null>(d0.type ?? null)
  const [moreTypes, setMoreTypes] = useState(false)
  const [inProgress, setInProgress] = useState<boolean | null>(d0.inProgress ?? null)
  const [purok, setPurok] = useState(d0.purok ?? '')
  const [landmark, setLandmark] = useState(d0.landmark ?? '')
  const [address, setAddress] = useState('')
  const [anonymous, setAnonymous] = useState(d0.anonymous ?? false)
  const [pos, setPos] = useState<Pos | null>(null)
  const [locState, setLocState] = useState<'getting' | 'ok' | 'fail'>('getting')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [errors, setErrors] = useState<{ desc?: string; inprog?: string }>({})
  const [outcome, setOutcome] = useState<SubmitOutcome | null>(null)
  const [sosOpen, setSosOpen] = useState(false)
  const [final, setFinal] = useState<Final | null>(null)
  const sosFile = useRef<HTMLInputElement>(null)
  const camRef = useRef<HTMLInputElement>(null)
  const uploadRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    try { localStorage.setItem(DRAFT_KEY, JSON.stringify({ desc, type, inProgress, purok, landmark, anonymous })) } catch { /* ignore */ }
  }, [desc, type, inProgress, purok, landmark, anonymous])

  useEffect(() => {
    if (!navigator.geolocation) { setLocState('fail'); return }
    navigator.geolocation.getCurrentPosition(
      (p) => { setPos({ lat: p.coords.latitude, lng: p.coords.longitude }); setLocState('ok') },
      () => setLocState('fail'),
      { enableHighAccuracy: true, timeout: 10000 },
    )
  }, [])

  // Readable address for the pin (free OpenStreetMap lookup from the phone; skipped if offline).
  useEffect(() => {
    if (!pos) { setAddress(''); return }
    const ctrl = new AbortController()
    const timer = setTimeout(async () => {
      try {
        const r = await fetch(
          `https://nominatim.openstreetmap.org/reverse?format=jsonv2&zoom=18&accept-language=en&lat=${pos.lat}&lon=${pos.lng}`,
          { signal: ctrl.signal },
        )
        const d = await r.json()
        setAddress(typeof d.display_name === 'string' ? d.display_name : '')
      } catch {
        setAddress('')
      }
    }, 700)
    return () => { clearTimeout(timer); ctrl.abort() }
  }, [pos?.lat, pos?.lng]) // eslint-disable-line react-hooks/exhaustive-deps

  // The server answers immediately and classifies in the background; poll until the result is ready.
  useEffect(() => {
    if (outcome?.kind !== 'sent' || !outcome.result.pending) return
    const id = outcome.result.id
    let alive = true
    let tries = 0
    let timer: ReturnType<typeof setTimeout>
    const tick = async () => {
      tries++
      const { data } = await supabase.rpc('get_report_status', { p_ids: [id] })
      const row = (data as { severity: Severity | null; status: string }[] | null)?.[0]
      if (!alive) return
      if (row && row.status !== 'submitted') return setFinal({ severity: row.severity, status: row.status })
      if (tries >= 40) return setFinal({ severity: null, status: 'timeout' }) // ~60 s: stop waiting, report is still saved
      timer = setTimeout(tick, 1500)
    }
    timer = setTimeout(tick, 1200)
    return () => { alive = false; clearTimeout(timer) }
  }, [outcome])

  useEffect(() => {
    if (!file) { setPreview(null); return }
    const url = URL.createObjectURL(file)
    setPreview(url)
    return () => URL.revokeObjectURL(url)
  }, [file])

  useEffect(() => {
    if (!sosOpen) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape' && !busy) setSosOpen(false) }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [sosOpen, busy])

  async function send(opts: { file: File | null; description: string; inProgress: boolean; anonymous: boolean; purok: string; landmark: string }) {
    setBusy(true); setError('')
    const image = opts.file ? await compressImage(opts.file) : null
    if (opts.file && !image) {
      setBusy(false)
      setError(t('photo_error'))
      return
    }
    const out = await submitReport({
      client_id: newClientId(),
      description: opts.description,
      image_base64: image,
      in_progress: opts.inProgress,
      lat: pos?.lat ?? null,
      lng: pos?.lng ?? null,
      purok: opts.purok,
      landmark: opts.landmark,
      address,
      anonymous: opts.anonymous,
    })
    setBusy(false)
    if (out.kind === 'error') setError(out.message)
    else {
      try { localStorage.removeItem(DRAFT_KEY) } catch { /* ignore */ }
      setOutcome(out); setSosOpen(false)
    }
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    const next: typeof errors = {}
    if (!file && !desc.trim()) next.desc = t('need_input')
    if (inProgress === null) next.inprog = t('inprog_required')
    setErrors(next)
    if (next.desc) { document.getElementById('desc')?.focus(); return }
    if (next.inprog) { document.getElementById('inprog')?.focus(); return }
    const typeLabel = TYPES.find((x) => x.key === type)
    const description = typeLabel ? `[${typeLabel.key}] ${desc}`.trim() : desc
    send({ file, description, inProgress: inProgress as boolean, anonymous, purok, landmark })
  }

  function sosGo(f: File | null) {
    send({ file: f, description: 'SOS emergency button pressed. No further details.', inProgress: true, anonymous: false, purok, landmark })
  }

  function reset() {
    setOutcome(null); setFinal(null); setFile(null); setDesc(''); setType(null); setInProgress(null); setError(''); setErrors({})
  }

  if (outcome) {
    const sent = outcome.kind === 'sent' ? outcome.result : null
    const pending = !!sent?.pending && !final
    const severity = final?.severity ?? sent?.severity ?? null
    const needsReview = final ? final.status === 'classified' : sent?.needs_review
    const msg = !sent
      ? t('msg_offline')
      : pending
        ? t('msg_classifying')
        : final?.status === 'timeout'
          ? t('msg_received')
          : needsReview
            ? t('msg_review')
            : t(`msg_${(severity ?? 'P4').toLowerCase()}` as TKey)
    return (
      <section className="card result" aria-live="polite">
        {pending
          ? <span className="spinner big" role="status" aria-label={t('msg_classifying')} />
          : <div className={`result-icon ${!sent ? 'queued' : severity ?? ''}`}>{!sent ? '⏳' : severity ?? '✓'}</div>}
        <h1>{msg}</h1>
        <div className="row">
          <Link className="btn" to="/track">{t('see_status')}</Link>
          <button className="btn secondary" onClick={reset}>{t('new_report')}</button>
        </div>
      </section>
    )
  }

  const visibleTypes = moreTypes || (type && TYPES.findIndex((x) => x.key === type) >= PRIMARY_TYPES) ? TYPES : TYPES.slice(0, PRIMARY_TYPES)

  return (
    <div className="stack">
      <h1>{t('report_title')}</h1>

      <button className="sos" onClick={() => setSosOpen(true)}>
        <span className="sos-big">{t('sos_btn')}</span>
        <span>{t('sos_hint')}</span>
      </button>

      <form className="card stack form" onSubmit={onSubmit} noValidate>
        <div className="field-group">
          <div className="photo">
            {preview ? <img src={preview} alt="" /> : <span className="photo-icon" aria-hidden="true">📷</span>}
            <div className="photo-actions">
              <button type="button" className="btn secondary" onClick={() => camRef.current?.click()}>📷 {t('photo_take')}</button>
              <button type="button" className="btn secondary" onClick={() => uploadRef.current?.click()}>🖼️ {t('photo_upload')}</button>
              {file && <button type="button" className="btn secondary wide" onClick={() => setFile(null)}>✕ {t('photo_remove')}</button>}
            </div>
            <input ref={camRef} type="file" accept="image/*" capture="environment" hidden
              onChange={(e) => { setFile(e.target.files?.[0] ?? null); setErrors((x) => ({ ...x, desc: undefined })); e.target.value = '' }} />
            <input ref={uploadRef} type="file" accept="image/*" hidden
              onChange={(e) => { setFile(e.target.files?.[0] ?? null); setErrors((x) => ({ ...x, desc: undefined })); e.target.value = '' }} />
          </div>
        </div>

        <div className="field">
          <label htmlFor="desc">{t('desc_label')}</label>
          <textarea id="desc" rows={3} value={desc} maxLength={2000} placeholder={t('desc_ph')}
            aria-invalid={!!errors.desc} aria-describedby={errors.desc ? 'desc-err' : undefined}
            onChange={(e) => { setDesc(e.target.value); setErrors((x) => ({ ...x, desc: undefined })) }} />
          {errors.desc && <p id="desc-err" className="field-error" role="alert">{errors.desc}</p>}
        </div>

        <div className="field-group">
          <div className="label" id="type-label">{t('type_label')}</div>
          <div className="chips" role="group" aria-labelledby="type-label">
            {visibleTypes.map((x) => (
              <button type="button" key={x.key} aria-pressed={type === x.key} className={`chip ${type === x.key ? 'on' : ''}`}
                onClick={() => setType(type === x.key ? null : x.key)}>
                {type === x.key ? '✓' : x.icon} {t(x.label)}
              </button>
            ))}
            {visibleTypes.length < TYPES.length && (
              <button type="button" className="chip more" aria-expanded={false} onClick={() => setMoreTypes(true)}>＋ {t('more_types')}</button>
            )}
          </div>
        </div>

        <div className="field-group">
          <div className="label" id="inprog-label">{t('inprog_label')}</div>
          <div className="seg" id="inprog" tabIndex={-1} role="group" aria-labelledby="inprog-label" aria-describedby={errors.inprog ? 'inprog-err' : undefined}>
            <button type="button" aria-pressed={inProgress === true} className={inProgress === true ? 'on danger' : ''}
              onClick={() => { setInProgress(true); setErrors((x) => ({ ...x, inprog: undefined })) }}>
              {inProgress === true ? '✓ ' : ''}{t('yes')}
            </button>
            <button type="button" aria-pressed={inProgress === false} className={inProgress === false ? 'on' : ''}
              onClick={() => { setInProgress(false); setErrors((x) => ({ ...x, inprog: undefined })) }}>
              {inProgress === false ? '✓ ' : ''}{t('no')}
            </button>
          </div>
          {errors.inprog && <p id="inprog-err" className="field-error" role="alert">{errors.inprog}</p>}
        </div>

        <div className="field-group">
          <div className="label">{t('loc_label')}</div>
          <p className="hint" role="status">
            {locState === 'getting' ? t('loc_getting') : locState === 'fail' && !pos ? t('loc_fail') : t('loc_hint')}
          </p>
          <PinPicker pos={pos} onPick={(lat, lng) => { setPos({ lat, lng }); setLocState('ok') }} />
          {address && <p className="address">📍 {address}</p>}
        </div>

        <div className="field">
          <label htmlFor="purok">{t('purok_label')}</label>
          <input id="purok" value={purok} onChange={(e) => setPurok(e.target.value)} maxLength={80} autoComplete="off" />
        </div>
        <div className="field">
          <label htmlFor="landmark">{t('landmark_label')}</label>
          <input id="landmark" value={landmark} onChange={(e) => setLandmark(e.target.value)} maxLength={160} autoComplete="off" />
        </div>

        <label className="check">
          <input type="checkbox" checked={anonymous} onChange={(e) => setAnonymous(e.target.checked)} />
          {t('anon_label')}
        </label>

        {error && <div className="banner err" role="alert">{error}</div>}
        <button className="btn big" disabled={busy}>
          {busy && <span className="spinner" aria-hidden="true" />}
          {busy ? t('submitting') : t('submit')}
        </button>
      </form>

      {sosOpen && (
        <div className="modal" role="dialog" aria-modal="true" aria-labelledby="sos-title">
          <div className="card stack">
            <h2 id="sos-title">{t('sos_title')}</h2>
            <p className="muted">{t('sos_note')}</p>
            <input ref={sosFile} type="file" accept="image/*" capture="environment" hidden
              onChange={(e) => sosGo(e.target.files?.[0] ?? null)} />
            <button className="btn big secondary" disabled={busy} onClick={() => sosFile.current?.click()}>📷 {t('sos_photo')}</button>
            <button className="btn big danger" disabled={busy} onClick={() => sosGo(null)}>
              {busy && <span className="spinner" aria-hidden="true" />}
              {busy ? t('submitting') : t('sos_send')}
            </button>
            {error && <div className="banner err" role="alert">{error}</div>}
            <button className="btn secondary" disabled={busy} onClick={() => setSosOpen(false)}>{t('cancel')}</button>
          </div>
        </div>
      )}
    </div>
  )
}
