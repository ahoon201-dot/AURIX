
import Phaser from 'phaser';

const API = import.meta.env.VITE_API_URL || '';
const COLORS = {
  bg: 0x05080d, panel: 0x0c151e, panel2: 0x101c26,
  gold: 0xffd34f, gold2: 0xb47a20, red: 0xd92a19,
  text: 0xf4f5f6, muted: 0x8996a1, green: 0x45df8b,
  line: 0x2b3a46
};

const LEVELS = Array.from({length:400}, (_, i) => ({
  level: i + 1,
  hold: i === 0 ? 0 : Math.round(100 + Math.pow(i/399, 1.42) * 149900),
  speed: i === 11 ? 125.6 : i === 399 ? 500 : +(1 + i/399*499).toFixed(2)
}));
LEVELS[11] = { level: 12, hold: 15000, speed: 125.6 };

const state = {
  level: 1, balance: 0, mined: 0, energy: 200, mining: false,
  wallet: '', referrals: 0, earned: 0, active: 'home'
};

function telegram() {
  return window.Telegram?.WebApp || null;
}

async function api(path, body = {}) {
  if (!API) throw new Error('API_URL_NOT_CONFIGURED');
  const tg = telegram();
  const res = await fetch(`${API}${path}`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'X-Telegram-Init-Data': tg?.initData || ''
    },
    body: JSON.stringify(body)
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data.ok === false) throw new Error(data.error || `HTTP ${res.status}`);
  return data;
}

class BootScene extends Phaser.Scene {
  constructor() { super('Boot'); }
  create() {
    const tg = telegram();
    try { tg?.ready(); tg?.expand(); } catch {}
    this.scene.start('Game');
  }
}

class GameScene extends Phaser.Scene {
  constructor() { super('Game'); }

  create() {
    this.W = this.scale.width;
    this.H = this.scale.height;
    this.buildBackground();
    this.buildHeader();
    this.buildContent();
    this.buildNav();
    this.render();
    this.sync();
    this.scale.on('resize', () => this.scene.restart());
  }

  text(x,y,t,size=16,color=COLORS.text,style={}) {
    return this.add.text(x,y,t,{fontFamily:'Arial',fontSize:`${size}px`,color:Phaser.Display.Color.IntegerToColor(color).rgba, ...style});
  }

  rounded(x,y,w,h,fill=COLORS.panel,stroke=COLORS.line,r=18) {
    const g=this.add.graphics();
    g.fillStyle(fill,0.98); g.fillRoundedRect(x,y,w,h,r);
    if(stroke!==null){g.lineStyle(1,stroke,1);g.strokeRoundedRect(x,y,w,h,r)}
    return g;
  }

  buildBackground() {
    this.add.rectangle(0,0,this.W,this.H,COLORS.bg).setOrigin(0);
    const glow=this.add.graphics();
    glow.fillGradientStyle(0x5b240d,0x1a0d08,0x05080d,0x05080d,0.55);
    glow.fillRect(0,0,this.W,this.H*0.65);
    this.text(this.W/2,this.H*0.47,'PERSEPOLIS',56,0x332c29,{fontStyle:'bold',rotation:-Math.PI/2,originX:.5,originY:.5,alpha:.55}).setOrigin(.5);
  }

  buildHeader() {
    this.text(18,18,'𐎱  PERSEPOLIS',21,COLORS.gold,{fontStyle:'bold'}).setDepth(5);
    this.text(19,43,'ROYAL PERSIA',8,0x987d3c,{letterSpacing:3}).setDepth(5);
    this.levelPill=this.rounded(this.W-112,13,96,42,0x101923,0x765a29,22);
    this.levelText=this.text(this.W-64,34,'LEVEL 1',16,COLORS.text,{fontStyle:'bold'}).setOrigin(.5).setDepth(6);
  }

