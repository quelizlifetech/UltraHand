module.exports = (err, _req, res, _next) => {
  const status = err.status || 500;
  const body = { error: err.message || "Internal Server Error" };
  if (err.details) body.details = err.details;
  if (status >= 500) console.error(err);
  res.status(status).json(body);
};
