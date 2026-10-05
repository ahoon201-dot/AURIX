const PERS_MASTER="EQBxwHlh-mqsszryIRQeFpvaG91EqS3HWtiQo4h2-UzYlBAX";
const REF_REWARD=5000;
const LEVELS=Array.from({length:400},(_,i)=>({level:i+1,hold:i===0?0:Math.round(100+Math.pow(i/399,1.42)*149900),speed:i===11?125.6:i===399?500:+(1+(i/399)*499).toFixed(2)}));
LEVELS[11]={level:12,hold:15000,speed:125.6};

async function hmac(key,data){return crypto.subtle.sign("HMAC",key,new TextEncoder().encode(data))}
async function hex(buf){return [...new Uint8Array(buf)].map(x=>x.toString(16).padStart(2,"0")).join("")}
async function telegramUser(initData,botToken){
 const p=new URLSearchParams(initData||"");const hash=p.get("hash");if(!hash)throw Error("Missing Telegram initData");
 p.delete("hash");const data=[...p.entries()].sort(([a],[b])=>a.localeCompare(b)).map(([k,v])=>`${k}=${v}`).join("\n");
 const secret=await crypto.subtle.importKey("raw",new TextEncoder().encode("WebAppData"),{name:"HMAC",hash:"SHA-256"},false,["sign"]);
 const secretBytes=await hmac(secret,botToken);
 const key=await crypto.subtle.importKey("raw",secretBytes,{name:"HMAC",hash:"SHA-256"},false,["sign"]);
 if(await hex(await hmac(key,data))!==hash)throw Error("Invalid Telegram initData");
 return JSON.parse(p.get("user")||"{}");
}
function json(x,s=200){return new Response(JSON.stringify(x),{status:s,headers:{"content-type":"application/json","access-control-allow-origin":"*"}})}
async function user(env,u){
 let x=await env.DB.prepare("SELECT * FROM users WHERE id=?").bind(u.id).first();
 if(!x){let now=Math.floor(Date.now()/1000);await env.DB.prepare("INSERT INTO users(id,username,created_at,last_mine_at) VALUES(?,?,?,?)").bind(u.id,u.username||u.first_name||"",now,now).run();x=await env.DB.prepare("SELECT * FROM users WHERE id=?").bind(u.id).first()}
 return x
}
function accrue(x){
 if(!x.mining)return {...x,earned:0};
 const now=Math.floor(Date.now()/1000),dt=Math.max(0,now-(x.last_mine_at||now)),l=LEVELS[x.level-1];
 const earned=Math.min(Number(x.energy),dt*l.speed/3600);
 return {...x,earned};
}
function state(x){return {level:x.level,balance:Number(x.balance),mined:Number(x.mined),energy:Number(x.energy),mining:!!x.mining,wallet:x.wallet||"",referrals:x.referrals||0,earned:Number(x.referral_earned||0)}}
async function saveAccrued(env,x){
 const a=accrue(x); if(!a.earned)return x;
 const energy=Math.max(0,x.energy-a.earned), mined=x.mined+a.earned;
 await env.DB.prepare("UPDATE users SET mined=?,energy=?,last_mine_at=? WHERE id=?").bind(mined,energy,Math.floor(Date.now()/1000),x.id).run();
 return {...x,mined,energy,last_mine_at:Math.floor(Date.now()/1000)};
}
async function bot(env,method,body){
 return fetch(`https://api.telegram.org/bot${env.BOT_TOKEN}/${method}`,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(body)})
}
export default {async fetch(req,env){
 const url=new URL(req.url);
 if(req.method==="OPTIONS")return new Response("",{headers:{"access-control-allow-origin":"*","access-control-allow-headers":"content-type,x-telegram-init-data","access-control-allow-methods":"GET,POST,OPTIONS"}});
 if(url.pathname==="/health")return json({ok:true,service:"PERSEPOLIS"});
 if(url.pathname==="/")return new Response(await (await fetch(new URL("/index.html",req.url))).text(),{headers:{"content-type":"text/html;charset=utf-8"}});
 if(url.pathname==="/telegram/webhook"&&req.method==="POST"){
   const update=await req.json();const m=update.message;
   if(m?.text?.startsWith("/start")){
     const parts=m.text.split(" ");const ref=parts[1]?.startsWith("ref_")?parts[1].slice(4):null;
     if(ref)await env.DB.prepare("INSERT OR IGNORE INTO referrals(inviter_id,invitee_id,created_at) VALUES(?,?,?)").bind(Number(ref),m.from.id,Math.floor(Date.now()/1000)).run();
     const keyboard={inline_keyboard:[[{text:"🏛 Open PERSEPOLIS",web_app:{url:env.WEBAPP_URL}}]]};
     await bot(env,"sendMessage",{chat_id:m.chat.id,text:"🏛 PERSEPOLIS\\nMine • Build • Earn\\n\\nOpen the game:",reply_markup:keyboard});
   }
   return json({ok:true});
 }
 let u;try{u=await telegramUser(req.headers.get("X-Telegram-Init-Data")||"",env.BOT_TOKEN)}catch(e){return json({ok:false,error:e.message},401)}
 let x=await user(env,u);x=await saveAccrued(env,x);
 if(url.pathname==="/api/bootstrap"){return json({ok:true,state:state(x)})}
 if(req.method!=="POST")return json({ok:false,error:"Method not allowed"},405);
 const body=await req.json().catch(()=>({}));
 if(url.pathname==="/api/mine/start"){await env.DB.prepare("UPDATE users SET mining=1,last_mine_at=? WHERE id=?").bind(Math.floor(Date.now()/1000),u.id).run();return json({ok:true,state:state({...x,mining:1})})}
 if(url.pathname==="/api/mine/stop"){await env.DB.prepare("UPDATE users SET mining=0 WHERE id=?").bind(u.id).run();return json({ok:true,state:state({...x,mining:0})})}
 if(url.pathname==="/api/mine/claim"){let amount=x.mined;await env.DB.prepare("UPDATE users SET balance=balance+?,mined=0 WHERE id=?").bind(amount,u.id).run();return json({ok:true,claimed:amount,state:state({...x,balance:x.balance+amount,mined:0})})}
 if(url.pathname==="/api/level/upgrade"){
   const next=LEVELS[x.level];if(!next)return json({ok:false,error:"Maximum level"},400);
   if(x.balance<next.hold)return json({ok:false,error:`Need ${next.hold} PERS`},400);
   await env.DB.prepare("UPDATE users SET level=?,balance=balance-?,mining=0 WHERE id=?").bind(next.level,next.hold,u.id).run();
   return json({ok:true,state:state({...x,level:next.level,balance:x.balance-next.hold,mining:0})});
 }
 if(url.pathname==="/api/wallet/bind"){const w=String(body.wallet||"");if(!/^[EU]Q[A-Za-z0-9_-]{46}$/.test(w))return json({ok:false,error:"Invalid TON wallet address"},400);await env.DB.prepare("UPDATE users SET wallet=? WHERE id=?").bind(w,u.id).run();return json({ok:true,state:state({...x,wallet:w})})}
 if(url.pathname==="/api/tasks/claim"){
   const id=String(body.taskId||"");const rewards={daily:500,telegram:1000,x:1000,invite:5000,video:1000,swap:2000};if(!(id in rewards))return json({ok:false,error:"Unknown task"},400);
   if(id==="invite"&&x.referrals<3)return json({ok:false,error:"Invite 3 friends first"},400);
   try{await env.DB.prepare("INSERT INTO task_claims(user_id,task_id,claimed_at) VALUES(?,?,?)").bind(u.id,id,Math.floor(Date.now()/1000)).run()}catch{return json({ok:false,error:"Already claimed"},400)}
   await env.DB.prepare("UPDATE users SET balance=balance+? WHERE id=?").bind(rewards[id],u.id).run();
   return json({ok:true,reward:rewards[id],state:state({...x,balance:x.balance+rewards[id]})});
 }
 return json({ok:false,error:"Not found"},404);
}}
