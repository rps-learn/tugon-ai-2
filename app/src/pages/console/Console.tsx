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
    const dup = new Map<string, number>()
    incidents.forEach((i) => i.cluster_id && dup.set(i.cluster_id, (dup.get(i.cluster_id) ?? 0) + 1))
    const open = incidents.filter((i) => !i.needs_review && (showResolved || i.status !== 'resolved') && !i.cluster_id)
    open.sort((a, b) => (a.severity ?? 'P9').localeCompare(b.severity ?? 'P9') || b.created_at.localeCompare(a.created_at))
    return {
      list: open.slice(0, 100),
      dupCount: dup,
      mapPoints: incidents.filter((i) => i.status !== 'resolved' && i.category),
    }
  }, [incidents, showResolved])

  return (
    <div className="stack wide">
      <div className="row between wrap">
        <h2>{profile ? `${AGENCY_LABEL[(isOfficial ? 'official' : profile.role) as 'bfp']} Console` : 'Console'}</h2>
        <div className="tabs">
          <button className={tab === 'incidents' ? 'on' : ''} onClick={() => setTab('incidents')}>Incidents</button>
          {isOfficial && (
            <button className={tab === 'review' ? 'on' : ''} onClick={() => setTab('review')}>
              Review{reviewCount ? ` (${reviewCount})` : ''}
            </button>
          )}
          <button className={tab === 'analytics' ? 'on' : ''} onClick={() => setTab('analytics')}>Analytics</button>
        </div>
      </div>

      {alert && (
        <div className="banner err" role="alert" onClick={clearAlert}>🚨 {alert} — tap to dismiss</div>
      )}
      {isOfficial && reviewCount > 0 && tab !== 'review' && (
        <div className="banner warn" onClick={() => setTab('review')} style={{ cursor: 'pointer' }}>
          {reviewCount} report{reviewCount > 1 ? 's need' : ' needs'} manual routing
        </div>
      )}

      {loading && <p className="muted">Loading…</p>}

      {tab === 'incidents' && !loading && (
        <div className="console-grid">
          <IncidentMap incidents={mapPoints} onSelect={setSelected} />
          <div className="stack">
            <label className="check">
              <input type="checkbox" checked={showResolved} onChange={(e) => setShowResolved(e.target.checked)} />
              Show resolved
            </label>
            {list.length === 0 && <p className="muted">No incidents to show.</p>}
            {list.map((i) => (
              <IncidentCard key={i.id} incident={i} duplicates={dupCount.get(i.id) ?? 0}
                selected={selected === i.id} onChanged={reload} />
            ))}
          </div>
        </div>
      )}
      {tab === 'review' && isOfficial && <Review incidents={incidents} onChanged={reload} />}
      {tab === 'analytics' && <Analytics incidents={incidents} />}
    </div>
  )
}
