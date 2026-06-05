// TODO: protect create endpoint
const express = require('express');
const router = express.Router();
const Joi = require('joi');
const { getNearbyStores, createStore } = require('../controllers/store.controller');
const { validate } = require('../middlewares/validate');

const storeSchema = Joi.object({
  name: Joi.string().required(),
  location: Joi.object({
    type: Joi.string().valid('Point').default('Point'),
    coordinates: Joi.array().items(Joi.number()).length(2).required()
  }).required(),
  address: Joi.string().required(),
  state: Joi.string().required(),
  district: Joi.string().required(),
  pincode: Joi.string().required()
});

router.get('/nearby', getNearbyStores);
router.post('/', validate(storeSchema), createStore); // Use for seeding or admin purposes

module.exports = router;
