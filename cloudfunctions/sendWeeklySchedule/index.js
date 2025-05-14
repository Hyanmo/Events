const cloud = require('wx-server-sdk')
cloud.init()

exports.main = async (event, context) => {
  const db = cloud.database()
  const _ = db.command
  const now = new Date()
  const twoWeeksLater = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000)

  try {
    // 获取未来两周内的活动
    const events = await db.collection('events')
      .where({
        date: _.gte(now.toISOString().split('T')[0])
              .and(_.lte(twoWeeksLater.toISOString().split('T')[0]))
      })
      .orderBy('date', 'asc')
      .get()

    console.log('获取到的活动数据:', events.data)

    // 获取所有订阅用户
    const subscribers = await db.collection('scheduleSubscribers').get()
    console.log('订阅用户数量:', subscribers.data.length)

    // 为每个订阅用户发送汇总消息
    const sendPromises = subscribers.data.map(async subscriber => {
      try {
        // 确保标题不为空且长度在20字以内
        let titleText = ''
        if (events.data.length > 0) {
          titleText = events.data[0].title.slice(0, 16) + 
                     (events.data.length > 1 ? '等活动' : '')
        } else {
          titleText = '暂无活动'
        }

        const firstEvent = events.data[0] || {}
        const messageData = {
          thing2: { value: titleText },
          date4: { value: firstEvent.fulltime || '待定' },
          thing10: { value: (firstEvent.location || '待定').slice(0, 20) },
          thing11: { value: `未来两周共${events.data.length}场活动` }
        }

        console.log('准备发送的消息数据:', messageData)
        console.log('发送给用户:', subscriber.userId)

        await cloud.openapi.subscribeMessage.send({
          touser: subscriber.userId,
          templateId: '3n7W3wt4DqEPSrPLFff8aCwqpDLOs7BwCOxQptRsiAc',
          data: messageData
        })
        console.log('消息发送成功')
      } catch (error) {
        console.error('发送失败详情:', {
          error: error.message,
          errorStack: error.stack,
          userId: subscriber.userId,
          events: events.data
        })
      }
    })

    await Promise.all(sendPromises)
    return { success: true }
  } catch (error) {
    console.error('主流程错误:', error)
    return { success: false, error: error.message }
  }
}