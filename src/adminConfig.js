// 관리자 UID 설정
// 여기에 관리자로 설정할 Firebase UID를 입력하세요
// UID는 Firebase Console > Authentication > Users에서 확인할 수 있습니다

export const ADMIN_UIDS = ['umlKLxZMM5QGIIsdFh1n8wUtikJ3'];

// 관리자 여부 확인 함수
export function isAdmin(user) {
  if (!user || !user.uid) return false;
  
  // UID 비교 (공백 제거 및 정확한 비교)
  const userUid = user.uid.trim();
  const isAdminUser = ADMIN_UIDS.some(adminUid => adminUid.trim() === userUid);
  
  console.log('관리자 확인:', {
    userUid: userUid,
    adminUids: ADMIN_UIDS,
    isAdmin: isAdminUser
  });
  
  return isAdminUser;
}