  buildContent() {
    this.contentTop=76;
    this.contentBottom=this.H-78;
    this.title=this.text(18,92,'HOME',13,COLORS.muted,{fontStyle:'bold'});
    this.avatar=this.add.circle(this.W/2,155,34,0x6b461f).setStrokeStyle(2,COLORS.gold);
    this.text(this.W/2,155,'𓂀',29,COLORS.gold).setOrigin(.5);

    this.mainCard=this.rounded(14,205,this.W-28,160,COLORS.panel,0x6a5126,18);
    this.balanceLabel=this.text(28,221,'PERS BALANCE',10,COLORS.muted,{fontStyle:'bold'});
    this.balanceText=this.text(28,238,'0.00',31,COLORS.gold,{fontStyle:'bold'});
    this.rateText=this.text(this.W-28,246,'+1 PERS / HOUR',13,COLORS.green,{fontStyle:'bold',align:'right'}).setOrigin(1,0);

    this.energyTrack=this.rounded(28,286,this.W-56,9,0x16232d,null,5);
    this.energyFill=this.add.rectangle(28,286,this.W-56,9,COLORS.gold).setOrigin(0);
    this.energyText=this.text(28,303,'200/200 ENERGY',11,COLORS.text,{fontStyle:'bold'});
    this.minedText=this.text(this.W-28,303,'0.00 MINED',11,COLORS.muted,{align:'right'}).setOrigin(1,0);

    this.mineButton=this.makeButton(this.W/2,394,this.W-28,52,'START MINING',COLORS.red,COLORS.text);
    this.mineButton.on('pointerdown',()=>this.toggleMining());

    this.panelTitle=this.text(18,468,'BOOSTS & PROGRESS',13,COLORS.gold,{fontStyle:'bold'});
    this.card1=this.rounded(14,492,this.W-28,70,COLORS.panel2,COLORS.line,15);
    this.text(28,506,'⚡',25,COLORS.gold);
    this.text(63,503,'MINING POWER',13,COLORS.text,{fontStyle:'bold'});
    this.powerText=this.text(63,525,'Level 1 • 1 PERS/HOUR',11,COLORS.muted);
    this.nextText=this.text(this.W-28,516,'UPGRADE',11,COLORS.gold,{fontStyle:'bold',align:'right'}).setOrigin(1,.5);

    this.daily=this.rounded(14,574,this.W-28,64,COLORS.panel2,COLORS.line,15);
    this.text(28,590,'🎁',23,COLORS.gold);
    this.text(63,587,'DAILY REWARD',13,COLORS.text,{fontStyle:'bold'});
    this.text(63,608,'Claim 500 PERS once per day',11,COLORS.muted);
    this.daily.on('pointerdown',()=>this.claimDaily());

    this.screens={home:[],upgrade:[],friends:[],wallet:[],more:[]};
    this.createUpgrade();
    this.createFriends();
    this.createWallet();
    this.createMore();
  }

  makeButton(x,y,w,h,label,fill,textColor) {
    const c=this.add.container(x,y).setSize(w,h).setInteractive({useHandCursor:true});
    const bg=this.rounded(-w/2,-h/2,w,h,fill,null,14);
    const t=this.text(0,1,label,14,textColor,{fontStyle:'bold',align:'center'}).setOrigin(.5);
    c.add([bg,t]); return c;
  }

  createUpgrade(){
    const items=[['⛏','MINING POWER'],['⚡','ENERGY CAPACITY'],['📈','PROFIT BOOST'],['🤖','AUTO MINING']];
    let y=150;
    items.forEach((it,i)=>{
      const box=this.rounded(14,y,this.W-28,78,COLORS.panel,COLORS.line,16);
      const icon=this.text(35,y+39,it[0],25,COLORS.gold).setOrigin(.5);
      const name=this.text(62,y+24,it[1],13,COLORS.text,{fontStyle:'bold'});
      const desc=this.text(62,y+45,i===0?'Increase PERS/hour':'Server verified upgrade',11,COLORS.muted);
      this.screens.upgrade.push(box,icon,name,desc);
      y+=90;
    });
    this.upgradeButton=this.makeButton(this.W/2,y+5,this.W-28,50,'UPGRADE',COLORS.gold,0x171108);
    this.upgradeButton.on('pointerdown',()=>this.upgrade());
    this.screens.upgrade.push(this.upgradeButton);
  }

