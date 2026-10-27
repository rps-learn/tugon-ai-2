import { useI18n } from '../lib/i18n'

export default function PrivacyPage() {
  const { t } = useI18n()
  return (
    <article className="card stack prose">
      <h2>{t('privacy_title')}</h2>
      <h3>What we collect</h3>
      <p>Your report text, optional photo, GPS location, and whether the incident is happening now. If you sign in, your name and email are linked to your reports. Anonymous reports are not linked to any account.</p>
      <h3>How it is used</h3>
      <p>Reports are classified by an AI model (Google Gemini) to suggest a category, urgency and the responsible agency. The photo and text are sent to that service for classification. A barangay official can review and change any AI decision.</p>
      <h3>Who can see it</h3>
      <p>Each agency (BFP, ERUF, Barangay Police) only sees reports routed to it. The Barangay Official sees all reports. Other citizens never see your report.</p>
      <h3>Retention</h3>
      <p>Report data and photos are kept for 12 months for barangay records and DRRM planning, then deleted or anonymised. Anonymous reports contain no account link.</p>
      <h3>Exports</h3>
      <p>Exported statistics (CSV) must not be shared outside the barangay and city DRRM office. Photos and personal details must be removed before any public sharing.</p>
      <h3>Your rights</h3>
      <p>You may ask the Barangay Official to correct or delete your report and account, consistent with the Data Privacy Act of 2012 (RA 10173).</p>
      <p className="muted small">Student project: this policy is a template and should be reviewed by the barangay data protection officer before real-world use.</p>
    </article>
  )
}
