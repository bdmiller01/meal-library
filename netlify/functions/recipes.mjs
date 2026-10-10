import {validSession} from './auth.mjs';
const respond=(statusCode,data)=>({statusCode,headers:{'Content-Type':'application/json','Cache-Control':'no-store'},body:JSON.stringify(data)});
export async function handler(event){
 if(event.httpMethod!=='GET')return respond(405,{error:'Method not allowed'});
 if(!validSession(event))return respond(401,{error:'Connect your family to view recipe details'});
 const url=process.env.SUPABASE_URL,key=process.env.SUPABASE_SERVICE_ROLE_KEY;
 if(!url||!key)return respond(503,{error:'Database not configured'});
 try{
  const res=await fetch(url.replace(/\/$/,'')+'/rest/v1/meal_recipes?select=id,details&order=id.asc&limit=100',{headers:{apikey:key,Authorization:'Bearer '+key}});
  if(!res.ok)return respond(res.status===404?503:502,{error:'Recipe database is not initialized. Run the recipe migration in Supabase.'});
  const rows=await res.json();return respond(200,{recipes:rows.map(r=>r.details)});
 }catch{return respond(502,{error:'Could not load recipes'})}
}