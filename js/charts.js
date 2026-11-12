const css=v=>getComputedStyle(document.documentElement).getPropertyValue(v).trim();
function chart(el,type,data,opts={}){if(typeof Chart==="undefined")return null;Chart.defaults.font.family="Manrope";Chart.defaults.color=css("--muted");
 return new Chart(el,{type,data,options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{position:"bottom"}},scales:type=="doughnut"?{}:{x:{grid:{display:false}},y:{grid:{color:css("--border")}}},...opts}})}
const palette=()=>[document.documentElement.dataset.theme=="dark"?"#B77AD0":css("--plum"),css("--magenta"),css("--pink"),"#9B5DB3","#C9A0DC","#E7C6EF"];
