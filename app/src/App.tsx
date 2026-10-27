import { useEffect, useState, type ReactNode } from 'react'
import { Navigate, NavLink, Route, Routes, useNavigate } from 'react-router-dom'
import { useAuth } from './lib/auth'
import { LANGS, useI18n, type Lang } from './lib/i18n'
import { flushQueue, queueSize } from './lib/report'
import ReportPage from './pages/Report'
import TrackPage from './pages/Track'
import LoginPage from './pages/Login'
import PrivacyPage from './pages/Privacy'
import ConsolePage from './pages/console/Console'

function Header() {
  const { t, lang, setLang } = useI18n()
  const { profile, signOut } = useAuth()
  const nav = useNavigate()
  const isResponder = profile && profile.role !== 'citizen'
  return (
    <header className="topbar">
      <div className="brand">TUGON AI <span>{t('tagline')}</span></div>
      <nav>
        <NavLink to="/" end>{t('nav_report')}</NavLink>
        <NavLink to="/track">{t('nav_track')}</NavLink>
        {isResponder && <NavLink to="/console">{t('nav_console')}</NavLink>}
        <NavLink to="/privacy">{t('nav_privacy')}</NavLink>
      </nav>
      <div className="topbar-right">
        <select aria-label={t('language')} value={lang} onChange={(e) => setLang(e.target.value as Lang)}>
          {LANGS.map((l) => <option key={l.code} value={l.code}>{l.label}</option>)}
        </select>
        {profile ? (
          <button className="link" onClick={async () => { await signOut(); nav('/') }}>
            {t('nav_logout')} ({profile.role})
          </button>
        ) : (
          <NavLink to="/login">{t('nav_login')}</NavLink>
        )}
      </div>
    </header>
  )
}

function QueueBanner() {
  const { t } = useI18n()
  const [n, setN] = useState(0)
  useEffect(() => {
    const refresh = () => queueSize().then(setN)
    const flush = () => flushQueue().then(refresh)
    refresh(); flush()
    window.addEventListener('online', flush)
    window.addEventListener('tugon:queue', refresh)
    const timer = setInterval(flush, 30000)
    return () => {
      window.removeEventListener('online', flush)
      window.removeEventListener('tugon:queue', refresh)
      clearInterval(timer)
    }
  }, [])
  if (!n) return null
  return <div className="banner warn">{n} {t('track_queued')}</div>
}

export function RequireResponder({ children }: { children: ReactNode }) {
  const { profile, loading } = useAuth()
  if (loading) return <p className="pad">…</p>
  if (!profile || profile.role === 'citizen') return <Navigate to="/login" replace />
  return <>{children}</>
}

export default function App() {
  return (
    <>
      <Header />
      <QueueBanner />
      <main>
        <Routes>
          <Route path="/" element={<ReportPage />} />
          <Route path="/track" element={<TrackPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/privacy" element={<PrivacyPage />} />
          <Route path="/console" element={<RequireResponder><ConsolePage /></RequireResponder>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </>
  )
}
