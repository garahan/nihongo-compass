const app = document.querySelector('#app');
const stage = document.querySelector('#stage');
const transferKey = 'nihongo-compass-transfer-v1';
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
const sessionStore = createSessionStore({
  getItem: key=>localStorage.getItem(key),
  setItem: (key,value)=>localStorage.setItem(key,value)
},bank);
let savedSession = sessionStore.load();
let saveNotice = '';
let followup;
let studyPlan;
const exposures = new Set(savedSession.attempts.map(entry=>entry.id));
if (savedSession.active) exposures.add(savedSession.active.id);
try {
  const stored = JSON.parse(localStorage.getItem(studyPlanKey));
  if (validStudyPlan(stored)) studyPlan = stored;
  const history = JSON.parse(localStorage.getItem(exposureKey));
  if (Array.isArray(history)) for (const id of history) {
    if (Number.isInteger(id) && bank[id]) exposures.add(id);
  }
} catch {}

function rememberExposure(id) {
  if (exposures.has(id)) return;
  exposures.add(id);
  try { localStorage.setItem(exposureKey,JSON.stringify([...exposures])); } catch {}
}

function saveStudyPlan(plan) {
  studyPlan = plan;
  try { localStorage.setItem(studyPlanKey,JSON.stringify(plan)); } catch {}
}
try {
  const saved = JSON.parse(localStorage.getItem(transferKey));
  if (validTransfer(saved)) followup = saved;
} catch {}

function canContinue(list = attempts) {
  const seen = new Set(list.map(entry=>entry.id));
  return bank.some(q=>availableForPlacement(q) && !seen.has(q.id) && !studyPlan?.itemIds.includes(q.id));
}

function saveFollowup(record) {
  followup = record;
  try { localStorage.setItem(transferKey,JSON.stringify(record)); } catch {}
}
function persist() {
  const active = item ? {id:item.id,options:options.slice(),graded} : null;
  const {status,session} = sessionStore.save(attempts,active);
  savedSession = session;
  saveNotice = status==='temporary' ? 'Progress is available in this tab. Browser storage is unavailable.' : '';
  if (status==='conflict') {
    saveNotice = 'This test was updated in another tab. Continue from the latest saved question.';
    welcome();
    return false;
  }
  return true;
}

function restoreQuestion(advance) {
  attempts = savedSession.attempts.slice();
  const active = savedSession.active;
  if (!active || (advance && active.graded) ||
      (!active.graded && !availableForPlacement(bank[active.id]))) return next();
  item = bank[active.id];
  options = active.options.slice();
  graded = active.graded;
  shownAt = performance.now();
  timingInterrupted = true;
  showQuestion();
}

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
  item = chooseQuestion(attempts,Math.random,new Set(studyPlan?.itemIds));
  if (!item) return report();
  options = shuffle([0,1,2,3]);
  graded = false;
  shownAt = performance.now();
  timingInterrupted = document.hidden;
  if (persist()) {
    rememberExposure(item.id);
    showQuestion();
  }
}

function focusHeading() {
  app.querySelector('[tabindex="-1"]')?.focus({preventScroll:true});
  window.scrollTo(0,0);
}

function welcome() {
  stage.textContent = 'Japanese placement';
  const latest = savedSession.attempts;
  app.replaceChildren(document.querySelector('#welcome').content.cloneNode(true));
  app.querySelector('[data-action=latest]').hidden = !latest || latest.length < min;
  if (latest?.length) app.querySelector('[data-progress]').textContent =
    `${latest.length} answers saved on this device`;
  app.querySelector('[data-action=transfer]').hidden = !followup;
  const planButton = app.querySelector('[data-action=study-plan]');
  const currentPlanStage = planStage(studyPlan,Date.now());
  const prioritizePlan = ['review','practice','ready'].includes(currentPlanStage);
  planButton.hidden = !studyPlan;
  planButton.classList.toggle('secondary',!prioritizePlan);
  app.querySelector('[data-action=start]').classList.toggle('secondary',prioritizePlan);
  planButton.textContent = ({
    review:'Continue review',practice:'Continue practice',waiting:'View study plan',
    ready:'Check again',complete:'View study progress'
  })[currentPlanStage]??'Open study plan';
  if (saveNotice) app.querySelector('[data-progress]').textContent = saveNotice;
  if ((savedSession.active && !savedSession.active.graded) || (latest.length && canContinue(latest))) {
    const start = app.querySelector('[data-action=start]');
    start.textContent = 'Continue test';
    start.dataset.action = 'resume';
  } else if (latest?.length) {
    const start = app.querySelector('[data-action=start]');
    start.textContent = 'Start over';
    start.dataset.action = 'restart';
  }
  focusHeading();
}

