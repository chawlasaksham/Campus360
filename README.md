# Here are your Instructions

backend :-python -m uvicorn server:app --reload --port 8001

frontend:-yarn start

# 🚀 Class Management Backend

This is a **FastAPI-based backend** for a Class Management System.
It provides APIs for authentication, user management, and database operations using MongoDB.

---

## 🛠️ Tech Stack

* **Backend Framework:** FastAPI
* **Database:** MongoDB (Atlas / Local)
* **ORM/Driver:** Motor (async MongoDB driver)
* **Authentication:** JWT
* **Password Hashing:** bcrypt
* **Environment Config:** python-dotenv

---

## 📂 Project Structure

```
backend/
│── server.py          # Main FastAPI app
│── requirements.txt   # Dependencies
│── .env               # Environment variables
│── .venv/             # Virtual environment (not pushed to Git)
```

---

## ⚙️ Setup Instructions

### 1️⃣ Clone the repository

```
git clone <your-repo-url>
cd backend
```

---

### 2️⃣ Create and activate virtual environment

```
python3 -m venv .venv
source .venv/bin/activate   # Mac/Linux
```

---

### 3️⃣ Install dependencies

```
pip install --upgrade pip
pip install -r requirements.txt
```

If `requirements.txt` is incomplete, install manually:

```
pip install fastapi uvicorn bcrypt python-dotenv PyJWT motor python-multipart pydantic[email]
```

---

## 🔐 Environment Variables

Create a `.env` file in the root directory:

```
MONGO_URL=mongodb+srv://<username>:<password>@cluster.mongodb.net/class_management?retryWrites=true&w=majority
DB_NAME=class_management
CORS_ORIGINS=*
JWT_SECRET=your_secret_key
```

⚠️ **Important:**

* Replace special characters in password (e.g. `$` → `%24`)
* Whitelist your IP in MongoDB Atlas (or use `0.0.0.0/0`)

---

## ▶️ Running the Server

```
python -m uvicorn server:app --reload --port 8001
```

---

## 🌐 API Access

* Base URL:
  👉 http://127.0.0.1:8001

* Interactive Docs (Swagger UI):
  👉 http://127.0.0.1:8001/docs

---

## 🧪 Common Issues & Fixes

### ❌ ModuleNotFoundError

Install missing package:

```
pip install <package-name>
```

---

### ❌ MongoDB Connection Error

```
ServerSelectionTimeoutError: localhost:27017
```

✔️ Fix:

* Start MongoDB locally OR
* Use MongoDB Atlas URI

---

### ❌ Environment Variable Not Found

```
KeyError: MONGO_URL
```

✔️ Fix:

* Ensure `.env` exists
* Add `load_dotenv()` in code
* Match variable names exactly

---

## 🔒 Security Notes

* Never commit `.env` file
* Rotate database credentials if exposed
* Use strong `JWT_SECRET`

---

## 📌 Future Improvements

* Add role-based access control
* API rate limiting
* Docker support
* CI/CD integration

---

## 👨‍💻 Author

Developed as part of a Class Management System project.

---

⭐ If you find this helpful, consider starring the repo!
