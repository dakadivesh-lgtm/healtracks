function validateSignup(req, res, next) {
  const { name, email, password } = req.body;

  if (!name || name.trim().length < 2) {
    return res.status(400).json({ success: false, message: 'Please provide a valid full name (at least 2 characters).' });
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!email || !emailRegex.test(email.trim())) {
    return res.status(400).json({ success: false, message: 'Please provide a valid email address.' });
  }

  if (!password || password.length < 6) {
    return res.status(400).json({ success: false, message: 'Password must be at least 6 characters long.' });
  }

  next();
}

function validateLogin(req, res, next) {
  const { email, password } = req.body;

  if (!email || !email.trim()) {
    return res.status(400).json({ success: false, message: 'Email address is required.' });
  }

  if (!password) {
    return res.status(400).json({ success: false, message: 'Password is required.' });
  }

  next();
}

function validateSupportTicket(req, res, next) {
  const { name, email, subject, message } = req.body;

  if (!name || !name.trim()) {
    return res.status(400).json({ success: false, message: 'Name is required.' });
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!email || !emailRegex.test(email.trim())) {
    return res.status(400).json({ success: false, message: 'A valid contact email is required.' });
  }

  if (!subject || !subject.trim()) {
    return res.status(400).json({ success: false, message: 'Subject line is required.' });
  }

  if (!message || message.trim().length < 10) {
    return res.status(400).json({ success: false, message: 'Please provide a message with at least 10 characters.' });
  }

  next();
}

module.exports = {
  validateSignup,
  validateLogin,
  validateSupportTicket
};
