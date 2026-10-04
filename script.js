(() => {
"use strict";

const canvas=document.getElementById("heartCanvas");
const ctx=canvas.getContext("2d",{alpha:true});
const hint=document.getElementById("hint");
const letterWrap=document.getElementById("letterWrap");
const closeLetter=document.getElementById("closeLetter");
let letterOpened=false;

const HEART_COUNT=1050,FLOAT_COUNT=70,BURST_COUNT=115;
const BLUE_SHADES=["#2563eb","#3b82f6","#60a5fa","#93c5fd","#38bdf8","#7dd3fc","#bfdbfe"];
const heartParticles=[],floatParticles=[],burstParticles=[];
let width=0,height=0,dpr=1,rotation=0,heartbeat=0,beat=0,heartScale=1,flash=0,lastTime=performance.now();
const reducedMotion=window.matchMedia&&window.matchMedia("(prefers-reduced-motion: reduce)").matches;

function random(a,b){return Math.random()*(b-a)+a}
function pick(a){return a[(Math.random()*a.length)|0]}

function resize(){
 dpr=Math.min(window.devicePixelRatio||1,1.5);
 width=innerWidth;height=innerHeight;
 canvas.width=Math.floor(width*dpr);canvas.height=Math.floor(height*dpr);
 canvas.style.width=width+"px";canvas.style.height=height+"px";
 ctx.setTransform(dpr,0,0,dpr,0,0);
 createFloatParticles();
}

function makeHeartPoint(){
 const t=Math.random()*Math.PI*2,s=Math.sin(t),c=Math.cos(t);
 let x=16*s*s*s;
 let y=13*c-5*Math.cos(2*t)-2*Math.cos(3*t)-Math.cos(4*t);
 const fill=Math.sqrt(Math.random());
 x=x*fill+random(-.18,.18);y=y*fill+random(-.18,.18);
 return{x,y};
}

function createHeartParticles(){
 heartParticles.length=0;
 for(let i=0;i<HEART_COUNT;i++){
  const p=makeHeartPoint();
  heartParticles.push({x:p.x,y:p.y,z:random(-1,1),size:random(.45,1.55),alpha:random(.38,.92),color:pick(BLUE_SHADES),phase:random(0,Math.PI*2),twinkle:random(.7,2)});
 }
}

function createFloatParticles(){
 floatParticles.length=0;
 for(let i=0;i<FLOAT_COUNT;i++){
  floatParticles.push({x:random(0,width),y:random(0,height),size:random(.4,1.35),alpha:random(.15,.55),speed:random(.04,.22),phase:random(0,Math.PI*2),color:pick(BLUE_SHADES)});
 }
}

function spawnBurst(x,y,amount=1){
 const count=Math.floor(BURST_COUNT*amount);
 for(let i=0;i<count;i++){
  const angle=Math.random()*Math.PI*2,speed=random(.7,3.6)*amount;
  burstParticles.push({x,y,vx:Math.cos(angle)*speed,vy:Math.sin(angle)*speed,friction:random(.972,.99),gravity:random(.002,.009),life:0,maxLife:random(38,82),size:random(.55,1.7),alpha:random(.45,.95),color:pick(BLUE_SHADES)});
 }
}

function heartPosition(){
 const base=Math.min(width,height);
 return{cx:width*.5,cy:height*.50,scale:(base/31)*.88*heartScale};
}

function project(p){
 const angle=rotation+p.z*.28,cos=Math.cos(angle),sin=Math.sin(angle);
 const x3=p.x*cos+p.z*3.1*sin,z3=p.x*sin+p.z*3.1*cos;
 const perspective=1/(1+z3*.026),pos=heartPosition();
 return{x:pos.cx+x3*pos.scale*perspective,y:pos.cy-p.y*pos.scale*perspective,perspective};
}

function drawAtmosphere(){
 const pos=heartPosition();
 const glow=ctx.createRadialGradient(pos.cx,pos.cy,0,pos.cx,pos.cy,pos.scale*1.2);
 glow.addColorStop(0,"rgba(20,130,255,.10)");
 glow.addColorStop(.42,"rgba(20,90,255,.035)");
 glow.addColorStop(1,"rgba(0,0,0,0)");
 ctx.fillStyle=glow;ctx.fillRect(0,0,width,height);
 const floor=ctx.createRadialGradient(pos.cx,pos.cy+pos.scale*.54,0,pos.cx,pos.cy+pos.scale*.54,pos.scale*.72);
 floor.addColorStop(0,"rgba(56,189,248,.16)");
 floor.addColorStop(.35,"rgba(37,99,235,.055)");
 floor.addColorStop(1,"rgba(0,0,0,0)");
 ctx.fillStyle=floor;ctx.fillRect(0,pos.cy,width,pos.scale*.8);
}

function drawFloatParticles(time){
 ctx.save();
 for(const p of floatParticles){
  p.y-=p.speed;if(p.y<-4){p.y=height+4;p.x=random(0,width)}
  const twinkle=.65+Math.sin(time*.0018+p.phase)*.35;
  ctx.globalAlpha=p.alpha*twinkle;ctx.fillStyle=p.color;
  ctx.beginPath();ctx.arc(p.x,p.y,p.size,0,Math.PI*2);ctx.fill();
 }
 ctx.restore();
}

function drawHeart(time){
 ctx.save();ctx.globalCompositeOperation="lighter";
 for(const p of heartParticles){
  const q=project(p);
  const breathing=1+Math.sin(time*.0022+p.phase)*.018;
  const size=p.size*q.perspective*breathing*(1+beat*5);
  const alpha=p.alpha*(.78+Math.sin(time*.0025*p.twinkle+p.phase)*.22);
  ctx.globalAlpha=Math.max(.04,alpha);ctx.fillStyle=p.color;
  ctx.beginPath();ctx.arc(q.x,q.y,size,0,Math.PI*2);ctx.fill();
 }
 ctx.restore();
}

function drawGround(){
 const pos=heartPosition(),y=pos.cy+pos.scale*.54;
 ctx.save();ctx.globalCompositeOperation="lighter";ctx.globalAlpha=.18+beat*.5;
 ctx.strokeStyle="#38bdf8";ctx.lineWidth=1;
 ctx.beginPath();ctx.moveTo(pos.cx-pos.scale*.5,y);ctx.lineTo(pos.cx+pos.scale*.5,y);ctx.stroke();
 ctx.restore();
}

function drawBursts(){
 ctx.save();ctx.globalCompositeOperation="lighter";
 for(let i=burstParticles.length-1;i>=0;i--){
  const p=burstParticles[i];
  p.x+=p.vx;p.y+=p.vy;p.vx*=p.friction;p.vy*=p.friction;p.vy+=p.gravity;p.life++;
  const progress=p.life/p.maxLife;
  if(progress>=1){burstParticles.splice(i,1);continue}
  ctx.globalAlpha=p.alpha*(1-progress);ctx.fillStyle=p.color;
  ctx.beginPath();ctx.arc(p.x,p.y,p.size*(1-progress*.3),0,Math.PI*2);ctx.fill();
 }
 ctx.restore();
}

function tap(e){
 // Open the letter on any tap in the main scene. This is more reliable on
 // mobile screens than requiring a tap inside a small invisible heart hitbox.
 const r=canvas.getBoundingClientRect();
 const x=Math.max(0,Math.min(width,e.clientX-r.left));
 const y=Math.max(0,Math.min(height,e.clientY-r.top));
 spawnBurst(x,y,1.15);flash=1;heartScale=1.045;
 if(!letterOpened){
  letterOpened=true;
  if(hint){hint.style.opacity="0";setTimeout(()=>{hint.style.display="none"},500)}
  setTimeout(()=>{letterWrap.classList.add("open");letterWrap.setAttribute("aria-hidden","false")},220);
 }
}

function update(time){
 const dt=Math.min(32,time-lastTime);lastTime=time;
 if(!reducedMotion){
  rotation+=.00065*dt;
  heartbeat=(Math.sin(time*.00245)+1)*.5;
  beat=Math.pow(heartbeat,8)*.032+Math.pow(heartbeat,20)*.016;
  heartScale+=(1+beat-heartScale)*.16;
 }
 flash*=.91;
 ctx.clearRect(0,0,width,height);
 drawAtmosphere();drawFloatParticles(time);drawGround();drawHeart(time);drawBursts();
 if(flash>.01){
  const p=heartPosition(),g=ctx.createRadialGradient(p.cx,p.cy,0,p.cx,p.cy,p.scale);
  g.addColorStop(0,`rgba(220,248,255,${flash*.16})`);
  g.addColorStop(.35,`rgba(56,189,248,${flash*.07})`);
  g.addColorStop(1,"rgba(0,0,0,0)");
  ctx.fillStyle=g;ctx.fillRect(0,0,width,height);
 }
 requestAnimationFrame(update);
}

addEventListener("resize",resize,{passive:true});
canvas.addEventListener("pointerdown",tap,{passive:true});
closeLetter.addEventListener("click",()=>{letterWrap.classList.remove("open");letterWrap.setAttribute("aria-hidden","true");letterOpened=false;if(hint){hint.style.display="flex";hint.style.opacity="1"}});
createHeartParticles();resize();
setTimeout(()=>{const p=heartPosition();spawnBurst(p.cx,p.cy,.55)},450);
requestAnimationFrame(update);
})();