  createFriends(){
    const title=this.text(18,115,'INVITE FRIENDS',20,COLORS.gold,{fontStyle:'bold'});
    const sub=this.text(18,145,'Earn PERS with real Telegram referrals',12,COLORS.muted);
    const box=this.rounded(14,175,this.W-28,130,COLORS.panel,COLORS.line,18);
    const count=this.text(28,195,'0',31,COLORS.gold,{fontStyle:'bold'});
    const lab=this.text(28,233,'TOTAL REFERRALS',10,COLORS.muted,{fontStyle:'bold'});
    this.refLink=this.text(28,258,'Open from Telegram to generate a link',11,COLORS.muted,{wordWrap:{width:this.W-56}});
    const btn=this.makeButton(this.W/2,340,this.W-28,50,'COPY REFERRAL LINK',COLORS.gold,0x171108);
    btn.on('pointerdown',()=>this.copyReferral());
    this.screens.friends.push(title,sub,box,count,lab,this.refLink,btn);
    this.refCount=count;
  }

  createWallet(){
    const title=this.text(18,115,'TON WALLET',20,COLORS.gold,{fontStyle:'bold'});
    const sub=this.text(18,145,'Connect a real wallet — no fake balance',12,COLORS.muted);
    const box=this.rounded(14,175,this.W-28,120,COLORS.panel,COLORS.line,18);
    this.walletText=this.text(28,197,'NOT CONNECTED',14,COLORS.text,{fontStyle:'bold'});
    this.walletBalance=this.text(28,235,'0.00 PERS',25,COLORS.gold,{fontStyle:'bold'});
    const btn=this.makeButton(this.W/2,330,this.W-28,50,'CONNECT WALLET',COLORS.gold,0x171108);
    btn.on('pointerdown',()=>this.connectWallet());
    const market=this.makeButton(this.W/2,392,this.W-28,50,'BUY / SELL PERS',COLORS.panel2,COLORS.text);
    market.on('pointerdown',()=>this.toast('DEX route stays disabled until verified.'));
    this.screens.wallet.push(title,sub,box,this.walletText,this.walletBalance,btn,market);
  }

  createMore(){
    const title=this.text(18,115,'MORE',20,COLORS.gold,{fontStyle:'bold'});
    this.screens.more.push(title);
    const rows=[['♙','PROFILE'],['🔔','NOTIFICATIONS'],['🌐','LANGUAGE'],['?','HELP & SUPPORT'],['!','ABOUT PERSEPOLIS']];
    rows.forEach((r,i)=>{
      const y=155+i*72,box=this.rounded(14,y,this.W-28,60,COLORS.panel,COLORS.line,15);
      const ic=this.text(38,y+30,r[0],20,COLORS.gold).setOrigin(.5);
      const tx=this.text(65,y+23,r[1],13,COLORS.text,{fontStyle:'bold'});
      const arrow=this.text(this.W-30,y+30,'›',23,COLORS.muted).setOrigin(.5);
      this.screens.more.push(box,ic,tx,arrow);
    });
  }

  buildNav(){
    const y=this.H-38;
    this.navButtons=[];
    [['home','⌂','HOME'],['upgrade','⚒','UPGRADE'],['friends','♙','FRIENDS'],['wallet','▣','WALLET'],['more','•••','MORE']].forEach((n,i)=>{
      const x=(i+.5)*this.W/5;
      const b=this.add.container(x,y).setSize(this.W/5,70).setInteractive();
      const icon=this.text(0,-10,n[1],20,COLORS.muted,{fontStyle:'bold'}).setOrigin(.5);
      const lab=this.text(0,14,n[2],9,COLORS.muted,{fontStyle:'bold'}).setOrigin(.5);
      b.add([icon,lab]);b.on('pointerdown',()=>this.switchScreen(n[0],b));
      b.icon=icon;b.lab=lab;this.navButtons.push(b);
    });
    this.setNav('home');
  }

  switchScreen(name){
    state.active=name; this.setNav(name);
    const homeVisible=name==='home';
    this.title.setVisible(homeVisible);this.avatar.setVisible(homeVisible);
    this.mainCard.setVisible(homeVisible);this.balanceLabel.setVisible(homeVisible);this.balanceText.setVisible(homeVisible);
    this.rateText.setVisible(homeVisible);this.energyTrack.setVisible(homeVisible);this.energyFill.setVisible(homeVisible);
    this.energyText.setVisible(homeVisible);this.minedText.setVisible(homeVisible);this.mineButton.setVisible(homeVisible);
    this.panelTitle.setVisible(homeVisible);this.card1.setVisible(homeVisible);this.daily.setVisible(homeVisible);
    Object.keys(this.screens).forEach(k=>this.screens[k].forEach(o=>o.setVisible(k===name)));
  }

