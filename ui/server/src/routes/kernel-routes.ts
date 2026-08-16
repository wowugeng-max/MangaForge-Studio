import type { Express } from 'express'
import { deleteUserKernelContract, loadKernelContracts, saveUserKernelContract } from '../kernel/contracts/store'
import { loadKernelProbe, runKernelProbe } from '../kernel/probe'
import { checkKernelBinary, loadKernelRuntime } from '../kernel/runtime'

export type KernelRoutesDeps = { getWorkspace: () => string }

export function registerKernelRoutes(app: Express, deps: KernelRoutesDeps) {
  app.get('/api/kernel/contracts', async (_req, res) => {
    try {
      const workspace = deps.getWorkspace()
      const runtime = loadKernelRuntime(workspace)
      const binary = await checkKernelBinary(runtime)
      const { contracts, errors } = loadKernelContracts(workspace)
      const probe = loadKernelProbe(workspace)
      const annotate = (view: any) => {
        let implemented = view.implemented
        let reason: string | undefined = implemented ? undefined : 'CAPABILITY_PENDING'
        if (probe && typeof probe.skills === 'object' && !probe.skills.ok && view.projection.mounts.includes('skill_tree')) {
          implemented = false; reason = 'SKILLS_PROBE_FAILED'
        }
        if (probe && typeof probe.agents_spawn === 'object' && !probe.agents_spawn.ok && view.gates.includes('require_reviewer_agents')) {
          implemented = false; reason = 'AGENTS_PROBE_FAILED'
        }
        return { ...view, implemented, ...(reason ? { implemented_reason: reason } : {}) }
      }
      res.json({
        ok: true,
        runtime: binary.ok
          ? { available: true, version: binary.version, supports_chat_wire_api: runtime.supports_chat_wire_api }
          : { available: false, message: binary.message, supports_chat_wire_api: runtime.supports_chat_wire_api },
        contracts: contracts.map(({ builtin, implemented, id, label, capability, ...rest }) => annotate({ id, label, capability, builtin, implemented, ...rest })),
        errors,
      })
    } catch (error: any) {
      res.status(500).json({ error: String(error?.message || error) })
    }
  })

  app.post('/api/kernel/contracts', (req, res) => {
    const result = saveUserKernelContract(deps.getWorkspace(), req.body)
    if (!result.ok) return res.status(result.status).json({ error: 'contract rejected', code: result.code, details: result.errors || [] })
    res.json({ ok: true, contract: result.contract })
  })

  app.delete('/api/kernel/contracts/:id', (req, res) => {
    const result = deleteUserKernelContract(deps.getWorkspace(), String(req.params?.id || ''))
    if (!result.ok) return res.status(result.status).json({ error: 'contract not deletable', code: result.code })
    res.json({ ok: true })
  })

  app.post('/api/kernel/runtime/probe', async (req, res) => {
    try {
      const modelId = Number((req as any).body?.model_id || 0) || undefined
      res.json({ ok: true, probe: await runKernelProbe(deps.getWorkspace(), { modelId }) })
    } catch (error: any) {
      res.status(500).json({ error: String(error?.message || error) })
    }
  })

  app.get('/api/kernel/runtime', async (_req, res) => {
    const workspace = deps.getWorkspace()
    const runtime = loadKernelRuntime(workspace)
    const binary = await checkKernelBinary(runtime)
    res.json({
      ok: true,
      runtime: binary.ok
        ? { available: true, version: binary.version, supports_chat_wire_api: runtime.supports_chat_wire_api }
        : { available: false, message: binary.message, supports_chat_wire_api: runtime.supports_chat_wire_api },
      probe: loadKernelProbe(workspace),
    })
  })
}
