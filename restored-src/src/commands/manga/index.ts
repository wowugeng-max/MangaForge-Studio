import type { Command } from '../../commands.js'

const manga = {
  type: 'local',
  name: 'manga',
  description: 'Manage manga project workspace (init/status/export hints)',
  supportsNonInteractive: true,
  load: () => import('./manga.js'),
} satisfies Command

export default manga
