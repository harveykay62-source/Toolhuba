/* ── ToolHub AI — tools.js — All 65 Tools ─────────────────────────────────── */
'use strict';

function buildToolPage(tool, contentFn) {
  const app = document.getElementById('app');
  document.title = `${tool.name} — ToolHub AI`;
  app.innerHTML = `
    <div class="tool-page">
      <button class="tool-page-back" onclick="navigate('home')">${ICONS.back} Back to all tools</button>
      ${getToolPageAd()}
      <div class="tool-page-header">
        <div class="tool-page-icon cat-${tool.category}">${tool.icon}</div>
        <div class="tool-page-meta"><h1>${tool.name}</h1><p>${tool.description}</p></div>
      </div>
      <div id="toolContent"></div>
    </div>`;
  if (contentFn) contentFn();
}

function renderToolPage(tool) {
  const H = {
    'ai-detector':renderAIDetector,'ai-humanizer':renderHumanizer,'paraphraser':renderParaphraser,'summarizer':renderSummarizer,
    'grammar-fixer':renderGrammarFixer,'word-counter':renderWordCounter,'case-converter':renderCaseConverter,
    'tone-analyzer':renderToneAnalyzer,'sentence-expander':renderSentenceExpander,'text-cleaner':renderTextCleaner,
    'bullet-points':renderBulletPoints,'cliche-detector':renderClicheDetector,'markdown-previewer':renderMarkdownPreviewer,
    'emoji-picker':renderEmojiPicker,'lorem-ipsum':renderLoremIpsum,'word-frequency':renderWordFrequency,
    'text-diff':renderTextDiff,'readability-checker':renderReadabilityChecker,'text-to-speech':renderTTS,
    'hashtag-generator':renderHashtagGenerator,'email-subject-generator':renderEmailSubjectGen,
    'plagiarism-highlighter':renderPlagiarismHL,'sentence-rewriter':renderSentenceRewriter,
    'active-voice-converter':renderActiveVoice,'character-counter':renderCharCounter,
    'markdown-to-html':renderMD2HTML,
    'password-generator':renderPasswordGenerator,'image-converter':renderImageConverter,
    'image-resizer':renderImageResizer,'yt-thumbnail':renderYTThumb,'qr-generator':renderQRGen,
    'color-palette':renderColorPalette,'base64':renderBase64,'image-to-text':renderImageToText,
    'color-picker':renderColorPicker,'favicon-generator':renderFaviconGen,'gif-maker':renderGIFMaker,
    'screenshot-resizer':renderScreenshotResizer,'gradient-generator':renderGradientGen,
    'timestamp-converter':renderTimestamp,'json-formatter':renderJSON,'name-generator':renderNameGen,
    'unit-converter':renderUnitConverter,'calculator':renderCalculator,'binary-converter':renderBinary,
    'url-encoder':renderURLEncoder,'ip-lookup':renderIPLookup,'hash-generator':renderHashGen,
    'regex-tester':renderRegexTester,'css-minifier':renderCSSMin,'html-minifier':renderHTMLMin,
    'js-minifier':renderJSMin,'color-contrast':renderColorContrast,'currency-converter':renderCurrencyConverter,
    'age-calculator':renderAgeCalc,'percentage-calculator':renderPctCalc,'bmi-calculator':renderBMI,
    'timezone-converter':renderTimezone,'uuid-generator':renderUUID,'number-to-words':renderNum2Words,
    'random-picker':renderRandomPicker,'slug-generator':renderSlugGen,'morse-code':renderMorse,
    'csv-to-json':renderCSV2JSON,'pomodoro-timer':renderPomodoro,'typing-test':renderTypingTest,
  };
  const fn = H[tool.id];
  if (fn) fn(tool);
  else buildToolPage(tool, () => { document.getElementById('toolContent').innerHTML = `<div class="info-box">This tool is coming soon.</div>`; });
}

// ─── Shared helpers ───────────────────────────────────────────────────────────
async function runTool(toolId, body, outputId, transform) {
  const btn = document.querySelector('#toolContent .btn-primary');
  if (btn) {
    if (btn.disabled) return null; // prevent double-click corruption
    btn.disabled = true;
    if (!btn.dataset.orig) btn.dataset.orig = btn.innerHTML;
    btn.textContent = '⏳ Processing…';
  }
  try {
    const d = await apiFetch(`/api/tools/${toolId}`, 'POST', body);
    const out = document.getElementById(outputId);
    if (out) out.textContent = transform ? transform(d) : (d.result || d.text || JSON.stringify(d));
    toast('Done!', 'success');
    return d;
  } catch(e) { toast(e.message || 'Error', 'error'); return null; }
  finally { if (btn) { btn.disabled = false; btn.innerHTML = btn.dataset.orig || btn.innerHTML; } }
}

function copyBtn(id) { return `<button class="btn btn-secondary btn-sm" onclick="copyText((document.getElementById('${id}').innerText||document.getElementById('${id}').textContent||'').trim())">${ICONS.copy} Copy</button>`; }
function dlBtn(id, fname) { return `<button class="btn btn-secondary btn-sm" onclick="downloadText((document.getElementById('${id}').innerText||document.getElementById('${id}').textContent||'').trim(),'${fname}')">${ICONS.download} Download</button>`; }


// ═══════════════════════════════════════════════════════════════════════════════
// TEXT TOOLS
// ═══════════════════════════════════════════════════════════════════════════════

// ─── AI Content Detector ─────────────────────────────────────────────────────

function renderAIDetector(tool) {
  buildToolPage(tool, () => {
    document.getElementById('toolContent').innerHTML = `
      <div class="tool-section">
        <label class="tool-label">Paste text to analyze</label>
        <textarea class="tool-textarea" id="aidIn" rows="8" placeholder="Paste any text here — email, essay, article, blog post, social media caption — and we'll tell you whether it reads as AI-generated or human-written…" oninput="this.nextElementSibling.textContent=this.value.split(/\\s+/).filter(Boolean).length+' words'"></textarea>
        <div class="char-count">0 words</div>
      </div>
      <div class="btn-group">
        <button class="btn btn-primary" onclick="doAIDetect()">🔍 Analyze Text</button>
      </div>
      <div id="aidResult"></div>`;
  });
}

async function doAIDetect() {
  const text = document.getElementById('aidIn').value.trim();
  if (!text) { toast('Please enter some text.', 'warn'); return; }
  const btn = document.querySelector('#toolContent .btn-primary');
  if (btn) { btn.disabled = true; btn.textContent = '⏳ Analyzing…'; }
  try {
    const d = await apiFetch('/api/tools/ai-detector', 'POST', { text });
    const out = document.getElementById('aidResult');
    if (!out) return;

    const pct = d.aiScore;
    const humanPct = d.humanScore;
    const barColor = pct >= 75 ? '#ef4444' : pct >= 55 ? '#f97316' : pct >= 35 ? '#eab308' : '#22c55e';

    const vectorHtml = (d.vectors || []).map(v => {
      const c = v.score >= 70 ? '#ef4444' : v.score >= 45 ? '#f97316' : v.score >= 25 ? '#eab308' : '#22c55e';
      return `<div class="aidv-row">
        <span class="aidv-label">${v.name}</span>
        <div class="aidv-bar-wrap">
          <div class="aidv-bar" style="width:${v.score}%;background:${c}"></div>
        </div>
        <span class="aidv-score" style="color:${c}">${v.score}%</span>
      </div>`;
    }).join('');

    const signalHtml = (d.topSignals || []).length > 0
      ? d.topSignals.map(s => `<span class="aid-signal-tag" title="${s.name}: ${s.score}%">${s.label} (${s.score}%)</span>`).join('')
      : '<span class="aid-signal-tag" style="background:var(--green);color:#fff">No strong AI signals</span>';

    out.innerHTML = `
      <div class="aid-result-card">
        <div class="aid-verdict">
          <div class="aid-verdict-icon">${d.verdictIcon}</div>
          <div class="aid-verdict-text">
            <div class="aid-verdict-main" style="color:${barColor}">${d.verdict}</div>
            <div class="aid-verdict-sub">Based on 15 linguistic and statistical signals</div>
          </div>
        </div>
        <div class="aid-score-row">
          <div class="aid-score-block">
            <div class="aid-score-num" style="color:${barColor}">${pct}%</div>
            <div class="aid-score-lbl">AI Probability</div>
          </div>
          <div class="aid-gauge-wrap">
            <div class="aid-gauge-track">
              <div class="aid-gauge-fill" style="width:${pct}%;background:${barColor}"></div>
            </div>
            <div class="aid-gauge-labels"><span>Human</span><span>AI</span></div>
          </div>
          <div class="aid-score-block">
            <div class="aid-score-num" style="color:#22c55e">${humanPct}%</div>
            <div class="aid-score-lbl">Human Probability</div>
          </div>
        </div>
        <div class="aid-signals-section">
          <div class="output-label" style="margin-bottom:8px">⚡ Top AI Signals Detected</div>
          <div class="aid-signals-wrap">${signalHtml}</div>
        </div>
        <div class="aid-vectors-section">
          <div class="output-label" style="margin-bottom:10px">📊 Detection Breakdown</div>
          <div class="aid-vectors">${vectorHtml}</div>
        </div>
        <div class="aid-stats-section">
          <div class="output-label" style="margin-bottom:10px">📈 Text Statistics</div>
          <div class="aid-stats-grid">
            <div class="aid-stat"><span>${d.stats.wordCount}</span>Words</div>
            <div class="aid-stat"><span>${d.stats.sentenceCount}</span>Sentences</div>
            <div class="aid-stat"><span>${d.stats.avgSentenceWords}</span>Avg Words/Sentence</div>
            <div class="aid-stat"><span>${d.stats.avgWordLength}</span>Avg Word Length</div>
            <div class="aid-stat"><span>${d.stats.formalWordCount}</span>Formal Words</div>
            <div class="aid-stat"><span>${d.stats.boilerphraseCount}</span>AI Phrases Found</div>
          </div>
        </div>
        <div class="info-box" style="margin-top:14px">
          <strong>ℹ️ How it works:</strong> This tool analyses 15 linguistic patterns common in AI-generated text — including sentence length uniformity, AI boilerplate phrases, formal vocabulary density, passive voice ratio, contraction absence, and more. Results are probabilistic, not definitive.
        </div>
        <div class="output-actions">${copyBtn('aidResultText')}</div>
        <div id="aidResultText" style="position:absolute;opacity:0;pointer-events:none;font-size:0">${d.verdict} — AI Score: ${pct}%, Human Score: ${humanPct}%</div>
      </div>`;
    toast('Analysis complete!', 'success');
  } catch(e) { toast(e.message || 'Analysis failed', 'error'); }
  finally { if (btn) { btn.disabled = false; btn.textContent = '🔍 Analyze Text'; } }
}

function renderHumanizer(tool) {
  buildToolPage(tool, () => {
    document.getElementById('toolContent').innerHTML = `
      <div class="tool-section"><label class="tool-label">AI-generated text</label>
        <textarea class="tool-textarea" id="humIn" rows="7" placeholder="Paste AI-generated text here…" oninput="this.nextElementSibling.textContent=this.value.length+' chars'"></textarea>
        <div class="char-count">0 chars</div></div>
      <div class="btn-group"><button class="btn btn-primary" onclick="doHumanizer()">🤖 Humanize Text</button></div>
      <div class="output-label">Result</div>
      <div class="output-box" id="humOut"><span class="output-placeholder">Humanized text will appear here…</span></div>
      <div class="output-actions">${copyBtn('humOut')} ${dlBtn('humOut','humanized.txt')}</div>`;
  });
}
async function doHumanizer() {
  const text = document.getElementById('humIn').value.trim();
  if (!text) { toast('Please enter some text.','warn'); return; }
  const d = await runTool('ai-humanizer',{text},'humOut',d=>d.result||d.humanized||text);
}

function renderParaphraser(tool) {
  buildToolPage(tool, () => {
    document.getElementById('toolContent').innerHTML = `
      <div class="tool-section"><label class="tool-label">Text to paraphrase</label>
        <textarea class="tool-textarea" id="paraIn" rows="6" placeholder="Enter text to paraphrase…"></textarea></div>
      <div class="tool-row" style="margin-bottom:14px">
        <div class="tool-col"><label class="tool-label">Mode</label>
          <select class="tool-select" id="paraMode"><option value="standard">Standard</option><option value="formal">Formal</option><option value="casual">Casual</option><option value="creative">Creative</option></select></div>
        <div class="tool-col"><label class="tool-label">Variants</label>
          <select class="tool-select" id="paraCount"><option value="1">1</option><option value="3" selected>3</option><option value="5">5</option></select></div>
      </div>
      <div class="btn-group"><button class="btn btn-primary" onclick="doParaphraser()">✏️ Paraphrase</button></div>
      <div id="paraOut"></div>`;
  });
}
async function doParaphraser() {
  const text=document.getElementById('paraIn').value.trim();
  if (!text) { toast('Please enter text.','warn'); return; }
  const btn=document.querySelector('#toolContent .btn-primary'); btn.disabled=true; if(!btn.dataset.origHtml)btn.dataset.origHtml=btn.innerHTML; btn.textContent='⏳ Rewriting…';
  try {
    const d=await apiFetch('/api/tools/paraphraser','POST',{text,mode:document.getElementById('paraMode').value,count:parseInt(document.getElementById('paraCount').value)});
    const variants=d.variants||d.results||[d.result||text];
    document.getElementById('paraOut').innerHTML=variants.map((v,i)=>`
      <div style="margin-top:12px"><div class="output-label">Variant ${i+1}</div>
      <div class="output-box">${v}</div>
      <div class="output-actions"><button class="btn btn-secondary btn-sm" onclick="copyText(this.closest('div').previousElementSibling.textContent||this.closest('div').previousElementSibling.innerText)">${ICONS.copy} Copy</button></div></div>`).join('');
    toast('Done!','success');
  } catch(e){toast(e.message||'Error','error');}
  finally{btn.disabled=false;btn.innerHTML=btn.dataset.origHtml||btn.innerHTML;delete btn.dataset.origHtml;}
}

function renderSummarizer(tool) {
  buildToolPage(tool, () => {
    document.getElementById('toolContent').innerHTML = `
      <div class="tool-section"><label class="tool-label">Text to summarize</label>
        <textarea class="tool-textarea" id="sumIn" rows="8" placeholder="Paste the text you want to summarize…"></textarea></div>
      <div class="tool-row" style="margin-bottom:14px">
        <div class="tool-col"><label class="tool-label">Length</label>
          <select class="tool-select" id="sumLen"><option value="short">Short</option><option value="medium" selected>Medium</option><option value="long">Long</option></select></div>
      </div>
      <div class="btn-group"><button class="btn btn-primary" onclick="doSummarizer()">📝 Summarize</button></div>
      <div class="output-label">Summary</div>
      <div class="output-box" id="sumOut"><span class="output-placeholder">Summary will appear here…</span></div>
      <div class="output-actions">${copyBtn('sumOut')}</div>`;
  });
}
async function doSummarizer() {
  const text=document.getElementById('sumIn').value.trim();
  if(!text){toast('Please enter text.','warn');return;}
  await runTool('summarizer',{text,length:document.getElementById('sumLen').value},'sumOut',d=>d.summary||d.result||text);
}

function renderGrammarFixer(tool) {
  buildToolPage(tool, () => {
    document.getElementById('toolContent').innerHTML = `
      <div class="tool-section"><label class="tool-label">Text to fix</label>
        <textarea class="tool-textarea" id="gramIn" rows="7" placeholder="Paste text with grammar errors…"></textarea></div>
      <div class="btn-group"><button class="btn btn-primary" onclick="doGrammar()">✅ Fix Grammar</button></div>
      <div class="output-label">Corrected Text</div>
      <div class="output-box" id="gramOut"><span class="output-placeholder">Fixed text will appear here…</span></div>
      <div class="output-actions">${copyBtn('gramOut')} ${dlBtn('gramOut','corrected.txt')}</div>`;
  });
}
async function doGrammar() {
  const text=document.getElementById('gramIn').value.trim();
  if(!text){toast('Please enter text.','warn');return;}
  await runTool('grammar-fixer',{text},'gramOut',d=>d.result||d.corrected||text);
}

function renderWordCounter(tool) {
  buildToolPage(tool, () => {
    document.getElementById('toolContent').innerHTML = `
      <div class="tool-section"><label class="tool-label">Your text</label>
        <textarea class="tool-textarea" id="wcIn" rows="10" placeholder="Type or paste your text here…" oninput="doWordCount()"></textarea></div>
      <div class="stat-grid" id="wcStats">
        ${['Words','Characters','Sentences','Paragraphs','Read Time'].map(l=>`<div class="stat-card"><div class="stat-value" id="wc${l.replace(/\s/g,'')}">0</div><div class="stat-label">${l}</div></div>`).join('')}
      </div>`;
  });
}
function doWordCount() {
  const t=document.getElementById('wcIn').value;
  const w=t.trim()?t.trim().split(/\s+/).length:0;
  document.getElementById('wcWords').textContent=w;
  document.getElementById('wcCharacters').textContent=t.length;
  document.getElementById('wcSentences').textContent=(t.match(/[.!?]+/g)||[]).length;
  document.getElementById('wcParagraphs').textContent=t.split(/\n\n+/).filter(p=>p.trim()).length||0;
  document.getElementById('wcReadTime').textContent=Math.ceil(w/200)+'m';
}

function renderCaseConverter(tool) {
  buildToolPage(tool, () => {
    document.getElementById('toolContent').innerHTML = `
      <div class="tool-section"><label class="tool-label">Your text</label>
        <textarea class="tool-textarea" id="caseIn" rows="6" placeholder="Enter text to convert…"></textarea></div>
      <div class="btn-group" style="flex-wrap:wrap">
        ${[['upper','UPPER'],['lower','lower'],['title','Title'],['sentence','Sentence'],['camel','camelCase'],['pascal','PascalCase'],['snake','snake_case'],['kebab','kebab-case']].map(([m,l])=>`<button class="btn btn-secondary btn-sm" onclick="doCase('${m}')">${l}</button>`).join('')}
      </div>
      <div class="output-label">Result</div>
      <div class="output-box" id="caseOut"><span class="output-placeholder">Select a case mode…</span></div>
      <div class="output-actions">${copyBtn('caseOut')}</div>`;
  });
}
async function doCase(mode) {
  const text=document.getElementById('caseIn').value;
  if(!text){toast('Please enter text.','warn');return;}
  try{const d=await apiFetch('/api/tools/case-converter','POST',{text,mode});document.getElementById('caseOut').textContent=d.result;}
  catch(e){toast(e.message||'Error','error');}
}

