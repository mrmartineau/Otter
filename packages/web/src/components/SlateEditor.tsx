import isHotkey from 'is-hotkey'
import Prism from 'prismjs'
import 'prismjs/components/prism-bash'
import 'prismjs/components/prism-css'
import 'prismjs/components/prism-json'
import 'prismjs/components/prism-jsx'
import 'prismjs/components/prism-markdown'
import 'prismjs/components/prism-markup'
import 'prismjs/components/prism-python'
import 'prismjs/components/prism-tsx'
import 'prismjs/components/prism-typescript'
import 'prismjs/components/prism-yaml'
import { useCallback, useEffect, useMemo, useRef } from 'react'
import {
  type BaseEditor,
  createEditor,
  type Descendant,
  Editor,
  type NodeEntry,
  type Range,
  Element as SlateElement,
  Transforms,
} from 'slate'
import { type HistoryEditor, withHistory } from 'slate-history'
import {
  Editable,
  ReactEditor,
  type RenderElementProps,
  type RenderLeafProps,
  Slate,
  useSlateStatic,
  withReact,
} from 'slate-react'
import { cn } from '@/utils/classnames'
import './SlateEditor.css'

type Mark = 'bold' | 'italic' | 'code'
type ParagraphElement = { type: 'paragraph'; children: CustomText[] }
type CodeBlockElement = {
  type: 'code-block'
  language: string
  children: CustomText[]
}
type CustomElement = ParagraphElement | CodeBlockElement
type CustomText = {
  text: string
  bold?: boolean
  italic?: boolean
  code?: boolean
  // Prism token class, only present on decorated ranges
  token?: string
}

declare module 'slate' {
  interface CustomTypes {
    Editor: BaseEditor & ReactEditor & HistoryEditor
    Element: CustomElement
    Text: CustomText
  }
}

const SUPPORTED_LANGUAGES = [
  'plain',
  'bash',
  'css',
  'html',
  'json',
  'js',
  'jsx',
  'ts',
  'tsx',
  'markdown',
  'python',
  'yaml',
] as const

const LANGUAGE_ALIASES: Record<string, string> = {
  html: 'markup',
  js: 'javascript',
  sh: 'bash',
  shell: 'bash',
  ts: 'typescript',
  yml: 'yaml',
}

const HOTKEYS: Record<string, Mark> = {
  'mod+`': 'code',
  'mod+b': 'bold',
  'mod+i': 'italic',
}

const isMarkActive = (editor: Editor, mark: Mark): boolean => {
  const marks = Editor.marks(editor) as Partial<Record<Mark, boolean>> | null
  return marks ? marks[mark] === true : false
}

const toggleMark = (editor: Editor, mark: Mark) => {
  if (isMarkActive(editor, mark)) {
    Editor.removeMark(editor, mark)
  } else {
    Editor.addMark(editor, mark, true)
  }
}

const isCodeBlockActive = (editor: Editor): boolean => {
  const [match] = Editor.nodes(editor, {
    match: (n) => SlateElement.isElement(n) && n.type === 'code-block',
  })
  return !!match
}

const toggleCodeBlock = (editor: Editor) => {
  if (isCodeBlockActive(editor)) {
    Transforms.setNodes(
      editor,
      { type: 'paragraph' } as Partial<CustomElement>,
      {
        match: (n) => SlateElement.isElement(n) && n.type === 'code-block',
      },
    )
    return
  }
  Transforms.setNodes(
    editor,
    { language: 'plain', type: 'code-block' } as Partial<CustomElement>,
    {
      match: (n) => SlateElement.isElement(n) && n.type === 'paragraph',
    },
  )
}

const serializeLeaf = (leaf: CustomText): string => {
  let text = leaf.text
  if (leaf.code) text = `\`${text}\``
  if (leaf.italic) text = `_${text}_`
  if (leaf.bold) text = `**${text}**`
  return text
}

const serializeBlock = (node: CustomElement): string => {
  if (node.type === 'code-block') {
    const raw = node.children.map((c) => c.text).join('')
    const lang = node.language && node.language !== 'plain' ? node.language : ''
    return `\`\`\`${lang}\n${raw}\n\`\`\``
  }
  return node.children.map(serializeLeaf).join('')
}

export const serialize = (value: Descendant[]): string => {
  return (value as CustomElement[]).map(serializeBlock).join('\n\n')
}

