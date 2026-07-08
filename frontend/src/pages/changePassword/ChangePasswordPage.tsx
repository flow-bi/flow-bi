function ChangePasswordPage() {
  return (
    <main className="login-page single">
      <section className="login-card" aria-labelledby="change-password-title">
        <div className="login-card-header">
          <p className="section-label">Password</p>
          <h2 id="change-password-title">비밀번호 변경</h2>
          <p>초기 비밀번호 또는 만료된 비밀번호를 새 비밀번호로 변경합니다.</p>
        </div>

        <form className="login-form">
          <label className="field">
            <span>사번</span>
            <input autoComplete="username" placeholder="예: A1001" />
          </label>
          <label className="field">
            <span>현재 비밀번호</span>
            <input autoComplete="current-password" placeholder="현재 비밀번호" type="password" />
          </label>
          <label className="field">
            <span>새 비밀번호</span>
            <input autoComplete="new-password" placeholder="새 비밀번호" type="password" />
          </label>
          <button className="primary-button" type="button">
            변경 요청
          </button>
        </form>
      </section>
    </main>
  )
}

export default ChangePasswordPage
