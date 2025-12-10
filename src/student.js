import { onAuthStateChanged } from 'firebase/auth';
import { collection, addDoc, getDocs, query, where, orderBy } from 'firebase/firestore';
import { auth, db } from './firebaseConfig.js';
import { problems as localProblems } from './data/problems.js';

let currentUser = null;
let currentGrade = 5;
let currentUnit = 1;
let currentDifficulty = 1;
let currentProblems = [];
let userAnswers = {};
let answerMode = 'immediate';
let wrongProblems = [];
let currentNoteData = null;
let firestoreProblems = {}; // Firestore에서 로드한 문제들

// 인증 상태 확인
onAuthStateChanged(auth, (user) => {
  if (user) {
    currentUser = user;
    document.getElementById('userName').textContent = user.displayName || user.email;
    loadProblemsFromFirestore(); // Firestore에서 문제 로드
    loadNotes();
  } else {
    window.location.href = '/';
  }
});

// Firestore에서 문제 로드
async function loadProblemsFromFirestore() {
  try {
    const querySnapshot = await getDocs(collection(db, 'problems'));
    firestoreProblems = {};
    let problemCount = 0;
    
    querySnapshot.forEach((doc) => {
      const problem = { id: doc.id, ...doc.data() };
      const grade = problem.grade;
      const unit = problem.unit;
      const difficulty = problem.difficulty;
      
      if (!firestoreProblems[grade]) {
        firestoreProblems[grade] = {};
      }
      if (!firestoreProblems[grade][unit]) {
        firestoreProblems[grade][unit] = { easy: [], medium: [], hard: [] };
      }
      
      const difficultyKey = ['easy', 'medium', 'hard'][difficulty - 1];
      firestoreProblems[grade][unit][difficultyKey].push(problem);
      problemCount++;
    });
    
    console.log(`✅ Firestore에서 ${problemCount}개의 문제를 로드했습니다.`);
    if (problemCount > 0) {
      console.log('저장된 문제:', firestoreProblems);
    }
  } catch (error) {
    console.error('Firestore 문제 로드 오류:', error);
    // 오류가 발생해도 로컬 문제를 사용할 수 있도록 계속 진행
  }
}

// 화면 전환 함수
function showScreen(screenId) {
  document.querySelectorAll('.screen').forEach(screen => {
    screen.classList.remove('active');
  });
  document.getElementById(screenId).classList.add('active');
}

// 단원 선택 화면 이벤트
document.getElementById('startBtn')?.addEventListener('click', () => {
  currentGrade = parseInt(document.getElementById('gradeSelect').value);
  currentUnit = parseInt(document.getElementById('unitSelect').value);
  answerMode = document.querySelector('input[name="answerMode"]:checked').value;
  
  // 난이도 선택
  const selectedDifficulty = document.querySelector('.difficulty-btn.active');
  if (selectedDifficulty) {
    currentDifficulty = parseInt(selectedDifficulty.dataset.difficulty);
  } else {
    currentDifficulty = 1;
  }
  
  startQuiz();
});

// 난이도 버튼 선택
document.querySelectorAll('.difficulty-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.difficulty-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
  });
});

