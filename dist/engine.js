const bands = [0,1,2,3,4,5];
const difficulty = question => 6-question.level;
const label = band => band === 0 ? 'Below N5' : 'N' + (6-band);

function chanceOfCorrect(ability, level) {
  return .25 + .70 / (1 + Math.exp((level-ability)*1.8));
}

// Six overall bands and six possible ability bands per skill. Conditional on
// overall ability, the skill likelihoods factor, so no 6^6 grid is needed.
const mean = (weights,values) => weights.reduce((sum,w,i)=>sum+w*values[i],0);
const normalize = values => {
  const sum = values.reduce((a,b)=>a+b,0);
  return values.map(value=>value/sum);
};
const skillPrior = bands.map(overall=>normalize(bands.map(skill=>
  Math.exp(-.5*((skill-overall)/1.15)**2))));
const predictions = bands.map(level=>bands.map(ability=>chanceOfCorrect(ability,level)));

function credibleRange(weights, mass=.8) {
  let range = [0,bands.length-1];
  let bestMass = 0;
  for (const low of bands) {
    let sum = 0;
    for (let high=low; high<bands.length; high++) {
      sum += weights[high];
      if (sum<mass) continue;
      const span = high-low;
      const bestSpan = range[1]-range[0];
      if (span<bestSpan || (span===bestSpan && sum>bestMass)) {
        range = [low,high];
        bestMass = sum;
      }
      break;
    }
  }
  return range;
}

function assess(attempts) {
  const taught = new Set();
  const practice = [];
  const placement = [];
  const evidenceBySkill = skills.map(()=>[]);
  for (const entry of attempts) {
    const q = bank[entry.id];
    if (q.concept && taught.has(q.concept)) practice.push(entry);
    else {
      placement.push(entry);
      evidenceBySkill[q.skill].push(entry);
    }
    if (q.concept) taught.add(q.concept);
  }

  // Skips are evidence of uncertainty, with less weight than a chosen error.
  const likelihoods = evidenceBySkill.map(evidence=>{
    const log = bands.map(ability=>evidence.reduce((sum,entry)=>{
      const p = predictions[difficulty(bank[entry.id])][ability];
      return sum+(entry.choice===null?.55:1)*Math.log(entry.choice===0?p:1-p);
    },0));
    const max = Math.max(...log);
    return log.map(value=>Math.exp(value-max));
  });
  const evidenceByOverall = likelihoods.map(likelihood=>
    skillPrior.map(prior=>mean(prior,likelihood)));
  const weights = normalize(bands.map(band=>
    evidenceByOverall.reduce((product,evidence)=>product*evidence[band],1)));
  const band = weights.indexOf(Math.max(...weights));
  const overall = {band,weights,range:credibleRange(weights)};
  const reference = Math.max(1,band);
  const skill = likelihoods.map((likelihood,id)=>{
    const conditional = skillPrior.map((prior,overallBand)=>prior.map((w,ability)=>
      w*likelihood[ability]/evidenceByOverall[id][overallBand]));
    const marginal = bands.map(ability=>mean(weights,conditional.map(row=>row[ability])));
    const evidence = evidenceBySkill[id];
    return {
      n:evidence.filter(entry=>entry.choice!==null).length,
      right:evidence.filter(entry=>entry.choice===0).length,
      readiness:mean(marginal,predictions[reference]),
      weights:marginal,
      conditional
    };
  });
  return {overall,reference,placement,practice,taught,skill};
}

function binaryEntropy(p) {
  return p>0 && p<1 ? -p*Math.log2(p)-(1-p)*Math.log2(1-p) : 0;
}

function information(weights, probabilities) {
  // Mutual information in bits: entropy of the predicted answer minus
  // expected answer entropy given the candidate ability.
  return Math.max(0,binaryEntropy(mean(weights,probabilities))-
    mean(weights,probabilities.map(binaryEntropy)));
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
  const gains = state.skill.map(gap=>predictions.map(p=>({
    overall:information(state.overall.weights,gap.conditional.map(row=>mean(row,p))),
    skill:information(gap.weights,p)
  })));
  let best;
  let highest = -Infinity;
  for (const q of bank) {
    if (seen.has(q.id) || isTransferItem(q.id)) continue;
    const level = difficulty(q);
    const isPractice = state.taught.has(q.concept);
    const gap = state.skill[q.skill];
    const sameConcept = q.concept && q.concept===lastQuestion?.concept;
    const probe = allowProbe && (last?.choice!==0 || hesitant) && level<=previous &&
      (q.concept===probeConcept || sameConcept);
    const contrast = last && locationMisconception(last) && locationConcepts.has(q.concept) &&
      q.concept!==lastQuestion.concept && !isPractice;
    const score = attempts.length<2 ? -2*Math.abs(level-3)-gap.n :
      (isPractice ? 0 : (stable?2:5)*gains[q.skill][level].overall +
        (stable?3:1.5)*gains[q.skill][level].skill) +
      .4/(1+gap.n) - .32*Math.abs(level-target) -
      (isPractice ? .7 : 0) + (probe ? 1.05 : 0) + (contrast ? 1.2 : 0) +
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
