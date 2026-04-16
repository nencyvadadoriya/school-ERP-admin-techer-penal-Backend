const Event = require('../models/Event');
const Notification = require('../models/Notification');

const createEvent = async (req, res) => {
  try {
    const event = await Event.create(req.body);
    
    // Create notification for all
    await Notification.create({
      title: 'New Event: ' + event.title,
      message: event.description || 'A new event has been scheduled.',
      recipient_type: 'All'
    });

    res.status(201).json({ success: true, message: 'Event created', data: event });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
};

const getAllEvents = async (req, res) => {
  try {
    const data = await Event.find({ is_delete: false }).sort({ event_date: 1 });
    res.json({ success: true, count: data.length, data });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
};

const updateEvent = async (req, res) => {
  try {
    const data = await Event.findOneAndUpdate({ _id: req.params.id, is_delete: false }, req.body, { new: true });
    res.json({ success: true, message: 'Updated', data });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
};

const deleteEvent = async (req, res) => {
  try {
    await Event.findByIdAndUpdate(req.params.id, { is_delete: true });
    res.json({ success: true, message: 'Deleted' });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
};

module.exports = { createEvent, getAllEvents, updateEvent, deleteEvent };
