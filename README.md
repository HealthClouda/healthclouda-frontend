# Healthclouda Frontend

A modern, vanilla JavaScript frontend application for Healthclouda, providing a seamless user experience for health data management.

## 📋 Table of Contents

- [Overview](#-overview)
- [Features](#-features)
- [Tech Stack](#-tech-stack)
- [Project Structure](#-project-structure)
- [Getting Started](#-getting-started)
- [Configuration](#-configuration)
- [Development](#-development)
- [API Integration](#-api-integration)
- [Authentication](#-authentication)
- [Deployment](#-deployment)
- [Contributing](#-contributing)
- [Support](#-support)

## 🌟 Overview

Healthclouda Frontend is a lightweight web application built with vanilla HTML, CSS, and JavaScript. It serves as the user interface for the Healthclouda platform, communicating exclusively with the backend through REST APIs.

The application focuses on:
- User authentication and authorization
- Dashboard functionality
- Role-based access control
- Responsive design for various devices

## ✨ Features

- **Vanilla JavaScript**: No heavy frameworks, ensuring fast load times
- **RESTful API Integration**: Clean separation between frontend and backend
- **JWT Authentication**: Secure token-based authentication
- **Responsive Design**: Mobile-friendly interface
- **Role-based UI**: Dynamic interface based on user permissions
- **Modular Architecture**: Organized code structure for maintainability

## 🛠 Tech Stack

- **Frontend**: HTML5, CSS3, Vanilla JavaScript (ES6+)
- **Backend**: Django REST Framework (separate repository)
- **Authentication**: JWT (JSON Web Tokens)
- **Deployment**: Netlify (frontend), Azure (backend)
- **Version Control**: Git

## 📁 Project Structure

```
healthclouda-frontend/
├── public/
│   ├── index.html          # Landing page
│   ├── login.html          # User login interface
│   └── dashboard.html      # Main dashboard
├── assets/
│   ├── css/
│   │   ├── main.css        # Global styles
│   │   ├── auth.css        # Authentication page styles
│   │   └── dashboard.css   # Dashboard styles
│   ├── js/
│   │   ├── config.js       # Application configuration
│   │   ├── api.js          # API communication layer
│   │   ├── auth.js         # Authentication logic
│   │   ├── permissions.js  # Role-based UI management
│   │   └── utils.js        # Utility functions
│   └── images/             # Static images
├── .env.example            # Environment variables template
├── .gitignore              # Git ignore rules
└── README.md               # Project documentation
```

## 🚀 Getting Started

### Prerequisites

- A modern web browser (Chrome, Firefox, Safari, Edge)
- Backend API server running (see backend repository)
- Git for version control

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd healthclouda-frontend
   ```

2. **Set up environment**
   - Copy `.env.example` to `.env` (if needed for future configurations)
   - Ensure the backend API is running on the specified port

3. **Open in browser**
   - Open `public/index.html` in your web browser
   - No build process required for development

## ⚙️ Configuration

### Environment Variables

The application uses a centralized configuration file for API endpoints and other settings.

**`assets/js/config.js`**:
```javascript
const CONFIG = {
  API_BASE_URL: "http://localhost:8000/api/v1"
  // For production: "https://api.healthclouda.com/api/v1"
};
```

### API Base URLs

- **Development**: `http://localhost:8000/api/v1`
- **Production**: `https://api.healthclouda.com/api/v1`

⚠️ **Important**: Never hardcode API URLs directly in components. Always use the `CONFIG` object.

## 💻 Development

### Code Organization

- **`config.js`**: Global configuration and constants
- **`api.js`**: Centralized API request handling
- **`auth.js`**: Login, logout, and token management
- **`permissions.js`**: Role-based UI rendering logic
- **`utils.js`**: Helper functions and utilities

### Best Practices

- Use `api.js` for all API communications
- Avoid inline JavaScript in HTML files
- Follow single responsibility principle for JavaScript modules
- Always work from the `develop` branch

### Branching Strategy

- `main`: Production-ready code
- `develop`: Active development branch
- `feature/*`: Feature branches (e.g., `feature/login-improvements`)

## 🔗 API Integration

All backend communication must go through the `api.js` module.

### Example API Request

```javascript
import { apiRequest } from './api.js';

apiRequest("/auth/login/", {
  method: "POST",
  body: JSON.stringify({
    email: "user@example.com",
    password: "securepassword"
  })
})
.then(response => {
  // Handle success
})
.catch(error => {
  // Handle error
});
```

🚫 **Never use `fetch()` directly** in component files.

## 🔐 Authentication

The frontend implements JWT-based authentication:

1. User submits login credentials
2. Frontend sends POST request to `/auth/login/`
3. Backend validates credentials and returns JWT tokens
4. Tokens are stored in `localStorage`
5. Subsequent requests include the token in the Authorization header

### Token Management

- Access tokens are automatically attached to API requests
- Token refresh is handled by the backend
- Logout clears all stored tokens

## 🚀 Deployment

### Frontend Deployment

- **Platform**: Netlify
- **Type**: Static site hosting
- **Build Process**: None required (static files)
- **Environment Variables**: Injected by Netlify for production

### Backend Deployment

- **Platform**: Azure
- **Type**: Containerized Django application
- **Communication**: REST API endpoints

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch from `develop`
3. Make your changes following the established patterns
4. Test thoroughly
5. Submit a pull request to `develop`

### Guidelines

- Follow the existing code style
- Update documentation as needed
- Ensure all API calls go through `api.js`
- Test on multiple browsers

## 📞 Support

### Getting Help

1. Check this README for common questions
2. Review the backend API documentation
3. Contact the development team

### Future Plans

- Migration to React for enhanced component management
- Progressive Web App (PWA) features
- Advanced caching strategies
- Real-time notifications

---

## 📝 Notes

- This is an MVP implementation using vanilla JavaScript
- Future upgrades will maintain API compatibility
- All environment-specific configurations are centralized in `config.js`

For backend-related questions, please refer to the Healthclouda Backend repository.