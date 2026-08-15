import { join } from 'node:path'

export function kernelRoot(activeWorkspace: string) { return join(activeWorkspace, '.mangaforge', 'kernel') }
export function kernelContractsDir(activeWorkspace: string) { return join(kernelRoot(activeWorkspace), 'contracts') }
export function kernelJobsDir(activeWorkspace: string) { return join(kernelRoot(activeWorkspace), 'jobs') }
export function kernelJobDir(activeWorkspace: string, jobId: string) { return join(kernelJobsDir(activeWorkspace), jobId) }
export function kernelVaultDir(activeWorkspace: string) { return join(kernelRoot(activeWorkspace), 'vault') }
export function kernelRuntimePath(activeWorkspace: string) { return join(kernelRoot(activeWorkspace), 'runtime.json') }
export function kernelProbePath(activeWorkspace: string) { return join(kernelRoot(activeWorkspace), 'probe.json') }
