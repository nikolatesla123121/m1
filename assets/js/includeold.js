// Unified include.js for AlbaSpace website (Turkish)
// [UPDATED] Voice Logic Fixed for Gemini 2.5 Live API

runAfterDomReady(() => {
  // Ensure a valid favicon is present
  (function ensureFavicon() {
    try {
      const existing = document.querySelector('link[rel~="icon"]');
      if (existing) {
        if (existing.getAttribute('href') === '/favicon.png') {
          existing.setAttribute('href', '/assets/images/albalogo.png');
        }
        return;
      }
      const l = document.createElement('link');
      l.rel = 'icon';
      l.type = 'image/png';
      l.href = '/assets/images/albalogo.png';
      document.head.appendChild(l);
    } catch (e) {
      /* silently ignore DOM issues */
    }
  })();

  // Загружаем CSS и скрипт для model-viewer без проверки includes
  injectModelViewerStyles();
  ensureModelViewerLoaded();

  // Создаём лоадеры для прелоадера и навигации 3D моделей
  const ensurePreloaderScript  = createPreloaderLoader();
  const ensureModelPreloader  = createModelPreloaderLoader();
  const ensureModelNavLoader  = createModelNavLoader();

  // ---------------- Mobile nav override ----------------
  if (!document.getElementById("albaspace-nav-override-style")) {
    const navStyle = document.createElement("style");
    navStyle.id = "albaspace-nav-override-style";
    navStyle.textContent = `
      @media (max-width: 768px) {
        nav.main-nav {
          position: absolute;
          top: calc(100% + 10px);
          right: 12px;
          width: 33vw;
          max-width: 420px;
          min-width: 220px;
          background: #020617;
          border: 1px solid rgba(15, 23, 42, 0.8);
          border-radius: 10px;
          box-shadow: 0 18px 45px rgba(56,189,248,0.25);
          flex-direction: column;
          padding: 8px 0;
          z-index: 1001;
          backdrop-filter: blur(6px);
          -webkit-backdrop-filter: blur(6px);
          display: flex;
          opacity: 0;
          transform: translateY(-8px);
          transform-origin: top center;
          transition: opacity .28s ease, transform .28s ease;
          pointer-events: none;
          overflow: hidden;
          will-change: opacity, transform;
        }
        nav.main-nav.nav-open {
          opacity: 1;
          transform: translateY(0);
          pointer-events: auto;
        }
        nav.main-nav a {
          padding: 12px 18px;
          font-size: 14px;
          border-bottom: 1px solid rgba(15,23,42,0.6);
          color: var(--text-main);
          display: block;
        }
        nav.main-nav a:last-child { border-bottom: none; }
      }
    `;
    document.head.appendChild(navStyle);
  }

  // ---------------- Load includes ----------------
  // Поддерживаем атрибуты data-include и data-include-html
  const includes = document.querySelectorAll("[data-include], [data-include-html]");
  if (includes.length) {
    includes.forEach((el) => {
      const url = el.getAttribute("data-include") || el.getAttribute("data-include-html");
      if (!url) return;

      // robust include loader with fallback for absolute/relative paths
      const tryPaths = [url];
      if (url.startsWith("/")) {
        tryPaths.push(url.slice(1)); // fallback to relative path when served from sub-folders/CDNs
      }

      const loadFragment = async () => {
        let html = "";
        let lastErr;
        for (const path of tryPaths) {
          try {
            const res = await fetch(path, { cache: "no-cache" });
            if (!res.ok) throw new Error("Failed " + res.status + " for " + path);
            html = await res.text();
            break;
          } catch (e) {
            lastErr = e;
          }
        }
        if (!html) throw lastErr || new Error("Unknown include error for " + url);

        // ---- НОВОЕ: корректно исполняем <script> из загруженного HTML ----
        const tmp = document.createElement("div");
        tmp.innerHTML = html;

        // собираем все скрипты
        const scripts = Array.from(tmp.querySelectorAll("script"));

        // убираем <script> из HTML, чтобы в el.innerHTML не висели "мёртвые" теги
        scripts.forEach((s) => {
          if (s.parentNode) s.parentNode.removeChild(s);
        });

        // вставляем "чистую" разметку (без скриптов)
        el.innerHTML = tmp.innerHTML;

        // заново создаём и исполняем скрипты (Yandex, GA и т.п.)
        scripts.forEach((oldScript) => {
          const newScript = document.createElement("script");

          // копируем атрибуты
          Array.from(oldScript.attributes || []).forEach(({ name, value }) => {
            if (name === "src") {
              newScript.src = value;
            } else {
              newScript.setAttribute(name, value);
            }
          });

          // переносим inline-код
          if (!oldScript.src) {
            newScript.textContent = oldScript.textContent || "";
          }

          // сохраняем async/defer
          if (oldScript.async) newScript.async = true;
          if (oldScript.defer) newScript.defer = true;

          // добавляем в документ (выполнение начинается автоматически)
          (document.head || document.documentElement).appendChild(newScript);
        });
      };

      loadFragment()
        .then(() => {
          if (url.includes("header-")) {
            // выполняем навигацию, переключатель языка и лоадеры
            markActiveNav();
            setupLangSwitch();
            ensurePreloaderScript();
            ensureModelPreloader();
            ensureModelNavLoader();
          }
          if (url.includes("footer-")) {
            enhanceFooter(el);
            ensureModelPreloader();
          }
        })
        .catch((err) => console.error("[include.js] include failed", url, err));
    });
  } else {
    // если includes нет, всё равно загружаем базовый прелоадер для model-viewer
    ensureModelPreloader();
  }

  // ===== GLOBAL AI WIDGET (Albamen / Albaman) =====
  injectAiWidget();
  ensureAiWidgetPinned();
  injectVoiceWidget(); // <--- FIXED LOGIC IS HERE

  function injectAiWidget() {
    const path = window.location.pathname || '/';
    const isEn = path.startsWith('/eng/');

    // Тексты
    const strings = isEn ? {
      placeholder: 'Send a message...',
      listening: 'Listening...',
      connect: 'Connecting...',
      initialStatus: 'How can I help you today?',
      welcomeBack: 'Welcome back, ',
      voiceNotSupported: 'Voice not supported',
      connectionError: 'Connection error.'
    } : {
      placeholder: 'Bir mesaj yazın...',
      listening: 'Dinliyorum...',
      connect: 'Bağlanıyor...',
      initialStatus: 'Bugün sana nasıl yardım edebilirim?',
      welcomeBack: 'Tekrar hoş geldin, ',
      voiceNotSupported: 'Ses desteği yok',
      connectionError: 'Bağlantı hatası.'
    };

    // Память пользователя (локальное хранение)
    const storedName = localStorage.getItem('albamen_user_name');
    const storedAge = localStorage.getItem('albamen_user_age');
    if (storedName) {
      strings.initialStatus = strings.welcomeBack + storedName + '! 🚀';
    }

    // Проверяем, не создан ли виджет ранее
    if (document.getElementById('ai-floating-global')) return;

    // 1. Создаем контейнер для кнопок (Картинка + Кнопка вызова)
    const floating = document.createElement('div');
    floating.className = 'ai-floating';
    floating.id = 'ai-floating-global';
    const avatarSrc = '/assets/images/albamenai.jpg';

    // HTML для кнопок в футере
    floating.innerHTML = `
      <div class="ai-hero-avatar" id="ai-avatar-trigger">
        <img src="${avatarSrc}" alt="Albamen AI">
      </div>
      <button class="ai-call-btn pulse" id="ai-call-trigger" aria-label="Call AI">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg>
      </button>
    `;

    // Закрепляем плавающий блок в body, чтобы он всегда был на экране
    document.body.appendChild(floating);

    // 2. Создаем Панель Чата (Белую)
    const panel = document.createElement('div');
    panel.className = 'ai-panel-global';
    panel.innerHTML = `
      <div class="ai-panel-header">
        <button class="ai-close-icon" id="ai-close-btn">×</button>
      </div>
      <div class="ai-panel-body">
        <div class="ai-messages-list" id="ai-messages-list"></div>
        <div class="ai-chat-avatar-large"><img src="${avatarSrc}" alt="Albamen"></div>
        <div class="ai-status-text" id="ai-status-text">${strings.initialStatus}</div>
        <div class="ai-input-area">
          <button class="ai-action-btn ai-mic-btn-panel" id="ai-mic-btn">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path><path d="M19 10v2a7 7 0 0 1-14 0v-2"></path><line x1="12" y1="19" x2="12" y2="23"></line><line x1="8" y1="23" x2="16" y2="23"></line></svg>
          </button>
          <input type="text" class="ai-input" id="ai-input-field" placeholder="${strings.placeholder}">
          <button class="ai-action-btn ai-send-btn-panel" id="ai-send-btn">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="22" y1="2" x2="11" y="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>
          </button>
        </div>
      </div>
    `;
    document.body.appendChild(panel);

    // Получаем ссылки на элементы
    const avatarTrigger  = document.getElementById('ai-avatar-trigger');
    const callTrigger    = document.getElementById('ai-call-trigger');
    const closeBtn       = document.getElementById('ai-close-btn');
    const sendBtn        = document.getElementById('ai-send-btn');
    const micBtn         = document.getElementById('ai-mic-btn');
    const inputField     = document.getElementById('ai-input-field');
    const msgList        = document.getElementById('ai-messages-list');
    const statusText     = document.getElementById('ai-status-text');
    const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition || null;
    const recognition = SpeechRec ? new SpeechRec() : null;
    let isListening = false;

    // Функции открытия и закрытия панели
    const openPanel  = () => panel.classList.add('ai-open');
    const closePanel = () => {
      panel.classList.remove('ai-open');
      panel.classList.remove('chat-active');
      statusText.style.display = 'block';
    };

    // Открытие по клику на аватар или кнопку звонка
    avatarTrigger.addEventListener('click', openPanel);
    callTrigger.addEventListener('click', openPanel);
    closeBtn.addEventListener('click', closePanel);

    // Отправка сообщений
    function sendMessage() {
      const txt = inputField.value.trim();
      if (!txt) return;

      // Переход в режим активного чата (скрывает большой аватар)
      panel.classList.add('chat-active');
      addMessage(txt, 'user');
      inputField.value = '';

      const loadingId = 'loading-' + Date.now();
      addMessage('...', 'bot', loadingId);
      statusText.textContent = strings.connect;
      statusText.style.display = 'block';

      // TEXT CHAT Worker
      const workerUrl = 'https://divine-flower-a0ae.nncdecdgc.workers.dev';

      fetch(workerUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: txt,
          savedName: localStorage.getItem('albamen_user_name'),
          savedAge: localStorage.getItem('albamen_user_age')
        })
      })
      .then(res => res.json())
      .then(data => {
        const loader = document.getElementById(loadingId);
        if (loader) loader.remove();

        if (data.reply) {
          let finalReply = data.reply;

          const nameMatch = finalReply.match(/<SAVE_NAME:(.*?)>/);
          if (nameMatch) {
            const newName = nameMatch[1].trim();
            localStorage.setItem('albamen_user_name', newName);
            finalReply = finalReply.replace(nameMatch[0], '');
            console.log("Albamen remembered name:", newName);
          }

          const ageMatch = finalReply.match(/<SAVE_AGE:(.*?)>/);
          if (ageMatch) {
            const newAge = ageMatch[1].trim();
            localStorage.setItem('albamen_user_age', newAge);
            finalReply = finalReply.replace(ageMatch[0], '');
          }

          addMessage(finalReply.trim(), 'bot');
        } else {
          addMessage(strings.connectionError, 'bot');
        }
      })
      .catch(err => {
        console.error("AI Error:", err);
        const loader = document.getElementById(loadingId);
        if (loader) loader.remove();
        addMessage(strings.connectionError, 'bot');
      });
    }

    function addMessage(text, type, id = null) {
      const div = document.createElement('div');
      div.className = `ai-msg ${type}`;
      div.textContent = text;
      if (id) div.id = id;
      msgList.appendChild(div);
      msgList.scrollTop = msgList.scrollHeight;
    }

    // Обработчики ввода
    sendBtn.addEventListener('click', sendMessage);
    inputField.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') sendMessage();
    });

    // Простая логика микрофона (заглушка для UI)
    micBtn.addEventListener('click', () => {
      if (!recognition) {
        statusText.textContent = strings.voiceNotSupported;
        statusText.style.display = 'block';
        return;
      }

      if (isListening) {
        recognition.stop();
        return;
      }

      panel.classList.add('chat-active');
      statusText.textContent = strings.listening;
      statusText.style.display = 'block';
      inputField.focus();
      recognition.lang = isEn ? 'en-US' : 'tr-TR';
      recognition.interimResults = true;
      recognition.maxAlternatives = 1;
      isListening = true;
      recognition.start();
    });

    if (recognition) {
      recognition.addEventListener('result', (event) => {
        const transcript = Array.from(event.results)
          .map(res => res[0].transcript)
          .join(' ')
          .trim();
        if (transcript) {
          inputField.value = transcript;
        }
      });

      recognition.addEventListener('end', () => {
        isListening = false;
        statusText.textContent = strings.initialStatus;
      });

      recognition.addEventListener('error', () => {
        isListening = false;
        statusText.textContent = strings.voiceNotSupported;
      });
    }
  }

  // Убедиться, что виджет остаётся прикреплённым к экрану даже при подмене футера
  function ensureAiWidgetPinned() {
    const floating = document.getElementById('ai-floating-global');
    if (!floating) return;

    const keepInBody = () => {
      if (floating.parentElement !== document.body) {
        document.body.appendChild(floating);
      }
      floating.classList.remove('footer-docked');
    };

    keepInBody();

    // Следим за мутациями (footer может появиться позже), чтобы не сдвинуть кнопку вниз
    const observer = new MutationObserver(() => keepInBody());
    observer.observe(document.body, { childList: true, subtree: true });
  }

  // =========================================================
  // ================= VOICE WIDGET LOGIC ====================
  // =========================================================
  function injectVoiceWidget() {
    const path = window.location.pathname || '/';
    const isEn = path.startsWith('/eng/');

    // локализованные строки
    const t = isEn ? {
      btnAria: 'Voice chat',
      talkPrompt: 'Tap and Talk 🔊',
      connecting: 'Connecting...',
      listening: 'Listening...',
      modalTitle: 'Let’s meet! 👋',
      modalSubtitle: 'Albamen wants to know your name and age.',
      namePlaceholder: 'Your name?',
      agePlaceholder: 'Your age?',
      cancel: 'Cancel',
      start: 'Start 🚀',
      stop: 'Stop',
      error: 'Voice not supported'
    } : {
      btnAria: 'Sesli sohbet',
      talkPrompt: 'Tıkla ve Konuş 🔊',
      connecting: 'Bağlanıyor...',
      listening: 'Dinliyorum...',
      modalTitle: 'Tanışalım! 👋',
      modalSubtitle: 'Albamen seninle daha iyi konuşmak için adını ve yaşını bilmek istiyor.',
      namePlaceholder: 'Adın ne?',
      agePlaceholder: 'Yaşın kaç?',
      cancel: 'İptal',
      start: 'Başla 🚀',
      stop: 'Durdur',
      error: 'Ses desteği yok'
    };

    // стили для голосового окна + свечения, если еще не добавлены
    if (!document.getElementById('ai-voice-style')) {
      const style = document.createElement('style');
      style.id = 'ai-voice-style';
      style.textContent = `
        .ai-voice-btn {
          width: 52px;
          height: 52px;
          border-radius: 999px;
          background: #020617;
          border: 2px solid rgba(148, 163, 184, 0.6);
          color: #e5e7eb;
          display: grid;
          place-items: center;
          cursor: pointer;
          box-shadow: 0 14px 35px rgba(15, 23, 42, 0.75);
          transition: transform .18s ease, box-shadow .18s ease, background .18s ease, border-color .18s ease;
        }
        .ai-voice-btn:hover {
          transform: translateY(-1px) scale(1.05);
          background: radial-gradient(circle at 30% 0%, #0ea5e9, #020617 60%);
          border-color: rgba(56, 189, 248, 0.9);
          box-shadow: 0 20px 40px rgba(8, 47, 73, 0.9);
        }
        .ai-panel-voice {
          position: fixed;
          right: 20px;
          bottom: 20px;
          width: 340px;
          max-width: 95vw;
          height: 360px;
          background: #020617;
          color: #e5e7eb;
          border-radius: 24px;
          box-shadow: 0 22px 55px rgba(15, 23, 42, 0.85);
          display: flex;
          flex-direction: column;
          overflow: hidden;
          transform: translateY(18px) scale(0.96);
          opacity: 0;
          pointer-events: none;
          transition: transform .26s cubic-bezier(.16,1,.3,1), opacity .26s ease;
          z-index: 1205;
        }
        .ai-panel-voice.ai-open {
          transform: translateY(0) scale(1);
          opacity: 1;
          pointer-events: auto;
        }
        .ai-panel-voice .ai-panel-body {
          padding: 12px 14px 14px;
          display: flex;
          flex-direction: column;
          gap: 10px;
          height: 100%;
        }
        .ai-panel-voice .ai-messages-list {
          flex: 1;
          overflow-y: auto;
          font-size: 13px;
        }
        .ai-panel-voice .ai-status-text {
          font-size: 12px;
          color: #9ca3af;
          text-align: center;
          min-height: 18px;
        }
        .ai-panel-voice .ai-chat-avatar-large {
          margin: 0 auto 4px;
        }
        .voice-controls {
          margin-top: auto;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 12px;
        }
        .voice-wave {
          display: flex;
          gap: 4px;
          align-items: flex-end;
        }
        .voice-wave.hidden {
          display: none !important;
        }
        .voice-bar {
          width: 4px;
          border-radius: 999px;
          background: #22c55e;
          animation: voiceWave 1.2s ease-in-out infinite;
        }
        .voice-bar:nth-child(2) { animation-delay: .12s; }
        .voice-bar:nth-child(3) { animation-delay: .24s; }
        @keyframes voiceWave {
          0%,100% { height: 6px; }
          50%     { height: 20px; }
        }
        .voice-stop-btn {
          width: 34px;
          height: 34px;
          border-radius: 999px;
          border: none;
          cursor: pointer;
          display: grid;
          place-items: center;
          background: #ef4444;
          color: #fee2e2;
          box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.7);
          animation: pulseStop 1.4s infinite;
        }
        .voice-stop-btn.hidden {
          display: none !important;
        }
        @keyframes pulseStop {
          0% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.6); }
          70% { box-shadow: 0 0 0 12px rgba(239, 68, 68, 0); }
          100% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0); }
        }
        .voice-auth-modal {
          position: fixed;
          inset: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          background: rgba(15, 23, 42, 0.82);
          backdrop-filter: blur(6px);
          z-index: 1300;
          opacity: 0;
          pointer-events: none;
          transition: opacity .22s ease;
        }
        .voice-auth-modal.open {
          opacity: 1;
          pointer-events: auto;
        }
        .voice-auth-card {
          width: 90%;
          max-width: 320px;
          background: radial-gradient(circle at top, #0f172a, #020617 70%);
          border-radius: 22px;
          padding: 18px 18px 16px;
          box-shadow: 0 22px 45px rgba(15, 23, 42, 0.9);
          color: #e5e7eb;
          text-align: center;
          border: 1px solid rgba(148, 163, 184, 0.5);
        }
        .voice-auth-card h3 {
          font-size: 18px;
          margin-bottom: 4px;
        }
        .voice-auth-card p {
          font-size: 13px;
          color: #9ca3af;
          margin-bottom: 10px;
        }
        .voice-auth-card input {
          width: 100%;
          padding: 9px 10px;
          margin-bottom: 8px;
          border-radius: 10px;
          border: 1px solid rgba(148, 163, 184, 0.8);
          background: #020617;
          color: #e5e7eb;
          font-size: 13px;
        }
        .voice-auth-actions {
          display: flex;
          gap: 8px;
          margin-top: 6px;
        }
        .voice-auth-actions button {
          flex: 1;
          padding: 8px 0;
          border-radius: 999px;
          border: none;
          cursor: pointer;
          font-size: 13px;
        }
        .voice-auth-actions button:first-child {
          background: #475569;
          color: #e5e7eb;
        }
        .voice-auth-actions button:last-child {
          background: #2563eb;
          color: #dbeafe;
        }
        .ai-glow {
          box-shadow: 0 0 14px rgba(56, 189, 248, 0.8), 0 0 32px rgba(59, 130, 246, 0.8);
          animation: aiGlow 1.2s ease-in-out infinite;
        }
        @keyframes aiGlow {
          0%,100% {
            box-shadow: 0 0 10px rgba(56, 189, 248, 0.7), 0 0 24px rgba(56, 189, 248, 0.5);
          }
          50% {
            box-shadow: 0 0 24px rgba(56, 189, 248, 1), 0 0 42px rgba(37, 99, 235, 0.9);
          }
        }
      `;
      document.head.appendChild(style);
    }

    // проверяем, не создан ли виджет ранее
    if (document.getElementById('ai-voice-btn')) return;
    const floating = document.getElementById('ai-floating-global');
    if (!floating) return;

    const avatarSrc = '/assets/images/albamenai.jpg';

    // кнопка на плавающем блоке
    const voiceBtn = document.createElement('button');
    voiceBtn.className = 'ai-voice-btn';
    voiceBtn.id = 'ai-voice-btn';
    voiceBtn.setAttribute('aria-label', t.btnAria);
    voiceBtn.innerHTML = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg>';
    floating.appendChild(voiceBtn);

    // панель голосового чата
    const voicePanel = document.createElement('div');
    voicePanel.id = 'ai-panel-voice';
    voicePanel.className = 'ai-panel-voice';
    voicePanel.innerHTML = `
      <div class="ai-panel-header">
        <button class="ai-close-icon" id="ai-voice-close-btn">×</button>
      </div>
      <div class="ai-panel-body">
        <div class="ai-messages-list" id="voice-messages-list"></div>
        <div class="ai-chat-avatar-large"><img src="${avatarSrc}" alt="Albamen"></div>
        <div class="ai-status-text" id="voice-status-text">${t.talkPrompt}</div>
        <div class="voice-controls">
          <div class="voice-wave hidden" id="voice-wave">
            <div class="voice-bar"></div>
            <div class="voice-bar"></div>
            <div class="voice-bar"></div>
          </div>
          <button class="voice-stop-btn hidden" id="voice-stop-btn">■</button>
        </div>
      </div>
    `;
    document.body.appendChild(voicePanel);

    // модальное окно для имени/возраста
    const authModal = document.createElement('div');
    authModal.id = 'voice-auth-modal';
    authModal.className = 'voice-auth-modal';
    authModal.innerHTML = `
      <div class="voice-auth-card">
        <h3>${t.modalTitle}</h3>
        <p>${t.modalSubtitle}</p>
        <input type="text" id="voice-user-name" placeholder="${t.namePlaceholder}">
        <input type="number" id="voice-user-age" placeholder="${t.agePlaceholder}">
        <div class="voice-auth-actions">
          <button id="voice-auth-cancel">${t.cancel}</button>
          <button id="voice-auth-start">${t.start}</button>
        </div>
      </div>
    `;
    document.body.appendChild(authModal);

    // ссылки на элементы
    const messages = document.getElementById('voice-messages-list');
    const status   = document.getElementById('voice-status-text');
    const wave     = document.getElementById('voice-wave');
    const stopBtn  = document.getElementById('voice-stop-btn');
    const closeBtn = document.getElementById('ai-voice-close-btn');
    const nameInput= document.getElementById('voice-user-name');
    const ageInput = document.getElementById('voice-user-age');
    const cancelBtn= document.getElementById('voice-auth-cancel');
    const startBtn = document.getElementById('voice-auth-start');
    const avatarTrigger = document.getElementById('ai-avatar-trigger');

    // Переменные для аудио
    let audioContext = null;
    let websocket    = null;
    let inputProcessor = null;
    let isVoiceActive = false;
    let audioQueue = [];
    let isPlaying = false;

    // ОБРАБОТЧИКИ СОБЫТИЙ
    voiceBtn.addEventListener('click', () => {
      voicePanel.classList.add('ai-open');
      if (!localStorage.getItem('albamen_user_name')) {
        showAuthModal();
      } else {
        startVoiceChat();
      }
    });

    closeBtn.addEventListener('click', () => {
      voicePanel.classList.remove('ai-open');
      stopVoiceChat();
    });

    cancelBtn.addEventListener('click', hideAuthModal);
    startBtn.addEventListener('click', () => {
      const nm = nameInput.value.trim();
      const ag = ageInput.value.trim();
      if (nm) localStorage.setItem('albamen_user_name', nm);
      if (ag) localStorage.setItem('albamen_user_age', ag);
      hideAuthModal();
      startVoiceChat();
    });

    stopBtn.addEventListener('click', stopVoiceChat);

    function showAuthModal() { authModal.classList.add('open'); }
    function hideAuthModal() { authModal.classList.remove('open'); }

    // --- ГЛАВНАЯ ФУНКЦИЯ ЗАПУСКА ГОЛОСОВОГО ЧАТА ---
    async function startVoiceChat() {
      if (isVoiceActive) return;

      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        status.textContent = t.error;
        console.error("Audio API not supported");
        return;
      }

      status.textContent = t.connecting;
      wave.classList.remove('hidden');
      stopBtn.classList.remove('hidden');

      const savedName = localStorage.getItem('albamen_user_name') || '';
      const savedAge  = localStorage.getItem('albamen_user_age') || '';

      // URL Воркера
      const wsUrl = 'wss://albamen-voice.nncdecdgc.workers.dev'
        + '?name=' + encodeURIComponent(savedName)
        + '&age=' + encodeURIComponent(savedAge);

      try {
        websocket = new WebSocket(wsUrl);

        websocket.onopen = async () => {
            console.log("WebSocket Connected");
            isVoiceActive = true;
            status.textContent = t.listening;
            await startMicrophone();
        };

        websocket.onclose = () => {
            console.log("WebSocket Closed");
            stopVoiceChat();
        };

        websocket.onerror = (e) => {
            console.error("WebSocket Error:", e);
            status.textContent = t.error;
            stopVoiceChat();
        };

        websocket.onmessage = async (ev) => {
            const data = JSON.parse(ev.data);

            // Обработка входящего аудио от Gemini 2.0
            if (data.serverContent && data.serverContent.modelTurn && data.serverContent.modelTurn.parts) {
                for (const part of data.serverContent.modelTurn.parts) {
                    if (part.inlineData && part.inlineData.mimeType.startsWith('audio/pcm')) {
                        queueAudio(part.inlineData.data);
                    }
                }
            }
        };

      } catch (err) {
          console.error("Connection failed:", err);
          stopVoiceChat();
      }
    }

    // --- ЗАПИСЬ МИКРОФОНА (16kHz PCM) ---
    async function startMicrophone() {
        try {
            // Создаем AudioContext специально для записи с частотой 16000 (требование Gemini)
            audioContext = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 16000 });

            const stream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    channelCount: 1,
                    sampleRate: 16000,
                    echoCancellation: true,
                    noiseSuppression: true
                }
            });

            const source = audioContext.createMediaStreamSource(stream);
            // ScriptProcessorNode (deprecated, но надежно работает для RAW PCM)
            inputProcessor = audioContext.createScriptProcessor(4096, 1, 1);

            inputProcessor.onaudioprocess = (e) => {
                if (!websocket || websocket.readyState !== WebSocket.OPEN) return;

                const inputData = e.inputBuffer.getChannelData(0);
                // Конвертация Float32 -> Int16 PCM
                const pcm16 = floatTo16BitPCM(inputData);
                const base64Audio = arrayBufferToBase64(pcm16.buffer);

                // Отправка в формате Gemini Live API
                const msg = {
                    realtime_input: {
                        media_chunks: [{
                            mime_type: "audio/pcm",
                            data: base64Audio
                        }]
                    }
                };
                websocket.send(JSON.stringify(msg));
            };

            source.connect(inputProcessor);
            inputProcessor.connect(audioContext.destination);

        } catch (e) {
            console.error("Microphone Access Error:", e);
            status.textContent = "Mic Error";
        }
    }

    // --- ВОСПРОИЗВЕДЕНИЕ (24kHz PCM) ---
    function queueAudio(base64Data) {
        const audioData = base64ToArrayBuffer(base64Data);
        // Gemini отдает 24kHz Int16. Нам нужно конвертировать это во Float32
        const float32Data = pcm16ToFloat32(audioData);

        audioQueue.push(float32Data);
        if (!isPlaying) {
            playNextChunk();
        }
    }

    function playNextChunk() {
        if (audioQueue.length === 0) {
            isPlaying = false;
            // Убираем свечение, если очередь пуста
            const bigAvatar = voicePanel.querySelector('.ai-chat-avatar-large');
            if (avatarTrigger) avatarTrigger.classList.remove('ai-glow');
            if (bigAvatar) bigAvatar.classList.remove('ai-glow');
            return;
        }

        isPlaying = true;
        const chunk = audioQueue.shift();

        // Если audioContext уже создан на 16000, это может вызвать проблемы с воспроизведением 24000.
        // Для воспроизведения создадим отдельный буфер с rate 24000.
        // AudioContext сам сделает ресемплинг при воспроизведении.
        if (!audioContext) return;

        const buffer = audioContext.createBuffer(1, chunk.length, 24000);
        buffer.getChannelData(0).set(chunk);

        const source = audioContext.createBufferSource();
        source.buffer = buffer;
        source.connect(audioContext.destination);

        // Включаем визуальный эффект
        const bigAvatar = voicePanel.querySelector('.ai-chat-avatar-large');
        if (avatarTrigger) avatarTrigger.classList.add('ai-glow');
        if (bigAvatar) bigAvatar.classList.add('ai-glow');

        source.onended = playNextChunk;
        source.start();
    }

    function stopVoiceChat() {
      if (!isVoiceActive && !audioContext && !websocket) return;
      isVoiceActive = false;
      isPlaying = false;
      audioQueue = [];

      try { if (websocket) websocket.close(); } catch (e) {}
      try { if (inputProcessor) inputProcessor.disconnect(); } catch (e) {}
      try { if (audioContext) audioContext.close(); } catch (e) {}

      audioContext = null;
      websocket = null;
      inputProcessor = null;

      wave.classList.add('hidden');
      stopBtn.classList.add('hidden');
      status.textContent = t.talkPrompt;

      const bigAvatar = voicePanel.querySelector('.ai-chat-avatar-large');
      if (avatarTrigger) avatarTrigger.classList.remove('ai-glow');
      if (bigAvatar) bigAvatar.classList.remove('ai-glow');
    }

    // --- CONVERTERS ---
    function floatTo16BitPCM(input) {
        const output = new Int16Array(input.length);
        for (let i = 0; i < input.length; i++) {
            const s = Math.max(-1, Math.min(1, input[i]));
            output[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
        }
        return output;
    }

    function pcm16ToFloat32(buffer) {
        const int16 = new Int16Array(buffer);
        const float32 = new Float32Array(int16.length);
        for (let i = 0; i < int16.length; i++) {
            float32[i] = int16[i] / 32768.0;
        }
        return float32;
    }

    function arrayBufferToBase64(buffer) {
        let binary = '';
        const bytes = new Uint8Array(buffer);
        const len = bytes.byteLength;
        for (let i = 0; i < len; i++) {
            binary += String.fromCharCode(bytes[i]);
        }
        return window.btoa(binary);
    }

    function base64ToArrayBuffer(base64) {
        const binaryString = window.atob(base64);
        const len = binaryString.length;
        const bytes = new Uint8Array(len);
        for (let i = 0; i < len; i++) {
            bytes[i] = binaryString.charCodeAt(i);
        }
        return bytes.buffer;
    }
  }
}); // END runAfterDomReady

