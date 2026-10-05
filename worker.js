const PERS_MASTER="EQBxwHlh-mqsszryIRQeFpvaG91EqS3HWtiQo4h2-UzYlBAX";
const MAX_HOURS=8, MIN_WITHDRAW=10, REF_REWARD=5000;
const LEVELS=buildLevels();

export default {async fetch(request,env){
  const url=new URL(request.url);
  try{
    if(url.pathname==="/health")return json({ok:true,status:"ok",project:"PERSEPOLIS",version:"v2-server-authoritative"});
    if(url.pathname==="/api/levels")return json({ok:true,count:400,levels:LEVELS});
    if(url.pathname==="/api/payout-config")return json({ok:true,master:PERS_MASTER,minimum:MIN_WITHDRAW,decimals:9});
    if(url.pathname==="/telegram"&&request.method==="POST")return telegramWebhook(request,env);
    if(url.pathname==="/setup-webhook")return setupWebhook(request,env);

    if(!env.DB) return json({ok:false,error:"D1 binding DB is required"},500);

    if(url.pathname==="/api/bootstrap"&&request.method==="POST"){
      const auth=await authUser(request,env); if(!auth.ok)return json(auth,401);
      const body=await safeJson(request); const ref=String(body.ref||"");
      const wallet=String(body.wallet||"");
      await ensureUser(env,auth.user,ref);
      if(wallet&&isWallet(wallet)) await bindWallet(env,auth.user.id,wallet);
      await accrueUser(env,auth.user.id);
      const u=await getUser(env,auth.user.id);
      const refs=await countRefs(env,auth.user.id);
      const tasks=await getTaskIds(env,auth.user.id);
      const state={...u,referrals:refs,tasks};
      return json({ok:true,state,levels:LEVELS});
    }

    const auth=await authUser(request,env); if(!auth.ok)return json(auth,401);
    await ensureUser(env,auth.user,"");
    const uid=auth.user.id;
    if(url.pathname==="/api/leaderboard"&&request.method==="GET")return leaderboard(env);

    if(url.pathname==="/api/mine/start"&&request.method==="POST"){
      await accrueUser(env,uid);
      const u=await getUser(env,uid);
      if(u.mining) return json({ok:true,state:u});
      await env.DB.prepare(`UPDATE users SET mining=1,last_mine_at=?,updated_at=? WHERE telegram_id=?`).bind(Date.now(),Date.now(),uid).run();
      return json({ok:true,state:await getUser(env,uid)});
    }
    if(url.pathname==="/api/mine/stop"&&request.method==="POST"){
      await accrueUser(env,uid);
      await env.DB.prepare(`UPDATE users SET mining=0,updated_at=? WHERE telegram_id=?`).bind(Date.now(),uid).run();
      return json({ok:true,state:await getUser(env,uid)});
    }
    if(url.pathname==="/api/mine/claim"&&request.method==="POST"){
      await accrueUser(env,uid);
      const u=await getUser(env,uid);
      const amount=Number(u.mined||0);
      if(amount<=0)return json({ok:false,error:"Nothing to claim"},400);
      await env.DB.prepare(`UPDATE users SET saved=saved+?,mined=0,updated_at=? WHERE telegram_id=?`).bind(amount,Date.now(),uid).run();
      return json({ok:true,state:await getUser(env,uid),claimed:amount});
    }
    if(url.pathname==="/api/tasks/claim"&&request.method==="POST"){
      const body=await safeJson(request),task=String(body.taskId||"");
      const rewards={daily:500,telegram:1000,x:1000,invite3:5000,watch:1000,swap:2000};
      if(!rewards[task])return json({ok:false,error:"Unknown task"},400);
      await ensureSchema(env);
      const claimKey=task==="daily"?`daily:${new Date().toISOString().slice(0,10)}`:task;
      const exists=await env.DB.prepare(`SELECT task_id FROM task_claims WHERE telegram_id=? AND task_id=?`).bind(uid,claimKey).first();
      if(exists)return json({ok:false,error:"Task already claimed"},400);
      await env.DB.prepare(`INSERT INTO task_claims(telegram_id,task_id,created_at) VALUES(?,?,?)`).bind(uid,claimKey,Date.now()).run();
      await env.DB.prepare(`UPDATE users SET saved=saved+?,updated_at=? WHERE telegram_id=?`).bind(rewards[task],Date.now(),uid).run();
      const u=await getUser(env,uid); return json({ok:true,reward:rewards[task],state:{...u,tasks:await getTaskIds(env,uid),referrals:await countRefs(env,uid)}});
    }
    if(url.pathname==="/api/level/upgrade"&&request.method==="POST"){
      const body=await safeJson(request),wanted=Number(body.level||0),wallet=String(body.wallet||"");
      const u=await getUser(env,uid),next=LEVELS[u.level]||null;
      if(!next||next.level!==wanted)return json({ok:false,error:"Invalid next level"},400);
      if(!isWallet(wallet))return json({ok:false,error:"Valid TON wallet required"},400);
      const balance=await getPersBalance(wallet);
      if(balance<next.hold)return json({ok:false,error:`Hold at least ${next.hold} PERS`},400);
      await env.DB.prepare(`UPDATE users SET level=?,wallet=?,updated_at=? WHERE telegram_id=?`).bind(wanted,wallet,Date.now(),uid).run();
      return json({ok:true,state:await getUser(env,uid)});
    }
    if(url.pathname==="/api/wallet/bind"&&request.method==="POST"){
      const body=await safeJson(request),wallet=String(body.wallet||"");
      if(!isWallet(wallet))return json({ok:false,error:"Invalid TON wallet"},400);
      await bindWallet(env,uid,wallet);
      return json({ok:true,wallet});
    }
    if(url.pathname==="/api/withdraw"&&request.method==="POST"){
      const body=await safeJson(request),wallet=String(body.wallet||""),amount=Number(body.amount||0);
      if(!isWallet(wallet))return json({ok:false,error:"Invalid TON wallet"},400);
      if(amount<MIN_WITHDRAW)return json({ok:false,error:`Minimum withdrawal is ${MIN_WITHDRAW} PERS`},400);
      await accrueUser(env,uid);
      const u=await getUser(env,uid);
      if(amount>Number(u.saved||0))return json({ok:false,error:"Insufficient saved PERS"},400);
      if(u.wallet&&u.wallet!==wallet)return json({ok:false,error:"Wallet does not match your bound wallet"},400);
      await env.DB.prepare(`INSERT INTO withdrawals(telegram_id,wallet,amount,status,created_at) VALUES(?,?,?,?,?)`).bind(uid,wallet,amount,"pending",Date.now()).run();
      await env.DB.prepare(`UPDATE users SET saved=saved-?,updated_at=? WHERE telegram_id=?`).bind(amount,Date.now(),uid).run();
      return json({ok:true,status:"pending",state:await getUser(env,uid)});
    }

    if(url.pathname==="/api/withdrawals"&&request.method==="GET"){
      const secret=request.headers.get("X-Admin-Secret")||"";
      if(!env.ADMIN_SECRET||secret!==env.ADMIN_SECRET)return json({ok:false,error:"Forbidden"},403);
      await ensureSchema(env);
      const r=await env.DB.prepare(`SELECT * FROM withdrawals ORDER BY id DESC LIMIT 200`).all();
      return json({ok:true,withdrawals:r.results||[]});
    }

    if(env.ASSETS)return env.ASSETS.fetch(request);
    return new Response("Not found",{status:404});
  }catch(e){return json({ok:false,error:e?.message||"Server error"},500)}
}};

