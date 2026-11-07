import type { RepositoryAnalysis } from '@/lib/types';

export type DeveloperTool = 'repository.search' | 'repository.read' | 'repository.edit' | 'terminal.test';
export interface ToolDecision { tool: DeveloperTool; reason: string; permission: 'read' | 'write' | 'execute'; }

/** Deterministic, inspectable tool policy; model output cannot expand this allowlist. */
export function selectDeveloperTools(request: string, analysis: RepositoryAnalysis, testExecutionEnabled = process.env.DEVPILOT_ENABLE_TEST_EXECUTION === 'true'): ToolDecision[] {
  const decisions: ToolDecision[] = [
    { tool: 'repository.search', reason: 'Locate request-related symbols and existing project conventions before editing.', permission: 'read' },
    { tool: 'repository.read', reason: `Read bounded context from ${analysis.entryPoints.length + analysis.importantFiles.length} identified entry/configuration files and relevant matches.`, permission: 'read' }
  ];
  if (request.trim()) decisions.push({ tool: 'repository.edit', reason: 'Apply only validated, repository-relative source edits after reconnaissance.', permission: 'write' });
  if (analysis.testFiles.length > 0 && testExecutionEnabled) {
    decisions.push({ tool: 'terminal.test', reason: 'Run the repository test command because tests were discovered and the operator explicitly enabled execution.', permission: 'execute' });
  } else {
    decisions.push({ tool: 'terminal.test', reason: analysis.testFiles.length ? 'Not selected for execution: test execution is disabled by the safe default policy.' : 'Not selected: reconnaissance found no recognized test files.', permission: 'execute' });
  }
  return decisions;
}
