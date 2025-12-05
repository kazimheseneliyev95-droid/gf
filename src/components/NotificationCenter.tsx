import React, { useState, useEffect } from 'react';
import { Bell, Check, MessageSquare, Briefcase, XCircle, CheckCircle, Info } from 'lucide-react';
import { Notification, NOTIFICATION_KEY, UserRole, NotificationCategory } from '../types';
import { useNavigate } from 'react-router-dom';

interface NotificationCenterProps {
  username: string;
}

export default function NotificationCenter({ username }: NotificationCenterProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [activeTab, setActiveTab] = useState<NotificationCategory | 'all'>('all');
  const [currentUserRole, setCurrentUserRole] = useState<UserRole | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const sessionStr = localStorage.getItem('currentUser');
    if (sessionStr) {
      const user = JSON.parse(sessionStr);
      setCurrentUserRole(user.role);
    }
  }, []);

  const loadNotifications = () => {
    const allNotesStr = localStorage.getItem(NOTIFICATION_KEY);
    if (allNotesStr) {
      const allNotes: Notification[] = JSON.parse(allNotesStr);
      const myNotes = allNotes.filter(n => n.username === username);
      myNotes.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      
      setNotifications(myNotes);
      setUnreadCount(myNotes.filter(n => !n.isRead).length);
    }
  };

  useEffect(() => {
    loadNotifications();
    const interval = setInterval(loadNotifications, 5000);
    return () => clearInterval(interval);
  }, [username]);

  const markAsRead = (id: string) => {
    const allNotesStr = localStorage.getItem(NOTIFICATION_KEY);
    if (allNotesStr) {
      const allNotes: Notification[] = JSON.parse(allNotesStr);
      const updatedAll = allNotes.map(n => n.id === id ? { ...n, isRead: true } : n);
      localStorage.setItem(NOTIFICATION_KEY, JSON.stringify(updatedAll));
      loadNotifications();
    }
  };

  const markAllAsRead = () => {
    const allNotesStr = localStorage.getItem(NOTIFICATION_KEY);
    if (allNotesStr) {
      const allNotes: Notification[] = JSON.parse(allNotesStr);
      const updatedAll = allNotes.map(n => n.username === username ? { ...n, isRead: true } : n);
      localStorage.setItem(NOTIFICATION_KEY, JSON.stringify(updatedAll));
      loadNotifications();
    }
  };

  const handleNotificationClick = (n: Notification) => {
    markAsRead(n.id);
    setIsOpen(false);

    if (n.jobId && currentUserRole) {
      const searchParams = new URLSearchParams();
      searchParams.set('jobId', n.jobId);
      if (n.section) searchParams.set('section', n.section);
      searchParams.set('t', Date.now().toString());
      
      const basePath = currentUserRole === 'employer' ? '/employer' : '/worker';
      navigate({ pathname: basePath, search: searchParams.toString() });
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'newOffer': return <Briefcase size={16} className="text-blue-600" />;
      case 'offerAccepted': return <CheckCircle size={16} className="text-green-600" />;
      case 'offerRejected': return <XCircle size={16} className="text-red-600" />;
      case 'newMessage': return <MessageSquare size={16} className="text-purple-600" />;
      case 'jobReminder': return <Info size={16} className="text-amber-600" />;
      default: return <Bell size={16} className="text-gray-600" />;
    }
  };

  const getMessage = (n: Notification) => {
    switch (n.type) {
      case 'newOffer': return `New offer from ${n.payload?.workerName}`;
      case 'offerAccepted': return `Offer accepted by ${n.payload?.employerName}`;
      case 'offerRejected': return `Offer rejected by ${n.payload?.employerName}`;
      case 'newMessage': return `Message from ${n.payload?.senderName}`;
      default: return n.payload?.message || 'New notification';
    }
  };

  const filteredNotifications = activeTab === 'all' 
    ? notifications 
    : notifications.filter(n => n.category === activeTab);

  return (
    <div className="relative">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-gray-600 hover:text-blue-600 transition-colors rounded-full hover:bg-gray-100"
      >
        <Bell size={20} />
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 bg-red-500 text-white text-[10px] font-bold w-4 h-4 flex items-center justify-center rounded-full">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setIsOpen(false)} />
          <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-xl border border-gray-100 z-40 overflow-hidden animate-in fade-in slide-in-from-top-2">
            <div className="p-3 border-b border-gray-100 bg-gray-50">
              <div className="flex justify-between items-center mb-3">
                <h3 className="font-bold text-sm text-gray-800">Notifications</h3>
                {unreadCount > 0 && (
                  <button onClick={markAllAsRead} className="text-xs text-blue-600 hover:underline">
                    Mark all read
                  </button>
                )}
              </div>
              <div className="flex gap-2 overflow-x-auto pb-1">
                {['all', 'offers', 'messages', 'jobs', 'system'].map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab as any)}
                    className={`px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wide whitespace-nowrap ${
                      activeTab === tab 
                        ? 'bg-blue-600 text-white' 
                        : 'bg-white border border-gray-200 text-gray-500 hover:bg-gray-100'
                    }`}
                  >
                    {tab}
                  </button>
                ))}
              </div>
            </div>
            
            <div className="max-h-80 overflow-y-auto">
              {filteredNotifications.length === 0 ? (
                <div className="p-8 text-center text-gray-400 text-sm">
                  No notifications here.
                </div>
              ) : (
                filteredNotifications.map(n => (
                  <div 
                    key={n.id} 
                    onClick={() => handleNotificationClick(n)}
                    className={`p-3 border-b border-gray-50 hover:bg-gray-50 cursor-pointer transition-colors flex gap-3 ${!n.isRead ? 'bg-blue-50/50' : ''}`}
                  >
                    <div className="mt-1 bg-white p-1.5 rounded-full shadow-sm border border-gray-100 h-fit">
                      {getIcon(n.type)}
                    </div>
                    <div className="flex-1">
                      <p className={`text-sm ${!n.isRead ? 'font-semibold text-gray-900' : 'text-gray-600'}`}>
                        {getMessage(n)}
                      </p>
                      <p className="text-xs text-gray-400 mt-1">
                        {new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                    {!n.isRead && (
                      <div className="w-2 h-2 bg-blue-500 rounded-full mt-2" />
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
