const express = require('express');
const session = require('express-session');
const passport = require('passport');
const flash = require('connect-flash');
const path = require('path');
require('dotenv').config();

// Create uploads directory if it doesn't exist
const fs = require('fs');
const uploadDir = path.join(__dirname, 'public/uploads/profile-pictures');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

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

// Add user to all routes
app.use((req, res, next) => {
    res.locals.user = req.user;
    next();
});

// Routes
app.use('/', require('./routes/index'));
app.use('/auth', require('./routes/auth'));
app.use('/books', require('./routes/books'));
app.use('/profile', require('./routes/profile'));
app.use('/about', require('./routes/about'));
app.use('/contact', require('./routes/contact'));

// Root route - redirect to login if not authenticated
// app.get('/', (req, res) => {
//     if (!req.isAuthenticated()) {
//         res.redirect('/auth/login');
//     } else {
//         res.render('books/browse', {
//             title: 'Browse Books',
//             user: req.user
//         });
//     }
// });

app.get('/', (req, res) => {
    res.render('index', {
        title: 'BooksBazar - Find Your Next Great Read',
        user: req.user
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
