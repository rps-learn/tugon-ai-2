import { Link } from 'react-router-dom'
import { useI18n } from '../lib/i18n'

export default function NotFound() {
  const { t } = useI18n()
  return (
    <section className="card stack">
      <h1>{t('nf_title')}</h1>
      <p>{t('nf_body')}</p>
      <Link className="btn big" to="/">{t('nf_cta')}</Link>
    </section>
  )
}