// -------------------- HELPER FUNCTIONS --------------------

// Вызывает функцию, когда DOM готов (или сразу, если уже готов)
function runAfterDomReady(fn) {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', fn, { once: true });
  } else {
    fn();
  }
}

// ================= MODEL VIEWER LOADER =================
function injectModelViewerStyles() {
  if (document.getElementById("albaspace-model-viewer-styles")) return;

  const style = document.createElement("style");
  style.id = "albaspace-model-viewer-styles";
  style.textContent = `
    model-viewer {
      width: 100%;
      height: 600px;
      margin-top: 30px;
      background: rgba(0, 0, 0, 0.65);
      border-radius: 12px;
      box-shadow: 0 0 30px rgba(0, 150, 255, 0.5);
      display: block;
    }

    @media (max-width: 768px) {
      model-viewer {
        height: 420px;
        margin-top: 20px;
      }
    }

    /* Ensure model-viewer is visible and interactive */
    model-viewer[ar-status="session-started"] {
      display: block !important;
    }

    /* Loading state */
    model-viewer::part(default-progress-bar) {
      background: linear-gradient(90deg, #00b4ff, #00e5ff);
    }
  `;
  document.head.appendChild(style);
}

function ensureModelViewerLoaded() {
  // Первый вариант: проверяем наличие model-viewer элемента
  const hasModelViewer = !!document.querySelector("model-viewer");

  if (!hasModelViewer) return;

  // Если custom element уже зарегистрирован - ничего не делаем
  if (window.customElements && window.customElements.get("model-viewer")) {
    return;
  }

  // Вариант 1: Пытаемся загрузить из Google CDN (основной)
  const googleSrc = "https://ajax.googleapis.com/ajax/libs/model-viewer/3.0.0/model-viewer.min.js";

  // Вариант 2: Резервный источник
  const fallbackSrc = "https://unpkg.com/@google/model-viewer@3.0.0/dist/model-viewer.min.js";

  // Проверяем, что скрипт еще не загружается
  const existingGoogleScript = document.querySelector(`script[src="${googleSrc}"]`);
  const existingFallbackScript = document.querySelector(`script[src="${fallbackSrc}"]`);

  if (existingGoogleScript || existingFallbackScript) {
    return;
  }

  // Пытаемся загрузить с основного CDN
  const loadModelViewer = () => {
    if (window.customElements && window.customElements.get("model-viewer")) {
      return; // Успешно загружен
    }

    const script = document.createElement("script");
    script.type = "module";

    // Сначала пытаемся основной CDN
    script.src = googleSrc;

    // Если основной CDN не работает, переключаемся на резервный
    script.onerror = () => {
      if (window.customElements && window.customElements.get("model-viewer")) {
        return;
      }

      const fallbackScript = document.createElement("script");
      fallbackScript.type = "module";
      fallbackScript.src = fallbackSrc;
      document.head.appendChild(fallbackScript);
    };

    document.head.appendChild(script);
  };

  // Даем время на загрузку главного скрипта в head
  setTimeout(loadModelViewer, 800);

  // На всякий случай - финальная проверка через 3 секунды
  setTimeout(() => {
    if (!window.customElements || !window.customElements.get("model-viewer")) {
      const fallbackScript = document.createElement("script");
      fallbackScript.type = "module";
      fallbackScript.src = fallbackSrc;
      fallbackScript.async = true;
      document.head.appendChild(fallbackScript);
    }
  }, 3000);
}

