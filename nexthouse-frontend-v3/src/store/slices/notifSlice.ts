import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { NotificationResponse } from '@/types';
interface S { items:NotificationResponse[]; unread:number; followReqCount:number; }
const notifSlice = createSlice({ name:'notif', initialState:{items:[],unread:0,followReqCount:0} as S, reducers:{
  setNotifs:(s,a:PayloadAction<NotificationResponse[]>)=>{s.items=a.payload;},
  prepend:(s,a:PayloadAction<NotificationResponse>)=>{s.items.unshift(a.payload);if(!a.payload.read)s.unread+=1;},
  setUnread:(s,a:PayloadAction<number>)=>{s.unread=a.payload;},
  markOneRead:(s,a:PayloadAction<number>)=>{const n=s.items.find(n=>n.id===a.payload);if(n&&!n.read){n.read=true;s.unread=Math.max(0,s.unread-1);}},
  markAllRead:(s)=>{s.items.forEach(n=>{n.read=true;});s.unread=0;},
  setFollowReqCount:(s,a:PayloadAction<number>)=>{s.followReqCount=a.payload;},
  incrementFollowReqCount:(s)=>{s.followReqCount+=1;},
  decrementFollowReqCount:(s)=>{s.followReqCount=Math.max(0,s.followReqCount-1);},
}});
export const {setNotifs,prepend,setUnread,markOneRead,markAllRead,setFollowReqCount,incrementFollowReqCount,decrementFollowReqCount}=notifSlice.actions;
export default notifSlice.reducer;
