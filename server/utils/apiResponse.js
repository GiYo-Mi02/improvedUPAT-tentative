// Standardized API response helpers
// success(data, message?) and error(message, statusCode?, errors?)

function success(res, data = {}, message = "OK", statusCode = 200) {
  return res.status(statusCode).json({ success: true, message, ...data });
}

function error(res, message = "Server error", statusCode = 500, errors) {
  const payload = { success: false, message };
  if (errors) payload.errors = errors;
  return res.status(statusCode).json(payload);
}

module.exports = { success, error };
