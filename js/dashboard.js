(async()=>{try{
const doc=shell("dashboard","Vue d'ensemble");
const ALL=await patientService.all(),P=ALL.filter(p=>p.status!=="archivée"),A=await appointmentService.list(),al=await alertService.list();
const today=new Date().toISOString().slice(0,10),avg=Math.round(P.reduce((s,p)=>s+p.adherence,0)/Math.max(P.length,1));
$("#hello").innerHTML=`<div class="welcome-copy"><h2>Bienvenue, ${doc.name}</h2><p>Une excellente journée ! <span class="welcome-heart">♥</span></p></div><div class="welcome-art"><i data-lucide="stethoscope"></i><span class="heart-pulse">♡</span><i data-lucide="sprout"></i></div>`;
$("#totalPatients").textContent=P.length;
$("#activeAppointments").textContent=A.filter(a=>a.date>=today).length;
$("#newRecords").textContent=P.filter(p=>p.createdAt&&((Date.now()-new Date(p.createdAt).getTime())<30*86400000)).length||Math.min(P.length,1);
$("#alertTotal").textContent=al.length;$("#alertCount").textContent=al.length?"!":"✓";
const countBy=(items,key,labels)=>labels.map(label=>items.filter(x=>key(x)===label).length);
const dateOf=x=>new Date((x.date||"")+"T12:00:00");
const periodData=(()=>{
 const now=new Date(),dayStart=new Date(now);dayStart.setDate(now.getDate()-6);
 const weekLabels=["Lun","Mar","Mer","Jeu","Ven","Sam","Dim"];
 const weekDates=Array.from({length:7},(_,i)=>{const d=new Date(dayStart);d.setDate(dayStart.getDate()+i);return d});
 const week=weekDates.map(d=>A.filter(x=>dateOf(x).toDateString()===d.toDateString()).length);
 const monthWeeks=[0,1,2,3].map(w=>A.filter(x=>{const d=dateOf(x);return d.getFullYear()===now.getFullYear()&&d.getMonth()===now.getMonth()&&Math.floor((d.getDate()-1)/7)===w}).length);
 const six=Array.from({length:6},(_,i)=>{const d=new Date(now.getFullYear(),now.getMonth()-5+i,1);return A.filter(x=>{const q=dateOf(x);return q.getFullYear()===d.getFullYear()&&q.getMonth()===d.getMonth()}).length});
 const year=Array.from({length:12},(_,i)=>A.filter(x=>{const d=dateOf(x);return d.getFullYear()===now.getFullYear()&&d.getMonth()===i}).length);
 const years=Array.from({length:5},(_,i)=>now.getFullYear()-4+i);
 return {
  "Semaine":{labels:weekDates.map(d=>weekLabels[(d.getDay()+6)%7]),values:week,highlight:6},
  "Mois":{labels:["S1","S2","S3","S4"],values:monthWeeks,highlight:Math.min(3,Math.floor((now.getDate()-1)/7))},
  "6 mois":{labels:Array.from({length:6},(_,i)=>new Date(now.getFullYear(),now.getMonth()-5+i,1).toLocaleDateString("fr-FR",{month:"short"})),values:six,highlight:5},
  "Année":{labels:["Jan","Fév","Mar","Avr","Mai","Juin","Juil","Août","Sept","Oct","Nov","Déc"],values:year,highlight:now.getMonth()},
  "Tout":{labels:years.map(String),values:years.map(y=>A.filter(x=>dateOf(x).getFullYear()===y).length),highlight:4}
 };
})();
const drawAnalytics=(key="Semaine")=>{const d=periodData[key]||periodData.Semaine;$("#analyticsBars").innerHTML=d.labels.map((m,i)=>`<div class="analytics-bar-item"><div class="bar-column ${i===d.highlight?"active":""}" style="height:${Math.max(32,d.values[i]*4.7)}px"><b>${d.values[i]}</b>${i===d.highlight?'<span class="bar-dot"></span>':""}</div><small>${m}</small></div>`).join("");};
const periodEls=[...document.querySelectorAll(".analytics-period span")];
periodEls.forEach(el=>{el.setAttribute("role","button");el.setAttribute("tabindex","0");const activate=()=>{periodEls.forEach(x=>x.classList.remove("selected"));el.classList.add("selected");drawAnalytics(el.textContent.trim().replace(/\\s+/g," "));};el.addEventListener("click",activate);el.addEventListener("keydown",e=>{if(e.key==="Enter"||e.key===" "){e.preventDefault();activate();}});});
drawAnalytics("Semaine");
const filterBtn=document.querySelector(".analytics-filter");if(filterBtn){const ranges=["Cette semaine","Ce mois-ci","6 derniers mois","Cette année","Toutes les données"];const map=["Semaine","Mois","6 mois","Année","Tout"];let rangeIndex=1;filterBtn.setAttribute("aria-label","Changer la période des statistiques");filterBtn.onclick=()=>{rangeIndex=(rangeIndex+1)%ranges.length;filterBtn.innerHTML=`${ranges[rangeIndex]} <i data-lucide="chevron-down"></i>`;periodEls.forEach((el,i)=>el.classList.toggle("selected",i===map.indexOf(map[rangeIndex])));drawAnalytics(map[rangeIndex]);window.lucide&&lucide.createIcons();};}
let calendarCursor=new Date();const weekdays=["Lun","Mar","Mer","Jeu","Ven","Sam","Dim"];
const renderCalendar=()=>{const calDate=new Date(calendarCursor.getFullYear(),calendarCursor.getMonth(),1),monthName=calDate.toLocaleDateString("fr-FR",{month:"long",year:"numeric"}),first=calDate.getDay(),days=new Date(calDate.getFullYear(),calDate.getMonth()+1,0).getDate();let calCells="";const offset=(first+6)%7;for(let i=0;i<offset;i++)calCells+='<span class="cal-empty"></span>';for(let d=1;d<=days;d++){const now=new Date(),isToday=d===now.getDate()&&calDate.getMonth()===now.getMonth()&&calDate.getFullYear()===now.getFullYear();calCells+=`<span class="cal-day ${isToday?"today":""}" tabindex="0" role="button" aria-label="${d} ${monthName}">${d}</span>`;}const trailing=(7-(offset+days)%7)%7;for(let d=1;d<=trailing;d++)calCells+=`<span class="cal-day faded">${d}</span>`;$("#miniCalendar").innerHTML=`<div class="calendar-month">${monthName}</div><div class="calendar-week">${weekdays.map(w=>`<small>${w}</small>`).join("")}</div><div class="calendar-days">${calCells}</div>`;};
renderCalendar();
const calArrows=[...document.querySelectorAll(".calendar-nav i")];calArrows.forEach((arrow,i)=>{arrow.style.cursor="pointer";arrow.setAttribute("role","button");arrow.setAttribute("tabindex","0");arrow.setAttribute("aria-label",i===0?"Mois précédent":"Mois suivant");const move=()=>{calendarCursor.setMonth(calendarCursor.getMonth()+(i===0?-1:1));renderCalendar();};arrow.addEventListener("click",move);arrow.addEventListener("keydown",e=>{if(e.key==="Enter"||e.key===" "){e.preventDefault();move();}});});
const name=id=>ALL.find(p=>p.id==id)?.name||"—";
$("#appts").innerHTML=A.filter(a=>a.date>=today).slice(0,5).map(a=>`<li><div class="appt-avatar">${avImg(name(a.patientId))}</div><div class="appt-person"><b>${name(a.patientId)}</b><div class="muted"><i data-lucide="clock"></i> ${a.time} · ${a.type}</div></div><span class="appt-arrow"><i data-lucide="chevron-right"></i></span></li>`).join("");
$("#alerts").innerHTML=al.slice(0,3).map(a=>`<li><span class="alert-patient-avatar">${avImg(name(a.p))}</span><div class="alert-copy"><b>${name(a.p)}</b><div class="muted">${a.t}</div></div><a class="btn alert-examine" href="pages/patient-details.html?id=${a.p}">Examiner <i data-lucide="arrow-right"></i></a></li>`).join("");
const symptomTotals={};ALL.forEach(p=>(p.symptoms||[]).forEach(x=>symptomTotals[x]=(symptomTotals[x]||0)+1));const symptomEntries=Object.entries(symptomTotals).sort((a,b)=>b[1]-a[1]).slice(0,4);const symptomLabels=symptomEntries.map(x=>x[0]),symptomValues=symptomEntries.map(x=>x[1]);const symptomSum=symptomValues.reduce((a,b)=>a+b,0)||1;$("#symptomLegend")&&($("#symptomLegend").innerHTML=symptomEntries.map((x,i)=>`<li><i class="legend-dot d${i+1}"></i> ${x[0]} <b>${Math.round(x[1]/symptomSum*100)}%</b></li>`).join("")||'<li class="muted">Aucun symptôme enregistré</li>');if(typeof Chart!=="undefined"){const ctx=$("#c2");new Chart(ctx,{type:"doughnut",data:{labels:symptomLabels,datasets:[{data:symptomValues,backgroundColor:["#7900B8","#E21B91","#B65AF2","#E9B8F4"],borderWidth:0,hoverOffset:5}]},options:{responsive:true,maintainAspectRatio:false,cutout:"62%",plugins:{legend:{display:false},tooltip:{enabled:true}}}})}
window.lucide&&lucide.createIcons();
}catch(e){console.error(e);const c=document.getElementById("content");if(c)c.hidden=false}})();