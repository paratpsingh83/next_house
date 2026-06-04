'use client';
// src/app/(app)/safety/create/page.tsx
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ArrowLeft, Loader2, AlertTriangle, MapPin, Siren } from 'lucide-react';
import { safetyApi } from '@/api';
import toast from 'react-hot-toast';

const ALERT_TYPES = ['FIRE','FLOOD','ACCIDENT','THEFT','SUSPICIOUS','MEDICAL','INFRASTRUCTURE','OTHER'];
const SEVERITIES  = [
  { v:'LOW',      l:'Low',      d:'Minor issue, no immediate danger',  color:'bg-blue-50 border-blue-200 text-blue-700' },
  { v:'MEDIUM',   l:'Medium',   d:'Moderate risk, use caution',        color:'bg-yellow-50 border-yellow-200 text-yellow-700' },
  { v:'HIGH',     l:'High',     d:'Serious danger, avoid the area',    color:'bg-orange-50 border-orange-200 text-orange-700' },
  { v:'CRITICAL', l:'Critical', d:'Life-threatening, call 999 now',    color:'bg-red-50 border-red-200 text-red-700' },
];

const schema = z.object({
  title:       z.string().min(5,'Min 5 characters').max(200),
  description: z.string().max(2000).optional(),
  alertType:   z.string().min(1,'Select alert type'),
  severity:    z.string().min(1,'Select severity'),
  emergency:   z.boolean(),
  address:     z.string().max(300).optional(),
});
type Form = z.infer<typeof schema>;

