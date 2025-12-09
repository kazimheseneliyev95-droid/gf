import React, { useEffect, useState } from 'react';
import { ActivityLog, ACTIVITY_LOG_KEY } from '../types';
import { Clock, CheckCircle, Briefcase, MessageSquare, AlertTriangle } from 'lucide-react';

interface Props {
  username: string;
  filter?: 'all' | 'jobs' | 'offers' | 'reviews';
}

export default function ActivityTimeline({ username, filter = 'all' }: Props) {
  const [logs, setLogs] = useState<ActivityLog[]>([]);

  useEffect(() => {
    const str = localStorage.getItem(ACTIVITY_LOG_KEY);
    if (str) {
      const allLogs: ActivityLog[] = JSON.parse(str);
      // Filter logs where this user is the actor OR the subject (simplified to actor for now)
      const myLogs = allLogs.filter(l => l.user === username).reverse();
      setLogs(myLogs);
    }
  }, [username]);

  const filteredLogs = logs.filter(log => {
    if (filter === 'all') return true;
    if (filter === 'jobs') return log.action.includes('JOB');
    if (filter === 'offers') return log.action.includes('OFFER') || log.action.includes('BID');
    if (filter === 'reviews') return log.action.includes('REVIEW');
    return false;
  });

  const getIcon = (action: string) => {
    if (action.includes('JOB')) return <Briefcase size={14} className="text-blue-600" />;
    if (action.includes('OFFER')) return <CheckCircle size={14} className="text-green-600" />;
    if (action.includes('DISPUTE')) return <AlertTriangle size={14} className="text-red-600" />;
    if (action.includes('REVIEW')) return <MessageSquare size={14} className="text-amber-600" />;
    return <Clock size={14} className="text-gray-600" />;
  };

  const formatAction = (action: string) => {
    return action.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase());
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
      <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
        <Clock size={18} className="text-blue-600" /> Recent Activity
      </h3>
      
      <div className="space-y-4 relative pl-2">
        {/* Timeline Line */}
        <div className="absolute left-[19px] top-2 bottom-2 w-0.5 bg-gray-100"></div>

        {filteredLogs.length === 0 ? (
          <p className="text-sm text-gray-500 italic pl-8">No activity recorded yet for this filter.</p>
        ) : (
          filteredLogs.slice(0, 5).map(log => (
            <div key={log.id} className="relative flex items-start gap-3">
              <div className="bg-white p-1 rounded-full border border-gray-200 z-10">
                {getIcon(log.action)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900">{formatAction(log.action)}</p>
                <p className="text-xs text-gray-500">{new Date(log.createdAt).toLocaleString()}</p>
                {log.details && (
                  <p className="text-xs text-gray-400 mt-0.5 truncate">
                    {JSON.stringify(log.details).replace(/[{"}]/g, '').replace(/,/g, ', ')}
                  </p>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
