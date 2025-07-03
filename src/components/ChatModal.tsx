import { useState, useEffect, useRef } from "react";
import { ref, push, onValue, off, get } from "firebase/database";
import { realtimeDb } from "../services/firebase";
import { useAuth } from "../contexts/AuthContext";
import { disableBodyScroll, enableBodyScroll, clearAllBodyScrollLocks } from 'body-scroll-lock';

interface Message {
  id: string;
  sender: string;
  text: string;
  timestamp: number;
  isIncident?: boolean;
}

interface ChatModalProps {
  open: boolean;
  onClose: () => void;
}

const CHAT_PATH = "/chats/global";

const ChatModal = ({ open, onClose }: ChatModalProps) => {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState("");
  const [isIncident, setIsIncident] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [officerName, setOfficerName] = useState<string>("");
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const modalRef = useRef<HTMLDivElement | null>(null);
  const chatListRef = useRef<HTMLDivElement | null>(null);
  const overlayRef = useRef<HTMLDivElement | null>(null);

  // Prevent body scroll and trap touch events when modal is open
  useEffect(() => {
    if (open && overlayRef.current) {
      disableBodyScroll(overlayRef.current, {
        reserveScrollBarGap: true,
        allowTouchMove: (el) => !!(chatListRef.current && chatListRef.current.contains(el)),
      });
    } else if (overlayRef.current) {
      enableBodyScroll(overlayRef.current);
    }
    return () => {
      clearAllBodyScrollLocks();
    };
  }, [open]);

  // Fetch officer name on mount
  useEffect(() => {
    if (!user) return;
    const userRef = ref(realtimeDb, `users/${user.uid}`);
    get(userRef)
      .then((snapshot) => {
        if (snapshot.exists()) {
          setOfficerName(snapshot.val().name || user.email || "Officer");
        } else {
          setOfficerName(user.email || "Officer");
        }
      })
      .catch(() => setOfficerName(user?.email || "Officer"));
  }, [user]);

  // Listen for messages
  useEffect(() => {
    if (!open) return;
    setLoading(true);
    setError(null);
    const chatRef = ref(realtimeDb, CHAT_PATH);
    const handleValue = (snapshot: any) => {
      const data = snapshot.val();
      if (!data) {
        setMessages([]);
        setLoading(false);
        return;
      }
      // Convert to array and sort by timestamp
      const arr: Message[] = Object.entries(data).map(([id, msg]: any) => ({
        id,
        ...msg,
      }));
      arr.sort((a, b) => a.timestamp - b.timestamp);
      setMessages(arr);
      setLoading(false);
    };
    onValue(chatRef, handleValue);
    return () => off(chatRef, "value", handleValue);
  }, [open]);

  // Scroll to bottom on new messages
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, open]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim() || !user) return;
    setError(null);
    try {
      const chatRef = ref(realtimeDb, CHAT_PATH);
      await push(chatRef, {
        sender: officerName,
        senderUid: user.uid,
        text,
        timestamp: Date.now(),
        isIncident,
      });
      setText("");
      setIsIncident(false);
    } catch (err) {
      setError("Failed to send message.");
    }
  };

  if (!open) return null;

  return (
    <div ref={overlayRef} className="fixed inset-0 z-[10020] flex items-center justify-center bg-black bg-opacity-40">
      <div ref={modalRef} className="bg-white dark:bg-gray-800 rounded-xl shadow-lg w-full max-w-md flex flex-col h-[70vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-2 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
          <span className="font-bold text-gray-900 dark:text-white text-lg">Officer Chat</span>
          <button onClick={onClose} className="text-gray-500 hover:text-red-500 text-xl">×</button>
        </div>
        {/* Chat List */}
        <div
          ref={chatListRef}
          className="flex-1 min-h-0 max-h-full overflow-y-auto px-4 py-2 space-y-2 bg-gray-50 dark:bg-gray-900 scrollbar-thin scrollbar-thumb-gray-300"
          style={{ WebkitOverflowScrolling: 'touch' }}
        >
          {loading ? (
            <div className="text-center text-gray-400 mt-8">Loading messages...</div>
          ) : error ? (
            <div className="text-center text-red-500 mt-8">{error}</div>
          ) : messages.length === 0 ? (
            <div className="text-center text-gray-400 mt-8">No messages yet.</div>
          ) : (
            messages.map(msg => (
              <div key={msg.id} className={`rounded px-2 py-1 text-sm ${msg.isIncident ? 'bg-yellow-100 dark:bg-yellow-900/30 border-l-4 border-yellow-500' : 'bg-white dark:bg-gray-700'}`}>
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="font-semibold text-xs text-blue-600 dark:text-blue-400">{msg.sender}</span>
                  <span className="text-[10px] text-gray-400">{new Date(msg.timestamp).toLocaleTimeString()}</span>
                  {msg.isIncident && <span className="ml-1 text-[10px] font-bold text-yellow-700 dark:text-yellow-300">INCIDENT</span>}
                </div>
                <div className="text-gray-800 dark:text-gray-100 text-xs whitespace-pre-line">{msg.text}</div>
              </div>
            ))
          )}
          <div ref={messagesEndRef} />
        </div>
        {/* Footer/Input */}
        <form onSubmit={handleSend} className="p-3 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 flex flex-col gap-2 flex-shrink-0">
          <textarea
            className="w-full p-2 rounded border focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs resize-none min-h-[48px]"
            placeholder="Type a message..."
            value={text}
            onChange={e => setText(e.target.value)}
            required
            disabled={loading}
          />
          <div className="flex items-center gap-2 justify-between">
            <label className="flex items-center gap-1 text-xs cursor-pointer">
              <input type="checkbox" checked={isIncident} onChange={e => setIsIncident(e.target.checked)} disabled={loading} />
              Report as Incident
            </label>
            <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-4 py-1 rounded transition" disabled={loading || !text.trim()}>Send</button>
          </div>
          {error && <div className="text-xs text-red-500 text-center mt-1">{error}</div>}
        </form>
      </div>
    </div>
  );
};

export default ChatModal; 