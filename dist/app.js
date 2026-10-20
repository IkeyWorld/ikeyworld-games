'use strict';
const catalog = document.querySelector('#catalog');
const games = window.GAME_CATALOG || [];
// All copy is assigned as text; adding a game cannot inject HTML into the page.
function element(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text) node.textContent = text;
  return node;
}
for (const game of games) {
  const card = element('article', 'game-card');
  card.id = game.id;
  const imageWrap = element('div', 'game-image');
  const image = element('img');
  image.src = game.image;
  image.alt = `«${game.title}» — игровой процесс`;
  image.width = 1920; image.height = 1080;
  imageWrap.append(image, element('span', 'demo-badge', 'ДЕМО УЖЕ ДОСТУПНО'));
  const content = element('div', 'game-content');
  content.append(element('p', 'game-kicker', game.genre), element('h3', '', game.title), element('p', 'description', game.description));
  const tags = element('div', 'tags');
  for (const tag of game.tags || []) tags.append(element('span', '', tag));
  const bottom = element('div', 'game-bottom');
  const link = element('a', 'button game-link', 'Скачать демо ↓');
  link.href = game.download; link.download = '';
  link.setAttribute('aria-label', `Скачать демо «${game.title}» для Windows`);
  bottom.append(element('small', '', `${game.platform} · ${game.size}`), link);
  content.append(tags, bottom); card.append(imageWrap, content); catalog.append(card);
}
const counter = document.querySelector('.collection-count');
counter.textContent = `Коллекция / ${String(games.length).padStart(2, '0')}`;
if (games[0]) document.querySelector('#main-download').href = games[0].download;
const dialog = document.querySelector('#lightbox');
let previousFocus;
document.querySelectorAll('.shot').forEach(button => button.addEventListener('click', () => {
  previousFocus = button;
  dialog.querySelector('img').src = button.dataset.image;
  dialog.querySelector('img').alt = button.dataset.caption;
  dialog.querySelector('p').textContent = button.dataset.caption;
  dialog.showModal();
  document.body.classList.add('modal-open');
}));
dialog.querySelector('.close').addEventListener('click', () => dialog.close());
dialog.addEventListener('click', event => { if (event.target === dialog) { const rect = dialog.getBoundingClientRect(); if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) dialog.close(); } });
dialog.addEventListener('close', () => { document.body.classList.remove('modal-open'); previousFocus?.focus(); });
