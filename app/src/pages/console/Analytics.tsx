import { useMemo, useState } from 'react'
import {
  Bar, BarChart, CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts'
import {
  AGENCIES, AGENCY_LABEL, CATEGORIES, CATEGORY_LABEL, SEVERITIES, SEVERITY_COLOR, type Incident,
} from '../../lib/types'
import { download, fmtMinutes, minutesBetween, toCsv } from '../../lib/util'

const monthKey = (iso: string) => iso.slice(0, 7)
const avg = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null)

export default function Analytics({ incidents }: { incidents: Incident[] }) {
  const [days, setDays] = useState(180)
  const [agency, setAgency] = useState('')
  const [category, setCategory] = useState('')
  const [severity, setSeverity] = useState('')

  const { rows, prevCount } = useMemo(() => {
    const now = Date.now()
    const from = now - days * 86400000
    const prevFrom = from - days * 86400000
    const pass = (i: Incident) =>
      (!agency || i.primary_agency === agency) && (!category || i.category === category) && (!severity || i.severity === severity)
    const all = incidents.filter((i) => i.category && pass(i))
    return {
      rows: all.filter((i) => new Date(i.created_at).getTime() >= from),
      prevCount: all.filter((i) => {
        const t = new Date(i.created_at).getTime()
        return t >= prevFrom && t < from
      }).length,
    }
  }, [incidents, days, agency, category, severity])

  const monthly = useMemo(() => {
    const m = new Map<string, Record<string, number | string>>()
    for (const i of rows) {
      const k = monthKey(i.created_at)
      const row = m.get(k) ?? { month: k, total: 0, P1: 0, P2: 0, P3: 0, P4: 0 }
      row.total = (row.total as number) + 1
      if (i.severity) row[i.severity] = (row[i.severity] as number) + 1
      m.set(k, row)
    }
    return [...m.values()].sort((a, b) => String(a.month).localeCompare(String(b.month)))
  }, [rows])

  const byCategory = useMemo(
    () => CATEGORIES.map((c) => ({ name: CATEGORY_LABEL[c], count: rows.filter((i) => i.category === c).length })),
    [rows],
  )

  const byAgency = useMemo(() => AGENCIES.map((a) => {
    const mine = rows.filter((i) => i.primary_agency === a)
    const ack = mine.map((i) => minutesBetween(i.created_at, i.acknowledged_at)).filter((x): x is number => x !== null)
    const res = mine.map((i) => minutesBetween(i.created_at, i.resolved_at)).filter((x): x is number => x !== null)
    return { name: AGENCY_LABEL[a], ack: avg(ack), res: avg(res), count: mine.length }
  }), [rows])

  const delta = prevCount ? Math.round(((rows.length - prevCount) / prevCount) * 100) : null
  const allAck = rows.map((i) => minutesBetween(i.created_at, i.acknowledged_at)).filter((x): x is number => x !== null)

  function exportCsv() {
    download(`tugon-incidents-${new Date().toISOString().slice(0, 10)}.csv`, toCsv(rows.map((i) => ({
      id: i.id, created_at: i.created_at, category: i.category, subcategory: i.subcategory, severity: i.severity,
      primary_agency: i.primary_agency, secondary_agency: i.secondary_agency, purok: i.purok, status: i.status,
      response_min: minutesBetween(i.created_at, i.acknowledged_at)?.toFixed(1) ?? '',
      resolution_min: minutesBetween(i.created_at, i.resolved_at)?.toFixed(1) ?? '',
    }))), 'text/csv')
  }

  return (
    <div className="stack">
      <div className="card row wrap filters">
        <label>Period
          <select value={days} onChange={(e) => setDays(Number(e.target.value))}>
            <option value={30}>Last 30 days</option><option value={90}>Last 90 days</option>
            <option value={180}>Last 180 days</option><option value={365}>Last year</option>
          </select>
        </label>
        <label>Agency
          <select value={agency} onChange={(e) => setAgency(e.target.value)}>
            <option value="">All</option>
            {AGENCIES.map((a) => <option key={a} value={a}>{AGENCY_LABEL[a]}</option>)}
          </select>
        </label>
        <label>Category
          <select value={category} onChange={(e) => setCategory(e.target.value)}>
            <option value="">All</option>
            {CATEGORIES.map((c) => <option key={c} value={c}>{CATEGORY_LABEL[c]}</option>)}
          </select>
        </label>
        <label>Severity
          <select value={severity} onChange={(e) => setSeverity(e.target.value)}>
            <option value="">All</option>{SEVERITIES.map((s) => <option key={s}>{s}</option>)}
          </select>
        </label>
        <button className="btn secondary" onClick={exportCsv}>Export CSV</button>
      </div>

      <div className="kpis">
        <div className="card kpi"><span className="muted small">Incidents</span><b>{rows.length}</b>
          <span className="small muted">{delta === null ? 'no prior period' : `${delta > 0 ? '+' : ''}${delta}% vs previous ${days} days`}</span></div>
        <div className="card kpi"><span className="muted small">Avg. time to acknowledge</span><b>{fmtMinutes(avg(allAck))}</b></div>
        <div className="card kpi"><span className="muted small">P1 incidents</span><b>{rows.filter((i) => i.severity === 'P1').length}</b></div>
      </div>

      <div className="card">
        <h3>Incidents per month</h3>
        <ResponsiveContainer width="100%" height={240}>
          <LineChart data={monthly}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="month" /><YAxis allowDecimals={false} /><Tooltip />
            <Line type="monotone" dataKey="total" stroke="#b71c1c" strokeWidth={2} name="Incidents" /></LineChart>
        </ResponsiveContainer>
      </div>

      <div className="card">
        <h3>Severity per month</h3>
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={monthly}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="month" /><YAxis allowDecimals={false} /><Tooltip /><Legend />
            {SEVERITIES.map((s) => <Bar key={s} dataKey={s} stackId="a" fill={SEVERITY_COLOR[s]} />)}</BarChart>
        </ResponsiveContainer>
      </div>

      <div className="card">
        <h3>By incident type</h3>
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={byCategory} layout="vertical" margin={{ left: 30 }}><CartesianGrid strokeDasharray="3 3" />
            <XAxis type="number" allowDecimals={false} /><YAxis type="category" dataKey="name" width={130} /><Tooltip />
            <Bar dataKey="count" fill="#37474f" name="Incidents" /></BarChart>
        </ResponsiveContainer>
      </div>

      <div className="card">
        <h3>Response time by agency (minutes)</h3>
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={byAgency.map((a) => ({ ...a, ack: a.ack && Math.round(a.ack), res: a.res && Math.round(a.res) }))}>
            <CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="name" /><YAxis /><Tooltip /><Legend />
            <Bar dataKey="ack" name="To acknowledge" fill="#ef6c00" /><Bar dataKey="res" name="To resolve" fill="#2e7d32" /></BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
