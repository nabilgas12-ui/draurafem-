// Données synthétiques uniquement — aucune personne réelle.
let s=7;const rnd=()=>(s=(s*16807)%2147483647)/2147483647;
const N=["Amina Benali","Lydia Haddad","Sarah Mansouri","Nesrine Kaci","Imane Boudiaf","Yasmine Cherif","Meriem Saidi","Khadija Belkacem","Ines Toumi","Rania Hamidi","Sonia Ferhat","Amel Zerrouki","Hiba Slimani","Nadia Remili","Celia Amrani"];
const SYMPTOMS=["Acné","Chute de cheveux","Vertiges","Fatigue","Variations d'humeur","Cycles irréguliers"];
const ST=["active","active","active","suivi","attention"];
const iso=d=>d.toISOString().slice(0,10);const ago=n=>{const d=new Date();d.setDate(d.getDate()-n);return d};
const patients=N.map((name,i)=>{const w0=62+Math.round(rnd()*28);
return{id:"p"+(i+1),name,email:name.toLowerCase().replace(/ /g,".")+"@exemple.demo",phone:"055"+(5100000+i*7331),
birth:iso(ago(365*(20+Math.round(rnd()*20)))),diagnosis:iso(ago(60+Math.round(rnd()*900))),created:iso(ago(Math.round(rnd()*300))),
status:i==14?"archivée":ST[Math.floor(rnd()*5)],height:155+Math.round(rnd()*20),history:"Antécédents familiaux de surpoids.",notes:[],
symptoms:SYMPTOMS.filter(()=>rnd()>.55),adherence:45+Math.round(rnd()*52),lastActivity:iso(ago(Math.round(rnd()*9))),
weights:Array.from({length:6},(_,m)=>({kg:+(w0+(m-5)*.6*(rnd()-.35)).toFixed(1)})),cycleDays:26+Math.round(rnd()*18)}});
const appointments=Array.from({length:10},(_,i)=>({id:"a"+(i+1),patientId:"p"+(i+1),date:iso(ago(i<4?0:-(i-3))),time:`${9+i%8}:${i%2?"30":"00"}`,type:["Consultation de suivi","Première consultation","Bilan d'observance"][i%3],status:["Confirmé","En attente","Confirmé","Terminé"][i%4]}));
const alerts=[{t:"Observance inférieure à 50 % depuis 2 semaines",p:"p5"},{t:"Aucune saisie de cycle depuis 45 jours",p:"p3"},{t:"Prise de poids de +3 kg en 30 jours",p:"p8"}];
const doctor={name:"Dr. Salma Benyoucef",email:"dr.salma@aurafem.demo",specialty:"Endocrinologie gynécologique",clinic:"Cabinet Les Jasmins"};
