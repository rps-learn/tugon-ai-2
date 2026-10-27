import { createContext, useContext, useState, type ReactNode } from 'react'

export type Lang = 'en' | 'ceb' | 'tl'
export const LANGS: { code: Lang; label: string }[] = [
  { code: 'en', label: 'English' },
  { code: 'ceb', label: 'Cebuano' },
  { code: 'tl', label: 'Tagalog' },
]

const en = {
  tagline: 'Barangay incident reporting',
  nav_report: 'Report', nav_track: 'My reports', nav_console: 'Console', nav_login: 'Sign in',
  nav_logout: 'Sign out', nav_privacy: 'Privacy',
  sos_btn: 'SOS', sos_hint: 'Tap for an emergency',
  sos_title: 'Send emergency SOS', sos_photo: 'Take a photo', sos_send: 'Send SOS now',
  sos_note: 'Your location will be sent with the alert. A photo helps responders but is optional.',
  cancel: 'Cancel',
  report_title: 'Report an incident',
  photo_add: 'Add photo', photo_change: 'Change photo',
  photo_take: 'Take photo', photo_upload: 'Upload photo', photo_remove: 'Remove',
  photo_error: 'This photo could not be read. Try a JPG or PNG image.',
  desc_label: 'What happened?', desc_ph: 'Describe what happened (English, Bisaya or Tagalog)',
  type_label: 'Type of incident',
  type_fire: 'Fire', type_medical: 'Medical', type_disaster: 'Disaster', type_crime: 'Crime',
  type_disturbance: 'Disturbance', type_other: 'Other',
  inprog_label: 'Is it happening right now?', yes: 'Yes', no: 'No',
  inprog_required: 'Please tell us if it is happening right now.',
  loc_label: 'Location', loc_getting: 'Getting your location…',
  loc_fail: 'Could not get your location. Tap the map to place the pin.',
  loc_hint: 'Tap the map to adjust the pin', purok_label: 'Purok / Sitio (optional)',
  anon_label: 'Report anonymously',
  submit: 'Submit report', submitting: 'Sending…',
  need_input: 'Add a photo or a description.',
  disclaimer: 'In a life-threatening emergency, also call 911 or your barangay hotline. This app does not replace emergency calls.',
  msg_p1: 'Help is on the way', msg_p2: 'Report received, agency notified', msg_p3: 'Report logged',
  msg_p4: 'Thank you for reporting',
  msg_review: 'Report received. A barangay official is reviewing it.',
  msg_offline: 'Saved on your device. It will be sent when you are back online.',
  msg_error: 'Something went wrong. Please try again.',
  new_report: 'New report', see_status: 'See status',
  track_title: 'My reports', track_empty: 'No reports yet on this device.',
  track_queued: 'waiting to send', track_loading: 'Loading…',
  status_submitted: 'Submitted', status_classified: 'Classified', status_agency_notified: 'Agency notified',
  status_acknowledged: 'Acknowledged', status_en_route: 'En route', status_on_scene: 'On scene',
  status_resolved: 'Resolved',
  login_title: 'Sign in', signup_title: 'Create citizen account', email: 'Email', password: 'Password',
  full_name: 'Full name', login: 'Sign in', signup: 'Sign up',
  to_signup: 'No account? Create one', to_login: 'Have an account? Sign in',
  guest_note: 'You can report without an account. Sign in only to keep your reports across devices.',
  demo_title: 'Demo accounts',
  confirm_email: 'Account created. Check your email to confirm, then sign in.',
  language: 'Language',
  privacy_title: 'Privacy & data policy',
}

type Dict = typeof en
type Partials = Partial<Dict>

