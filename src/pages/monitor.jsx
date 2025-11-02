function monitor() {
  return (
    <>
      <title>Monitor</title>
      <iframe 
        src="https://grafana.mirror.nekoha.moe/public-dashboards/ee3d9f21b0ee47468f1c0dc105c84349?from=now-6h&to=now&timezone=browser&kiosk=tv" 
        style={{
          width: '100%',
          height: '100vh',
          border: 'none',
          display: 'block'
        }}
      />
    </>
  )
}
export default monitor