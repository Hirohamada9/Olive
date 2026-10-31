/* Olive v1 — local-only, sync-ready. Data key: olive-v1. No network calls, no external resources. */
const STORAGE_KEY = "olive-v1";
const DOMAINS = [
  ["Move","#dbe7cd"],["Learn","#dde6f0"],["Speak/Create","#f2dfd2"],
  ["Connect","#f5e3c8"],["Faith","#e8ddf2"],["Work","#e3ddd2"],
  ["Home","#fde9c8"],["Explore/Play","#d8ece6"],["Rest","#e9e4d8"]
];
const PROMPTS = [
  ["today","Today I…"],["enjoyed","The part I actually enjoyed was…"],
  ["work","Work today, in one line…"],["learned","One thing I learned / noticed…"],
  ["faith","A God / faith moment, if any…"],["goalNote","Am I moving closer to a goal? Tell me more…"]
];
const uid = (p) => p + "-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2,7);
const nowISO = () => new Date().toISOString();
function todayISO(d){
  const x = d ? new Date(d) : new Date();
  const y = x.getFullYear(), m = String(x.getMonth()+1).padStart(2,"0"), day = String(x.getDate()).padStart(2,"0");
  return `${y}-${m}-${day}`;
}
function parseDate(s){ const [y,m,d]=s.split("-").map(Number); return new Date(y,m-1,d); }
function fmtDate(s){ return parseDate(s).toLocaleDateString(undefined,{weekday:"short",day:"numeric",month:"short",year:"numeric"}); }
function mondayOf(s){
  const d = parseDate(s); const dow = (d.getDay()+6)%7; d.setDate(d.getDate()-dow); return todayISO(d);
}
function addDays(s,n){ const d=parseDate(s); d.setDate(d.getDate()+n); return todayISO(d); }
function esc(s){ return String(s==null?"":s).replace(/[&<>"']/g, c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c])); }

let store = load();
let editingTalkId = null;
function load(){
  try{
    const raw = localStorage.getItem(STORAGE_KEY);
    if(!raw) return {version:1, days:[], talks:[]};
    const p = JSON.parse(raw);
    if(!p || p.version!==1 || !Array.isArray(p.days) || !Array.isArray(p.talks)) return {version:1, days:[], talks:[], checkpointResponses:[], talkDraft:null};
    if(!Array.isArray(p.checkpointResponses)) p.checkpointResponses = [];
    if(!("talkDraft" in p)) p.talkDraft = null;
    return p;
  }catch(e){ return {version:1, days:[], talks:[]}; }
}
function save(){
  localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  const t = "Saved • " + new Date().toLocaleTimeString([], {hour:"2-digit", minute:"2-digit"});
  const el = document.getElementById("savedIndicator");
  if(el) el.textContent = t;
  const st = document.getElementById("stickySaved");
  if(st) st.textContent = t;
}
function saveTalkDraft(){
  const draft = {
    hook: document.getElementById("talkHook").value,
    moment: document.getElementById("talkMoment").value,
    meaning: document.getElementById("talkMeaning").value,
    close: document.getElementById("talkClose").value,
    sourceDate: document.getElementById("talkSourceDate").value || todayISO(),
    updatedAt: nowISO()
  };
  if(!draft.hook && !draft.moment && !draft.meaning && !draft.close) return;
  store.talkDraft = draft;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  const el = document.getElementById("talkSavedIndicator");
  if(el) el.textContent = "Talk draft autosaved • " + new Date().toLocaleTimeString([], {hour:"2-digit", minute:"2-digit"});
}
function loadTalkDraft(){
  const d = store.talkDraft; if(!d) return;
  if(!document.getElementById("talkHook").value) document.getElementById("talkHook").value = d.hook||"";
  if(!document.getElementById("talkMoment").value) document.getElementById("talkMoment").value = d.moment||"";
  if(!document.getElementById("talkMeaning").value) document.getElementById("talkMeaning").value = d.meaning||"";
  if(!document.getElementById("talkClose").value) document.getElementById("talkClose").value = d.close||"";
  if(d.sourceDate) document.getElementById("talkSourceDate").value = d.sourceDate;
  updateTalkPreview();
}
function blankDay(date){
  return {id:"day-"+date, date, domains:[], prompts:{today:"",enjoyed:"",work:"",learned:"",faith:"",goalNote:""}, goalDirection:"", createdAt:nowISO(), updatedAt:nowISO()};
}
function getDay(date, create){
  let d = store.days.find(x=>x.date===date);
  if(!d && create){ d = blankDay(date); store.days.push(d); }
  return d || blankDay(date);
}
function hasContent(d){
  return d && (d.domains.length>0 || Object.values(d.prompts||{}).some(v=>String(v||"").trim()) || d.goalDirection);
}
function touchToday(){
  const d = getDay(todayISO(), true); d.updatedAt = nowISO(); return d;
}

/* Tabs */
function showTab(name){
  document.querySelectorAll(".tab").forEach(s=>s.classList.toggle("active", s.id==="tab-"+name));
  document.querySelectorAll("nav button").forEach(b=>b.classList.toggle("active", b.dataset.tab===name));
  if(name==="timeline") renderTimeline();
  if(name==="board") renderBoard();
  if(name==="talk") renderTalkCandidates();
  if(name==="insights") renderInsights();
  window.scrollTo(0,0);
}
document.querySelectorAll("nav button").forEach(b=>b.addEventListener("click", ()=>showTab(b.dataset.tab)));

/* Journal */
function renderJournal(){
  const t = todayISO();
  document.getElementById("todayLabel").textContent = fmtDate(t);
  const day = getDay(t, false);
  const grid = document.getElementById("domainGrid"); grid.innerHTML = "";
  DOMAINS.forEach(([name,color])=>{
    const on = day.domains.includes(name);
    const b = document.createElement("button");
    b.type="button"; b.className="domain-btn"+(on?" active":""); b.style.setProperty("--domain", color);
    const icons = {Move:"🏃", Learn:"📖", "Speak/Create":"🎤", Connect:"🤝", Faith:"🙏", Work:"💼", Home:"🏠", "Explore/Play":"🧭", Rest:"🌙"};
    b.innerHTML = '<span class="domain-icon">'+(icons[name]||"•")+'</span>' + esc(name) + '<span class="plus">'+(on?"+1 ✓":"tap for +1")+"</span>";
    b.setAttribute("aria-pressed", on?"true":"false");
    b.addEventListener("click", ()=>{
      const poseMap = {Move:"move", Learn:"learning", "Speak/Create":"speak", Connect:"connect", Faith:"faith", Work:"work", Home:"home", "Explore/Play":"explore", Rest:"rest"};
      setAvatarPose(poseMap[name]||"listening");
      const d = touchToday();
      if(d.domains.includes(name)) d.domains = d.domains.filter(x=>x!==name);
      else d.domains.push(name);
      save(); renderJournal();
    });
    grid.appendChild(b);
  });
  document.getElementById("todayCount").textContent = day.domains.length + " of 9 today";
  renderGreetingAndGlance(day);
  renderWeekGlance();
  // prompts
  PROMPTS.forEach(([key])=>{
    const ta = document.querySelector(`[data-prompt="${key}"]`);
    if(ta && ta.value !== (day.prompts[key]||"")) ta.value = day.prompts[key]||"";
  });
  document.querySelectorAll("[data-goal-dir]").forEach(b=>{
    b.classList.toggle("active", day.goalDirection===b.dataset.goalDir);
  });
}
document.querySelectorAll("[data-prompt]").forEach(ta=>{
  ta.addEventListener("input", ()=>{
    const d = touchToday(); d.prompts[ta.dataset.prompt] = ta.value; save();
  });
});
document.querySelectorAll("[data-goal-dir]").forEach(b=>{
  b.addEventListener("click", ()=>{
    const d = touchToday();
    d.goalDirection = (d.goalDirection===b.dataset.goalDir) ? "" : b.dataset.goalDir;
    save(); renderJournal();
  });
});

function renderGreetingAndGlance(day){
  const h = new Date().getHours();
  const greet = h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening";
  const gt = document.getElementById("greetingTitle"); if(gt) gt.textContent = greet + ", Shawn";
  const gd = document.getElementById("greetingDate"); if(gd) gd.textContent = fmtDate(todayISO());
  const mon = mondayOf(todayISO()); const week = weekDates(mon);
  const weekJournaled = week.filter(d=>hasContent(store.days.find(x=>x.date===d))).length;
  const anyPrompt = PROMPTS.some(([k])=>String(day.prompts[k]||"").trim());
  const gc = document.getElementById("glanceCards");
  if(gc) gc.innerHTML = `<div class="glance-card"><strong>${day.domains.length} / 9</strong><span>Domains today</span></div><div class="glance-card"><strong>${weekJournaled}</strong><span>Days this week</span></div><div class="glance-card"><strong>${store.talks.length}</strong><span>Talks saved</span></div>`;
  const cc = document.getElementById("continueCard");
  if(cc) cc.classList.toggle("hidden", !anyPrompt);
}
function renderWeekGlance(){
  const mon = mondayOf(todayISO()); const dates = weekDates(mon);
  const byDate = Object.fromEntries(store.days.map(d=>[d.date,d]));
  const journaled = dates.filter(d=>hasContent(byDate[d])).length;
  const total = dates.reduce((n,d)=>n+((byDate[d]&&byDate[d].domains.length)||0),0);
  const s = document.getElementById("weekGlanceSummary");
  if(s) s.textContent = `${fmtDate(mon)} – ${fmtDate(dates[6])} • ${journaled} day(s) journaled this week • ${total} domain +1(s)`;
  const g = document.getElementById("weekGlanceGrid");
  if(!g) return;
  g.className = "week-glance";
  g.innerHTML = dates.map(d=>{
    const day = byDate[d]; const n = day ? day.domains.length : 0;
    const isT = d===todayISO();
    return `<div class="${isT?"today":""}">${parseDate(d).toLocaleDateString(undefined,{weekday:"short"})}<br><strong>${parseDate(d).getDate()}</strong><br>${n} +1</div>`;
  }).join("");
}
document.querySelectorAll("[data-jump-target]").forEach(b=>b.addEventListener("click", ()=>{
  const el = document.getElementById(b.dataset.jumpTarget); if(el) el.scrollIntoView({behavior:"smooth", block:"start"});
}));
document.querySelectorAll("[data-jump-board]").forEach(b=>b.addEventListener("click", ()=>showTab("board")));
document.getElementById("navPlus")?.addEventListener("click", ()=>{ showTab("journal"); const el=document.getElementById("journalCard"); if(el) el.scrollIntoView({behavior:"smooth", block:"start"}); });

/* Avatar companion — inline SVG, no photos, pose by topic */
const AVATAR_POSES = {
  listening:{caption:"Listening with you", glasses:false, lampBook:false, laptop:false, mic:false, map:false, broom:false, pillow:false, thought:false, arms:"down", legs:"stand", eyes:"open", tilt:"0deg"},
  learning:{caption:"Reading under a lamp", glasses:true, lampBook:true, laptop:false, mic:false, map:false, broom:false, pillow:false, thought:false, arms:"down", legs:"stand", eyes:"open", tilt:"-4deg"},
  faith:{caption:"Kneeling, praying, eyes closed", glasses:false, lampBook:false, laptop:false, mic:false, map:false, broom:false, pillow:false, thought:false, arms:"pray", legs:"kneel", eyes:"closed", tilt:"8deg"},
  work:{caption:"Working at my desk", glasses:true, lampBook:false, laptop:true, mic:false, map:false, broom:false, pillow:false, thought:false, arms:"down", legs:"stand", eyes:"open", tilt:"0deg"},
  speak:{caption:"Holding the mic", glasses:false, lampBook:false, laptop:false, mic:true, map:false, broom:false, pillow:false, thought:false, arms:"down", legs:"stand", eyes:"open", tilt:"0deg"},
  move:{caption:"Stretching", glasses:false, lampBook:false, laptop:false, mic:false, map:false, broom:false, pillow:false, thought:false, arms:"up", legs:"stand", eyes:"open", tilt:"0deg"},
  connect:{caption:"Waving hello", glasses:false, lampBook:false, laptop:false, mic:false, map:false, broom:false, pillow:false, thought:false, arms:"up", legs:"stand", eyes:"open", tilt:"0deg"},
  home:{caption:"Tidying up", glasses:false, lampBook:false, laptop:false, mic:false, map:false, broom:true, pillow:false, thought:false, arms:"down", legs:"stand", eyes:"open", tilt:"0deg"},
  explore:{caption:"Out exploring", glasses:false, lampBook:false, laptop:false, mic:false, map:true, broom:false, pillow:false, thought:false, arms:"down", legs:"stand", eyes:"open", tilt:"0deg"},
  rest:{caption:"Resting too", glasses:false, lampBook:false, laptop:false, mic:false, map:false, broom:false, pillow:true, thought:false, arms:"down", legs:"lie", eyes:"closed", tilt:"0deg"},
  goal:{caption:"Thinking ahead", glasses:true, lampBook:false, laptop:false, mic:false, map:false, broom:false, pillow:false, thought:true, arms:"down", legs:"stand", eyes:"open", tilt:"-4deg"}
};
function setAvatarPose(key){
  const p = AVATAR_POSES[key] || AVATAR_POSES.listening;
  const cap = document.getElementById("avatarCaption"); if(cap) cap.textContent = p.caption;
  const show = (id,on)=>{ const el=document.getElementById(id); if(el) el.style.display = on?"":"none"; };
  show("avatarGlasses", p.glasses); show("avatarLampBook", p.lampBook); show("avatarLaptop", p.laptop); show("avatarMic", p.mic); show("avatarMap", p.map); show("avatarBroom", p.broom); show("avatarPillow", p.pillow); show("avatarThought", p.thought);
  show("avatarArmsDown", p.arms==="down"); show("avatarArmsUp", p.arms==="up"); show("avatarArmsPray", p.arms==="pray");
  show("avatarLegsStand", p.legs==="stand"); show("avatarLegsKneel", p.legs==="kneel"); show("avatarLegsLie", p.legs==="lie");
  const head = document.getElementById("avatarHead"); if(head){ head.style.transform = `rotate(${p.tilt})`; head.style.transformOrigin = "60px 38px"; }
  const eyeL = document.getElementById("avatarEyeL"), eyeR = document.getElementById("avatarEyeR");
  if(p.eyes==="closed"){ if(eyeL) eyeL.setAttribute("r","1"); if(eyeR) eyeR.setAttribute("r","1"); }
  else { if(eyeL) eyeL.setAttribute("r","2.8"); if(eyeR) eyeR.setAttribute("r","2.8"); }
}
function avatarWave(){
  const svg = document.getElementById("avatarSvg"); if(!svg) return;
  svg.classList.remove("waving"); void svg.offsetWidth; svg.classList.add("waving");
  const b = document.getElementById("avatarBubble");
  if(b){ b.classList.remove("hidden"); b.textContent = "Hi — I’m here, keep going."; setTimeout(()=>b.classList.add("hidden"), 2500); }
}
document.getElementById("avatarTap")?.addEventListener("click", avatarWave);
document.getElementById("avatarCollapse")?.addEventListener("click", (e)=>{
  e.stopPropagation();
  document.getElementById("avatarCard").style.display = "none";
  document.getElementById("avatarChip").classList.remove("hidden");
});
document.getElementById("avatarChip")?.addEventListener("click", ()=>{
  document.getElementById("avatarCard").style.display = "";
  document.getElementById("avatarChip").classList.add("hidden");
});
document.querySelectorAll("[data-prompt]").forEach(ta=>{
  const map = {today:"listening", enjoyed:"listening", work:"work", learned:"learning", faith:"faith", goalNote:"goal"};
  ta.addEventListener("focus", ()=>{ document.body.classList.add("avatar-typing"); setAvatarPose(map[ta.dataset.prompt]||"listening"); });
  ta.addEventListener("blur", ()=>document.body.classList.remove("avatar-typing"));
});

/* Timeline — past days in reverse order; today is editable via Journal, past days are read-only in v1. */
let timelineFilterDate = null;
function renderTimeline(){
  const strip = document.getElementById("timelineStrip");
  if(strip){
    const mon = mondayOf(todayISO()); const week = weekDates(mon);
    const byDate = Object.fromEntries(store.days.map(d=>[d.date,d]));
    strip.innerHTML = week.map(d=>{
      const day = byDate[d]; const journaled = hasContent(day);
      const sel = timelineFilterDate===d ? " selected" : "";
      const j = journaled ? " journaled" : "";
      return `<button type="button" class="${sel}${j}" data-strip-date="${d}">${parseDate(d).toLocaleDateString(undefined,{weekday:"short"})}<br><strong>${parseDate(d).getDate()}</strong><br>${journaled?"●":"—"}</button>`;
    }).join("") + `<button type="button" data-strip-date="">Show all</button>`;
    strip.querySelectorAll("[data-strip-date]").forEach(b=>b.addEventListener("click", ()=>{ timelineFilterDate = b.dataset.stripDate || null; renderTimeline(); }));
  }
  const note = document.getElementById("timelineFilterNote");
  if(note) note.textContent = timelineFilterDate ? `Showing ${fmtDate(timelineFilterDate)} only. Tap Show all to see every day.` : "";
  const box = document.getElementById("timelineList");
  const allDays = store.days.filter(hasContent).sort((a,b)=>b.date.localeCompare(a.date));
  const days = timelineFilterDate ? allDays.filter(d=>d.date===timelineFilterDate) : allDays;
  if(timelineFilterDate && !days.length){ box.innerHTML = '<p class="muted">No entry on that day yet.</p>'; return; }
  if(!days.length){ box.innerHTML = '<p class="muted">Nothing journaled yet. Your first day will appear here. Olive starts empty by design.</p>'; return; }
  box.innerHTML = days.map(d=>{
    const isToday = d.date===todayISO();
    const prompts = PROMPTS.filter(([k])=>String(d.prompts[k]||"").trim()).map(([k,label])=>`<p><strong>${esc(label)}</strong><br>${esc(d.prompts[k])}</p>`).join("");
    const dir = d.goalDirection ? `<p><strong>Goal direction:</strong> ${esc(d.goalDirection)}</p>` : "";
    return `<article class="card"><h3>${esc(fmtDate(d.date))}${isToday?" — today":""}</h3>
      <p>${d.domains.length? d.domains.map(x=>`<span class="pill">${esc(x)} +1</span>`).join(" ") : '<span class="muted">No domain +1s that day.</span>'}</p>
      ${prompts}${dir}
      ${isToday?'<button class="btn smallbtn secondary" data-edit-today="1">Edit today in Journal</button>':'<p class="muted small">Past days are read-only in v1.</p>'}
      </article>`;
  }).join("");
  box.querySelectorAll("[data-edit-today]").forEach(b=>b.addEventListener("click", ()=>showTab("journal")));
}

/* Board */
function weekDates(monday){ return [0,1,2,3,4,5,6].map(i=>addDays(monday,i)); }
function renderBoard(){
  const mon = mondayOf(todayISO()); const thisWeek = weekDates(mon); const lastWeek = weekDates(addDays(mon,-7));
  document.getElementById("weekLabel").textContent = fmtDate(mon) + " – " + fmtDate(thisWeek[6]);
  const byDate = Object.fromEntries(store.days.map(d=>[d.date,d]));
  let head = "<tr><th>Domain</th>" + thisWeek.map(d=>`<th>${parseDate(d).toLocaleDateString(undefined,{weekday:"narrow"})}<br><span class="small">${parseDate(d).getDate()}</span></th>`).join("") + "</tr>";
  let rows = DOMAINS.map(([name])=>{
    return "<tr><td>"+esc(name)+"</td>" + thisWeek.map(d=>{
      const day = byDate[d]; const on = day && day.domains.includes(name);
      return `<td class="mark">${on?"●":"—"}</td>`;
    }).join("") + "</tr>";
  }).join("");
  document.getElementById("weekGrid").innerHTML = "<table>"+head+rows+"</table>";
  const countIn = (dates,domain)=>dates.reduce((n,d)=>n+((byDate[d]&&byDate[d].domains.includes(domain))?1:0),0);
  document.getElementById("compareTable").innerHTML = "<table><tr><th>Domain</th><th>This week</th><th>Last week</th><th>Change</th></tr>" +
    DOMAINS.map(([name])=>{
      const a=countIn(thisWeek,name), b=countIn(lastWeek,name), diff=a-b;
      return `<tr><td>${esc(name)}</td><td>${a}</td><td>${b}</td><td>${diff>0?"+"+diff:diff}</td></tr>`;
    }).join("") + "</table>";
  const journaledThis = thisWeek.filter(d=>hasContent(byDate[d])).length;
  const journaledLast = lastWeek.filter(d=>hasContent(byDate[d])).length;
  document.getElementById("boardSummary").textContent = `Days journaled: ${journaledThis} this week, ${journaledLast} last week.`;
}

/* Talk */
function momentCandidates(){
  const out = [];
  for(let i=6;i>=0;i--){
    const date = addDays(todayISO(), -i); const d = store.days.find(x=>x.date===date);
    if(!d) continue;
    [["enjoyed","Enjoyed"],["learned","Learned / noticed"],["today","Today"],["faith","Faith moment"],["goalNote","Goal note"]].forEach(([k,label])=>{
      const t = String(d.prompts[k]||"").trim();
      if(t) out.push({date, label, text:t});
    });
  }
  return out;
}
function renderTalkCandidates(){
  const sel = document.getElementById("momentSelect"); const cands = momentCandidates();
  sel.innerHTML = '<option value="">Choose a moment from the past week, or write your own below</option>' +
    cands.map((c,i)=>`<option value="${i}">${esc(c.date)} — ${esc(c.label)}: ${esc(c.text.slice(0,80))}</option>`).join("");
  sel.onchange = ()=>{
    if(sel.value==="") return;
    const c = cands[Number(sel.value)];
    const mf = document.getElementById("talkMoment");
    if(!mf.value.trim()) mf.value = c.text;
    document.getElementById("talkSourceDate").value = c.date;
    updateTalkPreview();
  };
  renderTalkList();
}
function updateTalkPreview(){
  const hook = document.getElementById("talkHook").value.trim();
  const moment = document.getElementById("talkMoment").value.trim();
  const meaning = document.getElementById("talkMeaning").value.trim();
  const close = document.getElementById("talkClose").value.trim();
  const parts = [];
  if(hook) parts.push(hook);
  if(moment) parts.push("The moment: " + moment);
  if(meaning) parts.push("What it means: " + meaning);
  if(close) parts.push(close);
  const script = parts.join("\n\n");
  document.getElementById("talkScript").textContent = script || "Your read-back script will appear here as you fill in the fields above.";
  const words = script ? script.split(/\s+/).filter(Boolean).length : 0;
  const secs = Math.round(words/130*60);
  document.getElementById("talkEstimate").textContent = words + " words • about " + Math.floor(secs/60) + " min " + String(secs%60).padStart(2,"0") + " sec at ~130 words per minute";
}
["talkHook","talkMoment","talkMeaning","talkClose"].forEach(id=>document.getElementById(id).addEventListener("input", ()=>{ updateTalkPreview(); saveTalkDraft(); }));
document.getElementById("copyTalkBtn")?.addEventListener("click", async ()=>{
  updateTalkPreview();
  const txt = document.getElementById("talkScript").textContent || "";
  try{ await navigator.clipboard.writeText(txt); document.getElementById("talkSavedNote").textContent = "Script copied."; }
  catch(e){
    const ta = document.createElement("textarea"); ta.value = txt; document.body.appendChild(ta); ta.select(); document.execCommand("copy"); ta.remove();
    document.getElementById("talkSavedNote").textContent = "Script copied.";
  }
});
function renderTalkList(){
  const box = document.getElementById("talkList");
  const talks = [...store.talks].sort((a,b)=>b.updatedAt.localeCompare(a.updatedAt));
  if(!talks.length){ box.innerHTML = '<p class="muted">No saved talks yet.</p>'; return; }
  box.innerHTML = talks.map(t=>`<div class="talk-item"><strong>${esc(t.sourceDate||"")}</strong> — ${esc((t.hook||t.moment||"").slice(0,100))}
    <div class="row" style="margin-top:8px"><button class="btn smallbtn secondary" data-load="${t.id}">Load</button>
    <button class="btn smallbtn" data-practice="${t.id}">Practice +1</button>
    <span>Reps: ${t.reps||0}</span>
    <button class="btn smallbtn secondary" data-del="${t.id}">Delete</button></div></div>`).join("");
  box.querySelectorAll("[data-load]").forEach(b=>b.addEventListener("click", ()=>{
    const t = store.talks.find(x=>x.id===b.dataset.load); if(!t) return;
    editingTalkId = t.id;
    document.getElementById("talkHook").value = t.hook||""; document.getElementById("talkMoment").value = t.moment||"";
    document.getElementById("talkMeaning").value = t.meaning||""; document.getElementById("talkClose").value = t.close||"";
    document.getElementById("talkSourceDate").value = t.sourceDate||todayISO(); updateTalkPreview();
  }));
  box.querySelectorAll("[data-practice]").forEach(b=>b.addEventListener("click", ()=>{
    const t = store.talks.find(x=>x.id===b.dataset.practice); if(!t) return;
    t.reps = (t.reps||0)+1; t.updatedAt = nowISO(); save(); renderTalkList();
  }));
  box.querySelectorAll("[data-del]").forEach(b=>b.addEventListener("click", ()=>{
    store.talks = store.talks.filter(x=>x.id!==b.dataset.del); save(); renderTalkList();
  }));
}
document.getElementById("saveTalkBtn").addEventListener("click", ()=>{
  const hook = document.getElementById("talkHook").value.trim();
  const moment = document.getElementById("talkMoment").value.trim();
  const meaning = document.getElementById("talkMeaning").value.trim();
  const close = document.getElementById("talkClose").value.trim();
  if(!hook && !moment && !meaning && !close){ alert("Add at least one part of the talk first."); return; }
  const sourceDate = document.getElementById("talkSourceDate").value || todayISO();
  if(editingTalkId){
    const t = store.talks.find(x=>x.id===editingTalkId);
    if(t){ t.hook=hook; t.moment=moment; t.meaning=meaning; t.close=close; t.sourceDate=sourceDate; t.updatedAt=nowISO(); }
    editingTalkId = null;
  } else {
    store.talks.push({id:uid("talk"), sourceDate, hook, moment, meaning, close, reps:0, createdAt:nowISO(), updatedAt:nowISO()});
  }
  store.talkDraft = null; save(); renderTalkList();
  document.getElementById("talkSavedNote").textContent = "Talk saved.";
  const ti = document.getElementById("talkSavedIndicator"); if(ti) ti.textContent = "Talk saved.";
});
document.getElementById("newTalkBtn").addEventListener("click", ()=>{
  editingTalkId = null; store.talkDraft = null;
  ["talkHook","talkMoment","talkMeaning","talkClose"].forEach(id=>document.getElementById(id).value="");
  document.getElementById("talkSourceDate").value = todayISO(); updateTalkPreview();
});

/* Insights — summaries are counts; patterns are always labelled suggestions, never facts. */
function renderInsights(){
  const days = store.days.filter(hasContent);
  const mon = mondayOf(todayISO()); const thisWeek = weekDates(mon);
  const monthPrefix = todayISO().slice(0,7);
  const countDomains = (list)=>{ const c={}; list.forEach(d=>d.domains.forEach(x=>c[x]=(c[x]||0)+1)); return c; };
  const topOf = (c)=>{ const e=Object.entries(c).sort((a,b)=>b[1]-a[1]); return e.length? e[0][0]+" ("+e[0][1]+")" : "—"; };
  const weekDays = days.filter(d=>thisWeek.includes(d.date));
  const monthDays = days.filter(d=>d.date.startsWith(monthPrefix));
  const weekCounts = countDomains(weekDays), monthCounts = countDomains(monthDays);
  const weekTotal = Object.values(weekCounts).reduce((a,b)=>a+b,0), monthTotal = Object.values(monthCounts).reduce((a,b)=>a+b,0);
  document.getElementById("insightsSummary").innerHTML =
    `<p><strong>This week:</strong> ${weekDays.length} day(s) journaled, ${weekTotal} domain +1(s). Most tapped: ${esc(topOf(weekCounts))}.</p>` +
    `<p><strong>This month:</strong> ${monthDays.length} day(s) journaled, ${monthTotal} domain +1(s). Most tapped: ${esc(topOf(monthCounts))}.</p>`;
  // Visuals: donut, top bars, streak — all from real week counts, no fake data
  const domainColor = Object.fromEntries(DOMAINS);
  const donutEl = document.getElementById("insightsDonut");
  const legendEl = document.getElementById("insightsDonutLegend");
  if(donutEl && legendEl){
    if(weekTotal){
      let acc = 0; const segs = Object.entries(weekCounts).map(([n,c])=>{
        const s = acc / weekTotal * 360; acc += c; const e = acc / weekTotal * 360;
        return `${domainColor[n]||"#6b4a2f"} ${s}deg ${e}deg`;
      }).join(", ");
      donutEl.style.background = `conic-gradient(${segs})`;
      legendEl.innerHTML = Object.entries(weekCounts).sort((a,b)=>b[1]-a[1]).map(([n,c])=>`<p style="margin:4px 0"><span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:${domainColor[n]||"#6b4a2f"}"></span> ${esc(n)} — ${c} (${Math.round(c/weekTotal*100)}%)</p>`).join("");
    } else {
      donutEl.style.background = "#e6d7bc";
      legendEl.innerHTML = '<p class="muted">No domain +1s this week yet.</p>';
    }
  }
  const barsEl = document.getElementById("insightsBars");
  if(barsEl){
    const top = Object.entries(weekCounts).sort((a,b)=>b[1]-a[1]).slice(0,5);
    barsEl.innerHTML = '<h4 style="margin:6px 0">Top domains this week</h4>' + (top.length ? top.map(([n,c])=>{
      const max = top[0][1]||1; const w = Math.round(c/max*100);
      return `<div class="bar-row"><span>${esc(n)}</span><div class="bar-track"><div class="bar-fill" style="width:${w}%"></div></div><span>${c}</span></div>`;
    }).join("") : '<p class="muted">No domain +1s this week yet.</p>');
  }
  const streakEl = document.getElementById("insightsStreak");
  if(streakEl){
    let streak = 0; let cursor = todayISO();
    if(!hasContent(store.days.find(x=>x.date===cursor))) cursor = addDays(cursor, -1);
    while(hasContent(store.days.find(x=>x.date===cursor))){ streak++; cursor = addDays(cursor, -1); }
    const mon = mondayOf(todayISO()); const week = weekDates(mon);
    const byDate = Object.fromEntries(store.days.map(d=>[d.date,d]));
    streakEl.innerHTML = `<h4 style="margin:6px 0">Your streak — ${streak} day(s)</h4><div class="streak-dots">` + week.map(d=>{
      const filled = hasContent(byDate[d]); const isT = d===todayISO();
      return `<div class="streak-dot${filled?" filled":""}${isT?" today":""}" title="${esc(fmtDate(d))}">${parseDate(d).toLocaleDateString(undefined,{weekday:"narrow"})}</div>`;
    }).join("") + `</div><p class="muted small">A streak counts consecutive days with a journal entry, ending today or yesterday.</p>`;
  }
  // Yearly insights
  const yearPrefix = todayISO().slice(0,4);
  const yearDays = days.filter(d=>d.date.startsWith(yearPrefix));
  const yearCounts = countDomains(yearDays);
  const yearTotal = Object.values(yearCounts).reduce((a,b)=>a+b,0);
  const yEl = document.getElementById("yearInsights");
  if(yEl) yEl.innerHTML = `<p><strong>This year (${yearPrefix}):</strong> ${yearDays.length} day(s) journaled, ${yearTotal} domain +1(s), ${store.talks.length} talk(s) saved. Most tapped: ${esc(topOf(yearCounts))}.</p>`;
  // Checkpoints
  renderCheckpoints(days, weekDays, monthDays, yearDays);
  const box = document.getElementById("insightsPatterns");
  if(days.length<3){
    box.innerHTML = '<p class="muted">Not enough days yet for patterns. Keep journaling — suggestions will appear here once you have a few days, and they will always be labelled as suggestions to confirm or correct.</p>';
    return;
  }
  const sugg = [];
  if(topOf(monthCounts)!=="—") sugg.push(`Possible pattern — confirm or correct: ${topOf(monthCounts)} is your most tapped domain this month.`);
  const last7 = []; for(let i=6;i>=0;i--) last7.push(addDays(todayISO(),-i));
  const c7 = countDomains(days.filter(d=>last7.includes(d.date)));
  Object.entries(c7).filter(([,n])=>n>=4).forEach(([name,n])=>sugg.push(`Possible pattern — confirm or correct: you tapped ${name} on ${n} of the last 7 days.`));
  if(!sugg.length) sugg.push("Possible pattern — confirm or correct: no single domain stands out in the last 7 days yet.");
  box.innerHTML = sugg.map(s=>`<div class="callout">${esc(s)}</div>`).join("") +
    '<p class="muted small">These are suggestions only, not facts — especially with only a few days of data. Confirm or correct them in your own reflection.</p>';
}

function renderCheckpoints(days, weekDays, monthDays, yearDays){
  const box = document.getElementById("checkpoints"); if(!box) return;
  const resp = Object.fromEntries((store.checkpointResponses||[]).map(r=>[r.id, r]));
  const quiet = DOMAINS.map(([n])=>n).filter(n=>{
    const c = days.filter(d=>d.domains.includes(n)).length;
    return days.length>=7 && c===0;
  });
  const items = [
    {id:"weekly", period:"Weekly", text:"This week, what actually changed, and what stayed the same? What do you want to carry into next week?"},
    {id:"monthly", period:"Monthly", text:"This month, which domains lit up, and which went quiet? Is that a choice, or drift?"},
    {id:"yearly", period:"Yearly", text:"This year so far, what are you moving closer to, and what has not moved at all? What is one honest next step?"},
  ];
  if(quiet.length) items.push({id:"quiet", period:"Quiet domains", text:`Possible checkpoint — confirm or correct: ${quiet.join(", ")} ${quiet.length===1?"has":"have"} not been tapped in your journaled days. Does that feel like a gap, or simply not a priority right now?`});
  box.innerHTML = items.map(it=>{
    const r = resp[it.id];
    const status = r ? `<p class="muted small">You marked this: ${esc(r.response)}${r.note? " — "+esc(r.note):""}</p>` : "";
    return `<div class="checkpoint"><strong>${esc(it.period)} checkpoint</strong><p>${esc(it.text)}</p><div class="row"><button class="btn smallbtn" data-check-confirm="${it.id}">Confirm</button><button class="btn smallbtn secondary" data-check-correct="${it.id}">Correct</button></div>${status}</div>`;
  }).join("");
  box.querySelectorAll("[data-check-confirm]").forEach(b=>b.addEventListener("click", ()=>{
    saveCheckpointResponse(b.dataset.checkConfirm, "confirmed"); renderInsights();
  }));
  box.querySelectorAll("[data-check-correct]").forEach(b=>b.addEventListener("click", ()=>{
    saveCheckpointResponse(b.dataset.checkCorrect, "corrected"); renderInsights();
  }));
}
function saveCheckpointResponse(id, response){
  if(!Array.isArray(store.checkpointResponses)) store.checkpointResponses = [];
  const ex = store.checkpointResponses.find(r=>r.id===id);
  if(ex){ ex.response = response; ex.updatedAt = nowISO(); } else { store.checkpointResponses.push({id, response, updatedAt: nowISO()}); }
  save();
}

/* Export / Import */
function download(filename, text, type){
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([text], {type})); a.download = filename; a.click();
  setTimeout(()=>URL.revokeObjectURL(a.href), 1000);
}
function buildMarkdown(){
  const days = store.days.filter(hasContent).sort((a,b)=>a.date.localeCompare(b.date));
  let md = "# Olive — journal export\n\n";
  if(!days.length) md += "No entries yet.\n";
  days.forEach(d=>{
    md += `## ${d.date}\n\n`;
    if(d.domains.length) md += `Domains: ${d.domains.map(x=>x+" +1").join(", ")}\n\n`;
    PROMPTS.forEach(([k,label])=>{ if(String(d.prompts[k]||"").trim()) md += `**${label}**\n${d.prompts[k]}\n\n`; });
    if(d.goalDirection) md += `Goal direction: ${d.goalDirection}\n\n`;
  });
  if(store.talks.length){
    md += "# Talks\n\n";
    store.talks.forEach(t=>{ md += `## ${t.sourceDate} (reps: ${t.reps||0})\n\n${[t.hook,t.moment,t.meaning,t.close].filter(Boolean).join("\n\n")}\n\n`; });
  }
  return md;
}
document.getElementById("exportMdBtn").addEventListener("click", ()=>{
  download("olive-journal.md", buildMarkdown(), "text/markdown");
});
document.getElementById("emailDraftBtn")?.addEventListener("click", async ()=>{
  download("olive-journal.md", buildMarkdown(), "text/markdown");
  const note = "Hi Muse, please create a Gmail draft to shawnlimsx94@gmail.com with my Olive journal Markdown export attached (file: olive-journal.md, just downloaded). Subject: Olive journal export. Do not send it, draft only.";
  try{ await navigator.clipboard.writeText(note); }catch(e){}
  const el = document.getElementById("emailDraftNote");
  if(el) el.textContent = "Markdown downloaded, and the draft note above was copied (if clipboard allowed). Paste it to Muse in chat and Muse will create a Gmail draft to shawnlimsx94@gmail.com — draft only, not sent. A static site cannot create that Gmail draft by itself.";
});
document.getElementById("exportJsonBtn").addEventListener("click", ()=>{
  download("olive-backup.json", JSON.stringify(store, null, 2), "application/json");
});
document.getElementById("importFile").addEventListener("change", async (e)=>{
  const f = e.target.files[0]; if(!f) return;
  try{
    const imp = JSON.parse(await f.text());
    if(!imp || imp.version!==1 || !Array.isArray(imp.days) || !Array.isArray(imp.talks)) throw new Error("bad format");
    let added=0, kept=0, replaced=0;
    imp.days.forEach(iday=>{
      if(!iday || !iday.date || !iday.id) return;
      const ex = store.days.find(x=>x.id===iday.id || x.date===iday.date);
      if(!ex){ store.days.push(iday); added++; }
      else if(String(iday.updatedAt||"") > String(ex.updatedAt||"")){ Object.assign(ex, iday); replaced++; }
      else kept++;
    });
    imp.talks.forEach(italk=>{
      if(!italk || !italk.id) return;
      const ex = store.talks.find(x=>x.id===italk.id);
      if(!ex){ store.talks.push(italk); added++; }
      else {
        const reps = Math.max(ex.reps||0, italk.reps||0);
        if(String(italk.updatedAt||"") > String(ex.updatedAt||"")) Object.assign(ex, italk);
        ex.reps = reps; replaced++;
      }
    });
    save(); renderJournal(); renderTimeline();
    document.getElementById("importNote").textContent = `Imported: ${added} new, ${replaced} updated to a newer version, ${kept} kept (your existing entry was newer). Practice reps were kept at the higher count.`;
  }catch(err){
    document.getElementById("importNote").textContent = "Import failed: that file does not look like an Olive v1 backup. Nothing was changed.";
  }
  e.target.value = "";
});

/* Init */
renderJournal(); updateTalkPreview(); loadTalkDraft(); setAvatarPose("listening");
document.getElementById("yearLabel").textContent = new Date().getFullYear();