function showQuestion() {
  stage.textContent = 'Assessment';
  const entry = graded ? attempts.at(-1) : null;
  const number = attempts.length + (graded ? 0 : 1);
  const answerText = entry?.choice === null ? 'Skipped' : entry?.choice === 0 ? 'Correct' : 'Incorrect';
  const translated = item.prompt.match(/^(.+?)\s*\(([^()]*)\)$/);
  const prompt = translated
    ? `<span lang="ja">${translated[1]}</span><span class="prompt-translation">${translated[2]}</span>`
    : item.prompt;
  app.innerHTML = `<section class="quiz panel" aria-labelledby="question"><div class="spread"><span class="eyebrow">Question ${number} · ${skills[item.skill]}</span><button class="quiet" data-action="quit">Back to start</button></div>
  <div class="milestone"><small>${attempts.length<min ? `${attempts.length} of ${min} answers for first results` : `${attempts.length} answers saved`}</small>
  ${attempts.length<min ? `<progress aria-label="Progress toward first results" value="${attempts.length}" max="${min}"></progress>` : ''}</div>
  <h1 tabindex="-1" id="question" class="jp">${prompt}</h1>
  <div class="options">${options.map((choice,index)=>`<button class="option ${graded && choice===0?'right':graded && choice===entry.choice?'wrong':''}" data-choice="${choice}" ${graded?'disabled':'aria-keyshortcuts="Alt+'+(index+1)+'"'}><span class="option-key" aria-hidden="true">${index+1}</span><span class="option-text">${item.options[choice]}</span>${graded && choice===0?'<span class="option-mark">Correct</span>':graded && choice===entry.choice?'<span class="option-mark">Your answer</span>':''}</button>`).join('')}</div>
  ${graded?`<p class="feedback" data-outcome="${answerText}" role="status" tabindex="-1">${item.practiceOnly?'This question was moved to practice after review. It does not count toward placement.':`<strong>${answerText}.</strong> ${item.why}`}</p>`:''}
  <div class="actions">${graded?(canContinue()?'<button data-action="next">Next question →</button>':''):'<button class="secondary" data-action="skip">Skip question</button>'}
  ${attempts.length>=min?`<button class="${canContinue()?'secondary':''}" data-action="finish">View results</button>`:''}</div>
  ${graded?'':'<small class="keyboard-hint">Keyboard shortcut: Alt / Option + 1–4</small>'}
  ${saveNotice?`<small role="status">${saveNotice}</small>`:''}</section>`;
  if (graded) app.querySelector('.feedback').focus();
  else focusHeading();
}

function grade(choice) {
  if (graded || !item || attempts.length >= max) return;
  const seconds = (performance.now()-shownAt)/1000;
  attempts.push({id:item.id,choice,seconds:choice===null || timingInterrupted || seconds>90 ? null : seconds});
  graded = true;
  if (persist()) showQuestion();
}

function radar(data) {
  const point = (i,r) => [180+r*Math.sin(i*Math.PI/3),130-r*Math.cos(i*Math.PI/3)];
  const ring = r => data.map((_,i)=>point(i,r).join(',')).join(' ');
  const axes = data.map(({n,readiness},i)=>{
    const [x,y]=point(i,77);
    const [tx,ty]=point(i,105);
    const [dx,dy]=point(i,77*readiness);
    return `<line x1="180" y1="130" x2="${x}" y2="${y}" stroke="#d5ddef"/><text x="${tx}" y="${ty+4}" text-anchor="middle" font-size="11" fill="#535d73">${skills[i]}</text>${n>=2?`<circle cx="${dx}" cy="${dy}" r="5" fill="#304ba4"/>`:''}`;
  }).join('');
  const measured = data.every(row=>row.n>=2);
  return `<svg viewBox="0 0 360 260" role="img" aria-label="Radar chart of estimated skill readiness at your working level.">${[19,38,58,77].map(r=>`<polygon points="${ring(r)}" fill="none" stroke="#d5ddef"/>`).join('')}${measured?`<polygon points="${data.map(({readiness},i)=>point(i,77*readiness).join(',')).join(' ')}" fill="#c4d0fa" fill-opacity=".65" stroke="#647cbe"/>`:''}${axes}</svg>`;
}

