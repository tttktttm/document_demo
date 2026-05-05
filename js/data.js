// ============================================
// BUCHI 書類審査システム — Data Constants
// ============================================

// UC Campuses
const UC_CAMPUSES = [
  { id: 'ucb', name: 'UC Berkeley' },
  { id: 'ucla', name: 'UCLA' },
  { id: 'ucsd', name: 'UC San Diego' },
  { id: 'uci', name: 'UC Irvine' },
  { id: 'ucd', name: 'UC Davis' },
  { id: 'ucsb', name: 'UC Santa Barbara' },
  { id: 'ucsc', name: 'UC Santa Cruz' },
  { id: 'ucr', name: 'UC Riverside' },
  { id: 'ucm', name: 'UC Merced' },
];

// California Community Colleges (主要校)
const COMMUNITY_COLLEGES = [
  'Santa Monica College',
  'De Anza College',
  'Diablo Valley College',
  'Pasadena City College',
  'Santa Barbara City College',
  'Orange Coast College',
  'Foothill College',
  'Irvine Valley College',
  'El Camino College',
  'Glendale Community College',
  'Mt. San Antonio College',
  'City College of San Francisco',
  'San Diego Mesa College',
  'Los Angeles City College',
  'Riverside City College',
  'Sacramento City College',
  'Berkeley City College',
  'Laney College',
  'College of the Canyons',
  'Moorpark College',
  'その他',
];

// UC Campus-Specific Majors Map
const UC_MAJORS_MAP = {
  ucb: [
    'Business Administration (Haas)', 'Computer Science (BA)', 'Computer Science (BS - EECS)',
    'Data Science', 'Economics', 'Political Science', 'Psychology', 'Mechanical Engineering',
    'Applied Mathematics', 'Statistics', 'Media Studies', 'Sociology', 'Bioengineering',
    'Chemical Biology', 'Civil Engineering', 'Public Health', 'English', 'History',
    'Architecture', 'Legal Studies', 'Geography', 'Film & Media', 'その他'
  ],
  ucla: [
    'Business Economics', 'Computer Science', 'Pre-Psychology', 'Pre-Political Science',
    'Pre-Economics', 'Pre-Mathematics/Economics', 'Biology', 'Pre-Sociology', 'Communication',
    'Pre-Data Theory', 'Mechanical Engineering', 'Aerospace Engineering', 'Bioengineering',
    'Civil Engineering', 'English', 'History', 'Nursing', 'Theater', 'Pre-Global Studies',
    'Geography', 'Geography/Environmental Studies', 'Film and Television', 'その他'
  ],
  ucsd: [
    'Business Economics', 'Management Science', 'Computer Science', 'Data Science', 'Cognitive Science', 'Economics', 'Mathematics - Computer Science',
    'Bioengineering', 'Electrical Engineering', 'Mechanical Engineering', 'Biology', 'Psychology',
    'Political Science', 'Communication', 'International Studies', 'Sociology', 'Chemistry',
    'Physics', 'Structural Engineering', 'Public Health', 'Mathematics - Applied', 'その他'
  ],
  uci: [
    'Computer Science', 'Software Engineering', 'Business Administration', 'Biological Sciences',
    'Criminology, Law and Society', 'Psychological Science', 'Data Science', 'Economics',
    'Mechanical Engineering', 'Computer Engineering', 'Biomedical Engineering', 'Nursing Science',
    'Public Health Sciences', 'Informatics', 'Sociology', 'Political Science', 'English',
    'Film and Media Studies', 'その他'
  ],
  ucd: [
    'Computer Science', 'Managerial Economics', 'Animal Science', 'Biological Sciences',
    'Psychology', 'Economics', 'Neurobiology, Physiology and Behavior', 'Mechanical Engineering',
    'Civil Engineering', 'Biochemical Engineering', 'Design', 'Communication', 'Sociology',
    'Political Science', 'Viticulture and Enology', 'Statistics', 'History', 'English',
    'Cinema and Digital Media', 'その他'
  ],
  ucsb: [
    'Computer Science', 'Economics & Accounting', 'Economics', 'Biopsychology', 'Communication',
    'Psychological & Brain Sciences', 'Mechanical Engineering', 'Biological Sciences',
    'Sociology', 'Political Science', 'Physics', 'Actuarial Science', 'History', 'English',
    'Environmental Studies', 'Global Studies', 'Film and Media Studies', 'Chemistry', 'Geography', 'その他'
  ],
  ucsc: [
    'Business Management Economics', 'Computer Science', 'Computer Game Design', 'Marine Biology', 'Astrophysics', 'Psychology',
    'Economics', 'Biology', 'Robotics Engineering', 'Technology and Information Management',
    'Sociology', 'Politics', 'Environmental Studies', 'Film and Digital Media', 'Literature',
    'History', 'Anthropology', 'Mathematics', 'Chemistry', 'その他'
  ],
  ucr: [
    'Business Administration', 'Computer Science', 'Biology', 'Psychology', 'Mechanical Engineering',
    'Economics', 'Sociology', 'Political Science', 'Bioengineering', 'Neuroscience',
    'Data Science', 'Education, Society, and Human Development', 'History', 'English',
    'Computer Engineering', 'Environmental Sciences', 'Chemistry', 'Physics',
    'Media and Cultural Studies', 'その他'
  ],
  ucm: [
    'Computer Science', 'Biological Sciences', 'Psychology', 'Mechanical Engineering',
    'Management and Business Economics', 'Bioengineering', 'Public Health', 'Sociology',
    'Political Science', 'Cognitive Science', 'History', 'English', 'Applied Mathematics',
    'Environmental Engineering', 'Physics', 'Chemistry', 'Anthropology', 'その他'
  ]
};

