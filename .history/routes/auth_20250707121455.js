const express = require('express');
const passport = require('passport');
const router = express.Router();
const { models } = require('../config/db');
const User = models.User;

// GET /auth/login - Show login form
router.get('/login', (req, res) => {
    res.render('auth/login', { 
        title: 'Login',
        message: req.flash('error')
    });
});

// GET /auth/register - Show registration form
router.get('/register', (req, res) => {
    res.render('auth/register', { 
        title: 'Register',
        message: req.flash('error')
    });
});

// POST /auth/register - Handle user registration
router.post('/register', async (req, res) => {
    try {
        const { name, email, password, confirmPassword } = req.body;
        
        // Validate input
        if (!name || !email || !password || !confirmPassword) {
            req.flash('error', 'All fields are required');
            return res.redirect('/auth/register');
        }

        if (password !== confirmPassword) {
            req.flash('error', 'Passwords do not match');
            return res.redirect('/auth/register');
        }

        if (password.length < 6) {
            req.flash('error', 'Password must be at least 6 characters long');
            return res.redirect('/auth/register');
        }

        // Check if user exists
        const existingUser = await User.findOne({
            where: {
                email
            }
        });
        if (existingUser) {
            req.flash('error', 'Email already registered');
            return res.redirect('/auth/register');
        }

        // Create user
        const user = await User.create({
            name,
            email,
            password
        });

        // Redirect to login page with success message
        req.flash('success', 'Registration successful! Please login.');
        res.redirect('/auth/login');

    } catch (error) {
        console.error('Registration error:', error);
        req.flash('error', 'Registration failed. Please try again.');
        res.redirect('/auth/register');
    }
});

// POST /auth/login - Handle user login
router.post('/login', 
    passport.authenticate('local', {
        successRedirect: '/',
        failureRedirect: '/auth/login',
        failureFlash: true
    })
);

// GET /auth/logout - Handle user logout
router.get('/logout', (req, res) => {
    req.logout();
    res.redirect('/');
});

// POST /auth/logout - Handle logout
router.post('/logout', (req, res) => {
    req.logout((err) => {
        if (err) {
            console.error('Logout error:', err);
            return res.redirect('/auth/login');
        }
        req.flash('success', 'You have been logged out');
        res.redirect('/auth/login');
    });
});

module.exports = router;
