// src/lib/avatar.ts
// Deterministic default avatar for any user without a real profile picture.
// DiceBear's "adventurer" set is free (no API key/signup), pure SVG (a few
// KB, not a photo), and has a soft illustrated/3D look rather than a flat
// placeholder icon. Same seed always resolves to the same avatar, so a
// given user's default avatar stays stable across sessions without needing
// to persist anything to the database.
const DICEBEAR_STYLE = "adventurer";

export function getDefaultAvatarUrl(seed: string) {
  return `https://api.dicebear.com/9.x/${DICEBEAR_STYLE}/svg?seed=${encodeURIComponent(seed)}&backgroundType=gradientLinear`;
}

export function resolveAvatarUrl(avatarUrl: string | null | undefined, seed: string) {
  return avatarUrl || getDefaultAvatarUrl(seed);
}
