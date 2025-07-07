const express = require('express');
const router = express.Router();
const axios = require('axios');

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

// Home page route
router.get('/', async (req, res) => {
    try {
        // Fetch books from Google Books API
        const [fictionBooks, nonFictionBooks, academicBooks] = await Promise.all([
            axios.get('https://www.googleapis.com/books/v1/volumes', {
                params: {
                    q: 'subject:fiction',
                    orderBy: 'relevance',
                    maxResults: 4
                }
            }),
            axios.get('https://www.googleapis.com/books/v1/volumes', {
                params: {
                    q: 'subject:non-fiction',
                    orderBy: 'relevance',
                    maxResults: 4
                }
            }),
            axios.get('https://www.googleapis.com/books/v1/volumes', {
                params: {
                    q: 'subject:academic',
                    orderBy: 'relevance',
                    maxResults: 4
                }
            })
        ]);

        // Format the books data
        const books = [
            ...fictionBooks.data.items.map(book => formatBook(book)),
            ...nonFictionBooks.data.items.map(book => formatBook(book)),
            ...academicBooks.data.items.map(book => formatBook(book))
        ];

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
        const { query } = req.query;
        
        // Search Google Books API
        const response = await axios.get('https://www.googleapis.com/books/v1/volumes', {
            params: {
                q: query,
                maxResults: 20
            }
        });

        const books = response.data.items.map(book => formatBook(book));

        res.render('books/search', {
            title: `Search Results for "${query}"`,
            books,
            query,
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

// Helper function to format book data
function formatBook(book) {
    return {
        id: book.id,
        title: book.volumeInfo.title,
        author: book.volumeInfo.authors?.join(', ') || 'Unknown Author',
        description: book.volumeInfo.description || 'No description available',
        price: book.saleInfo?.listPrice?.amount || 'Not available',
        coverImage: book.volumeInfo.imageLinks?.thumbnail || '/images/default-book.png',
        publishedDate: book.volumeInfo.publishedDate || 'Unknown',
        pageCount: book.volumeInfo.pageCount || 0,
        categories: book.volumeInfo.categories || ['Uncategorized']
    };
}

module.exports = router;
