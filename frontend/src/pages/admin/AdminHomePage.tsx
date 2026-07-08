function AdminHomePage() {
  return (
    <section className="page-stack">
      <article className="panel">
        <div className="panel-header">
          <div>
            <p className="section-label">Admin</p>
            <h2>관리자 홈</h2>
          </div>
        </div>
        <div className="summary-grid">
          <article className="metric-card">
            <span>직원</span>
            <strong>128</strong>
            <p>활성 계정 기준</p>
          </article>
          <article className="metric-card">
            <span>팀</span>
            <strong>12</strong>
            <p>상위/하위 팀 포함</p>
          </article>
          <article className="metric-card">
            <span>권한 검토</span>
            <strong>3</strong>
            <p>관리자 확인 필요</p>
          </article>
        </div>
      </article>
    </section>
  )
}

export default AdminHomePage
