module.exports = {
  apps: [
    {
      name: 'webapp',
      script: 'npx',
      // Local dev (God Mode V3): KV + AI bindings local; secrets loaded from
      // .dev.vars automatically (PROXY_TOKEN, GROQ_API_KEY, etc.). Vectorize and
      // Browser are remote-only — code degrades gracefully to KV keyword recall
      // and reports crawl honestly when unavailable locally.
      args: 'wrangler pages dev dist --local --ip 0.0.0.0 --port 3000 --kv HERMES_MEM',
      env: { NODE_ENV: 'development', PORT: 3000 },
      watch: false,
      instances: 1,
      exec_mode: 'fork'
    }
  ]
}
