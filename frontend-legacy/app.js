// ─── Config ─────────────────────────────────────────────────────────────────
const API_URL = '/ask'; 

// ─── State ───────────────────────────────────────────────────────────────────
let isLoading = false;

// ─── DOM Refs ────────────────────────────────────────────────────────────────
const chatMessages = document.getElementById('chatMessages');
const userInput    = document.getElementById('userInput');
const sendBtn      = document.getElementById('sendBtn');

// ─── Send Message ─────────────────────────────────────────────────────────────
async function sendMessage() {
  const query = userInput.value.trim();
  if (!query || isLoading) return;

  // Validate: empty or gibberish
  if (!isValidQuery(query)) {
    appendUserMessage(query);
    clearInput();
    appendErrorMessage("I couldn't understand your question. Please try rephrasing — for example: \"How do I register with SECP?\"");
    return;
  }

  appendUserMessage(query);
  clearInput();

  const typingId = appendTypingIndicator();
  setLoading(true);

  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query }),
    });

    removeTypingIndicator(typingId);

    if (!response.ok) throw new Error(`Server error: ${response.status}`);

    const data = await response.json();
    appendBotMessage(data);

  } catch (err) {
    removeTypingIndicator(typingId);

    // ── Fallback: backend not connected yet (for demo/development) ──
    const mock = getMockResponse(query);
    if (mock) {
      appendBotMessage(mock);
    } else {
      appendErrorMessage("I'm having trouble connecting to the server. Please try again shortly.");
    }
  } finally {
    setLoading(false);
  }
}

// ─── Validation ───────────────────────────────────────────────────────────────
function isValidQuery(q) {
  if (q.length < 5) return false;
  const wordCount = q.trim().split(/\s+/).length;
  if (wordCount < 2) {
    // allow single meaningful words like "NTN?" "SECP?"
    const knownKeywords = ['ntn', 'stn', 'secp', 'fbr', 'freelancing', 'pvtltd', 'registration'];
    return knownKeywords.some(k => q.toLowerCase().includes(k));
  }
  // Reject pure gibberish (no vowels in main words)
  const hasRealWords = /[aeiou]/i.test(q);
  return hasRealWords;
}

// ─── Render: User Message ─────────────────────────────────────────────────────
function appendUserMessage(text) {
  const row = document.createElement('div');
  row.className = 'message user-message';
  row.innerHTML = `
    <div class="avatar user-avatar">U</div>
    <div class="message-body">
      <div class="message-bubble">${escapeHtml(text)}</div>
    </div>
  `;
  chatMessages.appendChild(row);
  scrollToBottom();
}

// ─── Render: Bot Message ──────────────────────────────────────────────────────
// Expected data shape from backend:
// { answer: string, steps: string[], source: string, warning?: string }
function appendBotMessage(data) {
  const row = document.createElement('div');
  row.className = 'message bot-message';

  const stepsHtml = data.steps && data.steps.length
    ? `<div class="answer-section">
         <p class="section-label">What to do next</p>
         <ol class="steps-list">
           ${data.steps.map(s => `<li>${escapeHtml(s)}</li>`).join('')}
         </ol>
       </div>`
    : '';

  const warningHtml = data.warning
    ? `<div class="warning-tag">⚠ ${escapeHtml(data.warning)}</div>`
    : '';

  const sourceHtml = data.source
    ? `<div class="source-tag">${escapeHtml(data.source)}</div>`
    : '';

  row.innerHTML = `
    <div class="avatar bot-avatar">⚖</div>
    <div class="message-body">
      <div class="message-bubble">
        <p>${formatAnswer(data.answer)}</p>
        ${stepsHtml}
        ${warningHtml}
        ${sourceHtml}
        <div class="feedback-row">
          <span class="feedback-label">Was this helpful?</span>
          <button class="feedback-btn" onclick="markFeedback(this, 'yes')">👍</button>
          <button class="feedback-btn" onclick="markFeedback(this, 'no')">👎</button>
        </div>
      </div>
    </div>
  `;
  chatMessages.appendChild(row);
  scrollToBottom();
}

