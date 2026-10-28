import { useMemo, useState } from 'react'
import {
  Bar, BarChart, CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts'
import { HotspotMap } from '../../components/Maps'
import { useI18n } from '../../lib/i18n'
import {
  AGENCIES, CATEGORIES, SEVERITIES, SEVERITY_COLOR, type Incident,
} from '../../lib/types'
import { download, fmtMinutes, minutesBetween, toCsv } from '../../lib/util'

const monthKey = (iso: string) => iso.slice(0, 7)
const avg = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null)
const DAY = 86400000

// Chart colors follow the theme through CSS variables.
const AXIS = { fill: 'var(--color-text-muted)' }
const GRID = 'var(--color-border)'
const TIP = { background: 'var(--color-surface-raised)', border: '1px solid var(--color-border)', color: 'var(--color-text)' }

export default function Analytics({ incidents }: { incidents: Incident[] }) {
  const { t, cat, agency } = useI18n()
  const [days, setDays] = useState(180)
  const [agencyFilter, setAgency] = useState('')
  const [category, setCategory] = useState('')
  const [severity, setSeverity] = useState('')

  const { all, rows, prevCount } = useMemo(() => {
    const now = Date.now()
    const from = now - days * DAY
    const prevFrom = from - days * DAY
    const pass = (i: Incident) =>
      (!agencyFilter || i.primary_agency === agencyFilter) && (!category || i.category === category) && (!severity || i.severity === severity)
    const all = incidents.filter((i) => i.category && pass(i))
    return {
      all,
      rows: all.filter((i) => new Date(i.created_at).getTime() >= from),
      prevCount: all.filter((i) => {
        const x = new Date(i.created_at).getTime()
        return x >= prevFrom && x < from
      }).length,
    }
  }, [incidents, days, agencyFilter, category, severity])

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
    () => CATEGORIES.map((c) => ({ name: cat(c), count: rows.filter((i) => i.category === c).length })),
    [rows, cat],
  )

  const byAgency = useMemo(() => AGENCIES.map((a) => {
    const mine = rows.filter((i) => i.primary_agency === a)
    const ack = mine.map((i) => minutesBetween(i.created_at, i.acknowledged_at)).filter((x): x is number => x !== null)
    const res = mine.map((i) => minutesBetween(i.created_at, i.resolved_at)).filter((x): x is number => x !== null)
    return { name: agency(a), ack: avg(ack), res: avg(res), count: mine.length }
  }), [rows, agency])

  // Trend alerts: the same type of incident in the same purok, last 7 days vs the 7 days before. Not a prediction.
  const trends = useMemo(() => {
    const now = Date.now()
    const groups = new Map<string, { category: string; purok: string; now: number; prev: number }>()
    for (const i of all) {
      if (i.outcome === 'false_alarm') continue
      const age = now - new Date(i.created_at).getTime()
      if (age > 14 * DAY) continue
      const purok = (i.purok ?? '').trim()
      const key = `${i.category}|${purok.toLowerCase()}`
      const g = groups.get(key) ?? { category: i.category!, purok, now: 0, prev: 0 }
      if (age <= 7 * DAY) g.now += 1
      else g.prev += 1
      groups.set(key, g)
    }
    return [...groups.values()].filter((g) => g.now >= 3 && g.now > g.prev).sort((a, b) => b.now - a.now).slice(0, 5)
  }, [all])

  const delta = prevCount ? Math.round(((rows.length - prevCount) / prevCount) * 100) : null
  const allAck = rows.map((i) => minutesBetween(i.created_at, i.acknowledged_at)).filter((x): x is number => x !== null)
  const checked = rows.filter((i) => i.outcome)
  const falseCount = checked.filter((i) => i.outcome === 'false_alarm').length

  function exportCsv() {
    download(`tugon-incidents-${new Date().toISOString().slice(0, 10)}.csv`, toCsv(rows.map((i) => ({
      id: i.id, created_at: i.created_at, category: i.category, subcategory: i.subcategory, severity: i.severity,
      primary_agency: i.primary_agency, secondary_agency: i.secondary_agency, purok: i.purok, status: i.status,
      sos: i.is_sos ? 'yes' : '', reporter_type: i.reporter_type, outcome: i.outcome ?? '',
      response_min: minutesBetween(i.created_at, i.acknowledged_at)?.toFixed(1) ?? '',
      resolution_min: minutesBetween(i.created_at, i.resolved_at)?.toFixed(1) ?? '',
    }))), 'text/csv')
  }

  const periodLabel = ({ 30: 'an_30', 90: 'an_90', 180: 'an_180', 365: 'an_365' } as const)[days as 30 | 90 | 180 | 365]

  return (
    <div className="stack">
      {/* Shown only when printing or saving as PDF */}
      <div className="print-only print-head">
        <h1>{t('report_doc_title')}</h1>
        <p>Barangay Mambaling &amp; Pardo, Cebu City · {t(periodLabel)} · {new Date().toLocaleDateString()}</p>
      </div>

      <div className="card filters no-print">
        <label>{t('an_period')}
          <select value={days} onChange={(e) => setDays(Number(e.target.value))}>
            <option value={30}>{t('an_30')}</option><option value={90}>{t('an_90')}</option>
            <option value={180}>{t('an_180')}</option><option value={365}>{t('an_365')}</option>
          </select>
        </label>
        <label>{t('an_agency')}
          <select value={agencyFilter} onChange={(e) => setAgency(e.target.value)}>
            <option value="">{t('an_all')}</option>
            {AGENCIES.map((a) => <option key={a} value={a}>{agency(a)}</option>)}
          </select>
        </label>
        <label>{t('an_category')}
          <select value={category} onChange={(e) => setCategory(e.target.value)}>
            <option value="">{t('an_all')}</option>
            {CATEGORIES.map((c) => <option key={c} value={c}>{cat(c)}</option>)}
          </select>
        </label>
        <label>{t('an_severity')}
          <select value={severity} onChange={(e) => setSeverity(e.target.value)}>
            <option value="">{t('an_all')}</option>{SEVERITIES.map((s) => <option key={s}>{s}</option>)}
          </select>
        </label>
        <div className="row wrap filter-actions">
          <button className="btn secondary" onClick={exportCsv}>{t('an_export')}</button>
          <button className="btn secondary" onClick={() => window.print()}>{t('an_print')}</button>
        </div>
      </div>

      <div className="kpis">
        <div className="card kpi"><span className="muted">{t('kpi_incidents')}</span><b>{rows.length}</b>
          <span className="muted">{delta === null ? t('kpi_noprev') : t('kpi_prev', { n: `${delta > 0 ? '+' : ''}${delta}`, d: days })}</span></div>
        <div className="card kpi"><span className="muted">{t('kpi_ack')}</span><b>{fmtMinutes(avg(allAck))}</b></div>
        <div className="card kpi"><span className="muted">{t('kpi_p1')}</span><b>{rows.filter((i) => i.severity === 'P1').length}</b></div>
        <div className="card kpi"><span className="muted">{t('kpi_false')}</span>
          <b>{checked.length ? `${Math.round((falseCount / checked.length) * 100)}%` : '-'}</b>
          <span className="muted">{checked.length ? t('kpi_false_sub', { n: falseCount, m: checked.length }) : t('kpi_false_none')}</span></div>
      </div>

      <div className="card stack">
        <h2>{t('trend_title')}</h2>
        {trends.length === 0 && <p className="muted">{t('trend_none')}</p>}
        {trends.length > 0 && (
          <ul className="trend-list">
            {trends.map((g) => (
              <li key={`${g.category}|${g.purok}`}>
                <span className="pill warn">▲</span>{' '}
                <b>{t('trend_line', { n: g.now, cat: cat(g.category), place: g.purok || t('place_none') })}</b>
                {' '}<span className="muted">({g.prev ? t('trend_up', { p: g.prev }) : t('trend_new')})</span>
              </li>
            ))}
          </ul>
        )}
        <p className="muted caption">{t('trend_hint')}</p>
      </div>

      <div className="card stack">
        <h2>{t('hot_title')}</h2>
        {rows.some((i) => i.lat !== null) ? <HotspotMap incidents={rows} /> : <p className="muted">{t('hot_empty')}</p>}
        <p className="muted caption">{t('hot_hint')}</p>
      </div>

      <div className="card">
        <h2>{t('ch_month')}</h2>
        <ResponsiveContainer width="100%" height={240}>
          <LineChart data={monthly}><CartesianGrid stroke={GRID} strokeDasharray="3 3" /><XAxis dataKey="month" tick={AXIS} /><YAxis allowDecimals={false} tick={AXIS} /><Tooltip contentStyle={TIP} />
            <Line type="monotone" dataKey="total" stroke="#e5484d" strokeWidth={2} name={t('ch_inc')} /></LineChart>
        </ResponsiveContainer>
      </div>

      <div className="card">
        <h2>{t('ch_sev')}</h2>
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={monthly}><CartesianGrid stroke={GRID} strokeDasharray="3 3" /><XAxis dataKey="month" tick={AXIS} /><YAxis allowDecimals={false} tick={AXIS} /><Tooltip contentStyle={TIP} /><Legend />
            {SEVERITIES.map((s) => <Bar key={s} dataKey={s} stackId="a" fill={SEVERITY_COLOR[s]} />)}</BarChart>
        </ResponsiveContainer>
      </div>

      <div className="card">
        <h2>{t('ch_type')}</h2>
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={byCategory} layout="vertical" margin={{ left: 30 }}><CartesianGrid stroke={GRID} strokeDasharray="3 3" />
            <XAxis type="number" allowDecimals={false} tick={AXIS} /><YAxis type="category" dataKey="name" width={130} tick={AXIS} /><Tooltip contentStyle={TIP} />
            <Bar dataKey="count" fill="#6b8caf" name={t('ch_inc')} /></BarChart>
        </ResponsiveContainer>
      </div>

      <div className="card">
        <h2>{t('ch_resp')}</h2>
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={byAgency.map((a) => ({ ...a, ack: a.ack && Math.round(a.ack), res: a.res && Math.round(a.res) }))}>
            <CartesianGrid stroke={GRID} strokeDasharray="3 3" /><XAxis dataKey="name" tick={AXIS} /><YAxis tick={AXIS} /><Tooltip contentStyle={TIP} /><Legend />
            <Bar dataKey="ack" name={t('ch_resp_ack')} fill="#ef6c00" /><Bar dataKey="res" name={t('ch_resp_res')} fill="#2e9d57" /></BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
