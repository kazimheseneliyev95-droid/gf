import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { ArrowLeft, MessageSquare, Search, User, Briefcase, CheckCheck, Send, MoreVertical, Phone, Video } from 'lucide-react';
import { Conversation, UserRole, JobMessage, MESSAGE_STORAGE_KEY, CONVERSATION_STORAGE_KEY } from './types';
import { getUserConversations, sendMessage, markConversationAsRead } from './utils/chatManager';
import { getUserOnlineStatus } from './utils/auth';

export default function Inbox() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [currentUser, setCurrentUser] = useState<{ username: string, role: UserRole } | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeChat, setActiveChat] = useState<Conversation | null>(null);
  
  // Chat State
  const [messages, setMessages] = useState<JobMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [otherUserStatus, setOtherUserStatus] = useState<{ isOnline: boolean, lastSeen: string | null }>({ isOnline: false, lastSeen: null });

  useEffect(() => {
    const sessionStr = localStorage.getItem('currentUser');
    if (!sessionStr) {
      navigate('/');
      return;
    }
    const user = JSON.parse(sessionStr);
    setCurrentUser(user);
    loadConversations(user.username, user.role);

    const interval = setInterval(() => {
      loadConversations(user.username, user.role);
      if (activeChat) loadMessages(activeChat);
    }, 2000); // Polling for updates

    return () => clearInterval(interval);
  }, [navigate, activeChat]);

  // Handle URL params for direct linking
  useEffect(() => {
    if (conversations.length > 0 && !activeChat) {
      const jobId = searchParams.get('jobId');
      if (jobId) {
        const target = conversations.find(c => c.jobId === jobId);
        if (target) setActiveChat(target);
      }
    }
  }, [conversations, searchParams]);

  const loadConversations = (username: string, role: UserRole) => {
    if (role === 'admin') return;
    const convs = getUserConversations(username, role as 'employer' | 'worker');
    setConversations(convs);
  };

  const loadMessages = (chat: Conversation) => {
    const allMsgsStr = localStorage.getItem(MESSAGE_STORAGE_KEY);
    if (allMsgsStr) {
      const allMsgs: JobMessage[] = JSON.parse(allMsgsStr);
      const jobMsgs = allMsgs.filter(m => 
        m.jobId === chat.jobId && 
        (m.senderUsername === chat.employerUsername || m.senderUsername === chat.workerUsername)
      );
      jobMsgs.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
      setMessages(jobMsgs);
    }
    
    // Update status
    const otherUser = currentUser?.role === 'employer' ? chat.workerUsername : chat.employerUsername;
    setOtherUserStatus(getUserOnlineStatus(otherUser));
  };

  const handleSelectChat = (chat: Conversation) => {
    setActiveChat(chat);
    loadMessages(chat);
    if (currentUser) {
      markConversationAsRead(chat.jobId, chat.employerUsername, chat.workerUsername, currentUser.role as 'employer' | 'worker');
    }
    setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'auto' }), 100);
  };

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !activeChat || !currentUser) return;

    const otherUser = currentUser.role === 'employer' ? activeChat.workerUsername : activeChat.employerUsername;

    const msg = sendMessage(
      activeChat.jobId,
      currentUser.role as 'employer' | 'worker',
      currentUser.username,
      otherUser,
      newMessage.trim(),
      activeChat.jobTitle
    );

    setMessages([...messages, msg]);
    setNewMessage('');
    setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
  };

  const filteredConversations = conversations.filter(c => {
    const otherUser = currentUser?.role === 'employer' ? c.workerUsername : c.employerUsername;
    return otherUser.toLowerCase().includes(searchTerm.toLowerCase()) || 
           c.jobTitle.toLowerCase().includes(searchTerm.toLowerCase());
  });

  if (!currentUser) return null;

  return (
    <div className="min-h-screen bg-gray-50 font-sans flex flex-col">
      {/* Navbar */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-20 flex-shrink-0">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link to={currentUser.role === 'employer' ? '/employer' : '/worker'} className="text-gray-500 hover:text-gray-900">
              <ArrowLeft size={20} />
            </Link>
            <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <MessageSquare className="text-purple-600" />
              Messages
            </h1>
          </div>
        </div>
      </div>

      <div className="flex-1 max-w-7xl mx-auto w-full p-4 h-[calc(100vh-64px)]">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden h-full flex">
          
          {/* LEFT PANEL: List */}
          <div className={`w-full md:w-80 lg:w-96 border-r border-gray-200 flex flex-col ${activeChat ? 'hidden md:flex' : 'flex'}`}>
            <div className="p-4 border-b border-gray-100 bg-gray-50/50">
              <div className="relative">
                <Search className="absolute left-3 top-2.5 text-gray-400" size={16} />
                <input 
                  type="text" 
                  placeholder="Search messages..." 
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 outline-none"
                />
              </div>
            </div>
            
            <div className="flex-1 overflow-y-auto">
              {filteredConversations.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <p>No messages found.</p>
                </div>
              ) : (
                filteredConversations.map(c => {
                  const isEmployer = currentUser.role === 'employer';
                  const otherUser = isEmployer ? c.workerUsername : c.employerUsername;
                  const unreadCount = isEmployer ? c.unreadCountForEmployer : c.unreadCountForWorker;
                  const isActive = activeChat?.id === c.id;

                  return (
                    <div 
                      key={c.id} 
                      onClick={() => handleSelectChat(c)}
                      className={`p-4 cursor-pointer transition-colors border-b border-gray-50 hover:bg-gray-50 ${isActive ? 'bg-purple-50 border-purple-100' : ''}`}
                    >
                      <div className="flex justify-between items-start mb-1">
                        <div className="flex items-center gap-2">
                          <div className="font-bold text-gray-900">{otherUser}</div>
                          {unreadCount > 0 && <div className="w-2 h-2 bg-red-500 rounded-full"></div>}
                        </div>
                        <span className="text-[10px] text-gray-400">{new Date(c.updatedAt).toLocaleDateString()}</span>
                      </div>
                      <div className="flex items-center gap-1 text-xs text-gray-500 mb-1">
                        <Briefcase size={10} /> <span className="truncate max-w-[150px]">{c.jobTitle}</span>
                        <span className={`px-1.5 py-0.5 rounded text-[9px] uppercase font-bold ${
                          c.jobStatus === 'completed' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'
                        }`}>{c.jobStatus}</span>
                      </div>
                      <p className={`text-sm truncate ${unreadCount > 0 ? 'font-semibold text-gray-800' : 'text-gray-500'}`}>
                        {c.lastMessage?.senderUsername === currentUser.username && <span className="text-gray-400 font-normal">You: </span>}
                        {c.lastMessage?.text}
                      </p>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* RIGHT PANEL: Chat Thread */}
          <div className={`flex-1 flex flex-col bg-white ${!activeChat ? 'hidden md:flex' : 'flex'}`}>
            {activeChat ? (
              <>
                {/* Chat Header */}
                <div className="p-4 border-b border-gray-200 flex justify-between items-center bg-white shadow-sm z-10">
                  <div className="flex items-center gap-3">
                    <button onClick={() => setActiveChat(null)} className="md:hidden text-gray-500">
                      <ArrowLeft size={20} />
                    </button>
                    <div className="relative">
                      <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center text-purple-700 font-bold border border-purple-200">
                        {(currentUser.role === 'employer' ? activeChat.workerUsername : activeChat.employerUsername).substring(0, 2).toUpperCase()}
                      </div>
                      {otherUserStatus.isOnline && (
                        <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white rounded-full"></div>
                      )}
                    </div>
                    <div>
                      <h3 className="font-bold text-gray-900 leading-tight">
                        {currentUser.role === 'employer' ? activeChat.workerUsername : activeChat.employerUsername}
                      </h3>
                      <div className="flex items-center gap-2 text-xs text-gray-500">
                        {otherUserStatus.isOnline ? <span className="text-green-600 font-bold">Online</span> : <span>Last seen recently</span>}
                        <span>•</span>
                        <Link to={`/employer?jobId=${activeChat.jobId}`} className="text-blue-600 hover:underline flex items-center gap-1">
                          <Briefcase size={10} /> {activeChat.jobTitle}
                        </Link>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button className="p-2 text-gray-400 hover:bg-gray-100 rounded-full"><Phone size={18} /></button>
                    <button className="p-2 text-gray-400 hover:bg-gray-100 rounded-full"><Video size={18} /></button>
                    <button className="p-2 text-gray-400 hover:bg-gray-100 rounded-full"><MoreVertical size={18} /></button>
                  </div>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
                  {messages.map((msg, index) => {
                    const isMe = msg.senderUsername === currentUser.username;
                    const showDate = index === 0 || new Date(msg.createdAt).getDate() !== new Date(messages[index-1].createdAt).getDate();
                    
                    return (
                      <div key={msg.id}>
                        {showDate && (
                          <div className="flex justify-center my-4">
                            <span className="text-[10px] bg-gray-200 text-gray-600 px-2 py-1 rounded-full font-medium">
                              {new Date(msg.createdAt).toLocaleDateString()}
                            </span>
                          </div>
                        )}
                        <div className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                          <div className={`max-w-[75%] rounded-2xl px-4 py-2 text-sm shadow-sm ${
                            isMe 
                              ? 'bg-purple-600 text-white rounded-br-none' 
                              : 'bg-white border border-gray-200 text-gray-800 rounded-bl-none'
                          }`}>
                            <p className="whitespace-pre-wrap leading-relaxed">{msg.text}</p>
                          </div>
                          <div className="flex items-center gap-1 mt-1 px-1">
                            <span className="text-[10px] text-gray-400">
                              {new Date(msg.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                            </span>
                            {isMe && (
                              <CheckCheck size={12} className={msg.isReadByWorker || msg.isReadByEmployer ? "text-blue-500" : "text-gray-300"} />
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  <div ref={messagesEndRef} />
                </div>

                {/* Input */}
                <form onSubmit={handleSend} className="p-4 bg-white border-t border-gray-200">
                  <div className="flex gap-2 items-center">
                    <input
                      type="text"
                      value={newMessage}
                      onChange={e => setNewMessage(e.target.value)}
                      placeholder="Type a message..."
                      className="flex-1 bg-gray-100 border-0 rounded-full px-4 py-3 text-sm focus:ring-2 focus:ring-purple-500 outline-none"
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
              </>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-gray-400 bg-gray-50">
                <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-sm mb-4">
                  <MessageSquare size={32} className="text-purple-200" />
                </div>
                <p className="text-lg font-medium text-gray-600">Select a conversation</p>
                <p className="text-sm">Choose a chat from the list to start messaging.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