const INLINE_PATTERNS: { re: RegExp; mark: Mark }[] = [
  { mark: 'bold', re: /\*\*([^*]+?)\*\*/ },
  { mark: 'bold', re: /__([^_]+?)__/ },
  { mark: 'italic', re: /\*([^*\n]+?)\*/ },
  { mark: 'italic', re: /_([^_\n]+?)_/ },
  { mark: 'code', re: /`([^`\n]+?)`/ },
]

const parseInline = (text: string): CustomText[] => {
  if (!text) return [{ text: '' }]
  let earliest: { idx: number; match: RegExpExecArray; mark: Mark } | null =
    null
  for (const { re, mark } of INLINE_PATTERNS) {
    const m = re.exec(text)
    if (m && (earliest === null || m.index < earliest.idx)) {
      earliest = { idx: m.index, mark, match: m }
    }
  }
  if (!earliest) return [{ text }]
  const { idx, match, mark } = earliest
  const before = text.slice(0, idx)
  const after = text.slice(idx + match[0].length)
  const inner: CustomText = { text: match[1], [mark]: true }
  return [
    ...(before ? parseInline(before) : []),
    inner,
    ...(after ? parseInline(after) : []),
  ]
}

const FENCE_RE = /^```([\w-]*)\s*$/

export const deserialize = (value: string | null | undefined): Descendant[] => {
  const text = value ?? ''
  if (!text.trim()) {
    return [{ children: [{ text: '' }], type: 'paragraph' }]
  }

  const lines = text.split('\n')
  const blocks: CustomElement[] = []
  let i = 0
  let proseBuffer: string[] = []

  const flushProse = () => {
    if (!proseBuffer.length) return
    const joined = proseBuffer.join('\n').replace(/^\n+|\n+$/g, '')
    proseBuffer = []
    if (!joined) return
    for (const para of joined.split(/\n{2,}/)) {
      blocks.push({ children: parseInline(para), type: 'paragraph' })
    }
  }

  while (i < lines.length) {
    const fence = lines[i].match(FENCE_RE)
    if (fence) {
      flushProse()
      const language = fence[1] || 'plain'
      const codeLines: string[] = []
      i++
      while (i < lines.length && !FENCE_RE.test(lines[i])) {
        codeLines.push(lines[i])
        i++
      }
      // Skip closing fence if present
      if (i < lines.length) i++
      blocks.push({
        children: [{ text: codeLines.join('\n') }],
        language,
        type: 'code-block',
      })
      continue
    }
    proseBuffer.push(lines[i])
    i++
  }
  flushProse()

  if (!blocks.length) {
    return [{ children: [{ text: '' }], type: 'paragraph' }]
  }
  return blocks
}

const resolvePrismLanguage = (lang: string) => {
  const key = LANGUAGE_ALIASES[lang] ?? lang
  return Prism.languages[key] ? key : null
}

const tokenLength = (token: string | Prism.Token): number => {
  if (typeof token === 'string') return token.length
  if (typeof token.content === 'string') return token.content.length
  if (Array.isArray(token.content)) {
    return token.content.reduce<number>((acc, t) => acc + tokenLength(t), 0)
  }
  return tokenLength(token.content)
}

const decorate = ([node, path]: NodeEntry): Range[] => {
  if (!SlateElement.isElement(node) || node.type !== 'code-block') return []
  const language = resolvePrismLanguage(node.language ?? 'plain')
  if (!language) return []
  const ranges: Range[] = []
  const text = node.children.map((c) => c.text).join('')
  const tokens = Prism.tokenize(text, Prism.languages[language])
  let start = 0
  for (const token of tokens) {
    const length = tokenLength(token)
    const end = start + length
    if (typeof token !== 'string') {
      ranges.push({
        anchor: { offset: start, path: [...path, 0] },
        focus: { offset: end, path: [...path, 0] },
        token: token.type,
      } as Range & { token: string })
    }
    start = end
  }
  return ranges
}

const CodeBlockElementComponent = ({
  attributes,
  children,
  element,
}: RenderElementProps & { element: CodeBlockElement }) => {
  const editor = useSlateStatic()
  return (
    <div
      {...attributes}
      className="slate-code-block"
      data-language={element.language}
    >
      <div contentEditable={false} className="slate-code-block-toolbar">
        <select
          aria-label="Code language"
          className="slate-code-block-lang"
          value={element.language}
          onChange={(event) => {
            const path = ReactEditor.findPath(editor, element)
            Transforms.setNodes(
              editor,
              { language: event.target.value } as Partial<CodeBlockElement>,
              { at: path },
            )
          }}
        >
          {SUPPORTED_LANGUAGES.map((lang) => (
            <option key={lang} value={lang}>
              {lang}
            </option>
          ))}
        </select>
      </div>
      <pre>
        <code className={`language-${element.language}`}>{children}</code>
      </pre>
    </div>
  )
}