function createPreloaderLoader() {
  let loaded = false;

  return function ensurePreloaderScript() {
    if (loaded) return;

    const preloader = document.getElementById("preloader");
    if (!preloader) return;

    const existing = document.querySelector("script[data-preloader-loader]");
    if (existing) {
      loaded = true;
      return;
    }

    const script = document.createElement("script");
    script.src = "/assets/js/preloader.js";
    script.defer = true;
    script.dataset.preloaderLoader = "true";
    document.head.appendChild(script);
    loaded = true;
  };
}

function createModelPreloaderLoader() {
  let loaded = false;

  return function ensureModelPreloader() {
    if (loaded) return;
    const hasViewer = !!document.querySelector('model-viewer');
    if (!hasViewer) return;

    const existing = document.querySelector('script[data-model-preloader]');
    if (existing) {
      loaded = true;
      return;
    }

    const script = document.createElement('script');
    script.src = '/assets/js/model-preloader.js';
    script.defer = true;
    script.dataset.modelPreloader = 'true';
    document.head.appendChild(script);
    loaded = true;
  };
}

function createModelNavLoader() {
  let loaded = false;

  return function ensureModelNavLoader() {
    if (loaded) return;

    const existing = document.querySelector('script[data-model-nav-loader]');
    if (existing) { loaded = true; return; }

    const script = document.createElement('script');
    script.src = '/assets/js/model-nav-loader.js';
    script.defer = true;
    script.dataset.modelNavLoader = 'true';
    document.head.appendChild(script);
    loaded = true;
  };
}

