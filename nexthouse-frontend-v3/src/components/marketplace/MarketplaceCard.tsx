'use client';
import type { MarketplaceItemResponse } from '@/types';
import { ShoppingBag } from 'lucide-react';
import Link from 'next/link';

export default function MarketplaceCard({ item }: { item: MarketplaceItemResponse }) {
  return (
    <Link href={`/marketplace/${item.id}`}>
      <div className="card overflow-hidden hover:shadow-md transition">
        <div className="aspect-square bg-gray-100 overflow-hidden relative">
          {item.thumbnailUrl
            ? <img src={item.thumbnailUrl} className="w-full h-full object-cover" alt={item.title} loading="lazy"/>
            : <div className="w-full h-full flex items-center justify-center text-gray-200"><ShoppingBag size={36}/></div>
          }
          {(!item.available || item.status === 'SOLD') && (
            <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
              <span className="bg-white text-gray-900 font-bold text-xs px-3 py-1 rounded-full">SOLD</span>
            </div>
          )}
          {item.featured && (
            <div className="absolute top-2 left-2">
              <span className="badge bg-yellow-400 text-yellow-900 text-[10px]">⭐ Featured</span>
            </div>
          )}
        </div>
        <div className="p-3 space-y-1">
          <p className="font-semibold text-sm text-gray-900 truncate leading-snug">{item.title}</p>
          <div className="flex items-center justify-between">
            {item.price != null
              ? <p className="text-primary-600 font-bold text-sm">RM {Number(item.price).toFixed(2)}</p>
              : <p className="text-green-600 font-bold text-sm">Free</p>
            }
            {item.negotiable && <span className="text-xs text-blue-500">nego</span>}
          </div>
          <p className="text-xs text-gray-400 truncate">{item.seller.name}</p>
          {item.category && (
            <span className="badge bg-gray-100 text-gray-500 text-[10px]">{item.category}</span>
          )}
        </div>
      </div>
    </Link>
  );
}