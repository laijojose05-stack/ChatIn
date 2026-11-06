const notFound = (req, res, next) => {
  if (req.accepts('html')) {
    return res.status(404).render('404', { title: '404 - Not Found' });
  }
  const error = new Error(`Not Found - ${req.originalUrl}`);
  res.status(404);
  next(error);
};

const errorHandler = (err, req, res, next) => {
  const statusCode = res.statusCode === 200 ? 500 : res.statusCode;
  res.status(statusCode);

  if (req.accepts('html') && !req.path.startsWith('/api/')) {
    return res.render('error', {
      title: 'Error',
      message: err.message,
      error: process.env.NODE_ENV === 'development' ? err : {},
    });
  }

  res.json({
    success: false,
    message: err.message,
    stack: process.env.NODE_ENV === 'production' ? null : err.stack,
  });
};

module.exports = { notFound, errorHandler };
