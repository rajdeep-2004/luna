import { create } from 'zustand';
import type { AvatarId, ExperienceLevel, TopicSlug } from '@luna/shared';

/** Answers collected across the onboarding steps. Sent in one request on the last step. */
type Draft = {
  avatarId: AvatarId;
  topics: TopicSlug[];
  level: ExperienceLevel | null;
  setAvatar: (id: AvatarId) => void;
  toggleTopic: (slug: TopicSlug) => void;
  setLevel: (level: ExperienceLevel) => void;
  reset: () => void;
  /** Set when onboarding finishes, so the Dojo offers the baseline once. Not part of the draft. */
  offerBaseline: boolean;
  setOfferBaseline: (v: boolean) => void;
};

const initial = { avatarId: 'kitsune' as AvatarId, topics: [] as TopicSlug[], level: null };

export const useOnboardingStore = create<Draft>((set) => ({
  ...initial,
  setAvatar: (avatarId) => set({ avatarId }),
  toggleTopic: (slug) =>
    set((s) => ({
      topics: s.topics.includes(slug) ? s.topics.filter((t) => t !== slug) : [...s.topics, slug],
    })),
  setLevel: (level) => set({ level }),
  reset: () => set(initial),
  offerBaseline: false,
  setOfferBaseline: (offerBaseline) => set({ offerBaseline }),
}));
