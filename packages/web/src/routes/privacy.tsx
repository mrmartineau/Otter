import { createFileRoute } from '@tanstack/react-router'
import { Container } from '@/components/Container'
import { PublicLayout } from '@/components/PublicLayout'

export const Route = createFileRoute('/privacy')({
  component: PrivacyPolicy,
  head: () => ({
    meta: [{ title: 'Privacy Policy — Otter' }],
  }),
})

function PrivacyPolicy() {
  return (
    <PublicLayout>
      <Container className="py-l flow">
        <h1>Privacy Policy</h1>
        <p>Last updated: February 2026</p>

        <h2>What data we collect</h2>
        <p>
          Otter accesses your YouTube liked videos via the Google API to sync
          them as bookmarks in your private Otter account. We store the video
          title, URL, and thumbnail for each liked video.
        </p>

        <h2>How we use your data</h2>
        <p>
          Your data is used solely to display your liked YouTube videos within
          your personal Otter account. Your data is not shared with other users
          or third parties.
        </p>

        <h2>Data storage</h2>
        <p>
          Your data is stored securely in our database. You can delete any
          synced bookmark at any time from within Otter.
        </p>

        <h2>Google API Services</h2>
        <p>
          Otter's use and transfer of information received from Google APIs
          adheres to the{' '}
          <a
            href="https://developers.google.com/terms/api-services-user-data-policy"
            target="_blank"
            rel="noopener noreferrer"
            className="underline"
          >
            Google API Services User Data Policy
          </a>
          , including the Limited Use requirements.
        </p>

        <h2>Contact</h2>
        <p>
          If you have questions about this privacy policy, please contact{' '}
          <a href="mailto:hi@zander.wtf" className="underline">
            hi@zander.wtf
          </a>
          .
        </p>
      </Container>
    </PublicLayout>
  )
}
