const express = require('express');
const { models } = require('../config/db');
const { User } = models;
const router = express.Router();
const auth = require('../middleware/auth');
const multer = require('multer');
const path = require('path');

// Configure multer for file uploads
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'public/uploads/profile-pictures/');
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + path.extname(file.originalname));
    }
});

const upload = multer({
    storage: storage,
    limits: {
        fileSize: 5 * 1024 * 1024 // 5MB limit
    },
    fileFilter: function (req, file, cb) {
        const filetypes = /jpeg|jpg|png|gif/;
        const mimetype = filetypes.test(file.mimetype);
        const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
        
        if (mimetype && extname) {
            return cb(null, true);
        }
        cb(new Error('Only .jpeg, .jpg, .png and .gif format allowed!'));
    }
});

// GET /profile - Show user profile
router.get('/', auth, async (req, res) => {
    try {
        const user = await User.findByPk(req.user.id, {
            attributes: ['id', 'name', 'email', 'role', 'profilePicture']
        });
        res.render('profile/index', {
            title: 'My Profile',
            user,
            profilePicture: user.profilePicture ? `/uploads/profile-pictures/${user.profilePicture}` : '/images/default-profile.png'
        });
    } catch (error) {
        console.error('Error fetching profile:', error);
        req.flash('error', 'Error loading profile');
        res.redirect('/');
    }
});

// GET /profile/edit - Show edit profile form
router.get('/edit', auth, async (req, res) => {
    try {
        const user = await User.findByPk(req.user.id, {
            attributes: ['id', 'name', 'email', 'role', 'profilePicture']
        });
        res.render('profile/edit', {
            title: 'Edit Profile',
            user,
            profilePicture: user.profilePicture ? `/uploads/profile-pictures/${user.profilePicture}` : '/images/default-profile.png'
        });
    } catch (error) {
        console.error('Error fetching profile:', error);
        req.flash('error', 'Error loading profile');
        res.redirect('/profile');
    }
});

// POST /profile/edit - Handle profile update
router.post('/edit', auth, upload.single('profilePicture'), async (req, res) => {
    try {
        const { name } = req.body;
        const updateData = {
            name
        };

        // Handle profile picture upload
        if (req.file) {
            updateData.profilePicture = req.file.filename;
        }

        await User.update(updateData, {
            where: {
                id: req.user.id
            }
        });

        req.flash('success', 'Profile updated successfully');
        res.redirect('/profile');
    } catch (error) {
        console.error('Error updating profile:', error);
        req.flash('error', 'Error updating profile');
        res.redirect('/profile/edit');
    }
});

// GET /profile/orders - Show user's orders
router.get('/orders', auth, async (req, res) => {
    try {
        const { Order, OrderItem, Book } = require('../config/db').models;
        const orders = await Order.findAll({
            where: { userId: req.user.id },
            include: [{ model: OrderItem, as: 'items', include: [{ model: Book, as: 'book' }] }],
            order: [['createdAt', 'DESC']]
        });
        res.render('profile/orders', {
            title: 'My Orders',
            orders,
            user: req.user
        });
    } catch (error) {
        console.error('Error fetching orders:', error);
        req.flash('error', 'Error loading orders');
        res.redirect('/profile');
    }
});

// GET /profile/books - Show user's listed books
router.get('/books', auth, async (req, res) => {
    try {
        const { Book } = require('../config/db').models;
        const books = await Book.findAll({
            where: { userId: req.user.id },
            order: [['createdAt', 'DESC']]
        });
        res.render('profile/books', {
            title: 'My Books',
            books,
            user: req.user
        });
    } catch (error) {
        console.error('Error fetching user books:', error);
        req.flash('error', 'Error loading your books');
        res.redirect('/profile');
    }
});

module.exports = router;
