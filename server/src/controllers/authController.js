const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const User = require('../models/User');
const { asyncHandler } = require('../middleware/errorHandler');
const logger = require('../utils/logger');

/**
 * Generate JWT tokens
 */
const generateTokens = (userId) => {
  const accessToken = jwt.sign({ id: userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });
  const refreshToken = jwt.sign({ id: userId }, process.env.JWT_REFRESH_SECRET, {
    expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '30d',
  });
  return { accessToken, refreshToken };
};

/**
 * @route   POST /api/auth/register
 * @desc    Register a new doctor/user
 * @access  Public
 */
const register = asyncHandler(async (req, res) => {
  const { name, email, password, role, specialization, licenseNumber, hospital } = req.body;

  // Validate required fields
  if (!name || !email || !password) {
    return res.status(400).json({ success: false, message: 'Name, email, and password are required.' });
  }

  // Check password strength
  if (password.length < 8) {
    return res.status(400).json({ success: false, message: 'Password must be at least 8 characters.' });
  }

  const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/;
  if (!passwordRegex.test(password)) {
    return res.status(400).json({
      success: false,
      message: 'Password must contain uppercase, lowercase, number, and special character.',
    });
  }

  // Check for existing user
  const existingUser = await User.findOne({ email: email.toLowerCase() });
  if (existingUser) {
    return res.status(409).json({ success: false, message: 'An account with this email already exists.' });
  }

  const user = await User.create({
    name,
    email,
    password,
    role: role || 'doctor',
    specialization,
    licenseNumber,
    hospital,
  });

  const { accessToken, refreshToken } = generateTokens(user._id);

  // Store hashed refresh token
  user.refreshToken = crypto.createHash('sha256').update(refreshToken).digest('hex');
  await user.save({ validateBeforeSave: false });

  logger.info(`New user registered: ${user.email} (${user.role})`);

  res.status(201).json({
    success: true,
    message: 'Account created successfully.',
    data: {
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        specialization: user.specialization,
        hospital: user.hospital,
      },
      accessToken,
      refreshToken,
    },
  });
});

/**
 * @route   POST /api/auth/login
 * @desc    Login user
 * @access  Public
 */
const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ success: false, message: 'Email and password are required.' });
  }

  const user = await User.findOne({ email: email.toLowerCase() }).select('+password +refreshToken');

  if (!user) {
    return res.status(401).json({ success: false, message: 'Invalid email or password.' });
  }

  // Check if account is locked
  if (user.isLocked) {
    return res.status(423).json({
      success: false,
      message: 'Account temporarily locked due to multiple failed login attempts. Try again later.',
    });
  }

  const isMatch = await user.comparePassword(password);
  if (!isMatch) {
    await user.incLoginAttempts();
    return res.status(401).json({ success: false, message: 'Invalid email or password.' });
  }

  if (!user.isActive) {
    return res.status(403).json({ success: false, message: 'Account has been deactivated.' });
  }

  // Reset login attempts on success
  if (user.loginAttempts > 0) {
    await user.updateOne({ $set: { loginAttempts: 0 }, $unset: { lockUntil: 1 } });
  }

  const { accessToken, refreshToken } = generateTokens(user._id);

  user.refreshToken = crypto.createHash('sha256').update(refreshToken).digest('hex');
  user.lastLogin = new Date();
  await user.save({ validateBeforeSave: false });

  logger.info(`User logged in: ${user.email}`);

  res.status(200).json({
    success: true,
    message: 'Login successful.',
    data: {
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        specialization: user.specialization,
        hospital: user.hospital,
        preferences: user.preferences,
        stats: user.stats,
        lastLogin: user.lastLogin,
      },
      accessToken,
      refreshToken,
    },
  });
});

/**
 * @route   GET /api/auth/me
 * @desc    Get current user
 * @access  Private
 */
const getMe = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.id);
  res.status(200).json({
    success: true,
    data: { user },
  });
});

/**
 * @route   POST /api/auth/refresh
 * @desc    Refresh access token
 * @access  Public
 */
const refreshToken = asyncHandler(async (req, res) => {
  const { refreshToken: token } = req.body;

  if (!token) {
    return res.status(401).json({ success: false, message: 'Refresh token required.' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_REFRESH_SECRET);
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');
    const user = await User.findOne({ _id: decoded.id, refreshToken: hashedToken }).select('+refreshToken');

    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid refresh token.' });
    }

    const { accessToken, refreshToken: newRefreshToken } = generateTokens(user._id);
    user.refreshToken = crypto.createHash('sha256').update(newRefreshToken).digest('hex');
    await user.save({ validateBeforeSave: false });

    res.status(200).json({
      success: true,
      data: { accessToken, refreshToken: newRefreshToken },
    });
  } catch {
    res.status(401).json({ success: false, message: 'Invalid or expired refresh token.' });
  }
});

/**
 * @route   POST /api/auth/logout
 * @desc    Logout user
 * @access  Private
 */
const logout = asyncHandler(async (req, res) => {
  await User.findByIdAndUpdate(req.user.id, { $unset: { refreshToken: 1 } });
  res.status(200).json({ success: true, message: 'Logged out successfully.' });
});

/**
 * @route   PUT /api/auth/change-password
 * @desc    Change password
 * @access  Private
 */
const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  const user = await User.findById(req.user.id).select('+password');
  const isMatch = await user.comparePassword(currentPassword);

  if (!isMatch) {
    return res.status(401).json({ success: false, message: 'Current password is incorrect.' });
  }

  user.password = newPassword;
  await user.save();

  res.status(200).json({ success: true, message: 'Password changed successfully.' });
});

module.exports = { register, login, getMe, refreshToken, logout, changePassword };
