// "Solutions" page: the 3D Innovation Lab and the Save Symphonia Bay strategy game, from the team's presentation.
import { lang } from './i18n.js';

const L = pair => pair[lang === 'el' ? 0 : 1];
const $ = s => document.querySelector(s);
const icon = name => `<svg class="i" aria-hidden="true"><use href="#i-${name}"/></svg>`;

// ---------- 3D Innovation Lab ----------

const CYCLE = [['Σχεδιάζουμε', 'Design'], ['Κατασκευάζουμε', 'Build'], ['Δοκιμάζουμε', 'Test'], ['Μετράμε', 'Measure'], ['Βελτιώνουμε', 'Improve']];
const PROTOTYPES = [
  { id: 'river-gate', name: ['Έξυπνο Φράγμα Ποταμού', 'Smart River Gate'],
    does: ['Συγκρατεί τα απορρίμματα πριν φτάσουν στη θάλασσα.', 'Holds back litter before it reaches the sea.'],
    make: ['Στο Tinkercad: ένα πλαίσιο από κύβους και μια σχάρα με κάθετες ράβδους. Το νερό περνά, τα πλαστικά μένουν πίσω.', 'In Tinkercad: a frame of boxes and a grille of upright bars. Water flows through, plastics stay behind.'],
    test: ['Δοκιμή: σε ένα κανάλι με νερό, μετρήστε πόσα από 20 κομματάκια συγκρατεί.', 'Test: in a channel of water, count how many of 20 small pieces it holds back.'] },
  { id: 'waste-collector', name: ['Πλωτός Συλλέκτης Απορριμμάτων', 'Floating Waste Collector'],
    does: ['Συλλέγει απορρίμματα από την επιφάνεια της θάλασσας.', 'Collects litter from the surface of the sea.'],
    make: ['Στο Tinkercad: δύο κύλινδροι για πλωτήρες και ανάμεσά τους ένα καλάθι με τρύπες.', 'In Tinkercad: two cylinders as floats, with a basket full of holes between them.'],
    test: ['Δοκιμή: σε μια λεκάνη με νερό, μετρήστε πόσα κομματάκια μαζεύει σε ένα λεπτό.', 'Test: in a basin of water, count how many pieces it collects in one minute.'] },
  { id: 'coastal-station', name: ['Έξυπνος Παράκτιος Σταθμός', 'Smart Coastal Station'],
    does: ['Κάνει περιβαλλοντικές μετρήσεις στην ακτή.', 'Takes environmental measurements on the shore.'],
    make: ['Στο Tinkercad: ένα αδιάβροχο κουτί για micro:bit ή Arduino, με στήριγμα για ηλιακό πάνελ και αισθητήρες.', 'In Tinkercad: a waterproof box for a micro:bit or Arduino, with a mount for a solar panel and sensors.'],
    test: ['Δοκιμή: συγκρίνετε τις μετρήσεις του με ένα θερμόμετρο και καταγράψτε τες στην εφαρμογή.', 'Test: compare its readings with a thermometer and record them in the app.'] },
];

// Progress per prototype: how many cycle steps are done, and which version this is. Kept in this browser only.
let lab = {};
try { lab = JSON.parse(localStorage.lab ?? '{}'); } catch {}
const saveLab = () => { try { localStorage.lab = JSON.stringify(lab); } catch {} };

