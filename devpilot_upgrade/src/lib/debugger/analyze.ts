import ts from 'typescript';

export type DebugStep = { id: string; line: number; kind: string; label: string; detail: string; branch?: string };
export type DebugFinding = { line: number; severity: 'error' | 'warning' | 'info'; title: string; explanation: string; recommendation: string; confidence: 'verified' | 'heuristic' };
export type DebugReport = { steps: DebugStep[]; findings: DebugFinding[]; language: 'javascript' | 'typescript'; mode: 'static'; summary: string };

/** Static inspection only. Does not execute submitted code or invent runtime variable values. */
export function analyzeCode(code: string, language: 'javascript' | 'typescript' = 'javascript'): DebugReport {
  if (code.length > 50000) throw new Error('Code must be under 50,000 characters.');
  const file = ts.createSourceFile('submission.' + (language === 'typescript' ? 'ts' : 'js'), code, ts.ScriptTarget.Latest, true, language === 'typescript' ? ts.ScriptKind.TS : ts.ScriptKind.JS);
  const steps: DebugStep[] = [];
  const findings: DebugFinding[] = [];
  const lineAt = (node: ts.Node) => file.getLineAndCharacterOfPosition(node.getStart(file)).line + 1;
  const add = (node: ts.Node, kind: string, label: string, branch?: string) => {
    if (steps.length >= 120) return;
    const snippet = node.getText(file).replace(/\s+/g, ' ').slice(0, 180);
    steps.push({ id: `step-${steps.length}`, line: lineAt(node), kind, label, detail: snippet, branch });
  };
  const visit = (node: ts.Node) => {
    if (ts.isFunctionDeclaration(node)) add(node, 'function', `Function: ${node.name?.text || '(anonymous)'}`);
    else if (ts.isVariableStatement(node)) add(node, 'variable', 'Variable declaration');
    else if (ts.isIfStatement(node)) add(node, 'branch', `Condition: ${node.expression.getText(file)}`, 'Possible true/false branches; not evaluated');
    else if (ts.isForStatement(node) || ts.isForOfStatement(node) || ts.isWhileStatement(node) || ts.isDoStatement(node)) add(node, 'loop', 'Loop', 'Iteration count unknown');
    else if (ts.isReturnStatement(node)) add(node, 'return', 'Return value');
    else if (ts.isExpressionStatement(node)) add(node, 'expression', 'Expression');
    ts.forEachChild(node, visit);
  };
  visit(file);
  const syntaxResult = ts.transpileModule(code, {
    fileName: file.fileName,
    reportDiagnostics: true,
    compilerOptions: {
      target: ts.ScriptTarget.ES2022,
      allowJs: true,
      checkJs: false,
    },
  });

  for (const diagnostic of syntaxResult.diagnostics ?? []) {
    if (diagnostic.category !== ts.DiagnosticCategory.Error) {
      continue;
    }

    const line =
      diagnostic.file && diagnostic.start !== undefined
        ? diagnostic.file.getLineAndCharacterOfPosition(
            diagnostic.start
          ).line + 1
        : 1;

    findings.push({
      line,
      severity: 'error',
      title: 'Syntax issue',
      explanation: ts.flattenDiagnosticMessageText(
        diagnostic.messageText,
        '\n'
      ),
      recommendation: 'Correct the highlighted syntax.',
      confidence: 'verified',
    });
  }
  // Explicitly labeled heuristic: potential percentage arithmetic bug, not a verified runtime defect.
  const lines = code.split(/\r?\n/);
  lines.forEach((line, index) => {
    if (/\b(?:price|total|amount|cost)\s*[-+]\s*\(?\s*(?:price|total|amount|cost)\s*\*\s*(?:discount|percentage|percent|rate)\b/i.test(line) && !/\/\s*100/.test(line)) {
      findings.push({ line: index + 1, severity: 'warning', title: 'Possible percentage scaling error', explanation: 'This calculation multiplies a monetary amount by a rate directly. If the rate is entered as 20 for 20%, the result may be incorrect.', recommendation: 'Check the rate input convention. If it is 0–100, divide it by 100 before multiplying, then add a test case.', confidence: 'heuristic' });
    }
  });
  if (!findings.length) findings.push({ line: 1, severity: 'info', title: 'No issues identified by static checks', explanation: 'This does not prove the program is correct. Logical bugs can require actual execution and expected-output tests.', recommendation: 'Provide a failing input and expected output, then inspect relevant branches and variable values using a runtime debugger.', confidence: 'heuristic' });
  return { steps, findings, language, mode: 'static', summary: `Mapped ${steps.length} source constructs and identified ${findings.filter(f => f.severity !== 'info').length} potential or confirmed syntax issues. This is a static code map, not a runtime execution trace.` };
}
