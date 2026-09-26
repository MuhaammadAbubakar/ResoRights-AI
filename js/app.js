// ============================================================
// ResoRights — App Logic v2
// ============================================================

// ═══════════════════════════════════════════════════════════
// WEBHOOK CONFIGURATION
// Encoded endpoint to prevent public scraping on GitHub.
// ═══════════════════════════════════════════════════════════
const _ENCODED_HOOK = 'aHR0cHM6Ly9hYmF1dG9tYXRpb24uZHBkbnMub3JnL3dlYmhvb2svcmVzb3JpZ2h0cy9pbnRha2U=';
const DEFAULT_WEBHOOK_URL = (function() {
  try { return atob(_ENCODED_HOOK); } catch (e) { return ''; }
})();
let storedWebhook = localStorage.getItem('rr_webhook_url');
if (!storedWebhook || storedWebhook.includes('example.com') || storedWebhook.includes('webhook.site')) {
  storedWebhook = DEFAULT_WEBHOOK_URL;
  localStorage.setItem('rr_webhook_url', DEFAULT_WEBHOOK_URL);
}
let WEBHOOK_URL   = storedWebhook;
let WEBHOOK_FIELD = localStorage.getItem('rr_webhook_field') || 'response';

// ── Helpers ─────────────────────────────────────────────────
const sleep = ms => new Promise(r => setTimeout(r, ms));
const el    = id => document.getElementById(id);

// Generate a unique conversation ID (UUID v4 style)
function generateConversationId() {
  return 'conv_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 10);
}

// ── Demo Seed Data ───────────────────────────────────────────
const SEED_CASES = [
  {
    id: 'RR-2024-0041',
    conversationId: 'conv_demo_housing_001',
    category: 'Housing',
    badgeClass: 'badge-housing',
    created: 'Aug 5, 2024',
    updated: 'Aug 12, 2024',
    messages: [
      { role: 'assistant', text: 'Hello. I\'m here to help you understand your situation. Please describe what happened, and I\'ll explain what California law says and what options may be available to you.' },
      { role: 'user',      text: 'My landlord hasn\'t returned my security deposit and it\'s been over 3 weeks since I moved out.' },
      { role: 'assistant', text: 'Under California Civil Code § 1950.5, your landlord is required to return the security deposit — along with an itemized written statement of any deductions — within 21 calendar days of the date you vacated.\n\nIf that deadline has passed without any communication, your landlord may have forfeited the right to make any deductions. In that situation, California law allows you to sue in Small Claims Court for the full deposit amount, plus up to twice the deposit as a penalty if the court finds the landlord acted in bad faith.\n\nA few questions that will help me give you more specific guidance:\n· Do you have documentation of your move-out date?\n· Was there a move-in checklist or walk-through report?\n· Have you sent the landlord a written demand?' }
    ]
  },
  {
    id: 'RR-2024-0038',
    conversationId: 'conv_demo_credit_002',
    category: 'Credit & Debt',
    badgeClass: 'badge-credit',
    created: 'Jul 22, 2024',
    updated: 'Aug 1, 2024',
    messages: [
      { role: 'assistant', text: 'Hello. I\'m here to help you understand your situation. Please describe what happened.' },
      { role: 'user',      text: 'A debt collector keeps calling my job and threatened to have me arrested.' },
      { role: 'assistant', text: 'What you\'ve described involves conduct that is prohibited under two separate laws.\n\nThe federal Fair Debt Collection Practices Act (15 U.S.C. § 1692) and California\'s Rosenthal Fair Debt Collection Practices Act (Civil Code § 1788) both prohibit debt collectors from:\n\n· Contacting your employer (except once to confirm your address)\n· Threatening arrest or criminal prosecution for a debt — this is illegal\n· Calling before 8 AM or after 9 PM\n\nYou can send a written cease-communication letter; after that, the collector may only contact you to confirm they will stop or to notify you of specific legal action. Under the FDCPA, you may sue for up to $1,000 in statutory damages plus attorney\'s fees.' }
    ]
  }
];