// 문제 풀이 시작
function startQuiz() {
  const difficultyKey = ['easy', 'medium', 'hard'][currentDifficulty - 1];
  
  // Firestore에서 문제를 우선적으로 사용, 없으면 로컬 문제 사용
  let gradeProblems = firestoreProblems[currentGrade];
  let usingFirestore = false;
  
  if (gradeProblems && gradeProblems[currentUnit] && 
      gradeProblems[currentUnit][difficultyKey] && 
      gradeProblems[currentUnit][difficultyKey].length > 0) {
    // Firestore에 문제가 있으면 사용
    usingFirestore = true;
    console.log(`✅ Firestore에서 ${currentGrade}학년 ${currentUnit}단원 문제를 로드했습니다.`);
  } else {
    // Firestore에 문제가 없으면 로컬 문제 사용
    gradeProblems = localProblems[currentGrade];
    console.log(`ℹ️ Firestore에 문제가 없어 로컬 예시 문제를 사용합니다.`);
  }
  
  if (!gradeProblems || !gradeProblems[currentUnit]) {
    alert('해당 학년/단원의 문제가 없습니다.');
    return;
  }
  
  currentProblems = gradeProblems[currentUnit][difficultyKey] || [];
  
  if (currentProblems.length === 0) {
    alert('해당 난이도의 문제가 없습니다.');
    return;
  }
  
  // 문제 ID가 없으면 추가 (Firestore 문제는 이미 id가 있음)
  currentProblems = currentProblems.map((problem, index) => {
    if (!problem.id) {
      problem.id = problem.id || `local-${currentGrade}-${currentUnit}-${difficultyKey}-${index}`;
    }
    return problem;
  });
  
  userAnswers = {};
  showScreen('quizScreen');
  renderQuestions();
}

// 문제 렌더링
function renderQuestions() {
  const container = document.getElementById('questionsContainer');
  const title = document.getElementById('quizTitle');
  const difficultyEmoji = '🌱'.repeat(currentDifficulty);
  title.textContent = `${currentGrade}학년 ${currentUnit}단원 - ${difficultyEmoji}`;
  
  container.innerHTML = '';
  
  currentProblems.forEach((problem, index) => {
    const questionDiv = document.createElement('div');
    questionDiv.className = 'question-card';
    questionDiv.innerHTML = `
      <div class="question-number">문제 ${index + 1}</div>
      <div class="question-text">${problem.question}</div>
    `;
    
    if (problem.type === 'multiple') {
      const optionsDiv = document.createElement('div');
      optionsDiv.className = 'options';
      problem.options.forEach((option, optIndex) => {
        const optionDiv = document.createElement('div');
        optionDiv.className = 'option';
        optionDiv.textContent = `${optIndex + 1}. ${option}`;
        optionDiv.dataset.index = optIndex;
        optionDiv.addEventListener('click', () => {
          if (answerMode === 'immediate') {
            checkAnswerImmediate(problem, optIndex, optionDiv);
          } else {
            selectAnswer(problem.id, optIndex, optionDiv);
          }
        });
        optionsDiv.appendChild(optionDiv);
      });
      questionDiv.appendChild(optionsDiv);
    } else if (problem.type === 'drawing') {
      // 서술형 문제 - 그림판
      const drawingContainer = document.createElement('div');
      drawingContainer.className = 'drawing-container';
      drawingContainer.innerHTML = `
        <div class="drawing-toolbar">
          <button type="button" class="btn btn-secondary" onclick="clearDrawingCanvas('${problem.id}')">지우기</button>
        </div>
        <canvas id="drawing-${problem.id}" class="drawing-canvas" width="800" height="400"></canvas>
      `;
      questionDiv.appendChild(drawingContainer);
      
      // 캔버스 초기화 (DOM이 완전히 렌더링된 후 실행)
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          initDrawingCanvas(problem.id);
        });
      });
    } else {
      const input = document.createElement('input');
      input.type = 'text';
      input.className = 'short-answer-input';
      input.placeholder = '답을 입력하세요';
      input.addEventListener('change', (e) => {
        if (answerMode === 'immediate') {
          checkAnswerImmediate(problem, e.target.value.trim(), input);
        } else {
          userAnswers[problem.id] = e.target.value.trim();
        }
      });
      questionDiv.appendChild(input);
    }
    
    // 즉시 확인 모드에서 정답 표시 영역 (서술형 제외)
    if (answerMode === 'immediate' && problem.type !== 'drawing') {
      const answerDiv = document.createElement('div');
      answerDiv.className = 'answer-feedback';
      answerDiv.id = `feedback-${problem.id}`;
      questionDiv.appendChild(answerDiv);
    }
    
    container.appendChild(questionDiv);
  });
  
  updateProgress();
}

