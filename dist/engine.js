const bands = [0,1,2,3,4,5];
const difficulty = question => 6-question.level;
const label = band => band === 0 ? 'Below N5' : 'N' + (6-band);

function chanceOfCorrect(ability, level) {
  return .25 + .70 / (1 + Math.exp((level-ability)*1.8));
}

function posterior(attempts, prior = bands.map(()=>1)) {
  const scores = bands.map(band=>attempts.reduce((sum,entry)=>{
    const p = chanceOfCorrect(band,difficulty(bank[entry.id]));
    return sum + Math.log(entry.choice===0?p:1-p);
  },Math.log(prior[band])));
  const highest = Math.max(...scores);
  const weights = scores.map(score=>Math.exp(score-highest));
  const sum = weights.reduce((a,b)=>a+b,0);
  return {band:scores.indexOf(highest),weights:weights.map(w=>w/sum)};
}

function assess(attempts) {
  const taught = new Set();
  const practice = [];
  const placement = [];
  for (const entry of attempts) {
    const concept = bank[entry.id].concept;
    (concept && taught.has(concept) ? practice : placement).push(entry);
    if (concept) taught.add(concept);
  }
  const overall = posterior(placement);
  const reference = Math.max(1,overall.band);
  const skill = skills.map((_,id)=>{
    const evidence = placement.filter(entry=>bank[entry.id].skill===id);
    const other = posterior(placement.filter(entry=>bank[entry.id].skill!==id));
    // Borrow context from other skills without treating them as direct evidence.
    const prior = other.weights.map(w=>.5/6+.5*w);
    const model = posterior(evidence,prior);
    const readiness = model.weights.reduce((sum,w,band)=>sum+w*chanceOfCorrect(band,reference),0);
    return {n:evidence.length,right:evidence.filter(entry=>entry.choice===0).length,readiness,weights:model.weights};
  });
  return {overall,reference,placement,practice,taught,skill};
}

function information(weights, level) {
  const predictions = bands.map(band=>chanceOfCorrect(band,level));
  const mean = predictions.reduce((sum,p,i)=>sum+p*weights[i],0);
  return predictions.reduce((sum,p,i)=>sum+(p-mean)**2*weights[i],0)/(mean*(1-mean));
}

function chooseQuestion(attempts, random = Math.random) {
  const state = assess(attempts);
  const seen = new Set(attempts.map(entry=>entry.id));
  const last = attempts.at(-1);
  const previous = last ? difficulty(bank[last.id]) : 3;
  const recent = state.placement.slice(-3);
  const streak = recent.length===3 && recent.every(entry=>entry.choice===0);
  const misses = recent.filter(entry=>entry.choice!==0).length;
  const direction = streak ? previous+1 : misses>=2 ? previous-1 : state.reference;
  const target = attempts.length<2 ? 3 : Math.max(1,Math.min(5,previous+1,Math.max(previous-1,direction)));
  const lastQuestion = last && bank[last.id];
  const comparable = lastQuestion ? attempts.slice(-14,-1).filter(entry=>{
    const q = bank[entry.id];
    return q.skill===lastQuestion.skill && Math.abs(difficulty(q)-previous)<=1 && entry.seconds>0;
  }).map(entry=>entry.seconds).sort((a,b)=>a-b) : [];
  const median = comparable.length>=3 ? comparable[Math.floor(comparable.length/2)] : null;
  const hesitant = last?.choice===0 && median && last.seconds>Math.max(10,median*1.6);
  const quick = last?.choice===0 && streak && median && last.seconds>=1 && last.seconds<median*.7;
  const conceptMisses = lastQuestion?.concept ? attempts.filter(entry=>
    bank[entry.id].concept===lastQuestion.concept && entry.choice!==0).length : 0;
  const probeConcept = conceptMisses>=2 ? concepts[lastQuestion.concept].prerequisite : null;
  const allowProbe = attempts.length>=3 && !state.practice.includes(attempts.at(-2));
  const stable = Math.max(...state.overall.weights)>=.75;
  let best;
  let highest = -Infinity;
  for (const q of bank) {
    if (seen.has(q.id)) continue;
    const level = difficulty(q);
    const isPractice = state.taught.has(q.concept);
    const gap = state.skill[q.skill];
    const sameConcept = q.concept && q.concept===lastQuestion?.concept;
    const probe = allowProbe && (last?.choice!==0 || hesitant) && level<=previous &&
      (q.concept===probeConcept || sameConcept);
    const score = attempts.length<2 ? -2*Math.abs(level-3)-gap.n :
      (stable?1:2)*information(state.overall.weights,level) +
      (stable?1.2:.6)*information(gap.weights,level) +
      .65/(1+gap.n) - .55*Math.abs(level-target) -
      (isPractice ? .85 : 0) + (probe ? 1.25 : 0) +
      (quick && level===previous+1 ? .15 : 0);
    const tieBroken = score+random()*.04;
    if (tieBroken>highest) {
      highest = tieBroken;
      best = q;
    }
  }
  return best;
}

function studyPriority(state) {
  const placementMisses = state.placement.filter(entry=>entry.choice!==0);
  const specific = placementMisses.filter(entry=>bank[entry.id].concept)
    .map(entry=>{
      const q = bank[entry.id];
      const related = state.practice.filter(next=>bank[next.id].concept===q.concept);
      const repeated = related.filter(next=>next.choice!==0).length;
      return {q,repeated,recovered:related.length>0 && repeated===0};
    })
    .filter(row=>!row.recovered)
    .sort((a,b)=>b.repeated-a.repeated || Math.abs(difficulty(a.q)-state.reference)-Math.abs(difficulty(b.q)-state.reference));
  const weakest = state.skill.map((row,id)=>({...row,id}))
    .filter(row=>row.n>=2 && row.right<row.n)
    .sort((a,b)=>a.readiness-b.readiness)[0];
  if (specific[0]?.repeated) return {concept:specific[0].q.concept,repeated:true};
  if (weakest) {
    const matching = specific.find(row=>row.q.skill===weakest.id);
    return matching ? {concept:matching.q.concept,repeated:false} : {skill:weakest.id};
  }
  if (specific.length) return {concept:specific[0].q.concept,repeated:false};
  return null;
}