// ── App State ────────────────────────────────────────────────
let cases           = [...SEED_CASES];
let activeCaseIndex = null;
let isThinking      = false;
let pendingCategory = null;

// ── DOM refs ─────────────────────────────────────────────────
const landingPage    = el('landing-page');
const chatPage       = el('chat-page');
const conversation   = el('conversation');
const chatTextarea   = el('chat-textarea');
const sendBtn        = el('send-btn');
const suggestionsEl  = el('suggestions');
const caseList       = el('case-list');
const sidebar        = el('sidebar');
const sidebarOverlay = el('sidebar-overlay');
const navToggle      = el('nav-toggle');
const navLinks       = el('nav-links');
const curtain        = el('page-curtain');

// ════════════════════════════════════════════════════════════
// PAGE TRANSITION — White curtain wipe (seamless with hero bg)
// ════════════════════════════════════════════════════════════
async function openChatPage(skipNewCase = false) {
  curtain.style.pointerEvents = 'all';

  // Curtain RISES from bottom (covers landing page)
  curtain.style.transition = 'transform 0.38s cubic-bezier(0.76, 0, 0.24, 1)';
  curtain.style.transform  = 'translateY(0%)';

  await sleep(400);

  // Swap pages (hidden behind curtain)
  landingPage.style.display = 'none';
  chatPage.style.display    = 'flex';
  window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  el('nav-start-case').style.display = 'none';

  renderSidebar();
  renderSuggestions();

  if (!skipNewCase) {
    activeCaseIndex = null;
    renderConversation();
  }

  await sleep(40);

  // Curtain FALLS UP revealing chat
  curtain.style.transform = 'translateY(-101%)';

  await sleep(420);

  // Reset curtain
  curtain.style.transition = 'none';
  curtain.style.transform  = 'translateY(101%)';
  curtain.style.pointerEvents = 'none';

  setTimeout(() => chatTextarea?.focus(), 100);
}

async function goToLanding() {
  curtain.style.pointerEvents = 'all';
  curtain.style.transition = 'transform 0.38s cubic-bezier(0.76, 0, 0.24, 1)';
  curtain.style.transform  = 'translateY(0%)';

  await sleep(400);

  chatPage.style.display    = 'none';
  landingPage.style.display = 'block';
  window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  el('nav-start-case').style.display = '';
  navLinks.classList.remove('open');

  await sleep(40);

  curtain.style.transform = 'translateY(101%)';

  await sleep(420);

  curtain.style.transition = 'none';
  curtain.style.pointerEvents = 'none';
}

function startCaseWithCategory(cat) {
  pendingCategory = cat;
  openChatPage(false);
}

// ════════════════════════════════════════════════════════════
// SIDEBAR — shows first user message as preview
// ════════════════════════════════════════════════════════════
function renderSidebar() {
  caseList.innerHTML = '';

  if (cases.length === 0) {
    caseList.innerHTML = '<p style="font-size:13px;color:var(--text-muted);padding:8px 12px;">No conversations yet.</p>';
    return;
  }

  cases.forEach((c, i) => {
    const firstUserMsg = c.messages.find(m => m.role === 'user');
    const preview = firstUserMsg ? firstUserMsg.text : 'New conversation';

    const item = document.createElement('div');
    item.className  = `case-item${activeCaseIndex === i ? ' active' : ''}`;
    item.setAttribute('role', 'button');
    item.setAttribute('tabindex', '0');
    item.setAttribute('aria-label', `Open case: ${preview}`);
    item.innerHTML  = `
      <div class="case-item-header">
        <div class="case-item-preview">${escHtml(preview)}</div>
        <button type="button" class="case-item-del-btn" title="Delete conversation" aria-label="Delete conversation">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M3 6h18"></path>
            <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path>
            <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path>
            <line x1="10" y1="11" x2="10" y2="17"></line>
            <line x1="14" y1="11" x2="14" y2="17"></line>
          </svg>
        </button>
      </div>
      <div class="case-item-meta">
        <span class="badge ${c.badgeClass}">${c.category}</span>
        <span class="case-item-date">${c.updated}</span>
      </div>
    `;

    item.addEventListener('click', (e) => {
      if (e.target.closest('.case-item-del-btn')) return;
      activeCaseIndex = i;
      renderSidebar();
      renderConversation();
      closeSidebarMobile();
    });

    item.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        if (e.target.closest('.case-item-del-btn')) return;
        e.preventDefault();
        activeCaseIndex = i;
        renderSidebar();
        renderConversation();
        closeSidebarMobile();
      }
    });

    const delBtn = item.querySelector('.case-item-del-btn');
    delBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      deleteCase(i);
    });

    caseList.appendChild(item);
  });
}

