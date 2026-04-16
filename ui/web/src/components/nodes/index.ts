import './LoadAssetNode'
import './GenerateNode'
import './DisplayNode'
import './ComfyUIEngineNode'
import './GroupNode'

import { nodeRegistry } from '../../utils/nodeRegistry'

export const nodeTypes = nodeRegistry.getNodeTypes()

export { default as LoadAssetNode } from './LoadAssetNode'
export { default as GenerateNode } from './GenerateNode'
export { default as DisplayNode } from './DisplayNode'
export { default as ComfyUIEngineNode } from './ComfyUIEngineNode'
export { default as GroupNode } from './GroupNode'