export function renderLab() {
  const box = $('#lab-view');
  box.innerHTML = `
    <div class="card lab-intro">
      <p>${L(['Δεν θέλουμε το BlueGuardian AI απλώς να δείχνει ότι υπάρχει πρόβλημα. Θέλουμε τα δεδομένα να μας οδηγούν σε λύσεις. Στο 3D Innovation Lab σχεδιάζουμε πρωτότυπες κατασκευές με το Tinkercad και τις φτιάχνουμε σε 3D εκτυπωτή.',
        'We don\'t want BlueGuardian AI to only show that there is a problem. We want the data to lead us to solutions. In the 3D Innovation Lab we design prototypes in Tinkercad and make them on a 3D printer.'])}</p>
      <a class="btn primary" href="https://www.tinkercad.com/" target="_blank" rel="noopener">${L(['Άνοιγμα Tinkercad', 'Open Tinkercad'])}${icon('arrow')}</a>
    </div>
    <ol class="cycle">${CYCLE.map(c => `<li>${L(c)}</li>`).join('')}</ol>
    <p class="hint cycle-note">${L(['Και αν η πρώτη ιδέα δεν λειτουργήσει; Τη βελτιώνουμε και ξαναδοκιμάζουμε.', 'And if the first idea doesn\'t work? We improve it and test again.'])}</p>
    <div class="protos">${PROTOTYPES.map(p => {
      const s = lab[p.id] ?? { done: 0, version: 1 };
      return `<article class="card proto">
        <img src="img/lab-${p.id}.jpg" alt="" loading="lazy">
        <h2>${L(p.name)}${s.version > 1 ? `<small>v${s.version}</small>` : ''}</h2>
        <p>${L(p.does)}</p>
        <p class="hint">${L(p.make)}</p>
        <p class="hint">${L(p.test)}</p>
        <div class="progress" role="group" aria-label="${L(['Πρόοδος', 'Progress'])}">${CYCLE.map((c, i) =>
          `<button class="${i < s.done ? 'done' : i === s.done ? 'next' : ''}" data-proto="${p.id}" data-step="${i}" aria-pressed="${i < s.done}">${L(c)}</button>`).join('')}</div>
        ${s.done === CYCLE.length ? `<button class="btn" data-again="${p.id}">${L(['Νέα έκδοση, νέος κύκλος', 'New version, new cycle'])}</button>` : ''}
      </article>`;
    }).join('')}</div>`;
  // Clicking a step marks everything up to it done; clicking the last done step undoes it.
  box.querySelectorAll('[data-step]').forEach(b => b.onclick = () => {
    const s = lab[b.dataset.proto] ??= { done: 0, version: 1 };
    const n = +b.dataset.step + 1;
    s.done = s.done === n ? n - 1 : n;
    saveLab();
    renderLab();
  });
  box.querySelectorAll('[data-again]').forEach(b => b.onclick = () => {
    const s = lab[b.dataset.again];
    s.done = 0;
    s.version++;
    saveLab();
    renderLab();
  });
}

// ---------- Save Symphonia Bay ----------

const METERS = [
  ['ocean', ['Υγεία Θάλασσας', 'Ocean Health'], 'droplet'],
  ['bio', ['Βιοποικιλότητα', 'Biodiversity'], 'pin'],
  ['community', ['Κοινότητα', 'Community'], 'users'],
  ['economy', ['Γαλάζια Οικονομία', 'Blue Economy'], 'sun'],
];
// Each role argues for the option that scores best by its own priorities, so the team doesn't always agree.
const ROLES = [
  { name: ['Θαλάσσιος Επιστήμονας', 'Marine Scientist'], icon: 'droplet', why: ['Προστατεύει τη θάλασσα και τη ζωή της.', 'Protects the sea and its life.'],
    score: (fx, cost) => 2 * (fx.ocean ?? 0) + 2 * (fx.bio ?? 0) - cost * .2 },
  { name: ['Ειδικός AI και Δεδομένων', 'AI & Data Specialist'], icon: 'scan', why: ['Κοιτάζει το συνολικό αποτέλεσμα στα δεδομένα.', 'Looks at the overall result in the data.'],
    score: (fx, cost) => sum(fx) - cost * .3 },
  { name: ['Υπεύθυνος Λήψης Αποφάσεων', 'Decision Maker'], icon: 'flag', why: ['Προσέχει τον προϋπολογισμό και τον πιο αδύναμο δείκτη.', 'Watches the budget and the weakest indicator.'],
    score: (fx, cost, m) => 3 * (fx[weakest(m)] ?? 0) + sum(fx) - cost * .8 },
  { name: ['Εκπρόσωπος των Πολιτών', 'Citizens\' Representative'], icon: 'users', why: ['Μιλά για τους κατοίκους και τις δουλειές τους.', 'Speaks for the residents and their jobs.'],
    score: (fx, cost) => 2 * (fx.community ?? 0) + 2 * (fx.economy ?? 0) - cost * .3 },
];
const letter = i => L([['Α', 'Β'][i], ['A', 'B'][i]]);
const sum = fx => Object.values(fx).reduce((a, b) => a + b, 0);
const weakest = m => METERS.map(([k]) => k).reduce((a, b) => (m[b] < m[a] ? b : a));

