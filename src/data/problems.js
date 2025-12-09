// 5학년 수학 문제 데이터
export const problems = {
  5: {
    1: { // 1단원
      easy: [
        {
          id: 1,
          type: 'multiple',
          question: '다음 중 가장 큰 수는?',
          options: ['1234', '1243', '1324', '1342'],
          correct: 3,
          difficulty: 1
        },
        {
          id: 2,
          type: 'multiple',
          question: '345 + 678의 값은?',
          options: ['1013', '1023', '1033', '1043'],
          correct: 1,
          difficulty: 1
        },
        {
          id: 3,
          type: 'short',
          question: '5000 - 2345 = ?',
          answer: '2655',
          difficulty: 1
        }
      ],
      medium: [
        {
          id: 4,
          type: 'multiple',
          question: '다음 중 올바른 계산은?',
          options: ['123 × 4 = 492', '123 × 4 = 482', '123 × 4 = 472', '123 × 4 = 462'],
          correct: 0,
          difficulty: 2
        },
        {
          id: 5,
          type: 'short',
          question: '456 ÷ 4 = ?',
          answer: '114',
          difficulty: 2
        },
        {
          id: 6,
          type: 'multiple',
          question: '다음 중 나머지가 가장 큰 것은?',
          options: ['15 ÷ 4', '17 ÷ 5', '19 ÷ 6', '21 ÷ 7'],
          correct: 1,
          difficulty: 2
        }
      ],
      hard: [
        {
          id: 7,
          type: 'short',
          question: '어떤 수에 25를 곱하면 1250이 됩니다. 어떤 수는?',
          answer: '50',
          difficulty: 3
        },
        {
          id: 8,
          type: 'multiple',
          question: '다음 중 계산 결과가 가장 큰 것은?',
          options: ['234 × 5', '123 × 10', '456 × 2', '345 × 3'],
          correct: 1,
          difficulty: 3
        },
        {
          id: 9,
          type: 'short',
          question: '1234 + 5678 - 2345 = ?',
          answer: '4567',
          difficulty: 3
        }
      ]
    },
    2: { // 2단원
      easy: [
        {
          id: 10,
          type: 'multiple',
          question: '다음 중 분수가 아닌 것은?',
          options: ['1/2', '3/4', '5/6', '7'],
          correct: 3,
          difficulty: 1
        },
        {
          id: 11,
          type: 'multiple',
          question: '1/2와 같은 값은?',
          options: ['2/4', '3/4', '2/3', '3/5'],
          correct: 0,
          difficulty: 1
        },
        {
          id: 12,
          type: 'short',
          question: '3/4 + 1/4 = ? (기약분수로)',
          answer: '1',
          difficulty: 1
        }
      ],
      medium: [
        {
          id: 13,
          type: 'multiple',
          question: '다음 중 가장 큰 분수는?',
          options: ['2/3', '3/4', '4/5', '5/6'],
          correct: 3,
          difficulty: 2
        },
        {
          id: 14,
          type: 'short',
          question: '1/2 + 1/3 = ? (기약분수로)',
          answer: '5/6',
          difficulty: 2
        },
        {
          id: 15,
          type: 'multiple',
          question: '5/6 - 1/3 = ?',
          options: ['1/2', '2/3', '3/4', '4/5'],
          correct: 0,
          difficulty: 2
        }
      ],
      hard: [
        {
          id: 16,
          type: 'short',
          question: '2/3 × 3/4 = ? (기약분수로)',
          answer: '1/2',
          difficulty: 3
        },
        {
          id: 17,
          type: 'multiple',
          question: '다음 중 계산 결과가 1보다 작은 것은?',
          options: ['3/2', '4/3', '2/3', '5/4'],
          correct: 2,
          difficulty: 3
        },
        {
          id: 18,
          type: 'short',
          question: '1/2 ÷ 1/4 = ?',
          answer: '2',
          difficulty: 3
        }
      ]
    },
    3: { // 3단원
      easy: [
        {
          id: 19,
          type: 'multiple',
          question: '다음 중 소수는?',
          options: ['0.5', '1/2', '2', '3'],
          correct: 0,
          difficulty: 1
        },
        {
          id: 20,
          type: 'multiple',
          question: '0.3과 같은 분수는?',
          options: ['1/3', '3/10', '3/100', '3/1000'],
          correct: 1,
          difficulty: 1
        },
        {
          id: 21,
          type: 'short',
          question: '0.5 + 0.3 = ?',
          answer: '0.8',
          difficulty: 1
        }
      ],
      medium: [
        {
          id: 22,
          type: 'multiple',
          question: '다음 중 가장 큰 소수는?',
          options: ['0.45', '0.54', '0.4', '0.5'],
          correct: 1,
          difficulty: 2
        },
        {
          id: 23,
          type: 'short',
          question: '1.2 - 0.7 = ?',
          answer: '0.5',
          difficulty: 2
        },
        {
          id: 24,
          type: 'multiple',
          question: '0.5 × 2 = ?',
          options: ['0.1', '1', '1.0', '10'],
          correct: 2,
          difficulty: 2
        }
      ],
      hard: [
        {
          id: 25,
          type: 'short',
          question: '2.5 × 0.4 = ?',
          answer: '1',
          difficulty: 3
        },
        {
          id: 26,
          type: 'multiple',
          question: '다음 중 0.75와 같은 분수는?',
          options: ['3/4', '7/5', '5/7', '4/3'],
          correct: 0,
          difficulty: 3
        },
        {
          id: 27,
          type: 'short',
          question: '3.6 ÷ 0.9 = ?',
          answer: '4',
          difficulty: 3
        }
      ]
    },
    4: { // 4단원
      easy: [
        {
          id: 28,
          type: 'multiple',
          question: '다음 중 직사각형의 특징은?',
          options: ['네 변의 길이가 모두 같다', '마주보는 두 변의 길이가 같다', '모든 각이 90도다', '대각선이 서로 수직이다'],
          correct: 2,
          difficulty: 1
        },
        {
          id: 29,
          type: 'multiple',
          question: '정사각형의 변의 개수는?',
          options: ['3개', '4개', '5개', '6개'],
          correct: 1,
          difficulty: 1
        },
        {
          id: 30,
          type: 'short',
          question: '한 변의 길이가 5cm인 정사각형의 둘레는? (단위: cm)',
          answer: '20',
          difficulty: 1
        }
      ],
      medium: [
        {
          id: 31,
          type: 'multiple',
          question: '가로 6cm, 세로 4cm인 직사각형의 넓이는?',
          options: ['20cm²', '24cm²', '28cm²', '30cm²'],
          correct: 1,
          difficulty: 2
        },
        {
          id: 32,
          type: 'short',
          question: '한 변의 길이가 7cm인 정사각형의 넓이는? (단위: cm²)',
          answer: '49',
          difficulty: 2
        },
        {
          id: 33,
          type: 'multiple',
          question: '둘레가 24cm인 정사각형의 한 변의 길이는?',
          options: ['4cm', '5cm', '6cm', '7cm'],
          correct: 2,
          difficulty: 2
        }
      ],
      hard: [
        {
          id: 34,
          type: 'short',
          question: '가로 8cm, 세로 5cm인 직사각형의 둘레는? (단위: cm)',
          answer: '26',
          difficulty: 3
        },
        {
          id: 35,
          type: 'multiple',
          question: '넓이가 36cm²인 정사각형의 한 변의 길이는?',
          options: ['5cm', '6cm', '7cm', '8cm'],
          correct: 1,
          difficulty: 3
        },
        {
          id: 36,
          type: 'short',
          question: '가로가 세로보다 2cm 긴 직사각형이 있습니다. 세로가 5cm일 때 넓이는? (단위: cm²)',
          answer: '35',
          difficulty: 3
        }
      ]
    },
    5: { // 5단원
      easy: [
        {
          id: 37,
          type: 'multiple',
          question: '다음 중 무게의 단위가 아닌 것은?',
          options: ['g', 'kg', 't', 'm'],
          correct: 3,
          difficulty: 1
        },
        {
          id: 38,
          type: 'multiple',
          question: '1kg = ? g',
          options: ['10g', '100g', '1000g', '10000g'],
          correct: 2,
          difficulty: 1
        },
        {
          id: 39,
          type: 'short',
          question: '2kg 500g = ? g',
          answer: '2500',
          difficulty: 1
        }
      ],
      medium: [
        {
          id: 40,
          type: 'multiple',
          question: '다음 중 가장 무거운 것은?',
          options: ['2kg', '2500g', '2.5kg', '3000g'],
          correct: 3,
          difficulty: 2
        },
        {
          id: 41,
          type: 'short',
          question: '3kg 200g - 1kg 500g = ? (단위: kg)',
          answer: '1.7',
          difficulty: 2
        },
        {
          id: 42,
          type: 'multiple',
          question: '5000g = ? kg',
          options: ['5kg', '50kg', '500kg', '5000kg'],
          correct: 0,
          difficulty: 2
        }
      ],
      hard: [
        {
          id: 43,
          type: 'short',
          question: '사과 3개가 각각 250g씩입니다. 총 무게는? (단위: g)',
          answer: '750',
          difficulty: 3
        },
        {
          id: 44,
          type: 'multiple',
          question: '다음 중 무게의 합이 2kg인 것은?',
          options: ['500g + 500g + 500g', '600g + 700g + 800g', '400g + 500g + 600g', '300g + 400g + 500g'],
          correct: 1,
          difficulty: 3
        },
        {
          id: 45,
          type: 'short',
          question: '1.5kg + 800g = ? (단위: g)',
          answer: '2300',
          difficulty: 3
        }
      ]
    },
    6: { // 6단원
      easy: [
        {
          id: 46,
          type: 'multiple',
          question: '다음 중 시간의 단위가 아닌 것은?',
          options: ['초', '분', '시', '일'],
          correct: 3,
          difficulty: 1
        },
        {
          id: 47,
          type: 'multiple',
          question: '1시간 = ? 분',
          options: ['30분', '60분', '90분', '120분'],
          correct: 1,
          difficulty: 1
        },
        {
          id: 48,
          type: 'short',
          question: '2시간 30분 = ? 분',
          answer: '150',
          difficulty: 1
        }
      ],
      medium: [
        {
          id: 49,
          type: 'multiple',
          question: '오전 9시 30분에서 2시간 15분 후는?',
          options: ['11시 30분', '11시 45분', '12시', '12시 15분'],
          correct: 1,
          difficulty: 2
        },
        {
          id: 50,
          type: 'short',
          question: '3시간 20분 - 1시간 45분 = ? (단위: 분)',
          answer: '95',
          difficulty: 2
        },
        {
          id: 51,
          type: 'multiple',
          question: '150분 = ? 시간 ? 분',
          options: ['2시간 30분', '2시간 50분', '3시간', '3시간 30분'],
          correct: 0,
          difficulty: 2
        }
      ],
      hard: [
        {
          id: 52,
          type: 'short',
          question: '오후 2시 15분에서 3시간 50분 후는? (형식: 오후/오전 X시 X분)',
          answer: '오후 6시 5분',
          difficulty: 3
        },
        {
          id: 53,
          type: 'multiple',
          question: '다음 중 가장 긴 시간은?',
          options: ['2시간 30분', '150분', '2.5시간', '9000초'],
          correct: 3,
          difficulty: 3
        },
        {
          id: 54,
          type: 'short',
          question: '시속 60km로 2시간 30분 동안 가면 총 거리는? (단위: km)',
          answer: '150',
          difficulty: 3
        }
      ]
    }
  }
};

