// ============================================
// Aspire Path — Sample Data Initialization
// ============================================

const SAMPLE_DATA = {
  users: {
    'admin_demo': {
      uid: 'admin_demo',
      email: 'admin@demo.com',
      displayName: 'Demo Admin',
      role: 'admin',
      createdAt: { seconds: 1714560000 }
    },
    'applicant_1': {
      uid: 'applicant_1',
      email: 'tanaka@example.com',
      displayName: '田中 太郎',
      role: 'applicant',
      createdAt: { seconds: 1714565000 }
    },
    'applicant_2': {
      uid: 'applicant_2',
      email: 'sato@example.com',
      displayName: '佐藤 美咲',
      role: 'applicant',
      createdAt: { seconds: 1714570000 }
    }
  },
  applications: {
    'applicant_1': {
      id: 'applicant_1',
      userId: 'applicant_1',
      userName: 'Taro Tanaka',
      userEmail: 'tanaka@example.com',
      overallStatus: 'under_review',
      requirementStatus: 'submitted',
      documentStatus: 'submitted',
      transcriptStatus: 'submitted',
      profileData: {
        nameKanji: '田中 太郎',
        nameEn: 'Taro Tanaka',
        college: 'Santa Monica College',
        admissionTerm: 'Fall 2023',
        graduationTerm: 'Spring 2025'
      },
      requirementData: {
        gePattern: 'calgetc',
        targetUCMajors: [
          { campus: 'ucb', major: 'Economics', rank: 1 },
          { campus: 'ucla', major: 'Business Economics', rank: 'TAG' }
        ],
        autoCheckResult: 'pass',
        calgetc: {
          area1A: [{ course: 'ENGL 1', term: 'Fall 2023', grade: 'A' }],
          area1B: [{ course: 'ENGL 2', term: 'Spring 2024', grade: 'A' }],
          area2: [{ course: 'MATH 1', term: 'Fall 2023', grade: 'A' }]
        },
        majorPrep: [
          { course: 'ECON 1', term: 'Fall 2023', grade: 'A' },
          { course: 'ECON 2', term: 'Spring 2024', grade: 'A' }
        ]
      },
      documentData: {
        gpa: 3.92,
        activities: [
          { name: 'Economics Club', role: 'President', hoursPerWeek: 5 },
          { name: 'Volunteer Tutor', role: 'Math Tutor', hoursPerWeek: 3 }
        ],
        motivation: '将来はデータサイエンスを活用した経済分析に携わりたいと考えており、UC Berkeleyの優れた教育環境で学びたいです。',
        selfAnalysis: '数学的な分析能力が強みですが、英語でのプレゼンテーション能力にはまだ課題があると感じています。',
        piqPromptId: 'opt1',
        piqEssay: '私がリーダーシップを発揮したのは、カレッジの経済学クラブでの活動です。当初、メンバーの参加率が低かったのですが、実際の企業のデータを使った分析ワークショップを企画したところ、参加者が倍増しました。'
      },
      updatedAt: { seconds: 1714600000 }
    },
    'applicant_2': {
      id: 'applicant_2',
      userId: 'applicant_2',
      userName: 'Misaki Sato',
      userEmail: 'sato@example.com',
      overallStatus: 'pending',
      requirementStatus: 'submitted',
      documentStatus: 'draft',
      transcriptStatus: 'not_started',
      profileData: {
        nameKanji: '佐藤 美咲',
        nameEn: 'Misaki Sato',
        college: 'De Anza College',
        admissionTerm: 'Spring 2024',
        graduationTerm: 'Spring 2026'
      },
      requirementData: {
        gePattern: 'calgetc',
        targetUCMajors: [
          { campus: 'ucsd', major: 'Computer Science', rank: 1 }
        ],
        autoCheckResult: 'fail',
        missingAreas: ['Area 5 (Biological Sciences)'],
        calgetc: {
          area1A: [{ course: 'ENGL 1A', term: 'Spring 2024', grade: 'A' }],
          area2: [{ course: 'MATH 1A', term: 'Spring 2024', grade: 'A' }]
        }
      },
      documentData: {
        gpa: 3.75,
        gpaExplanation: '渡米直後の最初の学期に環境に慣れず、一科目でBを取ってしまいましたが、その後の学期ではすべてAを取得しています。'
      },
      updatedAt: { seconds: 1714610000 }
    }
  }
};

function initDemoData() {
  const DB_KEY = 'aspire_path_mock_db';
  if (!localStorage.getItem(DB_KEY)) {
    localStorage.setItem(DB_KEY, JSON.stringify(SAMPLE_DATA));
    console.log('Demo data initialized.');
  }
}

// Auto-init on load
initDemoData();
