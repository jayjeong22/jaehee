// 날씨 정보 가져오기 (간단한 형식)
export async function getWeatherInfo() {
  try {
    // 위치 정보 가져오기
    const position = await new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation is not supported'));
        return;
      }
      navigator.geolocation.getCurrentPosition(resolve, reject, {
        timeout: 5000,
        maximumAge: 600000 // 10분 캐시
      });
    });

    const { latitude, longitude } = position.coords;

    // 역지오코딩으로 위치 이름 가져오기 (OpenStreetMap Nominatim API 사용 - 무료)
    const reverseGeocodeResponse = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=10&addressdetails=1`,
      {
        headers: {
          'User-Agent': 'MathLog App'
        }
      }
    );
    const reverseGeocodeData = await reverseGeocodeResponse.json();
    
    let locationName = '서울';
    if (reverseGeocodeData.address) {
      // 시/도 이름 가져오기
      locationName = reverseGeocodeData.address.city || 
                    reverseGeocodeData.address.town || 
                    reverseGeocodeData.address.village ||
                    reverseGeocodeData.address.state ||
                    '서울';
    }

    // 간단한 형식: 위치와 랜덤 온도 (실제 날씨 API 없이)
    // 온도는 계절에 맞게 랜덤으로 생성 (한국 기준)
    const month = new Date().getMonth() + 1; // 1-12
    let minTemp, maxTemp;
    
    if (month >= 12 || month <= 2) {
      // 겨울: -5 ~ 10도
      minTemp = -5;
      maxTemp = 10;
    } else if (month >= 3 && month <= 5) {
      // 봄: 5 ~ 20도
      minTemp = 5;
      maxTemp = 20;
    } else if (month >= 6 && month <= 8) {
      // 여름: 20 ~ 35도
      minTemp = 20;
      maxTemp = 35;
    } else {
      // 가을: 10 ~ 25도
      minTemp = 10;
      maxTemp = 25;
    }
    
    const temp = Math.floor(Math.random() * (maxTemp - minTemp + 1)) + minTemp;
    
    return `${locationName} ${temp}도`;
    
  } catch (error) {
    console.log('위치 정보 가져오기 실패:', error);
    // 기본 메시지 (계절에 맞는 온도)
    const month = new Date().getMonth() + 1;
    let defaultTemp = 15;
    if (month >= 12 || month <= 2) {
      defaultTemp = 4; // 겨울
    } else if (month >= 6 && month <= 8) {
      defaultTemp = 28; // 여름
    }
    return `서울 ${defaultTemp}도`;
  }
}

