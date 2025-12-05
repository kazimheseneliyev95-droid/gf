import React, { useState, useEffect, useRef } from 'react';
import { Send, X, MessageSquare, Check, CheckCheck, Circle } from 'lucide-react';
import { JobMessage, MESSAGE_STORAGE_KEY } from '../types';
import { createNotification, getChatUnreadCount } from '../utils';
import { getUserOnlineStatus } from '../utils/auth';

interface ChatPanelProps {
  jobId: string;
  currentUsername: string;
  otherUsername: string;
  currentUserRole: 'employer' | 'worker';
  jobTitle: string;
  forceOpen?: boolean; 
}

export default function ChatPanel({ jobId, currentUsername, otherUsername, currentUserRole, jobTitle, forceOpen }: ChatPanelProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<JobMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [unreadCount, setUnreadCount] = useState(0);
  const [otherUserStatus, setOtherUserStatus] = useState<{ isOnline: boolean, lastSeen: string | null }>({ isOnline: false, lastSeen: null });
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (forceOpen) setIsOpen(true);
  }, [forceOpen]);

  const loadMessages = () => {
    const allMsgsStr = localStorage.getItem(MESSAGE_STORAGE_KEY);
    if (allMsgsStr) {
      const allMsgs: JobMessage[] = JSON.parse(allMsgsStr);
      const jobMsgs = allMsgs.filter(m => m.jobId === jobId);
      jobMsgs.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
      setMessages(jobMsgs);
    }
    setUnreadCount(getChatUnreadCount(currentUsername, currentUserRole, jobId));
  };

  const updatePartnerStatus = () => {
    setOtherUserStatus(getUserOnlineStatus(otherUsername));
  };

  const markAsRead = () => {
    const allMsgsStr = localStorage.getItem(MESSAGE_STORAGE_KEY);
    if (allMsgsStr) {
      let allMsgs: JobMessage[] = JSON.parse(allMsgsStr);
      let hasChanges = false;

      allMsgs = allMsgs.map(msg => {
        if (msg.jobId === jobId) {
          if (currentUserRole === 'employer' && !msg.isReadByEmployer && msg.from === 'worker') {
            hasChanges = true;
            return { ...msg, isReadByEmployer: true };
          }
          if (currentUserRole === 'worker' && !msg.isReadByWorker && msg.from === 'employer') {
            hasChanges = true;
            return { ...msg, isReadByWorker: true };
          }
        }
        return msg;
      });

      if (hasChanges) {
        localStorage.setItem(MESSAGE_STORAGE_KEY, JSON.stringify(allMsgs));
        loadMessages(); 
      }
    }
  };

  useEffect(() => {
    loadMessages();
    updatePartnerStatus();
    const interval = setInterval(() => {
      loadMessages();
      updatePartnerStatus();
    }, 3000);
    return () => clearInterval(interval);
  }, [jobId, currentUsername, otherUsername]);

  useEffect(() => {
    if (isOpen) {
      markAsRead();
      setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    }
  }, [isOpen, messages.length]);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    const msg: JobMessage = {
      id: crypto.randomUUID(),
      jobId,
      from: currentUserRole,
      senderUsername: currentUsername,
      text: newMessage.trim(),
      createdAt: new Date().toISOString(),
      isReadByEmployer: currentUserRole === 'employer',
      isReadByWorker: currentUserRole === 'worker'
    };

    const allMsgsStr = localStorage.getItem(MESSAGE_STORAGE_KEY);
    const allMsgs: JobMessage[] = allMsgsStr ? JSON.parse(allMsgsStr) : [];
    allMsgs.push(msg);
    localStorage.setItem(MESSAGE_STORAGE_KEY, JSON.stringify(allMsgs));

    setMessages([...messages, msg]);
    setNewMessage('');

    createNotification(otherUsername, 'newMessage', jobId, { senderName: currentUsername }, 'chat');
  };

  const groupedMessages: { [date: string]: JobMessage[] } = {};
  messages.forEach(msg => {
    const date = new Date(msg.createdAt).toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' });
    if (!groupedMessages[date]) groupedMessages[date] = [];
    groupedMessages[date].push(msg);
  });

  const formatLastSeen = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMins = Math.floor((now.getTime() - date.getTime()) / 60000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${Math.floor(diffHours / 24)}d ago`;
  };

  return (
    <>
      {/* Trigger Button - Always rendered in place */}
      <button
        onClick={() => setIsOpen(true)}
        className={`relative flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 rounded-lg transition-colors ${
          unreadCount > 0 
            ? 'bg-purple-100 text-purple-700 ring-1 ring-purple-300 animate-pulse' 
            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
        }`}
      >
        <MessageSquare size={16} /> 
        {unreadCount > 0 ? 'New Message' : 'Chat'}
        {unreadCount > 0 && (
          <span className="absolute -top-2 -right-2 bg-red-500 text-white text-[10px] font-bold w-5 h-5 flex items-center justify-center rounded-full shadow-sm border-2 border-white">
            {unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <>
          {/* Overlay */}
          <div 
            className="fixed inset-0 bg-black/50 z-40 backdrop-blur-sm"
            onClick={() => setIsOpen(false)}
          />
          
          {/* Chat Window */}
          <div className="fixed bottom-0 right-0 sm:bottom-6 sm:right-6 z-50 bg-white w-full sm:w-96 h-[500px] sm:rounded-2xl shadow-2xl flex flex-col animate-in slide-in-from-bottom-4 border border-gray-200">
            
            {/* Header */}
            <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-purple-600 text-white sm:rounded-t-2xl shadow-sm">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <div className="w-8 h-8 bg-purple-500 rounded-full flex items-center justify-center text-xs font-bold">
                    {otherUsername.substring(0, 2).toUpperCase()}
                  </div>
                  {otherUserStatus.isOnline && (
                    <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-400 border-2 border-purple-600 rounded-full"></div>
                  )}
                </div>
                <div>
                  <h3 className="font-bold text-sm flex items-center gap-2">
                    {otherUsername}
                    <span className="bg-purple-500 text-[10px] px-1.5 py-0.5 rounded-full text-white/90 uppercase font-semibold">
                      {currentUserRole === 'employer' ? 'Worker' : 'Employer'}
                    </span>
                  </h3>
                  <div className="flex items-center gap-1 text-xs text-purple-200">
                    {otherUserStatus.isOnline ? (
                      <span className="text-green-300 font-medium">Online</span>
                    ) : (
                      <span>Last seen {otherUserStatus.lastSeen ? formatLastSeen(otherUserStatus.lastSeen) : 'recently'}</span>
                    )}
                  </div>
                </div>
              </div>
              <button onClick={() => setIsOpen(false)} className="text-purple-100 hover:text-white transition-colors p-1 hover:bg-purple-500 rounded-full">
                <X size={20} />
              </button>
            </div>
            
            {/* Sub-header for Job Title */}
            <div className="px-4 py-2 bg-purple-50 border-b border-purple-100 text-xs text-purple-800 truncate font-medium">
              Job: {jobTitle}
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
              {messages.length === 0 ? (
                <div className="text-center text-gray-400 text-xs mt-10">
                  Start the conversation with {otherUsername} regarding this job.
                </div>
              ) : (
                Object.entries(groupedMessages).map(([date, msgs]) => (
                  <div key={date} className="space-y-3">
                    <div className="flex justify-center">
                      <span className="text-[10px] bg-gray-200 text-gray-500 px-2 py-0.5 rounded-full font-medium">
                        {date}
                      </span>
                    </div>
                    {msgs.map(msg => {
                      const isMe = msg.senderUsername === currentUsername;
                      const isSeen = currentUserRole === 'employer' ? msg.isReadByWorker : msg.isReadByEmployer;
                      
                      return (
                        <div key={msg.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                          <span className="text-[10px] text-gray-400 mb-1 px-1">
                            {isMe ? 'You' : `${msg.senderUsername} (${msg.from})`}
                          </span>
                          <div className={`max-w-[85%] rounded-2xl px-4 py-2 text-sm shadow-sm ${
                            isMe 
                              ? 'bg-purple-600 text-white rounded-br-none' 
                              : 'bg-white border border-gray-200 text-gray-800 rounded-bl-none'
                          }`}>
                            <p className="leading-relaxed">{msg.text}</p>
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
                      );
                    })}
                  </div>
                ))
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <form onSubmit={handleSend} className="p-3 border-t border-gray-100 bg-white sm:rounded-b-2xl">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newMessage}
                  onChange={e => setNewMessage(e.target.value)}
                  placeholder="Type a message..."
                  className="flex-1 bg-gray-50 border border-gray-200 rounded-full px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 transition-shadow"
                />
                <button 
                  type="submit"
                  disabled={!newMessage.trim()}
                  className="bg-purple-600 hover:bg-purple-700 text-white p-2 rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                >
                  <Send size={16} />
                </button>
              </div>
            </form>
          </div>
        </>
      )}
    </>
  );
}
