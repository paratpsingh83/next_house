import { createSlice, PayloadAction } from '@reduxjs/toolkit';
interface S { online:number[]; }
const presenceSlice = createSlice({ name:'presence', initialState:{online:[]} as S, reducers:{
  setOnline:(s,a:PayloadAction<number>)=>{if(!s.online.includes(a.payload))s.online.push(a.payload);},
  setOffline:(s,a:PayloadAction<number>)=>{s.online=s.online.filter(id=>id!==a.payload);},
}});
export const {setOnline,setOffline}=presenceSlice.actions;
export default presenceSlice.reducer;
