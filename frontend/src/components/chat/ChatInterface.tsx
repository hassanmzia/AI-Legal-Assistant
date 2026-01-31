import React, { useState, useEffect, useRef } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import {
  FiSend,
  FiPlus,
  FiTrash2,
  FiMessageSquare,
  FiTool,
  FiLoader,
} from 'react-icons/fi';
import ReactMarkdown from 'react-markdown';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import chatService from '../../services/chat';
import { ChatSession, ChatMessage } from '../../types';
import LoadingSpinner from '../common/LoadingSpinner';
import EmptyState from '../common/EmptyState';

const ChatInterface: React.FC = () => {
  const { sessionId } = useParams<{ sessionId: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const caseId = searchParams.get('case_id');

  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeSession, setActiveSession] = useState<string | null>(sessionId || null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [loadingSessions, setLoadingSessions] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Load sessions
  useEffect(() => {
    const loadSessions = async () => {
      try {
        const data = await chatService.listSessions();
        setSessions(data.results || []);
      } catch {
        // ignore
      }
      setLoadingSessions(false);
    };
    loadSessions();
  }, []);

  // Load messages when session changes
  useEffect(() => {
    if (!activeSession) return;
    const loadMessages = async () => {
      setLoadingMessages(true);
      try {
        const msgs = await chatService.getMessages(activeSession);
        setMessages(msgs);
      } catch {
        toast.error('Failed to load messages');
      }
      setLoadingMessages(false);
    };
    loadMessages();
  }, [activeSession]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const createNewSession = async () => {
    try {
      const session = await chatService.createSession({
        title: caseId ? `Case Discussion` : 'New Chat',
        case_id: caseId || undefined,
      });
      setSessions((prev) => [session, ...prev]);
      setActiveSession(session.id);
      setMessages([]);
      navigate(`/chat/${session.id}`);
    } catch {
      toast.error('Failed to create chat session');
    }
  };

  const deleteSession = async (id: string) => {
    try {
      await chatService.deleteSession(id);
      setSessions((prev) => prev.filter((s) => s.id !== id));
      if (activeSession === id) {
        setActiveSession(null);
        setMessages([]);
        navigate('/chat');
      }
      toast.success('Session deleted');
    } catch {
      toast.error('Failed to delete session');
    }
  };

  const sendMessage = async () => {
    if (!input.trim() || sending) return;

    if (!activeSession) {
      await createNewSession();
    }

    const currentSession = activeSession;
    if (!currentSession) return;

    const userMessage: ChatMessage = {
      id: `temp-${Date.now()}`,
      session: currentSession,
      role: 'user',
      content: input.trim(),
      tool_calls: [],
      metadata: {},
      created_at: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setSending(true);

    try {
      const response = await chatService.sendMessage(currentSession, input.trim());
      setMessages((prev) => {
        const filtered = prev.filter((m) => m.id !== userMessage.id);
        // The API may return the user message and assistant message
        if (Array.isArray(response)) {
          return [...filtered, ...response];
        }
        return [...filtered, userMessage, response];
      });
    } catch {
      toast.error('Failed to send message');
    }
    setSending(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="flex h-[calc(100vh-7rem)] -m-6">
      {/* Sessions Sidebar */}
      <div className="w-72 bg-white border-r border-gray-200 flex flex-col">
        <div className="p-4 border-b border-gray-200">
          <button
            onClick={createNewSession}
            className="btn-primary w-full flex items-center justify-center gap-2"
          >
            <FiPlus size={16} />
            New Chat
          </button>
        </div>
        <div className="flex-1 overflow-y-auto">
          {loadingSessions ? (
            <LoadingSpinner size="sm" className="py-8" />
          ) : sessions.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-8">No conversations yet</p>
          ) : (
            <div className="p-2 space-y-1">
              {sessions.map((session) => (
                <div
                  key={session.id}
                  className={`flex items-center gap-2 px-3 py-2.5 rounded-lg cursor-pointer group transition-colors ${
                    activeSession === session.id
                      ? 'bg-primary-50 text-primary-700'
                      : 'hover:bg-gray-50 text-gray-700'
                  }`}
                  onClick={() => {
                    setActiveSession(session.id);
                    navigate(`/chat/${session.id}`);
                  }}
                >
                  <FiMessageSquare size={16} className="flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{session.title}</p>
                    <p className="text-xs text-gray-400">
                      {format(new Date(session.updated_at), 'MMM d, HH:mm')}
                    </p>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteSession(session.id);
                    }}
                    className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-red-500 transition-all"
                  >
                    <FiTrash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 flex flex-col bg-gray-50">
        {!activeSession ? (
          <div className="flex-1 flex items-center justify-center">
            <EmptyState
              icon={<FiMessageSquare size={48} />}
              title="Start a conversation"
              description="Create a new chat or select an existing one to begin."
              action={
                <button onClick={createNewSession} className="btn-primary">
                  New Chat
                </button>
              }
            />
          </div>
        ) : (
          <>
            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {loadingMessages ? (
                <LoadingSpinner size="md" text="Loading messages..." className="py-8" />
              ) : messages.length === 0 ? (
                <div className="text-center py-16">
                  <FiMessageSquare className="mx-auto text-gray-300 mb-3" size={40} />
                  <p className="text-gray-400">Send a message to start the conversation.</p>
                </div>
              ) : (
                messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    {msg.role === 'tool' ? (
                      <div className="max-w-[80%] bg-gray-100 border border-gray-200 rounded-lg px-4 py-3 text-xs">
                        <div className="flex items-center gap-2 text-gray-500 mb-1">
                          <FiTool size={12} />
                          <span className="font-medium">Tool Response</span>
                        </div>
                        <pre className="text-gray-600 whitespace-pre-wrap overflow-x-auto">
                          {msg.content}
                        </pre>
                      </div>
                    ) : (
                      <div
                        className={
                          msg.role === 'user' ? 'chat-bubble-user' : 'chat-bubble-assistant'
                        }
                      >
                        {msg.role === 'assistant' ? (
                          <div className="prose prose-sm max-w-none">
                            <ReactMarkdown>{msg.content}</ReactMarkdown>
                          </div>
                        ) : (
                          <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                        )}

                        {/* Tool Calls */}
                        {msg.tool_calls?.length > 0 && (
                          <div className="mt-3 pt-3 border-t border-gray-200 space-y-2">
                            {msg.tool_calls.map((tc: any, i: number) => (
                              <div
                                key={i}
                                className="flex items-center gap-2 text-xs text-gray-500 bg-gray-50 rounded px-2 py-1"
                              >
                                <FiTool size={10} />
                                <span className="font-mono">
                                  {tc.function?.name || tc.name || 'tool_call'}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}

                        <p className="text-xs opacity-50 mt-2">
                          {format(new Date(msg.created_at), 'HH:mm')}
                        </p>
                      </div>
                    )}
                  </div>
                ))
              )}

              {sending && (
                <div className="flex justify-start">
                  <div className="chat-bubble-assistant flex items-center gap-2">
                    <FiLoader className="animate-spin" size={14} />
                    <span className="text-sm text-gray-500">Thinking...</span>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="border-t border-gray-200 bg-white p-4">
              <div className="flex items-end gap-3 max-w-4xl mx-auto">
                <textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Type your legal question..."
                  className="input-field resize-none"
                  rows={1}
                  style={{ minHeight: '44px', maxHeight: '120px' }}
                />
                <button
                  onClick={sendMessage}
                  disabled={!input.trim() || sending}
                  className="btn-primary px-4 py-2.5 disabled:opacity-50 flex-shrink-0"
                >
                  <FiSend size={18} />
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default ChatInterface;
