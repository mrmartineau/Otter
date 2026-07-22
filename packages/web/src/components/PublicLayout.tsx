import { ALLOW_SIGNUP, CONTENT, REPO_URL, ROUTE_SIGNIN } from '@/constants'
import { Link } from './Link'
import './PublicLayout.css'
import { Container } from './Container'

export const PublicLayout = ({ children }: { children: React.ReactNode }) => {
  return (
    <div className="public">
      <Container className="public-top">
        <Link href="/" className="public-wordmark">
          <img src="/otter-logo.svg" width="32" height="32" alt="" />
          {CONTENT.appName}
        </Link>
        <nav className="public-top-nav public-mono">
          <Link href={REPO_URL} target="_blank" rel="noopener noreferrer">
            GitHub
          </Link>
          <Link href={ROUTE_SIGNIN}>{CONTENT.signInTitle}</Link>
          {ALLOW_SIGNUP ? <Link to="/register">Register</Link> : null}
        </nav>
      </Container>

      {children}

      <Container className="public-footer">
        <span>
          Made by{' '}
          <a
            href="https://zander.wtf"
            target="_blank"
            rel="noopener noreferrer"
          >
            Zander Martineau
          </a>
        </span>
        <div className="flex flex-center gap-2xs">
          <Link href={REPO_URL} target="_blank" rel="noopener noreferrer">
            GitHub
          </Link>
          <Link href="/privacy">Privacy</Link>
          <Link href="/terms">Terms</Link>
          <Link href="/changelog">Changelog</Link>
        </div>
      </Container>
    </div>
  )
}
