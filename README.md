# 📚 BooksBazar - Advanced Used Books Marketplace

**BooksBazar** is a comprehensive online platform for buying, selling, and trading used books with gamified features and advanced user management. The platform combines traditional e-commerce functionality with innovative features like literary escape rooms and intelligent book recommendations.

![BooksBazar](https://img.shields.io/badge/Version-1.0.0-blue.svg)
![Node.js](https://img.shields.io/badge/Node.js-18+-green.svg)
![MySQL](https://img.shields.io/badge/MySQL-8.0+-orange.svg)
![License](https://img.shields.io/badge/License-MIT-yellow.svg)

## 🌟 Key Features

### 📖 Core Marketplace
- **User Authentication & Authorization** - Secure signup/login with Passport.js
- **Advanced Book Listing** - Upload books with detailed metadata and images
- **Smart Search & Filtering** - Find books by title, author, genre, condition, and price
- **Dynamic Pricing** - Flexible pricing options for sellers
- **Shopping Cart & Checkout** - Seamless purchasing experience
- **Order Management** - Track purchases and sales history

### 🎮 Gamified Features
- **Literary Escape Room** - Sellers can "lock" books with trivia questions
- **Challenge System** - Buyers answer questions to unlock books for FREE
- **Knowledge-Based Rewards** - Win books through literary knowledge instead of payment
- **User Attempts Tracking** - Monitor challenge participation and success rates

### 👤 User Management
- **Personal Profiles** - Customizable user profiles with profile pictures
- **My Books Section** - Dedicated area for managing personal book listings
- **Ownership Enforcement** - Strict separation between owned and purchasable books
- **Self-Purchase Prevention** - Users cannot buy their own uploaded books

### 🛡️ Security & Privacy
- **Session Management** - Persistent file-based session storage
- **Authentication Middleware** - Protected routes and user verification
- **Data Validation** - Input sanitization and validation
- **Error Handling** - Comprehensive error management and user feedback

### 📱 User Experience
- **Responsive Design** - Mobile-friendly interface
- **Flash Messages** - Real-time user feedback and notifications
- **Intuitive Navigation** - Easy-to-use interface with clear categorization
- **Contact & About Pages** - Customer support and platform information

## 🛠️ Technology Stack

### Backend
- **Runtime**: Node.js 18+
- **Framework**: Express.js 4.18+
- **Authentication**: Passport.js with Local Strategy
- **Database**: MySQL 8.0+ with Sequelize ORM
- **Session Storage**: File-based persistent sessions
- **Security**: bcryptjs for password hashing, JWT for tokens

### Frontend
- **Template Engine**: Pug (Jade)
- **Styling**: Custom CSS with responsive design
- **JavaScript**: Vanilla JS for client-side interactions
- **File Uploads**: Multer for image handling

### Development Tools
- **Process Manager**: Nodemon for development
- **Environment**: dotenv for configuration
- **Version Control**: Git
- **Package Manager**: npm

## 🚀 Quick Start

### Prerequisites
- Node.js 18 or higher
- MySQL 8.0 or higher
- Git

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/purohitm/booksbazar.git
   cd booksbazar
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Database Setup**
   ```sql
   CREATE DATABASE booksbazar;
   ```

4. **Environment Configuration**
   Create a `.env` file in the root directory:
   ```env
   # Database Configuration
   DB_HOST=localhost
   DB_USER=root
   DB_PASSWORD=your_mysql_password
   DB_NAME=booksbazar
   
   # Session Configuration
   SESSION_SECRET=your_super_secret_session_key_here
   
   # Server Configuration
   PORT=3000
   NODE_ENV=development
   ```

5. **Run Database Migrations**
   ```bash
   npx sequelize-cli db:migrate
   ```

6. **Start the Development Server**
   ```bash
   npm run dev
   ```

7. **Access the Application**
   Open your browser and navigate to `http://localhost:3000`

### Production Deployment

```bash
npm start
```

## 📁 Project Architecture

```
booksbazar/
├── 📁 config/                 # Configuration files
│   ├── db.js                  # Database connection
│   └── passport.js            # Authentication strategy
├── 📁 middleware/             # Custom middleware
│   └── auth.js                # Authentication middleware
├── 📁 migrations/             # Database migrations
│   ├── 20250622000000_create_users.js
│   ├── 20250622000001_create_books.js
│   ├── 20250719183000-create-challenges.js
│   └── 20250719183100-create-user-attempts.js
├── 📁 models/                 # Database models
│   ├── User.js                # User model
│   ├── Book.js                # Book model
│   ├── challenge.js           # Challenge model
│   └── user-attempts.js       # User attempts model
├── 📁 routes/                 # Route handlers
│   ├── index.js               # Home routes
│   ├── auth.js                # Authentication routes
│   ├── books.js               # Book management routes
│   ├── cart.js                # Shopping cart routes
│   ├── challenges.js          # Literary escape room routes
│   ├── orders.js              # Order management routes
│   ├── profile.js             # User profile routes
│   ├── about.js               # About page routes
│   └── contact.js             # Contact page routes
├── 📁 views/                  # Pug templates
│   ├── 📁 auth/               # Authentication views
│   ├── 📁 books/              # Book-related views
│   ├── 📁 cart/               # Shopping cart views
│   ├── 📁 orders/             # Order management views
│   ├── 📁 profile/            # User profile views
│   ├── layout.pug             # Main layout template
│   └── index.pug              # Homepage template
├── 📁 public/                 # Static assets
│   ├── 📁 css/                # Stylesheets
│   ├── 📁 js/                 # Client-side JavaScript
│   ├── 📁 images/             # Static images
│   └── 📁 uploads/            # User uploaded files
├── 📁 sessions/               # Session storage
├── 📁 scripts/                # Utility scripts
├── app.js                     # Main application file
├── package.json               # Project dependencies
└── README.md                  # Project documentation
```

## 🎯 Core Functionality

### Authentication System
- Secure user registration and login
- Password hashing with bcryptjs
- Session-based authentication
- Protected routes middleware

### Book Management
- CRUD operations for book listings
- Image upload and storage
- Advanced search and filtering
- Category-based organization

### Literary Escape Room
- Sellers can create challenges for their books
- Trivia questions with correct answers
- Free book rewards for correct answers
- Attempt tracking and analytics

### Shopping Experience
- Add books to cart
- Secure checkout process
- Order history and tracking
- User-friendly interface

## 🔧 API Endpoints

### Authentication
- `POST /auth/register` - User registration
- `POST /auth/login` - User login
- `GET /auth/logout` - User logout

### Books
- `GET /books` - Browse all books
- `POST /books/add` - Add new book
- `GET /books/:id` - View book details
- `PUT /books/:id` - Update book
- `DELETE /books/:id` - Delete book

### Challenges
- `GET /challenges/check/:bookId` - Check if book has challenge
- `POST /challenges/create` - Create new challenge
- `GET /challenges/:bookId` - Get challenge for book
- `POST /challenges/:challengeId/attempt` - Submit answer

### Cart & Orders
- `POST /cart/add` - Add item to cart
- `GET /cart` - View cart
- `POST /orders/create` - Create order
- `GET /orders` - View order history

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 👥 Authors

- **Purohit M** - *Initial work* - [purohitm](https://github.com/purohitm)

## 🙏 Acknowledgments

- Express.js community for the robust web framework
- Sequelize team for the excellent ORM
- Passport.js for authentication solutions
- All contributors who helped improve this project

## 📞 Support

For support, email support@booksbazar.com or create an issue in the GitHub repository.

---

**Made with ❤️ for book lovers everywhere**