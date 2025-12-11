import { onAuthStateChanged } from 'firebase/auth';
import { collection, getDocs, query, orderBy, deleteDoc, doc } from 'firebase/firestore';
import { auth, db } from './firebaseConfig.js';
import { problems } from './data/problems.js';
import { isAdmin } from './adminConfig.js';

let currentUser = null;
let allResults = [];
let allNotes = [];
let selectedStudent = null;
let wrongRateChart = null;
let problemTypeMap = {}; // 문제 ID -> 문제 유형 매핑

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
    loadAllData();
  } else {
    window.location.href = '/';
  }
});

// 화면 전환
function showScreen(screenId) {
  document.querySelectorAll('.screen').forEach(screen => {
    screen.classList.remove('active');
  });
  document.getElementById(screenId).classList.add('active');
}

// 모든 데이터 로드
async function loadAllData() {
  try {
    // 문제 데이터 로드 (문제 유형 매핑용)
    const problemsQuery = query(collection(db, 'problems'));
    const problemsSnapshot = await getDocs(problemsQuery);
    problemTypeMap = {};
    problemsSnapshot.forEach((doc) => {
      const problem = { id: doc.id, ...doc.data() };
      problemTypeMap[problem.id] = problem.type || 'unknown';
    });

    // 결과 데이터 로드
    const resultsQuery = query(collection(db, 'results'), orderBy('timestamp', 'desc'));
    const resultsSnapshot = await getDocs(resultsQuery);
    allResults = [];
    resultsSnapshot.forEach((doc) => {
      allResults.push({ id: doc.id, ...doc.data() });
    });

    // 오답노트 데이터 로드
    const notesQuery = query(collection(db, 'notes'), orderBy('timestamp', 'desc'));
    const notesSnapshot = await getDocs(notesQuery);
    allNotes = [];
    notesSnapshot.forEach((doc) => {
      allNotes.push({ id: doc.id, ...doc.data() });
    });

    renderOverview();
  } catch (error) {
    console.error('데이터 로드 오류:', error);
  }
}

// 전체 현황 렌더링
function renderOverview() {
  const container = document.getElementById('studentsContainer');
  container.innerHTML = '';

  const filterGrade = document.getElementById('filterGrade').value;
  const filterUnit = document.getElementById('filterUnit').value;

  // 학생별 데이터 집계
  const studentMap = new Map();

  allResults.forEach(result => {
    if (filterGrade && result.grade !== parseInt(filterGrade)) return;
    if (filterUnit && result.unit !== parseInt(filterUnit)) return;

    const key = result.userId;
    if (!studentMap.has(key)) {
      studentMap.set(key, {
        userId: result.userId,
        userName: result.userName,
        results: [],
        totalScore: 0,
        totalTests: 0,
        totalWrong: 0
      });
    }

    const student = studentMap.get(key);
    student.results.push(result);
    student.totalScore += result.score;
    student.totalTests++;
    student.totalWrong += result.wrongCount;
  });

  // 학생 카드 생성
  studentMap.forEach((student, userId) => {
    const avgScore = student.totalTests > 0 
      ? Math.round(student.totalScore / student.totalTests) 
      : 0;

    const card = document.createElement('div');
    card.className = 'student-card';
    card.innerHTML = `
      <div class="student-name">${student.userName}</div>
      <div class="student-stats">
        테스트: ${student.totalTests}회<br>
        평균 점수: ${avgScore}점<br>
        총 오답: ${student.totalWrong}개
      </div>
      <span class="score-badge ${getScoreClass(avgScore)}">${avgScore}점</span>
    `;
    card.addEventListener('click', () => {
      showStudentDetail(userId, student);
    });
    container.appendChild(card);
  });

  if (studentMap.size === 0) {
    container.innerHTML = '<p>데이터가 없습니다.</p>';
  }
}

// 점수에 따른 클래스 반환
function getScoreClass(score) {
  if (score >= 80) return 'score-high';
  if (score >= 60) return 'score-medium';
  return 'score-low';
}

