# Groq backup AI provider

DevPilot retains all existing features and adds Groq through the shared server-side LLM service. No Groq SDK is required: the existing `openai` package uses Groq’s OpenAI-compatible chat completions endpoint.

## Configure

Copy `.env.example` to `.env.local`, then set for example:

```dotenv
DEVPILOT_MODEL_PROVIDER=openai
OPENAI_API_KEY=your_openai_key
GROQ_API_KEY=your_groq_key
GROQ_MODEL=llama-3.3-70b-versatile
```

For Gemini primary, set `DEVPILOT_MODEL_PROVIDER=gemini` and `GEMINI_API_KEY`. For Groq-only mode, set `DEVPILOT_MODEL_PROVIDER=groq` and `GROQ_API_KEY`.

The selected primary is tried first. If it fails or returns an empty response, Groq is tried if configured. If the primary is missing, Groq can still be used. The same service powers AI debugging, fix generation, and Code Studio. Both providers failing returns an error rather than a fabricated answer.

**Security:** Keys belong only in `.env.local` or secure deployment secrets. Never put keys in client-side `NEXT_PUBLIC_` variables or commit them. This fallback is not a guarantee of uptime or compatible model behavior.