function deleteCase(index) {
  cases.splice(index, 1);
  if (cases.length === 0) {
    activeCaseIndex = null;
  } else if (activeCaseIndex === index) {
    activeCaseIndex = Math.min(index, cases.length - 1);
  } else if (activeCaseIndex > index) {
    activeCaseIndex--;
  }
  renderSidebar();
  renderConversation();
}

function escHtml(str) {
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// ════════════════════════════════════════════════════════════
// CONVERSATION RENDER
// ════════════════════════════════════════════════════════════
function renderConversation() {
  conversation.innerHTML = '';

  if (activeCaseIndex === null) {
    renderEmptyState();
    return;
  }

  const c = cases[activeCaseIndex];
  c.messages.forEach(msg => appendBubble(msg.role, msg.text, false));
  scrollToBottom();
}

function renderEmptyState() {
  const div = document.createElement('div');
  div.className = 'empty-state page-fade-in';
  div.innerHTML = `
    <div class="empty-icon-wrap">
      <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
      </svg>
    </div>
    <h3>How can ResoRights AI help you today?</h3>
    <p>Describe what happened in your own words — California housing, debt, consumer warranty, or scam issues.</p>
  `;
  conversation.appendChild(div);
}

function appendBubble(role, text, animate = true) {
  const empty = conversation.querySelector('.empty-state');
  if (empty) empty.remove();

  const row = document.createElement('div');
  row.className = `message-row ${role}${animate ? ' page-fade-in' : ''}`;

  const formatted = text
    .split('\n')
    .map(line => line.trim() ? `<p>${escHtml(line)}</p>` : '')
    .join('');

  const senderHtml = role === 'user'
    ? '<span class="message-sender">You</span>'
    : '<span class="message-sender">ResoRights AI <span class="sender-badge-ai">AI</span></span>';

  row.innerHTML = `
    ${senderHtml}
    <div class="bubble bubble-${role}">${formatted}</div>
  `;

  conversation.appendChild(row);
  if (animate) {
    scrollToBottom();
  }
}

function showThinking() {
  const row = document.createElement('div');
  row.className = 'message-row assistant thinking-row page-fade-in';
  row.id = 'thinking-indicator';
  row.innerHTML = `
    <span class="message-sender">ResoRights AI <span class="sender-badge-ai">AI</span></span>
    <div class="bubble bubble-assistant thinking-bubble">
      <span class="thinking-label">Thinking</span>
      <div class="thinking-dots"><span></span><span></span><span></span></div>
    </div>
  `;
  conversation.appendChild(row);
  scrollToBottom();
}

function hideThinking() {
  el('thinking-indicator')?.remove();
}

function scrollToBottom() {
  setTimeout(() => {
    if (conversation) {
      conversation.scrollTo({
        top: conversation.scrollHeight + 100,
        behavior: 'smooth'
      });
    }
  }, 50);
}

// ════════════════════════════════════════════════════════════
// WEBHOOK — send message and get response
// ════════════════════════════════════════════════════════════
async function callWebhook(userMessage, caseData) {
  try {
    const payload = {
      message:         userMessage,
      prompt:          userMessage,
      text:            userMessage,
      conversation_id: caseData.conversationId,
      case_id:         caseData.id,
      category:        caseData.category,
      history:         caseData.messages.map(m => ({ role: m.role, content: m.text }))
    };

    const res = await fetch(WEBHOOK_URL, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(payload)
    });

    if (!res.ok) throw new Error(`Webhook returned status ${res.status}`);

    const contentType = res.headers.get('content-type') || '';
    let reply;

    if (contentType.includes('application/json')) {
      const data = await res.json();
      if (Array.isArray(data)) {
        const item = data[0] || {};
        reply = item[WEBHOOK_FIELD] || item.response || item.output || item.message || item.text || (typeof item === 'string' ? item : JSON.stringify(item));
      } else if (typeof data === 'object' && data !== null) {
        reply = data[WEBHOOK_FIELD] || data.response || data.output || data.message || data.text;
        if (!reply && data.data) {
          reply = typeof data.data === 'string' ? data.data : (data.data[WEBHOOK_FIELD] || data.data.response || data.data.output || data.data.message);
        }
      } else {
        reply = String(data);
      }
    } else {
      reply = await res.text();
    }

    return reply || 'We were unable to process your request at this time. Please try again in a few minutes.';

  } catch (err) {
    console.warn('Service error:', err.message);
    await sleep(800);
    return `We\u2019re sorry \u2014 our service is temporarily unavailable. Please try again in a few minutes. If the issue persists, try refreshing the page.`;
  }
}

