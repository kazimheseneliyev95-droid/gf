import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Login from './Login';
import Notes from './Notes'; // Keeping this for legacy/fallback
import WorkerPanel from './WorkerPanel';
import EmployerPanel from './EmployerPanel';
import WorkerProfile from './WorkerProfile';
import AdminPanel from './AdminPanel';
import HomeFeed from './components/HomeFeed';

function App() {
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