export default function CreateSafetyAlertPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [loc, setLoc] = useState({ lat: 3.139, lon: 101.6869 });
  const [locGot, setLocGot] = useState(false);

  useEffect(() => {
    navigator.geolocation?.getCurrentPosition(
      p => { setLoc({ lat: p.coords.latitude, lon: p.coords.longitude }); setLocGot(true); }
    );
  }, []);

  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm<Form>({
    resolver: zodResolver(schema),
    defaultValues: { alertType: '', severity: '', emergency: false },
  });

  const selType      = watch('alertType');
  const selSeverity  = watch('severity');
  const isEmergency  = watch('emergency');

  const onSubmit = async (d: Form) => {
    setLoading(true);
    try {
      await safetyApi.create({
        title:       d.title,
        description: d.description,
        alertType:   d.alertType,
        severity:    d.severity,
        emergency:   d.emergency,
        latitude:    loc.lat,
        longitude:   loc.lon,
        address:     d.address,
      });
      toast.success('Safety alert posted!');
      router.back();
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? 'Failed to post alert');
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-4 h-14 flex items-center gap-3 sticky top-0 z-10">
        <button onClick={() => router.back()} className="p-1.5 rounded-xl text-gray-500 hover:bg-gray-100">
          <ArrowLeft size={20}/>
        </button>
        <h1 className="font-bold text-gray-900">Report Safety Alert</h1>
      </div>

      {/* Emergency banner */}
      <div className="mx-4 mt-4 p-3 bg-red-50 border border-red-200 rounded-xl flex items-start gap-2">
        <AlertTriangle size={16} className="text-red-500 flex-shrink-0 mt-0.5"/>
        <p className="text-xs text-red-700">
          <strong>Life-threatening emergency?</strong> Call <strong>999</strong> immediately before posting here.
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="px-4 py-5 space-y-5 max-w-lg mx-auto pb-20">

        {/* Emergency toggle - prominent */}
        <div
          onClick={() => setValue('emergency', !isEmergency)}
          className={`flex items-center gap-4 p-4 rounded-xl border-2 cursor-pointer transition ${
            isEmergency ? 'border-red-500 bg-red-50' : 'border-gray-200 bg-white'
          }`}
        >
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${isEmergency ? 'bg-red-500' : 'bg-gray-100'}`}>
            <Siren size={22} className={isEmergency ? 'text-white' : 'text-gray-400'}/>
          </div>
          <div className="flex-1">
            <p className={`font-bold ${isEmergency ? 'text-red-700' : 'text-gray-700'}`}>
              {isEmergency ? '🚨 EMERGENCY ALERT' : 'Mark as Emergency'}
            </p>
            <p className="text-xs text-gray-500 mt-0.5">Sends immediate push notification to everyone nearby</p>
          </div>
          <div className={`w-12 h-6 rounded-full transition-colors relative flex-shrink-0 ${isEmergency ? 'bg-red-500' : 'bg-gray-300'}`}>
            <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${isEmergency ? 'translate-x-6' : 'translate-x-0.5'}`}/>
          </div>
        </div>

        {/* Alert Type */}
        <div>
          <label className="label">Alert type *</label>
          <div className="grid grid-cols-4 gap-2">
            {ALERT_TYPES.map(t => (
              <button key={t} type="button" onClick={() => setValue('alertType', t)}
                className={`py-2.5 px-1 rounded-xl border-2 text-xs font-semibold transition text-center ${
                  selType === t ? 'border-primary-500 bg-primary-50 text-primary-700' : 'border-gray-200 text-gray-600 hover:border-gray-300'
                }`}>
                {t === 'FIRE' ? '🔥' : t === 'FLOOD' ? '🌊' : t === 'ACCIDENT' ? '🚗' : t === 'THEFT' ? '🔓' :
                 t === 'SUSPICIOUS' ? '👁️' : t === 'MEDICAL' ? '🏥' : t === 'INFRASTRUCTURE' ? '🏗️' : '⚠️'}
                <div className="mt-0.5">{t}</div>
              </button>
            ))}
          </div>
          {errors.alertType && <p className="mt-1.5 text-xs text-red-500">{errors.alertType.message}</p>}
        </div>

        {/* Severity */}
        <div>
          <label className="label">Severity *</label>
          <div className="space-y-2">
            {SEVERITIES.map(({ v, l, d, color }) => (
              <button key={v} type="button" onClick={() => setValue('severity', v)}
                className={`w-full p-3 rounded-xl border-2 text-left transition flex items-center gap-3 ${
                  selSeverity === v ? color : 'border-gray-200 bg-white hover:border-gray-300'
                }`}>
                <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${selSeverity===v?'border-current':'border-gray-300'}`}>
                  {selSeverity === v && <div className="w-2 h-2 rounded-full bg-current"/>}
                </div>
                <div>
                  <p className="font-semibold text-sm">{l}</p>
                  <p className="text-xs opacity-70">{d}</p>
                </div>
              </button>
            ))}
          </div>
          {errors.severity && <p className="mt-1.5 text-xs text-red-500">{errors.severity.message}</p>}
        </div>

        {/* Title */}
        <div>
          <label className="label">Alert title *</label>
          <input {...register('title')} type="text" placeholder="e.g. Fire at Jalan Ampang near Shell station"
            className={`input ${errors.title?'input-error':''}`}/>
          {errors.title && <p className="mt-1.5 text-xs text-red-500">{errors.title.message}</p>}
        </div>

        {/* Description */}
        <div>
          <label className="label">More details</label>
          <textarea {...register('description')} rows={4}
            placeholder="Describe what you see — exact location, number of people affected, any danger signs…"
            className="input resize-none"/>
        </div>

        {/* Location */}
        <div>
          <label className="label flex items-center gap-1.5"><MapPin size={14}/>Location</label>
          <input {...register('address')} type="text" placeholder="Street address or landmark" className="input"/>
          <p className="text-xs text-gray-400 mt-1.5">
            {locGot
              ? `✅ GPS: ${loc.lat.toFixed(5)}, ${loc.lon.toFixed(5)}`
              : '📍 Getting your GPS location…'
            }
          </p>
        </div>

        {/* Submit */}
        <button type="submit" disabled={loading}
          className={`w-full py-3.5 rounded-xl font-bold text-base flex items-center justify-center gap-2 transition ${
            isEmergency
              ? 'bg-red-500 hover:bg-red-600 text-white'
              : 'bg-primary-500 hover:bg-primary-600 text-white'
          } disabled:opacity-50`}>
          {loading
            ? <><Loader2 size={18} className="animate-spin"/>Posting alert…</>
            : <><AlertTriangle size={18}/>{isEmergency ? 'Post Emergency Alert' : 'Post Safety Alert'}</>
          }
        </button>
      </form>
    </div>
  );
}
