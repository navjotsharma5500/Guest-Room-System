// src/themes/themeConfig.js

export const themes = {
  light: {
    name: "Classic Light",
    id: "light",
    colors: {
      bg: "bg-gray-50",
      text: "text-black",
      card: "bg-white",
      cardBorder: "border-gray-200",
      primary: "bg-red-600",
      primaryHover: "hover:bg-red-700",
      primaryText: "text-red-700",
      secondary: "bg-gray-200",
      secondaryHover: "hover:bg-gray-300",
    }
  },
  
  dark: {
    name: "Classic Dark",
    id: "dark",
    colors: {
      bg: "bg-gray-900",
      text: "text-gray-100",
      card: "bg-gray-800",
      cardBorder: "border-gray-700",
      primary: "bg-red-600",
      primaryHover: "hover:bg-red-700",
      primaryText: "text-red-400",
      secondary: "bg-gray-200",
      secondaryHover: "hover:bg-gray-300",
    }
  },
  
  aurora: {
    name: "Aurora Night",
    id: "aurora",
    colors: {
      bg: "bg-gradient-to-br from-slate-900 via-indigo-900 to-fuchsia-900",
      text: "text-white",
      card: "bg-black/30 backdrop-blur-2xl",
      cardBorder: "border border-white/10",
      primary: "bg-fuchsia-600",
      primaryHover: "hover:bg-fuchsia-700",
      primaryText: "text-fuchsia-200",
      secondary: "bg-white/10",
      secondaryHover: "hover:bg-white/20",
    }
  },
  
  graphite: {
    name: "Graphite Cyan",
    id: "graphite",
    colors: {
      bg: "bg-gradient-to-br from-zinc-900 via-slate-900 to-cyan-900",
      text: "text-white",
      card: "bg-white/5 backdrop-blur-xl",
      cardBorder: "border border-white/10",
      primary: "bg-cyan-600",
      primaryHover: "hover:bg-cyan-700",
      primaryText: "text-cyan-300",
      secondary: "bg-white/10",
      secondaryHover: "hover:bg-white/20",
    }
  }
};

export const getTheme = (themeId) => {
  return themes[themeId] || themes.light;
};