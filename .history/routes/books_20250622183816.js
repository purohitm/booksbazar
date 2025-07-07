const express = require('express');
const router = express.Router();
const axios = require('axios');
const { models } = require('../config/db');
const { Book, User, Cart, Saved, Payment, Order, OrderItem } = models;
const auth = require('../middleware/auth');

// GET /books - Display all books
router.get('/', async (req, res) => {
    try {
        // Fetch books from Google Books API
        const response = await axios.get('https://www.googleapis.com/books/v1/volumes', {
            params: {
                q: 'subject:fiction', // You can change this query to get different books
                maxResults: 12,
                orderBy: 'relevance'
            }
        });

        // Format books
        const books = (response?.data?.items || []).map(book => formatBook(book));

        res.render('books/index', {
            title: 'All Books',
            books,
            user: req.user
        });
    } catch (error) {
        console.error('Error fetching books:', error);
        res.render('error', {
            message: 'Error fetching books'
        });
    }
});

// GET /books - Browse all books
router.get('/browse', async (req, res) => {
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

// Add to Cart route
router.post('/:id/add-to-cart', auth, async (req, res) => {
    try {
        const { id } = req.params;
        const user = req.user;

        // Check if book is already in cart
        const existingCart = await Cart.findOne({
            where: {
                userId: user.id,
                bookId: id
            }
        });

        if (existingCart) {
            return res.status(400).json({
                message: 'Book is already in your cart'
            });
        }

        // Add book to cart
        await Cart.create({
            userId: user.id,
            bookId: id,
            quantity: 1
        });

        res.json({
            message: 'Book added to cart successfully'
        });
    } catch (error) {
        console.error('Error adding to cart:', error);
        res.status(500).json({
            message: 'Error adding book to cart'
        });
    }
});

// Save for Later route
router.post('/:id/save', auth, async (req, res) => {
    try {
        const { id } = req.params;
        const user = req.user;

        // Check if book is already saved
        const existingSaved = await Saved.findOne({
            where: {
                userId: user.id,
                bookId: id
            }
        });

        if (existingSaved) {
            return res.status(400).json({
                message: 'Book is already saved for later'
            });
        }

        // Save book
        await Saved.create({
            userId: user.id,
            bookId: id
        });

        res.json({
            message: 'Book saved for later successfully'
        });
    } catch (error) {
        console.error('Error saving book:', error);
        res.status(500).json({
            message: 'Error saving book'
        });
    }
});

// Mock Payment route
router.post('/:id/buy', auth, async (req, res) => {
    try {
        const { id } = req.params;
        const user = req.user;
        const { quantity } = req.body;

        // Get the book
        const book = await Book.findByPk(id);
        if (!book) {
            return res.status(404).json({
                message: 'Book not found'
            });
        }

        // Create a mock payment
        const payment = await Payment.create({
            userId: user.id,
            bookId: id,
            amount: book.price * (quantity || 1),
            status: 'completed',
            paymentMethod: 'mock',
            transactionId: `MOCK-${Date.now()}`
        });

        // Create order
        const order = await Order.create({
            userId: user.id,
            paymentId: payment.id,
            status: 'completed',
            totalAmount: payment.amount
        });

        // Create order item
        await OrderItem.create({
            orderId: order.id,
            bookId: id,
            quantity: quantity || 1,
            price: book.price
        });

        // Remove from cart if it exists
        await Cart.destroy({
            where: {
                userId: user.id,
                bookId: id
            }
        });

        res.json({
            message: 'Payment successful',
            orderId: order.id,
            transactionId: payment.transactionId,
            totalAmount: payment.amount
        });
    } catch (error) {
        console.error('Error processing payment:', error);
        res.status(500).json({
            message: 'Error processing payment'
        });
    }
});

// Get Cart Page
router.get('/cart', auth, async (req, res) => {
    try {
        const user = req.user;
        
        // Get cart items with book details
        const cartItems = await Cart.findAll({
            where: { userId: user.id },
            include: [{
                model: Book,
                attributes: ['id', 'title', 'author', 'price', 'coverImage', 'description', 'publisher', 'publishedDate', 'isbn', 'pageCount', 'categories', 'rating', 'ratingCount', 'previewLink']
            }]
        });

        // Get purchase history
        const purchases = await Order.findAll({
            where: { userId: user.id },
            include: [{
                model: OrderItem,
                include: [{
                    model: Book,
                    attributes: ['id', 'title', 'author', 'price', 'coverImage', 'description', 'publisher', 'publishedDate', 'isbn', 'pageCount', 'categories', 'rating', 'ratingCount', 'previewLink']
                }]
            }]
        });

        // Calculate total amount
        const totalAmount = cartItems.reduce((sum, item) => sum + (item.Book.price * item.quantity), 0);

        res.render('books/cart', {
            title: 'My Cart',
            cartItems,
            totalAmount,
            purchases,
            user,
            moment: require('moment')
        });
    } catch (error) {
        console.error('Error fetching cart:', error);
        res.redirect('/error');
    }
});

// Get Purchase History
router.get('/purchases', auth, async (req, res) => {
    try {
        const user = req.user;
        const purchases = await Order.findAll({
            where: { userId: user.id },
            include: [{
                model: OrderItem,
                include: [{
                    model: Book,
                    attributes: ['id', 'title', 'author', 'price', 'coverImage']
                }]
            }]
        });

        res.json(purchases);
    } catch (error) {
        console.error('Error fetching purchases:', error);
        res.status(500).json({ message: 'Error fetching purchases' });
    }
});

// Checkout route
router.post('/checkout', auth, async (req, res) => {
    try {
        const user = req.user;
        const { 
            firstName, lastName, email, phone, 
            address, city, zip, 
            cardName, cardNumber, expDate, cvv 
        } = req.body;

        // Get cart items
        const cartItems = await Cart.findAll({
            where: { userId: user.id },
            include: [{
                model: Book,
                attributes: ['id', 'title', 'author', 'price']
            }]
        });

        if (!cartItems || cartItems.length === 0) {
            return res.status(400).json({ message: 'Cart is empty' });
        }

        // Calculate total amount
        const totalAmount = cartItems.reduce((sum, item) => sum + (item.Book.price * item.quantity), 0);

        // Create mock payment details
        const paymentDetails = {
            transactionId: `MOCK-${Date.now()}`,
            method: 'Credit Card',
            status: 'Completed',
            date: new Date().toISOString(),
            cardLast4: cardNumber.slice(-4),
            cardType: 'Visa', // You can add logic to determine card type based on number
            cardholderName: cardName
        };

        // Create payment record
        const payment = await Payment.create({
            userId: user.id,
            amount: totalAmount,
            status: paymentDetails.status,
            paymentMethod: paymentDetails.method,
            transactionId: paymentDetails.transactionId,
            cardLast4: paymentDetails.cardLast4,
            cardType: paymentDetails.cardType,
            cardholderName: paymentDetails.cardholderName
        });

        // Create order
        const order = await Order.create({
            userId: user.id,
            paymentId: payment.id,
            status: 'completed',
            totalAmount,
            shippingAddress: {
                firstName,
                lastName,
                email,
                phone,
                address,
                city,
                zip
            }
        });

        // Create order items
        for (const item of cartItems) {
            await OrderItem.create({
                orderId: order.id,
                bookId: item.bookId,
                quantity: item.quantity,
                price: item.Book.price
            });
        }

        // Clear cart
        await Cart.destroy({
            where: { userId: user.id }
        });

        // Get all orders for user
        const orders = await Order.findAll({
            where: { userId: user.id },
            include: [{
                model: OrderItem,
                include: [{
                    model: Book,
                    attributes: ['id', 'title', 'author', 'price', 'coverImage']
                }]
            }]
        });

        res.render('books/checkout-success', {
            title: 'Purchase Successful',
            order,
            paymentDetails,
            orders,
            user
        });

    } catch (error) {
        console.error('Error during checkout:', error);
        res.status(500).json({ message: 'Error processing checkout' });
    }
});

module.exports = router;