// ================= NAV =================
function markActiveNav() {
  const path = normalizePath(window.location.pathname || "/");
  const navLinks = document.querySelectorAll(".main-nav a");
  let matched = false;

  navLinks.forEach((a) => {
    const href = a.getAttribute("href");
    if (!href) return;

    try {
      const linkPath = normalizePath(new URL(href, window.location.origin).pathname);
      if (linkPath === path) {
        a.classList.add("active");
        matched = true;
      }
    } catch (e) {
      if (href && path.endsWith(href)) {
        a.classList.add("active");
        matched = true;
      }
    }
  });

  if (!matched) {
    navLinks.forEach((a) => {
      const text = (a.textContent || "").trim().toUpperCase();
      if (text.includes("ATLAS")) a.classList.add("active");
    });
  }
}

function normalizePath(p) {
  if (!p || p === "/") return "/index.html";
  if (!p.endsWith(".html") && !p.endsWith("/")) return p + "/";
  return p;
}

// ================= LANG =================
function setupLangSwitch() {
  const path = window.location.pathname || "/";
  const isEn = path.startsWith("/eng/");
  const currentLang = isEn ? "en" : "tr";

  const container = document.querySelector(".top-lang-switch");
  if (!container) return;

  container.querySelectorAll("[data-lang]").forEach((btn) => {
    const lang = btn.getAttribute("data-lang");
    btn.classList.toggle("active", lang === currentLang);

    btn.addEventListener("click", (e) => {
      e.preventDefault();
      if (lang === currentLang) return;

      const targetPath = lang === "en" ? toEnPath(path) : toTrPath(path);
      window.location.href = targetPath;
    });
  });
}

