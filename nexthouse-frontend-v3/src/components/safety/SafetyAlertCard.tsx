'use client';
import { useState } from 'react';
import type { SafetyAlertResponse } from '@/types';
import { CheckCircle, Siren, Shield, ShieldCheck, Flag } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { safetyApi } from '@/api';
import toast from 'react-hot-toast';

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

const FALSE_REPORT_REASONS = ['Inaccurate', 'Already resolved', 'Spam', 'Not in my area', 'Other'];

export function ActiveAlertCard({ alert: a, onResolve }: { alert: SafetyAlertResponse; onResolve: (id: number) => void }) {
  const [showReport, setShowReport] = useState(false);
  const [reportReason, setReportReason] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [reporting, setReporting] = useState(false);

  const handleVerify = async () => {
    setVerifying(true);
    try { await safetyApi.verify(a.id); toast.success('Alert verified'); }
    catch { toast.error('Failed to verify'); }
    finally { setVerifying(false); }
  };

  const handleReport = async () => {
    if (!reportReason) return toast.error('Select a reason');
    setReporting(true);
    try { await safetyApi.report(a.id, reportReason); toast.success('Reported'); setShowReport(false); }
    catch { toast.error('Failed to report'); }
    finally { setReporting(false); }
  };

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

      {/* Action buttons */}
      <div className="flex gap-2 flex-wrap">
        <button
          onClick={() => onResolve(a.id)}
          className="text-xs text-gray-500 hover:text-green-600 border border-gray-200 hover:border-green-300 px-3 py-1.5 rounded-lg transition flex items-center gap-1.5"
        >
          <CheckCircle size={12}/>Resolved
        </button>
        {!a.verified && (
          <button
            onClick={handleVerify}
            disabled={verifying}
            className="text-xs text-blue-600 border border-blue-200 hover:bg-blue-50 px-3 py-1.5 rounded-lg transition flex items-center gap-1.5 disabled:opacity-50"
          >
            <ShieldCheck size={12}/>{verifying ? 'Verifying…' : 'Verify Alert'}
          </button>
        )}
        <button
          onClick={() => setShowReport(r => !r)}
          className="text-xs text-gray-400 hover:text-red-500 border border-gray-200 hover:border-red-200 px-3 py-1.5 rounded-lg transition flex items-center gap-1.5 ml-auto"
        >
          <Flag size={12}/>False alert
        </button>
      </div>

      {/* False report panel */}
      {showReport && (
        <div className="border border-red-100 rounded-xl p-3 space-y-2 bg-red-50/40">
          <p className="text-xs font-semibold text-red-700">Why is this alert false?</p>
          <div className="flex flex-wrap gap-1.5">
            {FALSE_REPORT_REASONS.map(r => (
              <button
                key={r}
                onClick={() => setReportReason(r)}
                className={`px-2.5 py-1 rounded-full text-xs border transition ${
                  reportReason === r ? 'bg-red-500 text-white border-red-500' : 'border-red-200 text-red-600 bg-white'
                }`}
              >
                {r}
              </button>
            ))}
          </div>
          <button
            onClick={handleReport}
            disabled={reporting || !reportReason}
            className="w-full py-1.5 rounded-lg bg-red-500 text-white text-xs font-bold hover:bg-red-600 disabled:opacity-50 transition"
          >
            {reporting ? 'Submitting…' : 'Submit Report'}
          </button>
        </div>
      )}
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