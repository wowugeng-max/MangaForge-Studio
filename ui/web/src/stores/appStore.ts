import { create } from 'zustand'

export type AppState = {
  title: string
  premise: string
  panelTarget: number
  stylePreset: string
  consistencyLevel: 'low' | 'medium' | 'high'
  beatFramework: 'three-act' | 'five-act'
  premiseA: string
  premiseB: string
  rankInput: string
  setTitle: (value: string) => void
  setPremise: (value: string) => void
  setPanelTarget: (value: number) => void
  setStylePreset: (value: string) => void
  setConsistencyLevel: (value: 'low' | 'medium' | 'high') => void
  setBeatFramework: (value: 'three-act' | 'five-act') => void
  setPremiseA: (value: string) => void
  setPremiseB: (value: string) => void
  setRankInput: (value: string) => void
}

export const useAppStore = create<AppState>((set) => ({
  title: '',
  premise: '',
  panelTarget: 12,
  stylePreset: 'cinematic noir manga',
  consistencyLevel: 'high',
  beatFramework: 'three-act',
  premiseA: '',
  premiseB: '',
  rankInput: '',
  setTitle: (value) => set({ title: value }),
  setPremise: (value) => set({ premise: value }),
  setPanelTarget: (value) => set({ panelTarget: value }),
  setStylePreset: (value) => set({ stylePreset: value }),
  setConsistencyLevel: (value) => set({ consistencyLevel: value }),
  setBeatFramework: (value) => set({ beatFramework: value }),
  setPremiseA: (value) => set({ premiseA: value }),
  setPremiseB: (value) => set({ premiseB: value }),
  setRankInput: (value) => set({ rankInput: value }),
}))
