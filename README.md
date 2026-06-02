# PlaylistPace

PlaylistPace is a personal YouTube playlist timetable app that helps you stay consistent with learning or watching goals. It auto-generates a daily schedule for your playlists and allows you to track custom tasks!

## Prerequisites
- Node.js (v18 or higher)
- MongoDB running locally or remotely

## Running the Application Locally

You will need to run both the backend and frontend servers simultaneously in separate terminal windows.

### 1. Start the Backend Server

The backend runs on **Port 5000**. Open a terminal, navigate to the `backend` folder, and start the server:

```bash
cd backend
npm install
npm start
```
*Note: Make sure your `.env` file is present in the `backend` folder with your MongoDB URI, JWT Secret, and YouTube API key.*

### 2. Start the Frontend Server

The frontend uses Vite and runs on **Port 5173**. Open a second terminal window, navigate to the `frontend` folder, and start the development server:

```bash
cd frontend
npm install
npm run dev
```

Once both servers are running, you can access the application in your browser at:
**[http://localhost:5173](http://localhost:5173)**
