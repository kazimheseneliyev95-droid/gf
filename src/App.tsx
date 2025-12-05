import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Login from './Login';
import Notes from './Notes'; // Keeping this for legacy/fallback
import WorkerPanel from './WorkerPanel';
import EmployerPanel from './EmployerPanel';
import WorkerProfile from './WorkerProfile';
import AdminPanel from './AdminPanel';
import HomeFeed from './components/HomeFeed';
import Inbox from './Inbox'; // NEW
import { updateUserOnlineStatus } from './utils/auth';

function App() {
  // Heartbeat for online status
  useEffect(() => {
    const updateStatus = () => {
      const sessionStr = localStorage.getItem('currentUser');
      if (sessionStr) {
        try {
          const user = JSON.parse(sessionStr);
          if (user.username) {
            updateUserOnlineStatus(user.username);
          }
        } catch (e) {
          // ignore
        }
      }
    };

    // Initial call
    updateStatus();

    // Interval every 2 minutes
    const interval = setInterval(updateStatus, 2 * 60 * 1000);
    
    return () => clearInterval(interval);
  }, []);

  return (
    <BrowserRouter>
      <Routes>
        {/* Public Route */}
        <Route path="/" element={<Login />} />
        
        {/* Role-Based Routes */}
        <Route path="/worker" element={<WorkerPanel />} />
        <Route path="/employer" element={<EmployerPanel />} />
        <Route path="/admin/*" element={<AdminPanel />} />
        
        {/* Global Feed */}
        <Route path="/home" element={<HomeFeed />} />
        
        {/* Global Inbox */}
        <Route path="/inbox" element={<Inbox />} />
        
        {/* Public Profile Route */}
        <Route path="/worker/:username" element={<WorkerProfile />} />
        
        {/* Legacy/Fallback Route */}
        <Route path="/notes" element={<Notes />} />
        
        {/* Fallback: Redirect unknown routes to Login */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
