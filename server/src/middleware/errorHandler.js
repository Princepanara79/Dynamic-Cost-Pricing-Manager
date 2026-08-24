const errorHandler = (err, req, res, next) => {
  console.error(err.stack);

  if (err.name === 'PrismaClientKnownRequestError') {
    if (err.code === 'P2002') {
      return res.status(409).json({ error: 'Conflict: A record with this value already exists.' });
    }
    if (err.code === 'P2025') {
      return res.status(404).json({ error: 'Not Found: Record to update not found.' });
    }
    return res.status(400).json({ error: `Database Error: ${err.message}` });
  }

  if (err.name === 'ValidationError') {
    return res.status(400).json({ error: err.message, details: err.errors });
  }

  res.status(500).json({
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
};

module.exports = errorHandler;
