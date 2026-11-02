const $=x=>document.getElementById(x),K='alwi-review-v1';let db=JSON.parse(localStorage.getItem(K)||'{"accounts":[]}'),chosen=null,tab='overview';const money=n=>new Intl.NumberFormat('id-ID',{style:'currency',currency:'IDR',maximumFractionDigits:0}).format(+n||0),esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));function save(){localStorage.setItem(K,JSON.stringify(db));render()}function render(){ $('count').textContent=db.accounts.length;$('spend').textContent=money(db.accounts.reduce((s,a)=>s+(+a.topup||0),0));$('skinCount').textContent=db.accounts.reduce((s,a)=>s+(+a.skins||0),0);$('accounts').innerHTML=db.accounts.length?db.accounts.map(a=>`<article class="card" data-k="${a.key}"><span class="tag">${a.game==='ff'?'FREE FIRE':'MOBILE LEGENDS'}</span><h3>${esc(a.nick)}</h3><p>ID ${esc(a.uid)} ${a.server?'• Server '+esc(a.server):''}</p><button class="primary" data-open="${a.key}">Lihat profil</button> <button data-edit="${a.key}">Edit</button></article>`).join(''):'<div class="panel muted">Belum ada akun. Tekan Tambah akun untuk mulai.</div>';document.querySelectorAll('[data-open]').forEach(b=>b.onclick=()=>show(b.dataset.open));document.querySelectorAll('[data-edit]').forEach(b=>b.onclick=()=>edit(b.dataset.edit));if(chosen&&db.accounts.some(a=>a.key===chosen))show(chosen,false)}function show(k){chosen=k;render();const a=db.accounts.find(x=>x.key===k);$('detail').classList.remove('muted');$('detail').innerHTML=`<div class="tag">${a.game==='ff'?'FREE FIRE':'MOBILE LEGENDS'} • DATA TERCATAT</div><h2>${esc(a.nick)}</h2><p>ID ${esc(a.uid)} ${a.server?'• Server '+esc(a.server):''}</p><div class="detailgrid">${[['Level',a.level],['Rank',a.rank],['Total match',a.matches],['Win rate',(a.wr||'—')+'%'],['Jumlah skin',a.skins],['Total top up',money(a.topup)]].map(x=>`<div class="stat"><small>${x[0]}</small><b>${esc(x[1]||'—')}</b></div>`).join('')}</div><div class="tabs"><button data-tab="overview">Ringkasan</button><button data-tab="skin">Skin / Hero</button><button data-tab="match">Riwayat match</button><button data-tab="topup">Top up</button></div><button class="primary" id="addrec">＋ Tambah catatan</button><div id="records"></div><p class="muted">Sumber: ${esc(a.notes||'Belum dicantumkan')}. Data manual belum diverifikasi server game.</p>`;document.querySelectorAll('[data-tab]').forEach(b=>b.onclick=()=>{tab=b.dataset.tab;draw(a)});$('addrec').onclick=()=>record(k,tab==='overview'?'skin':tab);draw(a)}function draw(a){let list=(a.records||[]).filter(r=>tab==='overview'||r.type===tab);$('records').innerHTML=list.length?list.slice().reverse().map(r=>`<div class="item"><span><b>${esc(r.name)}</b><br><small>${esc(r.date)} • ${esc(r.extra)}</small></span><b>${r.type==='topup'?money(r.value):esc(r.value||'—')}</b></div>`).join(''):'<p class="muted">Belum ada catatan. Tambahkan data manual.</p>'}function edit(k){let a=db.accounts.find(x=>x.key===k);open();$('key').value=k;Object.entries({fgame:'game',nick:'nick',uid:'uid',server:'server',level:'level',rank:'rank',matches:'matches',wr:'wr',skins:'skins',topup:'topup',notes:'notes'}).forEach(([i,v])=>$(i).value=a[v]??'')}function open(){$('form').reset();$('key').value='';$('dlg').showModal()}$('add').onclick=open;$('close').onclick=()=>$('dlg').close();$('form').onsubmit=e=>{e.preventDefault();let k=$('key').value||crypto.randomUUID(),old=db.accounts.find(a=>a.key===k),a={key:k,game:$('fgame').value,nick:$('nick').value,uid:$('uid').value,server:$('server').value,level:$('level').value,rank:$('rank').value,matches:$('matches').value,wr:$('wr').value,skins:$('skins').value,topup:$('topup').value,notes:$('notes').value,records:old?.records||[]};db.accounts=old?db.accounts.map(x=>x.key===k?a:x):[...db.accounts,a];chosen=k;$('dlg').close();save();show(k)};function record(k,t){$('rform').reset();$('rkey').value=k;$('rtype').value=t;$('rtitle').textContent=t==='topup'?'Tambah transaksi top up':t==='match'?'Tambah riwayat match':'Tambah skin / hero';$('rdate').value=new Date().toISOString().slice(0,10);$('rdlg').showModal()}$('rcancel').onclick=()=>$('rdlg').close();$('rform').onsubmit=e=>{e.preventDefault();let a=db.accounts.find(x=>x.key===$('rkey').value),t=$('rtype').value,r={type:t,date:$('rdate').value,name:$('rname').value,value:$('rvalue').value,extra:$('rextra').value};a.records=a.records||[];a.records.push(r);if(t==='topup')a.topup=(+a.topup||0)+(+r.value||0);if(t==='skin')a.skins=(+a.skins||0)+1;$('rdlg').close();save();show(a.key)};$('search').onclick=()=>{let g=$('game').value,id=$('findid').value.trim(),s=$('findserver').value.trim();if(!id)return alert('Masukkan UID / ID pemain.');let a=db.accounts.find(x=>x.game===g&&x.uid===id&&(g==='ff'||!s||x.server===s));if(a)show(a.key);else{alert('ID belum ada di database lokal. Tambahkan data akun manual. Pencarian server otomatis memerlukan API resmi/penyedia data yang sah.');open();$('fgame').value=g;$('uid').value=id;$('server').value=s}};$('export').onclick=()=>{let u=URL.createObjectURL(new Blob([JSON.stringify(db,null,2)],{type:'application/json'})),a=document.createElement('a');a.href=u;a.download='alwi-game-review-backup.json';a.click();URL.revokeObjectURL(u)};render();

