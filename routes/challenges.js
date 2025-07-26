const express = require('express');
const router = express.Router();
const Challenge = require('../models/challenge');
const UserAttempts = require('../models/user-attempts');
const Book = require('../models/book');
const auth = require('../middleware/auth');
const multer = require('multer');
const upload = multer(); // memory storage, no files, just fields
const { Cart } = require('../config/db');

// Check if book has a challenge
router.get('/check/:bookId', async (req, res) => {
    try {
        const challenge = await Challenge.findOne({
            where: { 
                bookId: req.params.bookId,
                isActive: true 
            }
        });
        
        res.json({ hasChallenge: !!challenge });
    } catch (error) {
        console.error('Error checking challenge:', error);
        res.status(500).json({ error: 'Failed to check challenge' });
    }
});

// Create a challenge (Phase 2 will have the form, for now just API endpoint)
router.post('/create', auth, upload.none(), async (req, res) => {
    try {
        console.log('DEBUG: req.body from form =', req.body);
        const { bookId, question, answer, difficulty } = req.body;
        
        // Improved debug logging and type-safe comparison
        console.log('DEBUG: req.body from form =', req.body);
        const book = await Book.findByPk(bookId);
        console.log('DEBUG: book from DB =', book ? book.toJSON() : 'BOOK NOT FOUND');
        console.log('DEBUG: req.user.id =', req.user.id, 'typeof req.user.id =', typeof req.user.id);
        if (!book || String(book.userId) !== String(req.user.id)) {
            console.log('DEBUG: Ownership check failed. book.userId =', book ? book.userId : 'N/A', 'req.user.id =', req.user.id);
            return res.status(403).json({ error: 'You can only lock your own books' });
        }
        
        // Check if challenge already exists
        const existingChallenge = await Challenge.findOne({
            where: { bookId, isActive: true }
        });
        
        if (existingChallenge) {
            return res.status(400).json({ error: 'This book already has a challenge' });
        }
        
        // Create challenge
        const challenge = await Challenge.create({
            bookId,
            ownerId: req.user.id,
            question,
            answer: answer.toLowerCase().trim(), // Store answer in lowercase for easier comparison
            difficulty: difficulty || 1,
            isActive: true // Ensure challenge is active
        });
        
        res.json({ message: 'Challenge created successfully', challengeId: challenge.id });
    } catch (error) {
        console.error('Error creating challenge:', error);
        res.status(500).json({ error: 'Failed to create challenge' });
    }
});

// Get challenge for a book
router.get('/:bookId', async (req, res) => {
    try {
        const challenge = await Challenge.findOne({
            where: { 
                bookId: req.params.bookId,
                isActive: true 
            },
            attributes: ['id', 'question', 'difficulty'] // Don't send the answer!
        });
        
        if (!challenge) {
            return res.status(404).json({ error: 'No challenge found for this book' });
        }
        
        // Get user's attempt count if logged in
        let attemptCount = 0;
        if (req.user) {
            const attempts = await UserAttempts.findAll({
                where: {
                    challengeId: challenge.id,
                    userId: req.user.id
                }
            });
            attemptCount = attempts.length;
        }
        
        res.json({ 
            challenge: {
                id: challenge.id,
                question: challenge.question,
                difficulty: challenge.difficulty
            },
            attemptCount
        });
    } catch (error) {
        console.error('Error fetching challenge:', error);
        res.status(500).json({ error: 'Failed to fetch challenge' });
    }
});

// Submit answer (Phase 3 will have the UI, for now just API)
router.post('/:challengeId/attempt', auth, async (req, res) => {
    try {
        const { answer } = req.body;
        const challengeId = req.params.challengeId;
        
        // Get challenge
        const challenge = await Challenge.findByPk(challengeId);
        if (!challenge) {
            return res.status(404).json({ error: 'Challenge not found' });
        }
        
        // Count previous attempts
        const previousAttempts = await UserAttempts.findAll({
            where: {
                challengeId,
                userId: req.user.id
            }
        });
        
        const attemptNumber = previousAttempts.length + 1;
        const isCorrect = answer.toLowerCase().trim() === challenge.answer;
        
        // Save attempt
        await UserAttempts.create({
            challengeId,
            userId: req.user.id,
            attempt: answer,
            isCorrect,
            attemptNumber
        });
        
        if (isCorrect) {
            // Add book to cart for free if not already present
            const bookId = challenge.bookId;
            let cartItem = await Cart.findOne({ where: { userId: req.user.id, bookId } });
            if (!cartItem) {
                await Cart.create({ userId: req.user.id, bookId, quantity: 1 });
            }
            return res.json({ 
                success: true, 
                message: 'Correct! Book unlocked and added to your cart for free.'
            });
        } else {
            const showHint = attemptNumber >= 3;
            return res.json({ 
                success: false, 
                message: 'Incorrect answer, try again.',
                attemptNumber,
                showHint,
                hint: showHint ? 'Think about the main theme of the book' : null
            });
        }
    } catch (error) {
        console.error('Error submitting attempt:', error);
        res.status(500).json({ error: 'Failed to submit attempt' });
    }
});

// POST /challenges/remove/:bookId - Remove challenge (unlock book)
router.post('/remove/:bookId', auth, async (req, res) => {
    try {
        const { bookId } = req.params;
        // Find the challenge for this book
        const challenge = await Challenge.findOne({
            where: { bookId }
        });
        if (!challenge) {
            return res.status(404).json({ error: 'No challenge found for this book' });
        }
        // Verify the user owns the book/challenge
        if (challenge.ownerId !== req.user.id) {
            return res.status(403).json({ error: 'You can only remove challenges for your own books' });
        }
        // Delete the challenge and all related attempts
        await UserAttempts.destroy({
            where: { challengeId: challenge.id }
        });
        await Challenge.destroy({
            where: { id: challenge.id }
        });
        // If AJAX, send JSON; if form, redirect
        if (req.headers.accept && req.headers.accept.indexOf('application/json') !== -1) {
            return res.json({ 
                success: true, 
                message: 'Challenge removed successfully. Book is now available for direct purchase.' 
            });
        } else {
            req.flash('success', 'Challenge removed and book unlocked.');
            return res.redirect('/profile/books');
        }
    } catch (error) {
        console.error('Error removing challenge:', error);
        if (req.headers.accept && req.headers.accept.indexOf('application/json') !== -1) {
            res.status(500).json({ error: 'Failed to remove challenge' });
        } else {
            req.flash('error', 'Failed to remove challenge.');
            res.redirect('/profile/books');
        }
    }
});

module.exports = router;