function toEnPath(path) {
  path = normalizePath(path);
  if (path.startsWith("/eng/")) return path;
  if (path === "/index.html") return "/eng/index.html";
  return "/eng" + (path.startsWith("/") ? path : "/" + path);
}

function toTrPath(path) {
  path = normalizePath(path);
  if (!path.startsWith("/eng/")) return path;
  return path.replace(/^\/eng/, "") || "/index.html";
}

// ================= FOOTER ENHANCER =================
function enhanceFooter(root) {
  injectFooterStyles();

  const footer = root.querySelector("footer");
  if (!footer || footer.classList.contains("alba-footer-v5")) return;
  footer.classList.add("alba-footer-v5");

  const allowCallSquare = /\/hizmetler(\.html)?\/?$/i.test(
    window.location.pathname || ""
  );
  if (!allowCallSquare) {
    footer.querySelectorAll(".alba-call-square").forEach((el) => el.remove());
  }

  const socials =
    footer.querySelector(".social-icons") ||
    footer.querySelector(".footer-socials") ||
    footer.querySelector("[data-socials]");
  if (socials) socials.classList.add("alba-footer-socials");

  // Modified: prioritize .footer-actions before .footer-right to avoid clearing social icons
  const addressContainer =
    footer.querySelector(".footer-actions") ||
    footer.querySelector(".footer-right") ||
    footer.querySelector(".footer-address") ||
    footer.querySelector(".footer-contact") ||
    footer.querySelector("[data-footer-address]");

  if (!addressContainer) return;

  const rawAddrText = (addressContainer.innerText || "").trim();
  if (!rawAddrText) return;

  const merkezBlock = extractSection(rawAddrText, /Merkez Ofis/i, /Adana Şube/i);
  const adanaBlock = extractSection(rawAddrText, /Adana Şube/i, null);

  const phoneRaw = findPhone(rawAddrText) || findPhone(footer.innerText || "");
  const phoneTel = phoneRaw ? phoneRaw.replace(/[^\d+]/g, "") : "";

  const mailAnchors = footer.querySelectorAll('a[href^="mailto:"]');
  mailAnchors.forEach((el) => el.remove());

  const contactPanel = document.createElement('div');
  contactPanel.className = 'alba-footer-contact-panel';

  const phoneBtn = document.createElement('a');
  phoneBtn.className = 'alba-footer-action';
  phoneBtn.href = 'tel:+9053877818';
  phoneBtn.innerHTML = `
    <div class="action-row">
      <span class="action-icon">☎</span>
      <span class="action-text">+90 538 778 18</span>
    </div>
    <div class="action-hint alba-blink">Aramak için dokunun</div>
  `;
  contactPanel.appendChild(phoneBtn);

  const emailBtn = document.createElement('a');
  emailBtn.className = 'alba-footer-action';
  emailBtn.href = 'mailto:hello@albaspace.com.tr';
  emailBtn.innerHTML = `
    <div class="action-row">
      <span class="action-icon">✉</span>
      <span class="action-text">hello@albaspace.com.tr</span>
    </div>
    <div class="action-hint alba-blink">Bize yazın</div>
  `;
  contactPanel.appendChild(emailBtn);

  const map1 = buildMapButton(merkezBlock);
  const map2 = buildMapButton(adanaBlock);
  if (map1) contactPanel.appendChild(map1);
  if (map2) contactPanel.appendChild(map2);

  addressContainer.innerHTML = '';
  addressContainer.style.display = 'flex';
  addressContainer.style.flexDirection = 'column';
  addressContainer.style.alignItems = 'center';
  addressContainer.style.justifyContent = 'center';
  addressContainer.style.width = '100%';
  addressContainer.style.margin = '0 auto';
  addressContainer.appendChild(contactPanel);
}

