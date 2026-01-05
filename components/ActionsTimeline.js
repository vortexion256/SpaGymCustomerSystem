'use client';

import { useState, useEffect } from 'react';
import { getTimeline } from '@/lib/timeline';
import { format } from 'date-fns';

export default function ActionsTimeline() {
  const [timeline, setTimeline] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadTimeline = async () => {
    setLoading(true);
    const data = await getTimeline(100);
    setTimeline(data);
    setLoading(false);
  };

  useEffect(() => {
    loadTimeline();
  }, []);

  const getActionColor = (action) => {
    switch (action) {
      case 'ADD': return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400';
      case 'EDIT': return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400';
      case 'DELETE': return 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400';
      default: return 'bg-slate-100 text-slate-700 dark:bg-slate-900/30 dark:text-slate-400';
    }
  };

  if (loading) return <div className="text-center py-10">Loading timeline...</div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Actions Timeline</h2>
        <button onClick={loadTimeline} className="text-sm text-blue-600 hover:underline">Refresh</button>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-800">
                <th className="px-6 py-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Time</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">User</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Action</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Target</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              {timeline.length === 0 ? (
                <tr>
                  <td colSpan="5" className="px-6 py-10 text-center text-slate-500">No actions recorded yet.</td>
                </tr>
              ) : (
                timeline.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                    <td className="px-6 py-4 text-sm text-slate-500 whitespace-nowrap">
                      {item.timestamp ? format(item.timestamp, 'MMM d, HH:mm:ss') : 'N/A'}
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-slate-900 dark:text-white">{item.userName}</div>
                      <div className="text-xs text-slate-500">{item.userEmail}</div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded text-[10px] font-bold ${getActionColor(item.action)}`}>
                        {item.action}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-xs font-bold text-slate-400 uppercase">{item.targetType}</div>
                      <div className="text-sm text-slate-700 dark:text-slate-300">{item.targetName}</div>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-400">
                      {item.details}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
