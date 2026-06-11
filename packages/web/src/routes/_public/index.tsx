import { ArrowRightIcon, ArrowUpRightIcon } from '@phosphor-icons/react'
import { useSuspenseQuery } from '@tanstack/react-query'
import { createFileRoute, redirect, useNavigate } from '@tanstack/react-router'
import { Link } from '@/components/Link'
import { PublicBookmarkItem } from '@/components/PublicBookmarkItem'
import type { Bookmark } from '@/types/db'
import { getRecentPublicBookmarksOptions } from '@/utils/fetching/recentPublicBookmarks'
import { useSession } from '../../components/AuthProvider'
import {
  CONTENT,
  ROUTE_HOME,
  ROUTE_RECENT,
  ROUTE_SIGNIN,
} from '../../constants'

const RECENT_PREVIEW_LIMIT = 5
const GITHUB_URL = 'https://github.com/mrmartineau/Otter'

export const Route = createFileRoute('/_public/')({
  component: Index,
  loader: async ({ context }) => {
    if (context.session !== null) {
      throw redirect({ to: ROUTE_HOME })
    }
    await context.queryClient.ensureQueryData(
      getRecentPublicBookmarksOptions({ limit: RECENT_PREVIEW_LIMIT }),
    )
  },
})

const chapters = [
  {
    features: [
      {
        description:
          'Save links, articles, videos and podcasts. Titles, descriptions and images are scraped for you.',
        title: 'Bookmarking',
      },
      {
        description:
          'A kanban board for movies, TV shows and games — from “one day” to “done”.',
        title: 'Media tracking',
      },
      {
        description:
          'Journals to jot down thoughts, track habits and keep a log of your online life.',
        title: 'Journalling',
      },
      {
        description:
          'Parse RSS feeds and pull rich metadata out of any URL you throw at it.',
        title: 'RSS & scraping',
      },
    ],
    numeral: 'I',
    title: 'Collect',
  },
  {
    features: [
      {
        description:
          'Tags, collections, stars and filters. File things the way your brain works.',
        title: 'Tags & collections',
      },
      {
        description:
          'Full-text search across everything you have ever saved. Nothing sinks to the bottom.',
        title: 'Search that finds it',
      },
      {
        description: 'Let AI rewrite scruffy titles and descriptions for you.',
        title: 'AI assist',
      },
      {
        description:
          'Dark and light mode that quietly follows your system preference.',
        title: 'Easy on the eyes',
      },
    ],
    numeral: 'II',
    title: 'Organise',
  },
  {
    features: [
      {
        description:
          'Native iOS share extension — save from anywhere on your phone.',
        title: 'In your pocket',
      },
      {
        description:
          'Chrome and Firefox extensions, a Raycast extension and a trusty bookmarklet.',
        title: 'In your browser',
      },
      {
        description:
          'A built-in MCP server, so your AI assistant can rummage through your bookmarks too.',
        title: 'In your AI tools',
      },
      {
        description:
          'Self-hosted on Cloudflare Workers with your own Postgres. Your data stays yours.',
        title: 'On your terms',
      },
    ],
    numeral: 'III',
    title: 'Everywhere',
  },
]

let featureCount = 0
const numberedChapters = chapters.map((chapter) => ({
  ...chapter,
  features: chapter.features.map((feature) => ({
    ...feature,
    number: String(++featureCount).padStart(2, '0'),
  })),
}))

const tickerItems = [
  'Bookmarks',
  'Full-text search',
  'Tags',
  'Collections',
  'Media tracking',
  'RSS',
  'Bluesky',
  'AI assist',
  'MCP server',
  'iOS app',
  'Extensions',
  'Self-hosted',
]
const tickerLine = tickerItems.map((item) => `${item} ✱`).join(' ')

