// 다크 모드 기능
(function() {
  // 다크 모드 상태 확인 및 적용
  function initDarkMode() {
    const theme = localStorage.getItem('theme') || 'light';
    document.documentElement.setAttribute('data-theme', theme);
    updateDarkModeToggle(theme);
    updateBodyStyles(theme);
  }

  // body 스타일 업데이트
  function updateBodyStyles(theme) {
    const body = document.body;
    if (!body) return;
    
    if (theme === 'dark') {
      body.style.backgroundColor = '#1a1a2e';
      body.style.color = '#e0e0e0';
    } else {
      body.style.backgroundColor = '#F5F5FF';
      body.style.color = '#000000';
    }
  }

  // 다크 모드 토글 버튼 업데이트
  function updateDarkModeToggle(theme) {
    const toggle = document.getElementById('darkModeToggle');
    if (toggle) {
      toggle.textContent = theme === 'dark' ? '☀️' : '🌙';
    }
  }

  // 다크 모드 토글
  function toggleDarkMode() {
    const currentTheme = document.documentElement.getAttribute('data-theme') || 'light';
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
    updateDarkModeToggle(newTheme);
    updateBodyStyles(newTheme);
    
    // 모든 카드와 요소 업데이트
    document.querySelectorAll('.card, .header, h1, h2, h3, p, span, div').forEach(el => {
      if (newTheme === 'dark') {
        if (el.classList.contains('card')) {
          el.style.backgroundColor = '#16213e';
          el.style.color = '#e0e0e0';
        } else if (el.classList.contains('header')) {
          el.style.background = 'linear-gradient(135deg, #0f3460 0%, #16213e 100%)';
          el.style.color = '#e0e0e0';
        }
      } else {
        if (el.classList.contains('card')) {
          el.style.backgroundColor = '#FFFFFF';
          el.style.color = '#000000';
        } else if (el.classList.contains('header')) {
          el.style.background = 'linear-gradient(135deg, #DDDDFF 0%, #E5DDFF 100%)';
          el.style.color = '#000000';
        }
      }
    });
  }

  // 초기화
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initDarkMode);
  } else {
    initDarkMode();
  }

  // 토글 버튼 이벤트 리스너
  function setupToggle() {
    const toggle = document.getElementById('darkModeToggle');
    if (toggle) {
      toggle.addEventListener('click', toggleDarkMode);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', setupToggle);
  } else {
    setupToggle();
  }
  
  // 즉시 실행 (DOM 로드 전에도 작동)
  setTimeout(setupToggle, 100);
})();

