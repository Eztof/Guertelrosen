import { useEditor, EditorContent, BubbleMenu } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import ImageExtension from '@tiptap/extension-image'
import LinkExtension from '@tiptap/extension-link'
import Placeholder from '@tiptap/extension-placeholder'
import Table from '@tiptap/extension-table'
import TableRow from '@tiptap/extension-table-row'
import TableHeader from '@tiptap/extension-table-header'
import TableCell from '@tiptap/extension-table-cell'
import { useEffect, useCallback, useRef, useState } from 'react'
import {
  Bold, Italic, Code, Heading2, Heading3, List, ListOrdered,
  Quote, Minus, Link2, Image, Upload, Table as TableIcon,
  Eye, EyeOff, Undo, Redo
} from 'lucide-react'
import { assetService } from '@/services/asset.service'
import { useWorld } from '@/hooks/useWorld'
import toast from 'react-hot-toast'

interface RichEditorProps {
  content?: object | null
  onChange?: (json: object, text: string) => void
  readonly?: boolean
  placeholder?: string
  worldId?: string
  articleTitles?: { title: string; slug: string }[]
}

/**
 * Check if a content_json value is a valid TipTap/ProseMirror document.
 * Returns the content if valid, or undefined if empty/invalid.
 */
function sanitizeContent(content: object | null | undefined): object | undefined {
  if (!content) return undefined
  // An empty object {} is not a valid ProseMirror doc
  if (typeof content === 'object' && Object.keys(content).length === 0) return undefined
  // Must have a 'type' property to be a valid ProseMirror node
  if (!(content as any).type) return undefined
  return content
}

