export type AuthStackParams = { Welcome: undefined; Register: undefined; Login: undefined };
export type OnboardingStackParams = { Avatar: undefined; Topics: undefined; Level: undefined };
export type MainTabParams = {
  Dojo: undefined;
  Explore: undefined;
  Duel: undefined;
  Profile: undefined;
};
/** Signed-in, onboarded app: the tabs, plus full-screen game routes pushed on top of them. */
export type AppStackParams = {
  Tabs: undefined;
  Session: { sessionId: string };
  Summary: { sessionId: string; rootCause?: string };
  BaselineIntro: undefined;
  DojoBoard: undefined;
  DuelResult: { duelId: string };
};
