// src/utils/dateUtils.js
export const isDateRangeOverlapping = (from1, to1, from2, to2) => {
  if (!from1 || !to1 || !from2 || !to2) return false;
  const start1 = new Date(from1);
  const end1 = new Date(to1);
  const start2 = new Date(from2);
  const end2 = new Date(to2);
  // ✅ Overlap only if they truly intersect
  return start1 <= end2 && end1 >= start2;
};
