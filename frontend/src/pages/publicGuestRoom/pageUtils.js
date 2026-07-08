import { useOutletContext } from "react-router-dom";
import { defaultGuestRoomContent } from "./defaultGuestRoomContent";

export const useGuestContent = () => {
  const ctx = useOutletContext();
  return ctx?.content || defaultGuestRoomContent;
};

export const visibleItems = (items = []) =>
  items.filter((item) => item?.enabled !== false);

export const imgOrFallback = (src, fallback) => src || fallback || "https://ik.imagekit.io/7khjnlfow/email-assets/thapar_logo.png?updatedAt=1776888126772";
