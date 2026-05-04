import { readFile, writeFile } from 'fs/promises'
import { getTemplateStorePath } from './workspace'

export type ParamsTemplate = {
  name: string
  episodeId: string
  title: string
  premise: string
  panelTarget: number
  stylePreset: string
  consistencyLevel: 'low' | 'medium' | 'high'
  beatFramework: 'three-act' | 'five-act'
}

export async function readTemplates(): Promise<ParamsTemplate[]> {
  try {
    return JSON.parse(await readFile(getTemplateStorePath(), 'utf8')) as ParamsTemplate[]
  } catch {
    return []
  }
}

export async function writeTemplates(templates: ParamsTemplate[]) {
  await writeFile(getTemplateStorePath(), `${JSON.stringify(templates, null, 2)}\n`, 'utf8')
}
