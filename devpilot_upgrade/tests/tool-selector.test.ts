import { selectDeveloperTools } from '@/lib/services/tool-selector';
import type { RepositoryAnalysis } from '@/lib/types';

const analysis: RepositoryAnalysis = {
  repoId: 'r', name: 'fixture', fileCount: 4, totalBytes: 100, framework: 'Node', language: ['TypeScript'],
  packageManager: 'npm', entryPoints: ['src/index.ts'], testFiles: ['tests/index.test.ts'], importantFiles: ['package.json'],
  riskAreas: [], fileTree: [], analyzedAt: new Date(0).toISOString()
};

describe('developer tool selection', () => {
  it('selects repository tools and records why terminal execution is withheld by default', () => {
    const plan = selectDeveloperTools('Add a feature', analysis, false);
    expect(plan.map((item) => item.tool)).toEqual(['repository.search', 'repository.read', 'repository.edit', 'terminal.test']);
    expect(plan[3].reason).toMatch(/disabled/);
  });
  it('only authorizes the test tool when tests exist and the operator enabled execution', () => {
    const plan = selectDeveloperTools('Fix a bug', analysis, true);
    expect(plan[3].reason).toMatch(/explicitly enabled/);
    expect(plan.every((item) => ['read', 'write', 'execute'].includes(item.permission))).toBe(true);
  });
  it('does not recommend edits for an empty request', () => {
    expect(selectDeveloperTools(' ', analysis, false).some((item) => item.tool === 'repository.edit')).toBe(false);
  });
});
