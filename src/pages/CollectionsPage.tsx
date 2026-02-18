import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { collectionService } from '@/services/collection.service'
import { useWorld } from '@/hooks/useWorld'
import { Plus, FolderOpen, Folder, Edit2, Trash2, Check, X } from 'lucide-react'
import PageHeader from '@/components/ui/PageHeader'
import toast from 'react-hot-toast'
import Modal from '@/components/ui/Modal'

export default function CollectionsPage({ worldId }: { worldId: string }) {
  const { canEdit } = useWorld()
  const qc = useQueryClient()
  const [showCreate, setShowCreate] = useState(false)
  const [newName, setNewName] = useState('')
  const [newParent, setNewParent] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')

  const { data: collections } = useQuery({
    queryKey: ['collections', worldId],
    queryFn: () => collectionService.listCollections(worldId),
  })

  const createMutation = useMutation({
    mutationFn: () => collectionService.createCollection(worldId, newName, newParent || null),
    onSuccess: () => {
      toast.success('Sammlung erstellt')
      qc.invalidateQueries({ queryKey: ['collections', worldId] })
      setShowCreate(false)
      setNewName('')
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const updateMutation = useMutation({
    mutationFn: (id: string) => collectionService.updateCollection(id, { name: editName }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['collections', worldId] })
      setEditingId(null)
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => collectionService.deleteCollection(id),
    onSuccess: () => {
      toast.success('Sammlung gelöscht')
      qc.invalidateQueries({ queryKey: ['collections', worldId] })
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const roots = collections?.filter(c => !c.parent_id) ?? []

  return (
    <div>
      <PageHeader title="Sammlungen"
        actions={canEdit ? (
          <button onClick={() => setShowCreate(true)} className="btn-primary">
            <Plus size={16} /> Neue Sammlung
          </button>
        ) : undefined}
      />

      <div className="p-6">
        {roots.length > 0 ? (
          <div className="space-y-2">
            {roots.map(col => (
              <div key={col.id}>
                <CollectionRow
                  collection={col}
                  canEdit={canEdit}
                  editingId={editingId}
                  editName={editName}
                  setEditingId={setEditingId}
                  setEditName={setEditName}
                  onUpdate={id => updateMutation.mutate(id)}
                  onDelete={id => { if (confirm('Sammlung löschen? Artikel bleiben erhalten.')) deleteMutation.mutate(id) }}
                />
                {collections?.filter(c => c.parent_id === col.id).map(child => (
                  <CollectionRow
                    key={child.id}
                    collection={child}
                    indent
                    canEdit={canEdit}
                    editingId={editingId}
                    editName={editName}
                    setEditingId={setEditingId}
                    setEditName={setEditName}
                    onUpdate={id => updateMutation.mutate(id)}
                    onDelete={id => { if (confirm('Sammlung löschen?')) deleteMutation.mutate(id) }}
                  />
                ))}
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12 text-slate-400">
            Noch keine Sammlungen.
          </div>
        )}
      </div>

      <Modal title="Neue Sammlung" open={showCreate} onClose={() => setShowCreate(false)} size="sm">
        <form onSubmit={e => { e.preventDefault(); createMutation.mutate() }} className="space-y-4">
          <div>
            <label className="label">Name</label>
            <input value={newName} onChange={e => setNewName(e.target.value)} className="input" placeholder="Sammlungsname" required />
          </div>
          <div>
            <label className="label">Übergeordnete Sammlung (optional)</label>
            <select value={newParent} onChange={e => setNewParent(e.target.value)} className="input">
              <option value="">Keine (Hauptsammlung)</option>
              {collections?.filter(c => !c.parent_id).map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setShowCreate(false)} className="btn-secondary">Abbrechen</button>
            <button type="submit" disabled={createMutation.isPending} className="btn-primary">Erstellen</button>
          </div>
        </form>
      </Modal>
    </div>
  )
}

function CollectionRow({ collection, indent, canEdit, editingId, editName, setEditingId, setEditName, onUpdate, onDelete }: any) {
  const isEditing = editingId === collection.id
  return (
    <div className={`card px-4 py-3 flex items-center gap-3 ${indent ? 'ml-8' : ''}`}>
      {indent ? <Folder size={16} className="text-slate-500" /> : <FolderOpen size={16} className="text-brand-400" />}
      {isEditing ? (
        <input value={editName} onChange={e => setEditName(e.target.value)}
          className="input flex-1 py-1 text-sm" autoFocus />
      ) : (
        <Link to={`/articles?collection=${collection.id}`}
          className="flex-1 text-slate-200 hover:text-brand-300 transition-colors">
          {collection.name}
        </Link>
      )}
      {canEdit && (
        <div className="flex gap-1">
          {isEditing ? (
            <>
              <button onClick={() => onUpdate(collection.id)} className="btn-ghost p-1 text-emerald-400"><Check size={14} /></button>
              <button onClick={() => setEditingId(null)} className="btn-ghost p-1"><X size={14} /></button>
            </>
          ) : (
            <>
              <button onClick={() => { setEditingId(collection.id); setEditName(collection.name) }}
                className="btn-ghost p-1 opacity-0 group-hover:opacity-100 text-slate-400"><Edit2 size={14} /></button>
              <button onClick={() => onDelete(collection.id)}
                className="btn-ghost p-1 text-red-400"><Trash2 size={14} /></button>
            </>
          )}
        </div>
      )}
    </div>
  )
}