// 필터 변경 이벤트
document.getElementById('filterGrade')?.addEventListener('change', renderOverview);
document.getElementById('filterUnit')?.addEventListener('change', renderOverview);

// 학생 상세 화면
function showStudentDetail(userId, studentData) {
  selectedStudent = { userId, ...studentData };
  
  document.getElementById('studentDetailTitle').textContent = `${studentData.userName} 학생 상세 정보`;
  
  // 통계 업데이트
  const avgScore = studentData.totalTests > 0 
    ? Math.round(studentData.totalScore / studentData.totalTests) 
    : 0;
  
  document.getElementById('totalTests').textContent = studentData.totalTests;
  document.getElementById('avgScore').textContent = `${avgScore}점`;
  document.getElementById('totalWrong').textContent = studentData.totalWrong;

  // 문제별 오답률 차트
  renderWrongRateChart(studentData.results);

  // 오답 유형 통계
  renderReasonStats(userId);

  // 오답노트 목록
  renderStudentNotes(userId);

  // 결과 테이블
  renderResultsTable(studentData.results);

  showScreen('studentDetailScreen');
}

// 문제별 오답률 차트
function renderWrongRateChart(results) {
  const ctx = document.getElementById('wrongRateChart');
  
  // 문제 유형별 오답 횟수 집계
  const typeWrongCount = new Map();

  results.forEach(result => {
    if (result.wrongProblems && Array.isArray(result.wrongProblems)) {
      result.wrongProblems.forEach(problemId => {
        // 문제 유형 확인
        const problemType = problemTypeMap[problemId] || 'unknown';
        let typeLabel = '알 수 없음';
        
        if (problemType === 'multiple') {
          typeLabel = '객관식';
        } else if (problemType === 'short') {
          typeLabel = '주관식';
        } else if (problemType === 'drawing') {
          typeLabel = '서술형';
        }
        
        typeWrongCount.set(typeLabel, (typeWrongCount.get(typeLabel) || 0) + 1);
      });
    }
  });

  const types = Array.from(typeWrongCount.keys());
  const wrongCounts = types.map(type => typeWrongCount.get(type));

  if (wrongRateChart) {
    wrongRateChart.destroy();
  }

  if (types.length === 0) {
    ctx.parentElement.innerHTML = '<p>오답 데이터가 없습니다.</p>';
    return;
  }

  wrongRateChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: types,
      datasets: [{
        label: '오답 횟수',
        data: wrongCounts,
        backgroundColor: [
          'rgba(255, 221, 221, 0.5)',
          'rgba(221, 255, 221, 0.5)',
          'rgba(221, 221, 255, 0.5)'
        ],
        borderColor: [
          'rgba(255, 221, 221, 0.8)',
          'rgba(221, 255, 221, 0.8)',
          'rgba(221, 221, 255, 0.8)'
        ],
        borderWidth: 1
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            stepSize: 1
          }
        }
      },
      plugins: {
        legend: {
          display: false
        }
      }
    }
  });
}

// 오답 원인을 한글로 변환
function getReasonInKorean(reason) {
  const reasonMap = {
    'concept': '개념 부족',
    'understanding': '문제 이해 못 함',
    'calculation': '계산 실수',
    'careless': '집중 부족'
  };
  
  // 이미 한글이거나 매핑에 없는 경우 그대로 반환
  return reasonMap[reason] || reason;
}

// 오답 유형 통계
function renderReasonStats(userId) {
  const container = document.getElementById('reasonStats');
  container.innerHTML = '';

  const reasonCount = new Map();
  let total = 0;

  // 해당 학생의 오답노트에서 오답 원인 수집
  allNotes.forEach(note => {
    if (note.userId === userId && note.problems) {
      note.problems.forEach(problem => {
        if (problem.reason) {
          const reason = problem.reason;
          const koreanReason = getReasonInKorean(reason);
          reasonCount.set(koreanReason, (reasonCount.get(koreanReason) || 0) + 1);
          total++;
        }
      });
    }
  });

  if (total === 0) {
    container.innerHTML = '<p>오답 유형 데이터가 없습니다.</p>';
    return;
  }

  // 통계 표시
  reasonCount.forEach((count, reason) => {
    const percentage = Math.round((count / total) * 100);
    const item = document.createElement('div');
    item.className = 'reason-item';
    item.innerHTML = `
      <span>${reason}</span>
      <span><strong>${count}회 (${percentage}%)</strong></span>
    `;
    container.appendChild(item);
  });
}