function buildMapButton(blockText) {
  if (!blockText) return null;
  const lines = blockText
    .split('\n')
    .map((s) => s.trim())
    .filter(Boolean);
  if (!lines.length) return null;
  const title = lines[0];
  const addressLines = lines.slice(1).filter((l) => !/(\+?\s*\d[\d\s()\-]{7,}\d)/.test(l));
  const address = addressLines.join(', ').replace(/\s+/g, ' ').trim();
  if (!address) return null;
  const a = document.createElement('a');
  a.className = 'alba-footer-action';
  a.href =
    'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(address);
  a.target = '_blank';
  a.rel = 'noopener';
  const hintTr = 'Haritayı açmak için dokunun';
  a.innerHTML = `
    <div class="action-row">
      <span class="action-icon">📍</span>
      <span class="action-text">${escapeHtml(title)}</span>
    </div>
    <div class="map-address">${escapeHtml(address)}</div>
    <div class="action-hint alba-blink">${hintTr}</div>
  `;
  return a;
}

function extractSection(text, startRegex, beforeRegex) {
  if (!text) return "";
  const start = text.search(startRegex);
  if (start === -1) return "";

  const sliced = text.slice(start);
  if (!beforeRegex) return sliced.trim();

  const end = sliced.search(beforeRegex);
  if (end === -1) return sliced.trim();

  return sliced.slice(0, end).trim();
}

