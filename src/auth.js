import { signInWithPopup, signOut, onAuthStateChanged } from 'firebase/auth';
import { auth, googleProvider } from './firebaseConfig.js';

let currentRole = null;

// 로그인 상태 확인
onAuthStateChanged(auth, (user) => {
  const loginSection = document.getElementById('loginSection');
  const userSection = document.getElementById('userSection');
  
  if (user) {
    loginSection.classList.add('hidden');
    userSection.classList.remove('hidden');
    document.getElementById('userName').textContent = `이름: ${user.displayName || '사용자'}`;
    document.getElementById('userEmail').textContent = `이메일: ${user.email}`;
  } else {
    loginSection.classList.remove('hidden');
    userSection.classList.add('hidden');
  }
});

// Google 로그인
document.getElementById('googleLoginBtn')?.addEventListener('click', async () => {
  try {
    if (!auth) {
      alert('Firebase가 초기화되지 않았습니다. 페이지를 새로고침해주세요.');
      return;
    }
    
    await signInWithPopup(auth, googleProvider);
  } catch (error) {
    console.error('로그인 오류:', error);
    
    // 더 자세한 오류 메시지
    let errorMessage = '로그인에 실패했습니다.\n';
    
    if (error.code === 'auth/api-key-not-valid') {
      errorMessage += '\nAPI 키 오류입니다.\n';
      errorMessage += 'Firebase Console에서 다음을 확인하세요:\n';
      errorMessage += '1. 프로젝트 설정에서 웹 앱 설정 정보 확인\n';
      errorMessage += '2. Google Cloud Console에서 API 키 제한 확인\n';
      errorMessage += '3. API_KEY_FIX.md 파일 참고';
    } else if (error.code === 'auth/operation-not-allowed') {
      errorMessage += '\nGoogle 로그인이 활성화되지 않았습니다.\n';
      errorMessage += 'Firebase Console → Authentication → Sign-in method에서 Google을 활성화하세요.';
    } else if (error.code === 'auth/popup-closed-by-user') {
      errorMessage = '로그인 창이 닫혔습니다. 다시 시도해주세요.';
    } else {
      errorMessage += error.message;
    }
    
    alert(errorMessage);
  }
});

// 로그아웃
document.getElementById('logoutBtn')?.addEventListener('click', async () => {
  try {
    await signOut(auth);
    currentRole = null;
  } catch (error) {
    console.error('로그아웃 오류:', error);
  }
});

// 역할 선택 및 화면 이동
document.getElementById('studentBtn')?.addEventListener('click', () => {
  currentRole = 'student';
  checkAuthAndRedirect('student');
});

document.getElementById('teacherBtn')?.addEventListener('click', () => {
  currentRole = 'teacher';
  checkAuthAndRedirect('teacher');
});

document.getElementById('goStudentBtn')?.addEventListener('click', () => {
  window.location.href = '/student.html';
});

document.getElementById('goTeacherBtn')?.addEventListener('click', () => {
  window.location.href = '/teacherMonitor.html';
});

document.getElementById('goAdminBtn')?.addEventListener('click', () => {
  window.location.href = '/admin.html';
});

function checkAuthAndRedirect(role) {
  if (auth.currentUser) {
    if (role === 'student') {
      window.location.href = '/student.html';
    } else {
      window.location.href = '/teacherMonitor.html';
    }
  } else {
    alert('먼저 Google로 로그인해주세요.');
  }
}

