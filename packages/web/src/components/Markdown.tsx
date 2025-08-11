import throttle from 'lodash.throttle'
import { useEffect, useRef, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkBreaks from 'remark-breaks'
import remarkGfm from 'remark-gfm'
import remarkSqueezeParagraphs from 'remark-squeeze-paragraphs'
import { remarkTruncateLinks } from 'remark-truncate-links'

import { useToggle } from '../hooks/useToggle'
import { Button } from './Button'
import { Code, CodeBlock } from './CodeBlock'
import { Link } from './Link'
import './Markdown.css'
import { Paragraph } from './Paragraph'

interface MarkdownProps {
  children: string
  preventClamping?: boolean
}

export const Markdown = ({
  children,
  preventClamping = false,
}: MarkdownProps) => {
  const contentRef = useRef<HTMLDivElement>(null)
  const [isClamped, setClamped] = useState(false)
  const [isExpanded, toggleExpanded] = useToggle(preventClamping)

  useEffect(() => {
    function handleResize() {
      if (contentRef && contentRef.current && !preventClamping) {
        setClamped(
          contentRef.current.scrollHeight > contentRef.current.clientHeight,
        )
      }
    }
    if (!preventClamping) {
      handleResize()
    }
    window.addEventListener('resize', throttle(handleResize, 300))
    return () => window.removeEventListener('resize', handleResize)
  }, [preventClamping])

  return (
    <div>
      <article
        ref={contentRef}
        className={`markdown flow last:mb- text-step--1 ${
          isExpanded ? 'line-clamp-none' : 'line-clamp-5'
        }`}
      >
        <ReactMarkdown
          remarkPlugins={[
            remarkSqueezeParagraphs,
            remarkBreaks,
            remarkGfm,
            remarkTruncateLinks,
          ]}
          components={{
            // @ts-ignore
            a: ({ node, ...props }) => <Link variant="accent" {...props} />,
            code: ({ node, ...props }) => <Code {...props} />,
            p: ({ node, ...props }) => <Paragraph {...props} />,
            pre: ({ node, ...props }) => <CodeBlock {...props} />,
          }}
        >
          {children}
        </ReactMarkdown>
      </article>
      {isClamped && !preventClamping ? (
        <div className="mt-sm">
          <Button variant="ghost" size="2xs" onClick={() => toggleExpanded()}>
            {isExpanded ? 'See less…' : 'See more…'}
          </Button>
        </div>
      ) : null}
    </div>
  )
}
