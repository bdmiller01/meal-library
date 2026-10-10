import {validSession} from './auth.mjs';

const members = new Set(['adult-1','adult-2','kid-1','kid-2']);
const fields = new Set(['favorite','request']);
const slug = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
function reply(statusCode, data) { return {statusCode, headers:{'Content-Type':'application/json','Cache-Control':'no-store'}, body:JSON.stringify(data)}; }
export async function handler(event) {
  if (!['GET','POST'].includes(event.httpMethod)) return reply(405,{error:'Method not allowed'});
  const url=process.env.SUPABASE_URL, key=process.env.SUPABASE_SERVICE_ROLE_KEY, code=process.env.FAMILY_ACCESS_CODE;
  if (!url || !key || !code) return reply(503,{error:'Shared database is not configured yet'});
  if (!validSession(event)) return reply(401,{error:'Invalid family access code'});
  const base=url.replace(/\/$/,'')+'/rest/v1/meal_feedback';
  const headers={'apikey':key,'Authorization':'Bearer '+key,'Content-Type':'application/json'};
  try {
    if(event.httpMethod==='GET') {
      const res=await fetch(base+'?select=member_id,meal_id,favorite,request&limit=1000',{headers});
      if(!res.ok)throw new Error('Database read failed');
      const rows=await res.json(), feedback={};
      for(const r of rows)feedback[r.member_id+'::'+r.meal_id]={favorite:r.favorite,request:r.request};
      return reply(200,{feedback});
    }
    if((event.body||'').length>2000)return reply(413,{error:'Payload too large'});
    const body=JSON.parse(event.body||'{}');
    if(!members.has(body.member_id)||!slug.test(body.meal_id||'')||body.meal_id.length>100||!fields.has(body.field)||typeof body.value!=='boolean')return reply(400,{error:'Invalid feedback'});
    const patch={[body.field]:body.value};
    const query='?member_id=eq.'+encodeURIComponent(body.member_id)+'&meal_id=eq.'+encodeURIComponent(body.meal_id);
    // Upsert preserves the other feedback field: fetch row, then update or insert.
    const existing=await fetch(base+query+'&select=favorite,request',{headers});
    if(!existing.ok)throw new Error('Database lookup failed');
    const rows=await existing.json();
    let res;
    if(rows.length){res=await fetch(base+query,{method:'PATCH',headers:{...headers,'Prefer':'return=minimal'},body:JSON.stringify(patch)})}
    else {res=await fetch(base,{method:'POST',headers:{...headers,'Prefer':'resolution=merge-duplicates,return=minimal'},body:JSON.stringify({member_id:body.member_id,meal_id:body.meal_id,...patch})})}
    if(!res.ok)throw new Error('Database write failed');
    return reply(200,{ok:true});
  }catch(err){console.error(err);return reply(500,{error:'Could not access shared feedback'})}
}
