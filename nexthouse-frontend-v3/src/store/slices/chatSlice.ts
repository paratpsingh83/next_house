import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { ChatRoomResponse, ChatMessageResponse } from '@/types';
interface S { rooms:ChatRoomResponse[]; messages:Record<number,ChatMessageResponse[]>; typing:Record<number,number[]>; totalUnread:number; }
const chatSlice = createSlice({ name:'chat', initialState:{rooms:[],messages:{},typing:{},totalUnread:0} as S, reducers:{
  setRooms:(s,a:PayloadAction<ChatRoomResponse[]>)=>{s.rooms=a.payload;},
  appendMessage:(s,a:PayloadAction<{roomId:number;message:ChatMessageResponse}>)=>{
    const {roomId,message}=a.payload;
    if(!s.messages[roomId])s.messages[roomId]=[];
    s.messages[roomId].push(message);
    const r=s.rooms.find(r=>r.id===roomId);
    if(r){r.lastMessagePreview=message.message?.slice(0,100)??'[media]';r.lastMessageAt=message.createdAt;}
  },
  setMessages:(s,a:PayloadAction<{roomId:number;messages:ChatMessageResponse[]}>)=>{s.messages[a.payload.roomId]=a.payload.messages;},
  setTyping:(s,a:PayloadAction<{roomId:number;userId:number;typing:boolean}>)=>{
    const {roomId,userId,typing}=a.payload;const cur=s.typing[roomId]??[];
    s.typing[roomId]=typing?[...new Set([...cur,userId])]:cur.filter(id=>id!==userId);
  },
  setTotalUnread:(s,a:PayloadAction<number>)=>{s.totalUnread=a.payload;},
}});
export const {setRooms,appendMessage,setMessages,setTyping,setTotalUnread}=chatSlice.actions;
export default chatSlice.reducer;
