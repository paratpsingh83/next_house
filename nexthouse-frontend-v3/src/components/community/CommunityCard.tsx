'use client';
import type { CommunityResponse } from '@/types';
import Link from 'next/link';

interface Props {
  community: CommunityResponse;
  onJoin: (id: number, e: React.MouseEvent) => void;
}

export default function CommunityCard({ community: c, onJoin }: Props) {
  return (
    <Link href={`/communities/${c.id}`}>
      <div className="card p-4 flex items-center gap-3 hover:shadow-md transition">
        <div className="w-12 h-12 rounded-xl bg-primary-100 flex items-center justify-center flex-shrink-0 overflow-hidden">
          {c.iconImage
            ? <img src={c.iconImage} className="w-full h-full object-cover" alt={c.name}/>
            : <span className="text-primary-600 font-bold text-lg">{c.name[0]}</span>
          }
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-gray-900 truncate">{c.name}</h3>
            {c.verified && <span className="text-primary-500 text-xs">✓</span>}
          </div>
          <p className="text-xs text-gray-500 truncate">{c.memberCount} members · {c.communityType}</p>
          {c.description && <p className="text-xs text-gray-400 truncate mt-0.5">{c.description}</p>}
        </div>
        {!c.isMember
          ? <button onClick={e => onJoin(c.id, e)} className="btn-primary text-xs px-3 py-1.5">Join</button>
          : <span className="badge bg-primary-50 text-primary-600 text-xs">Joined</span>
        }
      </div>
    </Link>
  );
}