// The eight event cards of the board game. `hit` happens as the card is drawn; then the team picks one option.
// A negative cost is income (tourism, tours). Balance: every deck order can be won, about 1 in 15 choice paths do.
const EVENTS = [
  { id: 'plastic', title: ['Έκτακτη Εμφάνιση Πλαστικών', 'Plastic Surge'], hit: { ocean: -1 },
    text: ['Μετά από δυνατό αέρα, η ακτή γέμισε πλαστικά μπουκάλια και σακούλες.', 'After a strong wind, the shore is covered in plastic bottles and bags.'],
    options: [
      { text: ['Καθαρισμός με εθελοντές και τον Πλωτό Συλλέκτη', 'Clean-up with volunteers and the Floating Collector'], cost: 2, fx: { ocean: 2, community: 1 } },
      { text: ['Το αφήνουμε για αργότερα', 'Leave it for later'], cost: 0, fx: { bio: -1, economy: -1 } }] },
  { id: 'storm', title: ['Ακραία Καταιγίδα', 'Extreme Storm'], hit: { ocean: -1, economy: -1 },
    text: ['Η καταιγίδα φέρνει απορρίμματα από το ποτάμι και χαλάει την προβλήτα.', 'The storm washes litter down the river and damages the pier.'],
    options: [
      { text: ['Κατασκευή του Έξυπνου Φράγματος Ποταμού', 'Build the Smart River Gate'], cost: 3, fx: { ocean: 2, bio: 1 } },
      { text: ['Γρήγορη επισκευή μόνο της προβλήτας', 'Quick repair of the pier only'], cost: 1, fx: { economy: 1 } }] },
  { id: 'oil', title: ['Πετρελαιοκηλίδα', 'Oil Spill'], hit: { ocean: -2, bio: -1 },
    text: ['Ένα πλοίο έχασε καύσιμα κοντά στον κόλπο.', 'A ship has leaked fuel near the bay.'],
    options: [
      { text: ['Πλωτά φράγματα και ειδικό συνεργείο καθαρισμού', 'Floating booms and an expert clean-up crew'], cost: 3, fx: { ocean: 2, bio: 1, community: 1 } },
      { text: ['Αφήνουμε τη θάλασσα να το διαλύσει', 'Let the sea break it up'], cost: 0, fx: { bio: -1, economy: -1, community: -1 } }] },
  { id: 'turtle', title: ['Φωλιά Χελώνας', 'Turtle Nest'], hit: {},
    text: ['Μια θαλάσσια χελώνα Caretta caretta γέννησε στην πιο πολυσύχναστη παραλία.', 'A loggerhead sea turtle has laid eggs on the busiest beach.'],
    options: [
      { text: ['Προστατεύουμε τη φωλιά και κλείνουμε ένα κομμάτι της παραλίας', 'Protect the nest and close part of the beach'], cost: 1, fx: { bio: 2, economy: -1 } },
      { text: ['Η παραλία μένει ανοιχτή για όλους', 'Keep the beach open to everyone'], cost: 0, fx: { bio: -2, economy: 1 } }] },
  { id: 'tourists', title: ['Τουριστική Έξαρση', 'Tourist Boom'], hit: { ocean: -1 },
    text: ['Διπλάσιοι επισκέπτες φέτος: περισσότερα έσοδα, αλλά και περισσότερα σκουπίδια.', 'Twice the visitors this year: more income, but more litter too.'],
    options: [
      { text: ['Όριο επισκεπτών και κάδοι ανακύκλωσης', 'A visitor limit and recycling bins'], cost: 1, fx: { ocean: 1, bio: 1 } },
      { text: ['Καλωσορίζουμε όλους και εισπράττουμε τέλη', 'Welcome everyone and collect fees'], cost: -3, fx: { economy: 2, ocean: -1, bio: -1 } }] },
  { id: 'discovery', title: ['Ανακάλυψη Νέας Βιοποικιλότητας', 'New Biodiversity Found'], hit: {},
    text: ['Δύτες βρήκαν ένα σπάνιο λιβάδι Ποσειδωνίας γεμάτο ζωή.', 'Divers have found a rare seagrass meadow full of life.'],
    options: [
      { text: ['Θαλάσσια προστατευόμενη περιοχή', 'A marine protected area'], cost: 2, fx: { bio: 2, ocean: 1, economy: -1 } },
      { text: ['Οικοτουριστικές βόλτες με σκάφος', 'Eco-tourism boat tours'], cost: -2, fx: { economy: 2, community: 1, bio: -1 } }] },
  { id: 'copernicus', title: ['Ειδοποίηση Copernicus', 'Copernicus Alert'], hit: {}, peek: true,
    text: ['Οι δορυφόροι Copernicus δείχνουν ζεστά νερά και άνθιση φυκιών που πλησιάζει τον κόλπο.', 'Copernicus satellites show warm water and an algae bloom heading for the bay.'],
    options: [
      { text: ['Δρούμε νωρίς: Έξυπνος Παράκτιος Σταθμός και λιγότερα λύματα', 'Act early: a Smart Coastal Station and less runoff'], cost: 2, fx: { ocean: 1, bio: 1 } },
      { text: ['Περιμένουμε να δούμε τι θα γίνει', 'Wait and see'], cost: 0, fx: { ocean: -2, bio: -1 } }] },
  { id: 'ai-error', title: ['Σφάλμα Τεχνητής Νοημοσύνης', 'AI Error'], hit: {},
    text: ['Η BlueVision AI πέρασε πλαστικά για φυσικά υλικά και η παραλία φαίνεται καθαρή ενώ δεν είναι.', 'BlueVision AI took plastics for natural materials, so the beach looks clean when it isn\'t.'],
    options: [
      { text: ['Οι μαθητές ελέγχουν και διορθώνουν τις φωτογραφίες', 'Students check and correct the photos'], cost: 1, fx: { community: 1, ocean: 1 } },
      { text: ['Εμπιστευόμαστε την AI', 'Trust the AI'], cost: 0, fx: { ocean: -2, community: -1 } }] },
];