// 즉시 정답 확인
function checkAnswerImmediate(problem, userAnswer, element) {
  // 서술형 문제는 즉시 확인 모드에서 처리하지 않음
  if (problem.type === 'drawing') {
    return;
  }
  
  let isCorrect = false;
  
  if (problem.type === 'multiple') {
    isCorrect = parseInt(userAnswer) === problem.correct;
    userAnswers[problem.id] = parseInt(userAnswer);
    
    // 옵션 스타일 업데이트
    const options = element.parentElement.querySelectorAll('.option');
    options.forEach((opt, idx) => {
      opt.classList.remove('selected', 'correct', 'incorrect');
      if (idx === parseInt(userAnswer)) {
        opt.classList.add('selected');
      }
      if (idx === problem.correct) {
        opt.classList.add('correct');
      } else if (idx === parseInt(userAnswer) && !isCorrect) {
        opt.classList.add('incorrect');
      }
    });
  } else {
    isCorrect = userAnswer.toLowerCase() === problem.answer.toLowerCase();
    userAnswers[problem.id] = userAnswer;
    
    if (isCorrect) {
      element.style.borderColor = '#DDFFDD';
      element.style.background = '#F0FFF0';
    } else {
      element.style.borderColor = '#FFDDDD';
      element.style.background = '#FFF0F0';
    }
  }
  
  const feedbackDiv = document.getElementById(`feedback-${problem.id}`);
  if (feedbackDiv) {
    feedbackDiv.innerHTML = isCorrect 
      ? '<span style="color: #DDFFDD;">✓ 정답입니다!</span>'
      : `<span style="color: #FFDDDD;">✗ 오답입니다. 정답: ${problem.type === 'multiple' ? problem.options[problem.correct] : problem.answer}</span>`;
  }
  
  updateProgress();
}

// 답 선택 (나중에 확인 모드)
function selectAnswer(problemId, answerIndex, element) {
  userAnswers[problemId] = answerIndex;
  element.parentElement.querySelectorAll('.option').forEach(opt => {
    opt.classList.remove('selected');
  });
  element.classList.add('selected');
  updateProgress();
}

// 진행률 업데이트
function updateProgress() {
  // null이나 빈 값 제외하고 카운트
  const answered = Object.values(userAnswers).filter(answer => answer !== null && answer !== undefined && answer !== '').length;
  const total = currentProblems.length;
  document.getElementById('progressText').textContent = `진행: ${answered}/${total}`;
}

// 제출하기
document.getElementById('submitQuizBtn')?.addEventListener('click', () => {
  // 답한 문제 개수 확인 (null, undefined, 빈 문자열 제외)
  const answeredCount = Object.values(userAnswers).filter(answer => 
    answer !== null && answer !== undefined && answer !== ''
  ).length;
  
  if (answeredCount < currentProblems.length) {
    if (!confirm('아직 답하지 않은 문제가 있습니다. 그래도 제출하시겠습니까?')) {
      return;
    }
  }
  
  checkAnswers();
});

// 정답 확인
function checkAnswers() {
  wrongProblems = [];
  
  currentProblems.forEach(problem => {
    // 서술형 문제는 자동 채점하지 않음
    if (problem.type === 'drawing') {
      return;
    }
    
    const userAnswer = userAnswers[problem.id];
    let isCorrect = false;
    
    if (problem.type === 'multiple') {
      isCorrect = userAnswer === problem.correct;
    } else {
      isCorrect = String(userAnswer).toLowerCase().trim() === String(problem.answer).toLowerCase().trim();
    }
    
    if (!isCorrect) {
      wrongProblems.push({
        ...problem,
        userAnswer: userAnswer,
        correctAnswer: problem.type === 'multiple' ? problem.options[problem.correct] : problem.answer
      });
    }
  });
  
  showResult();
}

