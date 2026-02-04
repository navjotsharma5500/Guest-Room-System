// src/components/GuestDetails/utils.js - Date and Time Utility Functions

export const combineDateAndTime = (date, time) => {
  if (!date || !time) return "";
  return `${date} ${time}`;
};

export const formatTimeWithAMPM = (time) => {
  if (!time) return "";
  try {
    const [hours, minutes] = time.split(':').map(Number);
    const period = hours >= 12 ? "PM" : "AM";
    const displayHours = hours % 12 || 12;
    return `${String(displayHours).padStart(2, '0')}:${String(minutes).padStart(2, '0')} ${period}`;
  } catch (error) {
    console.error("Error formatting time:", error);
    return time;
  }
};

export const formatDate = (dateString) => {
  if (!dateString) return "—";
  try {
    const date = new Date(dateString);
    const day = String(date.getDate()).padStart(2, "0");
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const month = months[date.getMonth()];
    const year = date.getFullYear();
    return `${day}-${month}-${year}`;
  } catch (error) {
    console.error("Error formatting date:", error);
    return String(dateString);
  }
};

export const formatDateTime = (date, time) => {
  if (!date) return "—";
  const formattedDate = formatDate(date);
  const formattedTime = time ? formatTimeWithAMPM(time) : "";
  return formattedTime ? `${formattedDate} ${formattedTime}` : formattedDate;
};

export const formatCreatedAt = (dateString) => {
  if (!dateString) return "Not available";
  try {
    const date = new Date(dateString);
    return date.toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  } catch (error) {
    console.error("Error formatting created at:", error);
    return "Invalid date";
  }
};