const ceb: Partials = {
  tagline: 'Pagreport sa insidente sa barangay',
  nav_report: 'Mag-report', nav_track: 'Akong mga report', nav_login: 'Pag-sign in', nav_logout: 'Pag-sign out',
  nav_privacy: 'Pribasiya',
  sos_hint: 'I-tap kung emerhensya', sos_title: 'Ipadala ang emergency SOS', sos_photo: 'Kuhaa og litrato',
  sos_send: 'Ipadala ang SOS karon',
  sos_note: 'Ipadala uban ang imong lokasyon. Makatabang ang litrato apan dili kinahanglan.',
  cancel: 'Kanselahon',
  report_title: 'Pag-report sa insidente', photo_add: 'Dugangi og litrato', photo_change: 'Ilisan ang litrato',
  photo_take: 'Kuhaa og litrato', photo_upload: 'Mag-upload og litrato', photo_remove: 'Kuhaa',
  photo_error: 'Dili mabasa kini nga litrato. Sulayi ang JPG o PNG.',
  desc_label: 'Unsay nahitabo?', desc_ph: 'Ihulagway ang nahitabo (English, Bisaya, o Tagalog)',
  type_label: 'Klase sa insidente',
  type_fire: 'Sunog', type_medical: 'Medikal', type_disaster: 'Katalagman', type_crime: 'Krimen',
  type_disturbance: 'Kasaba/Gubot', type_other: 'Uban pa',
  inprog_label: 'Nahitabo ba kini karon?', yes: 'Oo', no: 'Dili',
  inprog_required: 'Palihug ingna kung nahitabo ba kini karon.',
  loc_label: 'Lokasyon', loc_getting: 'Gikuha ang imong lokasyon…',
  loc_fail: 'Dili makuha ang lokasyon. I-tap ang mapa aron ibutang ang pin.',
  loc_hint: 'I-tap ang mapa aron ibalhin ang pin', purok_label: 'Purok / Sitio (kapilian)',
  anon_label: 'Mag-report nga walay ngalan',
  submit: 'Ipadala ang report', submitting: 'Gipadala…',
  need_input: 'Pagdugang og litrato o deskripsyon.',
  disclaimer: 'Kung peligro sa kinabuhi, tawag usab sa 911 o sa hotline sa imong barangay. Dili ilisan sa app kini ang tawag sa emerhensya.',
  msg_p1: 'Moabot na ang tabang', msg_p2: 'Nadawat ang report, gipahibalo na ang ahensya',
  msg_p3: 'Natala na ang report', msg_p4: 'Salamat sa imong report',
  msg_review: 'Nadawat ang report. Gisusi kini sa opisyal sa barangay.',
  msg_offline: 'Gitipigan sa imong device. Ipadala kini kung adunay koneksyon na.',
  msg_error: 'Adunay sayop. Sulayi pag-usab.',
  new_report: 'Bag-ong report', see_status: 'Tan-awa ang status',
  track_title: 'Akong mga report', track_empty: 'Wala pay report niining device.',
  track_queued: 'naghulat ipadala', track_loading: 'Nagkarga…',
  status_submitted: 'Gipadala', status_classified: 'Nasuri', status_agency_notified: 'Gipahibalo ang ahensya',
  status_acknowledged: 'Gidawat', status_en_route: 'Padulong na', status_on_scene: 'Anaa na sa lugar',
  status_resolved: 'Nasulbad',
  login_title: 'Pag-sign in', signup_title: 'Paghimo og account', email: 'Email', password: 'Password',
  full_name: 'Tibuok nga ngalan', login: 'Sign in', signup: 'Sign up',
  to_signup: 'Wala pay account? Paghimo', to_login: 'Naa nay account? Sign in',
  guest_note: 'Makareport ka bisan walay account. Mag-sign in lang aron magamit ang imong mga report sa lain nga device.',
  language: 'Pinulongan',
}