// 결과 화면 표시
function showResult() {
  // 서술형 문제 개수 계산
  const drawingProblems = currentProblems.filter(p => p.type === 'drawing').length;
  const autoGradedProblems = currentProblems.filter(p => p.type !== 'drawing');
  
  const correct = autoGradedProblems.length - wrongProblems.length;
  const totalAutoGraded = autoGradedProblems.length;
  const score = totalAutoGraded > 0 ? Math.round((correct / totalAutoGraded) * 100) : 0;
  
  document.getElementById('resultScore').textContent = `${score}점`;
  let resultText = `맞은 문제: ${correct}개 / 자동 채점: ${totalAutoGraded}개`;
  if (drawingProblems > 0) {
    resultText += ` (서술형 ${drawingProblems}개는 교사 채점 예정)`;
  }
  document.getElementById('resultText').textContent = resultText;
  
  const wrongContainer = document.getElementById('wrongProblemsContainer');
  wrongContainer.innerHTML = '';
  
  // 서술형 문제를 제외한 틀린 문제만 필터링
  const autoGradedWrongProblems = wrongProblems.filter(p => p.type !== 'drawing');
  const createNoteBtn = document.getElementById('createNoteBtn');
  
  if (wrongProblems.length === 0) {
    wrongContainer.innerHTML = '<p style="color: #DDFFDD; font-size: 18px;">모든 문제를 맞추셨습니다! 🎉</p>';
    // 오답노트 버튼 숨기기
    if (createNoteBtn) {
      createNoteBtn.style.display = 'none';
    }
  } else {
    wrongProblems.forEach((problem, index) => {
      const wrongDiv = document.createElement('div');
      wrongDiv.className = 'wrong-problem-item';
      wrongDiv.innerHTML = `
        <strong>문제 ${currentProblems.findIndex(p => p.id === problem.id) + 1}</strong><br>
        ${problem.question}<br>
        <span style="color: #FFDDDD;">내 답: ${problem.userAnswer}</span><br>
        <span style="color: #DDFFDD;">정답: ${problem.correctAnswer}</span>
      `;
      wrongContainer.appendChild(wrongDiv);
    });
    
    // 오답노트 버튼 표시/숨김 처리 (자동 채점 틀린 문제가 있을 때만 표시)
    if (createNoteBtn) {
      if (autoGradedWrongProblems.length > 0) {
        createNoteBtn.style.display = 'block';
      } else {
        createNoteBtn.style.display = 'none';
      }
    }
  }
  
  // 결과 저장
  saveResult();
  
  showScreen('resultScreen');
}

// 결과 저장
async function saveResult() {
  if (!currentUser) return;
  
  try {
    // 서술형 문제 개수 계산
    const drawingProblems = currentProblems.filter(p => p.type === 'drawing').length;
    const autoGradedProblems = currentProblems.filter(p => p.type !== 'drawing');
    const correctCount = autoGradedProblems.length - wrongProblems.length;
    const totalAutoGraded = autoGradedProblems.length;
    const score = totalAutoGraded > 0 ? Math.round((correctCount / totalAutoGraded) * 100) : 0;
    
    await addDoc(collection(db, 'results'), {
      userId: currentUser.uid,
      userName: currentUser.displayName || currentUser.email,
      grade: currentGrade,
      unit: currentUnit,
      difficulty: currentDifficulty,
      totalProblems: currentProblems.length,
      drawingProblems: drawingProblems,
      autoGradedProblems: totalAutoGraded,
      correctCount: correctCount,
      wrongCount: wrongProblems.length,
      score: score,
      timestamp: new Date(),
      answers: userAnswers,
      wrongProblems: wrongProblems.map(p => p.id)
    });
  } catch (error) {
    console.error('결과 저장 오류:', error);
  }
}