function renderToneAnalyzer(tool) {
  buildToolPage(tool, () => {
    document.getElementById('toolContent').innerHTML = `
      <div class="tool-section"><label class="tool-label">Text to analyze</label>
        <textarea class="tool-textarea" id="toneIn" rows="6" placeholder="Enter text to analyze tone…"></textarea></div>
      <div class="btn-group"><button class="btn btn-primary" onclick="doTone()">🎭 Analyze Tone</button></div>
      <div id="toneOut"></div>`;
  });
}
async function doTone() {
  const text=document.getElementById('toneIn').value.trim();
  if(!text){toast('Please enter text.','warn');return;}
  const btn=document.querySelector('#toolContent .btn-primary');btn.disabled=true;if(!btn.dataset.origHtml)btn.dataset.origHtml=btn.innerHTML;btn.textContent='⏳ Analyzing…';
  try{
    const d=await apiFetch('/api/tools/tone-analyzer','POST',{text});
    document.getElementById('toneOut').innerHTML=`<div class="stat-grid" style="margin-top:16px">
      <div class="stat-card"><div class="stat-value" style="font-size:16px">${d.tone||d.primary||'Neutral'}</div><div class="stat-label">Primary Tone</div></div>
      <div class="stat-card"><div class="stat-value" style="font-size:16px">${d.sentiment||'Neutral'}</div><div class="stat-label">Sentiment</div></div>
      <div class="stat-card"><div class="stat-value" style="font-size:16px">${d.formality||'Standard'}</div><div class="stat-label">Formality</div></div>
      <div class="stat-card"><div class="stat-value">${d.confidence||d.score||'--'}</div><div class="stat-label">Confidence</div></div>
    </div>${d.breakdown?`<div class="info-box" style="margin-top:12px">${d.breakdown}</div>`:''}`;
    toast('Done!','success');
  }catch(e){toast(e.message||'Error','error');}
  finally{btn.disabled=false;btn.innerHTML=btn.dataset.origHtml||btn.innerHTML;delete btn.dataset.origHtml;}
}

function renderSentenceExpander(tool) {
  buildToolPage(tool, () => {
    document.getElementById('toolContent').innerHTML = `
      <div class="tool-section"><label class="tool-label">Text to expand</label>
        <textarea class="tool-textarea" id="expIn" rows="5" placeholder="Enter short text to expand…"></textarea></div>
      <div class="tool-row" style="margin-bottom:14px">
        <div class="tool-col"><label class="tool-label">Level</label>
          <select class="tool-select" id="expLevel"><option value="light">Light</option><option value="medium" selected>Medium</option><option value="heavy">Heavy</option></select></div>
      </div>
      <div class="btn-group"><button class="btn btn-primary" onclick="doExpand()">📈 Expand</button></div>
      <div class="output-label">Expanded Text</div>
      <div class="output-box" id="expOut"><span class="output-placeholder">Expanded text will appear here…</span></div>
      <div class="output-actions">${copyBtn('expOut')}</div>`;
  });
}
async function doExpand() {
  const text=document.getElementById('expIn').value.trim();
  if(!text){toast('Please enter text.','warn');return;}
  await runTool('sentence-expander',{text,level:document.getElementById('expLevel').value},'expOut',d=>d.result||d.expanded||text);
}

function renderTextCleaner(tool) {
  buildToolPage(tool, () => {
    document.getElementById('toolContent').innerHTML = `
      <div class="tool-section"><label class="tool-label">Text to clean</label>
        <textarea class="tool-textarea" id="cleanIn" rows="7" placeholder="Paste messy text here…"></textarea></div>
      <div style="display:flex;flex-wrap:wrap;gap:10px;margin-bottom:14px">
        <label class="checkbox-row"><input type="checkbox" id="cleanHTML" checked><span class="checkbox-label">Strip HTML</span></label>
        <label class="checkbox-row"><input type="checkbox" id="cleanDup" checked><span class="checkbox-label">Remove duplicates</span></label>
        <label class="checkbox-row"><input type="checkbox" id="cleanSpace" checked><span class="checkbox-label">Fix spacing</span></label>
        <label class="checkbox-row"><input type="checkbox" id="cleanTypo" checked><span class="checkbox-label">Normalize typography</span></label>
      </div>
      <div class="btn-group"><button class="btn btn-primary" onclick="doCleaner()">🧹 Clean Text</button></div>
      <div class="output-label">Cleaned Text</div>
      <div class="output-box" id="cleanOut"><span class="output-placeholder">Cleaned text will appear here…</span></div>
      <div class="output-actions">${copyBtn('cleanOut')}</div>`;
  });
}
async function doCleaner() {
  const text=document.getElementById('cleanIn').value.trim();
  if(!text){toast('Please enter text.','warn');return;}
  await runTool('text-cleaner',{text,removeHTML:document.getElementById('cleanHTML').checked,removeDuplicates:document.getElementById('cleanDup').checked,fixSpacing:document.getElementById('cleanSpace').checked,normaliseTypo:document.getElementById('cleanTypo').checked},'cleanOut',d=>d.result||d.cleaned||text);
}

function renderBulletPoints(tool) {
  buildToolPage(tool, () => {
    document.getElementById('toolContent').innerHTML = `
      <div class="tool-section"><label class="tool-label">Text to convert</label>
        <textarea class="tool-textarea" id="bpIn" rows="7" placeholder="Paste a paragraph or prose text…"></textarea></div>
      <div class="tool-row" style="margin-bottom:14px">
        <div class="tool-col"><label class="tool-label">Style</label>
          <select class="tool-select" id="bpStyle"><option value="bullet">• Bullet</option><option value="dash">— Dash</option><option value="numbered">1. Numbered</option><option value="checkbox">☐ Checkbox</option></select></div>
        <div class="tool-col"><label class="tool-label">Max Items</label>
          <input type="number" class="tool-input" id="bpMax" value="10" min="3" max="30" style="width:80px"></div>
      </div>
      <div class="btn-group"><button class="btn btn-primary" onclick="doBullets()">📋 Convert</button></div>
      <div class="output-label">Bullet Points</div>
      <div class="output-box" id="bpOut" style="white-space:pre-wrap"><span class="output-placeholder">Bullet points will appear here…</span></div>
      <div class="output-actions">${copyBtn('bpOut')}</div>`;
  });
}
async function doBullets() {
  const text=document.getElementById('bpIn').value.trim();
  if(!text){toast('Please enter text.','warn');return;}
  await runTool('bullet-points',{text,style:document.getElementById('bpStyle').value,maxItems:parseInt(document.getElementById('bpMax').value)},'bpOut',d=>d.result||(d.bullets||[]).join('\n')||text);
}

function renderClicheDetector(tool) {
  buildToolPage(tool, () => {
    document.getElementById('toolContent').innerHTML = `
      <div class="tool-section"><label class="tool-label">Text to check</label>
        <textarea class="tool-textarea" id="clicheIn" rows="7" placeholder="Paste your text to detect clichés…"></textarea></div>
      <div style="margin-bottom:14px"><label class="checkbox-row"><input type="checkbox" id="clicheReplace"><span class="checkbox-label">Auto-suggest replacements</span></label></div>
      <div class="btn-group"><button class="btn btn-primary" onclick="doCliche()">🚫 Detect Clichés</button></div>
      <div id="clicheOut"></div>`;
  });
}
async function doCliche() {
  const text=document.getElementById('clicheIn').value.trim();
  if(!text){toast('Please enter text.','warn');return;}
  const btn=document.querySelector('#toolContent .btn-primary');btn.disabled=true;if(!btn.dataset.origHtml)btn.dataset.origHtml=btn.innerHTML;btn.textContent='⏳ Scanning…';
  try{
    const d=await apiFetch('/api/tools/cliche-detector','POST',{text,autoReplace:document.getElementById('clicheReplace').checked});
    const cl=d.cliches||d.found||[];
    document.getElementById('clicheOut').innerHTML=cl.length
      ?`<div class="info-box" style="margin-top:12px"><strong>${cl.length} clichés found</strong></div>`+cl.map(c=>`<div class="output-box" style="margin-top:8px"><strong>"${c.phrase||c}"</strong>${c.suggestion?` → <em>${c.suggestion}</em>`:''}</div>`).join('')
      :`<div class="output-box" style="margin-top:12px"><span style="color:var(--success)">✓ No clichés found! Your writing looks fresh.</span></div>`;
    toast(`${cl.length} clichés found`,'info');
  }catch(e){toast(e.message||'Error','error');}
  finally{btn.disabled=false;btn.innerHTML=btn.dataset.origHtml||btn.innerHTML;delete btn.dataset.origHtml;}
}

function renderMarkdownPreviewer(tool) {
  buildToolPage(tool, () => {
    document.getElementById('toolContent').innerHTML = `
      <div class="side-by-side">
        <div><div class="output-label">Markdown</div>
          <textarea class="tool-textarea" id="mdIn" rows="22" placeholder="# Hello World\n\nWrite **Markdown** here…" oninput="renderMDPreview()" style="height:420px;resize:none;font-family:'SF Mono',monospace;font-size:13px"></textarea></div>
        <div><div class="output-label">Preview</div>
          <div class="markdown-preview" id="mdOut" style="height:420px;overflow-y:auto"></div></div>
      </div>
      <div class="output-actions" style="margin-top:10px">
        <button class="btn btn-secondary btn-sm" onclick="copyText(document.getElementById('mdIn').value,'Markdown copied')">${ICONS.copy} Copy MD</button>
        <button class="btn btn-secondary btn-sm" onclick="copyText(document.getElementById('mdOut').innerHTML,'HTML copied')">${ICONS.copy} Copy HTML</button>
      </div>`;
    renderMDPreview();
  });
}
function renderMDPreview() {
  const md=document.getElementById('mdIn')?.value||'';
  const out=document.getElementById('mdOut'); if(!out)return;
  let h=md.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
    .replace(/^######\s(.+)$/gm,'<h6>$1</h6>').replace(/^#####\s(.+)$/gm,'<h5>$1</h5>')
    .replace(/^####\s(.+)$/gm,'<h4>$1</h4>').replace(/^###\s(.+)$/gm,'<h3>$1</h3>')
    .replace(/^##\s(.+)$/gm,'<h2>$1</h2>').replace(/^#\s(.+)$/gm,'<h1>$1</h1>')
    .replace(/\*\*\*(.+?)\*\*\*/g,'<strong><em>$1</em></strong>').replace(/\*\*(.+?)\*\*/g,'<strong>$1</strong>')
    .replace(/\*(.+?)\*/g,'<em>$1</em>').replace(/~~(.+?)~~/g,'<del>$1</del>')
    .replace(/`([^`]+)`/g,'<code>$1</code>').replace(/\[([^\]]+)\]\(([^)]+)\)/g,'<a href="$2" target="_blank">$1</a>')
    .replace(/^>\s(.+)$/gm,'<blockquote>$1</blockquote>').replace(/^[-*+]\s(.+)$/gm,'<li>$1</li>')
    .replace(/\n\n/g,'</p><p>');
  out.innerHTML=h;
}

function renderMD2HTML(tool) {
  buildToolPage(tool, () => {
    document.getElementById('toolContent').innerHTML = `
      <div class="tool-section"><label class="tool-label">Markdown text</label>
        <textarea class="tool-textarea" id="md2In" rows="8" placeholder="Enter Markdown text…"></textarea></div>
      <div class="btn-group"><button class="btn btn-primary" onclick="doMD2HTML()">🌐 Convert to HTML</button></div>
      <div class="output-label">HTML Output</div>
      <div class="code-block" id="md2Out" style="min-height:80px;white-space:pre-wrap">HTML will appear here…</div>
      <div class="output-actions"><button class="btn btn-secondary btn-sm" onclick="copyText(document.getElementById('md2Out').innerText,'HTML copied')">${ICONS.copy} Copy HTML</button></div>`;
  });
}
async function doMD2HTML() {
  const text=document.getElementById('md2In').value.trim();
  if(!text){toast('Please enter Markdown.','warn');return;}
  const btn=document.querySelector('#toolContent .btn-primary');btn.disabled=true;if(!btn.dataset.origHtml)btn.dataset.origHtml=btn.innerHTML;btn.textContent='⏳ Converting…';
  try{const d=await apiFetch('/api/tools/markdown-to-html','POST',{text});document.getElementById('md2Out').textContent=d.html||'';toast('Converted!','success');}
  catch(e){toast(e.message||'Error','error');}
  finally{btn.disabled=false;btn.innerHTML=btn.dataset.origHtml||btn.innerHTML;delete btn.dataset.origHtml;}
}

function renderEmojiPicker(tool) {
  const EMOJI={Smileys:['😀','😃','😄','😁','😆','😅','😂','🤣','😊','😇','🙂','😉','😍','🥰','😘','😋','😛','😜','🤪','😝','🤑','🤗','🤔','😐','😑','😶','😏','😒','🙄','😬','😔','😪','🤤','😴','😷','🤒','🤕','🤢','🤧','🥵','🥶','😵','🤯','🤠','🥳','😎','😕','😟','🙁','☹️','😮','😯','😲','😳','🥺','😦','😧','😨','😰','😥','😢','😭','😱','😩','😫'],Hands:['👍','👎','👌','✌️','🤞','🤟','🤘','🤙','👈','👉','👆','👇','☝️','👋','🤚','🖐️','✋','👏','🙌','🤲','🤝','🙏','💪','✍️'],Animals:['🐶','🐱','🐭','🐹','🐰','🦊','🐻','🐼','🐨','🐯','🦁','🐮','🐷','🐸','🐵','🙈','🐔','🐧','🐦','🦆','🦅','🦉','🦇','🐺','🐴','🦄','🐝','🦋','🐌','🐞','🐢','🐍','🦎','🐙','🦑','🐟','🐬','🐳','🦈','🐊','🐘','🦁','🦒','🦘','🐕','🐈'],Food:['🍎','🍐','🍊','🍋','🍌','🍉','🍇','🍓','🍒','🍑','🥭','🍍','🥥','🥝','🍅','🍆','🥑','🥦','🌽','🥕','🧄','🥔','🍔','🍟','🍕','🌭','🥪','🌮','🌯','🥗','🍜','🍝','🍣','🍱','🍦','🍧','🍨','🍩','🍪','🎂','🍰','🧁','🍫','🍬','🍭','☕','🍵','🥤','🍺','🥂','🍷','🍸'],Objects:['⌚','📱','💻','⌨️','🖥️','📷','📸','📹','🎥','📞','☎️','📺','📻','🔋','🔌','💡','🔦','🔒','🔓','🔑','🗝️','🔨','⚒️','🛠️','🔧','🔩','⚙️','🔍','🔎','💊','💉','🔬','🔭','📡','🧲','💰','💳','📧','📮','📦','🎁','🎈','🎉','🎊','🎀','🏆','🥇'],Symbols:['❤️','🧡','💛','💚','💙','💜','🖤','🤍','💔','💕','💞','💓','💗','💖','💘','💝','☮️','⭐','🌟','✨','💫','⚡','🔥','🌈','☀️','🌙','❄️','🌊','💥','✅','❌','⚠️','🚫','💯','❓','❗','💤','♻️','🔴','🟡','🟢','🔵','⬛','⬜','🔺','🔻']};
  buildToolPage(tool, () => {
    document.getElementById('toolContent').innerHTML = `
      <input class="tool-input" id="emojiSearch" placeholder="Search emojis…" oninput="filterEmoji()" style="margin-bottom:10px">
      <div class="emoji-cats" id="emojiCats">${Object.keys(EMOJI).map((c,i)=>`<button class="emoji-cat-btn${i===0?' active':''}" onclick="switchEmojiCat('${c}',this)">${c}</button>`).join('')}</div>
      <div class="emoji-grid" id="emojiGrid"></div>
      <div style="margin-top:12px;font-size:13px;color:var(--text-muted)">Last copied: <span id="emojiLast" style="font-size:20px">—</span></div>`;
    window._EMOJI=EMOJI; renderEmojiCat(Object.keys(EMOJI)[0]);
  });
}
function renderEmojiCat(cat){const e=(window._EMOJI||{})[cat]||[];document.getElementById('emojiGrid').innerHTML=e.map(em=>`<div class="emoji-btn" onclick="copyEmoji('${em}')">${em}</div>`).join('');}
function switchEmojiCat(cat,btn){document.querySelectorAll('.emoji-cat-btn').forEach(b=>b.classList.remove('active'));btn.classList.add('active');renderEmojiCat(cat);}
function filterEmoji(){const q=document.getElementById('emojiSearch').value.toLowerCase();if(!q){const a=document.querySelector('.emoji-cat-btn.active');if(a)switchEmojiCat(a.textContent,a);return;}const all=Object.values(window._EMOJI||{}).flat();document.getElementById('emojiGrid').innerHTML=all.map(e=>`<div class="emoji-btn" onclick="copyEmoji('${e}')">${e}</div>`).join('');}
function copyEmoji(e){navigator.clipboard.writeText(e).then(()=>{document.getElementById('emojiLast').textContent=e;toast(`${e} copied!`,'success',1500);});}

function renderLoremIpsum(tool) {
  buildToolPage(tool, () => {
    document.getElementById('toolContent').innerHTML = `
      <div class="tool-row" style="margin-bottom:14px">
        <div class="tool-col"><label class="tool-label">Type</label>
          <select class="tool-select" id="loremType"><option value="paragraphs">Paragraphs</option><option value="sentences">Sentences</option><option value="words">Words</option></select></div>
        <div class="tool-col"><label class="tool-label">Count</label>
          <input type="number" class="tool-input" id="loremCount" value="3" min="1" max="20" style="width:80px"></div>
      </div>
      <div class="btn-group"><button class="btn btn-primary" onclick="doLorem()">📃 Generate</button></div>
      <div class="output-label">Generated Text</div>
      <div class="output-box" id="loremOut" style="white-space:pre-wrap"><span class="output-placeholder">Lorem ipsum will appear here…</span></div>
      <div class="output-actions">${copyBtn('loremOut')}</div>`;
  });
}
async function doLorem(){await runTool('lorem-ipsum',{type:document.getElementById('loremType').value,count:parseInt(document.getElementById('loremCount').value)},'loremOut',d=>d.result||'');}

function renderWordFrequency(tool) {
  buildToolPage(tool, () => {
    document.getElementById('toolContent').innerHTML = `
      <div class="tool-section"><label class="tool-label">Text to analyze</label>
        <textarea class="tool-textarea" id="wfIn" rows="7" placeholder="Paste your text…"></textarea></div>
      <div class="tool-row" style="margin-bottom:14px">
        <label class="checkbox-row"><input type="checkbox" id="wfStop" checked><span class="checkbox-label">Exclude stop words</span></label>
        <div class="tool-col" style="max-width:120px"><label class="tool-label">Top words</label>
          <input type="number" class="tool-input" id="wfLimit" value="20" min="5" max="50" style="width:80px"></div>
      </div>
      <div class="btn-group"><button class="btn btn-primary" onclick="doWordFreq()">📊 Analyze</button></div>
      <div id="wfOut"></div>`;
  });
}
async function doWordFreq() {
  const text=document.getElementById('wfIn').value.trim();
  if(!text){toast('Please enter text.','warn');return;}
  const btn=document.querySelector('#toolContent .btn-primary');btn.disabled=true;if(!btn.dataset.origHtml)btn.dataset.origHtml=btn.innerHTML;btn.textContent='⏳ Analyzing…';
  try{
    const d=await apiFetch('/api/tools/word-frequency','POST',{text,stopWords:document.getElementById('wfStop').checked,limit:parseInt(document.getElementById('wfLimit').value)});
    document.getElementById('wfOut').innerHTML=`<div class="stat-grid" style="margin:14px 0">
      <div class="stat-card"><div class="stat-value">${d.totalWords}</div><div class="stat-label">Total Words</div></div>
      <div class="stat-card"><div class="stat-value">${d.uniqueWords}</div><div class="stat-label">Unique Words</div></div>
    </div>`+(d.words||[]).map(w=>`<div class="freq-row"><div class="freq-word">${w.word}</div><div class="freq-bar-wrap"><div class="freq-bar" style="width:${w.bar}%"></div></div><div class="freq-count">${w.count}</div></div>`).join('');
    toast('Done!','success');
  }catch(e){toast(e.message||'Error','error');}
  finally{btn.disabled=false;btn.innerHTML=btn.dataset.origHtml||btn.innerHTML;delete btn.dataset.origHtml;}
}

function renderTextDiff(tool) {
  buildToolPage(tool, () => {
    document.getElementById('toolContent').innerHTML = `
      <div class="side-by-side" style="margin-bottom:14px">
        <div><label class="tool-label">Original Text</label><textarea class="tool-textarea" id="diff1" rows="10" placeholder="Original text…"></textarea></div>
        <div><label class="tool-label">Modified Text</label><textarea class="tool-textarea" id="diff2" rows="10" placeholder="Modified text…"></textarea></div>
      </div>
      <div class="btn-group"><button class="btn btn-primary" onclick="doDiff()">🔍 Compare Texts</button></div>
      <div id="diffOut"></div>`;
  });
}
async function doDiff() {
  const t1=document.getElementById('diff1').value,t2=document.getElementById('diff2').value;
  const btn=document.querySelector('#toolContent .btn-primary');btn.disabled=true;if(!btn.dataset.origHtml)btn.dataset.origHtml=btn.innerHTML;btn.textContent='⏳ Comparing…';
  try{
    const d=await apiFetch('/api/tools/text-diff','POST',{text1:t1,text2:t2});
    const html=(d.diff||[]).map(l=>{const s=l.text.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');return l.type==='add'?`<div class="diff-add">+ ${s}</div>`:l.type==='remove'?`<div class="diff-remove">- ${s}</div>`:`<div class="diff-equal">  ${s}</div>`;}).join('');
    document.getElementById('diffOut').innerHTML=`<div class="stat-grid" style="margin:12px 0">
      <div class="stat-card"><div class="stat-value" style="color:var(--success)">${d.added}</div><div class="stat-label">Added</div></div>
      <div class="stat-card"><div class="stat-value" style="color:var(--error)">${d.removed}</div><div class="stat-label">Removed</div></div>
      <div class="stat-card"><div class="stat-value">${d.unchanged}</div><div class="stat-label">Unchanged</div></div>
    </div><div class="code-block" style="max-height:400px;overflow-y:auto">${html}</div>`;
    toast('Comparison done!','success');
  }catch(e){toast(e.message||'Error','error');}
  finally{btn.disabled=false;btn.innerHTML=btn.dataset.origHtml||btn.innerHTML;delete btn.dataset.origHtml;}
}

function renderReadabilityChecker(tool) {
  buildToolPage(tool, () => {
    document.getElementById('toolContent').innerHTML = `
      <div class="tool-section"><label class="tool-label">Text to analyze</label>
        <textarea class="tool-textarea" id="readIn" rows="8" placeholder="Paste your text to check readability…"></textarea></div>
      <div class="btn-group"><button class="btn btn-primary" onclick="doReadability()">📖 Check Readability</button></div>
      <div id="readOut"></div>`;
  });
}
async function doReadability() {
  const text=document.getElementById('readIn').value.trim();
  if(!text){toast('Please enter text.','warn');return;}
  const btn=document.querySelector('#toolContent .btn-primary');btn.disabled=true;if(!btn.dataset.origHtml)btn.dataset.origHtml=btn.innerHTML;btn.textContent='⏳ Analyzing…';
  try{
    const d=await apiFetch('/api/tools/readability-checker','POST',{text});
    document.getElementById('readOut').innerHTML=`<div class="stat-grid" style="margin-top:16px">
      <div class="stat-card"><div class="stat-value">${d.fleschScore}</div><div class="stat-label">Flesch Score</div></div>
      <div class="stat-card"><div class="stat-value" style="font-size:15px">${d.level}</div><div class="stat-label">Difficulty</div></div>
      <div class="stat-card"><div class="stat-value" style="font-size:14px">${d.grade}</div><div class="stat-label">Grade Level</div></div>
      <div class="stat-card"><div class="stat-value">${d.readingTimeMinutes}m</div><div class="stat-label">Read Time</div></div>
      <div class="stat-card"><div class="stat-value">${d.wordCount}</div><div class="stat-label">Words</div></div>
      <div class="stat-card"><div class="stat-value">${d.avgWordsPerSentence}</div><div class="stat-label">Avg Words/Sentence</div></div>
    </div>`;
    toast('Done!','success');
  }catch(e){toast(e.message||'Error','error');}
  finally{btn.disabled=false;btn.innerHTML=btn.dataset.origHtml||btn.innerHTML;delete btn.dataset.origHtml;}
}

function renderTTS(tool) {
  buildToolPage(tool, () => {
    document.getElementById('toolContent').innerHTML = `
      <div class="tool-section"><label class="tool-label">Text to speak</label>
        <textarea class="tool-textarea" id="ttsIn" rows="6" placeholder="Enter text to convert to speech…"></textarea></div>
      <div class="tool-row" style="margin-bottom:14px">
        <div class="tool-col"><label class="tool-label">Rate: <span id="ttsRateV">1.0</span>x</label>
          <input type="range" class="tool-range" id="ttsRate" min="0.5" max="2" step="0.1" value="1" oninput="document.getElementById('ttsRateV').textContent=this.value"></div>
        <div class="tool-col"><label class="tool-label">Pitch: <span id="ttsPitchV">1.0</span></label>
          <input type="range" class="tool-range" id="ttsPitch" min="0.5" max="2" step="0.1" value="1" oninput="document.getElementById('ttsPitchV').textContent=this.value"></div>
      </div>
      <div class="tool-section"><label class="tool-label">Voice</label>
        <select class="tool-select" id="ttsVoice" style="width:100%"></select></div>
      <div class="btn-group">
        <button class="btn btn-primary" onclick="doTTSPlay()">🔊 Speak</button>
        <button class="btn btn-secondary" onclick="speechSynthesis.cancel()">⏹ Stop</button>
      </div>
      <div class="info-box">Uses your browser's built-in speech engine. Voice availability varies by browser and OS.</div>`;
    const loadV=()=>{const s=document.getElementById('ttsVoice');if(!s)return;s.innerHTML=speechSynthesis.getVoices().map((v,i)=>`<option value="${i}">${v.name} (${v.lang})</option>`).join('');};
    loadV(); speechSynthesis.onvoiceschanged=loadV;
  });
}
function doTTSPlay(){const t=document.getElementById('ttsIn').value.trim();if(!t){toast('Please enter text.','warn');return;}speechSynthesis.cancel();const u=new SpeechSynthesisUtterance(t);const vs=speechSynthesis.getVoices();const vi=parseInt(document.getElementById('ttsVoice').value)||0;if(vs[vi])u.voice=vs[vi];u.rate=parseFloat(document.getElementById('ttsRate').value);u.pitch=parseFloat(document.getElementById('ttsPitch').value);speechSynthesis.speak(u);toast('Speaking…','info');}

