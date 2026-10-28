import { useCallback, useEffect, useRef, useState } from 'react'
import { useI18n } from '../../lib/i18n'
import { supabase } from '../../lib/supabase'
import type { Incident } from '../../lib/types'
import { beep } from '../../lib/util'

// Loads every incident the signed-in role is allowed to see (RLS decides) and keeps it live.
export function useIncidents() {
  const { t } = useI18n()
  const tRef = useRef(t)
  tRef.current = t // the language can change without reloading the data
  const [incidents, setIncidents] = useState<Incident[]>([])
  const [loading, setLoading] = useState(true)
  const [alert, setAlert] = useState<string | null>(null)
  const alerted = useRef<Set<string> | null>(null)

  const reload = useCallback(async () => {
    const { data } = await supabase.from('incidents').select('*').order('created_at', { ascending: false }).limit(1000)
    const rows = (data as Incident[] | null) ?? []
    setIncidents(rows)
    setLoading(false)

    const urgent = rows.filter((i) => (i.severity === 'P1' || i.severity === 'P2')
      && i.status !== 'resolved' && !i.acknowledged_at)
    if (alerted.current === null) {
      alerted.current = new Set(urgent.map((i) => i.id)) // first load: no alert storm
      return
    }
    const fresh = urgent.filter((i) => !alerted.current!.has(i.id))
    if (fresh.length) {
      fresh.forEach((i) => alerted.current!.add(i.id))
      const sev = fresh.some((i) => i.is_sos) ? 'SOS' : fresh[0].severity!
      setAlert(fresh.length > 1 ? tRef.current('alert_new_many', { sev, n: fresh.length }) : tRef.current('alert_new', { sev }))
      beep()
    }
  }, [])

  useEffect(() => {
    reload()
    const ch = supabase.channel('incidents-live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'incidents' }, () => reload())
      .subscribe()
    const poll = setInterval(reload, 30000) // fallback if the websocket drops
    return () => { supabase.removeChannel(ch); clearInterval(poll) }
  }, [reload])

  return { incidents, loading, reload, alert, clearAlert: () => setAlert(null) }
}
