const mahymEscape = text=>String(text??'').replace(/[&<>"']/g,char=>({
  '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
})[char]);
for (const seed of mahymItems) {
  bank.push({
    ...seed,id:bank.length,
    practiceOnly:Boolean(mahymErrata[seed.sourceId]),
    prompt:mahymEscape(seed.prompt),
    options:seed.options.map(mahymEscape),
    why:mahymEscape(seed.why)
  });
}

function mahymRecommendation(placement, reference) {
  const candidates = new Map();
  for (const entry of placement) {
    const q = bank[entry.id];
    if (!q.lessonId || entry.choice===0) continue;
    const strength = (entry.choice===null ? .4 : 1)/(1+Math.abs(difficulty(q)-reference));
    candidates.set(q.lessonId,(candidates.get(q.lessonId)??0)+strength);
  }
  return [...candidates].sort((a,b)=>b[1]-a[1])[0]?.[0]??null;
}
