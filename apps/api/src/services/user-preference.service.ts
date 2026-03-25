import { prisma } from "@packages/database";
import { cacheService } from "./cache.service";
import { UserPreferencesSchema, type UserPreferences } from "@packages/types";

const DEFAULT_PREFERENCES: UserPreferences = {
  preferredStages: [],
  minOpportunityScore: 0,
  digestCadence: "off",
};

export class UserPreferenceService {
  async getPreferences(userId: string): Promise<UserPreferences | null> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { preferences: true },
    });

    if (!user) {
      return null;
    }

    const parsed = UserPreferencesSchema.safeParse(user.preferences ?? DEFAULT_PREFERENCES);
    if (!parsed.success) {
      return DEFAULT_PREFERENCES;
    }

    return parsed.data;
  }

  async upsertPreferences(userId: string, preferences: UserPreferences): Promise<UserPreferences | null> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true },
    });

    if (!user) {
      return null;
    }

    const updated = await prisma.user.update({
      where: { id: userId },
      data: { preferences },
      select: { preferences: true },
    });

    await cacheService.deletePattern(`user:${userId}:trends:*`);

    const parsed = UserPreferencesSchema.safeParse(updated.preferences ?? DEFAULT_PREFERENCES);
    return parsed.success ? parsed.data : DEFAULT_PREFERENCES;
  }
}

export const userPreferenceService = new UserPreferenceService();