// 오답노트 작성
document.getElementById('createNoteBtn')?.addEventListener('click', () => {
  // 서술형 문제를 제외한 틀린 문제만 필터링
  const autoGradedWrongProblems = wrongProblems.filter(p => p.type !== 'drawing');
  
  if (autoGradedWrongProblems.length === 0) {
    alert('오답노트를 작성할 틀린 문제가 없습니다. (서술형 문제는 제외됩니다)');
    return;
  }
  showNoteCreateScreen();
});

function showNoteCreateScreen() {
  const container = document.getElementById('noteProblemsContainer');
  container.innerHTML = '';
  
  currentNoteData = {
    problems: [],
    timestamp: new Date()
  };
  
  // 서술형 문제를 제외한 틀린 문제만 필터링
  const autoGradedWrongProblems = wrongProblems.filter(p => p.type !== 'drawing');
  
  autoGradedWrongProblems.forEach((problem, index) => {
    const noteDiv = document.createElement('div');
    noteDiv.className = 'question-card';
    noteDiv.innerHTML = `
      <div class="question-number">틀린 문제 ${index + 1}</div>
      <div class="question-text">${problem.question}</div>
      <div style="margin: 10px 0;">
        <span style="color: #FFDDDD;">내 답: ${problem.userAnswer}</span><br>
        <span style="color: #DDFFDD;">정답: ${problem.correctAnswer}</span>
      </div>
      <div class="reason-selector">
        <label>오답 원인 선택:</label>
        <div>
          <span class="reason-option" data-reason="concept">개념을 몰랐다</span>
          <span class="reason-option" data-reason="calculation">계산 실수했다</span>
          <span class="reason-option" data-reason="type">모르는 문제 유형이다</span>
          <span class="reason-option" data-reason="careless">부주의했다</span>
        </div>
        <input type="text" class="custom-reason-input" placeholder="또는 직접 입력" id="custom-reason-${problem.id}">
      </div>
      <div class="canvas-container">
        <div class="canvas-toolbar">
          <button class="btn btn-secondary" onclick="clearCanvas(${problem.id})">지우기</button>
          <button class="btn btn-secondary" onclick="saveCanvas(${problem.id})">저장</button>
        </div>
        <canvas id="canvas-${problem.id}" width="800" height="400" style="width: 100%; height: auto;"></canvas>
      </div>
    `;
    container.appendChild(noteDiv);
    
    // 캔버스 초기화
    initCanvas(problem.id);
    
    // 오답 원인 선택
    noteDiv.querySelectorAll('.reason-option').forEach(opt => {
      opt.addEventListener('click', () => {
        noteDiv.querySelectorAll('.reason-option').forEach(o => o.classList.remove('selected'));
        opt.classList.add('selected');
        const customInput = document.getElementById(`custom-reason-${problem.id}`);
        customInput.value = '';
        updateNoteReason(problem.id, opt.dataset.reason);
      });
    });
    
    const customInput = document.getElementById(`custom-reason-${problem.id}`);
    customInput.addEventListener('input', (e) => {
      if (e.target.value) {
        noteDiv.querySelectorAll('.reason-option').forEach(o => o.classList.remove('selected'));
        updateNoteReason(problem.id, e.target.value);
      }
    });
  });
  
  showScreen('noteCreateScreen');
}

