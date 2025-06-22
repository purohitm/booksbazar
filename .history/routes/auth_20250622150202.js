const express = require('express');
const passport = require('passport');
const router = express.Router();
const User = require('../models/User');

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
        
        if (password !== confirmPassword) {
            req.flash('error', 'Passwords do not match');
            return res.redirect('/auth/register');
        }

        const existingUser = await User.findOne({ where: { email } });
        if (existingUser) {
            req.flash('error', 'Email already registered');
            return res.redirect('/auth/register');
        }

        const user = await User.create({
            name,
            email,
            password
        });

        req.login(user, (err) => {
            if (err) {
                req.flash('error', 'Registration failed');
                return res.redirect('/auth/register');
            }
            res.redirect('/');
        });
    } catch (error) {
        req.flash('error', 'Registration failed');
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

module.exports = router;
