import { useApp } from "../context/AppContext";
import { themeColors } from "../theme/theme";

/** Colours for the current appearance and accent choice. */
export function useTheme() {
  const { dark, prefs } = useApp();
  return themeColors(dark, prefs.accent);
}
