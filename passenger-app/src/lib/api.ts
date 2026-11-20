import AsyncStorage from '@react-native-async-storage/async-storage';
const TOKEN_KEY='bustrack.auth.token';
const API_BASE_URL=(process.env.EXPO_PUBLIC_API_URL||'http://localhost:3000').trim().replace(/\/$/,'');
export async function getBaseUrl(){return API_BASE_URL;}
export async function getToken(){return AsyncStorage.getItem(TOKEN_KEY);}export async function saveToken(token:string|null){if(token)await AsyncStorage.setItem(TOKEN_KEY,token);else await AsyncStorage.removeItem(TOKEN_KEY);}
export async function api<T=any>(path:string,options:RequestInit={}){const base=await getBaseUrl(),token=await getToken();let response:Response;try{response=await fetch(`${base}${path}`,{...options,headers:{'Content-Type':'application/json',...(token?{Authorization:`Bearer ${token}`} :{}),...(options.headers||{})}});}catch{throw new Error('Cannot reach the configured BusTrack server. Check your Wi-Fi and EXPO_PUBLIC_API_URL.');}const body=await response.json().catch(()=>({message:'Invalid server response'}));if(!response.ok)throw new Error(body.message||`Request failed (${response.status})`);return body as T;}
