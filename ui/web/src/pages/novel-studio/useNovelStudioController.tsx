import React, { useEffect, useMemo, useState } from 'react'
import { message } from 'antd'
import { useNavigate } from 'react-router-dom'
import apiClient from '../../api/client'
import {
  buildProjectLobbyDerived,
  buildProjectStats,
  filterProjectsBySearch,
  getReferenceProjects,
} from './studio-controller-derived'
import { useStudioKnowledgePanelsController } from './useStudioKnowledgePanelsController'

export function useNovelStudioController() {
  const navigate = useNavigate()
  const knowledgePanels = useStudioKnowledgePanelsController()
  const [projects, setProjects] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [wizardOpen, setWizardOpen] = useState(false)
  const [searchText, setSearchText] = useState('')

  const loadProjects = async () => {
    setLoading(true)
    try {
      const res = await apiClient.get('/novel/projects')
      setProjects(Array.isArray(res.data) ? res.data : [])
    } catch {
      message.error('无法加载小说项目')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadProjects()
  }, [])

  const handleWizardSuccess = (projectId: number) => {
    setWizardOpen(false)
    loadProjects()
    navigate(`/novel/workspace/${projectId}`)
  }

  const handleWizardCancel = () => {
    setWizardOpen(false)
  }

  const handleDeleteProject = async (projectId: number) => {
    try {
      await apiClient.delete(`/novel/projects/${projectId}`)
      message.success('项目已删除')
      await loadProjects()
    } catch {
      message.error('删除失败')
    }
  }

  const filteredProjects = useMemo(
    () => filterProjectsBySearch(projects, searchText),
    [projects, searchText],
  )

  const stats = useMemo(() => buildProjectStats(projects), [projects])
  const { lobbyModel, projectCardById } = useMemo(
    () => buildProjectLobbyDerived(projects),
    [projects],
  )


  return {
    navigate,
    projects,
    setProjects,
    loading,
    setLoading,
    wizardOpen,
    setWizardOpen,
    searchText,
    setSearchText,
    ...knowledgePanels,
    loadProjects,
    handleWizardSuccess,
    handleWizardCancel,
    handleDeleteProject,
    filteredProjects,
    stats,
    lobbyModel,
    projectCardById,
    getReferenceProjects,
  }
}
