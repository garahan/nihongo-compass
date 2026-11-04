// Usage: node tools/import-mahym.cjs /path/to/Japanese-Test-Mahym
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const source = process.argv[2];
if (!source) throw new Error('Provide the source checkout directory');
function read(file, expression) {
  const script = fs.readFileSync(path.join(source,file),'utf8');
  const value = vm.runInNewContext(script+'\n'+expression,{window:{}},{
    timeout:1000, contextCodeGeneration:{strings:false,wasm:false}
  });
  if (!Array.isArray(value)) throw new Error('Expected an array in '+file);
  return JSON.parse(JSON.stringify(value));
}
const lessons = [
  ...read('n5-content.js','N5_CONTENT'),
  ...read('seed-data.js','SEED_CONTENT'),
  ...read('n3-content.js','N3_CONTENT')
];
const questions = read('jlpt-question-bank.js','window.JLPT_BANK');
const stories = read('manga-data.js','window.MANGA_STORIES');
const threads = read('feed-threads.js','window.FEED_THREADS');
const cyrillic = /\p{Script=Cyrillic}/u;
const norm = text=>text.normalize('NFKC').trim().replace(/\s+/g,' ').toLowerCase();
const byId = new Set();
const byPrompt = new Set();
const imported = [];
const review = [];
for (const [q,lesson] of [...questions.map(q=>[q,null]),...lessons.flatMap(lesson=>lesson.questions.map(q=>[q,lesson]))]) {
  const level = Number((q.level??lesson?.level)?.slice(1));
  const valid = typeof q.id==='string' && level>=1 && level<=5 &&
    typeof q.s==='string' && q.s.trim() && typeof q.exp==='string' && q.exp.trim() &&
    Array.isArray(q.o) && q.o.length===4 && q.o.every(x=>typeof x==='string' && x.trim()) &&
    new Set(q.o.map(norm)).size===4 && Number.isInteger(q.c) &&
    typeof q.a==='string' && typeof q.o[q.c]==='string' && norm(q.a)===norm(q.o[q.c]);
  const key = valid ? norm(q.s) : null;
  const reason = !valid?'invalid-answer-key':byId.has(q.id)?'duplicate-id':
    byPrompt.has(key)?'duplicate-prompt':q.dim==='grammar' && !q.s.includes('(')?'grammar-practice':cyrillic.test([q.s,...q.o].join(' '))?'russian-practice':null;
  if (reason) {
    review.push({reason,lessonId:lesson?.lesson??null,question:q});
    continue;
  }
  byId.add(q.id);
  byPrompt.add(key);
  const options = [q.o[q.c],...q.o.filter((_,i)=>i!==q.c)];
  const skill = q.dim==='grammar' ? 4 : q.dim==='kanji' &&
    (q.type==='reading' || /^[ぁ-ゖァ-ヺー]+$/.test(options[0])) ? 1 : 0;
  const term = q.exp.match(/^([^（(=→]+)[（(=→]/)?.[1]?.trim();
  const family = q.linksTo ? 'mahym-concept-'+q.linksTo :
    term && /^[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}ー]+$/u.test(term) ? 'mahym-word-'+term : null;
  imported.push({sourceId:q.id,level,skill,prompt:q.s,options,why:q.exp,
    offset:q.difficulty==='easy'?-.32:q.difficulty==='hard'?.32:0,
    family,lessonId:lesson?.lesson??null,topicId:q.linksTo??null});
}
const itemPath = 'dist/mahym-items.js';
const prefix = 'const mahymItems = ';
if (fs.existsSync(itemPath)) {
  const previous = JSON.parse(fs.readFileSync(itemPath,'utf8').trim().slice(prefix.length,-1));
  if (previous.some((q,index)=>q.sourceId!==imported[index]?.sourceId)) {
    throw new Error('Import would change existing item positions. Preserve the old IDs before updating.');
  }
}
fs.writeFileSync(itemPath,prefix+JSON.stringify(imported)+';\n');
fs.writeFileSync('dist/mahym-study.json',JSON.stringify({lessons,stories,threads})+'\n');
fs.mkdirSync('seeds',{recursive:true});
fs.writeFileSync('seeds/mahym-review.json',JSON.stringify(review)+'\n');
console.log(JSON.stringify({imported:imported.length,review:review.reduce((counts,row)=>
  ({...counts,[row.reason]:(counts[row.reason]??0)+1}),{}),lessons:lessons.length,stories:stories.length,threads:threads.length}));