function bar(name,{n,right}) {
  return `<div class="bar"><strong>${name}</strong><span>${n?`${right}/${n}`:'Untested'}</span>${n?`<progress aria-label="${name} accuracy" max="${n}" value="${right}"></progress>`:''}</div>`;
}

function report() {
  stage.textContent = 'Results';
  const state = assess(attempts);
  const {overall,reference,placement,practice,skill,quality} = state;
  const analytics = summarizeReport(state);
  const coverage = assessmentCoverage(placement,bank);
  const total = tally(placement);
  const [lower,upper] = overall.range;
  const hasEstimate = quality.chosen>=4;
  const range = !hasEstimate || lower===upper ? '' : ` · Estimated range: ${label(lower)}–${label(upper)}`;
  const rawPriority = studyPriority(state);
  const focus = analytics.focus;
  const priority = focus && rawPriority?.concept &&
    !bank.some(q=>q.concept===rawPriority.concept && q.skill===focus.id) ? null : rawPriority;
  const focusedPlacement = focus ? placement.filter(entry=>bank[entry.id].skill===focus.id) : placement;
  const importedLesson = mahymRecommendation(focusedPlacement,reference);
  const diagnosis = locationDiagnosis(state);
  const eligibleForTransfer = !attempts.some(entry=>isTransferItem(entry.id));
  const candidate = hasEstimate && !diagnosis.confirmed ?
    planCandidate(state,focus,importedLesson,exposures,new Set(studyPlan?.itemIds)) : null;
  const plan = priority?.concept ? concepts[priority.concept] : priority ? {
    title:skills[priority.skill],lesson:tips[priority.skill][0],route:links[priority.skill]
  } : null;
  const drill = origin+'/challenge/'+label(reference).toLowerCase();
  const missed = attempts.filter(entry=>entry.choice!==0);
  const more = canContinue();
  const chart = hasEstimate ? `<div class="placement-chart" role="group" aria-label="Relative model support by level">${analytics.levels.map(({band,percent,selected})=>{
    return `<div class="level-column ${selected?'is-estimate':''}" aria-label="${label(band)}, ${percent}% model support${selected?', estimated band':''}"><span>${percent}%</span><div class="plot" aria-hidden="true"><span style="--probability:${percent}%"></span></div><strong>${label(band)}</strong></div>`;
  }).join('')}</div><small>Model support across levels. These percentages are separate from test accuracy.</small>` : '';
  const categoryBars = analytics.categories.map(category=>{
    const isFocus = hasEstimate && (diagnosis.confirmed ? category.name==='Grammar' :
      focus && category.ids.includes(focus.id));
    const partial = category.measured.length>0 && category.measured.length<category.ids.length;
    return `<div class="category-row ${isFocus?'is-focus':''}"><strong>${category.name}${isFocus?' · Study first':''}</strong><span>${category.readiness===null?'Still checking':Math.round(category.readiness*100)+'%'}</span>
      ${category.readiness===null?'':`<progress aria-label="${category.name} estimated readiness" max="1" value="${category.readiness}"></progress>`}
      <span>${category.answers} chosen placement answers${partial?' · Partial coverage':''}</span></div>`;
  }).join('');
  const sparse = skill.findIndex(row=>row.n<2);
  const continuation = !hasEstimate ? 'Choose an answer when you can. Skips help route the test, but a level estimate needs answered questions.'
    : !quality.sufficient && quality.covered<4 ? 'More questions can give us enough evidence across several skills.'
    : lower!==upper ? `More questions can narrow the ${label(lower)} to ${label(upper)} estimate.`
    : sparse>=0 ? `More questions can help clarify skills with limited evidence, such as ${skills[sparse].toLowerCase()}.`
    : 'More questions can help verify which skills need the most practice.';
  const evidence = skill.map(({n,readiness,weights},id)=>{
    if (n<2) return `<div class="bar"><strong>${skills[id]}</strong><span>Still checking</span></div>`;
    const [low,high] = credibleRange(weights);
    const percent = Math.round(readiness*100);
    const from = Math.round(chanceOfCorrect(low,reference)*100);
    const to = Math.round(chanceOfCorrect(high,reference)*100);
    return `<div class="bar"><strong>${skills[id]}</strong><span>${percent}% · ${n} answers</span>
      <div class="skill-track" role="img" aria-label="Model range ${from} to ${to} percent, estimate ${percent} percent">
      <span class="skill-range" style="--from:${from}%;--width:${to-from}%"></span><span class="skill-point" style="--at:${percent}%"></span></div></div>`;
  }).join('');
  app.innerHTML = `<section class="panel result-head"><p class="eyebrow">Your placement · ${attempts.length} responses</p><h1 tabindex="-1">${hasEstimate?`Likely ${label(overall.band)}`:'More evidence needed'}</h1>
  <p>${quality.chosen?`${total.right}/${quality.chosen} placement answers correct`:'No placement answers chosen yet'}${range}${total.n>quality.chosen?` · ${total.n-quality.chosen} placement skips`:''}</p>
  <p>${quality.focused?'Focused language-knowledge estimate.':quality.sufficient?'Provisional language-knowledge estimate.':'Early language-knowledge evidence.'}${practice.length?` ${practice.length} responses tracked separately as practice.`:''}</p>
  ${chart}
  <div class="actions">${more?'<button data-action="continue">Continue test →</button>':'<span>All available placement questions answered.</span>'}</div>
  ${more?`<small>${continuation}</small>`:''}</section>
  <nav class="result-nav" aria-label="Results sections"><a href="#study">Study path</a><a href="#skills">Skill comparison</a><a href="#review">Missed questions (${missed.length})</a></nav>
  <section class="panel result-section" id="study" tabindex="-1"><h2>Your study path</h2>
  ${hasEstimate && focus && !diagnosis.confirmed?`<p><strong>Start with ${skills[focus.id].toLowerCase()}.</strong> You missed ${focus.missed} of ${focus.attempted} questions in this skill near ${label(reference)}.</p>`:''}
  <ol class="study-steps"><li><strong>1 · Review</strong>
  ${diagnosis.confirmed ? `<h3>${transferProbe.title}</h3><p>You chose the other location particle in ${diagnosis.placement+diagnosis.practice} sentences. ${transferProbe.explanation}</p>
  ${followup || eligibleForTransfer ? '<button data-action="transfer">Review and follow up</button>' : `<a class="button-link" href="${origin}/grammar">Open grammar library →</a>`}`
  : !hasEstimate?`<p>Continue to build an estimate, or browse the study library.</p><a class="button-link" href="study.html">Browse study topics →</a>`
  : importedLesson?`<p><b>${mahymEscape(studyTopics[importedLesson]??'Recommended lesson')}</b><br>Linked to a question you missed.</p><a class="button-link" href="study.html?lesson=${encodeURIComponent(importedLesson)}">Open recommended lesson →</a>`
  : focus && !priority?.concept?`<p>${tips[focus.id][0]}</p><a class="button-link" href="${origin}/${links[focus.id]}">Open ${skills[focus.id].toLowerCase()} resources →</a>`
  : plan?`<h3>${plan.title}</h3><p>${priority.repeated?'You missed this concept again in practice. ':''}${plan.lesson}</p><a class="button-link" href="${origin}/${plan.route}">Open lesson library →</a>`
  : overall.band===0?`<p>Start with foundational Japanese.</p><a class="button-link" href="${origin}/materials">Open beginner lessons →</a>`
  : `<p>Practice at your estimated level.</p><a class="button-link" href="${drill}">Open ${label(reference)} drills →</a>`}</li>
  <li><strong>2 · Practice</strong><p>${importedLesson?'Try the lesson exercises before revealing the answers.':'Apply the rule to a few new examples.'}</p>
  ${hasEstimate && importedLesson?`<a href="study.html?lesson=${encodeURIComponent(importedLesson)}#lesson-exercises">Open lesson exercises →</a>`:`<a href="${hasEstimate?drill:'study.html'}">Open practice →</a>`}</li>
  <li><strong>3 · Check again</strong><p>${diagnosis.confirmed?'Use the delayed follow-up to check this distinction in new sentences.':'Answer fresh placement questions to refine the estimate.'}</p>
  ${diagnosis.confirmed && (followup || eligibleForTransfer)?'<button class="secondary" data-action="transfer">Open follow-up</button>':more?'<button class="secondary" data-action="continue">Continue test</button>':''}</li></ol>
  ${studyPlan || candidate?`<div class="actions">${studyPlan?'<button class="secondary" data-action="study-plan">Open saved study plan</button>':''}
  ${candidate && (!studyPlan || planStage(studyPlan,Date.now())==='complete')?'<button data-action="save-study-plan">Save this study path</button>':''}</div>`:''}
  ${!studyPlan && !candidate && hasEstimate && focus && !diagnosis.confirmed?'<small>A saved check needs enough comparable placement answers and four fresh questions in this skill.</small>':''}
  <details class="extra-study"><summary>More study options</summary><a href="study.html">Browse the study library</a> · <a href="${drill}">${label(reference)} external drills</a></details></section>
  <div class="reportgrid"><section class="panel result-section" id="skills" tabindex="-1"><h2>Skill comparison</h2>${categoryBars}<small>Estimated performance on questions around ${label(reference)}. Grammar averages its measured subskills.</small>
  <details><summary>Detailed skill ranges</summary>${evidence}<small>The shaded bands show model uncertainty.</small></details>
  <details><summary>Radar overview</summary>${radar(skill)}</details></section>
  <section class="panel"><h2>Evidence by level</h2>${bands.slice(1).map(band=>bar(label(band),tally(placement.filter(entry=>difficulty(bank[entry.id])===band)))).join('')}
  <details><summary>What this test measures</summary>
  <p>Below N5 and N1 are the edges of the current estimate. The test cannot place you within foundations or beyond N1.</p>
  <ul>${coverage.map(domain=>{
    const available = domain.skills.filter(row=>row.status!=='unavailable');
    const sampled = available.filter(row=>row.status==='sampled').length;
    return `<li><strong>${domain.label}</strong> · ${available.length ? `${sampled} of ${available.length} available skills sampled` : 'Not assessed'}${available.length && available.length<domain.skills.length ? ' · partial coverage' : ''}</li>`;
  }).join('')}</ul></details></section></div>
  <section class="panel result-section" id="review" tabindex="-1"><h2>Review missed questions</h2>${missed.length?missed.map(entry=>{
    const q=bank[entry.id];
    if (q.practiceOnly) return `<details><summary>Revised item · N${q.level} · ${q.prompt}</summary><p>This item was removed from placement after review.</p><a href="study.html?lesson=${encodeURIComponent(q.lessonId)}">Open corrected lesson exercise</a></details>`;
    return `<details><summary>${practice.includes(entry)?'Practice · ':''}N${q.level} · ${q.prompt}</summary><p>${entry.choice===null?'Skipped':'You chose: '+q.options[entry.choice]}<br><strong>Answer: ${q.options[0]}</strong><br>${q.why}</p></details>`;
  }).join(''):'<p>All attempted questions were correct.</p>'}</section>
  <div class="result-foot"><button data-action="home" class="quiet">Back to start</button><button data-action="restart" class="quiet">Start over</button></div>`;
  focusHeading();
}

