const app = document.querySelector('#app');
const key = 'nihongo-compass-result-v1';
const min = 12;
const max = bank.length;
let shownAt = performance.now();
let timingInterrupted = false;
document.addEventListener('visibilitychange', () => {
  if (document.hidden) timingInterrupted = true;
});
const bands = [0,1,2,3,4,5];
const label = band => band === 0 ? 'Below N5' : 'N' + (6-band);
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
const difficulty = question => 6-question.level;
const tally = list => ({n:list.length, right:list.filter(entry=>entry.choice===0).length});
const skillAttempts = skill => attempts.filter(entry=>bank[entry.id].skill===skill);
const levelAttempts = band => attempts.filter(entry=>difficulty(bank[entry.id])===band);

function successProbability(band, level) {
  return .25 + .7 / (1 + Math.exp((level-band)*1.8));
}

function estimate() {
  const logScores = bands.map(band => attempts.reduce((score, entry) => {
    const p = successProbability(band, difficulty(bank[entry.id]));
    return score + Math.log(entry.choice === 0 ? p : 1-p);
  }, 0));
  const highest = Math.max(...logScores);
  const weights = logScores.map(score=>Math.exp(score-highest));
  const total = weights.reduce((sum,w)=>sum+w,0);
  return {band:logScores.indexOf(highest), weights:weights.map(w=>w/total)};
}

function shuffle(values) {
  for(let i=values.length-1;i>0;i--){
    const j=Math.floor(Math.random()*(i+1));
    [values[i],values[j]]=[values[j],values[i]];
  }
  return values;
}

function next() {
  const seen = new Set(attempts.map(entry=>entry.id));
  const eligible = shuffle(bank.filter(question=>!seen.has(question.id)));
  const result = estimate();
  const last = attempts.at(-1);
  const previous = last ? difficulty(bank[last.id]) : 3;
  const history = attempts.slice(-8);
  const recentTimes = history.slice(0,-1).filter(entry=>entry.seconds != null)
    .map(entry=>entry.seconds).sort((a,b)=>a-b);
  const median = recentTimes[Math.floor(recentTimes.length/2)];
  const hesitant = last?.choice===0 && recentTimes.length>=3 && last.seconds > Math.max(12,median*1.7);
  const recent = attempts.slice(-3);
  const streak = recent.length === 3 && recent.every(entry=>entry.choice===0);
  const quickPair = recentTimes.length>=3 && recent.length===3 &&
    recent.slice(-2).every(entry=>entry.choice===0 && entry.seconds>=1 && entry.seconds<median*.75);
  const misses = recent.filter(entry=>entry.choice!==0).length;
  const target = streak ? Math.max(result.band,previous+1) :
    misses>=2 ? Math.min(result.band,previous-1) : result.band;
  const bounded = Math.max(1,previous-1,Math.min(5,previous+1,target));
  const probeSkill = last && (last.choice!==0 || hesitant) ? bank[last.id].skill : -1;
  const coverage = skills.map((_,skill)=>skillAttempts(skill).length);
  const information = [1,2,3,4,5].map(level=>{
    const p = bands.map(band=>successProbability(band,level));
    const mean = p.reduce((sum,value,band)=>sum+value*result.weights[band],0);
    return p.reduce((sum,value,band)=>sum+(value-mean)**2*result.weights[band],0) /
      (mean*(1-mean));
  });
  const score = question=>{
    const level = difficulty(question);
    const skill = question.skill;
    if (attempts.length<2) return -Math.abs(level-3)-.08*coverage[skill];
    const justProbed = history.slice(-2).every(entry=>bank[entry.id].skill===skill);
    const probe = skill===probeSkill && !justProbed && level<=previous ? .36 : 0;
    const pace = quickPair && level===previous+1 ? .18 : 0;
    return 2*information[level-1] - .48*Math.abs(level-bounded) +
      .32/(1+coverage[skill]) + probe + pace;
  };
  eligible.sort((a,b)=>score(b)-score(a));
  item = eligible[0];
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
  const axes = data.map(({n,right},i)=>{
    const [x,y]=point(i,77);
    const [tx,ty]=point(i,105);
    const [dx,dy]=point(i,77*(n?right/n:0));
    return `<line x1="180" y1="130" x2="${x}" y2="${y}" stroke="#cddbd0"/><text x="${tx}" y="${ty+4}" text-anchor="middle" font-size="11" fill="#29493e">${skills[i]}</text>${n?`<circle cx="${dx}" cy="${dy}" r="5" fill="#164e3e"/>`:''}`;
  }).join('');
  const measured = data.every(row=>row.n);
  return `<svg viewBox="0 0 360 260" role="img" aria-label="Radar chart of observed accuracy by skill. Exact counts follow.">${[19,38,58,77].map(r=>`<polygon points="${ring(r)}" fill="none" stroke="#cddbd0"/>`).join('')}${measured?`<polygon points="${data.map(({n,right},i)=>point(i,77*right/n).join(',')).join(' ')}" fill="#acd5af" fill-opacity=".65" stroke="#52836c"/>`:''}${axes}</svg>`;
}

