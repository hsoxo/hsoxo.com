export function formatReadingTime(minutes, lang) {
  let cups = Math.round(minutes / 5);
  let bowls = 0;
  // const prefix = new Array(cups || 1).fill('☕️').join('');
  const prefix = ''
  const postfix = lang === 'zh-hans' ? '分钟阅读' : 'min read';
  if (cups > 5) {
    return `${new Array(Math.round(cups / Math.E))
        .fill('🍱')
        .join('')} ${minutes} ${postfix}`;
  } else {
    return `${prefix} ${minutes} ${postfix}`;
  }
}


// `lang` is optional and will default to the current user agent locale
export function formatPostDate(date, lang) {
  if (typeof Date.prototype.toLocaleDateString !== 'function') {
    return date;
  }

  date = new Date(date);
  const args = [
    lang,
    { day: 'numeric', month: 'long', year: 'numeric' },
  ].filter(Boolean);
  return date.toLocaleDateString(...args);
}
