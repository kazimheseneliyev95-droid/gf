import React, { useState, useEffect, useRef } from 'react';
import { Send, X, Check, CheckCheck } from 'lucide-react';
import { JobMessage, MESSAGE_STORAGE_KEY } from '../types';
import { getUserOnlineStatus } from '../utils/auth';
import { sendMessage, markConversationAsRead } from '../utils/chatManager';

interface ChatPanelProps {
  isOpen: boolean;
  onClose: () => void;
  jobId: string;
  currentUsername: string;
  otherUsername: string;
  currentUserRole: 'employer' | 'worker';
  jobTitle: string;
}

export default function ChatPanel({ 
  isOpen, 
  onClose, 
  jobId, 
  currentUsername, 
  otherUsername, 
  currentUserRole, 
  jobTitle 
}: ChatPanelProps) {
  const [messages, setMessages] = useState<JobMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [otherUserStatus, setOtherUserStatus] = useState<{ isOnline: boolean, lastSeen: string | null }>({ isOnline: false, lastSeen: null });
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // 1. Poll for Messages & Online Status
  useEffect(() => {
    if (!isOpen) return;

    const fetchData = () => {
      // Load Messages
      const allMsgsStr = localStorage.getItem(MESSAGE_STORAGE_KEY);
      if (allMsgsStr) {
        const allMsgs: JobMessage[] = JSON.parse(allMsgsStr);
        // Filter for this specific pair
        const jobMsgs = allMsgs.filter(m => 
          m.jobId === jobId && 
          (m.senderUsername === currentUsername || m.senderUsername === otherUsername)
        );
        jobMsgs.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
        setMessages(jobMsgs);
      }

      // Check Online Status
      setOtherUserStatus(getUserOnlineStatus(otherUsername));
    };

    fetchData();
    // Mark read immediately on open
    const employer = currentUserRole === 'employer' ? currentUsername : otherUsername;
    const worker = currentUserRole === 'worker' ? currentUsername : otherUsername;
    markConversationAsRead(jobId, employer, worker, currentUserRole);

    const interval = setInterval(fetchData, 2000); // Fast polling for "Real-time" feel

    return () => clearInterval(interval);
  }, [isOpen, jobId, otherUsername, currentUsername, currentUserRole]);

  // Scroll to bottom on new messages
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    }
  }, [messages.length, isOpen]);

  // Mark read when window is focused/active
  useEffect(() => {
    if (isOpen && messages.length > 0) {
      const employer = currentUserRole === 'employer' ? currentUsername : otherUsername;
      const worker = currentUserRole === 'worker' ? currentUsername : otherUsername;
      markConversationAsRead(jobId, employer, worker, currentUserRole);
    }
  }, [messages.length, isOpen, jobId, currentUserRole]);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    // Use Manager to send (updates conversation metadata)
    const msg = sendMessage(
      jobId,
      currentUserRole,
      currentUsername,
      otherUsername,
      newMessage.trim(),
      jobTitle
    );

    setMessages([...messages, msg]);
    setNewMessage('');
  };

  const formatLastSeen = (dateStr: string) => {
    const date = new Date(dateStr);
    const diffMins = Math.floor((new Date().getTime() - date.getTime()) / 60000);
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${Math.floor(diffHours / 24)}d ago`;
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-[60] backdrop-blur-sm" onClick={onClose} />
      
      <div className="fixed bottom-0 right-0 sm:bottom-6 sm:right-6 z-[70] bg-white w-full sm:w-96 h-[85vh] sm:h-[500px] sm:rounded-2xl shadow-2xl flex flex-col animate-in slide-in-from-bottom-4 border border-gray-200">
        
        {/* Header */}
        <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-purple-600 text-white sm:rounded-t-2xl shadow-sm">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="w-10 h-10 bg-purple-500 rounded-full flex items-center justify-center text-sm font-bold border-2 border-purple-400">
                {otherUsername.substring(0, 2).toUpperCase()}
              </div>
              {otherUserStatus.isOnline && (
                <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-400 border-2 border-purple-600 rounded-full"></div>
              )}
            </div>
            <div>
              <h3 className="font-bold text-base leading-tight">{otherUsername}</h3>
              <div className="flex items-center gap-1 text-xs text-purple-200">
                {otherUserStatus.isOnline ? (
                  <span className="text-green-300 font-bold flex items-center gap-1">● Online</span>
                ) : (
                  <span>Last seen {otherUserStatus.lastSeen ? formatLastSeen(otherUserStatus.lastSeen) : 'recently'}</span>
                )}
              </div>
            </div>
          </div>
          <button onClick={onClose} className="text-purple-100 hover:text-white hover:bg-purple-500 p-2 rounded-full transition-colors">
            <X size={20} />
          </button>
        </div>
        
        {/* Job Context Bar */}
        <div className="px-4 py-2 bg-purple-50 border-b border-purple-100 text-xs text-purple-900 font-medium flex items-center gap-2">
          <span className="bg-purple-200 text-purple-800 px-1.5 py-0.5 rounded text-[10px] uppercase font-bold">Job</span>
          <span className="truncate">{jobTitle}</span>
        </div>

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
          {messages.map((msg, index) => {
            const isMe = msg.senderUsername === currentUsername;
            const isSeen = currentUserRole === 'employer' ? msg.isReadByWorker : msg.isReadByEmployer;
            const showDate = index === 0 || new Date(msg.createdAt).getDate() !== new Date(messages[index-1].createdAt).getDate();

            return (
              <div key={msg.id}>
                {showDate && (
                  <div className="flex justify-center mb-4">
                    <span className="text-[10px] bg-gray-200 text-gray-600 px-2 py-1 rounded-full font-medium">
                      {new Date(msg.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                )}
                <div className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                  <div className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm shadow-sm ${
                    isMe 
                      ? 'bg-purple-600 text-white rounded-br-none' 
                      : 'bg-white border border-gray-200 text-gray-800 rounded-bl-none'
                  }`}>
                    <p className="leading-relaxed whitespace-pre-wrap">{msg.text}</p>
                  </div>
                  <div className="flex items-center gap-1 mt-1 px-1">
                    <span className="text-[10px] text-gray-400">
                      {new Date(msg.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                    </span>
                    {isMe && (
                      <span className={isSeen ? "text-blue-500" : "text-gray-300"}>
                        {isSeen ? <CheckCheck size={12} /> : <Check size={12} />}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <form onSubmit={handleSend} className="p-3 border-t border-gray-100 bg-white sm:rounded-b-2xl">
          <div className="flex gap-2 items-center">
            <input
              type="text"
              value={newMessage}
              onChange={e => setNewMessage(e.target.value)}
              placeholder="Type a message..."
              className="flex-1 bg-gray-100 border-0 rounded-full px-4 py-3 text-sm focus:ring-2 focus:ring-purple-500 outline-none transition-all"
            />
            <button 
              type="submit"
              disabled={!newMessage.trim()}
              className="bg-purple-600 hover:bg-purple-700 text-white p-3 rounded-full transition-transform active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed shadow-md"
            >
              <Send size={18} />
            </button>
          </div>
        </form>
      </div>
    </>
  );
}
