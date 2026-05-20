import { useRef, useState } from 'react';

export default function SwipeToConfirm({ onConfirm, label = 'Потяните для подтверждения' }) {
  const trackRef   = useRef(null);
  const [pos, setPos]   = useState(0);
  const [dragging, setDragging] = useState(false);
  const startX = useRef(0);

  const TRACK_W = 280;
  const THUMB_W = 44;
  const MAX     = TRACK_W - THUMB_W - 8;

  function onStart(e) {
    setDragging(true);
    startX.current = (e.touches?.[0] || e).clientX - pos;
  }

  function onMove(e) {
    if (!dragging) return;
    const x = Math.max(0, Math.min(MAX, (e.touches?.[0] || e).clientX - startX.current));
    setPos(x);
  }

  function onEnd() {
    setDragging(false);
    if (pos >= MAX * 0.85) {
      onConfirm();
      setPos(0);
    } else {
      setPos(0);
    }
  }

  return (
    <div
      className="swipe-container"
      style={{ width: TRACK_W }}
      onMouseMove={onMove} onMouseUp={onEnd} onMouseLeave={onEnd}
      onTouchMove={onMove} onTouchEnd={onEnd}
    >
      <div className="swipe-track">{label}</div>
      <div
        className="swipe-thumb"
        style={{ left: 4 + pos }}
        onMouseDown={onStart}
        onTouchStart={onStart}
      >▶</div>
    </div>
  );
}
