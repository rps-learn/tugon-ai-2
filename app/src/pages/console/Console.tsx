import { useMemo, useState } from 'react'
import { IncidentMap } from '../../components/Maps'
import { useAuth } from '../../lib/auth'
import { useI18n } from '../../lib/i18n'
import Analytics from './Analytics'
import Audit from './Audit'
import IncidentCard from './IncidentCard'
import Review from './Review'
import { useIncidents } from './useIncidents'

type Tab = 'incidents' | 'review' | 'analytics' | 'audit'

export default function ConsolePage() {
  const { t, agency } = useI18n()
  const { profile } = useAuth()
  const { incidents, loading, reload, alert, clearAlert } = useIncidents()
  const [tab, setTab] = useState<Tab>('incidents')
  const [showResolved, setShowResolved] = useState(false)
  const [selected, setSelected] = useState<string | null>(null)

  const isOfficial = profile?.role === 'official'
  const reviewCount = incidents.filter((i) => i.needs_review).length

  const { list, dupCount, mapPoints } = useMemo(() => {
    const shown = incidents.filter((i) => !i.needs_review && (showResolved || i.status !== 'resolved'))
    const parents = new Set(shown.filter((i) => !i.cluster_id).map((i) => i.id))
    // A duplicate is folded into its parent only while that parent is on screen.
    // Otherwise it stands alone, so a new emergency can never be hidden behind a resolved one.
    const open = shown.filter((i) => !i.cluster_id || !parents.has(i.cluster_id))
    const dup = new Map<string, number>()
    shown.forEach((i) => { if (i.cluster_id && parents.has(i.cluster_id)) dup.set(i.cluster_id, (dup.get(i.cluster_id) ?? 0) + 1) })
    open.sort((a, b) => (a.severity ?? 'P9').localeCompare(b.severity ?? 'P9') || b.created_at.localeCompare(a.created_at))
    return {
      list: open.slice(0, 100),
      dupCount: dup,
      mapPoints: incidents.filter((i) => i.status !== 'resolved' && i.category),
    }
  }, [incidents, showResolved])

  const tabs: { key: Tab; label: string }[] = [
    { key: 'incidents', label: t('tab_incidents') },
    ...(isOfficial ? [{ key: 'review' as Tab, label: `${t('tab_review')}${reviewCount ? ` (${reviewCount})` : ''}` }] : []),
    { key: 'analytics', label: t('tab_analytics') },
    ...(isOfficial ? [{ key: 'audit' as Tab, label: t('tab_audit') }] : []),
  ]

  return (
    <div className="stack wide">
      <div className="console-head no-print">
        <h1>{profile ? t('console_title', { agency: agency(isOfficial ? 'official' : profile.role) }) : 'Console'}</h1>
        <div className="tabs" role="tablist">
          {tabs.map((x) => (
            <button key={x.key} role="tab" aria-selected={tab === x.key} className={tab === x.key ? 'on' : ''} onClick={() => setTab(x.key)}>
              {x.label}
            </button>
          ))}
        </div>
      </div>

      {alert && (
        <button type="button" className="banner err no-print" role="alert" onClick={clearAlert}>🚨 {alert} — {t('alert_dismiss')}</button>
      )}
      {isOfficial && reviewCount > 0 && tab !== 'review' && (
        <button type="button" className="banner warn no-print" onClick={() => setTab('review')}>
          {reviewCount === 1 ? t('review_banner_one') : t('review_banner_many', { n: reviewCount })}
        </button>
      )}

      {loading && <p className="loading"><span className="spinner" aria-hidden="true" /> {t('loading_incidents')}</p>}

      {tab === 'incidents' && !loading && (
        <div className="console-grid">
          <IncidentMap incidents={mapPoints} selectedId={selected} onSelect={setSelected} />
          <div className="stack">
            <label className="check">
              <input type="checkbox" checked={showResolved} onChange={(e) => setShowResolved(e.target.checked)} />
              {t('show_resolved')}
            </label>
            {list.length === 0 && (
              <div className="card"><p>{t('no_open')}</p></div>
            )}
            {list.map((i) => (
              <IncidentCard key={i.id} incident={i} duplicates={dupCount.get(i.id) ?? 0}
                selected={selected === i.id} onChanged={reload} onSelect={setSelected} />
            ))}
          </div>
        </div>
      )}
      {tab === 'review' && isOfficial && <Review incidents={incidents} onChanged={reload} />}
      {tab === 'analytics' && <Analytics incidents={incidents} />}
      {tab === 'audit' && isOfficial && <Audit />}
    </div>
  )
}
