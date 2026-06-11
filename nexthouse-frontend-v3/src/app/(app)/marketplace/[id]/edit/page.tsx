'use client';
import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ArrowLeft, Loader2, Camera, Tag, MapPin, Save, Trash2 } from 'lucide-react';
import { marketplaceApi, mediaApi } from '@/api';
import { useAppSelector } from '@/store';
import toast from 'react-hot-toast';

const CATEGORIES = ['Electronics','Furniture','Clothing','Books','Vehicles','Sports','Food','Garden','Toys','Tools','Other'];
const CONDITIONS  = [
  { v:'NEW',      l:'New',       d:'Brand new, never used' },
  { v:'LIKE_NEW', l:'Like New',  d:'Used once or twice' },
  { v:'GOOD',     l:'Good',      d:'Works well, minor wear' },
  { v:'FAIR',     l:'Fair',      d:'Visible wear, fully functional' },
  { v:'POOR',     l:'Poor',      d:'Heavy wear, may need repair' },
];

const schema = z.object({
  title:         z.string().min(3,'Min 3 characters').max(200),
  description:   z.string().max(2000).optional(),
  category:      z.string().min(1,'Select a category'),
  conditionType: z.string().min(1,'Select condition'),
  price:         z.number().min(0).optional().or(z.literal('')),
  negotiable:    z.boolean(),
  address:       z.string().optional(),
});
type Form = z.infer<typeof schema>;

