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

// Helper function to format book data
function formatBook(book) {
    if (!book || !book.volumeInfo) return null;
    return {
        id: book.id,
        title: book.volumeInfo.title || 'Unknown Title',
        author: book.volumeInfo.authors?.join(', ') || 'Unknown Author',
        description: book.volumeInfo.description || 'No description available',
        price: book.saleInfo?.listPrice?.amount || 'Not available',
        coverImage: book.volumeInfo.imageLinks?.thumbnail || '/images/default-book.png',
        publishedDate: book.volumeInfo.publishedDate || 'Unknown',
        pageCount: book.volumeInfo.pageCount || 0,
        categories: book.volumeInfo.categories || ['Uncategorized']
    };
}

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
            }).catch(err => ({ data: { items: [] } })),
            axios.get('https://www.googleapis.com/books/v1/volumes', {
                params: {
                    q: 'subject:non-fiction',
                    orderBy: 'relevance',
                    maxResults: 4
                }
            }).catch(err => ({ data: { items: [] } })),
            axios.get('https://www.googleapis.com/books/v1/volumes', {
                params: {
                    q: 'subject:academic',
                    orderBy: 'relevance',
                    maxResults: 4
                }
            }).catch(err => ({ data: { items: [] } }))
        ]);

        // Format the books data
        const books = [
            ...(fictionBooks.data?.items || []).map(formatBook).filter(book => book),
            ...(nonFictionBooks.data?.items || []).map(formatBook).filter(book => book),
            ...(academicBooks.data?.items || []).map(formatBook).filter(book => book)
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
        }).catch(err => ({ data: { items: [] } }));

        const books = (response.data?.items || []).map(formatBook).filter(book => book);

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

// Category route
router.get('/books/category/:slug', async (req, res) => {
    try {
        const { slug, page = 1 } = req.params;
        const pageSize = 12;
        const startIndex = (page - 1) * pageSize;
        
        // Map category slugs to search queries
        const categoryQueries = {
            'fiction': 'subject:fiction',
            'non-fiction': 'subject:non-fiction',
            'academic': 'subject:academic',
            'science': 'subject:science',
            'history': 'subject:history'
        };

        // Get category info
        const category = categories.find(cat => cat.slug === slug);
        if (!category) {
            return res.status(404).render('error', {
                title: 'Category Not Found',
                message: 'The requested category does not exist',
                user: req.user
            });
        }

        // Get books for this category
        const response = await axios.get('https://www.googleapis.com/books/v1/volumes', {
            params: {
                q: categoryQueries[slug],
                orderBy: 'relevance',
                startIndex,
                maxResults: pageSize
            }
        }).catch(err => ({ data: { items: [] } }));

        // Format books
        const books = (response.data?.items || []).map(formatBook).filter(book => book);

        // Calculate pagination
        const totalBooks = response.data?.totalItems || 0;
        const totalPages = Math.ceil(totalBooks / pageSize);
        const currentPage = parseInt(page);
        const previousPage = currentPage > 1 ? currentPage - 1 : null;
        const nextPage = currentPage < totalPages ? currentPage + 1 : null;

        res.render('books/category', {
            title: `${category.name} Books`,
            categoryName: category.name,
            categoryDescription: category.description,
            categorySlug: category.slug,
            books,
            pagination: {
                currentPage,
                totalPages,
                previous: previousPage,
                next: nextPage
            },
            user: req.user
        });
    } catch (error) {
        console.error('Error loading category:', error);
        res.render('error', {
            title: 'Error',
            message: 'Error loading books for this category',
            user: req.user
        });
    }
});

// Book detail route
router.get('/books/:id', async (req, res) => {
    try {
        const { id } = req.params;

        // Get book details from Google Books API
        const response = await axios.get('https://www.googleapis.com/books/v1/volumes/' + id);
        const book = response.data;

        // Format book data
        const formattedBook = {
            id: book.id,
            title: book.volumeInfo.title,
            author: book.volumeInfo.authors?.join(', ') || 'Unknown Author',
            description: book.volumeInfo.description || 'No description available',
            coverImage: book.volumeInfo.imageLinks?.thumbnail || '/images/default-book.png',
            publishedDate: book.volumeInfo.publishedDate || 'Unknown',
            pageCount: book.volumeInfo.pageCount || 0,
            language: book.volumeInfo.language,
            categories: book.volumeInfo.categories || ['Uncategorized'],
            previewLink: book.volumeInfo.previewLink,
            saleInfo: book.saleInfo || {
                listPrice: {
                    amount: 'Not available'
                }
            }
        };

        // Get similar books
        const similarResponse = await axios.get('https://www.googleapis.com/books/v1/volumes', {
            params: {
                q: `related:${book.volumeInfo.title}`,
                maxResults: 4
            }
        });

        // Format similar books
        const similarBooks = (similarResponse.data?.items || [])
            .map(book => formatBook(book))
            .filter(book => book);

        res.render('books/detail', {
            title: formattedBook.title,
            book: formattedBook,
            similarBooks,
            user: req.user
        });
    } catch (error) {
        console.error('Error loading book details:', error);
        res.render('error', {
            title: 'Error',
            message: 'Error loading book details',
            user: req.user
        });
    }
});

module.exports = router;
