import { createContext, useContext, ReactNode } from 'react'
import { useQuery } from '@tanstack/react-query'
import { worldService } from '@/services/world.service'
import type { WorldRole } from '@/types'

interface WorldContextType {
  worldId: string
  role: WorldRole | null
  isGm: boolean
  canEdit: boolean
}

const WorldContext = createContext<WorldContextType>({
  worldId: '',
  role: null,
  isGm: false,
  canEdit: false,
})

export function WorldProvider({ worldId, children }: { worldId: string; children: ReactNode }) {
  const { data: role } = useQuery({
    queryKey: ['world-role', worldId],
    queryFn: () => worldService.getUserRole(worldId),
    enabled: !!worldId,
  })

  const resolvedRole = role ?? null
  const isGm = resolvedRole === 'gm'
  const canEdit = resolvedRole === 'gm' || resolvedRole === 'editor'

  return (
    <WorldContext.Provider value={{ worldId, role: resolvedRole, isGm, canEdit }}>
      {children}
    </WorldContext.Provider>
  )
}

export function useWorld() {
  return useContext(WorldContext)
}
