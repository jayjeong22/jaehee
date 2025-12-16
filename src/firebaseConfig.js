// Firebase 설정
// 사용자가 Firebase 프로젝트 설정 정보를 입력해야 합니다
import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

// Firebase 프로젝트 설정 정보
// 환경 변수에서 가져옵니다 (로컬 개발: .env 파일, 배포: Netlify 환경 변수)
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};

// 환경 변수 확인 및 검증
const requiredEnvVars = [
  { key: 'VITE_FIREBASE_API_KEY', value: firebaseConfig.apiKey },
  { key: 'VITE_FIREBASE_AUTH_DOMAIN', value: firebaseConfig.authDomain },
  { key: 'VITE_FIREBASE_PROJECT_ID', value: firebaseConfig.projectId },
  { key: 'VITE_FIREBASE_STORAGE_BUCKET', value: firebaseConfig.storageBucket },
  { key: 'VITE_FIREBASE_MESSAGING_SENDER_ID', value: firebaseConfig.messagingSenderId },
  { key: 'VITE_FIREBASE_APP_ID', value: firebaseConfig.appId }
];

const missingVars = requiredEnvVars.filter(env => !env.value || env.value === 'undefined' || env.value.trim() === '');

if (missingVars.length > 0) {
  console.error('❌ Firebase 환경 변수가 설정되지 않았습니다.');
  console.error('누락된 환경 변수:');
  missingVars.forEach(env => {
    console.error(`  - ${env.key}: ${env.value || '(없음)'}`);
  });
  console.error('\n로컬 개발 환경인 경우:');
  console.error('1. 프로젝트 루트에 .env 파일을 생성하세요');
  console.error('2. 다음 형식으로 환경 변수를 추가하세요:');
  console.error('   VITE_FIREBASE_API_KEY=your-api-key');
  console.error('   VITE_FIREBASE_AUTH_DOMAIN=your-auth-domain');
  console.error('   ... (나머지 변수들)');
  console.error('\nNetlify 배포 환경인 경우:');
  console.error('1. Netlify 대시보드 → Site settings → Environment variables');
  console.error('2. 위의 환경 변수들을 추가하세요');
  
  // 개발 환경에서는 더 자세한 오류 메시지 표시
  if (import.meta.env.DEV) {
    alert(`Firebase 환경 변수가 설정되지 않았습니다.\n\n누락된 변수: ${missingVars.map(v => v.key).join(', ')}\n\n콘솔을 확인하여 설정 방법을 확인하세요.`);
  }
}

// Firebase 초기화
let app;
let auth;
let db;
let storage;

try {
  // 필수 환경 변수가 모두 있는지 확인
  if (missingVars.length === 0) {
    // 모든 값이 유효한지 확인
    const hasInvalidValues = Object.values(firebaseConfig).some(
      value => !value || value === 'undefined' || (typeof value === 'string' && value.trim() === '')
    );
    
    if (!hasInvalidValues) {
      app = initializeApp(firebaseConfig);
      auth = getAuth(app);
      db = getFirestore(app);
      storage = getStorage(app);
      
      // 초기화 성공 확인
      console.log('✅ Firebase 초기화 성공');
      console.log('프로젝트 ID:', firebaseConfig.projectId);
    } else {
      throw new Error('Firebase 설정 값이 유효하지 않습니다. 환경 변수를 확인하세요.');
    }
  } else {
    throw new Error(`필수 환경 변수가 ${missingVars.length}개 누락되었습니다.`);
  }
} catch (error) {
  console.error('❌ Firebase 초기화 오류:', error);
  console.error('오류 상세:', error.message);
  console.error('Firebase 설정 값:', {
    apiKey: firebaseConfig.apiKey ? `${firebaseConfig.apiKey.substring(0, 10)}...` : '(없음)',
    authDomain: firebaseConfig.authDomain || '(없음)',
    projectId: firebaseConfig.projectId || '(없음)',
    storageBucket: firebaseConfig.storageBucket || '(없음)',
    messagingSenderId: firebaseConfig.messagingSenderId || '(없음)',
    appId: firebaseConfig.appId || '(없음)'
  });
  
  // 사용자에게 친화적인 오류 메시지
  const errorMessage = missingVars.length > 0
    ? `Firebase 환경 변수가 설정되지 않았습니다.\n\n누락된 변수: ${missingVars.map(v => v.key).join(', ')}\n\n로컬 개발: .env 파일을 생성하세요.\n배포 환경: Netlify 환경 변수를 설정하세요.`
    : `Firebase 초기화에 실패했습니다.\n\n오류: ${error.message}\n\n콘솔을 확인하여 자세한 정보를 확인하세요.`;
  
  alert(errorMessage);
}

// 안전하게 export (undefined일 수 있으므로)
export { auth, db, storage };

// GoogleAuthProvider는 항상 생성 가능
let googleProvider;
try {
  googleProvider = new GoogleAuthProvider();
} catch (error) {
  console.error('GoogleAuthProvider 생성 오류:', error);
  googleProvider = null;
}
export { googleProvider };

