import React, { useState, useEffect } from 'react';
import { Bell, Check, MessageSquare, Briefcase, XCircle, CheckCircle } from 'lucide-react';
import { Notification, NOTIFICATION_KEY } from '../types';

interface NotificationCenterProps {
  username: string;
}

export default function NotificationCenter({ username }: NotificationCenterProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const loadNotifications = () => {
    const allNotesStr = localStorage.getItem(NOTIFICATION_KEY);
    if (allNotesStr) {
      const allNotes: Notification[] = JSON.parse(allNotesStr);
      const myNotes = allNotes.filter(n => n.username === username);
      // Sort by newest
      myNotes.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      
      setNotifications(myNotes);
      setUnreadCount(myNotes.filter(n => !n.isRead).length);
    }
  };

  useEffect(() => {
    loadNotifications();
    // Poll for notifications every 5 seconds (simple implementation for demo)
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

  const getIcon = (type: string) => {
    switch (type) {
      case 'newOffer': return <Briefcase size={16} className="text-blue-600" />;
      case 'offerAccepted': return <CheckCircle size={16} className="text-green-600" />;
      case 'offerRejected': return <XCircle size={16} className="text-red-600" />;
      case 'newMessage': return <MessageSquare size={16} className="text-purple-600" />;
      default: return <Bell size={16} className="text-gray-600" />;
    }
  };

  const getMessage = (n: Notification) => {
    switch (n.type) {
      case 'newOffer': return `New offer from ${n.payload?.workerName}`;
      case 'offerAccepted': return `Your offer was accepted by ${n.payload?.employerName}`;
      case 'offerRejected': return `Your offer was rejected by ${n.payload?.employerName}`;
      case 'newMessage': return `New message from ${n.payload?.senderName}`;
      default: return 'New notification';
    }
  };

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
            <div className="p-3 border-b border-gray-100 flex justify-between items-center bg-gray-50">
              <h3 className="font-bold text-sm text-gray-800">Notifications</h3>
              {unreadCount > 0 && (
                <button onClick={markAllAsRead} className="text-xs text-blue-600 hover:underline">
                  Mark all read
                </button>
              )}
            </div>
            
            <div className="max-h-80 overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="p-8 text-center text-gray-400 text-sm">
                  No notifications yet
                </div>
              ) : (
                notifications.map(n => (
                  <div 
                    key={n.id} 
                    onClick={() => markAsRead(n.id)}
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
