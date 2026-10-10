import {createHmac,timingSafeEqual} from 'node:crypto';
const name='meal_library_session',life=90*86400;
const sign=p=>createHmac('sha256',process.env.SUPABASE_SERVICE_ROLE_KEY).update('meal-library-session-v1:'+p).digest('base64url');
const reply=(statusCode,body,headers={})=>({statusCode,headers:{'Content-Type':'application/json','Cache-Control':'no-store',...headers},body:JSON.stringify(body)});
const cookie=(v,age)=>name+'='+v+'; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age='+age;
export function validSession(e){
  if(!process.env.SUPABASE_SERVICE_ROLE_KEY)return false;
  const c=(e.headers.cookie||e.headers.Cookie||'').split(';').map(x=>x.trim()).find(x=>x.startsWith(name+'='));
  if(!c)return false;
  const [p,s,...extra]=c.slice(name.length+1).split('.');
  if(!p||!s||extra.length)return false;
  const a=Buffer.from(s),b=Buffer.from(sign(p)),expiry=Number(p),now=Date.now()/1000;
  return a.length===b.length&&timingSafeEqual(a,b)&&Number.isSafeInteger(expiry)&&expiry>now&&expiry<=now+life+60;
}
export async function handler(e){
  if(!process.env.FAMILY_ACCESS_CODE||!process.env.SUPABASE_SERVICE_ROLE_KEY)return reply(503,{error:'Family connection is not configured'});
  if(e.httpMethod==='GET')return validSession(e)?reply(200,{connected:true}):reply(401,{connected:false});
  if(e.httpMethod==='DELETE')return reply(200,{connected:false},{'Set-Cookie':cookie('',0)});
  if(e.httpMethod!=='POST')return reply(405,{error:'Method not allowed'});
  if((e.body||'').length>1024)return reply(413,{error:'Request too large'});
  let data;try{data=JSON.parse(e.body||'{}')}catch{return reply(400,{error:'Invalid request'})}
  const a=Buffer.from(String(data.code||'')),b=Buffer.from(process.env.FAMILY_ACCESS_CODE);
  if(a.length!==b.length||!timingSafeEqual(a,b))return reply(401,{error:'Incorrect family access code'});
  const expiry=String(Math.floor(Date.now()/1000)+life);
  return reply(200,{connected:true},{'Set-Cookie':cookie(expiry+'.'+sign(expiry),life)});
}