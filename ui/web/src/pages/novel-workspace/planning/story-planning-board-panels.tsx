import React from 'react'
import type { StoryPlanningBoardPanelsProps } from './story-planning-board-types'
import { StoryPlanningOpsPanels } from './story-planning-board-panels-ops'
import { StoryPlanningAudiencePanels } from './story-planning-board-panels-audience'
import { StoryPlanningStoryPanels } from './story-planning-board-panels-story'

export type { StoryPlanningBoardLoadingKey, StoryPlanningBoardPanelsProps } from './story-planning-board-types'

export function StoryPlanningBoardPanels(props: StoryPlanningBoardPanelsProps) {
  return (
    <>
      <StoryPlanningOpsPanels {...props} />
      <StoryPlanningAudiencePanels {...props} />
      <StoryPlanningStoryPanels {...props} />
    </>
  )
}
