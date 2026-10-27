import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { PinPicker } from '../components/Maps'
import { useAuth } from '../lib/auth'
import { useI18n, type TKey } from '../lib/i18n'
import { compressImage, newClientId, submitReport, type SubmitOutcome } from '../lib/report'

type Pos = { lat: number; lng: number }

const TYPES: { key: string; label: TKey; icon: string }[] = [
  { key: 'fire', label: 'type_fire', icon: '🔥' },
  { key: 'medical', label: 'type_medical', icon: '🚑' },
  { key: 'disaster', label: 'type_disaster', icon: '🌊' },
  { key: 'crime', label: 'type_crime', icon: '🚨' },
  { key: 'disturbance', label: 'type_disturbance', icon: '⚠️' },
  { key: 'other', label: 'type_other', icon: '📋' },
]

export default function ReportPage() {
  const { t } = useI18n()
  const { profile } = useAuth()
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [desc, setDesc] = useState('')
  const [type, setType] = useState<string | null>(null)
  const [inProgress, setInProgress] = useState<boolean | null>(null)
  const [purok, setPurok] = useState('')
  const [anonymous, setAnonymous] = useState(false)
  const [pos, setPos] = useState<Pos | null>(null)
  const [locState, setLocState] = useState<'getting' | 'ok' | 'fail'>('getting')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [outcome, setOutcome] = useState<SubmitOutcome | null>(null)
  const [sosOpen, setSosOpen] = useState(false)
  const sosFile = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!navigator.geolocation) { setLocState('fail'); return }
    navigator.geolocation.getCurrentPosition(
      (p) => { setPos({ lat: p.coords.latitude, lng: p.coords.longitude }); setLocState('ok') },
      () => setLocState('fail'),
      { enableHighAccuracy: true, timeout: 10000 },
    )
  }, [])

  useEffect(() => {
    if (!file) { setPreview(null); return }
    const url = URL.createObjectURL(file)
    setPreview(url)
    return () => URL.revokeObjectURL(url)
  }, [file])

  async function send(opts: { file: File | null; description: string; inProgress: boolean; anonymous: boolean; purok: string }) {
    setBusy(true); setError('')
    const image = opts.file ? await compressImage(opts.file) : null
    const out = await submitReport({
      client_id: newClientId(),
      description: opts.description,
      image_base64: image,
      in_progress: opts.inProgress,
      lat: pos?.lat ?? null,
      lng: pos?.lng ?? null,
      purok: opts.purok,
      anonymous: opts.anonymous,
    })
    setBusy(false)
    if (out.kind === 'error') setError(out.message)
    else { setOutcome(out); setSosOpen(false) }
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!file && !desc.trim()) return setError(t('need_input'))
    if (inProgress === null) return setError(t('inprog_required'))
    const typeLabel = TYPES.find((x) => x.key === type)
    const description = typeLabel ? `[${typeLabel.key}] ${desc}`.trim() : desc
    send({ file, description, inProgress, anonymous, purok })
  }

  function sosGo(f: File | null) {
    send({ file: f, description: 'SOS emergency button pressed. No further details.', inProgress: true, anonymous: false, purok })
  }

  function reset() {
    setOutcome(null); setFile(null); setDesc(''); setType(null); setInProgress(null); setError('')
  }

  if (outcome) {
    const sent = outcome.kind === 'sent' ? outcome.result : null
    const msg = !sent
      ? t('msg_offline')
      : sent.needs_review
        ? t('msg_review')
        : t(`msg_${(sent.severity ?? 'P4').toLowerCase()}` as TKey)
    return (
      <section className="card result">
        <div className={`result-icon ${sent?.severity ?? 'queued'}`}>{sent ? sent.severity ?? '✓' : '⏳'}</div>
        <h2>{msg}</h2>
        <div className="row">
          <Link className="btn" to="/track">{t('see_status')}</Link>
          <button className="btn secondary" onClick={reset}>{t('new_report')}</button>
        </div>
        <p className="muted small">{t('disclaimer')}</p>
      </section>
    )
  }

  return (
    <div className="stack">
      <button className="sos" onClick={() => setSosOpen(true)}>
        <span className="sos-big">{t('sos_btn')}</span>
        <span>{t('sos_hint')}</span>
      </button>

      <form className="card stack" onSubmit={onSubmit}>
        <h2>{t('report_title')}</h2>

        <label className="photo">
          {preview ? <img src={preview} alt="" /> : <span>📷</span>}
          <span className="btn secondary">{file ? t('photo_change') : t('photo_add')}</span>
          <input type="file" accept="image/*" capture="environment" hidden onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
        </label>

        <label>{t('desc_label')}
          <textarea rows={3} value={desc} maxLength={2000} placeholder={t('desc_ph')} onChange={(e) => setDesc(e.target.value)} />
        </label>

        <div>
          <div className="label">{t('type_label')}</div>
          <div className="chips">
            {TYPES.map((x) => (
              <button type="button" key={x.key} className={`chip ${type === x.key ? 'on' : ''}`}
                onClick={() => setType(type === x.key ? null : x.key)}>
                {x.icon} {t(x.label)}
              </button>
            ))}
          </div>
        </div>

        <div>
          <div className="label">{t('inprog_label')}</div>
          <div className="seg">
            <button type="button" className={inProgress === true ? 'on danger' : ''} onClick={() => setInProgress(true)}>{t('yes')}</button>
            <button type="button" className={inProgress === false ? 'on' : ''} onClick={() => setInProgress(false)}>{t('no')}</button>
          </div>
        </div>

        <div>
          <div className="label">{t('loc_label')}</div>
          <p className="muted small">
            {locState === 'getting' ? t('loc_getting') : locState === 'fail' && !pos ? t('loc_fail') : t('loc_hint')}
          </p>
          <PinPicker pos={pos} onPick={(lat, lng) => { setPos({ lat, lng }); setLocState('ok') }} />
          <input value={purok} onChange={(e) => setPurok(e.target.value)} placeholder={t('purok_label')} maxLength={80} />
        </div>

        <label className="check">
          <input type="checkbox" checked={anonymous} onChange={(e) => setAnonymous(e.target.checked)} />
          {t('anon_label')}{profile ? '' : ''}
        </label>

        {error && <div className="banner err">{error}</div>}
        <button className="btn big" disabled={busy}>{busy ? t('submitting') : t('submit')}</button>
        <p className="muted small">{t('disclaimer')}</p>
      </form>

      {sosOpen && (
        <div className="modal" role="dialog">
          <div className="card stack">
            <h2>{t('sos_title')}</h2>
            <p className="muted">{t('sos_note')}</p>
            <input ref={sosFile} type="file" accept="image/*" capture="environment" hidden
              onChange={(e) => sosGo(e.target.files?.[0] ?? null)} />
            <button className="btn big" disabled={busy} onClick={() => sosFile.current?.click()}>📷 {t('sos_photo')}</button>
            <button className="btn big danger" disabled={busy} onClick={() => sosGo(null)}>
              {busy ? t('submitting') : t('sos_send')}
            </button>
            {error && <div className="banner err">{error}</div>}
            <button className="btn secondary" disabled={busy} onClick={() => setSosOpen(false)}>{t('cancel')}</button>
          </div>
        </div>
      )}
    </div>
  )
}
