const yup = require('yup');

const eventSchema = yup.object().shape({
  title: yup.string().min(3, 'Title must be at least 3 characters').max(100, 'Title must be at most 100 characters').required('Title is required'),
  description: yup.string().min(10, 'Description must be at least 10 characters').max(1000, 'Description must be at most 1000 characters').required('Description is required'),
  date: yup.date().required('Date is required'),
  location: yup.string().min(3, 'Location must be at least 3 characters').max(100, 'Location must be at most 100 characters').required('Location is required'),
});

module.exports = { eventSchema };
