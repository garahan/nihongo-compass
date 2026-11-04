const app = document.querySelector('#app');
const key = 'nihongo-compass-result-v1';
const min = 12;
const max = bank.length;
let shownAt = performance.now();
let timingInterrupted = false;
document.addEventListener('visibilitychange', () => {
  if (document.hidden) timingInterrupted = true;
});
let attempts = [];
let item;
let options;
let graded = false;
let latest;
function save() {
  latest = attempts.slice();
  try { localStorage.setItem(key,JSON.stringify(latest)); } catch {}
}
try {
  const saved = JSON.parse(localStorage.getItem(key));
  if (Array.isArray(saved) && saved.length > 0 && saved.length <= max &&
      saved.every(entry => bank[entry.id] && [null,0,1,2,3].includes(entry.choice)) &&
      new Set(saved.map(entry => entry.id)).size === saved.length) latest = saved;
} catch {}
const tips = [
  ['Build a word deck from full sentences. Recall the meaning before revealing the gloss.','Study vocabulary'],
  ['Read each target word aloud in a sentence. Compare readings of the same kanji across different words.','Study kanji readings'],
  ['Practice pairs of sentences where changing one particle changes the meaning. Identify what each particle marks.','Review particles'],
  ['Conjugate five verbs in each target form, then use each form in a short sentence.','Review conjugation'],
  ['Pick three patterns. Compare their meanings and write one original example for each.','Study sentence patterns'],
  ['Review expressions in context. Say when you would use each one and with whom.','Practice expressions']
];
const origin = 'https://www.nihongotojapan.com/en';
const links = ['vocab','vocab','grammar','conjugation','grammar','grammar'];
const tally = list => ({n:list.length, right:list.filter(entry=>entry.choice===0).length});

function shuffle(values) {
  for(let i=values.length-1;i>0;i--){
    const j=Math.floor(Math.random()*(i+1));
    [values[i],values[j]]=[values[j],values[i]];
  }
  return values;
}

function next() {
  item = chooseQuestion(attempts);
  options = shuffle([0,1,2,3]);
  graded = false;
  shownAt = performance.now();
  timingInterrupted = document.hidden;
  showQuestion();
}

function focusHeading() {
  app.querySelector('[tabindex="-1"]')?.focus({preventScroll:true});
  window.scrollTo(0,0);
}

function welcome() {
  app.replaceChildren(document.querySelector('#welcome').content.cloneNode(true));
  app.querySelector('[data-action=latest]').hidden = !latest || latest.length < min;
  if (latest?.length && latest.length < max) {
    const start = app.querySelector('[data-action=start]');
    start.textContent = 'Continue test';
    start.dataset.action = 'resume';
  } else if (latest?.length === max) {
    const start = app.querySelector('[data-action=start]');
    start.textContent = 'Start over';
    start.dataset.action = 'restart';
  }
  focusHeading();
}

function showQuestion() {
  const entry = graded ? attempts.at(-1) : null;
  const number = attempts.length + (graded ? 0 : 1);
  const answerText = entry?.choice === null ? 'Skipped' : entry?.choice === 0 ? 'Correct' : 'Incorrect';
  app.innerHTML = `<section class="quiz panel"><div class="spread"><span class="eyebrow">Question ${number} · ${skills[item.skill]}</span><button class="secondary" data-action="quit">Exit</button></div>
  <h1 tabindex="-1" class="jp">${item.prompt}</h1>
  <div class="options">${options.map((choice,index)=>`<button class="option ${graded && choice===0?'right':graded && choice===entry.choice?'wrong':''}" data-choice="${choice}" ${graded?'disabled':''}>${index+1}. ${item.options[choice]}${graded && choice===0?' ✓':''}</button>`).join('')}</div>
  ${graded?`<p class="feedback" role="status" tabindex="-1"><strong>${answerText}.</strong> ${item.why}</p>`:''}
  <div class="actions">${graded?(attempts.length<max?'<button data-action="next">Next question →</button>':''):'<button class="secondary" data-action="skip">Skip question</button>'}
  ${attempts.length>=min?`<button class="${attempts.length===max?'':'secondary'}" data-action="finish">View results</button>`:''}</div>
  <small>${attempts.length} answered${attempts.length<min ? ` · First estimate after ${min}` : ''}</small></section>`;
  if (graded) app.querySelector('.feedback').focus();
  else focusHeading();
}

function grade(choice) {
  if (graded || !item || attempts.length >= max) return;
  const seconds = (performance.now()-shownAt)/1000;
  attempts.push({id:item.id,choice,seconds:choice===null || timingInterrupted || seconds>90 ? null : seconds});
  save();
  graded = true;
  showQuestion();
}

