import type { OrgMembersByOrg, OrgNode } from '../types/orgChart'

export const ORG_TREE: OrgNode = {
  id: 1,
  name: '(주)코퍼레이션',
  code: 'ORG-001',
  status: 'ACTIVE',
  children: [
    {
      id: 2,
      name: '경영지원본부',
      code: 'ORG-002',
      status: 'ACTIVE',
      children: [
        { id: 5, name: '인사팀', code: 'ORG-005', status: 'ACTIVE', children: [] },
        { id: 6, name: '재무팀', code: 'ORG-006', status: 'ACTIVE', children: [] },
        { id: 7, name: '총무팀', code: 'ORG-007', status: 'ACTIVE', children: [] },
      ],
    },
    {
      id: 3,
      name: '개발본부',
      code: 'ORG-003',
      status: 'ACTIVE',
      children: [
        { id: 8, name: '프론트엔드팀', code: 'ORG-008', status: 'ACTIVE', children: [] },
        { id: 9, name: '백엔드팀', code: 'ORG-009', status: 'ACTIVE', children: [] },
        { id: 10, name: 'QA팀', code: 'ORG-010', status: 'ACTIVE', children: [] },
      ],
    },
    {
      id: 4,
      name: '마케팅본부',
      code: 'ORG-004',
      status: 'ACTIVE',
      children: [
        { id: 11, name: '브랜드팀', code: 'ORG-011', status: 'ACTIVE', children: [] },
        { id: 12, name: '디지털마케팅팀', code: 'ORG-012', status: 'ACTIVE', children: [] },
      ],
    },
  ],
}

export const ORG_MEMBERS: OrgMembersByOrg = {
  1: [{ id: 100, name: '한대표', grade: '대표이사', position: 'CEO', type: '주소속' }],
  2: [{ id: 101, name: '박본부장', grade: '상무', position: '경영지원 본부장', type: '주소속' }],
  3: [{ id: 102, name: '정본부장', grade: '상무', position: '개발 본부장', type: '주소속' }],
  4: [{ id: 103, name: '김본부장', grade: '상무', position: '마케팅 본부장', type: '주소속' }],
  5: [
    { id: 8, name: '강현주', grade: '부장', position: '인사팀장', type: '주소속' },
    { id: 9, name: '윤서희', grade: '과장', position: '인사담당자', type: '주소속' },
    { id: 10, name: '오민정', grade: '대리', position: '채용담당자', type: '주소속' },
  ],
  6: [
    { id: 11, name: '임재성', grade: '부장', position: '재무팀장', type: '주소속' },
    { id: 12, name: '장수진', grade: '과장', position: '회계담당자', type: '주소속' },
  ],
  7: [{ id: 13, name: '백승민', grade: '대리', position: '총무담당자', type: '주소속' }],
  8: [
    { id: 1, name: '김지훈', grade: '팀장', position: '책임연구원', type: '주소속' },
    { id: 2, name: '이수정', grade: '대리', position: '선임연구원', type: '주소속' },
    { id: 3, name: '박민수', grade: '과장', position: '연구원', type: '주소속' },
    { id: 4, name: '최유진', grade: '사원', position: '연구원', type: '주소속' },
    { id: 14, name: '류승현', grade: '과장', position: '선임연구원', type: '겸직' },
  ],
  9: [
    { id: 5, name: '정동현', grade: '부장', position: '책임연구원', type: '주소속' },
    { id: 6, name: '홍미래', grade: '과장', position: '선임연구원', type: '주소속' },
    { id: 7, name: '신재원', grade: '대리', position: '연구원', type: '주소속' },
    { id: 14, name: '류승현', grade: '과장', position: '선임연구원', type: '주소속' },
  ],
  10: [
    { id: 15, name: '권다희', grade: '대리', position: 'QA엔지니어', type: '주소속' },
    { id: 16, name: '노태준', grade: '사원', position: 'QA엔지니어', type: '주소속' },
  ],
  11: [{ id: 17, name: '손지민', grade: '과장', position: '브랜드매니저', type: '주소속' }],
  12: [
    { id: 18, name: '문혜린', grade: '대리', position: '디지털마케터', type: '주소속' },
    { id: 19, name: '안준호', grade: '사원', position: '디지털마케터', type: '주소속' },
  ],
}
