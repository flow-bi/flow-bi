const users = [
  { employeeNumber: 'A1001', name: '김민준', role: 'ADMIN', status: 'ACTIVE', team: '플랫폼팀' },
  { employeeNumber: 'A1002', name: '이서연', role: 'USER', status: 'ACTIVE', team: '플랫폼팀' },
  { employeeNumber: 'A1003', name: '박지훈', role: 'USER', status: 'ACTIVE', team: '플랫폼팀' },
]

function AdminUsersPage() {
  return (
    <section className="page-stack">
      <article className="panel">
        <div className="panel-header">
          <div>
            <p className="section-label">Admin</p>
            <h2>직원 관리</h2>
          </div>
        </div>
        <div className="data-table">
          <div className="data-row header">
            <span>사번</span>
            <span>이름</span>
            <span>팀</span>
            <span>권한</span>
            <span>상태</span>
          </div>
          {users.map((user) => (
            <div className="data-row" key={user.employeeNumber}>
              <strong>{user.employeeNumber}</strong>
              <span>{user.name}</span>
              <span>{user.team}</span>
              <span>{user.role}</span>
              <span>{user.status}</span>
            </div>
          ))}
        </div>
      </article>
    </section>
  )
}

export default AdminUsersPage