// UC CalGETC Areas

// UC CalGETC Areas (New standard for students starting Fall 2025 or later)
const CALGETC_AREAS = [
  {
    id: 'area1A',
    name: 'Area 1A — English Composition',
    description: '英語作文 1科目必須',
    required: 1,
    courses: ['English Composition (ENGL 1)', 'College Writing (ENGL 101)', 'Freshman Composition (ENGL 1A)'],
  },
  {
    id: 'area1B',
    name: 'Area 1B — Critical Thinking & Composition',
    description: '批判的思考と英語作文 1科目必須',
    required: 1,
    courses: ['Critical Thinking & Composition (ENGL 2)', 'Argumentative Writing (ENGL 1B)'],
  },
  {
    id: 'area1C',
    name: 'Area 1C — Oral Communication',
    description: 'オーラル・コミュニケーション 1科目必須',
    required: 1,
    courses: ['Public Speaking (COMM 1)', 'Interpersonal Communication'],
  },
  {
    id: 'area2',
    name: 'Area 2 — Mathematical Concepts',
    description: '数学・定量推論 1科目必須',
    required: 1,
    courses: ['Calculus I (MATH 1)', 'Statistics (MATH 140 / PSYCH 40)', 'Linear Algebra'],
  },
  {
    id: 'area3',
    name: 'Area 3 — Arts & Humanities',
    description: '芸術・人文学 2科目必須（Arts・Humanitiesそれぞれ最低1科目）',
    required: 2,
    courses: ['Art History (ART 101)', 'Introduction to Philosophy (PHIL 1)', 'Ethics (PHIL 2)'],
  },
  {
    id: 'area4',
    name: 'Area 4 — Social & Behavioral Sciences',
    description: '社会科学 2科目必須（2つの異なる分野から）',
    required: 2,
    courses: ['Introduction to Psychology (PSYCH 1)', 'Macroeconomics (ECON 1)', 'US History'],
  },
  {
    id: 'area5',
    name: 'Area 5 — Physical & Biological Sciences',
    description: '自然科学 2科目必須（物理系1・生物系1、うち1つはLab必須）',
    required: 2,
    courses: ['General Chemistry I (CHEM 1A)', 'General Biology I (BIO 1)', 'Physics I (PHYS 1)'],
  },
  {
    id: 'area6',
    name: 'Area 6 — Ethnic Studies',
    description: 'エスニック・スタディーズ 1科目必須',
    required: 1,
    courses: ['Introduction to Ethnic Studies', 'African American History', 'Chicano/Latino Studies'],
  },
];

