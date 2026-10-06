const MASTER="EQBxwHlh-mqsszryIRQeFpvaG91EqS3HWtiQo4h2-UzYlBAX";
const REF_REWARD=5000;
const LEVELS=[
[1,0,.01],[2,100,.02],[3,150,.03],[4,200,.04],[5,300,.05],[6,400,.06],[7,500,.07],[8,650,.08],[9,800,.10],[10,1000,.12],
[11,1200,.14],[12,1500,.16],[13,1800,.18],[14,2100,.20],[15,2500,.23],[16,3000,.26],[17,3500,.29],[18,4000,.32],[19,4500,.36],[20,5000,.40],
[21,5500,.44],[22,6000,.48],[23,6500,.52],[24,7000,.56],[25,7500,.60],[26,8000,.65],[27,8500,.70],[28,9000,.75],[29,10000,.80],[30,11000,.85],
[31,12000,.90],[32,13000,.95],[33,14000,1.00],[34,15000,1.10],[35,17000,1.20],[36,19000,1.35],[37,22000,1.50],[38,25000,1.70],[39,30000,2.00],[40,40000,2.50]
].map(x=>({level:x[0],cost:x[1],speed:x[2]}));

function json(o,s=200){return new Response(JSON.stringify(o),{status:s,headers:{"content-type":"application/json","cache-control":"no-store"}})}
async function sha256(s){const b=await crypto.subtle.digest("SHA-256",new TextEncoder().encode(s));return [...new Uint8Array(b)].map(x=>x.toString(16).padStart(2,"0")).join("")}
async function verify(init,token){
 if(!init)throw Error("Telegram initData missing");
 const p=new URLSearchParams(init), hash=p.get("hash");if(!hash)throw Error("Telegram hash missing");p.delete("hash");
 const data=[...p.entries()].sort((a,b)=>a[0].localeCompare(b[0])).map(([k,v])=>`${k}=${v}`).join("\n");
 const secret=await crypto.subtle.importKey("raw",new TextEncoder().encode("WebAppData"),{name:"HMAC",hash:"SHA-256"},false,["sign"]);
 const secretBytes=await crypto.subtle.sign("HMAC",secret,new TextEncoder().encode(token));
 const key=await crypto.subtle.importKey("raw",secretBytes,{name:"HMAC",hash:"SHA-256"},false,["sign"]);
 const sig=await crypto.subtle.sign("HMAC",key,new TextEncoder().encode(data));
 const hex=[...new Uint8Array(sig)].map(x=>x.toString(16).padStart(2,"0")).join("");
 if(hex!==hash)throw Error("Invalid Telegram initData");
 const u=JSON.parse(p.get("user")||"{}");if(!u.id)throw Error("Telegram user missing");return u
}
function levelInfo(n){return LEVELS[Math.max(0,Math.min(39,n-1))]}
async function accrue(env,user){
 if(!user.mining||!user.mining_started_at)return user;
 const now=Math.floor(Date.now()/1000), elapsed=Math.max(0,now-user.mining_started_at);
 const rate=levelInfo(user.level).speed/3600;
 const earned=Math.min(rate*elapsed,50);
 if(earned<=0)return user;
 const balance=user.balance+earned;
 await env.DB.prepare("UPDATE users SET balance=?, mining_started_at=?, updated_at=? WHERE id=?").bind(balance,now,now,user.id).run();
 user.balance=balance;user.mining_started_at=now;return user
}
async function getUser(env,id){return await env.DB.prepare("SELECT * FROM users WHERE id=?").bind(id).first()}
async function ensureUser(env,tg){
 let u=await getUser(env,tg.id),now=Math.floor(Date.now()/1000);
 if(!u){await env.DB.prepare("INSERT INTO users(id,username,first_name,created_at,updated_at) VALUES(?,?,?,?,?)").bind(tg.id,tg.username||"",tg.first_name||"",now,now).run();u=await getUser(env,tg.id)}
 return await accrue(env,u)
}
async function userFrom(req,env){
 const init=req.headers.get("X-Telegram-Init-Data")||"";
 const tg=await verify(init,env.BOT_TOKEN);return ensureUser(env,tg)
}
function state(u){return {level:u.level,balance:u.balance,mined:u.balance,energy:u.energy,mining:!!u.mining,wallet:u.wallet||"",referrals:u.referrals||0,earned:u.balance}}
export default {async fetch(req,env){
 try{
  const url=new URL(req.url);
  if(url.pathname==="/health")return json({ok:true});
  if(url.pathname==="/api/bootstrap"&&req.method==="GET"){const u=await userFrom(req,env);return json({ok:true,state:state(u),levels:LEVELS})}
  if(url.pathname==="/api/mine/start"&&req.method==="POST"){let u=await userFrom(req,env);if(!u.mining){const now=Math.floor(Date.now()/1000);await env.DB.prepare("UPDATE users SET mining=1,mining_started_at=?,updated_at=? WHERE id=?").bind(now,now,u.id).run();u.mining=1;u.mining_started_at=now}return json({ok:true,state:state(u)})}
  if(url.pathname==="/api/mine/stop"&&req.method==="POST"){let u=await userFrom(req,env);u=await accrue(env,u);await env.DB.prepare("UPDATE users SET mining=0,mining_started_at=NULL,updated_at=? WHERE id=?").bind(Math.floor(Date.now()/1000),u.id).run();u.mining=0;u.mining_started_at=null;return json({ok:true,state:state(u)})}
  if(url.pathname==="/api/level/upgrade"&&req.method==="POST"){let u=await userFrom(req,env);if(u.level>=40)throw Error("Maximum level reached");const next=levelInfo(u.level+1);if(u.balance<next.cost)throw Error("Not enough PERS");u.balance-=next.cost;u.level++;await env.DB.prepare("UPDATE users SET balance=?,level=?,updated_at=? WHERE id=?").bind(u.balance,u.level,Math.floor(Date.now()/1000),u.id).run();return json({ok:true,state:state(u)})}
  if(url.pathname==="/api/wallet/bind"&&req.method==="POST"){const u=await userFrom(req,env),b=await req.json();const w=String(b.wallet||"").trim();if(!/^[A-Za-z0-9_-]{20,120}$/.test(w))throw Error("Invalid wallet address");await env.DB.prepare("UPDATE users SET wallet=?,updated_at=? WHERE id=?").bind(w,Math.floor(Date.now()/1000),u.id).run();u.wallet=w;return json({ok:true,state:state(u)})}
  return json({ok:false,error:"Not found"},404)
 }catch(e){return json({ok:false,error:e.message||"Server error"},400)}
}}