function renderHashtagGenerator(tool) {
  buildToolPage(tool, () => {
    document.getElementById('toolContent').innerHTML = `
      <div class="tool-section"><label class="tool-label">Topic or content</label>
        <textarea class="tool-textarea" id="hashIn" rows="4" placeholder="Enter your topic, caption, or keywords…"></textarea></div>
      <div class="tool-row" style="margin-bottom:14px">
        <div class="tool-col"><label class="tool-label">Platform</label>
          <select class="tool-select" id="hashPlat"><option value="instagram">Instagram</option><option value="twitter">Twitter/X</option><option value="linkedin">LinkedIn</option><option value="tiktok">TikTok</option></select></div>
        <div class="tool-col"><label class="tool-label">Count</label>
          <input type="number" class="tool-input" id="hashCount" value="15" min="5" max="30" style="width:80px"></div>
      </div>
      <div class="btn-group"><button class="btn btn-primary" onclick="doHashtag()">#️⃣ Generate</button></div>
      <div class="output-label">Hashtags</div>
      <div class="output-box" id="hashOut"><span class="output-placeholder">Hashtags will appear here…</span></div>
      <div class="output-actions">${copyBtn('hashOut')}</div>`;
  });
}
async function doHashtag() {
  const text=document.getElementById('hashIn').value.trim();
  if(!text){toast('Please enter a topic.','warn');return;}
  const btn=document.querySelector('#toolContent .btn-primary');btn.disabled=true;if(!btn.dataset.origHtml)btn.dataset.origHtml=btn.innerHTML;btn.textContent='⏳ Generating…';
  try{const d=await apiFetch('/api/tools/hashtag-generator','POST',{text,platform:document.getElementById('hashPlat').value,count:parseInt(document.getElementById('hashCount').value)});const tags=d.hashtags||d.tags||[];document.getElementById('hashOut').textContent=tags.join(' ');toast(`${tags.length} hashtags!`,'success');}
  catch(e){toast(e.message||'Error','error');}
  finally{btn.disabled=false;btn.innerHTML=btn.dataset.origHtml||btn.innerHTML;delete btn.dataset.origHtml;}
}

function renderEmailSubjectGen(tool) {
  buildToolPage(tool, () => {
    document.getElementById('toolContent').innerHTML = `
      <div class="tool-section"><label class="tool-label">Email content or topic</label>
        <textarea class="tool-textarea" id="esIn" rows="5" placeholder="Describe your email content or paste a summary…"></textarea></div>
      <div class="tool-row" style="margin-bottom:14px">
        <div class="tool-col"><label class="tool-label">Tone</label>
          <select class="tool-select" id="esTone"><option value="professional">Professional</option><option value="casual">Casual</option><option value="urgent">Urgent</option><option value="friendly">Friendly</option></select></div>
        <div class="tool-col"><label class="tool-label">Count</label>
          <select class="tool-select" id="esCount"><option value="5">5</option><option value="10" selected>10</option></select></div>
      </div>
      <div class="btn-group"><button class="btn btn-primary" onclick="doEmailSubject()">📧 Generate Subjects</button></div>
      <div id="esOut"></div>`;
  });
}
async function doEmailSubject() {
  const text=document.getElementById('esIn').value.trim();
  if(!text){toast('Please enter email content.','warn');return;}
  const btn=document.querySelector('#toolContent .btn-primary');btn.disabled=true;if(!btn.dataset.origHtml)btn.dataset.origHtml=btn.innerHTML;btn.textContent='⏳ Generating…';
  try{const d=await apiFetch('/api/tools/email-subject-generator','POST',{text,tone:document.getElementById('esTone').value,count:parseInt(document.getElementById('esCount').value)});const subjects=d.subjects||d.lines||[];
  document.getElementById('esOut').innerHTML=subjects.map((s,i)=>`<div style="display:flex;align-items:center;gap:8px;margin-top:8px"><div class="output-box" style="flex:1;padding:10px">${i+1}. ${s}</div><button class="btn-icon-sm" onclick="copyText('${s.replace(/'/g,"\\'")}')">${ICONS.copy}</button></div>`).join('');toast(`${subjects.length} subjects!`,'success');}
  catch(e){toast(e.message||'Error','error');}
  finally{btn.disabled=false;btn.innerHTML=btn.dataset.origHtml||btn.innerHTML;delete btn.dataset.origHtml;}
}

function renderPlagiarismHL(tool) {
  buildToolPage(tool, () => {
    document.getElementById('toolContent').innerHTML = `
      <div class="tool-section"><label class="tool-label">Text to check</label>
        <textarea class="tool-textarea" id="plagIn" rows="8" placeholder="Paste text to check for repeated phrases…"></textarea></div>
      <div class="btn-group"><button class="btn btn-primary" onclick="doPlag()">🔎 Highlight Duplicates</button></div>
      <div id="plagOut"></div>`;
  });
}
async function doPlag() {
  const text=document.getElementById('plagIn').value.trim();
  if(!text){toast('Please enter text.','warn');return;}
  const btn=document.querySelector('#toolContent .btn-primary');btn.disabled=true;if(!btn.dataset.origHtml)btn.dataset.origHtml=btn.innerHTML;btn.textContent='⏳ Scanning…';
  try{const d=await apiFetch('/api/tools/plagiarism-highlighter','POST',{text});
  document.getElementById('plagOut').innerHTML=`<div class="stat-grid" style="margin:12px 0"><div class="stat-card"><div class="stat-value">${d.duplicates||0}</div><div class="stat-label">Duplicates</div></div><div class="stat-card"><div class="stat-value">${d.score||0}%</div><div class="stat-label">Similarity Score</div></div></div><div class="output-label">Result</div><div class="output-box">${d.highlighted||text}</div>`;
  toast('Done!','success');}catch(e){toast(e.message||'Error','error');}
  finally{btn.disabled=false;btn.innerHTML=btn.dataset.origHtml||btn.innerHTML;delete btn.dataset.origHtml;}
}

function renderSentenceRewriter(tool) {
  buildToolPage(tool, () => {
    document.getElementById('toolContent').innerHTML = `
      <div class="tool-section"><label class="tool-label">Sentence to rewrite</label>
        <textarea class="tool-textarea" id="srIn" rows="4" placeholder="Enter a sentence to rewrite in multiple styles…"></textarea></div>
      <div class="btn-group"><button class="btn btn-primary" onclick="doSRW()">🔄 Rewrite</button></div>
      <div id="srOut"></div>`;
  });
}
async function doSRW() {
  const text=document.getElementById('srIn').value.trim();
  if(!text){toast('Please enter a sentence.','warn');return;}
  const btn=document.querySelector('#toolContent .btn-primary');btn.disabled=true;if(!btn.dataset.origHtml)btn.dataset.origHtml=btn.innerHTML;btn.textContent='⏳ Rewriting…';
  try{const d=await apiFetch('/api/tools/sentence-rewriter','POST',{text});const vs=d.variants||d.rewrites||[];
  document.getElementById('srOut').innerHTML=vs.map((v,i)=>`<div style="margin-top:10px"><div class="output-label">${v.style||`Version ${i+1}`}</div><div style="display:flex;gap:8px;align-items:center"><div class="output-box" style="flex:1">${v.text||v}</div><button class="btn-icon-sm" onclick="copyText(this.previousElementSibling.textContent||this.previousElementSibling.innerText)">${ICONS.copy}</button></div></div>`).join('');
  toast('Rewritten!','success');}catch(e){toast(e.message||'Error','error');}
  finally{btn.disabled=false;btn.innerHTML=btn.dataset.origHtml||btn.innerHTML;delete btn.dataset.origHtml;}
}

function renderActiveVoice(tool) {
  buildToolPage(tool, () => {
    document.getElementById('toolContent').innerHTML = `
      <div class="tool-section"><label class="tool-label">Text with passive voice</label>
        <textarea class="tool-textarea" id="avIn" rows="6" placeholder="Enter sentences with passive voice…"></textarea></div>
      <div class="btn-group"><button class="btn btn-primary" onclick="doAV()">💪 Convert to Active</button></div>
      <div class="output-label">Active Voice</div>
      <div class="output-box" id="avOut"><span class="output-placeholder">Converted text will appear here…</span></div>
      <div class="output-actions">${copyBtn('avOut')}</div>`;
  });
}
async function doAV(){const text=document.getElementById('avIn').value.trim();if(!text){toast('Please enter text.','warn');return;}await runTool('active-voice-converter',{text},'avOut',d=>d.result||d.converted||text);}

function renderCharCounter(tool) {
  buildToolPage(tool, () => {
    document.getElementById('toolContent').innerHTML = `
      <div class="tool-section"><label class="tool-label">Your text</label>
        <textarea class="tool-textarea" id="ccIn" rows="7" placeholder="Type or paste your text here…" oninput="doCharCount()"></textarea></div>
      <div class="output-label" style="margin-top:12px">Platform Limits</div>
      <div id="ccOut"></div>`;
    doCharCount();
  });
}
function doCharCount(){
  const t=document.getElementById('ccIn').value,len=t.length;
  const L={Twitter:280,Instagram:2200,'Instagram Bio':150,LinkedIn:3000,SMS:160,'Facebook Post':63206,'YouTube Title':100,'Meta Title':60};
  document.getElementById('ccOut').innerHTML=Object.entries(L).map(([p,l])=>{const pct=Math.min(100,Math.round(len/l*100));const c=pct>90?'var(--error)':pct>70?'var(--warn)':'var(--success)';return`<div style="display:flex;align-items:center;gap:10px;margin-bottom:8px"><div style="width:140px;font-size:13px;font-weight:600">${p}</div><div style="flex:1;background:var(--border);border-radius:4px;height:8px"><div style="width:${pct}%;height:100%;background:${c};border-radius:4px"></div></div><div style="font-size:12px;color:var(--text-muted);width:70px;text-align:right">${len}/${l}</div></div>`;}).join('');
}


