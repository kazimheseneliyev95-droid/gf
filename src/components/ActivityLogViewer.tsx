import React, { useState, useEffect } from 'react';
import { Activity, Search, Filter } from 'lucide-react';
import { ActivityLog, ACTIVITY_LOG_KEY } from '../types';

export default function ActivityLogViewer() {
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [filterUser, setFilterUser] = useState('');

  useEffect(() => {
    const str = localStorage.getItem(ACTIVITY_LOG_KEY);
    if (str) {
      setLogs(JSON.parse(str).reverse()); // Newest first
    }
  }, []);

  const filtered = logs.filter(l => 
    l.user.toLowerCase().includes(filterUser.toLowerCase()) || 
    l.action.toLowerCase().includes(filterUser.toLowerCase())
  );

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="font-bold text-gray-800 flex items-center gap-2">
          <Activity size={18} className="text-blue-600" /> Audit Trail
        </h3>
        <div className="relative">
          <Search className="absolute left-2.5 top-2 text-gray-400" size={14} />
          <input 
            type="text" 
            placeholder="Search logs..." 
            value={filterUser}
            onChange={e => setFilterUser(e.target.value)}
            className="pl-8 pr-3 py-1.5 border border-gray-200 rounded-lg text-sm outline-none focus:border-blue-500"
          />
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="max-h-[500px] overflow-y-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 border-b border-gray-200 text-gray-500 text-xs uppercase sticky top-0">
              <tr>
                <th className="px-4 py-3">Time</th>
                <th className="px-4 py-3">User</th>
                <th className="px-4 py-3">Role</th>
                <th className="px-4 py-3">Action</th>
                <th className="px-4 py-3">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map(log => (
                <tr key={log.id} className="hover:bg-gray-50">
                  <td className="px-4 py-2 text-gray-400 text-xs whitespace-nowrap">
                    {new Date(log.createdAt).toLocaleString()}
                  </td>
                  <td className="px-4 py-2 font-medium text-gray-900">{log.user}</td>
                  <td className="px-4 py-2">
                    <span className={`text-[10px] px-1.5 py-0.5 rounded uppercase font-bold ${
                      log.role === 'admin' ? 'bg-purple-100 text-purple-700' :
                      log.role === 'employer' ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700'
                    }`}>
                      {log.role}
                    </span>
                  </td>
                  <td className="px-4 py-2 font-mono text-xs text-gray-600">{log.action}</td>
                  <td className="px-4 py-2 text-gray-500 text-xs truncate max-w-xs">
                    {log.details ? JSON.stringify(log.details) : '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