// 서술형 문제용 그림판 캔버스 초기화
const drawingCanvases = {};
function initDrawingCanvas(problemId) {
  const canvas = document.getElementById(`drawing-${problemId}`);
  if (!canvas) {
    console.error(`Canvas not found: drawing-${problemId}`);
    return;
  }
  
  // 이미 초기화된 경우 스킵
  if (drawingCanvases[problemId]) {
    return;
  }
  
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    console.error('Could not get 2d context');
    return;
  }
  
  // 펜 설정: 10px 두께의 검은색 펜
  ctx.strokeStyle = '#000000';
  ctx.fillStyle = '#000000';
  ctx.lineWidth = 10;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  
  // 캔버스 배경을 흰색으로 설정
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = '#000000'; // 다시 검은색으로
  
  let isDrawing = false;
  let lastX = 0;
  let lastY = 0;
  
  function getEventPos(e) {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    
    let clientX, clientY;
    
    if (e.touches && e.touches.length > 0) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else if (e.changedTouches && e.changedTouches.length > 0) {
      clientX = e.changedTouches[0].clientX;
      clientY = e.changedTouches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }
    
    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY
    };
  }
  
  function startDrawing(e) {
    e.preventDefault();
    e.stopPropagation();
    
    isDrawing = true;
    const pos = getEventPos(e);
    lastX = pos.x;
    lastY = pos.y;
    
    // 첫 점도 그리기
    ctx.beginPath();
    ctx.arc(lastX, lastY, 5, 0, Math.PI * 2);
    ctx.fill();
    
    // 즉시 저장
    saveDrawingAnswer(problemId);
  }
  
  function draw(e) {
    if (!isDrawing) return;
    e.preventDefault();
    e.stopPropagation();
    
    const pos = getEventPos(e);
    
    ctx.beginPath();
    ctx.moveTo(lastX, lastY);
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
    
    lastX = pos.x;
    lastY = pos.y;
  }
  
  function stopDrawing(e) {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    
    if (isDrawing) {
      isDrawing = false;
      // 마지막 저장
      saveDrawingAnswer(problemId);
    }
  }
  
  // 마우스 이벤트
  canvas.addEventListener('mousedown', startDrawing);
  canvas.addEventListener('mousemove', draw);
  canvas.addEventListener('mouseup', stopDrawing);
  canvas.addEventListener('mouseleave', stopDrawing);
  canvas.addEventListener('mouseout', stopDrawing);
  
  // 터치 이벤트
  canvas.addEventListener('touchstart', startDrawing, { passive: false });
  canvas.addEventListener('touchmove', draw, { passive: false });
  canvas.addEventListener('touchend', stopDrawing, { passive: false });
  canvas.addEventListener('touchcancel', stopDrawing, { passive: false });
  
  // 포인터 이벤트 (마우스와 터치 모두 지원)
  canvas.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    if (canvas.setPointerCapture) {
      canvas.setPointerCapture(e.pointerId);
    }
    startDrawing(e);
  });
  canvas.addEventListener('pointermove', (e) => {
    draw(e);
  });
  canvas.addEventListener('pointerup', (e) => {
    if (canvas.releasePointerCapture) {
      canvas.releasePointerCapture(e.pointerId);
    }
    stopDrawing(e);
  });
  canvas.addEventListener('pointercancel', (e) => {
    if (canvas.releasePointerCapture) {
      canvas.releasePointerCapture(e.pointerId);
    }
    stopDrawing(e);
  });
  
  drawingCanvases[problemId] = { 
    canvas: canvas, 
    ctx: ctx,
    isDrawing: false
  };
  
  console.log(`Drawing canvas initialized for problem ${problemId}`);
}

// 서술형 문제 답안 저장
function saveDrawingAnswer(problemId) {
  const canvasData = drawingCanvases[problemId];
  if (canvasData && canvasData.canvas) {
    const imageData = canvasData.canvas.toDataURL('image/png');
    userAnswers[problemId] = imageData;
    updateProgress();
  } else {
    // fallback: 직접 찾기
    const canvas = document.getElementById(`drawing-${problemId}`);
    if (canvas) {
      const imageData = canvas.toDataURL('image/png');
      userAnswers[problemId] = imageData;
      updateProgress();
    }
  }
}

// 서술형 문제 캔버스 지우기
window.clearDrawingCanvas = function(problemId) {
  const canvasData = drawingCanvases[problemId];
  if (canvasData && canvasData.canvas && canvasData.ctx) {
    const ctx = canvasData.ctx;
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, canvasData.canvas.width, canvasData.canvas.height);
    
    // 답안도 초기화
    userAnswers[problemId] = null;
    updateProgress();
  } else {
    // fallback: 직접 찾기
    const canvas = document.getElementById(`drawing-${problemId}`);
    if (canvas) {
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      userAnswers[problemId] = null;
      updateProgress();
    }
  }
};