function Index() {
  const navigate = useNavigate()
  const session = useSession()

  if (session) {
    navigate({ to: ROUTE_HOME })
  }

  const { data: recentBookmarks } = useSuspenseQuery(
    getRecentPublicBookmarksOptions({ limit: RECENT_PREVIEW_LIMIT }),
  )

  return (
    <>
      <section className="landing-hero landing-container">
        <p className="landing-kicker landing-mono">
          Field notes · a self-hosted bookmark manager &amp; media tracker
        </p>
        <h1 className="landing-display">
          Hold on to <em>the good stuff</em>.
        </h1>
        <p className="landing-lede">
          Otter is where your links, articles, videos and half-watched TV shows
          live. Save it, tag it, find it again — on your own infrastructure,
          with nobody reading over your shoulder.
        </p>
        <div className="landing-cta-row">
          <a href={ROUTE_SIGNIN} className="landing-btn landing-btn-primary">
            Start your collection
            <ArrowRightIcon weight="bold" width="16" height="16" />
          </a>
          <a
            href={GITHUB_URL}
            className="landing-btn"
            target="_blank"
            rel="noopener noreferrer"
          >
            Read the source
            <ArrowUpRightIcon weight="bold" width="16" height="16" />
          </a>
        </div>
        <p className="landing-aside">
          * Sea otters keep a favourite rock in a pouch under their arm. This is
          that, for the internet.
        </p>
        <div className="landing-stamp" aria-hidden="true">
          <svg viewBox="0 0 200 200" aria-hidden="true">
            <defs>
              <path
                id="landing-stamp-circle"
                d="M100,100 m-82,0 a82,82 0 1,1 164,0 a82,82 0 1,1 -164,0"
              />
            </defs>
            <text>
              <textPath href="#landing-stamp-circle">
                Save it · tag it · find it again ·
              </textPath>
            </text>
          </svg>
          <img src="/otter-logo.svg" alt="" />
        </div>
      </section>

      <div className="landing-ticker" aria-hidden="true">
        <div className="landing-ticker-track landing-mono">
          <span>{tickerLine}</span>
          <span>{tickerLine}</span>
        </div>
      </div>

      <section className="landing-container">
        <header className="landing-section-header">
          <p className="landing-kicker landing-mono">The field guide</p>
          <h2 className="landing-section-title">
            Everything a hoarder needs, nothing a landlord wants
          </h2>
        </header>
        {numberedChapters.map((chapter) => (
          <div className="landing-chapter" key={chapter.numeral}>
            <div className="landing-chapter-heading">
              <span className="landing-chapter-numeral" aria-hidden="true">
                {chapter.numeral}.
              </span>
              <h3 className="landing-chapter-title">{chapter.title}</h3>
            </div>
            <ol className="landing-entries">
              {chapter.features.map((feature) => (
                <li className="landing-entry" key={feature.title}>
                  <span className="landing-entry-num" aria-hidden="true">
                    {feature.number}
                  </span>
                  <h4>{feature.title}</h4>
                  <p>{feature.description}</p>
                </li>
              ))}
            </ol>
          </div>
        ))}
      </section>

      {recentBookmarks.data?.length ? (
        <section className="landing-clippings">
          <div className="landing-container">
            <header className="landing-section-header">
              <p className="landing-kicker landing-mono">Fresh catch</p>
              <h2 className="landing-section-title">Recently washed ashore</h2>
            </header>
            <div className="landing-clippings-grid">
              {recentBookmarks.data.map((item: Bookmark) => (
                <div className="landing-clipping" key={item.id}>
                  <PublicBookmarkItem {...item} />
                </div>
              ))}
            </div>
            <div className="landing-clippings-more">
              <Link href={ROUTE_RECENT} className="landing-btn">
                All public bookmarks
                <ArrowRightIcon weight="bold" width="16" height="16" />
              </Link>
            </div>
          </div>
        </section>
      ) : null}

      <section className="landing-final">
        <div className="landing-container">
          <h2 className="landing-final-title">
            Your shelf.
            <br />
            Your rules.
          </h2>
          <p>
            Run it yourself on Cloudflare Workers and Postgres, or just sign in
            and start saving. Either way, no algorithm gets a vote.
          </p>
          <a href={ROUTE_SIGNIN} className="landing-btn landing-btn-primary">
            {CONTENT.signInTitle}
            <ArrowRightIcon weight="bold" width="16" height="16" />
          </a>
        </div>
      </section>
    </>
  )
}
