import type { AuthUser } from '@/pages/login/types/auth'

type MyPageProps = {
  user: AuthUser
}

function MyPage({ user }: MyPageProps) {
  return (
    <section className="page-stack">
      <article className="panel profile-panel">
        <div className="avatar large" aria-hidden="true">
          {user.name.slice(0, 1)}
        </div>
        <div>
          <p className="section-label">My Page</p>
          <h2>{user.name}</h2>
          <p>
            {user.team} · {user.position}
          </p>
        </div>
      </article>

      <article className="panel">
        <div className="detail-list">
          <div>
            <span>사번</span>
            <strong>{user.employeeNumber}</strong>
          </div>
          <div>
            <span>이메일</span>
            <strong>{user.email}</strong>
          </div>
          <div>
            <span>전화번호</span>
            <strong>{user.phoneNumber}</strong>
          </div>
          <div>
            <span>상태</span>
            <strong>{user.status}</strong>
          </div>
        </div>
      </article>
    </section>
  )
}

export default MyPage
