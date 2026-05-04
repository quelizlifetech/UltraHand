// Generates UH-#### style ids
module.exports = function generatePatientId() {
  const n = Math.floor(1000 + Math.random() * 9000);
  return `UH-${n}`;
};
