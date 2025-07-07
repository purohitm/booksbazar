const express = require('express');
const router = express.Router();
const axios = require('axios');
const { models, Sequelize } = require('../config/db');
const Book = models.Book;
const Op = Sequelize.Op;

// Define book categories
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

// Function to format book data
function formatBook(book) {
    return {
        id: book.id,
        title: book.volumeInfo.title,
        author: book.volumeInfo.authors?.join(', ') || 'Unknown Author',
        price: book.saleInfo?.listPrice?.amount || 'Not available',
        coverImage: book.volumeInfo.imageLinks?.thumbnail || '/images/default-book.png'
    };
}

// Home page route
router.get('/', async (req, res) => {
    try {
        // Get featured books (top 4 books)
        const featuredBooks = await Book.findAll({
            limit: 4,
            order: [['createdAt', 'DESC']]
        });

        // Get trending books from Google Books API
        const googleBooksResponse = await axios.get('https://www.googleapis.com/books/v1/volumes', {
            params: {
                q: 'subject:fiction',
                orderBy: 'relevance',
                maxResults: 4
            }
        });

        // Combine local and Google Books data
        const books = featuredBooks.map(book => ({
            id: book.id,
            title: book.title,
            author: book.author,
            price: book.price,
            coverImage: book.coverImage
        }));

        res.render('index', {
            title: 'BooksBazar - Find Your Next Great Read',
            categories,
            featuredBooks: books,
            user: req.user
        });
    } catch (error) {
        console.error('Error loading home page:', error);
        res.render('index', {
            title: 'BooksBazar - Find Your Next Great Read',
            categories,
            featuredBooks: [],
            user: req.user,
            error: 'Error loading featured books'
        });
    }
});

// Search route
router.get('/books/search', async (req, res) => {
    try {
        const { query, page = 1, sort = 'relevance' } = req.query;
        const itemsPerPage = 12;
        const startIndex = (page - 1) * itemsPerPage;

        // Fetch books from Google Books API
        const response = await axios.get('https://www.googleapis.com/books/v1/volumes', {
            params: {
                q: query,
                orderBy: sort,
                startIndex,
                maxResults: itemsPerPage
            }
        }).catch(() => ({ data: { items: [], totalItems: 0 } }));

        // Format the books
        const books = (response?.data?.items || []).map(book => formatBook(book));
        const totalItems = response?.data?.totalItems || 0;

        // Calculate pagination
        const totalPages = Math.ceil(totalItems / itemsPerPage);
        const previousPage = page > 1 ? page - 1 : null;
        const nextPage = page < totalPages ? page + 1 : null;

        res.render('books/search', {
            title: `Search Results for "${query}"`,
            books,
            query,
            pagination: {
                currentPage: page,
                totalPages,
                previous: previousPage,
                next: nextPage
            },
            user: req.user
        });
    } catch (error) {
        console.error('Error searching books:', error);
        res.render('books/search', {
            title: 'Search Results',
            books: [],
            query: req.query.query || '',
            user: req.user,
            error: 'Error searching books'
        });
    }
});

module.exports = router;
