/**
 * Assess market potential based on various signals
 */
export function assessMarketPotential(params: {
  discussionVolume: number;
  problemIntensity: number;
  growthRate: number;
  uniqueSources: number;
  avgEngagement: number;
}): "low" | "medium" | "high" {
  const { discussionVolume, problemIntensity, growthRate, uniqueSources, avgEngagement } = params;

  // Calculate composite score
  let score = 0;

  // Volume (max 25 points)
  if (discussionVolume >= 100) score += 25;
  else if (discussionVolume >= 50) score += 15;
  else if (discussionVolume >= 20) score += 10;
  else score += 5;

  // Problem intensity (max 30 points)
  score += problemIntensity * 30;

  // Growth rate (max 25 points)
  if (growthRate >= 2.0) score += 25;
  else if (growthRate >= 1.5) score += 15;
  else if (growthRate >= 1.0) score += 10;
  else score += 5;

  // Diverse sources (max 10 points)
  score += Math.min(10, uniqueSources * 2);

  // Engagement (max 10 points)
  score += Math.min(10, avgEngagement * 10);

  // Classify based on total score (0-100)
  if (score >= 70) return "high";
  if (score >= 40) return "medium";
  return "low";
}

/**
 * Estimate audience size based on discussion patterns
 */
export function estimateAudienceSize(params: {
  discussionVolume: number;
  uniqueAuthors: number;
  avgEngagement: number;
}): "niche" | "medium" | "broad" {
  const { discussionVolume, uniqueAuthors, avgEngagement } = params;

  const multiplier = avgEngagement > 0.5 ? 10 : 5; // High engagement = broader reach
  const estimatedReach = uniqueAuthors * multiplier;

  if (estimatedReach >= 1000 || discussionVolume >= 500) {
    return "broad";
  } else if (estimatedReach >= 200 || discussionVolume >= 100) {
    return "medium";
  } else {
    return "niche";
  }
}

/**
 * Identify target audience based on discussion context
 */
export function identifyTargetAudience(keywords: string[], sources: string[]): string {
  const audienceMap: Record<string, string[]> = {
    "Developers & Engineers": ["api", "code", "programming", "dev", "github", "typescript", "react"],
    "Entrepreneurs & Founders": ["startup", "saas", "business", "founder", "mvp", "product launch"],
    "Marketers": ["marketing", "seo", "growth", "conversion", "analytics", "ads"],
    "Designers": ["design", "ui", "ux", "figma", "prototype", "wireframe"],
    "Content Creators": ["content", "creator", "youtube", "video", "podcast", "blog"],
    "Product Managers": ["product", "roadmap", "feature", "user story", "backlog"],
    "Freelancers": ["freelance", "client", "gig", "contractor", "upwork"],
    "Small Business Owners": ["small business", "local", "shop", "retail", "customer"],
  };

  const scores: Record<string, number> = {};

  // Score based on keywords
  Object.entries(audienceMap).forEach(([audience, terms]) => {
    scores[audience] = keywords.filter((kw) => terms.some((term) => kw.includes(term))).length;
  });

  // Boost based on sources
  if (sources.includes("hackernews") || sources.includes("github")) {
    scores["Developers & Engineers"] = (scores["Developers & Engineers"] || 0) + 2;
  }
  if (sources.includes("indiehackers")) {
    scores["Entrepreneurs & Founders"] = (scores["Entrepreneurs & Founders"] || 0) + 2;
  }

  // Find top audience
  const topAudience = Object.entries(scores)
    .sort(([, a], [, b]) => b - a)
    .map(([audience]) => audience)[0];

  return topAudience || "General Audience";
}
