import { SEVERITY_COLOR, SEVERITY_TEXT, type Severity } from '../lib/types'

export default function SeverityBadge({ severity }: { severity: Severity | null }) {
  const s: Severity = severity ?? 'P4'
  return (
    <span className="badge" style={{ background: SEVERITY_COLOR[s], color: SEVERITY_TEXT[s] }}
      aria-label={severity ? `Priority ${severity}` : 'Priority not set'}>
      {severity ?? '?'}
    </span>
  )
}