function findPhone(text) {
  if (!text) return "";
  const m = text.match(/(\+?\s*\d[\d\s()\-]{7,}\d)/);
  return m ? m[1].trim() : "";
}

function escapeHtml(str) {
  return String(str || "")
    .replaceAll("&", "&")
    .replaceAll("<", "<")
    .replaceAll(">", ">")
    .replaceAll('"', """)
    .replaceAll("'", "'");
}

function injectFooterStyles() {
  if (document.getElementById("alba-footer-style-v5")) return;

  const s = document.createElement("style");
  s.id = "alba-footer-style-v5";
  s.textContent = `
    .alba-footer-contact-panel {
      width: 100%;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 16px;
      margin-top: 20px;
    }
    .alba-footer-action {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 10px 16px;
      border-radius: 12px;
      background: rgba(15,23,42,0.88);
      border: 1px solid rgba(148,163,184,0.45);
      color: #e5e7eb;
      text-decoration: none;
      width: 100%;
      max-width: 360px;
      box-shadow: 0 16px 40px rgba(15,23,42,0.8);
      transition: transform 0.18s ease, box-shadow 0.18s ease, border-color 0.18s ease, background 0.18s ease;
    }
    .alba-footer-action:hover {
      transform: translateY(-1px);
      box-shadow: 0 20px 55px rgba(15,23,42,0.95);
      border-color: rgba(56,189,248,0.8);
      background: radial-gradient(circle at top, rgba(15,23,42,1), rgba(8,47,73,0.96));
    }
    .action-row {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 14px;
      font-weight: 500;
    }
    .action-icon {
      font-size: 18px;
    }
    .action-text {
      letter-spacing: 0.01em;
    }
    .map-address {
      margin-top: 6px;
      font-size: 13px;
      color: #cbd5f5;
      text-align: center;
      line-height: 1.35;
    }
    .action-hint {
      margin-top: 6px;
      font-size: 12px;
      color: #60a5fa;
    }
    .alba-blink {
      animation: albaBlink 1.6s ease-in-out infinite;
    }
    @keyframes albaBlink {
      0%, 100% { opacity: 1; transform: translateY(0); }
      50% { opacity: 0.4; transform: translateY(-1px); }
    }
  `;
  document.head.appendChild(s);
}