function showFollowup() {
  stage.textContent = 'Follow-up';
  const state = transferState(followup,Date.now());
  let body;
  if (state==='none') {
    body = `<p>${transferProbe.explanation}</p><button data-action="arm-transfer">I’ve reviewed this</button><small>Two fresh questions unlock in 24 hours.</small>`;
  } else if (state==='waiting') {
    body = `<p>Return after ${new Date(followup.readyAt).toLocaleString()} to answer two fresh questions.</p>`;
  } else if (state==='ready') {
    const q = bank[transferProbe.holdouts[followup.answers.length]];
    body = `<p class="eyebrow">Question ${followup.answers.length+1} of ${transferProbe.holdouts.length}</p>
      <h2>${q.prompt}</h2><div class="options">${shuffle([0,1,2,3]).map(choice=>
        `<button class="option" data-transfer-item="${q.id}" data-transfer-choice="${choice}">${q.options[choice]}</button>`
      ).join('')}</div>`;
  } else {
    const evidence = transferEvidence(followup.answers);
    const summary = evidence.aboveHalf>=.85 ? 'You applied the distinction in both new contexts.'
      : evidence.aboveHalf<=.15 ? 'Both new contexts still need review.'
      : 'You applied the distinction in one context. More evidence is needed.';
    body = `<p><strong>${evidence.correct}/${evidence.total} correct.</strong> ${summary}</p>
      <p>${transferProbe.explanation}</p><small>This check is separate from your placement estimate.</small>`;
  }
  app.innerHTML = `<section class="quiz panel"><p class="eyebrow">Follow-up check</p>
    <h1 tabindex="-1">${state==='ready'?'Location particles':transferProbe.title}</h1>
    ${body}<div class="actions"><button class="quiet" data-action="home">Back to start</button></div></section>`;
  focusHeading();
}

