// Firebase 설정
// 사용자가 Firebase 프로젝트 설정 정보를 입력해야 합니다
import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// Firebase 프로젝트 설정 정보
// 환경 변수에서 가져오거나, 없으면 기본값 사용
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyB2nuFJX1fu0Hol86D9sCaEfVCCHdQrXtA",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "jaehee-46d1d.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "jaehee-46d1d",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "jaehee-46d1d.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "410935351606",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:410935351606:web:212201fd39c00dcbf17b97"
};

// Firebase 초기화
let app;
let auth;
let db;

try {
  app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  db = getFirestore(app);
  
  // 초기화 성공 확인
  console.log('Firebase 초기화 성공');
} catch (error) {
  console.error('Firebase 초기화 오류:', error);
  alert('Firebase 설정 오류가 발생했습니다. 콘솔을 확인하세요.');
}

export { auth, db };
export const googleProvider = new GoogleAuthProvider();