// === ALWI GAME REVIEW: akun & komunitas online ===
(() => {
 const API="https://square-water-3f85alwi-game-review-api.tahidmujib.workers.dev";
 let session=JSON.parse(localStorage.getItem("alwi-session")||"null");
 const el=(tag,attrs={},html="")=>{const n=document.createElement(tag);Object.entries(attrs).forEach(([k,v])=>n.setAttribute(k,v));n.innerHTML=html;return n};
 const style=el("style",{},`
 .online-wrap{margin:22px 0;display:grid;gap:14px}.online-card{background:linear-gradient(145deg,#19152e,#101827);border:1px solid #57408b;border-radius:16px;padding:18px}.online-card h2{margin:0 0 10px}.online-form{display:grid;gap:9px}.online-form input,.online-form textarea,.online-form select{width:100%;background:#090d18;color:#fff;border:1px solid #57408b;padding:12px;border-radius:9px}.online-form textarea{min-height:90px}.online-actions{display:flex;gap:8px;flex-wrap:wrap}.online-actions button{border:1px solid #7254ad;background:#241b3c;color:white;padding:10px 13px;border-radius:9px}.online-actions .active{background:#a18aff;color:#090d18}.review-item{padding:13px 0;border-top:1px solid #ffffff20}.review-item p{margin:6px 0}.stars{color:#ffc95c;letter-spacing:2px}.online-status{font-size:12px;color:#bdaaff}.online-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px}@media(max-width:520px){.online-grid{grid-template-columns:1fr}}
 `);
 document.head.append(style);
 const wrap=el("section",{class:"online-wrap"});
 wrap.innerHTML=`
 <div class="online-card"><div class="online-actions"><button id="ag-login" class="active">Login</button><button id="ag-register">Daftar</button><button id="ag-logout" style="display:none">Keluar</button></div><h2 id="ag-auth-title">Masuk ke komunitas</h2><form id="ag-auth" class="online-form"><input id="ag-user" placeholder="Username (untuk daftar)" style="display:none"><input id="ag-email" type="email" placeholder="Email" required><input id="ag-pass" type="password" placeholder="Password (minimal 8 karakter)" required><button class="primary">Login</button></form><p class="online-status" id="ag-status">Login untuk mengirim review dan menyimpan aktivitas ke database online.</p></div>
 <div class="online-card"><h2>Review komunitas</h2><form id="ag-review-form" class="online-form"><select id="ag-game"><option>Free Fire</option><option>Mobile Legends</option></select><input id="ag-title" placeholder="Judul review" maxlength="100" required><textarea id="ag-content" placeholder="Tulis pengalaman bermain..." maxlength="3000" required></textarea><select id="ag-rating"><option value="5">★★★★★ - 5</option><option value="4">★★★★☆ - 4</option><option value="3">★★★☆☆ - 3</option><option value="2">★★☆☆☆ - 2</option><option value="1">★☆☆☆☆ - 1</option></select><button class="primary">Kirim review</button></form><div id="ag-reviews">Memuat review...</div></div>`;
 document.querySelector("main").append(wrap);
 const $id=id=>document.getElementById(id);
 const status=(s)=>$id("ag-status").textContent=s;
 async function api(path,opts={}){const headers={"Content-Type":"application/json",...(session?{Authorization:"Bearer "+session.token}:{})};const r=await fetch(API+path,{...opts,headers:{...headers,...opts.headers}});const data=await r.json();if(!r.ok)throw Error(data.error||"Permintaan gagal");return data}
 function authUI(){const yes=!!session;$id("ag-logout").style.display=yes?"inline-block":"none";$id("ag-auth").style.display=yes?"none":"grid";$id("ag-auth-title").textContent=yes?"Kamu sudah login":"Masuk ke komunitas";status(yes?"Login sebagai "+session.user.username:"Login untuk mengirim review dan menyimpan aktivitas ke database online.");}
 let mode="login";
 function setMode(m){mode=m;$id("ag-login").classList.toggle("active",m==="login");$id("ag-register").classList.toggle("active",m==="register");$id("ag-user").style.display=m==="register"?"block":"none";$id("ag-auth-title").textContent=m==="login"?"Masuk ke komunitas":"Buat akun baru";$id("ag-auth button").textContent=m==="login"?"Login":"Daftar akun";}
 $id("ag-login").onclick=()=>setMode("login");$id("ag-register").onclick=()=>setMode("register");
 $id("ag-auth").onsubmit=async e=>{e.preventDefault();try{const body={email:$id("ag-email").value,password:$id("ag-pass").value};let path="/api/login";if(mode==="register"){body.username=$id("ag-user").value;path="/api/register"}const data=await api(path,{method:"POST",body:JSON.stringify(body)});session=data;localStorage.setItem("alwi-session",JSON.stringify(session));authUI();status("Berhasil "+(mode==="login"?"login":"mendaftar")+"!");}catch(err){status(err.message)}};
 $id("ag-logout").onclick=()=>{session=null;localStorage.removeItem("alwi-session");authUI()};
 $id("ag-review-form").onsubmit=async e=>{e.preventDefault();try{await api("/api/reviews",{method:"POST",body:JSON.stringify({game:$id("ag-game").value,title:$id("ag-title").value,content:$id("ag-content").value,rating:Number($id("ag-rating").value)})});$id("ag-review-form").reset();status("Review berhasil dikirim.");loadReviews()}catch(err){status(err.message)}};
 async function loadReviews(){try{const d=await api("/api/reviews");$id("ag-reviews").innerHTML=d.reviews.length?d.reviews.map(r=>`<div class="review-item"><b>${safe(r.title)}</b> <span class="stars">${"★".repeat(r.rating)}${"☆".repeat(5-r.rating)}</span><div class="online-status">${safe(r.game)} • oleh ${safe(r.username)} • ${safe(r.created_at)}</div><p>${safe(r.content)}</p></div>`).join(""):"<p class='online-status'>Belum ada review. Jadilah yang pertama!</p>"}catch(e){$id("ag-reviews").textContent="API belum aktif. Deploy worker.js ke Cloudflare untuk mengaktifkan review online."}}
 function safe(s){return String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]))}
 authUI();loadReviews();
})();

