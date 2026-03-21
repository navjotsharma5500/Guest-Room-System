import ddTransport from "./transport/ddTransport.js";
import dosaTransport from "./transport/dosaTransport.js";
import { isDDOfficeRoom } from "../../utils/venueAccessPolicy.js";

const DD_AUTHORITY = {
  key: "DD",
  officeName: "DD Office",
  senderEmail: process.env.DD_EMAIL_USER,
  from: `"DD Office" <${process.env.DD_EMAIL_USER}>`,
  transporter: ddTransport,
  ccInternal: [process.env.VENUE_INTERNAL_CC_EMAIL],
};

const DOSA_AUTHORITY = {
  key: "DOSA",
  officeName: "DoSA Office",
  senderEmail: process.env.DOSA_EMAIL_USER,
  from: `"DoSA Office" <${process.env.DOSA_EMAIL_USER}>`,
  transporter: dosaTransport,
  ccInternal: [process.env.VENUE_INTERNAL_CC_EMAIL],
};

export const getEmailAuthorityByRoom = (roomNo) => {
  return isDDOfficeRoom(roomNo) ? DD_AUTHORITY : DOSA_AUTHORITY;
};