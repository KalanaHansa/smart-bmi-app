# 🧠 SMART AI BMI Calculator

A full-stack MERN web application that calculates a user's Body Mass Index (BMI), securely tracks their history, and generates highly personalized, actionable health advice using Google's Gemini Artificial Intelligence.

## 🌐 Live Demo

* **Frontend Application:** [Insert your Vercel Frontend URL here]
* **Backend API:** [Insert your Vercel Backend URL here]

## ✨ Features

* **Secure Authentication:** Users can only access the application via Google Sign-In, powered by Firebase Authentication.
* **Instant BMI Calculation:** Calculates exact BMI and categorizes the result (Underweight, Normal, Overweight, Obese).
* **AI Health Consultant:** Integrates with the Google Gemini AI API to provide 3 actionable, personalized nutrition and exercise tips based on the user's specific BMI result.
* **History Dashboard:** A responsive, grid-based dashboard that automatically fetches and displays the user's past calculations.
* **Fully Responsive:** Optimized for both desktop and mobile web browsers.

## 🛠️ Tech Stack & Deployment

* **Frontend:** React (Vite), CSS3, Axios — **Deployed on Vercel**
* **Backend:** Node.js, Express.js — **Deployed on Vercel** (Serverless)
* **Database:** MongoDB Atlas, Mongoose (ODM)
* **Authentication:** Firebase Auth (Web SDK & Admin SDK)
* **Artificial Intelligence:** Google Generative AI (`gemini-1.5-flash`)

---

## 💻 Local Development Setup

If you would like to run this project locally for testing or contribution, follow the steps below.

### Prerequisites

* [Node.js](https://nodejs.org/) (v16 or higher)
* A [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) cluster
* A [Firebase Project](https://console.firebase.google.com/) with Google Sign-In enabled
* A [Google Gemini API Key](https://aistudio.google.com/)

### 1. Clone the Repository

```bash
git clone https://github.com/YourUsername/smart-bmi-app.git
cd smart-bmi-app

```

### 2. Backend Setup

Navigate to the backend folder and install the dependencies:

```bash
cd backend
npm install

```

**Environment Variables:**
Create a `.env` file in the `backend` folder and add the following:

```text
PORT=5000
MONGO_URI=your_mongodb_atlas_connection_string
GEMINI_API_KEY=your_google_gemini_api_key

```

**Firebase Admin Key:**

1. Go to your Firebase Console -> Project Settings -> Service Accounts.
2. Generate a new private key for Node.js.
3. Save the downloaded file exactly as `firebase-service-account.json` inside the root of the `backend` folder.

Start the backend development server:

```bash
npm run dev

```

### 3. Frontend Setup

Open a new terminal window, navigate to the frontend folder, and install dependencies:

```bash
cd frontend
npm install

```

**Environment Variables:**
Create a `.env` file in the root of the `frontend` folder (next to `package.json`) and add your Firebase Web Configuration keys:

```text
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_auth_domain
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_storage_bucket
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id

```

Start the React development server:

```bash
npm run dev

```

### 4. Usage

Open `http://localhost:5173` in your browser. Click **Sign in with Google**, enter your height and weight, and wait for the AI to generate your personalized health plan!

---

## 📁 Project Structure

```text
smart-bmi-app/
├── backend/
│   ├── middleware/
│   │   └── auth.js         # Firebase token verification
│   ├── models/
│   │   └── BmiRecord.js    # MongoDB Schema
│   ├── routes/
│   │   └── bmi.js          # Calculation, AI, and History API routes
│   ├── server.js           # Express server entry point
│   ├── vercel.json         # Vercel serverless configuration
│   └── firebase-service-account.json 
│
└── frontend/
    ├── src/
    │   ├── App.jsx           # Main React component & UI
    │   ├── App.css           # Responsive styling
    │   ├── firebaseConfig.js # Firebase Web SDK initialization
    │   └── main.jsx          # React DOM render
    ├── index.html
    └── vite.config.js

```

## 🔒 Security Notes

* Ensure `backend/firebase-service-account.json` and all `.env` files are added to your `.gitignore`.
* API routes are protected by a custom Express middleware that verifies Firebase JWTs before processing any data or interacting with the database.
* When deployed on Vercel, all environment variables must be securely added via the Vercel dashboard settings, not committed to the repository.