export const clearSensitiveClientState = () => {
  window.sessionStorage.clear();

  for (const key of Object.keys(window.localStorage)) {
    if (
      key.startsWith("sb-") ||
      key.includes("supabase") ||
      key.includes("vibeschool") ||
      key.includes("lesson") ||
      key.includes("transform")
    ) {
      window.localStorage.removeItem(key);
    }
  }
};
