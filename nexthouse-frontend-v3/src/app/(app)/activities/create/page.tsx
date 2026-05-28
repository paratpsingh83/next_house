'use client';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
export default function Page() {
  const router = useRouter();
  return (
    <div className="px-4 py-4">
      <div className="flex items-center gap-3 mb-4"><button onClick={()=>router.back()} className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100"><ArrowLeft size={20}/></button><h1 className="font-bold text-gray-900">Coming soon</h1></div>
      <div className="card p-8 text-center text-gray-400"><p>This feature is coming soon!</p></div>
    </div>
  );
}
