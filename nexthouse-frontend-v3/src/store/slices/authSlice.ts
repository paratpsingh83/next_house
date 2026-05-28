import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { UserResponse } from '@/types';
import { tokens } from '@/lib/apiClient';
interface S { user: UserResponse|null; isAuth: boolean; loading: boolean; }
const authSlice = createSlice({ name:'auth', initialState:{user:null,isAuth:false,loading:true} as S, reducers:{
  setCredentials:(s,a:PayloadAction<{user:UserResponse;accessToken:string;refreshToken:string}>)=>{
    s.user=a.payload.user;s.isAuth=true;s.loading=false;
    tokens.set(a.payload.accessToken,a.payload.refreshToken);
  },
  setUser:(s,a:PayloadAction<UserResponse>)=>{s.user=a.payload;},
  clearAuth:(s)=>{s.user=null;s.isAuth=false;s.loading=false;tokens.clear();},
  setLoading:(s,a:PayloadAction<boolean>)=>{s.loading=a.payload;},
}});
export const {setCredentials,setUser,clearAuth,setLoading}=authSlice.actions;
export default authSlice.reducer;
