'use client';

import { apiFetch } from '@/lib/supabase/api-fetch';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MarkerType,
  type Edge,
  type Node,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

type Step = {
  line: number;
  kind: string;
  vars: Record<string, unknown>;
};

type AI = {
  rootCause: string;
  evidence: string;
  debuggingSteps: string[];
  suggestedFix: string;
  fixedCode?: string;
  confidence: string;
};

type Verification = {
  passed: boolean;
  originalFailed: boolean;
  originalOutput: string;
  fixedOutput: string;
  error: string;
  steps: number;
};

type RunnerResult = {
  logs: string[];
  error: string;
  count: number;
};

function formatAIValue(value: unknown): string {
  if (value === null || value === undefined) {
    return '';
  }

  if (typeof value === 'string') {
    return value;
  }

  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }

  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return 'Unable to display AI response';
  }
}

function normalizeAIResponse(value: unknown): AI {
  if (
    typeof value !== 'object' ||
    value === null ||
    Array.isArray(value)
  ) {
    throw new Error('AI returned an invalid explanation.');
  }

  const data = value as Record<string, unknown>;

  const debuggingSteps = Array.isArray(data.debuggingSteps)
    ? data.debuggingSteps.map(formatAIValue)
    : data.debuggingSteps
      ? [formatAIValue(data.debuggingSteps)]
      : [];

  return {
    rootCause: formatAIValue(data.rootCause),
    evidence: formatAIValue(data.evidence),
    debuggingSteps,
    suggestedFix: formatAIValue(data.suggestedFix),
    fixedCode:
      typeof data.fixedCode === 'string'
        ? data.fixedCode
        : '',
    confidence: formatAIValue(data.confidence) || 'Unknown',
  };
}

const example = `function calculateDiscount(price, discount) {
  const result = price - (price * discount);
  return result;
}

console.log(calculateDiscount(100, 20));`;

