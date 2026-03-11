const TOKEN_KEY = "societyNightPassToken";
const STUDENT_KEY = "societyNightPassStudent";

export const getSocietyNightPassToken = () => localStorage.getItem(TOKEN_KEY) || "";

export const setSocietyNightPassSession = ({ token, student }) => {
  if (token) localStorage.setItem(TOKEN_KEY, token);
  if (student) localStorage.setItem(STUDENT_KEY, JSON.stringify(student));
};

export const clearSocietyNightPassSession = () => {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(STUDENT_KEY);
};

export const getStoredSocietyNightStudent = () => {
  try {
    const raw = localStorage.getItem(STUDENT_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};
