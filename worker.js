const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type,Authorization"
};
const json = (data, status=200) => new Response(JSON.stringify(data), {status,headers:{...cors,"Content-Type":"application/json"}});
const enc = new TextEncoder();
const b64 = b => btoa(String.fromCharCode(...new Uint8Array(b))).replace(/=/g,"").replace(/\+/g,"-").replace(/\//g,"_");
const unb64 = s => Uint8Array.from(atob(s.replace(/-/g,"+").replace(/_/g,"/")+"=".repeat((4-s.length%4)%4)),c=>c.charCodeAt(0));
async function hashPassword(password,salt=b64(crypto.getRandomValues(new Uint8Array(16)))) {
  const key=await crypto.subtle.importKey("raw",enc.encode(password),"PBKDF2",false,["deriveBits"]);
  const bits=await crypto.subtle.deriveBits({name:"PBKDF2",salt:enc.encode(salt),iterations:120000,hash:"SHA-256"},key,256);
  return salt+"."+b64(bits);
}
async function verifyPassword(password,stored) {
  const [salt]=stored.split(".");
  return (await hashPassword(password,salt))===stored;
}
async function tokenFor(user,secret) {
  const head=b64(enc.encode(JSON.stringify({alg:"HS256",typ:"JWT"})));
  const body=b64(enc.encode(JSON.stringify({sub:user.id,username:user.username,role:user.role,exp:Math.floor(Date.now()/1000)+604800})));
  const data=head+"."+body;
  const key=await crypto.subtle.importKey("raw",enc.encode(secret),{name:"HMAC",hash:"SHA-256"},false,["sign"]);
  return data+"."+b64(await crypto.subtle.sign("HMAC",key,enc.encode(data)));
}
async function auth(req,env) {
  const h=req.headers.get("Authorization")||"",t=h.startsWith("Bearer ")?h.slice(7):"";
  if(!t) return null;
  try {
    const [a,b,c]=t.split("."),key=await crypto.subtle.importKey("raw",enc.encode(env.AUTH_SECRET),{name:"HMAC",hash:"SHA-256"},false,["verify"]);
    if(!await crypto.subtle.verify("HMAC",key,unb64(c),enc.encode(a+"."+b))) return null;
    const p=JSON.parse(new TextDecoder().decode(unb64(b)));
    if(p.exp<Date.now()/1000) return null;
    return p;
  } catch { return null; }
}
export default {
 async fetch(req,env) {
  if(req.method==="OPTIONS") return new Response(null,{headers:cors});
  const url=new URL(req.url),path=url.pathname;
  try {
   if(path==="/api/health") return json({ok:true,service:"ALWI GAME REVIEW API"});
   if(path==="/api/register" && req.method==="POST") {
    const {username,email,password}=await req.json();
    if(!/^[a-zA-Z0-9_]{3,24}$/.test(username||"") || !/^\S+@\S+\.\S+$/.test(email||"") || (password||"").length<8) return json({error:"Username 3-24 karakter, email valid, password minimal 8 karakter."},400);
    const exists=await env.DB.prepare("SELECT id FROM users WHERE username=? OR email=?").bind(username,email).first();
    if(exists) return json({error:"Username atau email sudah digunakan."},409);
    const pass=await hashPassword(password);
    const result=await env.DB.prepare("INSERT INTO users(username,email,password_hash) VALUES(?,?,?)").bind(username,email,pass).run();
    const user={id:result.meta.last_row_id,username,role:"user"};
    return json({token:await tokenFor(user,env.AUTH_SECRET),user},201);
   }
   if(path==="/api/login" && req.method==="POST") {
    const {email,password}=await req.json();
    const user=await env.DB.prepare("SELECT id,username,email,password_hash,role FROM users WHERE email=?").bind(email||"").first();
    if(!user || !await verifyPassword(password||"",user.password_hash)) return json({error:"Email atau password salah."},401);
    return json({token:await tokenFor(user,env.AUTH_SECRET),user:{id:user.id,username:user.username,role:user.role}});
   }
   if(path==="/api/me" && req.method==="GET") {
    const u=await auth(req,env); if(!u) return json({error:"Silakan login."},401);
    return json({user:u});
   }
   if(path==="/api/reviews" && req.method==="GET") {
    const {results}=await env.DB.prepare("SELECT r.id,r.game,r.title,r.content,r.rating,r.created_at,u.username FROM reviews r JOIN users u ON u.id=r.user_id ORDER BY r.id DESC LIMIT 100").all();
    return json({reviews:results});
   }
   if(path==="/api/reviews" && req.method==="POST") {
    const u=await auth(req,env); if(!u) return json({error:"Silakan login."},401);
    const {game,title,content,rating}=await req.json();
    if(!["Free Fire","Mobile Legends"].includes(game)||!title?.trim()||!content?.trim()||![1,2,3,4,5].includes(Number(rating))) return json({error:"Lengkapi game, judul, isi, dan rating 1-5."},400);
    const r=await env.DB.prepare("INSERT INTO reviews(user_id,game,title,content,rating) VALUES(?,?,?,?,?)").bind(u.sub,game,title.trim().slice(0,100),content.trim().slice(0,3000),Number(rating)).run();
    return json({ok:true,id:r.meta.last_row_id},201);
   }
   if(path==="/api/topups" && req.method==="POST") {
    const u=await auth(req,env); if(!u) return json({error:"Silakan login."},401);
    const {game,amount,currency="MYR",proof_url=""}=await req.json();
    if(!["Free Fire","Mobile Legends"].includes(game)||!Number.isFinite(Number(amount))||Number(amount)<=0) return json({error:"Data top up tidak valid."},400);
    const r=await env.DB.prepare("INSERT INTO topups(user_id,game,amount,currency,proof_url) VALUES(?,?,?,?,?)").bind(u.sub,game,Number(amount),String(currency).slice(0,8),String(proof_url).slice(0,500)).run();
    return json({ok:true,id:r.meta.last_row_id,status:"pending"},201);
   }
   return json({error:"Endpoint tidak ditemukan."},404);
  } catch(e) { return json({error:"Terjadi kesalahan server.",detail:String(e.message||e)},500); }
 }
};