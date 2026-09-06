/* ============================================================
   Equation of the Day — curated, deterministic by date.
   ============================================================ */

import { Difficulty } from './examples';

export interface DailyEquation {
  id: string;
  title: string;
  equation: string;
  category: string;
  difficulty: Difficulty;
  whyInteresting: string;
  funFact: string;
  concepts: string[];
  relatedExamples: string[];
  /** 'identity' entries are shown beautifully but not graphed. */
  visualization: 'graph' | 'identity';
  latex?: string;
}

export const DAILY_EQUATIONS: DailyEquation[] = [
  {
    id: 'euler-identity',
    title: "Euler's Identity",
    equation: 'e^(iπ) + 1 = 0',
    latex: 'e^{i\\pi} + 1 = 0',
    category: 'Number Theory',
    difficulty: 'Advanced',
    whyInteresting:
      'Five of the most important numbers in mathematics — e, i, π, 1 and 0 — meet in a single equation. It connects exponential growth, rotation, and counting in one breathtaking statement.',
    funFact: 'Physicist Richard Feynman called it "the most remarkable formula in mathematics." Mathematicians have voted it the most beautiful equation of all time.',
    concepts: ['complex numbers', 'Euler\'s formula', 'constants'],
    relatedExamples: ['exp-natural', 'sine-wave', 'cosine-wave'],
    visualization: 'identity',
  },
  {
    id: 'sinc-day',
    title: 'The Sinc Function',
    equation: 'y = sin(x)/x',
    category: 'Calculus',
    difficulty: 'Advanced',
    whyInteresting:
      'It has a hole at x = 0 where the value "should" be 1 — the original limit problem that launched calculus. Its ripples describe how light diffracts, how digital signals are built, and how sound echoes.',
    funFact: 'The sinc function is the "sinc" of digital audio: sampling any signal is, at heart, a dance with this curve.',
    concepts: ['limits', 'removable discontinuity', 'sinc'],
    relatedExamples: ['sinc', 'sinc-wide', 'single-slit'],
    visualization: 'graph',
  },
  {
    id: 'parabola-day',
    title: 'The Humble Parabola',
    equation: 'y = x² - 4x + 3',
    category: 'Algebra',
    difficulty: 'Beginner',
    whyInteresting:
      'The parabola is the shape of falling objects, satellite dishes, suspension bridges and bicycle reflectors. This one has two neat roots, a vertex at (2, -1), and hides its secrets in plain sight.',
    funFact: 'The word "parabola" comes from Greek meaning "to throw beside" — because it is the path of a thrown object.',
    concepts: ['quadratics', 'roots', 'vertex'],
    relatedExamples: ['parabola-shifted', 'parabola-factored', 'projectile'],
    visualization: 'graph',
  },
  {
    id: 'sine-day',
    title: 'The Wave That Moves the World',
    equation: 'y = sin(x)',
    category: 'Trigonometry',
    difficulty: 'Beginner',
    whyInteresting:
      'Light, sound, tides, radio, the swing of a pendulum — all of them are sine waves in disguise. One curve, endlessly repeating, describes a huge fraction of the physical universe.',
    funFact: 'Your ears decompose every sound you hear into sums of sine waves — that is how the brain hears chords.',
    concepts: ['periodicity', 'oscillation', 'trigonometry'],
    relatedExamples: ['sine-wave', 'cosine-wave', 'harmonic-oscillator'],
    visualization: 'graph',
  },
  {
    id: 'euler-day',
    title: 'Natural Growth',
    equation: 'y = e^x',
    category: 'Calculus',
    difficulty: 'Beginner',
    whyInteresting:
      'The only function whose slope always equals its value. Every system that grows in proportion to its size — populations, interest, bacteria — is secretly e^x accelerating.',
    funFact: 'e is sometimes called Euler\'s number, but Euler didn\'t discover it: he just gave it its famous name.',
    concepts: ['e', 'exponential growth', 'derivative'],
    relatedExamples: ['exp-natural', 'exp-growth', 'population-growth'],
    visualization: 'graph',
  },
  {
    id: 'hyperbola-day',
    title: 'The Reciprocal',
    equation: 'y = 1/x',
    category: 'Algebra',
    difficulty: 'Beginner',
    whyInteresting:
      'A curve made of two graceful arcs that never touch the axes. It is the shape of inverse proportion: double one quantity, halve the other. Speed and travel time, pressure and volume, all trace this hyperbola.',
    funFact: 'The hyperbola was studied by the ancient Greeks 2000 years before it became the model of planetary motion.',
    concepts: ['asymptotes', 'hyperbola', 'inverse proportion'],
    relatedExamples: ['reciprocal', 'rational-double', 'rational-x-plus'],
    visualization: 'graph',
  },
  {
    id: 'cubic-day',
    title: 'The Snake That Bites Twice',
    equation: 'y = x³ - 3x',
    category: 'Algebra',
    difficulty: 'Intermediate',
    whyInteresting:
      'A cubic with a maximum, a minimum, and a perfect inflection point at the origin — where it changes from bending one way to the other. It is the shape of real engineering curves.',
    funFact: 'Solving cubics like this one kicked off the Renaissance\'s most famous mathematical feud between Tartaglia and Cardano.',
    concepts: ['cubics', 'extrema', 'inflection'],
    relatedExamples: ['cubic-tangent', 'cubic-roots', 'derivative-cubic'],
    visualization: 'graph',
  },
  {
    id: 'tangent-day',
    title: 'The Graph With Walls',
    equation: 'y = tan(x)',
    category: 'Trigonometry',
    difficulty: 'Intermediate',
    whyInteresting:
      'Tangent is sine over cosine, so wherever cosine is zero the function explodes to infinity — vertical walls that the curve forever approaches but never crosses.',
    funFact: 'The word "tangent" means "touching" — the tangent line is the line that just barely touches a curve.',
    concepts: ['asymptotes', 'trig ratios', 'undefined'],
    relatedExamples: ['tangent-wall', 'sine-wave', 'cosine-wave'],
    visualization: 'graph',
  },
  {
    id: 'bell-day',
    title: 'The Bell Curve',
    equation: 'y = e^(-x²)',
    category: 'Probability',
    difficulty: 'Advanced',
    whyInteresting:
      'The shape of randomness itself. Measure anything many times — heights, errors, noise — and the results gather into this bell. Its area under the curve is exactly √π.',
    funFact: 'The bell curve was discovered by de Moivre in 1733, then reinvented by Laplace and Gauss — Gauss got his name on it anyway.',
    concepts: ['normal distribution', 'Gaussian integral', 'statistics'],
    relatedExamples: ['gaussian', 'bell-curve', 'logistic'],
    visualization: 'graph',
  },
  {
    id: 'log-day',
    title: 'The Slow Climber',
    equation: 'y = ln(x)',
    category: 'Algebra',
    difficulty: 'Beginner',
    whyInteresting:
      'The undo button for exponential growth. It creeps upward forever, slower and slower — compressing huge numbers into a small readable range, which is why logarithms built slide rules and the Richter scale.',
    funFact: 'Before calculators, every engineer carried a slide rule — a physical logarithmic table that could multiply any two numbers by sliding.',
    concepts: ['logarithms', 'inverse functions', 'domain'],
    relatedExamples: ['log-natural', 'log-base10', 'exp-natural'],
    visualization: 'graph',
  },
  {
    id: 'abs-day',
    title: 'The Fold',
    equation: 'y = |x|',
    category: 'Algebra',
    difficulty: 'Beginner',
    whyInteresting:
      'Absolute value is distance, and distance is never negative. The graph folds the negative side upward into a perfect V — the sharpest shape a continuous function can make.',
    funFact: 'The absolute value function is not differentiable at its vertex — calculus has to hold its breath there.',
    concepts: ['absolute value', 'distance', 'piecewise'],
    relatedExamples: ['abs-v', 'abs-shifted', 'abs-fold'],
    visualization: 'graph',
  },
  {
    id: 'circle-day',
    title: 'The Circle\'s Arch',
    equation: 'y = sqrt(1 - x²)',
    category: 'Geometry',
    difficulty: 'Intermediate',
    whyInteresting:
      'The top half of the unit circle — every point at distance exactly 1 from the origin. One function can only draw one y per x, so the circle itself needs two: this one and its mirror.',
    funFact: 'The ratio of a circle\'s circumference to its diameter — π — is so important that computers have calculated trillions of its digits, and it never repeats.',
    concepts: ['circle', 'Pythagorean theorem', 'domain'],
    relatedExamples: ['semicircle', 'semicircle-bottom', 'ellipse-top'],
    visualization: 'graph',
  },
  {
    id: 'logistic-day',
    title: 'The S-Curve of Growth',
    equation: 'y = 1/(1 + e^(-x))',
    category: 'Biology',
    difficulty: 'Advanced',
    whyInteresting:
      'Growth that starts explosively and then hits a ceiling. Populations, pandemics, product adoption, and learning curves all follow this S — the logistic curve. Its midpoint is where growth is fastest.',
    funFact: 'The logistic function is the neuron of modern AI: the "sigmoid" that decides whether an artificial neuron fires.',
    concepts: ['carrying capacity', 'sigmoid', 'modeling'],
    relatedExamples: ['logistic', 'exp-growth', 'exp-shifted'],
    visualization: 'graph',
  },
  {
    id: 'chirp-day',
    title: 'The Chirp',
    equation: 'y = sin(x²)',
    category: 'Physics',
    difficulty: 'Advanced',
    whyInteresting:
      'A wave that speeds up as it travels — the frequency climbs because the argument is x², not x. Dolphins, bats, and radar sweep frequencies exactly this way to sharpen their vision.',
    funFact: 'The Fourier transform of a chirp is another chirp — a symmetry that makes chirps invaluable in signal processing.',
    concepts: ['frequency', 'chirp', 'waves'],
    relatedExamples: ['chirp', 'sine-frequency', 'sine-wave'],
    visualization: 'graph',
  },
  {
    id: 'grow-sine-day',
    title: 'A Wave in a Cone',
    equation: 'y = x sin(x)',
    category: 'Physics',
    difficulty: 'Intermediate',
    whyInteresting:
      'Multiplying a wave by x makes its height grow linearly — the oscillations spread outward inside a perfect cone. It is the fingerprint of resonance, where energy builds up cycle after cycle.',
    funFact: 'When a singer shatters a glass, the glass is resonating: each cycle adds a little more energy, exactly like this graph.',
    concepts: ['resonance', 'envelope', 'oscillation'],
    relatedExamples: ['x-times-sin', 'sine-damped', 'sine-wave'],
    visualization: 'graph',
  },
  {
    id: 'golden-bell-day',
    title: 'Music in One Equation',
    equation: 'y = cos(3x) + 2sin(x)',
    category: 'Music',
    difficulty: 'Advanced',
    whyInteresting:
      'Two pure tones, added together, make a rich evolving wave. Every sound you have ever heard — voices, instruments, thunder — is a sum of sine waves like this one. That is Fourier\'s discovery.',
    funFact: 'The mathematics of this curve is literally the physics of sound: your speaker pushes air in exactly this pattern.',
    concepts: ['Fourier series', 'superposition', 'harmonics'],
    relatedExamples: ['cos-plus-sin', 'infinity-wave', 'sine-combined'],
    visualization: 'graph',
  },
  {
    id: 'doubling-day',
    title: 'The Doubling Curve',
    equation: 'y = 2^x',
    category: 'Algebra',
    difficulty: 'Beginner',
    whyInteresting:
      'Start with 1 and double: 2, 4, 8, 16… The curve shoots upward so fast that after just 10 doublings you are past 1000, and after 30, past a billion. This is the mathematics of folding paper, chess rewards, and compound interest.',
    funFact: 'Fold a piece of paper 42 times and it would be thick enough to reach the Moon — that\'s 2^42 sheets.',
    concepts: ['doubling', 'exponential growth', 'powers'],
    relatedExamples: ['exp-growth', 'exp-coefficient', 'population-growth'],
    visualization: 'graph',
  },
  {
    id: 'hole-day',
    title: 'The Function With a Hole',
    equation: 'y = (x² - 1)/(x - 1)',
    category: 'Algebra',
    difficulty: 'Advanced',
    whyInteresting:
      'This "function" is undefined at x = 1, yet everywhere else it is exactly x + 1. The graph is a straight line with a tiny missing point — a removable discontinuity, the gatekeeper concept of limits.',
    funFact: 'Holes like this one are how calculus sneaks past division by zero: by asking what the function gets closer to, not what it equals.',
    concepts: ['removable discontinuity', 'limits', 'factoring'],
    relatedExamples: ['rational-linear-over', 'sinc', 'reciprocal'],
    visualization: 'graph',
  },
  {
    id: 'damped-day',
    title: 'The Fading Echo',
    equation: 'y = e^(-0.2x)sin(x)',
    category: 'Physics',
    difficulty: 'Advanced',
    whyInteresting:
      'A wave that slowly runs out of energy — a plucked string, a bouncing ball, a door on a spring. The exponential envelope squeezes the oscillations until they fade into silence.',
    funFact: 'The "twang" of a guitar string is exactly this curve: a sine wave multiplied by a decaying exponential.',
    concepts: ['damping', 'oscillation', 'exponential decay'],
    relatedExamples: ['sine-damped', 'harmonic-oscillator', 'exp-natural-decay'],
    visualization: 'graph',
  },
  {
    id: 'squared-wave-day',
    title: 'The Wave That Never Goes Negative',
    equation: 'y = sin(x)²',
    category: 'Physics',
    difficulty: 'Intermediate',
    whyInteresting:
      'Squaring a wave flips its valleys into hills: energy flows in pulses, never negative. The power delivered by alternating current traces exactly this curve — twice the frequency of the voltage.',
    funFact: 'If sine is the shadow of a wheel, sine² is its shadow\'s energy — which is why power engineers live on this curve.',
    concepts: ['squaring', 'power', 'frequency doubling'],
    relatedExamples: ['sine-squared', 'sine-bounce', 'sine-wave'],
    visualization: 'graph',
  },
  {
    id: 'saw-day',
    title: 'The Sawtooth',
    equation: 'y = x - floor(x)',
    category: 'Number Theory',
    difficulty: 'Advanced',
    whyInteresting:
      'The fractional part of x: a tooth that rises from 0 to 1, resets, and repeats forever. It is built from the floor function — one of the simplest, most useful tools in number theory and digital audio.',
    funFact: 'Synthesizers build entire genres of electronic music from this one curve.',
    concepts: ['floor function', 'fractional part', 'periodicity'],
    relatedExamples: ['sawtooth', 'sign-step', 'sine-wave'],
    visualization: 'graph',
  },
  {
    id: 'sign-day',
    title: 'The Jump',
    equation: 'y = sign(x)',
    category: 'Algebra',
    difficulty: 'Beginner',
    whyInteresting:
      'The simplest discontinuous function: a flat -1 for negative x, then a sudden jump to +1. Switches, thresholds, and digital logic all live on this step.',
    funFact: 'Computers are built from steps like this one — the "0 or 1" of binary logic is a sign function in disguise.',
    concepts: ['step function', 'discontinuity', 'sign'],
    relatedExamples: ['sign-step', 'abs-v', 'sawtooth'],
    visualization: 'graph',
  },
  {
    id: 'witch-day',
    title: 'The Witch of Agnesi',
    equation: 'y = 1/(x² + 1)',
    category: 'History',
    difficulty: 'Advanced',
    whyInteresting:
      'A graceful curve named for Maria Gaetana Agnesi, a 18th-century mathematician who wrote one of the first great calculus textbooks. It never blows up — a rational function with no walls.',
    funFact: 'The "witch" in the name came from a mistranslation of the Italian "versiera" as "avversiera", meaning witch or devil.',
    concepts: ['history of math', 'rational functions', 'curves'],
    relatedExamples: ['rational-witch', 'bell-curve', 'witch-agnesii'],
    visualization: 'graph',
  },
  {
    id: 'fold-day',
    title: 'The Folded Parabola',
    equation: 'y = |x² - 1|',
    category: 'Algebra',
    difficulty: 'Intermediate',
    whyInteresting:
      'A parabola that dips below the axis, folded upward by absolute value into a W. The fold marks exactly where the function changes sign — a visible record of the roots.',
    funFact: 'Folding functions with absolute value is how designers create sharp edges in otherwise smooth curves.',
    concepts: ['absolute value', 'roots', 'folding'],
    relatedExamples: ['abs-fold', 'parabola-roots', 'sine-bounce'],
    visualization: 'graph',
  },
];

/** Deterministic pick: rotates through the list, offset by the year. */
export function equationOfTheDay(date = new Date()): DailyEquation {
  const start = new Date(date.getFullYear(), 0, 0);
  const dayOfYear = Math.floor((date.getTime() - start.getTime()) / 86_400_000);
  const idx = (dayOfYear + date.getFullYear() * 7) % DAILY_EQUATIONS.length;
  return DAILY_EQUATIONS[idx];
}

export function formatDay(date = new Date()): string {
  return date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
}