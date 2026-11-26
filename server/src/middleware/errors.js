export function notFound(req, res) {
  res.status(404).json({ message: `Route not found: ${req.method} ${req.originalUrl}` });
}

export function errorHandler(error, req, res, next) {
  console.error(error);
  if (error.name === 'ValidationError') return res.status(400).json({ message: error.message });
  if (error.code === 11000) return res.status(409).json({ message: `Duplicate value for ${Object.keys(error.keyPattern).join(', ')}` });
  const status = error.status || 500;
  res.status(status).json({ message: status === 500 ? 'Unexpected server error' : error.message });
}
