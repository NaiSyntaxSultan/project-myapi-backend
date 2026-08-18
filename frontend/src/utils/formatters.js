export const formatCardDate = (dateString) => {
  if (!dateString) return "";
  const d = new Date(dateString);
  if (isNaN(d.getTime())) return "";
  
  return d.toLocaleDateString("en-GB", {
    day: "2-digit",   
    month: "short",    
    year: "numeric",   
  });
};