function buildLevels(){
  const a=[];
  for(let i=1;i<=400;i++){
    const t=(i-1)/399;
    const hold=i===1?0:Math.round(100+Math.pow(t,1.42)*149900);
    let speed=i<=12?1+((i-1)/11)*124.6:125.6+Math.pow((i-12)/388,1.15)*374.4;
    a.push({level:i,hold,speed:Number(speed.toFixed(2))});
  }
  a[11]={level:12,hold:15000,speed:125.6};
  a[399]={level:400,hold:150000,speed:500};
  return a;
}
async function ensureSchema(env){
  await env.DB.prepare(`CREATE TABLE IF NOT EXISTS users(telegram_id TEXT PRIMARY KEY,username TEXT,first_name TEXT,wallet TEXT,level INTEGER NOT NULL DEFAULT 1,saved REAL NOT NULL DEFAULT 0,mined REAL NOT NULL DEFAULT 0,energy REAL NOT NULL DEFAULT 200,mining INTEGER NOT NULL DEFAULT 0,last_mine_at INTEGER,referrer_id TEXT,referral_earned REAL NOT NULL DEFAULT 0,created_at INTEGER,updated_at INTEGER)`).run();
  await env.DB.prepare(`CREATE TABLE IF NOT EXISTS task_claims(telegram_id TEXT NOT NULL,task_id TEXT NOT NULL,created_at INTEGER,PRIMARY KEY(telegram_id,task_id))`).run();
  await env.DB.prepare(`CREATE TABLE IF NOT EXISTS withdrawals(id INTEGER PRIMARY KEY AUTOINCREMENT,telegram_id TEXT NOT NULL,wallet TEXT NOT NULL,amount REAL NOT NULL,status TEXT NOT NULL,created_at INTEGER)`).run();
}
async function ensureUser(env,user,ref){
  await ensureSchema(env);
  const id=String(user.id);
  const exists=await getUser(env,id);
  if(exists)return;
  let referrer=null;
  const m=/^ref_(\d+)$/.exec(ref||""); if(m&&m[1]!==id)referrer=m[1];
  await env.DB.prepare(`INSERT INTO users(telegram_id,username,first_name,referrer_id,created_at,updated_at,last_mine_at) VALUES(?,?,?,?,?,?,?)`).bind(id,user.username||"",user.first_name||"Miner",referrer,Date.now(),Date.now(),Date.now()).run();
  if(referrer){
    const r=await getUser(env,referrer);
    if(r)await env.DB.prepare(`UPDATE users SET saved=saved+?,referral_earned=referral_earned+?,updated_at=? WHERE telegram_id=?`).bind(REF_REWARD,REF_REWARD,Date.now(),referrer).run();
  }
}
async function getUser(env,id){return await env.DB.prepare(`SELECT * FROM users WHERE telegram_id=?`).bind(String(id)).first()}
async function countRefs(env,id){const r=await env.DB.prepare(`SELECT COUNT(*) c FROM users WHERE referrer_id=?`).bind(String(id)).first();return Number(r?.c||0)}
async function getTaskIds(env,id){const r=await env.DB.prepare(`SELECT task_id FROM task_claims WHERE telegram_id=?`).bind(String(id)).all();return (r.results||[]).map(x=>x.task_id)}
async function leaderboard(env){
  if(!env.DB)return json({ok:false,error:"D1 binding DB is required"},500);
  await ensureSchema(env);
  const r=await env.DB.prepare(`SELECT telegram_id,username,first_name,level,(saved+mined+referral_earned) AS total FROM users ORDER BY total DESC LIMIT 50`).all();
  return json({ok:true,rows:r.results||[]});
}
async function bindWallet(env,id,wallet){await env.DB.prepare(`UPDATE users SET wallet=?,updated_at=? WHERE telegram_id=?`).bind(wallet,Date.now(),String(id)).run()}
async function accrueUser(env,id){
  const u=await getUser(env,id); if(!u||!u.mining||!u.last_mine_at)return;
  const now=Date.now(),elapsed=Math.min(MAX_HOURS*3600,Math.max(0,(now-u.last_mine_at)/1000));
  const level=LEVELS[Math.max(0,Number(u.level)-1)]||LEVELS[0];
  const amount=elapsed*Number(level.speed)/3600;
  const energy=Math.max(0,Number(u.energy||0)-elapsed/180);
  const active=energy>0&&elapsed<MAX_HOURS;
  await env.DB.prepare(`UPDATE users SET mined=mined+?,energy=?,last_mine_at=?,mining=?,updated_at=? WHERE telegram_id=?`).bind(amount,energy,now,active?1:0,now,id).run();
}
async function getPersBalance(wallet){
  const r=await fetch(`https://tonapi.io/v2/accounts/${encodeURIComponent(wallet)}/jettons/${PERS_MASTER}`,{headers:{"Accept":"application/json"}});
  if(!r.ok)return 0;
  const j=await r.json(),dec=Number(j.jetton?.decimals??9),raw=Number(j.balance||0);
  return raw/10**dec;
}
function isWallet(w){return /^[A-Za-z0-9_-]{40,70}$/.test(w)}
async function authUser(request,env){
  const init=request.headers.get("X-Telegram-Init-Data")||"";
  if(!init)return {ok:false,error:"Telegram authentication required"};
  const params=new URLSearchParams(init),hash=params.get("hash"); if(!hash)return {ok:false,error:"Invalid Telegram initData"};
  const bot=env.BOT_TOKEN; if(!bot)return {ok:false,error:"BOT_TOKEN is not configured"};
  const pairs=[];for(const [k,v] of params.entries())if(k!=="hash")pairs.push([k,v]);pairs.sort((a,b)=>a[0].localeCompare(b[0]));
  const data=pairs.map(([k,v])=>`${k}=${v}`).join("\n");
  const secret=await crypto.subtle.sign("HMAC",await crypto.subtle.importKey("raw",new TextEncoder().encode("WebAppData"),{name:"HMAC"},false,["sign"]),new TextEncoder().encode(bot));
  const key=await crypto.subtle.importKey("raw",secret,{name:"HMAC"},false,["sign"]);
  const sig=new Uint8Array(await crypto.subtle.sign("HMAC",key,new TextEncoder().encode(data)));
  const got=hex(sig); if(got!==hash)return {ok:false,error:"Telegram authentication failed"};
  const authDate=Number(params.get("auth_date")||0);if(!authDate||Date.now()/1000-authDate>86400)return {ok:false,error:"Telegram session expired"};
  let user={};try{user=JSON.parse(params.get("user")||"{}")}catch{}
  if(!user.id)return {ok:false,error:"Telegram user missing"};
  return {ok:true,user};
}
function hex(b){return [...b].map(x=>x.toString(16).padStart(2,"0")).join("")}
async function safeJson(r){try{return await r.json()}catch{return {}}}
function json(data,status=200){return new Response(JSON.stringify(data),{status,headers:{"Content-Type":"application/json; charset=utf-8","Cache-Control":"no-store"}})}
async function telegramWebhook(request,env){
  const u=await safeJson(request);const msg=u.message;if(msg){
    const chatId=msg.chat?.id;const text=msg.text||"";
    if(text.startsWith("/start")&&env.BOT_TOKEN){
      await fetch(`https://api.telegram.org/bot${env.BOT_TOKEN}/sendMessage`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({chat_id:chatId,text:"🏛️ به PERSEPOLIS خوش آمدی!\n\n⛏️ برای شروع وارد Mini App شو.",reply_markup:{inline_keyboard:[[{text:"🚀 Start PERSEPOLIS Mining",web_app:{url:env.WEBAPP_URL||"https://persepolis.ahoon201.workers.dev/"}}]]}})});
    }
  }
  return new Response("OK");
}
async function setupWebhook(request,env){
  const secret=request.headers.get("X-Admin-Secret")||"";
  if(!env.ADMIN_SECRET||secret!==env.ADMIN_SECRET)return json({ok:false,error:"Forbidden"},403);
  if(!env.BOT_TOKEN)return json({ok:false,error:"BOT_TOKEN missing"},500);
  const webhookUrl=`${env.WEBAPP_URL||"https://persepolis.ahoon201.workers.dev"}/telegram`;
  const r=await fetch(`https://api.telegram.org/bot${env.BOT_TOKEN}/setWebhook`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({url:webhookUrl})});
  return new Response(await r.text(),{headers:{"Content-Type":"application/json"}});
}
