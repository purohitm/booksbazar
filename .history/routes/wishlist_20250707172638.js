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
            }],
            order: [['priority', 'DESC']]
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
        const { priority, category, targetPrice, notes } = req.body;

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

        // Create new wishlist item
        const wishlistItem = await Wishlist.create({
            userId: req.user.id,
            bookId,
            priority: priority || 'medium',
            category: category || 'leisure',
            targetPrice: targetPrice ? parseFloat(targetPrice) : null,
            notes
        });

        res.json({
            success: true,
            message: 'Book added to wishlist',
            wishlistItem
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

// POST /wishlist/update/:id - Update wishlist item
router.post('/update/:id', auth, async (req, res) => {
    try {
        const wishlistItem = await Wishlist.findByPk(req.params.id);
        
        if (!wishlistItem || wishlistItem.userId !== req.user.id) {
            return res.status(404).json({
                success: false,
                message: 'Wishlist item not found'
            });
        }

        await wishlistItem.update(req.body);
        res.json({
            success: true,
            message: 'Wishlist item updated'
        });
    } catch (error) {
        console.error('Error updating wishlist:', error);
        res.status(500).json({
            success: false,
            message: 'Error updating wishlist item'
        });
    }
});

// GET /wishlist/price-check - Check prices for all wishlist items
router.get('/price-check', auth, async (req, res) => {
    try {
        const wishlistItems = await Wishlist.findAll({
            where: { userId: req.user.id, isActive: true },
            include: [{ model: Book, as: 'book' }]
        });

        // TODO: Implement price checking logic
        // This would involve checking current prices and comparing with target prices
        // For now, just return the items
        res.json({
            success: true,
            wishlistItems
        });
    } catch (error) {
        console.error('Error checking prices:', error);
        res.status(500).json({
            success: false,
            message: 'Error checking prices'
        });
    }
});

module.exports = router;
