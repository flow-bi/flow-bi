const themes = [
  { color: '#EDF1F6', description: '기본 배경과 카드 계열', name: 'Light Blue' },
  { color: '#5541A4', description: '강조 버튼과 선택 상태', name: 'Purple' },
]

function ThemePage() {
  return (
    <section className="page-stack">
      <article className="panel">
        <div className="panel-header">
          <div>
            <p className="section-label">Theme</p>
            <h2>테마 설정</h2>
          </div>
        </div>
        <div className="card-grid">
          {themes.map((theme) => (
            <article className="theme-card" key={theme.name}>
              <span style={{ backgroundColor: theme.color }} />
              <div>
                <strong>{theme.name}</strong>
                <p>{theme.description}</p>
              </div>
            </article>
          ))}
        </div>
      </article>
    </section>
  )
}

export default ThemePage
