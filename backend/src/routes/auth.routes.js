// TODO: add google oauth scope validation
const express = require('express');
const router = express.Router();
const Joi = require('joi');
const rateLimit = require('express-rate-limit');
const authController = require('../controllers/auth.controller');
const { validate } = require('../middlewares/validate');

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // limit each IP to 5 requests per windowMs
  message: { success: false, error: 'Too many login attempts, please try again after 15 minutes' }
});

const authSchema = Joi.object({
  token: Joi.string().required()
});

router.post('/google', authLimiter, validate(authSchema), authController.googleAuth);

module.exports = router;
