const express = require('express');
const router = express.Router();
const Book = require('../models/Book');
const auth = require('../middleware/auth');

// GET /books - Browse all books
router.get('/', async (req, res) => {
    try {
        const books = await Book.findAll({
            order: [['createdAt', 'DESC']]
        });
        res.render('books/browse', {
            title: 'Browse Books',
            books
        });
    } catch (error) {
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
        res.redirect('/books');
    } catch (error) {
        res.status(500).render('error', { message: 'Error creating book' });
    }
});

// GET /books/:id - View book details
router.get('/:id', async (req, res) => {
    try {
        const book = await Book.findByPk(req.params.id);
        if (!book) {
            return res.status(404).render('error', { message: 'Book not found' });
        }
        res.render('books/details', {
            title: book.title,
            book
        });
    } catch (error) {
        res.status(500).render('error', { message: 'Error fetching book' });
    }
});

module.exports = router;
