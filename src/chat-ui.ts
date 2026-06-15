/**
 * Self-contained chat UI served at GET /chat.
 *
 * It is a single HTML page (Tailwind via CDN + vanilla JS) that calls this same
 * Worker's POST /v1/chat/completions with streaming. The Groq key never reaches
 * the browser — only the optional PROXY_TOKEN does (entered by the user and kept
 * in localStorage). Designed to work great on a phone browser.
 */

export function chatPage(opts: { defaultModel: string; protected: boolean }): string {
  const { defaultModel } = opts
  const needsToken = opts.protected
  return `<!DOCTYPE html>
<html lang="en" class="h-full">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, viewport-fit=cover" />
  <meta name="theme-color" content="#0b1020" />
  <title>Hermes Chat</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" rel="stylesheet" />
  <style>
    html, body { height: 100%; background: #0b1020; }
    .msg-content pre { white-space: pre-wrap; word-break: break-word; }
    .typing-dot { animation: blink 1.2s infinite; }
    .typing-dot:nth-child(2){ animation-delay:.2s } .typing-dot:nth-child(3){ animation-delay:.4s }
    @keyframes blink { 0%,80%,100%{opacity:.2} 40%{opacity:1} }
    #messages::-webkit-scrollbar{width:6px} #messages::-webkit-scrollbar-thumb{background:#334155;border-radius:3px}
  </style>
</head>
<body class="h-full text-slate-100">
  <div class="flex flex-col h-full max-w-3xl mx-auto">
    <!-- Header -->
    <header class="flex items-center justify-between px-4 py-3 border-b border-slate-800 bg-slate-900/60 backdrop-blur sticky top-0 z-10">
      <div class="flex items-center gap-2">
        <i class="fas fa-feather-pointed text-indigo-400"></i>
        <h1 class="font-semibold tracking-tight">Hermes Chat</h1>
        <span id="status-dot" class="ml-1 w-2 h-2 rounded-full bg-slate-500" title="status"></span>
      </div>
      <button id="settings-btn" class="text-slate-400 hover:text-slate-100 px-2 py-1 rounded-lg" title="Settings">
        <i class="fas fa-gear"></i>
      </button>
    </header>

    <!-- Settings panel -->
    <section id="settings" class="hidden px-4 py-3 border-b border-slate-800 bg-slate-900/40 space-y-3 text-sm">
      ${needsToken ? `
      <div>
        <label class="block text-slate-400 mb-1">Access token (PROXY_TOKEN)</label>
        <input id="token" type="password" placeholder="paste your shim token"
          class="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
      </div>` : ''}
      <div>
        <label class="block text-slate-400 mb-1">Model</label>
        <input id="model" type="text" value="${defaultModel}"
          class="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
      </div>
      <div>
        <label class="block text-slate-400 mb-1">System prompt (optional)</label>
        <textarea id="system" rows="2" placeholder="You are a helpful assistant."
          class="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"></textarea>
      </div>
      <div class="flex items-center gap-3">
        <button id="save-settings" class="bg-indigo-600 hover:bg-indigo-500 px-3 py-1.5 rounded-lg">Save</button>
        <button id="clear-chat" class="text-slate-400 hover:text-rose-400 px-3 py-1.5 rounded-lg">Clear chat</button>
        <button id="test-conn" class="text-slate-400 hover:text-emerald-400 px-3 py-1.5 rounded-lg">Test connection</button>
      </div>
    </section>

    <!-- Messages -->
    <main id="messages" class="flex-1 overflow-y-auto px-4 py-4 space-y-4">
      <div class="text-center text-slate-500 text-sm mt-10" id="empty-hint">
        <i class="fas fa-comment-dots text-2xl mb-2 block"></i>
        Ask anything — powered by Groq via your Cloudflare Worker.
      </div>
    </main>

    <!-- Composer -->
    <footer class="px-3 py-3 border-t border-slate-800 bg-slate-900/60 backdrop-blur" style="padding-bottom:max(0.75rem, env(safe-area-inset-bottom))">
      <form id="composer" class="flex items-end gap-2">
        <textarea id="input" rows="1" placeholder="Type a message…" autocomplete="off"
          class="flex-1 resize-none max-h-40 bg-slate-800 border border-slate-700 rounded-2xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500"></textarea>
        <button id="send" type="submit" class="shrink-0 w-12 h-12 rounded-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 flex items-center justify-center">
          <i class="fas fa-paper-plane"></i>
        </button>
      </form>
    </footer>
  </div>

  <script>
  (function () {
    const NEEDS_TOKEN = ${needsToken ? 'true' : 'false'};
    const $ = (s) => document.querySelector(s);
    const messagesEl = $('#messages');
    const inputEl = $('#input');
    const form = $('#composer');
    const sendBtn = $('#send');
    const statusDot = $('#status-dot');
    const emptyHint = $('#empty-hint');

    const LS = {
      get token(){ return localStorage.getItem('hermes_token') || '' },
      set token(v){ localStorage.setItem('hermes_token', v) },
      get model(){ return localStorage.getItem('hermes_model') || '${defaultModel}' },
      set model(v){ localStorage.setItem('hermes_model', v) },
      get system(){ return localStorage.getItem('hermes_system') || '' },
      set system(v){ localStorage.setItem('hermes_system', v) },
    };

    // history: array of {role, content}
    let history = [];
    let streaming = false;

    // ---- Settings UI ----
    $('#settings-btn').addEventListener('click', () => $('#settings').classList.toggle('hidden'));
    if (NEEDS_TOKEN && $('#token')) $('#token').value = LS.token;
    $('#model').value = LS.model;
    $('#system').value = LS.system;
    $('#save-settings').addEventListener('click', () => {
      if (NEEDS_TOKEN && $('#token')) LS.token = $('#token').value.trim();
      LS.model = $('#model').value.trim() || '${defaultModel}';
      LS.system = $('#system').value;
      $('#settings').classList.add('hidden');
      setStatus('idle');
    });
    $('#clear-chat').addEventListener('click', () => {
      history = []; messagesEl.querySelectorAll('.msg').forEach(n => n.remove());
      emptyHint.style.display = '';
    });
    $('#test-conn').addEventListener('click', testConnection);

    function setStatus(s){
      const map = { ok:'bg-emerald-500', idle:'bg-slate-500', err:'bg-rose-500', busy:'bg-amber-400' };
      statusDot.className = 'ml-1 w-2 h-2 rounded-full ' + (map[s] || map.idle);
    }

    function headers(){
      const h = { 'Content-Type': 'application/json' };
      if (NEEDS_TOKEN && LS.token) h['Authorization'] = 'Bearer ' + LS.token;
      return h;
    }

    async function testConnection(){
      setStatus('busy');
      try{
        const r = await fetch('/v1/models', { headers: headers() });
        setStatus(r.ok ? 'ok' : 'err');
        alert(r.ok ? 'Connection OK ✓' : ('Failed: HTTP ' + r.status + (r.status===401 ? ' (check your token in Settings)' : '')));
      }catch(e){ setStatus('err'); alert('Network error: ' + e.message); }
    }

    function addMessage(role, text){
      emptyHint.style.display = 'none';
      const wrap = document.createElement('div');
      wrap.className = 'msg flex ' + (role==='user' ? 'justify-end' : 'justify-start');
      const bubble = document.createElement('div');
      bubble.className = 'msg-content max-w-[85%] rounded-2xl px-4 py-2.5 ' +
        (role==='user' ? 'bg-indigo-600 text-white rounded-br-md' : 'bg-slate-800 text-slate-100 rounded-bl-md');
      const pre = document.createElement('pre');
      pre.className = 'font-sans text-[15px] leading-relaxed';
      pre.textContent = text;
      bubble.appendChild(pre);
      wrap.appendChild(bubble);
      messagesEl.appendChild(wrap);
      messagesEl.scrollTop = messagesEl.scrollHeight;
      return pre;
    }

    function typingBubble(){
      emptyHint.style.display = 'none';
      const wrap = document.createElement('div');
      wrap.className = 'msg flex justify-start';
      wrap.innerHTML = '<div class="bg-slate-800 rounded-2xl rounded-bl-md px-4 py-3 flex gap-1">' +
        '<span class="typing-dot w-2 h-2 bg-slate-400 rounded-full"></span>' +
        '<span class="typing-dot w-2 h-2 bg-slate-400 rounded-full"></span>' +
        '<span class="typing-dot w-2 h-2 bg-slate-400 rounded-full"></span></div>';
      messagesEl.appendChild(wrap);
      messagesEl.scrollTop = messagesEl.scrollHeight;
      return wrap;
    }

    // auto-grow textarea
    inputEl.addEventListener('input', () => {
      inputEl.style.height = 'auto';
      inputEl.style.height = Math.min(inputEl.scrollHeight, 160) + 'px';
    });
    // Enter to send (Shift+Enter = newline) on non-touch
    inputEl.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey && !('ontouchstart' in window)) {
        e.preventDefault(); form.requestSubmit();
      }
    });

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (streaming) return;
      const text = inputEl.value.trim();
      if (!text) return;
      if (NEEDS_TOKEN && !LS.token) {
        $('#settings').classList.remove('hidden');
        alert('Please set your access token in Settings first.');
        return;
      }
      inputEl.value = ''; inputEl.style.height = 'auto';
      addMessage('user', text);
      history.push({ role: 'user', content: text });
      await streamReply();
    });

    async function streamReply(){
      streaming = true; sendBtn.disabled = true; setStatus('busy');
      const typing = typingBubble();

      const msgs = [];
      if (LS.system && LS.system.trim()) msgs.push({ role:'system', content: LS.system.trim() });
      for (const m of history) msgs.push(m);

      let acc = '';
      let target = null;
      try{
        const resp = await fetch('/v1/chat/completions', {
          method: 'POST', headers: headers(),
          body: JSON.stringify({ model: LS.model, messages: msgs, stream: true })
        });
        if (!resp.ok) {
          typing.remove();
          const errtxt = await resp.text().catch(()=> '');
          addMessage('assistant', '⚠️ Error ' + resp.status + (resp.status===401 ? ' — check your token in Settings.' : (errtxt ? ('\\n' + errtxt.slice(0,300)) : '')));
          setStatus('err'); streaming=false; sendBtn.disabled=false; return;
        }
        typing.remove();
        target = addMessage('assistant', '');

        const reader = resp.body.getReader();
        const decoder = new TextDecoder();
        let buf = '';
        while (true){
          const { value, done } = await reader.read();
          if (done) break;
          buf += decoder.decode(value, { stream:true });
          const lines = buf.split('\\n');
          buf = lines.pop();
          for (const line of lines){
            const t = line.trim();
            if (!t.startsWith('data:')) continue;
            const data = t.slice(5).trim();
            if (data === '[DONE]') continue;
            try{
              const j = JSON.parse(data);
              const delta = j.choices && j.choices[0] && j.choices[0].delta && j.choices[0].delta.content;
              if (delta){ acc += delta; target.textContent = acc; messagesEl.scrollTop = messagesEl.scrollHeight; }
            }catch(_){}
          }
        }
        history.push({ role:'assistant', content: acc });
        setStatus('ok');
      }catch(err){
        if (typing && typing.parentNode) typing.remove();
        if (!target) addMessage('assistant', '⚠️ Network error: ' + err.message);
        setStatus('err');
      }finally{
        streaming = false; sendBtn.disabled = false;
      }
    }

    setStatus('idle');
  })();
  </script>
</body>
</html>`
}