function showStudyPlan() {
  if (!studyPlan) return welcome();
  stage.textContent = 'Study plan';
  const state = planStage(studyPlan,Date.now());
  const skillName = skills[studyPlan.skill];
  const level = label(studyPlan.band);
  const lesson = studyPlan.lessonId ? 'study.html?lesson='+encodeURIComponent(studyPlan.lessonId) : null;
  const practice = lesson ? lesson+'#lesson-exercises' : origin+'/challenge/'+level.toLowerCase();
  const active = ({review:0,practice:1,waiting:2,ready:2,complete:2})[state];
  let body;
  if (state==='review') {
    body = `<p>${lesson?mahymEscape(studyTopics[studyPlan.lessonId]):tips[studyPlan.skill][0]}</p>
      <div class="actions"><a class="button-link secondary" href="${lesson??origin+'/'+links[studyPlan.skill]}">Open review</a><button data-action="advance-study-plan">Mark review complete →</button></div>`;
  } else if (state==='practice') {
    body = `<p>Try new examples in practice. Mark this step complete when you’re ready to schedule your check.</p>
      <div class="actions"><a class="button-link secondary" href="${practice}">Open practice</a><button data-action="advance-study-plan">Mark practice complete →</button></div>`;
  } else if (state==='waiting') {
    body = `<p>Four reserved questions unlock after <strong>${new Date(studyPlan.readyAt).toLocaleString()}</strong>.</p>
      <p>The pause gives you a chance to see what you remember after practice.</p><button class="secondary" data-action="study-plan">Check availability</button>`;
  } else if (state==='ready') {
    const q = bank[studyPlan.itemIds[studyPlan.answers.length]];
    rememberExposure(q.id);
    body = `<p class="eyebrow">Fresh check · ${studyPlan.answers.length+1} of 4</p><h2>${q.prompt}</h2>
      <div class="options">${shuffle([0,1,2,3]).map(choice=>
        `<button class="option" data-plan-item="${q.id}" data-plan-choice="${choice}">${q.options[choice]}</button>`
      ).join('')}</div><small>See all answers after question 4.</small>`;
  } else {
    const {before,after} = compareStudyPlan(studyPlan);
    body = `<h2>Before and after</h2>${bar('Before practice',{n:before.total,right:before.correct})}
      ${bar('Fresh check',{n:after.total,right:after.correct})}
      <p>Both sets covered ${skillName.toLowerCase()} at ${level}. This small sample shows how you did on these questions. More checks are needed to establish improvement.</p>
      <details><summary>Review check answers</summary>${studyPlan.answers.map(entry=>{
        const q = bank[entry.id];
        return `<details><summary>${q.prompt}</summary><p>Your answer: ${q.options[entry.choice]}<br>Correct answer: ${q.options[0]}<br>${q.why}</p></details>`;
      }).join('')}</details>`;
  }
  app.innerHTML = `<section class="quiz panel"><p class="eyebrow">Saved study plan · ${level}</p><h1 tabindex="-1">${skillName}</h1>
    <ol class="plan-progress" aria-label="Study plan stages">${['Review','Practice','Check again'].map((name,index)=>
      `<li ${index===active?'aria-current="step"':''}>${index<active?'✓':index+1} · ${name}</li>`
    ).join('')}</ol>${body}
    <small>Study activity and check scores are separate from placement.</small>
    <div class="actions"><button class="quiet" data-action="home">Back to start</button></div></section>`;
  focusHeading();
}

