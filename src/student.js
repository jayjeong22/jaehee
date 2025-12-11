import { onAuthStateChanged } from 'firebase/auth';
import { collection, addDoc, getDocs, getDoc, doc, query, where, orderBy } from 'firebase/firestore';
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
    alert('아직 문제가 업로드되지 않았습니다. 다른 항목을 선택해주세요.');
    showScreen('unitSelectScreen');
    return;
  }
  
  currentProblems = gradeProblems[currentUnit][difficultyKey] || [];
  
  if (currentProblems.length === 0) {
    alert('아직 문제가 업로드되지 않았습니다. 다른 항목을 선택해주세요.');
    showScreen('unitSelectScreen');
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
    
    // 문제 번호
    const questionNumber = document.createElement('div');
    questionNumber.className = 'question-number';
    questionNumber.textContent = `문제 ${index + 1}`;
    questionDiv.appendChild(questionNumber);
    
    // 이미지 표시 (있는 경우)
    if (problem.imageUrl) {
      const imageDiv = document.createElement('div');
      imageDiv.className = 'problem-image-container';
      imageDiv.style.marginBottom = '20px';
      imageDiv.style.textAlign = 'center';
      const img = document.createElement('img');
      img.src = problem.imageUrl;
      img.alt = '문제 이미지';
      img.style.maxWidth = '100%';
      img.style.height = 'auto';
      img.style.borderRadius = '8px';
      img.style.boxShadow = '0 2px 8px rgba(0,0,0,0.1)';
      img.onerror = function() {
        this.style.display = 'none';
        imageDiv.innerHTML = '<p style="color: #999;">이미지를 불러올 수 없습니다.</p>';
      };
      imageDiv.appendChild(img);
      questionDiv.appendChild(imageDiv);
    }
    
    // 문제 텍스트
    const questionText = document.createElement('div');
    questionText.className = 'question-text';
    questionText.textContent = problem.question;
    questionDiv.appendChild(questionText);
    
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
          <button type="button" class="btn btn-secondary" onclick="undoDrawing('${problem.id}')">돌아가기</button>
          <button type="button" class="btn btn-secondary" onclick="clearDrawingCanvas('${problem.id}')">전체 지우기</button>
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
    
    // 옵션 스타일 업데이트 (정답 표시하지 않음)
    const options = element.parentElement.querySelectorAll('.option');
    options.forEach((opt, idx) => {
      opt.classList.remove('selected', 'correct', 'incorrect');
      if (idx === parseInt(userAnswer)) {
        opt.classList.add('selected');
        // 정답 여부에 따라 스타일만 적용 (정답은 표시하지 않음)
        if (isCorrect) {
        opt.classList.add('correct');
        } else {
        opt.classList.add('incorrect');
        }
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
      ? '<span style="color: #2E7D32; font-weight: bold; font-size: 18px;">✓ 정답입니다!</span>'
      : '<span style="color: #C62828; font-weight: bold; font-size: 18px;">✗ 오답입니다.</span>';
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
      
      // 객관식 문제의 경우 선택한 보기 번호를 텍스트로 변환
      let userAnswerText = problem.userAnswer;
      if (problem.type === 'multiple' && typeof problem.userAnswer === 'number') {
        userAnswerText = problem.options[problem.userAnswer] || `보기 ${problem.userAnswer + 1}`;
      }
      
      let wrongDivContent = `<strong>문제 ${currentProblems.findIndex(p => p.id === problem.id) + 1}</strong><br>`;
      
      // 이미지 표시 (있는 경우)
      if (problem.imageUrl) {
        wrongDivContent += `
          <div style="margin: 10px 0; text-align: center;">
            <img src="${problem.imageUrl}" alt="문제 이미지" style="max-width: 100%; height: auto; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);" onerror="this.style.display='none';">
          </div>
        `;
      }
      
      wrongDivContent += `
        ${problem.question}<br>
        <div style="margin-top: 10px; padding: 10px; background: #FFF5F5; border-left: 3px solid #E57373; border-radius: 4px;">
          <span style="color: #C62828; font-weight: bold;">내 답: ${userAnswerText}</span>
        </div>
      `;
      
      wrongDiv.innerHTML = wrongDivContent;
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

// 오답노트 모드 상태 관리 (각 문제별로 'text' 또는 'drawing')
const noteModes = {};

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
    // 기본 모드는 직접 쓰기
    noteModes[problem.id] = 'text';
    
    const noteDiv = document.createElement('div');
    noteDiv.className = 'question-card';
    
    // 이미지 표시 (있는 경우)
    let imageHtml = '';
    if (problem.imageUrl) {
      imageHtml = `
        <div style="margin: 10px 0; text-align: center;">
          <img src="${problem.imageUrl}" alt="문제 이미지" style="max-width: 100%; height: auto; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);" onerror="this.style.display='none';">
        </div>
      `;
    }
    
    // 객관식 보기 표시 (있는 경우)
    let optionsHtml = '';
    if (problem.type === 'multiple' && problem.options && problem.options.length > 0) {
      optionsHtml = `
        <div style="margin: 15px 0; padding: 15px; background: #F5F5FF; border: 2px solid #E5DDFF; border-radius: 8px;">
          <div style="font-weight: bold; margin-bottom: 10px; color: #6B6B8A;">보기:</div>
          <div style="display: flex; flex-direction: column; gap: 8px;">
            ${problem.options.map((option, optIndex) => {
              const isCorrect = optIndex === problem.correct;
              const isUserAnswer = typeof problem.userAnswer === 'number' && optIndex === problem.userAnswer;
              let optionStyle = 'padding: 10px; border-radius: 6px; background: #FFFFFF; border: 2px solid #E5DDFF;';
              
              if (isCorrect && isUserAnswer) {
                // 정답이면서 내가 선택한 답
                optionStyle = 'padding: 10px; border-radius: 6px; background: #DDFFDD; border: 2px solid #4CAF50; font-weight: bold;';
              } else if (isCorrect) {
                // 정답 (내가 선택하지 않음)
                optionStyle = 'padding: 10px; border-radius: 6px; background: #E8F5E9; border: 2px solid #4CAF50;';
              } else if (isUserAnswer) {
                // 내가 선택한 오답
                optionStyle = 'padding: 10px; border-radius: 6px; background: #FFF5F5; border: 2px solid #E57373; font-weight: bold;';
              }
              
              return `
                <div style="${optionStyle}">
                  ${optIndex + 1}. ${option}
                  ${isCorrect ? ' <span style="color: #4CAF50;">✓ 정답</span>' : ''}
                  ${isUserAnswer && !isCorrect ? ' <span style="color: #C62828;">(내가 선택한 답)</span>' : ''}
                </div>
              `;
            }).join('')}
          </div>
        </div>
      `;
    }
    
    noteDiv.innerHTML = `
      <div class="question-number">틀린 문제 ${index + 1}</div>
      ${imageHtml}
      <div class="question-text">${problem.question}</div>
      ${optionsHtml}
      <div style="margin: 10px 0; padding: 10px; background: #FFF5F5; border-left: 3px solid #E57373; border-radius: 4px;">
        <span style="color: #C62828; font-weight: bold;">내 답: ${problem.type === 'multiple' && typeof problem.userAnswer === 'number' ? (problem.options[problem.userAnswer] || `보기 ${problem.userAnswer + 1}`) : problem.userAnswer}</span>
      </div>
      <div class="reason-selector">
        <label>오답 원인 선택:</label>
        <div>
          <span class="reason-option" data-reason="concept">개념 부족</span>
          <span class="reason-option" data-reason="understanding">문제 이해 못 함</span>
          <span class="reason-option" data-reason="calculation">계산 실수</span>
          <span class="reason-option" data-reason="careless">집중 부족</span>
        </div>
        <input type="text" class="custom-reason-input" placeholder="또는 직접 입력" id="custom-reason-${problem.id}">
      </div>
      <div style="margin-top: 20px;">
        <div style="display: flex; gap: 10px; margin-bottom: 15px;">
          <button class="btn btn-primary note-mode-btn" data-mode="text" data-problem-id="${problem.id}" style="flex: 1;">
            직접 쓰기
          </button>
          <button class="btn btn-secondary note-mode-btn" data-mode="drawing" data-problem-id="${problem.id}" style="flex: 1;">
            그리기
          </button>
        </div>
        <div id="note-content-${problem.id}">
          <!-- 직접 쓰기 모드 -->
          <textarea 
            id="note-text-${problem.id}" 
            class="note-text-input" 
            placeholder="오답 노트를 입력하세요..."
            rows="6"
            style="width: 100%; padding: 12px; border: 2px solid #E5DDFF; border-radius: 8px; font-size: 16px; font-family: 'HakgyoansimDunggeunmiso', 'Malgun Gothic', sans-serif; resize: vertical;"
          ></textarea>
          <!-- 그리기 모드 (숨김) -->
          <div id="note-drawing-${problem.id}" style="display: none;">
            <div class="canvas-toolbar" style="display: flex; gap: 10px; margin-bottom: 10px;">
              <button class="btn btn-secondary" onclick="clearNoteCanvas('${problem.id}')">전체 지우기</button>
              <button class="btn btn-secondary" onclick="undoNoteDrawing('${problem.id}')">돌아가기</button>
            </div>
            <canvas id="note-canvas-${problem.id}" width="800" height="400" style="width: 100%; height: auto; border: 2px solid #E5DDFF; border-radius: 8px; touch-action: none; user-select: none;"></canvas>
          </div>
        </div>
      </div>
    `;
    container.appendChild(noteDiv);
    
    // 모드 전환 버튼 이벤트
    noteDiv.querySelectorAll('.note-mode-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const mode = btn.dataset.mode;
        const problemId = problem.id;
        switchNoteMode(problemId, mode, noteDiv);
      });
    });
    
    // 직접 쓰기 모드 초기화 (기본 모드)
    const textInput = document.getElementById(`note-text-${problem.id}`);
    textInput.addEventListener('input', (e) => {
      updateNoteContent(problem.id, 'text', e.target.value);
    });
    
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

// 오답노트 모드 전환
function switchNoteMode(problemId, mode, noteDiv) {
  noteModes[problemId] = mode;
  
  const textBtn = noteDiv.querySelector(`.note-mode-btn[data-mode="text"]`);
  const drawingBtn = noteDiv.querySelector(`.note-mode-btn[data-mode="drawing"]`);
  const textArea = document.getElementById(`note-text-${problemId}`);
  const drawingDiv = document.getElementById(`note-drawing-${problemId}`);
  
  if (mode === 'text') {
    textBtn.classList.remove('btn-secondary');
    textBtn.classList.add('btn-primary');
    drawingBtn.classList.remove('btn-primary');
    drawingBtn.classList.add('btn-secondary');
    textArea.style.display = 'block';
    drawingDiv.style.display = 'none';
  } else {
    textBtn.classList.remove('btn-primary');
    textBtn.classList.add('btn-secondary');
    drawingBtn.classList.remove('btn-secondary');
    drawingBtn.classList.add('btn-primary');
    textArea.style.display = 'none';
    drawingDiv.style.display = 'block';
    
    // 그리기 모드로 전환 시 캔버스 초기화 (DOM 렌더링 후)
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        if (!noteCanvases[problemId]) {
          initNoteCanvas(problemId);
        }
      });
    });
  }
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
  
  // 펜 설정: 1px 두께의 검은색 펜
  ctx.strokeStyle = '#000000';
  ctx.fillStyle = '#000000';
  ctx.lineWidth = 1;
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
    ctx.arc(lastX, lastY, 0.5, 0, Math.PI * 2);
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
  
  // 각 획이 끝날 때마다 캔버스 상태를 저장하는 히스토리 배열
  const drawingHistory = [];
  
  // 초기 상태 저장 (빈 캔버스)
  drawingHistory.push(ctx.getImageData(0, 0, canvas.width, canvas.height));
  
  function stopDrawing(e) {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    
    if (isDrawing) {
    isDrawing = false;
      // 현재 캔버스 상태를 히스토리에 저장
      drawingHistory.push(ctx.getImageData(0, 0, canvas.width, canvas.height));
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
    isDrawing: false,
    history: drawingHistory
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

// 서술형 문제 한 획 되돌리기
window.undoDrawing = function(problemId) {
  const canvasData = drawingCanvases[problemId];
  if (!canvasData || !canvasData.canvas || !canvasData.ctx || !canvasData.history) {
    return;
  }
  
  const history = canvasData.history;
  
  // 히스토리에 최소 2개 이상 있어야 되돌릴 수 있음 (초기 상태 + 최소 1개 획)
  if (history.length <= 1) {
    return; // 되돌릴 획이 없음
  }
  
  // 마지막 획 제거
  history.pop();
  
  // 이전 상태로 복원
  const previousState = history[history.length - 1];
  canvasData.ctx.putImageData(previousState, 0, 0);
  
  // 답안 업데이트
  saveDrawingAnswer(problemId);
}

// 서술형 문제 캔버스 지우기
window.clearDrawingCanvas = function(problemId) {
  const canvasData = drawingCanvases[problemId];
  if (canvasData && canvasData.canvas && canvasData.ctx) {
    const ctx = canvasData.ctx;
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, canvasData.canvas.width, canvasData.canvas.height);
    
    // 히스토리 초기화 (초기 상태만 남김)
    if (canvasData.history) {
      canvasData.history = [];
      canvasData.history.push(ctx.getImageData(0, 0, canvasData.canvas.width, canvasData.canvas.height));
    }
    
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

// 오답노트용 캔버스 초기화
const noteCanvases = {};
const noteDrawingHistory = {};

function initNoteCanvas(problemId) {
  const canvas = document.getElementById(`note-canvas-${problemId}`);
  if (!canvas) {
    console.error(`Canvas not found: note-canvas-${problemId}`);
    return;
  }
  
  // 이미 초기화된 경우 스킵
  if (noteCanvases[problemId]) {
    return;
  }
  
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    console.error('Could not get 2d context');
    return;
  }
  
  // 펜 설정: 1px 두께의 검은색 펜
  ctx.strokeStyle = '#000000';
  ctx.fillStyle = '#000000';
  ctx.lineWidth = 1;
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
    ctx.arc(lastX, lastY, 0.5, 0, Math.PI * 2);
    ctx.fill();
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
  
  // 각 획이 끝날 때마다 캔버스 상태를 저장하는 히스토리 배열
  if (!noteDrawingHistory[problemId]) {
    noteDrawingHistory[problemId] = [];
    // 초기 상태 저장 (빈 캔버스)
    noteDrawingHistory[problemId].push(ctx.getImageData(0, 0, canvas.width, canvas.height));
  }
  
  function stopDrawing(e) {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    
    if (isDrawing) {
    isDrawing = false;
      // 현재 캔버스 상태를 히스토리에 저장
      noteDrawingHistory[problemId].push(ctx.getImageData(0, 0, canvas.width, canvas.height));
      // 최대 50개까지만 저장 (메모리 관리)
      if (noteDrawingHistory[problemId].length > 50) {
        noteDrawingHistory[problemId].shift();
      }
      // 내용 저장
      saveNoteContent(problemId);
    }
  }
  
  // 마우스 이벤트
  canvas.addEventListener('mousedown', startDrawing);
  canvas.addEventListener('mousemove', draw);
  canvas.addEventListener('mouseup', stopDrawing);
  canvas.addEventListener('mouseleave', stopDrawing);
  
  // 터치 이벤트
  canvas.addEventListener('touchstart', startDrawing, { passive: false });
  canvas.addEventListener('touchmove', draw, { passive: false });
  canvas.addEventListener('touchend', stopDrawing, { passive: false });
  canvas.addEventListener('touchcancel', stopDrawing, { passive: false });
  
  // 포인터 이벤트 (터치 패드 지원)
  canvas.addEventListener('pointerdown', startDrawing);
  canvas.addEventListener('pointermove', draw);
  canvas.addEventListener('pointerup', stopDrawing);
  canvas.addEventListener('pointerleave', stopDrawing);
  canvas.addEventListener('pointercancel', stopDrawing);
  
  noteCanvases[problemId] = { canvas, ctx };
}

// 오답노트 캔버스 지우기
window.clearNoteCanvas = function(problemId) {
  const canvasData = noteCanvases[problemId];
  if (!canvasData) return;
  
  const { canvas, ctx } = canvasData;
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = '#000000';
  
  // 히스토리 초기화
  noteDrawingHistory[problemId] = [];
  noteDrawingHistory[problemId].push(ctx.getImageData(0, 0, canvas.width, canvas.height));
  
  saveNoteContent(problemId);
};

// 오답노트 그리기 되돌리기
window.undoNoteDrawing = function(problemId) {
  const canvasData = noteCanvases[problemId];
  if (!canvasData) return;
  
  const { canvas, ctx } = canvasData;
  const history = noteDrawingHistory[problemId];
  
  if (history && history.length > 1) {
    // 마지막 상태 제거
    history.pop();
    // 이전 상태로 복원
    const previousState = history[history.length - 1];
    ctx.putImageData(previousState, 0, 0);
    saveNoteContent(problemId);
  }
};

// 오답 원인 업데이트
function updateNoteReason(problemId, reason) {
  let noteItem = currentNoteData.problems.find(p => p.problemId === problemId);
  if (!noteItem) {
    noteItem = { problemId, reason: '', mode: 'text', content: '' };
    currentNoteData.problems.push(noteItem);
  }
  noteItem.reason = reason;
}

// 오답노트 내용 업데이트 (직접 쓰기 모드)
function updateNoteContent(problemId, mode, content) {
  let noteItem = currentNoteData.problems.find(p => p.problemId === problemId);
  if (!noteItem) {
    noteItem = { problemId, reason: '', mode: mode, content: '' };
    currentNoteData.problems.push(noteItem);
  }
  noteItem.mode = mode;
  if (mode === 'text') {
    noteItem.content = content;
    noteItem.drawing = null;
  }
}

// 오답노트 그리기 내용 저장
function saveNoteContent(problemId) {
  const canvasData = noteCanvases[problemId];
  if (!canvasData) return;
  
  const { canvas } = canvasData;
  const imageData = canvas.toDataURL('image/png');
  
  let noteItem = currentNoteData.problems.find(p => p.problemId === problemId);
  if (!noteItem) {
    noteItem = { problemId, reason: '', mode: 'drawing', content: '' };
    currentNoteData.problems.push(noteItem);
  }
  noteItem.mode = 'drawing';
  noteItem.drawing = imageData;
  noteItem.content = null;
}

// 오답노트 저장
document.getElementById('saveNoteBtn')?.addEventListener('click', async () => {
  if (!currentUser) return;
  
  // 모든 문제의 내용 저장
  const autoGradedWrongProblems = wrongProblems.filter(p => p.type !== 'drawing');
  autoGradedWrongProblems.forEach(problem => {
    const mode = noteModes[problem.id] || 'text';
    
    if (mode === 'drawing') {
      // 그리기 모드: 캔버스 이미지 저장
      saveNoteContent(problem.id);
    } else {
      // 직접 쓰기 모드: 텍스트 저장
      const textInput = document.getElementById(`note-text-${problem.id}`);
      if (textInput) {
        updateNoteContent(problem.id, 'text', textInput.value);
      }
    }
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
  if (!currentUser) {
    console.error('currentUser가 없습니다.');
    return;
  }
  
  const notesList = document.getElementById('notesList');
  if (!notesList) {
    console.error('notesList 요소를 찾을 수 없습니다.');
    return;
  }
  
  notesList.innerHTML = '<p>오답노트를 불러오는 중...</p>';
  
  try {
    // where와 orderBy를 함께 사용할 때 인덱스 문제를 피하기 위해
    // 먼저 userId로 필터링한 후 클라이언트 측에서 정렬
    const q = query(
      collection(db, 'notes'),
      where('userId', '==', currentUser.uid)
    );
    const querySnapshot = await getDocs(q);
    
    notesList.innerHTML = '';
    
    if (querySnapshot.empty) {
      notesList.innerHTML = '<p>저장된 오답노트가 없습니다.</p>';
      return;
    }
    
    // 결과를 배열로 변환하고 클라이언트 측에서 정렬
    const notes = [];
    querySnapshot.forEach((doc) => {
      const note = doc.data();
      notes.push({
        id: doc.id,
        ...note,
        timestampValue: note.timestamp?.toDate ? note.timestamp.toDate().getTime() : 0
      });
    });
    
    // 타임스탬프 기준으로 내림차순 정렬
    notes.sort((a, b) => b.timestampValue - a.timestampValue);
    
    // 정렬된 노트들을 표시
    notes.forEach((note) => {
      const noteDiv = document.createElement('div');
      noteDiv.className = 'note-item';
      noteDiv.innerHTML = `
        <div class="note-header">
          <strong>${note.grade}학년 ${note.unit}단원 - ${['쉬움', '보통', '어려움'][note.difficulty - 1]}</strong>
          <span class="note-date">${note.timestamp?.toDate ? new Date(note.timestamp.toDate()).toLocaleString('ko-KR') : '날짜 없음'}</span>
        </div>
        <p>틀린 문제 ${note.problems?.length || 0}개</p>
      `;
      noteDiv.addEventListener('click', () => {
        showNoteDetail(note.id, note);
      });
      notesList.appendChild(noteDiv);
    });
  } catch (error) {
    console.error('오답노트 로드 오류:', error);
    console.error('오류 상세:', error.message);
    console.error('currentUser.uid:', currentUser?.uid);
    notesList.innerHTML = `<p style="color: red;">오답노트를 불러오는 중 오류가 발생했습니다: ${error.message}</p>`;
  }
}

// 오답 원인을 한글로 변환
function getReasonInKorean(reason) {
  if (!reason) return '미입력';
  
  const reasonMap = {
    'concept': '개념 부족',
    'understanding': '문제 이해 못 함',
    'calculation': '계산 실수',
    'careless': '집중 부족'
  };
  
  // 이미 한글이거나 매핑에 없는 경우 그대로 반환
  return reasonMap[reason] || reason;
}

// 오답노트 내용 HTML 생성 함수
function getNoteContentHtml(noteProblem) {
  if (noteProblem.mode === 'drawing' && noteProblem.drawing) {
    return `
      <div style="margin-top: 15px;">
        <strong>오답노트 (그리기):</strong>
        <img src="${noteProblem.drawing}" style="max-width: 100%; border: 2px solid #E5DDFF; border-radius: 8px; margin-top: 10px; display: block;">
      </div>
    `;
  } else if (noteProblem.mode === 'text' && noteProblem.content) {
    return `
      <div style="margin-top: 15px;">
        <strong>오답노트 (직접 쓰기):</strong>
        <div style="margin-top: 10px; padding: 12px; background: #F5F5FF; border: 2px solid #E5DDFF; border-radius: 8px; white-space: pre-wrap; font-size: 16px; line-height: 1.6;">
          ${noteProblem.content}
        </div>
      </div>
    `;
  } else if (noteProblem.drawing) {
    // 기존 데이터 호환성 (mode가 없는 경우)
    return `
      <div style="margin-top: 15px;">
        <strong>오답노트:</strong>
        <img src="${noteProblem.drawing}" style="max-width: 100%; border: 2px solid #E5DDFF; border-radius: 8px; margin-top: 10px; display: block;">
      </div>
    `;
  }
  return '';
}

// 오답노트 상세 보기
async function showNoteDetail(noteId, note) {
  const container = document.getElementById('noteDetailContent');
  container.innerHTML = '<p>오답노트를 불러오는 중...</p>';
  
  // 문제 정보를 저장할 맵
  const problemMap = new Map();
  // 사용자 답안 정보를 저장할 맵 (결과 데이터에서 가져올 수 있음)
  const userAnswerMap = new Map();
  
  // 결과 데이터에서 사용자 답안 정보 가져오기
  try {
    const resultsQuery = query(
      collection(db, 'results'),
      where('userId', '==', currentUser.uid),
      where('grade', '==', note.grade),
      where('unit', '==', note.unit),
      where('difficulty', '==', note.difficulty)
    );
    const resultsSnapshot = await getDocs(resultsQuery);
    
    resultsSnapshot.forEach((doc) => {
      const result = doc.data();
      if (result.answers) {
        Object.entries(result.answers).forEach(([problemId, answer]) => {
          if (!userAnswerMap.has(problemId)) {
            userAnswerMap.set(problemId, answer);
          }
        });
      }
    });
  } catch (error) {
    console.error('결과 데이터 로드 오류:', error);
  }
  
  // Firestore에서 문제 정보 가져오기
  try {
    for (const noteProblem of note.problems) {
      if (noteProblem.problemId && !problemMap.has(noteProblem.problemId)) {
        try {
          const problemDoc = await getDoc(doc(db, 'problems', noteProblem.problemId));
          if (problemDoc.exists()) {
            const problemData = { id: problemDoc.id, ...problemDoc.data() };
            // 사용자 답안 정보 추가
            if (userAnswerMap.has(noteProblem.problemId)) {
              problemData.userAnswer = userAnswerMap.get(noteProblem.problemId);
            }
            problemMap.set(noteProblem.problemId, problemData);
          }
        } catch (error) {
          console.error(`문제 ${noteProblem.problemId} 로드 실패:`, error);
        }
      }
    }
  } catch (error) {
    console.error('문제 정보 로드 오류:', error);
  }
  
  // 로컬 문제도 확인 (Firestore에 없는 경우)
  for (const noteProblem of note.problems) {
    if (noteProblem.problemId && !problemMap.has(noteProblem.problemId)) {
      // wrongProblems나 currentProblems에서 찾기
      const localProblem = wrongProblems.find(p => p.id === noteProblem.problemId) || 
                          currentProblems.find(p => p.id === noteProblem.problemId);
      if (localProblem) {
        // 사용자 답안 정보 추가
        if (userAnswerMap.has(noteProblem.problemId)) {
          localProblem.userAnswer = userAnswerMap.get(noteProblem.problemId);
        }
        problemMap.set(noteProblem.problemId, localProblem);
      }
    }
  }
  
  container.innerHTML = '';
  
  note.problems.forEach((noteProblem, index) => {
    const problem = problemMap.get(noteProblem.problemId);
    if (!problem) {
      // 문제 정보를 찾을 수 없는 경우에도 오답노트 내용은 표시
      const noteDiv = document.createElement('div');
      noteDiv.className = 'question-card';
      noteDiv.innerHTML = `
        <div class="question-number">문제 ${index + 1}</div>
        <div class="question-text">문제 정보를 불러올 수 없습니다. (문제 ID: ${noteProblem.problemId})</div>
        <div style="margin: 10px 0;">
          <strong>오답 원인:</strong> ${getReasonInKorean(noteProblem.reason)}
        </div>
        ${getNoteContentHtml(noteProblem)}
      `;
      container.appendChild(noteDiv);
      return;
    }
    
    // 이미지 표시 (있는 경우)
    let imageHtml = '';
    if (problem.imageUrl) {
      imageHtml = `
        <div style="margin: 10px 0; text-align: center;">
          <img src="${problem.imageUrl}" alt="문제 이미지" style="max-width: 100%; height: auto; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);" onerror="this.style.display='none';">
        </div>
      `;
    }
    
    // 객관식 보기 표시 (있는 경우)
    let optionsHtml = '';
    if (problem.type === 'multiple' && problem.options && problem.options.length > 0) {
      optionsHtml = `
        <div style="margin: 15px 0; padding: 15px; background: #F5F5FF; border: 2px solid #E5DDFF; border-radius: 8px;">
          <div style="font-weight: bold; margin-bottom: 10px; color: #6B6B8A;">보기:</div>
          <div style="display: flex; flex-direction: column; gap: 8px;">
            ${problem.options.map((option, optIndex) => {
              const isCorrect = optIndex === problem.correct;
              const isUserAnswer = typeof problem.userAnswer === 'number' && optIndex === problem.userAnswer;
              let optionStyle = 'padding: 10px; border-radius: 6px; background: #FFFFFF; border: 2px solid #E5DDFF;';
              
              if (isCorrect && isUserAnswer) {
                // 정답이면서 내가 선택한 답
                optionStyle = 'padding: 10px; border-radius: 6px; background: #DDFFDD; border: 2px solid #4CAF50; font-weight: bold;';
              } else if (isCorrect) {
                // 정답 (내가 선택하지 않음)
                optionStyle = 'padding: 10px; border-radius: 6px; background: #E8F5E9; border: 2px solid #4CAF50;';
              } else if (isUserAnswer) {
                // 내가 선택한 오답
                optionStyle = 'padding: 10px; border-radius: 6px; background: #FFF5F5; border: 2px solid #E57373; font-weight: bold;';
              }
              
              return `
                <div style="${optionStyle}">
                  ${optIndex + 1}. ${option}
                  ${isCorrect ? ' <span style="color: #4CAF50;">✓ 정답</span>' : ''}
                  ${isUserAnswer && !isCorrect ? ' <span style="color: #C62828;">(내가 선택한 답)</span>' : ''}
                </div>
              `;
            }).join('')}
          </div>
        </div>
      `;
    }
    
    // 사용자 답안 텍스트 변환
    let userAnswerText = problem.userAnswer;
    if (problem.type === 'multiple' && typeof problem.userAnswer === 'number') {
      userAnswerText = problem.options[problem.userAnswer] || `보기 ${problem.userAnswer + 1}`;
    }
    
    // 오답노트 내용 표시
    const noteContentHtml = getNoteContentHtml(noteProblem);
    
    const noteDiv = document.createElement('div');
    noteDiv.className = 'question-card';
    noteDiv.innerHTML = `
      <div class="question-number">문제 ${index + 1}</div>
      ${imageHtml}
      <div class="question-text">${problem.question}</div>
      ${optionsHtml}
      <div style="margin: 10px 0;">
        <div style="margin-top: 10px; padding: 10px; background: #FFF5F5; border-left: 3px solid #E57373; border-radius: 4px;">
          <span style="color: #C62828; font-weight: bold;">내 답: ${userAnswerText}</span>
        </div>
      </div>
      <div style="margin: 10px 0;">
        <strong>오답 원인:</strong> ${getReasonInKorean(noteProblem.reason) || '미입력'}
      </div>
      ${noteContentHtml}
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

