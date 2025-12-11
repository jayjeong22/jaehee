import { signInWithPopup, signOut, onAuthStateChanged } from 'firebase/auth';
import { auth, googleProvider } from './firebaseConfig.js';
import { isAdmin, ADMIN_UIDS } from './adminConfig.js';

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
    
    // 관리자 버튼 표시 제어 (약간의 지연을 두어 DOM이 완전히 렌더링된 후 실행)
    setTimeout(() => {
      const goTeacherBtn = document.getElementById('goTeacherBtn');
      const goAdminBtn = document.getElementById('goAdminBtn');
      
      // 디버깅 로그
      console.log('=== 관리자 권한 확인 ===');
      console.log('현재 사용자 UID:', user.uid);
      console.log('관리자 UID 목록:', ADMIN_UIDS);
      
      const adminStatus = isAdmin(user);
      console.log('관리자 여부:', adminStatus);
      
      if (goTeacherBtn) {
        goTeacherBtn.style.display = adminStatus ? 'block' : 'none';
        console.log('교사 화면 버튼:', adminStatus ? '표시' : '숨김');
      } else {
        console.error('goTeacherBtn을 찾을 수 없습니다.');
      }
      
      if (goAdminBtn) {
        goAdminBtn.style.display = adminStatus ? 'block' : 'none';
        console.log('관리자 페이지 버튼:', adminStatus ? '표시' : '숨김');
      } else {
        console.error('goAdminBtn을 찾을 수 없습니다.');
      }
    }, 100);
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
  if (auth.currentUser && isAdmin(auth.currentUser)) {
  window.location.href = '/teacherMonitor.html';
  } else {
    alert('관리자만 접근할 수 있습니다.');
  }
});

document.getElementById('goAdminBtn')?.addEventListener('click', () => {
  if (auth.currentUser && isAdmin(auth.currentUser)) {
  window.location.href = '/admin.html';
  } else {
    alert('관리자만 접근할 수 있습니다.');
  }
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