app.addEventListener('click', event=>{
  const sectionLink = event.target.closest('.result-nav a');
  if (sectionLink && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey) {
    const section = document.getElementById(sectionLink.hash.slice(1));
    event.preventDefault();
    section.focus({preventScroll:true});
    section.scrollIntoView({block:'start'});
    return;
  }
  const button = event.target.closest('button');
  if (!button || button.disabled) return;
  if (button.dataset.planItem !== undefined) {
    const nextPlan = gradePlan(studyPlan,Number(button.dataset.planItem),Number(button.dataset.planChoice),Date.now());
    if (nextPlan!==studyPlan) {
      saveStudyPlan(nextPlan);
      showStudyPlan();
    }
    return;
  }
  if (button.dataset.transferItem !== undefined) {
    const id = Number(button.dataset.transferItem);
    const choice = Number(button.dataset.transferChoice);
    if (transferState(followup,Date.now())==='ready' &&
        id===transferProbe.holdouts[followup.answers.length] && [0,1,2,3].includes(choice)) {
      saveFollowup({...followup,answers:[...followup.answers,{id,choice}]});
      showFollowup();
    }
    return;
  }
  if (button.dataset.choice !== undefined) grade(Number(button.dataset.choice));
  switch(button.dataset.action){
    case 'start': attempts=[]; item=undefined; next(); break;
    case 'resume': restoreQuestion(false); break;
    case 'continue': if(canContinue()) restoreQuestion(true); break;
    case 'transfer': showFollowup(); break;
    case 'study-plan': showStudyPlan(); break;
    case 'save-study-plan': {
      if (studyPlan && planStage(studyPlan,Date.now())!=='complete') break;
      const state = assess(attempts);
      const focus = summarizeReport(state).focus;
      const lesson = focus && mahymRecommendation(state.placement.filter(entry=>bank[entry.id].skill===focus.id),state.reference);
      const candidate = planCandidate(state,focus,lesson,exposures,new Set(studyPlan?.itemIds));
      if (candidate) {
        saveStudyPlan(candidate);
        showStudyPlan();
      }
      break;
    }
    case 'advance-study-plan':
      if (studyPlan) {
        saveStudyPlan(advancePlan(studyPlan,Date.now()));
        showStudyPlan();
      }
      break;
    case 'arm-transfer':
      if (!followup && locationDiagnosis(assess(attempts)).confirmed &&
          !attempts.some(entry=>isTransferItem(entry.id))) {
        saveFollowup({id:transferProbe.id,readyAt:Date.now()+transferProbe.delayMs,answers:[]});
      }
      showFollowup();
      break;
    case 'restart':
      if(confirm('Start a new test? This clears the current answers.')){
        attempts=[];
        item=undefined;
        next();
      }
      break;
    case 'latest': if(savedSession.attempts.length>=min){attempts=savedSession.attempts.slice(); report();} break;
    case 'skip': grade(null); break;
    case 'next': if(graded && canContinue()) next(); break;
    case 'finish':
      if(attempts.length<min) break;
      report();
      break;
    case 'quit': welcome(); break;
    case 'home': welcome(); break;
  }
});
document.addEventListener('keydown', event=>{
  if (!event.altKey || event.ctrlKey || event.metaKey || event.shiftKey || event.repeat ||
      event.defaultPrevented || !/^Digit[1-4]$/.test(event.code)) return;
  const choices = app.querySelectorAll('.quiz button[data-choice]:not(:disabled)');
  const choice = choices[Number(event.code.at(-1))-1];
  if (!choice) return;
  event.preventDefault();
  choice.click();
});

welcome();
