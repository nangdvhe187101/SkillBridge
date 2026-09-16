import { useState } from 'react';
import ModalShell from './ModalShell';
import Icon from '../Icon';
import { useModal } from '../../context/ModalContext';

const AUTO_REPLIES = [
  'Cảm ơn bạn, mình sẽ xem lại ngay!',
  'Ok bạn, để mình kiểm tra rồi phản hồi sớm nhé.',
  'Dạ vâng, mình đang hoàn thiện phần cuối rồi ạ.',
  'Được đó, mình đồng ý với đề xuất này.',
];

export default function ChatModal({ onClose, withName }) {
  const { openModal } = useModal();
  const [messages, setMessages] = useState([
    { from: 'them', text: `Chào bạn! Mình là ${withName}, có gì cần trao đổi cứ nhắn nhé.` },
  ]);
  const [input, setInput] = useState('');

  const send = () => {
    const text = input.trim();
    if (!text) return;
    setMessages((m) => [...m, { from: 'me', text }]);
    setInput('');
    setTimeout(() => {
      const reply = AUTO_REPLIES[Math.floor(Math.random() * AUTO_REPLIES.length)];
      setMessages((m) => [...m, { from: 'them', text: reply }]);
    }, 900);
  };

  return (
    <ModalShell onClose={onClose} chat>
      <div className="chat-head">
        <div className="ch-av" />
        <div><b>{withName}</b><span>● Đang hoạt động</span></div>
        <button className="btn btn-outline btn-sm" style={{ marginLeft: 'auto', color: 'var(--coral)', borderColor: 'var(--coral)' }}
          onClick={() => openModal('report', { withName })}>🚩 Báo cáo</button>
      </div>
      <div className="chat-body">
        {messages.map((m, i) => (
          <div key={i} className={'chat-msg ' + (m.from === 'me' ? 'me' : 'them')}>{m.text}</div>
        ))}
      </div>
      <div className="chat-foot">
        <input type="text" placeholder="Nhập tin nhắn..." value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && !e.nativeEvent.isComposing) { e.preventDefault(); send(); } }} />
        <button onClick={send}><Icon name="send" /></button>
      </div>
    </ModalShell>
  );
}
