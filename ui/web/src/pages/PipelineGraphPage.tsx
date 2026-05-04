import React from 'react'
import { Button, Card, Empty, Space, Typography } from 'antd'
import ReactFlow, { Background, Controls, MiniMap, ReactFlowProvider, useEdgesState, useNodesState } from 'reactflow'
import 'reactflow/dist/style.css'
import { useCanvasStore } from '../stores/canvasStore'
import { useGraphStore } from '../stores/graphStore'
import { nodeTypes } from '../components/nodes'

const { Text } = Typography

export function PipelineGraphPage() {
  return <PipelineGraphInner />
}

function PipelineGraphInner() {
  const { nodes, edges, onNodesChange, onEdgesChange, onConnect, setNodes, setEdges } = useCanvasStore()
  const { selectedNode, setSelectedNode, setSelectedEdge, clearSelection } = useGraphStore()
  const [rfNodes, setRfNodes, handleNodesChange] = useNodesState(nodes)
  const [rfEdges, setRfEdges, handleEdgesChange] = useEdgesState(edges)

  React.useEffect(() => setRfNodes(nodes), [nodes, setRfNodes])
  React.useEffect(() => setRfEdges(edges), [edges, setRfEdges])

  return (
    <Space direction="vertical" style={{ width: '100%' }} size={12}>
      <Card
        size="small"
        title="Pipeline Graph"
        extra={
          <Space>
            <Text type="secondary">选中节点：{selectedNode || '(none)'}</Text>
            <Button onClick={clearSelection}>清除选择</Button>
          </Space>
        }
      >
        <div style={{ height: 720, border: '1px solid #e5e7eb', borderRadius: 12, overflow: 'hidden' }}>
          {rfNodes.length === 0 ? (
            <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Empty description="还没有节点，去画布里添加一些节点吧" />
            </div>
          ) : (
            <ReactFlow
              nodes={rfNodes}
              edges={rfEdges}
              nodeTypes={nodeTypes}
              onNodesChange={(changes) => {
                handleNodesChange(changes)
                onNodesChange(changes)
              }}
              onEdgesChange={(changes) => {
                handleEdgesChange(changes)
                onEdgesChange(changes)
              }}
              onConnect={(connection) => onConnect(connection)}
              onNodeClick={(_, node) => setSelectedNode(node.id)}
              onEdgeClick={(_, edge) => setSelectedEdge(edge.id)}
              fitView
            >
              <Background />
              <Controls />
              <MiniMap />
            </ReactFlow>
          )}
        </div>
      </Card>
    </Space>
  )
}