const tl: Partials = {
  tagline: 'Pag-uulat ng insidente sa barangay',
  nav_report: 'Mag-ulat', nav_track: 'Mga ulat ko', nav_login: 'Mag-sign in', nav_logout: 'Mag-sign out',
  nav_privacy: 'Privacy',
  sos_hint: 'I-tap kung emergency', sos_title: 'Magpadala ng emergency SOS', sos_photo: 'Kumuha ng larawan',
  sos_send: 'Ipadala ang SOS ngayon',
  sos_note: 'Ipapadala kasama ang iyong lokasyon. Nakakatulong ang larawan ngunit opsyonal.',
  cancel: 'Kanselahin',
  report_title: 'Mag-ulat ng insidente', photo_add: 'Magdagdag ng larawan', photo_change: 'Palitan ang larawan',
  photo_take: 'Kumuha ng larawan', photo_upload: 'Mag-upload ng larawan', photo_remove: 'Alisin',
  photo_error: 'Hindi mabasa ang larawang ito. Subukan ang JPG o PNG.',
  desc_label: 'Ano ang nangyari?', desc_ph: 'Ilarawan ang nangyari (English, Bisaya, o Tagalog)',
  type_label: 'Uri ng insidente',
  type_fire: 'Sunog', type_medical: 'Medikal', type_disaster: 'Sakuna', type_crime: 'Krimen',
  type_disturbance: 'Gulo/Ingay', type_other: 'Iba pa',
  inprog_label: 'Nangyayari ba ito ngayon?', yes: 'Oo', no: 'Hindi',
  inprog_required: 'Pakisabi kung nangyayari ba ito ngayon.',
  loc_label: 'Lokasyon', loc_getting: 'Kinukuha ang iyong lokasyon…',
  loc_fail: 'Hindi makuha ang lokasyon. I-tap ang mapa para ilagay ang pin.',
  loc_hint: 'I-tap ang mapa para ilipat ang pin', purok_label: 'Purok / Sitio (opsyonal)',
  anon_label: 'Mag-ulat nang hindi nagpapakilala',
  submit: 'Ipadala ang ulat', submitting: 'Ipinapadala…',
  need_input: 'Magdagdag ng larawan o paglalarawan.',
  disclaimer: 'Kung nakamamatay ang sitwasyon, tumawag din sa 911 o sa hotline ng inyong barangay. Hindi pinapalitan ng app na ito ang tawag sa emergency.',
  msg_p1: 'Papunta na ang tulong', msg_p2: 'Natanggap ang ulat, naabisuhan na ang ahensya',
  msg_p3: 'Naitala na ang ulat', msg_p4: 'Salamat sa iyong ulat',
  msg_review: 'Natanggap ang ulat. Sinusuri ito ng opisyal ng barangay.',
  msg_offline: 'Nai-save sa iyong device. Ipapadala kapag may koneksyon na.',
  msg_error: 'May nangyaring mali. Subukan muli.',
  new_report: 'Bagong ulat', see_status: 'Tingnan ang status',
  track_title: 'Mga ulat ko', track_empty: 'Wala pang ulat sa device na ito.',
  track_queued: 'naghihintay ipadala', track_loading: 'Naglo-load…',
  status_submitted: 'Naipadala', status_classified: 'Nasuri', status_agency_notified: 'Naabisuhan ang ahensya',
  status_acknowledged: 'Tinanggap', status_en_route: 'Papunta na', status_on_scene: 'Nasa lugar na',
  status_resolved: 'Nalutas',
  login_title: 'Mag-sign in', signup_title: 'Gumawa ng account', email: 'Email', password: 'Password',
  full_name: 'Buong pangalan', login: 'Sign in', signup: 'Sign up',
  to_signup: 'Walang account? Gumawa', to_login: 'May account na? Sign in',
  guest_note: 'Maaari kang mag-ulat nang walang account. Mag-sign in lang para magamit ang mga ulat mo sa ibang device.',
  language: 'Wika',
}

const DICTS: Record<Lang, Partials> = { en, ceb, tl }
export type TKey = keyof Dict

interface I18n { lang: Lang; setLang: (l: Lang) => void; t: (k: TKey) => string }
const Ctx = createContext<I18n>({ lang: 'en', setLang: () => {}, t: (k) => en[k] })

function initialLang(): Lang {
  try {
    const v = localStorage.getItem('tugon.lang')
    if (v === 'ceb' || v === 'tl' || v === 'en') return v
  } catch { /* storage unavailable */ }
  return 'en'
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(initialLang)
  const setLang = (l: Lang) => {
    setLangState(l)
    try { localStorage.setItem('tugon.lang', l) } catch { /* ignore */ }
  }
  const t = (k: TKey) => DICTS[lang][k] ?? en[k]
  return <Ctx.Provider value={{ lang, setLang, t }}>{children}</Ctx.Provider>
}

export const useI18n = () => useContext(Ctx)
