export type AppColors = {
  primary: string;
  ink: string;
  muted: string;
  subtle: string;
  line: string;
  border: string;
  canvas: string;
  surface: string;
  softCanvas: string;
  primarySoft: string;
  navy: string;
  heroSecondary: string;
  danger: string;
  success: string;
  warning: string;
  successSoft: string;
  warningSoft: string;
  infoSoft: string;
};

export const palette = {
  primary: "#2563EB",
  ink: "#101828",
  muted: "#667085",
  line: "#E7EAF0",
  canvas: "#F5F7FB",
  white: "#FFFFFF",
  green: "#12B76A",
  amber: "#F79009",
  red: "#F04438",
  navy: "#101B35",
};

export const ACCENTS = {
  ocean: { label: "Ocean", value: "#2563EB" },
  teal: { label: "Teal", value: "#0D9488" },
  violet: { label: "Violet", value: "#7C3AED" },
  rose: { label: "Rose", value: "#E11D48" },
  amber: { label: "Amber", value: "#D97706" },
} as const;

export type AccentKey = keyof typeof ACCENTS;

export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 28 } as const;
export const radius = { sm: 10, md: 14, lg: 20, xl: 28, pill: 999 } as const;

export const typeScale = {
  display: { fontSize: 28, fontWeight: "800" as const, letterSpacing: -0.5 },
  title: { fontSize: 20, fontWeight: "700" as const, letterSpacing: -0.2 },
  body: { fontSize: 15, fontWeight: "400" as const },
  label: { fontSize: 13, fontWeight: "600" as const },
  caption: { fontSize: 12, fontWeight: "500" as const },
} as const;

/** Mixes two hex colours. amount 0 = a, 1 = b. */
export function mixHex(a: string, b: string, amount: number): string {
  const parse = (hex: string) => {
    const value = hex.replace("#", "");
    return [0, 2, 4].map((i) => parseInt(value.slice(i, i + 2), 16));
  };
  const [ar, ag, ab] = parse(a);
  const [br, bg, bb] = parse(b);
  const channel = (x: number, y: number) =>
    Math.round(x + (y - x) * amount).toString(16).padStart(2, "0");
  return `#${channel(ar, br)}${channel(ag, bg)}${channel(ab, bb)}`;
}

export function themeColors(dark: boolean, accent: AccentKey | string = "ocean"): AppColors {
  const accentValue =
    (ACCENTS as Record<string, { value: string }>)[accent]?.value ?? ACCENTS.ocean.value;
  const base: AppColors = dark
    ? {
        primary: mixHex(accentValue, "#FFFFFF", 0.35),
        ink: "#F2F4F7",
        muted: "#AAB5C5",
        subtle: "#8D9AAF",
        line: "#253248",
        border: "#334155",
        canvas: "#0B1220",
        surface: "#111B2A",
        softCanvas: "#162131",
        primarySoft: mixHex(accentValue, "#0B1220", 0.78),
        navy: "#17233A",
        heroSecondary: "#25395F",
        danger: "#FDA29B",
        success: "#75D39A",
        warning: "#FEC84B",
        successSoft: "#153927",
        warningSoft: "#3A2C15",
        infoSoft: "#1D3049",
      }
    : {
        primary: accentValue,
        ink: "#101828",
        muted: "#667085",
        subtle: "#98A2B3",
        line: "#EAECF0",
        border: "#D0D5DD",
        canvas: "#F5F7FB",
        surface: "#FFFFFF",
        softCanvas: "#F8FAFC",
        primarySoft: mixHex(accentValue, "#FFFFFF", 0.9),
        navy: "#101B35",
        heroSecondary: "#263B69",
        danger: "#B42318",
        success: "#027A48",
        warning: "#B54708",
        successSoft: "#ECFDF3",
        warningSoft: "#FFFAEB",
        infoSoft: "#EFF8FF",
      };
  return base;
}
