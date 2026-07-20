# Personal Site Admin Frontend

Admin panel for managing content on [whiteslove.me](https://whiteslove.me) — built with React.

## Features
- Content management interface for the whiteslove.me site
- Containerized deployment with Docker
- Served via Nginx in production
- Automated CI/CD pipeline via GitHub Actions

## Tech Stack
- **Framework:** React
- **Styling:** CSS
- **Web server (prod):** Nginx
- **Containerization:** Docker
- **CI/CD:** GitHub Actions

## Getting Started

### Prerequisites
- Node.js
- npm

### Local Development
1. Clone the repository:
```bash
   git clone https://github.com/AmoneMisa/Personal-Site-Admin-Frontend.git
   cd Personal-Site-Admin-Frontend
```
2. Install dependencies:
```bash
   npm install
```
3. Start the development server:
```bash
   npm start
```
   Runs at [http://localhost:3000](http://localhost:3000).

### Production Build
```bash
npm run build
```

### Docker
```bash
docker build -t personal-site-admin .
docker run -p 80:80 personal-site-admin
```

## Related
- Backend: [Personal-Site-Backend](https://github.com/AmoneMisa/Personal-Site-Backend)
- Live site: [whiteslove.me](https://whiteslove.me)

## License
Personal project, shared for demonstration purposes.
