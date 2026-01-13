export const REACTION_TYPES = {
  THUMBS_UP: "thumbs_up",
  HEART: "heart",
  LAUGH: "laugh",
  SURPRISED: "surprised",
  SAD: "sad"
} as const;

export const VALID_REACTION_TYPES = Object.values(REACTION_TYPES);

export type ReactionType = typeof REACTION_TYPES[keyof typeof REACTION_TYPES];