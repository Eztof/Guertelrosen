import { useState, useRef } from 'react'
import { Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { mapService } from '@/services/map.service'
import { assetService } from '@/services/asset.service'
import { useWorld } from '@/hooks/useWorld'
import { Plus, Map, Upload } from 'lucide-react'
import PageHeader from '@/components/ui/PageHeader'
import { LoadingScreen } from '@/components/ui/Spinner'
import Modal from '@/components/ui/Modal'
import toast from 'react-hot-toast'

export default function MapsPage({ worldId }: { worldId: string }) {
  const { canEdit } = useWorld()
  const qc = useQueryClient()
  const fileRef = useRef<HTMLInputElement>(null)
  const [showCreate, setShowCreate] = useState(false)
  const [title, setTitle] = useState('')
  const [uploading, setUploading] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)

  const { data: maps, isLoading } = useQuery({
    queryKey: ['maps', worldId],
    queryFn: () => mapService.listMaps(worldId),
  })

  const handleCreate = async () => {
    if (!title || !selectedFile) return
    setUploading(true)
    try {
      const asset = await assetService.uploadFile(worldId, selectedFile)
      await mapService.createMap(worldId, title, asset.path)
      toast.success('Karte erstellt!')
      qc.invalidateQueries({ queryKey: ['maps', worldId] })
      setShowCreate(false)
      setTitle('')
      setSelectedFile(null)
    } catch (e: unknown) {
      toast.error((e as Error).message)
    } finally {
      setUploading(false)
    }
  }

  if (isLoading) return <LoadingScreen />

  return (
    <div>
      <PageHeader title="Karten" subtitle={`${maps?.length ?? 0} Karten`}
        actions={canEdit ? (
          <button onClick={() => setShowCreate(true)} className="btn-primary">
            <Plus size={16} /> Karte hochladen
          </button>
        ) : undefined}
      />

      <div className="p-6">
        {maps && maps.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {maps.map(map => {
              const imageUrl = assetService.getPublicUrl(map.image_path)
              return (
                <Link key={map.id} to={`/maps/${map.id}`}
                  className="card overflow-hidden hover:border-surface-400 transition-colors group">
                  {/* Fixed-size container with CSS object-fit - no full image download needed by browser */}
                  <div className="aspect-video bg-surface-700 overflow-hidden relative">
                    <img
                      src={imageUrl}
                      alt={map.title}
                      width={400}
                      height={225}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      loading="lazy"
                      decoding="async"
                      style={{ contentVisibility: 'auto' }}
                    />
                  </div>
                  <div className="p-3">
                    <div className="font-medium text-slate-100">{map.title}</div>
                    {map.visibility === 'gm' && (
                      <span className="badge bg-red-900/50 text-red-400 text-xs mt-1">Nur GM</span>
                    )}
                  </div>
                </Link>
              )
            })}
          </div>
        ) : (
          <div className="text-center py-16 text-slate-400">
            <Map size={48} className="mx-auto mb-4 opacity-30" />
            <p>Noch keine Karten. Lade eine Karte hoch!</p>
          </div>
        )}
      </div>

      <Modal title="Neue Karte hochladen" open={showCreate} onClose={() => setShowCreate(false)}>
        <div className="space-y-4">
          <div>
            <label className="label">Name</label>
            <input value={title} onChange={e => setTitle(e.target.value)} className="input" placeholder="z.B. Aventurien Übersicht" />
          </div>
          <div>
            <label className="label">Kartenbild</label>
            <div className="border-2 border-dashed border-surface-500 rounded-lg p-6 text-center cursor-pointer hover:border-brand-500 transition-colors"
              onClick={() => fileRef.current?.click()}>
              {selectedFile ? (
                <p className="text-slate-300">{selectedFile.name}</p>
              ) : (
                <div className="text-slate-400">
                  <Upload size={24} className="mx-auto mb-2" />
                  <p>Klicken zum Hochladen (PNG, JPG, WebP)</p>
                </div>
              )}
            </div>
            <input ref={fileRef} type="file" accept="image/*" className="hidden"
              onChange={e => setSelectedFile(e.target.files?.[0] ?? null)} />
          </div>
          <div className="flex justify-end gap-2">
            <button onClick={() => setShowCreate(false)} className="btn-secondary">Abbrechen</button>
            <button onClick={handleCreate} disabled={!title || !selectedFile || uploading} className="btn-primary">
              {uploading ? 'Hochladen…' : 'Erstellen'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
