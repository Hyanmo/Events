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

    // 获取所有订阅用户
    const subscribers = await db.collection('scheduleSubscribers').get()

    // 为每个订阅用户发送汇总消息
    const sendPromises = subscribers.data.map(async subscriber => {
      try {
        // 整合活动信息
        const titles = events.data.map(e => e.title).join('、')
        const dates = events.data.map(e => e.fulltime).join(' / ')
        const locations = events.data.map(e => e.location || '待定').join(' / ')
        const descriptions = `未来两周共${events.data.length}场活动`

        await cloud.openapi.subscribeMessage.send({
          touser: subscriber.userId,
          templateId: '3n7W3wt4DqEPSrPLFff8aCwqpDLOs7BwCOxQptRsiAc',
          data: {
            thing2: { value: titles.slice(0, 20) + (titles.length > 20 ? '...' : '') },
            date4: { value: dates.slice(0, 20) + (dates.length > 20 ? '...' : '') },
            thing10: { value: locations.slice(0, 20) + (locations.length > 20 ? '...' : '') },
            thing11: { value: descriptions }
          }
        })
      } catch (error) {
        console.error(`发送失败: ${error}`)
      }
    })

    await Promise.all(sendPromises)
    return { success: true }
  } catch (error) {
    return { success: false, error: error.message }
  }
}