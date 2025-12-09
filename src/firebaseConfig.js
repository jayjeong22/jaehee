// Firebase 설정
// 사용자가 Firebase 프로젝트 설정 정보를 입력해야 합니다
import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// Firebase 프로젝트 설정 정보
const firebaseConfig = {
  apiKey: "AIzaSyB2nuFJX1fu0Hol86D9sCaEfVCCHdQrXtA",
  authDomain: "jaehee-46d1d.firebaseapp.com",
  projectId: "jaehee-46d1d",
  storageBucket: "jaehee-46d1d.firebasestorage.app",
  messagingSenderId: "410935351606",
  appId: "1:410935351606:web:212201fd39c00dcbf17b97"
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

