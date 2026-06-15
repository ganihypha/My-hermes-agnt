module.exports = {
  apps: [
    {
      name: 'webapp',
      script: 'npx',
      // Local dev: provide KV + AI bindings locally. --kv creates a local namespace
      // bound to HERMES_MEM so memory works in the sandbox without real CF ids.
      args: 'wrangler pages dev dist --local --ip 0.0.0.0 --port 3000 --kv HERMES_MEM --binding GROQ_API_KEY=local-dev-no-key',
      env: { NODE_ENV: 'development', PORT: 3000 },
      watch: false,
      instances: 1,
      exec_mode: 'fork'
    }
  ]
}
