import { useOutletContext } from "react-router-dom";
import { defaultGuestRoomContent } from "./defaultGuestRoomContent";

export const useGuestContent = () => {
  const ctx = useOutletContext();
  return ctx?.content || defaultGuestRoomContent;
};

export const visibleItems = (items = []) =>
  items.filter((item) => item?.enabled !== false);

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