  setNav(name){this.navButtons.forEach(b=>{const on=b.list[1]?.text?.toLowerCase()===name; b.icon.setColor(on?'#ffd34f':'#8996a1');b.lab.setColor(on?'#ffd34f':'#8996a1')});}

  async sync(){
    try{
      const data=await api('/api/bootstrap');
      if(data.state) Object.assign(state,data.state);
      this.render();
    }catch(e){ this.render(); }
  }

  render(){
    const l=LEVELS[Math.max(0,state.level-1)], n=LEVELS[state.level];
    this.levelText.setText(`LEVEL ${state.level}`);
    this.balanceText.setText(Number(state.balance||0).toFixed(2));
    this.rateText.setText(`+${l.speed} PERS / HOUR`);
    this.energyText.setText(`${Math.floor(state.energy||0)}/200 ENERGY`);
    this.minedText.setText(`${Number(state.mined||0).toFixed(2)} MINED`);
    this.energyFill.width=Math.max(0,(this.W-56)*Math.min(1,(state.energy||0)/200));
    this.mineButton.list[1].setText(state.mining?'STOP MINING':'START MINING');
    this.powerText.setText(`Level ${state.level} • ${l.speed} PERS/HOUR`);
    this.refCount?.setText(String(state.referrals||0));
    this.walletText?.setText(state.wallet || 'NOT CONNECTED');
    this.walletBalance?.setText(`${Number(state.balance||0).toFixed(2)} PERS`);
    this.upgradeButton?.list[1].setText(n?`UPGRADE • ${n.hold.toLocaleString()} PERS`:'MAX LEVEL');
    this.upgradeButton?.setAlpha(n && Number(state.balance)>=n.hold ? 1 : .45);
    if(telegram()?.initDataUnsafe?.user){
      const id=telegram().initDataUnsafe.user.id;
      this.refLink?.setText(`https://t.me/PERSEPOLIS_BOT?start=ref_${id}`);
    }
  }

  async toggleMining(){try{const d=await api(state.mining?'/api/mine/stop':'/api/mine/start');Object.assign(state,d.state||{});this.render()}catch(e){this.toast(e.message)}}
  async upgrade(){const n=LEVELS[state.level];if(!n)return;try{const d=await api('/api/level/upgrade');Object.assign(state,d.state||{});this.render();this.toast('Level upgraded')}catch(e){this.toast(e.message)}}
  async claimDaily(){try{const d=await api('/api/tasks/claim',{taskId:'daily'});Object.assign(state,d.state||{});this.render();this.toast('500 PERS claimed')}catch(e){this.toast(e.message)}}
  async connectWallet(){const w=prompt('TON wallet address');if(!w)return;try{const d=await api('/api/wallet/bind',{wallet:w});Object.assign(state,d.state||{});this.render();this.toast('Wallet connected')}catch(e){this.toast(e.message)}}
  copyReferral(){const id=telegram()?.initDataUnsafe?.user?.id;if(!id)return this.toast('Open inside Telegram');const link=`https://t.me/PERSEPOLIS_BOT?start=ref_${id}`;navigator.clipboard?.writeText(link);this.refLink.setText(link);this.toast('Referral link copied')}
  toast(msg){const t=this.add.text(this.W/2,this.H-95,msg,{fontFamily:'Arial',fontSize:'13px',color:'#fff',backgroundColor:'#081018',padding:{left:12,right:12,top:10,bottom:10},align:'center'}).setOrigin(.5).setDepth(100);this.time.delayedCall(1800,()=>t.destroy())}
}

new Phaser.Game({
  type: Phaser.AUTO,
  parent:'game',
  backgroundColor:'#05080d',
  scale:{mode:Phaser.Scale.RESIZE,autoCenter:Phaser.Scale.CENTER_BOTH,width:430,height:780},
  render:{antialias:true,pixelArt:false},
  scene:[BootScene,GameScene]
});