const START_COINS = 4, INCOME = 1;
let game = null; // null: start screen

const clamp = v => Math.max(0, Math.min(10, v));
const apply = fx => { for (const k in fx) game.m[k] = clamp(game.m[k] + fx[k]); };
const lost = () => METERS.some(([k]) => game.m[k] <= 0);
const shuffle = a => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const fxChips = (fx, cost) => [
  cost ? `<span class="fx ${cost < 0 ? 'up' : 'coin'}">${cost < 0 ? '+' : '−'}${Math.abs(cost)} ${L(['νομίσματα', 'coins'])}</span>` : `<span class="fx">${L(['Δωρεάν', 'Free'])}</span>`,
  ...METERS.filter(([k]) => fx[k]).map(([k, name]) => `<span class="fx ${fx[k] > 0 ? 'up' : 'down'}">${fx[k] > 0 ? '+' : '−'}${Math.abs(fx[k])} ${L(name)}</span>`),
].join('');

function startGame() {
  game = { deck: shuffle([...EVENTS]), round: 0, coins: START_COINS, m: { ocean: 5, bio: 5, community: 5, economy: 5 }, log: [] };
  drawCard();
}
function drawCard() {
  if (game.round) game.coins += INCOME;
  game.card = game.deck[game.round];
  game.picked = null;
  apply(game.card.hit);
  game.over = lost();
  renderGame();
}
function choose(i) {
  const o = game.card.options[i];
  game.picked = i;
  game.coins -= o.cost;
  apply(o.fx);
  game.log.push({ card: game.card, i });
  game.over = lost() || game.round === game.deck.length - 1;
  renderGame();
}