export default function RichEditor({
  content, onChange, readonly = false, placeholder = 'Beginne zu schreiben…',
  worldId, articleTitles = []
}: RichEditorProps) {
  const { worldId: ctxWorldId } = useWorld()
  const effectiveWorldId = worldId || ctxWorldId
  const fileRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [showLinkDialog, setShowLinkDialog] = useState(false)
  const [linkUrl, setLinkUrl] = useState('')
  const [internalLinkQuery, setInternalLinkQuery] = useState('')
  const [showInternalPicker, setShowInternalPicker] = useState(false)

  const safeContent = sanitizeContent(content)

  const editor = useEditor({
    extensions: [
      StarterKit,
      ImageExtension.configure({ inline: false, allowBase64: true }),
      LinkExtension.configure({ openOnClick: false, HTMLAttributes: { class: 'internal-link' } }),
      Placeholder.configure({ placeholder }),
      Table.configure({ resizable: true }),
      TableRow,
      TableHeader,
      TableCell,
    ],
    content: safeContent,
    editable: !readonly,
    onUpdate: ({ editor }) => {
      if (onChange) {
        const json = editor.getJSON()
        const text = editor.getText()
        onChange(json, text)
      }
    },
  })

  useEffect(() => {
    if (editor && safeContent && JSON.stringify(editor.getJSON()) !== JSON.stringify(safeContent)) {
      editor.commands.setContent(safeContent as object)
    }
  }, []) // only on mount

  const handleImageUpload = useCallback(async (file: File) => {
    if (!effectiveWorldId) return
    setUploading(true)
    try {
      const asset = await assetService.uploadFile(effectiveWorldId, file)
      editor?.chain().focus().setImage({ src: asset.publicUrl, alt: file.name }).run()
    } catch (e) {
      toast.error('Upload fehlgeschlagen')
    } finally {
      setUploading(false)
    }
  }, [editor, effectiveWorldId])

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) handleImageUpload(file)
    e.target.value = ''
  }

  const insertInternalLink = (title: string, slug: string) => {
    editor?.chain().focus().insertContent(`[[${title}]]`).run()
    setShowInternalPicker(false)
    setInternalLinkQuery('')
  }

  const insertCallout = (type: 'gm' | 'spoiler' | 'rule') => {
    const labels = { gm: '⚠️ GM-Info', spoiler: '🔮 Spoiler', rule: '📖 Regeltext' }
    editor?.chain().focus().insertContent(
      `<blockquote><p><strong>${labels[type]}</strong></p><p>Inhalt hier…</p></blockquote>`
    ).run()
  }

  const filteredTitles = articleTitles.filter(a =>
    a.title.toLowerCase().includes(internalLinkQuery.toLowerCase())
  ).slice(0, 8)

  if (readonly) {
    return (
      <div className="prose-content">
        <EditorContent editor={editor} />
      </div>
    )
  }

  return (
    <div className="border border-surface-500 rounded-xl overflow-hidden">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-1 px-3 py-2 bg-surface-700 border-b border-surface-500">
        <ToolBtn onClick={() => editor?.chain().focus().toggleBold().run()} active={editor?.isActive('bold')} title="Fett"><Bold size={15} /></ToolBtn>
        <ToolBtn onClick={() => editor?.chain().focus().toggleItalic().run()} active={editor?.isActive('italic')} title="Kursiv"><Italic size={15} /></ToolBtn>
        <ToolBtn onClick={() => editor?.chain().focus().toggleCode().run()} active={editor?.isActive('code')} title="Code"><Code size={15} /></ToolBtn>
        <div className="w-px h-5 bg-surface-500 mx-1" />
        <ToolBtn onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()} active={editor?.isActive('heading', { level: 2 })} title="H2"><Heading2 size={15} /></ToolBtn>
        <ToolBtn onClick={() => editor?.chain().focus().toggleHeading({ level: 3 }).run()} active={editor?.isActive('heading', { level: 3 })} title="H3"><Heading3 size={15} /></ToolBtn>
        <div className="w-px h-5 bg-surface-500 mx-1" />
        <ToolBtn onClick={() => editor?.chain().focus().toggleBulletList().run()} active={editor?.isActive('bulletList')} title="Liste"><List size={15} /></ToolBtn>
        <ToolBtn onClick={() => editor?.chain().focus().toggleOrderedList().run()} active={editor?.isActive('orderedList')} title="Nummeriert"><ListOrdered size={15} /></ToolBtn>
        <ToolBtn onClick={() => editor?.chain().focus().toggleBlockquote().run()} active={editor?.isActive('blockquote')} title="Zitat"><Quote size={15} /></ToolBtn>
        <ToolBtn onClick={() => editor?.chain().focus().setHorizontalRule().run()} title="Trennlinie"><Minus size={15} /></ToolBtn>
        <div className="w-px h-5 bg-surface-500 mx-1" />
        <ToolBtn onClick={() => {
          const url = window.prompt('URL:')
          if (url) editor?.chain().focus().setLink({ href: url }).run()
        }} active={editor?.isActive('link')} title="Link"><Link2 size={15} /></ToolBtn>
        {/* Internal link picker */}
        <div className="relative">
          <ToolBtn onClick={() => setShowInternalPicker(!showInternalPicker)} title="Internen Link einfügen [[…]]">
            <span className="font-mono text-xs">[[</span>
          </ToolBtn>
          {showInternalPicker && (
            <div className="absolute top-full left-0 mt-1 w-64 card shadow-xl z-50">
              <div className="p-2">
                <input
                  autoFocus
                  value={internalLinkQuery}
                  onChange={e => setInternalLinkQuery(e.target.value)}
                  placeholder="Artikelname suchen…"
                  className="input text-sm py-1.5"
                />
              </div>
              <div className="max-h-48 overflow-y-auto">
                {filteredTitles.map(a => (
                  <button key={a.slug} onClick={() => insertInternalLink(a.title, a.slug)}
                    className="w-full text-left px-3 py-2 text-sm hover:bg-surface-700 text-slate-300">
                    {a.title}
                  </button>
                ))}
                {filteredTitles.length === 0 && (
                  <div className="px-3 py-2 text-sm text-slate-500">Keine Treffer</div>
                )}
              </div>
            </div>
          )}
        </div>
        <div className="w-px h-5 bg-surface-500 mx-1" />
        <ToolBtn onClick={() => fileRef.current?.click()} title="Bild hochladen" disabled={uploading}>
          {uploading ? <span className="text-xs">…</span> : <Image size={15} />}
        </ToolBtn>
        <ToolBtn onClick={() => editor?.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()} title="Tabelle"><TableIcon size={15} /></ToolBtn>
        <div className="w-px h-5 bg-surface-500 mx-1" />
        {/* Callout buttons */}
        <ToolBtn onClick={() => insertCallout('gm')} title="GM-Info Box" className="text-amber-400">GM</ToolBtn>
        <ToolBtn onClick={() => insertCallout('spoiler')} title="Spoiler Box" className="text-purple-400">SP</ToolBtn>
        <ToolBtn onClick={() => insertCallout('rule')} title="Regeltext Box" className="text-blue-400">RL</ToolBtn>
        <div className="w-px h-5 bg-surface-500 mx-1" />
        <ToolBtn onClick={() => editor?.chain().focus().undo().run()} title="Rückgängig"><Undo size={15} /></ToolBtn>
        <ToolBtn onClick={() => editor?.chain().focus().redo().run()} title="Wiederholen"><Redo size={15} /></ToolBtn>
      </div>

      {/* Editor area */}
      <div className="p-4 min-h-[300px] bg-surface-800" onClick={() => editor?.commands.focus()}>
        <EditorContent editor={editor} />
      </div>

      <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
    </div>
  )
}

function ToolBtn({ onClick, active, title, children, disabled, className = '' }: {
  onClick?: () => void
  active?: boolean
  title?: string
  children: React.ReactNode
  disabled?: boolean
  className?: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      disabled={disabled}
      className={`p-1.5 rounded text-sm transition-colors disabled:opacity-40 ${
        active ? 'bg-brand-600 text-white' : 'text-slate-400 hover:bg-surface-600 hover:text-slate-200'
      } ${className}`}>
      {children}
    </button>
  )
}
