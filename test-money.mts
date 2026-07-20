// GENERATED from the source sheet (rows 149 and 196) -- do not hand-edit inputs.
// Every non-ASCII char is written as \uXXXX because the thousands separators are
// Unicode spaces (U+00A0, U+2009); hand-typed ASCII approximations hide the bug.
// Run: node -e "require('esbuild').build({entryPoints:['test-money.mts'],bundle:true,platform:'node',format:'esm',outfile:'t.mjs',resolveExtensions:['.ts','.mts','.js','.mjs'],external:['node:*']})" && node t.mjs
import { processLine } from './src/builder.ts';

const wrapped = (inner: string) =>
  ['<span class="not-configured_{{maxWinnings}}">', `                ${inner}`, '            </span>'].join('\n');

type Case = { name: string; input: string; expected: string };

// Max-win statements: templatized, placeholder brackets consumed.
const maxWin: Case[] = [
  { name: 'en (comma)',
    input: "The maximum win for this game is 3,000x the players bet.",
    expected: wrapped("The maximum win for this game is {{maxWinnings}}x the players bet.") },
  { name: 'col1 (comma)',
    input: "The maximum win for this game is 3,000x the players play level.",
    expected: wrapped("The maximum win for this game is {{maxWinnings}}x the players play level.") },
  { name: 'el (period)',
    input: "\u0397 \u03bc\u03ad\u03b3\u03b9\u03c3\u03c4\u03b7 \u03bd\u03af\u03ba\u03b7 \u03c3\u03b5 \u03b1\u03c5\u03c4\u03cc \u03c4\u03bf \u03c0\u03b1\u03b9\u03c7\u03bd\u03af\u03b4\u03b9 \u03b5\u03af\u03bd\u03b1\u03b9 3.000 \u03c6\u03bf\u03c1\u03ad\u03c2 \u03c4\u03bf \u03c0\u03bf\u03bd\u03c4\u03ac\u03c1\u03b9\u03c3\u03bc\u03b1 \u03c4\u03bf\u03c5 \u03c0\u03b1\u03af\u03ba\u03c4\u03b7.",
    expected: wrapped("\u0397 \u03bc\u03ad\u03b3\u03b9\u03c3\u03c4\u03b7 \u03bd\u03af\u03ba\u03b7 \u03c3\u03b5 \u03b1\u03c5\u03c4\u03cc \u03c4\u03bf \u03c0\u03b1\u03b9\u03c7\u03bd\u03af\u03b4\u03b9 \u03b5\u03af\u03bd\u03b1\u03b9 {{maxWinnings}} \u03c6\u03bf\u03c1\u03ad\u03c2 \u03c4\u03bf \u03c0\u03bf\u03bd\u03c4\u03ac\u03c1\u03b9\u03c3\u03bc\u03b1 \u03c4\u03bf\u03c5 \u03c0\u03b1\u03af\u03ba\u03c4\u03b7.") },
  { name: 'es (period)',
    input: "El premio m\u00e1s alto de este juego es [3.000]x la apuesta del jugador.",
    expected: wrapped("El premio m\u00e1s alto de este juego es {{maxWinnings}}x la apuesta del jugador.") },
  { name: 'fr-ca (thin space U+2009)',
    input: "Le gain maximum qui peut \u00eatre r\u00e9alis\u00e9 dans ce jeu est de [10\u2009000]\u00a0fois la mise du joueur.",
    expected: wrapped("Le gain maximum qui peut \u00eatre r\u00e9alis\u00e9 dans ce jeu est de {{maxWinnings}}\u00a0fois la mise du joueur.") },
  { name: 'fr (comma)',
    input: "Le gain maximum pour ce jeu est de [3,000]\u00a0fois la mise du joueur.",
    expected: wrapped("Le gain maximum pour ce jeu est de {{maxWinnings}}\u00a0fois la mise du joueur.") },
  { name: 'it (period)',
    input: "La vincita massima per questo gioco \u00e8 pari a 3.000x la puntata del giocatore.",
    expected: wrapped("La vincita massima per questo gioco \u00e8 pari a {{maxWinnings}}x la puntata del giocatore.") },
  { name: 'nl (period)',
    input: "De maximale winst voor dit spel is 3.000x de inzet.",
    expected: wrapped("De maximale winst voor dit spel is {{maxWinnings}}x de inzet.") },
  { name: 'pt-br (period)',
    input: "O ganho m\u00e1ximo para este jogo \u00e9 [3.000]x a aposta do jogador.",
    expected: wrapped("O ganho m\u00e1ximo para este jogo \u00e9 {{maxWinnings}}x a aposta do jogador.") },
  { name: 'pt-pt (ascii space)',
    input: "O ganho m\u00e1ximo deste jogo \u00e9 [10 000]x a aposta do jogador.",
    expected: wrapped("O ganho m\u00e1ximo deste jogo \u00e9 {{maxWinnings}}x a aposta do jogador.") },
  { name: 'sv (no-break space U+00A0)',
    input: "Den maximala vinsten f\u00f6r det h\u00e4r spelet \u00e4r [3\u00a0000]x spelarens insats.",
    expected: wrapped("Den maximala vinsten f\u00f6r det h\u00e4r spelet \u00e4r {{maxWinnings}}x spelarens insats.") },
];

