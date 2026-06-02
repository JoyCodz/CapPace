# 🎓 CapPace

CapPace is a powerful, minimalist personal productivity tool designed to help you stay consistent with your learning and watching goals. It auto-generates a daily schedule for your YouTube playlists, allows you to track custom tasks, and visualizes your progress over time.

## ✨ Features
- **YouTube Integration**: Import any public YouTube playlist and CapPace will automatically fetch the videos.
- **Custom Trackers**: Create manual goal trackers for reading lists, course modules, or habits.
- **Daily Goals**: Set custom daily completion goals for every tracker.
- **Learning Curve Visualization**: A dynamic line chart that calculates your daily completion ratio based on your targets, keeping you accountable!
- **Modern UI**: Sleek, dark-mode focused UI with a minimalist geometric design.

## 🚀 Tech Stack
- **Frontend**: React 19, Vite, TailwindCSS v4, Recharts, Lucide-React
- **Backend**: Node.js, Express, MongoDB (Mongoose), JWT Authentication
- **External APIs**: YouTube Data API v3

## 🛠️ Local Development

You will need to run both the backend and frontend servers simultaneously in separate terminal windows.

### 1. Start the Backend Server

The backend runs on **Port 5000**. Open a terminal, navigate to the `backend` folder, and start the server:

```bash
cd backend
npm install
npm start
```
*Note: Make sure your `.env` file is present in the `backend` folder containing `MONGODB_URI`, `JWT_SECRET`, and `YOUTUBE_API_KEY`.*

### 2. Start the Frontend Server

The frontend uses Vite and runs on **Port 5173**. Open a second terminal window, navigate to the `frontend` folder, and start the development server:

```bash
cd frontend
npm install
npm run dev
```

Once both servers are running, you can access the application at:
**[http://localhost:5173](http://localhost:5173)**

## ☁️ Deployment

CapPace is designed to be easily deployed using free-tier cloud providers:

1. **Database**: Host your database on **MongoDB Atlas** (M0 Sandbox). Ensure you whitelist `0.0.0.0/0` in the Network Access settings.
2. **Backend**: Deploy the Node.js Express server to **Render** as a Web Service. Add your environment variables in the Render dashboard.
3. **Frontend**: Deploy the Vite application to **Vercel**. Set the Root Directory to `frontend` and add `VITE_API_URL` pointing to your live Render backend URL.

## 📄 License
MIT License. Copyright (c) 2026 JoyCodz.
