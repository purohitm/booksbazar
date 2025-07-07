const express = require('express');
const router = express.Router();
const axios = require('axios');
const { models } = require('../config/db');
const { Book, User } = models;
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
        const { id } = req.params;

        // Fetch book details from Google Books API
        const response = await axios.get('https://www.googleapis.com/books/v1/volumes/' + id)
            .catch(() => ({ data: {} }));

        const book = formatBook(response.data);

        if (!book.title) {
            return res.status(404).render('error', {
                title: 'Book Not Found',
                message: 'The requested book does not exist'
            });
        }

        res.render('books/detail', {
            title: book.title,
            book,
            user: req.user
        });
    } catch (error) {
        console.error('Error loading book details:', error);
        res.render('error', {
            title: 'Error',
            message: 'Error loading book details'
        });
    }
});

// Helper function to format book data
function formatBook(book) {
    return {
        id: book.id,
        title: book.volumeInfo?.title || 'Unknown Title',
        author: book.volumeInfo?.authors?.join(', ') || 'Unknown Author',
        description: book.volumeInfo?.description || 'No description available',
        price: book.saleInfo?.listPrice?.amount || 'Not available',
        coverImage: book.volumeInfo?.imageLinks?.thumbnail || '/images/default-book.png',
        publishedDate: book.volumeInfo?.publishedDate || 'Unknown',
        pageCount: book.volumeInfo?.pageCount || 0,
        categories: book.volumeInfo?.categories || ['Uncategorized'],
        condition: 'new', // Default condition since we're using Google Books API
        isbn: book.volumeInfo?.industryIdentifiers?.[0]?.identifier || 'Not available',
        publisher: book.volumeInfo?.publisher || 'Unknown Publisher',
        language: book.volumeInfo?.language || 'Unknown',
        rating: book.volumeInfo?.averageRating || 0,
        ratingCount: book.volumeInfo?.ratingsCount || 0,
        previewLink: book.volumeInfo?.previewLink || '#'
    };
}

// Category route
router.get('/category/:category', async (req, res) => {
    try {
        const { category } = req.params;
        const { sort = 'relevance', minPrice, maxPrice, condition } = req.query;

        // Map category slugs to Google Books subjects
        const categoryMap = {
            fiction: 'subject:fiction',
            'non-fiction': 'subject:nonfiction',
            academic: 'subject:academic',
            science: 'subject:science',
            history: 'subject:history'
        };

        // Get category info
        const categories = [
            {
                name: 'Fiction',
                description: 'Explore the world of imagination',
                slug: 'fiction'
            },
            {
                name: 'Non-Fiction',
                description: 'Learn and discover new knowledge',
                slug: 'non-fiction'
            },
            {
                name: 'Academic',
                description: 'Educational and reference materials',
                slug: 'academic'
            },
            {
                name: 'Science',
                description: 'Explore the mysteries of science',
                slug: 'science'
            },
            {
                name: 'History',
                description: 'Discover the past',
                slug: 'history'
            }
        ];

        const categoryInfo = categories.find(c => c.slug === category);
        if (!categoryInfo) {
            return res.status(404).render('error', {
                title: 'Category Not Found',
                message: 'The requested category does not exist'
            });
        }

        // Build query parameters
        const queryParams = {
            q: categoryMap[category],
            orderBy: sort,
            maxResults: 20
        };

        // Add price filters if provided
        if (minPrice) queryParams.minPrice = minPrice;
        if (maxPrice) queryParams.maxPrice = maxPrice;

        // Fetch books from Google Books API
        const response = await axios.get('https://www.googleapis.com/books/v1/volumes', {
            params: queryParams
        }).catch(() => ({ data: { items: [] } }));

        // Format the books
        const books = (response?.data?.items || []).map(book => formatBook(book));

        res.render('books/category', {
            title: `${categoryInfo.name} Books`,
            categoryName: categoryInfo.name,
            categoryDescription: categoryInfo.description,
            books,
            user: req.user
        });
    } catch (error) {
        console.error('Error loading category:', error);
        res.render('error', {
            title: 'Error',
            message: 'Error loading books for this category'
        });
    }
});

module.exports = router;