// UC IGETC Areas (Legacy pattern for students who started before Summer 2025)
const IGETC_AREAS = [
  {
    id: 'area1A',
    name: 'Area 1A — English Composition',
    description: '英語作文 1科目必須',
    required: 1,
    courses: ['English Composition (ENGL 1)', 'College Writing (ENGL 101)', 'Freshman Composition (ENGL 1A)'],
  },
  {
    id: 'area1B',
    name: 'Area 1B — Critical Thinking & Composition',
    description: '批判的思考と英語作文 1科目必須',
    required: 1,
    courses: ['Critical Thinking & Composition (ENGL 2)', 'Argumentative Writing (ENGL 1B)'],
  },
  {
    id: 'area1C',
    name: 'Area 1C — Oral Communication',
    description: 'オーラル・コミュニケーション (CSU要件。UCは原則不要ですが、一部の専攻で推奨される場合があります)',
    required: 0,
    courses: ['Public Speaking (COMM 1)', 'Interpersonal Communication'],
  },
  {
    id: 'area2',
    name: 'Area 2 — Mathematical Concepts',
    description: '数学 1科目必須',
    required: 1,
    courses: ['Calculus I (MATH 1)', 'Statistics (MATH 140 / PSYCH 40)', 'Linear Algebra'],
  },
  {
    id: 'area3',
    name: 'Area 3 — Arts & Humanities',
    description: '芸術・人文学 3科目必須（Artsから最低1科目, Humanitiesから最低1科目）',
    required: 3,
    courses: ['Art History (ART 101)', 'Introduction to Philosophy (PHIL 1)', 'Ethics (PHIL 2)'],
  },
  {
    id: 'area4',
    name: 'Area 4 — Social & Behavioral Sciences',
    description: '社会科学 2科目必須（2つの異なる分野から）',
    required: 2,
    courses: ['Introduction to Psychology (PSYCH 1)', 'Macroeconomics (ECON 1)', 'US History'],
  },
  {
    id: 'area5',
    name: 'Area 5 — Physical & Biological Sciences',
    description: '自然科学 2科目必須（物理系1・生物系1、うち1つはLab必須）',
    required: 2,
    courses: ['General Chemistry I (CHEM 1A)', 'General Biology I (BIO 1)', 'Physics I (PHYS 1)'],
  },
  {
    id: 'area6',
    name: 'Area 6 — LOTE (Language Other Than English)',
    description: '外国語要件 (UC編入に必須)',
    required: 1,
    courses: ['Japanese 1', 'Spanish 1', 'High School Credit'],
  },
  {
    id: 'area7',
    name: 'Area 7 — Ethnic Studies',
    description: 'エスニック・スタディーズ 1科目必須',
    required: 1,
    courses: ['Introduction to Ethnic Studies', 'African American History', 'Chicano/Latino Studies'],
  },
];

// Major Preparation example courses
const MAJOR_PREP_COURSES = [
  'Calculus I',
  'Calculus II',
  'Calculus III (Multivariable)',
  'Linear Algebra',
  'Differential Equations',
  'Statistics',
  'General Chemistry I',
  'General Chemistry II',
  'Organic Chemistry I',
  'Organic Chemistry II',
  'General Physics I (Mechanics)',
  'General Physics II (E&M)',
  'General Physics III',
  'General Biology I',
  'General Biology II',
  'Introduction to Programming',
  'Data Structures',
  'Computer Architecture',
  'Discrete Mathematics',
  'Macroeconomics',
  'Microeconomics',
  'Financial Accounting',
  'Managerial Accounting',
  'Business Law',
  'Introduction to Psychology',
  'Introduction to Sociology',
  'Political Science',
  'US History',
  'World History',
];

// Application statuses
const APP_STATUSES = {
  not_started: { label: '未提出', class: 'not-started' },
  draft: { label: 'ドラフト', class: 'draft' },
  submitted: { label: '提出済', class: 'submitted' },
  needs_action: { label: '要対応', class: 'action' },
};

const REVIEW_STATUSES = {
  pending: { label: '審査前', class: 'not-started' },
  under_review: { label: '審査中', class: 'review' },
  interview: { label: '面接対象', class: 'interview' },
  accepted: { label: '採用', class: 'accepted' },
  rejected: { label: '不採用', class: 'rejected' },
};

// PIQ character limits (JP specific)
const PIQ_CHAR_MIN = 500;
const PIQ_CHAR_MAX = 1000;

