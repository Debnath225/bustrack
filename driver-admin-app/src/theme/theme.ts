let darkMode = false;

export function setPaletteDarkMode(enabled: boolean) {
  darkMode = enabled;
}

export const palette = {
  get brand() {
    return darkMode ? "#8AB4FF" : "#2563EB";
  },
  get brandDark() {
    return darkMode ? "#A9C9FF" : "#1D4ED8";
  },
  get brandSoft() {
    return darkMode ? "#182B4A" : "#EAF0FF";
  },
  get ink() {
    return darkMode ? "#F2F4F7" : "#172033";
  },
  get muted() {
    return darkMode ? "#AAB5C5" : "#718096";
  },
  get line() {
    return darkMode ? "#2B394F" : "#E6EAF0";
  },
  get bg() {
    return darkMode ? "#0B1220" : "#F4F7FB";
  },
  get card() {
    return darkMode ? "#111B2A" : "#FFFFFF";
  },
  get green() {
    return darkMode ? "#75D39A" : "#159B68";
  },
  get greenSoft() {
    return darkMode ? "#153927" : "#ECFDF3";
  },
  get red() {
    return darkMode ? "#FDA29B" : "#D9485F";
  },
  get redSoft() {
    return darkMode ? "#3A2028" : "#FDECEF";
  },
  get amber() {
    return darkMode ? "#FEC84B" : "#D58A17";
  },
  get navy() {
    return darkMode ? "#17233A" : "#101B33";
  },
};