function radar(data) {
  const point = (i,r) => [180+r*Math.sin(i*Math.PI/3),130-r*Math.cos(i*Math.PI/3)];
  const ring = r => data.map((_,i)=>point(i,r).join(',')).join(' ');
  const axes = data.map(({n,readiness},i)=>{
    const [x,y]=point(i,77);
    const [tx,ty]=point(i,105);
    const [dx,dy]=point(i,77*readiness);
    return `<line x1="180" y1="130" x2="${x}" y2="${y}" stroke="#cddbd0"/><text x="${tx}" y="${ty+4}" text-anchor="middle" font-size="11" fill="#29493e">${skills[i]}</text>${n>=2?`<circle cx="${dx}" cy="${dy}" r="5" fill="#164e3e"/>`:''}`;
  }).join('');
  const measured = data.every(row=>row.n>=2);
  return `<svg viewBox="0 0 360 260" role="img" aria-label="Radar chart of estimated skill readiness at your working level.">${[19,38,58,77].map(r=>`<polygon points="${ring(r)}" fill="none" stroke="#cddbd0"/>`).join('')}${measured?`<polygon points="${data.map(({readiness},i)=>point(i,77*readiness).join(',')).join(' ')}" fill="#acd5af" fill-opacity=".65" stroke="#52836c"/>`:''}${axes}</svg>`;
}

function bar(name,{n,right}) {
  return `<div class="bar"><strong>${name}</strong><span>${n?`${right}/${n}`:'Untested'}</span>${n?`<progress aria-label="${name} accuracy" max="${n}" value="${right}"></progress>`:''}</div>`;
}

function report() {
  const state = assess(attempts);
  const {overall,reference,placement,practice,skill} = state;
  const total = tally(placement);
  const alternate = bands.filter(band=>band!==overall.band)
    .sort((a,b)=>overall.weights[b]-overall.weights[a])[0];
  const priority = studyPriority(state);
  const plan = priority?.concept ? concepts[priority.concept] : priority ? {
    title:skills[priority.skill],lesson:tips[priority.skill][0],route:links[priority.skill]
  } : null;
  const drill = origin+'/challenge/'+label(reference).toLowerCase();
  const missed = attempts.filter(entry=>entry.choice!==0);
  const evidence = skill.map(({n,readiness},id)=>`<div class="bar"><strong>${skills[id]}</strong><span>${n>=2?`${Math.round(readiness*100)}% · ${n} answers`:'Still checking'}</span>${n>=2?`<progress aria-label="${skills[id]} readiness" max="1" value="${readiness}"></progress>`:''}</div>`).join('');
  app.innerHTML = `<section class="panel reporthero"><p class="eyebrow">Your placement · ${attempts.length} answers</p><h1 tabindex="-1">Likely ${label(overall.band)}</h1>
  <p>${total.right}/${total.n} placement answers correct${overall.weights[overall.band]<.75?` · Also plausible: ${label(alternate)}`:''}</p>
  <p>Provisional language-knowledge estimate.${practice.length?` ${practice.length} follow-up answers tracked separately as practice.`:''}</p>
  <div class="actions">${attempts.length<max?'<button data-action="continue">Continue test</button>':'<span>All available questions answered.</span>'}<button class="secondary" data-action="restart">Start over</button></div></section>
  <div class="reportgrid"><section class="panel"><h2>Skill map</h2>${radar(skill)}${evidence}<small>Estimated readiness at ${label(reference)}, based on question difficulty and answers.</small></section>
  <section class="panel"><h2>Evidence by level</h2>${bands.slice(1).map(band=>bar(label(band),tally(placement.filter(entry=>difficulty(bank[entry.id])===band)))).join('')}</section></div>
  <section class="panel"><h2>Study next</h2>
  ${plan?`<h3>${plan.title}</h3><p>${priority.repeated?'You missed this concept again in practice. ':''}${plan.lesson}</p><p><a href="${origin}/${plan.route}">Open lesson library →</a></p>`:'<p>Continue the test to identify a specific study priority.</p>'}
  ${overall.band===0?`<p><a href="${origin}/materials">Open beginner lessons →</a></p>`:''}<a href="${drill}">Open ${label(reference)} drills →</a><small>Resources from Nihongo to Japan.</small></section>
  <section class="panel" style="margin-top:14px"><h2>Review missed questions</h2>${missed.length?missed.map(entry=>{
    const q=bank[entry.id];
    return `<details><summary>${practice.includes(entry)?'Practice · ':''}N${q.level} · ${q.prompt}</summary><p>${entry.choice===null?'Skipped':'You chose: '+q.options[entry.choice]}<br><strong>Answer: ${q.options[0]}</strong><br>${q.why}</p></details>`;
  }).join(''):'<p>All attempted questions were correct.</p>'}<button data-action="home" class="secondary">Back to start</button></section>`;
  focusHeading();
}

app.addEventListener('click', event=>{
  const button = event.target.closest('button');
  if (!button || button.disabled) return;
  if (button.dataset.choice !== undefined) grade(Number(button.dataset.choice));
  switch(button.dataset.action){
    case 'start': attempts=[]; next(); break;
    case 'resume': attempts=latest.slice(); next(); break;
    case 'continue': if(attempts.length<max) next(); break;
    case 'restart':
      if(confirm('Start a new test? This clears the current answers.')){
        attempts=[];
        save();
        next();
      }
      break;
    case 'latest': if(latest){attempts=latest.slice(); report();} break;
    case 'skip': grade(null); break;
    case 'next': if(graded && attempts.length<max) next(); break;
    case 'finish':
      if(attempts.length<min) break;
      report();
      break;
    case 'quit': welcome(); break;
    case 'home': welcome(); break;
  }
});
welcome();