// 학생 오답노트 목록
function renderStudentNotes(userId) {
  const container = document.getElementById('studentNotesList');
  container.innerHTML = '';

  const studentNotes = allNotes.filter(note => note.userId === userId);

  if (studentNotes.length === 0) {
    container.innerHTML = '<p>저장된 오답노트가 없습니다.</p>';
    return;
  }

  studentNotes.forEach((note, noteIndex) => {
    const noteDiv = document.createElement('div');
    noteDiv.className = 'note-item';
    
    const noteId = `note-${note.id || noteIndex}`;
    const contentId = `note-content-${note.id || noteIndex}`;
    const toggleBtnId = `note-toggle-${note.id || noteIndex}`;
    
    // 각 문제별 오답노트 내용 생성
    const problemsHtml = note.problems.map((p, idx) => {
      const reasonText = p.reason ? getReasonInKorean(p.reason) : '원인 미입력';
      
      let noteContentHtml = '';
      
      // 오답노트 내용 표시 (텍스트 또는 그리기)
      if (p.mode === 'text' && p.content) {
        // 직접 쓰기 모드
        noteContentHtml = `
          <div style="margin-top: 10px; padding: 12px; background: #F5F5FF; border: 2px solid #E5DDFF; border-radius: 8px;">
            <div style="font-weight: bold; margin-bottom: 8px; color: #6B6B8A;">오답노트 (직접 쓰기):</div>
            <div style="white-space: pre-wrap; font-size: 14px; line-height: 1.6; color: #333;">${p.content}</div>
          </div>
        `;
      } else if (p.mode === 'drawing' && p.drawing) {
        // 그리기 모드
        noteContentHtml = `
          <div style="margin-top: 10px;">
            <div style="font-weight: bold; margin-bottom: 8px; color: #6B6B8A;">오답노트 (그리기):</div>
            <img src="${p.drawing}" style="max-width: 100%; border: 2px solid #E5DDFF; border-radius: 8px; display: block;">
          </div>
        `;
      } else if (p.drawing) {
        // 기존 데이터 호환성 (mode가 없는 경우)
        noteContentHtml = `
          <div style="margin-top: 10px;">
            <div style="font-weight: bold; margin-bottom: 8px; color: #6B6B8A;">오답노트:</div>
            <img src="${p.drawing}" style="max-width: 100%; border: 2px solid #E5DDFF; border-radius: 8px; display: block;">
          </div>
        `;
      }
      
      return `
        <div style="margin: 10px 0; padding: 15px; background: #FFFFFF; border: 2px solid #E5DDFF; border-radius: 8px;">
          <div style="font-weight: bold; margin-bottom: 8px; color: #6B6B8A;">문제 ${idx + 1}</div>
          <div style="margin-bottom: 8px;">
            <span style="font-weight: bold;">오답 원인:</span> 
            <span style="color: #C62828;">${reasonText}</span>
          </div>
          ${noteContentHtml}
        </div>
      `;
    }).join('');
    
    const deleteBtnId = `note-delete-${note.id || noteIndex}`;
    
    noteDiv.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
        <div style="flex: 1;">
          <strong>${note.grade}학년 ${note.unit}단원 - ${['쉬움', '보통', '어려움'][note.difficulty - 1]}</strong>
          <span style="color: #8B8BAA; font-size: 14px; margin-left: 10px;">
            ${new Date(note.timestamp.toDate()).toLocaleString('ko-KR')}
          </span>
        </div>
        <div style="display: flex; gap: 10px;">
          <button id="${toggleBtnId}" class="btn btn-secondary" style="padding: 8px 16px; font-size: 14px;">
            펼치기
          </button>
          <button id="${deleteBtnId}" class="btn btn-danger" style="padding: 8px 16px; font-size: 14px;">
            삭제
          </button>
        </div>
      </div>
      <p style="margin-bottom: 10px;">틀린 문제 ${note.problems.length}개</p>
      <div id="${contentId}" style="margin-top: 15px; display: none;">
        ${problemsHtml}
      </div>
    `;
    container.appendChild(noteDiv);
    
    // 접기/펼치기 버튼 이벤트
    const toggleBtn = document.getElementById(toggleBtnId);
    const contentDiv = document.getElementById(contentId);
    
    toggleBtn.addEventListener('click', () => {
      if (contentDiv.style.display === 'none') {
        contentDiv.style.display = 'block';
        toggleBtn.textContent = '접기';
      } else {
        contentDiv.style.display = 'none';
        toggleBtn.textContent = '펼치기';
      }
    });
    
    // 삭제 버튼 이벤트
    const deleteBtn = document.getElementById(deleteBtnId);
    deleteBtn.addEventListener('click', async (e) => {
      e.stopPropagation(); // 이벤트 전파 방지
      
      if (!confirm('이 오답노트를 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.')) {
        return;
      }
      
      try {
        await deleteDoc(doc(db, 'notes', note.id));
        
        // 데이터 다시 로드
        await loadAllData();
        
        // 현재 선택된 학생이 있으면 상세 화면 다시 렌더링
        if (selectedStudent) {
          const studentData = {
            userName: selectedStudent.userName,
            results: allResults.filter(r => r.userId === selectedStudent.userId),
            totalScore: 0,
            totalTests: 0,
            totalWrong: 0
          };
          
          // 통계 재계산
          studentData.results.forEach(result => {
            studentData.totalScore += result.score;
            studentData.totalTests++;
            studentData.totalWrong += result.wrongCount || 0;
          });
          
          showStudentDetail(selectedStudent.userId, studentData);
        }
        
        alert('오답노트가 삭제되었습니다.');
      } catch (error) {
        console.error('오답노트 삭제 오류:', error);
        alert('오답노트 삭제에 실패했습니다: ' + error.message);
      }
    });
  });
}

// 결과 테이블
function renderResultsTable(results) {
  const container = document.getElementById('resultsTable');
  
  let tableHTML = `
    <table>
      <thead>
        <tr>
          <th>날짜</th>
          <th>학년</th>
          <th>단원</th>
          <th>난이도</th>
          <th>전체 문제</th>
          <th>정답</th>
          <th>오답</th>
          <th>점수</th>
          <th>삭제</th>
        </tr>
      </thead>
      <tbody>
  `;

  results.forEach(result => {
    const date = new Date(result.timestamp.toDate()).toLocaleString('ko-KR');
    tableHTML += `
      <tr>
        <td>${date}</td>
        <td>${result.grade}학년</td>
        <td>${result.unit}단원</td>
        <td>${['쉬움', '보통', '어려움'][result.difficulty - 1]}</td>
        <td>${result.totalProblems}</td>
        <td>${result.correctCount}</td>
        <td>${result.wrongCount}</td>
        <td>${result.score}점</td>
        <td>
          <button class="btn btn-danger" onclick="deleteResult('${result.id}')" style="padding: 5px 10px; font-size: 12px;">삭제</button>
        </td>
      </tr>
    `;
  });

  tableHTML += `
      </tbody>
    </table>
  `;

  container.innerHTML = tableHTML;
}

// 결과 삭제 함수
window.deleteResult = async function(resultId) {
  if (!confirm('이 결과를 삭제하시겠습니까? 관련된 오답노트도 함께 삭제됩니다. 이 작업은 되돌릴 수 없습니다.')) {
    return;
  }

  try {
    // 삭제할 결과 정보 가져오기
    const resultToDelete = allResults.find(r => r.id === resultId);
    if (!resultToDelete) {
      alert('삭제할 결과를 찾을 수 없습니다.');
      return;
    }

    // 결과 삭제
    await deleteDoc(doc(db, 'results', resultId));
    
    // 관련된 오답노트 찾기 및 삭제
    // 같은 userId, grade, unit, difficulty를 가진 오답노트 중에서
    // timestamp가 비슷한(같은 날짜 또는 1시간 이내) 오답노트를 찾아 삭제
    const resultTimestamp = resultToDelete.timestamp?.toDate ? resultToDelete.timestamp.toDate() : new Date(resultToDelete.timestamp);
    const resultTime = resultTimestamp.getTime();
    
    const relatedNotes = allNotes.filter(note => {
      if (note.userId !== resultToDelete.userId) return false;
      if (note.grade !== resultToDelete.grade) return false;
      if (note.unit !== resultToDelete.unit) return false;
      if (note.difficulty !== resultToDelete.difficulty) return false;
      
      // timestamp 비교 (같은 날짜이거나 1시간 이내)
      const noteTimestamp = note.timestamp?.toDate ? note.timestamp.toDate() : new Date(note.timestamp);
      const noteTime = noteTimestamp.getTime();
      const timeDiff = Math.abs(resultTime - noteTime);
      
      // 같은 날짜이거나 1시간(3600000ms) 이내 차이
      return timeDiff < 3600000 || 
             (resultTimestamp.getDate() === noteTimestamp.getDate() &&
              resultTimestamp.getMonth() === noteTimestamp.getMonth() &&
              resultTimestamp.getFullYear() === noteTimestamp.getFullYear());
    });
    
    // 관련된 오답노트 삭제
    for (const note of relatedNotes) {
      try {
        await deleteDoc(doc(db, 'notes', note.id));
        console.log(`오답노트 ${note.id} 삭제됨`);
      } catch (noteError) {
        console.error(`오답노트 ${note.id} 삭제 실패:`, noteError);
      }
    }
    
    // 데이터 다시 로드
    await loadAllData();
    
    // 현재 선택된 학생이 있으면 상세 화면 다시 렌더링
    if (selectedStudent) {
      const studentData = {
        userName: selectedStudent.userName,
        results: allResults.filter(r => r.userId === selectedStudent.userId),
        totalScore: 0,
        totalTests: 0,
        totalWrong: 0
      };
      
      // 통계 재계산
      studentData.results.forEach(result => {
        studentData.totalScore += result.score;
        studentData.totalTests++;
        studentData.totalWrong += result.wrongCount || 0;
      });
      
      showStudentDetail(selectedStudent.userId, studentData);
    }
    
    const noteCount = relatedNotes.length;
    if (noteCount > 0) {
      alert(`결과와 관련된 오답노트 ${noteCount}개가 삭제되었습니다.`);
    } else {
      alert('결과가 삭제되었습니다.');
    }
  } catch (error) {
    console.error('결과 삭제 오류:', error);
    alert('결과 삭제에 실패했습니다: ' + error.message);
  }
}

// CSV 내보내기
document.getElementById('exportCsvBtn')?.addEventListener('click', () => {
  if (!selectedStudent) return;

  const results = selectedStudent.results;
  if (results.length === 0) {
    alert('내보낼 데이터가 없습니다.');
    return;
  }

  // CSV 헤더
  let csv = '날짜,학년,단원,난이도,전체 문제,정답,오답,점수\n';

  // CSV 데이터
  results.forEach(result => {
    const date = new Date(result.timestamp.toDate()).toLocaleString('ko-KR');
    const difficulty = ['쉬움', '보통', '어려움'][result.difficulty - 1];
    csv += `${date},${result.grade}학년,${result.unit}단원,${difficulty},${result.totalProblems},${result.correctCount},${result.wrongCount},${result.score}점\n`;
  });

  // 파일 다운로드
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', `${selectedStudent.userName}_결과_${new Date().toISOString().split('T')[0]}.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
});

// 뒤로가기
document.getElementById('backToOverviewBtn')?.addEventListener('click', () => {
  showScreen('overviewScreen');
});