// ═══════════════════════════════════════════════════════════════════════════════
// MEDIA TOOLS
// ═══════════════════════════════════════════════════════════════════════════════

function renderPasswordGenerator(tool) {
  buildToolPage(tool, () => {
    document.getElementById('toolContent').innerHTML = `
      <div class="tool-section"><label class="tool-label">Length: <span id="pwdLV">16</span></label>
        <input type="range" class="tool-range" id="pwdLen" min="4" max="128" value="16" oninput="document.getElementById('pwdLV').textContent=this.value"></div>
      <div style="display:flex;flex-wrap:wrap;gap:10px;margin-bottom:14px">
        <label class="checkbox-row"><input type="checkbox" id="pwdU" checked><span class="checkbox-label">Uppercase (A–Z)</span></label>
        <label class="checkbox-row"><input type="checkbox" id="pwdL" checked><span class="checkbox-label">Lowercase (a–z)</span></label>
        <label class="checkbox-row"><input type="checkbox" id="pwdN" checked><span class="checkbox-label">Numbers (0–9)</span></label>
        <label class="checkbox-row"><input type="checkbox" id="pwdS" checked><span class="checkbox-label">Symbols (!@#…)</span></label>
        <label class="checkbox-row"><input type="checkbox" id="pwdA"><span class="checkbox-label">No Ambiguous (0/O/l/1)</span></label>
      </div>
      <div class="tool-row" style="margin-bottom:14px">
        <div class="tool-col"><label class="tool-label">Count</label>
          <input type="number" class="tool-input" id="pwdCount" value="5" min="1" max="20" style="width:80px"></div>
      </div>
      <div class="btn-group"><button class="btn btn-primary" onclick="doPwd()">🔐 Generate</button></div>
      <div id="pwdOut"></div>`;
  });
}
async function doPwd() {
  const btn=document.querySelector('#toolContent .btn-primary');btn.disabled=true;if(!btn.dataset.origHtml)btn.dataset.origHtml=btn.innerHTML;btn.textContent='⏳ Generating…';
  try{const d=await apiFetch('/api/tools/password-generator','POST',{length:parseInt(document.getElementById('pwdLen').value),count:parseInt(document.getElementById('pwdCount').value),uppercase:document.getElementById('pwdU').checked,lowercase:document.getElementById('pwdL').checked,numbers:document.getElementById('pwdN').checked,symbols:document.getElementById('pwdS').checked,noAmbiguous:document.getElementById('pwdA').checked});
  const ps=d.passwords||[d.password||''];
  document.getElementById('pwdOut').innerHTML=ps.map(p=>`<div style="display:flex;gap:8px;align-items:center;margin-top:8px"><div class="code-block" style="flex:1;padding:10px;font-size:14px">${p}</div><button class="btn-icon-sm" onclick="copyText('${p}','Password copied')">${ICONS.copy}</button></div>`).join('');
  toast('Generated!','success');}catch(e){toast(e.message||'Error','error');}
  finally{btn.disabled=false;btn.innerHTML=btn.dataset.origHtml||btn.innerHTML;delete btn.dataset.origHtml;}
}

function renderImageConverter(tool) {
  buildToolPage(tool, () => {
    document.getElementById('toolContent').innerHTML = `
      <div class="tool-section"><label class="tool-label">Upload Image</label>
        <input type="file" class="tool-input" id="icFile" accept="image/*"></div>
      <div class="tool-row" style="margin-bottom:14px">
        <div class="tool-col"><label class="tool-label">Convert to</label>
          <select class="tool-select" id="icFmt"><option value="png">PNG</option><option value="jpeg">JPEG</option><option value="bmp">BMP</option><option value="gif">GIF</option></select></div>
      </div>
      <div class="btn-group"><button class="btn btn-primary" onclick="doImgConv()">🖼️ Convert</button></div>
      <div id="icOut"></div>`;
  });
}
async function doImgConv() {
  const file=document.getElementById('icFile').files[0];
  if(!file){toast('Please select an image.','warn');return;}
  const btn=document.querySelector('#toolContent .btn-primary');btn.disabled=true;if(!btn.dataset.origHtml)btn.dataset.origHtml=btn.innerHTML;btn.textContent='⏳ Converting…';
  try{const fd=new FormData();fd.append('image',file);fd.append('format',document.getElementById('icFmt').value);
  const res=await apiFetch('/api/tools/image-converter','POST',fd);
  const blob=res instanceof Response?await res.blob():null;
  if(blob){const url=URL.createObjectURL(blob);const fmt=document.getElementById('icFmt').value;
  document.getElementById('icOut').innerHTML=`<div style="margin-top:12px"><img src="${url}" style="max-width:100%;border-radius:8px;border:1px solid var(--border)"><br><a href="${url}" download="converted.${fmt}" class="btn btn-secondary btn-sm" style="margin-top:8px;display:inline-flex">${ICONS.download} Download</a></div>`;
  toast('Converted!','success');}
  }catch(e){toast(e.message||'Conversion failed','error');}
  finally{btn.disabled=false;btn.innerHTML=btn.dataset.origHtml||btn.innerHTML;delete btn.dataset.origHtml;}
}

function renderImageResizer(tool) {
  buildToolPage(tool, () => {
    document.getElementById('toolContent').innerHTML = `
      <div class="tool-section"><label class="tool-label">Upload Image</label>
        <input type="file" class="tool-input" id="irFile" accept="image/*"></div>
      <div class="tool-row" style="margin-bottom:14px">
        <div class="tool-col"><label class="tool-label">Width (px)</label><input type="number" class="tool-input" id="irW" placeholder="Auto"></div>
        <div class="tool-col"><label class="tool-label">Height (px)</label><input type="number" class="tool-input" id="irH" placeholder="Auto"></div>
        <div class="tool-col"><label class="tool-label">Quality %</label><input type="number" class="tool-input" id="irQ" value="85" min="10" max="100" style="width:80px"></div>
      </div>
      <div class="btn-group"><button class="btn btn-primary" onclick="doImgResize()">📐 Resize</button></div>
      <div id="irOut"></div>`;
  });
}
async function doImgResize() {
  const file=document.getElementById('irFile').files[0];
  if(!file){toast('Please select an image.','warn');return;}
  const btn=document.querySelector('#toolContent .btn-primary');btn.disabled=true;if(!btn.dataset.origHtml)btn.dataset.origHtml=btn.innerHTML;btn.textContent='⏳ Resizing…';
  try{const fd=new FormData();fd.append('image',file);fd.append('width',document.getElementById('irW').value||0);fd.append('height',document.getElementById('irH').value||0);fd.append('quality',document.getElementById('irQ').value||85);
  const res=await apiFetch('/api/tools/image-resizer','POST',fd);const blob=res instanceof Response?await res.blob():null;
  if(blob){const url=URL.createObjectURL(blob);document.getElementById('irOut').innerHTML=`<div style="margin-top:12px"><img src="${url}" style="max-width:100%;border-radius:8px;border:1px solid var(--border)"><br><a href="${url}" download="resized.jpg" class="btn btn-secondary btn-sm" style="margin-top:8px;display:inline-flex">${ICONS.download} Download</a></div>`;toast('Resized!','success');}
  }catch(e){toast(e.message||'Error','error');}
  finally{btn.disabled=false;btn.innerHTML=btn.dataset.origHtml||btn.innerHTML;delete btn.dataset.origHtml;}
}

function renderYTThumb(tool) {
  buildToolPage(tool, () => {
    document.getElementById('toolContent').innerHTML = `
      <div class="tool-section"><label class="tool-label">YouTube URL</label>
        <input type="url" class="tool-input" id="ytUrl" placeholder="https://www.youtube.com/watch?v=…"></div>
      <div class="btn-group"><button class="btn btn-primary" onclick="doYT()">▶️ Get Thumbnails</button></div>
      <div id="ytOut"></div>`;
  });
}
async function doYT() {
  const url=document.getElementById('ytUrl').value.trim();
  if(!url){toast('Please enter a YouTube URL.','warn');return;}
  const btn=document.querySelector('#toolContent .btn-primary');btn.disabled=true;if(!btn.dataset.origHtml)btn.dataset.origHtml=btn.innerHTML;btn.textContent='⏳ Fetching…';
  try{const d=await apiFetch('/api/tools/yt-thumbnail','POST',{url});
  document.getElementById('ytOut').innerHTML=`<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:12px;margin-top:16px">${Object.entries(d.thumbnails).map(([q,src])=>`<div style="text-align:center"><div class="output-label">${q.toUpperCase()}</div><img src="${src}" style="width:100%;border-radius:8px;border:1px solid var(--border)" onerror="this.style.opacity='.3'"><a href="${src}" download target="_blank" class="btn btn-secondary btn-sm" style="margin-top:6px;display:inline-flex">${ICONS.download} Download</a></div>`).join('')}</div>`;
  toast('Done!','success');}catch(e){toast(e.message||'Error','error');}
  finally{btn.disabled=false;btn.innerHTML=btn.dataset.origHtml||btn.innerHTML;delete btn.dataset.origHtml;}
}

function renderQRGen(tool) {
  buildToolPage(tool, () => {
    document.getElementById('toolContent').innerHTML = `
      <div class="tool-section"><label class="tool-label">Text or URL</label>
        <input type="text" class="tool-input" id="qrText" placeholder="https://example.com or any text…"></div>
      <div class="tool-row" style="margin-bottom:14px">
        <div class="tool-col"><label class="tool-label">Size (px)</label><input type="number" class="tool-input" id="qrSize" value="300" min="100" max="1000" style="width:90px"></div>
        <div class="tool-col"><label class="tool-label">Dark Color</label><input type="color" class="tool-input" id="qrColor" value="#000000" style="height:40px;padding:4px"></div>
        <div class="tool-col"><label class="tool-label">Light Color</label><input type="color" class="tool-input" id="qrBg" value="#ffffff" style="height:40px;padding:4px"></div>
      </div>
      <div class="btn-group"><button class="btn btn-primary" onclick="doQR()">⬛ Generate QR</button></div>
      <div style="display:flex;flex-direction:column;align-items:center;gap:12px;margin-top:14px" id="qrOut"></div>`;
  });
}
async function doQR() {
  const text=document.getElementById('qrText').value.trim();
  if(!text){toast('Please enter text or URL.','warn');return;}
  const btn=document.querySelector('#toolContent .btn-primary');btn.disabled=true;if(!btn.dataset.origHtml)btn.dataset.origHtml=btn.innerHTML;btn.textContent='⏳ Generating…';
  try{const d=await apiFetch('/api/tools/qr-generator','POST',{text,size:parseInt(document.getElementById('qrSize').value),color:document.getElementById('qrColor').value,bgcolor:document.getElementById('qrBg').value});
  document.getElementById('qrOut').innerHTML=`<img src="${d.result}" style="width:${d.size}px;max-width:100%;border:1px solid var(--border);border-radius:8px"><button class="btn btn-secondary btn-sm" onclick="downloadDataURL('${d.result}','qrcode.png')">${ICONS.download} Download PNG</button>`;
  toast('QR code ready!','success');}catch(e){toast(e.message||'Error','error');}
  finally{btn.disabled=false;btn.innerHTML=btn.dataset.origHtml||btn.innerHTML;delete btn.dataset.origHtml;}
}

function renderColorPalette(tool) {
  buildToolPage(tool, () => {
    document.getElementById('toolContent').innerHTML = `
      <div class="tool-row" style="margin-bottom:14px">
        <div class="tool-col"><label class="tool-label">Base Color</label><input type="color" class="tool-input" id="palC" value="#6366f1" style="height:42px;padding:4px"></div>
        <div class="tool-col"><label class="tool-label">Scheme</label>
          <select class="tool-select" id="palS"><option value="analogous">Analogous</option><option value="monochromatic">Monochromatic</option><option value="complementary">Complementary</option><option value="triadic">Triadic</option></select></div>
        <div class="tool-col"><label class="tool-label">Colors</label><input type="number" class="tool-input" id="palN" value="5" min="2" max="10" style="width:80px"></div>
      </div>
      <div class="btn-group"><button class="btn btn-primary" onclick="doPalette()">🎨 Generate</button></div>
      <div id="palOut"></div>`;
  });
}
async function doPalette() {
  const btn=document.querySelector('#toolContent .btn-primary');btn.disabled=true;if(!btn.dataset.origHtml)btn.dataset.origHtml=btn.innerHTML;btn.textContent='⏳ Generating…';
  try{const d=await apiFetch('/api/tools/color-palette','POST',{color:document.getElementById('palC').value,scheme:document.getElementById('palS').value,count:parseInt(document.getElementById('palN').value)});
  document.getElementById('palOut').innerHTML=`<div class="palette-strip">${(d.palette||[]).map(c=>`<div class="palette-color" onclick="copyText('${c.hex}','Color copied')" title="Click to copy"><div class="palette-color-swatch" style="background:${c.hex}"></div><div class="palette-color-info"><div class="palette-color-hex">${c.hex}</div><div style="font-size:11px;color:var(--text-muted)">${c.rgb}</div></div></div>`).join('')}</div><div class="info-box" style="margin-top:10px">Click any color swatch to copy its HEX value.</div>`;
  toast('Palette ready!','success');}catch(e){toast(e.message||'Error','error');}
  finally{btn.disabled=false;btn.innerHTML=btn.dataset.origHtml||btn.innerHTML;delete btn.dataset.origHtml;}
}

function renderBase64(tool) {
  buildToolPage(tool, () => {
    document.getElementById('toolContent').innerHTML = `
      <div class="tool-section"><label class="tool-label">Input</label>
        <textarea class="tool-textarea" id="b64In" rows="6" placeholder="Text to encode, or Base64 to decode…"></textarea></div>
      <div class="btn-group">
        <button class="btn btn-primary" onclick="doB64('encode')">Encode →</button>
        <button class="btn btn-secondary" onclick="doB64('decode')">← Decode</button>
      </div>
      <div class="output-label">Result</div>
      <div class="output-box" id="b64Out"><span class="output-placeholder">Result will appear here…</span></div>
      <div class="output-actions">${copyBtn('b64Out')}</div>`;
  });
}
async function doB64(mode){const text=document.getElementById('b64In').value;if(!text){toast('Please enter text.','warn');return;}try{const d=await apiFetch('/api/tools/base64','POST',{text,mode});document.getElementById('b64Out').textContent=d.result;toast(mode==='encode'?'Encoded!':'Decoded!','success');}catch(e){toast(e.message||'Error','error');}}

function renderImageToText(tool) {
  buildToolPage(tool, () => {
    document.getElementById('toolContent').innerHTML = `
      <div class="info-box" style="margin-bottom:14px">
        <strong>ℹ️ Client-side OCR:</strong> Text extraction runs entirely in your browser using Tesseract.js — your image is never uploaded to any server. Works best with high-contrast, horizontal text on a plain background.
      </div>
      <div class="tool-section"><label class="tool-label">Upload Image</label>
        <input type="file" class="tool-input" id="ocrFile" accept="image/*" onchange="previewOCR(this)">
        <div id="ocrPreview" style="margin-top:10px"></div>
      </div>
      <div class="tool-section">
        <label class="tool-label">Language</label>
        <select class="tool-select" id="ocrLang" style="max-width:200px">
          <option value="eng">English</option>
          <option value="fra">French</option>
          <option value="deu">German</option>
          <option value="spa">Spanish</option>
          <option value="por">Portuguese</option>
          <option value="ita">Italian</option>
        </select>
      </div>
      <div class="btn-group"><button class="btn btn-primary" onclick="doOCR()">👁️ Extract Text</button></div>
      <div id="ocrProgress" style="display:none;margin:10px 0">
        <div style="background:var(--bg-muted);border-radius:6px;overflow:hidden;height:8px;border:1px solid var(--border)">
          <div id="ocrProgressBar" style="height:100%;background:var(--accent);width:0%;transition:width .3s"></div>
        </div>
        <div id="ocrStatus" style="font-size:12px;color:var(--text-muted);margin-top:6px;text-align:center">Initializing…</div>
      </div>
      <div class="output-label">Extracted Text</div>
      <div class="output-box" id="ocrOut" style="min-height:100px;white-space:pre-wrap"><span class="output-placeholder">Extracted text will appear here…</span></div>
      <div class="output-actions">${copyBtn('ocrOut')} ${dlBtn('ocrOut','extracted-text.txt')}</div>`;
  });
}
function previewOCR(inp){const f=inp.files[0];if(f){const url=URL.createObjectURL(f);document.getElementById('ocrPreview').innerHTML=`<img src="${url}" style="max-width:100%;max-height:200px;border-radius:8px;border:1px solid var(--border)">`;}}
async function doOCR() {
  const file = document.getElementById('ocrFile').files[0];
  if (!file) { toast('Please select an image.', 'warn'); return; }
  const lang = document.getElementById('ocrLang')?.value || 'eng';
  const btn = document.querySelector('#toolContent .btn-primary');
  const prog = document.getElementById('ocrProgress');
  const bar = document.getElementById('ocrProgressBar');
  const status = document.getElementById('ocrStatus');
  if (btn) { btn.disabled = true; if(!btn.dataset.origHtml)btn.dataset.origHtml=btn.innerHTML; btn.textContent = '⏳ Processing…'; }
  if (prog) prog.style.display = 'block';
  try {
    // Load Tesseract.js from CDN if not already loaded
    if (!window.Tesseract) {
      await new Promise((resolve, reject) => {
        const s = document.createElement('script');
        s.src = 'https://cdnjs.cloudflare.com/ajax/libs/tesseract.js/4.1.1/tesseract.min.js';
        s.onload = resolve; s.onerror = reject;
        document.head.appendChild(s);
      });
    }
    const { data: { text } } = await Tesseract.recognize(file, lang, {
      logger: m => {
        if (m.status === 'recognizing text' && bar) {
          bar.style.width = (m.progress * 100).toFixed(0) + '%';
        }
        if (status) status.textContent = m.status.replace(/_/g,' ');
      }
    });
    const out = document.getElementById('ocrOut');
    if (out) out.textContent = text.trim() || 'No text could be detected in this image.';
    toast('Text extracted!', 'success');
  } catch(e) {
    toast('OCR failed: ' + (e.message || 'Unknown error'), 'error');
  } finally {
    if (btn) { btn.disabled = false; btn.innerHTML = btn.dataset.origHtml||btn.innerHTML; }
    if (prog) prog.style.display = 'none';
  }
}

