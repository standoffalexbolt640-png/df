import { useState, useRef, useEffect } from "react";

const SYSTEM_PROMPT = `Ты — Xwin Pro, продвинутый AI-ассистент нового поколения. Ты умный, полезный, дружелюбный и точный.
Отвечай на русском языке если вопрос на русском. Будь конкретным и полезным.
Если тебя спрашивают о твоей модели или имени — ты Xwin Pro, мощный интеллектуальный ассистент.
ВАЖНО: Когда пишешь код — ВСЕГДА пиши ПОЛНЫЙ, РАБОЧИЙ код без сокращений и без комментариев вида "// остальной код здесь", "// ...", "...", "и т.д." или любых других заглушек. Код должен быть полностью готов к запуску и копированию.
Используй форматирование markdown: блоки кода в тройных backticks с указанием языка.`;

// ─── File type helpers ────────────────────────────────────────────
function getFileIcon(type) {
  if (type.startsWith("image/")) return "🖼️";
  if (type === "application/pdf") return "📄";
  if (type.includes("text")) return "📝";
  if (type.includes("json")) return "📋";
  if (type.includes("javascript") || type.includes("jsx") || type.includes("tsx")) return "⚡";
  return "📎";
}

function formatFileSize(bytes) {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / (1024 * 1024)).toFixed(1) + " MB";
}

// ─── Typing indicator ───────────────────────────────────────────
function TypingDots() {
  return (
    <div style={{ display: "flex", gap: 5, padding: "2px 0", alignItems: "center" }}>
      {[0, 0.18, 0.36].map((delay, i) => (
        <span key={i} style={{
          width: 7, height: 7, borderRadius: "50%",
          background: "linear-gradient(135deg,#00c9ff,#0066ff)",
          display: "inline-block",
          animation: `dotPulse 1.3s ${delay}s infinite`
        }} />
      ))}
    </div>
  );
}

// ─── Code block renderer ─────────────────────────────────────────
function CodeBlock({ code, lang }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <div style={{
      background: "#0b0b14", border: "1px solid rgba(0,150,255,0.15)",
      borderRadius: 12, marginTop: 10, marginBottom: 4, overflow: "hidden",
      fontFamily: "'JetBrains Mono', 'Fira Code', monospace"
    }}>
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "8px 14px", background: "rgba(0,100,255,0.07)",
        borderBottom: "1px solid rgba(0,150,255,0.1)"
      }}>
        <span style={{ fontSize: 11, color: "#4488cc", fontWeight: 600, letterSpacing: 1, textTransform: "uppercase" }}>
          {lang || "код"}
        </span>
        <button onClick={copy} style={{
          fontSize: 11, color: copied ? "#00e5a0" : "#4488cc", background: "rgba(0,100,255,0.08)",
          border: "none", cursor: "pointer", fontFamily: "inherit", padding: "2px 8px",
          borderRadius: 6, transition: "all 0.2s", letterSpacing: 0.5
        }}>{copied ? "✓ скопировано" : "копировать"}</button>
      </div>
      <pre style={{
        padding: "14px 16px", margin: 0, fontSize: 12.5, lineHeight: 1.7,
        color: "#a8d8ff", overflowX: "auto", whiteSpace: "pre-wrap", wordBreak: "break-all"
      }}>{code}</pre>
    </div>
  );
}

