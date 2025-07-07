const express = require('express');
const router = express.Router();
const Wishlist = require('../models/Wishlist');
const Book = require('../models/Book');
const auth = require('../middleware/auth');

// GET /wishlist - Display user's wishlist
router.get('/', auth, async (req, res) => {
    try {
        const wishlistItems = await Wishlist.findAll({
            where: { userId: req.user.id },
            include: [{
                model: Book,
                as: 'book',
                attributes: ['id', 'title', 'author', 'price', 'coverImage']
            }]
        });

        res.render('wishlist/index', {
            title: 'My Wishlist',
            wishlistItems
        });
    } catch (error) {
        console.error('Error fetching wishlist:', error);
        req.flash('error', 'Error fetching wishlist items');
        res.redirect('/books');
    }
});

// POST /wishlist/add - Add book to wishlist
router.post('/add/:bookId', auth, async (req, res) => {
    try {
        const { bookId } = req.params;
        const { notes } = req.body;

        // Check if book is already in wishlist
        const existingWishlist = await Wishlist.findOne({
            where: {
                userId: req.user.id,
                bookId
            }
        });

        if (existingWishlist) {
            return res.status(400).json({
                success: false,
                message: 'Book is already in your wishlist'
            });
        }

        // Add to wishlist
        await Wishlist.create({
            userId: req.user.id,
            bookId,
            notes
        });

        res.json({
            success: true,
            message: 'Book added to wishlist'
        });
    } catch (error) {
        console.error('Error adding to wishlist:', error);
        res.status(500).json({
            success: false,
            message: 'Error adding book to wishlist'
        });
    }
});

// POST /wishlist/remove/:id - Remove book from wishlist
router.post('/remove/:id', auth, async (req, res) => {
    try {
        const wishlistItem = await Wishlist.findByPk(req.params.id);

        if (!wishlistItem || wishlistItem.userId !== req.user.id) {
            return res.status(404).json({
                success: false,
                message: 'Wishlist item not found'
            });
        }

        await wishlistItem.destroy();
        res.json({
            success: true,
            message: 'Book removed from wishlist'
        });
    } catch (error) {
        console.error('Error removing from wishlist:', error);
        res.status(500).json({
            success: false,
            message: 'Error removing book from wishlist'
        });
    }
});

module.exports = router;
