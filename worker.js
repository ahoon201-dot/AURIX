const DB = "PERSEPOLIS_DB";
const MAX_ENERGY = 200;
const MAX_LEVEL = 400;

function json(data, status=200){
  return new Response(JSON.stringify(data), {
    status, headers: {"content-type":"application/json; charset=utf-8","access-control-allow-origin":"*","access-control-allow-headers":"content-type,x-telegram-init-data","access-control-allow-methods":"GET,POST,OPTIONS"}
  });
}
function cors(){ return new Response(null,{status:204,headers:{
  "access-control-allow-origin":"*","access-control-allow-headers":"content-type,x-telegram-init-data","access-control-allow-methods":"GET,POST,OPTIONS"
}}); }

async function hmac(keyBytes, data){
  const key = await crypto.subtle.importKey("raw", keyBytes, {name:"HMAC",hash:"SHA-256"}, false, ["sign"]);
  return new Uint8Array(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(data)));
}
function hex(a){ return [...a].map(x=>x.toString(16).padStart(2,"0")).join(""); }

async function telegramUser(env, initData){
  if(!initData) return null;
  const p = new URLSearchParams(initData);
  const hash = p.get("hash");
  if(!hash) return null;
  p.delete("hash");
  const dataCheck = [...p.entries()].sort(([a],[b])=>a.localeCompare(b)).map(([k,v])=>`${k}=${v}`).join("\n");
  const botToken = env.BOT_TOKEN;
  if(!botToken) return null;
  const secret = await hmac(new TextEncoder().encode("WebAppData"), botToken);
  const calc = hex(await hmac(secret, dataCheck));
  if(calc !== hash) return null;
  const user = p.get("user");
  try { return user ? JSON.parse(user) : null; } catch { return null; }
}

function levelInfo(level){
  const l = Math.max(1,Math.min(MAX_LEVEL,Number(level)||1));
  const t=(l-1)/(MAX_LEVEL-1);
  let hold=l===1?0:Math.round(100+Math.pow(t,1.42)*149900);
  let speed=l<=12?1+((l-1)/11)*124.6:125.6+Math.pow((l-12)/388,1.15)*374.4;
  if(l===12){hold=15000;speed=125.6}
  if(l===400){hold=150000;speed=500}
  return {level:l,hold,speed:Number(speed.toFixed(2))};
}

async function getUser(env,id){
  const k=`u:${id}`;
  let u=await env.DB.get(k,"json");
  if(!u){
    u={id,level:1,balance:0,mined:0,energy:MAX_ENERGY,mining:false,lastMineAt:null,
       referrals:0,referralEarned:0,wallet:null,createdAt:Date.now(),tasks:{}};
    await env.DB.put(k,JSON.stringify(u));
  }
  return u;
}
async function saveUser(env,u){ await env.DB.put(`u:${u.id}`,JSON.stringify(u)); }

function accrue(u){
  if(!u.mining || !u.lastMineAt) return 0;
  const sec=Math.max(0,(Date.now()-u.lastMineAt)/1000);
  const rate=levelInfo(u.level).speed/3600;
  const earned=Math.min(u.energy, sec*rate);
  if(earned>0){u.balance+=earned;u.mined+=earned;u.energy=Math.max(0,u.energy-earned);u.lastMineAt=Date.now();}
  return earned;
}

async function auth(req,env){
  const init=req.headers.get("x-telegram-init-data") || "";
  const user=await telegramUser(env,init);
  if(!user) return null;
  const u=await getUser(env,String(user.id));
  u.telegram=user;
  accrue(u);
  await saveUser(env,u);
  return u;
}

export default {
  async fetch(req,env){
    if(req.method==="OPTIONS") return cors();
    const url=new URL(req.url);
    if(url.pathname==="/health") return json({ok:true,app:"PERSEPOLIS"});
    if(url.pathname==="/tonconnect-manifest.json")
      return json({url:"https://YOUR-DOMAIN.example",name:"PERSEPOLIS",iconUrl:"https://YOUR-DOMAIN.example/icon.png"});
    if(!url.pathname.startsWith("/api/")) return new Response("PERSEPOLIS API",{status:200});

    if(url.pathname==="/api/bootstrap" && req.method==="POST"){
      const u=await auth(req,env); if(!u) return json({error:"INVALID_TELEGRAM_INIT_DATA"},401);
      return json({state:u,level:levelInfo(u.level)});
    }
    if(url.pathname==="/api/mine/start" && req.method==="POST"){
      const u=await auth(req,env); if(!u) return json({error:"UNAUTHORIZED"},401);
      if(u.energy<=0) return json({error:"NO_ENERGY"},400);
      u.mining=true;u.lastMineAt=Date.now();await saveUser(env,u);return json({ok:true,state:u});
    }
    if(url.pathname==="/api/mine/stop" && req.method==="POST"){
      const u=await auth(req,env); if(!u) return json({error:"UNAUTHORIZED"},401);
      u.mining=false;await saveUser(env,u);return json({ok:true,state:u});
    }
    if(url.pathname==="/api/mine/claim" && req.method==="POST"){
      const u=await auth(req,env); if(!u) return json({error:"UNAUTHORIZED"},401);
      u.mining=false;await saveUser(env,u);return json({ok:true,state:u,claimed:true});
    }
    if(url.pathname==="/api/level/upgrade" && req.method==="POST"){
      const u=await auth(req,env); if(!u) return json({error:"UNAUTHORIZED"},401);
      const next=u.level+1, info=levelInfo(next);
      if(next>MAX_LEVEL) return json({error:"MAX_LEVEL"},400);
      if(u.balance<info.hold) return json({error:"INSUFFICIENT_PERS",required:info.hold,balance:u.balance},400);
      u.balance-=info.hold;u.level=next;await saveUser(env,u);
      return json({ok:true,state:u,level:info});
    }
    if(url.pathname==="/api/wallet/bind" && req.method==="POST"){
      const u=await auth(req,env); if(!u) return json({error:"UNAUTHORIZED"},401);
      const b=await req.json().catch(()=>({}));
      if(!/^EQ|^UQ/.test(String(b.wallet||""))) return json({error:"INVALID_WALLET"},400);
      u.wallet=String(b.wallet);await saveUser(env,u);return json({ok:true,state:u});
    }
    if(url.pathname==="/api/tasks/claim" && req.method==="POST"){
      const u=await auth(req,env); if(!u) return json({error:"UNAUTHORIZED"},401);
      const b=await req.json().catch(()=>({})), task=String(b.task||"");
      const rewards={daily:500,telegram:1000,x:1000,invite3:5000,video:1000,swap:2000};
      if(!(task in rewards)) return json({error:"TASK_NOT_FOUND"},404);
      const key=`${task}:${new Date().toISOString().slice(0,10)}`;
      if(u.tasks[key]) return json({error:"ALREADY_CLAIMED"},400);
      u.tasks[key]=true;u.balance+=rewards[task];await saveUser(env,u);
      return json({ok:true,reward:rewards[task],state:u});
    }
    return json({error:"NOT_FOUND"},404);
  }
};