// === FITUR ONLINE LENGKAP: PROFIL, KOMENTAR, LIKE, TOP UP, ADMIN ===
(() => {
 const API="https://square-water-3f85alwi-game-review-api.tahidmujib.workers.dev";
 const root=document.createElement("section");
 root.className="online-wrap";
 root.innerHTML=`
 <div class="online-card">
  <h2>Profil game online</h2>
  <p class="online-status">Simpan ID dan informasi profil game ke Cloudflare D1.</p>
  <form id="ag-profile" class="online-form">
   <select id="ag-p-game"><option>Free Fire</option><option>Mobile Legends</option></select>
   <input id="ag-p-id" placeholder="UID / ID pemain" required maxlength="80">
   <input id="ag-p-nick" placeholder="Nickname" required maxlength="60">
   <input id="ag-p-server" placeholder="Server (opsional)">
   <div class="online-grid"><input id="ag-p-level" type="number" min="0" max="999" placeholder="Level"><input id="ag-p-rank" placeholder="Rank"></div>
   <button class="primary">Simpan profil online</button>
  </form>
  <div id="ag-profiles" class="online-status">Login untuk melihat profil online.</div>
 </div>
 <div class="online-card">
  <h2>Catatan top up</h2>
  <p class="online-status">Masukkan transaksi sendiri. Status awal menunggu verifikasi admin.</p>
  <form id="ag-topup" class="online-form">
   <select id="ag-t-game"><option>Free Fire</option><option>Mobile Legends</option></select>
   <input id="ag-t-amount" type="number" min="0.01" step="0.01" placeholder="Nominal (MYR)" required>
   <input id="ag-t-proof" type="url" placeholder="Link bukti pembayaran (opsional)">
   <button class="primary">Kirim catatan top up</button>
  </form>
  <div id="ag-topups" class="online-status">Login untuk melihat riwayat.</div>
 </div>
 <div class="online-card">
  <h2>Komunitas: like & komentar</h2>
  <div id="ag-community">Memuat review...</div>
 </div>
 <div class="online-card" id="ag-admin" style="display:none">
  <h2>Panel verifikasi admin</h2>
  <div id="ag-admin-list">Memuat transaksi...</div>
 </div>`;
 const style=document.createElement("style");
 style.textContent=".online-wrap{margin:20px 0;display:grid;gap:14px}.online-card{background:linear-gradient(145deg,#19152e,#101827);border:1px solid #57408b;border-radius:16px;padding:18px}.online-form{display:grid;gap:9px}.online-form input,.online-form textarea,.online-form select{width:100%;box-sizing:border-box;background:#090d18;color:#fff;border:1px solid #57408b;padding:12px;border-radius:9px}.online-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px}.online-status{font-size:12px;color:#bdaaff}.ag-review{padding:12px 0;border-top:1px solid #ffffff25}.ag-smallbtn{background:#281d43;color:white;border:1px solid #7254ad;border-radius:8px;padding:8px;margin:4px 4px 4px 0}.ag-comments{margin:8px 0 0 12px;padding-left:10px;border-left:2px solid #7254ad}.ag-admin-row{padding:10px 0;border-top:1px solid #ffffff25}@media(max-width:520px){.online-grid{grid-template-columns:1fr}}";
 document.head.append(style);
 const prior=document.querySelector("main");
 if(prior) prior.append(root);
 const $=id=>document.getElementById(id);
 const session=()=>{try{return JSON.parse(localStorage.getItem("alwi-session")||"null")}catch{return null}};
 const api=async(path,options={})=>{
  const s=session(),headers={"Content-Type":"application/json"};
  if(s&&s.token) headers.Authorization="Bearer "+s.token;
  const res=await fetch(API+path,{...options,headers:{...headers,...(options.headers||{})}});
  const data=await res.json();
  if(!res.ok) throw Error(data.error||"Permintaan gagal");
  return data;
 };
 const safe=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
 const needLogin=()=>{if(!session()?.token){alert("Login terlebih dahulu di bagian komunitas.");return false}return true};
 async function profiles(){
  try{const d=await api("/api/game-profiles");$("ag-profiles").innerHTML=d.profiles.length?d.profiles.map(p=>"<p><b>"+safe(p.game)+"</b> — "+safe(p.nickname)+" • ID "+safe(p.player_id)+" • Level "+safe(p.level)+" • "+safe(p.rank)+"</p>").join(""):"Belum ada profil online."}
  catch(e){$("ag-profiles").textContent=e.message}
 }
 $("ag-profile").onsubmit=async e=>{
  e.preventDefault();if(!needLogin())return;
  try{await api("/api/game-profiles",{method:"POST",body:JSON.stringify({game:$("ag-p-game").value,player_id:$("ag-p-id").value,nickname:$("ag-p-nick").value,server:$("ag-p-server").value,level:$("ag-p-level").value,rank:$("ag-p-rank").value})});$("ag-profile").reset();profiles();alert("Profil game berhasil disimpan online.")}
  catch(err){alert(err.message)}
 };
 async function topups(){
  try{const d=await api("/api/topups");$("ag-topups").innerHTML=d.topups.length?d.topups.map(t=>"<p>"+safe(t.game)+" • "+safe(t.currency)+" "+safe(t.amount)+" • <b>"+safe(t.status)+"</b> • "+safe(t.created_at)+"</p>").join(""):"Belum ada catatan top up."}
  catch(e){$("ag-topups").textContent=e.message}
 }
 $("ag-topup").onsubmit=async e=>{
  e.preventDefault();if(!needLogin())return;
  try{await api("/api/topups",{method:"POST",body:JSON.stringify({game:$("ag-t-game").value,amount:$("ag-t-amount").value,currency:"MYR",proof_url:$("ag-t-proof").value})});$("ag-topup").reset();topups();alert("Catatan top up dikirim. Status: pending / menunggu verifikasi.")}
  catch(err){alert(err.message)}
 };
 async function community(){
  try{
   const d=await api("/api/reviews");
   $("ag-community").innerHTML=d.reviews.length?d.reviews.map(r=>'<div class="ag-review"><b>'+safe(r.title)+'</b> <span class="stars">'+ "★".repeat(r.rating)+"☆".repeat(5-r.rating)+'</span><div class="online-status">'+safe(r.game)+" • "+safe(r.username)+" • "+safe(r.created_at)+" • "+safe(r.likes||0)+" suka</div><p>"+safe(r.content)+'</p><button class="ag-smallbtn" data-like="'+r.id+'">♥ Like</button><button class="ag-smallbtn" data-comment="'+r.id+'">Komentar</button><div id="ag-c-'+r.id+'"></div></div>').join(""):"Belum ada review.";
   document.querySelectorAll("[data-like]").forEach(b=>b.onclick=async()=>{if(!needLogin())return;try{await api("/api/reviews/"+b.dataset.like+"/like",{method:"POST",body:"{}"});community()}catch(e){alert(e.message)}});
   document.querySelectorAll("[data-comment]").forEach(b=>b.onclick=async()=>{
    const id=b.dataset.comment,box=$("ag-c-"+id);
    try{
     const d=await api("/api/reviews/"+id+"/comments");
     box.innerHTML='<div class="ag-comments">'+(d.comments.map(c=>"<p><b>"+safe(c.username)+"</b>: "+safe(c.content)+"</p>").join("")||"<p>Belum ada komentar.</p>")+'<form class="ag-comment-form" data-review="'+id+'"><input name="content" maxlength="1000" placeholder="Tulis komentar..." required><button class="ag-smallbtn">Kirim</button></form></div>';
     box.querySelector("form").onsubmit=async e=>{e.preventDefault();if(!needLogin())return;const content=e.target.content.value;try{await api("/api/reviews/"+id+"/comments",{method:"POST",body:JSON.stringify({content})});community()}catch(err){alert(err.message)}};
    }catch(e){alert(e.message)}
   });
  }catch(e){$("ag-community").textContent=e.message}
 }
 async function admin(){
  const s=session();if(!s||!s.user||s.user.role!=="admin")return;
  $("ag-admin").style.display="block";
  try{
   const d=await api("/api/admin/topups");
   $("ag-admin-list").innerHTML=d.topups.length?d.topups.map(t=>'<div class="ag-admin-row"><b>#'+t.id+" • "+safe(t.username)+"</b><p>"+safe(t.game)+" • "+safe(t.currency)+" "+safe(t.amount)+" • "+safe(t.status)+'</p><p>'+safe(t.proof_url||"Tanpa bukti")+'</p>'+(t.status==="pending"?'<button class="ag-smallbtn" data-approve="'+t.id+'">Setujui</button><button class="ag-smallbtn" data-reject="'+t.id+'">Tolak</button>':"")+'</div>').join(""):"Belum ada transaksi.";
   document.querySelectorAll("[data-approve],[data-reject]").forEach(b=>b.onclick=async()=>{const status=b.hasAttribute("data-approve")?"approved":"rejected";const note=prompt("Catatan admin (opsional):")||"";try{await api("/api/admin/topups/"+(b.dataset.approve||b.dataset.reject),{method:"PATCH",body:JSON.stringify({status,admin_note:note})});admin();topups()}catch(e){alert(e.message)}});
  }catch(e){$("ag-admin-list").textContent=e.message}
 }
 if(prior){profiles();topups();community();admin()}
 window.addEventListener("storage",()=>{profiles();topups();community();admin()});
})();
