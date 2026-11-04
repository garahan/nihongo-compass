const libraryStatus = document.querySelector('#library-status');
const libraryContent = document.querySelector('#library-content');
const query = new URLSearchParams(location.search);

function node(tag,text) {
  const element = document.createElement(tag);
  if (text!=null) element.textContent = text;
  return element;
}

function disclosure(title, parent) {
  const details = node('details');
  details.append(node('summary',title));
  parent.append(details);
  return details;
}

function exercise(parent,q) {
  const prompt = q.s??q.q??q.a;
  if (!prompt || !q.o?.length || q.o[q.c]==null ||
      (q.s && q.a?.trim()!==q.o[q.c]?.trim())) return;
  const box = disclosure(prompt,parent);
  box.append(node('ol'));
  for (const option of q.o) box.lastChild.append(node('li',option));
  const answer = disclosure('Reveal answer',box);
  answer.append(node('p',q.o[q.c]),node('p',q.exp));
}

function showLesson(lesson) {
  const panel = node('section');
  panel.className = 'panel';
  panel.append(node('p',lesson.level),node('h2',lesson.topicEn??lesson.topic),node('p',lesson.topic));
  const vocabulary = disclosure('Vocabulary',panel);
  for (const term of lesson.vocabulary??[]) {
    vocabulary.append(node('h3',[term.word,term.reading].filter(Boolean).join(' · ')),
      node('p',term.meaning),node('p',term.example),node('p',term.exampleMeaning));
  }
  const grammar = disclosure('Grammar',panel);
  for (const point of lesson.grammar??[]) {
    grammar.append(node('h3',point.point),node('p',point.explanation));
    for (const example of point.examples??[]) grammar.append(node('p',example));
    if (point.production) grammar.append(node('p',point.production));
  }
  const kanji = disclosure('Kanji',panel);
  for (const item of lesson.kanji??[]) {
    kanji.append(node('p',[item.char,item.reading,item.meaning,item.exampleWord].filter(Boolean).join(' · ')));
  }
  const reading = disclosure('Reading practice',panel);
  for (const text of Array.isArray(lesson.reading)?lesson.reading:lesson.reading?[lesson.reading]:[]) {
    reading.append(node('h3',text.title),node('p',text.passage?.replaceAll('\\n','\n')));
    for (const q of text.questions??[]) exercise(reading,q);
  }
  const listening = disclosure('Listening scripts',panel);
  for (const text of lesson.listening??[]) {
    listening.append(node('p',text.audioText));
    exercise(listening,text);
  }
  const practice = disclosure('Lesson exercises',panel);
  for (const q of lesson.questions??[]) exercise(practice,q);
  libraryContent.append(panel);
}

function showIndex({lessons,stories,threads}) {
  for (const level of ['N5','N4','N3','N2','N1']) {
    const rows = lessons.filter(lesson=>lesson.level===level);
    if (!rows.length) continue;
    const panel = node('section');
    panel.className = 'panel library-section';
    panel.append(node('h2',level+' lessons'));
    const list = node('ul');
    for (const lesson of rows) {
      const item = node('li');
      const link = node('a',lesson.topicEn??lesson.topic);
      link.href = 'study.html?lesson='+encodeURIComponent(lesson.lesson);
      item.append(link);
      list.append(item);
    }
    panel.append(list);
    libraryContent.append(panel);
  }
  const readers = disclosure('Graded stories and reading threads',libraryContent);
  for (const story of stories) {
    const section = disclosure(story.level+' · '+(story.titleEn??story.title),readers);
    section.append(node('p',story.desc));
    for (const chapter of story.chapters??[]) {
      section.append(node('h3',chapter.titleEn??chapter.title));
      for (const panel of chapter.panels??[]) {
        section.append(node('p',panel.jp),node('p',panel.reading),node('p',panel.en));
      }
    }
  }
  for (const thread of threads) {
    const section = disclosure(thread.level+' · '+thread.title,readers);
    for (const post of thread.posts??[]) {
      section.append(node('p',typeof post==='string'?post:post.text??post.jp??post.body));
    }
  }
}

fetch('mahym-study.json').then(response=>{
  if (!response.ok) throw new Error('Study catalog unavailable');
  return response.json();
}).then(catalog=>{
  libraryStatus.textContent = 'Practice material from Japanese Test Mahym. Study answers do not affect placement.';
  const lesson = catalog.lessons.find(row=>row.lesson===query.get('lesson'));
  if (lesson) {
    const link = node('a','Browse all study topics');
    link.href = 'study.html';
    libraryContent.append(link);
    showLesson(lesson);
  } else showIndex(catalog);
}).catch(()=>{
  libraryStatus.textContent = 'Could not load the library. Refresh the page to try again.';
});
