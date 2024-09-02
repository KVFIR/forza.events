const express = require('express');
const router = express.Router();
const Event = require('../models/Event');
const { isAuthenticated } = require('../middleware/auth');
const Joi = require('joi');

// Схема валидации для события
const eventSchema = Joi.object({
  title: Joi.string().min(3).max(100).required(),
  description: Joi.string().min(10).max(1000).required(),
  date: Joi.date().iso().required(),
  location: Joi.string().min(3).max(100).required(),
});

// Получить все события
router.get('/', async (req, res) => {
  try {
    const events = await Event.find()
      .populate('organizer', 'username')
      .populate('participants', 'username discordId avatar'); // Убедитесь, что участники загружаются как объекты
    res.json(events);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Создать новое событие
router.post('/', isAuthenticated, async (req, res) => {
  const { error } = eventSchema.validate(req.body);
  if (error) {
    return res.status(400).json({ message: error.details[0].message });
  }

  console.log('Received request to create event. User:', req.user);
  const event = new Event({
    title: req.body.title,
    description: req.body.description,
    date: req.body.date,
    location: req.body.location,
    organizer: req.user._id
  });

  try {
    const newEvent = await event.save();
    console.log('Event created successfully:', newEvent);
    res.status(201).json(newEvent);
  } catch (error) {
    console.error('Error creating event:', error);
    res.status(400).json({ message: error.message });
  }
});

// Get a specific event
router.get('/:id', async (req, res) => {
  try {
    const event = await Event.findById(req.params.id)
      .populate('organizer', 'username discordId avatar')
      .populate('participants', 'username discordId avatar');
    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }
    res.json(event);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Update an event
router.put('/:id', isAuthenticated, async (req, res) => {
  const { error } = eventSchema.validate(req.body);
  if (error) {
    return res.status(400).json({ message: error.details[0].message });
  }

  try {
    const event = await Event.findById(req.params.id);
    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }
    if (event.organizer.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'You are not authorized to edit this event' });
    }
    
    event.title = req.body.title;
    event.description = req.body.description;
    event.date = req.body.date;
    event.location = req.body.location;
    
    const updatedEvent = await event.save();
    res.json(updatedEvent);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Delete an event
router.delete('/:id', isAuthenticated, async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }
    if (event.organizer.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'You are not authorized to delete this event' });
    }
    
    await Event.findByIdAndDelete(req.params.id);
    res.json({ message: 'Event deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Join an event
router.post('/:id/join', isAuthenticated, async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) {
      return res.status(404).json({ message: 'Событие не найдено' });
    }
    
    if (event.participants.some(participant => participant.toString() === req.user._id.toString())) {
      return res.status(400).json({ message: 'Вы уже присоединились к этому событию' });
    }
    
    event.participants.push(req.user._id);
    await event.save();
    
    const updatedEvent = await Event.findById(req.params.id)
      .populate('organizer', 'username')
      .populate('participants', 'username');
    
    res.json(updatedEvent);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Unregister from an event
router.post('/:id/unregister', isAuthenticated, async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) {
      return res.status(404).json({ message: 'Событие не найдено' });
    }
    
    const participantIndex = event.participants.indexOf(req.user._id);
    if (participantIndex === -1) {
      return res.status(400).json({ message: 'Вы не зарегистрированы на это событие' });
    }
    
    event.participants.splice(participantIndex, 1);
    await event.save();
    
    const updatedEvent = await Event.findById(req.params.id)
      .populate('organizer', 'username discordId avatar')
      .populate('participants', 'username discordId avatar');
    
    res.json(updatedEvent);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get events for a user
router.get('/user/:userId', async (req, res) => {
  try {
    const events = await Event.find({ 
      $or: [
        { organizer: req.params.userId },
        { participants: req.params.userId }
      ]
    }).sort({ date: 1 });
    res.json(events);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
