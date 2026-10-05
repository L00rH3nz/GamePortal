// MiniGames Hub — SPA Vanilla JS
// - Legge games.json e inietta le card in #games-list
// - Router client minimale basato su hash (#/, #/games, #/game/:id)

const listEl = document.getElementById('games-list');
const viewHome = document.getElementById('view-home');
const viewGame = document.getElementById('view-game');
const view404 = document.getElementById('view-404');
const gameDetailEl = document.getElementById('game-detail');
const backBtn = document.getElementById('back-btn');

let games = [];

function badgeFor(stato) {
  const map = {
    'disponibile': 'bg-green-600',
    'beta': 'bg-amber-600',
    'coming-soon': 'bg-slate-600'
  };
  return map[stato] || 'bg-slate-600';
}

function gameCard(game) {
  const disabled = game.stato === 'coming-soon';
  return `
    <article class="game-card w-full p-4 rounded-2xl bg-slate-900 border border-slate-800 shadow-lg active:scale-[0.99] transition touch-manipulation">
      <div class="flex gap-3 items-center">
        <img src="${game.anteprima}" alt="Anteprima ${game.titolo}" loading="lazy"
             class="w-16 h-16 rounded-xl object-cover bg-slate-800 shrink-0"
             onerror="this.style.display='none'" />
        <div class="flex-1 min-w-0">
          <h3 class="font-semibold truncate">${game.titolo}</h3>
          <p class="text-xs text-slate-400 uppercase tracking-wide">${game.categoria}</p>
          <span class="inline-block mt-1 text-[11px] px-2 py-0.5 rounded-full ${badgeFor(game.stato)}">${game.stato}</span>
        </div>
      </div>
      <a href="${disabled ? '#/' : '#/game/' + game.id}" data-link
         class="block mt-3 text-center w-full py-3 rounded-xl font-semibold touch-manipulation ${disabled ? 'bg-slate-800 text-slate-500 pointer-events-none' : 'bg-indigo-600 active:bg-indigo-500'}">
        ${disabled ? 'Prossimamente' : 'Gioca ora'}
      </a>
    </article>`;
}

function renderList() {
  if (!games.length) {
    listEl.innerHTML = '<p class="text-slate-400 text-sm">Nessun gioco disponibile.</p>';
    return;
  }
  listEl.innerHTML = games.map(gameCard).join('');
}

function renderDetail(id) {
  const game = games.find((g) => g.id === id);
  if (!game) return showView('404');
  gameDetailEl.innerHTML = `
    <article class="w-full p-4 rounded-2xl bg-slate-900 border border-slate-800">
      <img src="${game.anteprima}" alt="Anteprima ${game.titolo}"
           class="w-full h-44 rounded-xl object-cover bg-slate-800"
           onerror="this.style.display='none'" />
      <h2 class="text-xl font-bold mt-3">${game.titolo}</h2>
      <p class="text-sm text-slate-400">${game.categoria} · ${game.stato}</p>
      <div class="mt-4 w-full p-6 rounded-xl bg-slate-950 border border-slate-800 text-center text-slate-400 text-sm">
        Area di gioco placeholder per <strong>${game.id}</strong>.<br/>Integra qui il tuo minigioco.
      </div>
    </article>`;
  showView('game');
}

function showView(name) {
  viewHome.classList.toggle('hidden', name !== 'home');
  viewGame.classList.toggle('hidden', name !== 'game');
  view404.classList.toggle('hidden', name !== '404');
}

// --- Router SPA minimale ---
function router() {
  const hash = window.location.hash || '#/';
  const gameMatch = hash.match(/^#\/game\/([\w-]+)$/);

  if (hash === '#/' || hash === '#/games') {
    showView('home');
  } else if (gameMatch) {
    renderDetail(gameMatch[1]);
  } else {
    showView('404');
  }
  window.scrollTo({ top: 0 });
}

async function loadGames() {
  try {
    const res = await fetch('games.json');
    if (!res.ok) throw new Error('HTTP ' + res.status);
    games = await res.json();
  } catch (err) {
    console.error('Errore caricamento games.json:', err);
    games = [];
  }
  renderList();
  router();
}

backBtn.addEventListener('click', () => {
  window.location.hash = '#/';
});

window.addEventListener('hashchange', router);

document.addEventListener('DOMContentLoaded', loadGames);