// ════════════════════════════════════════════════════════════
// SEND MESSAGE
// ════════════════════════════════════════════════════════════
async function handleSend() {
  const text = chatTextarea.value.trim();
  if (!text || isThinking) return;

  chatTextarea.value = '';
  autoResizeTextarea();

  if (activeCaseIndex === null) {
    const cat = pendingCategory || inferCategory(text);
    pendingCategory = null;

    const newCase = {
      id:             `RR-2024-00${String(40 + cases.length + 1).padStart(2,'0')}`,
      conversationId: generateConversationId(),
      category:       cat,
      badgeClass:     categoryBadge(cat),
      created:        formatDate(new Date()),
      updated:        formatDate(new Date()),
      messages: [
        { role: 'assistant', text: 'Hello. I\'m here to help you understand your situation. Please describe what happened, and I\'ll explain what California law says and what options may be available to you.' }
      ]
    };

    cases.unshift(newCase);
    activeCaseIndex = 0;

    renderConversation();
    renderSidebar();
  }

  cases[activeCaseIndex].messages.push({ role: 'user', text });
  cases[activeCaseIndex].updated = formatDate(new Date());
  appendBubble('user', text, true);
  renderSidebar();

  isThinking = true;
  sendBtn.disabled = true;
  showThinking();

  const reply = await callWebhook(text, cases[activeCaseIndex]);

  hideThinking();
  isThinking = false;
  sendBtn.disabled = chatTextarea.value.trim().length === 0;

  cases[activeCaseIndex].messages.push({ role: 'assistant', text: reply });
  cases[activeCaseIndex].updated = formatDate(new Date());
  appendBubble('assistant', reply, true);
  renderSidebar();
}

// ════════════════════════════════════════════════════════════
// SUGGESTIONS
// ════════════════════════════════════════════════════════════
const ALL_SUGGESTIONS = [
  'My landlord kept my security deposit',
  'I received an eviction notice',
  'A debt collector is threatening me',
  'My credit report has an error',
  'I never received a product I paid for',
  'Someone is impersonating my bank',
  'A company won\'t give me a refund',
  'I was charged for a cancelled service',
];

function renderSuggestions() {
  suggestionsEl.innerHTML = '';
  const picks = [...ALL_SUGGESTIONS].sort(() => Math.random() - 0.5).slice(0, 3);
  picks.forEach(txt => {
    const chip = document.createElement('button');
    chip.className = 'suggestion-chip';
    chip.setAttribute('role', 'listitem');
    chip.textContent = txt;
    chip.addEventListener('click', () => {
      chatTextarea.value = txt;
      chatTextarea.dispatchEvent(new Event('input'));
      autoResizeTextarea();
      chatTextarea.focus();
    });
    suggestionsEl.appendChild(chip);
  });
}

