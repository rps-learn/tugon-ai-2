import { CircleMarker, MapContainer, Popup, TileLayer, useMap, useMapEvents } from 'react-leaflet'
import { useEffect } from 'react'
import { MAP_CENTER, SEVERITY_COLOR, CATEGORY_LABEL, type Incident } from '../lib/types'

const TILES = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'
const ATTR = '&copy; OpenStreetMap contributors'

function ClickToPlace({ onPick }: { onPick: (lat: number, lng: number) => void }) {
  useMapEvents({ click: (e) => onPick(e.latlng.lat, e.latlng.lng) })
  return null
}

function Recenter({ pos }: { pos: [number, number] }) {
  const map = useMap()
  useEffect(() => { map.setView(pos) }, [map, pos[0], pos[1]]) // eslint-disable-line react-hooks/exhaustive-deps
  return null
}

export function PinPicker({ pos, onPick }: { pos: { lat: number; lng: number } | null; onPick: (lat: number, lng: number) => void }) {
  const center: [number, number] = pos ? [pos.lat, pos.lng] : MAP_CENTER
  return (
    <MapContainer center={center} zoom={16} className="map small" scrollWheelZoom={false}>
      <TileLayer url={TILES} attribution={ATTR} />
      <ClickToPlace onPick={onPick} />
      {pos && <Recenter pos={center} />}
      {pos && <CircleMarker center={center} radius={10} pathOptions={{ color: '#b71c1c', fillColor: '#e53935', fillOpacity: 0.8 }} />}
    </MapContainer>
  )
}

function FlyTo({ target }: { target: [number, number] | null }) {
  const map = useMap()
  useEffect(() => {
    if (target) map.flyTo(target, 17, { duration: 0.8 })
  }, [map, target?.[0], target?.[1]]) // eslint-disable-line react-hooks/exhaustive-deps
  return null
}

export function IncidentMap({ incidents, selectedId, onSelect }: {
  incidents: Incident[]; selectedId?: string | null; onSelect?: (id: string) => void
}) {
  const open = incidents.filter((i) => i.lat !== null && i.lng !== null)
  const sel = open.find((i) => i.id === selectedId)
  return (
    <MapContainer center={MAP_CENTER} zoom={14} className="map" scrollWheelZoom>
      <TileLayer url={TILES} attribution={ATTR} />
      <FlyTo target={sel ? [sel.lat!, sel.lng!] : null} />
      {open.map((i) => {
        const color = SEVERITY_COLOR[i.severity ?? 'P4']
        const chosen = i.id === selectedId
        return (
          <CircleMarker
            key={i.id}
            center={[i.lat!, i.lng!]}
            radius={(i.severity === 'P1' ? 11 : i.severity === 'P2' ? 9 : 7) + (chosen ? 5 : 0)}
            pathOptions={{ color: chosen ? '#111' : color, fillColor: color, fillOpacity: 0.75, weight: chosen ? 4 : i.needs_review ? 3 : 1 }}
            eventHandlers={{ click: () => onSelect?.(i.id) }}
          >
            <Popup>
              <b>{i.severity ?? '?'} · {CATEGORY_LABEL[i.category ?? ''] ?? 'Unclassified'}</b>
              <br />{i.landmark ?? i.purok ?? ''}
              {i.address && <><br /><small>{i.address}</small></>}
            </Popup>
          </CircleMarker>
        )
      })}
    </MapContainer>
  )
}
