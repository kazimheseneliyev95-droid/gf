import { 
  Conversation, JobMessage, JobPost, 
  CONVERSATION_STORAGE_KEY, MESSAGE_STORAGE_KEY, JOB_STORAGE_KEY 
} from '../types';
import { createNotification } from '../utils';

// --- Helpers ---

const getLocal = <T>(key: string): T[] => {
  const str = localStorage.getItem(key);
  return str ? JSON.parse(str) : [];
};

const setLocal = (key: string, data: any) => {
  localStorage.setItem(key, JSON.stringify(data));
};

export const getConversationId = (jobId: string, employerUsername: string, workerUsername: string) => {
  return `${jobId}_${employerUsername}_${workerUsername}`;
};

// --- Actions ---

export const sendMessage = (
  jobId: string,
  fromRole: 'employer' | 'worker',
  senderUsername: string,
  recipientUsername: string,
  text: string,
  jobTitle: string
) => {
  // 1. Create Message
  const messages = getLocal<JobMessage>(MESSAGE_STORAGE_KEY);
  const newMessage: JobMessage = {
    id: crypto.randomUUID(),
    jobId,
    from: fromRole,
    senderUsername,
    text,
    createdAt: new Date().toISOString(),
    isReadByEmployer: fromRole === 'employer',
    isReadByWorker: fromRole === 'worker'
  };
  messages.push(newMessage);
  setLocal(MESSAGE_STORAGE_KEY, messages);

  // 2. Update or Create Conversation
  const conversations = getLocal<Conversation>(CONVERSATION_STORAGE_KEY);
  const employerUsername = fromRole === 'employer' ? senderUsername : recipientUsername;
  const workerUsername = fromRole === 'worker' ? senderUsername : recipientUsername;
  const convId = getConversationId(jobId, employerUsername, workerUsername);
  
  const existingIndex = conversations.findIndex(c => c.id === convId);
  
  // Get current job status
  const jobs = getLocal<JobPost>(JOB_STORAGE_KEY);
  const job = jobs.find(j => j.id === jobId);
  const currentStatus = job?.status || 'open';

  if (existingIndex !== -1) {
    // Update existing
    conversations[existingIndex].lastMessage = {
      text,
      createdAt: newMessage.createdAt,
      senderUsername
    };
    conversations[existingIndex].updatedAt = newMessage.createdAt;
    conversations[existingIndex].jobStatus = currentStatus; // Sync status
    
    if (fromRole === 'employer') {
      conversations[existingIndex].unreadCountForWorker += 1;
    } else {
      conversations[existingIndex].unreadCountForEmployer += 1;
    }
  } else {
    // Create new
    const newConv: Conversation = {
      id: convId,
      jobId,
      employerUsername,
      workerUsername,
      lastMessage: {
        text,
        createdAt: newMessage.createdAt,
        senderUsername
      },
      unreadCountForEmployer: fromRole === 'worker' ? 1 : 0,
      unreadCountForWorker: fromRole === 'employer' ? 1 : 0,
      updatedAt: newMessage.createdAt,
      jobTitle,
      jobStatus: currentStatus
    };
    conversations.push(newConv);
  }
  
  setLocal(CONVERSATION_STORAGE_KEY, conversations);

  // 3. Send Notification
  createNotification(
    recipientUsername, 
    'newMessage', 
    jobId, 
    { senderName: senderUsername, message: 'Sent you a message', conversationId: convId }, 
    'chat'
  );

  return newMessage;
};

export const markConversationAsRead = (
  jobId: string,
  employerUsername: string,
  workerUsername: string,
  readerRole: 'employer' | 'worker'
) => {
  const convId = getConversationId(jobId, employerUsername, workerUsername);
  
  // 1. Update Conversation Metadata
  const conversations = getLocal<Conversation>(CONVERSATION_STORAGE_KEY);
  const idx = conversations.findIndex(c => c.id === convId);
  
  if (idx !== -1) {
    if (readerRole === 'employer') {
      conversations[idx].unreadCountForEmployer = 0;
    } else {
      conversations[idx].unreadCountForWorker = 0;
    }
    setLocal(CONVERSATION_STORAGE_KEY, conversations);
  }

  // 2. Update Individual Messages
  const messages = getLocal<JobMessage>(MESSAGE_STORAGE_KEY);
  let hasChanges = false;
  const updatedMessages = messages.map(msg => {
    if (msg.jobId === jobId) {
      // We need to be careful not to mark messages from OTHER workers as read if we are employer
      // But since we pass workerUsername, we can filter by sender
      const isRelevant = (msg.senderUsername === workerUsername && readerRole === 'employer') ||
                         (msg.senderUsername === employerUsername && readerRole === 'worker');
      
      if (isRelevant) {
        if (readerRole === 'employer' && !msg.isReadByEmployer) {
          hasChanges = true;
          return { ...msg, isReadByEmployer: true };
        }
        if (readerRole === 'worker' && !msg.isReadByWorker) {
          hasChanges = true;
          return { ...msg, isReadByWorker: true };
        }
      }
    }
    return msg;
  });

  if (hasChanges) {
    setLocal(MESSAGE_STORAGE_KEY, updatedMessages);
    window.dispatchEvent(new Event('storage')); // Notify other tabs/components
  }
};

export const getUserConversations = (username: string, role: 'employer' | 'worker') => {
  const conversations = getLocal<Conversation>(CONVERSATION_STORAGE_KEY);
  return conversations
    .filter(c => role === 'employer' ? c.employerUsername === username : c.workerUsername === username)
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
};

export const getConversationByJob = (jobId: string, currentUsername: string, role: 'employer' | 'worker') => {
  const conversations = getLocal<Conversation>(CONVERSATION_STORAGE_KEY);
  return conversations.find(c => 
    c.jobId === jobId && 
    (role === 'employer' ? c.employerUsername === currentUsername : c.workerUsername === currentUsername)
  );
};
