// "Solutions" page: the 3D Innovation Lab and the Save Symphonia Bay strategy game, from the team's presentation.
import { lang } from './i18n.js';

const L = pair => pair[lang === 'el' ? 0 : 1];
const $ = s => document.querySelector(s);
const icon = name => `<svg class="i" aria-hidden="true"><use href="#i-${name}"/></svg>`;

// ---------- 3D Innovation Lab ----------

// Colours follow the presentation slides: each step, prototype, role and indicator keeps its slide colour.
const CYCLE = [
  { id: 'design', name: ['Σχεδιάζουμε', 'Design'], c: 'blue' },
  { id: 'build', name: ['Κατασκευάζουμε', 'Build'], c: 'green' },
  { id: 'test', name: ['Δοκιμάζουμε', 'Test'], c: 'orange' },
  { id: 'measure', name: ['Μετράμε', 'Measure'], c: 'red' },
  { id: 'improve', name: ['Βελτιώνουμε', 'Improve'], c: 'purple' },
];
const both = pair => lang === 'el' ? `<b>${pair[1]}</b><span>${pair[0]}</span>` : `<b>${pair[1]}</b>`; // slide style: English name, Greek under it
const PROTOTYPES = [
  { id: 'river-gate', c: 'blue', name: ['Έξυπνο Φράγμα Ποταμού', 'Smart River Gate'],
    does: ['Συγκρατεί τα απορρίμματα πριν φτάσουν στη θάλασσα.', 'Holds back litter before it reaches the sea.'],
    make: ['Στο Tinkercad: ένα πλαίσιο από κύβους και μια σχάρα με κάθετες ράβδους. Το νερό περνά, τα πλαστικά μένουν πίσω.', 'In Tinkercad: a frame of boxes and a grille of upright bars. Water flows through, plastics stay behind.'],
    test: ['Δοκιμή: σε ένα κανάλι με νερό, μετρήστε πόσα από 20 κομματάκια συγκρατεί.', 'Test: in a channel of water, count how many of 20 small pieces it holds back.'] },
  { id: 'waste-collector', c: 'green', name: ['Πλωτός Συλλέκτης Απορριμμάτων', 'Floating Waste Collector'],
    does: ['Συλλέγει απορρίμματα από την επιφάνεια της θάλασσας.', 'Collects litter from the surface of the sea.'],
    make: ['Στο Tinkercad: δύο κύλινδροι για πλωτήρες και ανάμεσά τους ένα καλάθι με τρύπες.', 'In Tinkercad: two cylinders as floats, with a basket full of holes between them.'],
    test: ['Δοκιμή: σε μια λεκάνη με νερό, μετρήστε πόσα κομματάκια μαζεύει σε ένα λεπτό.', 'Test: in a basin of water, count how many pieces it collects in one minute.'] },
  { id: 'coastal-station', c: 'orange', name: ['Έξυπνος Παράκτιος Σταθμός', 'Smart Coastal Station'],
    does: ['Κάνει περιβαλλοντικές μετρήσεις στην ακτή.', 'Takes environmental measurements on the shore.'],
    make: ['Στο Tinkercad: ένα αδιάβροχο κουτί για micro:bit ή Arduino, με στήριγμα για ηλιακό πάνελ και αισθητήρες.', 'In Tinkercad: a waterproof box for a micro:bit or Arduino, with a mount for a solar panel and sensors.'],
    test: ['Δοκιμή: συγκρίνετε τις μετρήσεις του με ένα θερμόμετρο και καταγράψτε τες στην εφαρμογή.', 'Test: compare its readings with a thermometer and record them in the app.'] },
  { id: 'sand-sieve', c: 'purple', name: ['Κόσκινο Μικροπλαστικών', 'Microplastic Sand Sieve'],
    does: ['Ξεχωρίζει τα μικροπλαστικά από την άμμο της παραλίας.', 'Separates microplastics from beach sand.'],
    make: ['Στο Tinkercad: ένα τετράγωνο πλαίσιο με λαβές και πάτο από πλέγμα με τρύπες 1 έως 5 mm.', 'In Tinkercad: a square frame with handles and a mesh bottom with 1 to 5 mm holes.'],
    test: ['Δοκιμή: κοσκινίστε ένα κουβαδάκι άμμο και μετρήστε τα κομμάτια που μένουν πάνω στο πλέγμα.', 'Test: sieve one small bucket of sand and count the pieces left on the mesh.'] },
  { id: 'reef-module', c: 'pink', name: ['Τεχνητός Ύφαλος', 'Artificial Reef Module'],
    does: ['Δίνει καταφύγιο στα ψάρια και επιφάνεια για να μεγαλώσει θαλάσσια ζωή.', 'Gives fish shelter and a surface for sea life to grow on.'],
    make: ['Στο Tinkercad: εξάγωνα κομμάτια με στρογγυλές τρύπες που στοιβάζονται. Το τελικό φτιάχνεται από πηλό ή τσιμέντο, όχι από πλαστικό.', 'In Tinkercad: hexagonal pieces with round holes that stack. The final one is made of clay or concrete, not plastic.'],
    test: ['Δοκιμή: σε ένα ενυδρείο, ελέγξτε ότι στέκεται σταθερά και ότι το νερό περνά από όλες τις τρύπες.', 'Test: in an aquarium, check that it stands steady and that water flows through every hole.'] },
  { id: 'turtle-guard', c: 'green', name: ['Προστατευτικό Φωλιάς Χελώνας', 'Turtle Nest Guard'],
    does: ['Προστατεύει τα αυγά της Caretta caretta από ποδοπάτημα και ζώα.', 'Protects loggerhead turtle eggs from trampling and animals.'],
    make: ['Στο Tinkercad: ένας θόλος από πλέγμα, με ανοίγματα αρκετά μεγάλα για να βγουν τα χελωνάκια, και μια πινακίδα.', 'In Tinkercad: a mesh dome with gaps big enough for the hatchlings to get out, and a sign.'],
    test: ['Δοκιμή: ελέγξτε ότι ένα αντικείμενο 5 cm, όσο ένα χελωνάκι, περνά από τα ανοίγματα. Τις πραγματικές φωλιές τις προστατεύουν μόνο εθελοντές με άδεια.', 'Test: check that a 5 cm object, the size of a hatchling, passes through the gaps. Real nests are protected only by licensed volunteers.'] },
  { id: 'recycling-bin', c: 'blue', name: ['Έξυπνος Κάδος Ανακύκλωσης', 'Smart Recycling Bin'],
    does: ['Μετρά τι ανακυκλώνει το σχολείο και το δείχνει σε οθόνη LED.', 'Counts what the school recycles and shows it on an LED display.'],
    make: ['Στο Tinkercad: τρεις θήκες με χρωματιστά καπάκια και μια βάση για micro:bit στο μπροστινό μέρος.', 'In Tinkercad: three compartments with coloured lids and a micro:bit holder on the front.'],
    test: ['Δοκιμή: για μία εβδομάδα, συγκρίνετε τον μετρητή του micro:bit με μέτρημα στο χέρι.', 'Test: for one week, compare the micro:bit count with a count by hand.'] },
  { id: 'oil-boom', c: 'orange', name: ['Πλωτό Φράγμα Πετρελαίου', 'Oil Containment Boom'],
    does: ['Περικλείει μια πετρελαιοκηλίδα ώστε να μην απλωθεί.', 'Surrounds an oil spill so it cannot spread.'],
    make: ['Στο Tinkercad: πλωτήρες στη σειρά, ενωμένοι με αρθρώσεις ώστε να σχηματίζουν κύκλο.', 'In Tinkercad: a row of floats joined with hinges so they can form a ring.'],
    test: ['Δοκιμή: σε μια λεκάνη, ρίξτε λίγο μαγειρικό λάδι μέσα στον κύκλο, κάντε κύματα και δείτε αν μένει μέσα.', 'Test: in a basin, pour a little cooking oil inside the ring, make waves and see if it stays inside.'] },
  { id: 'drain-filter', c: 'purple', name: ['Φίλτρο Φρεατίου', 'Storm Drain Filter'],
    does: ['Πιάνει τα σκουπίδια του δρόμου πριν η βροχή τα πάει στη θάλασσα.', 'Catches street litter before the rain carries it to the sea.'],
    make: ['Στο Tinkercad: ένα καλάθι από πλέγμα που χωρά κάτω από τη σχάρα του φρεατίου και βγαίνει για άδειασμα.', 'In Tinkercad: a mesh basket that fits under the drain grate and lifts out for emptying.'],
    test: ['Δοκιμή: ρίξτε νερό με φύλλα και καπάκια στη σχάρα και μετρήστε πόσα κράτησε το καλάθι.', 'Test: pour water with leaves and bottle caps through the grate and count how many the basket kept.'] },
  { id: 'smart-buoy', c: 'red', name: ['Έξυπνη Σημαδούρα', 'Smart Buoy'],
    does: ['Μετρά τη θερμοκρασία και τη θολότητα του νερού στη θάλασσα και στέλνει τα δεδομένα.', 'Measures water temperature and cloudiness at sea and sends the data.'],
    make: ['Στο Tinkercad: ένα αδιάβροχο σώμα σημαδούρας με θήκη για micro:bit, μικρό ηλιακό πάνελ και κεραία.', 'In Tinkercad: a waterproof buoy body with a micro:bit holder, a small solar panel and an antenna.'],
    test: ['Δοκιμή: αφήστε τη να επιπλέει μία ώρα σε μια λεκάνη. Μένει όρθια; Μπαίνει νερό μέσα;', 'Test: leave it floating for an hour in a basin. Does it stay upright? Does water get in?'] },
  { id: 'fish-camera', c: 'blue', name: ['Υποβρύχια Κάμερα Ψαριών', 'Underwater Fish Camera'],
    does: ['Τραβά φωτογραφίες ψαριών για να τις αναγνωρίσει η BlueVision AI.', 'Takes photos of fish for BlueVision AI to identify.'],
    make: ['Στο Tinkercad: ένα αδιάβροχο κουτί με διάφανο παράθυρο για την κάμερα, πάνω σε τρίποδο που βαραίνει με πέτρες.', 'In Tinkercad: a waterproof box with a clear window for the camera, on a tripod weighed down with stones.'],
    test: ['Δοκιμή: σε ένα ενυδρείο, μετρήστε πόσες από 10 φωτογραφίες είναι αρκετά καθαρές για την AI.', 'Test: in an aquarium, count how many of 10 photos are clear enough for the AI.'] },
  { id: 'eco-mooring', c: 'green', name: ['Οικολογική Αγκυροβόληση', 'Eco Mooring'],
    does: ['Δένει τα σκάφη χωρίς οι άγκυρες να ξεριζώνουν την Ποσειδωνία.', 'Moors boats without anchors tearing up the seagrass.'],
    make: ['Στο Tinkercad: μια βίδα με έλικα που μπαίνει στην άμμο, με κρίκο για το σχοινί της σημαδούρας.', 'In Tinkercad: a helical screw that twists into the sand, with a ring for the buoy rope.'],
    test: ['Δοκιμή: βιδώστε τη σε ένα κουτί με άμμο και μετρήστε με δυναμόμετρο πόση δύναμη χρειάζεται για να βγει.', 'Test: screw it into a box of sand and measure with a spring scale how much force it takes to pull out.'] },
];