const renderElement = (props: RenderElementProps) => {
  const { attributes, children, element } = props
  if (SlateElement.isElement(element) && element.type === 'code-block') {
    return (
      <CodeBlockElementComponent attributes={attributes} element={element}>
        {children}
      </CodeBlockElementComponent>
    )
  }
  return (
    <p {...attributes} className="slate-paragraph">
      {children}
    </p>
  )
}

const renderLeaf = ({ attributes, children, leaf }: RenderLeafProps) => {
  let node = children
  if (leaf.bold) node = <strong>{node}</strong>
  if (leaf.italic) node = <em>{node}</em>
  if (leaf.code) node = <code>{node}</code>
  const tokenClass = (leaf as CustomText).token
  return (
    <span
      {...attributes}
      className={tokenClass ? `token ${tokenClass}` : undefined}
    >
      {node}
    </span>
  )
}

interface MarkButtonProps {
  mark: Mark
  label: string
  editor: Editor
}

const MarkButton = ({ mark, label, editor }: MarkButtonProps) => {
  const active = isMarkActive(editor, mark)
  return (
    <button
      type="button"
      className={cn('slate-toolbar-btn', active && 'is-active')}
      aria-pressed={active}
      aria-label={label}
      onMouseDown={(e) => {
        e.preventDefault()
        toggleMark(editor, mark)
      }}
    >
      {label}
    </button>
  )
}

const CodeBlockButton = ({ editor }: { editor: Editor }) => {
  const active = isCodeBlockActive(editor)
  return (
    <button
      type="button"
      className={cn('slate-toolbar-btn', active && 'is-active')}
      aria-pressed={active}
      aria-label="Code block"
      onMouseDown={(e) => {
        e.preventDefault()
        toggleCodeBlock(editor)
      }}
    >
      {'{ }'}
    </button>
  )
}

export interface SlateEditorProps {
  id?: string
  name?: string
  value: string | null | undefined
  onChange: (value: string) => void
  onBlur?: () => void
  placeholder?: string
  className?: string
  autoFocus?: boolean
}

export const SlateEditor = ({
  id,
  name,
  value,
  onChange,
  onBlur,
  placeholder,
  className,
  autoFocus,
}: SlateEditorProps) => {
  const editor = useMemo(() => withHistory(withReact(createEditor())), [])
  // biome-ignore lint/correctness/useExhaustiveDependencies: initial value only
  const initialValue = useMemo(() => deserialize(value), [])

  const lastEmittedRef = useRef<string>(value ?? '')

  useEffect(() => {
    const incoming = value ?? ''
    if (incoming === lastEmittedRef.current) return
    lastEmittedRef.current = incoming
    editor.children = deserialize(incoming)
    Transforms.deselect(editor)
    editor.onChange()
  }, [value, editor])

  const handleChange = useCallback(
    (newValue: Descendant[]) => {
      const isAstChange = editor.operations.some(
        (op) => op.type !== 'set_selection',
      )
      if (!isAstChange) return
      const serialized = serialize(newValue)
      if (serialized !== lastEmittedRef.current) {
        lastEmittedRef.current = serialized
        onChange(serialized)
      }
    },
    [editor, onChange],
  )

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLDivElement>) => {
      for (const hotkey of Object.keys(HOTKEYS)) {
        if (isHotkey(hotkey, event.nativeEvent)) {
          event.preventDefault()
          toggleMark(editor, HOTKEYS[hotkey])
          return
        }
      }
      if (isHotkey('mod+shift+c', event.nativeEvent)) {
        event.preventDefault()
        toggleCodeBlock(editor)
        return
      }
      // Inside code-block: Enter inserts newline instead of splitting block
      if (event.key === 'Enter' && !event.shiftKey) {
        const [block] = Editor.nodes(editor, {
          match: (n) => SlateElement.isElement(n) && n.type === 'code-block',
        })
        if (block) {
          event.preventDefault()
          editor.insertText('\n')
        }
      }
    },
    [editor],
  )

  return (
    <div className={cn('slate-editor input-base focus', className)}>
      <Slate
        editor={editor}
        initialValue={initialValue}
        onChange={handleChange}
      >
        <div className="slate-toolbar" role="toolbar" aria-label="Formatting">
          <MarkButton mark="bold" label="B" editor={editor} />
          <MarkButton mark="italic" label="I" editor={editor} />
          <MarkButton mark="code" label="</>" editor={editor} />
          <CodeBlockButton editor={editor} />
        </div>
        <Editable
          id={id}
          data-name={name}
          className="slate-editable"
          placeholder={placeholder}
          decorate={decorate}
          renderElement={renderElement}
          renderLeaf={renderLeaf}
          onKeyDown={handleKeyDown}
          onBlur={onBlur}
          autoFocus={autoFocus}
          spellCheck
        />
      </Slate>
    </div>
  )
}

SlateEditor.displayName = 'SlateEditor'
