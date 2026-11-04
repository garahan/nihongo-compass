// This first diagnostic uses existing content. Reserve one fresh item per side
// of the contrast, keeping their stable IDs for legacy session compatibility.
const transferProbe = {
  id: 'location-particles',
  title: 'に vs. で for location',
  explanation: 'Use に for where something exists and で for where an action happens.',
  holdouts: [61,64],
  delayMs: 24 * 60 * 60 * 1000
};
const locationConcepts = new Set(['action-place','existence-place']);

function isTransferItem(id) {
  return transferProbe.holdouts.includes(id);
}

function locationMisconception(entry) {
  return entry.choice===1 && locationConcepts.has(bank[entry.id]?.concept);
}

function locationDiagnosis(state) {
  const initial = state.placement.filter(locationMisconception);
  const followups = state.practice.filter(locationMisconception);
  const matched = initial.length+followups.length;
  return {
    confirmed:initial.length>0 && matched>=2,
    placement:initial.length,
    practice:followups.length
  };
}

// Beta(1,1) prior updated with binary transfer outcomes. The exact probability
// of success probability above 50% guides the summary, never placement.
function transferEvidence(answers) {
  const correct = answers.filter(entry=>entry.choice===0).length;
  const total = answers.length;
  let coefficient = 1;
  let probability = 0;
  for (let k=0;k<=correct;k++) {
    probability += coefficient;
    coefficient *= (total+1-k)/(k+1);
  }
  return {correct,total,aboveHalf:probability/(2**(total+1))};
}

function validTransfer(record) {
  return record?.id===transferProbe.id && Number.isFinite(record.readyAt) &&
    Array.isArray(record.answers) && record.answers.length<=transferProbe.holdouts.length &&
    record.answers.every((entry,i)=>entry?.id===transferProbe.holdouts[i] &&
      [0,1,2,3].includes(entry.choice));
}

function transferState(record, now) {
  if (!validTransfer(record)) return 'none';
  if (record.answers.length===transferProbe.holdouts.length) return 'complete';
  return now>=record.readyAt ? 'ready' : 'waiting';
}
