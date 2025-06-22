const express = require('express');
const session = require('express-session');
const passport = require('passport');
const flash = require('connect-flash');
const path = require('path');
require('dotenv').config();

const app = express();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));
app.set('view engine', 'pug');
app.set('views', path.join(__dirname, 'views'));

// Session configuration
app.use(session({
    secret: process.env.SESSION_SECRET || 'your-secret-key',
    resave: false,
    saveUninitialized: false,
    cookie: {
        maxAge: 10800000 // 3 hours in milliseconds (3 * 60 * 60 * 1000)
    }
}));

// Initialize passport configuration
require('./config/passport')(passport);

// Passport middleware
app.use(passport.initialize());
app.use(passport.session());

// Flash messages
app.use(flash());

// Add middleware to pass flash messages to views
app.use((req, res, next) => {
    res.locals.messages = {
        error: req.flash('error'),
        success: req.flash('success')
    };
    next();
});

// Routes
app.use('/auth', require('./routes/auth'));
app.use('/books', require('./routes/books'));

// Root route - redirect to login if not authenticated
app.get('/', (req, res) => {
    if (!req.isAuthenticated()) {
        res.redirect('/auth/login');
    } else {
        res.render('books/browse', {
            title: 'Browse Books',
            user: req.user
        });
    }
});

// Add logout route
app.get('/logout', (req, res) => {
    req.logout((err) => {
        if (err) {
            console.error('Logout error:', err);
            return res.redirect('/auth/login');
        }
        req.flash('success', 'You have been logged out');
        res.redirect('/auth/login');
    });
});

// Error handling
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).render('error', { message: 'Something broke!' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
