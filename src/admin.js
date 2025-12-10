import { onAuthStateChanged } from 'firebase/auth';
import { collection, addDoc, getDocs, getDoc, query, where, doc, deleteDoc, setDoc, updateDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { auth, db, storage } from './firebaseConfig.js';
import { isAdmin } from './adminConfig.js';

// PDF.js 동적 로드
let pdfjsLib = null;

async function loadPdfJs() {
  if (pdfjsLib) return pdfjsLib;
  
  try {
    // PDF.js를 동적으로 로드
    pdfjsLib = await import('pdfjs-dist');
    
    // Worker를 CDN으로 설정하되, 실패 시 worker 없이 진행
    try {
      const version = pdfjsLib.version || '4.0.379';
      pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${version}/pdf.worker.min.js`;
      console.log('Worker 설정 완료:', pdfjsLib.GlobalWorkerOptions.workerSrc);
    } catch (workerError) {
      console.warn('Worker 설정 실패, worker 없이 진행:', workerError);
      pdfjsLib.GlobalWorkerOptions.workerSrc = '';
    }
    
    console.log('PDF.js 로드 완료, 버전:', pdfjsLib.version);
    return pdfjsLib;
  } catch (error) {
    console.error('PDF.js 로드 실패:', error);
    throw new Error('PDF.js 라이브러리를 로드할 수 없습니다.');
  }
}

let currentUser = null;
let problemIdCounter = 1;
let editingProblemId = null; // 현재 수정 중인 문제 ID

// 인증 상태 확인
onAuthStateChanged(auth, (user) => {
  if (user) {
    // 관리자 권한 확인
    if (!isAdmin(user)) {
      alert('관리자만 접근할 수 있습니다.');
      window.location.href = '/';
      return;
    }
    currentUser = user;
    loadProblems();
  } else {
    window.location.href = '/';
  }
});

// 이미지 미리보기
let currentImageFile = null;
let currentImageUrl = null; // 수정 모드에서 기존 이미지 URL

document.getElementById('problemImage')?.addEventListener('change', (e) => {
  const file = e.target.files[0];
  const preview = document.getElementById('imagePreview');
  const previewImg = document.getElementById('previewImg');
  const removeBtn = document.getElementById('removeImageBtn');
  
  if (file) {
    // 파일 타입 확인
    if (!file.type.match('image/(png|jpeg|jpg)')) {
      alert('PNG, JPEG, JPG 파일만 업로드 가능합니다.');
      e.target.value = '';
      return;
    }
    
    currentImageFile = file;
    currentImageUrl = null; // 새 이미지 업로드 시 기존 URL 초기화
    
    // 미리보기 표시
    const reader = new FileReader();
    reader.onload = (e) => {
      previewImg.src = e.target.result;
      preview.style.display = 'block';
    };
    reader.readAsDataURL(file);
  }
});

// 이미지 제거 버튼
document.getElementById('removeImageBtn')?.addEventListener('click', () => {
  const fileInput = document.getElementById('problemImage');
  const preview = document.getElementById('imagePreview');
  
  fileInput.value = '';
  currentImageFile = null;
  currentImageUrl = null;
  preview.style.display = 'none';
});

// 문제 유형 변경 시 UI 업데이트
document.getElementById('problemType')?.addEventListener('change', (e) => {
  const type = e.target.value;
  const optionsSection = document.getElementById('optionsSection');
  const answerSection = document.getElementById('answerSection');
  const drawingSection = document.getElementById('drawingSection');
  
  if (type === 'multiple') {
    optionsSection.classList.remove('hidden');
    answerSection.classList.add('hidden');
    drawingSection.classList.add('hidden');
  } else if (type === 'short') {
    optionsSection.classList.add('hidden');
    answerSection.classList.remove('hidden');
    drawingSection.classList.add('hidden');
  } else if (type === 'drawing') {
    optionsSection.classList.add('hidden');
    answerSection.classList.add('hidden');
    drawingSection.classList.remove('hidden');
  }
});

// PDF 파싱
document.getElementById('parsePdfBtn')?.addEventListener('click', async () => {
  const fileInput = document.getElementById('pdfFileInput');
  const parseBtn = document.getElementById('parsePdfBtn');
  const preview = document.getElementById('pdfPreview');
  const textDiv = document.getElementById('pdfText');
  
  const file = fileInput.files[0];
  
  if (!file) {
    alert('PDF 파일을 선택해주세요.');
    return;
  }
  
  // 버튼 비활성화 및 로딩 표시
  parseBtn.disabled = true;
  parseBtn.textContent = '처리 중...';
  textDiv.textContent = 'PDF.js 라이브러리 로딩 중...';
  preview.classList.remove('hidden');
  
  try {
    console.log('PDF 파일 읽기 시작:', file.name);
    
    // PDF.js 동적 로드
    const pdfLib = await loadPdfJs();
    
    textDiv.textContent = 'PDF 파일 읽는 중...';
    const arrayBuffer = await file.arrayBuffer();
    console.log('PDF 파일 읽기 완료, 크기:', arrayBuffer.byteLength);
    
    // PDF 로드 (가장 간단한 설정, worker 없이)
    textDiv.textContent = 'PDF 문서 파싱 중...';
    console.log('PDF 문서 로딩 시작...');
    
    // 간단한 설정으로 PDF 로드 (worker 사용 안 함)
    const loadingTask = pdfLib.getDocument({ 
      data: arrayBuffer,
      verbosity: 0,
      useWorkerFetch: false
    });
    
    console.log('PDF 로딩 태스크 생성 완료, promise 대기 중...');
    console.log('Worker 상태:', pdfLib.GlobalWorkerOptions.workerSrc);
    
    // 타임아웃과 함께 PDF 로드
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => {
        reject(new Error('PDF 파싱 시간 초과 (15초). 파일이 너무 크거나 복잡할 수 있습니다.'));
      }, 15000);
    });
    
    const pdf = await Promise.race([
      loadingTask.promise,
      timeoutPromise
    ]);
    
    console.log('PDF 문서 로드 성공!');
    console.log('PDF 문서 로드 완료, 페이지 수:', pdf.numPages);
    
    // 텍스트 추출
    let fullText = '';
    textDiv.textContent = `텍스트 추출 중... (0/${pdf.numPages} 페이지)`;
    
    for (let i = 1; i <= pdf.numPages; i++) {
      textDiv.textContent = `텍스트 추출 중... (${i}/${pdf.numPages} 페이지)`;
      console.log(`페이지 ${i}/${pdf.numPages} 처리 중...`);
      
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const pageText = textContent.items.map(item => item.str).join(' ');
      fullText += `\n--- 페이지 ${i} ---\n${pageText}\n`;
    }
    
    console.log('텍스트 추출 완료, 길이:', fullText.length);
    
    // PDF 텍스트 표시
    if (fullText.trim().length === 0) {
      textDiv.innerHTML = '<p style="color: #ff9800;">⚠️ PDF에서 텍스트를 추출할 수 없습니다. 이미지로만 구성된 PDF일 수 있습니다.</p>';
    } else {
      textDiv.textContent = fullText;
    }
    preview.classList.remove('hidden');
    
    // 간단한 파싱 시도
    parseProblemsFromText(fullText);
    
    // 버튼 복원
    parseBtn.disabled = false;
    parseBtn.textContent = 'PDF 텍스트 추출하기';
    
  } catch (error) {
    console.error('PDF 파싱 오류:', error);
    console.error('오류 상세:', error.stack);
    
    // 버튼 복원
    parseBtn.disabled = false;
    parseBtn.textContent = 'PDF 텍스트 추출하기';
    
    // 오류 메시지 표시
    let errorMessage = 'PDF 파싱에 실패했습니다.\n\n';
    errorMessage += '오류: ' + error.message + '\n\n';
    
    if (error.message.includes('worker') || error.message.includes('Importing')) {
      errorMessage += '해결 방법:\n';
      errorMessage += '1. 인터넷 연결을 확인하세요\n';
      errorMessage += '2. 페이지를 새로고침하세요\n';
      errorMessage += '3. 브라우저 콘솔(F12)에서 오류를 확인하세요';
    } else if (error.message.includes('Invalid PDF')) {
      errorMessage += 'PDF 파일이 손상되었거나 지원되지 않는 형식일 수 있습니다.';
    } else {
      errorMessage += '브라우저 콘솔(F12)에서 자세한 오류를 확인하세요.';
    }
    
    textDiv.innerHTML = `<p style="color: #dc3545;">❌ ${errorMessage.replace(/\n/g, '<br>')}</p>`;
    preview.classList.remove('hidden');
    
    alert(errorMessage);
  }
});

// 텍스트에서 문제 파싱 (기본적인 파싱) - 참고용
function parseProblemsFromText(text) {
  // 문제 번호 패턴 찾기 (1., 2., 문제1 등)
  const problemPattern = /(?:문제\s*)?(\d+)[\.\)]\s*(.+?)(?=(?:문제\s*)?\d+[\.\)]|$)/gs;
  const matches = [...text.matchAll(problemPattern)];
  
  if (matches.length > 0) {
    const preview = document.getElementById('pdfPreview');
    const textDiv = document.getElementById('pdfText');
    textDiv.innerHTML = `<p style="color: #28a745; font-weight: bold;">✅ 약 ${matches.length}개의 문제 패턴을 찾았습니다. 아래 텍스트를 참고하여 문제를 입력하세요.</p><br>` + textDiv.textContent;
    preview.classList.remove('hidden');
  } else {
    const preview = document.getElementById('pdfPreview');
    const textDiv = document.getElementById('pdfText');
    textDiv.innerHTML = `<p style="color: #ff9800;">⚠️ 자동으로 문제 패턴을 찾을 수 없습니다. 텍스트를 확인하고 수동으로 입력해주세요.</p><br>` + textDiv.textContent;
    preview.classList.remove('hidden');
  }
}

// 이미지 업로드 함수
async function uploadProblemImage(file, problemId = null) {
  if (!file) return null;
  
  try {
    // 파일명 생성 (타임스탬프 + 원본 파일명)
    const timestamp = Date.now();
    const fileName = problemId 
      ? `problems/${problemId}_${timestamp}_${file.name}`
      : `problems/${timestamp}_${file.name}`;
    
    const storageRef = ref(storage, fileName);
    await uploadBytes(storageRef, file);
    const downloadURL = await getDownloadURL(storageRef);
    
    console.log('이미지 업로드 성공:', downloadURL);
    return downloadURL;
  } catch (error) {
    console.error('이미지 업로드 오류:', error);
    throw error;
  }
}

// 문제 추가/수정
document.getElementById('addProblemBtn')?.addEventListener('click', async () => {
  if (!currentUser) {
    alert('로그인이 필요합니다.');
    return;
  }
  
  const grade = parseInt(document.getElementById('problemGrade').value);
  const unit = parseInt(document.getElementById('problemUnit').value);
  const difficulty = parseInt(document.getElementById('problemDifficulty').value);
  const type = document.getElementById('problemType').value;
  const question = document.getElementById('problemQuestion').value.trim();
  
  if (!question) {
    alert('문제 내용을 입력해주세요.');
    return;
  }
  
  let problemData = {
    grade,
    unit,
    difficulty,
    type,
    question,
    timestamp: new Date()
  };
  
  if (type === 'multiple') {
    const options = [];
    let correct = 0;
    
    for (let i = 0; i < 4; i++) {
      const optionText = document.getElementById(`option${i}`).value.trim();
      if (optionText) {
        options.push(optionText);
        if (document.querySelector(`input[name="correctOption"][value="${i}"]`).checked) {
          correct = options.length - 1;
        }
      }
    }
    
    if (options.length < 2) {
      alert('최소 2개 이상의 보기를 입력해주세요.');
      return;
    }
    
    problemData.options = options;
    problemData.correct = correct;
  } else if (type === 'short') {
    const answer = document.getElementById('problemAnswer').value.trim();
    if (!answer) {
      alert('정답을 입력해주세요.');
      return;
    }
    problemData.answer = answer;
  } else if (type === 'drawing') {
    // 서술형 문제는 정답이 필요 없음 (교사가 직접 채점)
    // problemData에 추가 필드 없음
  }
  
  try {
    // 이미지 업로드 처리
    if (currentImageFile) {
      // 새 이미지 업로드
      const addBtn = document.getElementById('addProblemBtn');
      const originalText = addBtn.textContent;
      addBtn.disabled = true;
      addBtn.textContent = '이미지 업로드 중...';
      
      try {
        const imageUrl = await uploadProblemImage(currentImageFile, editingProblemId);
        problemData.imageUrl = imageUrl;
      } catch (imageError) {
        console.error('이미지 업로드 실패:', imageError);
        alert('이미지 업로드에 실패했습니다. 문제는 저장되지만 이미지는 포함되지 않습니다.');
      } finally {
        addBtn.disabled = false;
        addBtn.textContent = originalText;
      }
    } else if (currentImageUrl && !currentImageFile) {
      // 수정 모드에서 기존 이미지 유지
      problemData.imageUrl = currentImageUrl;
    }
    
    if (editingProblemId) {
      // 수정 모드: 기존 문제 업데이트
      console.log('수정할 문제 데이터:', problemData);
      await updateDoc(doc(db, 'problems', editingProblemId), problemData);
      showStatus(`✅ 문제가 수정되었습니다!`, 'success');
      editingProblemId = null;
    } else {
      // 추가 모드: 새 문제 추가
      console.log('저장할 문제 데이터:', problemData);
      await addDoc(collection(db, 'problems'), problemData);
      showStatus(`✅ 문제가 Firestore에 저장되었습니다! 학생이 ${grade}학년 ${unit}단원을 선택하면 자동으로 로드됩니다.`, 'success');
    }
    
    // 폼 초기화
    resetProblemForm();
    loadProblems();
  } catch (error) {
    console.error('문제 저장 오류:', error);
    showStatus('문제 저장에 실패했습니다: ' + error.message, 'error');
  }
});

// 폼 초기화 함수
function resetProblemForm() {
  document.getElementById('problemQuestion').value = '';
  document.getElementById('problemAnswer').value = '';
  document.getElementById('problemType').value = 'multiple'; // 기본값으로 리셋
  for (let i = 0; i < 4; i++) {
    document.getElementById(`option${i}`).value = '';
    if (i === 0) {
      document.querySelector(`input[name="correctOption"][value="${i}"]`).checked = true;
    } else {
      document.querySelector(`input[name="correctOption"][value="${i}"]`).checked = false;
    }
  }
  
  // 이미지 초기화
  const fileInput = document.getElementById('problemImage');
  const preview = document.getElementById('imagePreview');
  if (fileInput) fileInput.value = '';
  if (preview) preview.style.display = 'none';
  currentImageFile = null;
  currentImageUrl = null;
  
  // UI 업데이트 (문제 유형 변경 이벤트 트리거)
  document.getElementById('problemType').dispatchEvent(new Event('change'));
  
  // 버튼 텍스트 복원
  const addBtn = document.getElementById('addProblemBtn');
  if (addBtn) {
    addBtn.textContent = '문제 추가';
    addBtn.className = 'btn btn-success';
  }
  
  // 수정 취소 버튼 제거
  const cancelBtn = document.getElementById('cancelEditBtn');
  if (cancelBtn) cancelBtn.remove();
  
  editingProblemId = null;
}

// 문제 수정 함수
window.editProblem = async function(problemId) {
  try {
    // Firestore에서 문제 데이터 가져오기
    const problemRef = doc(db, 'problems', problemId);
    const problemSnap = await getDoc(problemRef);
    
    if (problemSnap.exists()) {
      const problem = { id: problemSnap.id, ...problemSnap.data() };
      fillProblemForm(problem);
    } else {
      alert('문제를 찾을 수 없습니다.');
    }
  } catch (error) {
    console.error('문제 로드 오류:', error);
    alert('문제를 불러오는데 실패했습니다: ' + error.message);
  }
};

// 폼에 문제 데이터 채우기
function fillProblemForm(problem) {
  editingProblemId = problem.id;
  
  // 기본 정보 채우기
  document.getElementById('problemGrade').value = problem.grade;
  document.getElementById('problemUnit').value = problem.unit;
  document.getElementById('problemDifficulty').value = problem.difficulty;
  document.getElementById('problemType').value = problem.type;
  document.getElementById('problemQuestion').value = problem.question;
  
  // 이미지 처리
  const fileInput = document.getElementById('problemImage');
  const preview = document.getElementById('imagePreview');
  const previewImg = document.getElementById('previewImg');
  
  if (problem.imageUrl) {
    // 기존 이미지가 있으면 미리보기 표시
    currentImageUrl = problem.imageUrl;
    currentImageFile = null; // 새 파일이 선택되지 않았으므로 null
    previewImg.src = problem.imageUrl;
    preview.style.display = 'block';
    if (fileInput) fileInput.value = ''; // 파일 입력은 초기화
  } else {
    // 이미지가 없으면 미리보기 숨기기
    currentImageUrl = null;
    currentImageFile = null;
    if (preview) preview.style.display = 'none';
    if (fileInput) fileInput.value = '';
  }
  
  // 문제 유형에 따라 필드 채우기
  if (problem.type === 'multiple') {
    // 보기 채우기
    if (problem.options && problem.options.length > 0) {
      for (let i = 0; i < 4; i++) {
        const optionInput = document.getElementById(`option${i}`);
        if (optionInput) {
          optionInput.value = problem.options[i] || '';
        }
        // 정답 라디오 버튼 설정
        const radioBtn = document.querySelector(`input[name="correctOption"][value="${i}"]`);
        if (radioBtn) {
          radioBtn.checked = (problem.correct === i);
        }
      }
    }
  } else if (problem.type === 'short') {
    document.getElementById('problemAnswer').value = problem.answer || '';
  }
  
  // UI 업데이트 (문제 유형 변경 이벤트 트리거)
  document.getElementById('problemType').dispatchEvent(new Event('change'));
  
  // 버튼 텍스트 변경
  const addBtn = document.getElementById('addProblemBtn');
  if (addBtn) {
    addBtn.textContent = '문제 수정 저장';
    addBtn.className = 'btn btn-primary';
  }
  
  // 수정 취소 버튼 추가 (이미 있으면 제거 후 다시 추가)
  let cancelBtn = document.getElementById('cancelEditBtn');
  if (cancelBtn) {
    cancelBtn.remove();
  }
  cancelBtn = document.createElement('button');
  cancelBtn.id = 'cancelEditBtn';
  cancelBtn.className = 'btn btn-secondary';
  cancelBtn.textContent = '수정 취소';
  cancelBtn.onclick = () => {
    resetProblemForm();
    cancelBtn.remove();
  };
  addBtn.parentNode.insertBefore(cancelBtn, addBtn.nextSibling);
  
  // 스크롤을 폼으로 이동
  document.querySelector('.card:nth-of-type(2)').scrollIntoView({ behavior: 'smooth', block: 'start' });
  
  showStatus('문제 수정 모드입니다. 내용을 수정한 후 "문제 수정 저장" 버튼을 클릭하세요.', 'success');
}

// 문제 목록 로드
async function loadProblems() {
  const filterGrade = document.getElementById('filterGradeList').value;
  const filterUnit = document.getElementById('filterUnitList').value;
  
  try {
    let q = query(collection(db, 'problems'), where('grade', '==', 5));
    
    if (filterGrade) {
      q = query(collection(db, 'problems'), where('grade', '==', parseInt(filterGrade)));
    }
    
    const querySnapshot = await getDocs(q);
    const container = document.getElementById('problemsList');
    container.innerHTML = '';
    
    const problemsByUnit = {};
    
    querySnapshot.forEach((doc) => {
      const problem = { id: doc.id, ...doc.data() };
      const unit = problem.unit;
      
      if (filterUnit && problem.unit !== parseInt(filterUnit)) {
        return;
      }
      
      if (!problemsByUnit[unit]) {
        problemsByUnit[unit] = [];
      }
      problemsByUnit[unit].push(problem);
    });
    
    // 단원별로 정렬하여 표시
    Object.keys(problemsByUnit).sort().forEach(unit => {
      const unitDiv = document.createElement('div');
      unitDiv.style.marginBottom = '30px';
      unitDiv.innerHTML = `<h3>${filterGrade || 5}학년 ${unit}단원 (${problemsByUnit[unit].length}문제)</h3>`;
      
      problemsByUnit[unit].forEach((problem, index) => {
        const problemDiv = document.createElement('div');
        problemDiv.className = 'problem-item';
        
        const typeLabel = problem.type === 'multiple' ? '객관식' : problem.type === 'short' ? '주관식' : '서술형';
        
        const difficultySprouts = '🌱'.repeat(problem.difficulty);
        const imageIndicator = problem.imageUrl ? ' 📷' : '';
        let problemContent = `
          <div class="problem-header">
            <strong>문제 ${index + 1} (${difficultySprouts} ${typeLabel})${imageIndicator}</strong>
            <div>
              <button class="btn btn-primary" onclick="editProblem('${problem.id}')" style="margin-right: 5px;">수정</button>
              <button class="btn btn-danger" onclick="deleteProblem('${problem.id}')">삭제</button>
            </div>
          </div>
          <div><strong>질문:</strong> ${problem.question}</div>
        `;
        
        if (problem.type === 'multiple') {
          problemContent += `<div style="margin-top: 10px;"><strong>보기:</strong> ${problem.options.map((opt, idx) => 
            `${idx + 1}. ${opt}${idx === problem.correct ? ' ✓' : ''}`
          ).join(', ')}</div>`;
        } else if (problem.type === 'short') {
          problemContent += `<div style="margin-top: 10px;"><strong>정답:</strong> ${problem.answer}</div>`;
        } else if (problem.type === 'drawing') {
          problemContent += `<div style="margin-top: 10px;"><strong>유형:</strong> 서술형 (그리기)</div>`;
        }
        
        problemDiv.innerHTML = problemContent;
        unitDiv.appendChild(problemDiv);
      });
      
      container.appendChild(unitDiv);
    });
    
    if (querySnapshot.empty) {
      container.innerHTML = '<p>저장된 문제가 없습니다.</p>';
    }
  } catch (error) {
    console.error('문제 로드 오류:', error);
    showStatus('문제 로드에 실패했습니다: ' + error.message, 'error');
  }
}

// 문제 삭제
window.deleteProblem = async function(problemId) {
  if (!confirm('이 문제를 삭제하시겠습니까?')) {
    return;
  }
  
  try {
    await deleteDoc(doc(db, 'problems', problemId));
    showStatus('문제가 삭제되었습니다.', 'success');
    loadProblems();
  } catch (error) {
    console.error('문제 삭제 오류:', error);
    showStatus('문제 삭제에 실패했습니다: ' + error.message, 'error');
  }
};

// 상태 메시지 표시
function showStatus(message, type) {
  const statusDiv = document.getElementById('statusMessage');
  statusDiv.className = `status-message status-${type}`;
  statusDiv.textContent = message;
  statusDiv.style.display = 'block';
  
  setTimeout(() => {
    statusDiv.style.display = 'none';
  }, 3000);
}

// 필터 변경 시 문제 목록 새로고침
document.getElementById('filterGradeList')?.addEventListener('change', loadProblems);
document.getElementById('filterUnitList')?.addEventListener('change', loadProblems);
document.getElementById('loadProblemsBtn')?.addEventListener('click', loadProblems);

