const LEVELS=Array.from({length:400},(_,i)=>({level:i+1,hold:i?Math.round(100+Math.pow(i/399,1.42)*149900):0,speed:i===11?125.6:i===399?500:+(1+i/399*499).toFixed(2)}));LEVELS[11]={level:12,hold:15000,speed:125.6};
const CORS={"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"content-type,x-telegram-init-data","Access-Control-Allow-Methods":"GET,POST,OPTIONS"};
const json=(x,s=200)=>new Response(JSON.stringify(x),{status:s,headers:{"content-type":"application/json","cache-control":"no-store",...CORS}});
async function hmac(key,data){return crypto.subtle.sign("HMAC",key,new TextEncoder().encode(data))}
async function hex(buf){return [...new Uint8Array(buf)].map(x=>x.toString(16).padStart(2,"0")).join("")}
async function telegramUser(init,token){
  const p=new URLSearchParams(init||""),hash=p.get("hash");if(!hash)throw Error("Missing Telegram initData");
  p.delete("hash");const data=[...p.entries()].sort((a,b)=>a[0].localeCompare(b[0])).map(([k,v])=>`${k}=${v}`).join("\n");
  const k1=await crypto.subtle.importKey("raw",new TextEncoder().encode("WebAppData"),{name:"HMAC",hash:"SHA-256"},false,["sign"]);
  const secret=await hmac(k1,token);
  const k2=await crypto.subtle.importKey("raw",secret,{name:"HMAC",hash:"SHA-256"},false,["sign"]);
  if(await hex(await hmac(k2,data))!==hash)throw Error("Invalid Telegram initData");
  return JSON.parse(p.get("user")||"{}");
}
function state(x){return{level:+x.level,balance:+x.balance,mined:+x.mined,energy:+x.energy,mining:!!x.mining,wallet:x.wallet||"",referrals:+(x.referrals||0),earned:+(x.referral_earned||0)}}
async function user(env,u){
  let x=await env.DB.prepare("SELECT * FROM users WHERE id=?").bind(u.id).first();
  if(!x){const now=Math.floor(Date.now()/1000);await env.DB.prepare("INSERT INTO users(id,username,level,balance,mined,energy,mining,last_mine_at,wallet,referrals,referral_earned,created_at) VALUES(?,?,1,0,0,200,0,?,NULL,0,0,?)").bind(u.id,u.username||u.first_name||"",now,now).run();x=await env.DB.prepare("SELECT * FROM users WHERE id=?").bind(u.id).first()}
  return x;
}
export default{async fetch(req,env){
  if(req.method==="OPTIONS")return json({ok:true});
  const url=new URL(req.url);
  if(url.pathname==="/health")return json({ok:true,service:"PERSEPOLIS-PHASER"});
  let u;try{u=await telegramUser(req.headers.get("X-Telegram-Init-Data"),env.BOT_TOKEN)}catch(e){return json({ok:false,error:e.message},401)}
  let x=await user(env,u),now=Math.floor(Date.now()/1000);
  if(url.pathname==="/api/bootstrap")return json({ok:true,state:state(x),levels:LEVELS});
  if(req.method!=="POST")return json({ok:false,error:"Not found"},404);
  const b=await req.json().catch(()=>({}));
  if(url.pathname==="/api/mine/start"){await env.DB.prepare("UPDATE users SET mining=1,last_mine_at=? WHERE id=?").bind(now,u.id).run();return json({ok:true,state:state({...x,mining:1,last_mine_at:now})})}
  if(url.pathname==="/api/mine/stop"){await env.DB.prepare("UPDATE users SET mining=0,last_mine_at=? WHERE id=?").bind(now,u.id).run();return json({ok:true,state:state({...x,mining:0,last_mine_at:now})})}
  if(url.pathname==="/api/level/upgrade"){const n=LEVELS[x.level];if(!n)return json({ok:false,error:"Maximum level"},400);if(+x.balance<n.hold)return json({ok:false,error:"Not enough PERS"},400);await env.DB.prepare("UPDATE users SET level=level+1,balance=balance-?,mining=0,last_mine_at=? WHERE id=?").bind(n.hold,now,u.id).run();return json({ok:true,state:state({...x,level:x.level+1,balance:+x.balance-n.hold,mining:0,last_mine_at:now})})}
  if(url.pathname==="/api/tasks/claim"){if(b.taskId!=="daily")return json({ok:false,error:"Task not enabled"},400);const key=new Date().toISOString().slice(0,10);try{await env.DB.prepare("INSERT INTO task_claims(user_id,task_id,claim_key,claimed_at) VALUES(?,?,?,?)").bind(u.id,"daily",key,now).run()}catch{return json({ok:false,error:"Already claimed today"},400)}await env.DB.prepare("UPDATE users SET balance=balance+500 WHERE id=?").bind(u.id).run();return json({ok:true,state:state({...x,balance:+x.balance+500})})}
  if(url.pathname==="/api/wallet/bind"){const w=String(b.wallet||"").trim();if(!/^[EU]Q[A-Za-z0-9_-]{46}$/.test(w))return json({ok:false,error:"Invalid TON wallet address"},400);await env.DB.prepare("UPDATE users SET wallet=? WHERE id=?").bind(w,u.id).run();return json({ok:true,state:state({...x,wallet:w})})}
  return json({ok:false,error:"Not found"},404);
}};