export default function EditMarketplaceItemPage() {
  const { id }  = useParams<{ id: string }>();
  const router  = useRouter();
  const me      = useAppSelector(s => s.auth.user);
  const itemId  = Number(id);

  const [saving,       setSaving]       = useState(false);
  const [uploading,    setUploading]    = useState(false);
  const [isFree,       setIsFree]       = useState(false);
  const [existingImgs, setExistingImgs] = useState<{ id: number; url: string }[]>([]);
  const [newPreviews,  setNewPreviews]  = useState<string[]>([]);
  const [newMediaIds,  setNewMediaIds]  = useState<number[]>([]);
  const [deletingImg,  setDeletingImg]  = useState<number | null>(null);
  const [loc, setLoc] = useState({ lat: 3.139, lon: 101.6869 });

  const { data: item, isLoading } = useQuery({
    queryKey: ['marketplace-item', itemId],
    queryFn:  () => marketplaceApi.get(itemId),
  });

  const { register, handleSubmit, watch, setValue, reset, formState: { errors } } = useForm<Form>({
    resolver: zodResolver(schema),
    defaultValues: { category: '', conditionType: '', negotiable: false },
  });

  useEffect(() => {
    if (!item) return;
    if (item.seller.id !== me?.id) { toast.error('Not your listing'); router.back(); return; }
    reset({
      title:         item.title,
      description:   item.description ?? '',
      category:      item.category ?? '',
      conditionType: item.conditionType ?? '',
      price:         item.price != null ? Number(item.price) : '',
      negotiable:    item.negotiable ?? false,
      address:       item.address ?? '',
    });
    setIsFree(item.price == null);
    if (item.media && item.media.length > 0) {
      setExistingImgs(item.media.map(m => ({ id: m.id, url: m.url })));
    }
    if (item.latitude && item.longitude) {
      setLoc({ lat: item.latitude, lon: item.longitude });
    }
  }, [item]);

  useEffect(() => {
    navigator.geolocation?.getCurrentPosition(
      p => setLoc({ lat: p.coords.latitude, lon: p.coords.longitude })
    );
  }, []);

  useEffect(() => {
    return () => { newPreviews.forEach(u => URL.revokeObjectURL(u)); };
  }, []);

  const selCategory  = watch('category');
  const selCondition = watch('conditionType');
  const isNegotiable = watch('negotiable');
  const totalPhotos  = existingImgs.length + newPreviews.length;

  const handleAddPhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;
    if (totalPhotos + files.length > 5) { toast.error('Maximum 5 photos'); return; }
    setUploading(true);
    try {
      for (const file of files) {
        const preview = URL.createObjectURL(file);
        setNewPreviews(p => [...p, preview]);
        const media = await mediaApi.upload(file, 'MARKETPLACE');
        setNewMediaIds(m => [...m, media.id]);
      }
      toast.success('Photos uploaded!');
    } catch { toast.error('Upload failed'); }
    finally { setUploading(false); }
  };

  const removeNewPhoto = (idx: number) => {
    URL.revokeObjectURL(newPreviews[idx]);
    setNewPreviews(p => p.filter((_,i) => i !== idx));
    setNewMediaIds(m => m.filter((_,i) => i !== idx));
  };

  const removeExistingPhoto = async (mediaId: number) => {
    setDeletingImg(mediaId);
    try {
      await mediaApi.delete(mediaId);
      setExistingImgs(imgs => imgs.filter(img => img.id !== mediaId));
    } catch { toast.error('Failed to remove photo'); }
    finally { setDeletingImg(null); }
  };

  const onSubmit = async (data: Form) => {
    setSaving(true);
    try {
      await marketplaceApi.update(itemId, {
        title:         data.title,
        description:   data.description,
        category:      data.category,
        conditionType: data.conditionType,
        price:         isFree ? undefined : (data.price ? Number(data.price) : undefined),
        negotiable:    data.negotiable,
        latitude:      loc.lat,
        longitude:     loc.lon,
        address:       data.address,
        mediaIds:      newMediaIds.length > 0 ? newMediaIds : undefined,
      });
      toast.success('Listing updated!');
      router.push(`/marketplace/${itemId}`);
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? 'Failed to update listing');
    } finally { setSaving(false); }
  };

  if (isLoading) return (
    <div className="flex justify-center items-center min-h-[60vh]">
      <Loader2 className="animate-spin text-primary-500" size={32} />
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-100 px-4 h-14 flex items-center gap-3 sticky top-0 z-10">
        <button onClick={() => router.back()} className="p-1.5 rounded-xl text-gray-500 hover:bg-gray-100">
          <ArrowLeft size={20} />
        </button>
        <h1 className="font-bold text-gray-900 flex-1">Edit Listing</h1>
        <button form="edit-listing-form" type="submit" disabled={saving || uploading} className="btn-primary text-sm px-4 py-2 gap-1.5">
          {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
          Save
        </button>
      </div>

      <form id="edit-listing-form" onSubmit={handleSubmit(onSubmit)} className="px-4 py-6 space-y-5 max-w-lg mx-auto pb-20">

        {/* Photos */}
        <div>
          <label className="label">Photos (up to 5)</label>
          <div className="flex gap-2 flex-wrap">
            {existingImgs.map(img => (
              <div key={img.id} className="relative w-20 h-20 rounded-xl overflow-hidden bg-gray-100 flex-shrink-0">
                <img src={img.url} className="w-full h-full object-cover" alt="" />
                <button
                  type="button"
                  onClick={() => removeExistingPhoto(img.id)}
                  disabled={deletingImg === img.id}
                  className="absolute top-1 right-1 w-5 h-5 bg-black/60 rounded-full flex items-center justify-center text-white text-xs"
                >
                  {deletingImg === img.id ? <Loader2 size={10} className="animate-spin" /> : '×'}
                </button>
              </div>
            ))}
            {newPreviews.map((src, i) => (
              <div key={`new-${i}`} className="relative w-20 h-20 rounded-xl overflow-hidden bg-gray-100 flex-shrink-0">
                <img src={src} className="w-full h-full object-cover" alt="" />
                <button
                  type="button"
                  onClick={() => removeNewPhoto(i)}
                  className="absolute top-1 right-1 w-5 h-5 bg-black/60 rounded-full flex items-center justify-center text-white text-xs"
                >×</button>
              </div>
            ))}
            {totalPhotos < 5 && (
              <label className="w-20 h-20 rounded-xl border-2 border-dashed border-gray-300 flex flex-col items-center justify-center cursor-pointer hover:border-primary-400 transition flex-shrink-0">
                {uploading ? <Loader2 size={20} className="animate-spin text-primary-500" /> : <>
                  <Camera size={20} className="text-gray-400" />
                  <span className="text-xs text-gray-400 mt-1">Add photo</span>
                </>}
                <input type="file" accept="image/*" multiple className="hidden" onChange={handleAddPhoto} disabled={uploading} />
              </label>
            )}
          </div>
        </div>

        {/* Title */}
        <div>
          <label className="label">Title *</label>
          <input {...register('title')} type="text" className={`input ${errors.title ? 'input-error' : ''}`} />
          {errors.title && <p className="mt-1.5 text-xs text-red-500">{errors.title.message}</p>}
        </div>

        {/* Category */}
        <div>
          <label className="label flex items-center gap-1"><Tag size={14} />Category *</label>
          <div className="flex flex-wrap gap-2">
            {CATEGORIES.map(c => (
              <button key={c} type="button" onClick={() => setValue('category', c)}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition ${
                  selCategory === c ? 'bg-primary-500 text-white border-primary-500' : 'border-gray-200 text-gray-600 hover:border-primary-300'
                }`}>{c}</button>
            ))}
          </div>
          {errors.category && <p className="mt-1.5 text-xs text-red-500">{errors.category.message}</p>}
        </div>

        {/* Condition */}
        <div>
          <label className="label">Condition *</label>
          <div className="space-y-2">
            {CONDITIONS.map(({ v, l, d }) => (
              <button key={v} type="button" onClick={() => setValue('conditionType', v)}
                className={`w-full p-3 rounded-xl border-2 text-left transition flex items-center gap-3 ${
                  selCondition === v ? 'border-primary-500 bg-primary-50' : 'border-gray-200 bg-white hover:border-gray-300'
                }`}>
                <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${selCondition === v ? 'border-primary-500' : 'border-gray-300'}`}>
                  {selCondition === v && <div className="w-2 h-2 rounded-full bg-primary-500" />}
                </div>
                <div>
                  <p className={`font-semibold text-sm ${selCondition === v ? 'text-primary-700' : 'text-gray-700'}`}>{l}</p>
                  <p className="text-xs text-gray-400">{d}</p>
                </div>
              </button>
            ))}
          </div>
          {errors.conditionType && <p className="mt-1.5 text-xs text-red-500">{errors.conditionType.message}</p>}
        </div>

        {/* Price */}
        <div>
          <label className="label">Price</label>
          <div className="flex gap-2 mb-3">
            <button type="button" onClick={() => setIsFree(false)}
              className={`flex-1 py-2.5 rounded-xl border-2 text-sm font-semibold transition ${!isFree ? 'border-primary-500 bg-primary-50 text-primary-700' : 'border-gray-200 text-gray-500'}`}>
              Set Price
            </button>
            <button type="button" onClick={() => setIsFree(true)}
              className={`flex-1 py-2.5 rounded-xl border-2 text-sm font-semibold transition ${isFree ? 'border-green-500 bg-green-50 text-green-700' : 'border-gray-200 text-gray-500'}`}>
              Free 🎁
            </button>
          </div>
          {!isFree && (
            <div className="relative">
              <span className="absolute left-3 top-3.5 text-gray-500 font-medium text-sm">RM</span>
              <input {...register('price', { valueAsNumber: true })} type="number" min={0} step={0.01}
                placeholder="0.00" className="input pl-12" />
            </div>
          )}
          {!isFree && (
            <div onClick={() => setValue('negotiable', !isNegotiable)}
              className={`mt-2 flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition ${isNegotiable ? 'border-blue-400 bg-blue-50' : 'border-gray-200 bg-white'}`}>
              <div className={`w-11 h-6 rounded-full transition-colors relative flex-shrink-0 ${isNegotiable ? 'bg-blue-500' : 'bg-gray-300'}`}>
                <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${isNegotiable ? 'translate-x-5' : 'translate-x-0.5'}`} />
              </div>
              <p className={`text-sm font-semibold ${isNegotiable ? 'text-blue-700' : 'text-gray-600'}`}>
                {isNegotiable ? 'Price is negotiable' : 'Fixed price'}
              </p>
            </div>
          )}
        </div>

        {/* Description */}
        <div>
          <label className="label">Description</label>
          <textarea {...register('description')} rows={4} className="input resize-none" />
        </div>

        {/* Address */}
        <div>
          <label className="label flex items-center gap-1"><MapPin size={14} />Pickup location</label>
          <input {...register('address')} type="text" placeholder="e.g. Bangsar, Kuala Lumpur" className="input" />
        </div>
      </form>
    </div>
  );
}
