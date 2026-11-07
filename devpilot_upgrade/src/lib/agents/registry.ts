/** Canonical guild roster. The verifier is deliberately independent of the five core agents. */
export const GUILD_AGENTS = [
  { id: 'shogun', name: 'Shogun Planner', kind: 'core', responsibility: 'Requirements, acceptance criteria, reconnaissance synthesis, task delegation.' },
  { id: 'samurai', name: 'Samurai Developer', kind: 'core', responsibility: 'Context-aware implementation through guarded repository tools.' },
  { id: 'sentinel', name: 'Sentinel Tester', kind: 'core', responsibility: 'Syntax checks, controlled test execution, failure diagnosis.' },
  { id: 'shadow-reviewer', name: 'Shadow Reviewer', kind: 'core', responsibility: 'Independent correctness, maintainability, and regression review.' },
  { id: 'security-guardian', name: 'Security Guardian', kind: 'core', responsibility: 'Static security inspection and risk reporting.' },
  { id: 'imperial-verifier', name: 'Imperial Verifier', kind: 'independent', responsibility: 'Evidence-based acceptance verification and retry/approval/block routing.' }
] as const;

export const GUILD_CORE_AGENT_COUNT = GUILD_AGENTS.filter((agent) => agent.kind === 'core').length;
