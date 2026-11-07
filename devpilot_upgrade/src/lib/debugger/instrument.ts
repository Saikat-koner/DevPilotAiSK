import ts from 'typescript';

/** Adds observed execution checkpoints; code is executed only in a sandboxed browser iframe. */
export function instrumentCode(code: string, language: 'javascript' | 'typescript') {
  const source = ts.createSourceFile('debug.' + (language === 'typescript' ? 'ts' : 'js'), code, ts.ScriptTarget.ES2022, true, language === 'typescript' ? ts.ScriptKind.TS : ts.ScriptKind.JS);
const syntaxCheck = ts.transpileModule(code, {
  fileName: source.fileName,
  reportDiagnostics: true,
  compilerOptions: {
    target: ts.ScriptTarget.ES2022,
    allowJs: true,
  },
});

const syntaxError = syntaxCheck.diagnostics?.find(
  (diagnostic) =>
    diagnostic.category === ts.DiagnosticCategory.Error
);

if (syntaxError) {
  throw new Error(
    ts.flattenDiagnosticMessageText(
      syntaxError.messageText,
      '\n'
    )
  );
}
  const factory = ts.factory;
  const transformer: ts.TransformerFactory<ts.SourceFile> = context => {
    const visit: ts.Visitor = node => {
      if (ts.isBlock(node) || ts.isSourceFile(node)) {
        const statements = node.statements;
        const visible = new Set<string>();
        if (ts.isBlock(node) && node.parent && ts.isFunctionLike(node.parent)) {
          for (const p of node.parent.parameters) if (ts.isIdentifier(p.name)) visible.add(p.name.text);
        }
        const result: ts.Statement[] = [];
        for (const statement of statements) {
          const line = source.getLineAndCharacterOfPosition(statement.getStart(source)).line + 1;
          const capture = () => {
            const props = [...visible].filter(n => /^[A-Za-z_$][\w$]*$/.test(n)).slice(0, 35).map(n => factory.createPropertyAssignment(factory.createStringLiteral(n), factory.createConditionalExpression(factory.createBinaryExpression(factory.createTypeOfExpression(factory.createIdentifier(n)), factory.createToken(ts.SyntaxKind.EqualsEqualsEqualsToken), factory.createStringLiteral('undefined')), factory.createToken(ts.SyntaxKind.QuestionToken), factory.createStringLiteral('[undefined]'), factory.createToken(ts.SyntaxKind.ColonToken), factory.createIdentifier(n))));
            return factory.createExpressionStatement(factory.createCallExpression(factory.createIdentifier('__devpilotTrace'), undefined, [factory.createNumericLiteral(line), factory.createStringLiteral(ts.SyntaxKind[statement.kind] || 'statement'), factory.createArrowFunction(undefined, undefined, [], undefined, factory.createToken(ts.SyntaxKind.EqualsGreaterThanToken), factory.createObjectLiteralExpression(props))]));
          };
          // Trace before statement, then again after variable declarations so new values are visible.
          result.push(capture());
          result.push(ts.visitNode(statement, visit) as ts.Statement);
          if (ts.isVariableStatement(statement)) {
            for (const d of statement.declarationList.declarations) if (ts.isIdentifier(d.name)) visible.add(d.name.text);
            result.push(capture());
          }
        }
        return ts.isBlock(node) ? factory.updateBlock(node, result) : factory.updateSourceFile(node, result);
      }
      return ts.visitEachChild(node, visit, context);
    };
    return file => ts.visitNode(file, visit) as ts.SourceFile;
  };
  const result = ts.transpileModule(code, { fileName: 'debug.' + (language === 'typescript' ? 'ts' : 'js'), compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.None }, transformers: { before: [transformer] }, reportDiagnostics: true });
  const diagnostics = result.diagnostics?.filter(d => d.category === ts.DiagnosticCategory.Error) || [];
  if (diagnostics.length) throw new Error(ts.flattenDiagnosticMessageText(diagnostics[0].messageText, '\n'));
  return result.outputText;
}
