const express = require('express');
const { models } = require('../config/db');
const { Book, User } = models;
const router = express.Router();
const auth = require('../middleware/auth');

// GET /books - Show all books
router.get('/', async (req, res) => {
    try {
        const books = await Book.findAll({
            include: [
                {
                    model: User,
                    as: 'seller',
                    attributes: ['name', 'email']
                }
            ],
            order: [['createdAt', 'DESC']]
        });
        res.render('books/browse', {
            title: 'Browse Books',
            books,
            user: req.user
        });
    } catch (error) {
        console.error('Error fetching books:', error);
        res.status(500).render('error', { message: 'Error fetching books' });
    }
});

// GET /books/sell - Show sell book form
router.get('/sell', auth, (req, res) => {
    res.render('books/sell', {
        title: 'Sell a Book'
    });
});

// POST /books/sell - Handle book submission
router.post('/sell', auth, async (req, res) => {
    try {
        const { title, author, description, price, condition } = req.body;
        const book = await Book.create({
            title,
            author,
            description,
            price: parseFloat(price),
            condition,
            sellerId: req.user.id
        });
        req.flash('success', 'Book created successfully!');
        res.redirect('/books');
    } catch (error) {
        console.error('Error creating book:', error);
        req.flash('error', 'Error creating book');
        res.redirect('/books/sell');
    }
});

// GET /books/:id - Show book details
router.get('/:id', async (req, res) => {
    try {
        const book = await Book.findByPk(req.params.id, {
            include: [
                {
                    model: User,
                    as: 'seller',
                    attributes: ['name', 'email']
                }
            ]
        });
        if (!book) {
            req.flash('error', 'Book not found');
            res.redirect('/books');
            return;
        }
        res.render('books/details', {
            title: book.title,
            book,
            user: req.user
        });
    } catch (error) {
        console.error('Error fetching book:', error);
        req.flash('error', 'Error fetching book');
        res.redirect('/books');
    }
});

// POST /books/:id/delete - Delete a book
router.post('/:id/delete', auth, async (req, res) => {
    try {
        const book = await Book.findByPk(req.params.id);
        if (!book) {
            req.flash('error', 'Book not found');
            res.redirect('/books');
            return;
        }

        if (book.sellerId !== req.user.id) {
            req.flash('error', 'You can only delete your own books');
            res.redirect(`/books/${req.params.id}`);
            return;
        }

        await book.destroy();
        req.flash('success', 'Book deleted successfully');
        res.redirect('/books');
    } catch (error) {
        console.error('Error deleting book:', error);
        req.flash('error', 'Error deleting book');
        res.redirect('/books');
    }
});

module.exports = router;
