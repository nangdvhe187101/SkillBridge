export const conversationsSeed = [
    {
        id: 'conv-1',
        name: 'Trà Sữa Mộc',
        subtitle: 'Nhà tuyển dụng · TP.HCM',
        online: true,
        kind: 'chat',
        unread: 2,
        lastTime: '2 phút trước',
        blocked: false,
        muted: false,
        archived: false,
        messages: [
            { id: 'm1', type: 'text', from: 'them', text: 'Chào bạn! Mình xem CV rồi, bạn có thể bắt đầu dự án dựng video TikTok từ tuần sau không?', time: '09:12' },
            { id: 'm2', type: 'text', from: 'them', text: 'Ngân sách 250K cho video 30s nhé, deadline 3 ngày.', time: '09:13' },
        ],
    },
    {
        id: 'conv-2',
        name: 'Minh Anh',
        subtitle: 'Sinh viên · Reliability 96',
        online: true,
        kind: 'chat',
        unread: 0,
        lastTime: 'Hôm qua',
        blocked: false,
        muted: false,
        archived: false,
        messages: [
            { id: 'm1', type: 'text', from: 'me', text: 'Cảm ơn bạn đã hoàn thành công việc đúng hạn nhé!', time: '18:40' },
            { id: 'm2', type: 'text', from: 'them', text: 'Dạ không có gì ạ, rất vui khi hợp tác cùng bạn 🎉', time: '18:42' },
        ],
    },
    {
        id: 'conv-3',
        name: 'Cỏ May Agency',
        subtitle: 'Nhà tuyển dụng · Hà Nội',
        online: false,
        kind: 'request',
        unread: 1,
        lastTime: '3 giờ trước',
        blocked: false,
        muted: false,
        archived: false,
        messages: [
            { id: 'm1', type: 'text', from: 'them', text: 'Chào bạn, mình cần gấp 1 poster sự kiện trường trong 24h, bạn nhận được không?', time: '14:05' },
        ],
    },
];

export const AUTO_REPLIES = [
    'Cảm ơn bạn, mình sẽ xem lại ngay!',
    'Ok bạn, để mình kiểm tra rồi phản hồi sớm nhé.',
    'Dạ vâng, mình đang hoàn thiện phần cuối rồi ạ.',
    'Được đó, mình đồng ý với đề xuất này.',
];