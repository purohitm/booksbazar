const express = require('express');
const router = express.Router();

// GET /contact
router.get('/', (req, res) => {
    res.render('contact/index');
});

// POST /contact - Handle contact form submission
router.post('/', (req, res) => {
    const { name, email, subject, message } = req.body;
    
    // Here you would typically:
    // 1. Validate the form data
    // 2. Send an email or store the message
    // 3. Log the message
    
    // For now, we'll just show a success message
    res.render('contact/index', {
        success: true,
        message: 'Thank you for your message! We will get back to you soon.'
    });
});

module.exports = router;
