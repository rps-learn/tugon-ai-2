import { useEffect, useState, type ReactNode } from 'react'
import { Link, Navigate, NavLink, Route, Routes, useNavigate } from 'react-router-dom'
import { useAuth } from './lib/auth'
import { LANGS, useI18n, type Lang } from './lib/i18n'
import { flushQueue, queueSize } from './lib/report'
import { useTheme, type Theme } from './lib/theme'
import ReportPage from './pages/Report'
import TrackPage from './pages/Track'
import LoginPage from './pages/Login'
import PrivacyPage from './pages/Privacy'
import NotFound from './pages/NotFound'
import ConsolePage from './pages/console/Console'

// The same links are rendered twice: in the header (tablet and up) and as a bottom tab bar (phones).
// CSS shows only one of them, so screen readers never see duplicates.
function NavItems() {
  const { t } = useI18n()
  const { profile } = useAuth()
  const isResponder = profile && profile.role !== 'citizen'
  return (
    <>
      <NavLink to="/" end><span className="nav-icon" aria-hidden="true">📝</span>{t('nav_report')}</NavLink>
      <NavLink to="/track"><span className="nav-icon" aria-hidden="true">📋</span>{t('nav_track')}</NavLink>
      {isResponder && <NavLink to="/console"><span className="nav-icon" aria-hidden="true">🗂️</span>{t('nav_console')}</NavLink>}
    </>
  )
}

const THEME_ICON: Record<Theme, string> = { auto: '🖥️', light: '☀️', dark: '🌙' }
const NEXT_THEME: Record<Theme, Theme> = { auto: 'light', light: 'dark', dark: 'auto' }

function ThemeButton() {
  const { t } = useI18n()
  const { theme, setTheme } = useTheme()
  const label = t(`theme_${theme}` as 'theme_auto')
  return (
    <button type="button" className="btn ghost icon" aria-label={`${t('theme_label')}: ${label}`} title={`${t('theme_label')}: ${label}`}
      onClick={() => setTheme(NEXT_THEME[theme])}>
      <span aria-hidden="true">{THEME_ICON[theme]}</span>
    </button>
  )
}

function Header() {
  const { t, lang, setLang } = useI18n()
  const { profile, signOut } = useAuth()
  const nav = useNavigate()
  return (
    <header className="topbar no-print">
      <Link to="/" className="brand">TUGON AI <small>{t('tagline')}</small></Link>
      <nav className="desktop-nav" aria-label="Main"><NavItems /></nav>
      <div className="topbar-right">
        <ThemeButton />
        <select aria-label={t('language')} value={lang} onChange={(e) => setLang(e.target.value as Lang)}>
          {LANGS.map((l) => <option key={l.code} value={l.code}>{l.label}</option>)}
        </select>
        {profile ? (
          <button className="btn ghost" aria-label={`${t('nav_logout')} (${profile.role})`}
            onClick={async () => { await signOut(); nav('/') }}>
            {t('nav_logout')}
          </button>
        ) : (
          <Link className="btn ghost" to="/login">{t('nav_login')}</Link>
        )}
      </div>
    </header>
  )
}

function Footer() {
  const { t } = useI18n()
  return (
    <footer className="footer no-print">
      <p>{t('disclaimer')}</p>
      <p><Link to="/privacy">{t('nav_privacy')}</Link></p>
      <p className="caption">TUGON AI · Barangay Mambaling &amp; Pardo, Cebu City</p>
    </footer>
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
  return <div className="banner warn" role="status" style={{ borderRadius: 0 }}>{n} {t('track_queued')}</div>
}

export function RequireResponder({ children }: { children: ReactNode }) {
  const { profile, loading } = useAuth()
  if (loading) return <p className="loading pad"><span className="spinner" aria-hidden="true" /> Loading…</p>
  if (!profile || profile.role === 'citizen') return <Navigate to="/login" replace />
  return <>{children}</>
}

export default function App() {
  return (
    <>
      <a className="skip-link" href="#main">Skip to content</a>
      <Header />
      <QueueBanner />
      <main id="main" tabIndex={-1}>
        <Routes>
          <Route path="/" element={<ReportPage />} />
          <Route path="/track" element={<TrackPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/privacy" element={<PrivacyPage />} />
          <Route path="/console" element={<RequireResponder><ConsolePage /></RequireResponder>} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>
      <Footer />
      <nav className="bottom-nav no-print" aria-label="Main"><NavItems /></nav>
    </>
  )
}