// 캔버스 초기화 (오답노트용)
const canvases = {};
function initCanvas(problemId) {
  const canvas = document.getElementById(`canvas-${problemId}`);
  const ctx = canvas.getContext('2d');
  ctx.strokeStyle = '#000';
  ctx.lineWidth = 2;
  ctx.lineCap = 'round';
  
  let isDrawing = false;
  
  canvas.addEventListener('mousedown', (e) => {
    isDrawing = true;
    const rect = canvas.getBoundingClientRect();
    ctx.beginPath();
    ctx.moveTo(e.clientX - rect.left, e.clientY - rect.top);
  });
  
  canvas.addEventListener('mousemove', (e) => {
    if (isDrawing) {
      const rect = canvas.getBoundingClientRect();
      ctx.lineTo(e.clientX - rect.left, e.clientY - rect.top);
      ctx.stroke();
    }
  });
  
  canvas.addEventListener('mouseup', () => {
    isDrawing = false;
  });
  
  canvas.addEventListener('mouseleave', () => {
    isDrawing = false;
  });
  
  // 터치 이벤트
  canvas.addEventListener('touchstart', (e) => {
    e.preventDefault();
    isDrawing = true;
    const touch = e.touches[0];
    const rect = canvas.getBoundingClientRect();
    ctx.beginPath();
    ctx.moveTo(touch.clientX - rect.left, touch.clientY - rect.top);
  });
  
  canvas.addEventListener('touchmove', (e) => {
    e.preventDefault();
    if (isDrawing) {
      const touch = e.touches[0];
      const rect = canvas.getBoundingClientRect();
      ctx.lineTo(touch.clientX - rect.left, touch.clientY - rect.top);
      ctx.stroke();
    }
  });
  
  canvas.addEventListener('touchend', () => {
    isDrawing = false;
  });
  
  canvases[problemId] = { canvas, ctx };
}

// 캔버스 지우기
window.clearCanvas = function(problemId) {
  const { canvas, ctx } = canvases[problemId];
  ctx.clearRect(0, 0, canvas.width, canvas.height);
};

// 캔버스 저장
window.saveCanvas = function(problemId) {
  const { canvas } = canvases[problemId];
  const imageData = canvas.toDataURL('image/png');
  const noteItem = currentNoteData.problems.find(p => p.problemId === problemId);
  if (noteItem) {
    noteItem.drawing = imageData;
  }
};

// 오답 원인 업데이트
function updateNoteReason(problemId, reason) {
  let noteItem = currentNoteData.problems.find(p => p.problemId === problemId);
  if (!noteItem) {
    noteItem = { problemId, reason: '' };
    currentNoteData.problems.push(noteItem);
  }
  noteItem.reason = reason;
}

// 오답노트 저장
document.getElementById('saveNoteBtn')?.addEventListener('click', async () => {
  if (!currentUser) return;
  
  // 모든 캔버스 저장
  wrongProblems.forEach(problem => {
    saveCanvas(problem.id);
  });
  
  try {
    await addDoc(collection(db, 'notes'), {
      userId: currentUser.uid,
      userName: currentUser.displayName || currentUser.email,
      grade: currentGrade,
      unit: currentUnit,
      difficulty: currentDifficulty,
      problems: currentNoteData.problems,
      timestamp: new Date()
    });
    
    alert('오답노트가 저장되었습니다!');
    showScreen('unitSelectScreen');
  } catch (error) {
    console.error('오답노트 저장 오류:', error);
    alert('저장에 실패했습니다.');
  }
});

document.getElementById('cancelNoteBtn')?.addEventListener('click', () => {
  showScreen('resultScreen');
});

// 오답노트 보기
document.getElementById('viewNotesBtn')?.addEventListener('click', () => {
  loadNotes();
  showScreen('notesListScreen');
});

