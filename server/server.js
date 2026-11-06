'use strict';
// NO CRUMBS backend: zero dependencies, runs on the canteen's own network with no internet (Constraint 1).
// Serves the site + a JSON API with server-side auth, validation, order state machine and live updates (SSE).
const http=require('http'),fs=require('fs'),path=require('path'),crypto=require('crypto'),os=require('os');
const ROOT=path.resolve(__dirname,'..'),MENU=require('./menu.json'),M=Object.fromEntries(MENU.map(m=>[m.id,m]));
const SLOTS=['12:30','12:45','13:00','13:15','13:30','13:45','14:00'],DISC=.05,KEYS=['demo','ml','decisions'],TTL=12*3600e3;
const MIME={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.json':'application/json','.svg':'image/svg+xml','.webmanifest':'application/manifest+json','.jpg':'image/jpeg','.png':'image/png','.txt':'text/plain; charset=utf-8'};
const HDR={'X-Content-Type-Options':'nosniff','X-Frame-Options':'DENY','Referrer-Policy':'no-referrer','Content-Security-Policy':"default-src 'self'; img-src 'self' data: blob:; style-src 'self' 'unsafe-inline'; script-src 'self' 'unsafe-inline'; connect-src 'self'; frame-ancestors 'none'"};
const hash=pw=>{const s=crypto.randomBytes(16).toString('hex');return s+':'+crypto.scryptSync(pw,s,32).toString('hex')};
const verify=(pw,h)=>{const[s,k]=String(h).split(':');if(!s||!k)return false;const a=crypto.scryptSync(String(pw),s,32),b=Buffer.from(k,'hex');return a.length===b.length&&crypto.timingSafeEqual(a,b)};
function makeDB(dir){fs.mkdirSync(dir,{recursive:true});const f=n=>path.join(dir,n+'.json'),c={},t={};const w=n=>{const x=f(n)+'.tmp';fs.writeFileSync(x,JSON.stringify(c[n]));fs.renameSync(x,f(n))};
 return{get(n,d){if(!(n in c)){try{c[n]=JSON.parse(fs.readFileSync(f(n),'utf8'))}catch{c[n]=d}}return c[n]},set(n,v){c[n]=v;clearTimeout(t[n]);t[n]=setTimeout(()=>w(n),40)},flush(){Object.keys(c).forEach(n=>{clearTimeout(t[n]);w(n)})},audit(l){fs.appendFileSync(path.join(dir,'audit.log'),new Date().toISOString()+' '+l+'\n')}}}
function start(port=Number(process.env.PORT)||3000,dir=process.env.NC_DATA||path.join(__dirname,'data')){
 const db=makeDB(dir),sessions=new Map(),fails=new Map(),clients=new Set();
 if(!db.get('users',null)){db.set('users',[{id:'CRUMB-STU-01',role:'student',h:hash('Student@123')},{id:'CRUMB-CAN-01',role:'staff',h:hash('Kitchen@123')}]);db.flush()}
 const send=(res,code,obj)=>{res.writeHead(code,{...HDR,'Content-Type':'application/json','Cache-Control':'no-store'});res.end(JSON.stringify(obj))};
 const body=req=>new Promise((ok,no)=>{let b='',n=0;req.on('data',d=>{n+=d.length;if(n>1e6){no(Object.assign(new Error('Too large'),{code:413}));req.destroy()}else b+=d});req.on('end',()=>{try{ok(b?JSON.parse(b):{})}catch{no(Object.assign(new Error('Bad JSON'),{code:400}))}})});
 const who=(req,u)=>{const t=(req.headers.authorization||'').replace(/^Bearer /,'')||u.searchParams.get('token');const s=sessions.get(t);if(s&&s.exp>Date.now())return{...s,t};sessions.delete(t);return null};
 const emit=id=>clients.forEach(c=>c.write(`event: orders\ndata: ${JSON.stringify({id})}\n\n`));
 const pub=o=>({id:o.id,name:o.name,items:o.items,total:o.total,alg:o.alg,algn:o.algn,slot:o.slot,at:o.at,made:o.made,cancelled:o.cancelled,st:o.st});
 async function api(req,res,u){const m=req.method,p=u.pathname;
  if(p==='/api/health')return send(res,200,{ok:true,version:1});
  if(p==='/api/menu')return send(res,200,{menu:MENU,slots:SLOTS,discount:DISC});
  if(p==='/api/login'&&m==='POST'){const ip=req.socket.remoteAddress,f=fails.get(ip)||{n:0,until:0};if(f.until>Date.now())return send(res,429,{error:'Too many attempts. Try again in a few minutes.'});const b=await body(req),us=db.get('users',[]).find(x=>x.id===String(b.id||''));const good=us&&us.role===b.role&&verify(b.password,us.h);if(!good){f.n++;if(f.n>=5){f.until=Date.now()+10*60e3;f.n=0}fails.set(ip,f);return send(res,401,{error:'Invalid ID or password'})}fails.delete(ip);const t=crypto.randomBytes(32).toString('hex');sessions.set(t,{id:us.id,role:us.role,exp:Date.now()+TTL});db.audit('login '+us.id);return send(res,200,{token:t,role:us.role,id:us.id})}
  const s=who(req,u);if(!s)return send(res,401,{error:'Login required'});
  if(p==='/api/logout'&&m==='POST'){sessions.delete(s.t);return send(res,200,{ok:true})}
  if(p==='/api/events'){res.writeHead(200,{...HDR,'Content-Type':'text/event-stream','Cache-Control':'no-cache',Connection:'keep-alive'});res.write('retry: 3000\n\n');clients.add(res);const hb=setInterval(()=>res.write(': hb\n\n'),25e3);hb.unref?.();req.on('close',()=>{clearInterval(hb);clients.delete(res)});return}
  const orders=db.get('orders',[]);
  if(p==='/api/orders'&&m==='GET')return send(res,200,{orders:orders.filter(o=>s.role==='staff'||o.owner===s.id).map(pub)});
  if(p==='/api/orders'&&m==='POST'){if(s.role!=='student')return send(res,403,{error:'Only students place orders'});const b=await body(req),name=String(b.name||'').trim().slice(0,30);
   if(!name)return send(res,400,{error:'Name required'});if(!SLOTS.includes(b.slot))return send(res,400,{error:'Invalid pickup slot'});
   if(!['none','yes'].includes(b.alg))return send(res,409,{gate:'allergy',error:'Held: allergy status unknown. Options can be listed but a meal cannot be safely confirmed until the allergy question is answered.'});
   const algn=String(b.algn||'').trim().slice(0,40);if(b.alg==='yes'&&!algn)return send(res,400,{error:'Name the allergen'});
   if(!Array.isArray(b.items)||!b.items.length||b.items.length>20)return send(res,400,{error:'Cart is empty'});let sub=0;const items=[];for(const i of b.items){const d=M[i&&i.id],q=Number(i&&i.q);if(!d||!Number.isInteger(q)||q<1||q>10)return send(res,400,{error:'Invalid item'});sub+=d.p*q;items.push({id:d.id,n:d.n,q})}
   const at=new Date(),[h,mi]=b.slot.split(':');at.setHours(+h,+mi,0,0);if(at<new Date())at.setDate(at.getDate()+1);let id;do id='NC-'+crypto.randomBytes(3).toString('hex').toUpperCase();while(orders.some(o=>o.id===id));
   const o={id,owner:s.id,name,items,total:sub-Math.round(sub*DISC),alg:b.alg,algn:b.alg==='yes'?algn:'',slot:b.slot,at:at.toISOString(),made:Date.now(),cancelled:false,st:0};orders.unshift(o);db.set('orders',orders);db.audit('order '+id+' by '+s.id);emit(id);return send(res,201,{order:pub(o)})}
  const mo=p.match(/^\/api\/orders\/(NC-[0-9A-F]{6})\/(status|cancel)$/);
  if(mo&&m==='PATCH'){const o=orders.find(x=>x.id===mo[1]);if(!o||(s.role!=='staff'&&o.owner!==s.id))return send(res,404,{error:'Order not found'});
   if(mo[2]==='cancel'){if(o.cancelled||o.st>=3||(s.role==='student'&&o.st>0))return send(res,409,{error:'Order can no longer be cancelled'});o.cancelled=true}
   else{if(s.role!=='staff')return send(res,403,{error:'Staff only'});const b=await body(req);if(o.cancelled||!Number.isInteger(b.st)||b.st!==o.st+1||b.st>3)return send(res,400,{error:'Status must advance one step at a time'});o.st=b.st}
   db.set('orders',orders);db.audit(`${mo[2]} ${o.id} by ${s.id}`);emit(o.id);return send(res,200,{order:pub(o)})}
  if(s.role!=='staff')return send(res,403,{error:'Staff only'});
  if(p==='/api/stats'){const by=[0,0,0,0],dem={};orders.filter(o=>!o.cancelled).forEach(o=>{by[o.st]++;o.items.forEach(i=>dem[i.n]=(dem[i.n]||0)+i.q)});return send(res,200,{byStatus:by,demand:dem,total:orders.length})}
  const md=p.match(/^\/api\/data\/([a-z]+)$/);
  if(md&&KEYS.includes(md[1])){if(m==='GET')return send(res,200,{value:db.get('kv-'+md[1],null)});if(m==='PUT'){const b=await body(req);if(typeof b.value!=='object'||b.value===null)return send(res,400,{error:'Invalid value'});db.set('kv-'+md[1],b.value);return send(res,200,{ok:true})}}
  send(res,404,{error:'Not found'})}
 function serve(req,res,u){let p;try{p=decodeURIComponent(u.pathname)}catch{res.writeHead(400);return res.end()}if(p.endsWith('/'))p+='index.html';const f=path.normalize(path.join(ROOT,p)),rel=path.relative(ROOT,f);
  if(rel.startsWith('..')||path.isAbsolute(rel)||/^(server|node_modules|\.git|package)/.test(rel)||!MIME[path.extname(f)]){res.writeHead(404,HDR);return res.end('Not found')}
  fs.readFile(f,(e,d)=>{if(e){res.writeHead(404,HDR);return res.end('Not found')}res.writeHead(200,{...HDR,'Content-Type':MIME[path.extname(f)],'Cache-Control':'no-cache'});res.end(d)})}
 const srv=http.createServer(async(req,res)=>{try{const u=new URL(req.url,'http://x');if(u.pathname.startsWith('/api/'))await api(req,res,u);else if(req.method==='GET'||req.method==='HEAD')serve(req,res,u);else{res.writeHead(405,HDR);res.end()}}catch(e){if(!res.headersSent)send(res,e.code===413||e.code===400?e.code:500,{error:e.code?e.message:'Server error'})}});
 srv.on('close',()=>db.flush());
 return new Promise(ok=>srv.listen(port,'0.0.0.0',()=>ok(srv)))}
if(require.main===module)start().then(s=>{console.log('NO CRUMBS server running (no internet needed):\n  http://localhost:'+s.address().port);Object.values(os.networkInterfaces()).flat().filter(i=>i.family==='IPv4'&&!i.internal).forEach(i=>console.log('  http://'+i.address+':'+s.address().port+'   (phones on the same Wi-Fi)'));process.on('SIGINT',()=>{s.close();process.exit(0)})});
module.exports={start,hash,makeDB};
