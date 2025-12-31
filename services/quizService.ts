
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getDatabase, ref, set, get, child, push, serverTimestamp, remove } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";
import { getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged, User } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { Quiz, QuizResult } from "../types";

// CẤU HÌNH FIREBASE THỰC TẾ
const firebaseConfig = {
  apiKey: "AIzaSyCyRFVt758dA-Ct1gRZWLjZbgnhfP3347Q",
  authDomain: "ai-website-for-teachers-2.firebaseapp.com",
  databaseURL: "https://ai-website-for-teachers-2-default-rtdb.firebaseio.com",
  projectId: "ai-website-for-teachers-2",
  storageBucket: "ai-website-for-teachers-2.firebasestorage.app",
  messagingSenderId: "501268692138",
  appId: "1:501268692138:web:4328353199ce8b0e3fa4d3",
  measurementId: "G-PSN5T0J3BR"
};

// Khởi tạo Firebase
const app = initializeApp(firebaseConfig);
const db = getDatabase(app);
const auth = getAuth(app);

// === Firebase Authentication Functions ===
export const signInTeacher = (email: string, pass: string) => {
  return signInWithEmailAndPassword(auth, email, pass);
};

export const signOutTeacher = () => {
  return signOut(auth);
};

export const onAuthStateChangedListener = (callback: (user: User | null) => void) => {
  return onAuthStateChanged(auth, callback);
};
// =======================================


export const saveQuiz = async (quiz: Quiz): Promise<void> => {
  const quizRef = ref(db, 'quizzes/' + quiz.id);
  await set(quizRef, {
    ...quiz,
    createdAt: serverTimestamp()
  });
};

export const getQuizzes = async (): Promise<Quiz[]> => {
  const dbRef = ref(db);
  const snapshot = await get(child(dbRef, 'quizzes'));
  if (snapshot.exists()) {
    const data = snapshot.val();
    return Object.values(data) as Quiz[];
  }
  return [];
};

export const deleteQuizAndResults = async (quizId: string): Promise<void> => {
  const quizRef = ref(db, `quizzes/${quizId}`);
  const resultsRef = ref(db, `results/${quizId}`);
  await remove(quizRef);
  await remove(resultsRef);
};

export const getQuizByCode = async (code: string): Promise<Quiz | undefined> => {
  const dbRef = ref(db);
  const snapshot = await get(child(dbRef, `quizzes/${code.toUpperCase()}`));
  if (snapshot.exists()) {
    return snapshot.val() as Quiz;
  }
  return undefined;
};

export const saveQuizResult = async (result: QuizResult): Promise<void> => {
  const resultsRef = ref(db, `results/${result.quizId}`);
  const newResultRef = push(resultsRef);
  await set(newResultRef, {
    ...result,
    timestamp: serverTimestamp()
  });
};

export const getResultsForQuiz = async (quizId: string): Promise<QuizResult[]> => {
  const dbRef = ref(db);
  const snapshot = await get(child(dbRef, `results/${quizId}`));
  if (snapshot.exists()) {
    const data = snapshot.val();
    return Object.values(data) as QuizResult[];
  }
  return [];
};

export const getAllResults = async (): Promise<Record<string, any>> => {
  const dbRef = ref(db);
  const snapshot = await get(child(dbRef, 'results'));
  if (snapshot.exists()) {
    return snapshot.val();
  }
  return {};
};

export const generateCode = (): string => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let result = '';
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};