import natural from "natural";
const { removeStopwords } = require("stopword") as {
  removeStopwords: (tokens: string[]) => string[];
};

const TfIdf = natural.TfIdf;
const tokenizer = new natural.WordTokenizer();

export class TFIDFAnalyzer {
  private tfidf: natural.TfIdf;

  constructor() {
    this.tfidf = new TfIdf();
  }

  addDocument(text: string): void {
    const tokens = this.tokenize(text);
    this.tfidf.addDocument(tokens);
  }

  addDocuments(documents: string[]): void {
    documents.forEach((doc) => this.addDocument(doc));
  }

  calculateTFIDF(documents: string[]): Map<string, number> {
    this.tfidf = new TfIdf();
    this.addDocuments(documents);

    const scores = new Map<string, number>();

    documents.forEach((_, index) => {
      this.tfidf.listTerms(index).forEach((item) => {
        const currentScore = scores.get(item.term) || 0;
        scores.set(item.term, Math.max(currentScore, item.tfidf));
      });
    });

    return scores;
  }

  extractKeywords(text: string, topN: number = 10): Array<{ keyword: string; score: number }> {
    const tempTfidf = new TfIdf();
    const tokens = this.tokenize(text);
    tempTfidf.addDocument(tokens);

    const terms = tempTfidf.listTerms(0);

    return terms
      .slice(0, topN)
      .map((item) => ({
        keyword: item.term,
        score: item.tfidf,
      }))
      .filter((item) => item.keyword.length > 2); // Filter out very short terms
  }

  private tokenize(text: string): string[] {
    const tokens = tokenizer.tokenize(text.toLowerCase());
    if (!tokens) return [];

    // Remove stopwords and filter
    const filtered = removeStopwords(tokens);

    return filtered
      .filter((token: string) => token.length > 2) // Remove short tokens
      .filter((token: string) => !/^\d+$/.test(token)) // Remove pure numbers
      .filter((token: string) => /^[a-z0-9-]+$/.test(token)); // Only alphanumeric and hyphens
  }

  getMostImportantTerms(documentIndex: number, topN: number = 10): Array<{ term: string; score: number }> {
    const terms = this.tfidf.listTerms(documentIndex);

    return terms.slice(0, topN).map((item) => ({
      term: item.term,
      score: item.tfidf,
    }));
  }
}
