/**
 * Hermes Chat UI — God Mode V3 (served at GET /chat).
 *
 * Single HTML page (Tailwind + marked.js via CDN + vanilla JS). Talks to this
 * same Worker. The Groq key never reaches the browser — only the optional
 * PROXY_TOKEN does (localStorage). Mobile-first, dark + indigo.
 *
 * V3 additions vs V2:
 *  - Markdown rendering in assistant bubbles (marked.js)
 *  - Provider/model dropdown (Groq fast / Workers AI free)
 *  - Agent mode toggle -> POST /api/agent (tool-loop: recall, crawl, save)
 *  - Tool result cards + memory recall chips
 *  - Link to /memory dashboard
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
  <title>Hermes Agent — God Mode V3</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" rel="stylesheet" />
  <script src="https://cdn.jsdelivr.net/npm/marked@12.0.0/marked.min.js"></script>
  <style>
    html, body { height: 100%; background: #0b1020; }
    .typing-dot { animation: blink 1.2s infinite; }
    .typing-dot:nth-child(2){ animation-delay:.2s } .typing-dot:nth-child(3){ animation-delay:.4s }
    @keyframes blink { 0%,80%,100%{opacity:.2} 40%{opacity:1} }
    #messages::-webkit-scrollbar{width:6px} #messages::-webkit-scrollbar-thumb{background:#334155;border-radius:3px}
    .md p{margin:.35rem 0} .md ul,.md ol{margin:.35rem 0;padding-left:1.25rem} .md li{margin:.15rem 0}
    .md code{background:#0f172a;padding:.1rem .35rem;border-radius:.35rem;font-size:.85em}
    .md pre{background:#0f172a;padding:.6rem .8rem;border-radius:.6rem;overflow-x:auto;margin:.4rem 0}
    .md pre code{background:none;padding:0} .md a{color:#a5b4fc;text-decoration:underline}
    .md h1,.md h2,.md h3{font-weight:600;margin:.5rem 0 .3rem} .md strong{font-weight:700}
  </style>
</head>
<body class="h-full text-slate-100">
  <div class="flex flex-col h-full max-w-3xl mx-auto">
    <!-- Header -->
    <header class="flex items-center justify-between px-4 py-3 border-b border-slate-800 bg-slate-900/60 backdrop-blur sticky top-0 z-10">
      <div class="flex items-center gap-2">
        <i class="fas fa-feather-pointed text-indigo-400"></i>
        <h1 class="font-semibold tracking-tight">Hermes Agent</h1>
        <span class="text-[10px] px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300 font-mono">V3</span>
        <span id="status-dot" class="ml-1 w-2 h-2 rounded-full bg-slate-500" title="status"></span>
      </div>
      <div class="flex items-center gap-1">
        <a href="/memory" class="text-slate-400 hover:text-indigo-300 px-2 py-1 rounded-lg" title="Memory dashboard"><i class="fas fa-brain"></i></a>
        <button id="settings-btn" class="text-slate-400 hover:text-slate-100 px-2 py-1 rounded-lg" title="Settings"><i class="fas fa-gear"></i></button>
      </div>
    </header>

    <!-- Settings panel -->
    <section id="settings" class="hidden px-4 py-3 border-b border-slate-800 bg-slate-900/40 space-y-3 text-sm">
      ${needsToken ? `
      <div>
        <label class="block text-slate-400 mb-1">Access token (PROXY_TOKEN)</label>
        <input id="token" type="password" placeholder="paste your token"
          class="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
      </div>` : ''}
      <div>
        <label class="block text-slate-400 mb-1">Model / provider</label>
        <select id="model"
          class="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500">
          <option value="llama-3.3-70b-versatile">Groq · llama-3.3-70b (fast, default)</option>
          <option value="llama-3.1-8b-instant">Groq · llama-3.1-8b (faster)</option>
          <option value="@cf/meta/llama-3.1-8b-instruct">Workers AI · llama-3.1-8b (free)</option>
          <option value="@cf/meta/llama-3.3-70b-instruct-fp8-fast">Workers AI · llama-3.3-70b (free)</option>
        </select>
      </div>
      <div>
        <label class="block text-slate-400 mb-1">System prompt (optional)</label>
        <textarea id="system" rows="2" placeholder="You are a helpful assistant."
          class="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"></textarea>
      </div>
      <div class="flex items-center gap-3 flex-wrap">
        <button id="save-settings" class="bg-indigo-600 hover:bg-indigo-500 px-3 py-1.5 rounded-lg">Save</button>
        <button id="clear-chat" class="text-slate-400 hover:text-rose-400 px-3 py-1.5 rounded-lg">Clear chat</button>
        <button id="test-conn" class="text-slate-400 hover:text-emerald-400 px-3 py-1.5 rounded-lg">Test connection</button>
      </div>
    </section>

    <!-- Messages -->
    <main id="messages" class="flex-1 overflow-y-auto px-4 py-4 space-y-4">
      <div class="text-center text-slate-500 text-sm mt-10" id="empty-hint">
        <i class="fas fa-feather-pointed text-2xl mb-2 block text-indigo-400"></i>
        <p class="font-medium text-slate-300">Hermes Agent — God Mode V3</p>
        <p class="mt-1">Chat, or flip on <b>Agent mode</b> to let me recall memory, read a URL, and remember facts.</p>
      </div>
    </main>

    <!-- Composer -->
    <footer class="px-3 py-3 border-t border-slate-800 bg-slate-900/60 backdrop-blur" style="padding-bottom:max(0.75rem, env(safe-area-inset-bottom))">
      <div class="flex items-center gap-3 mb-2 px-1">
        <label class="flex items-center gap-1.5 text-xs text-slate-400 cursor-pointer select-none">
          <input id="agent-mode" type="checkbox" class="accent-indigo-500 w-4 h-4" />
          <i class="fas fa-robot"></i> Agent mode (tools)
        </label>
        <span id="agent-hint" class="text-[11px] text-slate-600">recall · crawl · save</span>
      </div>
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
    const DEFAULT_MODEL = '${defaultModel}';
    const $ = (s) => document.querySelector(s);
    const messagesEl = $('#messages');
    const inputEl = $('#input');
    const form = $('#composer');
    const sendBtn = $('#send');
    const statusDot = $('#status-dot');
    const emptyHint = $('#empty-hint');
    const agentModeEl = $('#agent-mode');

    marked.setOptions({ breaks: true, gfm: true });

    const LS = {
      get token(){ return localStorage.getItem('hermes_token') || '' },
      set token(v){ localStorage.setItem('hermes_token', v) },
      get model(){ return localStorage.getItem('hermes_model') || DEFAULT_MODEL },
      set model(v){ localStorage.setItem('hermes_model', v) },
      get system(){ return localStorage.getItem('hermes_system') || '' },
      set system(v){ localStorage.setItem('hermes_system', v) },
      get agent(){ return localStorage.getItem('hermes_agent') === '1' },
      set agent(v){ localStorage.setItem('hermes_agent', v ? '1' : '0') },
    };

    let history = [];
    let busy = false;

    // ---- Settings UI ----
    $('#settings-btn').addEventListener('click', () => $('#settings').classList.toggle('hidden'));
    if (NEEDS_TOKEN && $('#token')) $('#token').value = LS.token;
    $('#model').value = LS.model;
    $('#system').value = LS.system;
    agentModeEl.checked = LS.agent;
    agentModeEl.addEventListener('change', () => { LS.agent = agentModeEl.checked; });
    $('#save-settings').addEventListener('click', () => {
      if (NEEDS_TOKEN && $('#token')) LS.token = $('#token').value.trim();
      LS.model = $('#model').value.trim() || DEFAULT_MODEL;
      LS.system = $('#system').value;
      $('#settings').classList.add('hidden');
      setStatus('idle');
    });
    $('#clear-chat').addEventListener('click', () => {
      history = []; messagesEl.querySelectorAll('.msg,.card').forEach(n => n.remove());
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
        alert(r.ok ? 'Connection OK ✓' : ('Failed: HTTP ' + r.status + (r.status===401 ? ' (check token in Settings)' : '')));
      }catch(e){ setStatus('err'); alert('Network error: ' + e.message); }
    }

    function addMessage(role, text, asMarkdown){
      emptyHint.style.display = 'none';
      const wrap = document.createElement('div');
      wrap.className = 'msg flex ' + (role==='user' ? 'justify-end' : 'justify-start');
      const bubble = document.createElement('div');
      bubble.className = 'max-w-[85%] rounded-2xl px-4 py-2.5 text-[15px] leading-relaxed ' +
        (role==='user' ? 'bg-indigo-600 text-white rounded-br-md' : 'bg-slate-800 text-slate-100 rounded-bl-md md');
      if (role==='user'){ const pre=document.createElement('div'); pre.style.whiteSpace='pre-wrap'; pre.textContent=text; bubble.appendChild(pre); }
      else { bubble.innerHTML = asMarkdown ? marked.parse(text||'') : (text||''); }
      wrap.appendChild(bubble);
      messagesEl.appendChild(wrap);
      messagesEl.scrollTop = messagesEl.scrollHeight;
      return bubble;
    }

    // memory recall chip
    function addChips(items){
      if (!items || !items.length) return;
      const wrap = document.createElement('div');
      wrap.className = 'card flex flex-wrap gap-1.5 px-1';
      const tag = document.createElement('span');
      tag.className = 'text-[11px] text-indigo-300'; tag.innerHTML = '<i class="fas fa-brain"></i> remembering:';
      wrap.appendChild(tag);
      items.slice(0,4).forEach(t => {
        const c = document.createElement('span');
        c.className = 'text-[11px] bg-slate-800 border border-slate-700 rounded-full px-2 py-0.5 text-slate-300';
        c.textContent = (t.length>40 ? t.slice(0,40)+'…' : t);
        wrap.appendChild(c);
      });
      messagesEl.appendChild(wrap);
      messagesEl.scrollTop = messagesEl.scrollHeight;
    }

    // tool step card
    function addToolCard(step){
      const wrap = document.createElement('div');
      wrap.className = 'card flex justify-start';
      const ok = step.ok !== false;
      const icon = step.tool==='crawl_web' ? 'fa-globe' : step.tool==='save_memory' ? 'fa-floppy-disk' : step.tool==='recall_memory' ? 'fa-brain' : 'fa-wrench';
      const color = ok ? 'border-emerald-700/50 text-emerald-300' : 'border-rose-700/50 text-rose-300';
      const box = document.createElement('div');
      box.className = 'max-w-[85%] text-[12px] rounded-xl border ' + color + ' bg-slate-900/50 px-3 py-1.5';
      box.innerHTML = '<i class="fas '+icon+' mr-1"></i><b>'+step.tool+'</b> '+(ok?'✓':'✗')+(step.detail?(' · '+step.detail):'');
      wrap.appendChild(box);
      messagesEl.appendChild(wrap);
      messagesEl.scrollTop = messagesEl.scrollHeight;
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

    inputEl.addEventListener('input', () => {
      inputEl.style.height = 'auto';
      inputEl.style.height = Math.min(inputEl.scrollHeight, 160) + 'px';
    });
    inputEl.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey && !('ontouchstart' in window)) { e.preventDefault(); form.requestSubmit(); }
    });

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (busy) return;
      const text = inputEl.value.trim();
      if (!text) return;
      if (NEEDS_TOKEN && !LS.token) { $('#settings').classList.remove('hidden'); alert('Set your access token in Settings first.'); return; }
      inputEl.value=''; inputEl.style.height='auto';
      addMessage('user', text);
      history.push({ role:'user', content:text });
      if (agentModeEl.checked) await runAgent(); else await streamReply();
    });

    // ---- Plain chat (streaming) ----
    async function streamReply(){
      busy=true; sendBtn.disabled=true; setStatus('busy');
      const typing = typingBubble();
      const msgs = [];
      if (LS.system && LS.system.trim()) msgs.push({ role:'system', content: LS.system.trim() });
      for (const m of history) msgs.push(m);
      let acc='', target=null;
      try{
        const resp = await fetch('/v1/chat/completions', { method:'POST', headers:headers(), body: JSON.stringify({ model: LS.model, messages: msgs, stream: true }) });
        if (!resp.ok){ typing.remove(); const t=await resp.text().catch(()=> ''); addMessage('assistant','⚠️ Error '+resp.status+(resp.status===401?' — check token.':(t?('\\n'+t.slice(0,300)):'')), false); setStatus('err'); busy=false; sendBtn.disabled=false; return; }
        typing.remove(); target = addMessage('assistant','', true);
        const reader = resp.body.getReader(); const dec = new TextDecoder(); let buf='';
        while(true){ const {value,done}=await reader.read(); if(done)break; buf+=dec.decode(value,{stream:true});
          const lines=buf.split('\\n'); buf=lines.pop();
          for(const line of lines){ const t=line.trim(); if(!t.startsWith('data:'))continue; const d=t.slice(5).trim(); if(d==='[DONE]')continue;
            try{ const j=JSON.parse(d); const delta=j.choices&&j.choices[0]&&j.choices[0].delta&&j.choices[0].delta.content; if(delta){ acc+=delta; target.innerHTML=marked.parse(acc); messagesEl.scrollTop=messagesEl.scrollHeight; } }catch(_){}
          }
        }
        history.push({ role:'assistant', content: acc }); setStatus('ok');
      }catch(err){ if(typing&&typing.parentNode)typing.remove(); if(!target)addMessage('assistant','⚠️ Network error: '+err.message,false); setStatus('err'); }
      finally{ busy=false; sendBtn.disabled=false; }
    }

    // ---- Agent mode (tool-loop, non-stream) ----
    async function runAgent(){
      busy=true; sendBtn.disabled=true; setStatus('busy');
      const typing = typingBubble();
      try{
        const resp = await fetch('/api/agent', { method:'POST', headers:headers(), body: JSON.stringify({ messages: history, model: LS.model, system: LS.system }) });
        typing.remove();
        if (!resp.ok){ const t=await resp.text().catch(()=> ''); addMessage('assistant','⚠️ Agent error '+resp.status+(resp.status===401?' — check token.':(t?('\\n'+t.slice(0,300)):'')), false); setStatus('err'); return; }
        const data = await resp.json();
        if (data.recalled && data.recalled.length) addChips(data.recalled);
        if (data.steps) data.steps.forEach(s => { if (s.type==='tool_result' || s.type==='error') addToolCard(s); });
        const answer = data.answer || '(no answer)';
        addMessage('assistant', answer, true);
        history.push({ role:'assistant', content: answer });
        setStatus('ok');
      }catch(err){ if(typing&&typing.parentNode)typing.remove(); addMessage('assistant','⚠️ Network error: '+err.message,false); setStatus('err'); }
      finally{ busy=false; sendBtn.disabled=false; }
    }

    setStatus('idle');
  })();
  </script>
</body>
</html>`
}

/**
 * Memory dashboard — GET /memory. Lists / deletes stored memories (HITL).
 */
