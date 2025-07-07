const express = require('express');
const router = express.Router();
const axios = require('axios');
const { Book } = require('../config/db');
const { Op } = require('sequelize');

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
        title: book.volumeInfo?.title || 'Unknown Title',
        author: book.volumeInfo?.authors?.join(', ') || 'Unknown Author',
        description: book.volumeInfo?.description || 'No description available',
        price: book.saleInfo?.listPrice?.amount || 'Not available',
        coverImage: book.volumeInfo?.imageLinks?.thumbnail || '/images/default-book.png',
        publishedDate: book.volumeInfo?.publishedDate || 'Unknown',
        pageCount: book.volumeInfo?.pageCount || 0,
        categories: book.volumeInfo?.categories || ['Uncategorized'],
        condition: 'new',
        isbn: book.volumeInfo?.industryIdentifiers?.[0]?.identifier || 'Not available',
        publisher: book.volumeInfo?.publisher || 'Unknown Publisher',
        language: book.volumeInfo?.language || 'Unknown',
        rating: book.volumeInfo?.averageRating || 0,
        ratingCount: book.volumeInfo?.ratingsCount || 0,
        previewLink: book.volumeInfo?.previewLink || '#'
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

        // Log the search parameters for debugging
        console.log('Search parameters:', { query, page, sort });

        // Fetch books from Google Books API
        const response = await axios.get('https://www.googleapis.com/books/v1/volumes', {
            params: {
                q: query,
                orderBy: sort,
                startIndex,
                maxResults: itemsPerPage
            }
        }).catch(error => {
            console.error('Google Books API error:', error);
            return { data: { items: [], totalItems: 0 } };
        });

        // Format the books
        const books = (response?.data?.items || []).map(book => formatBook(book));
        
        // Calculate pagination
        const currentPage = parseInt(page) || 1;
        const totalPages = Math.ceil(books.length / itemsPerPage) || 1;
        const hasPrevious = currentPage > 1;
        const hasNext = currentPage < totalPages;
        const previousPage = hasPrevious ? currentPage - 1 : null;
        const nextPage = hasNext ? currentPage + 1 : null;

        // Log the results for debugging
        console.log('Found books:', books.length);

        res.render('books/search', {
            title: `Search Results for "${query}"`,
            books,
            query,
            sort,
            pagination: {
                currentPage,
                totalPages,
                hasPrevious,
                hasNext,
                previousPage,
                nextPage,
                totalItems: books.length
            },
            user: req.user
        });
    } catch (error) {
        console.error('Error searching books:', error);
        res.render('books/search', {
            title: 'Search Results',
            books: [],
            query: req.query.query || '',
            sort: 'relevance',
            pagination: {
                currentPage: 1,
                totalPages: 0,
                hasPrevious: false,
                hasNext: false,
                previousPage: null,
                nextPage: null,
                totalItems: 0
            },
            user: req.user,
            error: 'Error searching books'
        });
    }
});

// Add Apply Button route
router.post('/books/search', async (req, res) => {
    try {
        const { query, sort } = req.body;
        // Redirect to GET route with parameters
        res.redirect(`/books/search?q=${encodeURIComponent(query)}&sort=${sort}`);
    } catch (error) {
        console.error('Error applying search:', error);
        res.redirect('/books/search');
    }
});

module.exports = router;