function renderColorPicker(tool) {
  buildToolPage(tool, () => {
    document.getElementById('toolContent').innerHTML = `
      <div style="display:flex;gap:12px;align-items:center;margin-bottom:16px">
        <input type="color" id="cpColor" value="#6366f1" style="width:80px;height:60px;border-radius:8px;border:1px solid var(--border);padding:4px;cursor:pointer" oninput="updateCP()">
        <input class="tool-input" id="cpHex" placeholder="#6366f1" style="width:140px" oninput="syncCPHex()">
      </div>
      <div id="cpOut"></div>`;
    updateCP();
  });
}
function updateCP(){const h=document.getElementById('cpColor').value;document.getElementById('cpHex').value=h;const r=parseInt(h.slice(1,3),16),g=parseInt(h.slice(3,5),16),b=parseInt(h.slice(5,7),16);const rf=r/255,gf=g/255,bf=b/255;const mx=Math.max(rf,gf,bf),mn=Math.min(rf,gf,bf);let hh=0,s=0,l=(mx+mn)/2;if(mx!==mn){const d=mx-mn;s=l>0.5?d/(2-mx-mn):d/(mx+mn);switch(mx){case rf:hh=((gf-bf)/d+(gf<bf?6:0))/6;break;case gf:hh=((bf-rf)/d+2)/6;break;case bf:hh=((rf-gf)/d+4)/6;break;}}const k=Math.min(1-rf,1-gf,1-bf);const rgb=`rgb(${r},${g},${b})`;const hsl=`hsl(${Math.round(hh*360)},${Math.round(s*100)}%,${Math.round(l*100)}%)`;const cmyk=k===1?`cmyk(0,0,0,100)`:`cmyk(${Math.round((1-rf-k)/(1-k)*100)},${Math.round((1-gf-k)/(1-k)*100)},${Math.round((1-bf-k)/(1-k)*100)},${Math.round(k*100)})`;document.getElementById('cpOut').innerHTML=`<div style="height:80px;background:${h};border-radius:8px;border:1px solid var(--border);margin-bottom:14px"></div><div class="stat-grid">${[[h,'HEX'],[rgb,'RGB'],[hsl,'HSL'],[cmyk,'CMYK']].map(([v,l2])=>`<div class="stat-card" onclick="copyText('${v}','${l2} copied')" style="cursor:pointer"><div style="font-size:12px;font-weight:700;word-break:break-all">${v}</div><div class="stat-label">${l2}</div></div>`).join('')}</div>`;}
function syncCPHex(){const h=document.getElementById('cpHex').value.trim();if(/^#[0-9A-Fa-f]{6}$/.test(h)){document.getElementById('cpColor').value=h;updateCP();}}

function renderFaviconGen(tool) {
  buildToolPage(tool, () => {
    document.getElementById('toolContent').innerHTML = `
      <div class="tool-section"><label class="tool-label">Upload Image (PNG recommended)</label>
        <input type="file" class="tool-input" id="favFile" accept="image/*"></div>
      <div class="btn-group"><button class="btn btn-primary" onclick="doFavicon()">⭐ Generate Favicons</button></div>
      <div id="favOut"></div>`;
  });
}
async function doFavicon() {
  const file=document.getElementById('favFile').files[0];
  if(!file){toast('Please select an image.','warn');return;}
  const btn=document.querySelector('#toolContent .btn-primary');btn.disabled=true;if(!btn.dataset.origHtml)btn.dataset.origHtml=btn.innerHTML;btn.textContent='⏳ Generating…';
  try{const fd=new FormData();fd.append('image',file);const d=await apiFetch('/api/tools/favicon-generator','POST',fd);const favs=d.favicons||[];
  document.getElementById('favOut').innerHTML=favs.length?`<div style="display:flex;flex-wrap:wrap;gap:16px;margin-top:16px">${favs.map(f=>`<div style="text-align:center"><img src="${f.data}" style="width:${f.size}px;height:${f.size}px;border:1px solid var(--border);border-radius:4px"><div style="font-size:11px;margin-top:4px">${f.size}×${f.size}</div><a href="${f.data}" download="favicon-${f.size}.png" class="btn btn-secondary btn-sm" style="margin-top:4px;display:inline-flex">${ICONS.download}</a></div>`).join('')}</div>`:
  `<div class="info-box">Favicon generation requires Jimp. Make sure it is installed: npm install jimp</div>`;
  toast('Done!','success');}catch(e){toast(e.message||'Error','error');}
  finally{btn.disabled=false;btn.innerHTML=btn.dataset.origHtml||btn.innerHTML;delete btn.dataset.origHtml;}
}

function renderGIFMaker(tool) {
  buildToolPage(tool, () => {
    document.getElementById('toolContent').innerHTML = `
      <div class="tool-section"><label class="tool-label">Upload Images (ordered, max 20)</label>
        <input type="file" class="tool-input" id="gifFiles" accept="image/*" multiple onchange="previewGIFFrames(this)"></div>
      <div id="gifPreview" style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:12px"></div>
      <div class="tool-row" style="margin-bottom:14px;gap:16px;flex-wrap:wrap">
        <div><label class="tool-label">Delay (ms/frame)</label><input type="number" class="tool-input" id="gifDelay" value="200" min="50" max="5000" style="width:120px"></div>
        <div><label class="tool-label">Width (px)</label><input type="number" class="tool-input" id="gifW" value="320" min="50" max="800" style="width:120px"></div>
        <div><label class="tool-label">Quality (1=best)</label><input type="number" class="tool-input" id="gifQ" value="10" min="1" max="20" style="width:120px"></div>
      </div>
      <div class="btn-group"><button class="btn btn-primary" onclick="doGIF()">🎞️ Create GIF</button></div>
      <div id="gifProgress" style="display:none;margin:12px 0">
        <div style="height:4px;background:var(--border);border-radius:2px;overflow:hidden"><div id="gifBar" style="height:100%;background:var(--accent);width:0%;transition:width .3s"></div></div>
        <div id="gifStatus" style="font-size:12px;color:var(--text-muted);margin-top:6px">Processing…</div>
      </div>
      <div id="gifOut"></div>`;
  });
}

function previewGIFFrames(inp) {
  const files = Array.from(inp.files || []);
  const preview = document.getElementById('gifPreview');
  if (!preview) return;
  preview.innerHTML = files.slice(0,10).map((f,i) => {
    const url = URL.createObjectURL(f);
    return `<div style="text-align:center"><img src="${url}" style="width:60px;height:60px;object-fit:cover;border-radius:6px;border:1px solid var(--border)"><div style="font-size:10px;color:var(--text-muted);margin-top:2px">${i+1}</div></div>`;
  }).join('') + (files.length > 10 ? `<div style="font-size:12px;color:var(--text-muted);align-self:center">+${files.length-10} more</div>` : '');
}

async function doGIF() {
  const files = Array.from(document.getElementById('gifFiles').files || []);
  if (files.length < 2) { toast('Please select at least 2 images.', 'warn'); return; }
  const btn = document.querySelector('#toolContent .btn-primary');
  const prog = document.getElementById('gifProgress');
  const bar = document.getElementById('gifBar');
  const statusEl = document.getElementById('gifStatus');
  if (btn) { btn.disabled = true; if(!btn.dataset.origHtml)btn.dataset.origHtml=btn.innerHTML; btn.textContent = '⏳ Creating GIF…'; }
  if (prog) prog.style.display = 'block';

  try {
    // Load gif.js from CDN
    if (!window.GIF) {
      await new Promise((resolve, reject) => {
        const s = document.createElement('script');
        s.src = 'https://cdnjs.cloudflare.com/ajax/libs/gif.js/0.2.0/gif.js';
        s.onload = resolve; s.onerror = reject;
        document.head.appendChild(s);
      });
    }

    const delay = parseInt(document.getElementById('gifDelay').value) || 200;
    const width = parseInt(document.getElementById('gifW').value) || 320;
    const quality = parseInt(document.getElementById('gifQ').value) || 10;

    // Load all images
    const imgs = await Promise.all(files.map(f => new Promise((res, rej) => {
      const img = new Image();
      const url = URL.createObjectURL(f);
      img.onload = () => { URL.revokeObjectURL(url); res(img); };
      img.onerror = rej;
      img.src = url;
    })));

    if (statusEl) statusEl.textContent = 'Building frames…';
    if (bar) bar.style.width = '20%';

    // Draw each frame to canvas and add to GIF
    const gif = new GIF({ workers: 2, quality, width, height: Math.round(imgs[0].naturalHeight * width / imgs[0].naturalWidth) });
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = gif.options.height;
    const ctx = canvas.getContext('2d');

    imgs.forEach((img, i) => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      gif.addFrame(ctx, { copy: true, delay });
      if (bar) bar.style.width = (20 + i/imgs.length * 60) + '%';
    });

    gif.on('progress', p => { if (bar) bar.style.width = (80 + p * 20) + '%'; if (statusEl) statusEl.textContent = `Encoding… ${Math.round(p*100)}%`; });

    const blob = await new Promise(res => { gif.on('finished', res); gif.render(); });
    const url = URL.createObjectURL(blob);

    if (bar) bar.style.width = '100%';
    if (statusEl) statusEl.textContent = 'Done!';

    document.getElementById('gifOut').innerHTML = `
      <img src="${url}" style="max-width:100%;border-radius:8px;border:1px solid var(--border);margin-top:12px">
      <div style="margin-top:10px;display:flex;gap:8px;flex-wrap:wrap">
        <a href="${url}" download="animation.gif" class="btn btn-secondary btn-sm" style="display:inline-flex;align-items:center;gap:6px">${ICONS.download} Download GIF</a>
        <span style="font-size:12px;color:var(--text-muted);align-self:center">${imgs.length} frames · ${delay}ms · ${width}px wide</span>
      </div>`;
    toast('GIF created!', 'success');
  } catch(e) {
    toast('GIF error: ' + (e.message || 'Unknown error. Try fewer/smaller images.'), 'error');
  } finally {
    if (btn) { btn.disabled = false; btn.innerHTML = btn.dataset.origHtml||btn.innerHTML; }
    setTimeout(() => { if (prog) prog.style.display = 'none'; }, 2000);
  }
}

function renderScreenshotResizer(tool) {
  const P={'Custom':'custom','Twitter Header':'1500x500','Twitter Post':'1200x675','Instagram Post':'1080x1080','Instagram Story':'1080x1920','LinkedIn Cover':'1584x396','LinkedIn Post':'1200x627','Facebook Post':'1200x630','App Store':'1290x2796','Play Store':'1080x1920','YouTube Thumbnail':'1280x720'};
  buildToolPage(tool, () => {
    document.getElementById('toolContent').innerHTML = `
      <div class="tool-section"><label class="tool-label">Upload Screenshot</label>
        <input type="file" class="tool-input" id="ssFile" accept="image/*"></div>
      <div class="tool-row" style="margin-bottom:14px">
        <div class="tool-col"><label class="tool-label">Preset</label>
          <select class="tool-select" id="ssPreset" onchange="applySSP()">${Object.entries(P).map(([n,v])=>`<option value="${v}">${n}</option>`).join('')}</select></div>
        <div class="tool-col"><label class="tool-label">Width</label><input type="number" class="tool-input" id="ssW" placeholder="Auto"></div>
        <div class="tool-col"><label class="tool-label">Height</label><input type="number" class="tool-input" id="ssH" placeholder="Auto"></div>
      </div>
      <div class="btn-group"><button class="btn btn-primary" onclick="doSSResize()">📱 Resize</button></div>
      <div id="ssOut"></div>`;
  });
}
function applySSP(){const v=document.getElementById('ssPreset').value;if(v!=='custom'&&v.includes('x')){const[w,h]=v.split('x');document.getElementById('ssW').value=w;document.getElementById('ssH').value=h;}}
async function doSSResize() {
  const file=document.getElementById('ssFile').files[0];
  if(!file){toast('Please select an image.','warn');return;}
  const btn=document.querySelector('#toolContent .btn-primary');btn.disabled=true;if(!btn.dataset.origHtml)btn.dataset.origHtml=btn.innerHTML;btn.textContent='⏳ Resizing…';
  try{const fd=new FormData();fd.append('image',file);fd.append('width',document.getElementById('ssW').value||0);fd.append('height',document.getElementById('ssH').value||0);
  const res=await apiFetch('/api/tools/screenshot-resizer','POST',fd);const blob=res instanceof Response?await res.blob():null;
  if(blob){const url=URL.createObjectURL(blob);document.getElementById('ssOut').innerHTML=`<img src="${url}" style="max-width:100%;border-radius:8px;border:1px solid var(--border);margin-top:12px"><br><a href="${url}" download="resized.png" class="btn btn-secondary btn-sm" style="margin-top:8px;display:inline-flex">${ICONS.download} Download</a>`;toast('Resized!','success');}
  }catch(e){toast(e.message||'Error','error');}
  finally{btn.disabled=false;btn.innerHTML=btn.dataset.origHtml||btn.innerHTML;delete btn.dataset.origHtml;}
}

function renderGradientGen(tool) {
  buildToolPage(tool, () => {
    document.getElementById('toolContent').innerHTML = `
      <div id="gradPrev" class="gradient-preview" style="background:linear-gradient(135deg,#6366f1,#8b5cf6)"></div>
      <div class="tool-row" style="margin-bottom:14px">
        <div class="tool-col"><label class="tool-label">Type</label>
          <select class="tool-select" id="gradT" onchange="updateGrad()"><option value="linear">Linear</option><option value="radial">Radial</option><option value="conic">Conic</option></select></div>
        <div class="tool-col"><label class="tool-label">Angle: <span id="gradAV">135</span>°</label>
          <input type="range" class="tool-range" id="gradA" min="0" max="360" value="135" oninput="document.getElementById('gradAV').textContent=this.value;updateGrad()"></div>
      </div>
      <div class="tool-row" style="margin-bottom:14px">
        <div class="tool-col"><label class="tool-label">Color 1</label><input type="color" class="tool-input" id="gc1" value="#6366f1" style="height:42px;padding:4px" oninput="updateGrad()"></div>
        <div class="tool-col"><label class="tool-label">Color 2</label><input type="color" class="tool-input" id="gc2" value="#8b5cf6" style="height:42px;padding:4px" oninput="updateGrad()"></div>
        <div class="tool-col"><label class="tool-label">Color 3 (opt.)</label><input type="color" class="tool-input" id="gc3" value="#ec4899" style="height:42px;padding:4px" oninput="updateGrad()"></div>
      </div>
      <div class="output-label">CSS Code</div>
      <div class="code-block" id="gradCode">background: linear-gradient(135deg, #6366f1, #8b5cf6);</div>
      <div class="output-actions"><button class="btn btn-secondary btn-sm" onclick="copyText(document.getElementById('gradCode').innerText,'CSS copied')">${ICONS.copy} Copy CSS</button></div>`;
    updateGrad();
  });
}
function updateGrad(){const t=document.getElementById('gradT').value,a=document.getElementById('gradA').value,c1=document.getElementById('gc1').value,c2=document.getElementById('gc2').value,c3=document.getElementById('gc3').value;const cs=[c1,c2,c3].join(',');let css=t==='radial'?`radial-gradient(circle, ${cs})`:t==='conic'?`conic-gradient(from ${a}deg, ${cs})`:`linear-gradient(${a}deg, ${cs})`;document.getElementById('gradPrev').style.background=css;document.getElementById('gradCode').textContent=`background: ${css};`;}


// ═══════════════════════════════════════════════════════════════════════════════
// UTILITY TOOLS
// ═══════════════════════════════════════════════════════════════════════════════

function renderTimestamp(tool) {
  buildToolPage(tool, () => {
    document.getElementById('toolContent').innerHTML = `
      <div class="tool-row" style="margin-bottom:14px">
        <div class="tool-col"><label class="tool-label">Mode</label>
          <select class="tool-select" id="tsMode"><option value="toHuman">Timestamp → Date</option><option value="toUnix">Date → Timestamp</option></select></div>
      </div>
      <div class="tool-section"><label class="tool-label">Input</label>
        <input class="tool-input" id="tsIn" placeholder="e.g. 1704067200 or 2024-01-01"></div>
      <div class="btn-group"><button class="btn btn-primary" onclick="doTS()">🕐 Convert</button></div>
      <div id="tsOut"></div>`;
  });
}
async function doTS() {
  const v=document.getElementById('tsIn').value.trim();
  if(!v){toast('Please enter a value.','warn');return;}
  const btn=document.querySelector('#toolContent .btn-primary');btn.disabled=true;if(!btn.dataset.origHtml)btn.dataset.origHtml=btn.innerHTML;btn.textContent='⏳ Converting…';
  try{const d=await apiFetch('/api/tools/timestamp-converter','POST',{value:v,mode:document.getElementById('tsMode').value});
  const r=d.result||{};document.getElementById('tsOut').innerHTML=`<div class="stat-grid" style="margin-top:14px">${Object.entries(r).map(([k,val])=>`<div class="stat-card"><div style="font-size:13px;font-weight:600;word-break:break-all">${val}</div><div class="stat-label">${k}</div></div>`).join('')}</div>`;
  toast('Converted!','success');}catch(e){toast(e.message||'Error','error');}
  finally{btn.disabled=false;btn.innerHTML=btn.dataset.origHtml||btn.innerHTML;delete btn.dataset.origHtml;}
}

function renderJSON(tool) {
  buildToolPage(tool, () => {
    document.getElementById('toolContent').innerHTML = `
      <div class="tool-section"><label class="tool-label">JSON Input</label>
        <textarea class="tool-textarea" id="jsonIn" rows="10" placeholder='{"key": "value"}' style="font-family:monospace;font-size:13px"></textarea></div>
      <div class="tool-row" style="margin-bottom:14px">
        <div class="tool-col"><label class="tool-label">Mode</label>
          <select class="tool-select" id="jsonMode"><option value="format">Format / Beautify</option><option value="minify">Minify</option><option value="sort">Sort Keys</option></select></div>
        <div class="tool-col"><label class="tool-label">Indent</label>
          <select class="tool-select" id="jsonIndent"><option value="2" selected>2 spaces</option><option value="4">4 spaces</option><option value="1">1 tab</option></select></div>
      </div>
      <div class="btn-group"><button class="btn btn-primary" onclick="doJSON()">{ } Format JSON</button></div>
      <div class="output-label">Result</div>
      <div class="code-block" id="jsonOut" style="min-height:80px;white-space:pre;overflow-x:auto">Result will appear here…</div>
      <div class="output-actions"><button class="btn btn-secondary btn-sm" onclick="copyText(document.getElementById('jsonOut').innerText,'JSON copied')">${ICONS.copy} Copy</button></div>`;
  });
}
async function doJSON() {
  const text=document.getElementById('jsonIn').value.trim();
  if(!text){toast('Please enter JSON.','warn');return;}
  try{const d=await apiFetch('/api/tools/json-formatter','POST',{text,mode:document.getElementById('jsonMode').value,indent:document.getElementById('jsonIndent').value});document.getElementById('jsonOut').textContent=d.result;toast(d.valid?'Valid JSON ✓':'Warning','success');}
  catch(e){toast(e.message||'Invalid JSON','error');}
}

function renderNameGen(tool) {
  buildToolPage(tool, () => {
    document.getElementById('toolContent').innerHTML = `
      <div class="tool-row" style="margin-bottom:14px">
        <div class="tool-col"><label class="tool-label">Gender</label>
          <select class="tool-select" id="ngGender"><option value="neutral">Neutral</option><option value="male">Male</option><option value="female">Female</option></select></div>
        <div class="tool-col"><label class="tool-label">Type</label>
          <select class="tool-select" id="ngType"><option value="full">Full Name</option><option value="first">First Only</option><option value="last">Last Only</option></select></div>
        <div class="tool-col"><label class="tool-label">Count</label>
          <input type="number" class="tool-input" id="ngCount" value="10" min="1" max="20" style="width:80px"></div>
      </div>
      <div class="btn-group"><button class="btn btn-primary" onclick="doNames()">👤 Generate Names</button></div>
      <div id="ngOut"></div>`;
  });
}
async function doNames() {
  const btn=document.querySelector('#toolContent .btn-primary');btn.disabled=true;if(!btn.dataset.origHtml)btn.dataset.origHtml=btn.innerHTML;btn.textContent='⏳ Generating…';
  try{const d=await apiFetch('/api/tools/name-generator','POST',{gender:document.getElementById('ngGender').value,type:document.getElementById('ngType').value,count:parseInt(document.getElementById('ngCount').value)});
  document.getElementById('ngOut').innerHTML=`<div style="display:flex;flex-wrap:wrap;gap:8px;margin-top:12px">${(d.names||[]).map(n=>`<div style="display:flex;align-items:center;gap:6px;background:var(--bg-muted);border:1px solid var(--border);border-radius:8px;padding:8px 14px"><span style="font-size:14px;font-weight:600">${n}</span><button class="btn-icon-sm" onclick="copyText('${n}')" style="border:none">${ICONS.copy}</button></div>`).join('')}</div>`;
  toast('Generated!','success');}catch(e){toast(e.message||'Error','error');}
  finally{btn.disabled=false;btn.innerHTML=btn.dataset.origHtml||btn.innerHTML;delete btn.dataset.origHtml;}
}

function renderUnitConverter(tool) {
  buildToolPage(tool, () => {
    const cats={length:{m:'Meter',km:'Kilometer',cm:'Centimeter',mm:'Millimeter',ft:'Foot',in:'Inch',yd:'Yard',mi:'Mile'},weight:{kg:'Kilogram',g:'Gram',mg:'Milligram',lb:'Pound',oz:'Ounce',t:'Tonne'},temperature:{c:'Celsius',f:'Fahrenheit',k:'Kelvin'},volume:{l:'Litre',ml:'Millilitre',gal:'Gallon',qt:'Quart',cup:'Cup',floz:'Fl Oz'},speed:{ms:'m/s',kph:'km/h',mph:'mph',knot:'Knot',fps:'ft/s'},area:{m2:'m²',km2:'km²',cm2:'cm²',ft2:'ft²',in2:'in²',acre:'Acre',ha:'Hectare'}};
    document.getElementById('toolContent').innerHTML = `
      <div class="tool-row" style="margin-bottom:14px">
        <div class="tool-col"><label class="tool-label">Category</label>
          <select class="tool-select" id="ucCat" onchange="updateUCUnits()">${Object.keys(cats).map(c=>`<option value="${c}">${c.charAt(0).toUpperCase()+c.slice(1)}</option>`).join('')}</select></div>
      </div>
      <div class="tool-row" style="margin-bottom:14px">
        <div class="tool-col"><label class="tool-label">Value</label><input type="number" class="tool-input" id="ucVal" placeholder="Enter value…"></div>
        <div class="tool-col"><label class="tool-label">From</label><select class="tool-select" id="ucFrom"></select></div>
        <div class="tool-col"><label class="tool-label">To</label><select class="tool-select" id="ucTo"></select></div>
      </div>
      <div class="btn-group"><button class="btn btn-primary" onclick="doUnitConv()">⚖️ Convert</button></div>
      <div id="ucOut"></div>`;
    window._ucCats=cats; updateUCUnits();
  });
}
function updateUCUnits(){const cat=document.getElementById('ucCat').value,units=window._ucCats[cat]||{};['ucFrom','ucTo'].forEach(id=>{document.getElementById(id).innerHTML=Object.entries(units).map(([v,l])=>`<option value="${v}">${l}</option>`).join('');});}
async function doUnitConv() {
  const v=document.getElementById('ucVal').value.trim();
  if(!v){toast('Please enter a value.','warn');return;}
  const btn=document.querySelector('#toolContent .btn-primary');btn.disabled=true;if(!btn.dataset.origHtml)btn.dataset.origHtml=btn.innerHTML;btn.textContent='⏳ Converting…';
  try{const d=await apiFetch('/api/tools/unit-converter','POST',{value:v,from:document.getElementById('ucFrom').value,to:document.getElementById('ucTo').value,category:document.getElementById('ucCat').value});
  document.getElementById('ucOut').innerHTML=`<div class="result-highlight" style="margin-top:14px"><div style="font-size:13px;color:var(--text-muted)">${v} ${d.from} =</div><div class="result-value" style="font-size:28px;font-weight:700;color:var(--accent)">${d.result} ${d.to}</div></div>`;
  toast('Converted!','success');}catch(e){toast(e.message||'Error','error');}
  finally{btn.disabled=false;btn.innerHTML=btn.dataset.origHtml||btn.innerHTML;delete btn.dataset.origHtml;}
}

function renderCalculator(tool) {
  buildToolPage(tool, () => {
    document.getElementById('toolContent').innerHTML = `
      <div class="tool-section"><label class="tool-label">Expression</label>
        <input class="tool-input" id="calcIn" placeholder="e.g. sqrt(144) + sin(30) * 2" style="font-family:monospace;font-size:15px" onkeydown="if(event.key==='Enter')doCalc()"></div>
      <div class="btn-group"><button class="btn btn-primary" onclick="doCalc()">🧮 Calculate</button></div>
      <div id="calcOut"></div>
      <div class="info-box" style="margin-top:12px">Supports: +, -, *, /, ^, %, sqrt(), sin(), cos(), tan(), log(), abs(), pi, e</div>`;
  });
}
async function doCalc() {
  const expr=document.getElementById('calcIn').value.trim();
  if(!expr){toast('Please enter an expression.','warn');return;}
  try{const d=await apiFetch('/api/tools/calculator','POST',{expression:expr});
  document.getElementById('calcOut').innerHTML=`<div class="result-highlight" style="margin-top:14px"><div style="font-size:13px;color:var(--text-muted)">${d.expression} =</div><div class="result-value" style="font-size:32px;font-weight:700;color:var(--accent)">${d.result}</div></div>`;
  toast('Done!','success');}catch(e){toast(e.message||'Error','error');}
}

function renderBinary(tool) {
  buildToolPage(tool, () => {
    document.getElementById('toolContent').innerHTML = `
      <div class="tool-section"><label class="tool-label">Input</label>
        <textarea class="tool-textarea" id="binIn" rows="5" placeholder="Text or binary…" style="font-family:monospace"></textarea></div>
      <div class="btn-group">
        <button class="btn btn-primary" onclick="doBin('toBinary')">Text → Binary</button>
        <button class="btn btn-secondary" onclick="doBin('toText')">Binary → Text</button>
      </div>
      <div class="output-label">Result</div>
      <div class="output-box" id="binOut" style="font-family:monospace;font-size:13px"><span class="output-placeholder">Result will appear here…</span></div>
      <div class="output-actions">${copyBtn('binOut')}</div>`;
  });
}
async function doBin(mode){const t=document.getElementById('binIn').value;if(!t){toast('Please enter text.','warn');return;}await runTool('binary-converter',{text:t,mode},'binOut',d=>d.result||'');}

function renderURLEncoder(tool) {
  buildToolPage(tool, () => {
    document.getElementById('toolContent').innerHTML = `
      <div class="tool-section"><label class="tool-label">Input</label>
        <textarea class="tool-textarea" id="urlIn" rows="5" placeholder="Enter URL or text to encode/decode…"></textarea></div>
      <div class="btn-group">
        <button class="btn btn-primary" onclick="doURL('encode')">Encode →</button>
        <button class="btn btn-secondary" onclick="doURL('decode')">← Decode</button>
      </div>
      <div class="output-label">Result</div>
      <div class="output-box" id="urlOut"><span class="output-placeholder">Result will appear here…</span></div>
      <div class="output-actions">${copyBtn('urlOut')}</div>`;
  });
}
async function doURL(mode){const t=document.getElementById('urlIn').value;if(!t){toast('Please enter text.','warn');return;}await runTool('url-encoder',{text:t,mode},'urlOut',d=>d.result||'');}

function renderIPLookup(tool) {
  buildToolPage(tool, () => {
    document.getElementById('toolContent').innerHTML = `
      <div class="tool-section"><label class="tool-label">IP Address (leave blank for your IP)</label>
        <input class="tool-input" id="ipIn" placeholder="e.g. 8.8.8.8"></div>
      <div class="btn-group"><button class="btn btn-primary" onclick="doIP()">🌐 Lookup IP</button></div>
      <div id="ipOut"></div>`;
  });
}
async function doIP() {
  const ip=document.getElementById('ipIn').value.trim();
  const btn=document.querySelector('#toolContent .btn-primary');btn.disabled=true;if(!btn.dataset.origHtml)btn.dataset.origHtml=btn.innerHTML;btn.textContent='⏳ Looking up…';
  try{const d=await apiFetch('/api/tools/ip-lookup','POST',{ip});
  document.getElementById('ipOut').innerHTML=`<div class="stat-grid" style="margin-top:14px">${Object.entries(d).filter(([k])=>k!=='status').map(([k,v])=>`<div class="stat-card"><div style="font-size:13px;font-weight:600">${String(v||'—')}</div><div class="stat-label">${k}</div></div>`).join('')}</div>`;
  toast('Done!','success');}catch(e){toast(e.message||'Error','error');}
  finally{btn.disabled=false;btn.innerHTML=btn.dataset.origHtml||btn.innerHTML;delete btn.dataset.origHtml;}
}

function renderHashGen(tool) {
  buildToolPage(tool, () => {
    document.getElementById('toolContent').innerHTML = `
      <div class="tool-section"><label class="tool-label">Text to hash</label>
        <textarea class="tool-textarea" id="hashIn2" rows="5" placeholder="Enter text to generate hashes…"></textarea></div>
      <div style="display:flex;flex-wrap:wrap;gap:10px;margin-bottom:14px">
        <label class="checkbox-row"><input type="checkbox" id="hMD5" checked><span class="checkbox-label">MD5</span></label>
        <label class="checkbox-row"><input type="checkbox" id="hSHA1" checked><span class="checkbox-label">SHA-1</span></label>
        <label class="checkbox-row"><input type="checkbox" id="hSHA256" checked><span class="checkbox-label">SHA-256</span></label>
        <label class="checkbox-row"><input type="checkbox" id="hSHA512" checked><span class="checkbox-label">SHA-512</span></label>
      </div>
      <div class="btn-group"><button class="btn btn-primary" onclick="doHash()">#️⃣ Generate Hashes</button></div>
      <div id="hashOut2"></div>`;
  });
}
async function doHash() {
  const text=document.getElementById('hashIn2').value.trim();
  if(!text){toast('Please enter text.','warn');return;}
  const algos=['md5','sha1','sha256','sha512'].filter(a=>document.getElementById('h'+a.toUpperCase().replace('-',''))?.checked);
  const btn=document.querySelector('#toolContent .btn-primary');btn.disabled=true;if(!btn.dataset.origHtml)btn.dataset.origHtml=btn.innerHTML;btn.textContent='⏳ Hashing…';
  try{const d=await apiFetch('/api/tools/hash-generator','POST',{text,algorithms:algos});
  document.getElementById('hashOut2').innerHTML=Object.entries(d.hashes||{}).map(([algo,h])=>`<div style="margin-top:10px"><div class="output-label">${algo.toUpperCase()}</div><div style="display:flex;gap:8px;align-items:center"><div class="code-block" style="flex:1;padding:10px;font-size:12px;overflow-x:auto">${h}</div><button class="btn-icon-sm" onclick="copyText('${h}','Hash copied')">${ICONS.copy}</button></div></div>`).join('');
  toast('Hashes generated!','success');}catch(e){toast(e.message||'Error','error');}
  finally{btn.disabled=false;btn.innerHTML=btn.dataset.origHtml||btn.innerHTML;delete btn.dataset.origHtml;}
}

function renderRegexTester(tool) {
  buildToolPage(tool, () => {
    document.getElementById('toolContent').innerHTML = `
      <div class="tool-row" style="margin-bottom:14px">
        <div class="tool-col" style="flex:2"><label class="tool-label">Pattern</label>
          <input class="tool-input" id="rxPat" placeholder="^[a-z]+$" style="font-family:monospace"></div>
        <div class="tool-col"><label class="tool-label">Flags</label>
          <input class="tool-input" id="rxFlags" value="g" style="width:80px;font-family:monospace"></div>
      </div>
      <div class="tool-section"><label class="tool-label">Test Text</label>
        <textarea class="tool-textarea" id="rxText" rows="6" placeholder="Enter text to test against your regex…"></textarea></div>
      <div class="btn-group"><button class="btn btn-primary" onclick="doRegex()">⚡ Test Regex</button></div>
      <div id="rxOut"></div>`;
  });
}
async function doRegex() {
  const pat=document.getElementById('rxPat').value;
  if(!pat){toast('Please enter a pattern.','warn');return;}
  const btn=document.querySelector('#toolContent .btn-primary');btn.disabled=true;if(!btn.dataset.origHtml)btn.dataset.origHtml=btn.innerHTML;btn.textContent='⏳ Testing…';
  try{const d=await apiFetch('/api/tools/regex-tester','POST',{pattern:pat,flags:document.getElementById('rxFlags').value,text:document.getElementById('rxText').value});
  const ms=d.matches||[];
  document.getElementById('rxOut').innerHTML=`<div class="stat-grid" style="margin:12px 0"><div class="stat-card"><div class="stat-value">${ms.length}</div><div class="stat-label">Matches</div></div></div>`
  +(ms.length?ms.map((m,i)=>`<div class="output-box" style="margin-top:8px;font-family:monospace;font-size:13px"><strong>Match ${i+1}</strong>: "${m.match}" at index ${m.index}${m.groups?.filter(Boolean).length?` | Groups: ${m.groups.filter(Boolean).join(', ')}`:''}</div>`).join(''):`<div class="info-box">No matches found.</div>`);
  toast(`${ms.length} match${ms.length!==1?'es':''}!`,'success');}catch(e){toast(e.message||'Error','error');}
  finally{btn.disabled=false;btn.innerHTML=btn.dataset.origHtml||btn.innerHTML;delete btn.dataset.origHtml;}
}

function renderCSSMin(tool){renderMinifier('CSS','css-minifier',tool);}
function renderHTMLMin(tool){renderMinifier('HTML','html-minifier',tool);}
function renderJSMin(tool){renderMinifier('JavaScript','js-minifier',tool);}
function renderMinifier(type, toolId, tool) {
  buildToolPage(tool, () => {
    document.getElementById('toolContent').innerHTML = `
      <div class="tool-section"><label class="tool-label">${type} to minify</label>
        <textarea class="tool-textarea" id="minIn" rows="10" placeholder="Paste your ${type} here…" style="font-family:monospace;font-size:13px"></textarea></div>
      <div class="btn-group"><button class="btn btn-primary" onclick="doMinify('${toolId}','${type}')">🗜️ Minify ${type}</button></div>
      <div class="output-label">Minified Output</div>
      <div class="code-block" id="minOut" style="min-height:80px;white-space:pre-wrap;overflow-x:auto">Result will appear here…</div>
      <div id="minStats" style="margin-top:8px"></div>
      <div class="output-actions"><button class="btn btn-secondary btn-sm" onclick="copyText(document.getElementById('minOut').textContent,'Minified copied')">${ICONS.copy} Copy</button></div>`;
  });
}
async function doMinify(toolId, type) {
  const text=document.getElementById('minIn').value.trim();
  if(!text){toast(`Please enter ${type}.`,'warn');return;}
  const btn=document.querySelector('#toolContent .btn-primary');btn.disabled=true;if(!btn.dataset.origHtml)btn.dataset.origHtml=btn.innerHTML;btn.textContent='⏳ Minifying…';
  try{const d=await apiFetch(`/api/tools/${toolId}`,'POST',{text});document.getElementById('minOut').textContent=d.result||'';
  const orig=text.length,mini=(d.result||'').length,saved=Math.round((1-mini/orig)*100);
  document.getElementById('minStats').innerHTML=`<div class="info-box">Original: ${orig} chars → Minified: ${mini} chars (${saved}% smaller)</div>`;
  toast(`Saved ${saved}%!`,'success');}catch(e){toast(e.message||'Error','error');}
  finally{btn.disabled=false;btn.innerHTML=btn.dataset.origHtml||btn.innerHTML;delete btn.dataset.origHtml;}
}

function renderColorContrast(tool) {
  buildToolPage(tool, () => {
    document.getElementById('toolContent').innerHTML = `
      <div class="tool-row" style="margin-bottom:14px">
        <div class="tool-col"><label class="tool-label">Foreground Color</label>
          <input type="color" class="tool-input" id="ccFg" value="#000000" style="height:50px;padding:4px" oninput="doCCDebounced()"></div>
        <div class="tool-col"><label class="tool-label">Background Color</label>
          <input type="color" class="tool-input" id="ccBg" value="#ffffff" style="height:50px;padding:4px" oninput="doCCDebounced()"></div>
      </div>
      <div id="ccPreview" style="border-radius:8px;border:1px solid var(--border);padding:24px;margin-bottom:14px;text-align:center;font-size:18px;font-weight:600;background:#ffffff;color:#000000">Sample Text Preview</div>
      <div id="ccOut"></div>`;
    doCC();
  });
}
let _ccDebounce;
function doCCDebounced() { clearTimeout(_ccDebounce); _ccDebounce = setTimeout(doCC, 300); }
async function doCC() {
  const fg=document.getElementById('ccFg').value,bg=document.getElementById('ccBg').value;
  document.getElementById('ccPreview').style.color=fg;document.getElementById('ccPreview').style.background=bg;
  try{const d=await apiFetch('/api/tools/color-contrast','POST',{fg,bg});
  const aaPass = d.aa_normal !== undefined ? d.aa_normal : d.aa;
  const aaaPass = d.aaa_normal !== undefined ? d.aaa_normal : d.aaa;
  const gradeColor = d.grade==='AAA'?'var(--success)':d.grade==='AA'?'#22c55e':d.grade==='AA Large'?'var(--warn)':'var(--danger)';
  document.getElementById('ccOut').innerHTML=`<div class="stat-grid"><div class="stat-card"><div class="stat-value">${d.ratio}:1</div><div class="stat-label">Contrast Ratio</div></div><div class="stat-card"><div class="stat-value" style="color:${aaPass?'var(--success)':'var(--danger)'}">${aaPass?'✓ Pass':'✗ Fail'}</div><div class="stat-label">WCAG AA (4.5:1)</div></div><div class="stat-card"><div class="stat-value" style="color:${aaaPass?'var(--success)':'var(--danger)'}">${aaaPass?'✓ Pass':'✗ Fail'}</div><div class="stat-label">WCAG AAA (7:1)</div></div><div class="stat-card"><div class="stat-value" style="color:${gradeColor}">${d.grade||'—'}</div><div class="stat-label">Grade</div></div></div><div class="info-box" style="margin-top:10px">AA requires 4.5:1 for normal text, 3:1 for large text. AAA requires 7:1 for normal text.</div>`;
  }catch(e){}
}

function renderCurrencyConverter(tool) {
  buildToolPage(tool, () => {
    const CC=['USD','EUR','GBP','JPY','AUD','CAD','CHF','CNY','HKD','NZD','SEK','KRW','SGD','NOK','MXN','INR','BRL','ZAR','AED','TRY'];
    document.getElementById('toolContent').innerHTML = `
      <div class="tool-row" style="margin-bottom:14px">
        <div class="tool-col"><label class="tool-label">Amount</label><input type="number" class="tool-input" id="curAmt" value="1" min="0" step="any"></div>
        <div class="tool-col"><label class="tool-label">From</label><select class="tool-select" id="curFrom">${CC.map(c=>`<option value="${c}">${c}</option>`).join('')}</select></div>
        <div class="tool-col"><label class="tool-label">To</label><select class="tool-select" id="curTo">${CC.map((c,i)=>`<option value="${c}"${i===1?' selected':''}>${c}</option>`).join('')}</select></div>
      </div>
      <div class="btn-group"><button class="btn btn-primary" onclick="doCurrency()">💱 Convert</button></div>
      <div id="curOut"></div>`;
  });
}
async function doCurrency() {
  const btn=document.querySelector('#toolContent .btn-primary');btn.disabled=true;if(!btn.dataset.origHtml)btn.dataset.origHtml=btn.innerHTML;btn.textContent='⏳ Converting…';
  try{const d=await apiFetch('/api/tools/currency-converter','POST',{amount:parseFloat(document.getElementById('curAmt').value),from:document.getElementById('curFrom').value,to:document.getElementById('curTo').value});
  document.getElementById('curOut').innerHTML=`<div class="result-highlight" style="margin-top:14px"><div style="font-size:13px;color:var(--text-muted)">${d.amount} ${d.from} =</div><div class="result-value" style="font-size:28px;font-weight:700;color:var(--accent)">${d.result} ${d.to}</div>${d.rate?`<div style="font-size:12px;color:var(--text-muted);margin-top:4px">Rate: 1 ${d.from} = ${d.rate} ${d.to}</div>`:''}</div>`;
  toast('Converted!','success');}catch(e){toast(e.message||'Error','error');}
  finally{btn.disabled=false;btn.innerHTML=btn.dataset.origHtml||btn.innerHTML;delete btn.dataset.origHtml;}
}

function renderAgeCalc(tool) {
  buildToolPage(tool, () => {
    document.getElementById('toolContent').innerHTML = `
      <div class="tool-section"><label class="tool-label">Date of Birth</label>
        <input type="date" class="tool-input" id="ageDate" style="max-width:220px"></div>
      <div class="btn-group"><button class="btn btn-primary" onclick="doAge()">🎂 Calculate Age</button></div>
      <div id="ageOut"></div>`;
  });
}
async function doAge() {
  const d2=document.getElementById('ageDate').value;
  if(!d2){toast('Please select a date.','warn');return;}
  const btn=document.querySelector('#toolContent .btn-primary');btn.disabled=true;if(!btn.dataset.origHtml)btn.dataset.origHtml=btn.innerHTML;btn.textContent='⏳ Calculating…';
  try{const d=await apiFetch('/api/tools/age-calculator','POST',{birthdate:d2});
  document.getElementById('ageOut').innerHTML=`<div class="stat-grid" style="margin-top:14px">${Object.entries(d).filter(([k])=>k!=='birthdate').map(([k,v])=>`<div class="stat-card"><div class="stat-value" style="font-size:20px">${v}</div><div class="stat-label">${k}</div></div>`).join('')}</div>`;
  toast('Calculated!','success');}catch(e){toast(e.message||'Error','error');}
  finally{btn.disabled=false;btn.innerHTML=btn.dataset.origHtml||btn.innerHTML;delete btn.dataset.origHtml;}
}

function renderPctCalc(tool) {
  buildToolPage(tool, () => {
    document.getElementById('toolContent').innerHTML = `
      <div class="tool-section"><label class="tool-label">Mode</label>
        <select class="tool-select" id="pctMode" onchange="updatePctMode()" style="margin-bottom:14px">
          <option value="of">What is X% of Y?</option>
          <option value="is">X is what % of Y?</option>
          <option value="change">% Change from X to Y</option>
          <option value="add">Add X% to Y</option>
          <option value="sub">Subtract X% from Y</option>
        </select></div>
      <div id="pctInputs"><div class="tool-row" style="margin-bottom:14px">
        <div class="tool-col"><label class="tool-label" id="pctL1">Percentage (%)</label><input type="number" class="tool-input" id="pctA" placeholder="e.g. 15"></div>
        <div class="tool-col"><label class="tool-label" id="pctL2">Of Value</label><input type="number" class="tool-input" id="pctB" placeholder="e.g. 200"></div>
      </div></div>
      <div class="btn-group"><button class="btn btn-primary" onclick="doPct()">% Calculate</button></div>
      <div id="pctOut"></div>`;
  });
}
async function doPct() {
  const a=document.getElementById('pctA').value,b=document.getElementById('pctB').value;
  if(!a||!b){toast('Please fill in both values.','warn');return;}
  const btn=document.querySelector('#toolContent .btn-primary');btn.disabled=true;if(!btn.dataset.origHtml)btn.dataset.origHtml=btn.innerHTML;btn.textContent='⏳ Calculating…';
  try{const d=await apiFetch('/api/tools/percentage-calculator','POST',{a:parseFloat(a),b:parseFloat(b),mode:document.getElementById('pctMode').value});
  document.getElementById('pctOut').innerHTML=`<div class="result-highlight" style="margin-top:14px"><div class="result-value" style="font-size:32px;font-weight:700;color:var(--accent)">${d.result}</div><div style="font-size:13px;color:var(--text-muted);margin-top:4px">${d.explanation||''}</div></div>`;
  toast('Done!','success');}catch(e){toast(e.message||'Error','error');}
  finally{btn.disabled=false;btn.innerHTML=btn.dataset.origHtml||btn.innerHTML;delete btn.dataset.origHtml;}
}
function updatePctMode(){const m=document.getElementById('pctMode').value;const labs={of:['Percentage (%)','Of Value'],is:['Value X','Total Y'],change:['From Value','To Value'],add:['Percentage (%)','Base Value'],sub:['Percentage (%)','Base Value']};const[l1,l2]=labs[m]||['Value A','Value B'];document.getElementById('pctL1').textContent=l1;document.getElementById('pctL2').textContent=l2;}

function renderBMI(tool) {
  buildToolPage(tool, () => {
    document.getElementById('toolContent').innerHTML = `
      <div class="tool-row" style="margin-bottom:14px">
        <div class="tool-col"><label class="tool-label">System</label>
          <select class="tool-select" id="bmiSys" onchange="updateBMILabels()"><option value="metric">Metric (kg/cm)</option><option value="imperial">Imperial (lbs/in)</option></select></div>
      </div>
      <div class="tool-row" style="margin-bottom:14px">
        <div class="tool-col"><label class="tool-label" id="bmiWL">Weight (kg)</label><input type="number" class="tool-input" id="bmiW" placeholder="e.g. 70"></div>
        <div class="tool-col"><label class="tool-label" id="bmiHL">Height (cm)</label><input type="number" class="tool-input" id="bmiH" placeholder="e.g. 175"></div>
      </div>
      <div class="btn-group"><button class="btn btn-primary" onclick="doBMI()">⚕️ Calculate BMI</button></div>
      <div id="bmiOut"></div>`;
  });
}
function updateBMILabels() {
  const sys = document.getElementById('bmiSys')?.value;
  const wl = document.getElementById('bmiWL');
  const hl = document.getElementById('bmiHL');
  const wIn = document.getElementById('bmiW');
  const hIn = document.getElementById('bmiH');
  if (!wl || !hl) return;
  if (sys === 'imperial') {
    wl.textContent = 'Weight (lbs)'; hl.textContent = 'Height (inches)';
    wIn.placeholder = 'e.g. 154'; hIn.placeholder = 'e.g. 69';
  } else {
    wl.textContent = 'Weight (kg)'; hl.textContent = 'Height (cm)';
    wIn.placeholder = 'e.g. 70'; hIn.placeholder = 'e.g. 175';
  }
}
async function doBMI() {
  const w=document.getElementById('bmiW').value,h=document.getElementById('bmiH').value,sys=document.getElementById('bmiSys').value;
  if(!w||!h){toast('Please enter weight and height.','warn');return;}
  const btn=document.querySelector('#toolContent .btn-primary');btn.disabled=true;if(!btn.dataset.origHtml)btn.dataset.origHtml=btn.innerHTML;btn.textContent='⏳ Calculating…';
  try{const d=await apiFetch('/api/tools/bmi-calculator','POST',{weight:parseFloat(w),height:parseFloat(h),system:sys});
  const color=d.category==='Normal weight'?'var(--success)':d.category==='Underweight'?'var(--accent)':'var(--warn)';
  document.getElementById('bmiOut').innerHTML=`<div class="stat-grid" style="margin-top:14px"><div class="stat-card"><div class="stat-value" style="color:${color}">${d.bmi}</div><div class="stat-label">BMI</div></div><div class="stat-card"><div class="stat-value" style="font-size:14px;color:${color}">${d.category}</div><div class="stat-label">Category</div></div></div><div class="info-box" style="margin-top:12px">Healthy range: 18.5 – 24.9 BMI</div>`;
  toast('Calculated!','success');}catch(e){toast(e.message||'Error','error');}
  finally{btn.disabled=false;btn.innerHTML=btn.dataset.origHtml||btn.innerHTML;delete btn.dataset.origHtml;}
}

function renderTimezone(tool) {
  buildToolPage(tool, () => {
    const TZ=['UTC','America/New_York','America/Los_Angeles','America/Chicago','America/Denver','America/Toronto','Europe/London','Europe/Paris','Europe/Berlin','Europe/Madrid','Europe/Rome','Europe/Amsterdam','Europe/Stockholm','Europe/Moscow','Asia/Dubai','Asia/Kolkata','Asia/Singapore','Asia/Tokyo','Asia/Shanghai','Asia/Seoul','Asia/Bangkok','Australia/Sydney','Australia/Melbourne','Pacific/Auckland'];
    document.getElementById('toolContent').innerHTML = `
      <div class="tool-row" style="margin-bottom:14px">
        <div class="tool-col"><label class="tool-label">Date & Time</label><input type="datetime-local" class="tool-input" id="tzTime"></div>
        <div class="tool-col"><label class="tool-label">From Timezone</label><select class="tool-select" id="tzFrom">${TZ.map(t=>`<option value="${t}">${t}</option>`).join('')}</select></div>
        <div class="tool-col"><label class="tool-label">To Timezone</label><select class="tool-select" id="tzTo">${TZ.map((t,i)=>`<option value="${t}"${i===6?' selected':''}>${t}</option>`).join('')}</select></div>
      </div>
      <div class="btn-group"><button class="btn btn-primary" onclick="doTZ()">🌍 Convert</button></div>
      <div id="tzOut"></div>`;
    document.getElementById('tzTime').value=new Date().toISOString().slice(0,16);
  });
}
async function doTZ() {
  const t=document.getElementById('tzTime').value;
  if(!t){toast('Please select a date and time.','warn');return;}
  const btn=document.querySelector('#toolContent .btn-primary');btn.disabled=true;if(!btn.dataset.origHtml)btn.dataset.origHtml=btn.innerHTML;btn.textContent='⏳ Converting…';
  try{const d=await apiFetch('/api/tools/timezone-converter','POST',{datetime:t,from:document.getElementById('tzFrom').value,to:document.getElementById('tzTo').value});
  document.getElementById('tzOut').innerHTML=`<div class="result-highlight" style="margin-top:14px"><div style="font-size:13px;color:var(--text-muted)">${d.from} time:</div><div class="result-value" style="font-size:20px;font-weight:700;color:var(--accent)">${d.convertedTime||d.result}</div>${d.offset?`<div style="font-size:12px;color:var(--text-muted);margin-top:4px">UTC offset: ${d.offset}</div>`:''}</div>`;
  toast('Converted!','success');}catch(e){toast(e.message||'Error','error');}
  finally{btn.disabled=false;btn.innerHTML=btn.dataset.origHtml||btn.innerHTML;delete btn.dataset.origHtml;}
}

function renderUUID(tool) {
  buildToolPage(tool, () => {
    document.getElementById('toolContent').innerHTML = `
      <div class="tool-row" style="margin-bottom:14px">
        <div class="tool-col"><label class="tool-label">Type</label>
          <select class="tool-select" id="uuidType"><option value="v4">UUID v4</option><option value="nanoid">NanoID</option><option value="short">Short ID</option></select></div>
        <div class="tool-col"><label class="tool-label">Count</label>
          <input type="number" class="tool-input" id="uuidCount" value="10" min="1" max="100" style="width:80px"></div>
      </div>
      <div class="btn-group"><button class="btn btn-primary" onclick="doUUID()">🆔 Generate</button></div>
      <div id="uuidOut"></div>`;
  });
}
async function doUUID() {
  const btn=document.querySelector('#toolContent .btn-primary');btn.disabled=true;if(!btn.dataset.origHtml)btn.dataset.origHtml=btn.innerHTML;btn.textContent='⏳ Generating…';
  try{const d=await apiFetch('/api/tools/uuid-generator','POST',{type:document.getElementById('uuidType').value,count:parseInt(document.getElementById('uuidCount').value)});
  document.getElementById('uuidOut').innerHTML=`<div style="margin-top:12px">`+(d.ids||[]).map(id=>`<div style="display:flex;gap:8px;align-items:center;margin-bottom:6px"><div class="code-block" style="flex:1;padding:8px 12px;font-size:13px">${id}</div><button class="btn-icon-sm" onclick="copyText('${id}')">${ICONS.copy}</button></div>`).join('')+`</div>`;
  toast(`${(d.ids||[]).length} IDs generated!`,'success');}catch(e){toast(e.message||'Error','error');}
  finally{btn.disabled=false;btn.innerHTML=btn.dataset.origHtml||btn.innerHTML;delete btn.dataset.origHtml;}
}

function renderNum2Words(tool) {
  buildToolPage(tool, () => {
    document.getElementById('toolContent').innerHTML = `
      <div class="tool-section"><label class="tool-label">Number to convert</label>
        <input type="number" class="tool-input" id="n2wIn" placeholder="e.g. 1234567"></div>
      <div class="btn-group"><button class="btn btn-primary" onclick="doN2W()">🔢 Convert</button></div>
      <div class="output-label">In Words</div>
      <div class="output-box" id="n2wOut"><span class="output-placeholder">Words will appear here…</span></div>
      <div class="output-actions">${copyBtn('n2wOut')}</div>`;
  });
}
async function doN2W(){const n=document.getElementById('n2wIn').value.trim();if(!n){toast('Please enter a number.','warn');return;}await runTool('number-to-words',{number:parseFloat(n)},'n2wOut',d=>d.result||d.words||'');}

function renderRandomPicker(tool) {
  buildToolPage(tool, () => {
    document.getElementById('toolContent').innerHTML = `
      <div class="tool-section"><label class="tool-label">Mode</label>
        <select class="tool-select" id="rpMode" onchange="updateRPMode()" style="margin-bottom:14px"><option value="list">Pick from list</option><option value="dice">Roll dice</option><option value="coin">Flip coin</option><option value="number">Random number</option></select></div>
      <div id="rpInputs"></div>
      <div class="btn-group"><button class="btn btn-primary" onclick="doRP()">🎲 Randomize</button></div>
      <div id="rpOut"></div>`;
    updateRPMode();
  });
}
function updateRPMode(){const m=document.getElementById('rpMode').value;const html={list:`<div class="tool-section"><label class="tool-label">Items (one per line)</label><textarea class="tool-textarea" id="rpList" rows="6" placeholder="Apple\nBanana\nCherry\n…"></textarea></div>`,dice:`<div class="tool-row" style="margin-bottom:14px"><div class="tool-col"><label class="tool-label">Dice type</label><select class="tool-select" id="rpDice"><option value="6">d6</option><option value="4">d4</option><option value="8">d8</option><option value="10">d10</option><option value="12">d12</option><option value="20">d20</option><option value="100">d100</option></select></div><div class="tool-col"><label class="tool-label">How many?</label><input type="number" class="tool-input" id="rpDiceN" value="1" min="1" max="10" style="width:80px"></div></div>`,coin:`<div class="info-box">Click Randomize to flip the coin!</div>`,number:`<div class="tool-row" style="margin-bottom:14px"><div class="tool-col"><label class="tool-label">Min</label><input type="number" class="tool-input" id="rpMin" value="1"></div><div class="tool-col"><label class="tool-label">Max</label><input type="number" class="tool-input" id="rpMax" value="100"></div><div class="tool-col"><label class="tool-label">Count</label><input type="number" class="tool-input" id="rpNumN" value="1" min="1" max="20" style="width:80px"></div></div>`}[m]||'';document.getElementById('rpInputs').innerHTML=html;}
async function doRP() {
  const m=document.getElementById('rpMode').value;
  let body={mode:m};
  if(m==='list'){const items=(document.getElementById('rpList')?.value||'').split('\n').filter(x=>x.trim());if(!items.length){toast('Please add items.','warn');return;}body.items=items;}
  else if(m==='dice'){body.sides=parseInt(document.getElementById('rpDice')?.value||6);body.count=parseInt(document.getElementById('rpDiceN')?.value||1);}
  else if(m==='number'){body.min=parseInt(document.getElementById('rpMin')?.value||1);body.max=parseInt(document.getElementById('rpMax')?.value||100);body.count=parseInt(document.getElementById('rpNumN')?.value||1);}
  const btn=document.querySelector('#toolContent .btn-primary');btn.disabled=true;if(!btn.dataset.origHtml)btn.dataset.origHtml=btn.innerHTML;btn.textContent='⏳ Randomizing…';
  try{const d=await apiFetch('/api/tools/random-picker','POST',body);
  const r=d.result||d.results||d.picked||'';
  document.getElementById('rpOut').innerHTML=`<div class="result-highlight" style="margin-top:14px;text-align:center"><div class="result-value" style="font-size:36px;font-weight:800;color:var(--accent)">${Array.isArray(r)?r.join(', '):r}</div></div>`;
  toast('Randomized!','success');}catch(e){toast(e.message||'Error','error');}
  finally{btn.disabled=false;btn.innerHTML=btn.dataset.origHtml||btn.innerHTML;delete btn.dataset.origHtml;}
}

function renderSlugGen(tool) {
  buildToolPage(tool, () => {
    document.getElementById('toolContent').innerHTML = `
      <div class="tool-section"><label class="tool-label">Title or phrase</label>
        <input class="tool-input" id="slugIn" placeholder="My Awesome Blog Post Title" oninput="liveSlug()"></div>
      <div class="tool-row" style="margin-bottom:14px">
        <div class="tool-col"><label class="tool-label">Separator</label>
          <select class="tool-select" id="slugSep" onchange="liveSlug()"><option value="-">Hyphen (-)</option><option value="_">Underscore (_)</option><option value=".">Dot (.)</option></select></div>
      </div>
      <div class="output-label">Slug</div>
      <div class="output-box" id="slugOut"><span class="output-placeholder">Slug will appear here…</span></div>
      <div class="output-actions">${copyBtn('slugOut')}</div>`;
  });
}
async function liveSlug(){const text=document.getElementById('slugIn').value.trim();if(!text){document.getElementById('slugOut').innerHTML='<span class="output-placeholder">Slug will appear here…</span>';return;}try{const d=await apiFetch('/api/tools/slug-generator','POST',{text,separator:document.getElementById('slugSep').value});document.getElementById('slugOut').textContent=d.slug||'';}catch(e){}}

function renderMorse(tool) {
  buildToolPage(tool, () => {
    document.getElementById('toolContent').innerHTML = `
      <div class="tool-section"><label class="tool-label">Input</label>
        <textarea class="tool-textarea" id="morseIn" rows="5" placeholder="Text or Morse code (use / between words)…"></textarea></div>
      <div class="btn-group">
        <button class="btn btn-primary" onclick="doMorse('toMorse')">Text → Morse</button>
        <button class="btn btn-secondary" onclick="doMorse('toText')">Morse → Text</button>
      </div>
      <div class="output-label">Result</div>
      <div class="output-box" id="morseOut" style="font-family:monospace;letter-spacing:.08em"><span class="output-placeholder">Result will appear here…</span></div>
      <div class="output-actions">${copyBtn('morseOut')}</div>`;
  });
}
async function doMorse(mode){const t=document.getElementById('morseIn').value.trim();if(!t){toast('Please enter text.','warn');return;}await runTool('morse-code',{text:t,mode},'morseOut',d=>d.result||'');}

function renderCSV2JSON(tool) {
  buildToolPage(tool, () => {
    document.getElementById('toolContent').innerHTML = `
      <div class="tool-section"><label class="tool-label">CSV Data</label>
        <textarea class="tool-textarea" id="csvIn" rows="8" placeholder="name,age,city\nAlice,30,New York\nBob,25,London" style="font-family:monospace;font-size:13px"></textarea></div>
      <div class="tool-row" style="margin-bottom:14px">
        <div class="tool-col"><label class="tool-label">Delimiter</label>
          <select class="tool-select" id="csvDel"><option value=",">Comma (,)</option><option value=";">Semicolon (;)</option><option value="tab">Tab</option><option value="|">Pipe (|)</option></select></div>
        <label class="checkbox-row" style="align-self:flex-end;padding-bottom:8px"><input type="checkbox" id="csvHeader" checked><span class="checkbox-label">First row is header</span></label>
      </div>
      <div class="btn-group"><button class="btn btn-primary" onclick="doCSV2JSON()">📂 Convert to JSON</button></div>
      <div class="output-label">JSON Output</div>
      <div class="code-block" id="csvOut" style="min-height:80px;white-space:pre;overflow-x:auto;max-height:400px">JSON will appear here…</div>
      <div class="output-actions"><button class="btn btn-secondary btn-sm" onclick="copyText(document.getElementById('csvOut').innerText,'JSON copied')">${ICONS.copy} Copy</button></div>`;
  });
}
async function doCSV2JSON() {
  const text=document.getElementById('csvIn').value.trim();
  if(!text){toast('Please enter CSV data.','warn');return;}
  const btn=document.querySelector('#toolContent .btn-primary');btn.disabled=true;if(!btn.dataset.origHtml)btn.dataset.origHtml=btn.innerHTML;btn.textContent='⏳ Converting…';
  try{const d=await apiFetch('/api/tools/csv-to-json','POST',{text,delimiter:document.getElementById('csvDel').value,hasHeader:document.getElementById('csvHeader').checked});document.getElementById('csvOut').textContent=d.result||'';toast(`Converted ${d.rows} rows, ${d.columns} columns!`,'success');}
  catch(e){toast(e.message||'Error','error');}
  finally{btn.disabled=false;btn.innerHTML=btn.dataset.origHtml||btn.innerHTML;delete btn.dataset.origHtml;}
}

function renderPomodoro(tool) {
  let interval=null,timeLeft=25*60,phase='Focus',sessions=0;
  const PHASES={Focus:{time:25*60,next:'Short Break'},Short:{time:5*60,next:'Focus'}};
  buildToolPage(tool, () => {
    document.getElementById('toolContent').innerHTML = `
      <div class="timer-phase" id="pomPhase">🍅 Focus Session</div>
      <div class="timer-display" id="pomTime">25:00</div>
      <div class="timer-controls">
        <button class="btn btn-primary btn-lg" id="pomBtn" onclick="pomToggle()">▶ Start</button>
        <button class="btn btn-secondary" onclick="pomReset()">↺ Reset</button>
      </div>
      <div style="text-align:center;margin-top:16px">
        <div class="tool-row" style="justify-content:center;gap:16px;flex-wrap:wrap">
          <div><label class="tool-label">Focus (min)</label><input type="number" class="tool-input" id="pomFocus" value="25" min="1" max="90" style="width:80px"></div>
          <div><label class="tool-label">Break (min)</label><input type="number" class="tool-input" id="pomBreak" value="5" min="1" max="30" style="width:80px"></div>
        </div>
        <div style="margin-top:12px;font-size:14px;color:var(--text-muted)">Sessions completed: <strong id="pomSessions">0</strong></div>
      </div>`;
    function fmt(s){const m=Math.floor(s/60),sc=s%60;return`${String(m).padStart(2,'0')}:${String(sc).padStart(2,'0')}`;}
    window._pomFmt=fmt;
    window._pomPhase=phase; window._pomSess=sessions; window._pomLeft=timeLeft; window._pomInterval=null;
  });
}
function pomToggle(){
  const btn=document.getElementById('pomBtn');
  if(window._pomInterval){clearInterval(window._pomInterval);window._pomInterval=null;btn.textContent='▶ Resume';return;}
  btn.textContent='⏸ Pause';
  window._pomInterval=setInterval(()=>{
    window._pomLeft--;
    document.getElementById('pomTime').textContent=window._pomFmt(window._pomLeft);
    if(window._pomLeft<=0){
      clearInterval(window._pomInterval);window._pomInterval=null;
      const nextPhase=window._pomPhase==='Focus'?'Short':'Focus';
      const nextTime=(nextPhase==='Focus'?parseInt(document.getElementById('pomFocus').value||25):parseInt(document.getElementById('pomBreak').value||5))*60;
      if(nextPhase==='Focus'){window._pomSess++;document.getElementById('pomSessions').textContent=window._pomSess;}
      window._pomPhase=nextPhase;window._pomLeft=nextTime;
      document.getElementById('pomPhase').textContent=nextPhase==='Focus'?'🍅 Focus Session':'☕ Break Time';
      document.getElementById('pomTime').textContent=window._pomFmt(nextTime);
      document.getElementById('pomBtn').textContent='▶ Start';
      toast(nextPhase==='Focus'?'Break over! Time to focus 🍅':'Focus complete! Take a break ☕','success',4000);
      if(Notification.permission==='granted')new Notification('ToolHub Pomodoro',{body:nextPhase==='Focus'?'Time to focus!':'Time for a break!'});
    }
  },1000);
  if(Notification.permission==='default')Notification.requestPermission();
}
function pomReset(){clearInterval(window._pomInterval);window._pomInterval=null;window._pomLeft=parseInt(document.getElementById('pomFocus').value||25)*60;window._pomPhase='Focus';document.getElementById('pomTime').textContent=window._pomFmt(window._pomLeft);document.getElementById('pomPhase').textContent='🍅 Focus Session';document.getElementById('pomBtn').textContent='▶ Start';}

function renderTypingTest(tool) {
  const TEXTS=['The quick brown fox jumps over the lazy dog. Pack my box with five dozen liquor jugs. How vexingly quick daft zebras jump!','Sphinx of black quartz, judge my vow. The five boxing wizards jump quickly. A mad boxer shot a quick, gloved jab to the jaw of his dizzy opponent.','Bright vixens jump; dozy fowl quack. Jumpy halfbacks vow to fix pelvic zones quickly. Two blowzy night-frumps vex Jack Q.','Two driven jocks help fax my big quiz. Five quacking zephyrs jolt my wax bed. The jay, pig, fox, zebra and my wolves quack.'];
  let tText='',tIdx=0,tStart=null,tDone=false;
  buildToolPage(tool, () => {
    document.getElementById('toolContent').innerHTML = `
      <div id="typingText" class="typing-text" style="user-select:none;line-height:2"></div>
      <input type="text" id="typingInput" class="tool-input" placeholder="Start typing to begin…" oninput="handleTyping()" style="font-size:16px;margin-bottom:14px" autocomplete="off" spellcheck="false">
      <div class="stat-grid" id="typingStats">
        <div class="stat-card"><div class="stat-value" id="typWPM">0</div><div class="stat-label">WPM</div></div>
        <div class="stat-card"><div class="stat-value" id="typAcc">100%</div><div class="stat-label">Accuracy</div></div>
        <div class="stat-card"><div class="stat-value" id="typTime">0s</div><div class="stat-label">Time</div></div>
        <div class="stat-card"><div class="stat-value" id="typChars">0</div><div class="stat-label">Chars Typed</div></div>
      </div>
      <div class="btn-group" style="margin-top:14px">
        <button class="btn btn-secondary" onclick="resetTyping()">↺ New Text</button>
      </div>`;
    tText=TEXTS[Math.floor(Math.random()*TEXTS.length)]; tIdx=0; tStart=null; tDone=false;
    window._tText=tText; window._tIdx=0; window._tStart=null; window._tDone=false;
    renderTypingChars();
  });
}
function renderTypingChars(){const t=window._tText||'';document.getElementById('typingText').innerHTML=t.split('').map((c,i)=>`<span class="typing-char" id="tc${i}">${c==' '?'&nbsp;':c}</span>`).join('');}
function handleTyping(){
  if(window._tDone)return;
  const inp=document.getElementById('typingInput');const v=inp.value;
  if(!window._tStart&&v.length>0)window._tStart=Date.now();
  window._tIdx=v.length;
  let errors=0;
  v.split('').forEach((c,i)=>{const el=document.getElementById(`tc${i}`);if(el){if(c===window._tText[i]){el.className='typing-char correct';}else{el.className='typing-char wrong';errors++;}}});
  for(let i=v.length;i<window._tText.length;i++){const el=document.getElementById(`tc${i}`);if(el)el.className=i===v.length?'typing-char current':'typing-char';}
  const elapsed=(Date.now()-window._tStart)/1000/60||0.001;
  const wpm=Math.round((v.length/5)/elapsed);
  const acc=v.length?Math.round((v.length-errors)/v.length*100):100;
  document.getElementById('typWPM').textContent=wpm;
  document.getElementById('typAcc').textContent=acc+'%';
  document.getElementById('typTime').textContent=Math.round((Date.now()-window._tStart)/1000)+'s';
  document.getElementById('typChars').textContent=v.length;
  if(v===window._tText){window._tDone=true;inp.disabled=true;toast(`🎉 Done! ${wpm} WPM, ${acc}% accuracy!`,'success',5000);}
}
function resetTyping(){const TEXTS=['The quick brown fox jumps over the lazy dog. Pack my box with five dozen liquor jugs. How vexingly quick daft zebras jump!','Sphinx of black quartz, judge my vow. The five boxing wizards jump quickly. A mad boxer shot a quick, gloved jab to the jaw.','Bright vixens jump; dozy fowl quack. Jumpy halfbacks vow to fix pelvic zones quickly.','Two driven jocks help fax my big quiz. Five quacking zephyrs jolt my wax bed.'];window._tText=TEXTS[Math.floor(Math.random()*TEXTS.length)];window._tIdx=0;window._tStart=null;window._tDone=false;const inp=document.getElementById('typingInput');if(inp){inp.value='';inp.disabled=false;inp.focus();}renderTypingChars();['typWPM','typAcc','typTime','typChars'].forEach(id=>{const el=document.getElementById(id);if(el)el.textContent=id==='typAcc'?'100%':'0';if(id==='typTime'&&el)el.textContent='0s';});}

// ── Dashboard & Admin (delegated to dashboard.js) ──────────────────────────────
function renderDashboard() {
  document.getElementById('app').innerHTML = `<div class="page-loading"><div class="spinner"></div><p>Loading dashboard…</p></div>`;
  if (typeof renderDashboardContent === 'function') renderDashboardContent();
  else {
    apiFetch('/api/dashboard').then(d => {
      document.getElementById('app').innerHTML = `
        <div class="tool-page">
          <button class="tool-page-back" onclick="navigate('home')">${ICONS.back} Back</button>
          <h1 style="font-size:22px;font-weight:700;margin-bottom:20px">📊 Dashboard</h1>
          <div class="stat-grid">
            <div class="stat-card"><div class="stat-value">${d.stats?.totalUses||0}</div><div class="stat-label">Total Uses</div></div>
            <div class="stat-card"><div class="stat-value">${d.stats?.todayUses||0}</div><div class="stat-label">Today</div></div>
            <div class="stat-card"><div class="stat-value">${d.stats?.dailyLimit||10}</div><div class="stat-label">Daily Limit</div></div>
            <div class="stat-card"><div class="stat-value">${d.user?.role==='premium'?'👑 Premium':'Free'}</div><div class="stat-label">Plan</div></div>
          </div>
          ${d.user?.role!=='premium'?`<div style="margin-top:20px"><button class="btn btn-primary btn-lg" onclick="showPremiumModal()">👑 Upgrade to Premium</button></div>`:''}
          <div class="section-title" style="margin-top:24px">Recent Activity</div>
          ${(d.history||[]).map(h=>`<div style="display:flex;gap:12px;align-items:center;padding:10px;border-bottom:1px solid var(--border)"><span style="font-size:18px">🔧</span><div><div style="font-size:14px;font-weight:600">${h.tool_name}</div><div style="font-size:12px;color:var(--text-muted)">${new Date(h.created_at).toLocaleString()}</div></div></div>`).join('')||'<div class="info-box">No activity yet. Start using tools!</div>'}
        </div>`;
    }).catch(() => {
      document.getElementById('app').innerHTML = `<div class="tool-page"><button class="tool-page-back" onclick="navigate('home')">${ICONS.back} Back</button><div class="info-box">Please <span class="modal-link" onclick="showLogin()">sign in</span> to view your dashboard.</div></div>`;
    });
  }
}
