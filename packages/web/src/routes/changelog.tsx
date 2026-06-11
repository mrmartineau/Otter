import { createFileRoute } from '@tanstack/react-router'
import { format } from 'date-fns'
import { Container } from '@/components/Container'
import { Link } from '@/components/Link'
import { Markdown } from '@/components/Markdown'
import { PublicLayout } from '@/components/PublicLayout'
import changelogSource from '../../CHANGELOG.md?raw'

const REPO_URL = 'https://github.com/mrmartineau/Otter'

interface ChangelogRelease {
  tag: string
  version: string
  date: string | null
  url: string
  body: string
}

// CHANGELOG.md is maintained by semantic-release. Each release section
// starts with `# [tag](compare-url) (yyyy-MM-dd)` — or, for releases with
// nothing to compare against, `# tag (yyyy-MM-dd)`. Patch releases may use
// `##` instead of `#`.
function parseChangelog(source: string): ChangelogRelease[] {
  const sections = source
    .split(/^#{1,2} (?=\[|@|v?\d)/m)
    .filter((section) => section.trim())
  return sections.map((section) => {
    const newlineIndex = section.indexOf('\n')
    const header = (
      newlineIndex === -1 ? section : section.slice(0, newlineIndex)
    ).trim()
    const body = newlineIndex === -1 ? '' : section.slice(newlineIndex + 1)
    const linked = header.match(/^\[(.+?)\]\(.+?\)\s*\((.+)\)$/)
    const plain = header.match(/^(\S+)\s*\((.+)\)$/)
    const tag = linked?.[1] ?? plain?.[1] ?? header
    const versionMatch = tag.match(/v?(\d+\.\d+\.\d+\S*)$/)
    return {
      body: body.trim(),
      date: linked?.[2] ?? plain?.[2] ?? null,
      tag,
      url: `${REPO_URL}/releases/tag/${encodeURIComponent(tag)}`,
      version: versionMatch ? versionMatch[1] : tag,
    }
  })
}

const releases = parseChangelog(changelogSource)

export const Route = createFileRoute('/changelog')({
  component: ChangelogPage,
  head: () => ({
    meta: [{ title: 'Changelog — Otter' }],
  }),
})

function ChangelogPage() {
  return (
    <PublicLayout>
      <Container className="py-l flow">
        <h1>Changelog</h1>
        <p>
          New features, fixes and improvements to Otter. Also available as{' '}
          <Link variant="accent" href={`${REPO_URL}/releases`}>
            releases on GitHub
          </Link>
          .
        </p>

        {releases.map((release) => (
          <article key={release.tag} className="flow border-t pt-m">
            <header className="flex flex-wrap items-baseline gap-2xs">
              <h2>
                <Link variant="accent" href={release.url}>
                  v{release.version}
                </Link>
              </h2>
              {release.date ? (
                <time
                  dateTime={release.date}
                  className="text-step--1 opacity-70"
                >
                  {format(new Date(release.date), 'd MMMM yyyy')}
                </time>
              ) : null}
            </header>
            <Markdown preventClamping>{release.body}</Markdown>
          </article>
        ))}
      </Container>
    </PublicLayout>
  )
}
