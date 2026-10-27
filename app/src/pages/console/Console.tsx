import { useMemo, useState } from 'react'
import { IncidentMap } from '../../components/Maps'
import { useAuth } from '../../lib/auth'
import { AGENCY_LABEL } from '../../lib/types'
import Analytics from './Analytics'
import IncidentCard from './IncidentCard'
import Review from './Review'
import { useIncidents } from './useIncidents'

type Tab = 'incidents' | 'review' | 'analytics'

export default function ConsolePage() {
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

  return (
    <div className="stack wide">
      <div className="console-head">
        <h1>{profile ? `${AGENCY_LABEL[(isOfficial ? 'official' : profile.role) as 'bfp']} Console` : 'Console'}</h1>
        <div className="tabs" role="tablist">
          <button role="tab" aria-selected={tab === 'incidents'} className={tab === 'incidents' ? 'on' : ''} onClick={() => setTab('incidents')}>Incidents</button>
          {isOfficial && (
            <button role="tab" aria-selected={tab === 'review'} className={tab === 'review' ? 'on' : ''} onClick={() => setTab('review')}>
              Review{reviewCount ? ` (${reviewCount})` : ''}
            </button>
          )}
          <button role="tab" aria-selected={tab === 'analytics'} className={tab === 'analytics' ? 'on' : ''} onClick={() => setTab('analytics')}>Analytics</button>
        </div>
      </div>

      {alert && (
        <button type="button" className="banner err" role="alert" onClick={clearAlert}>🚨 {alert} — tap to dismiss</button>
      )}
      {isOfficial && reviewCount > 0 && tab !== 'review' && (
        <button type="button" className="banner warn" onClick={() => setTab('review')}>
          {reviewCount} report{reviewCount > 1 ? 's need' : ' needs'} manual routing. Open the Review tab.
        </button>
      )}

      {loading && <p className="loading"><span className="spinner" aria-hidden="true" /> Loading incidents…</p>}

      {tab === 'incidents' && !loading && (
        <div className="console-grid">
          <IncidentMap incidents={mapPoints} selectedId={selected} onSelect={setSelected} />
          <div className="stack">
            <label className="check">
              <input type="checkbox" checked={showResolved} onChange={(e) => setShowResolved(e.target.checked)} />
              Show resolved
            </label>
            {list.length === 0 && (
              <div className="card"><p>No open incidents right now. New reports appear here automatically.</p></div>
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
    </div>
  )
}
