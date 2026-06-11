'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ArrowLeft, Loader2, Package } from 'lucide-react';
import { borrowApi, neighborhoodsApi } from '@/api';
import toast from 'react-hot-toast';

const ITEM_TYPES = ['TOOL', 'APPLIANCE', 'VEHICLE', 'BOOK', 'SPORTS', 'ELECTRONICS', 'OTHER'];

const schema = z.object({
  title:        z.string().min(3, 'Min 3 characters').max(200),
  description:  z.string().max(1000).optional(),
  itemType:     z.string().min(1, 'Select item type'),
  durationDays: z.preprocess(
    (v) => (typeof v === 'number' && isNaN(v as number) ? undefined : v),
    z.number().min(1, 'Min 1 day').max(30, 'Max 30 days').optional(),
  ),
});
type Form = z.infer<typeof schema>;

export default function CreateBorrowPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [neighborhoodId, setNeighborhoodId] = useState<number | undefined>();

  // Detect neighborhood from GPS silently — best effort
  useEffect(() => {
    navigator.geolocation?.getCurrentPosition(
      async ({ coords }) => {
        try {
          const n = await neighborhoodsApi.detect(coords.latitude, coords.longitude);
          if (n?.id) setNeighborhoodId(n.id);
        } catch {}
      },
      () => {},
      { timeout: 5000 }
    );
  }, []);

  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm<Form>({
    resolver: zodResolver(schema),
    defaultValues: { itemType: '' },
  });

  const selType = watch('itemType');

  const onSubmit = async (d: Form) => {
    setLoading(true);
    try {
      await borrowApi.create({
        title:            d.title,
        description:      d.description,
        requiredDuration: d.durationDays ? `${d.durationDays} days` : undefined,
        neighborhoodId,   // passes detected neighborhood (or undefined = global)
      });
      toast.success('Borrow request posted!');
      router.back();
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? 'Failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-100 px-4 h-14 flex items-center gap-3 sticky top-0 z-10">
        <button onClick={() => router.back()} className="p-1.5 rounded-xl text-gray-500 hover:bg-gray-100">
          <ArrowLeft size={20} />
        </button>
        <h1 className="font-bold text-gray-900">Request to Borrow</h1>
      </div>
      <form onSubmit={handleSubmit(onSubmit)} className="px-4 py-6 space-y-5 max-w-lg mx-auto pb-20">
        <input type="hidden" {...register('itemType')} />
        <div>
          <label className="label">What do you need? *</label>
          <input
            {...register('title')}
            type="text"
            placeholder="e.g. Drill machine for 2 days"
            className={`input ${errors.title ? 'input-error' : ''}`}
          />
          {errors.title && <p className="mt-1.5 text-xs text-red-500">{errors.title.message}</p>}
        </div>
        <div>
          <label className="label">Item type *</label>
          <div className="grid grid-cols-4 gap-2">
            {ITEM_TYPES.map(t => (
              <button
                key={t}
                type="button"
                onClick={() => setValue('itemType', t, { shouldValidate: true })}
                className={`py-2 rounded-xl border-2 text-xs font-semibold transition ${
                  selType === t
                    ? 'border-primary-500 bg-primary-50 text-primary-700'
                    : 'border-gray-200 text-gray-600'
                }`}
              >
                {t}
              </button>
            ))}
          </div>
          {errors.itemType && <p className="mt-1.5 text-xs text-red-500">{errors.itemType.message}</p>}
        </div>
        <div>
          <label className="label">Description</label>
          <textarea
            {...register('description')}
            rows={3}
            placeholder="Why do you need it? Any specific requirements?"
            className="input resize-none"
          />
        </div>
        <div>
          <label className="label">Duration needed (days)</label>
          <input
            {...register('durationDays', { valueAsNumber: true })}
            type="number"
            min={1}
            max={30}
            placeholder="1-30 days"
            className={`input ${errors.durationDays ? 'input-error' : ''}`}
          />
          {errors.durationDays && <p className="mt-1.5 text-xs text-red-500">{errors.durationDays.message}</p>}
        </div>
        <button type="submit" disabled={loading} className="btn-primary w-full py-3.5">
          {loading ? (
            <><Loader2 size={18} className="animate-spin" />Posting…</>
          ) : (
            <><Package size={18} />Post Request</>
          )}
        </button>
      </form>
    </div>
  );
}