// UC Transfer PIQ Prompts (Major Essay以外)
const TRANSFER_PIQS = [
  {
    id: 'opt1',
    title: 'Optional 1: Leadership',
    promptEn: 'Describe an example of your leadership experience in which you have positively influenced others, helped resolve disputes or contributed to group efforts over time.',
    promptJa: 'これまでにリーダーシップを発揮し、他者に良い影響を与えた、対立を解決に導いた、あるいは長期間にわたりグループの目標達成に貢献した経験を記述してください。',
    considerEn: 'Things to consider: A leadership role can mean more than just a title. It can mean being a mentor to others, acting as a person in charge of a specific task, or taking the lead role in organizing an event or project.',
    considerJa: '書く際のヒント: リーダーシップとは、単に役職や肩書きのことだけではありません。他者のメンターになったり、特定の課題で責任者を務めたり、イベントやプロジェクトの企画で率先して行動した経験も含まれます。'
  },
  {
    id: 'opt2',
    title: 'Optional 2: Creativity',
    promptEn: 'Every person has a creative side, and it can be expressed in many ways: problem solving, original and innovative thinking, and artistically, to name a few. Describe how you express your creative side.',
    promptJa: '誰もが創造性を持っています（問題解決、独創的・革新的な思考、芸術表現など）。あなたは自分の創造性をどのように表現していますか。',
    considerEn: 'Things to consider: What does creativity mean to you? Do you have a creative skill that is important to you? What have you been able to do with that skill?',
    considerJa: '書く際のヒント: あなたにとって創造性とは何ですか。あなたにとって重要な創造的スキルはありますか。そのスキルを使ってこれまでにどのようなことを成し遂げましたか。'
  },
  {
    id: 'opt3',
    title: 'Optional 3: Greatest Talent or Skill',
    promptEn: 'What would you say is your greatest talent or skill? How have you developed and demonstrated that talent over time?',
    promptJa: 'あなたの最大の才能やスキルは何ですか。また、これまでにその才能をどのように伸ばし、活用してきましたか。',
    considerEn: 'Things to consider: If there’s a talent or skill that you’re proud of, this is the time to share it. You don’t necessarily have to be recognized or have received awards for your talent.',
    considerJa: '書く際のヒント: もし誇りに思っている才能やスキルがあるなら、ここでアピールしましょう。必ずしもその才能で表彰されたり公式に認められたりしている必要はありません。'
  },
  {
    id: 'opt4',
    title: 'Optional 4: Educational Opportunity or Barrier',
    promptEn: 'Describe how you have taken advantage of a significant educational opportunity or worked to overcome an educational barrier you have faced.',
    promptJa: 'これまでに与えられた重要な学習の機会をどのように活用してきたか、あるいは直面した教育上の障壁をどのように乗り越えようとしたかについて述べてください。',
    considerEn: 'Things to consider: An educational opportunity can be anything that has added value to your educational experience and better prepared you for college. If you choose to write about a barrier, how did you overcome or strive to overcome it?',
    considerJa: '書く際のヒント: 学習の機会とは、あなたの教育経験に付加価値を与え、大学進学の準備に役立ったあらゆるプログラムや経験のことです。障壁について書く場合は、それをどのように克服したか（あるいは克服しようと努力したか）に焦点を当ててください。'
  },
  {
    id: 'opt5',
    title: 'Optional 5: Significant Challenge',
    promptEn: 'Describe the most significant challenge you have faced and the steps you have taken to overcome this challenge. How has this challenge affected your academic achievement?',
    promptJa: 'これまでに直面した最大の困難と、それを克服するためにあなたが取った行動について記述してください。その困難はあなたの学業成績にどのような影響を与えましたか。',
    considerEn: 'Things to consider: A challenge could be personal, or something you have faced in your community or school. Why was the challenge significant to you? This is a good opportunity to talk about any obstacles you’ve faced and what you’ve learned from the experience.',
    considerJa: '書く際のヒント: 困難とは、個人的なことでも、地域社会や学校で直面したことでも構いません。なぜそれが自分にとって大きな困難だったのでしょうか。障害を乗り越えた過程と、そこから学んだことを伝える良い機会です。'
  },
  {
    id: 'opt6',
    title: 'Optional 6: Community Service',
    promptEn: 'What have you done to make your school or your community a better place?',
    promptJa: 'より良い学校・地域社会等のコミュニティを作るために、あなたはどのような活動を行いましたか。',
    considerEn: 'Things to consider: Think of community as a term that can encompass a group, team or a place - like your high school, hometown or home. You can define community as you see fit.',
    considerJa: '書く際のヒント: コミュニティとは、学校、地元、家庭など特定の場所だけでなく、所属するグループやチームを指す場合もあります。あなたが考える「自分のコミュニティ」を自由に定義して構いません。そこでどんな役割を果たしたかを具体的に書きましょう。'
  },
  {
    id: 'opt7',
    title: 'Optional 7: Stand Out',
    promptEn: 'Beyond what has already been shared in your application, what do you believe makes you stand out as a strong candidate for admissions to the University of California?',
    promptJa: '出願書類の他の部分には書かれていないことで、あなたがカリフォルニア大学への強力な候補者として際立っていると考える理由は何ですか。',
    considerEn: 'Things to consider: Don’t be afraid to brag a little. Even if you don’t think you’re unique, you are — what makes you belong on one of UC’s campuses? When looking at your life, what would a stranger find compelling?',
    considerJa: '書く際のヒント: 少し自慢するくらいの気持ちで書いて構いません。自分では平凡だと思っていても、必ずあなたらしさがあります。UCのキャンパスにふさわしい理由はどこにあるでしょうか。他人があなたの人生を見たとき、何が一番魅力的だと感じるかを考えてみてください。'
  }
];

// GPA threshold for additional explanation
const GPA_THRESHOLD = 3.8;