const meters = () => `<div class="meters">${METERS.map(([k, name, ic]) =>
  `<div class="meter${game.m[k] <= 2 ? ' low' : ''}"><span>${icon(ic)}${L(name)}</span><b>${game.m[k]}<small>/10</small></b><i style="--w:${game.m[k] * 10}%"></i></div>`).join('')}
  <div class="meter coins"><span>${L(['Πόροι', 'Resources'])}</span><b>${game.coins}<small> ${L(['νομ.', 'coins'])}</small></b></div></div>`;

export function renderGame() {
  const box = $('#game-view');
  if (!game) {
    box.innerHTML = `
      <div class="card game-intro">
        <h2>Save Symphonia Bay${L([' · Σώστε τον Κόλπο της Symphonia', ''])}</h2>
        <p>${L(['Ένα παιχνίδι στρατηγικής για καθαρότερες θάλασσες και πιο υγιείς κοινωνίες. Ακόμη κι αν έχουμε όλα τα δεδομένα, ποιος αποφασίζει τι πρέπει να κάνουμε;',
          'A strategy game for cleaner seas and healthier communities. Even when we have all the data, who decides what we should do?'])}</p>
        <ul class="rules">
          <li>${L(['Παίζεται σε ομάδα, γύρω από μία οθόνη. Κάθε παίκτης παίρνει έναν ρόλο.', 'Play as a team around one screen. Each player takes a role.'])}</li>
          <li>${L(['8 γύροι. Σε κάθε γύρο τραβάτε μια κάρτα γεγονότος και διαλέγετε μία από δύο αποφάσεις.', '8 rounds. Each round you draw an event card and pick one of two decisions.'])}</li>
          <li>${L([`Οι πόροι είναι λίγοι: ξεκινάτε με ${START_COINS} νομίσματα και παίρνετε ${INCOME} σε κάθε γύρο.`, `Resources are scarce: you start with ${START_COINS} coins and get ${INCOME} each round.`])}</li>
          <li>${L(['Αν κάποιος δείκτης φτάσει στο 0, ο κόλπος χάνεται. Για να σωθεί, όλοι οι δείκτες πρέπει να τελειώσουν στο 5 ή πάνω.', 'If any indicator reaches 0, the bay is lost. To save it, every indicator must end at 5 or higher.'])}</li>
        </ul>
        <div class="roles">${ROLES.map(r => `<div class="role">${icon(r.icon)}<b>${L(r.name)}</b><small>${L(r.why)}</small></div>`).join('')}</div>
        <div class="row"><button class="btn primary" id="game-start">${L(['Έναρξη παιχνιδιού', 'Start the game'])}${icon('arrow')}</button></div>
      </div>`;
    $('#game-start').onclick = startGame;
    return;
  }

  if (game.over) return renderEnd(box);

  const c = game.card, done = game.picked != null;
  const next = c.peek && game.deck[game.round + 1];
  const coins = done ? game.coins + c.options[game.picked].cost : game.coins; // advice as it stood before the pick
  const advice = ROLES.map(r => {
    const ok = c.options.map(o => o.cost <= coins);
    const s = c.options.map((o, i) => (ok[i] ? r.score(o.fx, o.cost, game.m) : -Infinity));
    return { r, i: s[1] > s[0] ? 1 : 0 };
  });
  box.innerHTML = `
    <p class="round">${L(['Γύρος', 'Round'])} ${game.round + 1} / ${game.deck.length}</p>
    ${meters()}
    <div class="card event">
      <img src="img/ev-${c.id}.jpg" alt="">
      <div><small>${L(['Κάρτα γεγονότος', 'Event card'])}</small><h2>${L(c.title)}</h2><p>${L(c.text)}</p>
        ${Object.keys(c.hit).length ? `<div class="fxs">${METERS.filter(([k]) => c.hit[k]).map(([k, n]) => `<span class="fx down">−${-c.hit[k]} ${L(n)}</span>`).join('')}</div>` : ''}
        ${next ? `<p class="peek">${icon('globe')}${L(['Τα δεδομένα Copernicus δείχνουν και την επόμενη κάρτα:', 'Copernicus data also reveals the next card:'])} <b>${L(next.title)}</b></p>` : ''}</div>
    </div>
    <h3 class="sub">${L(['Τι προτείνει κάθε ρόλος', 'What each role suggests'])}</h3>
    <div class="roles">${advice.map(a => `<div class="role pick-${a.i}">${icon(a.r.icon)}<b>${L(a.r.name)}</b><small>${L(['Προτείνει', 'Suggests'])} ${letter(a.i)}</small></div>`).join('')}</div>
    <h3 class="sub">${L(['Η απόφασή σας', 'Your decision'])}</h3>
    <div class="choices">${c.options.map((o, i) => `
      <button class="choice${done && game.picked === i ? ' picked' : ''}" data-choice="${i}" ${done || o.cost > game.coins ? 'disabled' : ''}>
        <b><em>${letter(i)}</em>${L(o.text)}</b>
        <span class="fxs">${fxChips(o.fx, o.cost)}</span>
        ${o.cost > game.coins && !done ? `<small>${L(['Δεν φτάνουν οι πόροι', 'Not enough resources'])}</small>` : ''}
      </button>`).join('')}</div>
    ${done ? `<div class="row"><button class="btn primary" id="game-next">${L(['Επόμενος γύρος', 'Next round'])}${icon('arrow')}</button></div>` : ''}`;
  box.querySelectorAll('[data-choice]').forEach(b => b.onclick = () => choose(+b.dataset.choice));
  if (done) $('#game-next').onclick = () => { game.round++; drawCard(); };
}

