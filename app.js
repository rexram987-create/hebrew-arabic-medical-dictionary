const appBase = new URL('.', document.currentScript.src);
const drawer = document.getElementById('drawer');
const shade = document.getElementById('shade');
const menuButton = document.getElementById('menuBtn');
const closeButton = document.getElementById('closeBtn');
let previousFocus;
function menu(open) {
  if (!drawer) return;
  drawer.inert = !open;
  drawer.setAttribute('aria-hidden', String(!open));
  drawer.classList.toggle('open', open);
  shade?.classList.toggle('show', open);
  menuButton?.setAttribute('aria-expanded', String(open));
  document.body.classList.toggle('menu-open', open);
  document.querySelector('main').inert = open;
  if (open) {
    previousFocus = document.activeElement;
    closeButton?.focus();
  } else {
    previousFocus?.focus();
  }
}
menuButton?.addEventListener('click', () => menu(true));
closeButton?.addEventListener('click', () => menu(false));
shade?.addEventListener('click', () => menu(false));
document.addEventListener('keydown', event => {
  if (!drawer?.classList.contains('open')) return;
  if (event.key === 'Escape') { event.preventDefault(); menu(false); }
  if (event.key === 'Tab') {
    const controls = Array.from(drawer.querySelectorAll('button, a[href]'));
    const first = controls[0], last = controls[controls.length - 1];
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
    if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
  }
});
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register(new URL('sw.js', appBase), { updateViaCache: 'none' })
      .catch(error => console.warn('Offline registration failed', error));
  });
}
let installPrompt;
const installButton = document.getElementById('installBtn');
window.addEventListener('beforeinstallprompt', event => {
  event.preventDefault(); installPrompt = event;
  if (installButton) installButton.hidden = false;
});
installButton?.addEventListener('click', async () => {
  if (!installPrompt) return;
  await installPrompt.prompt();
  await installPrompt.userChoice;
  installPrompt = null; installButton.hidden = true;
});
window.addEventListener('appinstalled', () => {
  installPrompt = null;
  if (installButton) installButton.hidden = true;
});
let currentAudio;
let currentButton;
const audioStatus = document.getElementById('audioStatus');
document.querySelectorAll('.audio-btn').forEach(button => {
  button.addEventListener('click', () => {
    if (currentAudio) currentAudio.pause();
    currentButton?.classList.remove('playing');
    currentButton?.setAttribute('aria-pressed', 'false');
    if ('speechSynthesis' in window) speechSynthesis.cancel();
    const audio = new Audio(button.dataset.audio);
    currentAudio = audio; currentButton = button;
    button.classList.add('playing'); button.setAttribute('aria-pressed', 'true');
    if (audioStatus) audioStatus.textContent = '';
    const done = () => {
      if (currentAudio !== audio) return;
      button.classList.remove('playing'); button.setAttribute('aria-pressed', 'false');
      currentAudio = null; currentButton = null;
    };
    let failed = false;
    const fallback = () => {
      if (failed || currentAudio !== audio) return;
      failed = true; done();
      const arabic = button.closest('.term-card').querySelector('.ar').textContent;
      if (audioStatus) audioStatus.textContent = 'ההקלטה לא זמינה. אם קיימת תמיכה במכשיר, תופעל הקראה אוטומטית בערבית; ההגייה עשויה להיות ספרותית.';
      if ('speechSynthesis' in window) {
        const utterance = new SpeechSynthesisUtterance(arabic);
        utterance.lang = 'ar'; speechSynthesis.speak(utterance);
      }
    };
    audio.addEventListener('ended', done);
    audio.addEventListener('error', fallback);
    audio.play().catch(fallback);
  });
});
const search = document.getElementById('termSearch');
const cards = Array.from(document.querySelectorAll('.term-card'));
const searchStatus = document.getElementById('searchStatus');
function normalize(text) {
  return text.normalize('NFKD').replace(/[\u0591-\u05c7\u0610-\u061a\u064b-\u065f\u0670\u06d6-\u06ed\u0640]/g, '')
    .replace(/[أإآٱ]/g, 'ا').toLowerCase().trim();
}
const searchable = cards.map(card => normalize(card.querySelector('.term-text').textContent));
function filterTerms() {
  const words = normalize(search.value).split(/\s+/).filter(Boolean);
  let count = 0;
  cards.forEach((card, index) => {
    card.hidden = !words.every(word => searchable[index].includes(word));
    if (!card.hidden) count++;
  });
  searchStatus.textContent = count ? `מוצגים ${count} מתוך ${cards.length} מונחים` : 'לא נמצאו מונחים. נסו כתיב אחר.';
}
if (search) { search.addEventListener('input', filterTerms); filterTerms(); }
