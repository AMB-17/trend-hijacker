/**
 * NLP Utilities for TREND HIJACKER
 * Analyzes text for trends, pain points, and sentiment
 */

// Pain point detection patterns
const PAIN_PATTERNS = [
  /i\s+wish\s+there\s+was/gi,
  /does\s+anyone\s+know\s+a?\s+tool\s+for/gi,
  /this\s+problem\s+is\s+annoying/gi,
  /is\s+there\s+a\s+solution\s+for/gi,
  /i'm?\s+looking\s+for\s+a\s+way\s+to/gi,
  /no\s+existing\s+solution/gi,
  /can't\s+find\s+anything\s+that/gi,
  /would\s+love\s+to\s+have/gi,
  /struggling\s+with/gi,
  /frustrated\s+by/gi,
  /need\s+help\s+with/gi,
  /anyone\s+else\s+having\s+trouble/gi,
];

const QUESTION_PATTERNS = [
  /how\s+do\s+(?:i|you|we)\s+(?:do|build|create|make)/gi,
  /why\s+(?:is|are|do)\s+/gi,
  /what's?\s+the\s+best\s+way\s+to/gi,
  /has\s+anyone\s+tried/gi,
  /is\s+there\s+a\s+better\s+way/gi,
];

// Sentiment keywords
const POSITIVE_WORDS = new Set([
  'love', 'amazing', 'great', 'excellent', 'wonderful', 'awesome',
  'fantastic', 'perfect', 'brilliant', 'incredible', 'best', 'better',
  'improved', 'easier', 'faster', 'simpler', 'effective', 'works',
]);

const NEGATIVE_WORDS = new Set([
  'hate', 'awful', 'terrible', 'bad', 'worse', 'worst', 'broken',
  'crash', 'fail', 'error', 'problem', 'issue', 'bug', 'annoying',
  'frustrating', 'pain', 'difficult', 'hard', 'complex', 'confusing',
  'slow', 'failing', 'doesn\'t work', 'missing',
]);

/**
 * Detect pain points in text
 */
export function detectPainPoints(text: string): string[] {
  const painPoints: string[] = [];
  
  for (const pattern of PAIN_PATTERNS) {
    const matches = text.match(pattern);
    if (matches) {
      painPoints.push(...matches);
    }
  }
  
  return painPoints;
}

/**
 * Detect questions/unsolved problems
 */
export function detectQuestions(text: string): string[] {
  const questions: string[] = [];
  
  for (const pattern of QUESTION_PATTERNS) {
    const matches = text.match(pattern);
    if (matches) {
      questions.push(...matches);
    }
  }
  
  // Also extract sentences ending with ?
  const explicitQuestions = text.match(/[^.!?]*\?/g) || [];
  questions.push(...explicitQuestions.slice(0, 3)); // Top 3 questions
  
  return questions;
}

/**
 * Calculate basic sentiment score (-1 to 1)
 */
export function calculateSentiment(text: string): number {
  const words = text.toLowerCase().split(/\W+/);
  
  let positiveCount = 0;
  let negativeCount = 0;
  
  for (const word of words) {
    if (POSITIVE_WORDS.has(word)) positiveCount++;
    if (NEGATIVE_WORDS.has(word)) negativeCount++;
  }
  
  const total = positiveCount + negativeCount;
  if (total === 0) return 0;
  
  return (positiveCount - negativeCount) / total;
}

/**
 * Extract keywords using TF-IDF-like scoring
 */
export function extractKeywords(
  text: string,
  options: { maxKeywords?: number; minLength?: number } = {}
): string[] {
  const { maxKeywords = 10, minLength = 3 } = options;
  
  // Simple TF-based extraction
  const words = text
    .toLowerCase()
    .split(/\W+/)
    .filter(w => w.length >= minLength && !isStopword(w));
  
  const frequency = new Map<string, number>();
  
  for (const word of words) {
    frequency.set(word, (frequency.get(word) || 0) + 1);
  }
  
  // Sort by frequency
  const sorted = Array.from(frequency.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, maxKeywords)
    .map(([word]) => word);
  
  return sorted;
}