function bar(name,{n,right}) {
  return `<div class="bar"><strong>${name}</strong><span>${n?`${right}/${n}`:'Untested'}</span>${n?`<progress aria-label="${name} accuracy" max="${n}" value="${right}"></progress>`:''}</div>`;
}

function report() {
  const result = estimate();
  const chance = result.weights[result.band];
  const counts = skills.map((_,skill)=>tally(skillAttempts(skill)));
  const total = tally(attempts);
  const missed = attempts.filter(entry=>entry.choice!==0);
  const priorities = counts.map(({n,right},skill)=>({n,misses:n-right,skill}))
    .filter(row=>row.misses>0)
    .sort((a,b)=>(b.misses/(b.n+2))-(a.misses/(a.n+2))).slice(0,3);
  const level = Math.max(1,result.band);
  const drill = origin+'/challenge/'+label(level).toLowerCase();
  const nextBand = result.weights.map((weight,band)=>({weight,band})).filter(row=>row.band!==result.band)
    .sort((a,b)=>b.weight-a.weight)[0].band;
  app.innerHTML = `<section class="panel reporthero"><p class="eyebrow">Your placement · ${total.n} answers</p><h1 tabindex="-1">${label(result.band)}</h1>
  <p>Estimated language-knowledge level · ${total.right} correct out of ${total.n}${chance<.75?` · Nearby estimate: ${label(nextBand)}`:''}</p>
  <p>Provisional estimate for language knowledge.</p><div class="actions">${attempts.length<max?'<button data-action="continue">Continue test</button>':'<span>All available questions answered.</span>'}<button class="secondary" data-action="restart">Start over</button></div></section>
  <div class="reportgrid"><section class="panel"><h2>Skill map</h2>${radar(counts)}${counts.map((row,i)=>bar(skills[i],row)).join('')}<small>These are observed scores. Question difficulty and small samples affect each result.</small></section>
  <section class="panel"><h2>Evidence by level</h2>${[1,2,3,4,5].map(band=>bar(label(band),tally(levelAttempts(band)))).join('')}<small>Adaptive questions are unevenly distributed across levels.</small></section></div>
  <section class="panel"><p class="eyebrow">Your next step</p><h2>Study plan</h2><p>${result.band===0?'Start with foundational Japanese, then try N5 exercises.':`Begin with ${label(level)} practice. Revisit the skills below first.`}</p>
  <a href="${result.band===0?origin+'/materials':drill}">${result.band===0?'Open beginner lessons':'Open '+label(level)+' drills'} →</a>
  <div class="grid" style="margin-top:18px">${priorities.map(({skill,n,misses})=>`<article class="tile"><span class="eyebrow">${misses} missed / ${n} tried</span><h3>${skills[skill]}</h3><p>${tips[skill][0]}</p><a href="${origin}/${links[skill]}">${tips[skill][1]} →</a></article>`).join('')}</div>
  ${priorities.length?'':'<p>Try a harder practice set as you become comfortable at this level.</p>'}<small>Study links open resources from Nihongo to Japan.</small></section>
  <section class="panel" style="margin-top:14px"><h2>Review missed questions</h2>${missed.length?missed.map(entry=>{
    const q=bank[entry.id];
    return `<details><summary>N${q.level} · ${q.prompt}</summary><p>${entry.choice===null?'Skipped':'You chose: '+q.options[entry.choice]}<br><strong>Answer: ${q.options[0]}</strong><br>${q.why}</p></details>`;
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
