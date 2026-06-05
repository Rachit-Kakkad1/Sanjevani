// TODO: add google oauth scope validation
const express = require('express');
const router = express.Router();
const Joi = require('joi');
const authController = require('../controllers/auth.controller');
const { validate } = require('../middlewares/validate');

const authSchema = Joi.object({
  token: Joi.string().required()
});

router.post('/google', validate(authSchema), authController.googleAuth);

module.exports = router;
