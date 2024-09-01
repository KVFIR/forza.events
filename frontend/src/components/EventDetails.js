import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';

function EventDetails({ user }) {
  const [event, setEvent] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState('');
  const [location, setLocation] = useState('');
  const [error, setError] = useState(null);
  const { id } = useParams();
  const navigate = useNavigate();

  useEffect(() => {
    const fetchEvent = async () => {
      try {
        const response = await axios.get(`/api/events/${id}`);
        setEvent(response.data);
        setTitle(response.data.title);
        setDescription(response.data.description);
        setDate(response.data.date.split('T')[0]);
        setLocation(response.data.location);
      } catch (error) {
        setError('Failed to fetch event details');
      }
    };
    fetchEvent();
  }, [id]);

  const handleEdit = async (e) => {
    e.preventDefault();
    try {
      const response = await axios.put(`/api/events/${id}`, {
        title,
        description,
        date,
        location
      });
      setEvent(response.data);
      setIsEditing(false);
    } catch (error) {
      setError('Failed to update event');
    }
  };

  const handleDelete = async () => {
    if (window.confirm('Are you sure you want to delete this event?')) {
      try {
        await axios.delete(`/api/events/${id}`);
        navigate('/events');
      } catch (error) {
        console.error('Error deleting event:', error);
        if (error.response && error.response.status === 401) {
          setError('You need to be logged in to delete this event.');
          setTimeout(() => {
            navigate('/login');
          }, 2000);
        } else if (error.response) {
          setError(`Failed to delete event: ${error.response.data.message}`);
        } else if (error.request) {
          setError('Failed to delete event: No response received from the server.');
        } else {
          setError(`Failed to delete event: ${error.message}`);
        }
      }
    }
  };

  if (error) return <div>{error}</div>;
  if (!event) return <div>Loading...</div>;

  const isOrganizer = user && event.organizer && user._id === event.organizer._id;

  return (
    <div className="event-details">
      <h2>{event.title}</h2>
      {isEditing ? (
        <form onSubmit={handleEdit}>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
          />
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            required
          />
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            required
          />
          <input
            type="text"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            required
          />
          <button type="submit">Save Changes</button>
          <button type="button" onClick={() => setIsEditing(false)}>Cancel</button>
        </form>
      ) : (
        <>
          <p>Date: {new Date(event.date).toLocaleDateString()}</p>
          <p>Location: {event.location}</p>
          <p>Description: {event.description}</p>
          <p>Organizer: {event.organizer ? event.organizer.username : 'Unknown'}</p>
          {isOrganizer && (
            <>
              <button onClick={() => setIsEditing(true)}>Edit Event</button>
              <button onClick={handleDelete}>Delete Event</button>
            </>
          )}
        </>
      )}
    </div>
  );
}

export default EventDetails;
