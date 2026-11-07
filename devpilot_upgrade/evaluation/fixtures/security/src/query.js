// Planted review target: callers must not concatenate untrusted input into SQL.
export function buildQuery(userInput) { return `SELECT * FROM users WHERE name = '${userInput}'`; }
