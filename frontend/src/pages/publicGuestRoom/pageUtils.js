import { useOutletContext } from "react-router-dom";
import { defaultGuestRoomContent } from "./defaultGuestRoomContent";

export const useGuestContent = () => {
  const ctx = useOutletContext();
  return ctx?.content || defaultGuestRoomContent;
};

export const visibleItems = (items = []) =>
  items.filter((item) => item?.enabled !== false);

export const isFilled = (value) => {
  if (Array.isArray(value)) return value.some(isFilled);
  if (value && typeof value === "object") return Object.values(value).some(isFilled);
  return String(value ?? "").trim().length > 0;
};

export const isEnabled = (config) => config?.enabled !== false;

export const orderedItems = (items = []) =>
  visibleItems(items)
    .filter(isFilled)
    .sort((a, b) => Number(a?.order ?? 999) - Number(b?.order ?? 999));

export const shouldRenderSection = (config, content) => isEnabled(config) && isFilled(content);

export const sectionText = (sections = {}, key = "") => sections?.[key] || {};

export const buttonVisible = (button = {}) =>
  button?.visible !== false && isFilled(button?.text || button?.label);

const fallbackImage = "https://ik.imagekit.io/7khjnlfow/email-assets/thapar_logo.png?updatedAt=1776888126772";

export const getImageUrl = (value) => {
  if (!value) return "";
  if (typeof value === "string") return value.trim();
  if (typeof value === "object") {
    return String(value.image || value.url || value.src || value.secure_url || value.fileUrl || "").trim();
  }
  return "";
};

export const hasImage = (value) => Boolean(getImageUrl(value));

export const imgOrFallback = (src, fallback) => getImageUrl(src) || getImageUrl(fallback) || fallbackImage;

export const validImageItems = (items = []) =>
  items
    .map((item) => {
      if (typeof item === "string") return { image: item.trim(), caption: "" };
      return {
        ...item,
        image: getImageUrl(item?.image || item),
        caption: item?.caption || item?.title || "",
      };
    })
    .filter((item) => item.image);
