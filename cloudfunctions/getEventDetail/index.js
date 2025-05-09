const cloud = require('wx-server-sdk');
cloud.init();
const db = cloud.database();

exports.main = async (event, context) => {
  const { id } = event;

  try {
    const event = await db.collection('events').doc(id).get();
    const eventData = event.data;

    // 检查开票时间是否已过
    if (eventData && eventData.ticketTime && eventData.ticketStatus === '未开票') {
      const ticketDateTime = new Date(eventData.ticketTime);
      const now = new Date();

      if (ticketDateTime < now) {
        // 更新状态为"开票"
        await db.collection('events').doc(id).update({
          data: {
            ticketStatus: '已开票'
          }
        });
        eventData.ticketStatus = '已开票';
      }
    }

    return eventData || {};
  } catch (err) {
    console.error('获取活动详情失败:', err);
    return { error: err.message };
  }
};
