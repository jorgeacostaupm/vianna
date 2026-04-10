import {
  DEFAULT_BRAND_COLOR,
  buildBrandPalette,
  sanitizeBrandColor,
} from "@/utils/appTheme";

const STATIC_TOKENS = {
  colorSuccess: "#26A88E",
  colorWarning: "#B07A2A",
  colorError: "#B2545A",
  colorText: "#25324A",
  colorTextSecondary: "#4C5D7E",
  colorTextTertiary: "#7483A3",
  colorBgLayout: "#F3F5FB",
  colorBgContainer: "#ffffff",
  colorBgElevated: "#ffffff",
  colorBorder: "#D6DDEA",
  colorBorderSecondary: "#D6DDEA",
  fontFamily:
    'Manrope, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans", sans-serif',
  fontSize: 16,
  fontSizeSM: 14,
  fontSizeLG: 18,
  fontSizeHeading1: 32,
  fontSizeHeading2: 28,
  fontSizeHeading3: 24,
  fontSizeHeading4: 20,
  lineHeight: 1.5,
  lineHeightHeading1: 1.2,
  lineHeightHeading2: 1.2,
  lineHeightHeading3: 1.2,
  lineHeightHeading4: 1.25,
  fontWeightStrong: 600,
  borderRadius: 10,
  borderRadiusSM: 8,
  borderRadiusLG: 14,
  boxShadow: "0 4px 12px rgba(37, 50, 74, 0.14)",
  boxShadowSecondary: "0 1px 3px rgba(37, 50, 74, 0.12)",
  controlHeight: 40,
  controlHeightSM: 32,
  controlHeightLG: 48,
};

export const createTheme = (colorValue = DEFAULT_BRAND_COLOR) => {
  const palette = buildBrandPalette(sanitizeBrandColor(colorValue));

  return {
    token: {
      ...STATIC_TOKENS,
      colorPrimary: palette.brandColor,
      colorPrimaryBg: palette.brandSoft,
      colorPrimaryBgHover: palette.brandSoftSubtle,
      colorPrimaryBorder: palette.brandBorder,
      colorInfo: palette.brandColor,
    },
    components: {
      Slider: {
        handleColor: palette.brandColor,
        railBg: "#D6DDEA",
      },
      Button: {
        defaultBg: palette.brandColor,
        defaultColor: "#fff",
        defaultBorderColor: palette.brandColor,
        defaultHoverBg: palette.brandHover,
        defaultHoverColor: "#fff",
        defaultHoverBorderColor: palette.brandHover,
        defaultActiveBg: palette.brandActive,
        defaultActiveBorderColor: palette.brandActive,
        fontWeight: 600,
      },
      Input: {
        activeBorderColor: palette.brandColor,
        hoverBorderColor: "#BCC8DE",
        activeShadow: `0 0 0 3px ${palette.focusRingColor}`,
      },
      Select: {
        optionSelectedBg: palette.brandSoft,
        optionActiveBg: palette.brandSoftSubtle,
        selectorBg: "#ffffff",
      },
      Card: {
        headerBg: "#ffffff",
      },
      Table: {
        headerBg: "#F7F8FC",
        rowHoverBg: palette.brandSoftSubtle,
        borderColor: "#D6DDEA",
      },
      Modal: {
        contentBg: "#ffffff",
        headerBg: "#ffffff",
      },
      Tag: {
        defaultBg: "#F7F8FC",
        defaultColor: "#4C5D7E",
      },
      Tooltip: {
        colorBgSpotlight: "#ffffff",
        colorTextLightSolid: "#25324A",
      },
      Popover: {
        colorBgElevated: "#ffffff",
        colorText: "#25324A",
      },
      Radio: {
        buttonBg: "transparent",
        buttonColor: "#4C5D7E",
        buttonBorderColor: "#D6DDEA",
        buttonHoverColor: "#25324A",
        buttonHoverBorderColor: palette.brandColor,
        buttonCheckedBg: palette.brandColor,
        buttonCheckedColor: "#ffffff",
        buttonCheckedBorderColor: palette.brandColor,
        buttonSolidCheckedBg: palette.brandColor,
        buttonSolidCheckedColor: "#ffffff",
        buttonSolidCheckedHoverBg: palette.brandHover,
        buttonSolidCheckedHoverColor: "#ffffff",
      },
    },
  };
};

export const theme = createTheme();