export function RuntimeDebugger() {
  const [code, setCode] = useState(example);
  const [language, setLanguage] = useState<'javascript' | 'typescript'>(
    'javascript'
  );
  const [expected, setExpected] = useState('80');
  const [steps, setSteps] = useState<Step[]>([]);
  const [output, setOutput] = useState<string[]>([]);
  const [runtimeError, setRuntimeError] = useState('');
  const [error, setError] = useState('');
  const [active, setActive] = useState(0);
  const [running, setRunning] = useState(false);
  const [ai, setAi] = useState<AI | null>(null);
  const [aiStatus, setAiStatus] = useState('');
  const [candidate, setCandidate] = useState('');
  const [verification, setVerification] = useState<Verification | null>(
    null
  );
  const [verifying, setVerifying] = useState(false);

  const frame = useRef<HTMLIFrameElement | null>(null);
  const cleanup = useRef<(() => void) | null>(null);

  useEffect(() => {
    return () => {
      cleanup.current?.();
    };
  }, []);

  const run = useCallback(async () => {
    cleanup.current?.();

    setSteps([]);
    setOutput([]);
    setRuntimeError('');
    setError('');
    setAi(null);
    setAiStatus('');
    setCandidate('');
    setVerification(null);
    setActive(0);
    setRunning(true);

    try {
      const response = await apiFetch('/api/debug/trace', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ code, language }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Trace preparation failed');
      }

      const token =
        Math.random().toString(36).slice(2) +
        Date.now().toString(36);

      const script = String(data.instrumented);

      const runner = `<!doctype html>
<meta http-equiv="Content-Security-Policy"
content="default-src 'none'; script-src 'unsafe-inline' 'unsafe-eval'; connect-src 'none'; img-src 'none'; style-src 'none'; form-action 'none'">
<script>
(function() {
  const token = ${JSON.stringify(token)};
  const events = [];
  const logs = [];

  function safe(value) {
    try {
      return JSON.parse(JSON.stringify(value, (_key, item) =>
        typeof item === 'bigint'
          ? String(item)
          : typeof item === 'function'
            ? '[function]'
            : item
      ));
    } catch {
      return '[unserializable]';
    }
  }

  window.__devpilotTrace = function(line, kind, values) {
    if (events.length >= 600) {
      throw Error('Trace limit reached (600 steps)');
    }

    let vars = {};

    try {
      vars = safe(values()) || {};
    } catch (error) {
      vars = { captureError: String(error) };
    }

    events.push({ line, kind, vars });
  };

  console.log = (...args) => {
    logs.push(
      args.map(value =>
        typeof value === 'string'
          ? value
          : JSON.stringify(safe(value))
      ).join(' ')
    );
  };

  console.error = console.log;
  console.warn = console.log;

  let failure = '';

  try {
    (0, eval)(
      decodeURIComponent(
        ${JSON.stringify(encodeURIComponent(script))}
      )
    );
  } catch (error) {
    failure = String(error && error.stack || error);
  }

  parent.postMessage({
    devpilot: true,
    token,
    events,
    logs,
    error: failure
  }, '*');
})();
<\/script>`;

      const iframe = document.createElement('iframe');

      iframe.setAttribute('sandbox', 'allow-scripts');
      iframe.style.display = 'none';

      const listener = (event: MessageEvent) => {
        if (
          event.source !== iframe.contentWindow ||
          !event.data?.devpilot ||
          event.data.token !== token
        ) {
          return;
        }

        const result = event.data as {
          events: Step[];
          logs: string[];
          error: string;
        };

        setSteps(result.events);
        setOutput(result.logs);
        setRuntimeError(result.error);
        setRunning(false);

        cleanup.current?.();
        cleanup.current = null;
      };

      window.addEventListener('message', listener);

      const timer = window.setTimeout(() => {
        setRunning(false);
        setError(
          'Execution exceeded 3 seconds or was blocked. The isolated runner was terminated.'
        );
        cleanup.current?.();
        cleanup.current = null;
      }, 3000);

      cleanup.current = () => {
        clearTimeout(timer);
        window.removeEventListener('message', listener);
        iframe.remove();

        if (frame.current === iframe) {
          frame.current = null;
        }
      };

      frame.current = iframe;
      iframe.srcdoc = runner;
      document.body.appendChild(iframe);
    } catch (cause) {
      cleanup.current?.();
      cleanup.current = null;
      setRunning(false);
      setError(
        cause instanceof Error
          ? cause.message
          : 'Unable to run debugger'
      );
    }
  }, [code, language]);

  const explain = useCallback(async () => {
    setAiStatus('Analyzing recorded evidence…');
    setAi(null);

    try {
      const response = await apiFetch('/api/debug/explain', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          code,
          steps,
          expected,
          actual: output.join('\n'),
          error: runtimeError,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'AI analysis failed');
      }

      if (!data.configured) {
        setAiStatus(
          typeof data.explanation === 'string'
            ? data.explanation
            : 'AI provider is not configured.'
        );
        return;
      }

      const explanation = normalizeAIResponse(data.explanation);

      setAi(explanation);
      setCandidate(explanation.fixedCode ?? '');
      setVerification(null);
      setAiStatus('');
    } catch (cause) {
      setAiStatus(
        cause instanceof Error ? cause.message : 'AI unavailable'
      );
    }
  }, [code, steps, expected, output, runtimeError]);

  const verifyFix = useCallback(async () => {
    if (
      !candidate.trim() ||
      !expected.trim() ||
      verifying ||
      running
    ) {
      return;
    }

    setVerifying(true);
    setVerification(null);

    try {
      const response = await apiFetch('/api/debug/trace', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          code: candidate,
          language,
        }),
      });

      const prepared = await response.json();

      if (!response.ok) {
        throw new Error(
          prepared.error || 'Fix compilation failed'
        );
      }

      const token =
        Math.random().toString(36).slice(2) +
        Date.now().toString(36);

      const script = String(prepared.instrumented);

      const html = `<!doctype html>
<meta http-equiv="Content-Security-Policy"
content="default-src 'none'; script-src 'unsafe-inline' 'unsafe-eval'; connect-src 'none'; img-src 'none'; style-src 'none'; form-action 'none'">
<script>
(function() {
  const token = ${JSON.stringify(token)};
  const events = [];
  const logs = [];

  function safe(value) {
    try {
      return JSON.parse(JSON.stringify(value, (_key, item) =>
        typeof item === 'bigint'
          ? String(item)
          : typeof item === 'function'
            ? '[function]'
            : item
      ));
    } catch {
      return '[unserializable]';
    }
  }

  window.__devpilotTrace = function(line, kind, values) {
    if (events.length >= 600) {
      throw Error('Trace limit reached (600 steps)');
    }

    let vars = {};

    try {
      vars = safe(values()) || {};
    } catch (error) {
      vars = { captureError: String(error) };
    }

    events.push({ line, kind, vars });
  };

  console.log = (...args) => {
    logs.push(
      args.map(value =>
        typeof value === 'string'
          ? value
          : JSON.stringify(safe(value))
      ).join(' ')
    );
  };

  console.error = console.log;
  console.warn = console.log;

  let failure = '';

  try {
    (0, eval)(
      decodeURIComponent(
        ${JSON.stringify(encodeURIComponent(script))}
      )
    );
  } catch (error) {
    failure = String(error && error.stack || error);
  }

  parent.postMessage({
    devpilotVerify: true,
    token,
    logs,
    error: failure,
    count: events.length
  }, '*');
})();
<\/script>`;

      const result = await new Promise<RunnerResult>(
        (resolve, reject) => {
          const iframe = document.createElement('iframe');

          iframe.setAttribute('sandbox', 'allow-scripts');
          iframe.style.display = 'none';

          const finish = () => {
            clearTimeout(timer);
            window.removeEventListener('message', listener);
            iframe.remove();
          };

          const listener = (event: MessageEvent) => {
            if (
              event.source !== iframe.contentWindow ||
              !event.data?.devpilotVerify ||
              event.data.token !== token
            ) {
              return;
            }

            finish();

            resolve({
              logs: event.data.logs,
              error: event.data.error,
              count: event.data.count,
            });
          };

          window.addEventListener('message', listener);

          const timer = window.setTimeout(() => {
            finish();
            reject(
              new Error(
                'Fix verification timed out after 3 seconds'
              )
            );
          }, 3000);

          iframe.srcdoc = html;
          document.body.appendChild(iframe);
        }
      );

      const originalOutput = output.join('\n').trim();
      const fixedOutput = result.logs.join('\n').trim();

      const originalFailed =
        Boolean(runtimeError) ||
        originalOutput !== expected.trim();

      const passed =
        !result.error &&
        fixedOutput === expected.trim();

      setVerification({
        passed,
        originalFailed,
        originalOutput,
        fixedOutput,
        error: result.error,
        steps: result.count,
      });
    } catch (cause) {
      setVerification({
        passed: false,
        originalFailed:
          Boolean(runtimeError) ||
          output.join('\n').trim() !== expected.trim(),
        originalOutput: output.join('\n'),
        fixedOutput: '',
        error:
          cause instanceof Error
            ? cause.message
            : 'Verification failed',
        steps: 0,
      });
    } finally {
      setVerifying(false);
    }
  }, [
    candidate,
    expected,
    language,
    output,
    runtimeError,
    verifying,
    running,
  ]);

  const { nodes, edges } = useMemo(() => {
    const nodes: Node[] = steps.map((step, index) => ({
      id: String(index),
      position: {
        x: 35 + (index % 3) * 245,
        y: Math.floor(index / 3) * 100,
      },
      data: {
        label: `#${index + 1} · Line ${step.line}\n${step.kind}`,
      },
      style: {
        whiteSpace: 'pre-line',
        width: 210,
        background:
          index === active ? '#7f1d1d' : '#18181b',
        border: `1px solid ${
          index === active ? '#f87171' : '#52525b'
        }`,
        borderRadius: 10,
        color: '#fafafa',
        padding: 10,
        fontSize: 11,
      },
    }));

    const edges: Edge[] = steps.slice(1).map((_, index) => ({
      id: `e${index}`,
      source: String(index),
      target: String(index + 1),
      animated: index + 1 === active,
      markerEnd: {
        type: MarkerType.ArrowClosed,
      },
    }));

    return { nodes, edges };
  }, [steps, active]);

  const current = steps[active];

  const mismatch =
    expected.trim() !== '' &&
    output.join('\n').trim() !== expected.trim();

  return (
    <div className="grid gap-5 xl:grid-cols-2">
      <section className="glass min-w-0 rounded-2xl p-5">
        <h2 className="mb-3 font-bold">
          Executable source code
        </h2>

        <div className="mb-3 flex gap-3">
          <select
            aria-label="Language"
            value={language}
            onChange={(event) =>
              setLanguage(
                event.target.value as
                  | 'javascript'
                  | 'typescript'
              )
            }
            className="rounded-lg bg-zinc-900 p-2 text-sm"
          >
            <option value="javascript">JavaScript</option>
            <option value="typescript">TypeScript</option>
          </select>

          <input
            aria-label="Expected console output"
            value={expected}
            onChange={(event) =>
              setExpected(event.target.value)
            }
            placeholder="Expected console output"
            className="min-w-0 flex-1 rounded-lg bg-zinc-900 p-2 text-sm"
          />
        </div>

        <textarea
          aria-label="Source code"
          value={code}
          onChange={(event) => setCode(event.target.value)}
          spellCheck={false}
          className="h-64 w-full rounded-lg bg-zinc-950 p-3 font-mono text-xs leading-6 text-white"
        />

        <button
          disabled={running || !code.trim()}
          onClick={run}
          className="mt-3 rounded-lg bg-red-600 px-5 py-3 text-sm font-bold text-white disabled:opacity-50"
        >
          {running
            ? 'Running in isolated sandbox…'
            : 'Run & Record Execution'}
        </button>

        {error && (
          <p role="alert" className="mt-3 text-sm text-red-300">
            {error}
          </p>
        )}

        <h3 className="mt-5 font-semibold">
          Observed source lines
        </h3>

        <div className="mt-2 max-h-72 overflow-auto rounded-lg bg-black/30 font-mono text-xs">
          {code.split(/\r?\n/).map((line, index) => (
            <div
              key={index}
              className={`flex px-3 py-1 ${
                current?.line === index + 1
                  ? 'bg-red-900/50'
                  : ''
              }`}
            >
              <span className="mr-4 w-6 text-right text-zinc-500">
                {index + 1}
              </span>

              <span className="whitespace-pre text-zinc-300">
                {line || ' '}
              </span>
            </div>
          ))}
        </div>

        <h3 className="mt-4 font-semibold">
          Observed console output
        </h3>

        <pre className="mt-2 min-h-12 overflow-auto rounded-lg bg-black/40 p-3 text-xs">
          {output.join('\n') || '(none)'}
        </pre>

        {steps.length > 0 && (
          <p
            className={`mt-2 text-sm ${
              mismatch
                ? 'text-amber-300'
                : 'text-emerald-300'
            }`}
          >
            {expected.trim()
              ? mismatch
                ? 'Expected output does not match observed output.'
                : 'Observed output matches the provided expected output.'
              : 'No expected output supplied.'}
          </p>
        )}

        {runtimeError && (
          <pre className="mt-3 whitespace-pre-wrap break-all text-xs text-red-300">
            {runtimeError}
          </pre>
        )}
      </section>

      <section className="glass min-w-0 rounded-2xl p-5">
        <h2 className="font-bold">
          Observed runtime execution flow
        </h2>

        <p className="mt-1 text-xs text-zinc-400">
          Nodes represent actual instrumentation checkpoints,
          not static source-order guesses. This is a bounded
          trace, not a complete instruction-level debugger.
        </p>

        {steps.length > 0 ? (
          <>
            <div className="mt-4 h-80 overflow-hidden rounded-lg border border-white/10">
              <ReactFlow
                nodes={nodes}
                edges={edges}
                fitView
                onNodeClick={(_, node) =>
                  setActive(Number(node.id))
                }
                nodesDraggable={false}
                nodesConnectable={false}
                proOptions={{
                  hideAttribution: true,
                }}
              >
                <Background color="#333" />
                <Controls />
              </ReactFlow>
            </div>

            <div className="mt-4 flex items-center justify-between gap-2">
              <button
                onClick={() =>
                  setActive((value) =>
                    Math.max(0, value - 1)
                  )
                }
                disabled={active === 0}
                className="rounded border border-white/20 p-2 text-xs disabled:opacity-30"
              >
                ← Previous
              </button>

              <span className="text-xs">
                {active + 1} / {steps.length}
              </span>

              <button
                onClick={() =>
                  setActive((value) =>
                    Math.min(steps.length - 1, value + 1)
                  )
                }
                disabled={active === steps.length - 1}
                className="rounded border border-white/20 p-2 text-xs disabled:opacity-30"
              >
                Next →
              </button>
            </div>

            <h3 className="mt-4 font-semibold">
              Variable snapshot · line {current?.line}
            </h3>

            <pre className="mt-2 max-h-48 overflow-auto rounded-lg bg-black/40 p-3 text-xs">
              {JSON.stringify(current?.vars || {}, null, 2)}
            </pre>
          </>
        ) : (
          <div className="mt-4 flex h-80 items-center justify-center rounded-lg border border-dashed border-white/20 text-center text-sm text-zinc-400">
            Run the program to record execution checkpoints.
          </div>
        )}

        <button
          disabled={!steps.length || running}
          onClick={explain}
          className="mt-5 rounded-lg bg-indigo-600 px-5 py-3 text-sm font-bold disabled:opacity-40"
        >
          Analyze Root Cause with AI
        </button>

        {aiStatus && (
          <p className="mt-3 text-sm text-amber-200">
            {aiStatus}
          </p>
        )}

        {ai && (
          <div className="mt-4 space-y-3 rounded-lg border border-indigo-400/30 p-4 text-sm">
            <h3 className="font-bold">
              AI diagnosis · {ai.confidence}
            </h3>

            <p className="whitespace-pre-wrap break-words">
              {ai.rootCause || 'No root cause provided.'}
            </p>

            <div className="text-zinc-400">
              <p className="font-semibold">Evidence:</p>
              <pre className="mt-2 overflow-auto whitespace-pre-wrap break-words rounded-lg bg-black/30 p-3 text-xs">
                {ai.evidence || 'No evidence provided.'}
              </pre>
            </div>

            <h4 className="font-semibold">
              Recommended debugging steps
            </h4>

            <ol className="list-inside list-decimal space-y-1">
              {ai.debuggingSteps.map((step, index) => (
                <li key={index} className="whitespace-pre-wrap break-words">
                  {step}
                </li>
              ))}
            </ol>

            <p className="whitespace-pre-wrap break-words text-emerald-300">
              Suggested fix: {ai.suggestedFix || 'No suggestion provided.'}
            </p>

            <h4 className="font-semibold">
              Proposed corrected code (editable)
            </h4>

            <textarea
              aria-label="Proposed corrected code"
              value={candidate}
              onChange={(event) => {
                setCandidate(event.target.value);
                setVerification(null);
              }}
              spellCheck={false}
              placeholder="Paste the complete corrected program here if the AI did not return one."
              className="h-48 w-full rounded-lg bg-zinc-950 p-3 font-mono text-xs text-white"
            />

            <button
              onClick={verifyFix}
              disabled={
                verifying ||
                running ||
                !candidate.trim() ||
                !expected.trim()
              }
              className="rounded-lg bg-emerald-700 px-4 py-2 font-bold disabled:opacity-40"
            >
              {verifying
                ? 'Verifying…'
                : 'Verify Suggested Fix'}
            </button>

            {!expected.trim() && (
              <p className="text-amber-200">
                Provide an expected output to verify the fix.
              </p>
            )}

            {verification && (
              <div
                role="status"
                className={`rounded-lg border p-3 ${
                  verification.passed &&
                  verification.originalFailed
                    ? 'border-emerald-500 text-emerald-200'
                    : 'border-amber-500 text-amber-200'
                }`}
              >
                <p className="font-bold">
                  {verification.passed &&
                  verification.originalFailed
                    ? 'PASS: Original failed, proposed fix matches expected output'
                    : verification.passed
                      ? 'INCONCLUSIVE: Proposed code matches expected output, but original did not fail'
                      : 'FAIL: Proposed fix did not pass verification'}
                </p>

                <p>Expected: {expected}</p>

                <p>
                  Original:{' '}
                  {verification.originalOutput || '(no output)'}
                </p>

                <p>
                  Fixed:{' '}
                  {verification.fixedOutput || '(no output)'}
                </p>

                <p>
                  Fix execution checkpoints:{' '}
                  {verification.steps}
                </p>

                {verification.error && (
                  <p>
                    Execution error: {verification.error}
                  </p>
                )}
              </div>
            )}

            <p className="text-xs text-zinc-400">
              Verification checks the supplied expected
              console output for this one input only.
              It does not prove correctness for all inputs.
              Run only trusted snippets.
            </p>
          </div>
        )}
      </section>
    </div>
  );
}