import { GUILD_AGENTS, GUILD_CORE_AGENT_COUNT } from '@/lib/agents/registry';

describe('guild roster', () => {
  it('defines five core agents and a separate independent verifier', () => {
    expect(GUILD_CORE_AGENT_COUNT).toBe(5);
    expect(GUILD_AGENTS).toHaveLength(6);
    expect(GUILD_AGENTS.find((agent) => agent.id === 'imperial-verifier')?.kind).toBe('independent');
  });
});