// Jackpot multiplier lists: must stay literal (the case commit 4425d97 protected).
const jackpot: Case[] = [
  { name: 'en jackpot list',
    input: "The jackpot values are 25x, 50x, 100x, 200x & 1000x the players regular bet.",
    expected: "The jackpot values are 25x, 50x, 100x, 200x &amp; 1000x the players regular bet." },
  { name: 'col1 jackpot list',
    input: "The jackpot values are 25x, 50x, 100x, 200x & 1000x the players regular play level.",
    expected: "The jackpot values are 25x, 50x, 100x, 200x &amp; 1000x the players regular play level." },
  { name: 'el jackpot list',
    input: "\u039f\u03b9 \u03b1\u03be\u03af\u03b5\u03c2 \u03c4\u03b6\u03ac\u03ba\u03c0\u03bf\u03c4 \u03b5\u03af\u03bd\u03b1\u03b9 25x, 50x, 100x, 200x \u03ba\u03b1\u03b9 1000x \u03c4\u03bf \u03ba\u03b1\u03bd\u03bf\u03bd\u03b9\u03ba\u03cc \u03c0\u03bf\u03bd\u03c4\u03ac\u03c1\u03b9\u03c3\u03bc\u03b1 \u03c4\u03c9\u03bd \u03c0\u03b1\u03b9\u03ba\u03c4\u03ce\u03bd.",
    expected: "\u039f\u03b9 \u03b1\u03be\u03af\u03b5\u03c2 \u03c4\u03b6\u03ac\u03ba\u03c0\u03bf\u03c4 \u03b5\u03af\u03bd\u03b1\u03b9 25x, 50x, 100x, 200x \u03ba\u03b1\u03b9 1000x \u03c4\u03bf \u03ba\u03b1\u03bd\u03bf\u03bd\u03b9\u03ba\u03cc \u03c0\u03bf\u03bd\u03c4\u03ac\u03c1\u03b9\u03c3\u03bc\u03b1 \u03c4\u03c9\u03bd \u03c0\u03b1\u03b9\u03ba\u03c4\u03ce\u03bd." },
  { name: 'es jackpot list',
    input: "Los valores del Premios Fijos son 25x, 50x, 100x, 200x y 1000x la apuesta normal del jugador.",
    expected: "Los valores del Premios Fijos son 25x, 50x, 100x, 200x y 1000x la apuesta normal del jugador." },
  { name: 'fr-ca jackpot list',
    input: "Les valeurs des gros lots sont de 25x, 50x, 100x, 200x et 1000x la mise r\u00e9guli\u00e8re du joueur.",
    expected: "Les valeurs des gros lots sont de 25x, 50x, 100x, 200x et 1000x la mise r\u00e9guli\u00e8re du joueur." },
  { name: 'fr jackpot list',
    input: "Les valeurs du jackpot sont de x25, x50, x100, x200 et x1000 la mise standard des joueurs.",
    expected: "Les valeurs du jackpot sont de x25, x50, x100, x200 et x1000 la mise standard des joueurs." },
  { name: 'it jackpot list',
    input: "I valori dei jackpot sono 25x, 50x, 100x, 200x e 1.000x della puntata regolare del giocatore.",
    expected: "I valori dei jackpot sono 25x, 50x, 100x, 200x e 1.000x della puntata regolare del giocatore." },
  { name: 'nl jackpot list',
    input: "De jackpotwaarden zijn 25x, 50x, 100x, 200x en 1000x de normale inzet van de speler.",
    expected: "De jackpotwaarden zijn 25x, 50x, 100x, 200x en 1000x de normale inzet van de speler." },
  { name: 'pt-br jackpot list',
    input: "Os valores do jackpot s\u00e3o 25x, 50x, 100x, 200x e 1000x a aposta regular do jogador.",
    expected: "Os valores do jackpot s\u00e3o 25x, 50x, 100x, 200x e 1000x a aposta regular do jogador." },
  { name: 'pt-pt jackpot list',
    input: "Os valores de jackpot s\u00e3o 25x, 50x, 100x, 200x e 1000x a aposta regular do jogador.",
    expected: "Os valores de jackpot s\u00e3o 25x, 50x, 100x, 200x e 1000x a aposta regular do jogador." },
  { name: 'sv jackpot list',
    input: "Jackpottv\u00e4rdena \u00e4r 25x, 50x, 100x, 200x och 1000x spelarnas vanliga insats.",
    expected: "Jackpottv\u00e4rdena \u00e4r 25x, 50x, 100x, 200x och 1000x spelarnas vanliga insats." },
];

// A lone multiplier with no thousands separator must stay literal.
const other: Case[] = [
  { name: 'en collector multiplier',
    input: "The maximum value a collector multiplier can reach is 100x.",
    expected: "The maximum value a collector multiplier can reach is 100x." },
];

let failed = 0;
const all = [...maxWin, ...jackpot, ...other];
for (const c of all) {
  const actual = processLine(c.input);
  const ok = actual === c.expected;
  if (!ok) failed++;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${c.name}`);
  if (!ok) {
    console.log(`   expected: ${JSON.stringify(c.expected)}`);
    console.log(`   actual:   ${JSON.stringify(actual)}`);
  }
}
console.log(`\n${all.length - failed}/${all.length} passed`);
process.exit(failed ? 1 : 0);