export function memoryPage(opts: { protected: boolean }): string {
  const needsToken = opts.protected
  return `<!DOCTYPE html>
<html lang="en" class="h-full">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />
  <meta name="theme-color" content="#0b1020" />
  <title>Hermes Memory</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" rel="stylesheet" />
  <style>html,body{height:100%;background:#0b1020}</style>
</head>
<body class="h-full text-slate-100">
  <div class="flex flex-col h-full max-w-3xl mx-auto">
    <header class="flex items-center justify-between px-4 py-3 border-b border-slate-800 bg-slate-900/60 backdrop-blur sticky top-0 z-10">
      <div class="flex items-center gap-2">
        <a href="/chat" class="text-slate-400 hover:text-indigo-300"><i class="fas fa-arrow-left"></i></a>
        <i class="fas fa-brain text-indigo-400"></i>
        <h1 class="font-semibold tracking-tight">Long-term Memory</h1>
        <span id="count" class="text-xs text-slate-500"></span>
      </div>
      <button id="refresh" class="text-slate-400 hover:text-slate-100 px-2 py-1"><i class="fas fa-rotate"></i></button>
    </header>

    ${needsToken ? `
    <div id="token-row" class="px-4 py-2 border-b border-slate-800 bg-slate-900/40 text-sm flex gap-2">
      <input id="token" type="password" placeholder="PROXY_TOKEN" class="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
      <button id="save-token" class="bg-indigo-600 hover:bg-indigo-500 px-3 rounded-lg">Use</button>
    </div>` : ''}

    <section class="px-4 py-3 border-b border-slate-800 bg-slate-900/30 flex gap-2">
      <input id="new-text" placeholder="Add a fact to remember…" class="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
      <input id="new-tags" placeholder="tags,comma" class="w-28 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
      <button id="add" class="bg-indigo-600 hover:bg-indigo-500 px-3 rounded-lg text-sm"><i class="fas fa-plus"></i></button>
    </section>

    <main id="list" class="flex-1 overflow-y-auto px-4 py-4 space-y-2">
      <p id="empty" class="text-center text-slate-500 text-sm mt-10">No memories yet.</p>
    </main>
  </div>

  <script>
  (function(){
    const NEEDS_TOKEN = ${needsToken ? 'true' : 'false'};
    const $=(s)=>document.querySelector(s);
    const LS={ get token(){return localStorage.getItem('hermes_token')||''}, set token(v){localStorage.setItem('hermes_token',v)} };
    if (NEEDS_TOKEN && $('#token')) $('#token').value = LS.token;
    if (NEEDS_TOKEN && $('#save-token')) $('#save-token').addEventListener('click', ()=>{ LS.token=$('#token').value.trim(); load(); });
    function headers(){ const h={'Content-Type':'application/json'}; if(NEEDS_TOKEN&&LS.token)h['Authorization']='Bearer '+LS.token; return h; }

    async function load(){
      try{
        const r = await fetch('/api/memory', { headers: headers() });
        if(!r.ok){ $('#empty').textContent = 'Error '+r.status+(r.status===401?' — set PROXY_TOKEN above.':''); $('#empty').style.display=''; return; }
        const data = await r.json();
        const items = data.items||[];
        $('#count').textContent = '('+items.length+')';
        const list = $('#list'); list.querySelectorAll('.mem').forEach(n=>n.remove());
        $('#empty').style.display = items.length ? 'none' : '';
        items.forEach(m=>{
          const d=document.createElement('div'); d.className='mem bg-slate-800/60 border border-slate-700 rounded-xl px-3 py-2.5 flex items-start gap-3';
          const date = new Date(m.ts).toLocaleString();
          d.innerHTML='<div class="flex-1"><p class="text-sm">'+escapeHtml(m.text)+'</p>'+
            '<p class="text-[11px] text-slate-500 mt-1">'+date+(m.tags&&m.tags.length?(' · '+m.tags.map(t=>'#'+t).join(' ')):'')+'</p></div>'+
            '<button data-id="'+m.id+'" class="del text-slate-500 hover:text-rose-400 px-1"><i class="fas fa-trash"></i></button>';
          list.appendChild(d);
        });
        list.querySelectorAll('.del').forEach(b=>b.addEventListener('click', async ()=>{
          if(!confirm('Delete this memory?'))return;
          await fetch('/api/memory/'+encodeURIComponent(b.dataset.id), { method:'DELETE', headers: headers() }); load();
        }));
      }catch(e){ $('#empty').textContent='Network error: '+e.message; $('#empty').style.display=''; }
    }
    function escapeHtml(s){ return (s||'').replace(/[&<>]/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c])); }

    $('#refresh').addEventListener('click', load);
    $('#add').addEventListener('click', async ()=>{
      const text=$('#new-text').value.trim(); if(!text)return;
      const tags=$('#new-tags').value.split(',').map(t=>t.trim()).filter(Boolean);
      const r=await fetch('/api/memory',{method:'POST',headers:headers(),body:JSON.stringify({text,tags})});
      if(r.ok){ $('#new-text').value=''; $('#new-tags').value=''; load(); } else { alert('Save failed: '+r.status); }
    });
    load();
  })();
  </script>
</body>
</html>`
}
