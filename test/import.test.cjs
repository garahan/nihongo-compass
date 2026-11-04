const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const {lessons,stories,threads} = require('../dist/mahym-study.json');
const context = {};
vm.runInNewContext(['mahym-items','mahym-errata'].map(name=>fs.readFileSync('dist/'+name+'.js','utf8')).join('\n')+
  '\nthis.items=mahymItems;this.errata=mahymErrata;this.correct=correctMahym;',context);
const lessonIndex = new Map(lessons.map(l=>[l.lesson,l]));
assert.equal(lessonIndex.size,44);
assert.equal(stories.length,4);
assert.equal(threads.length,40);
const exerciseIds = new Set();
const normalized = value=>value.normalize('NFKC').trim();
function validate(q) {
  assert.equal(q.options.length,4);
  assert(q.options.every(option=>typeof option==='string' && option.trim()));
  assert.equal(new Set(q.options.map(normalized)).size,4);
  assert(Number.isInteger(q.correctIndex) && q.correctIndex>=0 && q.correctIndex<4);
}
for (const item of context.items) {
  if (!item.lessonId) continue;
  const lesson = lessonIndex.get(item.lessonId);
  assert(lesson,item.sourceId);
  assert(lesson.questions.some(q=>q.id===item.sourceId),item.sourceId);
  if (item.topicId) assert(['grammar','kanji','vocabulary'].some(key=>lesson[key].some(topic=>topic.id===item.topicId)),item.sourceId);
}
for (const lesson of lessons) {
  for (const q of [...lesson.questions,...lesson.reading.questions,...lesson.listening]) {
    exerciseIds.add(q.id);
    const fixed = context.correct(q.id,q.s??q.q??q.a,q.o,q.c);
    assert(fixed.prompt,q.id);
    validate(fixed);
    if (q.s && !context.errata[q.id]) assert.equal(normalized(q.a),normalized(q.o[q.c]),q.id);
  }
}
for (const id of Object.keys(context.errata)) assert(exerciseIds.has(id),id);
for (const story of stories) assert(story.chapters.every(chapter=>chapter.panels.every(panel=>panel.jp)));
for (const thread of threads) assert(thread.posts.every(post=>typeof post==='string' && post.trim()));
console.log('Import checks passed. Eligible Mahym items:',context.items.filter(q=>!context.errata[q.sourceId]).length);
