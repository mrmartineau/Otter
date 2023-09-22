/* eslint-disable @typescript-eslint/no-unused-vars */
import ReactMarkdown from 'react-markdown';
import remarkBreaks from 'remark-breaks';
import remarkGfm from 'remark-gfm';
import remarkSqueezeParagraphs from 'remark-squeeze-paragraphs';
import { remarkTruncateLinks } from 'remark-truncate-links';

import { Code, CodeBlock } from './CodeBlock';
import { Link } from './Link';
import { Paragraph } from './Paragraph';

interface MarkdownProps {
  children: string;
}

export const Markdown = ({ children }: MarkdownProps) => (
  <div className="last:mb-0 text-step--1">
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
        p: ({ node, ...props }) => <Paragraph {...props} />,
        pre: ({ node, ...props }) => <CodeBlock {...props} />,
        code: ({ node, ...props }) => <Code {...props} />,
      }}
    >
      {children}
    </ReactMarkdown>
  </div>
);
