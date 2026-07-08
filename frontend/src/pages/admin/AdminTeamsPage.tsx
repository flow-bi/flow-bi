const teams = [
  { lead: '김민준', members: 14, name: '플랫폼팀', parent: '기술본부' },
  { lead: '최유진', members: 9, name: '프로덕트팀', parent: '서비스본부' },
  { lead: '오지민', members: 7, name: '경영지원팀', parent: '경영본부' },
]

function AdminTeamsPage() {
  return (
    <section className="page-stack">
      <article className="panel">
        <div className="panel-header">
          <div>
            <p className="section-label">Admin</p>
            <h2>팀 관리</h2>
          </div>
        </div>
        <div className="card-grid">
          {teams.map((team) => (
            <article className="team-card" key={team.name}>
              <p className="section-label">{team.parent}</p>
              <h3>{team.name}</h3>
              <p>
                팀장 {team.lead} · 구성원 {team.members}명
              </p>
            </article>
          ))}
        </div>
      </article>
    </section>
  )
}

export default AdminTeamsPage
