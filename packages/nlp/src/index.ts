export * from "./tfidf";
export * from "./keyword-extractor";
export * from "./phrase-detector";
export * from "./pain-patterns";
export * from "./sentiment";

import { KeywordExtractor } from "./keyword-extractor";

const keywordExtractor = new KeywordExtractor();

export function extractKeywords(
	text: string,
	options?: { minLength?: number; maxKeywords?: number }
): string[] {
	return keywordExtractor.extractKeywords(text, options).map((item) => item.keyword);
}

export function normalizeText(text: string): string {
	return text
		.trim()
		.replace(/\s+/g, " ")
		.replace(/[^\w\s?!.-]/g, "");
}

export function isLikelySpam(text: string): boolean {
	const lines = text.split("\n");
	if (lines.length === 1 && text.length < 20) return true;

	const urlCount = (text.match(/http[s]?:\/\/\S+/g) || []).length;
	if (urlCount > 5) return true;

	if (/(.)\1{5,}/g.test(text)) return true;
	if (text.length > 50 && text === text.toUpperCase()) return true;

	return false;
}
