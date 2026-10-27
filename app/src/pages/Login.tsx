import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../lib/auth'
import { useI18n } from '../lib/i18n'
import { supabase } from '../lib/supabase'

const DEMO = import.meta.env.VITE_DEMO_MODE === 'true'
const DEMO_PASSWORD = 'Tugon#2026demo'
const DEMO_USERS = [
  ['Barangay Official', 'official@tugon.test'],
  ['BFP', 'bfp@tugon.test'],
  ['ERUF', 'eruf@tugon.test'],
  ['Police', 'police@tugon.test'],
  ['Citizen', 'citizen@tugon.test'],
]

export default function LoginPage() {
  const { t } = useI18n()
  const { signIn, signUp } = useAuth()
  const nav = useNavigate()
  const [mode, setMode] = useState<'login' | 'signup'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [msg, setMsg] = useState('')
  const [busy, setBusy] = useState(false)

  async function go(em: string, pw: string) {
    setBusy(true); setMsg('')
    if (mode === 'signup') {
      const r = await signUp(em, pw, name)
      setBusy(false)
      if (r.error) return setMsg(r.error)
      if (r.needsConfirm) return setMsg(t('confirm_email'))
      return nav('/')
    }
    const err = await signIn(em, pw)
    if (err) { setBusy(false); return setMsg(err) }
    const { data } = await supabase.auth.getUser()
    const { data: p } = await supabase.from('profiles').select('role').eq('id', data.user!.id).single()
    setBusy(false)
    nav(p && p.role !== 'citizen' ? '/console' : '/')
  }

  return (
    <div className="stack narrow">
      <form className="card stack" onSubmit={(e) => { e.preventDefault(); go(email, password) }}>
        <h2>{mode === 'login' ? t('login_title') : t('signup_title')}</h2>
        {mode === 'signup' && (
          <label>{t('full_name')}<input value={name} onChange={(e) => setName(e.target.value)} required /></label>
        )}
        <label>{t('email')}<input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" /></label>
        <label>{t('password')}<input type="password" value={password} minLength={6} onChange={(e) => setPassword(e.target.value)} required autoComplete={mode === 'login' ? 'current-password' : 'new-password'} /></label>
        {msg && <div className="banner err">{msg}</div>}
        <button className="btn big" disabled={busy}>{mode === 'login' ? t('login') : t('signup')}</button>
        <button type="button" className="link" onClick={() => setMode(mode === 'login' ? 'signup' : 'login')}>
          {mode === 'login' ? t('to_signup') : t('to_login')}
        </button>
        <p className="muted small">{t('guest_note')}</p>
      </form>

      {DEMO && mode === 'login' && (
        <div className="card stack">
          <h3>{t('demo_title')}</h3>
          <div className="chips">
            {DEMO_USERS.map(([label, em]) => (
              <button key={em} type="button" className="chip" disabled={busy} onClick={() => go(em, DEMO_PASSWORD)}>{label}</button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
