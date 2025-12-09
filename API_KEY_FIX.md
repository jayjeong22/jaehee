# API 키 오류 해결 방법

## 문제: `auth/api-key-not-valid` 오류

이 오류는 Firebase API 키가 유효하지 않거나 제한이 설정되어 있을 때 발생합니다.

## 해결 방법

### 1. Firebase Console에서 웹 앱 설정 재확인

1. [Firebase Console](https://console.firebase.google.com/) 접속
2. 프로젝트 `jaehee-46d1d` 선택
3. 프로젝트 설정(⚙️ 아이콘) 클릭
4. "내 앱" 섹션에서 웹 앱 확인
5. 웹 앱이 없다면:
   - "웹 앱 추가" 클릭
   - 앱 닉네임 입력 (예: "수학 오답노트")
   - Firebase Hosting은 선택하지 않아도 됨
   - 등록 후 새로운 설정 정보 복사

### 2. Google Cloud Console에서 API 키 제한 확인

1. [Google Cloud Console](https://console.cloud.google.com/) 접속
2. 프로젝트 `jaehee-46d1d` 선택
3. "API 및 서비스" → "사용자 인증 정보" 메뉴
4. API 키 찾기 (Firebase에서 사용하는 키)
5. API 키 클릭하여 편집
6. "애플리케이션 제한사항" 확인:
   - **개발 중**: "HTTP 리퍼러(웹사이트)" 선택
   - "웹사이트 제한사항"에 다음 추가:
     ```
     http://localhost:*
     http://127.0.0.1:*
     ```
   - 또는 "없음"으로 설정 (개발 중에만)
7. "API 제한사항" 확인:
   - "키 제한"을 "제한 없음"으로 설정 (개발 중에만)
   - 또는 필요한 API만 선택:
     - Identity Toolkit API
     - Firebase Authentication API
     - Cloud Firestore API

### 3. Firebase 설정 정보 재확인

Firebase Console → 프로젝트 설정 → 일반 탭에서:
- 웹 앱의 설정 정보가 정확한지 확인
- 특히 `apiKey`가 올바른지 확인

### 4. 대안: 새 웹 앱 등록

기존 설정이 복잡하다면:
1. Firebase Console에서 새 웹 앱 등록
2. 새로운 설정 정보를 `src/firebaseConfig.js`에 입력
3. 개발 서버 재시작

