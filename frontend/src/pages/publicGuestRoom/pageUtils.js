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

const imageFieldNames = new Set([
  "image",
  "coverImage",
  "desktopImage",
  "mobileImage",
  "backgroundImage",
  "thumbnail",
]);

const sectionLabel = (section = "") =>
  String(section || "")
    .replace(/([A-Z])/g, " $1")
    .replace(/^./, (char) => char.toUpperCase())
    .trim();

const isImageField = (key = "") => imageFieldNames.has(key);

const imageItem = ({ value, source, context = {} }) => {
  const image = getImageUrl(value);
  if (!image) return null;
  return {
    image,
    title: context.title || context.name || context.heading || context.caption || sectionLabel(source),
    caption: context.caption || context.title || context.name || "",
    description: context.description || context.subtitle || context.text || "",
    category: context.category || context.hostel || sectionLabel(source),
    source,
  };
};

export const collectGuestRoomContentImages = (content = {}) => {
  const images = [];

  const walk = (value, source, context = {}, key = "") => {
    if (!value) return;

    if (Array.isArray(value)) {
      value.forEach((item) => walk(item, source, context, key));
      return;
    }

    if (typeof value === "string") {
      if (isImageField(key)) {
        const item = imageItem({ value, source, context });
        if (item) images.push(item);
      }
      return;
    }

    if (typeof value !== "object" || value.enabled === false) return;

    const nextContext = {
      ...context,
      title: value.title || context.title,
      heading: value.heading || context.heading,
      name: value.name || context.name,
      caption: value.caption || context.caption,
      description: value.description || value.subtitle || value.text || context.description,
      category: value.category || value.hostel || context.category,
    };

    Object.entries(value).forEach(([childKey, childValue]) => {
      if (isImageField(childKey)) {
        const item = imageItem({ value: childValue, source, context: nextContext });
        if (item) images.push(item);
        return;
      }
      walk(childValue, source, nextContext, childKey);
    });
  };

  Object.entries(content || {}).forEach(([section, sectionContent]) => {
    if (section === "gallery" || section === "theme" || section === "bankdetails") return;
    walk(sectionContent, section, {}, section);
  });

  const seen = new Set();
  return images.filter((item) => {
    const key = item.image;
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};
