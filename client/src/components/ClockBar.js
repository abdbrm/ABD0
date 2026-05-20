import { useState, useEffect } from 'react';

export default function ClockBar({ right }) {
  const [dt, setDt] = useState(getMoscow());

  useEffect(() => {
    const t = setInterval(() => setDt(getMoscow()), 1000);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="clock-bar">
      <div>
        <span className="time">{dt.time}</span>
        <span style={{ marginLeft: 12 }}>{dt.date}</span>
        <span style={{ marginLeft: 8, fontSize: 11, opacity: 0.5 }}>МСК</span>
      </div>
      <div>{right}</div>
    </div>
  );
}

function getMoscow() {
  const now = new Date();
  return {
    time: now.toLocaleTimeString('ru-RU', { timeZone: 'Europe/Moscow', hour: '2-digit', minute: '2-digit', second: '2-digit' }),
    date: now.toLocaleDateString('ru-RU', { timeZone: 'Europe/Moscow', day: '2-digit', month: '2-digit', year: 'numeric', weekday: 'short' }),
  };
}
