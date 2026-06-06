'use client';
import type { SafetyAlertResponse } from '@/types';
import { CheckCircle, Siren, Shield } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

export const SEVERITY_COLOR: Record<string, string> = {
  LOW:      'bg-blue-50 text-blue-600 border-blue-100',
  MEDIUM:   'bg-yellow-50 text-yellow-700 border-yellow-100',
  HIGH:     'bg-orange-50 text-orange-700 border-orange-100',
  CRITICAL: 'bg-red-50 text-red-600 border-red-100',
};

export const ALERT_EMOJI: Record<string, string> = {
  FIRE: '🔥', FLOOD: '🌊', ACCIDENT: '🚗', THEFT: '🔓',
  SUSPICIOUS: '👁️', MEDICAL: '🏥', INFRASTRUCTURE: '🏗️', OTHER: '⚠️',
};

export function ActiveAlertCard({ alert: a, onResolve }: { alert: SafetyAlertResponse; onResolve: (id: number) => void }) {
  return (
    <div className={`card p-4 space-y-3 border ${
      a.emergency ? 'border-red-300 bg-red-50/60' : (SEVERITY_COLOR[a.severity]?.split(' ')[2] ?? 'border-gray-100')
    }`}>
      <div className="flex items-start gap-3">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 text-xl ${a.emergency ? 'bg-red-100' : 'bg-gray-100'}`}>
          {ALERT_EMOJI[a.alertType ?? ''] ?? '⚠️'}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            {a.emergency && (
              <span className="badge bg-red-500 text-white text-xs animate-pulse gap-1">
                <Siren size={10}/>EMERGENCY
              </span>
            )}
            <span className={`badge text-xs ${SEVERITY_COLOR[a.severity] ?? 'bg-gray-100 text-gray-600'}`}>
              {a.severity}
            </span>
            {a.verified && (
              <span className="badge bg-green-50 text-green-600 text-xs gap-1">
                <CheckCircle size={9}/>Verified
              </span>
            )}
          </div>
          <h3 className="font-bold text-gray-900 mt-1">{a.title}</h3>
          {a.description && <p className="text-sm text-gray-600 mt-1 leading-relaxed">{a.description}</p>}
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-400 mt-2">
            <span>by {a.reportedBy.name}</span>
            <span>{formatDistanceToNow(new Date(a.createdAt), { addSuffix: true })}</span>
            {a.address && <span>📍 {a.address}</span>}
          </div>
        </div>
      </div>
      <button
        onClick={() => onResolve(a.id)}
        className="text-xs text-gray-500 hover:text-green-600 border border-gray-200 hover:border-green-300 px-3 py-1.5 rounded-lg transition flex items-center gap-1.5"
      >
        <CheckCircle size={12}/>Mark as Resolved
      </button>
    </div>
  );
}

export function ResolvedAlertCard({ alert: a }: { alert: SafetyAlertResponse }) {
  return (
    <div className="card p-4 opacity-60">
      <div className="flex items-center gap-3">
        <span className="text-xl">{ALERT_EMOJI[a.alertType ?? ''] ?? '⚠️'}</span>
        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm text-gray-700 truncate">{a.title}</p>
          <p className="text-xs text-gray-400">{formatDistanceToNow(new Date(a.createdAt), { addSuffix: true })}</p>
        </div>
        <span className="badge bg-green-50 text-green-600 text-xs gap-1">
          <Shield size={10}/>Resolved
        </span>
      </div>
    </div>
  );
}