// ════════════════════════════════════════════════════════════
// SETTINGS MODAL
// ════════════════════════════════════════════════════════════
function openSettings() {
  el('webhook-url').value    = WEBHOOK_URL;
  el('response-field').value = WEBHOOK_FIELD;
  el('settings-modal').classList.add('open');
}

function closeSettings() {
  el('settings-modal').classList.remove('open');
}

function saveSettings() {
  WEBHOOK_URL   = el('webhook-url').value.trim() || DEFAULT_WEBHOOK_URL;
  WEBHOOK_FIELD = el('response-field').value.trim() || 'response';
  localStorage.setItem('rr_webhook_url',   WEBHOOK_URL);
  localStorage.setItem('rr_webhook_field', WEBHOOK_FIELD);
  closeSettings();
  showToast('Settings saved.');
}

function showToast(msg) {
  let toast = el('rr-toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'rr-toast';
    toast.style.cssText = `
      position:fixed;bottom:24px;left:50%;transform:translateX(-50%);
      background:var(--accent);color:#fff;
      padding:10px 20px;border-radius:var(--r-pill);
      font-size:13px;font-family:var(--sans);
      box-shadow:0 4px 16px rgba(0,0,0,0.18);
      z-index:99999;transition:opacity 0.3s ease;
      white-space:nowrap;
    `;
    document.body.appendChild(toast);
  }
  toast.textContent = msg;
  toast.style.opacity = '1';
  clearTimeout(toast._timer);
  toast._timer = setTimeout(() => { toast.style.opacity = '0'; }, 2800);
}

// ════════════════════════════════════════════════════════════
// HELPERS
// ════════════════════════════════════════════════════════════
function inferCategory(text) {
  const t = text.toLowerCase();
  if (/deposit|eviction|landlord|rent|habitab|lease|lockout|tenant/.test(t)) return 'Housing';
  if (/debt|collector|credit.*report|owe|collection|credit.*card/.test(t))   return 'Credit & Debt';
  if (/scam|impersonat|fraud|fake|phishing|irs|government.*call/.test(t))    return 'Scams & Fraud';
  return 'Consumer';
}

function categoryBadge(cat) {
  return { 'Housing': 'badge-housing', 'Credit & Debt': 'badge-credit', 'Consumer': 'badge-consumer', 'Scams & Fraud': 'badge-scam' }[cat] || 'badge-consumer';
}