// ─── Render: Error Message ────────────────────────────────────────────────────
function appendErrorMessage(text) {
  const row = document.createElement('div');
  row.className = 'message bot-message error-bubble';
  row.innerHTML = `
    <div class="avatar bot-avatar">⚖</div>
    <div class="message-body">
      <div class="message-bubble">
        <p>⚠ ${escapeHtml(text)}</p>
        <div class="source-tag" style="background:rgba(248,113,113,.08);border-color:rgba(248,113,113,.2);color:#f87171;">Out of scope or unknown</div>
      </div>
    </div>
  `;
  chatMessages.appendChild(row);
  scrollToBottom();
}

// ─── Typing Indicator ─────────────────────────────────────────────────────────
function appendTypingIndicator() {
  const id = 'typing-' + Date.now();
  const row = document.createElement('div');
  row.className = 'message bot-message typing-indicator';
  row.id = id;
  row.innerHTML = `
    <div class="avatar bot-avatar">⚖</div>
    <div class="message-body">
      <div class="message-bubble">
        <span class="dot"></span>
        <span class="dot"></span>
        <span class="dot"></span>
      </div>
    </div>
  `;
  chatMessages.appendChild(row);
  scrollToBottom();
  return id;
}

function removeTypingIndicator(id) {
  const el = document.getElementById(id);
  if (el) el.remove();
}

// ─── Feedback ─────────────────────────────────────────────────────────────────
function markFeedback(btn, value) {
  const row = btn.closest('.feedback-row');
  row.querySelectorAll('.feedback-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  // TODO: send to backend for logging
  console.log('Feedback:', value);
}

// ─── Suggestions ─────────────────────────────────────────────────────────────
function fillSuggestion(btn) {
  userInput.value = btn.textContent;
  autoResize(userInput);
  userInput.focus();
}

// ─── Clear Chat ───────────────────────────────────────────────────────────────
function clearChat() {
  chatMessages.innerHTML = '';
}

// ─── Sidebar Toggle (Mobile) ──────────────────────────────────────────────────
function toggleSidebar() {
  document.querySelector('.sidebar').classList.toggle('open');
}

// ─── Input Helpers ────────────────────────────────────────────────────────────
function handleKeyDown(e) {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    sendMessage();
  }
}

function autoResize(el) {
  el.style.height = 'auto';
  el.style.height = Math.min(el.scrollHeight, 140) + 'px';
}

function clearInput() {
  userInput.value = '';
  userInput.style.height = 'auto';
}

function setLoading(state) {
  isLoading = state;
  sendBtn.disabled = state;
}

