import { useState, useEffect, useRef, useCallback } from "react";

type MessageType = "message" | "join" | "leave";

interface ChatMessage {
  type: MessageType;
  room_id: string;
  username: string;
  text: string;
  timestamp: string;
}

const ROOMS = ["general", "random", "dev"];

const formatTime = (iso: string) => {
  try {
    return new Date(iso).toLocaleTimeString("ru-RU", {
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "";
  }
};

export default function ChatApp() {
  const [username, setUsername] = useState("");
  const [enteredName, setEnteredName] = useState("");
  const [room, setRoom] = useState("general");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [connected, setConnected] = useState(false);
  const [connecting, setConnecting] = useState(false);

  const wsRef = useRef<WebSocket | null>(null);
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const disconnect = useCallback(() => {
    wsRef.current?.close();
    wsRef.current = null;
    setConnected(false);
    setMessages([]);
  }, []);

  const connect = useCallback(
    (targetRoom: string) => {
      disconnect();
      setConnecting(true);
      setMessages([]);

      const ws = new WebSocket(
        `ws://localhost:8000/ws/${targetRoom}?username=${encodeURIComponent(enteredName)}`
      );
      wsRef.current = ws;

      ws.onopen = () => {
        setConnected(true);
        setConnecting(false);
      };

      ws.onmessage = (e) => {
        try {
          const msg: ChatMessage = JSON.parse(e.data);
          setMessages((prev) => [...prev, msg]);
        } catch {
          /* ignore malformed */
        }
      };

      ws.onclose = () => {
        setConnected(false);
        setConnecting(false);
      };

      ws.onerror = () => {
        setConnected(false);
        setConnecting(false);
      };
    },
    [enteredName, disconnect]
  );

  // scroll to bottom on new message
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // cleanup on unmount
  useEffect(() => () => disconnect(), [disconnect]);

  const handleEnter = () => {
    const name = username.trim();
    if (!name) return;
    setEnteredName(name);
    connect("general");
  };

  const switchRoom = (newRoom: string) => {
    setRoom(newRoom);
    connect(newRoom);
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  const sendMessage = () => {
    const text = input.trim();
    if (!text || !wsRef.current || wsRef.current.readyState !== WebSocket.OPEN)
      return;
    wsRef.current.send(JSON.stringify({ text }));
    setInput("");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") sendMessage();
  };

  // ── Login screen ──────────────────────────────────────────────
  if (!enteredName) {
    return (
      <div style={styles.loginWrap}>
        <div style={styles.loginBox}>
          <div style={styles.loginLogo}>⬡</div>
          <h1 style={styles.loginTitle}>HEXCHAT</h1>
          <p style={styles.loginSub}>real-time rooms</p>
          <input
            style={styles.loginInput}
            placeholder="your username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleEnter()}
            autoFocus
          />
          <button style={styles.loginBtn} onClick={handleEnter}>
            enter →
          </button>
        </div>
      </div>
    );
  }

  // ── Chat screen ───────────────────────────────────────────────
  return (
    <div style={styles.app}>
      {/* sidebar */}
      <aside style={styles.sidebar}>
        <div style={styles.sidebarLogo}>⬡ HEXCHAT</div>

        <div style={styles.sidebarSection}>ROOMS</div>
        {ROOMS.map((r) => (
          <button
            key={r}
            style={{
              ...styles.roomBtn,
              ...(r === room ? styles.roomBtnActive : {}),
            }}
            onClick={() => switchRoom(r)}
          >
            # {r}
          </button>
        ))}

        <div style={styles.sidebarBottom}>
          <div style={styles.userChip}>
            <span style={styles.dot(connected)} />
            {enteredName}
          </div>
          <button style={styles.leaveBtn} onClick={disconnect}>
            disconnect
          </button>
        </div>
      </aside>

      {/* main */}
      <main style={styles.main}>
        {/* header */}
        <header style={styles.header}>
          <span style={styles.headerRoom}># {room}</span>
          <span style={styles.statusBadge(connected, connecting)}>
            {connecting ? "connecting…" : connected ? "live" : "offline"}
          </span>
        </header>

        {/* messages */}
        <div style={styles.messages}>
          {messages.length === 0 && (
            <div style={styles.empty}>no messages yet — say something</div>
          )}
          {messages.map((m, i) => {
            if (m.type === "join" || m.type === "leave") {
              return (
                <div key={i} style={styles.systemMsg}>
                  {m.type === "join" ? "→" : "←"} {m.username}{" "}
                  {m.type === "join" ? "joined" : "left"}
                  <span style={styles.ts}>{formatTime(m.timestamp)}</span>
                </div>
              );
            }
            const isMe = m.username === enteredName;
            return (
              <div
                key={i}
                style={{ ...styles.msgRow, ...(isMe ? styles.msgRowMe : {}) }}
              >
                {!isMe && <div style={styles.avatar}>{m.username[0].toUpperCase()}</div>}
                <div style={isMe ? styles.bubbleMe : styles.bubble}>
                  {!isMe && <div style={styles.msgAuthor}>{m.username}</div>}
                  <div>{m.text}</div>
                  <div style={styles.msgTs}>{formatTime(m.timestamp)}</div>
                </div>
              </div>
            );
          })}
          <div ref={bottomRef} />
        </div>

        {/* input */}
        <div style={styles.inputBar}>
          <input
            ref={inputRef}
            style={styles.textInput}
            placeholder={connected ? `message #${room}` : "not connected"}
            value={input}
            disabled={!connected}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
          />
          <button
            style={styles.sendBtn(connected && input.trim().length > 0)}
            onClick={sendMessage}
            disabled={!connected || !input.trim()}
          >
            send
          </button>
        </div>
      </main>
    </div>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const C = {
  bg: "#0e0e11",
  surface: "#17171c",
  border: "#2a2a35",
  accent: "#c8f135",       // sharp lime
  accentDim: "#8aaa1f",
  text: "#e8e8f0",
  muted: "#6b6b80",
  danger: "#ff5f5f",
  bubbleBg: "#1f1f28",
  bubbleMeBg: "#c8f135",
  bubbleMeText: "#0e0e11",
};

const styles: Record<string, React.CSSProperties> = {
  // login
  loginWrap: {
    minHeight: "100vh",
    background: C.bg,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
  },
  loginBox: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 12,
    padding: "48px 40px",
    background: C.surface,
    border: `1px solid ${C.border}`,
    borderRadius: 2,
    width: 320,
  },
  loginLogo: {
    fontSize: 40,
    color: C.accent,
    lineHeight: 1,
  },
  loginTitle: {
    margin: 0,
    fontSize: 28,
    fontWeight: 800,
    letterSpacing: "0.15em",
    color: C.text,
  },
  loginSub: {
    margin: "0 0 12px",
    fontSize: 12,
    color: C.muted,
    letterSpacing: "0.1em",
  },
  loginInput: {
    width: "100%",
    padding: "10px 14px",
    background: C.bg,
    border: `1px solid ${C.border}`,
    borderRadius: 2,
    color: C.text,
    fontFamily: "inherit",
    fontSize: 14,
    outline: "none",
    boxSizing: "border-box",
  },
  loginBtn: {
    width: "100%",
    padding: "10px 14px",
    background: C.accent,
    border: "none",
    borderRadius: 2,
    color: C.bubbleMeText,
    fontFamily: "inherit",
    fontSize: 14,
    fontWeight: 700,
    letterSpacing: "0.05em",
    cursor: "pointer",
  },

  // app shell
  app: {
    display: "flex",
    height: "100vh",
    background: C.bg,
    fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
    color: C.text,
    fontSize: 13,
  },

  // sidebar
  sidebar: {
    width: 200,
    minWidth: 200,
    background: C.surface,
    borderRight: `1px solid ${C.border}`,
    display: "flex",
    flexDirection: "column",
    padding: "0",
  },
  sidebarLogo: {
    padding: "20px 16px 16px",
    fontSize: 13,
    fontWeight: 800,
    letterSpacing: "0.12em",
    color: C.accent,
    borderBottom: `1px solid ${C.border}`,
  },
  sidebarSection: {
    padding: "16px 16px 6px",
    fontSize: 10,
    letterSpacing: "0.15em",
    color: C.muted,
    fontWeight: 700,
  },
  roomBtn: {
    display: "block",
    width: "100%",
    padding: "8px 16px",
    background: "none",
    border: "none",
    color: C.muted,
    fontFamily: "inherit",
    fontSize: 13,
    textAlign: "left" as const,
    cursor: "pointer",
    letterSpacing: "0.02em",
  },
  roomBtnActive: {
    color: C.accent,
    background: "rgba(200,241,53,0.07)",
  },
  sidebarBottom: {
    marginTop: "auto",
    padding: "16px",
    borderTop: `1px solid ${C.border}`,
    display: "flex",
    flexDirection: "column",
    gap: 8,
  },
  userChip: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    fontSize: 12,
    color: C.text,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap" as const,
  },
  leaveBtn: {
    padding: "6px 10px",
    background: "none",
    border: `1px solid ${C.border}`,
    borderRadius: 2,
    color: C.muted,
    fontFamily: "inherit",
    fontSize: 11,
    cursor: "pointer",
    letterSpacing: "0.05em",
  },

  // main
  main: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    overflow: "hidden",
  },
  header: {
    padding: "16px 24px",
    borderBottom: `1px solid ${C.border}`,
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerRoom: {
    fontWeight: 700,
    fontSize: 15,
    letterSpacing: "0.05em",
  },

  // messages
  messages: {
    flex: 1,
    overflowY: "auto" as const,
    padding: "16px 24px",
    display: "flex",
    flexDirection: "column",
    gap: 4,
  },
  empty: {
    color: C.muted,
    textAlign: "center" as const,
    marginTop: 40,
    fontSize: 12,
    letterSpacing: "0.05em",
  },
  systemMsg: {
    color: C.muted,
    fontSize: 11,
    padding: "4px 0",
    letterSpacing: "0.04em",
    display: "flex",
    alignItems: "center",
    gap: 6,
  },
  ts: {
    marginLeft: "auto",
    fontSize: 10,
    color: C.muted,
    opacity: 0.6,
  },
  msgRow: {
    display: "flex",
    alignItems: "flex-end",
    gap: 8,
    marginBottom: 2,
  },
  msgRowMe: {
    flexDirection: "row-reverse" as const,
  },
  avatar: {
    width: 28,
    height: 28,
    borderRadius: 2,
    background: C.border,
    color: C.accent,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontWeight: 700,
    fontSize: 13,
    flexShrink: 0,
  },
  bubble: {
    maxWidth: "65%",
    background: C.bubbleBg,
    border: `1px solid ${C.border}`,
    borderRadius: 2,
    padding: "8px 12px",
    lineHeight: 1.5,
  },
  bubbleMe: {
    maxWidth: "65%",
    background: C.bubbleMeBg,
    color: C.bubbleMeText,
    borderRadius: 2,
    padding: "8px 12px",
    lineHeight: 1.5,
  },
  msgAuthor: {
    fontSize: 10,
    fontWeight: 700,
    color: C.accent,
    letterSpacing: "0.08em",
    marginBottom: 2,
  },
  msgTs: {
    fontSize: 10,
    opacity: 0.5,
    textAlign: "right" as const,
    marginTop: 4,
  },

  // input bar
  inputBar: {
    padding: "12px 24px",
    borderTop: `1px solid ${C.border}`,
    display: "flex",
    gap: 8,
  },
  textInput: {
    flex: 1,
    padding: "10px 14px",
    background: C.surface,
    border: `1px solid ${C.border}`,
    borderRadius: 2,
    color: C.text,
    fontFamily: "inherit",
    fontSize: 13,
    outline: "none",
  },
};

// dynamic styles as functions
const dot = (connected: boolean): React.CSSProperties => ({
  width: 7,
  height: 7,
  borderRadius: "50%",
  background: connected ? C.accent : C.muted,
  flexShrink: 0,
});

const statusBadge = (connected: boolean, connecting: boolean): React.CSSProperties => ({
  fontSize: 10,
  letterSpacing: "0.1em",
  fontWeight: 700,
  padding: "3px 8px",
  borderRadius: 2,
  border: `1px solid ${connecting ? C.muted : connected ? C.accent : C.danger}`,
  color: connecting ? C.muted : connected ? C.accent : C.danger,
  textTransform: "uppercase" as const,
});

const sendBtn = (active: boolean): React.CSSProperties => ({
  padding: "10px 18px",
  background: active ? C.accent : C.border,
  border: "none",
  borderRadius: 2,
  color: active ? C.bubbleMeText : C.muted,
  fontFamily: "inherit",
  fontSize: 13,
  fontWeight: 700,
  letterSpacing: "0.05em",
  cursor: active ? "pointer" : "default",
  transition: "background 0.15s",
});

// patch dynamic fns into styles object so TSX can use them
(styles as Record<string, unknown>).dot = dot;
(styles as Record<string, unknown>).statusBadge = statusBadge;
(styles as Record<string, unknown>).sendBtn = sendBtn;ChatApp.tsx