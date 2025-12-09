import { onAuthStateChanged } from 'firebase/auth';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import { auth, db } from './firebaseConfig.js';
import { problems } from './data/problems.js';

let currentUser = null;
let allResults = [];
let allNotes = [];
let selectedStudent = null;
let wrongRateChart = null;

// 인증 상태 확인
onAuthStateChanged(auth, (user) => {
  if (user) {
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
  
  // 문제별 오답 횟수 집계
  const problemWrongCount = new Map();
  const problemTotalCount = new Map();

  results.forEach(result => {
    if (result.wrongProblems && Array.isArray(result.wrongProblems)) {
      result.wrongProblems.forEach(problemId => {
        problemWrongCount.set(problemId, (problemWrongCount.get(problemId) || 0) + 1);
      });
    }
    
    // 전체 문제 수 집계
    const key = `${result.grade}-${result.unit}-${result.difficulty}`;
    problemTotalCount.set(key, (problemTotalCount.get(key) || 0) + result.totalProblems);
  });

  const problemIds = Array.from(problemWrongCount.keys());
  const wrongCounts = problemIds.map(id => problemWrongCount.get(id));
  const labels = problemIds.map(id => `문제 ${id}`);

  if (wrongRateChart) {
    wrongRateChart.destroy();
  }

  wrongRateChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: labels,
      datasets: [{
        label: '오답 횟수',
        data: wrongCounts,
        backgroundColor: 'rgba(220, 53, 69, 0.6)',
        borderColor: 'rgba(220, 53, 69, 1)',
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
          reasonCount.set(reason, (reasonCount.get(reason) || 0) + 1);
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

  studentNotes.forEach(note => {
    const noteDiv = document.createElement('div');
    noteDiv.className = 'note-item';
    noteDiv.innerHTML = `
      <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
        <strong>${note.grade}학년 ${note.unit}단원 - ${['쉬움', '보통', '어려움'][note.difficulty - 1]}</strong>
        <span style="color: #666; font-size: 14px;">
          ${new Date(note.timestamp.toDate()).toLocaleString('ko-KR')}
        </span>
      </div>
      <p>틀린 문제 ${note.problems.length}개</p>
      <div style="margin-top: 10px;">
        ${note.problems.map((p, idx) => `
          <div style="margin: 5px 0; padding: 8px; background: white; border-radius: 5px;">
            문제 ${idx + 1}: ${p.reason || '원인 미입력'}
            ${p.drawing ? '<span style="color: #28a745;">(손글씨 포함)</span>' : ''}
          </div>
        `).join('')}
      </div>
    `;
    container.appendChild(noteDiv);
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
      </tr>
    `;
  });

  tableHTML += `
      </tbody>
    </table>
  `;

  container.innerHTML = tableHTML;
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

