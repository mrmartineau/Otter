import isHotkey from 'is-hotkey'
import { useCallback, useEffect, useMemo, useRef } from 'react'
import {
  type BaseEditor,
  createEditor,
  type Descendant,
  Editor,
  Transforms,
} from 'slate'
import { type HistoryEditor, withHistory } from 'slate-history'
import {
  Editable,
  type ReactEditor,
  type RenderElementProps,
  type RenderLeafProps,
  Slate,
  withReact,
} from 'slate-react'
import { cn } from '@/utils/classnames'
import './SlateEditor.css'

type Mark = 'bold' | 'italic' | 'code'
type ParagraphElement = { type: 'paragraph'; children: CustomText[] }
type CustomElement = ParagraphElement
type CustomText = {
  text: string
  bold?: boolean
  italic?: boolean
  code?: boolean
}

declare module 'slate' {
  interface CustomTypes {
    Editor: BaseEditor & ReactEditor & HistoryEditor
    Element: CustomElement
    Text: CustomText
  }
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

const serializeLeaf = (leaf: CustomText): string => {
  let text = leaf.text
  if (leaf.code) text = `\`${text}\``
  if (leaf.italic) text = `_${text}_`
  if (leaf.bold) text = `**${text}**`
  return text
}

const serializeBlock = (node: CustomElement): string => {
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

export const deserialize = (value: string | null | undefined): Descendant[] => {
  const text = value ?? ''
  if (!text.trim()) {
    return [{ children: [{ text: '' }], type: 'paragraph' }]
  }
  const blocks = text.split(/\n{2,}/)
  return blocks.map<CustomElement>((block) => ({
    children: parseInline(block),
    type: 'paragraph',
  }))
}

const renderElement = (props: RenderElementProps) => {
  const { attributes, children } = props
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
  return <span {...attributes}>{node}</span>
}

interface ToolbarButtonProps {
  mark: Mark
  label: string
  editor: Editor
}

const ToolbarButton = ({ mark, label, editor }: ToolbarButtonProps) => {
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
          <ToolbarButton mark="bold" label="B" editor={editor} />
          <ToolbarButton mark="italic" label="I" editor={editor} />
          <ToolbarButton mark="code" label="</>" editor={editor} />
        </div>
        <Editable
          id={id}
          data-name={name}
          className="slate-editable"
          placeholder={placeholder}
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
