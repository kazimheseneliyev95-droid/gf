import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, MessageSquare, Search, User, Briefcase, Clock, CheckCircle, PlayCircle, Circle } from 'lucide-react';
import { Conversation, UserRole } from './types';
import { getUserConversations } from './utils/chatManager';
import ChatPanel from './components/ChatPanel';

export default function Inbox() {
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState<{ username: string, role: UserRole } | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeChat, setActiveChat] = useState<Conversation | null>(null);

  useEffect(() => {
    const sessionStr = localStorage.getItem('currentUser');
    if (!sessionStr) {
      navigate('/');
      return;
    }
    const user = JSON.parse(sessionStr);
    setCurrentUser(user);
    loadConversations(user.username, user.role);

    // Poll for updates
    const interval = setInterval(() => loadConversations(user.username, user.role), 3000);
    return () => clearInterval(interval);
  }, [navigate]);

  const loadConversations = (username: string, role: UserRole) => {
    if (role === 'admin') return; // Admin doesn't have inbox in this view
    const convs = getUserConversations(username, role as 'employer' | 'worker');
    setConversations(convs);
  };

  const filteredConversations = conversations.filter(c => {
    const otherUser = currentUser?.role === 'employer' ? c.workerUsername : c.employerUsername;
    return otherUser.toLowerCase().includes(searchTerm.toLowerCase()) || 
           c.jobTitle.toLowerCase().includes(searchTerm.toLowerCase());
  });

  if (!currentUser) return null;

  return (
    <div className="min-h-screen bg-gray-50 font-sans">
      {/* Navbar */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-20">
        <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between">
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

      <div className="max-w-4xl mx-auto p-4">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden min-h-[500px]">
          
          {/* Search Bar */}
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

          {/* List */}
          <div className="divide-y divide-gray-100">
            {filteredConversations.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <MessageSquare size={48} className="mx-auto text-gray-300 mb-3" />
                <p>No messages yet.</p>
              </div>
            ) : (
              filteredConversations.map(c => {
                const isEmployer = currentUser.role === 'employer';
                const otherUser = isEmployer ? c.workerUsername : c.employerUsername;
                const unreadCount = isEmployer ? c.unreadCountForEmployer : c.unreadCountForWorker;
                const lastMsg = c.lastMessage;

                return (
                  <div 
                    key={c.id} 
                    onClick={() => setActiveChat(c)}
                    className={`p-4 hover:bg-purple-50 cursor-pointer transition-colors flex gap-4 ${unreadCount > 0 ? 'bg-blue-50/30' : ''}`}
                  >
                    {/* Avatar */}
                    <div className="relative flex-shrink-0">
                      <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center text-gray-500 font-bold border border-gray-300">
                        {otherUser.substring(0, 2).toUpperCase()}
                      </div>
                      {unreadCount > 0 && (
                        <div className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full border-2 border-white flex items-center justify-center text-[10px] text-white font-bold">
                          {unreadCount}
                        </div>
                      )}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-start mb-1">
                        <div>
                          <h3 className={`text-sm text-gray-900 ${unreadCount > 0 ? 'font-bold' : 'font-medium'}`}>
                            {otherUser}
                          </h3>
                          <div className="flex items-center gap-2 text-xs text-gray-500">
                            <span className="flex items-center gap-1 bg-gray-100 px-1.5 py-0.5 rounded">
                              <Briefcase size={10} /> {c.jobTitle}
                            </span>
                            <span className={`flex items-center gap-1 px-1.5 py-0.5 rounded font-medium uppercase text-[10px] ${
                              c.jobStatus === 'completed' ? 'bg-green-100 text-green-700' :
                              c.jobStatus === 'processing' ? 'bg-blue-100 text-blue-700' :
                              'bg-gray-100 text-gray-600'
                            }`}>
                              {c.jobStatus}
                            </span>
                          </div>
                        </div>
                        <span className="text-xs text-gray-400 whitespace-nowrap">
                          {new Date(c.updatedAt).toLocaleDateString()}
                        </span>
                      </div>
                      
                      <p className={`text-sm truncate ${unreadCount > 0 ? 'text-gray-900 font-medium' : 'text-gray-500'}`}>
                        <span className="text-gray-400 mr-1">{lastMsg?.senderUsername === currentUser.username ? 'You:' : ''}</span>
                        {lastMsg?.text}
                      </p>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Chat Overlay */}
      {activeChat && (
        <ChatPanel 
          isOpen={!!activeChat}
          onClose={() => {
            setActiveChat(null);
            loadConversations(currentUser.username, currentUser.role); // Refresh list on close
          }}
          jobId={activeChat.jobId}
          currentUsername={currentUser.username}
          otherUsername={currentUser.role === 'employer' ? activeChat.workerUsername : activeChat.employerUsername}
          currentUserRole={currentUser.role as 'employer' | 'worker'}
          jobTitle={activeChat.jobTitle}
        />
      )}
    </div>
  );
}