function renderEnd(box) {
  const saved = !lost() && METERS.every(([k]) => game.m[k] >= 5);
  const result = lost()
    ? [L(['Ο κόλπος χάθηκε', 'The bay was lost']), L([`Ο δείκτης «${L(METERS.find(([k]) => game.m[k] <= 0)[1])}» έφτασε στο 0.`, `"${L(METERS.find(([k]) => game.m[k] <= 0)[1])}" reached 0.`]), 'bad']
    : saved
      ? [L(['Σώσατε τον Κόλπο της Symphonia!', 'You saved Symphonia Bay!']), L(['Όλοι οι δείκτες τελείωσαν στο 5 ή πάνω.', 'Every indicator ended at 5 or higher.']), 'good']
      : [L(['Ο κόλπος σώθηκε εν μέρει', 'The bay was partly saved']), L(['Κανένας δείκτης δεν χάθηκε, αλλά κάποιοι έμειναν κάτω από το 5.', 'No indicator was lost, but some stayed below 5.']), 'warm'];
  const score = METERS.reduce((n, [k]) => n + game.m[k], 0);
  box.innerHTML = `
    <div class="card end ${result[2]}">
      <h2>${result[0]}</h2><p>${result[1]}</p>
      <p class="score">${L(['Βαθμολογία', 'Score'])} <b>${score}</b> / 40</p>
    </div>
    ${meters()}
    <div class="card">
      <h2>${L(['Οι αποφάσεις σας', 'Your decisions'])}</h2>
      <ol class="log">${game.log.map(e => `<li><b>${L(e.card.title)}</b> · ${L(e.card.options[e.i].text)}</li>`).join('')}</ol>
      <p class="hint">${L(['Τα δεδομένα μάς βοηθούν να αποφασίσουμε, αλλά οι άνθρωποι είναι αυτοί που τελικά παίρνουν τις αποφάσεις.', 'Data helps us decide, but in the end it is people who make the decisions.'])}</p>
      <div class="row"><button class="btn primary" id="game-again">${L(['Νέο παιχνίδι', 'Play again'])}</button></div>
    </div>`;
  $('#game-again').onclick = startGame;
}
