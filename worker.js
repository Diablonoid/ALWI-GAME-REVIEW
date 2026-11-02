const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET,POST,PUT,PATCH,OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type,Authorization"
};
const enc = new TextEncoder();
const json = (data, status=200) => new Response(JSON.stringify(data), {status,headers:{...cors,"Content-Type":"application/json"}});
const b64 = b => btoa(String.fromCharCode(...new Uint8Array(b))).replace(/=/g,"").replace(/\+/g,"-").replace(/\//g,"_");
const unb64 = s => Uint8Array.from(atob(s.replace(/-/g,"+").replace(/_/g,"/")+"=".repeat((4-s.length%4)%4)),c=>c.charCodeAt(0));
async function hashPassword(password,salt=b64(crypto.getRandomValues(new Uint8Array(16)))) {
  const key=await crypto.subtle.importKey("raw",enc.encode(password),"PBKDF2",false,["deriveBits"]);
  const bits=await crypto.subtle.deriveBits({name:"PBKDF2",salt:enc.encode(salt),iterations:120000,hash:"SHA-256"},key,256);
  return salt+"."+b64(bits);
}
async function verifyPassword(password,stored) {
  const parts=String(stored||"").split(/[.:]/);
  if(parts.length!==2) return false;
  const computed=await hashPassword(password,parts[0]);
  return computed.split(".")[1]===parts[1];
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
  if(!t||!env.AUTH_SECRET) return null;
  try {
    const p=t.split(".");
    if(p.length!==3) return null;
    const key=await crypto.subtle.importKey("raw",enc.encode(env.AUTH_SECRET),{name:"HMAC",hash:"SHA-256"},false,["verify"]);
    if(!await crypto.subtle.verify("HMAC",key,unb64(p[2]),enc.encode(p[0]+"."+p[1]))) return null;
    const data=JSON.parse(new TextDecoder().decode(unb64(p[1])));
    if(!data.exp||data.exp<Math.floor(Date.now()/1000)) return null;
    return await env.DB.prepare("SELECT id,username,email,role FROM users WHERE id=?").bind(data.sub).first();
  } catch { return null; }
}
const fail = (message,status=400) => json({error:message},status);
export default {
 async fetch(req,env) {
  if(req.method==="OPTIONS") return new Response(null,{headers:cors});
  if(!env.DB) return fail("Binding DB belum terhubung",500);
  if(!env.AUTH_SECRET) return fail("Secret AUTH_SECRET belum dipasang",500);
  const url=new URL(req.url),path=url.pathname;
  try {
   if(path==="/api/health") return json({ok:true,service:"ALWI GAME REVIEW API",version:"2.0"});
   if(path==="/api/register"&&req.method==="POST") {
    const body=await req.json(),username=String(body.username||"").trim(),email=String(body.email||"").trim().toLowerCase(),password=String(body.password||"");
    if(!/^[a-zA-Z0-9_]{3,24}$/.test(username)) return fail("Username 3-24 karakter: huruf, angka, underscore.");
    if(!/^\S+@\S+\.\S+$/.test(email)) return fail("Email tidak valid.");
    if(password.length<8||password.length>128) return fail("Password minimal 8 karakter.");
    const exists=await env.DB.prepare("SELECT id FROM users WHERE username=? OR email=?").bind(username,email).first();
    if(exists) return fail("Username atau email sudah digunakan.",409);
    const pass=await hashPassword(password);
    const r=await env.DB.prepare("INSERT INTO users(username,email,password_hash) VALUES(?,?,?)").bind(username,email,pass).run();
    const user={id:r.meta.last_row_id,username,email,role:"user"};
    return json({ok:true,token:await tokenFor(user,env.AUTH_SECRET),user},201);
   }
   if(path==="/api/login"&&req.method==="POST") {
    const body=await req.json(),email=String(body.email||"").trim().toLowerCase(),password=String(body.password||"");
    const u=await env.DB.prepare("SELECT id,username,email,password_hash,role FROM users WHERE email=?").bind(email).first();
    if(!u||!await verifyPassword(password,u.password_hash)) return fail("Email atau password salah.",401);
    const user={id:u.id,username:u.username,email:u.email,role:u.role};
    return json({ok:true,token:await tokenFor(user,env.AUTH_SECRET),user});
   }
   const user=await auth(req,env);
   if(path==="/api/me"&&req.method==="GET") return user?json({ok:true,user}):fail("Silakan login kembali.",401);
   if(path==="/api/reviews"&&req.method==="GET") {
    const r=await env.DB.prepare("SELECT r.id,r.game,r.title,r.content,r.rating,r.created_at,u.username,(SELECT COUNT(*) FROM review_likes l WHERE l.review_id=r.id) AS likes FROM reviews r JOIN users u ON u.id=r.user_id ORDER BY r.id DESC LIMIT 100").all();
    return json({ok:true,reviews:r.results});
   }
   if(path==="/api/reviews"&&req.method==="POST") {
    if(!user) return fail("Silakan login terlebih dahulu.",401);
    const b=await req.json(),game=String(b.game||""),title=String(b.title||"").trim(),content=String(b.content||"").trim(),rating=Number(b.rating);
    if(!["Free Fire","Mobile Legends"].includes(game)||!title||title.length>100||!content||content.length>3000||!Number.isInteger(rating)||rating<1||rating>5) return fail("Periksa game, judul, isi review, dan rating 1-5.");
    const r=await env.DB.prepare("INSERT INTO reviews(user_id,game,title,content,rating) VALUES(?,?,?,?,?)").bind(user.id,game,title,content,rating).run();
    return json({ok:true,id:r.meta.last_row_id,message:"Review berhasil dikirim."},201);
   }
   let m=path.match(/^\/api\/reviews\/(\d+)\/(comments|like)$/);
   if(m&&m[2]==="comments"&&req.method==="GET") {
    const r=await env.DB.prepare("SELECT c.id,c.content,c.created_at,u.username FROM comments c JOIN users u ON u.id=c.user_id WHERE c.review_id=? ORDER BY c.id ASC LIMIT 100").bind(Number(m[1])).all();
    return json({ok:true,comments:r.results});
   }
   if(m&&m[2]==="comments"&&req.method==="POST") {
    if(!user) return fail("Login diperlukan.",401);
    const b=await req.json(),content=String(b.content||"").trim();
    if(!content||content.length>1000) return fail("Komentar harus 1-1000 karakter.");
    const exists=await env.DB.prepare("SELECT id FROM reviews WHERE id=?").bind(Number(m[1])).first();
    if(!exists) return fail("Review tidak ditemukan.",404);
    const r=await env.DB.prepare("INSERT INTO comments(review_id,user_id,content) VALUES(?,?,?)").bind(Number(m[1]),user.id,content).run();
    return json({ok:true,id:r.meta.last_row_id},201);
   }
   if(m&&m[2]==="like"&&req.method==="POST") {
    if(!user) return fail("Login diperlukan.",401);
    const id=Number(m[1]),exists=await env.DB.prepare("SELECT id FROM reviews WHERE id=?").bind(id).first();
    if(!exists) return fail("Review tidak ditemukan.",404);
    const liked=await env.DB.prepare("SELECT id FROM review_likes WHERE review_id=? AND user_id=?").bind(id,user.id).first();
    if(liked) { await env.DB.prepare("DELETE FROM review_likes WHERE id=?").bind(liked.id).run(); return json({ok:true,liked:false}); }
    await env.DB.prepare("INSERT INTO review_likes(review_id,user_id) VALUES(?,?)").bind(id,user.id).run();
    return json({ok:true,liked:true});
   }
   if(path==="/api/game-profiles"&&req.method==="GET") {
    if(!user) return fail("Login diperlukan.",401);
    const r=await env.DB.prepare("SELECT id,game,player_id,nickname,server,level,rank,created_at FROM game_profiles WHERE user_id=? ORDER BY id DESC").bind(user.id).all();
    return json({ok:true,profiles:r.results});
   }
   if(path==="/api/game-profiles"&&req.method==="POST") {
    if(!user) return fail("Login diperlukan.",401);
    const b=await req.json(),game=String(b.game||""),player_id=String(b.player_id||"").trim(),nickname=String(b.nickname||"").trim(),server=String(b.server||"").trim(),level=Math.max(0,Math.min(999,Number(b.level)||0)),rank=String(b.rank||"").trim();
    if(!["Free Fire","Mobile Legends"].includes(game)||!player_id||player_id.length>80||!nickname||nickname.length>60) return fail("Game, ID pemain, dan nickname wajib diisi.");
    await env.DB.prepare("INSERT INTO game_profiles(user_id,game,player_id,nickname,server,level,rank) VALUES(?,?,?,?,?,?,?) ON CONFLICT(user_id,game) DO UPDATE SET player_id=excluded.player_id,nickname=excluded.nickname,server=excluded.server,level=excluded.level,rank=excluded.rank").bind(user.id,game,player_id,nickname,server,level,rank).run();
    return json({ok:true,message:"Profil game tersimpan online."},201);
   }
   if(path==="/api/topups"&&req.method==="POST") {
    if(!user) return fail("Login diperlukan.",401);
    const b=await req.json(),game=String(b.game||""),amount=Number(b.amount),currency=String(b.currency||"MYR"),proof=String(b.proof_url||"").slice(0,1000);
    if(!["Free Fire","Mobile Legends"].includes(game)||!Number.isFinite(amount)||amount<=0||amount>1000000) return fail("Data top up tidak valid.");
    const r=await env.DB.prepare("INSERT INTO topups(user_id,game,amount,currency,status,proof_url) VALUES(?,?,?,?, 'pending',?)").bind(user.id,game,amount,currency.slice(0,8),proof||null).run();
    return json({ok:true,id:r.meta.last_row_id,status:"pending",message:"Catatan top up menunggu verifikasi admin."},201);
   }
   if(path==="/api/topups"&&req.method==="GET") {
    if(!user) return fail("Login diperlukan.",401);
    const r=await env.DB.prepare("SELECT id,game,amount,currency,status,proof_url,admin_note,created_at FROM topups WHERE user_id=? ORDER BY id DESC LIMIT 100").bind(user.id).all();
    return json({ok:true,topups:r.results});
   }
   if(path==="/api/admin/topups"&&req.method==="GET") {
    if(!user||user.role!=="admin") return fail("Akses admin diperlukan.",403);
    const r=await env.DB.prepare("SELECT t.id,t.user_id,u.username,t.game,t.amount,t.currency,t.status,t.proof_url,t.admin_note,t.created_at FROM topups t JOIN users u ON u.id=t.user_id ORDER BY t.id DESC LIMIT 200").all();
    return json({ok:true,topups:r.results});
   }
   m=path.match(/^\/api\/admin\/topups\/(\d+)$/);
   if(m&&req.method==="PATCH") {
    if(!user||user.role!=="admin") return fail("Akses admin diperlukan.",403);
    const b=await req.json(),status=String(b.status||""),note=String(b.admin_note||"").slice(0,500);
    if(!["approved","rejected"].includes(status)) return fail("Status harus approved atau rejected.");
    const r=await env.DB.prepare("UPDATE topups SET status=?,admin_note=?,verified_by=? WHERE id=? AND status='pending'").bind(status,note,user.id,Number(m[1])).run();
    if(!r.meta.changes) return fail("Transaksi tidak ditemukan atau sudah diproses.",404);
    return json({ok:true,message:"Status transaksi diperbarui."});
   }
   return fail("Endpoint tidak ditemukan.",404);
  } catch(e) {
   return json({error:"Terjadi kesalahan server. Periksa binding database dan struktur tabel."},500);
  }
 }
};