// ─── Message content ──────────────────────────────────────────────
function BubbleContent({ text }) {
  if (!text) return null;
  if (!text.includes("`")) return <span style={{ whiteSpace: "pre-wrap" }}>{text}</span>;
  const parts = text.split(/(```[\w]*\n?[\s\S]*?```)/g);
  return (
    <div>
      {parts.map((part, i) => {
        if (part.startsWith("```")) {
          const match = part.match(/^```(\w*)\n?([\s\S]*?)```$/);
          const lang = match?.[1] || "";
          const code = match?.[2]?.trim() || part.replace(/^```\w*\n?/, "").replace(/```$/, "").trim();
          return <CodeBlock key={i} code={code} lang={lang} />;
        }
        const inlineParts = part.split(/(`[^`]+`)/g);
        return (
          <span key={i} style={{ whiteSpace: "pre-wrap" }}>
            {inlineParts.map((ip, j) => {
              if (ip.startsWith("`") && ip.endsWith("`")) {
                return (
                  <code key={j} style={{
                    background: "rgba(0,100,255,0.12)", color: "#80c0ff",
                    padding: "1px 6px", borderRadius: 5, fontFamily: "monospace", fontSize: "0.9em"
                  }}>{ip.slice(1, -1)}</code>
                );
              }
              return ip ? <span key={j}>{ip}</span> : null;
            })}
          </span>
        );
      })}
    </div>
  );
}

// ─── Attached file preview in message ────────────────────────────
function FilePreview({ file }) {
  if (!file) return null;
  if (file.type.startsWith("image/") && file.dataUrl) {
    return (
      <div style={{ marginBottom: 8 }}>
        <img src={file.dataUrl} alt={file.name}
          style={{ maxWidth: "100%", maxHeight: 220, borderRadius: 10, display: "block",
            border: "1px solid rgba(0,150,255,0.2)" }} />
        <div style={{ fontSize: 11, color: "rgba(255,255,255,0.5)", marginTop: 4 }}>
          {file.name} · {formatFileSize(file.size)}
        </div>
      </div>
    );
  }
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 8, marginBottom: 8,
      background: "rgba(0,80,255,0.12)", borderRadius: 10, padding: "8px 12px",
      border: "1px solid rgba(0,150,255,0.2)"
    }}>
      <span style={{ fontSize: 20 }}>{getFileIcon(file.type)}</span>
      <div>
        <div style={{ fontSize: 13, color: "#a0c8ff", fontWeight: 500 }}>{file.name}</div>
        <div style={{ fontSize: 11, color: "rgba(160,200,255,0.5)" }}>{formatFileSize(file.size)}</div>
      </div>
    </div>
  );
}

// ─── Quick prompts ─────────────────────────────────────────────────
const quickPrompts = [
  { icon: "💻", text: "Напиши полный сайт-визитку на HTML с анимациями" },
  { icon: "🐍", text: "Напиши Python скрипт для парсинга сайта" },
  { icon: "📊", text: "Составь бизнес-план для стартапа" },
  { icon: "🔍", text: "Как работает нейросеть? Объясни подробно" },
];

// ─── Main component ───────────────────────────────────────────────
export default function XwinAI() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [history, setHistory] = useState([]);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sessions, setSessions] = useState([{ id: 1, title: "Новый чат", active: true }]);
  const [attachedFile, setAttachedFile] = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const anchorRef = useRef(null);
  const textareaRef = useRef(null);
  const fileInputRef = useRef(null);
  const abortRef = useRef(null);

  useEffect(() => {
    anchorRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  // ── File processing ──────────────────────────────────────────────
  const processFile = (file) => {
    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      alert("Файл слишком большой. Максимальный размер: 10MB");
      return;
    }
    // Расширяем поддерживаемые типы
    const allowedTypes = [
      "image/jpeg","image/png","image/gif","image/webp","image/svg+xml",
      "application/pdf",
      "text/plain","text/html","text/css","text/javascript","text/csv","text/markdown",
      "application/json","application/xml","application/javascript",
    ];
    const isAllowed = allowedTypes.some(t => file.type === t)
      || file.type.startsWith("image/")
      || file.type.startsWith("text/")
      || file.name.match(/\.(jsx?|tsx?|py|java|cpp|c|cs|go|rs|php|rb|swift|kt|sh|md|yaml|yml|toml|env|gitignore|sql)$/i);

    if (!isAllowed) {
      alert("Поддерживаются: изображения, PDF, текст, код (JS, TS, Python, и др.), JSON, CSV.");
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target.result;
      const base64 = dataUrl.split(",")[1];
      // Определяем медиа-тип точнее
      let mediaType = file.type;
      if (!mediaType || mediaType === "application/octet-stream") {
        // Пытаемся определить по расширению
        if (file.name.match(/\.(jsx?|tsx?|ts)$/i)) mediaType = "text/plain";
        else if (file.name.match(/\.(py|rb|php|sh|go|rs|java|cpp|c|cs|swift|kt)$/i)) mediaType = "text/plain";
        else if (file.name.match(/\.(json)$/i)) mediaType = "application/json";
        else if (file.name.match(/\.(md|markdown)$/i)) mediaType = "text/plain";
        else if (file.name.match(/\.(yaml|yml|toml|env|sql)$/i)) mediaType = "text/plain";
        else mediaType = "text/plain";
      }
      setAttachedFile({ name: file.name, size: file.size, type: file.type || mediaType, dataUrl, base64, mediaType });
    };
    reader.readAsDataURL(file);
  };

  const handleFileInput = (e) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
    e.target.value = "";
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) processFile(file);
  };

  // ── Build API message content ─────────────────────────────────────
  const buildUserContent = (text, file) => {
    if (!file) return text || "";

    // Изображение — передаём как base64 image
    if (file.type.startsWith("image/")) {
      const content = [];
      content.push({ type: "image", source: { type: "base64", media_type: file.mediaType, data: file.base64 } });
      content.push({ type: "text", text: text || "Опиши что на изображении подробно" });
      return content;
    }

    // PDF — передаём как document
    if (file.type === "application/pdf") {
      const content = [];
      content.push({ type: "document", source: { type: "base64", media_type: "application/pdf", data: file.base64 } });
      content.push({ type: "text", text: text || "Проанализируй этот документ подробно" });
      return content;
    }

    // Текстовые файлы и код — декодируем и вставляем в сообщение
    try {
      const decoded = atob(file.base64);
      const ext = file.name.split(".").pop()?.toLowerCase() || "";
      const langMap = {
        js: "javascript", jsx: "jsx", ts: "typescript", tsx: "tsx",
        py: "python", rb: "ruby", php: "php", java: "java", go: "go",
        rs: "rust", cpp: "cpp", c: "c", cs: "csharp", swift: "swift",
        kt: "kotlin", sh: "bash", html: "html", css: "css", json: "json",
        md: "markdown", yaml: "yaml", yml: "yaml", sql: "sql", xml: "xml",
        toml: "toml", txt: ""
      };
      const lang = langMap[ext] ?? ext ?? "";
      const prompt = text ? `${text}\n\n` : "";
      return `${prompt}Содержимое файла «${file.name}»:\n\`\`\`${lang}\n${decoded}\n\`\`\``;
    } catch {
      return text || "Файл прикреплён";
    }
  };

  // ── Send message with STREAMING ──────────────────────────────────
  const sendMessage = async (text) => {
    const msg = (text || input).trim();
    if ((!msg && !attachedFile) || isTyping) return;
    setInput("");
    if (textareaRef.current) textareaRef.current.style.height = "auto";

    const currentFile = attachedFile;
    setAttachedFile(null);

    const userContent = buildUserContent(msg, currentFile);
    const displayText = msg || (currentFile ? `[Файл: ${currentFile.name}]` : "");

    const newHistory = [...history, { role: "user", content: userContent }];
    setHistory(newHistory);
    setMessages(prev => [...prev, { role: "user", text: displayText, file: currentFile }]);
    setIsTyping(true);

    // Добавляем пустое сообщение AI которое будем наполнять стримом
    setMessages(prev => [...prev, { role: "ai", text: "", streaming: true }]);

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        signal: controller.signal,
        headers: {
          "Content-Type": "application/json",
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 8000,
          stream: true,
          system: SYSTEM_PROMPT,
          messages: newHistory
        })
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData?.error?.message || `HTTP ${response.status}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let fullReply = "";
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? ""; // последняя незаконченная строка

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const data = line.slice(6).trim();
          if (data === "[DONE]") continue;
          try {
            const parsed = JSON.parse(data);
            if (parsed.type === "content_block_delta" && parsed.delta?.type === "text_delta") {
              fullReply += parsed.delta.text;
              const snapshot = fullReply;
              setMessages(prev => {
                const updated = [...prev];
                const lastIdx = updated.length - 1;
                if (updated[lastIdx]?.role === "ai") {
                  updated[lastIdx] = { ...updated[lastIdx], text: snapshot };
                }
                return updated;
              });
            }
          } catch { /* skip malformed */ }
        }
      }

      // Финализируем сообщение (убираем флаг streaming)
      setMessages(prev => {
        const updated = [...prev];
        const lastIdx = updated.length - 1;
        if (updated[lastIdx]?.role === "ai") {
          updated[lastIdx] = { role: "ai", text: fullReply || "Нет ответа." };
        }
        return updated;
      });

      setHistory(h => [...h, { role: "assistant", content: fullReply }]);

      if (newHistory.length === 1) {
        const title = (typeof userContent === "string" ? userContent : msg || currentFile?.name || "Файл")
          .slice(0, 28);
        setSessions(s => s.map(sess => sess.active ? { ...sess, title: title + (title.length >= 28 ? "…" : "") } : sess));
      }
    } catch (err) {
      if (err.name === "AbortError") {
        setMessages(prev => {
          const updated = [...prev];
          const lastIdx = updated.length - 1;
          if (updated[lastIdx]?.role === "ai") {
            updated[lastIdx] = { role: "ai", text: updated[lastIdx].text || "⛔ Остановлено." };
          }
          return updated;
        });
      } else {
        setMessages(prev => {
          const updated = [...prev];
          const lastIdx = updated.length - 1;
          if (updated[lastIdx]?.role === "ai") {
            updated[lastIdx] = { role: "ai", text: `⚠️ Ошибка: ${err.message}` };
          }
          return updated;
        });
      }
    }
    setIsTyping(false);
    abortRef.current = null;
  };

  const stopGeneration = () => {
    abortRef.current?.abort();
  };

  const clearChat = () => {
    abortRef.current?.abort();
    setMessages([]); setHistory([]); setAttachedFile(null);
    const newId = Date.now();
    setSessions(prev => [...prev.map(s => ({ ...s, active: false })), { id: newId, title: "Новый чат", active: true }]);
  };

  const handleKey = (e) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  };

  const canSend = (input.trim() || attachedFile) && !isTyping;

  return (
    <div
      style={{ background: "#070711", color: "#dde4f0", fontFamily: "'DM Sans', 'Segoe UI', sans-serif", height: "100vh", display: "flex", overflow: "hidden", position: "relative" }}
      onDragOver={e => { e.preventDefault(); setDragOver(true); }}
      onDragLeave={() => setDragOver(false)}
      onDrop={handleDrop}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@600;700;800&family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600&display=swap');
        @keyframes dotPulse { 0%,80%,100%{transform:translateY(0) scale(1);opacity:.4} 40%{transform:translateY(-5px) scale(1.15);opacity:1} }
        @keyframes fadeUp { from{opacity:0;transform:translateY(14px)} to{opacity:1;transform:translateY(0)} }
        @keyframes glowPulse { 0%,100%{box-shadow:0 0 8px rgba(0,150,255,0.3)} 50%{box-shadow:0 0 16px rgba(0,150,255,0.7)} }
        @keyframes shimmer { 0%{background-position:-200% center} 100%{background-position:200% center} }
        @keyframes blink { 0%,100%{opacity:1} 50%{opacity:0.3} }
        @keyframes dropGlow { 0%,100%{border-color:rgba(0,150,255,0.4)} 50%{border-color:rgba(0,200,255,0.9)} }
        @keyframes streamCursor { 0%,100%{opacity:1} 50%{opacity:0} }

        ::-webkit-scrollbar{width:3px}
        ::-webkit-scrollbar-track{background:transparent}
        ::-webkit-scrollbar-thumb{background:rgba(0,150,255,0.2);border-radius:2px}
        .msg-enter { animation: fadeUp 0.28s cubic-bezier(.16,1,.3,1) forwards; }
        .send-btn:hover:not(:disabled) { transform: scale(1.05); box-shadow: 0 0 20px rgba(0,150,255,0.6) !important; }
        .send-btn:active:not(:disabled) { transform: scale(0.97); }
        .stop-btn:hover { background: rgba(255,60,60,0.15) !important; border-color: rgba(255,80,80,0.5) !important; }
        .attach-btn:hover { background: rgba(0,120,255,0.15) !important; border-color: rgba(0,150,255,0.4) !important; color: #80c0ff !important; }
        .quick-chip:hover { background: rgba(0,120,255,0.12) !important; border-color: rgba(0,150,255,0.35) !important; color: #c0d8ff !important; transform: translateY(-1px); }
        .sess-item:hover { background: rgba(0,100,255,0.07) !important; }
        .sess-item.active { background: rgba(0,100,255,0.12) !important; border-left: 2px solid #0088ff !important; }
        .new-chat-btn:hover { background: rgba(0,100,255,0.2) !important; border-color: rgba(0,150,255,0.5) !important; }
        textarea { resize: none; background: none; border: none; outline: none; color: #dde4f0; font-family: 'DM Sans', sans-serif; font-size: 14px; line-height: 1.55; width: 100%; }
        textarea::placeholder { color: #3a4466; }
        .stream-cursor::after { content: '▋'; display: inline-block; animation: streamCursor 0.8s infinite; color: #4488cc; margin-left: 2px; font-size: 0.85em; }
      `}</style>

      {/* Drag overlay */}
      {dragOver && (
        <div style={{
          position: "fixed", inset: 0, zIndex: 999,
          background: "rgba(0,30,80,0.85)", backdropFilter: "blur(8px)",
          display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
          border: "2px dashed rgba(0,150,255,0.7)", animation: "dropGlow 1s infinite"
        }}>
          <div style={{ fontSize: 64, marginBottom: 16 }}>📂</div>
          <div style={{ fontFamily: "Syne, sans-serif", fontSize: 22, fontWeight: 800, color: "#80c8ff" }}>
            Отпустите файл
          </div>
          <div style={{ fontSize: 14, color: "#4488cc", marginTop: 8 }}>
            Изображения, PDF, код, текстовые файлы
          </div>
        </div>
      )}

      {/* Ambient blobs */}
      <div style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 0, overflow: "hidden" }}>
        <div style={{ position: "absolute", width: 500, height: 500, borderRadius: "50%", background: "radial-gradient(circle, rgba(0,80,255,0.06) 0%, transparent 70%)", top: -100, left: -100, filter: "blur(40px)" }} />
        <div style={{ position: "absolute", width: 400, height: 400, borderRadius: "50%", background: "radial-gradient(circle, rgba(0,200,255,0.04) 0%, transparent 70%)", bottom: 50, right: -50, filter: "blur(30px)" }} />
        <div style={{ position: "absolute", inset: 0, backgroundImage: "linear-gradient(rgba(0,100,255,0.03) 1px,transparent 1px),linear-gradient(90deg,rgba(0,100,255,0.03) 1px,transparent 1px)", backgroundSize: "32px 32px" }} />
      </div>

      {/* Sidebar */}
      <div style={{ width: sidebarOpen ? 240 : 0, minWidth: sidebarOpen ? 240 : 0, transition: "all 0.3s cubic-bezier(.16,1,.3,1)", overflow: "hidden", flexShrink: 0, zIndex: 20, background: "#0b0b18", borderRight: "1px solid rgba(0,100,255,0.1)" }}>
        <div style={{ width: 240, height: "100%", display: "flex", flexDirection: "column", padding: "16px 12px" }}>
          <div style={{ fontFamily: "Syne, sans-serif", fontWeight: 800, fontSize: 15, letterSpacing: 2, color: "#4488cc", textTransform: "uppercase", padding: "4px 8px 16px", borderBottom: "1px solid rgba(0,100,255,0.08)" }}>История</div>
          <button onClick={clearChat} className="new-chat-btn" style={{ marginTop: 12, padding: "10px 14px", background: "rgba(0,80,255,0.08)", border: "1px solid rgba(0,100,255,0.2)", borderRadius: 10, color: "#6699cc", fontSize: 12, cursor: "pointer", fontFamily: "DM Sans, sans-serif", display: "flex", alignItems: "center", gap: 8, transition: "all 0.2s" }}>
            <span style={{ fontSize: 14 }}>＋</span> Новый чат
          </button>
          <div style={{ marginTop: 12, flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: 4 }}>
            {sessions.slice().reverse().map(sess => (
              <div key={sess.id} className={`sess-item${sess.active ? " active" : ""}`} style={{ padding: "9px 12px", borderRadius: 9, fontSize: 12, color: sess.active ? "#a0c4ff" : "#445577", cursor: "pointer", transition: "all 0.15s", borderLeft: "2px solid transparent", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                💬 {sess.title}
              </div>
            ))}
          </div>
          <div style={{ borderTop: "1px solid rgba(0,100,255,0.08)", paddingTop: 14, marginTop: 8, fontSize: 11, color: "#223355", textAlign: "center", letterSpacing: 0.5 }}>
            Xwin AI Pro v4.0
          </div>
        </div>
      </div>

      {/* Main panel */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", position: "relative", zIndex: 1 }}>

        {/* Header */}
        <header style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 18px", background: "rgba(7,7,17,0.92)", borderBottom: "1px solid rgba(0,100,255,0.1)", backdropFilter: "blur(24px)", zIndex: 10 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <button onClick={() => setSidebarOpen(s => !s)} style={{ width: 34, height: 34, background: "rgba(0,80,255,0.06)", border: "1px solid rgba(0,100,255,0.15)", borderRadius: 9, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 4, cursor: "pointer" }}>
              {[0,1,2].map(i => (
                <div key={i} style={{ width: 14, height: 1.5, background: "#4488cc", borderRadius: 1, transition: "all 0.2s", ...(sidebarOpen && i===0 ? {transform:"rotate(45deg) translate(4px,4px)"} : {}), ...(sidebarOpen && i===1 ? {opacity:0} : {}), ...(sidebarOpen && i===2 ? {transform:"rotate(-45deg) translate(4px,-4px)"} : {}) }} />
              ))}
            </button>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ width: 34, height: 34, borderRadius: 10, background: "linear-gradient(135deg,#0044cc,#00aaff)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "Syne, sans-serif", fontWeight: 800, fontSize: 15, color: "#fff", boxShadow: "0 0 16px rgba(0,150,255,0.4)", animation: "glowPulse 3s infinite" }}>X</div>
              <div>
                <div style={{ fontFamily: "Syne, sans-serif", fontWeight: 800, fontSize: 15, letterSpacing: 0.5 }}>Xwin AI</div>
                <div style={{ fontSize: 10, color: "#2255aa", letterSpacing: 1, textTransform: "uppercase", marginTop: -1 }}>Pro Edition</div>
              </div>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 7, background: "rgba(0,50,120,0.3)", border: "1px solid rgba(0,100,255,0.2)", borderRadius: 20, padding: "5px 12px 5px 10px" }}>
            <div style={{ width: 6, height: 6, background: "#00e5a0", borderRadius: "50%", boxShadow: "0 0 8px #00e5a0", animation: "blink 2.5s infinite" }} />
            <span style={{ fontFamily: "Syne, sans-serif", fontSize: 11, fontWeight: 700, color: "#4488cc", letterSpacing: 1 }}>ОНЛАЙН</span>
          </div>

          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={clearChat} title="Новый чат" style={{ width: 34, height: 34, background: "rgba(0,80,255,0.06)", border: "1px solid rgba(0,100,255,0.15)", borderRadius: 9, color: "#4466aa", fontSize: 16, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.2s" }}>✦</button>
          </div>
        </header>

        {/* Messages */}
        <div style={{ flex: 1, overflowY: "auto", padding: "24px 16px 8px", display: "flex", flexDirection: "column", gap: 18 }}>

          {/* Empty state */}
          {messages.length === 0 && !isTyping && (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", flex: 1, gap: 20, padding: "30px 20px", textAlign: "center", animation: "fadeUp 0.6s ease forwards" }}>
              <div style={{ width: 80, height: 80, borderRadius: 24, background: "linear-gradient(135deg,#0033cc,#0099ff)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "Syne, sans-serif", fontWeight: 800, fontSize: 34, color: "#fff", boxShadow: "0 0 50px rgba(0,150,255,0.4), 0 0 100px rgba(0,100,255,0.15)", animation: "glowPulse 3s infinite", marginBottom: 4 }}>X</div>
              <div>
                <h1 style={{ fontFamily: "Syne, sans-serif", fontWeight: 800, fontSize: 28, margin: "0 0 6px", background: "linear-gradient(135deg, #ffffff 20%, #0099ff 60%, #00ccff)", backgroundSize: "200% auto", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", animation: "shimmer 3s linear infinite" }}>Xwin Pro</h1>
                <p style={{ color: "#2a3d6e", fontSize: 13, maxWidth: 300, lineHeight: 1.7, margin: 0 }}>
                  Интеллектуальный ассистент нового поколения.<br />Задай вопрос или прикрепи файл.
                </p>
              </div>
              <div style={{ width: "100%", maxWidth: 340, height: 1, background: "linear-gradient(90deg,transparent,rgba(0,100,255,0.2),transparent)" }} />
              <div style={{ display: "flex", flexDirection: "column", gap: 8, width: "100%", maxWidth: 340 }}>
                <div style={{ fontSize: 10, color: "#1e2d55", letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 4 }}>Попробуй спросить</div>
                {quickPrompts.map((q, i) => (
                  <button key={i} className="quick-chip" onClick={() => sendMessage(q.text)} style={{ background: "rgba(0,60,140,0.1)", border: "1px solid rgba(0,100,255,0.14)", borderRadius: 12, padding: "12px 16px", color: "#3a5588", fontSize: 13, fontFamily: "DM Sans, sans-serif", cursor: "pointer", textAlign: "left", display: "flex", alignItems: "center", gap: 10, transition: "all 0.2s" }}>
                    <span style={{ fontSize: 16, flexShrink: 0 }}>{q.icon}</span>
                    <span style={{ lineHeight: 1.4 }}>{q.text}</span>
                  </button>
                ))}
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, color: "#1e2d55", fontSize: 12, marginTop: 4 }}>
                <span>📎</span> Перетащи файл или нажми скрепку чтобы прикрепить
              </div>
            </div>
          )}

          {/* Chat messages */}
          {messages.map((m, i) => (
            <div key={i} className="msg-enter" style={{ display: "flex", gap: 10, flexDirection: m.role === "user" ? "row-reverse" : "row", alignItems: "flex-end" }}>
              <div style={{ width: 32, height: 32, borderRadius: 10, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 800, fontFamily: "Syne, sans-serif", ...(m.role === "ai" ? { background: "linear-gradient(135deg,#0033cc,#0099ff)", boxShadow: "0 0 12px rgba(0,150,255,0.35)", color: "#fff" } : { background: "rgba(0,60,140,0.2)", border: "1px solid rgba(0,100,255,0.15)", color: "#4466aa" }) }}>
                {m.role === "ai" ? "X" : "У"}
              </div>
              <div style={{ maxWidth: "78%", padding: "13px 17px", borderRadius: m.role === "ai" ? "18px 18px 18px 4px" : "18px 18px 4px 18px", fontSize: 14, lineHeight: 1.65, ...(m.role === "ai" ? { background: "#0e0e1e", border: "1px solid rgba(0,100,255,0.12)", color: "#cdd8f0" } : { background: "linear-gradient(135deg,#0044cc,#0088ff)", color: "#fff", boxShadow: "0 4px 24px rgba(0,100,255,0.3)" }) }}>
                {m.file && <FilePreview file={m.file} />}
                {m.role === "ai" && m.streaming && m.text === "" ? (
                  <TypingDots />
                ) : (
                  <div className={m.streaming ? "stream-cursor" : ""}>
                    <BubbleContent text={m.text} />
                  </div>
                )}
              </div>
            </div>
          ))}

          <div ref={anchorRef} style={{ height: 1 }} />
        </div>

        {/* Input area */}
        <div style={{ padding: "12px 16px 18px", background: "rgba(7,7,17,0.95)", borderTop: "1px solid rgba(0,100,255,0.1)", backdropFilter: "blur(24px)" }}>

          {/* File preview strip */}
          {attachedFile && (
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10, padding: "8px 12px", background: "#0e0e1e", border: "1px solid rgba(0,150,255,0.25)", borderRadius: 12, animation: "fadeUp 0.2s ease forwards" }}>
              <span style={{ fontSize: 20 }}>{getFileIcon(attachedFile.type)}</span>
              {attachedFile.type.startsWith("image/") && (
                <img src={attachedFile.dataUrl} alt="" style={{ height: 40, width: 40, objectFit: "cover", borderRadius: 6, border: "1px solid rgba(0,150,255,0.2)" }} />
              )}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12, color: "#a0c4ff", fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{attachedFile.name}</div>
                <div style={{ fontSize: 11, color: "#445577" }}>{formatFileSize(attachedFile.size)}</div>
              </div>
              <button onClick={() => setAttachedFile(null)} style={{ background: "none", border: "none", color: "#4466aa", cursor: "pointer", fontSize: 18, lineHeight: 1, padding: "2px 4px", borderRadius: 6, transition: "all 0.2s" }}>×</button>
            </div>
          )}

          <div style={{ display: "flex", alignItems: "flex-end", gap: 8, background: "#0e0e1e", border: `1px solid ${canSend ? "rgba(0,150,255,0.45)" : "rgba(0,100,255,0.12)"}`, borderRadius: 16, padding: "10px 10px 10px 8px", boxShadow: canSend ? "0 0 0 3px rgba(0,100,255,0.08)" : "none", transition: "all 0.2s" }}>

            {/* File attach button */}
            <input ref={fileInputRef} type="file" accept="image/*,application/pdf,text/*,application/json,.jsx,.tsx,.ts,.js,.py,.rb,.php,.java,.go,.rs,.cpp,.c,.cs,.swift,.kt,.sh,.md,.yaml,.yml,.sql,.xml,.toml,.env,.csv" onChange={handleFileInput} style={{ display: "none" }} />
            <button
              className="attach-btn"
              onClick={() => fileInputRef.current?.click()}
              title="Прикрепить файл"
              style={{ width: 36, height: 36, flexShrink: 0, background: attachedFile ? "rgba(0,150,255,0.15)" : "rgba(0,60,120,0.1)", border: `1px solid ${attachedFile ? "rgba(0,150,255,0.4)" : "rgba(0,100,255,0.15)"}`, borderRadius: 10, color: attachedFile ? "#80c8ff" : "#445588", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.2s", fontSize: 17 }}
            >
              📎
            </button>

            <textarea
              ref={textareaRef}
              rows={1}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKey}
              placeholder={attachedFile ? "Напишите вопрос к файлу..." : "Напишите сообщение..."}
              style={{ maxHeight: 130, overflowY: "auto" }}
              onInput={e => { e.target.style.height = "auto"; e.target.style.height = Math.min(e.target.scrollHeight, 130) + "px"; }}
            />

            {/* Stop button during generation */}
            {isTyping ? (
              <button
                className="stop-btn"
                onClick={stopGeneration}
                title="Остановить"
                style={{ width: 38, height: 38, flexShrink: 0, background: "rgba(255,50,50,0.1)", border: "1px solid rgba(255,80,80,0.3)", borderRadius: 11, color: "#ff6666", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.2s", fontSize: 16 }}
              >
                ⏹
              </button>
            ) : (
              <button
                className="send-btn"
                onClick={() => sendMessage()}
                disabled={!canSend}
                style={{ width: 38, height: 38, flexShrink: 0, background: canSend ? "linear-gradient(135deg,#0044cc,#0088ff)" : "rgba(0,50,120,0.2)", border: "none", borderRadius: 11, color: canSend ? "#fff" : "#1a2a55", cursor: !canSend ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: canSend ? "0 0 14px rgba(0,150,255,0.35)" : "none", transition: "all 0.2s" }}
              >
                <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
                  <line x1="22" y1="2" x2="11" y2="13" />
                  <polygon points="22 2 15 22 11 13 2 9 22 2" />
                </svg>
              </button>
            )}
          </div>

          <div style={{ textAlign: "center", fontSize: 11, color: "#1a2a55", marginTop: 8, letterSpacing: 0.5 }}>
            Enter — отправить · Shift+Enter — строка · 📎 — файл · Перетащи файл в окно
          </div>
        </div>
      </div>
    </div>
  );
}
