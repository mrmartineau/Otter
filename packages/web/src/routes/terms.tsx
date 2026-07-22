import { createFileRoute } from '@tanstack/react-router'
import { Container } from '@/components/Container'
import { PublicLayout } from '@/components/PublicLayout'

export const Route = createFileRoute('/terms')({
  component: TermsOfService,
  head: () => ({
    meta: [{ title: 'Terms of Service — Otter' }],
  }),
})

function TermsOfService() {
  return (
    <PublicLayout>
      <Container className="py-l flow">
        <h1>Terms of Service</h1>
        <p>Last updated: February 2026</p>

        <h2>Acceptance of terms</h2>
        <p>
          By using Otter, you agree to these terms of service. If you do not
          agree, please do not use the application.
        </p>

        <h2>Description of service</h2>
        <p>
          Otter is a private bookmarking application. It includes an integration
          with YouTube via the Google API to sync your liked videos as
          bookmarks. This data is private to your account and is not shared with
          other users.
        </p>

        <h2>User responsibilities</h2>
        <p>
          You are responsible for maintaining the security of your account
          credentials. You agree not to misuse the service or use it for any
          unlawful purpose.
        </p>

        <h2>Limitation of liability</h2>
        <p>
          Otter is provided "as is" without warranties of any kind. We are not
          liable for any damages arising from the use of this service.
        </p>

        <h2>Changes to terms</h2>
        <p>
          We may update these terms from time to time. Continued use of Otter
          after changes constitutes acceptance of the new terms.
        </p>

        <h2>Contact</h2>
        <p>
          If you have questions about these terms, please contact{' '}
          <a href="mailto:hi@zander.wtf" className="underline">
            hi@zander.wtf
          </a>
          .
        </p>
      </Container>
    </PublicLayout>
  )
}
