const cloud = require('wx-server-sdk')
cloud.init()

exports.main = async (event, context) => {
  const db = cloud.database()
  const { skip = 0 } = event
  const limit = 15

  try {
    const res = await db.collection('events')
      .orderBy('date', 'desc')
      .skip(skip)
      .limit(limit)
      .get()

    // 获取总数以判断是否还有更多数据
    const total = await db.collection('events').count()

    return { 
      success: true, 
      data: res.data,
      hasMore: skip + limit < total.total
    }
  } catch (error) {
    console.error('获取活动列表失败：', error)
    return { 
      success: false, 
      error: error.message || '获取活动列表失败'
    }
  }
}
