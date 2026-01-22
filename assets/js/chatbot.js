/* Chatbot Assistant - VoiceTranslate Pro
   Features:
   - Quick replies, typing indicator, intents, and slash commands
   - Translator control: /start, /stop, /translate, /speak, /from, /to, /history, /clearhistory
   - Persistence: chat history saved in localStorage
   - Graceful fallbacks if translator UI isn't present
*/

(function () {
  'use strict';

  // --- Element selectors - initialized after DOM loads ---
  let els = {};
  
  function initializeElements() {
    els = {
      toggle: document.getElementById('chatbotToggle'),
      container: document.getElementById('chatbotContainer'),
      close: document.getElementById('chatbotClose'),
      messages: document.getElementById('chatbotMessages'),
      input: document.getElementById('chatbotInput'),
      send: document.getElementById('chatbotSend'),
      badge: document.querySelector('.chatbot-badge'),

      // Translator controls for DOM-driven actions (no global object needed)
      sourceLang: document.getElementById('sourceLanguage'),
      targetLang: document.getElementById('targetLanguage'),
      sourceText: document.getElementById('sourceText'),
      targetText: document.getElementById('targetText'),
      startBtn: document.getElementById('startRecording'),
      stopBtn: document.getElementById('stopRecording'),
      translateBtn: document.getElementById('translateBtn'),
      speakBtn: document.getElementById('speakTranslation'),
      clearHistoryBtn: document.getElementById('clearHistory'),
      historyList: document.getElementById('historyList')
    };
  }

  // --- Storage keys (localStorage) ---
  const STORE = {
    CHAT: 'vtp_chat_history_v1',
    PREFS: 'vtp_chat_prefs_v1'
  };

  // --- Utilities ---
  const now = () => new Date().toISOString();

  function saveChatHistory(items) {
    try {
      localStorage.setItem(STORE.CHAT, JSON.stringify(items || []));
    } catch (e) {
      // storage may be unavailable or quota exceeded
      console.warn('Chat history not saved:', e);
    }
  }

  function loadChatHistory() {
    try {
      const raw = localStorage.getItem(STORE.CHAT);
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      return [];
    }
  }

  function savePrefs(prefs) {
    try {
      localStorage.setItem(STORE.PREFS, JSON.stringify(prefs || {}));
    } catch (e) {
      console.warn('Prefs not saved:', e);
    }
  }

  function loadPrefs() {
    try {
      const raw = localStorage.getItem(STORE.PREFS);
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  }

  function scrollToBottom() {
    if (els.messages) {
      els.messages.scrollTop = els.messages.scrollHeight;
    }
  }

  function typingBubble(show = true) {
    let t = document.getElementById('vtp-typing');
    if (show) {
      if (t) return;
      t = document.createElement('div');
      t.id = 'vtp-typing';
      t.className = 'bot-message';
      t.innerHTML = `
        <div class="message-avatar"><i class="fas fa-robot"></i></div>
        <div class="message-content">
          <p><span class="dot"></span><span class="dot"></span><span class="dot"></span></p>
        </div>
      `;
      els.messages.appendChild(t);
    } else if (t) {
      t.remove();
    }
    scrollToBottom();
  }

  // --- Chat history in-memory (synced to localStorage) ---
  let CHAT = loadChatHistory();
  let PREFS = loadPrefs();

  // --- Render existing history on load ---
  function renderHistoryFromStore() {
    if (!els.messages) return;
    els.messages.innerHTML = '';
    CHAT.forEach(msg => {
      renderMessage(msg.text, msg.role, msg.quick || null, false);
    });
    if (CHAT.length === 0) {
      // Insert default welcome
      renderMessage(
        "Hello! 👋 I'm your translation assistant. Ask me about using voice translation, or try commands like /start, /stop, /from en-US, /to es-ES, /translate, /speak, /history, /clearhistory.",
        'bot',
        ['How do I use voice translation?', 'What languages are supported?', 'How accurate are translations?'],
        true
      );
    }
  }

  // --- Message rendering ---
  function renderMessage(text, role = 'bot', quickReplies = null, persist = true) {
    if (!els.messages) return;

    const wrapper = document.createElement('div');
    wrapper.className = role === 'user' ? 'user-message' : 'bot-message';

    const avatar = document.createElement('div');
    avatar.className = 'message-avatar';
    avatar.innerHTML = role === 'user' ? '<i class="fas fa-user"></i>' : '<i class="fas fa-robot"></i>';

    const content = document.createElement('div');
    content.className = 'message-content';

    const p = document.createElement('p');
    p.textContent = text;
    p.style.whiteSpace = 'pre-line';

    content.appendChild(p);

    // Quick replies
    if (role === 'bot' && Array.isArray(quickReplies) && quickReplies.length) {
      const qDiv = document.createElement('div');
      qDiv.className = 'quick-replies';
      quickReplies.forEach(q => {
        const btn = document.createElement('button');
        btn.className = 'quick-reply';
        btn.textContent = q;
        btn.dataset.message = q;
        qDiv.appendChild(btn);
      });
      content.appendChild(qDiv);
    }

    wrapper.appendChild(avatar);
    wrapper.appendChild(content);
    els.messages.appendChild(wrapper);
    scrollToBottom();

    // Persist
    if (persist) {
      CHAT.push({ role, text, quick: quickReplies || null, at: now() });
      // Limit to last 200 messages
      if (CHAT.length > 200) CHAT = CHAT.slice(CHAT.length - 200);
      saveChatHistory(CHAT);
    }
  }

  // --- Bot responses knowledge base ---
  const KB = [
    {
      intents: ['how do i use voice translation', 'voice translation guide', 'how to use', 'help with translation'],
      text:
        'To use voice translation: 1) Pick From/To languages, 2) Click Start Speaking and allow mic, 3) Click Stop Recording, 4) Press Translate if needed, 5) Press Speak Translation to hear it. You can also type text in the left panel and hit Translate. Use commands like /from, /to, /start, /stop, /translate, /speak, /history, /clearhistory.',
      quick: ['What languages are supported?', 'How accurate are translations?', 'Show me commands']
    },
    {
      intents: ['what languages are supported', 'supported languages', 'languages'],
      text:
        'VoiceTranslate Pro supports major world languages like English, Spanish, French, German, Italian, Portuguese, Russian, Chinese, Japanese, Korean, Arabic, Hindi, Turkish, Dutch, Swedish, Danish, Finnish, Norwegian, Czech, and more. Use "/from en-US" and "/to es-ES" to set languages.',
      quick: ['How do I use voice translation?', 'Is it free?']
    },
    {
      intents: ['how accurate are translations', 'accuracy', 'translation accuracy'],
      text:
        'Accuracy depends on audio quality, language pair, and content complexity. Speak clearly in a quiet place and use full sentences for best results. Use the Speak Translation button to hear natural pronunciation.',
      quick: ['How can I improve accuracy?', 'What languages are supported?']
    },
    {
      intents: ['how can i improve accuracy', 'improve accuracy', 'tips'],
      text:
        'Tips: Use a quality mic, reduce background noise, speak at a moderate pace, and avoid overlapping speech. Ensure your browser has microphone permission and a stable internet connection.',
      quick: ['What about privacy?', 'How do I use voice translation?']
    },
    {
      intents: ['what about privacy', 'privacy', 'data'],
      text:
        'Your privacy matters: voice is processed in real time and not stored; translation history is saved only in your browser and you can clear it any time from the history section.',
      quick: ['Is it free?', 'How accurate are translations?']
    },
    {
      intents: ['is it free', 'pricing', 'cost'],
      text:
        'The web app is free to use with built-in translation and browser speech capabilities. You can plug in paid APIs later for enterprise-grade features if needed.',
      quick: ['What languages are supported?', 'How do I use it?']
    },
    {
      intents: ['problem', 'not working', 'error', 'issue'],
      text:
        'Try these steps: check mic permission, refresh the page, close other apps using the mic, and use a supported browser. If issues persist, verify internet connection and clear cache.',
      quick: ['How can I improve accuracy?', 'What browsers are supported?']
    },
    {
      intents: ['browsers', 'supported browsers'],
      text:
        'Use the latest Chrome, Edge, or Safari for the best experience. Firefox supports most features but may have limited speech recognition on some versions.',
      quick: ['How do I use voice translation?', 'How can I improve accuracy?']
    }
  ];

  // --- Command parsing (/from en-US, /to es-ES, /start, /stop, /translate, /speak, /history, /clearhistory) ---
  async function handleCommand(cmd) {
    const [head, ...rest] = cmd.trim().split(/s+/);
    const arg = rest.join(' ').trim();

    switch (head.toLowerCase()) {
      case '/start':
        if (els.startBtn) els.startBtn.click();
        renderMessage('Started recording.', 'bot');
        return;

      case '/stop':
        if (els.stopBtn) els.stopBtn.click();
        renderMessage('Stopped recording.', 'bot');
        return;

      case '/translate':
        if (arg) {
          // Inject provided text into source panel and translate
          if (els.sourceText) els.sourceText.textContent = arg;
        }
        if (els.translateBtn) els.translateBtn.click();
        renderMessage('Translating now...', 'bot');
        return;

      case '/speak':
        if (els.speakBtn) els.speakBtn.click();
        renderMessage('Speaking the translation...', 'bot');
        return;

      case '/from':
        if (!arg) {
          renderMessage('Usage: /from en-US', 'bot');
          return;
        }
        if (els.sourceLang) {
          els.sourceLang.value = arg;
          els.sourceLang.dispatchEvent(new Event('change', { bubbles: true }));
          renderMessage(`Source language set to ${arg}.`, 'bot');
        } else {
          renderMessage('Source language control not found.', 'bot');
        }
        return;

      case '/to':
        if (!arg) {
          renderMessage('Usage: /to es-ES', 'bot');
          return;
        }
        if (els.targetLang) {
          els.targetLang.value = arg;
          els.targetLang.dispatchEvent(new Event('change', { bubbles: true }));
          renderMessage(`Target language set to ${arg}.`, 'bot');
        } else {
          renderMessage('Target language control not found.', 'bot');
        }
        return;

      case '/history':
        if (!els.historyList) {
          renderMessage('History panel not available.', 'bot');
          return;
        }
        const items = els.historyList.querySelectorAll('.history-item');
        if (!items.length) {
          renderMessage('No translation history yet.', 'bot');
          return;
        }
        // Summarize last 3 entries
        const last = Array.from(items).slice(0, 3).map((el, i) => {
          const blocks = el.querySelectorAll('.history-text');
          const from = blocks[0]?.textContent?.trim() || '';
          const to = blocks[1]?.textContent?.trim() || '';
          return `#${i + 1}
From: ${from}
To: ${to}`;
        });
        renderMessage(`Recent translations:

${last.join('\n\n')}`, 'bot');
        return;

      case '/clearhistory':
        if (els.clearHistoryBtn) els.clearHistoryBtn.click();
        renderMessage('Translation history cleared.', 'bot');
        return;

      case '/help':
        renderMessage(
          'Commands:\n/start, /stop, /translate [text], /speak, /from <locale>, /to <locale>, /history, /clearhistory, /help',
          'bot'
        );
        return;

      default:
        renderMessage('Unknown command. Type /help for a list of commands.', 'bot');
        return;
    }
  }

  // --- Simple NLU for KB replies ---
  function replyFromKB(message) {
    const m = message.toLowerCase();
    for (const item of KB) {
      if (item.intents.some(k => m.includes(k))) {
        return item;
      }
    }
    // Greetings / thanks
    if (/\b(hi|hello|hey)\b/i.test(message)) {
      return {
        text: 'Hello! 👋 How can I assist you today?',
        quick: ['How do I use voice translation?', 'What languages are supported?']
      };
    }
    if (/\bthank(s| you)\b/i.test(message)) {
      return {
        text: 'You’re welcome! 😊 Anything else I can help with?',
        quick: ['How can I improve accuracy?', 'Supported browsers?']
      };
    }
    return null;
  }

  // --- Core message flow ---
  async function handleUserMessage(text) {
    // Add user message
    renderMessage(text, 'user');

    // Command?
    if (text.trim().startsWith('/')) {
      typingBubble(true);
      await wait(600);
      typingBubble(false);
      return handleCommand(text.trim());
    }

    // KB answer
    const found = replyFromKB(text);
    typingBubble(true);
    await wait(700 + Math.min(text.length * 10, 1200));
    typingBubble(false);

    if (found) {
      renderMessage(found.text, 'bot', found.quick || null);
      return;
    }

    // Translator-aware hints
    if (/translate|speak|record|language/i.test(text)) {
      renderMessage(
        'Tip: Use /from en-US and /to es-ES to set languages, /start to record, /stop to end, /translate to process, and /speak to listen to the result.',
        'bot',
        ['/help', 'How do I use voice translation?']
      );
      return;
    }

    // Fallback
    renderMessage(
      "I'm here to help with the translator. Try asking about usage, supported languages, accuracy tips, or type /help for commands.",
      'bot',
      ['/help', 'What languages are supported?']
    );
  }

  function wait(ms) {
    return new Promise(res => setTimeout(res, ms));
  }

  // --- Event bindings ---
  function bindEvents() {
    if (els.toggle) {
      els.toggle.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        console.log('Chatbot toggle clicked');
        els.container?.classList.toggle('active');
        if (els.container?.classList.contains('active')) {
          if (els.badge) els.badge.style.display = 'none';
          els.input?.focus();
          console.log('Chatbot opened');
        } else {
          console.log('Chatbot closed');
        }
      });
      console.log('Chatbot toggle event listener attached');
    } else {
      console.error('Chatbot toggle element not found');
    }

    els.close?.addEventListener('click', () => {
      els.container?.classList.remove('active');
    });

    els.send?.addEventListener('click', () => {
      const text = (els.input?.value || '').trim();
      if (!text) return;
      handleUserMessage(text);
      els.input.value = '';
    });

    els.input?.addEventListener('keypress', e => {
      if (e.key === 'Enter') {
        e.preventDefault();
        const text = (els.input?.value || '').trim();
        if (!text) return;
        handleUserMessage(text);
        els.input.value = '';
      }
    });

    // Delegate quick replies
    document.addEventListener('click', e => {
      const btn = e.target.closest('.quick-reply');
      if (!btn) return;
      const msg = btn.dataset.message || btn.textContent || '';
      if (!msg.trim()) return;
      handleUserMessage(msg.trim());
    });

    // Optional: react to language changes to remember user prefs
    els.sourceLang?.addEventListener('change', () => {
      PREFS.sourceLang = els.sourceLang.value;
      savePrefs(PREFS);
    });
    els.targetLang?.addEventListener('change', () => {
      PREFS.targetLang = els.targetLang.value;
      savePrefs(PREFS);
    });
  }

  // --- Initialize ---
  function initPrefs() {
    if (PREFS.sourceLang && els.sourceLang) {
      els.sourceLang.value = PREFS.sourceLang;
      els.sourceLang.dispatchEvent(new Event('change', { bubbles: true }));
    }
    if (PREFS.targetLang && els.targetLang) {
      els.targetLang.value = PREFS.targetLang;
      els.targetLang.dispatchEvent(new Event('change', { bubbles: true }));
    }
  }

  // Add minimal typing indicator style dots if not present
  (function injectTypingDots() {
    const styleId = 'vtp-typing-style';
    if (document.getElementById(styleId)) return;
    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = `
      #vtp-typing .message-content p { display: inline-flex; gap: 6px; }
      #vtp-typing .dot {
        width: 8px; height: 8px; border-radius: 50%;
        background: #9ca3af; display: inline-block;
        animation: vtp-bounce 1.2s infinite ease-in-out both;
      }
      #vtp-typing .dot:nth-child(1) { animation-delay: 0s; }
      #vtp-typing .dot:nth-child(2) { animation-delay: 0.2s; }
      #vtp-typing .dot:nth-child(3) { animation-delay: 0.4s; }
      @keyframes vtp-bounce {
        0%, 80%, 100% { transform: scale(0); }
        40% { transform: scale(1.0); }
      }
    `;
    document.head.appendChild(style);
  })();

  // Initialize after DOM is loaded
  function initChatbot() {
    // Retry mechanism to ensure elements are available
    let attempts = 0;
    const maxAttempts = 10;
    
    function tryInitialize() {
      initializeElements();
      
      // Check if critical elements are available
      if (els.toggle && els.container) {
        renderHistoryFromStore();
        bindEvents();
        initPrefs();
        console.log('Chatbot initialized successfully');
      } else {
        attempts++;
        if (attempts < maxAttempts) {
          console.log(`Chatbot initialization attempt ${attempts} failed, retrying...`);
          setTimeout(tryInitialize, 200);
        } else {
          console.error('Failed to initialize chatbot after multiple attempts');
        }
      }
    }
    
    tryInitialize();
  }
  
  // Check if DOM is already loaded or wait for it
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initChatbot);
  } else {
    // DOM is already loaded, run initialization directly
    // Add slight delay to ensure elements are rendered
    setTimeout(initChatbot, 100);
  }

  // Expose minimal API for debugging
  window.vtpChat = {
    say: (text) => {
      if (els.messages) renderMessage(text, 'bot');
      else console.error('Chatbot not initialized properly');
    },
    ask: (text) => {
      if (els.input) handleUserMessage(text);
      else console.error('Chatbot not initialized properly');
    },
    history: () => [...CHAT],
    clearChat: () => {
      CHAT = [];
      saveChatHistory(CHAT);
      renderHistoryFromStore();
    },
    // Method to manually toggle chatbot
    toggleChat: () => {
      if (els.container) {
        els.container.classList.toggle('active');
        if (els.container.classList.contains('active')) {
          if (els.badge) els.badge.style.display = 'none';
          els.input?.focus();
        }
      }
    }
  };
  
  // Also add a global click handler as backup
  document.addEventListener('click', function(e) {
    if (e.target.closest('#chatbotToggle') || e.target.closest('.chatbot-toggle')) {
      e.preventDefault();
      e.stopPropagation();
      if (els.container) {
        els.container.classList.toggle('active');
        if (els.container.classList.contains('active')) {
          if (els.badge) els.badge.style.display = 'none';
          els.input?.focus();
        }
      }
    }
  });
})();
