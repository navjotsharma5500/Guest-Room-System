import React from "react";
import { Outlet } from "react-router-dom";
import PublicGuestNavbar from "../../components/publicGuestRoom/PublicGuestNavbar";
import PublicGuestFooter from "../../components/publicGuestRoom/PublicGuestFooter";
import ScrollToTopButton from "../../components/publicGuestRoom/ScrollToTopButton";
import useGuestRoomContent from "./useGuestRoomContent";
import "./guestRoomPublic.css";

export default function GuestRoomPublicLayout() {
  const { content } = useGuestRoomContent();
  const theme = content.theme || {};

  return (
    <div
      className="guest-room-public"
      data-bg={theme.backgroundStyle || "resortWarm"}
      style={{
        "--guest-red": theme.primaryColor || "#a8323e",
        "--guest-blue": theme.accentColor || "#14385f",
        borderRadius: theme.buttonRoundness === "soft" ? "18px" : undefined,
      }}
    >
      <PublicGuestNavbar />
      <Outlet context={{ content }} />
      <PublicGuestFooter content={content} />
      <ScrollToTopButton />
    </div>
  );
}