function formatDate(d) {
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function autoResizeTextarea() {
  if (!chatTextarea) return;
  chatTextarea.style.height = 'auto';
  chatTextarea.style.height = Math.min(chatTextarea.scrollHeight, 160) + 'px';
}

// ════════════════════════════════════════════════════════════
// MOBILE SIDEBAR
// ════════════════════════════════════════════════════════════
function openSidebarMobile() {
  sidebar.classList.add('open');
  sidebarOverlay.classList.add('visible');
  document.body.style.overflow = 'hidden';
}

function closeSidebarMobile() {
  sidebar.classList.remove('open');
  sidebarOverlay.classList.remove('visible');
  document.body.style.overflow = '';
}

// ════════════════════════════════════════════════════════════
// EVENT LISTENERS
// ════════════════════════════════════════════════════════════

el('hero-start-btn')?.addEventListener('click',  () => openChatPage());
el('hero-start-btn-2')?.addEventListener('click',() => openChatPage());
el('nav-start-case')?.addEventListener('click',  () => openChatPage());
el('footer-start-case')?.addEventListener('click', e => { e.preventDefault(); openChatPage(); });

el('nav-wordmark-link')?.addEventListener('click', e => {
  e.preventDefault();
  if (chatPage.style.display !== 'none') goToLanding();
  else window.scrollTo({ top: 0, behavior: 'smooth' });
});
el('sidebar-logo')?.addEventListener('click', e => { e.preventDefault(); goToLanding(); });
el('footer-logo')?.addEventListener('click', e => {
  e.preventDefault();
  window.scrollTo({ top: 0, behavior: 'smooth' });
});

el('new-case-btn')?.addEventListener('click', () => {
  activeCaseIndex = null;
  pendingCategory = null;
  renderConversation();
  renderSuggestions();
  closeSidebarMobile();
  chatTextarea?.focus();
});

chatTextarea?.addEventListener('input',   autoResizeTextarea);
chatTextarea?.addEventListener('keydown', e => {
  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
});
sendBtn?.addEventListener('click', handleSend);

el('sidebar-toggle-btn')?.addEventListener('click', () => {
  if (window.innerWidth <= 1023) {
    if (sidebar.classList.contains('open')) closeSidebarMobile();
    else openSidebarMobile();
  } else {
    chatPage.classList.toggle('sidebar-collapsed');
  }
});
sidebarOverlay?.addEventListener('click', closeSidebarMobile);

el('settings-btn')?.addEventListener('click',    openSettings);
el('settings-close')?.addEventListener('click',  closeSettings);
el('settings-cancel')?.addEventListener('click', closeSettings);
el('settings-save')?.addEventListener('click',   saveSettings);
el('settings-modal')?.addEventListener('click',  e => { if (e.target === el('settings-modal')) closeSettings(); });

navToggle?.addEventListener('click', () => {
  const isOpen = navLinks.classList.toggle('open');
  navToggle.setAttribute('aria-expanded', isOpen);
});

document.querySelectorAll('a[href^="#"]').forEach(link => {
  link.addEventListener('click', async e => {
    const href = link.getAttribute('href');
    if (!href || href === '#' || href.length <= 1 || !href.startsWith('#')) return;
    e.preventDefault();
    if (chatPage.style.display !== 'none') {
      await goToLanding();
    }
    let target;
    try { target = document.querySelector(href); } catch (_) { return; }
    if (target) {
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      navLinks.classList.remove('open');
    }
  });
});

// ════════════════════════════════════════════════════════════
// HERO ANIMATED SUBHEADING — Typewriter cycling animation
// ════════════════════════════════════════════════════════════
const HERO_PHRASES = [
  'Know your next steps.',
  'Navigate California law.',
  'Protect your rights.',
];
let _hIdx = 0, _hChar = 0, _hDel = false;

function heroSubheadingTick() {
  const subEl = document.getElementById('hero-animated-subheading');
  if (!subEl) return;
  const phrase = HERO_PHRASES[_hIdx];
  if (!_hDel) {
    subEl.textContent = phrase.slice(0, _hChar + 1);
    _hChar++;
    if (_hChar === phrase.length) { _hDel = true; setTimeout(heroSubheadingTick, 2400); return; }
  } else {
    subEl.textContent = phrase.slice(0, _hChar - 1);
    _hChar--;
    if (_hChar === 0) { _hDel = false; _hIdx = (_hIdx + 1) % HERO_PHRASES.length; }
  }
  setTimeout(heroSubheadingTick, _hDel ? 32 : 65);
}

// ════════════════════════════════════════════════════════════
// HOME LINK HANDLER
// ════════════════════════════════════════════════════════════
el('nav-home-link')?.addEventListener('click', e => {
  e.preventDefault();
  if (chatPage.style.display !== 'none') {
    goToLanding();
  } else {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
});
el('footer-home-link')?.addEventListener('click', e => {
  e.preventDefault();
  if (chatPage.style.display !== 'none') {
    goToLanding();
  } else {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
});

// ════════════════════════════════════════════════════════════
// INIT
// ════════════════════════════════════════════════════════════
document.addEventListener('DOMContentLoaded', () => {
  renderSuggestions();
  curtain.style.transition = 'none';
  curtain.style.transform  = 'translateY(101%)';
  // Start animated subheading
  setTimeout(heroSubheadingTick, 900);
});
