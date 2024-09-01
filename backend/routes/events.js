const express = require('express');
const router = express.Router();
const Event = require('../models/Event');

// Получить все события
router.get('/', async (req, res) => {
  try {
    const events = await Event.find().populate('organizer', 'username');
    res.json(events);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Создать новое событие
router.post('/', async (req, res) => {
  const event = new Event({
    title: req.body.title,
    description: req.body.description,
    date: req.body.date,
    location: req.body.location,
    organizer: '64a2f3d5e2c63e001c3d7c0e' // Temporary hardcoded organizer ID
  });

  try {
    const newEvent = await event.save();
    res.status(201).json(newEvent);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Добавьте здесь другие маршруты (GET /:id, PUT /:id, DELETE /:id)

module.exports = router;
