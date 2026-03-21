import * as dd from "./dd/index.js";
import * as dosa from "./dosa/index.js";

export default function resolveTemplate(authorityKey, type, data) {
  const bank = authorityKey === "DD" ? dd : dosa;

  if (!bank[type]) {
    throw new Error(`Missing template: ${authorityKey} → ${type}`);
  }

  return bank[type](data);
}