/**
 * Extract N-grams (phrases)
 */
export function extractNgrams(
  text: string,
  n: number = 2,
  options: { maxPhrases?: number; minOccurrences?: number } = {}
): string[] {
  const { maxPhrases = 5, minOccurrences = 1 } = options;
  
  const words = text
    .toLowerCase()
    .split(/\W+/)
    .filter(w => w.length > 2);
  
  const phrases = new Map<string, number>();
  
  for (let i = 0; i <= words.length - n; i++) {
    const phrase = words.slice(i, i + n).join(' ');
    if (!phrase.split(' ').some(w => isStopword(w))) {
      phrases.set(phrase, (phrases.get(phrase) || 0) + 1);
    }
  }
  
  // Filter by minimum occurrences and sort
  const filtered = Array.from(phrases.entries())
    .filter(([_, count]) => count >= minOccurrences)
    .sort((a, b) => b[1] - a[1])
    .slice(0, maxPhrases)
    .map(([phrase]) => phrase);
  
  return filtered;
}

/**
 * Calculate text similarity (simple Jaccard similarity)
 */
export function calculateSimilarity(text1: string, text2: string): number {
  const set1 = new Set(text1.toLowerCase().split(/\W+/).filter(w => w.length > 2));
  const set2 = new Set(text2.toLowerCase().split(/\W+/).filter(w => w.length > 2));
  
  const intersection = new Set([...set1].filter(x => set2.has(x)));
  const union = new Set([...set1, ...set2]);
  
  return union.size === 0 ? 0 : intersection.size / union.size;
}

/**
 * Detect spam/noise in text
 */
export function isLikelySpam(text: string): boolean {
  const lines = text.split('\n');
  
  // Single-line spam (likely bot/automation)
  if (lines.length === 1 && text.length < 20) return true;
  
  // Excessive URLs
  const urlCount = (text.match(/http[s]?:\/\/\S+/g) || []).length;
  if (urlCount > 5) return true;
  
  // Repeated characters (ANNOYING!!!!)
  if (/(.)\1{5,}/g.test(text)) return true;
  
  // All caps (likely spam/bots)
  if (text.length > 50 && text === text.toUpperCase()) return true;
  
  return false;
}

/**
 * Clean and normalize text
 */
export function normalizeText(text: string): string {
  return text
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/[^\w\s?!.-]/g, '');
}

/**
 * Check if word is English stopword
 */
function isStopword(word: string): boolean {
  const stopwords = new Set([
    'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
    'of', 'with', 'by', 'from', 'as', 'is', 'was', 'are', 'be', 'been',
    'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would',
    'could', 'should', 'may', 'might', 'must', 'can', 'shall', 'that',
    'this', 'it', 'its', 'they', 'them', 'what', 'when', 'where', 'who',
    'which', 'how', 'why', 'i', 'you', 'he', 'she', 'we', 'me', 'him',
    'her', 'us', 'my', 'your', 'his', 'their', 'is', 'the', 'if', 'so',
  ]);
  
  return stopwords.has(word);
}

/**
 * Entity extraction (basic)
 */
export function extractEntities(text: string): {
  people: string[];
  tools: string[];
  problems: string[];
} {
  const result = {
    people: [] as string[],
    tools: [] as string[],
    problems: [] as string[],
  };
  
  // Capitalized words (potential proper nouns)
  const words = text.split(/\W+/);
  const properNouns = words.filter(w => /^[A-Z]/.test(w) && w.length > 2);
  
  // Find problem phrases
  const problemPhrases = [...detectPainPoints(text), ...detectQuestions(text)];
  result.problems = problemPhrases.slice(0, 5);
  
  // Basic tool detection (words followed by "tool", "app", "service", etc.)
  const toolPattern = /(\w+)\s+(tool|app|service|platform|plugin|extension|library)/gi;
  const toolMatches = text.matchAll(toolPattern);
  for (const match of toolMatches) {
    result.tools.push(match[1]);
  }
  
  return result;
}