// 오답노트 로드
async function loadNotes() {
  if (!currentUser) return;
  
  try {
    const q = query(
      collection(db, 'notes'),
      where('userId', '==', currentUser.uid),
      orderBy('timestamp', 'desc')
    );
    const querySnapshot = await getDocs(q);
    
    const notesList = document.getElementById('notesList');
    notesList.innerHTML = '';
    
    if (querySnapshot.empty) {
      notesList.innerHTML = '<p>저장된 오답노트가 없습니다.</p>';
      return;
    }
    
    querySnapshot.forEach((doc) => {
      const note = doc.data();
      const noteDiv = document.createElement('div');
      noteDiv.className = 'note-item';
      noteDiv.innerHTML = `
        <div class="note-header">
          <strong>${note.grade}학년 ${note.unit}단원 - ${['쉬움', '보통', '어려움'][note.difficulty - 1]}</strong>
          <span class="note-date">${new Date(note.timestamp.toDate()).toLocaleString('ko-KR')}</span>
        </div>
        <p>틀린 문제 ${note.problems.length}개</p>
      `;
      noteDiv.addEventListener('click', () => {
        showNoteDetail(doc.id, note);
      });
      notesList.appendChild(noteDiv);
    });
  } catch (error) {
    console.error('오답노트 로드 오류:', error);
  }
}

// 오답노트 상세 보기
function showNoteDetail(noteId, note) {
  const container = document.getElementById('noteDetailContent');
  container.innerHTML = '';
  
  note.problems.forEach((noteProblem, index) => {
    const problem = wrongProblems.find(p => p.id === noteProblem.problemId) || 
                   currentProblems.find(p => p.id === noteProblem.problemId);
    if (!problem) return;
    
    const noteDiv = document.createElement('div');
    noteDiv.className = 'question-card';
    noteDiv.innerHTML = `
      <div class="question-number">문제 ${index + 1}</div>
      <div class="question-text">${problem.question}</div>
      <div style="margin: 10px 0;">
        <span style="color: #FFDDDD;">내 답: ${problem.userAnswer}</span><br>
        <span style="color: #DDFFDD;">정답: ${problem.correctAnswer}</span>
      </div>
      <div style="margin: 10px 0;">
        <strong>오답 원인:</strong> ${noteProblem.reason || '미입력'}
      </div>
      ${noteProblem.drawing ? `<img src="${noteProblem.drawing}" style="max-width: 100%; border: 1px solid #E5DDFF; border-radius: 8px; margin-top: 10px;">` : ''}
    `;
    container.appendChild(noteDiv);
  });
  
  // 재도전 버튼에 데이터 저장
  document.getElementById('retryBtn').dataset.noteId = noteId;
  document.getElementById('retryBtn').dataset.grade = note.grade;
  document.getElementById('retryBtn').dataset.unit = note.unit;
  document.getElementById('retryBtn').dataset.difficulty = note.difficulty;
  
  showScreen('noteDetailScreen');
}

// 재도전
document.getElementById('retryBtn')?.addEventListener('click', function() {
  currentGrade = parseInt(this.dataset.grade);
  currentUnit = parseInt(this.dataset.unit);
  currentDifficulty = parseInt(this.dataset.difficulty);
  
  document.getElementById('gradeSelect').value = currentGrade;
  document.getElementById('unitSelect').value = currentUnit;
  document.querySelectorAll('.difficulty-btn').forEach((btn, idx) => {
    if (idx + 1 === currentDifficulty) {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }
  });
  
  startQuiz();
});

// 뒤로가기 버튼들
document.getElementById('backToSelectBtn')?.addEventListener('click', () => {
  showScreen('unitSelectScreen');
});

document.getElementById('backToSelectFromNotesBtn')?.addEventListener('click', () => {
  showScreen('unitSelectScreen');
});

document.getElementById('backToNotesListBtn')?.addEventListener('click', () => {
  showScreen('notesListScreen');
});