function scrollToBottom() {
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

// ─── Safety: HTML Escape ──────────────────────────────────────────────────────
function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// Basic bold formatting: **text** → <strong>text</strong>
function formatAnswer(text) {
  return escapeHtml(text).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
}

// ─── Mock Responses (for demo without backend) ────────────────────────────────
// Delete or disable this once the backend is running.
function getMockResponse(query) {
  const q = query.toLowerCase();

  if (q.includes('ntn') && (q.includes('document') || q.includes('required') || q.includes('what do i need'))) {
    return {
      answer: "To register for an **NTN (National Tax Number)** with FBR, you need the following documents ready before starting the online process.",
      steps: [
        "Original CNIC (Computerized National Identity Card)",
        "Active mobile number registered against your CNIC",
        "Personal email address",
        "Residential address details",
        "Business address (if registering as a business)",
        "Bank account number (optional but recommended)"
      ],
      source: "Source: FBR (Federal Board of Revenue)",
      warning: "All registration is done online via the FBR IRIS portal — no physical documents need to be submitted for individual NTN."
    };
  }

  if (q.includes('ntn') && (q.includes('freelan') || q.includes('need'))) {
    return {
      answer: "**Yes**, freelancers in Pakistan are generally required to register for an NTN (National Tax Number) with the FBR if their annual income exceeds PKR 600,000. Even below this threshold, registration is recommended for opening business bank accounts and working with formal clients.",
      steps: [
        "Visit the FBR IRIS portal at iris.fbr.gov.pk",
        "Click 'Registration for Unregistered Person'",
        "Fill in your CNIC, mobile number, and email",
        "Select 'Individual' as taxpayer type",
        "Complete e-verification via OTP",
        "Your NTN is generated instantly"
      ],
      source: "Source: FBR (Federal Board of Revenue)",
      warning: "This is general guidance. Please verify current thresholds at FBR.gov.pk before filing."
    };
  }

  if (q.includes('secp') && q.includes('register')) {
    return {
      answer: "To register a company with **SECP (Securities and Exchange Commission of Pakistan)**, you use their e-Services portal. The most common structure for startups is a **Private Limited Company (Pvt Ltd)**.",
      steps: [
        "Go to eservices.secp.gov.pk",
        "Create an account with your CNIC",
        "Check name availability for your company",
        "Submit Form 1 (Memorandum & Articles of Association)",
        "Pay the registration fee online",
        "Receive your Certificate of Incorporation digitally"
      ],
      source: "Source: SECP (Securities and Exchange Commission of Pakistan)",
      warning: "Processing typically takes 1–3 business days. Ensure your chosen name isn't already registered."
    };
  }

  if (q.includes('smc') || q.includes('pvt') || q.includes('difference') || q.includes('structure')) {
    return {
      answer: "Pakistan offers several business structures. The main ones for small founders are **Sole Proprietorship**, **SMC-Pvt Ltd** (Single Member Company), and **Pvt Ltd** (Private Limited Company).",
      steps: [
        "Sole Proprietorship: No SECP registration needed, register with your local tax office only",
        "SMC-Pvt Ltd: 1 director, registered with SECP — best for solo founders wanting legal protection",
        "Pvt Ltd: 2–50 shareholders, best for startups planning to raise investment"
      ],
      source: "Source: SECP Company Types Guide",
      warning: "Each structure has different tax, liability, and compliance obligations. Consult a CA for your specific situation."
    };
  }

  if (q.includes('sales tax') || q.includes('stn')) {
    return {
      answer: "**Sales Tax Registration (STN)** with FBR is required if your annual business turnover exceeds **PKR 10 million**. Service providers may need to register with the provincial revenue authority instead.",
      steps: [
        "Determine if you're selling goods (FBR) or services (provincial — e.g., SRB for Sindh, PRA for Punjab)",
        "Visit the relevant authority's portal",
        "Register using your NTN and business details",
        "File monthly sales tax returns once registered"
      ],
      source: "Source: FBR Sales Tax Act",
      warning: "Thresholds and rules vary by province for services. Verify with your local revenue authority."
    };
  }

  // Out-of-scope catch
  if (q.includes('divorce') || q.includes('criminal') || q.includes('property') || q.includes('marriage')) {
    return null; // triggers error message
  }

  // Generic fallback
  return {
    answer: "I found some general information related to your query, but I'm not confident enough to give specific steps. Please rephrase your question focusing on **SECP registration**, **NTN/STN**, or **business structure** for Pakistan.",
    steps: [],
    source: "",
    warning: "This tool only covers Pakistani business registration and compliance. For other legal matters, consult a qualified lawyer."
  };
}

// ── Structure Recommender Quiz ────────────────────────────────────────────────
const QUIZ = [
  {
    q: "How many founders are starting this business?",
    options: ["Just me", "2 or more people"]
  },
  {
    q: "Do you have personal assets you want to protect? (savings, property)",
    options: ["Yes, protect my assets", "No / not sure yet"]
  },
  {
    q: "Are you planning to raise investment or bring in external partners?",
    options: ["Yes, planning to raise funding", "No, self-funded for now"]
  }
];

const QUIZ_LOGIC = (answers) => {
  const [founders, assets, funding] = answers;
  if (founders === 1 && assets === 0) return {
    structure: "SMC (Single Member Company)",
    reason: "You're a solo founder with assets to protect. SMC gives you limited liability — your personal savings and property stay safe if the business faces debt or legal issues.",
    steps: ["Register free at eservices.secp.gov.pk", "Prepare your CNIC and address proof", "File MoA + AoA (templates available in Daftar)", "Get your Certificate of Incorporation in 1–2 weeks"],
    source: "SECP Companies Act 2017 | Section 42"
  };
  if (founders === 1 && assets === 1) return {
    structure: "Sole Proprietorship",
    reason: "You're testing an idea solo and don't have major assets at risk yet. Sole proprietorship is free, takes 1–5 days, and you only need an NTN from FBR — no SECP registration.",
    steps: ["Register for NTN at iris.fbr.gov.pk (free)", "Open a business bank account with your NTN", "Start operating — upgrade to SMC when you're ready to scale"],
    source: "FBR IRIS Portal | Income Tax Ordinance 2001"
  };
  if (founders === 0 && funding === 0) return {
    structure: "Private Limited Company (Pvt Ltd)",
    reason: "With multiple founders and funding plans, Pvt Ltd is the right structure. It's investor-ready, allows share issuance, and gives all founders limited liability protection.",
    steps: ["Agree on shareholding split with co-founders", "Register at eservices.secp.gov.pk", "File MoA + AoA with all director CNICs", "Register for NTN after incorporation"],
    source: "SECP Companies Act 2017 | FBR IRIS Portal"
  };
  // default: multiple founders, no funding
  return {
    structure: "SMC or Private Limited Company",
    reason: "With multiple founders but no immediate funding plans, you can start with an SMC if one founder leads, or go straight to Pvt Ltd for a cleaner multi-founder setup.",
    steps: ["Decide who the primary director/shareholder will be", "For SMC: register at eservices.secp.gov.pk with 1 shareholder", "For Pvt Ltd: gather CNICs of all founders and register together", "Get NTN from FBR after SECP registration"],
    source: "SECP Companies Act 2017"
  };
};

let quizAnswers = [];
let quizStep = 0;

function startQuiz() {
  quizAnswers = [];
  quizStep = 0;
  // Show welcome message in chat
  appendBotMessage({
    answer: "I'll ask you 3 quick questions to recommend the right business structure for you.",
    steps: [],
    source: "",
    warning: null
  });
  showQuizQuestion();
}

function showQuizQuestion() {
  if (quizStep >= QUIZ.length) {
    finishQuiz();
    return;
  }
  const q = QUIZ[quizStep];
  const row = document.createElement('div');
  row.className = 'message bot-message';
  row.id = `quiz-step-${quizStep}`;
  row.innerHTML = `
    <div class="avatar bot-avatar">⚖</div>
    <div class="message-body">
      <div class="message-bubble">
        <p><strong>Question ${quizStep + 1} of ${QUIZ.length}</strong></p>
        <p>${q.q}</p>
        <div class="quiz-options">
          ${q.options.map((opt, i) => `
            <button class="quiz-option-btn" onclick="answerQuiz(${i}, this)">
              ${opt}
            </button>
          `).join('')}
        </div>
      </div>
    </div>
  `;
  chatMessages.appendChild(row);
  scrollToBottom();
}

function answerQuiz(answerIndex, btn) {
  // Disable all buttons in this question
  const questionEl = document.getElementById(`quiz-step-${quizStep}`);
  questionEl.querySelectorAll('.quiz-option-btn').forEach(b => {
    b.disabled = true;
    b.style.opacity = b === btn ? '1' : '0.4';
  });
  btn.style.borderColor = 'var(--accent)';
  btn.style.color = 'var(--accent)';

  quizAnswers.push(answerIndex);
  quizStep++;
  setTimeout(showQuizQuestion, 400);
}

function finishQuiz() {
  const result = QUIZ_LOGIC(quizAnswers);
  appendBotMessage({
    answer: ` Based on your answers, we recommend: **${result.structure}**\n\n${result.reason}`,
    steps: result.steps,
    source: result.source,
    warning: "This is a general recommendation. For complex situations, consult a CA or legal advisor."
  });
}

// ─── Out of scope detection ───────────────────────────────────────────────────
const OUT_OF_SCOPE_KEYWORDS = ['divorce', 'criminal', 'marriage', 'property dispute', 'immigration', 'custody', 'murder', 'accident'];

function isOutOfScope(query) {
  const q = query.toLowerCase();
  return OUT_OF_SCOPE_KEYWORDS.some(kw => q.includes(kw));
}

// Override sendMessage to handle out-of-scope before API call
const _originalSend = sendMessage;
(function patchSendMessage() {
  window.sendMessage = async function () {
    const query = userInput.value.trim();
    if (!query || isLoading) return;

    if (isOutOfScope(query)) {
      appendUserMessage(query);
      clearInput();
      appendErrorMessage("This tool only supports Pakistani business registration and compliance topics (SECP, FBR, NTN, STN). For other legal matters, please consult a qualified lawyer.");
      return;
    }

    await _originalSend();
  };
})();