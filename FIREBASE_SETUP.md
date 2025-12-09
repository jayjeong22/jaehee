# Firebase 설정 가이드

## 1. Firebase 프로젝트 생성

1. [Firebase Console](https://console.firebase.google.com/)에 접속
2. "프로젝트 추가" 클릭
3. 프로젝트 이름 입력 및 설정 완료

## 2. 웹 앱 등록

1. Firebase 프로젝트에서 "웹" 아이콘 클릭
2. 앱 닉네임 입력
3. Firebase Hosting 설정은 선택사항
4. 설정 정보가 표시됨

## 3. Firebase 설정 정보 입력

`src/firebaseConfig.js` 파일을 열고 다음 정보를 입력하세요:

```javascript
const firebaseConfig = {
  apiKey: "여기에_API_KEY_입력",
  authDomain: "여기에_AUTH_DOMAIN_입력",
  projectId: "여기에_PROJECT_ID_입력",
  storageBucket: "여기에_STORAGE_BUCKET_입력",
  messagingSenderId: "여기에_MESSAGING_SENDER_ID_입력",
  appId: "여기에_APP_ID_입력"
};
```

## 4. Authentication 설정

1. Firebase Console에서 "Authentication" 메뉴 클릭
2. "시작하기" 클릭
3. "Sign-in method" 탭에서 "Google" 활성화
4. 프로젝트 지원 이메일 설정
5. 저장

## 5. Firestore Database 설정

1. Firebase Console에서 "Firestore Database" 메뉴 클릭
2. "데이터베이스 만들기" 클릭
3. "테스트 모드에서 시작" 선택 (개발 중)
4. 위치 선택 (asia-northeast3 권장)
5. "사용 설정" 클릭

## 6. Firestore 보안 규칙 (개발용)

개발 중에는 다음 규칙을 사용하세요:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if request.auth != null;
    }
  }
}
```

**주의**: 프로덕션 환경에서는 더 엄격한 보안 규칙을 설정해야 합니다.

## 7. 실행

```bash
npm run dev
```

브라우저에서 `http://localhost:5173` 접속

