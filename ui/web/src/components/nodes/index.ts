import './GenerateNode'
import './DisplayNode'
import './LoadAssetNode'
import './ComfyUIEngineNode'
import './GroupNode'
import { nodeRegistry } from '../../utils/nodeRegistry'

export const nodeTypes = nodeRegistry.getNodeTypes()