// Progress per prototype: how many cycle steps are done, and which version this is. Kept in this browser only.
let lab = {};
try { lab = JSON.parse(localStorage.lab ?? '{}'); } catch {}
const saveLab = () => { try { localStorage.lab = JSON.stringify(lab); } catch {} };

export function renderLab() {
  const box = $('#lab-view');
  box.innerHTML = `
    <div class="card lab-hero">
      <img src="img/lab-team.jpg" alt="">
      <div>
        <h2>3D Innovation Lab${L(['<small>Εργαστήριο Τρισδιάστατης Καινοτομίας</small>', ''])}</h2>
        <p>${L(['Δεν θέλουμε το BlueGuardian AI απλώς να μας δείχνει ότι υπάρχει ένα πρόβλημα. Θέλουμε τα δεδομένα να μας οδηγούν και σε πιθανές λύσεις. Γι’ αυτό στο <b>3D Innovation Lab</b> σχεδιάζουμε <b>prototypes</b>, δηλαδή πρωτότυπες κατασκευές.',
          'We don\'t want BlueGuardian AI to only show us that there is a problem. We want the data to lead us to possible solutions too. That is why in the <b>3D Innovation Lab</b> we design <b>prototypes</b>.'])}</p>
        <p class="hint">${L(['Χρησιμοποιούμε εργαλεία όπως το Tinkercad και 3D εκτυπωτές για να σχεδιάσουμε και να κατασκευάσουμε τις ιδέες μας.', 'We use tools like Tinkercad and 3D printers to design and build our ideas.'])}</p>
        <a class="btn primary" href="https://www.tinkercad.com/" target="_blank" rel="noopener">${L(['Άνοιγμα Tinkercad', 'Open Tinkercad'])}${icon('arrow')}</a>
      </div>
    </div>
    <div class="protos">${PROTOTYPES.map(p => {
      const s = lab[p.id] ?? { done: 0, version: 1 };
      return `<article class="card proto" style="--c:var(--c-${p.c})">
        <header>${both(p.name)}${s.version > 1 ? `<small>v${s.version}</small>` : ''}</header>
        <img src="img/lab-${p.id}.jpg" alt="" loading="lazy">
        <p class="does">${L(p.does)}</p>
        <p class="hint">${L(p.make)}</p>
        <p class="hint">${L(p.test)}</p>
        <div class="progress" role="group" aria-label="${L(['Πρόοδος', 'Progress'])}">${CYCLE.map((c, i) =>
          `<button class="${i < s.done ? 'done' : i === s.done ? 'next' : ''}" style="--c:var(--c-${c.c})" data-proto="${p.id}" data-step="${i}" aria-pressed="${i < s.done}" title="${L(c.name)}" aria-label="${L(c.name)}"><img src="img/cy-${c.id}.png" alt=""></button>`).join('')}</div>
        ${s.done === CYCLE.length ? `<button class="btn" data-again="${p.id}">${L(['Νέα έκδοση, νέος κύκλος', 'New version, new cycle'])}</button>` : ''}
      </article>`;
    }).join('')}</div>
    <div class="card cycle-card">
      <h3 class="pill">${L(['Ακολουθούμε έναν κύκλο:', 'We follow a cycle:'])}</h3>
      <ol class="cycle">${CYCLE.map(c => `<li style="--c:var(--c-${c.c})"><img src="img/cy-${c.id}.png" alt="">${both(c.name)}</li>`).join('')}</ol>
      <div class="cycle-foot">
        <p class="loop">${icon('refresh')}<span>${L(['Και αν η πρώτη μας ιδέα δεν λειτουργήσει; <b>Τη βελτιώνουμε και ξαναδοκιμάζουμε.</b>', 'And if our first idea doesn\'t work? <b>We improve it and test again.</b>'])}</span></p>
        <figure class="kid"><img src="img/lab-kid.jpg" alt=""><figcaption>${L(['Νέες ιδέες για πιο καθαρές θάλασσες!', 'New ideas for cleaner seas!'])}</figcaption></figure>
      </div>
    </div>`;
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
  ['ocean', ['Υγεία Θάλασσας', 'Ocean Health'], 'blue'],
  ['bio', ['Βιοποικιλότητα', 'Biodiversity'], 'green'],
  ['community', ['Κοινότητα', 'Community'], 'pink'],
  ['economy', ['Γαλάζια Οικονομία', 'Blue Economy'], 'orange'],
];
// Each role argues for the option that scores best by its own priorities, so the team doesn't always agree.
const ROLES = [
  { name: ['Θαλάσσιος Επιστήμονας', 'Marine Scientist'], n: 1, c: 'blue', why: ['Προστατεύει τη θάλασσα και τη ζωή της.', 'Protects the sea and its life.'],
    score: (fx, cost) => 2 * (fx.ocean ?? 0) + 2 * (fx.bio ?? 0) - cost * .2 },
  { name: ['Ειδικός AI και Δεδομένων', 'AI & Data Specialist'], n: 2, c: 'purple', why: ['Κοιτάζει το συνολικό αποτέλεσμα στα δεδομένα.', 'Looks at the overall result in the data.'],
    score: (fx, cost) => sum(fx) - cost * .3 },
  { name: ['Υπεύθυνος Λήψης Αποφάσεων', 'Decision Maker'], n: 3, c: 'green', why: ['Προσέχει τον προϋπολογισμό και τον πιο αδύναμο δείκτη.', 'Watches the budget and the weakest indicator.'],
    score: (fx, cost, m) => 3 * (fx[weakest(m)] ?? 0) + sum(fx) - cost * .8 },
  { name: ['Εκπρόσωπος των Πολιτών', 'Citizens\' Representative'], n: 4, c: 'orange', why: ['Μιλά για τους κατοίκους και τις δουλειές τους.', 'Speaks for the residents and their jobs.'],
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
const coins = n => `${n} ${L(n === 1 ? ['νόμισμα', 'coin'] : ['νομίσματα', 'coins'])}`;
const fxChips = (fx, cost) => [
  cost ? `<span class="fx ${cost < 0 ? 'up' : 'coin'}">${cost < 0 ? '+' : '−'}${coins(Math.abs(cost))}</span>` : `<span class="fx">${L(['Δωρεάν', 'Free'])}</span>`,
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

const meters = () => `<div class="meters">${METERS.map(([k, name, c]) =>
  `<div class="meter${game.m[k] <= 2 ? ' low' : ''}" style="--c:var(--c-${c})"><span><img src="img/ind-${k}.png" alt="">${L(name)}</span><b>${game.m[k]}<small>/10</small></b><i style="--w:${game.m[k] * 10}%"></i></div>`).join('')}
  <div class="meter coins"><span><b class="euro">€</b>${L(['Πόροι', 'Resources'])}</span><b>${game.coins}<small> ${L(game.coins === 1 ? ['νόμισμα', 'coin'] : ['νομίσματα', 'coins'])}</small></b></div></div>`;

// The closing message of the slide, with the students around the board.
const agree = () => `<div class="callout agree" style="--c:var(--c-pink)"><span class="badge">!</span>
  <div><b>${L(['Και δεν συμφωνούμε πάντα!', 'And we don\'t always agree!'])}</b>
  <p>${L(['Έτσι καταλαβαίνουμε ότι <b>τα δεδομένα</b> μάς βοηθούν να αποφασίσουμε, αλλά <b>οι άνθρωποι</b> είναι αυτοί που τελικά παίρνουν τις αποφάσεις.', 'That is how we learn that <b>data</b> helps us decide, but in the end it is <b>people</b> who make the decisions.'])}</p></div>
  <img src="img/game-talk.jpg" alt=""></div>`;

export function renderGame() {
  const box = $('#game-view');
  if (!game) {
    box.innerHTML = `
      <div class="card game-hero">
        <img class="banner-art" src="img/game-banner.jpg" alt="Save Symphonia Bay">
        <p class="tagline">${L(['Ένα παιχνίδι στρατηγικής για καθαρότερες θάλασσες και πιο υγιείς κοινωνίες', 'A strategy game for cleaner seas and healthier communities'])}</p>
      </div>
      <p class="callout" style="--c:var(--c-blue)"><span class="badge">?</span><span>${L(['Όμως υπάρχει και ένα ακόμη ερώτημα. Ακόμη κι αν έχουμε όλα τα δεδομένα, <b>ποιος αποφασίζει τι πρέπει να κάνουμε;</b>', 'But there is one more question. Even when we have all the data, <b>who decides what we should do?</b>'])}</span></p>
      <div class="game-how">
        <ul class="deck" aria-label="${L(['Οι κάρτες γεγονότων', 'The event cards'])}">${EVENTS.map(e => `<li><img src="img/ev-${e.id}.jpg" alt="" loading="lazy">${L(e.title)}</li>`).join('')}</ul>
        <div class="card">
          <h3>${L(['Πώς παίζεται', 'How to play'])}</h3>
          <ul class="rules">
            <li>${L(['Παίζεται σε ομάδα, γύρω από μία οθόνη. Κάθε παίκτης παίρνει έναν ρόλο.', 'Play as a team around one screen. Each player takes a role.'])}</li>
            <li>${L(['8 γύροι. Σε κάθε γύρο τραβάτε μια κάρτα γεγονότος και διαλέγετε μία από δύο αποφάσεις.', '8 rounds. Each round you draw an event card and pick one of two decisions.'])}</li>
            <li>${L([`Οι πόροι είναι λίγοι: ξεκινάτε με ${START_COINS} νομίσματα και παίρνετε ${INCOME} σε κάθε γύρο.`, `Resources are scarce: you start with ${START_COINS} coins and get ${INCOME} each round.`])}</li>
            <li>${L(['Αν κάποιος δείκτης φτάσει στο 0, ο κόλπος χάνεται. Για να σωθεί, όλοι οι δείκτες πρέπει να τελειώσουν στο 5 ή πάνω.', 'If any indicator reaches 0, the bay is lost. To save it, every indicator must end at 5 or higher.'])}</li>
          </ul>
        </div>
      </div>
      <h3 class="sub">${L(['Σε αυτό αναλαμβάνουμε διαφορετικούς ρόλους:', 'In it we take on different roles:'])}</h3>
      <div class="roles">${ROLES.map(r => `<div class="role" style="--c:var(--c-${r.c})"><img src="img/role-${r.n}.jpg" alt=""><b>${L(r.name)}</b><small>${L(r.why)}</small></div>`).join('')}</div>
      <h3 class="sub">${L(['Έχουμε περιορισμένους πόρους και πρέπει να πάρουμε αποφάσεις που επηρεάζουν:', 'We have limited resources and must make decisions that affect:'])}</h3>
      <div class="inds">${METERS.map(([k, name, c]) => `<span style="--c:var(--c-${c})"><img src="img/ind-${k}.png" alt="">${L(name)}</span>`).join('')}</div>
      ${agree()}
      <div class="row"><button class="btn primary big" id="game-start">${L(['Έναρξη παιχνιδιού', 'Start the game'])}${icon('arrow')}</button></div>`;
    $('#game-start').onclick = startGame;
    return;
  }

  if (game.over) return renderEnd(box);

  const c = game.card, done = game.picked != null;
  const next = c.peek && game.deck[game.round + 1];
  const budget = done ? game.coins + c.options[game.picked].cost : game.coins; // advice as it stood before the pick
  const advice = ROLES.map(r => {
    const ok = c.options.map(o => o.cost <= budget);
    const s = c.options.map((o, i) => (ok[i] ? r.score(o.fx, o.cost, game.m) : -Infinity));
    return { r, i: s[1] > s[0] ? 1 : 0 };
  });
  box.innerHTML = `
    <p class="round">${L(['Γύρος', 'Round'])} ${game.round + 1} / ${game.deck.length}</p>
    ${meters()}
    <div class="card event">
      <img src="img/ev-${c.id}.jpg" alt="">
      <div><small class="pill">Event Card${L([' · Κάρτα γεγονότος', ''])}</small><h2>${L(c.title)}</h2><p>${L(c.text)}</p>
        ${Object.keys(c.hit).length ? `<div class="fxs">${METERS.filter(([k]) => c.hit[k]).map(([k, n]) => `<span class="fx down">−${-c.hit[k]} ${L(n)}</span>`).join('')}</div>` : ''}
        ${next ? `<p class="peek">${icon('globe')}${L(['Τα δεδομένα Copernicus δείχνουν και την επόμενη κάρτα:', 'Copernicus data also reveals the next card:'])} <b>${L(next.title)}</b></p>` : ''}</div>
    </div>
    <h3 class="sub">${L(['Τι προτείνει κάθε ρόλος', 'What each role suggests'])}</h3>
    <div class="roles compact">${advice.map(({ r, i }) => `<div class="role" style="--c:var(--c-${r.c})"><img src="img/role-${r.n}.jpg" alt=""><b>${L(r.name)}</b><small>${L(['Προτείνει', 'Suggests'])} <em class="opt">${letter(i)}</em></small></div>`).join('')}</div>
    ${new Set(advice.map(a => a.i)).size > 1 ? `<p class="callout small" style="--c:var(--c-pink)"><span class="badge">!</span><span>${L(['<b>Και δεν συμφωνούμε πάντα!</b> Συζητήστε και αποφασίστε μαζί.', '<b>And we don\'t always agree!</b> Talk it over and decide together.'])}</span></p>` : ''}
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
    </div>
    ${agree()}
    <div class="row"><button class="btn primary big" id="game-again">${L(['Νέο παιχνίδι', 'Play again'])}</button></div>`;
  $('#game-again').onclick = startGame;
}
